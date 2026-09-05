import React from 'react';
import {
  Sparkles,
  Plus,
  Video,
  Layers,
  Smartphone,
  Calendar,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { StudioTab } from '../../types/studio';

interface ContentStudioHeaderProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  onQuickNewIdea: () => void;
  onQuickNewReel: () => void;
  onQuickNewCarousel: () => void;
  onQuickNewStory: () => void;
  onSwitchToCoaching: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const ContentStudioHeader: React.FC<ContentStudioHeaderProps> = ({
  activeTab,
  onTabChange,
  onQuickNewIdea,
  onQuickNewReel,
  onQuickNewCarousel,
  onQuickNewStory,
  onSwitchToCoaching,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#070A10]/95 backdrop-blur-md border-b border-amber-500/20 px-4 sm:px-6 py-3 transition-colors shadow-lg shadow-black/40">
      <div className="flex items-center justify-between gap-4 max-w-[1920px] mx-auto">
        
        {/* LOGO & SUITE IDENTITY */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                  AC <span className="text-amber-400">CONTENT STUDIO</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  PRO SUITE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                Workspace per la creazione, produzione & analisi social
              </p>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS BAR (Nuova Idea, Reel, Carousel, Story, Calendario) */}
        <div className="hidden xl:flex items-center gap-2">
          <button
            type="button"
            onClick={onQuickNewIdea}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuova Idea</span>
          </button>

          <button
            type="button"
            onClick={onQuickNewReel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:border-sky-500/60 transition-all shadow-sm"
          >
            <Video className="w-3.5 h-3.5" />
            <span>+ Reel</span>
          </button>

          <button
            type="button"
            onClick={onQuickNewCarousel}
            onMouseEnter={() => {
              import('../contents/carousel/CarouselStudioModal');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-500/60 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Carousel</span>
          </button>

          <button
            type="button"
            onClick={onQuickNewStory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 transition-all shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>+ Story</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeTab === 'calendar'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>
        </div>

        {/* RETURN TO COACHING APP */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToCoaching}
            className="group flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-amber-500/50 shadow-md transition-all active:scale-[0.98]"
            title="Torna al gestionale principale AC Coaching"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Torna ad</span>
            <span className="font-bold text-amber-300">AC Coaching</span>
          </button>
        </div>

      </div>
    </header>
  );
};
