import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Euro,
  Clock,
  RefreshCw,
  Activity,
  Calendar,
  FileText,
  MessageSquare,
  BarChart3,
  UserCheck,
  Settings,
  X,
  Dumbbell,
  BookOpen,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

type MenuSection = {
  title: string;
  items: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[];
};

const menuSections: MenuSection[] = [
  {
    title: 'Generale',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'calendario', label: 'Calendario', icon: Calendar },
      { id: 'attivita', label: 'Attività & Task', icon: Activity },
    ],
  },
  {
    title: 'Training & Atleti',
    items: [
      { id: 'atleti', label: 'Atleti', icon: Users },
      { id: 'schede', label: 'Schede Allenamento', icon: Dumbbell },
      { id: 'progressioni', label: 'Progressioni', icon: TrendingUp },
      { id: 'esercizi', label: 'Libreria Esercizi', icon: BookOpen },
      { id: 'documenti', label: 'Documenti', icon: FileText },
    ],
  },
  {
    title: 'Finanze & Vendite',
    items: [
      { id: 'pacchetti', label: 'Pacchetti', icon: Package },
      { id: 'abbonamenti', label: 'Abbonamenti', icon: CreditCard },
      { id: 'pagamenti', label: 'Pagamenti', icon: Euro },
      { id: 'scadenze', label: 'Scadenze', icon: Clock },
      { id: 'rinnovi', label: 'Rinnovi', icon: RefreshCw },
    ],
  },
  {
    title: 'Interazioni',
    items: [
      { id: 'comunicazioni', label: 'Log Comunicazioni', icon: MessageSquare },
      { id: 'messaggi', label: 'Chat & Messaggi', icon: MessageCircle },
    ],
  },
  {
    title: 'Amministrazione',
    items: [
      { id: 'report', label: 'Report & Analisi', icon: BarChart3 },
      { id: 'collaboratori', label: 'Team', icon: UserCheck },
      { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
}) => {
  const handleSelectTab = (tab: NavigationTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full p-4 bg-[var(--color-panel)]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-2 mb-4">
        <h2 className="text-lg font-black text-white tracking-tighter">
          App<span className="text-[var(--color-primary)]">.Gestionale</span>
        </h2>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          aria-label="Chiudi menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {menuSections.map((section, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase text-slate-500 tracking-widest">
              {section.title}
            </div>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-black font-bold shadow-md shadow-[var(--color-primary)]/20'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop (fissa a sinistra) */}
      <aside className="hidden lg:block w-[260px] bg-[var(--color-panel)] border-r border-[var(--color-panel-border)] min-h-[calc(100vh-65px)] sticky top-[65px] h-[calc(100vh-65px)] shrink-0">
        {navContent}
      </aside>

      {/* Sidebar Mobile (Overlay e Drawer) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative bg-[var(--color-panel)] border-r border-[var(--color-panel-border)] w-72 max-w-[80vw] h-full shadow-2xl z-50 flex flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};

