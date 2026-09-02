import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types';

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        timestamp: Date.now(),
      };

      setToasts((prev) => {
        // Evita duplicati identici già a schermo
        const filtered = prev.filter((t) => t.title !== title);
        // Mantieni al massimo le ultime 2 notifiche
        return [...filtered.slice(-1), newToast];
      });

      // Autochiusura dopo 2.5 secondi
      setTimeout(() => {
        removeToast(id);
      }, 2500);
    },
    [removeToast]
  );

  const showSuccess = useCallback((title: string, message?: string) => addToast('success', title, message), [addToast]);
  const showError = useCallback((title: string, message?: string) => addToast('error', title, message), [addToast]);
  const showInfo = useCallback((title: string, message?: string) => addToast('info', title, message), [addToast]);
  const showWarning = useCallback((title: string, message?: string) => addToast('warning', title, message), [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve essere utilizzato all\'interno di un ToastProvider');
  }
  return context;
};
