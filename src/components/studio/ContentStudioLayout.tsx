import React, { useState, useMemo } from 'react';
import { StudioTab } from '../../types/studio';
import { ContentStudioHeader } from './ContentStudioHeader';
import { ContentStudioSidebar } from './ContentStudioSidebar';
import { StudioDashboardPage } from '../../pages/studio/StudioDashboardPage';
import { StudioInboxPage } from '../../pages/studio/StudioInboxPage';
import { StudioPipelinePage } from '../../pages/studio/StudioPipelinePage';
import { StudioCalendarPage } from '../../pages/studio/StudioCalendarPage';
import { StudioLibraryPage } from '../../pages/studio/StudioLibraryPage';
import { StudioReelPage } from '../../pages/studio/StudioReelPage';
import { StudioCarouselPage } from '../../pages/studio/StudioCarouselPage';
import { StudioStoryPage } from '../../pages/studio/StudioStoryPage';
import { StudioCoverPage } from '../../pages/studio/StudioCoverPage';
import { StudioBrandKitPage } from '../../pages/studio/StudioBrandKitPage';
import { StudioAnalyticsPage } from '../../pages/studio/StudioAnalyticsPage';
import { ContentDrawerEditor } from '../contents/ContentDrawerEditor';
import { useContents } from '../../context/ContentsContext';
import { useInbox } from '../../context/InboxContext';
import { InstagramContent, ContentType, ContentStatus } from '../../types/inboxAndContent';
import { ToastContainer } from '../common/ToastContainer';

interface ContentStudioLayoutProps {
  onSwitchToCoaching: () => void;
  initialTab?: StudioTab;
}

export const ContentStudioLayout: React.FC<ContentStudioLayoutProps> = ({
  onSwitchToCoaching,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Stato per editor drawer comune
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<InstagramContent | null>(null);
  const [defaultNewType, setDefaultNewType] = useState<ContentType>('reel');
  const [defaultNewStatus, setDefaultNewStatus] = useState<ContentStatus>('idea');
  const [scheduledDateForNew, setScheduledDateForNew] = useState<string | undefined>(undefined);
  const [selectedStudioContent, setSelectedStudioContent] = useState<InstagramContent | null>(null);

  const { contents } = useContents();
  const { entries } = useInbox();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Badge counts
  const inboxCount = useMemo(() => {
    return entries.filter((e) => e.status === 'raw' || e.status === 'processed').length;
  }, [entries]);

  const pipelineActiveCount = useMemo(() => {
    return contents.filter((c) => c.status !== 'published').length;
  }, [contents]);

  const todayToRecordCount = useMemo(() => {
    return contents.filter(
      (c) => c.status === 'ready_to_record' || (c.status === 'script_draft' && c.scheduled_for?.slice(0, 10) === todayStr)
    ).length;
  }, [contents, todayStr]);

  // Apertura drawer con contenuto esistente
  const handleOpenContentEditor = (content: InstagramContent) => {
    setContentToEdit(content);
    setIsDrawerOpen(true);
  };

  // Creazione nuovo contenuto con drawer
  const handleQuickNewContent = (defaultType: ContentType = 'reel', defaultStatus: ContentStatus = 'idea', scheduledDate?: string) => {
    setContentToEdit(null);
    setDefaultNewType(defaultType);
    setDefaultNewStatus(defaultStatus);
    setScheduledDateForNew(scheduledDate);
    setIsDrawerOpen(true);
  };

  // Navigazione a Studio specifico
  const handleNavigateToStudio = (tab: StudioTab, content?: InstagramContent) => {
    if (content) {
      setSelectedStudioContent(content);
    }
    setActiveTab(tab);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <StudioDashboardPage
            onNavigate={(t) => setActiveTab(t)}
            onOpenContent={handleOpenContentEditor}
            onQuickNewIdea={() => setActiveTab('inbox')}
            onQuickNewReel={() => setActiveTab('reel_studio')}
            onQuickNewCarousel={() => setActiveTab('carousel_studio')}
            onQuickNewStory={() => setActiveTab('story_studio')}
          />
        );

      case 'inbox':
        return (
          <StudioInboxPage
            onNavigateToStudio={handleNavigateToStudio}
            onOpenContentEditor={handleOpenContentEditor}
          />
        );

      case 'pipeline':
        return (
          <StudioPipelinePage
            onOpenContentEditor={handleOpenContentEditor}
            onNavigateToStudio={handleNavigateToStudio}
            onQuickNewContent={handleQuickNewContent}
          />
        );

      case 'calendar':
        return (
          <StudioCalendarPage
            onOpenContentEditor={handleOpenContentEditor}
            onQuickNewContent={handleQuickNewContent}
          />
        );

      case 'library':
        return (
          <StudioLibraryPage
            onOpenContentEditor={handleOpenContentEditor}
            onNavigateToStudio={handleNavigateToStudio}
          />
        );

      case 'reel_studio':
        return (
          <StudioReelPage
            initialContent={selectedStudioContent}
            onNavigateToStudio={handleNavigateToStudio}
          />
        );

      case 'carousel_studio':
        return (
          <StudioCarouselPage
            initialContent={selectedStudioContent}
          />
        );

      case 'story_studio':
        return (
          <StudioStoryPage
            initialContent={selectedStudioContent}
          />
        );

      case 'cover_studio':
        return (
          <StudioCoverPage
            initialContent={selectedStudioContent}
          />
        );

      case 'brand_kit':
        return <StudioBrandKitPage />;

      case 'analytics':
        return <StudioAnalyticsPage />;

      default:
        return (
          <StudioDashboardPage
            onNavigate={(t) => setActiveTab(t)}
            onOpenContent={handleOpenContentEditor}
            onQuickNewIdea={() => setActiveTab('inbox')}
            onQuickNewReel={() => setActiveTab('reel_studio')}
            onQuickNewCarousel={() => setActiveTab('carousel_studio')}
            onQuickNewStory={() => setActiveTab('story_studio')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      
      {/* HEADER DEDICATO AC CONTENT STUDIO */}
      <ContentStudioHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickNewIdea={() => setActiveTab('inbox')}
        onQuickNewReel={() => setActiveTab('reel_studio')}
        onQuickNewCarousel={() => setActiveTab('carousel_studio')}
        onQuickNewStory={() => setActiveTab('story_studio')}
        onSwitchToCoaching={onSwitchToCoaching}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 relative">
        {/* SIDEBAR DEDICATA AC CONTENT STUDIO */}
        <ContentStudioSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          inboxCount={inboxCount}
          pipelineActiveCount={pipelineActiveCount}
          todayToRecordCount={todayToRecordCount}
        />

        {/* CONTENUTO DELLA PAGINA ATTIVA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto w-full min-w-0 overflow-x-hidden">
          {renderActivePage()}
        </main>
      </div>

      {/* DRAWER EDITOR PER MODIFICA DETTAGLIATA O CREAZIONE */}
      {isDrawerOpen && (
        <ContentDrawerEditor
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setContentToEdit(null);
          }}
          contentToEdit={contentToEdit}
          initialData={contentToEdit ? undefined : { type: defaultNewType, status: defaultNewStatus, scheduled_for: scheduledDateForNew }}
          mode={contentToEdit ? 'edit' : 'create'}
        />
      )}

      <ToastContainer />
    </div>
  );
};
