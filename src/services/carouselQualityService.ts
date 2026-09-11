import {
  InstagramCarousel,
  CarouselSlide,
  CarouselQualityAudit,
  SlideQualityReport,
  SlideQualityStatus,
  SlideQualityIssue,
  CarouselValidationReport,
  QualityBreakdown,
} from '../types/carousel';

// Regex per rilevamento contenuti placeholder, test, parole spazzatura o potenzialmente offensive
const PLACEHOLDER_OR_TEST_REGEX = /\b(scemo chi legge|lorem ipsum|asdasd|prova test|test post|carosello inutile|testo inutile|placeholder|bla bla|xxx|yyy|boh|ciao ciao)\b/i;
const PROFANITY_REGEX = /\b(cazzo|merda|stronzo|coglione|puttana|troia|vaffanculo|bastardo|idiota|deficiente)\b/i;

// Titoli troppo generici o telegrafici per copertina Instagram
const GENERIC_COVER_TITLES_REGEX = /^(allenamento|guida|ipertrofia|consigli|errori|scheda|workout|fitness|tips|squat|panca|stacco|come fare|post utile|biomeccanica|consigli utili)$/i;

/**
 * Valuta una singola slide calcolando stato (ready, warning, blocked, draft) ed eventuali criticità
 */
export const validateSlideQuality = (
  slide: CarouselSlide,
  index: number,
  totalSlides: number,
  _allSlides: CarouselSlide[] = [],
  captionText?: string
): SlideQualityReport => {
  const issues: SlideQualityIssue[] = [];
  const isFirstSlide = index === 0;
  const isLastSlide = index === totalSlides - 1;

  // Tutte le stringhe testuali della slide
  const allSlideText = [
    slide.headline || '',
    slide.headlineHighlight || '',
    slide.subheadline || '',
    slide.bodyText || '',
    slide.wrongText || '',
    slide.correctText || '',
    slide.punchlineQuote || '',
    ...(slide.bulletPoints || []),
  ].join(' ').trim();

  const words = allSlideText ? allSlideText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // 1. Controllo Placeholder / Test / Volgarità (CRITICO -> BLOCCANTE)
  const placeholderMatch = allSlideText.match(PLACEHOLDER_OR_TEST_REGEX);
  const profanityMatch = allSlideText.match(PROFANITY_REGEX);

  if (placeholderMatch) {
    issues.push({
      id: `placeholder_${index}`,
      severity: 'critical',
      title: 'Testo di test o placeholder rilevato',
      message: `La slide contiene testo placeholder o di prova non idoneo alla pubblicazione: "${placeholderMatch[0]}".`,
      actionType: 'fix_placeholder',
      actionLabel: 'Correggi Testo',
    });
  }

  if (profanityMatch) {
    issues.push({
      id: `profanity_${index}`,
      severity: 'critical',
      title: 'Linguaggio inappropriato',
      message: `Rilevato termine offensivo o scurrile nel testo della slide: "${profanityMatch[0]}".`,
      actionType: 'fix_placeholder',
      actionLabel: 'Modifica Linguaggio',
    });
  }

  // 2. Controllo Titolo della Slide
  const headlineClean = (slide.headline || '').trim();
  const headlineWords = headlineClean ? headlineClean.split(/\s+/).filter(Boolean).length : 0;
  const isFinalCtaWithContent = (slide.layout === 'final_cta' || slide.type === 'cta') && Boolean(
    slide.bodyText?.trim() || slide.ctaBoxTitle?.trim() || slide.punchlineQuote?.trim() || slide.takeawayTag?.trim()
  );

  if (!headlineClean) {
    if (!isFinalCtaWithContent) {
      issues.push({
        id: `missing_headline_${index}`,
        severity: 'critical',
        title: 'Titolo assente o vuoto',
        message: 'La slide non ha un titolo. Ogni slide deve avere un\'intestazione chiara.',
        actionType: 'manual_edit',
        actionLabel: 'Inserisci Titolo',
      });
    }
  } else if (headlineClean.length < 4) {
    issues.push({
      id: `short_title_${index}`,
      severity: 'warning',
      title: 'Titolo troppo breve',
      message: `Il titolo "${headlineClean}" è molto sintetico e potrebbe risultare poco incisivo.`,
      actionType: 'manual_edit',
      actionLabel: 'Espandi Titolo',
    });
  } else if (headlineClean.length > 95 && !isFirstSlide) {
    issues.push({
      id: `long_title_${index}`,
      severity: 'warning',
      title: 'Titolo molto esteso',
      message: `Il titolo ha ${headlineClean.length} caratteri e rischia di occupare troppo spazio verticale.`,
      actionType: 'ai_reduce',
      actionLabel: 'Sintetizza con AI',
    });
  }

  // 3. Controllo Qualità Editoriale della Copertina
  let editorialStatus: 'hook_improvable' | 'optimal' | undefined = undefined;
  if (isFirstSlide && headlineClean) {
    const isWeakHook = headlineClean.length < 16 || headlineWords < 4 || GENERIC_COVER_TITLES_REGEX.test(headlineClean);
    if (isWeakHook) {
      editorialStatus = 'hook_improvable';
      issues.push({
        id: 'weak_cover_hook',
        severity: 'warning',
        title: 'Hook di copertina migliorabile',
        message: `Il titolo "${headlineClean}" è generico o debole per lo scroll del feed. Un hook efficace deve incuriosire o provocare.`,
        actionType: 'ai_improve_hook',
        actionLabel: 'Migliora Hook',
      });
    } else {
      editorialStatus = 'optimal';
    }
  }

  // 4. Controllo Invarianti di Posizione (Copertina)
  if (isFirstSlide && slide.type !== 'cover') {
    issues.push({
      id: 'first_slide_not_cover',
      severity: 'warning',
      title: 'Prima slide non impostata come Copertina',
      message: 'La slide #1 dovrebbe essere di tipo Copertina per massimizzare il click-through dal feed.',
      actionType: 'set_cover',
      actionLabel: 'Imposta come Copertina',
    });
  }

  // 5. Controllo Approfondito della Call To Action (CTA Finale)
  // Viene valutata come CTA solo se il carosello ha almeno 2 slide ed è l'ultima slide,
  // OPPURE se la slide è esplicitamente configurata come tipo 'cta' o layout 'final_cta'
  const isTargetCTA = (totalSlides >= 2 && isLastSlide) || slide.type === 'cta' || slide.layout === 'final_cta';
  if (isTargetCTA) {
    // 5a. Controllo Azione Esplicita (Verbi d'azione)
    const hasExplicitAction = /salva|commenta|scrivi|invia|condividi|clicca|richiedi|prenota|entra|leggi|scarica|applica/i.test(allSlideText);
    if (!hasExplicitAction) {
      issues.push({
        id: 'cta_no_action',
        severity: 'warning',
        title: 'Azione esplicita assente nella CTA',
        message: 'L\'ultima slide non contiene un verbo d\'azione chiaro (es. "Salva il post", "Commenta con la parola chiave", "Scrivimi in DM").',
        actionType: 'ai_generate_cta',
        actionLabel: 'Genera Azione con AI',
      });
    }

    // 5b. Controllo Parola Chiave o Modalità di Contatto
    const hasKeywordOrContact = /guida|scheda|info|check|coaching|analisi|dm|direct|link in bio|messaggio privato|direct message|dm instagram/i.test(allSlideText);
    if (!hasKeywordOrContact) {
      issues.push({
        id: 'cta_no_keyword',
        severity: 'warning',
        title: 'Parola chiave o modalità di contatto assente',
        message: 'Consigliamo di specificare una parola chiave trigger da commentare (es. "Commenta GUIDA") o il canale diretto (es. "Scrivimi in DM").',
        actionType: 'ai_generate_cta',
        actionLabel: 'Aggiungi Keyword / Canale',
      });
    }

    // 5c. Controllo Coerenza con la Caption del Post (se fornita)
    if (captionText && captionText.length > 10) {
      const captionWantsDm = /dm|direct|messaggio\s+privato/i.test(captionText);
      const captionWantsComment = /commenta|commento|parola\s+chiave/i.test(captionText);
      const slideWantsDm = /dm|direct|messaggio\s+privato/i.test(allSlideText);
      const slideWantsComment = /commenta|commento/i.test(allSlideText);

      if (captionWantsDm && !slideWantsDm && slideWantsComment) {
        issues.push({
          id: 'cta_caption_mismatch',
          severity: 'warning',
          title: 'Disallineamento CTA con la caption',
          message: 'La caption invita a scrivere in DM, mentre la slide finale chiede di commentare. Allinea l\'azione per non confondere l\'utente.',
          actionType: 'manual_edit',
          actionLabel: 'Allinea con Caption',
        });
      } else if (captionWantsComment && !slideWantsComment && slideWantsDm) {
        issues.push({
          id: 'cta_caption_mismatch',
          severity: 'warning',
          title: 'Disallineamento CTA con la caption',
          message: 'La caption invita a commentare, mentre la slide finale chiede di scrivere in DM. Allinea l\'azione per massimizzare la conversione.',
          actionType: 'manual_edit',
          actionLabel: 'Allinea con Caption',
        });
      }
    }

    // 5d. Controllo Beneficio o Motivo per agire (supporta anche pronomi enclitici: riceverla, averlo, scaricarlo, ecc.)
    const hasBenefitOrReason = /per\s+(ricevere|ricever[laoie]|aumentare|migliorare|scoprire|scoprir[laoie]|evitare|evitar[laoie]|trasformare|ottenere|ottener[laoie]|scaricare|scaricar[laoie]|leggere|legger[laoie]|approfondire|approfondir[laoie]|non\s+perdere|avere|aver[laoie]|costruire|massimizzare)|così\s+da|in\s+modo\s+da|e\s+ricevi|ti\s+invio/i.test(allSlideText);
    if (!hasBenefitOrReason) {
      issues.push({
        id: 'cta_no_benefit',
        severity: 'warning',
        title: 'Beneficio o motivo per agire poco chiaro',
        message: 'Consigliamo di esplicitare il beneficio diretto ottenuto (es. "per ricevere il protocollo completo", "per non perdere i prossimi approfondimenti").',
        actionType: 'ai_generate_cta',
        actionLabel: 'Aggiungi Beneficio',
      });
    }
  } else if (totalSlides > 1 && !isLastSlide && (slide.type === 'cta' || slide.layout === 'final_cta')) {
    issues.push({
      id: `misplaced_cta_${index}`,
      severity: 'warning',
      title: 'CTA posizionata all\'interno del carosello',
      message: `La slide #${index + 1} è una CTA, ma non si trova all\'ultima posizione (#${totalSlides}).`,
      actionType: 'set_cta',
      actionLabel: 'Sposta alla Fine',
    });
  }

  // 6. Controllo Lunghezza Testo e Rischio Overflow
  const isFinalCta = slide.layout === 'final_cta' || slide.type === 'cta';
  const severeLimit = isFinalCta ? 90 : 65;
  const denseLimit = isFinalCta ? 75 : 40;

  if (wordCount > severeLimit) {
    issues.push({
      id: `overflow_severe_${index}`,
      severity: 'critical',
      title: `Testo eccessivo: ${wordCount} parole`,
      message: `${wordCount} parole presenti: supera ampiamente il volume consigliato e crea rischio di overflow visivo con il footer da smartphone.`,
      actionType: 'ai_reduce',
      actionLabel: 'Riduci con AI',
    });
  } else if (wordCount > denseLimit) {
    issues.push({
      id: `overflow_warning_${index}`,
      severity: 'warning',
      title: `Testo denso: ${wordCount} parole`,
      message: `${wordCount} parole presenti: per formato 1080×1350 consigliamo sintesi per garantire lettura immediata da smartphone.`,
      actionType: 'ai_reduce',
      actionLabel: 'Riduci con AI',
    });
  }

  // 7. Controllo Corpo del Testo per tipologie informative
  const isContentSlide = ['problem', 'principle', 'practical_guide', 'recap', 'proof_example'].includes(slide.type);
  const hasBodyContent = Boolean(
    (slide.bodyText && slide.bodyText.trim().length > 5) ||
    (slide.bulletPoints && slide.bulletPoints.length > 0) ||
    (slide.wrongText && slide.correctText)
  );

  if (isContentSlide && !hasBodyContent) {
    issues.push({
      id: `missing_body_${index}`,
      severity: 'warning',
      title: 'Corpo del testo mancante',
      message: 'Questa slide di contenuto non contiene testo o punti elenco.',
      actionType: 'manual_edit',
      actionLabel: 'Compila Corpo',
    });
  }

  // 7b. Controlli Immagine & Composizione
  if (slide.imageUrl) {
    const overlay = slide.imageOverlay ?? (slide.imageOpacity !== undefined ? Math.round((1 - slide.imageOpacity) * 100) : 0);
    const posX = slide.imagePositionX ?? 50;
    const posY = slide.imagePositionY ?? 50;
    const align = slide.textAlign || 'left';

    // Contrasto insufficiente
    if (overlay < 25) {
      issues.push({
        id: `low_image_contrast_${index}`,
        severity: 'warning',
        title: 'Contrasto testo/immagine ridotto',
        message: 'L\'immagine ha un overlay scuro inferiore al 25%: il testo potrebbe essere poco leggibile su schermi luminosi.',
        actionType: 'manual_edit',
        actionLabel: 'Aumenta Overlay',
      });
    }

    // Collisione testo / soggetto
    if (overlay < 45) {
      if (posX < 35 && align === 'left') {
        issues.push({
          id: `text_subject_overlap_${index}`,
          severity: 'warning',
          title: 'Possibile sovrapposizione testo/soggetto',
          message: 'Il soggetto principale è a sinistra e il testo è allineato a sinistra: consigliamo di allineare a destra o aumentare l\'overlay.',
          actionType: 'manual_edit',
          actionLabel: 'Allinea a Destra',
        });
      } else if (posX > 65 && align === 'right') {
        issues.push({
          id: `text_subject_overlap_${index}`,
          severity: 'warning',
          title: 'Possibile sovrapposizione testo/soggetto',
          message: 'Il soggetto principale è a destra e il testo è allineato a destra: consigliamo di allineare a sinistra o aumentare l\'overlay.',
          actionType: 'manual_edit',
          actionLabel: 'Allinea a Sinistra',
        });
      }
    }

    // Soggetto o punto focale fuori dalla safe area
    if (slide.imageFocalPoint) {
      const { x, y } = slide.imageFocalPoint;
      if (x < 10 || x > 90 || y < 10 || y > 90) {
        issues.push({
          id: `focal_point_edge_${index}`,
          severity: 'warning',
          title: 'Punto focale troppo vicino al bordo',
          message: `Il punto focale (${x}%, ${y}%) rischia di uscire dall'area sicura di visualizzazione Instagram.`,
          actionType: 'manual_edit',
          actionLabel: 'Ricentra Immagine',
        });
      }
    } else if (posX < 8 || posX > 92 || posY < 8 || posY > 92) {
      issues.push({
        id: `image_edge_${index}`,
        severity: 'warning',
        title: 'Posizione immagine estrema',
        message: 'L\'offset dell\'immagine è quasi al limite e potrebbe causare tagli visivi su alcuni dispositivi.',
        actionType: 'manual_edit',
        actionLabel: 'Ricentra Immagine',
      });
    }
  } else if (slide.layout === 'photo_dominant') {
    issues.push({
      id: `missing_photo_dominant_${index}`,
      severity: 'warning',
      title: 'Foto consigliata per layout fotografico',
      message: 'Il layout selezionato è progettato per dare risalto a una fotografia ad alto impatto.',
      actionType: 'manual_edit',
      actionLabel: 'Carica Foto',
    });
  }

  // 8. Calcolo Stato Finale della Slide
  // Regola fondamentale:
  // - BLOCCATA: errore critico bloccante presente (export impedito);
  // - DA RIVEDERE: warning non bloccanti presenti (tranne quando l'unico warning sulla copertina è l'hook);
  // - PRONTA: tecnicamente esportabile (se la copertina è tecnicamente valida, rimane PRONTA con editorialStatus = 'hook_improvable').
  const hasCritical = issues.some((i) => i.severity === 'critical');
  const nonCoverWarnings = issues.filter((i) => i.id !== 'weak_cover_hook' && i.severity === 'warning');

  let status: SlideQualityStatus;
  if (hasCritical) {
    status = 'blocked';
  } else if (!headlineClean) {
    status = 'draft';
  } else if (isFirstSlide && issues.some((i) => i.id === 'weak_cover_hook') && nonCoverWarnings.length === 0) {
    // Copertina tecnicamente valida ed esportabile: stato PRONTA, con suggerimento editoriale
    status = 'ready';
  } else if (issues.some((i) => i.severity === 'warning')) {
    status = 'warning';
  } else {
    status = 'ready';
  }

  return {
    slideId: slide.id,
    slideIndex: index,
    slideOrder: index + 1,
    status,
    editorialStatus,
    wordCount,
    hasCriticalIssue: hasCritical,
    issues,
  };
};

