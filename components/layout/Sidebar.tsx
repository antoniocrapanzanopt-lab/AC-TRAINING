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
  User,
  X,
  Dumbbell,
  ClipboardPlus,
  BookOpen,
  LogOut,
  Calculator,
  UtensilsCrossed,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronsUp,
  ClipboardCheck,
} from 'lucide-react';
import { NavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSidebarAccordion } from '../../hooks/useSidebarAccordion';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavSection {
  title: string;
  items: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[];
}

const navSections: NavSection[] = [
  {
    title: 'GESTIONE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'atleti', label: 'Atleti', icon: Users },
    ],
  },
  {
    title: 'ALLENAMENTO',
    items: [
      { id: 'esercizi', label: 'Esercizi', icon: Dumbbell },
      { id: 'crea_scheda', label: 'Crea Scheda', icon: ClipboardPlus },
      { id: 'schede_salvate', label: 'Schede Salvate', icon: BookOpen },
    ],
  },
  {
    title: 'ALIMENTAZIONE & NUTRIZIONE',
    items: [
      { id: 'alimentazione_calcolo', label: 'Calcolo Fabbisogno & Macro', icon: Calculator },
      { id: 'alimentazione_piani', label: 'Crea & Gestisci Piani', icon: UtensilsCrossed },
      { id: 'alimentazione_modelli', label: 'Libreria Modelli', icon: BookOpen },
    ],
  },
  {
    title: 'QUESTIONARI & CHECK',
    items: [
      { id: 'questionari_anamnesi', label: 'Anamnesi Iniziale', icon: FileText },
      { id: 'questionari_check', label: 'Check Intermedio & Aderenza', icon: ClipboardCheck },
      { id: 'questionari_libreria', label: 'Libreria Modelli', icon: BookOpen },
    ],
  },
  {
    title: 'COMMERCIALE',
    items: [
      { id: 'pacchetti', label: 'Pacchetti', icon: Package },
      { id: 'abbonamenti', label: 'Abbonamenti', icon: CreditCard },
      { id: 'pagamenti', label: 'Pagamenti', icon: Euro },
      { id: 'scadenze', label: 'Scadenze', icon: Clock },
      { id: 'rinnovi', label: 'Rinnovi', icon: RefreshCw },
    ],
  },
  {
    title: 'STRUMENTI',
    items: [
      { id: 'attivita', label: 'Attività', icon: Activity },
      { id: 'calendario', label: 'Calendario', icon: Calendar },
      { id: 'documenti', label: 'Documenti', icon: FileText },
      { id: 'comunicazioni', label: 'Comunicazioni & Report', icon: FileText },
      { id: 'chat', label: 'Chat & Messaggi', icon: MessageSquare },
      { id: 'report', label: 'Report', icon: BarChart3 },
      { id: 'collaboratori', label: 'Collaboratori', icon: UserCheck },
      { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
      { id: 'atleta_portale', label: 'Anteprima Portale Cliente', icon: User },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { logout } = useAuth();

  const allTitles = navSections.map((s) => s.title);
  const { expandedGroups, toggleGroup, expandAll, collapseAll, areAllCollapsed } =
    useSidebarAccordion(allTitles);

  const handleSelectTab = (tab: NavigationTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full p-4">
      {/* HEADER SIDEBAR CON TOGGLE GLOBALE */}
      <div className="flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 border-b border-[var(--color-panel-border)]/50 pb-3">
        <span>Menu Gestionale</span>

        <div className="flex items-center gap-1">
          {/* PULSANTE GLOBAL TOGGLE: COMPRIMI / ESPANDI TUTTO */}
          <button
            type="button"
            onClick={areAllCollapsed ? expandAll : collapseAll}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer shadow-sm"
            title={areAllCollapsed ? 'Espandi Tutti i Menu' : 'Comprimi Tutti i Menu'}
          >
            {areAllCollapsed ? (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Espandi</span>
              </>
            ) : (
              <>
                <ChevronsUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Comprimi</span>
              </>
            )}
          </button>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
            aria-label="Chiudi menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PULSANTE RISALTATO ANTEPRIMA AREA ATLETA */}
      <div className="mb-4">
        <button
          onClick={() => handleSelectTab('atleta_portale')}
          className="w-full py-3 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 text-[var(--color-primary)] font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/10 cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>📱 Simula Accesso Atleta</span>
        </button>
      </div>

      {/* LISTA NAVIGAZIONE CON ACCORDION TOGGLE PER OGNI MACRO-SEZIONE */}
      <nav className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {navSections.map((section) => {
          const isExpanded = expandedGroups[section.title] ?? true;
          const hasActiveChild = section.items.some((item) => item.id === activeTab);

          return (
            <div key={section.title} className="space-y-1">
              {/* ACCORDION HEADER DELLA MACRO-SEZIONE */}
              <button
                type="button"
                onClick={() => toggleGroup(section.title)}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left group cursor-pointer rounded-lg hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-slate-300 transition-colors">
                    {section.title}
                  </h4>
                  {!isExpanded && hasActiveChild && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" title="Voce attiva all'interno" />
                  )}
                </div>
                <div className="text-slate-500 group-hover:text-white transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {/* SOTTO-ELEMENTI DEL MENU (COLLAPSIBLE) */}
              {isExpanded && (
                <div className="space-y-1 pl-1 border-l border-slate-800/60 ml-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-[var(--color-primary)] text-black font-semibold shadow-md shadow-[var(--color-primary)]/20'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* PULSANTE LOGOUT */}
      <div className="pt-3 border-t border-slate-800">
        <button
          onClick={() => {
            if (window.confirm('Sei sicuro di voler uscire dalla sessione?')) {
              logout();
            }
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/30 transition-all text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400 shrink-0" />
          <span>Disconnetti Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 bg-[var(--color-panel)] border-r border-[var(--color-panel-border)] min-h-[calc(100vh-65px)] sticky top-[65px] h-[calc(100vh-65px)] shrink-0">
        {navContent}
      </aside>

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
