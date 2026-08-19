import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { GlobalCoachAIAssistantWidget } from './components/common/GlobalCoachAIAssistantWidget';
import { FloatingChatWidget } from './components/chat/FloatingChatWidget';
import { PageContainer } from './pages/PageContainer';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AthletesPage } from './pages/athletes/AthletesPage';
import { PackagesPage } from './pages/packages/PackagesPage';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { DeadlinesPage } from './pages/deadlines/DeadlinesPage';
import { RenewalsPage } from './pages/renewals/RenewalsPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { CommunicationsPage } from './pages/communications/CommunicationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { CollaboratorsPage } from './pages/collaborators/CollaboratorsPage';
import { AtletaPortalePage } from './pages/athlete-portal/AtletaPortalePage';
import { WorkoutsPage } from './pages/workouts/WorkoutsPage';
import { ExercisesPage } from './pages/exercises/ExercisesPage';
import { ProgressionsPage } from './pages/progressions/ProgressionsPage';
import { WorkoutHistoryPage } from './pages/workouts/WorkoutHistoryPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { NutritionEstimatorPage } from './pages/nutrition/NutritionEstimatorPage';
import { AnalysisReportsPage } from './pages/analytics/AnalysisReportsPage';
import { useApp } from './context/AppContext';
import { NavigationTab } from './types';

const tabTitles: Record<NavigationTab, string> = {
  dashboard: 'Dashboard Generale',
  atleti: 'Gestione Atleti',
  pacchetti: 'Pacchetti e Servizi',
  abbonamenti: 'Gestione Abbonamenti',
  pagamenti: 'Storico Pagamenti',
  scadenze: 'Scadenze e Scadenzario',
  rinnovi: 'Rinnovi Abbonamenti',
  attivita: 'Registro Attività',
  calendario: 'Calendario Appuntamenti',
  documenti: 'Gestione Documenti',
  comunicazioni: 'Centro Comunicazioni',
  report: 'Report e Statistiche',
  analisi_report: 'Analisi & Report',
  collaboratori: 'Gestione Collaboratori',
  impostazioni: 'Impostazioni Sistema',
  atleta_portale: 'Portale riservato Atleta',
  schede: 'Schede di Allenamento',
  copilot: 'AI Training Copilot',
  progressioni: 'Progressioni & Sovraccarico',
  cronologia_allenamenti: 'Cronologia Allenamenti',
  esercizi: 'Libreria Esercizi',
  fabbisogno: 'Stima Fabbisogno Energetico',
  messaggi: 'Chat / Messaggi',
};

const renderPage = (tab: NavigationTab): React.ReactNode => {
  switch (tab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'atleti':
      return <AthletesPage />;
    case 'pacchetti':
      return <PackagesPage />;
    case 'abbonamenti':
      return <SubscriptionsPage />;
    case 'pagamenti':
      return <PaymentsPage />;
    case 'scadenze':
      return <DeadlinesPage />;
    case 'rinnovi':
      return <RenewalsPage />;
    case 'attivita':
      return <TasksPage />;
    case 'calendario':
      return <CalendarPage />;
    case 'documenti':
      return <DocumentsPage />;
    case 'comunicazioni':
      return <CommunicationsPage />;
    case 'report':
    case 'analisi_report':
      return <AnalysisReportsPage />;
    case 'collaboratori':
      return <CollaboratorsPage />;
    case 'impostazioni':
      return <SettingsPage />;
    case 'schede':
      return <WorkoutsPage />;
    case 'copilot':
      return <DashboardPage />;
    case 'progressioni':
      return <ProgressionsPage />;
    case 'cronologia_allenamenti':
      return <WorkoutHistoryPage />;
    case 'esercizi':
      return <ExercisesPage />;
    case 'fabbisogno':
      return <NutritionEstimatorPage />;
    case 'atleta_portale':
      return <AtletaPortalePage />;
    case 'messaggi':
      return <MessagesPage />;
    default:
      return <PageContainer tab={tab} title={tabTitles[tab]} />;
  }
};

export const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex flex-1 relative">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {renderPage(activeTab)}
        </main>
      </div>
      <GlobalCoachAIAssistantWidget />
      <FloatingChatWidget />
      <ToastContainer />
    </div>
  );
};
