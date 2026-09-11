/**
 * GEMINI FLASH CAROUSEL ART DIRECTOR & GRAPHIC INTELLIGENCE
 * 
 * Modulo di intelligenza artificiale che opera ESCLUSIVAMENTE come ART DIRECTOR GRAFICO.
 * NON modifica, corregge, accorcia o riscrive mai il testo dell'utente.
 * Il testo è sacro e immutabile.
 * Genera esclusivamente parametri di design: tipografia, dimensioni, colori,
 * allineamento, posizioni, layout, sfondo e accento cromatico.
 */

import { generateContentWithGemini } from '../lib/ai/geminiClient';
import {
  CarouselSlide,
  InstagramCarousel,
  SlideLayoutId,
  SlideImagePosition,
  TitleFontFamily,
  BodyFontFamily,
  SubtitleFontFamily,
  BrandKit,
  CoverHookAlternative,
} from '../types/carousel';
import { InstagramContent } from '../types/inboxAndContent';

export type ArtDirectionFocus =
  | 'typography_hierarchy'
  | 'positioning_layout'
  | 'palette_contrast'
  | 'background_texture'
  | 'brand_kit_coherence';

export type ArtDirectionIntensity = 'light' | 'medium' | 'strong';

export interface ArtDirectionFocusOption {
  id: ArtDirectionFocus;
  label: string;
  desc: string;
  icon: string;
}

export const ART_DIRECTION_FOCUS_OPTIONS: ArtDirectionFocusOption[] = [
  { id: 'typography_hierarchy', label: 'Gerarchia tipografica', desc: 'Contrasto pesi, font e grandezze titoli/corpo', icon: '📝' },
  { id: 'positioning_layout', label: 'Posizionamento & Margini', desc: 'Centratura, offset verticali e ingombri safe area', icon: '📐' },
  { id: 'palette_contrast', label: 'Palette e contrasto', desc: 'Visibilità mobile, colori accento e tonalità', icon: '🎨' },
  { id: 'background_texture', label: 'Sfondo & Texture', desc: 'Glow atmosferico, gradiente dark e profondità', icon: '🌌' },
  { id: 'brand_kit_coherence', label: 'Coerenza Brand Kit', desc: 'Armonia con colori ufficiali e font del brand', icon: '👑' },
];

export interface ArtDirectorStyleProposal {
  // Tipografia Titolo (Riga 1)
  titleFont?: TitleFontFamily;
  titleFontSizePx?: number;
  titleBold?: boolean;
  titleColor?: string;

  // Tipografia Riga 2 Evidenziata
  highlightFont?: TitleFontFamily;
  highlightFontSizePx?: number;
  highlightBold?: boolean;
  highlightColor?: string;

  // Tipografia Sottotitolo
  subtitleFont?: SubtitleFontFamily;
  subtitleFontSizePx?: number;
  subtitleBold?: boolean;
  subtitleColor?: string;

  // Tipografia Corpo
  bodyFont?: BodyFontFamily;
  bodyFontSizePx?: number;
  bodyBold?: boolean;
  bodyColor?: string;

  // Allineamento e posizionamento
  textAlign?: 'left' | 'center' | 'right';
  titleOffsetY?: number;
  contentOffsetY?: number;

  // Layout e Immagine
  layout?: SlideLayoutId;
  imagePosition?: SlideImagePosition;
  imageOpacity?: number;

  // Sfondo & Accento
  bgColor?: string;
  accentColor?: string;
  backgroundType?: 'solid' | 'gradient' | 'ambient_glow';
  backgroundTexture?: 'clean' | 'subtle_grid' | 'tech_corners' | 'ambient_glow';

  // Nota sintetica stilistica (solo estetica/tecnica, mai testo)
  notes?: string;

  // Metadati di diagnosi
  isFallback?: boolean;
  intensity?: ArtDirectionIntensity;
  appliedFocuses?: ArtDirectionFocus[];
}

export interface ArtDirectorResult {
  proposal: ArtDirectorStyleProposal;
  appliedSlide: CarouselSlide;
  originalSlide: CarouselSlide;
  isFallback: boolean;
}

