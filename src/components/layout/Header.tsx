import React, { useState, useRef, useEffect } from 'react';
import { Dumbbell, Menu, X, User, ChevronDown, LogOut, Settings as SettingsIcon, Camera, Bell } from 'lucide-react';
import { NavigationTab } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LogoUploadModal } from './LogoUploadModal';
import { useNotifications } from '../../context/NotificationsContext';
import { NotificationsPanel } from '../notifications/NotificationsPanel';

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
  const { user, logout } = useAuth();
  const { showInfo } = useToast();
  const { unreadCount } = useNotifications();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsBellRef = useRef<HTMLDivElement>(null);

  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('builder_custom_logo'));
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  useEffect(() => {
    const handleLogoUpdate = () => {
      setCustomLogo(localStorage.getItem('builder_custom_logo'));
    };
    window.addEventListener('app_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('app_logo_updated', handleLogoUpdate);
  }, []);

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
    <>
      <header className="bg-[var(--color-panel)] border-b border-[var(--color-panel-border)] px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-lg">
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
            <button
              type="button"
              onClick={() => setIsLogoModalOpen(true)}
              className="relative group w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 hover:border-[var(--color-primary)] flex items-center justify-center shrink-0 overflow-hidden transition-all shadow-md cursor-pointer"
              title="Clicca per personalizzare il Logo"
            >
              {customLogo ? (
                <img src={customLogo} alt="Logo AC COACHING" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="w-full h-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[9px] font-bold text-white text-center p-0.5">
                <Camera className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white uppercase">
                  <span className="text-[var(--color-primary)]">AC</span> COACHING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] inline-block"></span>
                High performance
              </p>
            </div>
          </div>
        </div>

      {/* Destra: Campanella Notifiche + Menu Utente */}
      <div className="flex items-center gap-2">

        {/* Campanella Notifiche */}
        {(user?.role === 'owner' || user?.role === 'coach') && (
          <div className="relative" ref={notificationsBellRef}>
            <button
              id="notifications-bell-btn"
              onClick={() => { setIsNotificationsPanelOpen(p => !p); setIsUserMenuOpen(false); }}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              title="Notifiche"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel
              isOpen={isNotificationsPanelOpen}
              onClose={() => setIsNotificationsPanelOpen(false)}
            />
          </div>
        )}

      <div className="relative" ref={userMenuRef}>
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

      </div> {/* fine flex destra */}
    </header>
    <LogoUploadModal
      isOpen={isLogoModalOpen}
      onClose={() => setIsLogoModalOpen(false)}
      currentLogo={customLogo}
      onLogoUpdated={(newLogo) => setCustomLogo(newLogo)}
    />
  </>
  );
};
