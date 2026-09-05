/**
 * GEMINI 3.7 FLASH CAROUSEL OPTIMIZER & DESIGN INTELLIGENCE
 * 
 * Modulo di intelligenza artificiale per:
 * 1. Ottimizzare e ristrutturare layout, interfaccia e impaginazione delle slide
 * 2. Posizionamento ideale delle immagini (bottom_cutout, right_side, top_half, background_full)
 * 3. Formattazione a 2 toni per i titoli (Riga 1 bianco + Riga 2 accento)
 * 4. Generazione badge categoria (■ Tag), citazioni scientifiche reali (PMID) e flussi logici
 * 5. Calibrazione automatica di font family e grandezze in pixel (px)
 */

import { generateContentWithGemini } from '../lib/ai/geminiClient';
import {
  CarouselSlide,
  InstagramCarousel,
  SlideLayoutId,
  SlideImagePosition,
  TitleFontFamily,
  BodyFontFamily,
  CoverHookAlternative,
} from '../types/carousel';
import { InstagramContent } from '../types/inboxAndContent';

interface GeminiSlideOptimizationResponse {
  headline: string;
  headlineHighlight?: string;
  subheadline?: string;
  bodyText: string;
  layout: SlideLayoutId;
  titleFont: TitleFontFamily;
  bodyFont: BodyFontFamily;
  titleFontSizePx: number;
  bodyFontSizePx: number;
  textAlign: 'left' | 'center' | 'right';
  categoryTag?: string;
  citationSource?: string;
  punchlineQuote?: string;
  diagramStep1?: string;
  diagramStep2?: string;
  diagramHighlightResult?: string;
  bulletPoints?: string[];
  visualCue?: string;
  takeawayTag?: string;
  imagePosition?: SlideImagePosition;
  imageOpacity?: number;
  wrongText?: string;
  correctText?: string;
}

export type CarouselAIOperationType =
  | 'improve_all'
  | 'improve_title'
  | 'reduce_text'
  | 'make_direct'
  | 'make_technical'
  | 'make_persuasive'
  | 'convert_bullets'
  | 'generate_alternatives'
  | 'check_clarity';

export interface AIOperationOption {
  id: CarouselAIOperationType;
  label: string;
  desc: string;
  icon: string;
}

export const CAROUSEL_AI_OPERATIONS: AIOperationOption[] = [
  { id: 'improve_title', label: 'Migliora solo il titolo', desc: 'Titolo a due toni magnetico, grande e incisivo', icon: '📝' },
  { id: 'reduce_text', label: 'Riduci testo (<40 parole)', desc: 'Sintetizza per massima leggibilità da smartphone', icon: '✂️' },
  { id: 'make_direct', label: 'Rendi più diretto & hook forte', desc: 'Elimina preamboli, vai dritto al punto con impatto', icon: '⚡' },
  { id: 'make_technical', label: 'Rendi più tecnico & scientifico', desc: 'Usa biomeccanica, leve e kinesiologia del Metodo AC', icon: '🧬' },
  { id: 'make_persuasive', label: 'Rendi più persuasivo (CTA & Save)', desc: 'Spingi alla conservazione e interazione nel post', icon: '🎯' },
  { id: 'convert_bullets', label: 'Crea una lista a punti', desc: 'Riorganizza il testo in 3-4 punti pratici numerati', icon: '🔢' },
  { id: 'generate_alternatives', label: 'Genera 3 alternative', desc: 'Riformula con diversa angolazione e impatto', icon: '🔄' },
  { id: 'check_clarity', label: 'Controlla chiarezza & errori', desc: 'Verifica punteggiatura, leggibilità e fluidità', icon: '🔍' },
  { id: 'improve_all', label: 'Migliora tutta la slide', desc: 'Ottimizza layout, impaginazione, font e posizionamento', icon: '✨' },
];

/**
 * Ottimizza una singola slide con Google Gemini 3.8 Flash con supporto per azione contestuale specifica
 */
