import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { AppNotification } from '../../types/notification';

interface NotificationToastProps {
  notification: AppNotification | null;
  onClose: () => void;
  onOpenAction?: (url: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onOpenAction,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000); // Chiudi automaticamente dopo 7 secondi

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const isCritical = notification.priority === 'critical';
  const isHigh = notification.priority === 'high';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto select-none">
      <div
        className={`p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl transition-all ${
          isCritical
            ? 'bg-rose-950/90 border-rose-500/50 shadow-rose-500/20'
            : isHigh
            ? 'bg-amber-950/90 border-amber-500/50 shadow-amber-500/20'
            : 'bg-slate-900/95 border-slate-700 shadow-black/60'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icona Priorità */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isCritical
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isHigh
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : isHigh ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          {/* Testo Notifica */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isCritical
                    ? 'bg-rose-500/30 text-rose-200'
                    : isHigh
                    ? 'bg-amber-500/30 text-amber-200'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isCritical ? 'Critico' : isHigh ? 'Urgente' : 'In Tempo Reale'}
              </span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-xs font-bold text-white truncate">{notification.title}</h4>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
              {notification.body}
            </p>

            {notification.action_url && onOpenAction && (
              <button
                onClick={() => {
                  onOpenAction(notification.action_url!);
                  onClose();
                }}
                className="mt-2 text-[11px] font-black text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Apri dettaglio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
