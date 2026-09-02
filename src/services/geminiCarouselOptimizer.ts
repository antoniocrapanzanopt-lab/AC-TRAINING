/**
 * GEMINI 3.7 FLASH CAROUSEL OPTIMIZER & DESIGN INTELLIGENCE
 * 
 * Modulo di intelligenza artificiale per:
 * 1. Ottimizzare e ristrutturare layout, interfaccia e impaginazione delle slide
 * 2. Posizionamento ideale delle immagini (bottom_cutout, right_side, top_half, background_full)
 * 3. Formattazione a 2 toni per i titoli (Riga 1 bianco + Riga 2 accento)
 * 4. Generazione badge categoria (■ Tag), citazioni scientifiche reali (PMID) e flussi logici
 * 5. Calibrazione automatica di font family e grandezze in pixel (px)
 */

import { generateContentWithGemini } from '../lib/ai/geminiClient';
import {
  CarouselSlide,
  InstagramCarousel,
  SlideLayoutId,
  SlideImagePosition,
  TitleFontFamily,
  BodyFontFamily,
} from '../types/carousel';
import { InstagramContent } from '../types/inboxAndContent';

interface GeminiSlideOptimizationResponse {
  headline: string;
  headlineHighlight?: string;
  subheadline?: string;
  bodyText: string;
  layout: SlideLayoutId;
  titleFont: TitleFontFamily;
  bodyFont: BodyFontFamily;
  titleFontSizePx: number;
  bodyFontSizePx: number;
  textAlign: 'left' | 'center' | 'right';
  categoryTag?: string;
  citationSource?: string;
  punchlineQuote?: string;
  diagramStep1?: string;
  diagramStep2?: string;
  diagramHighlightResult?: string;
  bulletPoints?: string[];
  visualCue?: string;
  takeawayTag?: string;
  imagePosition?: SlideImagePosition;
  imageOpacity?: number;
  wrongText?: string;
  correctText?: string;
}

/**
 * Ottimizza una singola slide con Google Gemini 3.7 Flash
 */