/**
 * Calcola il breakdown a 5 dimensioni del punteggio di qualità (Struttura, Leggibilità, Copertina, Completezza, Coerenza)
 */
export const calculateQualityBreakdown = (
  slides: CarouselSlide[],
  slideReports: SlideQualityReport[],
  globalIssues: SlideQualityIssue[]
): QualityBreakdown => {
  // 1. STRUTTURA (max 20 pt)
  let structureScore = 20;
  let structureReason = 'Progressione narrativa ideale (Copertina → Contenuti → CTA finale).';
  if (slides.length < 3) {
    structureScore -= 8;
    structureReason = `Carosello molto breve (${slides.length} slide). Consigliamo almeno 5–8 slide.`;
  } else if (slides.length > 10) {
    structureScore -= 12;
    structureReason = `Superato il limite massimo Instagram di 10 slide (${slides.length} slide).`;
  }
  if (slides.length > 0 && slides[0].type !== 'cover') {
    structureScore -= 4;
    structureReason = 'La prima slide non è impostata come Copertina.';
  }
  if (slides.length > 1) {
    const last = slides[slides.length - 1];
    if (last.type !== 'cta' && last.layout !== 'final_cta') {
      structureScore -= 4;
      structureReason = 'La slide finale non è configurata come Call To Action.';
    }
  }
  structureScore = Math.max(0, Math.min(20, structureScore));
  const structureStatus = structureScore >= 18 ? 'pass' : structureScore >= 12 ? 'warning' : 'fail';

  // 2. LEGGIBILITÀ (max 20 pt)
  let readabilityScore = 20;
  let readabilityReason = 'Densità testuale ergonomica per smartphone (<50 parole) e safe area rispettata.';
  const heavySlides = slideReports.filter((r) => r.wordCount > 50 && r.wordCount <= 65);
  const severeSlides = slideReports.filter((r) => r.wordCount > 65);
  if (severeSlides.length > 0) {
    readabilityScore -= severeSlides.length * 6;
    readabilityReason = `${severeSlides.length} slide con densità critica (>65 parole). Rischio overflow.`;
  } else if (heavySlides.length > 0) {
    readabilityScore -= heavySlides.length * 3;
    readabilityReason = `${heavySlides.length} slide superano le 50 parole consigliate per la lettura rapida.`;
  }
  readabilityScore = Math.max(0, Math.min(20, readabilityScore));
  const readabilityStatus = readabilityScore >= 18 ? 'pass' : readabilityScore >= 12 ? 'warning' : 'fail';

  // 3. COPERTINA (max 20 pt)
  let coverScore = 20;
  let coverReason = 'Titolo magnetico a 2 toni con forte capacità di aggancio nel feed.';
  if (slides.length > 0) {
    const coverReport = slideReports[0];
    const coverSlide = slides[0];
    const headline = (coverSlide?.headline || '').trim();
    if (!headline) {
      coverScore -= 20;
      coverReason = 'Titolo della copertina assente o vuoto.';
    } else if (coverReport?.editorialStatus === 'hook_improvable') {
      coverScore -= 5;
      coverReason = 'Hook di copertina migliorabile: valuta le 3 alternative generate con AI.';
    }
  }
  coverScore = Math.max(0, Math.min(20, coverScore));
  const coverStatus = coverScore >= 18 ? 'pass' : coverScore >= 12 ? 'warning' : 'fail';

  // 4. COMPLETEZZA (max 20 pt)
  let completenessScore = 20;
  let completenessReason = 'Contenuti completi, nessun testo placeholder residuo o bozza vuota.';
  const criticalCount = slideReports.filter((r) => r.hasCriticalIssue).length + globalIssues.filter((i) => i.severity === 'critical').length;
  const draftSlides = slideReports.filter((r) => r.status === 'draft');
  if (criticalCount > 0) {
    completenessScore -= criticalCount * 12;
    completenessReason = `${criticalCount} errore critico (placeholder o testo non valido).`;
  }
  if (draftSlides.length > 0) {
    completenessScore -= draftSlides.length * 4;
    completenessReason = `${draftSlides.length} slide con corpi testo o titoli incompleti.`;
  }
  completenessScore = Math.max(0, Math.min(20, completenessScore));
  const completenessStatus = completenessScore >= 18 ? 'pass' : completenessScore >= 12 ? 'warning' : 'fail';

  // 5. COERENZA (max 20 pt)
  let coherenceScore = 20;
  let coherenceReason = 'Azione esplicita, canale o parola chiave di contatto definiti con chiarezza.';
  if (slides.length > 1) {
    const lastReport = slideReports[slides.length - 1];
    const noAction = lastReport?.issues.some((i) => i.id === 'cta_no_action');
    const noKeyword = lastReport?.issues.some((i) => i.id === 'cta_no_keyword');
    const noBenefit = lastReport?.issues.some((i) => i.id === 'cta_no_benefit');
    const mismatch = lastReport?.issues.some((i) => i.id === 'cta_caption_mismatch');

    if (noAction) {
      coherenceScore -= 6;
      coherenceReason = 'La CTA finale non specifica un verbo d\'azione chiaro (es. "Salva", "Commenta").';
    }
    if (noKeyword) {
      coherenceScore -= 5;
      coherenceReason = 'La CTA finale non include una parola chiave (es. "GUIDA") o canale di contatto ("DM").';
    }
    if (noBenefit) {
      coherenceScore -= 3;
      coherenceReason = 'La CTA finale non esplicita chiaramente il beneficio ottenuto compiendo l\'azione.';
    }
    if (mismatch) {
      coherenceScore -= 4;
      coherenceReason = 'Disallineamento tra l\'azione della CTA nella slide e il testo della caption.';
    }
  }
  coherenceScore = Math.max(0, Math.min(20, coherenceScore));
  const coherenceStatus = coherenceScore >= 18 ? 'pass' : coherenceScore >= 12 ? 'warning' : 'fail';

  return {
    structure: {
      name: 'Struttura',
      score: structureScore,
      maxScore: 20,
      status: structureStatus,
      description: structureReason,
    },
    readability: {
      name: 'Leggibilità',
      score: readabilityScore,
      maxScore: 20,
      status: readabilityStatus,
      description: readabilityReason,
    },
    cover: {
      name: 'Copertina',
      score: coverScore,
      maxScore: 20,
      status: coverStatus,
      description: coverReason,
    },
    completeness: {
      name: 'Completezza',
      score: completenessScore,
      maxScore: 20,
      status: completenessStatus,
      description: completenessReason,
    },
    coherence: {
      name: 'Coerenza',
      score: coherenceScore,
      maxScore: 20,
      status: coherenceStatus,
      description: coherenceReason,
    },
  };
};

