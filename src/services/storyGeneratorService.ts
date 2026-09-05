import {
  InstagramStory,
  InstagramStorySequence,
  StoryType,
  StoryLayoutId,
  StoryTemplateId,
} from '../types/story';
import { InstagramCarousel } from '../types/carousel';

interface GenerateStoryOptions {
  title?: string;
  scriptBody?: string;
  hook?: string;
  cta?: string;
  targetCount?: 3 | 5 | 7;
  templateId?: StoryTemplateId;
}

/**
 * Pulisce e separa un hook in Riga 1 (Headline) e Riga 2 (Highlight)
 */
function splitHookIntoHeadlineAndHighlight(hookText: string): { headline: string; highlight: string } {
  const clean = (hookText || '').trim();
  if (!clean) {
    return { headline: 'SCOPRI IL SEGRETO', highlight: 'PER ATLETI LONGILINEI' };
  }

  const parts = clean.split(/[?!:]|\.\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      headline: parts[0].trim().toUpperCase().replace(/[.?!:,;]+$/, ''),
      highlight: parts.slice(1).join(' ').trim().toUpperCase().replace(/[.?!:,;]+$/, ''),
    };
  }

  const words = clean.split(/\s+/);
  if (words.length > 4) {
    const half = Math.ceil(words.length / 2);
    return {
      headline: words.slice(0, half).join(' ').toUpperCase(),
      highlight: words.slice(half).join(' ').toUpperCase(),
    };
  }

  return {
    headline: clean.toUpperCase(),
    highlight: '',
  };
}

/**
 * Trasforma una scaletta testuale (o idea) in una sequenza strutturata di Instagram Stories (1080x1920)
 */
