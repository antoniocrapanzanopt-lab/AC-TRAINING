import React from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AthletesProvider } from './context/AthletesContext';
import { SubscriptionsProvider } from './context/SubscriptionsContext';
import { PackagesProvider } from './context/PackagesContext';
import { PaymentsProvider } from './context/PaymentsContext';
import { RenewalsProvider } from './context/RenewalsContext';
import { TasksProvider } from './context/TasksContext';
import { CalendarProvider } from './context/CalendarContext';
import { DocumentsProvider } from './context/DocumentsContext';
import { CommunicationsProvider } from './context/CommunicationsContext';
import { SettingsProvider } from './context/SettingsContext';
import { WorkoutsProvider } from './context/WorkoutsContext';
import { MessagesProvider } from './context/MessagesContext';
import { ExercisesProvider } from './context/ExercisesContext';
import { MetricsProvider } from './context/MetricsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ProgressionsProvider } from './context/ProgressionsContext';
import { NutritionProvider } from './context/NutritionContext';
import { InboxProvider } from './context/InboxContext';
import { ContentsProvider } from './context/ContentsContext';
import { PwaUpdateProvider } from './context/PwaUpdateContext';
import { PwaUpdateBanner } from './components/pwa/PwaUpdateBanner';

import { AuthPage } from './pages/auth/AuthPage';
import { InvitePage } from './pages/auth/InvitePage';
import { MainLayout } from './MainLayout';
import { AthleteLayout } from './pages/athlete/AthleteLayout';
import { ContentStudioLayout } from './components/studio/ContentStudioLayout';
import { WelcomeDisclaimerModal } from './components/common/WelcomeDisclaimerModal';
import { RequireAAL2 } from './components/auth/RequireAAL2';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isLoading: isAppLoading } = useApp();
  const { isAuthenticated, user, loading: isAuthLoading, markDisclaimerAsSeen, isPasswordRecovery } = useAuth();

  const [activeApp, setActiveApp] = React.useState<'coaching' | 'content_studio'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === 'content-studio') {
      return 'content_studio';
    }
    const saved = localStorage.getItem('ac_active_app');
    return saved === 'content_studio' ? 'content_studio' : 'coaching';
  });

  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('app') === 'content-studio') {
        setActiveApp('content_studio');
      } else {
        setActiveApp('coaching');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenContentStudio = () => {
    setActiveApp('content_studio');
    localStorage.setItem('ac_active_app', 'content_studio');
    const url = new URL(window.location.href);
    url.searchParams.set('app', 'content-studio');
    window.history.pushState(null, '', url.toString());
  };

  const handleSwitchToCoaching = () => {
    setActiveApp('coaching');
    localStorage.setItem('ac_active_app', 'coaching');
    const url = new URL(window.location.href);
    url.searchParams.delete('app');
    window.history.pushState(null, '', url.toString());
  };

  // 1. Schermata di caricamento iniziale senza lampi
  if (isAppLoading || (isAuthLoading && !user)) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-[var(--color-primary)]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Caricamento...
          </span>
        </div>
      </div>
    );
  }

  // 2. Controllo se è un link di invito (L'atleta non deve mai vedere il Setup)
  const urlParams = new URLSearchParams(window.location.search);
  const inviteEmail = urlParams.get('invite');
  if (inviteEmail && !isAuthenticated) {
    return <InvitePage email={inviteEmail} />;
  }

  // 3. Se l'utente non ha effettuato il login oppure sta reimpostando la password dal link email
  if (!isAuthenticated || isPasswordRecovery) {
    return <AuthPage />;
  }

  const showDisclaimer = Boolean(isAuthenticated && user && !user.hasSeenDisclaimer);

  // 4. Se la sessione è attiva, mostra il layout principale ed eventualmente la modale di benvenuto
  return (
    <RequireAAL2>
      {user?.role === 'athlete' ? (
        <AthleteLayout />
      ) : activeApp === 'content_studio' ? (
        <ContentStudioLayout onSwitchToCoaching={handleSwitchToCoaching} />
      ) : (
        <MainLayout onOpenContentStudio={handleOpenContentStudio} />
      )}
      <WelcomeDisclaimerModal
        isOpen={showDisclaimer}
        onConfirm={markDisclaimerAsSeen}
      />
      <PwaUpdateBanner />
    </RequireAAL2>
  );
};

import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PwaUpdateProvider>
          <AppProvider>
            <AuthProvider>
              <ToastProvider>
                <SettingsProvider>
                  <PackagesProvider>
                    <AthletesProvider>
                      <SubscriptionsProvider>
                        <PaymentsProvider>
                          <RenewalsProvider>
                            <TasksProvider>
                              <CalendarProvider>
                                <DocumentsProvider>
                                  <CommunicationsProvider>
                                    <WorkoutsProvider>
                                      <ExercisesProvider>
                                        <MessagesProvider>
                                          <MetricsProvider>
                                            <NotificationsProvider>
                                              <ProgressionsProvider>
                                                <NutritionProvider>
                                                  <InboxProvider>
                                                    <ContentsProvider>
                                                      <AppContent />
                                                      <PwaUpdateBanner />
                                                    </ContentsProvider>
                                                  </InboxProvider>
                                                </NutritionProvider>
                                              </ProgressionsProvider>
                                            </NotificationsProvider>
                                          </MetricsProvider>
                                        </MessagesProvider>
                                      </ExercisesProvider>
                                    </WorkoutsProvider>
                                  </CommunicationsProvider>
                                </DocumentsProvider>
                              </CalendarProvider>
                            </TasksProvider>
                          </RenewalsProvider>
                        </PaymentsProvider>
                      </SubscriptionsProvider>
                    </AthletesProvider>
                  </PackagesProvider>
                </SettingsProvider>
              </ToastProvider>
            </AuthProvider>
          </AppProvider>
        </PwaUpdateProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