const VALID_TITLE_FONTS: TitleFontFamily[] = ['Inter', 'Outfit', 'Montserrat', 'Bebas Neue'];
const VALID_BODY_FONTS: BodyFontFamily[] = ['Inter', 'Roboto', 'Montserrat', 'Outfit', 'System'];
const VALID_SUBTITLE_FONTS: SubtitleFontFamily[] = ['Inter', 'Outfit', 'Montserrat', 'Bebas Neue', 'Roboto', 'System'];
const VALID_LAYOUTS: SlideLayoutId[] = [
  'text_left',
  'text_right',
  'text_center',
  'dual_tone_cover',
  'connected_icon_list',
  'diagram_flow',
  'photo_dominant',
  'text_over_image',
  'numbered_list',
  'step_by_step',
  'final_cta',
  'error_vs_correct',
  'product_breakdown',
];
const VALID_IMAGE_POSITIONS: SlideImagePosition[] = ['bottom_cutout', 'right_side', 'top_half', 'background_full'];

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Fallback "Editorial Dark": applica il preset di default garantito in caso di offline o JSON non valido
 */
export function getDefaultEditorialDarkProposal(
  slide: CarouselSlide,
  slideIndex: number,
  totalSlides: number,
  brandKit?: Partial<BrandKit>
): ArtDirectorStyleProposal {
  const isCover = slideIndex === 0 || slide.type === 'cover';
  const isCta = slideIndex === totalSlides - 1 || slide.type === 'cta';

  const totalWords = (slide.headline + ' ' + (slide.subheadline || '') + ' ' + (slide.bodyText || ''))
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Se il testo è molto lungo, riduciamo solo la dimensione del font, MAI tagliare o riscrivere parole
  let titleSize = isCover ? 64 : 50;
  let bodySize = 26;
  if (totalWords > 55) {
    titleSize = isCover ? 52 : 40;
    bodySize = 22;
  } else if (totalWords > 40) {
    titleSize = isCover ? 56 : 46;
    bodySize = 24;
  }

  const primaryBg = brandKit?.primaryColor || '#070A10';
  const accent = brandKit?.accentColor || '#F59E0B';

  return {
    titleFont: brandKit?.titleFont || 'Bebas Neue',
    titleFontSizePx: titleSize,
    titleBold: true,
    titleColor: '#FFFFFF',
    highlightFont: brandKit?.titleFont || 'Bebas Neue',
    highlightFontSizePx: titleSize,
    highlightBold: true,
    highlightColor: accent,
    subtitleFont: 'Inter',
    subtitleFontSizePx: isCover ? 28 : 24,
    subtitleBold: true,
    subtitleColor: isCover ? '#E2E8F0' : accent,
    bodyFont: brandKit?.bodyFont || 'Inter',
    bodyFontSizePx: bodySize,
    bodyBold: false,
    bodyColor: isCover ? '#CBD5E1' : '#94A3B8',
    textAlign: isCover ? 'center' : 'left',
    layout: isCover ? 'dual_tone_cover' : isCta ? 'final_cta' : (slide.layout || 'text_left'),
    titleOffsetY: 0,
    contentOffsetY: 0,
    imagePosition: slide.imagePosition || 'bottom_cutout',
    imageOpacity: slide.imageOpacity ?? 0.6,
    bgColor: primaryBg,
    accentColor: accent,
    backgroundType: 'solid',
    backgroundTexture: 'clean',
    notes: 'Stile Dark Editorial: gerarchia ad alto contrasto con accento oro e sfondo ossidiana profondo.',
    isFallback: true,
  };
}

/**
 * Validazione rigida del JSON in ingresso:
 * Se contiene chiavi che alterano il testo (o se il testo è stato modificato), la risposta è considerata invalida.
 */