export async function optimizeSlideWithGemini(
  slide: CarouselSlide,
  content: Partial<InstagramContent>,
  slideIndex: number,
  totalSlides: number
): Promise<CarouselSlide> {
  const isCover = slideIndex === 0;
  const isCta = slideIndex === totalSlides - 1;

  const systemPrompt = `Sei un Art Director ed Esperto di Comunicazione Visiva e Biomeccanica per Instagram Caroselli (Fitness & Performance Coaching di altissimo livello).
Il tuo obiettivo è riscrivere e formattare la slide per renderla esteticamente magnetica, scientificamente autorevole e graficamente impeccabile.

Regole di design per i Caroselli Coaching:
1. TITOLO A 2 TONI: Dividi il titolo in Riga 1 ("headline" - massimo 4-5 parole in maiuscolo) e Riga 2 ("headlineHighlight" - 2-4 parole ad alto impatto in colore accento).
2. LAYOUT: Scegli il layout più efficace:
   - "dual_tone_cover" per la copertina
   - "connected_icon_list" per elenchi a punti chiave con nodi e icone
   - "diagram_flow" per spiegazioni scientifiche, premesse e risultati
   - "error_vs_correct" per confronti Errore vs Tecnica Corretta
   - "step_by_step" per progressioni pratiche
   - "numbered_list" per regole o recap
   - "final_cta" per la slide finale
3. IMMAGINE: Scegli la posizione ideale ("bottom_cutout" se il testo è in alto e la figura è in basso, "right_side" per split 50/50, "top_half" o "background_full").
4. FONTS E PIXEL:
   - titleFont: "Bebas Neue" (impatto alto), "Montserrat" (geometrico/biomeccanico), "Outfit" o "Inter".
   - titleFontSizePx: tra 44px e 68px.
   - bodyFontSizePx: tra 22px e 30px.
5. CATEGORIA & FONTI:
   - categoryTag: tag in maiuscolo preceduto da "■ " (es. "■ FISIOLOGIA DELL'ALLENAMENTO", "■ BIOMECCANICA DELLO SQUAT").
   - citationSource: paper scientifico reale con PMID se pertinente (es. "Pelland et al 2022: PMID 35247203", "Schoenfeld et al 2021: PMID 33433148").

Rispondi ESCLUSIVAMENTE in formato JSON valido senza blocchi markdown.`;

  const userPrompt = `Ottimizza questa slide (${slideIndex + 1} di ${totalSlides}) del carosello:
Argomento Generale: ${content.title || 'Allenamento e Biomeccanica'}
Gancio: ${content.hook || ''}
Pillar: ${content.pillar || 'technique_execution'}

Stato Attuale Slide:
- Titolo attuale: ${slide.headline}
- Evidenziazione attuale: ${slide.headlineHighlight || ''}
- Sottotitolo: ${slide.subheadline || ''}
- Testo corpo: ${slide.bodyText}
- Tipo slide: ${slide.type}
- Layout attuale: ${slide.layout || 'standard'}
- Ha già immagine caricata: ${Boolean(slide.imageUrl)}

Genera l'oggetto JSON con:
{
  "headline": "string",
  "headlineHighlight": "string",
  "subheadline": "string",
  "bodyText": "string",
  "layout": "dual_tone_cover" | "connected_icon_list" | "diagram_flow" | "error_vs_correct" | "step_by_step" | "numbered_list" | "final_cta" | "text_left",
  "titleFont": "Bebas Neue" | "Montserrat" | "Outfit" | "Inter",
  "bodyFont": "Inter" | "Roboto" | "Montserrat" | "Outfit",
  "titleFontSizePx": number,
  "bodyFontSizePx": number,
  "textAlign": "left" | "center" | "right",
  "categoryTag": "string",
  "citationSource": "string",
  "punchlineQuote": "string",
  "diagramStep1": "string",
  "diagramStep2": "string",
  "diagramHighlightResult": "string",
  "bulletPoints": ["string"],
  "visualCue": "string",
  "takeawayTag": "string",
  "imagePosition": "bottom_cutout" | "right_side" | "top_half" | "background_full",
  "imageOpacity": number,
  "wrongText": "string",
  "correctText": "string"
}`;

  const aiResult = await generateContentWithGemini({
    systemPrompt,
    userPrompt,
    model: 'gemini-2.5-flash',
    temperature: 0.5,
  });

  const cleanedText = aiResult.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanedText) as GeminiSlideOptimizationResponse;

  return {
    ...slide,
    headline: parsed.headline || slide.headline,
    headlineHighlight: parsed.headlineHighlight !== undefined ? parsed.headlineHighlight : slide.headlineHighlight,
    subheadline: parsed.subheadline !== undefined ? parsed.subheadline : slide.subheadline,
    bodyText: parsed.bodyText !== undefined ? parsed.bodyText : slide.bodyText,
    layout: parsed.layout || (isCover ? 'dual_tone_cover' : isCta ? 'final_cta' : slide.layout),
    titleFont: parsed.titleFont || slide.titleFont || 'Bebas Neue',
    bodyFont: parsed.bodyFont || slide.bodyFont || 'Inter',
    titleFontSizePx: parsed.titleFontSizePx || slide.titleFontSizePx || 54,
    bodyFontSizePx: parsed.bodyFontSizePx || slide.bodyFontSizePx || 26,
    textAlign: parsed.textAlign || (isCover ? 'center' : 'left'),
    categoryTag: parsed.categoryTag || slide.categoryTag,
    citationSource: parsed.citationSource || slide.citationSource,
    punchlineQuote: parsed.punchlineQuote || slide.punchlineQuote,
    diagramStep1: parsed.diagramStep1 || slide.diagramStep1,
    diagramStep2: parsed.diagramStep2 || slide.diagramStep2,
    diagramHighlightResult: parsed.diagramHighlightResult || slide.diagramHighlightResult,
    bulletPoints: parsed.bulletPoints && parsed.bulletPoints.length > 0 ? parsed.bulletPoints : slide.bulletPoints,
    visualCue: parsed.visualCue || slide.visualCue,
    takeawayTag: parsed.takeawayTag || slide.takeawayTag,
    imagePosition: parsed.imagePosition || slide.imagePosition || 'bottom_cutout',
    imageOpacity: parsed.imageOpacity !== undefined ? parsed.imageOpacity : (slide.imageOpacity || 0.6),
    wrongText: parsed.wrongText || slide.wrongText,
    correctText: parsed.correctText || slide.correctText,
    isAiSuggested: true,
  };
}

/**
 * Ottimizza l'intero carosello con Google Gemini 3.7 Flash
 */
export async function optimizeEntireCarouselWithGemini(
  carousel: InstagramCarousel,
  content: Partial<InstagramContent>
): Promise<InstagramCarousel> {
  const updatedSlides: CarouselSlide[] = [];

  for (let i = 0; i < carousel.slides.length; i++) {
    const s = carousel.slides[i];
    try {
      const optimized = await optimizeSlideWithGemini(s, content, i, carousel.slides.length);
      updatedSlides.push(optimized);
    } catch {
      updatedSlides.push(s);
    }
  }

  return {
    ...carousel,
    slides: updatedSlides,
    settings: {
      ...carousel.settings,
      templateId: 'hypertrophy_science',
    },
    updated_at: new Date().toISOString(),
  };
}
