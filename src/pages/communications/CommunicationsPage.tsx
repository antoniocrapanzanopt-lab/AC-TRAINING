import React, { useState, useMemo } from 'react';
import {
  Plus,
  Send,
  Clock,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import {
  BroadcastCommunication,
  BroadcastFormData,
  QuickMessageTemplate,
} from '../../types';
import { useCommunications } from '../../context/CommunicationsContext';
import { useToast } from '../../context/ToastContext';
import { BroadcastWizardModal } from './components/BroadcastWizardModal';
import { BroadcastDetailsModal } from './components/BroadcastDetailsModal';
import { BroadcastsListView } from './components/BroadcastsListView';
import { DraftsListView } from './components/DraftsListView';
import { TemplatesListView } from './components/TemplatesListView';
import { ChannelSettingsView } from './components/ChannelSettingsView';

export const CommunicationsPage: React.FC = () => {
  const {
    drafts,
    sentBroadcasts,
    quickTemplates,
    deleteBroadcast,
    sendDraft,
    saveQuickTemplate,
    deleteQuickTemplate,
  } = useCommunications();

  const { showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'sent' | 'drafts' | 'templates' | 'channels'>('sent');
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<Partial<BroadcastFormData> | null>(null);
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);

  // Details Modal state
  const [selectedBroadcastForDetails, setSelectedBroadcastForDetails] = useState<BroadcastCommunication | null>(null);

  // Metriche aggregate
  const metricsData = useMemo(() => {
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalClicked = 0;
    let totalConfirmed = 0;
    let totalReplied = 0;

    sentBroadcasts.forEach(b => {
      totalSent += b.metrics.sent || b.totalRecipientsCount || 0;
      totalDelivered += b.metrics.delivered || b.totalRecipientsCount || 0;
      totalRead += b.metrics.read || 0;
      totalClicked += b.metrics.clicked || 0;
      totalConfirmed += b.metrics.confirmed || 0;
      totalReplied += b.metrics.replied || 0;
    });

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;
    const openRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    const clickRate = totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0;

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      totalConfirmed,
      totalReplied,
      deliveryRate,
      openRate,
      clickRate,
    };
  }, [sentBroadcasts]);

  // Handlers
  const handleOpenNewWizard = () => {
    setWizardInitialData(null);
    setEditingBroadcastId(null);
    setIsWizardOpen(true);
  };

  const handleEditDraft = (draft: BroadcastCommunication) => {
    setWizardInitialData({
      title: draft.title,
      type: draft.type,
      audienceFilter: draft.audienceFilter,
      channels: draft.channels,
      message: draft.message,
      attachments: draft.attachments,
      cta: draft.cta,
      scheduledFor: draft.scheduledFor,
    });
    setEditingBroadcastId(draft.id);
    setIsWizardOpen(true);
  };

  const handleEditBroadcast = (broadcast: BroadcastCommunication) => {
    setWizardInitialData({
      title: broadcast.title,
      type: broadcast.type,
      audienceFilter: broadcast.audienceFilter,
      channels: broadcast.channels,
      message: broadcast.message,
      attachments: broadcast.attachments,
      cta: broadcast.cta,
      scheduledFor: broadcast.scheduledFor,
    });
    setEditingBroadcastId(broadcast.id);
    setIsWizardOpen(true);
    setSelectedBroadcastForDetails(null);
  };

  const handleUseTemplate = (template: QuickMessageTemplate) => {
    setWizardInitialData({
      title: template.subject || template.title,
      type: template.type,
      audienceFilter: { type: 'all_active' },
      channels: template.suggestedChannels || ['in_app', 'email'],
      message: template.body,
      cta: template.suggestedCta,
    });
    setEditingBroadcastId(null);
    setIsWizardOpen(true);
  };

  const handleDeleteBroadcast = async (id: string) => {
    await deleteBroadcast(id);
    showInfo('Eliminato', 'Trasmissione rimossa dallo storico e dal cloud.');
  };

  return (
    <div className="space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & POSIZIONAMENTO
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Comunicazioni
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Invia aggiornamenti, contenuti e avvisi agli atleti.
          </p>
        </div>

        <button
          onClick={handleOpenNewWizard}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Crea comunicazione
        </button>
      </div>



      {/* ─────────────────────────────────────────────────────────────
          2. BARRA METRICHE APRI / CHIUDI
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-[var(--color-panel)] to-slate-950 border border-[var(--color-panel-border)] shadow-xl overflow-hidden transition-all">
        <button
          onClick={() => setIsMetricsOpen(!isMetricsOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-900/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                Metriche Globali & Performance Invii
                <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--color-primary)]/30 lowercase">
                  {sentBroadcasts.length} invi{sentBroadcasts.length === 1 ? 'o' : 'i'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isMetricsOpen ? 'Clicca per comprimere il riepilogo' : 'Clicca per visualizzare tassi di lettura, click e conferme'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white">
            <span>{isMetricsOpen ? 'Chiudi' : 'Apri'}</span>
            {isMetricsOpen ? <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {isMetricsOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 mt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Comunicazioni</span>
                <span className="text-xl font-black text-white">{sentBroadcasts.length}</span>
                <span className="text-[10px] text-slate-500 block">Invii effettuati</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Destinatari</span>
                <span className="text-xl font-black text-emerald-400">
                  {sentBroadcasts.length > 0 ? (sentBroadcasts[0].totalRecipientsCount || 30) : 0}
                </span>
                <span className="text-[10px] text-emerald-500/80 block">Atleti raggiunti</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Letti</span>
                <span className="text-xl font-black text-sky-400">{metricsData.totalRead}</span>
                <span className="text-[10px] text-sky-500/80 block">{metricsData.openRate}% apertura</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Click Link / CTA</span>
                <span className="text-xl font-black text-purple-400">{metricsData.totalClicked}</span>
                <span className="text-[10px] text-purple-500/80 block">{metricsData.clickRate}% interazione</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Confermati</span>
                <span className="text-xl font-black text-amber-400">{metricsData.totalConfirmed}</span>
                <span className="text-[10px] text-amber-500/80 block">Presa visione</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Risposte</span>
                <span className="text-xl font-black text-pink-400">{metricsData.totalReplied}</span>
                <span className="text-[10px] text-slate-500 block">Feedback atleti</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. NAVIGAZIONE TAB (Invii, Bozze, Modelli, Impostazioni canali)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl w-fit">
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'sent'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4" /> Invii ({sentBroadcasts.length})
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'drafts'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> Bozze ({drafts.length})
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Modelli ({quickTemplates.length})
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'channels'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" /> Impostazioni canali
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CONTENUTO TAB ATTIVA
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sent' && (
        <BroadcastsListView
          broadcasts={sentBroadcasts}
          onOpenDetails={(b) => setSelectedBroadcastForDetails(b)}
          onEditBroadcast={handleEditBroadcast}
          onDeleteBroadcast={handleDeleteBroadcast}
          onCreateNew={handleOpenNewWizard}
        />
      )}

      {activeTab === 'drafts' && (
        <DraftsListView
          drafts={drafts}
          onEditDraft={handleEditDraft}
          onSendDraftDirect={(id) => sendDraft(id)}
          onDeleteDraft={handleDeleteBroadcast}
          onCreateNew={handleOpenNewWizard}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesListView
          templates={quickTemplates}
          onUseTemplate={handleUseTemplate}
          onSaveTemplate={(tpl) => saveQuickTemplate(tpl)}
          onDeleteTemplate={(id) => deleteQuickTemplate(id)}
        />
      )}

      {activeTab === 'channels' && (
        <ChannelSettingsView />
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. MODALI
         ───────────────────────────────────────────────────────────── */}
      
      {/* Wizard Creazione Broadcast */}
      <BroadcastWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialData={wizardInitialData}
        editingBroadcastId={editingBroadcastId}
      />

      {/* Modale Dettagli & Tracking Singolo Atleta */}
      <BroadcastDetailsModal
        isOpen={Boolean(selectedBroadcastForDetails)}
        onClose={() => setSelectedBroadcastForDetails(null)}
        broadcast={selectedBroadcastForDetails}
        onEdit={handleEditBroadcast}
        onDelete={handleDeleteBroadcast}
      />

    </div>
  );
};