function validateAndSanitizeArtDirectorJSON(
  rawJson: unknown,
  originalSlide: CarouselSlide
): ArtDirectorStyleProposal | null {
  if (!rawJson || typeof rawJson !== 'object') {
    return null;
  }

  const obj = rawJson as Record<string, unknown>;

  // CONTROLLO RIGIDO: se l'oggetto contiene chiavi testuali con stringhe diverse dall'originale, scarta la risposta!
  const textKeysToCheck = [
    'headline',
    'headlineHighlight',
    'subheadline',
    'bodyText',
    'wrongText',
    'correctText',
    'bulletPoints',
    'rewrittenText',
    'text',
    'content',
  ];

  for (const k of textKeysToCheck) {
    if (k in obj) {
      const val = obj[k];
      if (typeof val === 'string' && val.trim() !== '') {
        const origVal = (originalSlide as unknown as Record<string, unknown>)[k];
        if (typeof origVal === 'string' && origVal.trim() !== val.trim()) {
          console.warn(`[ArtDirector Validation] Tentativo di alterare il testo rilevato nella chiave "${k}". Risposta scartata.`);
          return null;
        }
      } else if (Array.isArray(val)) {
        console.warn(`[ArtDirector Validation] Array di testo rilevato nella chiave "${k}". Risposta scartata.`);
        return null;
      }
    }
  }

  // Estrai sia da struttura annidata (typography, layout, background) che flat
  const typography = (obj.typography && typeof obj.typography === 'object' ? obj.typography : obj) as Record<string, unknown>;
  const layout = (obj.layout && typeof obj.layout === 'object' ? obj.layout : obj) as Record<string, unknown>;
  const background = (obj.background && typeof obj.background === 'object' ? obj.background : obj) as Record<string, unknown>;

  const proposal: ArtDirectorStyleProposal = {};

  // 1. Tipografia Titolo
  if (typeof typography.titleFont === 'string' && VALID_TITLE_FONTS.includes(typography.titleFont as TitleFontFamily)) {
    proposal.titleFont = typography.titleFont as TitleFontFamily;
  }
  if (typeof typography.titleFontSizePx === 'number' && typography.titleFontSizePx >= 28 && typography.titleFontSizePx <= 84) {
    proposal.titleFontSizePx = Math.round(typography.titleFontSizePx);
  } else if (typeof typography.titleFontSize === 'number') {
    proposal.titleFontSizePx = Math.max(28, Math.min(84, Math.round(typography.titleFontSize)));
  }
  if (typeof typography.titleBold === 'boolean') {
    proposal.titleBold = typography.titleBold;
  }
  if (typeof typography.titleColor === 'string' && HEX_COLOR_REGEX.test(typography.titleColor)) {
    proposal.titleColor = typography.titleColor;
  }

  // 2. Tipografia Riga 2 Evidenziata
  if (typeof typography.highlightFont === 'string' && VALID_TITLE_FONTS.includes(typography.highlightFont as TitleFontFamily)) {
    proposal.highlightFont = typography.highlightFont as TitleFontFamily;
  }
  if (typeof typography.highlightFontSizePx === 'number' && typography.highlightFontSizePx >= 28 && typography.highlightFontSizePx <= 84) {
    proposal.highlightFontSizePx = Math.round(typography.highlightFontSizePx);
  }
  if (typeof typography.highlightBold === 'boolean') {
    proposal.highlightBold = typography.highlightBold;
  }
  if (typeof typography.highlightColor === 'string' && HEX_COLOR_REGEX.test(typography.highlightColor)) {
    proposal.highlightColor = typography.highlightColor;
  }

  // 3. Tipografia Sottotitolo
  if (typeof typography.subtitleFont === 'string' && VALID_SUBTITLE_FONTS.includes(typography.subtitleFont as SubtitleFontFamily)) {
    proposal.subtitleFont = typography.subtitleFont as SubtitleFontFamily;
  }
  if (typeof typography.subtitleFontSizePx === 'number' && typography.subtitleFontSizePx >= 18 && typography.subtitleFontSizePx <= 52) {
    proposal.subtitleFontSizePx = Math.round(typography.subtitleFontSizePx);
  }
  if (typeof typography.subtitleBold === 'boolean') {
    proposal.subtitleBold = typography.subtitleBold;
  }
  if (typeof typography.subtitleColor === 'string' && HEX_COLOR_REGEX.test(typography.subtitleColor)) {
    proposal.subtitleColor = typography.subtitleColor;
  }

  // 4. Tipografia Corpo
  if (typeof typography.bodyFont === 'string' && VALID_BODY_FONTS.includes(typography.bodyFont as BodyFontFamily)) {
    proposal.bodyFont = typography.bodyFont as BodyFontFamily;
  }
  if (typeof typography.bodyFontSizePx === 'number' && typography.bodyFontSizePx >= 18 && typography.bodyFontSizePx <= 40) {
    proposal.bodyFontSizePx = Math.round(typography.bodyFontSizePx);
  } else if (typeof typography.bodyFontSize === 'number') {
    proposal.bodyFontSizePx = Math.max(18, Math.min(40, Math.round(typography.bodyFontSize)));
  }
  if (typeof typography.bodyBold === 'boolean') {
    proposal.bodyBold = typography.bodyBold;
  }
  if (typeof typography.bodyColor === 'string' && HEX_COLOR_REGEX.test(typography.bodyColor)) {
    proposal.bodyColor = typography.bodyColor;
  }

  // 5. Allineamento e Posizioni
  const alignVal = (layout.alignment || layout.textAlign) as string;
  if (alignVal === 'left' || alignVal === 'center' || alignVal === 'right') {
    proposal.textAlign = alignVal;
  }

  const layoutIdVal = (layout.layoutId || layout.layout) as string;
  if (typeof layoutIdVal === 'string' && VALID_LAYOUTS.includes(layoutIdVal as SlideLayoutId)) {
    proposal.layout = layoutIdVal as SlideLayoutId;
  }

  if (typeof layout.titleOffsetY === 'number') {
    proposal.titleOffsetY = Math.max(-150, Math.min(150, Math.round(layout.titleOffsetY)));
  }
  if (typeof layout.contentOffsetY === 'number') {
    proposal.contentOffsetY = Math.max(-150, Math.min(150, Math.round(layout.contentOffsetY)));
  }

  const imgPosVal = (layout.imagePosition || obj.imagePosition) as string;
  if (typeof imgPosVal === 'string' && VALID_IMAGE_POSITIONS.includes(imgPosVal as SlideImagePosition)) {
    proposal.imagePosition = imgPosVal as SlideImagePosition;
  }

  const imgOpacityVal = layout.imageOpacity ?? obj.imageOpacity;
  if (typeof imgOpacityVal === 'number' && imgOpacityVal >= 0 && imgOpacityVal <= 1) {
    proposal.imageOpacity = Math.round(imgOpacityVal * 100) / 100;
  }

  // 6. Sfondo e Accento
  const bgCol = (background.bgColor || background.primaryColor || obj.bgColor) as string;
  if (typeof bgCol === 'string' && HEX_COLOR_REGEX.test(bgCol)) {
    proposal.bgColor = bgCol;
  }

  const accCol = (background.accentColor || obj.accentColor) as string;
  if (typeof accCol === 'string' && HEX_COLOR_REGEX.test(accCol)) {
    proposal.accentColor = accCol;
  }

  const bgType = (background.type || background.backgroundType) as string;
  if (bgType === 'solid' || bgType === 'gradient' || bgType === 'ambient_glow') {
    proposal.backgroundType = bgType;
  }

  const bgTexture = (background.texture || background.backgroundTexture) as string;
  if (bgTexture === 'clean' || bgTexture === 'subtle_grid' || bgTexture === 'tech_corners' || bgTexture === 'ambient_glow') {
    proposal.backgroundTexture = bgTexture;
  }

  // Estrai note estetiche/tecniche dell'Art Director (max 200 caratteri)
  if (typeof obj.notes === 'string' && obj.notes.trim()) {
    proposal.notes = obj.notes.trim().slice(0, 250);
  }

  return proposal;
}

