import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Flame,
  Scissors,
  Send,
  Plus,
  CheckCircle2,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { InstagramContent, ContentStatus } from '../../types/inboxAndContent';
import { ContentHorizontalCard } from './ContentHorizontalCard';

interface ContentFeedViewProps {
  contents: InstagramContent[];
  onEditContent: (content: InstagramContent) => void;
  onNewContent: (defaultStatus?: ContentStatus) => void;
}

interface ContentFolderConfig {
  status: ContentStatus;
  label: string;
  shortLabel: string;
  badge: string;
  icon: React.ReactNode;
  activeColor: string;
  tagColor: string;
  description: string;
  emptyHint: string;
}

const FOLDERS: ContentFolderConfig[] = [
  {
    status: 'idea',
    label: '1. Idee & Spunti',
    shortLabel: '💡 Idee',
    badge: 'Idee',
    icon: <Sparkles className="w-4 h-4 text-blue-400" />,
    activeColor: 'bg-blue-500 text-white shadow-md shadow-blue-500/20',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Tutti gli spunti grezzi e le idee generate dall\'AI o salvate come note.',
    emptyHint: 'Nessuna idea in attesa. Crea una nuova idea o converti un pensiero dall\'Inbox AI!',
  },
  {
    status: 'script_draft',
    label: '2. Script in Bozza',
    shortLabel: '📝 Script',
    badge: 'Script',
    icon: <FileText className="w-4 h-4 text-amber-400" />,
    activeColor: 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Contenuti con scaletta scene e testi in fase di scrittura e revisione.',
    emptyHint: 'Nessuno script in bozza. Fai avanzare un\'idea per iniziare a scriverne lo script!',
  },
  {
    status: 'ready_to_record',
    label: '3. Da Registrare',
    shortLabel: '🎬 Video',
    badge: 'Video',
    icon: <Flame className="w-4 h-4 text-rose-400" />,
    activeColor: 'bg-rose-500 text-white shadow-md shadow-rose-500/20',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    description: 'Reel e video pronti per la sessione di registrazione in palestra o in studio.',
    emptyHint: 'Nessun video da registrare. Completa uno script per mandarlo in registrazione!',
  },
  {
    status: 'editing',
    label: '4. In Montaggio',
    shortLabel: '✂️ Montaggio',
    badge: 'Monta',
    icon: <Scissors className="w-4 h-4 text-purple-400" />,
    activeColor: 'bg-purple-500 text-white shadow-md shadow-purple-500/20',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    description: 'Video registrati attualmente in fase di taglio, sottotitolazione o revisione.',
    emptyHint: 'Nessun video in montaggio. Segna un video come "Registrato" per spostarlo qui!',
  },
  {
    status: 'ready_to_publish',
    label: '5. Pronti per Instagram',
    shortLabel: '🚀 Pronti',
    badge: 'Pronti',
    icon: <Send className="w-4 h-4 text-emerald-400" />,
    activeColor: 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Contenuti finali approvati con caption, hashtag e data di pubblicazione definita.',
    emptyHint: 'Nessun post pronto da pubblicare. Completa il montaggio di un video per programmarlo!',
  },
  {
    status: 'published',
    label: '6. Archivio Pubblicati',
    shortLabel: '✅ Pubblicati',
    badge: 'Archivio',
    icon: <CheckCircle2 className="w-4 h-4 text-slate-300" />,
    activeColor: 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-md',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    description: 'Storico di tutti i post e Reel pubblicati. Puoi riproporli come nuova idea con 1 clic.',
    emptyHint: 'Nessun contenuto ancora archiviato tra i pubblicati.',
  },
];

export const ContentFeedView: React.FC<ContentFeedViewProps> = ({
  contents,
  onEditContent,
  onNewContent,
}) => {
  const [activeFolderStatus, setActiveFolderStatus] = useState<ContentStatus>('idea');

  const currentFolder = FOLDERS.find((f) => f.status === activeFolderStatus) || FOLDERS[0];
  const folderContents = contents.filter((c) => c.status === activeFolderStatus);

  const getFolderCount = (status: ContentStatus) => {
    return contents.filter((c) => c.status === status).length;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* BARRA DELLE CARTELLE (TABS AD ALTA VISIBILITÀ) */}
      <div className="bg-slate-900/70 p-2.5 rounded-3xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 custom-scrollbar">
          
          <div className="flex items-center gap-2">
            {FOLDERS.map((folder) => {
              const isActive = folder.status === activeFolderStatus;
              const count = getFolderCount(folder.status);

              return (
                <button
                  key={folder.status}
                  type="button"
                  onClick={() => setActiveFolderStatus(folder.status)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 shrink-0 ${
                    isActive
                      ? folder.activeColor
                      : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {folder.icon}
                  <span>{folder.shortLabel}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      isActive
                        ? folder.status === 'published' || folder.status === 'ready_to_publish' || folder.status === 'script_draft'
                          ? 'bg-slate-950/30 text-slate-950'
                          : 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TASTO + NUOVO CONTENUTO NELLA CARTELLA ATTIVA */}
          <button
            type="button"
            onClick={() => onNewContent(activeFolderStatus === 'published' ? 'idea' : activeFolderStatus)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Aggiungi a {currentFolder.badge}</span>
          </button>
        </div>
      </div>

      {/* HEADER DELLA CARTELLA APERTA */}
      <div className="p-5 rounded-3xl bg-slate-900/40 border border-slate-800/90 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
            <FolderOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                Cartella: {currentFolder.label}
              </h2>
              <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border ${currentFolder.tagColor}`}>
                {folderContents.length} {folderContents.length === 1 ? 'elemento' : 'elementi'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentFolder.description}
            </p>
          </div>
        </div>

        {/* GUIDA RAPIDA SUL PROSSIMO STEP */}
        <div className="text-[11px] text-slate-400 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800/80 shrink-0 flex items-center gap-2">
          <span>Avanzando un elemento, si sposta in:</span>
          <span className="text-amber-400 font-bold flex items-center gap-1">
            {activeFolderStatus === 'idea' && '📝 Script in Bozza'}
            {activeFolderStatus === 'script_draft' && '🎬 Da Registrare'}
            {activeFolderStatus === 'ready_to_record' && '✂️ In Montaggio'}
            {activeFolderStatus === 'editing' && '🚀 Pronti per Instagram'}
            {activeFolderStatus === 'ready_to_publish' && '✅ Archivio Pubblicati'}
            {activeFolderStatus === 'published' && '💡 Idee (se riproposto)'}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* LISTA SCHEDE DELLA CARTELLA SELEZIONATA */}
      <div className="space-y-4">
        {folderContents.length === 0 ? (
          <div className="p-14 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Questa cartella è vuota</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {currentFolder.emptyHint}
            </p>
            <button
              type="button"
              onClick={() => onNewContent(activeFolderStatus === 'published' ? 'idea' : activeFolderStatus)}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crea in {currentFolder.badge}
            </button>
          </div>
        ) : (
          folderContents.map((content) => (
            <ContentHorizontalCard
              key={content.id}
              content={content}
              onEdit={onEditContent}
            />
          ))
        )}
      </div>
    </div>
  );
};
