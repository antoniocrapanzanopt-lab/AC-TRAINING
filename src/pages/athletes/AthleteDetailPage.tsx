import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Target,
  Calendar,
  StickyNote,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  Trash2,
  Send,
  BookOpen,
  CreditCard,
  FileText,
  Activity,
  MessageSquare,
  Pencil,
  Eye,
  MessageCircle,
  CheckCircle2,
  Link as LinkIcon,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import { AthleteModal, ModalSection } from '../../components/athletes/AthleteModal';
import { AIProgressionAssistantModal } from '../../components/progressions/AIProgressionAssistantModal';
import { AthleteFormData } from '../../types';
import { AthleteNote, NoteCategory, NoteVisibility } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { useDocuments } from '../../context/DocumentsContext';
import { useCommunications } from '../../context/CommunicationsContext';
import { useMetrics } from '../../context/MetricsContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useApp } from '../../context/AppContext';
import { AthleteStatusBadge, PaymentStatusBadge, contactChannelLabel, acquisitionSourceLabel } from '../../components/athletes/AthleteBadges';
import { SubscriptionsTab } from '../../components/athletes/SubscriptionsTab';
import { PaymentsTab } from '../../components/athletes/PaymentsTab';
import { DocumentsTab } from '../../components/athletes/DocumentsTab';
import { ActivityTab } from '../../components/athletes/ActivityTab';
import { CommunicationsTab } from '../../components/athletes/CommunicationsTab';
import { TimelineTab } from '../../components/athletes/TimelineTab';
import { MetricsTab } from '../../components/athletes/MetricsTab';
import { Scale, TrendingUp, TrendingDown } from 'lucide-react';

// ─── Tipi Tab ─────────────────────────────────────────────────────────────────

type DetailTab =
  | 'panoramica'
  | 'metriche'
  | 'note'
  | 'abbonamenti'
  | 'pagamenti'
  | 'documenti'
  | 'attivita'
  | 'comunicazioni'
  | 'timeline';


// ─── Etichette ────────────────────────────────────────────────────────────────

const noteCategoryLabel: Record<NoteCategory, string> = {
  general: 'Generale',
  training: 'Allenamento',
  medical: 'Fisico / Benessere',
  payment: 'Pagamento',
  goal: 'Obiettivo',
  behaviour: 'Comportamento',
  other: 'Altro',
};

const noteVisibilityLabel: Record<NoteVisibility, string> = {
  private: 'Solo io',
  coach: 'Coach del team',
  all: 'Tutti',
};

const noteCategoryColor: Record<NoteCategory, string> = {
  general: 'text-slate-300 bg-slate-700/40 border-slate-600/40',
  training: 'text-sky-300 bg-sky-900/30 border-sky-600/30',
  medical: 'text-emerald-300 bg-emerald-900/20 border-emerald-600/30',
  payment: 'text-amber-300 bg-amber-900/20 border-amber-600/30',
  goal: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30',
  behaviour: 'text-purple-300 bg-purple-900/20 border-purple-600/30',
  other: 'text-slate-400 bg-slate-800/40 border-slate-700/30',
};

// ─── Utility Data Sicure ───────────────────────────────────────────────────────

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT');
};

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Componente Informazione Riga ─────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: string | React.ReactNode; missing?: string }> = ({
  label, value, missing = '—'
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-slate-800/60 last:border-0">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-36 shrink-0">{label}</span>
    <span className="text-sm text-slate-200">{value ?? <span className="text-slate-600 italic">{missing}</span>}</span>
  </div>
);

// ─── Sezione Collassabile ─────────────────────────────────────────────────────

const CollapsibleSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onEdit?: () => void;
}> = ({ title, icon, children, defaultOpen = true, onEdit }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800/80">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-left hover:text-white transition-colors flex-1">
          {icon && <span className="text-[var(--color-primary)]">{icon}</span>}
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">{title}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 ml-1" />}
        </button>

        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-[var(--color-primary)] px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Modifica questa sezione"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Modifica</span>
          </button>
        )}
      </div>
      {open && <div className="px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
};

// ─── Scheda Note ──────────────────────────────────────────────────────────────

