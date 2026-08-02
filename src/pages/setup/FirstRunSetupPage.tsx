import React, { useState } from 'react';
import { Dumbbell, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';
import { saveOwnerProfile, DEFAULT_ORGANIZATION_NAME, DEFAULT_OWNER_EMAIL } from '../../lib/ownerProfile';
import { LocalOwnerProfile } from '../../types';

interface FirstRunSetupPageProps {
  onComplete: (profile: LocalOwnerProfile) => void;
}

export const FirstRunSetupPage: React.FC<FirstRunSetupPageProps> = ({ onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: { firstName?: string; lastName?: string; email?: string } = {};

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!cleanFirstName) {
      newErrors.firstName = 'Il nome è obbligatorio.';
    } else if (cleanFirstName.length < 2) {
      newErrors.firstName = 'Il nome deve contenere almeno 2 caratteri.';
    }

    if (!cleanLastName) {
      newErrors.lastName = 'Il cognome è obbligatorio.';
    } else if (cleanLastName.length < 2) {
      newErrors.lastName = 'Il cognome deve contenere almeno 2 caratteri.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Inserisci un indirizzo email valido.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const profile = saveOwnerProfile({
      firstName,
      lastName,
      email: email.trim() || undefined,
      organizationName: organizationName.trim() || undefined,
    });

    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            Builder <span className="text-[var(--color-primary)]">Athlete</span>
          </h1>
          <p className="text-xs text-[var(--color-primary)] font-bold uppercase tracking-wider">
            Configurazione Iniziale Obbligatoria
          </p>
          <p className="text-xs text-slate-400">
            Imposta il tuo profilo di Proprietario per iniziare a usare la demo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="es. Mario"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition-colors ${
                  errors.firstName
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-[var(--color-panel-border)] focus:border-[var(--color-primary)]'
                }`}
              />
              {errors.firstName && (
                <p className="text-[11px] text-red-400 mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Cognome */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="es. Rossi"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition-colors ${
                  errors.lastName
                    ? 'border-red-500/70 focus:border-red-500'
                    : 'border-[var(--color-panel-border)] focus:border-[var(--color-primary)]'
                }`}
              />
              {errors.lastName && (
                <p className="text-[11px] text-red-400 mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email <span className="text-slate-500">(Facoltativa)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`Predefinita: ${DEFAULT_OWNER_EMAIL}`}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition-colors ${
                errors.email
                  ? 'border-red-500/70 focus:border-red-500'
                  : 'border-[var(--color-panel-border)] focus:border-[var(--color-primary)]'
              }`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Nome Attività */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome Attività / Organizzazione <span className="text-slate-500">(Facoltativo)</span>
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder={`Predefinito: ${DEFAULT_ORGANIZATION_NAME}`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          {/* Ruolo (Non modificabile) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ruolo Assegnato
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm cursor-not-allowed">
              <UserCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="font-semibold text-slate-200">Proprietario</span>
              <span className="text-xs text-slate-500 ml-auto">(Non modificabile)</span>
            </div>
          </div>

          {/* Avviso sicurezza */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>I dati inseriti rimarranno salvati unicamente nel tuo browser. Non utilizzare dati sensibili reali.</span>
          </div>

          {/* Pulsante di Invio */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>CONFIGURA E AVVIA LA DEMO</span>
          </button>
        </form>
      </div>
    </div>
  );
};
