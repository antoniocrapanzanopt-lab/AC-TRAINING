import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Auto-focus sul primo elemento o sul contenitore
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelector<HTMLElement>(
            'input, select, textarea, button:not([aria-label="Chiudi finestra"])'
          );
          if (focusable) {
            focusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-heading"
    >
      {/* Overlay sfocato di sfondo */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Contenitore della modale */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl w-full max-w-lg shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden focus:outline-none"
      >
        {/* Header Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)]">
          <h3 id="modal-title-heading" className="text-lg font-bold text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
            aria-label="Chiudi finestra modale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo della Modale */}
        <div className="p-6 overflow-y-auto text-sm text-slate-300 flex-1 leading-relaxed">
          {children}
        </div>

        {/* Footer Modale (Opzionale) */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-panel-border)] bg-slate-900/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
