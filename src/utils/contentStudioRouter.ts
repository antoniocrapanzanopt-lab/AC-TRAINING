import { ContentType } from '../types/inboxAndContent';

export type StudioFormat = ContentType;

/**
 * Normalizza qualsiasi variante o alias di formato nel formato canonico ContentType.
 * Mappature supportate:
 * - story: 'story', 'stories', 'storia', 'instagram_story', 'story_visual'
 * - carousel: 'carousel', 'carosello', 'caroselli', 'instagram_carousel'
 * - post: 'post', 'post_singolo', 'single_post', 'image', 'photo'
 * - reel: 'reel', 'video', 'reels', 'instagram_reel'
 * 
 * NOTA: Non usa fallback impliciti per formati noti!
 */
export function normalizeContentFormat(format?: string | null): StudioFormat {
  if (!format) return 'reel';
  const clean = format.toLowerCase().trim();

  // Mapping Stories
  if (
    ['story', 'stories', 'storia', 'instagram_story', 'story_visual', 'story_studio'].includes(clean) ||
    clean.startsWith('stor')
  ) {
    return 'story';
  }

  // Mapping Carosello
  if (
    ['carousel', 'carosello', 'caroselli', 'instagram_carousel', 'carousel_studio'].includes(clean) ||
    clean.startsWith('caros') ||
    clean.startsWith('carous')
  ) {
    return 'carousel';
  }

  // Mapping Post Singolo
  if (['post', 'post_singolo', 'single_post', 'image', 'photo'].includes(clean)) {
    return 'post';
  }

  // Mapping Reel
  if (['reel', 'video', 'reels', 'instagram_reel'].includes(clean) || clean.startsWith('reel')) {
    return 'reel';
  }

  return 'reel';
}

export interface StudioRouterCallbacks {
  openStoryStudio: (initialIndex?: number) => void;
  openCarouselStudio: (initialIndex?: number) => void;
  openReelStudio: () => void;
  openPostEditor: () => void;
}

/**
 * Funzione esplicita di routing verso lo studio specifico del formato:
 * switch:
 * - story → Story Studio (MAI Reel!)
 * - carousel → Carousel Studio (MAI Reel!)
 * - reel → Reel/Teleprompter Studio
 * - post → Post/Caption editor
 */
export function openContentStudio(
  formatInput: string | null | undefined,
  callbacks: StudioRouterCallbacks,
  initialIndex: number = 0
): void {
  const format = normalizeContentFormat(formatInput);

  switch (format) {
    case 'story':
      callbacks.openStoryStudio(initialIndex);
      break;

    case 'carousel':
      callbacks.openCarouselStudio(initialIndex);
      break;

    case 'reel':
      callbacks.openReelStudio();
      break;

    case 'post':
      callbacks.openPostEditor();
      break;

    default:
      if (typeof formatInput === 'string' && formatInput.toLowerCase().includes('stor')) {
        callbacks.openStoryStudio(initialIndex);
      } else if (
        typeof formatInput === 'string' &&
        (formatInput.toLowerCase().includes('caros') || formatInput.toLowerCase().includes('carous'))
      ) {
        callbacks.openCarouselStudio(initialIndex);
      } else {
        callbacks.openReelStudio();
      }
      break;
  }
}
