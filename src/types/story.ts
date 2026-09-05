/**
 * Tipi di dominio per Instagram Story Studio (1080×1920 / 9:16)
 */

export type StoryType =
  | 'visual_hook'
  | 'educational_value'
  | 'problem_solution'
  | 'poll_interactive'
  | 'question_box'
  | 'slider_interactive'
  | 'quiz_interactive'
  | 'proof_case'
  | 'final_cta_dm';

export type StoryLayoutId =
  | 'visual_hook'
  | 'text_card'
  | 'poll_sticker'
  | 'question_box'
  | 'slider_rating'
  | 'quiz_interactive'
  | 'comparison'
  | 'final_cta_dm';

export type StoryTemplateId =
  | 'minimal_dark'
  | 'science_highlight'
  | 'bold_impact'
  | 'coach_direct';

export type StoryStatus =
  | 'not_generated'
  | 'sequence_ready'
  | 'processing'
  | 'draft'
  | 'needs_review'
  | 'ready'
  | 'exported';

export type StorySticker =
  | {
      type: 'poll';
      question: string;
      optionA: string;
      optionB: string;
      percentA?: number;
      percentB?: number;
    }
  | {
      type: 'question';
      prompt: string;
      placeholder?: string;
    }
  | {
      type: 'slider';
      question: string;
      emoji: string;
      initialValue?: number;
    }
  | {
      type: 'quiz';
      question: string;
      options: { text: string; isCorrect: boolean }[];
    }
  | {
      type: 'dm';
      keyword: string;
      promptText: string;
    };

export interface InstagramStory {
  id: string;
  order: number; // 1-indexed (1, 2, 3...)
  type: StoryType;
  layout: StoryLayoutId;
  headline: string;
  headlineHighlight?: string;
  subheadline?: string;
  bodyText?: string;
  bulletPoints?: string[];
  visualCue?: string;
  interaction?: string;
  cta?: string;
  sticker?: StorySticker;
  imageUrl?: string | null;
  imageOpacity?: number;
  imageFit?: 'cover' | 'contain';
  imagePositionX?: number; // 0 - 100 (default: 50)
  imagePositionY?: number; // 0 - 100 (default: 50)
  imageZoom?: number;      // 1.0 - 3.0 (default: 1.0)
  imageOverlay?: number;   // 0 - 100 (opacità overlay scuro)
  imageFocalPoint?: {
    x: number;
    y: number;
  } | null;
  bgColor?: string;
  accentColor?: string;
  durationSeconds?: number;
  status?: StoryStatus;
  warnings?: string[];

  // Personalizzazione avanzata Tipografia & Posizione Testo (Hook Visuale)
  fontSizeTitle?: number;       // Dimensione Headline in px: 36 - 200 (default 70)
  fontSizeSubtitle?: number;    // Dimensione Sottotitolo in px: 20 - 80 (default 32)
  fontSizeBody?: number;        // Dimensione Corpo testo in px: 18 - 70 (default 32)
  textAlign?: 'left' | 'center' | 'right'; // Allineamento orizzontale (default 'left')
  textPositionY?: number;       // Posizione verticale Titolo & Highlight percentuale 8% - 75% (default 14%)
  titlePositionY?: number;      // Posizione verticale Titolo & Highlight (alias esplicito)
  bodyPositionY?: number;       // Posizione verticale Sottotitolo & Corpo del testo (15% - 85%, default 56%)
  fontFamily?: string;          // Famiglia Font per la story (default 'Inter')

  // Personalizzazione Colori Testo & Branding per singola story
  colorTitle?: string;          // Colore Headline (default '#FFFFFF')
  colorHighlight?: string;      // Colore Highlight dorato (default '#F59E0B')
  colorSubtitle?: string;       // Colore Sottotitolo (default '#94A3B8')
  colorBody?: string;           // Colore Corpo del testo (default '#E2E8F0')

  // Logo & Nome nella grafica story
  showLogo?: boolean;           // Mostra logo nella grafica story
  showBrandName?: boolean;      // Mostra nome/brand nella grafica story
  logoUrl?: string | null;      // URL o data URL del logo specifico per questa story
  brandName?: string;           // Nome visualizzato nella grafica (es. 'AC COACHING')
  brandPosition?: 'top' | 'bottom'; // Posizione branding: 'top' | 'bottom'
}

export interface InstagramStorySettings {
  templateId: StoryTemplateId;
  fontFamily: string;
  brandName: string;
  brandHandle: string;
  showWatermark: boolean;
  watermarkText?: string;
  logoUrl?: string | null;
  showLogo?: boolean;
  showBrandName?: boolean;
  brandPosition?: 'top' | 'bottom';
  textPositionY?: number;
  titlePositionY?: number;
  bodyPositionY?: number;
}

export interface InstagramStorySequence {
  id: string;
  title?: string;
  status: StoryStatus;
  settings: InstagramStorySettings;
  stories: InstagramStory[];
  created_at?: string;
  updated_at?: string;
}

export interface StoryQualityReport {
  storyId: string;
  order: number;
  wordCount: number;
  status: 'ready' | 'warning' | 'blocked';
  issues: {
    id: string;
    severity: 'warning' | 'error' | 'info';
    title: string;
    message: string;
  }[];
}

export interface StorySequenceQualityReport {
  score: number; // 0-100
  canExport: boolean;
  totalStories: number;
  warningCount: number;
  blockedCount: number;
  hasInteraction: boolean;
  hasCta: boolean;
  storyReports: StoryQualityReport[];
}
