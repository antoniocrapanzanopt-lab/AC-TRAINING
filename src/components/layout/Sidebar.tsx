import React, { useState, useEffect, useMemo } from 'react';
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
  UserCheck,
  Settings,
  X,
  Dumbbell,
  BookOpen,
  TrendingUp,
  History,
  MessageCircle,
  ChevronDown,
  Flame,
  Brain,
  Bell,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';

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
    iconGradient: string;
    iconBorder: string;
    iconText: string;
  };
  items: { 
    id: NavigationTab; 
    label: string; 
    icon: React.FC<{ className?: string }>;
    badgeKey?: 'athletes' | 'workouts' | 'active_workouts';
  }[];
};

const menuSections: MenuSection[] = [
  {
    id: 'generale',
    title: 'Generale',
    themeColor: {
      accent: '#38bdf8',
      text: 'text-sky-400',
      bg: 'bg-sky-500/10',
      iconGradient: 'from-sky-500/15 to-blue-600/5',
      iconBorder: 'border-sky-500/25',
      iconText: 'text-sky-400',
    },
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'calendario', label: 'Calendario', icon: Calendar },
      { id: 'attivita', label: 'Task & Attività', icon: Activity },
    ],
  },
  {
    id: 'training',
    title: 'Training',
    themeColor: {
      accent: '#f59e0b',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      iconGradient: 'from-amber-500/15 to-orange-600/5',
      iconBorder: 'border-amber-500/25',
      iconText: 'text-amber-400',
    },
    items: [
      { id: 'analisi_report', label: 'Performance & Copilot', icon: Brain },
      { id: 'atleti', label: 'Atleti', icon: Users, badgeKey: 'athletes' },
      { id: 'schede', label: 'Schede Allenamento', icon: Dumbbell, badgeKey: 'workouts' },
      { id: 'cronologia_allenamenti', label: 'Storico Allenamenti', icon: History },
      { id: 'progressioni', label: 'Progressioni', icon: TrendingUp },
      { id: 'fabbisogno', label: 'Stima Fabbisogno', icon: Flame },
      { id: 'esercizi', label: 'Libreria Esercizi', icon: BookOpen },
      { id: 'documenti', label: 'Documenti', icon: FileText },
    ],
  },
  {
    id: 'finanze',
    title: 'Business',
    themeColor: {
      accent: '#10b981',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      iconGradient: 'from-emerald-500/15 to-teal-600/5',
      iconBorder: 'border-emerald-500/25',
      iconText: 'text-emerald-400',
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
      iconGradient: 'from-purple-500/15 to-indigo-600/5',
      iconBorder: 'border-purple-500/25',
      iconText: 'text-purple-400',
    },
    items: [
      { id: 'notifiche', label: 'Centro Notifiche', icon: Bell },
      { id: 'comunicazioni', label: 'Log Comunicazioni', icon: MessageSquare },
      { id: 'messaggi', label: 'Chat Atleti', icon: MessageCircle },
    ],
  },
  {
    id: 'amministrazione',
    title: 'Sistema',
    themeColor: {
      accent: '#818cf8',
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      iconGradient: 'from-indigo-500/15 to-blue-600/5',
      iconBorder: 'border-indigo-500/25',
      iconText: 'text-indigo-400',
    },
    items: [
      { id: 'collaboratori', label: 'Team Coach', icon: UserCheck },
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
  const { athletes } = useAthletes();
  const { coachTemplates, allAssignedWorkouts } = useWorkouts();

  // Calcolo badge dinamici in tempo reale
  const badgesData = useMemo(() => {
    return {
      athletes: athletes.length,
      workouts: coachTemplates.length,
      active_workouts: allAssignedWorkouts.filter(w => w.is_active).length,
    };
  }, [athletes, coachTemplates, allAssignedWorkouts]);

  // Stato tendine sezioni salvato in localStorage
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ac_sidebar_collapsed_sections');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback default
    }
    return {};
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem('ac_sidebar_collapsed_sections', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Se l'activeTab cambia ed è dentro una sezione collassata, la apriamo automaticamente
  useEffect(() => {
    const parentSection = menuSections.find(s => s.items.some(item => item.id === activeTab));
    if (parentSection && collapsedSections[parentSection.id]) {
      setCollapsedSections(prev => {
        const next = { ...prev, [parentSection.id]: false };
        try {
          localStorage.setItem('ac_sidebar_collapsed_sections', JSON.stringify(next));
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
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-2xl text-slate-300 relative overflow-hidden select-none">
      {/* Header Mobile Only (su Desktop la sidebar è collegata direttamente all'header) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/90 shrink-0">
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

      {/* ── NAVIGATION LIST CON ICONE A MICRO-GRADIENTE SATINATO & BADGE ── */}
      <nav className="flex flex-col gap-4 overflow-y-auto flex-1 p-3.5 custom-scrollbar relative z-10">
        {menuSections.map((section) => {
          const isCollapsed = !!collapsedSections[section.id];
          const hasActiveItem = section.items.some((item) => item.id === activeTab);

          return (
            <div key={section.id} className="space-y-1">
              {/* Header Sezione Sobrio e Satinato */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-900/50 transition-all cursor-pointer group select-none"
                title={isCollapsed ? `Espandi ${section.title}` : `Comprimi ${section.title}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: section.themeColor.accent }}
                  />
                  <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-200 tracking-[0.14em] truncate transition-colors">
                    {section.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCollapsed && hasActiveItem && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)] animate-pulse" />
                  )}
                  {isCollapsed && (
                    <span className="text-[9px] bg-slate-900/90 text-slate-400 px-1.5 py-0.5 rounded-md font-mono font-bold border border-slate-800">
                      {section.items.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                  />
                </div>
              </button>

              {/* Item del Menu con Icone a Micro-Gradiente Tematico */}
              {!isCollapsed && (
                <div className="flex flex-col gap-1 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const badgeCount = item.badgeKey ? badgesData[item.badgeKey] : undefined;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                          isActive
                            ? 'bg-[var(--color-primary)]/15 text-white font-black border border-[var(--color-primary)]/35 shadow-lg shadow-[var(--color-primary)]/10 backdrop-blur-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/50 hover:border-slate-800/60 border border-transparent'
                        }`}
                      >
                        {/* Indicatore laterale luminoso coordinato al tema */}
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0 pl-0.5">
                          {/* Box Icona con Micro-Gradiente Tematico */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
                              isActive
                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40 shadow-sm shadow-[var(--color-primary)]/20'
                                : `bg-gradient-to-br ${section.themeColor.iconGradient} ${section.themeColor.iconText} ${section.themeColor.iconBorder} group-hover:scale-105`
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          <span className="truncate tracking-tight">{item.label}</span>
                        </div>

                        {/* Badge Intelligente Conteggio */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {typeof badgeCount === 'number' && (
                            <span
                              className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border transition-all ${
                                isActive
                                  ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-sm'
                                  : 'bg-slate-900/90 text-slate-400 group-hover:text-slate-200 border-slate-800'
                              }`}
                            >
                              {badgeCount}
                            </span>
                          )}

                          {isActive && !badgeCount && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_6px_var(--color-primary)]" />
                          )}
                        </div>
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
      <aside className="hidden lg:block w-[250px] border-r border-slate-800/80 min-h-[calc(100vh-65px)] sticky top-[65px] h-[calc(100vh-65px)] shrink-0 shadow-2xl shadow-black/40">
        {navContent}
      </aside>

      {/* Sidebar Mobile (Overlay e Drawer) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative border-r border-slate-800 w-68 max-w-[85vw] h-full shadow-2xl z-50 flex flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
