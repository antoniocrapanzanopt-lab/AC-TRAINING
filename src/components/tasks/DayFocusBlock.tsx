import React, { useState, useRef } from 'react';
import { Target, Pencil, Check, X } from 'lucide-react';

interface DayFocusBlockProps {
  focus: string;
  onChange: (value: string) => void;
}

export const DayFocusBlock: React.FC<DayFocusBlockProps> = ({ focus, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(focus);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(focus);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirm = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(focus);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') cancel();
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-primary)]/5 to-transparent border border-[var(--color-primary)]/25 p-4 flex items-center gap-3 shadow-lg group overflow-hidden">
      {/* Glow decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none" />

      <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 shadow-inner">
        <Target className="w-4.5 h-4.5 text-[var(--color-primary)]" />
      </div>

      <div className="flex-1 min-w-0 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]/70 block mb-0.5">
          Focus del Giorno
        </span>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cosa vuoi realizzare oggi?"
            className="w-full text-sm font-bold text-white bg-transparent border-b border-[var(--color-primary)]/50 focus:outline-none focus:border-[var(--color-primary)] placeholder-slate-500 pb-0.5"
          />
        ) : (
          <p
            onClick={startEdit}
            className={`text-sm font-bold leading-snug truncate cursor-text ${
              focus ? 'text-white' : 'text-slate-500 italic'
            }`}
          >
            {focus || 'Scrivi il tuo focus per oggi...'}
          </p>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1 shrink-0 z-10">
          <button
            type="button"
            onClick={confirm}
            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>
          <button
            type="button"
            onClick={cancel}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="p-1.5 rounded-lg text-slate-600 hover:text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 z-10"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
