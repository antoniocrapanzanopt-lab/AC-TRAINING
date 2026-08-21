import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGINS = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://builderathletemanager.com'
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function requireMfaAuth(authHeader: string | null) {
  if (!authHeader) throw new Error("Missing Authorization header");
  const token = authHeader.replace("Bearer ", "");
  try {
    const base64Payload = token.split(".")[1];
    const payload = JSON.parse(atob(base64Payload));
    if (payload.aal !== "aal2") {
      throw new Error("Insufficient Assurance Level. AAL2 required.");
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.includes("AAL2")) throw error;
    throw new Error("Invalid JWT format");
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    try {
      requireMfaAuth(authHeader);
    } catch (err: any) {
      console.warn(`[SECURITY] Accesso process-inbox-entry bloccato: ${err.message}`);
      return new Response(JSON.stringify({ error: `Forbidden: ${err.message}` }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: isCoach, error: rpcError } = await supabaseClient.rpc('is_coach');
    if (rpcError || !isCoach) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient coach privileges.' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const requestData = await req.json();
    const { rawContent, entryId } = requestData;

    if (!rawContent || !rawContent.trim()) {
      return new Response(JSON.stringify({ error: 'Testo grezzo non fornito.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Secret GEMINI_API_KEY non configurato sul server.');
    }

    const systemPrompt = `Sei l'assistente operativo del coach Antonio Crapanzano (AC Training - Bodybuilding & Performance).
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
3. Restituisci ESCLUSIVAMENTE il JSON valido senza blocchi markdown.`;

    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
    let lastError: Error | null = null;
    let parsed: any = null;

    for (const model of modelsToTry) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nTESTO DA ANALIZZARE:\n${rawContent}` }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 404) continue;
          throw new Error(`Gemini Error (${response.status}): ${errText}`);
        }

        const resData = await response.json();
        const rawJson = resData.candidates[0].content.parts[0].text;
        const cleanJson = rawJson.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
        parsed = JSON.parse(cleanJson);
        break;
      } catch (err: any) {
        lastError = err;
        if (err.message && err.message.includes('404')) continue;
        throw err;
      }
    }

    if (!parsed) {
      throw lastError || new Error("Nessuna risposta valida da Gemini.");
    }

    // Se fornito entryId, aggiorna il record su Supabase
    if (entryId) {
      await supabaseClient.from('inbox_entries').update({
        ai_title: parsed.title,
        ai_summary: parsed.summary,
        ai_category: parsed.category,
        ai_priority: parsed.priority || 'medium',
        ai_suggested_tasks: parsed.tasks || [],
        ai_content_opportunity: parsed.contentOpportunity || null,
        ai_next_step: parsed.nextStep || null,
        status: 'processed',
        processed_at: new Date().toISOString()
      }).eq('id', entryId);
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Inbox Processing Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Errore interno.' }), {
      status: 400,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
