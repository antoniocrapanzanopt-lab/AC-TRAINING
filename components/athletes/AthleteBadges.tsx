import React from 'react';
import {
  AthleteStatus,
  AthletePaymentStatus,
  ContactChannel,
  AcquisitionSource,
} from '../../types';

// ─── Etichette leggibili ───────────────────────────────────────────────────────

export const athleteStatusLabel: Record<AthleteStatus, string> = {
  active: 'Attivo',
  inactive: 'Non attivo',
  suspended: 'Sospeso',
  archived: 'Archiviato',
  trial: 'Periodo di prova',
};

export const paymentStatusLabel: Record<AthletePaymentStatus, string> = {
  regular: 'In regola',
  expiring: 'In scadenza',
  overdue: 'Scaduto',
  suspended: 'Sospeso',
  none: 'Nessun abbonamento',
};

export const contactChannelLabel: Record<ContactChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  telegram: 'Telegram',
  phone: 'Telefono',
  instagram: 'Instagram',
  other: 'Altro',
};

export const acquisitionSourceLabel: Record<AcquisitionSource, string> = {
  referral: 'Passaparola',
  social: 'Social media',
  website: 'Sito web',
  direct: 'Contatto diretto',
  event: 'Evento / Fiera',
  advertising: 'Pubblicità',
  other: 'Altro',
};

// ─── Badge Stato Atleta ────────────────────────────────────────────────────────

const athleteStatusColors: Record<AthleteStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  inactive: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
  suspended: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  archived: 'bg-slate-800/60 text-slate-500 border-slate-700/30',
  trial: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

const defaultStatusColor = 'bg-slate-700/50 text-slate-400 border-slate-600/30';

export const AthleteStatusBadge: React.FC<{ status?: AthleteStatus }> = ({ status }) => {
  const safeStatus = status || 'active';
  const label = athleteStatusLabel[safeStatus as AthleteStatus] ?? safeStatus ?? 'Attivo';
  const color = athleteStatusColors[safeStatus as AthleteStatus] ?? defaultStatusColor;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
      {label}
    </span>
  );
};

// ─── Badge Pagamento ───────────────────────────────────────────────────────────

const paymentStatusColors: Record<AthletePaymentStatus, string> = {
  regular: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  expiring: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/30',
  suspended: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  none: 'bg-slate-700/50 text-slate-500 border-slate-600/30',
};

const defaultPaymentColor = 'bg-slate-700/50 text-slate-500 border-slate-600/30';

export const PaymentStatusBadge: React.FC<{ status?: AthletePaymentStatus }> = ({ status }) => {
  const safeStatus = status || 'none';
  const label = paymentStatusLabel[safeStatus as AthletePaymentStatus] ?? safeStatus ?? 'Nessun abbonamento';
  const color = paymentStatusColors[safeStatus as AthletePaymentStatus] ?? defaultPaymentColor;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
      {label}
    </span>
  );
};


