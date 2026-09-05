/**
 * GEMINI 3.8 FLASH STORY OPTIMIZER & GENERATOR — METODO AC COACHING
 * 
 * Generatore e ottimizzatore di Instagram Stories (1080×1920 / 9:16)
 * alimentato da Google Gemini 3.8 Flash:
 * 1. Generazione sequenze narrative (3, 5, 7 Stories) per smartphone 9:16
 * 2. Hook visivo nei primi 2 secondi con titoli a due toni (headline + highlight ambra)
 * 3. Schede formative compatte (< 35 parole per story) con cue visivi per il creator
 * 4. Sticker interattivi Instagram reali (Poll, Box Domande, Quiz, Slider)
 * 5. Finale con Call To Action DM diretta per lead generation
 */

import { generateContentWithGemini } from '../lib/ai/geminiClient';
import {
  InstagramStory,
  InstagramStorySequence,
  StoryType,
  StoryLayoutId,
  StoryTemplateId,
  StorySticker,
} from '../types/story';
import { generateStoriesFromContent } from './storyGeneratorService';

export interface GenerateStoriesWithGeminiOptions {
  title?: string;
  scriptBody?: string;
  hook?: string;
  cta?: string;
  targetCount?: 3 | 5 | 7;
  templateId?: StoryTemplateId;
  pillar?: string;
}

export type StoryAIOperationType =
  | 'improve_all'
  | 'shorten_text'
  | 'improve_hook'
  | 'make_interactive'
  | 'strong_cta'
  | 'make_technical';

interface RawGeminiStoryItem {
  order?: number;
  type?: StoryType;
  layout?: StoryLayoutId;
  headline: string;
  headlineHighlight?: string;
  subheadline?: string;
  bodyText?: string;
  bulletPoints?: string[];
  visualCue?: string;
  sticker?: StorySticker;
}

interface RawGeminiStoryResponse {
  stories: RawGeminiStoryItem[];
}

const VALID_STORY_TYPES: Set<StoryType> = new Set([
  'visual_hook',
  'educational_value',
  'problem_solution',
  'poll_interactive',
  'question_box',
  'slider_interactive',
  'quiz_interactive',
  'proof_case',
  'final_cta_dm',
]);

const VALID_LAYOUTS: Set<StoryLayoutId> = new Set([
  'visual_hook',
  'text_card',
  'poll_sticker',
  'question_box',
  'slider_rating',
  'quiz_interactive',
  'comparison',
  'final_cta_dm',
]);

/**
 * Genera una sequenza completa di Instagram Stories 9:16 con Google Gemini 3.8 Flash
 */
