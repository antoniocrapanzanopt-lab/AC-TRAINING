export type CoverFormat = '9:16' | '4:5';

export type CoverStatus = 'to_create' | 'draft' | 'ready';

export type CoverTemplateId =
  | 'bold_editorial'        // Titolo grande 2 toni, contrasto cinematografico
  | 'scientific_breakdown'  // Tag kinesiologico superiore, box titolo tecnico
  | 'minimal_focus'         // Massima pulizia, focus su hook ed esecuzione
  | 'badge_impact';         // Titolo centrale con badge pillola accento

export interface InstagramCoverData {
  id?: string;
  templateId: CoverTemplateId;
  format: CoverFormat;
  status: CoverStatus;
  headline: string;
  headlineHighlight?: string;
  subheadline?: string;
  categoryBadge?: string;
  authorHandle?: string;
  imageUrl?: string | null;
  imageOpacity?: number; // 0.2 a 1.0 (default 0.55)
  imageScale?: number;   // 0.8 a 2.5 (default 1.0)
  imagePosition?: { x: number; y: number }; // offset percentuale (-50 a 50)
  accentColor?: string;  // default #E6A817
  darkBgColor?: string;  // default #0A0B0D
  textColor?: string;    // default #FFFFFF

  // Colori & Branding indipendenti (Cover Studio)
  badgeColor?: string;
  titleColor?: string;
  highlightColor?: string;
  subtitleColor?: string;
  handleColor?: string;
  overlayColor?: string;
  decorativeColor?: string;

  fontTitle?: string;    // Outfit / Inter
  fontBody?: string;     // Inter
  showGridCropGuide?: boolean; // Guide 1080x1080 per i Reel
  showSafeArea?: boolean;
  updated_at?: string;
}

export interface CoverColors {
  badgeColor: string;
  titleColor: string;
  highlightColor: string;
  subtitleColor: string;
  handleColor: string;
  overlayColor: string;
  decorativeColor: string;
}

