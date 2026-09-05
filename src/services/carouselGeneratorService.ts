import { InstagramContent } from '../types/inboxAndContent';
import {
  InstagramCarousel,
  CarouselSlide,
  CarouselSettings,
  SlideType,
  SlideLayoutId,
} from '../types/carousel';
import { loadBrandKit, DEFAULT_BRAND_KIT } from './brandKitService';

export const DEFAULT_CAROUSEL_SETTINGS: CarouselSettings = {
  templateId: 'editorial_dark',
  aspectRatio: '4:5',
  showSlideCounter: true,
  showSwipeIndicator: true,
  brandKit: DEFAULT_BRAND_KIT,
  authorHandle: DEFAULT_BRAND_KIT.authorHandle,
  brandWatermark: DEFAULT_BRAND_KIT.brandName,
  accentColor: DEFAULT_BRAND_KIT.accentColor,
  darkBgColor: DEFAULT_BRAND_KIT.primaryColor,
};

/**
 * Genera un ID univoco per la slide
 */
export const generateSlideId = (): string => {
  return `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Rigenera una singola slide proponendo un layout alternativo ad alto impatto
 */
export const regenerateSingleSlide = (
  slide: CarouselSlide,
  contentOrTitle: Partial<InstagramContent> | string,
  totalSlides: number = 7
): CarouselSlide => {
  const title = typeof contentOrTitle === 'string' ? contentOrTitle : contentOrTitle.title;
  const isFirst = slide.order === 1;
  const isLast = slide.order === totalSlides;
  const middleLayouts: SlideLayoutId[] = [
    'connected_icon_list',
    'diagram_flow',
    'error_vs_correct',
    'numbered_list',
    'step_by_step',
    'text_left',
  ];

  const randomLayout = isFirst
    ? 'dual_tone_cover'
    : isLast
    ? 'final_cta'
    : middleLayouts[Math.floor(Math.random() * middleLayouts.length)];

  return {
    ...slide,
    layout: randomLayout,
    headline: slide.headline || title || `Punto Chiave ${slide.order}`,
    headlineHighlight: slide.headlineHighlight || (isFirst ? 'SCOPRI COSA MOSTRANO I DATI' : undefined),
    isAiSuggested: true,
  };
};

/**
 * Prova a fare il parsing di uno script strutturato esistente (es. "Slide 1: ...", "1. Gancio...")
 */
const parseExistingScriptToSlides = (script: string): Partial<CarouselSlide>[] => {
  const lines = script.split('\n').map((l) => l.trim()).filter(Boolean);
  const slideBlocks: { title: string; body: string[] }[] = [];
  let currentBlock: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const slideMatch = line.match(/^(?:Slide|Scena|Punto)\s*(\d+)[\s:]*(.*)/i) || line.match(/^(\d+)\.[\s:]*(.*)/);
    if (slideMatch) {
      if (currentBlock) {
        slideBlocks.push(currentBlock);
      }
      currentBlock = {
        title: slideMatch[2]?.trim() || `Punto ${slideMatch[1]}`,
        body: [],
      };
    } else if (currentBlock) {
      currentBlock.body.push(line);
    }
  }

  if (currentBlock) {
    slideBlocks.push(currentBlock);
  }

  if (slideBlocks.length >= 3) {
    return slideBlocks.map((block, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === slideBlocks.length - 1;
      const type: SlideType = isFirst ? 'cover' : isLast ? 'cta' : 'practical_guide';
      const layout: SlideLayoutId = isFirst ? 'dual_tone_cover' : isLast ? 'final_cta' : (idx === 1 ? 'connected_icon_list' : 'numbered_list');
      
      const bullets = block.body
        .filter((b) => b.startsWith('-') || b.startsWith('•') || b.startsWith('*'))
        .map((b) => b.replace(/^[-•*]\s*/, ''));
      
      const nonBullets = block.body
        .filter((b) => !b.startsWith('-') && !b.startsWith('•') && !b.startsWith('*'))
        .join(' ');

      return {
        type,
        layout,
        headline: block.title,
        bodyText: nonBullets || (bullets.length > 0 ? '' : 'Dettaglio pratico applicabile in palestra.'),
        bulletPoints: bullets.length > 0 ? bullets : undefined,
      };
    });
  }

  return [];
};

/**
 * Generatore principale di Caroselli con selezione automatica del layout AI
 */
export const generateCarouselFromContent = (
  content: Partial<InstagramContent>,
  userImages: string[] = []
): InstagramCarousel => {
  const contentId = content.id || `temp_${Date.now()}`;
  const title = content.title || 'Nuovo Contenuto';
  const hook = content.hook || content.title || 'Sei sicuro di eseguire questo movimento nel modo corretto?';
  const cta = content.call_to_action || 'Salva questo post e commenta per ricevere la guida completa in DM';
  const brandKit = loadBrandKit();

  // Verifica se lo script ha già slide strutturate
  const parsedSlides = content.script_body ? parseExistingScriptToSlides(content.script_body) : [];

  let slides: CarouselSlide[] = [];

  if (parsedSlides.length >= 4) {
    // Adatta le slide estratte
    slides = parsedSlides.map((s, idx) => ({
      id: generateSlideId(),
      order: idx + 1,
      type: s.type || (idx === 0 ? 'cover' : idx === parsedSlides.length - 1 ? 'cta' : 'practical_guide'),
      layout: s.layout || (idx === 0 ? 'dual_tone_cover' : idx === parsedSlides.length - 1 ? 'final_cta' : 'connected_icon_list'),
      headline: s.headline || `Punto ${idx + 1}`,
      subheadline: idx === 0 ? 'Scorri per la guida completa ➔' : undefined,
      bodyText: s.bodyText || '',
      categoryTag: undefined,
      bulletPoints: s.bulletPoints,
      visualCue: idx === 0 ? 'Primo piano atleta / Copertina' : undefined,
      takeawayTag: idx === parsedSlides.length - 1 ? 'SALVA IL POST' : undefined,
      imageUrl: userImages[idx] || null,
      imageOpacity: 0.5,
      textAlign: idx === 0 ? 'center' : 'left',
      isAiSuggested: true,
    }));
  } else {
    // Generazione completa su 7 slide ispirata ai layout ad alto impatto (screenshot reference)
    slides = [
      // 1. Cover Slide (Layout: dual_tone_cover)
      {
        id: generateSlideId(),
        order: 1,
        type: 'cover',
        layout: 'dual_tone_cover',
        headline: hook.toUpperCase(),
        headlineHighlight: 'VEDIAMO COSA MOSTRANO I DATI!',
        subheadline: title ? `Analisi biomeccanica & studio: ${title}` : 'La guida pratica per chi ha leve lunghe e cerca massima ipertrofia.',
        bodyText: '',
        categoryTag: undefined,
        visualCue: 'Primo piano atleta / Foto d\'impatto dell\'esercizio con testo in sovrimpressione',
        takeawayTag: undefined,
        imageUrl: userImages[0] || null,
        imageOpacity: 0.55,
        textAlign: 'left',
        titleSize: 'xl',
        isAiSuggested: true,
      },
      // 2. Nodi Connessi (Layout: connected_icon_list - Stile Screenshot 2)
      {
        id: generateSlideId(),
        order: 2,
        type: 'problem',
        layout: 'connected_icon_list',
        headline: 'NESSUNO CAMBIA',
        headlineHighlight: 'SEMPLICEMENTE IMPARANDO QUALCOSA.',
        subheadline: 'Le persone progrediscono davvero solo quando:',
        bodyText: 'È esattamente il percorso biomeccanico che faremo insieme.',
        categoryTag: '■ FISIOLOGIA & PROGRESSIONE',
        visualCue: 'Schema vettoriale con icone connesse e parole chiave dorate',
        takeawayTag: 'PRINCIPIO BASE',
        bulletPoints: [
          '🎯 sanno dove vogliono andare con precisione.',
          '🔒 capiscono cosa le sta bloccando nel movimento.',
          '📈 imparano a stimolare il muscolo in modo mirato.',
        ],
        imageUrl: userImages[1] || null,
        imageOpacity: 0.45,
        textAlign: 'left',
        titleSize: 'lg',
        isAiSuggested: true,
      },
      // 3. Diagramma di Flusso (Layout: diagram_flow - Stile Screenshot 4)
      {
        id: generateSlideId(),
        order: 3,
        type: 'principle',
        layout: 'diagram_flow',
        headline: 'MA COSA SIGNIFICA',
        headlineHighlight: 'ARRIVARE A CEDIMENTO?',
        subheadline: 'Quando una serie finisce, non possiamo osservare direttamente se il muscolo target ha esaurito tutte le risorse:',
        bodyText: 'Non riuscire più a completare il compito stabilito (mantenere ROM e tecnica prestabiliti).',
        diagramStep1: 'Non riuscire più a completare il compito motorio (ROM e tecnica)',
        diagramStep2: 'Quello che nella letteratura scientifica viene definito:',
        diagramHighlightResult: 'TASK FAILURE!',
        punchlineQuote: 'ED È PROPRIO QUI CHE NASCE IL PRIMO EQUIVOCO...',
        categoryTag: '■ FISIOLOGIA DELL\'ALLENAMENTO',
        citationSource: 'Pelland et al 2022: PMID 35247203',
        visualCue: 'Schema di flusso con freccia e pillola coach con avatar',
        takeawayTag: 'ANALISI DATI',
        imageUrl: userImages[2] || null,
        imageOpacity: 0.45,
        textAlign: 'left',
        titleSize: 'lg',
        isAiSuggested: true,
      },
      // 4. Errore vs Correzione (Layout: error_vs_correct)
      {
        id: generateSlideId(),
        order: 4,
        type: 'practical_guide',
        layout: 'error_vs_correct',
        headline: 'L\'Errore da Evitare vs La Tecnica Corretta',
        subheadline: 'Confronto pratico per massimizzare la tensione sul muscolo:',
        bodyText: '',
        visualCue: 'Split screen: ❌ Errore a sinistra vs ✅ Correzione a destra',
        takeawayTag: 'CHECKPOINT PRATICO',
        wrongText: 'Chiudere l\'angolo e flettere la colonna per compensare il carico.',
        correctText: 'Mantenere il bacino neutro, allineare le leve e controllare la fase eccentrica.',
        imageUrl: userImages[3] || null,
        imageOpacity: 0.45,
        textAlign: 'left',
        titleSize: 'lg',
        isAiSuggested: true,
      },
      // 5. Progressione Step by Step (Layout: step_by_step)
      {
        id: generateSlideId(),
        order: 5,
        type: 'proof_example',
        layout: 'step_by_step',
        headline: 'Progressione & Gestione del Carico',
        subheadline: 'La sequenza per stimolare più fibre senza farsi male:',
        bodyText: 'NON aumentare i dischi se perdi il controllo della traiettoria:',
        visualCue: 'Timeline a 3 step con pallini di avanzamento',
        takeawayTag: 'CHECKPOINT METODO',
        categoryTag: '■ PROTOCOLLO ESECUTIVO',
        bulletPoints: [
          'Step 1: Padroneggia l\'allineamento con il 70% del carico abituale',
          'Step 2: Aumenta il tempo sotto tensione (3s di discesa eccentrica)',
          'Step 3: Incrementa il carico solo mantenendo la stessa forma impeccabile',
        ],
        imageUrl: userImages[4] || null,
        imageOpacity: 0.45,
        textAlign: 'left',
        titleSize: 'lg',
        isAiSuggested: true,
      },
      // 6. Riepilogo Regole d'Oro (Layout: numbered_list)
      {
        id: generateSlideId(),
        order: 6,
        type: 'recap',
        layout: 'numbered_list',
        headline: 'Ricapitolando in 3 Regole d\'Oro',
        subheadline: 'I principi cardine del metodo AC Coaching:',
        bodyText: '',
        visualCue: 'Grafica riassuntiva pulita con card numerate',
        takeawayTag: 'RECAP RAPIDO',
        bulletPoints: [
          '1. Adatta sempre l\'esercizio alla tua specifica anatomia',
          '2. Controlla la fase eccentrica per stimolare più fibre muscolari',
          '3. Dai priorità assoluta alla qualità di ogni singola ripetizione',
        ],
        imageUrl: userImages[5] || null,
        imageOpacity: 0.45,
        textAlign: 'left',
        titleSize: 'lg',
        isAiSuggested: true,
      },
      // 7. Call to Action Finale (Layout: final_cta)
      {
        id: generateSlideId(),
        order: 7,
        type: 'cta',
        layout: 'final_cta',
        headline: 'Vuoi Costruire un Fisico Forte e Senza Dolori?',
        subheadline: 'Salva questo carosello per consultarlo durante il tuo prossimo allenamento.',
        bodyText: cta || 'Commenta con "SCHEDA" sotto questo post per ricevere l\'analisi video personalizzata in DM.',
        visualCue: 'Box CTA con pulsante dorato e firma coach',
        takeawayTag: 'SALVA & APPLICA',
        imageUrl: userImages[6] || null,
        imageOpacity: 0.55,
        textAlign: 'center',
        titleSize: 'xl',
        isAiSuggested: true,
      },
    ];
  }

  return {
    id: `carousel_${Date.now()}`,
    content_id: contentId,
    status: 'draft',
    slides,
    settings: {
      templateId: 'hypertrophy_science',
      aspectRatio: '4:5',
      showSlideCounter: true,
      showSwipeIndicator: true,
      brandKit,
      authorHandle: brandKit.authorHandle,
      brandWatermark: brandKit.brandName,
      accentColor: brandKit.accentColor,
      darkBgColor: brandKit.primaryColor,
    },
    caption_export: content.caption || `${hook}\n\n${cta}\n\n#allenamento #biomeccanica #bodybuildingitalia #coachingonline`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * Crea una struttura carosello vuota per la modalità 'create'
 * Nessun testo demo, nessuna immagine demo, slides: []
 */
export const createEmptyCarousel = (contentId?: string): InstagramCarousel => {
  const brandKit = loadBrandKit();
  return {
    id: `carousel_${Date.now()}`,
    content_id: contentId || `temp_${Date.now()}`,
    status: 'draft',
    slides: [],
    settings: {
      templateId: 'editorial_dark',
      aspectRatio: '4:5',
      showSlideCounter: true,
      showSwipeIndicator: true,
      brandKit,
      authorHandle: brandKit.authorHandle,
      brandWatermark: brandKit.brandName,
      accentColor: brandKit.accentColor,
      darkBgColor: brandKit.primaryColor,
    },
    caption_export: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * Crea una prima Slide 01 vuota quando l'utente sceglie "Inizia da zero"
 * Tipo predefinito Cover, nessun testo demo, stato Bozza.
 */
export const createEmptyCoverSlide = (headlineText: string = ''): CarouselSlide => {
  return {
    id: generateSlideId(),
    order: 1,
    type: 'cover',
    layout: 'dual_tone_cover',
    headline: headlineText.trim().toUpperCase(),
    headlineHighlight: '',
    subheadline: '',
    bodyText: '',
    bulletPoints: [],
    visualCue: '',
    imageUrl: null,
    imageOpacity: 0.55,
    textAlign: 'left',
    titleSize: 'xl',
  };
};

/**
 * Genera una proposta di struttura carosello con AI (3, 5, 7 o 10 slide)
 * basandosi esclusivamente sul titolo o idea inserita dall'utente.
 */
export const generateCarouselProposalFromIdea = (
  titleOrIdea: string,
  slideCount: 3 | 5 | 7 | 10 = 7
): CarouselSlide[] => {
  const cleanTitle = titleOrIdea.trim() || 'Titolo Carosello';
  const slides: CarouselSlide[] = [];

  // Slide 1: Cover
  slides.push({
    id: generateSlideId(),
    order: 1,
    type: 'cover',
    layout: 'dual_tone_cover',
    headline: cleanTitle.toUpperCase(),
    headlineHighlight: 'GUIDA PRATICA',
    subheadline: 'Scorri per l\'analisi completa ➔',
    bodyText: '',
    bulletPoints: [],
    visualCue: 'Copertina grafica',
    imageUrl: null,
    imageOpacity: 0.55,
    textAlign: 'left',
    titleSize: 'xl',
    isAiSuggested: true,
  });

  if (slideCount === 3) {
    // 3 Slide: Cover, Concetto Chiave, CTA Finale
    slides.push({
      id: generateSlideId(),
      order: 2,
      type: 'practical_guide',
      layout: 'connected_icon_list',
      headline: 'Il Principio Chiave',
      subheadline: 'Cosa devi sapere prima di iniziare',
      bodyText: `Analisi sul tema: ${cleanTitle}`,
      bulletPoints: ['Fattore critico 1', 'Fattore critico 2', 'Applicazione pratica'],
      visualCue: 'Schema concettuale a punti',
      imageUrl: null,
      imageOpacity: 0.5,
      textAlign: 'left',
      isAiSuggested: true,
    });
  } else if (slideCount === 5) {
    // 5 Slide: Cover, Problema, Principio, Guida Pratica, CTA
    slides.push(
      {
        id: generateSlideId(),
        order: 2,
        type: 'problem',
        layout: 'connected_icon_list',
        headline: 'L\'Errore Più Frequente',
        subheadline: 'Perché l\'approccio standard fallisce',
        bodyText: `Cosa accade tipicamente su: ${cleanTitle}`,
        bulletPoints: ['Errore di impostazione iniziale', 'Compensazione tecnica o esecutiva', 'Perdita di efficacia'],
        visualCue: 'Elenco criticità',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      },
      {
        id: generateSlideId(),
        order: 3,
        type: 'principle',
        layout: 'text_center',
        headline: 'La Regola d\'Oro',
        subheadline: 'Il principio biomeccanico fondamentale',
        bodyText: `La corretta impostazione per padroneggiare ${cleanTitle}.`,
        bulletPoints: [],
        visualCue: 'Dichiarazione centrale',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'center',
        titleSize: 'xl',
        isAiSuggested: true,
      },
      {
        id: generateSlideId(),
        order: 4,
        type: 'practical_guide',
        layout: 'numbered_list',
        headline: 'I 3 Passaggi Chiave',
        subheadline: 'Guida applicativa per il tuo workout',
        bodyText: 'Come impostare il lavoro passo-passo:',
        bulletPoints: ['Fase 1: Setup e posizionamento', 'Fase 2: Controllo del movimento', 'Fase 3: Progressione del carico'],
        visualCue: 'Elenco numerato 1-2-3',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      }
    );
  } else if (slideCount === 7) {
    // 7 Slide (Struttura Standard)
    slides.push(
      {
        id: generateSlideId(),
        order: 2,
        type: 'problem',
        layout: 'connected_icon_list',
        headline: 'Perché il Metodo Classico Fallisce',
        subheadline: 'L\'errore invisibile che limita i tuoi progressi',
        bodyText: `Quando affronti ${cleanTitle}, applicare schemi generici porta a stalli.`,
        bulletPoints: ['Mancata personalizzazione delle leve', 'Traiettoria forzata non fisiologica', 'Sovraccarico articolare errato'],
        visualCue: 'Elenco problemi',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      },
      {
        id: generateSlideId(),
        order: 3,
        type: 'principle',
        layout: 'text_center',
        headline: 'Il Principio Biomeccanico',
        subheadline: 'Cosa dice la scienza applicata',
        bodyText: `Adatta l'esercizio alla tua struttura: non forzare la tua struttura all'esercizio.`,
        bulletPoints: [],
        visualCue: 'Statement autorevole',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'center',
        titleSize: 'xl',
        isAiSuggested: true,
      },
      {
        id: generateSlideId(),
        order: 4,
        type: 'practical_guide',
        layout: 'numbered_list',
        headline: 'La Sequenza Tecnica Corretta',
        subheadline: '3 step da applicare al prossimo allenamento',
        bodyText: 'Esecuzione passo-passo:',
        bulletPoints: ['Step 1: Punti di contatto stabili', 'Step 2: Cerniera controllata nel range utile', 'Step 3: Inversione dinamica senza strappi'],
        visualCue: 'Fasi numerate',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      },
      {
        id: generateSlideId(),
        order: 5,
        type: 'proof_example',
        layout: 'error_vs_correct',
        headline: 'Confronto: Errore vs Soluzione',
        subheadline: 'Differenza immediata di efficacia',
        wrongText: 'Movimento rapido senza controllo dei gradi di libertà',
        correctText: 'Tensione costante sul muscolo target nel profilo corretto',
        bodyText: 'La differenza tra uno stimolo efficace e uno spreco di energia.',
        visualCue: 'Box comparativo ❌ vs ✅',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      },
      {
        id: generateSlideId(),
        order: 6,
        type: 'recap',
        layout: 'connected_icon_list',
        headline: 'Recap in 3 Punti Chiave',
        subheadline: 'Memorizza prima di entrare in sala pesi',
        bodyText: 'I punti da tenere a mente:',
        bulletPoints: ['Priorità al controllo della traiettoria', 'Progressione del carico solo a parità di tecnica', 'Registra sempre le serie target'],
        visualCue: 'Badge recap',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      }
    );
  } else {
    // 10 Slide (Approfondimento completo)
    for (let i = 2; i <= 9; i++) {
      slides.push({
        id: generateSlideId(),
        order: i,
        type: i % 2 === 0 ? 'practical_guide' : 'principle',
        layout: i === 2 ? 'connected_icon_list' : i === 5 ? 'error_vs_correct' : i === 9 ? 'connected_icon_list' : 'numbered_list',
        headline: i === 9 ? 'Riepilogo Generale' : `Punto ${i}: Approfondimento Tecnico`,
        subheadline: `Dettaglio per: ${cleanTitle}`,
        bodyText: `Analisi del punto ${i} focalizzata sull'applicazione pratica e biomeccanica.`,
        bulletPoints: [`Aspetto fondamentale ${i}.1`, `Aspetto fondamentale ${i}.2`],
        visualCue: 'Layout tecnico',
        imageUrl: null,
        imageOpacity: 0.5,
        textAlign: 'left',
        isAiSuggested: true,
      });
    }
  }

  // Slide Finale: CTA (sempre ultima)
  slides.push({
    id: generateSlideId(),
    order: slideCount,
    type: 'cta',
    layout: 'final_cta',
    headline: 'Vuoi Applicare Questo Metodo?',
    subheadline: 'Salva il carosello per averlo a portata di mano.',
    bodyText: `Commenta con "${cleanTitle.split(' ')[0].toUpperCase() || 'GUIDA'}" per ricevere la risorsa completa in DM.`,
    bulletPoints: [],
    visualCue: 'Box CTA finale',
    takeawayTag: 'SALVA & APPLICA',
    imageUrl: null,
    imageOpacity: 0.55,
    textAlign: 'center',
    titleSize: 'xl',
    isAiSuggested: true,
  });

  return slides;
};

