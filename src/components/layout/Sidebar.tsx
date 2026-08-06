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
  BookOpen,
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const menuItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'atleti', label: 'Atleti', icon: Users },
  { id: 'schede', label: 'Schede Allenamento', icon: Dumbbell },
  { id: 'esercizi', label: 'Libreria Esercizi', icon: BookOpen },
  { id: 'pacchetti', label: 'Pacchetti', icon: Package },
  { id: 'abbonamenti', label: 'Abbonamenti', icon: CreditCard },
  { id: 'pagamenti', label: 'Pagamenti', icon: Euro },
  { id: 'scadenze', label: 'Scadenze', icon: Clock },
  { id: 'rinnovi', label: 'Rinnovi', icon: RefreshCw },
  { id: 'attivita', label: 'Attività', icon: Activity },
  { id: 'calendario', label: 'Calendario', icon: Calendar },
  { id: 'documenti', label: 'Documenti', icon: FileText },
  { id: 'comunicazioni', label: 'Comunicazioni', icon: MessageSquare },
  { id: 'report', label: 'Report', icon: BarChart3 },
  { id: 'collaboratori', label: 'Collaboratori', icon: UserCheck },
  { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
  { id: 'atleta_portale', label: 'Portale Atleta', icon: User },
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
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 border-b border-[var(--color-panel-border)]/50 pb-3">
        <span>Navigazione Principale</span>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          aria-label="Chiudi menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
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
      </nav>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop (fissa a sinistra) */}
      <aside className="hidden lg:block w-64 bg-[var(--color-panel)] border-r border-[var(--color-panel-border)] min-h-[calc(100vh-65px)] sticky top-[65px] h-[calc(100vh-65px)] shrink-0">
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
