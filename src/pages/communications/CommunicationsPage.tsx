import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  Copy,
  ExternalLink,
  User,
  AlertTriangle,
  Trash2,
  Edit2,
  FileText,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Webhook,
  Server,
  Save,
} from 'lucide-react';
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationOutcome,
  CommunicationLogFormData,
  ApiIntegrationConfig,
} from '../../types';
import { useCommunications } from '../../context/CommunicationsContext';
import { useToast } from '../../context/ToastContext';
import { CommunicationModal } from '../../components/communications/CommunicationModal';
import { getDaysRemaining } from '../../lib/statusEngine';

const channelBadges: Record<CommunicationChannel, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: MessageSquare },
  telegram: { label: 'Telegram', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20', icon: Send },
  email: { label: 'Email', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Mail },
  phone: { label: 'Telefonata', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Phone },
  sms: { label: 'SMS', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: MessageSquare },
  meeting: { label: 'Incontro', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: User },
  app: { label: 'Notifica App', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: Sparkles },
};

const outcomeBadges: Record<CommunicationOutcome, { label: string; color: string }> = {
  delivered: { label: 'Inviato', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  replied: { label: 'Ha Risposto', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  no_answer: { label: 'Nessuna Risposta', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  failed: { label: 'Non Riuscito', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  scheduled: { label: 'Pianificato', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

export const CommunicationsPage: React.FC = () => {
  const {
    communications,
    templates,
    apiConfig,
    logCommunication,
    updateCommunication,
    deleteCommunication,
    saveTemplate,
    deleteTemplate,
    saveApiConfig,
    openWhatsApp,
  } = useCommunications();
  const { showSuccess, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'integrations'>('logs');

  // Filtri Registro
  const [query, setQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<CommunicationChannel | 'all'>('all');
  const [filterOutcome, setFilterOutcome] = useState<CommunicationOutcome | 'all'>('all');

  // Modale Registrazione
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CommunicationLog | null>(null);

  // Modale Eliminazione
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'log' | 'template'; id: string | null }>({
    open: false,
    type: 'log',
    id: null,
  });

  // Stato Form per Nuovo Modello
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplCategory, setNewTplCategory] = useState('Generale');
  const [newTplSubject, setNewTplSubject] = useState('');
  const [newTplBody, setNewTplBody] = useState('');

  // Stato Form Integrazioni Demo
  const [demoConfigState, setDemoConfigState] = useState<ApiIntegrationConfig>(apiConfig);

  useEffect(() => {
    setDemoConfigState(apiConfig);
  }, [apiConfig]);

  const filteredLogs = useMemo(() => {
    const q = query.toLowerCase().trim();
    return communications.filter(log => {
      if (q && !log.athleteName.toLowerCase().includes(q) && !log.subject.toLowerCase().includes(q) && !log.summary.toLowerCase().includes(q)) return false;
      if (filterChannel !== 'all' && log.channel !== filterChannel) return false;
      if (filterOutcome !== 'all' && log.outcome !== filterOutcome) return false;
      return true;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [communications, query, filterChannel, filterOutcome]);

  const metrics = useMemo(() => {
    const total = communications.length;
    const replied = communications.filter(c => c.outcome === 'replied').length;
    const recontactSoon = communications.filter(c => c.recontactDate && getDaysRemaining(c.recontactDate) >= 0 && getDaysRemaining(c.recontactDate) <= 7).length;

    return { total, replied, recontactSoon, totalTemplates: templates.length };
  }, [communications, templates]);

  const handleSaveLog = (data: CommunicationLogFormData) => {
    if (editingLog) {
      updateCommunication(editingLog.id, data);
      showSuccess('Modificato', 'Registrazione del contatto aggiornata.');
    } else {
      logCommunication(data);
      showSuccess('Registrato', 'Nuova comunicazione registrata con successo.');
    }
  };

  const handleDeleteItem = () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'log') {
      deleteCommunication(deleteModal.id);
      showInfo('Eliminato', 'Contatto rimosso dal registro.');
    } else {
      deleteTemplate(deleteModal.id);
      showInfo('Eliminato', 'Modello messaggio eliminato.');
    }
    setDeleteModal({ open: false, type: 'log', id: null });
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplTitle.trim() || !newTplBody.trim()) return;

    saveTemplate({
      title: newTplTitle,
      category: newTplCategory,
      subject: newTplSubject || newTplTitle,
      body: newTplBody,
    });

    showSuccess('Modello Salvato', 'Il modello messaggio è stato aggiunto alle tue risorse.');
    setNewTplTitle('');
    setNewTplCategory('Generale');
    setNewTplSubject('');
    setNewTplBody('');
  };

  const handleSaveDemoConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveApiConfig(demoConfigState);
    showSuccess('Configurazione Demo Salvata', 'Configurazione dimostrativa salvata nel browser. Nessuna chiamata API reale eseguita.');
  };

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showSuccess('Copiato', 'Testo copiato negli appunti.');
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] font-mono";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Centro Comunicazioni</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci storico contatti, modelli di messaggio ed integrazioni API dimostrative.
          </p>
        </div>
        <button
          onClick={() => { setEditingLog(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-4 h-4" /> Nuova Comunicazione
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl w-fit">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Registro Contatti ({metrics.total})
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Modelli Messaggio ({metrics.totalTemplates})
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'integrations'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" /> Integrazioni Demo (API)
        </button>
      </div>

      {/* TAB 1: REGISTRO COMUNICAZIONI */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Contatti Totali</span>
              <span className="text-2xl font-black text-white">{metrics.total}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Hanno Risposto</span>
              <span className="text-2xl font-black text-emerald-400">{metrics.replied}</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 shadow-xl flex flex-col col-span-2 md:col-span-2">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Da Ricontattare Entro 7 Giorni</span>
              <span className="text-2xl font-black text-amber-400">{metrics.recontactSoon} Atleti</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca per atleta, oggetto o testo..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={filterChannel}
                onChange={e => setFilterChannel(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">Canali (Tutti)</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="phone">Telefonata</option>
                <option value="sms">SMS</option>
                <option value="meeting">Incontro</option>
                <option value="app">Notifica App</option>
              </select>

              <select
                value={filterOutcome}
                onChange={e => setFilterOutcome(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">Esiti (Tutti)</option>
                <option value="delivered">Inviato</option>
                <option value="replied">Ha Risposto</option>
                <option value="no_answer">Nessuna Risposta</option>
                <option value="scheduled">Pianificato</option>
                <option value="failed">Non Riuscito</option>
              </select>
            </div>
          </div>

          {/* Grid Logs */}
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nessun contatto trovato</h3>
              <p className="text-slate-400 max-w-md mx-auto text-xs">
                Non vi sono comunicazioni registrate corrispondenti ai criteri di ricerca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredLogs.map(log => {
                const ch = channelBadges[log.channel] || channelBadges.whatsapp;
                const out = outcomeBadges[log.outcome] || outcomeBadges.delivered;
                const IconComponent = ch.icon;

                return (
                  <div
                    key={log.id}
                    className="flex flex-col justify-between bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl p-5 space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${ch.color}`}>
                          <IconComponent className="w-3.5 h-3.5" /> {ch.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${out.color}`}>
                          {out.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" /> {log.athleteName}
                        </h3>
                        <p className="text-xs text-slate-300 font-semibold mt-0.5">{log.subject}</p>
                      </div>

                      {log.messageText && (
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Messaggio:</span>
                          <p className="italic line-clamp-3">{log.messageText}</p>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400 space-y-1">
                        <div>Sintesi: <strong className="text-slate-200">{log.summary}</strong></div>
                        {log.nextAction && <div>Prossima azione: <strong className="text-amber-400">{log.nextAction}</strong></div>}
                        {log.recontactDate && <div>Data ricontatto: <strong className="text-white">{log.recontactDate}</strong></div>}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {log.messageText && (
                          <button
                            onClick={() => handleCopy(log.messageText)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Copia Testo"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {log.channel === 'whatsapp' && log.messageText && (
                          <button
                            onClick={() => openWhatsApp('', log.messageText || '')}
                            className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                            title="Apri WhatsApp"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingLog(log); setIsModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, type: 'log', id: log.id })}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODELLI MESSAGGIO */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" /> Crea Nuovo Modello Messaggio
            </h3>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Titolo Modello *</label>
                  <input
                    type="text"
                    placeholder="Es. Promemoria Check-in..."
                    value={newTplTitle}
                    onChange={e => setNewTplTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria *</label>
                  <input
                    type="text"
                    placeholder="Es. Pagamenti, Rinnovi..."
                    value={newTplCategory}
                    onChange={e => setNewTplCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Oggetto Predefinito</label>
                  <input
                    type="text"
                    placeholder="Es. Avviso importante Gym..."
                    value={newTplSubject}
                    onChange={e => setNewTplSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-400">Testo Modello (supporta segnaposto) *</label>
                  <span className="text-[10px] text-slate-500">
                    Variabili: <code className="text-[var(--color-primary)]">{"{{nome_atleta}}"}</code>, <code className="text-[var(--color-primary)]">{"{{data_scadenza}}"}</code>, <code className="text-[var(--color-primary)]">{"{{importo}}"}</code>, <code className="text-[var(--color-primary)]">{"{{nome_attivita}}"}</code>
                  </span>
                </div>
                <textarea
                  value={newTplBody}
                  onChange={e => setNewTplBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  rows={3}
                  placeholder="Ciao {{nome_atleta}}, ti ricordiamo che il tuo abbonamento scade il {{data_scadenza}}..."
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow">
                  Salva Modello
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                      {tpl.category}
                    </span>
                    <button
                      onClick={() => setDeleteModal({ open: true, type: 'template', id: tpl.id })}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Elimina Modello"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-white">{tpl.title}</h4>
                  <p className="text-xs text-slate-400 font-medium">Oggetto: {tpl.subject}</p>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                    {tpl.body}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleCopy(tpl.body)}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copia Struttura
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTEGRAZIONI DEMO (API) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* BANNER DI AVVISO SICUREZZA OBBLIGATORIO */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/50 flex items-start gap-3 shadow-xl">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Avviso di Sicurezza</h4>
              <p className="text-xs text-amber-200/90 font-medium mt-0.5">
                Non inserire token, password o chiavi reali: nella demo i campi vengono salvati nel browser.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveDemoConfig} className="space-y-6">
            {/* 1. WhatsApp Business API Demo */}
            <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">WhatsApp Business API (Dimostrativa)</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoConfigState.whatsappEnabled}
                    onChange={e => setDemoConfigState({ ...demoConfigState, whatsappEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div>
                <label className={labelCls}>WhatsApp Bearer Token (Fittizio)</label>
                <input
                  type="text"
                  value={demoConfigState.whatsappToken}
                  onChange={e => setDemoConfigState({ ...demoConfigState, whatsappToken: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* 2. Telegram Bot API Demo */}
            <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-sky-400" />
                  <h3 className="text-base font-bold text-white">Telegram Bot API (Dimostrativa)</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoConfigState.telegramEnabled}
                    onChange={e => setDemoConfigState({ ...demoConfigState, telegramEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              <div>
                <label className={labelCls}>Bot Token Telegram (Fittizio)</label>
                <input
                  type="text"
                  value={demoConfigState.telegramToken}
                  onChange={e => setDemoConfigState({ ...demoConfigState, telegramToken: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* 3. Servizio SMTP Email Demo */}
            <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Server SMTP Email (Dimostrativo)</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoConfigState.smtpEnabled}
                    onChange={e => setDemoConfigState({ ...demoConfigState, smtpEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Host SMTP (Fittizio)</label>
                  <input
                    type="text"
                    value={demoConfigState.smtpHost}
                    onChange={e => setDemoConfigState({ ...demoConfigState, smtpHost: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email Mittente (Fittizio)</label>
                  <input
                    type="email"
                    value={demoConfigState.smtpSender}
                    onChange={e => setDemoConfigState({ ...demoConfigState, smtpSender: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* 4. Webhook API Dimostrativi */}
            <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Webhook Esterni (Dimostrativi)</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoConfigState.webhookEnabled}
                    onChange={e => setDemoConfigState({ ...demoConfigState, webhookEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Endpoint URL (Fittizio)</label>
                  <input
                    type="text"
                    value={demoConfigState.webhookUrl}
                    onChange={e => setDemoConfigState({ ...demoConfigState, webhookUrl: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Webhook Secret (Fittizio)</label>
                  <input
                    type="text"
                    value={demoConfigState.webhookSecret}
                    onChange={e => setDemoConfigState({ ...demoConfigState, webhookSecret: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Botton di Salvataggio Esplicito */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-xl"
              >
                <Save className="w-4 h-4" /> Salva soltanto la configurazione dimostrativa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale Registrazione Contatto */}
      <CommunicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLog}
        editingLog={editingLog}
      />

      {/* Modale Conferma Eliminazione */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, type: 'log', id: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Eliminare {deleteModal.type === 'log' ? 'Contatto' : 'Modello Messaggio'}?
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler eliminare questo elemento?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, type: 'log', id: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteItem}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