export async function optimizeSlideWithGemini(
  slide: CarouselSlide,
  content: Partial<InstagramContent>,
  slideIndex: number,
  totalSlides: number,
  action: CarouselAIOperationType = 'improve_all'
): Promise<CarouselSlide> {
  const isCover = slideIndex === 0;
  const isCta = slideIndex === totalSlides - 1;

  const systemPrompt = `Sei un Art Director ed Esperto di Comunicazione Visiva e Biomeccanica per Instagram Caroselli (Fitness & Performance Coaching di altissimo livello).
Il tuo obiettivo è riscrivere e formattare la slide per renderla esteticamente magnetica, scientificamente autorevole e graficamente impeccabile.

Regole di design per i Caroselli Coaching:
1. TITOLO A 2 TONI: Dividi il titolo in Riga 1 ("headline" - massimo 4-5 parole in maiuscolo) e Riga 2 ("headlineHighlight" - 2-4 parole ad alto impatto in colore accento).
2. LAYOUT: Scegli il layout più efficace:
   - "dual_tone_cover" per la copertina
   - "connected_icon_list" per elenchi a punti chiave con nodi e icone
   - "diagram_flow" per spiegazioni scientifiche, premesse e risultati
   - "error_vs_correct" per confronti Errore vs Tecnica Corretta
   - "step_by_step" per progressioni pratiche
   - "numbered_list" per regole o recap
   - "final_cta" per la slide finale
3. IMMAGINE: Scegli la posizione ideale ("bottom_cutout" se il testo è in alto e la figura è in basso, "right_side" per split 50/50, "top_half" o "background_full").
4. FONTS E PIXEL:
   - titleFont: "Bebas Neue" (impatto alto), "Montserrat" (geometrico/biomeccanico), "Outfit" o "Inter".
   - titleFontSizePx: tra 44px e 68px.
   - bodyFontSizePx: tra 22px e 30px.
5. CATEGORIA & FONTI:
   - categoryTag: tag in maiuscolo preceduto da "■ " (es. "■ FISIOLOGIA DELL'ALLENAMENTO", "■ BIOMECCANICA DELLO SQUAT").
   - citationSource: paper scientifico reale con PMID se pertinente (es. "Pelland et al 2022: PMID 35247203", "Schoenfeld et al 2021: PMID 33433148").

Rispondi ESCLUSIVAMENTE in formato JSON valido senza blocchi markdown.`;

  let actionInstruction = '';
  switch (action) {
    case 'improve_title':
      actionInstruction = `OBIETTIVO PRIORITARIO: Concentrati sul TITOLO. Riscrivi "headline" e "headlineHighlight" in modo che siano irresistibili, brevi (3-6 parole) e ad altissimo impatto visivo. Mantieni il corpo del testo fedele all'originale.`;
      break;
    case 'reduce_text':
      actionInstruction = `OBIETTIVO PRIORITARIO: SINTESI ESTREMA. Riduci il testo del corpo ("bodyText") sotto le 35-40 parole totali. Elimina prolissità e parole riempitive. Ogni frase deve essere un pugno informativo pulito e rapido per smartphone.`;
      break;
    case 'make_direct':
      actionInstruction = `OBIETTIVO PRIORITARIO: COMUNICAZIONE DIRETTA E PUNCHY. Elimina preamboli. Esprimi la regola o l'errore senza mezzi termini. Hook forte ed energico.`;
      break;
    case 'make_technical':
      actionInstruction = `OBIETTIVO PRIORITARIO: AUTOREVOLEZZA BIOMECCANICA E KINESIOLOGICA. Utilizza i termini scientifici corretti (bracci di leva, tensione meccanica, punto di allungamento, curva di resistenza). Se opportuno, compila o aggiorna "citationSource".`;
      break;
    case 'make_persuasive':
      actionInstruction = `OBIETTIVO PRIORITARIO: RETENTION E INTERAZIONE. Spingi il lettore a salvare il post e commentare. Formula una chiusura incisiva e motivante.`;
      break;
    case 'convert_bullets':
      actionInstruction = `OBIETTIVO PRIORITARIO: TRASFORMAZIONE IN PUNTI ELENCO. Converti il corpo del testo in 3 o 4 bullet points pratici e concisi (array "bulletPoints") e imposta layout su "numbered_list" o "connected_icon_list".`;
      break;
    case 'generate_alternatives':
      actionInstruction = `OBIETTIVO PRIORITARIO: GENERAZIONE ALTERNATIVE CREATIVE. Esplora 3 angolazioni comunicative diverse per questa slide (approccio provocatorio, approccio biomeccanico scientifico, approccio pratico per la palestra). Seleziona la formulazione più potente e magnetica sia per il titolo sia per il corpo.`;
      break;
    case 'check_clarity':
      actionInstruction = `OBIETTIVO PRIORITARIO: MASSIMA CHIAREZZA E LEGGIBILITÀ. Correggi punteggiatura, spaziature, ritorni a capo ed elimina ambiguità semantiche.`;
      break;
    default:
      actionInstruction = `OBIETTIVO PRIORITARIO: Ottimizza a 360° la slide per layout, titolo a 2 toni, leggibilità mobile e valore formativo.`;
  }

  const userPrompt = `Ottimizza questa slide (${slideIndex + 1} di ${totalSlides}) del carosello:
Argomento Generale: ${content.title || 'Allenamento e Biomeccanica'}
Gancio: ${content.hook || ''}
Pillar: ${content.pillar || 'technique_execution'}
Azione Richiesta: ${action}
${actionInstruction}

Stato Attuale Slide:
- Titolo attuale: ${slide.headline}
- Evidenziazione attuale: ${slide.headlineHighlight || ''}
- Sottotitolo: ${slide.subheadline || ''}
- Testo corpo: ${slide.bodyText}
- Tipo slide: ${slide.type}
- Layout attuale: ${slide.layout || 'standard'}
- Ha già immagine caricata: ${Boolean(slide.imageUrl)}

Genera l'oggetto JSON con:
{
  "headline": "string",
  "headlineHighlight": "string",
  "subheadline": "string",
  "bodyText": "string",
  "layout": "dual_tone_cover" | "connected_icon_list" | "diagram_flow" | "error_vs_correct" | "step_by_step" | "numbered_list" | "final_cta" | "text_left",
  "titleFont": "Bebas Neue" | "Montserrat" | "Outfit" | "Inter",
  "bodyFont": "Inter" | "Roboto" | "Montserrat" | "Outfit",
  "titleFontSizePx": number,
  "bodyFontSizePx": number,
  "textAlign": "left" | "center" | "right",
  "categoryTag": "string",
  "citationSource": "string",
  "punchlineQuote": "string",
  "diagramStep1": "string",
  "diagramStep2": "string",
  "diagramHighlightResult": "string",
  "bulletPoints": ["string"],
  "visualCue": "string",
  "takeawayTag": "string",
  "imagePosition": "bottom_cutout" | "right_side" | "top_half" | "background_full",
  "imageOpacity": number,
  "wrongText": "string",
  "correctText": "string"
}`;

  const aiResult = await generateContentWithGemini({
    systemPrompt,
    userPrompt,
    model: 'gemini-3.8-flash',
    temperature: 0.5,
  });

  const cleanedText = aiResult.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanedText) as GeminiSlideOptimizationResponse;

  return {
    ...slide,
    headline: parsed.headline || slide.headline,
    headlineHighlight: parsed.headlineHighlight !== undefined ? parsed.headlineHighlight : slide.headlineHighlight,
    subheadline: parsed.subheadline !== undefined ? parsed.subheadline : slide.subheadline,
    bodyText: parsed.bodyText !== undefined ? parsed.bodyText : slide.bodyText,
    layout: parsed.layout || (isCover ? 'dual_tone_cover' : isCta ? 'final_cta' : slide.layout),
    titleFont: parsed.titleFont || slide.titleFont || 'Bebas Neue',
    bodyFont: parsed.bodyFont || slide.bodyFont || 'Inter',
    titleFontSizePx: parsed.titleFontSizePx || slide.titleFontSizePx || 54,
    bodyFontSizePx: parsed.bodyFontSizePx || slide.bodyFontSizePx || 26,
    textAlign: parsed.textAlign || (isCover ? 'center' : 'left'),
    categoryTag: parsed.categoryTag || slide.categoryTag,
    citationSource: parsed.citationSource || slide.citationSource,
    punchlineQuote: parsed.punchlineQuote || slide.punchlineQuote,
    diagramStep1: parsed.diagramStep1 || slide.diagramStep1,
    diagramStep2: parsed.diagramStep2 || slide.diagramStep2,
    diagramHighlightResult: parsed.diagramHighlightResult || slide.diagramHighlightResult,
    bulletPoints: parsed.bulletPoints && parsed.bulletPoints.length > 0 ? parsed.bulletPoints : slide.bulletPoints,
    visualCue: parsed.visualCue || slide.visualCue,
    takeawayTag: parsed.takeawayTag || slide.takeawayTag,
    imagePosition: parsed.imagePosition || slide.imagePosition || 'bottom_cutout',
    imageOpacity: parsed.imageOpacity !== undefined ? parsed.imageOpacity : (slide.imageOpacity || 0.6),
    wrongText: parsed.wrongText || slide.wrongText,
    correctText: parsed.correctText || slide.correctText,
    isAiSuggested: true,
  };
}

