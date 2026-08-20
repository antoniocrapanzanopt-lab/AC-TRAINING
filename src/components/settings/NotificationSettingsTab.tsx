import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Smartphone,
  Globe,
  Save,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { WebPushService } from '../../lib/push/pushService';

export const NotificationSettingsTab: React.FC = () => {
  const { preferences, updatePreferences, enableWebPush, disableWebPush } = useNotifications();

  const [pushEnabled, setPushEnabled] = useState(preferences?.push_enabled ?? false);
  const [notifyHigh, setNotifyHigh] = useState(preferences?.notify_high ?? true);
  const [notifyCritical, setNotifyCritical] = useState(preferences?.notify_critical ?? true);
  const [quietStart, setQuietStart] = useState(preferences?.quiet_hours_start ?? '22:00');
  const [quietEnd, setQuietEnd] = useState(preferences?.quiet_hours_end ?? '07:00');
  const [timezone] = useState('Europe/Rome');

  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPermissionState(WebPushService.getPermissionState());
  }, []);

  useEffect(() => {
    if (preferences) {
      setPushEnabled(preferences.push_enabled);
      setNotifyHigh(preferences.notify_high);
      setNotifyCritical(preferences.notify_critical);
      if (preferences.quiet_hours_start) setQuietStart(preferences.quiet_hours_start);
      if (preferences.quiet_hours_end) setQuietEnd(preferences.quiet_hours_end);
    }
  }, [preferences]);

  const handleTogglePush = async () => {
    setErrorMessage(null);
    if (!pushEnabled) {
      const res = await enableWebPush();
      if (res.success) {
        setPushEnabled(true);
        setPermissionState('granted');
      } else {
        setErrorMessage(res.error || 'Impossibile abilitare le notifiche Web Push su questo dispositivo.');
      }
    } else {
      await disableWebPush();
      setPushEnabled(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const success = await updatePreferences({
      push_enabled: pushEnabled,
      notify_high: notifyHigh,
      notify_critical: notifyCritical,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      timezone,
    });

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setErrorMessage('Errore durante il salvataggio delle preferenze.');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 select-none font-sans max-w-4xl">
      {/* Testata della Scheda */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl backdrop-blur-xl flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <BellRing className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">
            Preferenze Notifiche & Web Push
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Configura le notifiche in-app, le notifiche native del browser (Web Push) e gli orari di silenzio.
          </p>
        </div>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* ── SEZIONE 1: WEB PUSH NOTIFICATIONS ── */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[var(--color-primary)]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Notifiche Web Push sul Dispositivo</h3>
                <p className="text-xs text-slate-400">
                  Ricevi notifiche native di sistema anche quando il portale AC Coaching è chiuso o in background.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePush}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                pushEnabled ? 'bg-[var(--color-primary)]' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  pushEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Badge Stato Permessi Browser */}
          <div className="pt-2 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Stato permessi browser:</span>
            <span
              className={`font-black px-2 py-0.5 rounded-md uppercase text-[10px] ${
                permissionState === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : permissionState === 'denied'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {permissionState === 'granted'
                ? 'Autorizzato'
                : permissionState === 'denied'
                ? 'Bloccato'
                : 'Da Richiedere'}
            </span>
          </div>
        </div>

        {/* ── SEZIONE 2: CANALI & PRIORITÀ ── */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Livelli di Priorità & Invio Push</span>
          </h3>

          <div className="space-y-3 divide-y divide-slate-800/60">
            {/* Critical */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Notifiche Critiche & Sicurezza (Critical)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Accessi insoliti, tentativi MFA falliti e alert strutturali. Sempre attive per sicurezza.
                </p>
              </div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                Sempre Attive
              </span>
            </div>

            {/* High */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Notifiche Urgenti & Fastidi Atleti (High)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Segnalazioni di dolore nei workout, check-in con fastidio e programmi in scadenza.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifyHigh}
                onChange={(e) => setNotifyHigh(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* ── SEZIONE 3: QUIET HOURS (ORARI DI SILENZIO) ── */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Orari di Silenzio (Quiet Hours)</h3>
              <p className="text-xs text-slate-400">
                Durante questa fascia oraria non riceverai notifiche Web Push (gli alert critici di sicurezza saranno comunque recapitati).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Inizio Silenzio
              </label>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Fine Silenzio
              </label>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>Fuso Orario di Riferimento: <strong className="text-white">Europe/Rome</strong></span>
          </div>
        </div>

        {/* Feedback errori o successo */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">Preferenze notifiche salvate con successo!</span>
          </div>
        )}

        {/* Pulsante Salva */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] active:scale-98 transition-all flex items-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salva Preferenze</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