export function generateStoriesFromContent(options: GenerateStoryOptions): InstagramStorySequence {
  const count = options.targetCount || 5;
  const title = options.title || 'Guida Tecnica di Allenamento';
  const hook = options.hook || title;
  const cta = options.cta || 'Scrivimi in DM per ricevere la scheda completa.';
  const templateId = options.templateId || 'minimal_dark';

  const { headline: hookHead, highlight: hookHigh } = splitHookIntoHeadlineAndHighlight(hook);

  // Parsing delle scene dallo script_body se presente
  const rawScript = options.scriptBody || '';
  const sceneBlocks = rawScript
    .split(/(?=(?:(?:Scena|SCENA|\b\d+\.|\b\[SCENA\]|\b\[CUE\]|\b\[CTA\])\s*))/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 5);

  const stories: InstagramStory[] = [];

  // STORY 1: VISUAL HOOK
  stories.push({
    id: `story_hook_1`,
    order: 1,
    type: 'visual_hook',
    layout: 'visual_hook',
    headline: hookHead,
    headlineHighlight: hookHigh || 'GUIDA APPLICATA',
    subheadline: `Analisi e strategia pratica su: ${title}.`,
    bodyText: 'L\'errore più comune che blocca i progressi e come correggerlo subito.',
    visualCue: 'Inquadratura frontale a figura intera, sguardo deciso in camera',
    status: 'ready',
  });

  if (count === 3) {
    // SEQUENZA 3 STORIES (LEAD GEN RAPIDA)
    stories.push({
      id: `story_val_2`,
      order: 2,
      type: 'poll_interactive',
      layout: 'poll_sticker',
      headline: 'IL PUNTO CRITICO',
      headlineHighlight: 'ESECUZIONE E TENSIONE',
      bodyText: sceneBlocks[1] || `Come imposti la traiettoria e il controllo quando alleni ${title}?`,
      visualCue: 'Ripresa tecnica con fermo immagine sul punto di massima tensione',
      sticker: {
        type: 'poll',
        question: `Come senti il target su ${title.slice(0, 20)}?`,
        optionA: 'Tensione piena 🔥',
        optionB: 'Sento compensi ❌',
        percentA: 72,
        percentB: 28,
      },
      status: 'ready',
    });

    stories.push({
      id: `story_cta_3`,
      order: 3,
      type: 'final_cta_dm',
      layout: 'final_cta_dm',
      headline: 'VUOI L\'ANALISI PERSONALIZZATA?',
      headlineHighlight: 'SCRIVIMI IN DIRECT',
      bodyText: cta,
      visualCue: 'Contatto visivo diretto, grafica box CTA al centro',
      sticker: {
        type: 'dm',
        keyword: 'GUIDA',
        promptText: 'Invia "GUIDA" in DM',
      },
      status: 'ready',
    });
  } else if (count === 7) {
    // SEQUENZA 7 STORIES (DEEP DIVE EDUCATIVA)
    stories.push({
      id: `story_val_2`,
      order: 2,
      type: 'educational_value',
      layout: 'text_card',
      headline: 'LE VARIABILI BIOMECCANICHE',
      headlineHighlight: 'COSA CAMBIA DAVVERO',
      bodyText: sceneBlocks[1] || `Quando affronti ${title}, forzare traiettorie standard genera compensi articolari e riduce lo stimolo muscolare target.`,
      visualCue: 'Grafica tecnica con focus sui bracci di leva',
      bulletPoints: [
        'Centro di massa e traiettoria del carico',
        'Braccio di momento sul muscolo target',
        'Stabilità dei punti di contatto a terra',
      ],
      status: 'ready',
    });

    stories.push({
      id: `story_val_3`,
      order: 3,
      type: 'problem_solution',
      layout: 'comparison',
      headline: 'L\'ERRORE PIÙ COMUNE',
      headlineHighlight: 'VELOCITÀ VS TENSIONE',
      bodyText: sceneBlocks[2] || 'Accelerare l\'inversione toglie tensione meccanica proprio nel punto di massimo allungamento.',
      visualCue: 'Split screen con indicazione errore vs correzione',
      status: 'ready',
    });

    stories.push({
      id: `story_poll_4`,
      order: 4,
      type: 'poll_interactive',
      layout: 'poll_sticker',
      headline: 'CONTROLLA SUBITO',
      headlineHighlight: 'LA TUA ESECUZIONE',
      visualCue: 'Sticker sondaggio ben visibile al centro',
      sticker: {
        type: 'poll',
        question: 'Riesci a controllare il punto di inversione?',
        optionA: 'Sì, stop netto di 1" ✅',
        optionB: 'Rimbalzo elastico ❌',
        percentA: 65,
        percentB: 35,
      },
      status: 'ready',
    });

    stories.push({
      id: `story_val_5`,
      order: 5,
      type: 'educational_value',
      layout: 'text_card',
      headline: 'LA CORREZIONE',
      headlineHighlight: 'CONTROLLO MILLIMETRICO',
      bodyText: 'Mantieni il bacino stabile e guida il movimento con il muscolo target, non con l\'inerzia.',
      visualCue: 'Dimostrazione dell\'esecuzione corretta passo dopo passo',
      status: 'ready',
    });

    stories.push({
      id: `story_q_6`,
      order: 6,
      type: 'question_box',
      layout: 'question_box',
      headline: 'DUBBI SULLA TECNICA?',
      headlineHighlight: 'SCRIVIMI IL TUO DUBBIO',
      visualCue: 'Grafica box domande con invito a scrivere',
      sticker: {
        type: 'question',
        prompt: `Qual è la tua difficoltà principale con ${title.slice(0, 24)}?`,
        placeholder: 'Scrivi qui la tua domanda...',
      },
      status: 'ready',
    });

    stories.push({
      id: `story_cta_7`,
      order: 7,
      type: 'final_cta_dm',
      layout: 'final_cta_dm',
      headline: 'VUOI LA GUIDA COMPLETA?',
      headlineHighlight: 'SCRIVIMI IN DIRECT',
      bodyText: cta,
      visualCue: 'Puntatore verso il box messaggio',
      sticker: {
        type: 'dm',
        keyword: 'GUIDA',
        promptText: 'Invia "GUIDA" nei messaggi',
      },
      status: 'ready',
    });
  } else {
    // SEQUENZA 5 STORIES (PREDEFINITA E OTTIMALE)
    stories.push({
      id: `story_val_2`,
      order: 2,
      type: 'educational_value',
      layout: 'text_card',
      headline: 'IL PROBLEMA MECCANICO',
      headlineHighlight: 'ANATOMIA E LEVE',
      bodyText: sceneBlocks[1] || `Applicare schemi generici su ${title} porta a sovraccaricare articolazioni anziché stimolare le fibre bersaglio.`,
      visualCue: 'Schema visivo con evidenziazione del muscolo bersaglio',
      bulletPoints: [
        'Traiettoria forzata non fisiologica',
        'Perdita di stabilità articolare',
        'Stimolo muscolare disperso',
      ],
      status: 'ready',
    });

    stories.push({
      id: `story_val_3`,
      order: 3,
      type: 'problem_solution',
      layout: 'comparison',
      headline: 'LA REGOLA D\'ORO',
      headlineHighlight: 'ADATTA L\'ESERCIZIO A TE',
      bodyText: sceneBlocks[2] || 'Non forzare la tua struttura all\'esercizio: adatta la traiettoria alle tue leve per massimizzare il reclutamento.',
      visualCue: 'Inquadratura stretta sull\'angolo di lavoro corretto',
      status: 'ready',
    });

    stories.push({
      id: `story_poll_4`,
      order: 4,
      type: 'poll_interactive',
      layout: 'poll_sticker',
      headline: 'DIMMI LA TUA',
      headlineHighlight: 'COME TI ALLENI?',
      visualCue: 'Sticker sondaggio per massima interazione',
      sticker: {
        type: 'poll',
        question: `Hai mai adattato l'esecuzione su ${title.slice(0, 20)}?`,
        optionA: 'Sì, su misura per me 🎯',
        optionB: 'Faccio come tutti ⚡',
        percentA: 58,
        percentB: 42,
      },
      status: 'ready',
    });

    stories.push({
      id: `story_cta_5`,
      order: 5,
      type: 'final_cta_dm',
      layout: 'final_cta_dm',
      headline: 'VUOI LA SCHEDA COMPLETA?',
      headlineHighlight: 'SCRIVIMI IN DIRECT',
      bodyText: cta,
      visualCue: 'Box CTA con freccia dinamica verso i direct',
      sticker: {
        type: 'dm',
        keyword: 'GUIDA',
        promptText: 'Invia "GUIDA" in DM',
      },
      status: 'ready',
    });
  }

  return {
    id: `story_seq_${Date.now()}`,
    title: options.title || 'Sequenza Instagram Stories',
    status: 'draft',
    settings: {
      templateId,
      fontFamily: 'Inter',
      brandName: 'AC Coaching',
      brandHandle: '@antoniocrapanzano_coach',
      showWatermark: true,
      watermarkText: '• AC COACHING •',
    },
    stories,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Trasforma un Carosello Instagram esistente in una sequenza Stories 1080x1920
 */
export function generateStoriesFromCarousel(carousel: InstagramCarousel): InstagramStorySequence {
  const slides = carousel.slides || [];
  const stories: InstagramStory[] = slides.map((slide, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === slides.length - 1;

    let type: StoryType = 'educational_value';
    let layout: StoryLayoutId = 'text_card';

    if (isFirst) {
      type = 'visual_hook';
      layout = 'visual_hook';
    } else if (isLast) {
      type = 'final_cta_dm';
      layout = 'final_cta_dm';
    } else if (idx === 2) {
      type = 'poll_interactive';
      layout = 'poll_sticker';
    }

    return {
      id: `story_from_carousel_${slide.id || idx}`,
      order: idx + 1,
      type,
      layout,
      headline: slide.headline || 'DETTAGLIO TECNICO',
      headlineHighlight: slide.headlineHighlight,
      subheadline: slide.subheadline,
      bodyText: slide.bodyText,
      bulletPoints: slide.bulletPoints,
      sticker: isLast
        ? { type: 'dm', keyword: 'GUIDA', promptText: 'Invia "GUIDA" in DM' }
        : type === 'poll_interactive'
        ? { type: 'poll', question: 'Cosa ne pensi?', optionA: 'Concordo ✅', optionB: 'Ho dubbi ❓' }
        : undefined,
      status: 'ready',
    };
  });

  return {
    id: `story_seq_carousel_${Date.now()}`,
    title: carousel.caption_export?.slice(0, 40) || 'Stories da Carosello',
    status: 'draft',
    settings: {
      templateId: carousel.settings.templateId === 'hypertrophy_science' ? 'science_highlight' : 'minimal_dark',
      fontFamily: 'Inter',
      brandName: 'AC Coaching',
      brandHandle: '@antoniocrapanzano_coach',
      showWatermark: true,
      watermarkText: '• AC COACHING •',
    },
    stories,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
