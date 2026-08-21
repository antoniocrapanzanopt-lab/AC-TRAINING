import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  MessageCircle,
  Webhook,
  Save,
} from 'lucide-react';
import { ChannelSettingsConfig } from '../../../types';
import { useCommunications } from '../../../context/CommunicationsContext';
import { useToast } from '../../../context/ToastContext';

export const ChannelSettingsView: React.FC = () => {
  const { channelSettings, saveChannelSettings } = useCommunications();
  const { showSuccess } = useToast();

  const [formState, setFormState] = useState<ChannelSettingsConfig>(channelSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveChannelSettings(formState);
    showSuccess('Impostazioni Salvate', 'La configurazione dei canali di comunicazione è stata aggiornata.');
  };

  const inputCls = "w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium";
  const labelCls = "block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Box Notifiche In-App */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Notifiche In-App & Portale Atleta</h4>
              <p className="text-xs text-slate-400">Canale di recapito istantaneo all'interno dell'app e del portale riservato.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.inAppEnabled}
              onChange={e => setFormState({ ...formState, inAppEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelCls}>Priorità Predefinita Broadcast</label>
            <select
              value={formState.inAppPriority}
              onChange={e => setFormState({ ...formState, inAppPriority: e.target.value as any })}
              className={inputCls}
            >
              <option value="normal">Normale (Notifica standard nel feed)</option>
              <option value="high">Alta (Toast e badge prioritario)</option>
              <option value="urgent">Urgente (Banner modale con richiesta conferma)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 self-end">
            <div>
              <span className="text-xs font-bold text-white block">Riproduci Suono Notifica</span>
              <span className="text-[10px] text-slate-400">Segnale acustico discreto all'arrivo</span>
            </div>
            <input
              type="checkbox"
              checked={formState.inAppSound}
              onChange={e => setFormState({ ...formState, inAppSound: e.target.checked })}
              className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-0 bg-slate-900 border-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Box Email */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Email & Notifiche Postali</h4>
              <p className="text-xs text-slate-400">Invio comunicazioni formattate via posta elettronica agli atleti.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.emailEnabled}
              onChange={e => setFormState({ ...formState, emailEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelCls}>Nome Mittente Visualizzato</label>
            <input
              type="text"
              placeholder="Es. AC Coaching Team"
              value={formState.emailSenderName}
              onChange={e => setFormState({ ...formState, emailSenderName: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Indirizzo Email Mittente</label>
            <input
              type="email"
              placeholder="Es. coach@accoaching.it"
              value={formState.emailSenderAddress}
              onChange={e => setFormState({ ...formState, emailSenderAddress: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Prefisso Oggetto Email</label>
            <input
              type="text"
              placeholder="Es. [AC Coaching]"
              value={formState.emailSubjectPrefix}
              onChange={e => setFormState({ ...formState, emailSubjectPrefix: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Firma a piè di pagina</label>
            <input
              type="text"
              placeholder="Es. AC Coaching — Performance & Bodybuilding System"
              value={formState.emailFooterText}
              onChange={e => setFormState({ ...formState, emailFooterText: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Box WhatsApp */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">WhatsApp & Messaggistica Istantanea</h4>
              <p className="text-xs text-slate-400">Generazione deep-link e dispatch rapido per chat con atleti.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.whatsappEnabled}
              onChange={e => setFormState({ ...formState, whatsappEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelCls}>Prefisso Internazionale</label>
            <input
              type="text"
              placeholder="+39"
              value={formState.whatsappCountryCode}
              onChange={e => setFormState({ ...formState, whatsappCountryCode: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Numero Coach Principale</label>
            <input
              type="text"
              placeholder="+39 340 1234567"
              value={formState.whatsappCoachNumber}
              onChange={e => setFormState({ ...formState, whatsappCoachNumber: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Box Webhooks / Automazioni */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Webhook & Automazioni Esterne</h4>
              <p className="text-xs text-slate-400">Inoltro eventi di broadcast a endpoint server o servizi esterni.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.webhookEnabled}
              onChange={e => setFormState({ ...formState, webhookEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className={labelCls}>Endpoint Webhook URL</label>
            <input
              type="url"
              placeholder="https://api.tuodominio.it/webhooks/broadcast"
              value={formState.webhookUrl || ''}
              onChange={e => setFormState({ ...formState, webhookUrl: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Secret Key Autenticazione (Opzionale)</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={formState.webhookSecret || ''}
              onChange={e => setFormState({ ...formState, webhookSecret: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Salva Impostazioni */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.25)] transition-all"
        >
          <Save className="w-4 h-4" /> Salva Impostazioni Canali
        </button>
      </div>

    </form>
  );
};
