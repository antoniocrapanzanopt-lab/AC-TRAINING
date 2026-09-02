import React, { useState, useRef } from 'react';
import { BrandKit, LogoPosition, ImageStyle } from '../../../types/carousel';
import { saveBrandKit } from '../../../services/brandKitService';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  Save,
  Palette,
  Type,
  AtSign,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Eye,
  Sliders,
  Bookmark,
} from 'lucide-react';

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandKit: BrandKit;
  onSave: (updatedKit: BrandKit) => void;
}

const PRESET_ACCENT_COLORS = [
  { label: 'Oro Ambra (AC)', value: '#F59E0B' },
  { label: 'Giallo Oro', value: '#EAB308' },
  { label: 'Smeraldo', value: '#10B981' },
  { label: 'Ciano Tech', value: '#06B6D4' },
  { label: 'Viola Deep', value: '#8B5CF6' },
  { label: 'Rosso Fuoco', value: '#F43F5E' },
];

const PRESET_BG_COLORS = [
  { label: 'Ossidiana (Nero)', value: '#070A10' },
  { label: 'Antracite Profondo', value: '#0B0F17' },
  { label: 'Blu Slate Notturno', value: '#0B1120' },
  { label: 'Grafite Scuro', value: '#18181B' },
];

export const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  onClose,
  brandKit,
  onSave,
}) => {
  const { showSuccess } = useToast();
  const [formData, setFormData] = useState<BrandKit>({ ...brandKit });
  const [previewTab, setPreviewTab] = useState<'cover' | 'cta'>('cover');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    saveBrandKit(formData);
    onSave(formData);
    showSuccess('Brand Kit salvato ed applicato con successo!');
    onClose();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            logoUrl: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefault = () => {
    const defaultKit: BrandKit = {
      logoUrl: null,
      brandName: 'AC COACHING',
      authorHandle: '@antoniocrapanzano_coach',
      authorSignature: 'Antonio Crapanzano • Performance & Biomechanics Coach',
      primaryColor: '#070A10',
      secondaryColor: '#1E293B',
      accentColor: '#F59E0B',
      ctaColor: '#F59E0B',
      titleFont: 'Inter',
      bodyFont: 'Inter',
      logoPosition: 'top_left',
      watermarkText: '• AC COACHING •',
      imageStyle: 'dark_gradient',
    };
    setFormData(defaultKit);
  };

  // Font family mapping per la preview
  const getFontFamilyStyle = (font: string) => {
    switch (font) {
      case 'Outfit':
        return '"Outfit", system-ui, sans-serif';
      case 'Montserrat':
        return '"Montserrat", system-ui, sans-serif';
      case 'Bebas Neue':
        return '"Bebas Neue", "Impact", sans-serif';
      case 'Roboto':
        return '"Roboto", system-ui, sans-serif';
      default:
        return '"Inter", system-ui, sans-serif';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[88vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── HEADER MODALE (SHRINK-0) ─── */}
        <div className="p-5 sm:px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Brand Kit Personalizzato & Anteprima Live
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase font-mono">
                  Globale
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configura i colori, la tipografia, il logo e l'identità grafica dei tuoi caroselli
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── CORPO A 2 COLONNE: PERSONALIZZAZIONE (SX) | ANTEPRIMA LIVE 4:5 (DX) ─── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* ─── COLONNA SINISTRA (7/12): CONFIGURAZIONE COMPLETA SCROLLABILE ─── */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar text-xs border-r border-slate-800/80">
            
            {/* 1. LOGO & WATERMARK */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Logo Ufficiale & Watermark</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {formData.logoUrl ? (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                        <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {formData.logoUrl ? 'Logo Caricato' : 'Nessun logo caricato'}
                      </span>
                      <span className="text-[11px] text-slate-500">File PNG o JPG consigliato</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>{formData.logoUrl ? 'Sostituisci' : 'Carica Logo'}</span>
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: null })}
                        className="text-xs text-rose-400 hover:underline cursor-pointer px-1"
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Posizione Logo nelle Slide</label>
                    <select
                      value={formData.logoPosition}
                      onChange={(e) => setFormData({ ...formData, logoPosition: e.target.value as LogoPosition })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="top_left">In alto a sinistra</option>
                      <option value="top_right">In alto a destra</option>
                      <option value="bottom_left">In basso a sinistra</option>
                      <option value="none">Nessun logo (Solo testo)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Nome Brand / Badge</label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="es. AC COACHING"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. IDENTITÀ & FIRMA */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <AtSign className="w-4 h-4 text-amber-400" />
                <span>Handle Instagram & Firma</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Handle Instagram Autore</label>
                  <input
                    type="text"
                    value={formData.authorHandle}
                    onChange={(e) => setFormData({ ...formData, authorHandle: e.target.value })}
                    placeholder="es. @antoniocrapanzano_coach"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Watermark Divider</label>
                  <input
                    type="text"
                    value={formData.watermarkText}
                    onChange={(e) => setFormData({ ...formData, watermarkText: e.target.value })}
                    placeholder="es. • AC COACHING •"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Firma Chiusura Post (Slide Finale CTA)</label>
                <input
                  type="text"
                  value={formData.authorSignature}
                  onChange={(e) => setFormData({ ...formData, authorSignature: e.target.value })}
                  placeholder="es. Antonio Crapanzano • Performance & Biomechanics Coach"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 3. PALETTE COLORI (SFONDO, ACCENTO, CTA) CON COLOR PICKER CUSTOM */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Palette Colori & Accenti</span>
              </div>

              {/* Colore Accento (Oro Ambra / Custom) */}
              <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300">Colore di Accento Primario</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value, ctaColor: e.target.value })}
                      className="w-6 h-6 rounded-lg bg-transparent border-0 cursor-pointer"
                      title="Scegli colore personalizzato"
                    />
                    <span className="font-mono text-[11px] text-amber-300 font-bold">{formData.accentColor}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_ACCENT_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, accentColor: col.value, ctaColor: col.value })}
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition text-[11px] ${
                        formData.accentColor === col.value
                          ? 'border-white bg-slate-800 shadow-md ring-1 ring-white'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.value }} />
                      <span className="text-slate-300">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colore Sfondo Base */}
              <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300">Sfondo Scuro Principale</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-6 h-6 rounded-lg bg-transparent border-0 cursor-pointer"
                      title="Scegli sfondo personalizzato"
                    />
                    <span className="font-mono text-[11px] text-slate-400 font-bold">{formData.primaryColor}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_BG_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, primaryColor: col.value })}
                      className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition text-[11px] ${
                        formData.primaryColor === col.value
                          ? 'border-amber-400 bg-slate-800 shadow-md ring-1 ring-amber-400'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full border border-slate-700" style={{ backgroundColor: col.value }} />
                      <span className="text-slate-300">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. TIPOGRAFIA */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Type className="w-4 h-4 text-amber-400" />
                <span>Tipografia & Font Family</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Font Titoli & Headline</label>
                  <select
                    value={formData.titleFont}
                    onChange={(e) => setFormData({ ...formData, titleFont: e.target.value as 'Inter' | 'Outfit' | 'Montserrat' | 'Bebas Neue' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Inter">Inter (Pulito & Tecnico)</option>
                    <option value="Outfit">Outfit (Moderno & Bold)</option>
                    <option value="Montserrat">Montserrat (Geometrico)</option>
                    <option value="Bebas Neue">Bebas Neue (Impatto Alto)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Font Corpo & Dettagli</label>
                  <select
                    value={formData.bodyFont}
                    onChange={(e) => setFormData({ ...formData, bodyFont: e.target.value as 'Inter' | 'Roboto' | 'System' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Inter">Inter (Altamente Leggibile)</option>
                    <option value="Roboto">Roboto (Lineare Standard)</option>
                    <option value="System">System UI</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5. STILE IMMAGINI & OVERLAY */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Stile Overlay Immagini</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dark_gradient', label: 'Dark Gradient', desc: 'Sfumatura profonda' },
                  { id: 'minimal_card', label: 'Minimal Card', desc: 'Card semitrasparente' },
                  { id: 'full_bleed', label: 'Full Bleed', desc: 'Immagine piena' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, imageStyle: st.id as ImageStyle })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      formData.imageStyle === st.id
                        ? 'bg-amber-500/15 border-amber-500/70 text-amber-300 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-xs block">{st.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── COLONNA DESTRA (5/12): ANTEPRIMA LIVE IN TEMPO REALE ─── */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-950/60 flex flex-col items-center justify-between space-y-4 overflow-y-auto custom-scrollbar">
            
            {/* TOP BAR ANTEPRIMA CON SWITCHER COPERTINA / CTA */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Anteprima Live Reale</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('cover')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    previewTab === 'cover' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Copertina
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('cta')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    previewTab === 'cta' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Slide Finale CTA
                </button>
              </div>
            </div>

            {/* MOCKUP CARD SLIDE REALE 4:5 LIVE */}
            <div
              className="w-full max-w-[310px] aspect-[4/5] rounded-3xl p-5 shadow-2xl border border-slate-700/60 relative flex flex-col justify-between overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: formData.primaryColor,
                fontFamily: getFontFamilyStyle(formData.bodyFont),
              }}
            >
              {/* BAGLIORE AMBIENTALE CON ACCENT COLOR */}
              <div
                className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: formData.accentColor }}
              />

              {/* 1. HEADER SLIDE CON LOGO / WATERMARK & TAG */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  {formData.logoUrl && formData.logoPosition === 'top_left' && (
                    <img src={formData.logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded" />
                  )}
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono border"
                    style={{
                      color: formData.accentColor,
                      backgroundColor: `${formData.accentColor}1A`,
                      borderColor: `${formData.accentColor}40`,
                    }}
                  >
                    {formData.brandName || 'AC COACHING'}
                  </span>
                </div>

                {formData.logoUrl && formData.logoPosition === 'top_right' && (
                  <img src={formData.logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded" />
                )}
              </div>

              {/* 2. CORPO ANTEPRIMA (COPERTINA O SLIDE CTA) */}
              {previewTab === 'cover' ? (
                <div className="space-y-3 text-center my-auto z-10">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest font-mono block"
                    style={{ color: formData.accentColor }}
                  >
                    {formData.watermarkText}
                  </span>

                  <h4
                    className="text-2xl font-black text-white leading-tight"
                    style={{ fontFamily: getFontFamilyStyle(formData.titleFont) }}
                  >
                    L'ERRORE NELLO STACCO RUMENO
                  </h4>

                  <div
                    className="w-16 h-1 mx-auto rounded-full"
                    style={{ backgroundColor: formData.accentColor }}
                  />

                  <p className="text-xs text-slate-300 leading-relaxed max-w-[240px] mx-auto">
                    Guida biomeccanica completa per massimizzare il reclutamento dei glutei.
                  </p>

                  <div className="pt-2">
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold border"
                      style={{
                        color: formData.accentColor,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      Scorri per la guida ➔
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 z-10 my-auto">
                  <h4
                    className="text-xl font-black text-white leading-tight"
                    style={{ fontFamily: getFontFamilyStyle(formData.titleFont) }}
                  >
                    VUOI MIGLIORARE LA TUA ESECUZIONE?
                  </h4>

                  <div
                    className="p-3.5 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: `${formData.accentColor}1A`,
                      borderColor: formData.accentColor,
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs" style={{ color: formData.accentColor }}>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>SALVA IL POST & COMMENTA</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      Commenta "STACCO" per ricevere l'analisi video completa in DM.
                    </p>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
                      {formData.authorSignature}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. FOOTER SLIDE CON HANDLE & CTA ICON */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] z-10">
                <div className="flex items-center gap-1.5">
                  {formData.logoUrl && formData.logoPosition === 'bottom_left' && (
                    <img src={formData.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded" />
                  )}
                  <span className="font-bold text-slate-200 font-mono">{formData.authorHandle}</span>
                </div>
                <span className="font-bold" style={{ color: formData.accentColor }}>
                  {previewTab === 'cover' ? '01 / 07' : 'Salva 🔖'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center font-mono">
              ✨ L'anteprima si aggiorna istantaneamente ad ogni modifica
            </p>
          </div>
        </div>

        {/* ─── FOOTER AZIONI (SHRINK-0) ─── */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina AC Coaching Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salva Brand Kit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
