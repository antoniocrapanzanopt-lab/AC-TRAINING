import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Info,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { PERMISSIONS_MATRIX, SystemCapability } from '../../lib/permissionsMatrix';

export const CollaboratorsPage: React.FC = () => {
  const {
    members,
    simulatedRole,
    switchSimulatedRole,
    addMember,
    updateMemberRole,
    toggleFinancialVisibility,
    toggleMemberStatus,
    transferOwnership,
  } = useAuth();
  const { showSuccess, showInfo, showError } = useToast();

  // Modali
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form Aggiunta Collaboratore
  const [addForm, setAddForm] = useState<{
    fullName: string;
    email: string;
    role: UserRole;
    canViewFinancials: boolean;
  }>({
    fullName: '',
    email: '',
    role: 'coach',
    canViewFinancials: false,
  });

  // Target per Trasferimento Proprietà
  const [transferTargetId, setTransferTargetId] = useState<string>('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName.trim() || !addForm.email.trim()) {
      showError('Campi Mancanti', 'Nome ed Email sono obbligatori.');
      return;
    }

    addMember({
      userId: `user-${Date.now()}`,
      fullName: addForm.fullName.trim(),
      email: addForm.email.trim(),
      role: addForm.role,
      canViewFinancials: addForm.canViewFinancials,
      status: 'active',
    });

    setIsAddModalOpen(false);
    setAddForm({ fullName: '', email: '', role: 'coach', canViewFinancials: false });
    showSuccess('Collaboratore Aggiunto', 'Nuovo membro inserito nella squadra demo. (Invito email simulato: nessuna email inviata)');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetId) {
      showError('Seleziona Membro', 'Seleziona il collaboratore a cui cedere la proprietà.');
      return;
    }

    const success = transferOwnership(transferTargetId);
    if (success) {
      setIsTransferModalOpen(false);
      setTransferTargetId('');
      showSuccess('Proprietà Trasferita', 'Trasferimento proprietà completato nel sistema locale.');
    } else {
      showError('Errore', 'Impossibile completare il trasferimento della proprietà.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Disclaimer Legale Permanente */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3 shadow-lg">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider block text-[11px] text-amber-400">
            SIMULAZIONE LOCALE RUOLI & PERMESSI
          </span>
          La gestione dei collaboratori, i ruoli e la visibilità finanziaria sono simulazioni locali dimostrative. Non sostituiscono un sistema di autenticazione o autorizzazione server-side reale. Gli inviti email sono esclusivamente simulati.
        </div>
      </div>

      {/* Header & Titolo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-[var(--color-primary)]" /> Gestione Collaboratori & Squadra
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Assegna ruoli (Proprietario, Admin, Coach, Segreteria, Atleta), controlla la visibilità economica e prova l'interfaccia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {simulatedRole === 'owner' && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 hover:border-amber-400 font-bold text-xs transition-all shadow"
            >
              <ArrowRightLeft className="w-4 h-4" /> Trasferimento Proprietà (Simulato)
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <UserPlus className="w-4 h-4" /> Aggiungi Collaboratore
          </button>
        </div>
      </div>

      {/* STRUMENTO PROVA INTERFACCIA: BARRA SIMULAZIONE RUOLO ATTIVO */}
      <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-primary)]/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-bold text-white">Prova l'Interfaccia con un Altro Ruolo (Simulatore Live)</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            Ruolo Attivo: <strong className="text-[var(--color-primary)]">{PERMISSIONS_MATRIX[simulatedRole]?.roleLabel}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Seleziona un ruolo per cambiare istantaneamente la prospettiva di navigazione dell'app. Noterai come sezioni, incassi e menu si nascondono o disabilitano in base alla matrice di permessi del ruolo.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(Object.keys(PERMISSIONS_MATRIX) as UserRole[]).map(roleKey => {
            const config = PERMISSIONS_MATRIX[roleKey];
            const isActive = simulatedRole === roleKey;

            return (
              <button
                key={roleKey}
                onClick={() => {
                  switchSimulatedRole(roleKey);
                  showInfo('Ruolo Simulato', `Interfaccia ora vista da: ${config.roleLabel}`);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-black shadow-lg scale-105'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {config.roleLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* GRIGLIA MEMBRI DELLA SQUADRA */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" /> Membri del Team ({members.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <div
              key={m.id}
              className={`p-5 rounded-2xl bg-[var(--color-panel)] border transition-all space-y-4 shadow-xl ${
                m.status === 'inactive'
                  ? 'border-red-950/40 opacity-70'
                  : 'border-[var(--color-panel-border)] hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{m.fullName}</h4>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                    m.role === 'owner'
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20'
                      : m.role === 'admin'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : m.role === 'coach'
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {PERMISSIONS_MATRIX[m.role]?.roleLabel || m.role}
                </span>
              </div>

              {/* Controlli Ruolo e Permessi */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                {/* Assegnazione Ruolo */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ruolo:</span>
                  {m.role === 'owner' ? (
                    <span className="font-bold text-[var(--color-primary)] text-xs">Proprietario Fisso</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={e => {
                        updateMemberRole(m.id, e.target.value as UserRole);
                        showSuccess('Ruolo Aggiornato', `Ruolo di ${m.fullName} modificato in ${e.target.value}`);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                    >
                      <option value="admin">Amministratore</option>
                      <option value="coach">Coach</option>
                      <option value="receptionist">Segreteria</option>
                      <option value="collaborator">Collaboratore</option>
                      <option value="athlete">Atleta</option>
                    </select>
                  )}
                </div>

                {/* Visibilità Economica */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Visibilità Economica:</span>
                  <button
                    onClick={() => {
                      toggleFinancialVisibility(m.id);
                      showInfo('Visibilità Modificata', `Visibilità dati economici per ${m.fullName} ${!m.canViewFinancials ? 'abilitata' : 'disabilitata'}`);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-[10px] ${
                      m.canViewFinancials
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {m.canViewFinancials ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {m.canViewFinancials ? 'Abilitata' : 'Nascosta'}
                  </button>
                </div>

                {/* Stato Attivo / Sospeso */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Stato Account:</span>
                  {m.role === 'owner' ? (
                    <span className="text-[10px] font-bold text-emerald-400">Sempre Attivo</span>
                  ) : (
                    <button
                      onClick={() => {
                        toggleMemberStatus(m.id);
                        showInfo('Stato Modificato', `Collaboratore ${m.fullName} ${m.status === 'active' ? 'sospeso' : 'riattivato'}`);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-[10px] ${
                        m.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {m.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {m.status === 'active' ? 'Attivo' : 'Sospeso'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MATRICE DEI PERMESSI VISUALE COMPARATIVA */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" /> Matrice dei Permessi per Ruolo
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Regole di Accesso Centralizzate</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-3">Permesso / Capacità</th>
                <th className="p-3 text-center">Proprietario</th>
                <th className="p-3 text-center">Admin</th>
                <th className="p-3 text-center">Coach</th>
                <th className="p-3 text-center">Segreteria</th>
                <th className="p-3 text-center">Atleta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {[
                { key: 'viewFinancials', label: 'Dati Economici e Incassi' },
                { key: 'manageAthletes', label: 'Gestione Anagrafica Atleti' },
                { key: 'manageSubscriptions', label: 'Gestione Abbonamenti' },
                { key: 'managePayments', label: 'Registrazione Incassi' },
                { key: 'manageTasks', label: 'Registro Attività e Task' },
                { key: 'manageCalendar', label: 'Calendario Appuntamenti' },
                { key: 'manageDocuments', label: 'Documenti e Certificati' },
                { key: 'manageCommunications', label: 'Invio Comunicazioni' },
                { key: 'managePackages', label: 'Pacchetti e Listini' },
                { key: 'editSettings', label: 'Impostazioni di Sistema' },
                { key: 'manageCollaborators', label: 'Gestione Squadra e Ruoli' },
                { key: 'transferOwnership', label: 'Trasferimento Proprietà' },
              ].map(row => (
                <tr key={row.key} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 font-semibold text-white">{row.label}</td>
                  {(['owner', 'admin', 'coach', 'receptionist', 'athlete'] as UserRole[]).map(r => {
                    const allowed = PERMISSIONS_MATRIX[r]?.capabilities[row.key as SystemCapability];
                    return (
                      <td key={r} className="p-3 text-center">
                        {allowed ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE AGGIUNGI COLLABORATORE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleAddMember} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--color-primary)]" /> Aggiungi Collaboratore Dimostrativo
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Disclaimer Email Simulata */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <span className="font-bold block">Invito Email Simulato:</span>
              Nella demo non viene inviata alcuna reale email di invito. Il membro apparirà immediatamente nell'elenco locale.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nome e Cognome *</label>
              <input
                type="text"
                required
                placeholder="es. Roberto Verdi"
                value={addForm.fullName}
                onChange={e => setAddForm({ ...addForm, fullName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="es. roberto@example.com"
                value={addForm.email}
                onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Ruolo Assegnato</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="admin">Amministratore</option>
                <option value="coach">Coach</option>
                <option value="receptionist">Segreteria</option>
                <option value="collaborator">Collaboratore</option>
                <option value="athlete">Atleta</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="canViewFinancials"
                checked={addForm.canViewFinancials}
                onChange={e => setAddForm({ ...addForm, canViewFinancials: e.target.checked })}
                className="rounded border-slate-800 bg-slate-950 text-[var(--color-primary)] focus:ring-0"
              />
              <label htmlFor="canViewFinancials" className="text-xs text-slate-300">
                Abilita visibilità dati economici ed incassi
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)]"
              >
                Crea Member Demo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE TRASFERIMENTO PROPRIETÀ SIMULATO */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleTransferSubmit} className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-400" /> Trasferimento Proprietà (Simulato)
              </h3>
              <button type="button" onClick={() => setIsTransferModalOpen(true)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" onClick={() => setIsTransferModalOpen(false)} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <span className="font-bold block">Procedura di Trasferimento:</span>
              Seleziona un membro della squadra a cui cedere il ruolo di Proprietario. Il tuo account attuale verrà degradato a ruolo Amministratore nel sistema locale.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Seleziona Nuovo Proprietario</label>
              <select
                value={transferTargetId}
                onChange={e => setTransferTargetId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">-- Seleziona Membro --</option>
                {members
                  .filter(m => m.role !== 'owner')
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.email}) - {PERMISSIONS_MATRIX[m.role]?.roleLabel}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400"
              >
                Trasferisci Proprietà
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