/**
 * Ottimizza l'intero carosello con Google Gemini 3.7 Flash
 */
export async function optimizeEntireCarouselWithGemini(
  carousel: InstagramCarousel,
  content: Partial<InstagramContent>
): Promise<InstagramCarousel> {
  const updatedSlides: CarouselSlide[] = [];

  for (let i = 0; i < carousel.slides.length; i++) {
    const s = carousel.slides[i];
    try {
      const optimized = await optimizeSlideWithGemini(s, content, i, carousel.slides.length);
      updatedSlides.push(optimized);
    } catch {
      updatedSlides.push(s);
    }
  }

  return {
    ...carousel,
    slides: updatedSlides,
    settings: {
      ...carousel.settings,
      templateId: 'hypertrophy_science',
    },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Genera 3 alternative di hook per la copertina con Google Gemini
 * Angolazioni:
 * 1. Provocatorio / Curiosità
 * 2. Scientifico / Biomeccanico
 * 3. Pratico / Diretto
 */
export async function generateCoverHookAlternatives(
  slide: CarouselSlide,
  topic: string = 'Allenamento e Ipertrofia'
): Promise<CoverHookAlternative[]> {
  const currentTitle = slide.headline || '';
  const currentHighlight = slide.headlineHighlight || '';

  const systemPrompt = `Sei un Copywriter ed Esperto di Viral Hook per Instagram specializzato in Fitness Coaching e Biomeccanica d'élite.
Il tuo compito è generare ESATTAMENTE 3 alternative di titoli ad altissimo impatto per la COPERTINA del carosello.
Ogni alternativa deve avere:
1. "headline": riga principale (3-6 parole incisive, in MAIUSCOLO).
2. "headlineHighlight": seconda riga ad alto contrasto (2-4 parole ad effetto, in MAIUSCOLO).
3. "subheadline": breve frase di gancio esplicativa (12-18 parole).
4. "angle": una tra "provocative" (provocazione o domanda spiazzante), "scientific" (dati, leve o biomeccanica), "practical" (soluzione pratica immediata).
5. "angleLabel": etichetta descrittiva (es. "🔥 Provocatorio", "🧬 Scientifico & Dati", "🎯 Diretto & Pratico").
6. "description": motivazione editoriale del perché questo hook converte.

Rispondi ESCLUSIVAMENTE con un array JSON di 3 oggetti conforme a questa struttura:
[
  {
    "id": "hook_1",
    "headline": "...",
    "headlineHighlight": "...",
    "subheadline": "...",
    "angle": "provocative",
    "angleLabel": "🔥 Provocatorio",
    "description": "..."
  }
]`;

  const userPrompt = `Argomento carosello: ${topic}
Titolo attuale copertina: "${currentTitle} ${currentHighlight}".
Sottotitolo attuale: "${slide.subheadline || ''}".

Genera 3 varianti irresistibili per fermare lo scroll nel feed Instagram.`;

  try {
    const aiResult = await generateContentWithGemini({
      userPrompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 800,
      responseMimeType: 'application/json',
    });

    const cleaned = aiResult.text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as CoverHookAlternative[];
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 3).map((item, i) => ({
        ...item,
        id: item.id || `hook_alt_${i + 1}`,
      }));
    }
  } catch (err) {
    console.warn('Errore generazione hook con Gemini, uso fallback intelligente:', err);
  }

  // Fallback euristico di alta qualità nel Metodo AC
  const isTallOrLonglimbed = /1[.,]85|alt[oi]|longiline|leve|femor|squat/i.test(`${topic} ${currentTitle} ${slide.subheadline || ''}`);

  if (isTallOrLonglimbed) {
    return [
      {
        id: 'hook_alt_1',
        headline: 'SEI ALTO OLTRE 1,85 M?',
        headlineHighlight: 'SMETTI DI SQUATTARE COSÌ',
        subheadline: 'Femori lunghi e busto inclinato: la correzione biomeccanica per stimolare i quadricipiti senza sovraccaricare la schiena.',
        angle: 'provocative',
        angleLabel: '🔥 Specifico Uomini Alti',
        description: 'Chiama direttamente il target e smonta la tecnica standard inadatta a leve lunghe.',
      },
      {
        id: 'hook_alt_2',
        headline: 'LEVE LUNGHE & SQUAT:',
        headlineHighlight: 'IL PARADOSSO DEL FEMORE',
        subheadline: 'Analisi kinesiologica: come alterare il braccio di leva nello squat per colpire davvero i quadricipiti.',
        angle: 'scientific',
        angleLabel: '🧬 Scientifico & Leve',
        description: 'Spiega la fisica del movimento con autorevolezza biomeccanica incontrovertibile.',
      },
      {
        id: 'hook_alt_3',
        headline: 'COME SQUATTARE SE SEI ALTO:',
        headlineHighlight: '3 CORREZIONI IMMEDIATE',
        subheadline: 'Stance, rialzo del tallone e punto di inversione: 3 modifiche per chi ha arti lunghi.',
        angle: 'practical',
        angleLabel: '🎯 Diretto & Pratico',
        description: 'Offre una checklist esecutiva applicabile fin dalla prossima sessione in palestra.',
      },
    ];
  }

  const safeTopic = topic.length > 5 ? topic.toUpperCase() : 'QUESTO MOVIMENTO';
  return [
    {
      id: 'hook_alt_1',
      headline: 'STAI FACENDO QUESTO ERRORE?',
      headlineHighlight: 'ECCO COSA DICONO I DATI',
      subheadline: `La maggior parte degli atleti sbaglia l'approccio su ${topic}. Ecco la correzione biomeccanica.`,
      angle: 'provocative',
      angleLabel: '🔥 Provocatorio',
      description: 'Mette in discussione le convinzioni comuni e genera elevata curiosità.',
    },
    {
      id: 'hook_alt_2',
      headline: 'ANALISI BIOMECCANICA:',
      headlineHighlight: safeTopic,
      subheadline: 'Bracci di leva, tensione muscolare e progressione reale studiata per la massima ipertrofia.',
      angle: 'scientific',
      angleLabel: '🧬 Scientifico & Leve',
      description: 'Posiziona il post come riferimento autorevole fondato su fisica ed anatomia.',
    },
    {
      id: 'hook_alt_3',
      headline: 'GUIDA PRATICA:',
      headlineHighlight: 'COME ESEGUIRLO AL 100%',
      subheadline: '3 passaggi immediati per correggere la tecnica e non sprecare ripetizioni in palestra.',
      angle: 'practical',
      angleLabel: '🎯 Diretto & Pratico',
      description: 'Fornisce una soluzione chiara e azionabile fin dal prossimo allenamento.',
    },
  ];
}

