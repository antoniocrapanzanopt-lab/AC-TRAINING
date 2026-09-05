import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Kanban,
  Calendar,
  FolderArchive,
  Video,
  Layers,
  Smartphone,
  Image as ImageIcon,
  Palette,
  BarChart3,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { StudioTab } from '../../types/studio';

interface StudioSidebarItem {
  id: StudioTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number;
  badgeVariant?: 'amber' | 'sky' | 'rose' | 'purple';
  isStudioTool?: boolean;
}

interface ContentStudioSidebarProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  inboxCount?: number;
  pipelineActiveCount?: number;
  todayToRecordCount?: number;
}

export const ContentStudioSidebar: React.FC<ContentStudioSidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  inboxCount = 0,
  pipelineActiveCount = 0,
  todayToRecordCount = 0,
}) => {
  const mainSections: StudioSidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Contenuti',
      icon: LayoutDashboard,
      badge: todayToRecordCount > 0 ? todayToRecordCount : undefined,
      badgeVariant: 'rose',
    },
    {
      id: 'inbox',
      label: 'Inbox Idee',
      icon: Inbox,
      badge: inboxCount > 0 ? inboxCount : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      icon: Kanban,
      badge: pipelineActiveCount > 0 ? pipelineActiveCount : undefined,
      badgeVariant: 'sky',
    },
    {
      id: 'calendar',
      label: 'Calendario Editoriale',
      icon: Calendar,
    },
    {
      id: 'library',
      label: 'Libreria Contenuti',
      icon: FolderArchive,
    },
  ];

  const creativeStudios: StudioSidebarItem[] = [
    {
      id: 'reel_studio',
      label: 'Reel Studio',
      icon: Video,
      isStudioTool: true,
    },
    {
      id: 'carousel_studio',
      label: 'Carousel Studio',
      icon: Layers,
      isStudioTool: true,
    },
    {
      id: 'story_studio',
      label: 'Story Studio',
      icon: Smartphone,
      isStudioTool: true,
    },
    {
      id: 'cover_studio',
      label: 'Cover Studio',
      icon: ImageIcon,
      isStudioTool: true,
    },
  ];

  const systemSections: StudioSidebarItem[] = [
    {
      id: 'brand_kit',
      label: 'Brand Kit',
      icon: Palette,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
  ];

  const handleSelect = (tab: StudioTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const renderItem = (item: StudioSidebarItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    let badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (item.badgeVariant === 'rose') {
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    } else if (item.badgeVariant === 'sky') {
      badgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    } else if (item.badgeVariant === 'purple') {
      badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleSelect(item.id)}
        className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left relative ${
          isActive
            ? 'bg-amber-500/15 text-white font-semibold border border-amber-500/40 shadow-sm shadow-amber-500/10'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full shadow-sm shadow-amber-400/80" />
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/30'
                : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="truncate">{item.label}</span>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          {item.badge !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeClass}`}
            >
              {item.badge}
            </span>
          )}
          {item.isStudioTool && !isActive && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* MOBILE BACKDROP */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* SIDEBAR ASIDE */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[61px] left-0 z-50 lg:z-30 h-full lg:h-[calc(100vh-61px)] w-64 bg-[#070A10] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          
          {/* GRUPPO 1: GESTIONE CONTENUTI */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
                Workflow & Pipeline
              </span>
            </div>
            <div className="space-y-1">
              {mainSections.map(renderItem)}
            </div>
          </div>

          {/* GRUPPO 2: CREATIVE STUDIOS */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-amber-500/80 uppercase font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Creative Studios
              </span>
            </div>
            <div className="space-y-1">
              {creativeStudios.map(renderItem)}
            </div>
          </div>

          {/* GRUPPO 3: BRAND & ANALYTICS */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
                Brand & Performance
              </span>
            </div>
            <div className="space-y-1">
              {systemSections.map(renderItem)}
            </div>
          </div>

        </div>

        {/* BOTTOM FOOTER: STUDIO BADGE */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-sky-500/5 border border-amber-500/20 text-[11px] text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">Studio Cloud Sync</span>
            </div>
            <span className="text-[10px] text-amber-300 font-mono font-bold">v2.0</span>
          </div>
        </div>

      </aside>
    </>
  );
};