const NotesTab: React.FC<{
  athleteId: string;
  notes: AthleteNote[];
}> = ({ athleteId, notes }) => {
  const { addNote, deleteNote, togglePinNote } = useAthletes();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [visibility, setVisibility] = useState<NoteVisibility>('coach');

  const sorted = useMemo(() =>
    [...notes].filter(Boolean).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
    [notes]);

  const handleAdd = async () => {
    if (!content.trim()) { showError('Nota vuota', 'Scrivi il contenuto prima di salvare.'); return; }
    if (!user?.id) { showError('Errore', 'Sessione non valida.'); return; }
    const ok = await addNote(
      athleteId,
      content,
      user.id,
      user.name ?? 'Coach',
      category,
      visibility
    );
    if (ok) { setContent(''); showSuccess('Nota aggiunta', 'La nota è stata salvata.'); }
  };

  const handleDelete = (noteId: string) => {
    deleteNote(athleteId, noteId);
    showSuccess('Nota eliminata', '');
  };

  const selectCls = 'px-2 py-1.5 rounded-lg bg-slate-900 border border-[var(--color-panel-border)] text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors';

  return (
    <div className="space-y-4">
      {/* Form Nuova Nota */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-5 space-y-3 shadow-xl">
        <p className="text-xs font-black text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote className="w-4 h-4" /> Nuova Nota Atleta
        </p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder="Scrivi una nota interna o di allenamento per l'atleta..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
        <div className="flex items-center gap-2 flex-wrap justify-between pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={category} onChange={e => setCategory(e.target.value as NoteCategory)} className={selectCls}>
              {(Object.keys(noteCategoryLabel) as NoteCategory[]).map(c => (
                <option key={c} value={c}>{noteCategoryLabel[c]}</option>
              ))}
            </select>
            <select value={visibility} onChange={e => setVisibility(e.target.value as NoteVisibility)} className={selectCls}>
              {(Object.keys(noteVisibilityLabel) as NoteVisibility[]).map(v => (
                <option key={v} value={v}>Visibile: {noteVisibilityLabel[v]}</option>
              ))}
            </select>
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-md">
            <Send className="w-3.5 h-3.5" />Salva Nota
          </button>
        </div>
      </div>

      {/* Lista Note */}
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">Nessuna nota presente. Aggiungine una usando il form qui sopra.</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map(note => (
            <div key={note.id} className={`bg-[var(--color-panel)] border rounded-2xl p-4 space-y-2 transition-colors ${note.isPinned ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5 shadow-md' : 'border-[var(--color-panel-border)]'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${noteCategoryColor[note.category]}`}>
                    {noteCategoryLabel[note.category]}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Visibile a: {noteVisibilityLabel[note.visibility]}
                  </span>
                  {note.isPinned && <span className="text-[11px] font-bold text-[var(--color-primary)]">📌 Fissata</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePinNote(athleteId, note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary)] hover:bg-slate-800 transition-colors"
                    title={note.isPinned ? 'Rimuovi pin' : 'Fissa'}>
                    {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title="Elimina nota">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <User className="w-3 h-3" />{note.authorName || 'Coach'}
                <span>·</span>
                <Calendar className="w-3 h-3" />{formatDateTime(note.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Pagina Principale ────────────────────────────────────────────────────────

interface AthleteDetailPageProps {
  athleteId: string;
  onBack: () => void;
}

export const AthleteDetailPage: React.FC<AthleteDetailPageProps> = ({ athleteId, onBack }) => {
  const { getAthleteById, updateAthlete, deleteAthlete, notes = {}, timeline = {} } = useAthletes();
  const { subscriptions = [] } = useSubscriptions();
  const { documents = [] } = useDocuments();
  const { communications = [] } = useCommunications();
  const { metrics = [], fetchMetricsForAthlete } = useMetrics();
  const { allAssignedWorkouts = [], coachTemplates = [], unassignWorkoutFromAthlete } = useWorkouts();
  const { setActiveTab: setAppActiveTab } = useApp();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<DetailTab>('panoramica');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalSection, setEditModalSection] = useState<ModalSection>('all');
  const [isAiProgressionOpen, setIsAiProgressionOpen] = useState(false);

  const athlete = getAthleteById(athleteId);
  const athleteNotes = notes?.[athleteId] ?? [];
  const athleteTimeline = timeline?.[athleteId] ?? [];
  const athleteDocs = documents.filter(d => d.athleteId === athleteId);
  const athleteComms = communications.filter(c => c.athleteId === athleteId);

  const athleteAssignedWorkouts = useMemo(() => {
    return allAssignedWorkouts.filter(a => a.athlete_id === athleteId && a.is_active);
  }, [allAssignedWorkouts, athleteId]);

  // Caricamento metriche fisiche
  React.useEffect(() => {
    if (athleteId) {
      fetchMetricsForAthlete(athleteId);
    }
  }, [athleteId, fetchMetricsForAthlete]);

  const athleteMetricsList = useMemo(() => {
    return (metrics || [])
      .filter(m => String(m.athlete_id) === String(athleteId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [metrics, athleteId]);

  const latestMetric = athleteMetricsList[0];
  const previousMetric = athleteMetricsList[1];

  const weightDelta = useMemo(() => {
    if (!latestMetric?.weight_kg || !previousMetric?.weight_kg) return null;
    const diff = Number(latestMetric.weight_kg) - Number(previousMetric.weight_kg);
    return Math.round(diff * 10) / 10;
  }, [latestMetric, previousMetric]);

  const bmi = useMemo(() => {
    if (!latestMetric?.weight_kg || !latestMetric?.height_cm) return null;
    const hM = Number(latestMetric.height_cm) / 100;
    if (hM <= 0) return null;
    const b = Number(latestMetric.weight_kg) / (hM * hM);
    return Math.round(b * 10) / 10;
  }, [latestMetric]);

  const athleteAge = useMemo(() => {
    if (!athlete?.dateOfBirth) return null;
    const birthDate = new Date(athlete.dateOfBirth);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [athlete]);

  const coachingTenure = useMemo(() => {
    if (!athlete?.createdAt) return '—';
    const start = new Date(athlete.createdAt);
    if (isNaN(start.getTime())) return '—';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays} giorn${diffDays === 1 ? 'o' : 'i'}`;
    const months = Math.floor(diffDays / 30);
    return `${months} mes${months === 1 ? 'e' : 'i'} (${diffDays} gg)`;
  }, [athlete]);

  // Abbonamento Attivo dell'atleta
  const activeSub = useMemo(() => {
    const list = subscriptions.filter(s => s.athleteId === athleteId && s.status === 'active');
    return list.length > 0 ? list[0] : null;
  }, [subscriptions, athleteId]);

  const daysToRenewal = useMemo(() => {
    if (!activeSub?.endDate) return null;
    const end = new Date(activeSub.endDate);
    if (isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [activeSub]);

  // Certificato Medico Status
  const medicalStatus = useMemo(() => {
    if (!athlete?.medicalCertificateExpiryDate) return { status: 'missing', label: 'Certificato Mancante', color: 'text-slate-400' };
    const todayStr = new Date().toISOString().slice(0, 10);
    const thirtyDaysStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (athlete.medicalCertificateExpiryDate < todayStr) {
      return { status: 'expired', label: 'Certificato Scaduto', color: 'text-red-400' };
    } else if (athlete.medicalCertificateExpiryDate <= thirtyDaysStr) {
      return { status: 'expiring', label: 'Certificato in Scadenza', color: 'text-amber-400' };
    }
    return { status: 'valid', label: 'Certificato Valido', color: 'text-emerald-400' };
  }, [athlete]);

  const handleSendCertReminderWhatsApp = () => {
    if (!athlete?.phone) {
      showError('Telefono Mancante', 'Imposta il numero di telefono dell\'atleta per inviare il sollecito.');
      return;
    }
    const certTypeLabel = athlete.medicalCertificateType === 'non_agonistico' ? 'non agonistico' : 'agonistico';
    const expDateStr = formatDate(athlete.medicalCertificateExpiryDate);
    const msg = `Ciao ${athlete.firstName || safeFullName}, ti ricordo che il tuo certificato medico ${certTypeLabel} ${athlete.medicalCertificateExpiryDate ? `scade/è scaduto il ${expDateStr}` : 'è da inviare/rinnovare'}. Ti chiedo gentilmente di inviarmi la copia aggiornata appena possibile! Grazie.`;
    const phoneDigits = athlete.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSendCertReminderTelegram = () => {
    const tgUser = athlete?.telegramUsername?.trim();
    const certTypeLabel = athlete?.medicalCertificateType === 'non_agonistico' ? 'non agonistico' : 'agonistico';
    const expDateStr = formatDate(athlete?.medicalCertificateExpiryDate);
    const msg = `Ciao ${athlete?.firstName || safeFullName}, ti ricordo che il tuo certificato medico ${certTypeLabel} ${athlete?.medicalCertificateExpiryDate ? `scade/è scaduto il ${expDateStr}` : 'è da inviare/rinnovare'}. Ti chiedo gentilmente di inviarmi la copia aggiornata appena possibile!`;

    navigator.clipboard.writeText(msg);
    showSuccess('Testo Sollecito Copiato!', 'Il testo del messaggio è stato copiato nella clipboard.');

    if (tgUser) {
      const cleanUser = tgUser.startsWith('@') ? tgUser.slice(1) : tgUser;
      window.open(`https://t.me/${cleanUser}`, '_blank');
    } else if (athlete?.phone) {
      window.open(`https://t.me/+${athlete.phone.replace(/[^0-9]/g, '')}`, '_blank');
    } else {
      showError('Contatto Telegram Mancante', 'Inserisci un username o numero Telegram per l\'atleta.');
    }
  };

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-400 font-bold text-lg">Atleta non trovato</p>
        <p className="text-slate-400 text-sm mt-1">L'atleta potrebbe essere stato eliminato.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
          ← Torna alla lista
        </button>
      </div>
    );
  }

  const safeTags = Array.isArray(athlete.tags) ? athlete.tags : [];
  const safeFullName = athlete.fullName || [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') || 'Atleta';
  const initials = safeFullName
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AT';

  // Badge Conteggio Tabs
  const tabList: { id: DetailTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'panoramica', label: 'Panoramica', icon: <User className="w-4 h-4" /> },
    { id: 'metriche', label: 'Metriche & Massimali', icon: <Scale className="w-4 h-4" /> },
    { id: 'note', label: 'Note', icon: <StickyNote className="w-4 h-4" />, count: athleteNotes.length },
    { id: 'abbonamenti', label: 'Abbonamenti', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'pagamenti', label: 'Pagamenti', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'documenti', label: 'Documenti', icon: <FileText className="w-4 h-4" />, count: athleteDocs.length },
    { id: 'attivita', label: 'Attività', icon: <Activity className="w-4 h-4" /> },
    { id: 'comunicazioni', label: 'Comunicazioni', icon: <MessageSquare className="w-4 h-4" />, count: athleteComms.length },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, count: athleteTimeline.length },
  ];

  const renderTab = (): React.ReactNode => {
    switch (activeTab) {
      case 'metriche':
        return <MetricsTab athleteId={athlete.id} athleteName={safeFullName} />;
      case 'panoramica':
        return (
          <div className="space-y-4">
            {/* Programma / Scheda di Allenamento In Uso */}
            <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" /> Programma / Scheda di Allenamento Attiva
                </h3>
                <button
                  onClick={() => setAppActiveTab('schede')}
                  className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  Vai a Schede →
                </button>
              </div>

              {athleteAssignedWorkouts.length > 0 ? (
                <div className="space-y-2.5">
                  {athleteAssignedWorkouts.map(assignment => {
                    const tmpl = assignment.workout || coachTemplates.find(t => t.id === assignment.workout_id);
                    return (
                      <div key={assignment.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg shrink-0">
                            <Dumbbell className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{tmpl?.title || 'Scheda di Allenamento'}</h4>
                            <p className="text-xs text-slate-400">
                              {tmpl?.description || 'Nessuna descrizione'} • Assegnata il {new Date(assignment.assigned_date).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setAppActiveTab('schede')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                          >
                            Vedi Programma
                          </button>
                          <button
                            onClick={() => setAppActiveTab('progressioni')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[var(--color-primary)] text-xs font-bold rounded-lg border border-[var(--color-primary)]/30 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Progressioni
                          </button>
                          <button
                            onClick={() => setIsAiProgressionOpen(true)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm shadow-purple-600/20"
                            title="Genera progressioni su misura con l'Assistente IA per questo atleta"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                            <span>IA Progressioni</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Vuoi rimuovere il programma "${tmpl?.title || 'Scheda'}" da questo atleta?`)) {
                                const res = await unassignWorkoutFromAthlete(athlete.id, assignment.workout_id);
                                if (res.success) {
                                  showSuccess('Scheda rimossa', 'La scheda non è più attiva per questo atleta.');
                                } else {
                                  showError('Errore durante la rimozione', res.error || '');
                                }
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Rimuovi scheda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl text-center space-y-2">
                  <p className="text-xs text-slate-400">Nessuna scheda di allenamento attualmente attiva per questo atleta.</p>
                  <button
                    onClick={() => setAppActiveTab('schede')}
                    className="px-3 py-1.5 bg-[var(--color-primary)] text-black font-bold text-xs rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-1.5"
                  >
                    <Dumbbell className="w-3.5 h-3.5" /> Assegna una Scheda ora
                  </button>
                </div>
              )}
            </div>

            {/* 1. Dati Anagrafici */}
            <CollapsibleSection title="Dati Anagrafici" icon={<User className="w-4 h-4" />} onEdit={() => { setEditModalSection('anagrafica'); setIsEditModalOpen(true); }}>
              <InfoRow label="Nome completo" value={safeFullName} />
              <InfoRow label="Data di nascita" value={
                athlete.dateOfBirth ? (
                  <div className="flex items-center gap-2">
                    <span>{formatDate(athlete.dateOfBirth)}</span>
                    {athleteAge !== null && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-[var(--color-primary)] border border-slate-700">
                        {athleteAge} anni
                      </span>
                    )}
                  </div>
                ) : '—'
              } />
              <InfoRow label="Codice Fiscale" value={athlete.fiscalCode} missing="Non fornito" />
              <InfoRow label="Indirizzo" value={athlete.address} missing="Non fornito" />
              <InfoRow label="Città" value={athlete.city ? `${athlete.city}${athlete.province ? ` (${athlete.province})` : ''}` : undefined} />
            </CollapsibleSection>

            {/* 2. Contatti & Canali Direct */}
            <CollapsibleSection title="Contatti & Canali Direct" icon={<Phone className="w-4 h-4" />} onEdit={() => { setEditModalSection('anagrafica'); setIsEditModalOpen(true); }}>
              <InfoRow label="Telefono"
                value={athlete.phone ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`tel:${athlete.phone}`} className="text-[var(--color-primary)] hover:underline flex items-center gap-1 font-semibold">
                      <Phone className="w-3.5 h-3.5" />{athlete.phone}
                    </a>
                    <button
                      onClick={() => {
                        const msg = `Ciao ${athlete.firstName || safeFullName}, ti contatto da Builder Athlete Manager.`;
                        window.open(`https://wa.me/${athlete.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors"
                    >
                      WhatsApp
                    </button>
                  </div>
                ) : undefined}
              />
              <InfoRow label="Telegram"
                value={athlete.telegramUsername || athlete.phone ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-200 font-semibold">{athlete.telegramUsername || athlete.phone}</span>
                    <button
                      onClick={() => {
                        const tgUser = athlete.telegramUsername?.trim();
                        if (tgUser) {
                          const cleanUser = tgUser.startsWith('@') ? tgUser.slice(1) : tgUser;
                          window.open(`https://t.me/${cleanUser}`, '_blank');
                        } else if (athlete.phone) {
                          window.open(`https://t.me/+${athlete.phone.replace(/[^0-9]/g, '')}`, '_blank');
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[11px] font-bold hover:bg-sky-500/20 transition-colors"
                    >
                      Telegram
                    </button>
                  </div>
                ) : undefined}
                missing="Non specificato"
              />
              <InfoRow label="Email"
                value={athlete.email ? (
                  <a href={`mailto:${athlete.email}`} className="text-[var(--color-primary)] hover:underline flex items-center gap-1 font-semibold">
                    <Mail className="w-3.5 h-3.5" />{athlete.email}
                  </a>
                ) : undefined}
                missing="Non fornita"
              />
              <InfoRow label="Canale preferito" value={athlete.contactChannel ? (contactChannelLabel[athlete.contactChannel] || athlete.contactChannel) : undefined} />
              <InfoRow label="Fonte acquisizione" value={athlete.acquisitionSource ? (acquisitionSourceLabel[athlete.acquisitionSource] || athlete.acquisitionSource) : undefined} />
            </CollapsibleSection>

            {/* 3. Parametri Fisici & Circonferenze Chiave */}
            <CollapsibleSection title="Parametri Fisici & Circonferenze Chiave" icon={<Scale className="w-4 h-4" />} defaultOpen={true} onEdit={() => setActiveTab('metriche')}>
              <div className="space-y-3 pt-1">
                {latestMetric ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {/* Peso */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Peso Attuale</span>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-white">{latestMetric.weight_kg ? `${latestMetric.weight_kg} kg` : '—'}</span>
                        {weightDelta !== null && (
                          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${weightDelta < 0 ? 'text-emerald-400' : weightDelta > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {weightDelta < 0 ? <TrendingDown className="w-3 h-3" /> : weightDelta > 0 ? <TrendingUp className="w-3 h-3" /> : null}
                            {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Altezza & IMC */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Altezza & IMC</span>
                      <span className="text-base font-black text-white">{latestMetric.height_cm ? `${latestMetric.height_cm} cm` : '—'}</span>
                      {bmi !== null && <span className="text-[10px] font-bold text-amber-400 block">IMC: {bmi}</span>}
                    </div>

                    {/* % Massa Grassa */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Massa Grassa (BF)</span>
                      <span className="text-base font-black text-white">{latestMetric.body_fat_percentage ? `${latestMetric.body_fat_percentage}%` : '—'}</span>
                    </div>

                    {/* Circonferenza Braccio */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Circ. Braccio</span>
                      <span className="text-xs font-bold text-white block">
                        {latestMetric.bicep_right_cm || latestMetric.bicep_left_cm
                          ? `Dx: ${latestMetric.bicep_right_cm ?? '—'} | Sx: ${latestMetric.bicep_left_cm ?? '—'}`
                          : '—'}
                      </span>
                    </div>

                    {/* Circonferenza Vita */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Circ. Vita</span>
                      <span className="text-base font-black text-white">{latestMetric.waist_cm ? `${latestMetric.waist_cm} cm` : '—'}</span>
                    </div>

                    {/* Circonferenza Coscia */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Circ. Coscia</span>
                      <span className="text-xs font-bold text-white block">
                        {latestMetric.thigh_right_cm || latestMetric.thigh_left_cm
                          ? `Dx: ${latestMetric.thigh_right_cm ?? '—'} | Sx: ${latestMetric.thigh_left_cm ?? '—'}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2">Nessun parametro fisico o misurazione ancora inserito per questo atleta.</p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setActiveTab('metriche')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-xs font-bold hover:bg-[var(--color-primary)]/20 transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>+ Registra / Storico Completo Misure</span>
                  </button>
                </div>
              </div>
            </CollapsibleSection>

            {/* 4. Abbonamento & Rinnovi */}
            <CollapsibleSection title="Abbonamento & Rinnovi Coaching" icon={<BookOpen className="w-4 h-4" />} defaultOpen={true} onEdit={() => setActiveTab('abbonamenti')}>
              <div className="space-y-3 pt-1">
                <InfoRow label="Data Inizio Coaching" value={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatDate(athlete.createdAt)}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-amber-400 border border-slate-700">
                      Atleta da {coachingTenure}
                    </span>
                  </div>
                } />
                <InfoRow label="Pacchetto Scelto" value={
                  activeSub ? (
                    <span className="font-black text-amber-400">{activeSub.packageName}</span>
                  ) : (
                    <span className="text-slate-500 italic">Nessun pacchetto attivo</span>
                  )
                } />
                <InfoRow label="Prossimo Rinnovo" value={
                  activeSub?.endDate ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{formatDate(activeSub.endDate)}</span>
                      {daysToRenewal !== null && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          daysToRenewal <= 7 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {daysToRenewal > 0 ? `Tra ${daysToRenewal} giorni` : daysToRenewal === 0 ? 'Oggi' : 'Scaduto'}
                        </span>
                      )}
                    </div>
                  ) : 'Nessuna data di rinnovo fissata'
                } />
              </div>
            </CollapsibleSection>

            {/* 5. Certificato Medico (CON SOLLECITI 1-CLICK) */}
            <CollapsibleSection title="Storico Medico & Certificato" icon={<FileText className="w-4 h-4" />} defaultOpen={true} onEdit={() => { setEditModalSection('certificato'); setIsEditModalOpen(true); }}>
              <div className="py-2 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Tipologia:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-black text-amber-400 uppercase tracking-wider">
                      {athlete.medicalCertificateType === 'non_agonistico' ? 'Non Agonistico' : 'Agonistico'}
                    </span>
                  </div>

                  <span className={`text-xs font-black ${medicalStatus.color}`}>
                    {medicalStatus.label}
                  </span>
                </div>

                <InfoRow label="Scadenza certificato" value={formatDate(athlete.medicalCertificateExpiryDate)} missing="Nessuna data impostata" />
                <InfoRow label="Note medico" value={athlete.medicalNotes} missing="Nessuna nota" />

                {/* Tasti Sollecito Rapido via WhatsApp / Telegram */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sollecito Rapido:</span>
                  <button
                    onClick={handleSendCertReminderWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Invia Sollecito WhatsApp</span>
                  </button>
                  <button
                    onClick={handleSendCertReminderTelegram}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/20 transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Invia Sollecito Telegram</span>
                  </button>
                </div>

                {/* Allegato File Certificato */}
                {athlete.medicalCertificateUrl && (
                  <div className="mt-3 flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-400">
                      <FileText className="w-4 h-4" />
                      <span>Certificato Medico Allegato</span>
                    </div>
                    <a
                      href={athlete.medicalCertificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] text-xs font-bold rounded-lg transition-colors shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizza Documento</span>
                    </a>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Contatto di Emergenza */}
            <CollapsibleSection title="Contatto di Emergenza" icon={<Shield className="w-4 h-4" />} defaultOpen={false} onEdit={() => { setEditModalSection('emergenza'); setIsEditModalOpen(true); }}>
              <InfoRow label="Nome" value={(athlete.emergencyContact as any)?.name} missing="Non specificato" />
              <InfoRow label="Telefono" value={(athlete.emergencyContact as any)?.phone} missing="Non specificato" />
              <InfoRow label="Relazione" value={(athlete.emergencyContact as any)?.relationship} missing="Non specificato" />
            </CollapsibleSection>

            {/* Stato e Pagamenti */}
            <CollapsibleSection title="Stato e Situazione" icon={<Activity className="w-4 h-4" />} defaultOpen={false} onEdit={() => { setEditModalSection('stato'); setIsEditModalOpen(true); }}>
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stato Atleta</span>
                  <AthleteStatusBadge status={athlete.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pagamenti</span>
                  <PaymentStatusBadge status={athlete.paymentStatus} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Coach assegnato</span>
                  <span className="text-sm text-slate-200 font-bold">{athlete.assignedCoachName || '—'}</span>
                </div>
                <InfoRow label="Iscrizione" value={formatDate(athlete.createdAt)} />
              </div>
            </CollapsibleSection>

            {/* Obiettivi e Disciplina */}
            <CollapsibleSection title="Obiettivi e Disciplina" icon={<Target className="w-4 h-4" />} defaultOpen={false} onEdit={() => { setEditModalSection('obiettivi'); setIsEditModalOpen(true); }}>
              {safeTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {safeTags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <InfoRow label="Obiettivi" value={athlete.goals} missing="Non specificati" />
              <InfoRow label="Note interne" value={athlete.notes} missing="Nessuna nota" />
            </CollapsibleSection>

            {/* Consensi */}
            <CollapsibleSection title="Consensi" icon={<Shield className="w-4 h-4" />} defaultOpen={false} onEdit={() => { setEditModalSection('certificato'); setIsEditModalOpen(true); }}>
              <InfoRow label="Privacy"
                value={athlete.privacyConsent ? (
                  <span className="text-emerald-400 font-semibold">✓ Acquisito{athlete.privacyConsentDate && formatDate(athlete.privacyConsentDate) !== '—' ? ` il ${formatDate(athlete.privacyConsentDate)}` : ''}</span>
                ) : (
                  <span className="text-red-400 font-semibold">✗ Non acquisito</span>
                )}
              />
              <InfoRow label="Newsletter"
                value={athlete.newsletterConsent ? (
                  <span className="text-emerald-400 font-semibold">✓ Consenso dato</span>
                ) : (
                  <span className="text-slate-500">Nessun consenso</span>
                )}
              />
            </CollapsibleSection>
          </div>
        );

      case 'note':
        return <NotesTab athleteId={athleteId} notes={athleteNotes} />;

      case 'timeline':
        return <TimelineTab athleteId={athlete.id} athleteName={athlete.fullName} events={athleteTimeline} />;

      case 'abbonamenti':
        return <SubscriptionsTab athleteId={athlete.id} athleteName={athlete.fullName} />;

      case 'pagamenti':
        return <PaymentsTab athleteId={athlete.id} athleteName={athlete.fullName} />;

      case 'documenti':
        return <DocumentsTab athleteId={athlete.id} athleteName={athlete.fullName} />;

      case 'attivita':
        return <ActivityTab athleteId={athlete.id} athleteName={athlete.fullName} />;

      case 'comunicazioni':
        return (
          <CommunicationsTab
            athleteId={athlete.id}
            athleteName={athlete.fullName}
            athletePhone={athlete.phone}
            athleteEmail={athlete.email}
          />
        );
    }
  };

  const handleCopyInviteLink = () => {
    if (!athlete.email) {
      showError('Email mancante', 'Imposta l\'email dell\'atleta prima di generare l\'invito.');
      return;
    }
    const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(athlete.email)}`;
    navigator.clipboard.writeText(inviteUrl);
    showSuccess('Link copiato!', 'Ora puoi inviare questo link all\'atleta (es. su WhatsApp) per fargli creare la password.');
  };

  const handleDeleteAthlete = async () => {
    if (confirm(`Sei sicuro di voler eliminare definitivamente il profilo di ${safeFullName}? L'operazione rimuoverà la scheda e tutti i dati associati dal database.`)) {
      const ok = await deleteAthlete(athleteId);
      if (ok) {
        showSuccess('Atleta eliminato', `Il profilo di ${safeFullName} è stato rimosso.`);
        onBack();
      } else {
        showError('Errore', 'Impossibile eliminare l\'atleta dal database.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* HERO HEADER CARD (ULTRA PREMIUM UI) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-[var(--color-panel)] to-[var(--color-panel)] border border-[var(--color-panel-border)] p-6 shadow-2xl space-y-6">
        {/* Glow accento dorato di sfondo */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Intestazione + Actions Bar */}
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all shrink-0 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="hidden sm:inline">Tutti gli atleti</span>
            </button>

            {/* Avatar Atleta con Anello di Stato Dinamico */}
            <div className="flex items-center gap-4">
              <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 flex items-center justify-center font-black text-lg text-white shadow-xl shrink-0 ${
                athlete.status === 'active'
                  ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : athlete.status === 'suspended'
                  ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'border-red-500'
              }`}>
                {initials}
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  athlete.status === 'active' ? 'bg-emerald-500' : athlete.status === 'suspended' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl font-black text-white tracking-tight">{safeFullName}</h2>
                  <AthleteStatusBadge status={athlete.status} />
                  <PaymentStatusBadge status={athlete.paymentStatus} />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap font-medium">
                  {athlete.email && (
                    <a href={`mailto:${athlete.email}`} className="hover:text-white transition-colors flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-sky-400" /> {athlete.email}
                    </a>
                  )}
                  {athlete.phone && (
                    <a href={`tel:${athlete.phone}`} className="hover:text-white transition-colors flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> {athlete.phone}
                    </a>
                  )}
                  <span>• Coach: <strong className="text-slate-200">{athlete.assignedCoachName || 'Nessuno'}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {athlete.phone && (
              <button
                onClick={() => {
                  const msg = `Ciao ${athlete.firstName || safeFullName}, ti contatto dal centro sportivo.`;
                  window.open(`https://wa.me/${athlete.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold transition-all shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            )}

            <button
              onClick={() => { setEditModalSection('all'); setIsEditModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              <Pencil className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Modifica Atleta</span>
            </button>

            <button
              onClick={handleCopyInviteLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-black font-black hover:bg-[var(--color-primary-hover)] rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Genera Invito</span>
            </button>

            <button
              onClick={handleDeleteAthlete}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-md"
              title="Elimina definitivamente questo atleta"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Elimina Profilo</span>
            </button>
          </div>
        </div>

        {/* QUICK STATS STRIP (SINTESI VISIVA 4 CARD) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          {/* Abbonamento Attivo */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abbonamento Attivo</span>
            {activeSub ? (
              <div>
                <span className="text-xs font-black text-amber-400 block truncate">{activeSub.packageName || 'Abbonamento Attivo'}</span>
                <span className="text-[10px] text-slate-400 block">Scadenza: {formatDate(activeSub.endDate)}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400 block">Nessun abbonamento attivo</span>
            )}
          </div>

          {/* Pagamenti & Saldo */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stato Pagamenti</span>
            <div className="flex items-center justify-between">
              <PaymentStatusBadge status={athlete.paymentStatus} />
              <span className="text-[10px] text-slate-400 font-semibold">Saldo in regola</span>
            </div>
          </div>

          {/* Certificato Medico */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Certificato Medico</span>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${medicalStatus.color}`}>{medicalStatus.label}</span>
              {athlete.medicalCertificateExpiryDate && (
                <span className="text-[10px] text-slate-400">{formatDate(athlete.medicalCertificateExpiryDate)}</span>
              )}
            </div>
          </div>

          {/* Contatti Rapidi */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-in & Presenze</span>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Atleta Attivo</span>
              <span className="text-[10px] text-slate-500">Iscritto {formatDate(athlete.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING PILL TAB BAR */}
      <div className="flex overflow-x-auto gap-1.5 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-2 no-scrollbar shadow-xl">
        {tabList.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[var(--color-primary)] text-black font-black shadow-[0_0_15px_rgba(234,179,8,0.25)] scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenuto Tab */}
      <div>{renderTab()}</div>

      {/* Modal Modifica Atleta con Sezione Specifica */}
      {isEditModalOpen && (
        <AthleteModal
          isOpen={isEditModalOpen}
          editingAthlete={athlete}
          initialSection={editModalSection}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (formData: AthleteFormData) => {
            const ok = await updateAthlete(athlete.id, formData);
            if (ok) {
              showSuccess('Atleta aggiornato', 'I dati dell\'atleta sono stati modificati con successo.');
              setIsEditModalOpen(false);
            } else {
              showError('Errore', 'Si è verificato un errore durante l\'aggiornamento dell\'atleta.');
            }
          }}
        />
      )}

      {/* Modal Assistente IA Progressioni per Atleta */}
      {athlete && (
        <AIProgressionAssistantModal
          isOpen={isAiProgressionOpen}
          onClose={() => setIsAiProgressionOpen(false)}
          initialContext={{
            athlete_id: athlete.id,
            athlete_name: safeFullName,
            limitations: athlete.medicalNotes || '',
          }}
        />
      )}
    </div>
  );
};