/**
 * Valuta l'intero carosello ed emette un report completo con breakdown a 5 dimensioni
 */
export const validateEntireCarousel = (carousel: InstagramCarousel): CarouselValidationReport => {
  const slides = carousel.slides || [];

  // Se il carosello non ha slide, ritorna stato neutro "Non iniziato" (zero penalità o falsi blocchi)
  if (slides.length === 0) {
    return {
      score: 0,
      breakdown: {
        structure: { name: 'Struttura', score: 0, maxScore: 20, status: 'pass', description: 'Nessuna slide ancora creata.' },
        readability: { name: 'Leggibilità', score: 0, maxScore: 20, status: 'pass', description: 'Nessun testo presente.' },
        cover: { name: 'Copertina', score: 0, maxScore: 20, status: 'pass', description: 'Copertina non creata.' },
        completeness: { name: 'Completezza', score: 0, maxScore: 20, status: 'pass', description: 'Carosello non iniziato.' },
        coherence: { name: 'Coerenza', score: 0, maxScore: 20, status: 'pass', description: 'Carosello non iniziato.' },
      },
      totalSlides: 0,
      readyCount: 0,
      warningCount: 0,
      blockedCount: 0,
      draftCount: 0,
      canExport: false,
      qualityReason: 'Non iniziato: nessuna slide ancora creata.',
      slideReports: [],
      globalIssues: [],
    };
  }

  const slideReports = slides.map((s, idx) =>
    validateSlideQuality(s, idx, slides.length, slides, carousel.caption_export)
  );
  const globalIssues: SlideQualityIssue[] = [];

  // Controllo globale numero slide
  if (slides.length > 10) {
    globalIssues.push({
      id: 'max_slides_exceeded',
      severity: 'critical',
      title: 'Superato limite Instagram (10 slide)',
      message: `Il carosello ha ${slides.length} slide. Instagram supporta un massimo di 10 slide.`,
      actionType: 'manual_edit',
      actionLabel: 'Riduci a 10',
    });
  } else if (slides.length < 3) {
    globalIssues.push({
      id: 'min_slides_recommended',
      severity: 'warning',
      title: 'Carosello molto breve',
      message: `Il carosello ha solo ${slides.length} slide. Consigliamo almeno 5–8 slide per tempo di permanenza ottimale.`,
      actionType: 'manual_edit',
      actionLabel: 'Aggiungi Slide',
    });
  }

  const blockedCount = slideReports.filter((r) => r.status === 'blocked').length + globalIssues.filter((i) => i.severity === 'critical').length;
  const warningCount = slideReports.filter((r) => r.status === 'warning').length + globalIssues.filter((i) => i.severity === 'warning').length;
  const draftCount = slideReports.filter((r) => r.status === 'draft').length;
  const readyCount = slideReports.filter((r) => r.status === 'ready').length;

  const canExport = blockedCount === 0 && slides.length >= 1 && slides.length <= 10;

  // Calcolo breakdown qualitativo a 5 dimensioni
  const breakdown = calculateQualityBreakdown(slides, slideReports, globalIssues);
  const rawSum = breakdown.structure.score + breakdown.readability.score + breakdown.cover.score + breakdown.completeness.score + breakdown.coherence.score;
  const score = blockedCount > 0 ? Math.min(rawSum, 59) : rawSum;

  // Calcolo motivazione del punteggio in linguaggio naturale
  let qualityReason = '';
  if (blockedCount > 0) {
    const firstBlocked = slideReports.find((r) => r.status === 'blocked');
    const issueMsg = firstBlocked?.issues.find((i) => i.severity === 'critical')?.message || 'Errori critici presenti';
    qualityReason = `${blockedCount} blocco critico: ${issueMsg}. Risolvi per sbloccare l'esportazione.`;
  } else if (warningCount > 0) {
    const firstWarn = slideReports.find((r) => r.status === 'warning');
    const issueTitle = firstWarn?.issues.find((i) => i.severity === 'warning')?.title || 'suggerimenti editoriali';
    qualityReason = `${score}/100: Carosello valido ed esportabile con ${warningCount} suggerimenti editoriali (${issueTitle}).`;
  } else if (draftCount > 0) {
    qualityReason = `${score}/100: Presenti slide con contenuti incompleti da completare.`;
  } else {
    qualityReason = '100/100: Carosello impeccabile! Rispetta tutti i massimi standard editoriali e visivi Instagram.';
  }

  return {
    score,
    breakdown,
    totalSlides: slides.length,
    readyCount,
    warningCount,
    blockedCount,
    draftCount,
    canExport,
    qualityReason,
    slideReports,
    globalIssues,
  };
};

/**
 * Adattatore retrocompatibile per CarouselQualityAudit
 */
export const auditCarouselQuality = (carousel: InstagramCarousel): CarouselQualityAudit => {
  const report = validateEntireCarousel(carousel);

  const checks = report.slideReports.flatMap((sr) =>
    sr.issues.map((i) => ({
      id: i.id,
      title: `Slide ${sr.slideOrder}: ${i.title}`,
      passed: i.severity === 'info',
      level: i.severity === 'critical' ? ('error' as const) : i.severity === 'warning' ? ('warning' as const) : ('info' as const),
      message: i.message,
      suggestion: i.actionLabel,
    }))
  );

  return {
    score: report.score,
    checks,
  };
};
