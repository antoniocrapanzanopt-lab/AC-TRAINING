import React from 'react';
import { Dumbbell, UserCheck } from 'lucide-react';

interface RoleSelectionProps {
  selectedRole: 'coach' | 'athlete';
  onSelectRole: (role: 'coach' | 'athlete') => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({
  selectedRole,
  onSelectRole,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
      <button
        type="button"
        onClick={() => onSelectRole('athlete')}
        className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
          selectedRole === 'athlete'
            ? 'bg-[var(--color-primary)] text-black shadow-lg shadow-[var(--color-primary)]/20 font-black'
            : 'text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
      >
        <Dumbbell className="w-4 h-4" />
        <span>🏋️ Sono un Atleta</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectRole('coach')}
        className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
          selectedRole === 'coach'
            ? 'bg-[var(--color-primary)] text-black shadow-lg shadow-[var(--color-primary)]/20 font-black'
            : 'text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
      >
        <UserCheck className="w-4 h-4" />
        <span>👨‍🏫 Sono un Coach</span>
      </button>
    </div>
  );
};
