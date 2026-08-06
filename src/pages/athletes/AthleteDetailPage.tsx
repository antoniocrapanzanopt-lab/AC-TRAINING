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
  MessageSquare
} from 'lucide-react';
import { AthleteNote, NoteCategory, NoteVisibility, TimelineEvent } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AthleteStatusBadge, PaymentStatusBadge, contactChannelLabel, acquisitionSourceLabel } from '../../components/athletes/AthleteBadges';
import { Link as LinkIcon } from 'lucide-react';

// ─── Tipi Tab ─────────────────────────────────────────────────────────────────

type DetailTab =
  | 'panoramica'
  | 'note'
  | 'abbonamenti'
  | 'pagamenti'
  | 'documenti'
  | 'attivita'
  | 'comunicazioni'
  | 'timeline';

const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'panoramica', label: 'Panoramica', icon: <User className="w-4 h-4" /> },
  { id: 'note', label: 'Note', icon: <StickyNote className="w-4 h-4" /> },
  { id: 'abbonamenti', label: 'Abbonamenti', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'pagamenti', label: 'Pagamenti', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'documenti', label: 'Documenti', icon: <FileText className="w-4 h-4" /> },
  { id: 'attivita', label: 'Attività', icon: <Activity className="w-4 h-4" /> },
  { id: 'comunicazioni', label: 'Comunicazioni', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
];

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

