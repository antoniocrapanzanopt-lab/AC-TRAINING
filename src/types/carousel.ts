export type CarouselTemplateId = 
  | 'editorial_dark' 
  | 'hypertrophy_science'
  | 'bold_impact'
  | 'coach_framework' 
  | 'error_correction' 
  | 'personal_story' 
  | 'exercise_breakdown';

export type SlideLayoutId = 
  | 'text_left' 
  | 'text_right' 
  | 'text_center' 
  | 'dual_tone_cover'
  | 'connected_icon_list'
  | 'diagram_flow'
  | 'photo_dominant' 
  | 'text_over_image' 
  | 'numbered_list' 
  | 'step_by_step' 
  | 'final_cta' 
  | 'error_vs_correct';

export type LogoPosition = 'top_left' | 'top_right' | 'bottom_left' | 'none';
export type TitleFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type BodyFontSize = 'sm' | 'md' | 'lg';
export type TextAlignment = 'left' | 'center' | 'right';
export type ImageStyle = 'dark_gradient' | 'minimal_card' | 'full_bleed';

export type SlideImagePosition = 'bottom_cutout' | 'right_side' | 'top_half' | 'background_full';

export type TitleFontFamily = 'Inter' | 'Outfit' | 'Montserrat' | 'Bebas Neue';
export type BodyFontFamily = 'Inter' | 'Roboto' | 'Montserrat' | 'Outfit' | 'System';

export type CarouselStatus = 'draft' | 'needs_review' | 'ready' | 'exported';

export type SlideType = 
  | 'cover' 
  | 'problem' 
  | 'principle' 
  | 'practical_guide' 
  | 'proof_example' 
  | 'recap' 
  | 'cta';

export interface BrandKit {
  logoUrl?: string | null;
  brandName: string;            // "AC COACHING"
  authorHandle: string;         // "@antoniocrapanzano_coach"
  authorSignature: string;      // "Antonio Crapanzano • Performance Coach"
  primaryColor: string;         // "#070A10" (Obsidian Dark)
  secondaryColor: string;       // "#1E293B" (Deep Slate)
  accentColor: string;          // "#F59E0B" (Warm Amber Gold)
  ctaColor: string;             // "#F59E0B"
  titleFont: TitleFontFamily;
  bodyFont: BodyFontFamily;
  logoPosition: LogoPosition;
  watermarkText: string;        // "• AC COACHING •"
  imageStyle: ImageStyle;
}

export interface CarouselSlide {
  id: string;
  order: number;
  type: SlideType;
  layout?: SlideLayoutId;       // Layout specifico selezionato
  headline: string;
  headlineHighlight?: string;   // Seconda riga / parole in colore accento (es. "O MUSCOLARE?")
  subheadline?: string;
  bodyText: string;
  categoryTag?: string;         // es. "■ FISIOLOGIA DELL'ALLENAMENTO" o "■ L'ANGOLO DEL NERD"
  citationSource?: string;      // es. "Pelland et al 2022: PMID 35247203"
  punchlineQuote?: string;      // es. "ED È PROPRIO QUI CHE NASCE IL PRIMO EQUIVOCO..."
  diagramStep1?: string;        // Per layout diagram_flow
  diagramStep2?: string;        // Per layout diagram_flow
  diagramHighlightResult?: string; // Per layout diagram_flow (es. "TASK FAILURE!")
  highlightWords?: string[];
  bulletPoints?: string[];
  visualCue?: string;           // Indicazione di regia visiva / inquadratura
  takeawayTag?: string;         // es. "ERRORE BIOMECCANICO", "REGOLA D'ORO"
  imageUrl?: string | null;
  imageOpacity?: number;        // 0.0 - 1.0 (default: 0.6)
  imagePosition?: SlideImagePosition; // Posizione: 'bottom_cutout' | 'right_side' | 'top_half' | 'background_full'
  bgColor?: string;             // Override colore sfondo per singola slide
  accentColor?: string;         // Override colore accento per singola slide
  textAlign?: TextAlignment;
  titleFont?: TitleFontFamily;  // Override font titolo per singola slide
  bodyFont?: BodyFontFamily;    // Override font corpo per singola slide
  titleSize?: TitleFontSize;
  bodyFontSize?: BodyFontSize;
  titleFontSizePx?: number;     // Dimensione Titolo esatta in px (es. 28 - 80 px)
  bodyFontSizePx?: number;      // Dimensione Corpo esatta in px (es. 18 - 40 px)
  showLogo?: boolean;
  showSlideNumber?: boolean;
  statNumber?: string;          // es. "90%", "+15kg", "3 Errori"
  statLabel?: string;           // es. "Delle persone sbaglia lo stacco"
  wrongText?: string;           // Per layout error_vs_correct (❌ Errore)
  correctText?: string;         // Per layout error_vs_correct (✅ Correzione)
  isAiSuggested?: boolean;
}

export interface CarouselSettings {
  templateId: CarouselTemplateId;
  aspectRatio: '4:5'; // 1080x1350 px
  brandKit: BrandKit;
  showSlideCounter: boolean;
  showSwipeIndicator: boolean;
  authorHandle?: string; // Retrocompatibilità
  brandWatermark?: string; // Retrocompatibilità
  accentColor?: string; // Retrocompatibilità
  darkBgColor?: string; // Retrocompatibilità
}

export interface CarouselQualityAuditItem {
  id: string;
  title: string;
  passed: boolean;
  level: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export interface CarouselQualityAudit {
  score: number; // 0 - 100
  checks: CarouselQualityAuditItem[];
}

export interface InstagramCarousel {
  id: string;
  content_id: string;
  status: CarouselStatus;
  slides: CarouselSlide[];
  settings: CarouselSettings;
  caption_export?: string;
  created_at: string;
  updated_at: string;
}
