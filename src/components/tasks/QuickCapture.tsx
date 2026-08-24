import React, { useState, useRef } from 'react';
import { Plus, Zap, User, Dumbbell, Image, Briefcase } from 'lucide-react';
import { TaskType } from '../../types';

interface QuickCaptureProps {
  onCapture: (title: string, task_type: TaskType, dueDate?: string) => void;
}

const TYPE_OPTIONS: Array<{ value: TaskType; label: string; icon: React.FC<{ className?: string }>; color: string }> = [
  { value: 'personal',  label: 'Personale',      icon: User,      color: 'text-violet-400 bg-violet-500/15 border-violet-500/30 hover:border-violet-400' },
  { value: 'athlete',   label: 'Atleta',          icon: Dumbbell,  color: 'text-amber-400  bg-amber-500/15  border-amber-500/30  hover:border-amber-400'  },
  { value: 'content',   label: 'Contenuto',       icon: Image,     color: 'text-pink-400   bg-pink-500/15   border-pink-500/30   hover:border-pink-400'   },
  { value: 'admin',     label: 'Amministrazione', icon: Briefcase, color: 'text-slate-400  bg-slate-800     border-slate-700     hover:border-slate-500'  },
];

export const QuickCapture: React.FC<QuickCaptureProps> = ({ onCapture }) => {
  const [value, setValue] = useState('');
  const [selectedType, setSelectedType] = useState<TaskType>('personal');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onCapture(trimmed, selectedType);
    setValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-4 space-y-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Quick Capture
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {TYPE_OPTIONS.map(({ value: v, label, icon: Icon, color }) => (
          <button
            key={v}
            type="button"
            onClick={() => setSelectedType(v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black transition-all cursor-pointer ${
              selectedType === v
                ? color
                : 'text-slate-500 bg-transparent border-slate-800 hover:border-slate-700'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi una task, idea o promemoria..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs flex items-center gap-1 hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          Add
        </button>
      </form>
    </div>
  );
};
