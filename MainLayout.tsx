import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
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
import { ChatPage } from './pages/chat/ChatPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { CollaboratorsPage } from './pages/collaborators/CollaboratorsPage';
import { AtletaPortalePage } from './pages/athlete-portal/AtletaPortalePage';
import { ExercisesPage } from './pages/exercises/ExercisesPage';
import { CreatePlanPage } from './pages/workout-plans/CreatePlanPage';
import { SavedPlansPage } from './pages/workout-plans/SavedPlansPage';
import { NutritionPage } from './pages/nutrition/NutritionPage';
import { QuestionnairesPage } from './pages/questionnaires/QuestionnairesPage';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { NavigationTab } from './types';

const tabTitles: Record<NavigationTab, string> = {
  dashboard: 'Dashboard Generale',
  atleti: 'Gestione Atleti',
  clienti: 'Gestione Atleti',
  esercizi: 'Database Esercizi',
  crea_scheda: 'Crea Nuova Scheda',
  schede_salvate: 'Schede Salvate',
  alimentazione_calcolo: 'Calcolo Fabbisogno & Macro',
  alimentazione_piani: 'Crea & Gestisci Piani Alimentari',
  alimentazione_modelli: 'Libreria Modelli Nutrizionali',
  questionari_anamnesi: 'Anamnesi Iniziale',
  questionari_check: 'Check Intermedio & Aderenza',
  questionari_libreria: 'Libreria Modelli Questionari',
  questionari_builder: 'Costruttore Form',
  pacchetti: 'Pacchetti e Servizi',
  abbonamenti: 'Gestione Abbonamenti',
  pagamenti: 'Storico Pagamenti',
  scadenze: 'Scadenze e Scadenzario',
  rinnovi: 'Rinnovi Abbonamenti',
  attivita: 'Registro Attività',
  calendario: 'Calendario Appuntamenti',
  documenti: 'Gestione Documenti',
  comunicazioni: 'Comunicazioni & Report Ufficiali',
  chat: 'Chat & Direct Messages',
  report: 'Report e Statistiche',
  collaboratori: 'Gestione Collaboratori',
  impostazioni: 'Impostazioni Sistema',
  atleta_portale: 'Anteprima Portale Cliente',
};

const renderPage = (tab: NavigationTab): React.ReactNode => {
  switch (tab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'atleti':
    case 'clienti':
      return <AthletesPage />;

    case 'esercizi':
      return <ExercisesPage />;
    case 'crea_scheda':
      return <CreatePlanPage />;
    case 'schede_salvate':
      return <SavedPlansPage />;

    case 'alimentazione_calcolo':
      return <NutritionPage initialSubTab="calcolo" />;
    case 'alimentazione_piani':
      return <NutritionPage initialSubTab="piani" />;
    case 'alimentazione_modelli':
      return <NutritionPage initialSubTab="modelli" />;

    case 'questionari_anamnesi':
      return <QuestionnairesPage initialSubTab="anamnesi" />;
    case 'questionari_check':
      return <QuestionnairesPage initialSubTab="check" />;
    case 'questionari_libreria':
      return <QuestionnairesPage initialSubTab="libreria" />;
    case 'questionari_builder':
      return <QuestionnairesPage initialSubTab="anamnesi" />;
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
    case 'chat':
      return <ChatPage />;
    case 'report':
      return <ReportsPage />;
    case 'collaboratori':
      return <CollaboratorsPage />;
    case 'impostazioni':
      return <SettingsPage />;
    case 'atleta_portale':
      return <AtletaPortalePage />;
    default:
      return <PageContainer tab={tab} title={tabTitles[tab]} />;
  }
};

export const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (user?.role === 'athlete' && activeTab !== 'atleta_portale') {
      setActiveTab('atleta_portale');
    }
  }, [user?.role, activeTab, setActiveTab]);

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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderPage(activeTab)}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
