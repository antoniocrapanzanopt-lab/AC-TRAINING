import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, Menu, X, User, ChevronDown, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { NavigationTab } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { NotificationCenter } from './NotificationCenter';
import { VideoFeedbackModal } from '../feedback/VideoFeedbackModal';
import { NotificationItem } from '../../types';

interface HeaderProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onTabChange,
  onMobileMenuToggle,
  isMobileMenuOpen,
}) => {
  const { ownerProfile } = useApp();
  const { user, logout, currentOrganization } = useAuth();
  const { settings } = useSettings();
  const { showInfo } = useToast();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedVideoCorrection, setSelectedVideoCorrection] = useState<NotificationItem | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    showInfo('Disconnessione effettuata', 'Tornato alla pagina di accesso demo.');
  };

  return (
    <header className="bg-[var(--color-panel)] border-b border-[var(--color-panel-border)] px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      {/* Sinistra: Menu Mobile Toggle + Logo + Organizzazione */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Apri menu principale"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6 text-[var(--color-primary)]" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="flex items-center gap-3">
          {settings.organization?.logoUrl ? (
            <img
              src={settings.organization.logoUrl}
              alt="Logo Organizzazione"
              className="w-10 h-10 object-contain rounded-xl bg-slate-900 border border-slate-800 p-0.5 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white uppercase">
                Builder <span className="text-[var(--color-primary)]">Athlete</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase">
                Manager
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {currentOrganization?.name || ownerProfile?.organizationName || 'Organizzazione Demo'}
            </p>
          </div>
        </div>
      </div>

      {/* Destra: Menu Utente con Logout */}
      <div className="flex items-center gap-3 relative" ref={userMenuRef}>
        
        {/* Notification Center */}
        <NotificationCenter 
          onVideoCorrectionClick={(notif) => setSelectedVideoCorrection(notif)}
          onProfileClick={(_athleteId) => {
            onTabChange('atleti');
            // Nota: nella versione reale, potresti aver bisogno di aggiornare il contesto per selezionare l'atleta
            showInfo('Navigazione', 'Seleziona l\'atleta dalla lista.');
          }}
        />

        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900/60 border border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/40 transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-tight">
              {user?.name || ownerProfile?.fullName || 'Proprietario Demo'}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'owner'}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu Utente */}
        {isUserMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl shadow-2xl p-1.5 z-40 animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 border-b border-[var(--color-panel-border)] mb-1">
              <p className="text-xs font-bold text-white">{user?.name || ownerProfile?.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ownerProfile?.email}</p>
            </div>
            <button
              onClick={() => {
                onTabChange('impostazioni');
                setIsUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Impostazioni Profilo</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors mt-1"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Esci dalla sessione</span>
            </button>
          </div>
        )}
      </div>

      {/* Video Feedback Modal */}
      {selectedVideoCorrection && (
        <VideoFeedbackModal 
          notification={selectedVideoCorrection}
          onClose={() => setSelectedVideoCorrection(null)}
        />
      )}
    </header>
  );
};
