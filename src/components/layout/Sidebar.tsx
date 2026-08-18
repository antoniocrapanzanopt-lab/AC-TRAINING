import React, { useState, useEffect } from 'react';
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
  History,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

type MenuSection = {
  id: string;
  title: string;
  themeColor: {
    accent: string;
    text: string;
    bg: string;
  };
  items: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[];
};

const menuSections: MenuSection[] = [
  {
    id: 'generale',
    title: 'Generale',
    themeColor: {
      accent: '#38bdf8',
      text: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'calendario', label: 'Calendario', icon: Calendar },
      { id: 'attivita', label: 'Attività & Task', icon: Activity },
    ],
  },
  {
    id: 'training',
    title: 'Training',
    themeColor: {
      accent: '#f59e0b',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    items: [
      { id: 'atleti', label: 'Atleti', icon: Users },
      { id: 'schede', label: 'Schede Allenamento', icon: Dumbbell },
      { id: 'progressioni', label: 'Progressioni', icon: TrendingUp },
      { id: 'cronologia_allenamenti', label: 'Cronologia Allenamenti', icon: History },
      { id: 'esercizi', label: 'Libreria Esercizi', icon: BookOpen },
      { id: 'documenti', label: 'Documenti', icon: FileText },
    ],
  },
  {
    id: 'finanze',
    title: 'Finanze',
    themeColor: {
      accent: '#10b981',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    items: [
      { id: 'pacchetti', label: 'Pacchetti', icon: Package },
      { id: 'abbonamenti', label: 'Abbonamenti', icon: CreditCard },
      { id: 'pagamenti', label: 'Pagamenti', icon: Euro },
      { id: 'scadenze', label: 'Scadenze', icon: Clock },
      { id: 'rinnovi', label: 'Rinnovi', icon: RefreshCw },
    ],
  },
  {
    id: 'comunicazioni',
    title: 'Comunicazioni',
    themeColor: {
      accent: '#a855f7',
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    items: [
      { id: 'comunicazioni', label: 'Log Comunicazioni', icon: MessageSquare },
      { id: 'messaggi', label: 'Chat & Messaggi', icon: MessageCircle },
    ],
  },
  {
    id: 'amministrazione',
    title: 'Amministrazione',
    themeColor: {
      accent: '#818cf8',
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
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
  // Stato delle tendine collassate (salvato in localStorage per preferenza utente)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Salva le preferenze visive delle sezioni in localStorage
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save sidebar state', err);
      }
      return next;
    });
  };

  // Se l'utente atterra su un tab la cui sezione è chiusa, la auto-apre per renderla visibile
  useEffect(() => {
    const parentSection = menuSections.find((s) => s.items.some((item) => item.id === activeTab));
    if (parentSection && collapsedSections[parentSection.id]) {
      setCollapsedSections((prev) => {
        const next = { ...prev, [parentSection.id]: false };
        try {
          localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }, [activeTab]);

  const handleSelectTab = (tab: NavigationTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#080c14] text-slate-300 relative overflow-hidden">
      {/* Header Mobile Only (su Desktop la sidebar è collegata fluidamente all'header principale) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
          Menu Navigazione
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Chiudi menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List con Spaziature Pulite e Tendine Collassabili */}
      <nav className="flex flex-col gap-3 overflow-y-auto flex-1 p-3 no-scrollbar relative z-10">
        {menuSections.map((section) => {
          const isCollapsed = !!collapsedSections[section.id];
          const hasActiveItem = section.items.some((item) => item.id === activeTab);

          return (
            <div key={section.id} className="space-y-0.5">
              {/* Header Sezione Sobrio ed Elegante */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-850/50 transition-all cursor-pointer group select-none"
                title={isCollapsed ? `Espandi ${section.title}` : `Comprimi ${section.title}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: section.themeColor.accent }}
                  />
                  <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-slate-300 tracking-[0.14em] truncate transition-colors">
                    {section.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Badge indicatore se chiusa e ha tab attivo */}
                  {isCollapsed && hasActiveItem && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                  {isCollapsed && (
                    <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded font-mono font-semibold">
                      {section.items.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-transform duration-150 ${
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                  />
                </div>
              </button>

              {/* Item del Menu con Design Pulito e Senza Bagliori Eccessivi */}
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5 pt-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/10 text-white font-bold border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                        }`}
                      >
                        {/* Indicatore laterale ambra raffinato */}
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0 pl-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                              isActive
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <span className="truncate tracking-wide">{item.label}</span>
                        </div>

                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mr-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop (fissa a sinistra) */}
      <aside className="hidden lg:block w-[245px] border-r border-slate-800/80 min-h-[calc(100vh-65px)] sticky top-[65px] h-[calc(100vh-65px)] shrink-0 shadow-lg shadow-black/20">
        {navContent}
      </aside>

      {/* Sidebar Mobile (Overlay e Drawer) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative border-r border-slate-800 w-64 max-w-[80vw] h-full shadow-2xl z-50 flex flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
