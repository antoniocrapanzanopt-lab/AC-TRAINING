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
  | 'error_vs_correct'
  | 'product_breakdown';

export type LogoPosition = 'top_left' | 'top_right' | 'bottom_left' | 'none';
export type TitleFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type BodyFontSize = 'sm' | 'md' | 'lg';
export type TextAlignment = 'left' | 'center' | 'right';
export type ImageStyle = 'dark_gradient' | 'minimal_card' | 'full_bleed';

export type SlideImagePosition = 'bottom_cutout' | 'right_side' | 'top_half' | 'background_full';

export type TitleFontFamily = 'Inter' | 'Outfit' | 'Montserrat' | 'Bebas Neue';
export type BodyFontFamily = 'Inter' | 'Roboto' | 'Montserrat' | 'Outfit' | 'System';
export type SubtitleFontFamily = 'Inter' | 'Outfit' | 'Montserrat' | 'Bebas Neue' | 'Roboto' | 'System';

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
  showSlideCounter?: boolean;   // Mostra numeratore slide (es. 2/2)
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
  imageFit?: 'cover' | 'contain'; // Adattamento immagine (default: 'cover')
  imagePositionX?: number;      // 0 - 100 (default: 50)
  imagePositionY?: number;      // 0 - 100 (default: 50)
  imageZoom?: number;           // 1.0 - 3.0 (default: 1.0)
  imageOverlay?: number;        // 0 - 100 (opacità overlay scuro)
  imageFocalPoint?: {           // Punto focale soggetto (0-100)
    x: number;
    y: number;
  } | null;
  bgColor?: string;             // Override colore sfondo per singola slide
  accentColor?: string;         // Override colore accento per singola slide
  textAlign?: TextAlignment;
  titleFont?: TitleFontFamily;  // Override font titolo per singola slide
  bodyFont?: BodyFontFamily;    // Override font corpo per singola slide
  titleSize?: TitleFontSize;
  bodyFontSize?: BodyFontSize;
  titleFontSizePx?: number;     // Dimensione Titolo esatta in px (es. 28 - 80 px)
  titleColor?: string;          // Override colore Titolo Riga 1 (default: #FFFFFF)
  titleBold?: boolean;          // Grassetto Titolo (default: true)
  titleUnderline?: boolean;     // Sottolineato Titolo
  highlightFont?: TitleFontFamily; // Font Riga 2 Evidenziata (default: titleFont)
  highlightFontSizePx?: number; // Dimensione Riga 2 Evidenziata (default: titleFontSizePx)
  highlightColor?: string;      // Override colore Riga 2 Evidenziata (default: accentColor)
  highlightBold?: boolean;      // Grassetto Riga 2 Evidenziata (default: true)
  highlightUnderline?: boolean; // Sottolineato Riga 2 Evidenziata
  bodyFontSizePx?: number;      // Dimensione Corpo esatta in px (es. 18 - 40 px)
  subtitleFont?: SubtitleFontFamily; // Override font sottotitolo per singola slide
  subtitleFontSizePx?: number;  // Dimensione Sottotitolo esatta in px (es. 16 - 72 px)
  subtitleColor?: string;       // Override colore sottotitolo (es. #FFFFFF, #F5C518)
  subtitleBold?: boolean;       // Grassetto per sottotitolo
  subtitleUnderline?: boolean;  // Sottolineato per sottotitolo
  bodyColor?: string;           // Override colore corpo del testo (es. #CBD5E1, #FFFFFF)
  bodyBold?: boolean;           // Grassetto per corpo del testo
  bodyUnderline?: boolean;      // Sottolineato per corpo del testo
  showLogo?: boolean;
  showSlideNumber?: boolean;
  statNumber?: string;          // es. "90%", "+15kg", "3 Errori"
  statLabel?: string;           // es. "Delle persone sbaglia lo stacco"
  wrongText?: string;           // Per layout error_vs_correct (❌ Errore)
  correctText?: string;         // Per layout error_vs_correct (✅ Correzione)
  isAiSuggested?: boolean;

  // Spostamento & Posizionamento Flessibile dei Testi (in pixel)
  titleOffsetY?: number;        // Offset verticale per titolo/headline (-150 a +150 px)
  contentOffsetY?: number;      // Offset verticale per corpo/callout (-150 a +150 px)

  // Campi specifici per layout product_breakdown (Infografica 4 Callout)
  topBannerText?: string;       // es. "www.ironmanager.coach" o "www.antoniocrapanzano.it"
  calloutTopLeft?: { title: string; text: string };     // Callout quadrante Alto-Sinistra
  calloutTopRight?: { title: string; text: string };    // Callout quadrante Alto-Destra
  calloutBottomLeft?: { title: string; text: string };  // Callout quadrante Basso-Sinistra
  calloutBottomRight?: { title: string; text: string }; // Callout quadrante Basso-Destra
  showAuthorBadge?: boolean;    // Mostra card badge autore nel footer
  badgeCoachName?: string;      // Override nome autore nel badge
  badgeCoachTitle?: string;     // Override qualifica nel badge
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

export type SlideQualityStatus = 'ready' | 'warning' | 'blocked' | 'draft';

export interface SlideQualityIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionType?: 'ai_reduce' | 'ai_generate_cta' | 'ai_improve_hook' | 'set_cover' | 'set_cta' | 'fix_placeholder' | 'manual_edit';
  actionLabel?: string;
}

export interface CoverHookAlternative {
  id: string;
  headline: string;
  headlineHighlight?: string;
  subheadline?: string;
  angle: 'provocative' | 'scientific' | 'practical';
  angleLabel: string;
  description: string;
}

export interface QualityCategoryScore {
  name: string;
  score: number; // 0 - 20
  maxScore: 20;
  status: 'pass' | 'warning' | 'fail';
  description: string;
}

export interface QualityBreakdown {
  structure: QualityCategoryScore;     // Struttura (progressione, 3-10 slide, cover #1, CTA finale)
  readability: QualityCategoryScore;   // Leggibilità (densità parole, contrasto, gerarchia)
  cover: QualityCategoryScore;         // Copertina (chiarezza, hook attraente, impatto)
  completeness: QualityCategoryScore;  // Completezza (corpo testo, visual cue, bullet, no placeholder)
  coherence: QualityCategoryScore;     // Coerenza (CTA esplicita, keyword contatto, allineamento caption)
}

export interface SlideQualityReport {
  slideId: string;
  slideIndex: number;
  slideOrder: number;
  status: SlideQualityStatus;
  editorialStatus?: 'hook_improvable' | 'optimal';
  wordCount: number;
  hasCriticalIssue: boolean;
  issues: SlideQualityIssue[];
}

export interface CarouselValidationReport {
  score: number;
  breakdown: QualityBreakdown;
  totalSlides: number;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  draftCount: number;
  canExport: boolean;
  qualityReason: string;
  slideReports: SlideQualityReport[];
  globalIssues: SlideQualityIssue[];
}


