import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  Download,
  Printer,
  Bookmark,
  Filter,
  Users,
  CreditCard,
  RefreshCw,
  Info,
  Trash2,
  Package,
  UserCheck,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { usePayments } from '../../context/PaymentsContext';
import { useRenewals } from '../../context/RenewalsContext';
import { usePackages } from '../../context/PackagesContext';
import { useToast } from '../../context/ToastContext';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { getStorageItem, setStorageItem } from '../../lib/storage';
import { SavedReportConfig } from '../../types';

// Palette colori coordinata al tema (Giallo Oro, Smeraldo, Sky, Viola, Ambra, Rosso)
const COLORS = ['#EAB308', '#10B981', '#38BDF8', '#A855F7', '#F59E0B', '#EF4444', '#64748B'];

export const ReportsPage: React.FC = () => {
  const { athletes } = useAthletes();
  const { subscriptions } = useSubscriptions();
  const { payments } = usePayments();
  const { renewals } = useRenewals();
  const { packages } = usePackages();
  const { showSuccess, showInfo } = useToast();

  // Stato Filtri
  const now = new Date();
  const startOfYear = `${now.getFullYear()}-01-01`;
  const todayStr = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(startOfYear);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('all');
  const [savedConfigs, setSavedConfigs] = useState<SavedReportConfig[]>([]);

  // Caricamento configurazioni salvate
  useEffect(() => {
    const saved = getStorageItem<SavedReportConfig[]>(STORAGE_KEYS.SAVED_REPORTS, []);
    setSavedConfigs(saved);
  }, []);

  // Preset temporali veloci
  const applyPreset = (preset: 'month' | '90days' | 'year' | 'all') => {
    const d = new Date();
    if (preset === 'month') {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === '90days') {
      const past = new Date(d.getTime() - 90 * 86400000).toISOString().slice(0, 10);
      setStartDate(past);
      setEndDate(todayStr);
    } else if (preset === 'year') {
      setStartDate(`${d.getFullYear()}-01-01`);
      setEndDate(todayStr);
    } else {
      setStartDate('2020-01-01');
      setEndDate(todayStr);
    }
  };

  // ─── 1. ELABORAZIONE DATI FILTRATI ───────────────────────────────────────────

  // Filtro Atleti
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      if (selectedCoachId !== 'all' && !a.assignedCoachIds?.includes(selectedCoachId)) return false;
      return true;
    });
  }, [athletes, selectedCoachId]);

  // Filtro Pagamenti
  const filteredPayments = useMemo(() => {
    const athleteIds = new Set(filteredAthletes.map(a => a.id));
    return payments.filter(p => {
      if (!athleteIds.has(p.athleteId)) return false;
      const dateToUse = p.paymentDate || p.paidDate || p.dueDate;
      if (startDate && dateToUse < startDate) return false;
      if (endDate && dateToUse > endDate) return false;
      return true;
    });
  }, [payments, filteredAthletes, startDate, endDate]);

  // Filtro Abbonamenti
  const filteredSubscriptions = useMemo(() => {
    const athleteIds = new Set(filteredAthletes.map(a => a.id));
    return subscriptions.filter(s => {
      if (!athleteIds.has(s.athleteId)) return false;
      if (selectedPackageId !== 'all' && s.packageId !== selectedPackageId) return false;
      if (startDate && s.startDate < startDate) return false;
      if (endDate && s.startDate > endDate) return false;
      return true;
    });
  }, [subscriptions, filteredAthletes, selectedPackageId, startDate, endDate]);

  // Filtro Rinnovi
  const filteredRenewals = useMemo(() => {
    const athleteIds = new Set(filteredAthletes.map(a => a.id));
    return renewals.filter(r => {
      if (!athleteIds.has(r.athleteId)) return false;
      if (startDate && r.endDate < startDate) return false;
      if (endDate && r.endDate > endDate) return false;
      return true;
    });
  }, [renewals, filteredAthletes, startDate, endDate]);

  // ─── 2. DATI GRAFICI ─────────────────────────────────────────────────────────

  // Grafico 1 & 2: Incassi Mensili e Previsto vs Incassato per Mese
  const monthlyFinancialData = useMemo(() => {
    const monthMap: Record<string, { month: string; incassato: number; previsto: number; insoluto: number }> = {};

    filteredPayments.forEach(p => {
      if (p.status === 'cancelled' || p.status === 'refunded') return;

      const dateStr = p.paymentDate || p.paidDate || p.dueDate;
      const monthKey = dateStr.slice(0, 7); // YYYY-MM

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, incassato: 0, previsto: 0, insoluto: 0 };
      }

      const netPaid = Math.max(0, p.paidAmount - (p.refundedAmount || 0));
      monthMap[monthKey].incassato += netPaid;
      monthMap[monthKey].previsto += p.expectedAmount;
      monthMap[monthKey].insoluto += p.residualAmount;
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredPayments]);

  // Grafico 3: Nuovi Atleti Iscritti per Mese
  const newAthletesTrendData = useMemo(() => {
    const monthMap: Record<string, number> = {};

    filteredAthletes.forEach(a => {
      const monthKey = a.createdAt.slice(0, 7);
      if (startDate && monthKey < startDate.slice(0, 7)) return;
      if (endDate && monthKey > endDate.slice(0, 7)) return;

      monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
    });

    return Object.keys(monthMap)
      .sort()
      .map(month => ({ month, conteggio: monthMap[month] }));
  }, [filteredAthletes, startDate, endDate]);

  // Grafico 4: Distribuzione Esito Rinnovi
  const renewalsStatusData = useMemo(() => {
    const statusMap: Record<string, number> = {};

    filteredRenewals.forEach(r => {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
    });

    const labels: Record<string, string> = {
      to_contact: 'Da Contattare',
      contacted: 'Contattato',
      interested: 'Interessato',
      evaluating: 'In Valutazione',
      confirmed: 'Confermato',
      renewed: 'Rinnovato',
      not_renewed: 'Non Rinnovato',
      unreachable: 'Irraggiungibile',
      postponed: 'Rinviato',
    };

    return Object.keys(statusMap).map(status => ({
      name: labels[status] || status,
      value: statusMap[status],
    }));
  }, [filteredRenewals]);

  // Grafico 5: Distribuzione Stati Atleti
  const athleteStatusData = useMemo(() => {
    const statusMap: Record<string, number> = {};

    filteredAthletes.forEach(a => {
      statusMap[a.status] = (statusMap[a.status] || 0) + 1;
    });

    const labels: Record<string, string> = {
      active: 'Attivi',
      trial: 'In Prova',
      suspended: 'Sospesi',
      lead: 'Lead / Potenziali',
      inactive: 'Inattivi',
      archived: 'Archiviati',
    };

    return Object.keys(statusMap).map(status => ({
      name: labels[status] || status,
      value: statusMap[status],
    }));
  }, [filteredAthletes]);

  // Grafico 6: Abbonamenti per Pacchetto
  const packageDistributionData = useMemo(() => {
    const pkgMap: Record<string, number> = {};

    filteredSubscriptions.forEach(s => {
      const name = s.packageName || 'Pacchetto Non Definito';
      pkgMap[name] = (pkgMap[name] || 0) + 1;
    });

    return Object.keys(pkgMap).map(name => ({
      name,
      conteggio: pkgMap[name],
    }));
  }, [filteredSubscriptions]);

  // Totali Finanziari Sintetici per Tabella
  const financialTotals = useMemo(() => {
    const incassato = filteredPayments.reduce((sum, p) => p.status !== 'cancelled' && p.status !== 'refunded' ? sum + Math.max(0, p.paidAmount - (p.refundedAmount || 0)) : sum, 0);
    const previsto = filteredPayments.reduce((sum, p) => p.status !== 'cancelled' && p.status !== 'refunded' ? sum + p.expectedAmount : sum, 0);
    const residuo = filteredPayments.reduce((sum, p) => p.status !== 'cancelled' && p.status !== 'refunded' ? sum + p.residualAmount : sum, 0);
    const ratePercentage = previsto > 0 ? ((incassato / previsto) * 100).toFixed(1) : '0';

    return { incassato, previsto, residuo, ratePercentage };
  }, [filteredPayments]);

  // ─── 3. AZIONI: CSV, STAMPA E SALVATAGGIO CONFIG ──────────────────────────────

  const handleExportCSV = () => {
    if (monthlyFinancialData.length === 0) {
      showInfo('Nessun dato', 'Non ci sono dati da esportare nel periodo selezionato.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Mese;Incassato Netto (EUR);Previsto (EUR);Insoluto (EUR)\n';
    monthlyFinancialData.forEach(row => {
      csvContent += `${row.month};${row.incassato.toFixed(2)};${row.previsto.toFixed(2)};${row.insoluto.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `report_finanziario_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('CSV Esportato', 'Il report finanziario è stato scaricato con successo.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveConfig = () => {
    const title = prompt('Inserisci un nome per la configurazione del report:', `Report ${startDate} - ${endDate}`);
    if (!title) return;

    const newConfig: SavedReportConfig = {
      id: `rep-${Date.now()}`,
      title,
      startDate,
      endDate,
      coachId: selectedCoachId,
      packageId: selectedPackageId,
      createdAt: new Date().toISOString(),
    };

    const updated = [newConfig, ...savedConfigs];
    setSavedConfigs(updated);
    setStorageItem(STORAGE_KEYS.SAVED_REPORTS, updated);
    showSuccess('Configurazione Salvata', `Configurazione "${title}" salvata con successo.`);
  };

  const handleDeleteConfig = (id: string) => {
    const updated = savedConfigs.filter(c => c.id !== id);
    setSavedConfigs(updated);
    setStorageItem(STORAGE_KEYS.SAVED_REPORTS, updated);
    showInfo('Eliminato', 'Configurazione salvata rimossa.');
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div className="space-y-8 print:space-y-4 print:p-0">
      {/* Disclaimer Legale Obbligatorio */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3 print:hidden shadow-lg">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider block text-[11px] text-amber-400">
            DOCUMENTO DIMOSTRATIVO — NON FISCALE
          </span>
          I report ed i grafici generati hanno scopo puramente didattico ed analitico per la gestione della palestra. Non costituiscono documentazione contabile o fiscale ufficiale.
        </div>
      </div>

      {/* Header & Titolo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-[var(--color-primary)]" /> Report e Statistiche
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Analisi dettagliata delle performance finanziarie, tassi di conversione atleti e distribuzione abbonamenti.
          </p>
        </div>

        {/* Pulsanti Azione */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={handleSaveConfig}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:border-[var(--color-primary)] transition-all shadow"
          >
            <Bookmark className="w-4 h-4 text-[var(--color-primary)]" /> Salva Config
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:border-emerald-400 transition-all shadow"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Esporta CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            <Printer className="w-4 h-4" /> Stampa Report
          </button>
        </div>
      </div>

      {/* BARRA FILTRI ED INTERVALLO DATE */}
      <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-primary)]" /> Filtri di Analisi
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={() => applyPreset('month')} className="px-2.5 py-1 rounded-lg bg-slate-900 text-[10px] font-bold text-slate-300 hover:text-white border border-slate-800">
              Questo Mese
            </button>
            <button onClick={() => applyPreset('90days')} className="px-2.5 py-1 rounded-lg bg-slate-900 text-[10px] font-bold text-slate-300 hover:text-white border border-slate-800">
              Ultimi 90 giorni
            </button>
            <button onClick={() => applyPreset('year')} className="px-2.5 py-1 rounded-lg bg-slate-900 text-[10px] font-bold text-slate-300 hover:text-white border border-slate-800">
              Anno in corso
            </button>
            <button onClick={() => applyPreset('all')} className="px-2.5 py-1 rounded-lg bg-slate-900 text-[10px] font-bold text-slate-300 hover:text-white border border-slate-800">
              Tutti i Dati
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Da Data */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Da Data</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* A Data */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">A Data</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Filtro Coach */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Coach Responsabile</label>
            <select
              value={selectedCoachId}
              onChange={e => setSelectedCoachId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">Tutti i Coach</option>
              {/* Estraiamo i coach univoci dagli atleti */}
              {Array.from(new Set(athletes.flatMap(a => a.assignedCoachIds || []))).map(coachId => (
                <option key={coachId} value={coachId}>
                  {coachId}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Pacchetto */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pacchetto / Abbonamento</label>
            <select
              value={selectedPackageId}
              onChange={e => setSelectedPackageId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">Tutti i Pacchetti</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Salvati in localStorage */}
        {savedConfigs.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">Report Salvati:</span>
            {savedConfigs.map(cfg => (
              <div key={cfg.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 shrink-0">
                <button
                  onClick={() => {
                    setStartDate(cfg.startDate);
                    setEndDate(cfg.endDate);
                    setSelectedCoachId(cfg.coachId);
                    setSelectedPackageId(cfg.packageId);
                    showSuccess('Configurazione Caricata', `Applicati i filtri di "${cfg.title}"`);
                  }}
                  className="hover:text-[var(--color-primary)] font-semibold"
                >
                  {cfg.title}
                </button>
                <button onClick={() => handleDeleteConfig(cfg.id)} className="text-slate-500 hover:text-red-400 ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TABELLA RIEPILOGO METRICHE FINANZIARIE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Incassato Netto</span>
          <span className="text-xl font-black text-emerald-400 block mt-1">{formatPrice(financialTotals.incassato)}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Entrate Previste</span>
          <span className="text-xl font-black text-white block mt-1">{formatPrice(financialTotals.previsto)}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Residuo Insoluto</span>
          <span className="text-xl font-black text-amber-400 block mt-1">{formatPrice(financialTotals.residuo)}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Tasso di Incasso</span>
          <span className="text-xl font-black text-[var(--color-primary)] block mt-1">{financialTotals.ratePercentage}%</span>
        </div>
      </div>

      {/* GRIGLIA GRAFICI (2x3 RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAFICO 1: Incassi Mensili */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Incassi Mensili Saldate
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Valori in EUR</span>
          </div>

          {monthlyFinancialData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Nessun incasso registrato nel periodo selezionato.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFinancialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [`€ ${val.toFixed(2)}`, 'Incassato Netto']}
                  />
                  <Bar dataKey="incassato" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRAFICO 2: Previsto contro Incassato */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--color-primary)]" /> Previsto vs Incassato
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Confronto Mensile</span>
          </div>

          {monthlyFinancialData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Nessun dato finanziario per il periodo.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyFinancialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number, name: string) => [`€ ${val.toFixed(2)}`, name === 'previsto' ? 'Previsto' : 'Incassato']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="previsto" fill="#334155" radius={[6, 6, 0, 0]} name="Previsto" />
                  <Area type="monotone" dataKey="incassato" fill="#EAB308" stroke="#EAB308" fillOpacity={0.2} name="Incassato" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRAFICO 3: Nuovi Atleti Iscritti */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Nuovi Atleti Iscritti
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Trend per Mese</span>
          </div>

          {newAthletesTrendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Nessuna nuova iscrizione registrata nel periodo.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newAthletesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val} atleti`, 'Iscritti']}
                  />
                  <Line type="monotone" dataKey="conteggio" stroke="#38BDF8" strokeWidth={3} dot={{ fill: '#38BDF8', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRAFICO 4: Distribuzione Stati Atleti */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" /> Distribuzione Stati Atleti
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Proporzioni Totali</span>
          </div>

          {athleteStatusData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Nessun atleta registrato.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val} atleti`, 'Totale']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Pie
                    data={athleteStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {athleteStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRAFICO 5: Esito Rinnovi */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-yellow-400" /> Esito Trattative Rinnovo
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Fidelizzazione</span>
          </div>

          {renewalsStatusData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Nessuna trattativa di rinnovo nel periodo.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val} trattative`, 'Conteggio']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Pie
                    data={renewalsStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {renewalsStatusData.map((_, index) => (
                      <Cell key={`cell-ren-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRAFICO 6: Abbonamenti per Pacchetto */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--color-primary)]" /> Abbonamenti per Pacchetto
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Volume Servizi</span>
          </div>

          {packageDistributionData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">Nessun abbonamento attivo o registrato.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packageDistributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={10} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [`${val} abbonamenti`, 'Quantità']}
                  />
                  <Bar dataKey="conteggio" fill="#EAB308" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