/**
 * Applica i parametri grafici proposti alla slide ESISTENTE.
 * GARANZIA DI IMMUTABILITÀ: Nessun testo (titolo, sottotitolo, corpo, bullet, correzioni) viene toccato.
 */
export function applyArtDirectorStyleToSlide(
  slide: CarouselSlide,
  proposal: ArtDirectorStyleProposal
): CarouselSlide {
  return {
    ...slide,
    // TESTI RIGOROSAMENTE INTATTI E IMMUTABILI:
    headline: slide.headline,
    headlineHighlight: slide.headlineHighlight,
    subheadline: slide.subheadline,
    bodyText: slide.bodyText,
    wrongText: slide.wrongText,
    correctText: slide.correctText,
    bulletPoints: slide.bulletPoints,
    diagramStep1: slide.diagramStep1,
    diagramStep2: slide.diagramStep2,
    diagramHighlightResult: slide.diagramHighlightResult,
    citationSource: slide.citationSource,
    categoryTag: slide.categoryTag,
    takeawayTag: slide.takeawayTag,
    punchlineQuote: slide.punchlineQuote,

    // PARAMETRI GRAFICI APPLICATI:
    titleFont: proposal.titleFont ?? slide.titleFont,
    titleFontSizePx: proposal.titleFontSizePx ?? slide.titleFontSizePx,
    titleBold: proposal.titleBold !== undefined ? proposal.titleBold : slide.titleBold,
    titleColor: proposal.titleColor ?? slide.titleColor,

    highlightFont: proposal.highlightFont ?? slide.highlightFont,
    highlightFontSizePx: proposal.highlightFontSizePx ?? slide.highlightFontSizePx,
    highlightBold: proposal.highlightBold !== undefined ? proposal.highlightBold : slide.highlightBold,
    highlightColor: proposal.highlightColor ?? slide.highlightColor,

    subtitleFont: proposal.subtitleFont ?? slide.subtitleFont,
    subtitleFontSizePx: proposal.subtitleFontSizePx ?? slide.subtitleFontSizePx,
    subtitleBold: proposal.subtitleBold !== undefined ? proposal.subtitleBold : slide.subtitleBold,
    subtitleColor: proposal.subtitleColor ?? slide.subtitleColor,

    bodyFont: proposal.bodyFont ?? slide.bodyFont,
    bodyFontSizePx: proposal.bodyFontSizePx ?? slide.bodyFontSizePx,
    bodyBold: proposal.bodyBold !== undefined ? proposal.bodyBold : slide.bodyBold,
    bodyColor: proposal.bodyColor ?? slide.bodyColor,

    textAlign: proposal.textAlign ?? slide.textAlign,
    titleOffsetY: proposal.titleOffsetY !== undefined ? proposal.titleOffsetY : slide.titleOffsetY,
    contentOffsetY: proposal.contentOffsetY !== undefined ? proposal.contentOffsetY : slide.contentOffsetY,

    layout: proposal.layout ?? slide.layout,
    imagePosition: proposal.imagePosition ?? slide.imagePosition,
    imageOpacity: proposal.imageOpacity !== undefined ? proposal.imageOpacity : slide.imageOpacity,

    bgColor: proposal.bgColor ?? slide.bgColor,
    accentColor: proposal.accentColor ?? slide.accentColor,
    isAiSuggested: true,
  };
}

