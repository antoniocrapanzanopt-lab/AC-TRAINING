import {
  InstagramStory,
  InstagramStorySequence,
  StoryQualityReport,
  StorySequenceQualityReport,
} from '../types/story';

/**
 * Conta le parole effettive in una singola story
 */
export function countStoryWords(story: InstagramStory): number {
  const parts = [
    story.headline,
    story.headlineHighlight,
    story.subheadline,
    story.bodyText,
    ...(story.bulletPoints || []),
  ];
  const combined = parts.filter(Boolean).join(' ');
  if (!combined.trim()) return 0;
  return combined.trim().split(/\s+/).length;
}

/**
 * Valida la qualità di una singola story
 */
export function validateStoryQuality(
  story: InstagramStory,
  index: number,
  totalStories: number
): StoryQualityReport {
  const wordCount = countStoryWords(story);
  const issues: StoryQualityReport['issues'] = [];

  // 1. Controllo Segnaposto o Placeholder
  const textToCheck = [
    story.headline,
    story.headlineHighlight,
    story.subheadline,
    story.bodyText,
  ].join(' ').toLowerCase();

  if (
    textToCheck.includes('[scena]') ||
    textToCheck.includes('[cue]') ||
    textToCheck.includes('lorem ipsum') ||
    textToCheck.includes('inserisci qui') ||
    textToCheck.includes('placeholder')
  ) {
    issues.push({
      id: 'placeholder_detected',
      severity: 'error',
      title: 'Segnaposto Rilevato',
      message: 'La storia contiene testo segnaposto o note di bozza non compilate.',
    });
  }

  // 2. Controllo Titolo Vuoto
  if (!story.headline || !story.headline.trim()) {
    issues.push({
      id: 'empty_headline',
      severity: 'error',
      title: 'Titolo Mancante',
      message: 'Ogni storia richiede un titolo principale visibile.',
    });
  }

  // 2b. Controllo Testo Bozza / Digitazione Casuale (es. stringhe senza spazi > 25 caratteri)
  const fieldsToCheck = [story.headline, story.headlineHighlight, story.subheadline, story.bodyText].filter(Boolean);
  for (const f of fieldsToCheck) {
    if (f && f.length > 25 && !f.includes(' ')) {
      issues.push({
        id: 'unformatted_text',
        severity: 'warning',
        title: 'Testo Bozza Non Formattato',
        message: 'Rilevata una sequenza continua di caratteri senza spazi. Controlla il testo inserito.',
      });
      break;
    }
  }

  // 3. Controllo Densità Testuale (<40 parole ideale per 15s di story)
  if (wordCount > 45) {
    issues.push({
      id: 'text_overflow',
      severity: 'warning',
      title: 'Testo Troppo Denso',
      message: `Questa storia contiene ${wordCount} parole. Nelle stories Instagram si consiglia un massimo di 35-40 parole per garantire lettura prima dello scorrimento.`,
    });
  }

  // 4. Controllo Hook sulla Prima Storia
  if (index === 0) {
    if (story.headline && story.headline.trim().length < 10) {
      issues.push({
        id: 'weak_hook',
        severity: 'warning',
        title: 'Hook Visivo Debole',
        message: 'La prima storia deve fermare il tap: usa una domanda o un contrasto forte.',
      });
    }
  }

  // 5. Controllo CTA sull'Ultima Storia
  if (index === totalStories - 1) {
    const hasDm =
      story.layout === 'final_cta_dm' ||
      (story.sticker && story.sticker.type === 'dm') ||
      textToCheck.includes('dm') ||
      textToCheck.includes('scrivi') ||
      textToCheck.includes('commenta');

    if (!hasDm) {
      issues.push({
        id: 'missing_dm_cta',
        severity: 'warning',
        title: 'CTA Finale Incompleta',
        message: 'L\'ultima storia deve contenere una Call to Action esplicita verso i DM o un link.',
      });
    }
  }

  // 6. Controlli Immagine Story
  if (story.imageUrl) {
    const overlay = story.imageOverlay ?? 40;
    const posY = story.imagePositionY ?? 50;

    if (overlay < 20) {
      issues.push({
        id: 'story_low_image_contrast',
        severity: 'warning',
        title: 'Contrasto Sfondo Story Basso',
        message: 'L\'overlay scuro dell\'immagine è inferiore al 20%: il testo bianco potrebbe risultare poco visibile.',
      });
    }

    if (posY < 10) {
      issues.push({
        id: 'story_image_top_edge',
        severity: 'warning',
        title: 'Soggetto Vicino all\'Header Instagram',
        message: 'L\'immagine è posizionata molto in alto e rischia di essere coperta dalla barra utente delle stories.',
      });
    } else if (posY > 88) {
      issues.push({
        id: 'story_image_bottom_edge',
        severity: 'warning',
        title: 'Soggetto Vicino alla Barra Rispondi',
        message: 'L\'immagine è posizionata molto in basso e rischia di essere coperta dal campo di invio messaggio.',
      });
    }
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  let status: 'ready' | 'warning' | 'blocked' = 'ready';
  if (hasError) status = 'blocked';
  else if (hasWarning) status = 'warning';

  return {
    storyId: story.id,
    order: story.order,
    wordCount,
    status,
    issues,
  };
}

/**
 * Valuta la sequenza complessiva di Instagram Stories
 */
export function validateEntireStorySequence(sequence: InstagramStorySequence): StorySequenceQualityReport {
  const stories = sequence.stories || [];
  const storyReports = stories.map((s, idx) => validateStoryQuality(s, idx, stories.length));

  const blockedCount = storyReports.filter((r) => r.status === 'blocked').length;
  const warningCount = storyReports.filter((r) => r.status === 'warning').length;

  const hasInteraction = stories.some(
    (s) =>
      s.layout === 'poll_sticker' ||
      s.layout === 'question_box' ||
      s.layout === 'slider_rating' ||
      s.layout === 'quiz_interactive'
  );

  const hasCta = stories.length > 0 && (
    stories[stories.length - 1].layout === 'final_cta_dm' ||
    stories[stories.length - 1].type === 'final_cta_dm' ||
    (stories[stories.length - 1].sticker?.type === 'dm')
  );

  // Calcolo Punteggio (Base 100)
  let score = 100;
  score -= blockedCount * 25;
  score -= warningCount * 8;
  if (!hasInteraction) score -= 15;
  if (!hasCta) score -= 15;
  if (stories.length < 3) score -= 20;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    canExport: blockedCount === 0 && stories.length > 0,
    totalStories: stories.length,
    warningCount,
    blockedCount,
    hasInteraction,
    hasCta,
    storyReports,
  };
}
