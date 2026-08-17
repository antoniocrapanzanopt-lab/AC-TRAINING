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
  Check,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { PERMISSIONS_MATRIX, SystemCapability } from '../../lib/permissionsMatrix';

export const CollaboratorsPage: React.FC = () => {
  const {
    user,
    members,
    addMember,
    updateMemberRole,
    toggleFinancialVisibility,
    toggleMemberStatus,
    deleteMember,
    transferOwnership,
  } = useAuth();
  const { showSuccess, showInfo, showError } = useToast();

  // Modali
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);

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
    showSuccess('Collaboratore Aggiunto', `Il profilo di ${addForm.fullName.trim()} è stato registrato nella squadra.`);
  };

  const handleDeleteMember = () => {
    if (!memberToDelete) return;
    deleteMember(memberToDelete.id);
    showSuccess('Collaboratore Rimosso', `Il collaboratore ${memberToDelete.name} è stato rimosso dalla squadra.`);
    setMemberToDelete(null);
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
      showSuccess('Proprietà Trasferita', 'Trasferimento di proprietà completato con successo.');
    } else {
      showError('Operazione Non Disponibile', 'Il trasferimento di proprietà richiede autorizzazione dal backend.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Titolo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-[var(--color-primary)]" /> Gestione Collaboratori & Squadra
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestisci l'accesso dei membri dello staff (Amministratori, Coach, Segreteria), i permessi operativi e la visibilità finanziaria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'owner' && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 hover:border-amber-400 font-bold text-xs transition-all shadow"
            >
              <ArrowRightLeft className="w-4 h-4" /> Trasferimento Proprietà
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Aggiungi Collaboratore
          </button>
        </div>
      </div>

      {/* GRIGLIA MEMBRI DELLA SQUADRA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Membri del Team ({members.length})
          </h3>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] space-y-3">
            <div className="p-4 rounded-full bg-slate-900 w-16 h-16 mx-auto flex items-center justify-center text-slate-500 border border-slate-800">
              <Users className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <h4 className="text-base font-bold text-white">Nessun collaboratore aggiunto</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Non ci sono ancora collaboratori registrati nello staff. Clicca sul pulsante in alto per aggiungere il primo membro.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all"
            >
              <UserPlus className="w-4 h-4" /> Aggiungi Membro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => (
              <div
                key={m.id}
                className={`p-5 rounded-2xl bg-[var(--color-panel)] border transition-all space-y-4 shadow-xl relative group ${
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
                  <div className="flex items-center gap-2">
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
                    {m.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => setMemberToDelete({ id: m.id, name: m.fullName })}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Elimina collaboratore"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Controlli Ruolo e Permessi */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  {/* Assegnazione Ruolo */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ruolo:</span>
                    {m.role === 'owner' ? (
                      <span className="font-bold text-[var(--color-primary)] text-xs">Proprietario</span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={e => {
                          updateMemberRole(m.id, e.target.value as UserRole);
                          showSuccess('Ruolo Aggiornato', `Ruolo di ${m.fullName} modificato in ${e.target.value}`);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
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
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-[10px] cursor-pointer transition-colors ${
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
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-[10px] cursor-pointer transition-colors ${
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
        )}
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
                <UserPlus className="w-5 h-5 text-[var(--color-primary)]" /> Aggiungi Collaboratore
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nome e Cognome *</label>
              <input
                type="text"
                required
                placeholder="es. Roberto Verdi"
                value={addForm.fullName}
                onChange={e => setAddForm({ ...addForm, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="es. roberto@palestra.it"
                value={addForm.email}
                onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Ruolo Assegnato</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
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
              <label htmlFor="canViewFinancials" className="text-xs text-slate-300 cursor-pointer">
                Abilita visibilità dati economici ed incassi
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                Salva Collaboratore
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE CONFERMA ELIMINAZIONE COLLABORATORE */}
      {memberToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Rimuovi Collaboratore
              </h3>
              <button type="button" onClick={() => setMemberToDelete(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Sei sicuro di voler rimuovere <strong>{memberToDelete.name}</strong> dalla squadra? L'utente non avrà più accesso all'applicazione.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-500 cursor-pointer"
              >
                Conferma Rimozione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE TRASFERIMENTO PROPRIETÀ */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleTransferSubmit} className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-400" /> Trasferimento Proprietà
              </h3>
              <button type="button" onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <span className="font-bold block">Attenzione:</span>
              Seleziona un membro della squadra a cui cedere il ruolo di Proprietario. Il tuo account attuale verrà impostato come Amministratore.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Seleziona Nuovo Proprietario</label>
              <select
                value={transferTargetId}
                onChange={e => setTransferTargetId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] cursor-pointer"
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
