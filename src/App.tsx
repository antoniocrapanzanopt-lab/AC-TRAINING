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
import { FirstRunSetupPage } from './pages/setup/FirstRunSetupPage';
import { AuthPage } from './pages/auth/AuthPage';
import { MainLayout } from './MainLayout';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isLoading, isSetupComplete, setOwnerProfile } = useApp();
  const { isAuthenticated } = useAuth();

  // 1. Schermata di caricamento iniziale senza lampi
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-[var(--color-primary)]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Caricamento configurazione locale...
          </span>
        </div>
      </div>
    );
  }

  // 2. Se il profilo proprietario non è stato ancora configurato
  if (!isSetupComplete) {
    return <FirstRunSetupPage onComplete={(profile) => setOwnerProfile(profile)} />;
  }

  // 3. Se l'utente non ha avviato la sessione demo
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // 4. Se la sessione è attiva, mostra il layout principale
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
                                <AppContent />
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
