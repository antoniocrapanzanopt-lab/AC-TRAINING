import { InstagramCoverData, CoverFormat } from '../types/cover';
import { ContentType, ContentPillar } from '../types/inboxAndContent';

/**
 * Genera una struttura predefinita per la copertina di Reel o Post
 */
export function generateDefaultCoverFromContent(content: {
  title?: string | null;
  hook?: string | null;
  type?: ContentType | null;
  pillar?: ContentPillar | null;
  cover_data?: InstagramCoverData | null;
}): InstagramCoverData {
  if (content.cover_data && content.cover_data.headline) {
    return content.cover_data;
  }

  const format: CoverFormat = content.type === 'post' ? '4:5' : '9:16';
  const cleanTitle = (content.title || '').trim();
  const cleanHook = (content.hook || '').trim();

  let headline = 'SEI PRONTO A CAMBIARE?';
  let headlineHighlight = 'ECCO COSA FARE';

  if (cleanHook) {
    const parts = cleanHook.split(/[?!:]|\.\s+/).filter(Boolean);
    if (parts.length >= 2) {
      headline = parts[0].trim().replace(/[.?!:,;]+$/, '').toUpperCase();
      headlineHighlight = parts[1].trim().replace(/[.?!:,;]+$/, '').toUpperCase();
    } else {
      headline = cleanHook.replace(/[.?!:,;]+$/, '').toUpperCase();
      headlineHighlight = 'GUIDA COMPLETA';
    }
  } else if (cleanTitle) {
    headline = cleanTitle.replace(/[.?!:,;]+$/, '').toUpperCase();
    headlineHighlight = 'ANALISI AC';
  }

  // Categoria Badge derivata dal pilastro del Metodo AC
  let categoryBadge = '■ GUIDA BIOMECCANICA';
  if (content.pillar === 'technique_execution') categoryBadge = '■ TECNICA ED ESECUZIONE';
  else if (content.pillar === 'common_mistakes') categoryBadge = '■ ERRORI DA EVITARE';
  else if (content.pillar === 'nutrition_science') categoryBadge = '■ NUTRIZIONE SCIENTIFICA';
  else if (content.pillar === 'client_transformation') categoryBadge = '■ CASO STUDIO ATLETA';
  else if (content.pillar === 'mindset_discipline') categoryBadge = '■ MINDSET & DISCIPLINA';

  return {
    templateId: 'bold_editorial',
    format,
    status: cleanTitle || cleanHook ? 'draft' : 'to_create',
    headline,
    headlineHighlight,
    subheadline: 'Guarda il video completo per scoprire la correzione biomeccanica.',
    categoryBadge,
    authorHandle: '@antoniocrapanzano_coach',
    imageUrl: '/assets/squat_tall_athlete_cover.jpg',
    imageOpacity: 0.55,
    imageScale: 1.0,
    imagePosition: { x: 0, y: 0 },
    accentColor: '#E6A817',
    darkBgColor: '#0A0B0D',
    textColor: '#FFFFFF',
    badgeColor: '#F5C518',
    titleColor: '#FFFFFF',
    highlightColor: '#F5C518',
    subtitleColor: '#E5E7EB',
    handleColor: '#FFFFFF',
    overlayColor: '#000000',
    decorativeColor: '#F5C518',
    fontTitle: 'Outfit',
    fontBody: 'Inter',
    showGridCropGuide: false,
    showSafeArea: false,
    updated_at: new Date().toISOString(),
  };
}
