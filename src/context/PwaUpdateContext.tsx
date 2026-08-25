import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export type PwaUpdateEventType =
  | 'update_detected'
  | 'update_deferred'
  | 'update_applied'
  | 'update_failed';

export interface PwaDiagnosticLog {
  id: string;
  type: PwaUpdateEventType;
  timestamp: string;
  details?: string;
  version?: string;
}

const STORAGE_DIAGNOSTIC_LOGS_KEY = 'ac_pwa_diagnostic_logs';
const STORAGE_RELOAD_FLAG_KEY = 'ac_pwa_reload_triggered';

interface PwaUpdateContextType {
  hasUpdate: boolean;
  isUpdating: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  updateNow: (force?: boolean) => boolean;
  dismissUpdate: () => void;
  checkForUpdate: () => Promise<void>;
  buildVersion: string;
  builtAt: string;
  diagnosticLogs: PwaDiagnosticLog[];
  clearDiagnosticLogs: () => void;
  registration: ServiceWorkerRegistration | null;
}

const PwaUpdateContext = createContext<PwaUpdateContextType | undefined>(undefined);

export const PwaUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [diagnosticLogs, setDiagnosticLogs] = useState<PwaDiagnosticLog[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DIAGNOSTIC_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadTriggeredRef = useRef<boolean>(false);

  // Metadata di build
  const buildVersion = typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : 'dev';
  const builtAt = typeof __APP_BUILD_TIMESTAMP__ !== 'undefined' ? __APP_BUILD_TIMESTAMP__ : new Date().toISOString();

  // ─── HELPER PER IL LOGGING DIAGNOSTICO ───────────────────────────────────
  const logDiagnosticEvent = useCallback(
    (type: PwaUpdateEventType, details?: string) => {
      const newLog: PwaDiagnosticLog = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        timestamp: new Date().toISOString(),
        details,
        version: buildVersion,
      };

      setDiagnosticLogs((prev) => {
        const updated = [newLog, ...prev].slice(0, 30);
        try {
          localStorage.setItem(STORAGE_DIAGNOSTIC_LOGS_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      console.log(`[PWA Engine: ${type}]`, details || '');
    },
    [buildVersion]
  );

  const clearDiagnosticLogs = useCallback(() => {
    setDiagnosticLogs([]);
    try {
      localStorage.removeItem(STORAGE_DIAGNOSTIC_LOGS_KEY);
    } catch {}
  }, []);

  // ─── 1. PROTEZIONE RELOAD ANTI-LOOP ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Reset eventuale flag reload rimasto da sessioni precedenti dopo 10 secondi
    const lastReload = sessionStorage.getItem(STORAGE_RELOAD_FLAG_KEY);
    if (lastReload && Date.now() - parseInt(lastReload, 10) > 10000) {
      sessionStorage.removeItem(STORAGE_RELOAD_FLAG_KEY);
    }

    const handleControllerChange = () => {
      // Se il reload è già stato innescato, blocca ulteriori chiamate duplicate
      if (reloadTriggeredRef.current) return;
      
      const sessionReload = sessionStorage.getItem(STORAGE_RELOAD_FLAG_KEY);
      if (sessionReload && Date.now() - parseInt(sessionReload, 10) < 6000) {
        return;
      }

      reloadTriggeredRef.current = true;
      sessionStorage.setItem(STORAGE_RELOAD_FLAG_KEY, Date.now().toString());

      logDiagnosticEvent('update_applied', 'Service Worker attivato con successo. Esecuzione reload.');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [logDiagnosticEvent]);

  // ─── 2. SEGNALAZIONE UPDATE PRONTO ───────────────────────────────────────
  const notifyUpdateReady = useCallback(
    (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker;
      setHasUpdate(true);
      logDiagnosticEvent('update_detected', 'Nuovo worker scaricato in attesa di autorizzazione.');
    },
    [logDiagnosticEvent]
  );

  // ─── 3. INIZIALIZZAZIONE SERVICE WORKER ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let mounted = true;

    const initServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (!mounted) return;
        setRegistration(reg);

        // Se c'è già un worker in attesa
        if (reg.waiting) {
          notifyUpdateReady(reg.waiting);
        }

        // Ascolto nuovi update
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                notifyUpdateReady(installingWorker);
              }
            }
          });
        });

        // Controllo immediato all'avvio
        reg.update().catch((err) => {
          logDiagnosticEvent('update_failed', `Check update iniziale fallito: ${err?.message || 'offline'}`);
        });
      } catch (err: any) {
        logDiagnosticEvent('update_failed', `Registrazione SW fallita: ${err?.message || 'errore'}`);
      }
    };

    if (document.readyState === 'complete') {
      initServiceWorker();
    } else {
      window.addEventListener('load', initServiceWorker, { once: true });
    }

    return () => {
      mounted = false;
    };
  }, [notifyUpdateReady, logDiagnosticEvent]);

  // ─── 4. CONTROLLO PERIODICO & RESUME PWA (ANDROID & IOS) ──────────────────
  useEffect(() => {
    if (!registration) return;

    const triggerCheck = () => {
      try {
        registration.update().catch(() => {
          // Se offline, non logghiamo per non inquinare la diagnostica
        });
      } catch (_) {}
    };

    // Al resume da background (Home Screen PWA Android / iOS)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerCheck();
      }
    };

    const handleFocus = () => triggerCheck();
    const handleOnline = () => triggerCheck();

    // Intervallo di controllo ogni 15 minuti
    const intervalId = setInterval(triggerCheck, 15 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [registration]);

  // ─── 5. APPLICAZIONE AGGIORNAMENTO SICURO (CON SALVAGUARDIA DATI) ─────────
  const updateNow = useCallback(
    (force = false): boolean => {
      // Blocco di sicurezza se l'utente ha modifiche non salvate
      if (hasUnsavedChanges && !force) {
        logDiagnosticEvent(
          'update_deferred',
          'Aggiornamento posticipato: l\'utente ha modifiche non salvate in corso.'
        );
        return false;
      }

      setIsUpdating(true);
      const worker = waitingWorkerRef.current || registration?.waiting;

      if (worker) {
        logDiagnosticEvent('update_applied', 'Invio segnale SKIP_WAITING al worker.');
        worker.postMessage({ type: 'SKIP_WAITING' });

        // Fallback timer di sicurezza nel caso in cui controllerchange tardi
        setTimeout(() => {
          if (!reloadTriggeredRef.current) {
            reloadTriggeredRef.current = true;
            sessionStorage.setItem(STORAGE_RELOAD_FLAG_KEY, Date.now().toString());
            window.location.reload();
          }
        }, 2200);
      } else {
        if (!reloadTriggeredRef.current) {
          reloadTriggeredRef.current = true;
          sessionStorage.setItem(STORAGE_RELOAD_FLAG_KEY, Date.now().toString());
          window.location.reload();
        }
      }

      return true;
    },
    [hasUnsavedChanges, registration, logDiagnosticEvent]
  );

  // ─── 6. POSTICIPA AGGIORNAMENTO ──────────────────────────────────────────
  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
    logDiagnosticEvent('update_deferred', 'L\'utente ha cliccato "Più tardi" o chiuso il banner.');
  }, [logDiagnosticEvent]);

  // ─── 7. CONTROLLO MANUALE ─────────────────────────────────────────────────
  const checkForUpdate = useCallback(async () => {
    if (registration) {
      try {
        await registration.update();
      } catch (err: any) {
        logDiagnosticEvent('update_failed', `Check manuale fallito: ${err?.message || 'offline'}`);
      }
    }
  }, [registration, logDiagnosticEvent]);

  return (
    <PwaUpdateContext.Provider
      value={{
        hasUpdate,
        isUpdating,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        updateNow,
        dismissUpdate,
        checkForUpdate,
        buildVersion,
        builtAt,
        diagnosticLogs,
        clearDiagnosticLogs,
        registration,
      }}
    >
      {children}
    </PwaUpdateContext.Provider>
  );
};

export const usePwaUpdate = (): PwaUpdateContextType => {
  const context = useContext(PwaUpdateContext);
  if (!context) {
    throw new Error('usePwaUpdate must be used within a PwaUpdateProvider');
  }
  return context;
};
