import { InstagramCarousel, CarouselQualityAudit, CarouselQualityAuditItem } from '../types/carousel';

export const auditCarouselQuality = (carousel: InstagramCarousel): CarouselQualityAudit => {
  const checks: CarouselQualityAuditItem[] = [];
  const slides = carousel.slides || [];
  const slideCount = slides.length;

  // 1. Controllo Numero Slide (Consigliato 6-10)
  if (slideCount < 5) {
    checks.push({
      id: 'slide_count',
      title: 'Numero di slide ridotto',
      passed: false,
      level: 'warning',
      message: `Il carosello ha solo ${slideCount} slide. Per un coinvolgimento ottimale su Instagram consigliamo tra 6 e 10 slide.`,
      suggestion: 'Aggiungi una slide di approfondimento o un esempio pratico per aumentare il tempo di permanenza sul post.',
    });
  } else if (slideCount > 10) {
    checks.push({
      id: 'slide_count',
      title: 'Superato limite Instagram (10 slide)',
      passed: false,
      level: 'error',
      message: `Il carosello ha ${slideCount} slide. Instagram accetta al massimo 10 slide per carosello.`,
      suggestion: 'Accorpa o elimina ${slideCount - 10} slide per rispettare il limite della piattaforma.',
    });
  } else {
    checks.push({
      id: 'slide_count',
      title: 'Numero di slide ottimale',
      passed: true,
      level: 'info',
      message: `Ottima lunghezza (${slideCount} slide), perfetta per massimizzare il completamento del carosello.`,
    });
  }

  // 2. Controllo Hook Copertina (Slide 1)
  const coverSlide = slides[0];
  if (coverSlide) {
    const hookLen = coverSlide.headline.trim().length;
    if (hookLen < 15) {
      checks.push({
        id: 'cover_hook',
        title: 'Hook in copertina troppo breve',
        passed: false,
        level: 'warning',
        message: 'Il titolo della prima slide è molto sintetico e potrebbe non catturare subito l\'attenzione nello scroll.',
        suggestion: 'Rendi l\'hook più provocatorio o focalizzato su un problema specifico (es. "Perché non senti i glutei sullo stacco?").',
      });
    } else if (hookLen > 95) {
      checks.push({
        id: 'cover_hook',
        title: 'Hook in copertina troppo lungo',
        passed: false,
        level: 'warning',
        message: 'Il titolo supera 95 caratteri. Su mobile potrebbe occupare troppo spazio e ridurre l\'impatto visivo.',
        suggestion: 'Sintetizza il titolo principale e sposta i dettagli nel sottotitolo.',
      });
    } else {
      checks.push({
        id: 'cover_hook',
        title: 'Hook di copertina incisivo',
        passed: true,
        level: 'info',
        message: 'Il titolo in copertina ha una lunghezza perfetta per essere letto istantaneamente nel feed.',
      });
    }
  }

  // 3. Controllo Sovraffollamento Testo (Slide con troppo testo)
  const overloadedSlides: number[] = [];
  slides.forEach((s, idx) => {
    const totalWords = (s.headline + ' ' + (s.subheadline || '') + ' ' + s.bodyText + ' ' + (s.bulletPoints?.join(' ') || '')).trim().split(/\s+/).length;
    if (totalWords > 55) {
      overloadedSlides.push(idx + 1);
    }
  });

  if (overloadedSlides.length > 0) {
    checks.push({
      id: 'text_density',
      title: 'Testo troppo denso in alcune slide',
      passed: false,
      level: 'warning',
      message: `Le slide #${overloadedSlides.join(', #')} contengono oltre 55 parole. Su schermi smartphone possono risultare pesanti da leggere.`,
      suggestion: 'Usa punti elenco brevi o spezza i concetti in due slide separate.',
    });
  } else {
    checks.push({
      id: 'text_density',
      title: 'Densità del testo equilibrata',
      passed: true,
      level: 'info',
      message: 'Tutte le slide mantengono una formattazione ariosa e leggibile su smartphone.',
    });
  }

  // 4. Controllo CTA Finale (Ultima Slide)
  const lastSlide = slides[slideCount - 1];
  if (lastSlide) {
    const textToCheck = (lastSlide.headline + ' ' + (lastSlide.subheadline || '') + ' ' + lastSlide.bodyText).toLowerCase();
    const hasCtaKeyword = ['salva', 'commenta', 'dm', 'condividi', 'guida', 'scheda', 'seguimi', 'link'].some((kw) => textToCheck.includes(kw));

    if (!hasCtaKeyword) {
      checks.push({
        id: 'final_cta',
        title: 'CTA finale debole o assente',
        passed: false,
        level: 'warning',
        message: 'L\'ultima slide non contiene un invito all\'azione esplicito (es. Salva il post o Commenta).',
        suggestion: 'Aggiungi una chiamata all\'azione chiara per massimizzare salvataggi e commenti.',
      });
    } else {
      checks.push({
        id: 'final_cta',
        title: 'Call to Action presente',
        passed: true,
        level: 'info',
        message: 'L\'ultima slide include un chiaro invito all\'azione per stimolare interazioni e lead.',
      });
    }
  }

  // 5. Controllo Ripetizioni tra Slide
  let hasDuplicateHeadlines = false;
  const headlinesSeen = new Set<string>();
  for (const s of slides) {
    const norm = s.headline.trim().toLowerCase();
    if (norm && headlinesSeen.has(norm)) {
      hasDuplicateHeadlines = true;
      break;
    }
    headlinesSeen.add(norm);
  }

  if (hasDuplicateHeadlines) {
    checks.push({
      id: 'headline_repetition',
      title: 'Titoli duplicati rilevati',
      passed: false,
      level: 'warning',
      message: 'Due o più slide hanno titoli quasi identici.',
      suggestion: 'Differenzia i titoli di ogni slide per scandire chiaramente la progressione dei concetti.',
    });
  } else {
    checks.push({
      id: 'headline_repetition',
      title: 'Progressione titoli coerente',
      passed: true,
      level: 'info',
      message: 'Ogni slide introduce un punto unico e ben distinto.',
    });
  }

  // Calcolo Punteggio Qualità Complessivo
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.passed).length;
  const errorPenalty = checks.filter((c) => !c.passed && c.level === 'error').length * 25;
  const warningPenalty = checks.filter((c) => !c.passed && c.level === 'warning').length * 10;

  const score = Math.max(20, Math.min(100, Math.round((passedChecks / totalChecks) * 100) - errorPenalty - warningPenalty));

  return {
    score,
    checks,
  };
};
