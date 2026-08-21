import { supabase } from '../supabase';
import { robustJsonParse } from '../pdf/pdfExtractor';
import { AIContentOpportunity, InboxCategory, InboxPriority } from '../../types/inboxAndContent';

export interface ProcessedInboxAIResult {
  title: string;
  summary: string;
  category: InboxCategory;
  priority: InboxPriority;
  tasks: string[];
  contentOpportunity?: AIContentOpportunity | null;
  nextStep?: string | null;
}

const INBOX_SYSTEM_PROMPT = `Sei l'assistente operativo del coach Antonio Crapanzano (AC Training - Bodybuilding & Performance).
Il tuo obiettivo è trasformare pensieri sparsi, osservazioni sui clienti, idee o task in una struttura operativa chiara e sintetica.

Analizza il testo ed estrai un JSON conforme a questa struttura:
{
  "title": "Titolo sintetico (max 6 parole)",
  "summary": "Riassunto conciso in 1-2 frasi",
  "category": "content_idea" | "client_observation" | "business_task" | "personal_reflection" | "system_improvement",
  "priority": "urgent" | "high" | "medium" | "low",
  "tasks": ["Azione concreta 1", "Azione concreta 2"],
  "contentOpportunity": {
    "hasOpportunity": true o false,
    "suggestedType": "reel" | "story" | "carousel" | "post",
    "pillar": "technique_execution" | "common_mistakes" | "mindset_discipline" | "nutrition_science" | "client_transformation" | "coaching_faq" | "authority_lifestyle" | "promotion_launch",
    "hook": "Gancio ad alto impatto per i primi 3 secondi",
    "scriptOutline": "Scaletta dei punti chiave del contenuto",
    "callToAction": "Call to action finale efficace"
  },
  "nextStep": "Singolo prossimo passo pratico consigliato"
}

REGOLE CRITICHE:
1. Se il testo non contiene spunti social, imposta "contentOpportunity": { "hasOpportunity": false }.
2. Se il testo parla di un errore o osservazione su atleti, suggerisci sempre un'opportunità Reel con Hook e CTA.
3. Restituisci ESCLUSIVAMENTE il JSON valido.`;

/**
 * Elabora un flusso di pensiero tramite AI (Edge Function con fallback diretto se API key in locale)
 */
export async function processInboxContentWithAI(
  rawContent: string,
  entryId?: string
): Promise<ProcessedInboxAIResult> {
  // 1. Tenta prima con la Supabase Edge Function 'process-inbox-entry'
  try {
    const { data, error } = await supabase.functions.invoke('process-inbox-entry', {
      body: { rawContent, entryId },
    });

    if (!error && data && data.data) {
      return data.data as ProcessedInboxAIResult;
    }
  } catch (edgeErr) {
    console.warn('[Inbox AI] Edge function unreachable, attempting direct client key route:', edgeErr);
  }

  // 2. Chiamata diretta con chiave Gemini locale se presente
  const envKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
      : undefined;
  const storageKey =
    typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  const activeKey = (envKey || storageKey || '').trim();

  if (activeKey) {
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
    for (const model of modelsToTry) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${INBOX_SYSTEM_PROMPT}\n\nTESTO DA ANALIZZARE:\n${rawContent}` }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = robustJsonParse<ProcessedInboxAIResult>(rawJson);
            return parsed;
          }
        }
      } catch {
        continue;
      }
    }
  }

  throw new Error('Impossibile elaborare il pensiero con AI. Verifica la connessione o la chiave API Gemini.');
}
