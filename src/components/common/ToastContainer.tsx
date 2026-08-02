import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ToastMessage } from '../../types';

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
  error: 'bg-red-950/90 border-red-500/50 text-red-200 shadow-red-950/50',
  warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
  info: 'bg-slate-900/90 border-slate-700 text-slate-200',
};

const iconColors = {
  success: 'text-emerald-400',
  error: 'text-red-500',
  warning: 'text-amber-400',
  info: 'text-sky-400',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast: ToastMessage) => {
        const Icon = toastIcons[toast.type];
        const style = toastStyles[toast.type];
        const iconColor = iconColors[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${style}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-white leading-tight">{toast.title}</h4>
              {toast.message && <p className="text-xs opacity-90 mt-1 leading-relaxed">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Chiudi notifica"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