/**
 * Chiamata a Google Gemini Flash come ART DIRECTOR GRAFICO PURO.
 */
export async function generateArtDirectionForSlide(
  slide: CarouselSlide,
  _content: Partial<InstagramContent>,
  slideIndex: number,
  totalSlides: number,
  options: {
    focus?: ArtDirectionFocus[];
    intensity?: ArtDirectionIntensity;
    brandKit?: Partial<BrandKit>;
    currentTemplateId?: string;
  } = {}
): Promise<ArtDirectorResult> {
  const {
    focus = ['typography_hierarchy', 'palette_contrast', 'positioning_layout'],
    intensity = 'medium',
    brandKit,
    currentTemplateId = 'editorial_dark',
  } = options;

  const isCover = slideIndex === 0 || slide.type === 'cover';
  const isCta = slideIndex === totalSlides - 1 || slide.type === 'cta';

  // Conteggi dimensionali (ingombri)
  const headlineWords = (slide.headline || '').trim().split(/\s+/).filter(Boolean).length;
  const highlightWords = (slide.headlineHighlight || '').trim().split(/\s+/).filter(Boolean).length;
  const subtitleWords = (slide.subheadline || '').trim().split(/\s+/).filter(Boolean).length;
  const bodyWords = (slide.bodyText || '').trim().split(/\s+/).filter(Boolean).length;
  const totalWords = headlineWords + highlightWords + subtitleWords + bodyWords;

  // SYSTEM PROMPT RIGOROSO COME DA SPECIFICA UTENTE
  const systemPrompt = `Sei un art director specializzato in caroselli Instagram per un fitness coach premium. Ricevi il testo di una slide SOLO per valutarne ingombro e gerarchia visiva. NON modificare, correggere, riscrivere, tradurre o riassumere il testo: restituiscilo concettualmente invariato. Il tuo output deve essere ESCLUSIVAMENTE un JSON valido con parametri di design: tipografia (font, size, weight, lineHeight, letterSpacing, color), layout (alignment, posizioni, margini, maxWidth, safeArea), background (tipo, colori, texture) e accento cromatico. Nessun testo libero, nessuna spiegazione, nessuna chiave testuale riscritta.`;

  const focusDescriptions = focus
    .map((f) => {
      const opt = ART_DIRECTION_FOCUS_OPTIONS.find((o) => o.id === f);
      return opt ? `- ${opt.label}: ${opt.desc}` : `- ${f}`;
    })
    .join('\n');

  const intensityInstruction =
    intensity === 'light'
      ? 'Intensità LEGGERA: mantieni quasi inalterato il layout, perfeziona solo il contrasto di colori e calibra minuziosamente i font in pixel.'
      : intensity === 'strong'
      ? 'Intensità DECISA: puoi proporre layout strutturali avanzati, forti contrasti cromatici e layout audaci coerenti con il Metodo AC.'
      : 'Intensità MEDIA: equilibrio ottimale tra contrasto visivo, leggibilità mobile e posizionamento calibrato dei blocchi.';

  const userPrompt = `VALUTAZIONE GRAFICA SLIDE ${slideIndex + 1} di ${totalSlides} (Formato 1080x1350, Ratio 4:5):

CONTESTO FORMATO E SAFE AREA:
- Risoluzione: 1080 × 1350 pixel
- Safe Area superiore: 140px (per header IG e profilo)
- Safe Area inferiore: 140px (per barra interazione IG)
- Margine orizzontale utile: 80px (larghezza contenuto max 920px)

INGOMBRO TESTUALE ATTUALE (RIFERIMENTO DI DIMENSIONE E SPAZIALITÀ):
- Titolo Riga 1: ${headlineWords} parole ("${slide.headline.slice(0, 40)}...")
- Riga 2 Evidenziata: ${highlightWords} parole ("${(slide.headlineHighlight || '').slice(0, 30)}...")
- Sottotitolo: ${subtitleWords} parole
- Corpo Spiegazione: ${bodyWords} parole
- Totale parole slide: ${totalWords} parole.
REGOLA CRITICA: Se il testo è lungo (${totalWords} parole), PUOI SOLO ridurre le dimensioni dei font (es. bodyFontSizePx a 22-24px, titleFontSizePx a 44-48px) o regolare titleOffsetY/contentOffsetY. NON TAGLIARE NÉ RISCRIVERE MAI PAROLE.

DATI DI PROGETTO E BRAND KIT:
- Tipo slide: ${slide.type || (isCover ? 'cover' : isCta ? 'cta' : 'practical_guide')}
- Template grafico attivo: ${currentTemplateId}
- Brand Kit primario: ${brandKit?.primaryColor || '#070A10'}
- Brand Kit accento: ${brandKit?.accentColor || '#F59E0B'}
- Font Titolo Brand: ${brandKit?.titleFont || 'Bebas Neue'}
- Font Corpo Brand: ${brandKit?.bodyFont || 'Inter'}
- Ha già immagine caricata: ${Boolean(slide.imageUrl)}

FOCUS ART DIRECTION RICHIESTI DALL'UTENTE:
${focusDescriptions}

LIVELLO INTENSITÀ:
${intensityInstruction}

RESTITUISCI ESCLUSIVAMENTE QUESTO SCHEMA JSON (Nessuna chiave di riscrittura testo):
{
  "typography": {
    "titleFont": "Bebas Neue" | "Montserrat" | "Outfit" | "Inter",
    "titleFontSizePx": 52,
    "titleBold": true,
    "titleColor": "#FFFFFF",
    "highlightFont": "Bebas Neue" | "Montserrat" | "Outfit" | "Inter",
    "highlightFontSizePx": 52,
    "highlightBold": true,
    "highlightColor": "#F59E0B",
    "subtitleFont": "Inter" | "Outfit" | "Montserrat",
    "subtitleFontSizePx": 26,
    "subtitleBold": true,
    "subtitleColor": "#E2E8F0",
    "bodyFont": "Inter" | "Roboto" | "Montserrat" | "Outfit",
    "bodyFontSizePx": 26,
    "bodyBold": false,
    "bodyColor": "#CBD5E1"
  },
  "layout": {
    "alignment": "left" | "center" | "right",
    "layoutId": "dual_tone_cover" | "text_left" | "connected_icon_list" | "diagram_flow" | "error_vs_correct" | "step_by_step" | "numbered_list" | "final_cta",
    "titleOffsetY": 0,
    "contentOffsetY": 0,
    "imagePosition": "bottom_cutout" | "right_side" | "top_half" | "background_full",
    "imageOpacity": 0.6
  },
  "background": {
    "type": "solid" | "gradient" | "ambient_glow",
    "bgColor": "#070A10",
    "accentColor": "#F59E0B",
    "texture": "clean" | "subtle_grid" | "tech_corners" | "ambient_glow"
  },
  "notes": "Spiegazione sintetica (max 1 frase) delle scelte stilistiche grafiche adottate"
}`;

  try {
    const aiResult = await generateContentWithGemini({
      systemPrompt,
      userPrompt,
      model: 'gemini-3.8-flash',
      temperature: 0.3,
      responseMimeType: 'application/json',
    });

    const cleanedText = aiResult.text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const parsedRaw = JSON.parse(cleanedText);

    const validatedProposal = validateAndSanitizeArtDirectorJSON(parsedRaw, slide);

    if (validatedProposal) {
      validatedProposal.appliedFocuses = focus;
      validatedProposal.intensity = intensity;
      validatedProposal.isFallback = false;

      const applied = applyArtDirectorStyleToSlide(slide, validatedProposal);
      return {
        proposal: validatedProposal,
        appliedSlide: applied,
        originalSlide: slide,
        isFallback: false,
      };
    } else {
      console.warn('[ArtDirector] JSON non valido o tentata alterazione testuale: applico fallback Editorial Dark.');
    }
  } catch (err) {
    console.warn('[ArtDirector] Errore chiamata Gemini o parse JSON, applico fallback Editorial Dark:', err);
  }

  // Fallback garantito "Editorial Dark"
  const fallbackProposal = getDefaultEditorialDarkProposal(slide, slideIndex, totalSlides, brandKit);
  fallbackProposal.appliedFocuses = focus;
  fallbackProposal.intensity = intensity;

  const appliedFallback = applyArtDirectorStyleToSlide(slide, fallbackProposal);
  return {
    proposal: fallbackProposal,
    appliedSlide: appliedFallback,
    originalSlide: slide,
    isFallback: true,
  };
}

