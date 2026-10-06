import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { ContractDossierView } from './ContractDossierView';
import { AthleteSignedContract } from '../../types/contract';

interface ContractSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName: string;
  athleteBirthDate?: string;
  athleteBirthPlace?: string;
  athleteAddress?: string;
  athleteFiscalCode?: string;
  readOnly?: boolean;
  onSignedSuccess?: (signed: AthleteSignedContract) => void;
}

export const ContractSignatureModal: React.FC<ContractSignatureModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  athleteName,
  athleteBirthDate,
  athleteBirthPlace,
  athleteAddress,
  athleteFiscalCode,
  readOnly = false,
  onSignedSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modale */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Fascicolo Contrattuale &amp; Patto di Testimonianza
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                AC Coaching — Sottoscrizione digitale accordi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo con scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <ContractDossierView
            athleteId={athleteId}
            athleteName={athleteName}
            athleteBirthDate={athleteBirthDate}
            athleteBirthPlace={athleteBirthPlace}
            athleteAddress={athleteAddress}
            athleteFiscalCode={athleteFiscalCode}
            readOnly={readOnly}
            onSignedSuccess={(s) => {
              if (onSignedSuccess) onSignedSuccess(s);
            }}
          />
        </div>
      </div>
    </div>
  );
};
