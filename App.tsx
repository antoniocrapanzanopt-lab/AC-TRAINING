import React, { useEffect } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
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
import { ClientsProvider } from './context/ClientsContext';
import { ExercisesProvider } from './context/ExercisesContext';
import { WorkoutPlansProvider } from './context/WorkoutPlansContext';
import { WorkoutLogsProvider } from './context/WorkoutLogsContext';
import { AthleteChatProvider } from './context/AthleteChatContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { FirstRunSetupPage } from './pages/setup/FirstRunSetupPage';
import { AuthGuard } from './components/auth/AuthGuard';
import { MainLayout } from './MainLayout';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isLoading, isSetupComplete, setOwnerProfile, setActiveTab } = useApp();

  // Controllo iniziale URL params (es. ?token=athlete-id o ?athleteId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('athleteId');
    if (token) {
      setActiveTab('atleta_portale');
    }
  }, [setActiveTab]);

  // 1. Schermata di caricamento iniziale senza lampi
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-[var(--color-primary)]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Caricamento sistema...
          </span>
        </div>
      </div>
    );
  }

  // 2. Se il profilo proprietario non è stato ancora configurato
  if (!isSetupComplete) {
    return <FirstRunSetupPage onComplete={(profile) => setOwnerProfile(profile)} />;
  }

  // 3. Protezione rotte tramite AuthGuard
  return (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  );
};


export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <ToastProvider>
            <NotificationsProvider>
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
                                  <ClientsProvider>
                                    <ExercisesProvider>
                                      <WorkoutPlansProvider>
                                        <WorkoutLogsProvider>
                                          <AthleteChatProvider>
                                            <AppContent />
                                          </AthleteChatProvider>
                                        </WorkoutLogsProvider>
                                      </WorkoutPlansProvider>
                                    </ExercisesProvider>
                                  </ClientsProvider>
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
            </NotificationsProvider>
          </ToastProvider>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
};
