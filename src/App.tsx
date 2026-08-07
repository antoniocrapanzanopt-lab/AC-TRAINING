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

import { AuthPage } from './pages/auth/AuthPage';
import { InvitePage } from './pages/auth/InvitePage';
import { MainLayout } from './MainLayout';
import { AthleteLayout } from './pages/athlete/AthleteLayout';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isLoading } = useApp();
  const { isAuthenticated, user } = useAuth();

  // 1. Schermata di caricamento iniziale senza lampi
  if (isLoading) {
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

  // 3. Se l'utente non ha effettuato il login
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // 4. Se la sessione è attiva, mostra il layout principale
  if (user?.role === 'athlete') {
    return <AthleteLayout />;
  }

  return <MainLayout />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
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
                                      <AppContent />
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
    </ErrorBoundary>
  );
};
