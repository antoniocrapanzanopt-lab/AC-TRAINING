import React, { useState, useRef } from 'react';
import {
  Palette,
  Type,
  Sparkles,
  Save,
  RotateCcw,
  Instagram,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { loadBrandKit, saveBrandKit, DEFAULT_BRAND_KIT } from '../../services/brandKitService';
import { BrandKit, TitleFontFamily, BodyFontFamily, LogoPosition } from '../../types/carousel';
import { useToast } from '../../context/ToastContext';

export const StudioBrandKitPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [brandKit, setBrandKit] = useState<BrandKit>(loadBrandKit());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError('L\'immagine del logo supera i 5MB. Seleziona un file più leggero.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setBrandKit((prev) => ({
            ...prev,
            logoUrl: dataUrl,
          }));
          showSuccess('Logo caricato con successo! Clicca su "Salva Brand Kit" per confermare.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseDefaultLogo = () => {
    setBrandKit((prev) => ({
      ...prev,
      logoUrl: '/ac-logo-transparent.png',
    }));
    showSuccess('Logo AC Coaching applicato! Clicca su "Salva Brand Kit" per confermare.');
  };

  const handleRemoveLogo = () => {
    setBrandKit((prev) => ({
      ...prev,
      logoUrl: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showSuccess('Logo rimosso.');
  };

  const [toneOfVoice, setToneOfVoice] = useState(
    'Autorevole, scientifico e basato su evidenze biomeccaniche, ma spiegato in modo pratico, diretto e privo di tecnicismi fini a se stessi. Focus su longevità articolare e ipertrofia solida.'
  );

  const [savedCtas, setSavedCtas] = useState<string[]>([
    'Salva il post per la tua prossima sessione di allenamento 📌',
    'Scrivi INFO nei commenti per ricevere l\'analisi completa in DM 📩',
    'Condividi con chi continua a sbagliare questo movimento 🤝',
    'Link in bio per candidarti al percorso di Coaching 1-on-1 🚀',
  ]);

  const [newCtaText, setNewCtaText] = useState('');

  const handleSave = () => {
    try {
      saveBrandKit(brandKit);
      showSuccess('Brand Kit aggiornato e sincronizzato su tutti i Creator Studios!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nel salvataggio';
      showError(message);
    }
  };

  const handleResetDefaults = () => {
    setBrandKit({ ...DEFAULT_BRAND_KIT });
    saveBrandKit({ ...DEFAULT_BRAND_KIT });
    showSuccess('Brand Kit ripristinato ai valori predefiniti AC Coaching.');
  };

  const handleAddCta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCtaText.trim()) return;
    setSavedCtas((prev) => [...prev, newCtaText.trim()]);
    setNewCtaText('');
    showSuccess('Nuova Call To Action aggiunta ai preset!');
  };

  const handleRemoveCta = (index: number) => {
    setSavedCtas((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto pb-16">
      
      {/* HEADER BRAND KIT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <Palette className="w-7 h-7 text-amber-400" />
              Brand Kit & Design System
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Token Condivisi
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Configura logo, handle Instagram, palette ufficiale, tipografia, tone of voice e CTA predefinite applicate in tutti gli studi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Ripristina Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Salva Brand Kit</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SEZIONE 1: IDENTITÀ & HANDLE INSTAGRAM */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Identità Profilo & Watermark
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Logo & Dati Ufficiali</span>
          </div>

          {/* BOX CARICAMENTO E ANTEPRIMA LOGO BRAND */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Logo Ufficiale Brand
                </span>
              </div>
              {brandKit.logoUrl ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Logo Attivo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Nessun logo
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* ANTEPRIMA LOGO */}
              <div className="w-20 h-20 rounded-xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shrink-0 overflow-hidden relative">
                {brandKit.logoUrl ? (
                  <img
                    src={brandKit.logoUrl}
                    alt="Logo Brand"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 gap-1 text-center">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[9px] font-mono">NO LOGO</span>
                  </div>
                )}
              </div>

              {/* AZIONI LOGO */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{brandKit.logoUrl ? 'Sostituisci Logo' : 'Carica Logo (PNG/JPG)'}</span>
                  </button>

                  {!brandKit.logoUrl && (
                    <button
                      type="button"
                      onClick={handleUseDefaultLogo}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Applica il logo AC Coaching trasparente predefinito"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Usa Logo AC</span>
                    </button>
                  )}

                  {brandKit.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Rimuovi</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  Consigliato PNG trasparente ad alta risoluzione o SVG. Verrà mostrato automaticamente sulle copertine e slide dei caroselli e delle storie.
                </p>
              </div>
            </div>

            {/* SELETTORE POSIZIONE PREDEFINITA DEL LOGO */}
            <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-400">
                Posizione Logo nelle Grafiche:
              </label>
              <select
                value={brandKit.logoPosition || 'top_left'}
                onChange={(e) => setBrandKit({ ...brandKit, logoPosition: e.target.value as LogoPosition })}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="top_left">In alto a sinistra (Consigliato)</option>
                <option value="top_right">In alto a destra</option>
                <option value="bottom_left">In basso a sinistra</option>
                <option value="none">Disattivato (Non mostrare logo)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome Brand / Insegna
              </label>
              <input
                type="text"
                value={brandKit.brandName}
                onChange={(e) => setBrandKit({ ...brandKit, brandName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Handle Instagram Autore
              </label>
              <input
                type="text"
                value={brandKit.authorHandle}
                onChange={(e) => setBrandKit({ ...brandKit, authorHandle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Firma / Qualifica Professionale
              </label>
              <input
                type="text"
                value={brandKit.authorSignature}
                onChange={(e) => setBrandKit({ ...brandKit, authorSignature: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Testo Watermark Slide & Cover
              </label>
              <input
                type="text"
                value={brandKit.watermarkText}
                onChange={(e) => setBrandKit({ ...brandKit, watermarkText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* SEZIONE 2: PALETTE COLORI UFFICIALE */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Palette Colori Ufficiale AC Coaching
              </h2>
            </div>
            <span className="text-[11px] font-mono text-amber-300 font-semibold">HEX & Swatches</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ACCENT / GOLD */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">AC Yellow (Accento)</span>
                <div
                  className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: brandKit.accentColor }}
                />
              </div>
              <input
                type="color"
                value={brandKit.accentColor}
                onChange={(e) => setBrandKit({ ...brandKit, accentColor: e.target.value, ctaColor: e.target.value })}
                className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-[11px] font-mono text-slate-400 block text-center uppercase">
                {brandKit.accentColor}
              </span>
            </div>

            {/* SECONDARY / BLUE */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">AC Blue (Dettagli)</span>
                <div
                  className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: '#38BDF8' }}
                />
              </div>
              <div className="h-8 rounded-lg flex items-center justify-center bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-xs font-bold">
                #38BDF8
              </div>
              <span className="text-[10px] text-slate-500 block text-center">Sky Blue Biomeccanica</span>
            </div>

            {/* DARK PRIMARY OBSIDIAN */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Obsidian Dark (Sfondo)</span>
                <div
                  className="w-5 h-5 rounded-full border border-slate-600 shadow-sm"
                  style={{ backgroundColor: brandKit.primaryColor }}
                />
              </div>
              <input
                type="color"
                value={brandKit.primaryColor}
                onChange={(e) => setBrandKit({ ...brandKit, primaryColor: e.target.value })}
                className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-[11px] font-mono text-slate-400 block text-center uppercase">
                {brandKit.primaryColor}
              </span>
            </div>

            {/* DEEP SLATE */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Slate Dark (Card)</span>
                <div
                  className="w-5 h-5 rounded-full border border-slate-600 shadow-sm"
                  style={{ backgroundColor: brandKit.secondaryColor }}
                />
              </div>
              <input
                type="color"
                value={brandKit.secondaryColor}
                onChange={(e) => setBrandKit({ ...brandKit, secondaryColor: e.target.value })}
                className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-[11px] font-mono text-slate-400 block text-center uppercase">
                {brandKit.secondaryColor}
              </span>
            </div>
          </div>
        </div>

        {/* SEZIONE 3: TIPOGRAFIA & FONT */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Type className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
              Tipografia & Font
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Font Titoli & Hook
              </label>
              <select
                value={brandKit.titleFont}
                onChange={(e) => setBrandKit({ ...brandKit, titleFont: e.target.value as TitleFontFamily })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="Inter">Inter (Pulito & Moderno)</option>
                <option value="Outfit">Outfit (Display Tecnico)</option>
                <option value="Montserrat">Montserrat (Geometria Forte)</option>
                <option value="Bebas Neue">Bebas Neue (Impatto Condensato)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Font Corpo & Spiegazioni
              </label>
              <select
                value={brandKit.bodyFont}
                onChange={(e) => setBrandKit({ ...brandKit, bodyFont: e.target.value as BodyFontFamily })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Outfit">Outfit</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEZIONE 4: TONE OF VOICE & PRESET CTAs */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
              Tone of Voice & Preset CTA
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tone of Voice & Filosofia Comunicativa
              </label>
              <textarea
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Call To Action Predefinite
              </label>
              <div className="space-y-2 mb-3">
                {savedCtas.map((cta, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300"
                  >
                    <span className="truncate mr-2">{cta}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCta(index)}
                      className="text-slate-500 hover:text-rose-400 text-xs font-mono"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddCta} className="flex gap-2">
                <input
                  type="text"
                  value={newCtaText}
                  onChange={(e) => setNewCtaText(e.target.value)}
                  placeholder="Aggiungi una nuova CTA..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={!newCtaText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold disabled:opacity-40"
                >
                  Aggiungi
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