/**
 * Ottimizza una singola slide come Art Director Grafico (retrocompatibilità per vecchi chiamanti).
 * Garantisce l'immutabilità del testo.
 */
export async function optimizeSlideWithGemini(
  slide: CarouselSlide,
  content: Partial<InstagramContent>,
  slideIndex: number,
  totalSlides: number,
  _action?: string
): Promise<CarouselSlide> {
  const result = await generateArtDirectionForSlide(slide, content, slideIndex, totalSlides);
  return result.appliedSlide;
}

/**
 * Ottimizza l'intero carosello applicando Art Direction a tutte le slide senza toccare una sola parola di testo.
 */
export async function optimizeEntireCarouselArtDirectionWithGemini(
  carousel: InstagramCarousel,
  content: Partial<InstagramContent>,
  options: {
    focus?: ArtDirectionFocus[];
    intensity?: ArtDirectionIntensity;
  } = {}
): Promise<InstagramCarousel> {
  const updatedSlides: CarouselSlide[] = [];

  for (let i = 0; i < carousel.slides.length; i++) {
    const s = carousel.slides[i];
    try {
      const result = await generateArtDirectionForSlide(s, content, i, carousel.slides.length, {
        focus: options.focus,
        intensity: options.intensity,
        brandKit: carousel.settings.brandKit,
        currentTemplateId: carousel.settings.templateId,
      });
      updatedSlides.push(result.appliedSlide);
    } catch {
      updatedSlides.push(s);
    }
  }

  return {
    ...carousel,
    slides: updatedSlides,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrocompatibilità con la vecchia firma
 */
export async function optimizeEntireCarouselWithGemini(
  carousel: InstagramCarousel,
  content: Partial<InstagramContent>
): Promise<InstagramCarousel> {
  return optimizeEntireCarouselArtDirectionWithGemini(carousel, content);
}

/**
 * Hook alternative generator per la copertina
 */
export async function generateCoverHookAlternatives(
  slide: CarouselSlide,
  topic: string = 'Allenamento e Ipertrofia'
): Promise<CoverHookAlternative[]> {
  const currentTitle = slide.headline || '';
  const currentHighlight = slide.headlineHighlight || '';

  const systemPrompt = `Sei un Copywriter ed Esperto di Viral Hook per Instagram specializzato in Fitness Coaching e Biomeccanica d'élite.
Il tuo compito è generare ESATTAMENTE 3 alternative di titoli ad altissimo impatto per la COPERTINA del carosello.
Rispondi ESCLUSIVAMENTE con un array JSON di 3 oggetti.`;

  const userPrompt = `Argomento carosello: ${topic}
Titolo attuale copertina: "${currentTitle} ${currentHighlight}".
Sottotitolo attuale: "${slide.subheadline || ''}".
Genera 3 varianti irresistibili per fermare lo scroll nel feed Instagram.`;

  try {
    const aiResult = await generateContentWithGemini({
      userPrompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 800,
      responseMimeType: 'application/json',
    });

    const cleaned = aiResult.text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as CoverHookAlternative[];
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 3).map((item, i) => ({
        ...item,
        id: item.id || `hook_alt_${i + 1}`,
      }));
    }
  } catch (err) {
    console.warn('Errore generazione hook con Gemini, uso fallback:', err);
  }

  return [
    {
      id: 'hook_alt_1',
      headline: 'STAI FACENDO QUESTO ERRORE?',
      headlineHighlight: 'ECCO COSA DICONO I DATI',
      subheadline: `La maggior parte degli atleti sbaglia l'approccio su ${topic}. Ecco la correzione biomeccanica.`,
      angle: 'provocative',
      angleLabel: '🔥 Provocatorio',
      description: 'Mette in discussione le convinzioni comuni e genera elevata curiosità.',
    },
    {
      id: 'hook_alt_2',
      headline: 'ANALISI BIOMECCANICA:',
      headlineHighlight: topic.toUpperCase(),
      subheadline: 'Bracci di leva, tensione muscolare e progressione reale studiata per la massima ipertrofia.',
      angle: 'scientific',
      angleLabel: '🧬 Scientifico & Leve',
      description: 'Posiziona il post come riferimento autorevole fondato su fisica ed anatomia.',
    },
    {
      id: 'hook_alt_3',
      headline: 'GUIDA PRATICA:',
      headlineHighlight: 'COME ESEGUIRLO AL 100%',
      subheadline: '3 passaggi immediati per correggere la tecnica e non sprecare ripetizioni in palestra.',
      angle: 'practical',
      angleLabel: '🎯 Diretto & Pratico',
      description: 'Fornisce una soluzione chiara e azionabile fin dal prossimo allenamento.',
    },
  ];
}