const timelineTypeIcon: Record<TimelineEvent['type'], string> = {
  joined: '🏁',
  subscription_created: '📋',
  subscription_renewed: '🔄',
  subscription_expired: '⚠️',
  payment_received: '💰',
  payment_overdue: '🔴',
  note_added: '📝',
  status_changed: '🔀',
  coach_assigned: '👤',
  document_uploaded: '📄',
  message_sent: '💬',
  communication: '💬',
  goal_set: '🎯',
  goal_achieved: '🏆',
  other: '⚙️',
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
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-900/30 transition-colors">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[var(--color-primary)]">{icon}</span>}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
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
    const ok = await addNote(
      athleteId,
      content,
      user?.id ?? 'local-owner',
      user?.name ?? 'Coach',
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
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide">Nuova Nota</p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder="Scrivi la nota..."
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
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
          <button onClick={handleAdd}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-black text-xs font-extrabold hover:bg-[var(--color-primary-hover)] transition-colors">
            <Send className="w-3.5 h-3.5" />Salva Nota
          </button>
        </div>
      </div>

      {/* Lista Note */}
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">Nessuna nota presente. Aggiungine una usando il form qui sopra.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(note => (
            <div key={note.id} className={`bg-[var(--color-panel)] border rounded-xl p-4 space-y-2 transition-colors ${note.isPinned ? 'border-[var(--color-primary)]/40' : 'border-[var(--color-panel-border)]'}`}>
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
                    className="p-1 rounded text-slate-500 hover:text-[var(--color-primary)] transition-colors"
                    title={note.isPinned ? 'Rimuovi pin' : 'Fissa'}>
                    {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(note.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                    title="Elimina nota">
                    <Trash2 className="w-3.5 h-3.5" />
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

// ─── Scheda Timeline ──────────────────────────────────────────────────────────

const TimelineTab: React.FC<{ events: TimelineEvent[] }> = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nessun evento nella timeline.</p>
        <p className="text-xs text-slate-600 mt-1">Le operazioni importanti (iscrizioni, pagamenti, modifiche di stato) appariranno qui automaticamente.</p>
      </div>
    );
  }

  const sorted = [...(events || [])].filter(Boolean).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
  });

  return (
    <div className="relative pl-6 space-y-0">
      {/* Linea verticale */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-700" />

      {sorted.map((event, idx) => (
        <div key={event.id} className={`relative flex gap-4 ${idx < sorted.length - 1 ? 'pb-5' : ''}`}>
          {/* Pallino */}
          <div className="absolute -left-6 mt-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-bg)] flex items-center justify-center shrink-0 z-10 text-[10px]">
            {timelineTypeIcon[event.type] || '⚙️'}
          </div>

          <div className="flex-1 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl p-3 hover:border-slate-600 transition-colors">
            <p className="text-sm font-semibold text-white">{event.title}</p>
            {event.description && (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{event.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
              <User className="w-3 h-3" />{event.authorName || 'Sistema'}
              <span>·</span>
              <Calendar className="w-3 h-3" />
              {formatDateTime(event.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Scheda Segnaposto ────────────────────────────────────────────────────────

const PlaceholderTab: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({
  title, description, icon,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center mb-4 text-[var(--color-primary)]">
      {icon}
    </div>
    <h3 className="text-base font-bold text-white mb-1">{title}</h3>
    <p className="text-sm text-slate-400 max-w-xs">{description}</p>
    <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400 font-medium">
      Modulo in preparazione
    </span>
  </div>
);

// ─── Pagina Principale ────────────────────────────────────────────────────────

interface AthleteDetailPageProps {
  athleteId: string;
  onBack: () => void;
}

export const AthleteDetailPage: React.FC<AthleteDetailPageProps> = ({ athleteId, onBack }) => {
  const { getAthleteById, notes = {}, timeline = {} } = useAthletes();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>('panoramica');

  const athlete = getAthleteById(athleteId);
  const athleteNotes = notes?.[athleteId] ?? [];
  const athleteTimeline = timeline?.[athleteId] ?? [];

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
  const hasEmergencyContact = athlete.emergencyContact && typeof athlete.emergencyContact === 'object';
  const safeFullName = athlete.fullName || [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') || '—';

  const renderTab = (): React.ReactNode => {
    switch (activeTab) {
      case 'panoramica':
        return (
          <div className="space-y-4">
            {/* Dati Anagrafici */}
            <CollapsibleSection title="Dati Anagrafici" icon={<User className="w-4 h-4" />}>
              <InfoRow label="Nome completo" value={safeFullName} />
              <InfoRow label="Data di nascita" value={formatDate(athlete.dateOfBirth)} />
              <InfoRow label="Codice Fiscale" value={athlete.fiscalCode} missing="Non fornito" />
              <InfoRow label="Indirizzo" value={athlete.address} missing="Non fornito" />
              <InfoRow label="Città" value={athlete.city ? `${athlete.city}${athlete.province ? ` (${athlete.province})` : ''}` : undefined} />
            </CollapsibleSection>

            {/* Contatti */}
            <CollapsibleSection title="Contatti" icon={<Phone className="w-4 h-4" />}>
              <InfoRow label="Telefono"
                value={athlete.phone ? (
                  <a href={`tel:${athlete.phone}`} className="text-[var(--color-primary)] hover:underline flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{athlete.phone}
                  </a>
                ) : undefined}
              />
              <InfoRow label="Email"
                value={athlete.email ? (
                  <a href={`mailto:${athlete.email}`} className="text-[var(--color-primary)] hover:underline flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />{athlete.email}
                  </a>
                ) : undefined}
                missing="Non fornita"
              />
              <InfoRow label="Canale preferito" value={athlete.contactChannel ? (contactChannelLabel[athlete.contactChannel] || athlete.contactChannel) : undefined} />
              <InfoRow label="Fonte acquisizione" value={athlete.acquisitionSource ? (acquisitionSourceLabel[athlete.acquisitionSource] || athlete.acquisitionSource) : undefined} />
            </CollapsibleSection>

            {/* Contatto di Emergenza */}
            {hasEmergencyContact && (
              <CollapsibleSection title="Contatto di Emergenza" icon={<Shield className="w-4 h-4" />} defaultOpen={false}>
                <InfoRow label="Nome" value={(athlete.emergencyContact as any).name} />
                <InfoRow label="Telefono" value={(athlete.emergencyContact as any).phone} />
                <InfoRow label="Relazione" value={(athlete.emergencyContact as any).relationship} />
              </CollapsibleSection>
            )}

            {/* Stato e Pagamenti */}
            <CollapsibleSection title="Stato e Situazione" icon={<Activity className="w-4 h-4" />}>
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
                  <span className="text-sm text-slate-200">{athlete.assignedCoachName || '—'}</span>
                </div>
                <InfoRow label="Iscrizione" value={formatDate(athlete.createdAt)} />
              </div>
            </CollapsibleSection>

            {/* Obiettivi e Disciplina */}
            <CollapsibleSection title="Obiettivi e Disciplina" icon={<Target className="w-4 h-4" />} defaultOpen={false}>
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

            {/* Certificato Medico (demo) */}
            <CollapsibleSection title="Certificato Medico (demo)" icon={<FileText className="w-4 h-4" />} defaultOpen={false}>
              <div className="py-3 text-center">
                <p className="text-xs text-slate-400 leading-relaxed">
                  In questa sezione demo vengono indicate le date del certificato medico sportivo. <br />
                  <span className="font-semibold text-amber-400">Non inserire mai dati sanitari reali in questa applicazione.</span>
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
                    Scadenza certificato: <span className="ml-1 text-slate-300 font-semibold">{formatDate(athlete.medicalCertificateExpiryDate)}</span>
                  </span>
                </div>
              </div>
            </CollapsibleSection>

            {/* Consensi */}
            <CollapsibleSection title="Consensi" icon={<Shield className="w-4 h-4" />} defaultOpen={false}>
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
        return <TimelineTab events={athleteTimeline} />;

      case 'abbonamenti':
        return (
          <PlaceholderTab
            title="Abbonamenti"
            description="Qui verranno visualizzati il pacchetto attivo, la data di inizio, la scadenza e la cronologia degli abbonamenti precedenti."
            icon={<BookOpen className="w-7 h-7" />}
          />
        );

      case 'pagamenti':
        return (
          <PlaceholderTab
            title="Pagamenti"
            description="Qui saranno visibili tutti i pagamenti ricevuti, le quote arretrate e lo storico delle transazioni demo."
            icon={<CreditCard className="w-7 h-7" />}
          />
        );

      case 'documenti':
        return (
          <PlaceholderTab
            title="Documenti"
            description="Qui potrai allegare documenti demo (moduli, liberatorie, contratti). Nessun file viene inviato a server reali."
            icon={<FileText className="w-7 h-7" />}
          />
        );

      case 'attivita':
        return (
          <PlaceholderTab
            title="Registro Attività"
            description="Sessioni di allenamento, presenze e progressi dell'atleta saranno registrati in questa sezione."
            icon={<Activity className="w-7 h-7" />}
          />
        );

      case 'comunicazioni':
        return (
          <PlaceholderTab
            title="Comunicazioni"
            description="Messaggi e comunicazioni demo inviate all'atleta. Nessuna email reale viene mai inviata in questa modalità demo."
            icon={<MessageSquare className="w-7 h-7" />}
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

  return (
    <div className="space-y-5">
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors shrink-0 mt-1">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Tutti gli atleti</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white tracking-tight truncate">{safeFullName !== '—' ? safeFullName : 'Atleta'}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <AthleteStatusBadge status={athlete.status} />
                <PaymentStatusBadge status={athlete.paymentStatus} />
                {athlete.email && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />{athlete.email}
                  </span>
                )}
            </div>
          </div>
        </div>
        </div>
        </div>
        
        {/* Pulsanti Azione Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black border border-[var(--color-primary)]/30 rounded-xl text-xs font-bold transition-all shadow-lg"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Genera Invito</span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex overflow-x-auto gap-1 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl p-1.5 no-scrollbar">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenuto Tab */}
      <div>{renderTab()}</div>
    </div>
  );
};
