import React from 'react';
import { Download, Upload } from 'lucide-react';

interface BackupSettingsTabProps {
  onExportBackup: () => void;
  onSelectImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BackupSettingsTab: React.FC<BackupSettingsTabProps> = ({
  onExportBackup,
  onSelectImportFile,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-[var(--color-primary)]" /> Esportazione & Importazione Backup JSON
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase">Gestione Dati Transazionale</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Esportazione */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" /> Esporta Backup Dati App (.JSON)
          </h4>
          <p className="text-xs text-slate-400">
            Raccoglie esclusivamente le chiavi dell'applicazione e genera un file JSON con data di salvataggio nel nome.
          </p>
          <button
            onClick={onExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition-all shadow"
          >
            <Download className="w-4 h-4" /> Scarica Backup Completo (.JSON)
          </button>
        </div>

        {/* Importazione */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-sky-400" /> Importa Backup da File (.JSON)
          </h4>
          <p className="text-xs text-slate-400">
            Seleziona un file JSON. Il sistema verificherà le chiavi dell'app, mostrerà un'anteprima e procederà all'importazione transazionale con rollback in caso di errore.
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 text-black font-black text-xs hover:bg-sky-400 transition-all shadow cursor-pointer">
            <Upload className="w-4 h-4" /> Seleziona File JSON da Importare
            <input type="file" accept=".json" onChange={onSelectImportFile} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