/**
 * Propaga i parametri di stile dell'Art Director all'intero carosello,
 * rispettando rigorosamente le gerarchie e le particolarità di ogni tipo di slide
 * (Copertina con headline imponente, Slide di contenuto calibrate per il corpo, CTA focalizzata).
 * GARANZIA TOTALE: Nessun testo di alcuna slide viene alterato.
 */
export function propagateArtDirectorStyleToCarousel(
  carousel: InstagramCarousel,
  proposal: ArtDirectorStyleProposal
): InstagramCarousel {
  const updatedSlides = carousel.slides.map((s, idx) => {
    const isCover = idx === 0 || s.type === 'cover';
    const isCTA = idx === carousel.slides.length - 1 || s.type === 'cta' || s.layout === 'final_cta';

    // Calibrazione della dimensione del titolo in base alla gerarchia della slide
    let adaptedTitleSize = proposal.titleFontSizePx;
    if (adaptedTitleSize) {
      if (isCover) {
        // La copertina mantiene la grandezza piena decisa dall'Art Director
        adaptedTitleSize = Math.max(50, Math.min(84, adaptedTitleSize));
      } else if (isCTA) {
        // CTA bilanciata tra 38px e 50px
        adaptedTitleSize = Math.max(38, Math.min(50, Math.round(adaptedTitleSize * 0.75)));
      } else {
        // Slide di contenuto: titolo calibrato tra 34px e 46px per non sovrastare il corpo
        adaptedTitleSize = Math.max(34, Math.min(46, Math.round(adaptedTitleSize * 0.68)));
      }
    }

    const adaptedProposal: ArtDirectorStyleProposal = {
      ...proposal,
      titleFontSizePx: adaptedTitleSize,
      // Il layout generale dell'Art Director viene applicato alla copertina; per le slide interne si preserva il tipo specifico (es. liste o diagrammi) se non compatibile
      layout: isCover
        ? proposal.layout
        : s.layout === 'numbered_list' || s.layout === 'step_by_step' || s.layout === 'diagram_flow' || s.layout === 'error_vs_correct'
        ? s.layout
        : proposal.layout,
    };

    return applyArtDirectorStyleToSlide(s, adaptedProposal);
  });

  return {
    ...carousel,
    slides: updatedSlides,
  };
}

