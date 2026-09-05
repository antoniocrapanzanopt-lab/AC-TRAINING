import React, { useMemo } from 'react';
import {
  Video,
  Layers,
  Smartphone,
  Calendar,
  Sparkles,
  Flame,
  Clock,
  TrendingUp,
  CheckCircle2,
  Plus,
  ArrowRight,
  Eye,
  Bookmark,
  CalendarDays,
  FileText,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useInbox } from '../../context/InboxContext';
import { InstagramContent, ContentType, ContentStatus } from '../../types/inboxAndContent';
import { StudioTab } from '../../types/studio';

interface StudioDashboardPageProps {
  onNavigate: (tab: StudioTab) => void;
  onOpenContent: (content: InstagramContent) => void;
  onQuickNewIdea: () => void;
  onQuickNewReel: () => void;
  onQuickNewCarousel: () => void;
  onQuickNewStory: () => void;
}

export const StudioDashboardPage: React.FC<StudioDashboardPageProps> = ({
  onNavigate,
  onOpenContent,
  onQuickNewIdea,
  onQuickNewReel,
  onQuickNewCarousel,
  onQuickNewStory,
}) => {
  const { contents } = useContents();
  const { entries } = useInbox();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 1. Contenuti da registrare oggi (o pronti alla registrazione)
  const toRecordToday = useMemo(() => {
    return contents.filter((c) => {
      if (c.status === 'ready_to_record') return true;
      if (c.status === 'script_draft' && c.scheduled_for && c.scheduled_for.slice(0, 10) <= todayStr) {
        return true;
      }
      return false;
    });
  }, [contents, todayStr]);

  // 2. Contenuti per stato
  const countsByStatus = useMemo(() => {
    const stats: Record<ContentStatus, number> = {
      idea: 0,
      script_draft: 0,
      ready_to_record: 0,
      recorded: 0,
      editing: 0,
      ready_to_publish: 0,
      published: 0,
      repurpose: 0,
    };
    contents.forEach((c) => {
      if (stats[c.status] !== undefined) {
        stats[c.status]++;
      }
    });
    return stats;
  }, [contents]);

  // 3. Prossime pubblicazioni (programmati con data >= oggi o status ready_to_publish)
  const upcomingPublications = useMemo(() => {
    return contents
      .filter((c) => {
        if (c.status === 'published') return false;
        return Boolean(c.scheduled_for || c.status === 'ready_to_publish');
      })
      .sort((a, b) => {
        const dateA = a.scheduled_for || '9999-12-31';
        const dateB = b.scheduled_for || '9999-12-31';
        return dateA.localeCompare(dateB);
      })
      .slice(0, 6);
  }, [contents]);

  // 4. Performance recenti (contenuti pubblicati con metriche)
  const recentPublished = useMemo(() => {
    return contents
      .filter((c) => c.status === 'published')
      .sort((a, b) => {
        const dateA = a.published_at || a.updated_at;
        const dateB = b.published_at || b.updated_at;
        return dateB.localeCompare(dateA);
      })
      .slice(0, 4);
  }, [contents]);

  const totalAggregatedMetrics = useMemo(() => {
    let views = 0;
    let likes = 0;
    let saves = 0;
    let shares = 0;

    contents.forEach((c) => {
      if (c.performance_metrics) {
        views += c.performance_metrics.views || 0;
        likes += c.performance_metrics.likes || 0;
        saves += c.performance_metrics.saves || 0;
        shares += c.performance_metrics.shares || 0;
      }
    });

    return { views, likes, saves, shares };
  }, [contents]);

  const formatTypeBadge = (type: ContentType) => {
    switch (type) {
      case 'reel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Video className="w-3 h-3" /> Reel
          </span>
        );
      case 'carousel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Layers className="w-3 h-3" /> Carousel
          </span>
        );
      case 'story':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Smartphone className="w-3 h-3" /> Story
          </span>
        );
      case 'post':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <FileText className="w-3 h-3" /> Post
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      
      {/* HEADER DELLA DASHBOARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <Sparkles className="w-7 h-7 text-amber-400" />
              Dashboard Contenuti
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Overview Live
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Controllo delle riprese odierne, pipeline di produzione, programmazione e performance social.
          </p>
        </div>

        {/* METRICHE RAPIDE */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
            <span className="block text-[10px] font-mono uppercase text-slate-500">Contenuti Totali</span>
            <span className="text-lg font-black text-white font-mono">{contents.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
            <span className="block text-[10px] font-mono uppercase text-amber-400">Idee in Inbox</span>
            <span className="text-lg font-black text-amber-300 font-mono">{entries.length}</span>
          </div>
        </div>
      </div>

      {/* AZIONI RAPIDE (NUOVA IDEA, REEL, CAROUSEL, STORY, CALENDARIO) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono flex items-center gap-2">
          <span>⚡ Creazione & Azioni Rapide</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <button
            type="button"
            onClick={onQuickNewIdea}
            className="group p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-950 border border-amber-500/30 hover:border-amber-400 transition-all text-left shadow-md hover:shadow-amber-500/10 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Nuova Idea</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">Appunto o spunto rapido</p>
          </button>

          <button
            type="button"
            onClick={onQuickNewReel}
            className="group p-4 rounded-2xl bg-gradient-to-br from-sky-500/15 via-slate-900/90 to-slate-950 border border-sky-500/30 hover:border-sky-400 transition-all text-left shadow-md hover:shadow-sky-500/10 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 mb-3 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">Nuovo Reel</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">Hook, script & B-roll</p>
          </button>

          <button
            type="button"
            onClick={onQuickNewCarousel}
            className="group p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 via-slate-900/90 to-slate-950 border border-purple-500/30 hover:border-purple-400 transition-all text-left shadow-md hover:shadow-purple-500/10 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-3 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Nuovo Carousel</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">Editor 1080x1350 & slide</p>
          </button>

          <button
            type="button"
            onClick={onQuickNewStory}
            className="group p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-slate-900/90 to-slate-950 border border-rose-500/30 hover:border-rose-400 transition-all text-left shadow-md hover:shadow-rose-500/10 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 mb-3 group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">Nuova Story</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">Sequenza 9:16 & sticker</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className="group p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-900/90 to-slate-950 border border-slate-700/70 hover:border-amber-500/50 transition-all text-left shadow-md hover:-translate-y-0.5 active:translate-y-0 col-span-2 sm:col-span-1"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-amber-400 mb-3 group-hover:scale-105 transition-all">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Calendario</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">Viste & programmazione</p>
          </button>

        </div>
      </div>

      {/* SEZIONE 1: DA REGISTRARE OGGI & CONTENUTI PER STATO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNA SINISTRA: DA REGISTRARE OGGI (2 COLONNE SU DESKTOP) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">Da Registrare Oggi</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {toRecordToday.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pipeline')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Vedi Pipeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {toRecordToday.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-white">Nessun contenuto in attesa di registrazione per oggi!</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tutti i video in scaletta sono stati ripresi o sono già passati alla fase di montaggio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {toRecordToday.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenContent(item)}
                  className="group cursor-pointer p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-850/80 transition-all shadow-md relative"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {formatTypeBadge(item.type)}
                    <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Da girare
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.hook && (
                    <p className="text-xs text-slate-400 italic mt-1 line-clamp-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      "{item.hook}"
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Pillar: <strong className="text-slate-300">{item.pillar}</strong></span>
                    <span className="text-rose-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Apri <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PROSSIME PUBBLICAZIONI */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Prossime Pubblicazioni</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                Calendario completo <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {upcomingPublications.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                Nessun contenuto programmato nei prossimi giorni.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingPublications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenContent(item)}
                    className="cursor-pointer flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-sky-500/40 hover:bg-slate-850/60 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {formatTypeBadge(item.type)}
                      <span className="text-xs font-semibold text-white truncate max-w-xs md:max-w-md">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                      <span className="font-mono text-sky-300">
                        {item.scheduled_for ? new Date(item.scheduled_for).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : 'Da fissare'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'ready_to_publish'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* COLONNA DESTRA: STATO PIPELINE & METRICHE */}
        <div className="space-y-6">
          
          {/* STATI PIPELINE */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center justify-between">
              <span>Stato Pipeline</span>
              <button
                type="button"
                onClick={() => onNavigate('pipeline')}
                className="text-xs text-amber-400 hover:text-amber-300 lowercase font-normal"
              >
                board →
              </button>
            </h2>

            <div className="space-y-2.5">
              <div
                onClick={() => onNavigate('pipeline')}
                className="cursor-pointer flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
              >
                <span className="text-xs font-semibold text-amber-200">Idee</span>
                <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20">
                  {countsByStatus.idea}
                </span>
              </div>

              <div
                onClick={() => onNavigate('pipeline')}
                className="cursor-pointer flex items-center justify-between p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/40 transition-colors"
              >
                <span className="text-xs font-semibold text-sky-200">Script in stesura</span>
                <span className="text-xs font-mono font-bold text-sky-300 px-2 py-0.5 rounded bg-sky-500/20">
                  {countsByStatus.script_draft}
                </span>
              </div>

              <div
                onClick={() => onNavigate('pipeline')}
                className="cursor-pointer flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
              >
                <span className="text-xs font-semibold text-rose-200">Da registrare</span>
                <span className="text-xs font-mono font-bold text-rose-300 px-2 py-0.5 rounded bg-rose-500/20">
                  {countsByStatus.ready_to_record}
                </span>
              </div>

              <div
                onClick={() => onNavigate('pipeline')}
                className="cursor-pointer flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
              >
                <span className="text-xs font-semibold text-purple-200">Montaggio</span>
                <span className="text-xs font-mono font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-500/20">
                  {countsByStatus.editing}
                </span>
              </div>

              <div
                onClick={() => onNavigate('pipeline')}
                className="cursor-pointer flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
              >
                <span className="text-xs font-semibold text-emerald-200">Pronti</span>
                <span className="text-xs font-mono font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20">
                  {countsByStatus.ready_to_publish}
                </span>
              </div>

              <div
                onClick={() => onNavigate('pipeline')}
                className="cursor-pointer flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-500 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-300">Pubblicati</span>
                <span className="text-xs font-mono font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-700/60">
                  {countsByStatus.published}
                </span>
              </div>
            </div>
          </div>

          {/* PERFORMANCE RECENTI */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Performance Recenti
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="text-xs text-emerald-400 hover:text-emerald-300 lowercase"
              >
                analytics →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Views</span>
                </div>
                <span className="text-base font-black text-white font-mono">
                  {totalAggregatedMetrics.views > 0 ? totalAggregatedMetrics.views.toLocaleString('it-IT') : '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Salvataggi</span>
                </div>
                <span className="text-base font-black text-amber-300 font-mono">
                  {totalAggregatedMetrics.saves > 0 ? totalAggregatedMetrics.saves.toLocaleString('it-IT') : '—'}
                </span>
              </div>
            </div>

            {recentPublished.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                Nessun contenuto pubblicato registrato con metriche.
              </p>
            ) : (
              <div className="space-y-2">
                {recentPublished.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenContent(item)}
                    className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                  >
                    <div className="font-semibold text-white truncate">{item.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                      <span>👁 {item.performance_metrics?.views || 0}</span>
                      <span>❤️ {item.performance_metrics?.likes || 0}</span>
                      <span>🔖 {item.performance_metrics?.saves || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
