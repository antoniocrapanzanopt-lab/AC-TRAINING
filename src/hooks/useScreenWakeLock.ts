import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Mantiene sempre acceso lo schermo dello smartphone mentre l'atleta
 * si trova nel Portale Atleta o esegue l'allenamento (Screen Wake Lock API).
 * Ri-acquisisce automaticamente il blocco quando l'app torna in primo piano
 * o al primo tocco dell'utente.
 */
export const useScreenWakeLock = (enabled: boolean = true): void => {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    let isMounted = true;
    const nav = navigator as unknown as NavigatorWithWakeLock;

    const requestWakeLock = async () => {
      if (!isMounted || document.visibilityState !== 'visible') return;
      if (!nav.wakeLock || typeof nav.wakeLock.request !== 'function') return;
      if (sentinelRef.current && !sentinelRef.current.released) return;

      try {
        const sentinel = await nav.wakeLock.request('screen');
        if (!isMounted) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Ignora silenziosamente se il browser richiede prima un gesto utente o è in risparmio energetico
      }
    };

    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    const handleUserInteraction = () => {
      if (!sentinelRef.current || sentinelRef.current.released) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);

      if (sentinelRef.current && !sentinelRef.current.released) {
        void sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, [enabled]);
};

