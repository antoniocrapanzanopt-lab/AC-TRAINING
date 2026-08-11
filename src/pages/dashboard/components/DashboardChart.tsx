import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity } from 'lucide-react';
import { usePayments } from '../../../context/PaymentsContext';
import { useAthletes } from '../../../context/AthletesContext';

const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-bold text-slate-300 mb-2 uppercase">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-black text-[var(--color-primary)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
            € {(payload[0]?.value || 0).toLocaleString('it-IT')} Incassi
          </p>
          <p className="text-sm font-black text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {payload[1]?.value || 0} Atleti
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardChart: React.FC = () => {
  const { payments } = usePayments();
  const { athletes } = useAthletes();

  // Calcolo dinamico degli ultimi 6 mesi basato sui dati reali
  const chartData = useMemo(() => {
    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = monthNamesShort[month];

      const monthStart = new Date(year, month, 1).toISOString();
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      // Somma incassi reali saldati in questo mese
      const monthIncassi = payments.reduce((sum, p) => {
        if (p.status === 'cancelled' || p.status === 'refunded') return sum;
        const pDate = p.paymentDate || p.paidDate;
        if (!pDate) return sum;
        if (pDate >= monthStart && pDate <= monthEnd) {
          return sum + (p.paidAmount || 0);
        }
        return sum;
      }, 0);

      // Atleti registrati fino a questo mese
      const monthAtleti = athletes.filter(a => {
        if (!a.createdAt) return true;
        return new Date(a.createdAt).getTime() <= new Date(monthEnd).getTime();
      }).length;

      result.push({
        name: label,
        incassi: monthIncassi,
        atleti: monthAtleti,
      });
    }

    return result;
  }, [payments, athletes]);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl relative overflow-hidden group">
      <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Andamento Crescita</h3>
            <p className="text-[10px] text-slate-400">Incassi e Atleti Attivi negli ultimi 6 mesi (Dati Reali)</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]"></span>
            <span className="text-[10px] font-bold text-slate-300 uppercase">Incassi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            <span className="text-[10px] font-bold text-slate-300 uppercase">Atleti</span>
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncassi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAtleti" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(value) => `€${value}`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="incassi" 
              stroke="var(--color-primary)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorIncassi)" 
              activeDot={{ r: 6, fill: "var(--color-primary)", stroke: "#000", strokeWidth: 2 }}
            />
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="atleti" 
              stroke="#34d399" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAtleti)"
              activeDot={{ r: 6, fill: "#34d399", stroke: "#000", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
