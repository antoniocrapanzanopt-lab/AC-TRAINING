import React from 'react';
import { Card } from '../components/common/Card';
import { NavigationTab } from '../types';
import { Construction } from 'lucide-react';

interface PageContainerProps {
  tab: NavigationTab;
  title: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ tab, title }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-1">Sezione: {tab.replace('_', ' ').toUpperCase()}</p>
        </div>
      </div>

      <Card>
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center mb-4">
            <Construction className="w-7 h-7 text-[var(--color-primary)] animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm max-w-sm font-medium">
            Modulo in preparazione
          </p>
        </div>
      </Card>
    </div>
  );
};