export interface ReadyCTAPlan {
  headline: string;
  headlineHighlight: string;
  bodyText: string;
  actionVerb: string;
  triggerKeyword: string;
  benefit: string;
  reason: string;
}

/**
 * Genera una proposta di Call To Action (CTA) finale completa e pronta all'uso con Gemini 3.8 Flash
 * Include:
 * 1. Verbo d'azione esplicito (SALVA, COMMENTA, SCRIVIMI)
 * 2. Parola chiave trigger (GUIDA, SCHEDA, DM)
 * 3. Beneficio concreto (per ricevere il protocollo, per non perdere le correzioni)
 */
export async function generateReadyCTASlide(
  _slide: CarouselSlide,
  topic: string = 'Allenamento e Ipertrofia'
): Promise<ReadyCTAPlan> {
  const systemPrompt = `Sei un Copywriter ed Esperto di Conversion Rate Optimization per Instagram per Coach di Fitness e Biomeccanica d'élite (Metodo AC Training).
Il tuo compito è creare una Call to Action (CTA) finale magnetica e ad alta conversione per l'ultima slide di un carosello.

Requisiti obbligatori:
1. "headline": riga principale titolo (es. "VUOI IL PROTOCOLLO COMPLETO?", "SALVA LA GUIDA TECNICA") in MAIUSCOLO.
2. "headlineHighlight": riga evidenziata ad alto contrasto (es. "COMMENTA ORA 'GUIDA'", "PASSA AL LIVELLO SUCCESSIVO") in MAIUSCOLO.
3. "bodyText": testo persuasivo della CTA con azione concreta (Salva/Commenta), trigger chiaro ("GUIDA") e beneficio specifico (es. "Salva il post per averlo sempre con te durante l'allenamento. Commenta con la parola 'GUIDA' qui sotto per ricevere l'analisi biomeccanica completa direttamente in DM.").
4. "actionVerb": verbo principale (es. "Salva e Commenta").
5. "triggerKeyword": parola chiave da commentare o canale (es. "GUIDA" o "DM").
6. "benefit": beneficio diretto per l'atleta (es. "Ricevi il protocollo completo e la scheda tecnica in DM").
7. "reason": spiegazione del perché questa CTA converte.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido conforme a questa interfaccia:
{
  "headline": "...",
  "headlineHighlight": "...",
  "bodyText": "...",
  "actionVerb": "...",
  "triggerKeyword": "...",
  "benefit": "...",
  "reason": "..."
}`;

  const userPrompt = `Argomento carosello: "${topic}".
Genera una CTA finale irresistibile per massimizzare salvataggi e commenti qualificati.`;

  try {
    const aiResult = await generateContentWithGemini({
      userPrompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 600,
      responseMimeType: 'application/json',
    });

    const cleaned = aiResult.text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as ReadyCTAPlan;
    if (parsed.headline && parsed.bodyText) {
      return parsed;
    }
  } catch (err) {
    console.warn('Errore generazione CTA con Gemini, uso fallback Metodo AC:', err);
  }

  // Fallback di alto livello nel Metodo AC
  const isTall = /1[.,]85|alt[oi]|longiline|leve|femor|squat/i.test(`${topic} ${_slide.headline || ''} ${_slide.bodyText || ''}`);
  if (isTall) {
    return {
      headline: 'VUOI IL PROTOCOLLO COMPLETO?',
      headlineHighlight: 'COMMENTA CON "LEVE"',
      bodyText: `Salva questo post per consultarlo prima del tuo prossimo allenamento gambe.\n\nCommenta con la parola "LEVE" qui sotto per ricevere l'analisi biomeccanica personalizzata per atleti longilinei direttamente in DM.`,
      actionVerb: 'Salva e Commenta',
      triggerKeyword: 'LEVE',
      benefit: 'Ricevi la guida biomeccanica per atleti longilinei in DM',
      reason: 'Combina retention (salvataggio) e keyword "LEVE" ad alta pertinenza per il target specifico.',
    };
  }

  return {
    headline: 'VUOI IL PROTOCOLLO COMPLETO?',
    headlineHighlight: 'COMMENTA CON "GUIDA"',
    bodyText: `Salva questo post per consultarlo prima del tuo prossimo allenamento.\n\nCommenta con la parola "GUIDA" qui sotto per ricevere l'analisi biomeccanica completa su ${topic} direttamente in DM.`,
    actionVerb: 'Salva e Commenta',
    triggerKeyword: 'GUIDA',
    benefit: 'Ricevi il protocollo biomeccanico completo in DM',
    reason: 'Combina doppio trigger: salvataggio per retention e commento con keyword per viralità.',
  };
}