export async function generateStoriesWithGemini(
  options: GenerateStoriesWithGeminiOptions
): Promise<InstagramStorySequence> {
  const targetCount = options.targetCount || 5;
  const topic = options.title?.trim() || options.hook?.trim() || 'Allenamento e Biomeccanica Applicata';
  const hookPrompt = options.hook?.trim() || '';
  const scriptPrompt = options.scriptBody?.trim() || '';
  const ctaPrompt = options.cta?.trim() || 'Scrivimi in DM per maggiori dettagli o consulenza.';

  const systemPrompt = `Sei l'AI Creative Director e Biomechanics Copywriter per Antonio Crapanzano (@antoniocrapanzano_coach), fondatore di AC Coaching.
Il tuo compito è creare una sequenza di ${targetCount} Instagram Stories (1080x1920 pixel / formato 9:16) su misura per smartphone.

REGOLE FONDAMENTALI DEL FORMATO E DEL METODO:
1. TARGET E TONO:
   - Bodybuilding, ipertrofia scientifica, biomeccanica e kinesiologia degli esercizi.
   - Tono autorevole, diretto, perentorio, privo di banalità e frasi motivazionali generiche.
2. TITOLI A DUE TONI:
   - "headline": testo principale (3-6 parole in maiuscolo).
   - "headlineHighlight": seconda riga chiave che verrà evidenziata in giallo oro/ambra (#F59E0B) (2-4 parole in maiuscolo).
3. STRUTTURA SEQUENZA STORIES (${targetCount} STORIES):
   - Story 1: SEMPRE "visual_hook" (layout: "visual_hook"). Gancio che ferma lo scroll nei primi 2 secondi.
   ${targetCount === 3
     ? `- Story 2: "poll_interactive" o "educational_value" (layout: "poll_sticker" o "text_card"). Concetto chiave o sondaggio.
- Story 3: SEMPRE "final_cta_dm" (layout: "final_cta_dm"). Call to action chiara per mandare un DM con keyword.`
     : targetCount === 5
     ? `- Story 2: "educational_value" o "problem_solution" (layout: "text_card" o "comparison"). L'errore invisibile o la fisica dell'esercizio.
- Story 3: "poll_interactive" o "question_box" (layout: "poll_sticker" o "question_box"). Coinvolgi l'atleta chiedendo la sua esperienza o sensazione.
- Story 4: "educational_value" (layout: "text_card"). La correzione biomeccanica con 2-3 bullet points pratici.
- Story 5: SEMPRE "final_cta_dm" (layout: "final_cta_dm"). Call to action per ricevere la guida o protocollo in DM.`
     : `- Story 2: "educational_value" (layout: "text_card"). Il problema anatomico o di leva.
- Story 3: "problem_solution" (layout: "comparison"). Confronto ❌ Errore comune vs ✅ Esecuzione corretta.
- Story 4: "poll_interactive" (layout: "poll_sticker"). Sondaggio a due opzioni (es. opzione A con emoji, opzione B).
- Story 5: "educational_value" (layout: "text_card"). Sequenza correttiva in 3 step.
- Story 6: "question_box" (layout: "question_box"). Box domande per raccogliere dubbi tecnici.
- Story 7: SEMPRE "final_cta_dm" (layout: "final_cta_dm"). CTA ad altissima conversione in DM.`}
4. BREVITÀ E LEGGIBILITÀ MOBILE:
   - bodyText: massimo 25-35 parole per story! Non riempire lo schermo.
   - visualCue: suggerimento di regia per il video/foto della storia (es. "Inquadratura laterale a mezzo busto con bilanciere fermo", "Selfie video dinamico con espressione decisa").
5. STICKER INTERATTIVI INSTAGRAM:
   - Se type è "poll_interactive", crea sticker: { "type": "poll", "question": "...", "optionA": "...", "optionB": "...", "percentA": 68, "percentB": 32 }.
   - Se type è "question_box", crea sticker: { "type": "question", "prompt": "...", "placeholder": "Scrivi qui il tuo dubbio..." }.
   - Se type è "final_cta_dm", crea sticker: { "type": "dm", "keyword": "GUIDA", "promptText": "Scrivimi in DM" }.

FORMATO RISPOSTA:
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (senza markdown o testo prima/dopo) con questa struttura:
{
  "stories": [
    {
      "order": 1,
      "type": "visual_hook",
      "layout": "visual_hook",
      "headline": "STRINGA",
      "headlineHighlight": "STRINGA",
      "subheadline": "STRINGA",
      "bodyText": "STRINGA",
      "bulletPoints": ["STRINGA"],
      "visualCue": "STRINGA",
      "sticker": { ... }
    }
  ]
}`;

  const userPrompt = `Genera la sequenza di ${targetCount} Instagram Stories con Google Gemini 3.8 Flash per il seguente tema:
Argomento / Titolo: ${topic}
Hook Desiderato: ${hookPrompt || topic}
${scriptPrompt ? `Bozza o Punti della Scaletta: ${scriptPrompt}` : ''}
${ctaPrompt ? `Obiettivo CTA Finale: ${ctaPrompt}` : ''}

Assicurati che la sequenza rispetti esattamente il numero di ${targetCount} stories richieste e sia 100% focalizzata sul tema specificato.`;

  try {
    const aiResult = await generateContentWithGemini({
      systemPrompt,
      userPrompt,
      model: 'gemini-3.8-flash',
      temperature: 0.6,
      responseMimeType: 'application/json',
    });

    const cleanedText = aiResult.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText) as RawGeminiStoryResponse;

    if (parsed && Array.isArray(parsed.stories) && parsed.stories.length > 0) {
      const formattedStories: InstagramStory[] = parsed.stories.map((s, idx) => {
        const order = idx + 1;
        const rawType = s.type && VALID_STORY_TYPES.has(s.type) ? s.type : (idx === 0 ? 'visual_hook' : idx === parsed.stories.length - 1 ? 'final_cta_dm' : 'educational_value');
        const rawLayout = s.layout && VALID_LAYOUTS.has(s.layout) ? s.layout : (rawType === 'visual_hook' ? 'visual_hook' : rawType === 'poll_interactive' ? 'poll_sticker' : rawType === 'question_box' ? 'question_box' : rawType === 'final_cta_dm' ? 'final_cta_dm' : 'text_card');

        return {
          id: `story_ai_${Date.now()}_${order}`,
          order,
          type: rawType,
          layout: rawLayout,
          headline: s.headline?.trim().toUpperCase() || 'STORY ' + order,
          headlineHighlight: s.headlineHighlight?.trim().toUpperCase() || '',
          subheadline: s.subheadline?.trim() || '',
          bodyText: s.bodyText?.trim() || '',
          bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints.filter(Boolean) : [],
          visualCue: s.visualCue?.trim() || '',
          sticker: s.sticker || (rawType === 'poll_interactive' ? {
            type: 'poll',
            question: s.headline || 'Quale preferisci?',
            optionA: 'Opzione A 🔥',
            optionB: 'Opzione B ❌',
            percentA: 70,
            percentB: 30,
          } : rawType === 'final_cta_dm' ? {
            type: 'dm',
            keyword: 'INFO',
            promptText: 'Invia "INFO" in DM',
          } : undefined),
          status: 'ready',
        };
      });

      return {
        id: `seq_${Date.now()}`,
        title: topic,
        status: 'sequence_ready',
        settings: {
          templateId: options.templateId || 'minimal_dark',
          fontFamily: 'Inter',
          brandName: 'AC Coaching',
          brandHandle: '@antoniocrapanzano_coach',
          showWatermark: true,
          watermarkText: '• AC PERFORMANCE METHOD •',
        },
        stories: formattedStories,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[Gemini 3.8 Flash Story Generator] Fallback al template per errore o offline:', err);
  }

  // Fallback offline resiliente (personalizzato dinamicamente sul titolo e hook)
  const fallback = generateStoriesFromContent({
    title: topic,
    scriptBody: options.scriptBody,
    hook: options.hook || topic,
    cta: options.cta,
    targetCount,
    templateId: options.templateId || 'minimal_dark',
  });
  fallback.status = 'sequence_ready';
  return fallback;
}

/**
 * Ottimizza una singola Instagram Story con Google Gemini 3.8 Flash
 */
export async function optimizeSingleStoryWithGemini(
  story: InstagramStory,
  action: StoryAIOperationType,
  contentContext?: { title?: string; hook?: string }
): Promise<InstagramStory> {
  const systemPrompt = `Sei l'AI Creative Director per Antonio Crapanzano (@antoniocrapanzano_coach).
Ottimizza questa singola Instagram Story 9:16 (1080x1920) per massimo impatto visivo e leggibilità su smartphone.

AZIONE RICHIESTA: ${action}
- shorten_text: Riduci bodyText a meno di 25 parole chiare e perentorie.
- improve_hook: Riscrivi headline e headlineHighlight per creare un gancio magnetico a 2 toni.
- make_interactive: Aggiungi o ottimizza uno sticker interattivo (poll o question box).
- strong_cta: Rafforza la chiamata all'azione per spingere l'invio di un DM al coach.
- make_technical: Inserisci terminologia biomeccanica precisa (braccio di momento, cerniera d'anca, tensione meccanica).
- improve_all: Ottimizza testo, gerarchia e regia visiva a 360°.

Rispondi ESCLUSIVAMENTE in formato JSON valido:
{
  "headline": "STRINGA",
  "headlineHighlight": "STRINGA",
  "subheadline": "STRINGA",
  "bodyText": "STRINGA",
  "bulletPoints": ["STRINGA"],
  "visualCue": "STRINGA",
  "sticker": { ... }
}`;

  const userPrompt = `Dati attuali della Story #${story.order}:
Tema post: ${contentContext?.title || ''}
Titolo attuale: ${story.headline}
Evidenziazione: ${story.headlineHighlight || ''}
Sottotitolo: ${story.subheadline || ''}
Corpo testo: ${story.bodyText || ''}
Tipo layout: ${story.layout}
Tipo story: ${story.type}`;

  try {
    const aiResult = await generateContentWithGemini({
      systemPrompt,
      userPrompt,
      model: 'gemini-3.8-flash',
      temperature: 0.5,
      responseMimeType: 'application/json',
    });

    const cleanedText = aiResult.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText) as RawGeminiStoryItem;

    return {
      ...story,
      headline: parsed.headline?.trim().toUpperCase() || story.headline,
      headlineHighlight: parsed.headlineHighlight !== undefined ? parsed.headlineHighlight.trim().toUpperCase() : story.headlineHighlight,
      subheadline: parsed.subheadline !== undefined ? parsed.subheadline.trim() : story.subheadline,
      bodyText: parsed.bodyText !== undefined ? parsed.bodyText.trim() : story.bodyText,
      bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : story.bulletPoints,
      visualCue: parsed.visualCue !== undefined ? parsed.visualCue.trim() : story.visualCue,
      sticker: parsed.sticker !== undefined ? parsed.sticker : story.sticker,
    };
  } catch (err) {
    console.warn('[Gemini 3.8 Flash Story Optimizer] Fallback modifica locale:', err);
    return story;
  }
}
