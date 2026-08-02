import React, { useState } from 'react';
import { Info, Database, ShieldAlert, Check } from 'lucide-react';
import { Modal } from './Modal';

export const DemoBanner: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Banner Sottile in alto */}
      <div className="bg-[var(--color-primary)]/10 border-b border-[var(--color-primary)]/30 text-[var(--color-primary)] px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 truncate">
          <Database className="w-4 h-4 shrink-0" />
          <span className="truncate tracking-wide uppercase">
            MODALITÀ DEMO — DATI SALVATI LOCALMENTE NEL BROWSER
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-black font-bold text-[11px] hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Info Demo</span>
        </button>
      </div>

      {/* Modale Informativa sulla Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Informazioni sulla Modalità Demo"
        footer={
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Ho capito
          </button>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-300 text-xs">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Avviso importante sui dati</p>
              <p className="text-amber-200/90 leading-relaxed">
                Non inserire dati personali, medici o finanziari reali in questa applicazione.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span><strong>Nessun database reale:</strong> Non è collegato alcun database cloud o remoto (es. Supabase, Firebase).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span><strong>Salvataggio in locale:</strong> Tutti i dati inseriti o modificati vengono conservati esclusivamente nel `localStorage` del browser.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span><strong>Cancellazione dei dati:</strong> I dati possono essere eliminati in qualsiasi momento svuotando la memoria del browser.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span><strong>Autenticazione e Integrazioni simulate:</strong> Le funzioni di login, invio comunicazioni ed esportazioni sono puramente dimostrative.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span><strong>Scopo del progetto:</strong> Applicazione a finalità esclusivamente didattica e dimostrativa per coach e preparatori atletici.</span>
            </li>
          </ul>
        </div>
      </Modal>
    </>
  );
};
