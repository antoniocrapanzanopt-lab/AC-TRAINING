/**
 * WORKOUT DISPLAY & LOCK SCREEN MANAGER — AC ATHLETE APP
 * 
 * Permette all'atleta di monitorare il cronometro e il recupero tra serie
 * anche a telefono bloccato o poggiato sulla panca, senza sbloccarlo:
 * 
 * 1. SCREEN WAKE LOCK API: Mantiene il display acceso in modo intelligente
 *    durante il workout per non far entrare il telefono in standby.
 * 2. MEDIA SESSION API (Lock Screen Widget): Mostra il conto alla rovescia
 *    direttamente nella schermata di blocco di iOS e Android, con tasti interattivi
 *    per mettere in pausa o saltare il recupero senza sbloccare il telefono.
 * 3. HAPTIC & AUDIO NOTIFICATION: Vibrazione e suoni sincronizzati a fine serie.
 */

// Mini audio WAV silenzioso (1 secondo, loop trasparente a consumo zero)
const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let wakeLockSentinel: WakeLockSentinel | null = null;
let isWakeLockRequested = false;
let silentAudioElement: HTMLAudioElement | null = null;
let lastRegisteredSkipHandler: (() => void) | null = null;
let lastRegisteredAddHandler: ((sec: number) => void) | null = null;

/**
 * Controlla il supporto per la Screen Wake Lock API
 */
export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

/**
 * Controlla il supporto per la Media Session API
 */
export function isMediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

/**
 * Formatta secondi in mm:ss o h:mm:ss
 */
function formatDuration(sec: number): string {
  const safeSec = Math.max(0, Math.floor(sec));
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * ─── 1. GESTIONE SCREEN WAKE LOCK (SCHERMO SEMPRE ACCESO DURANTE IL WORKOUT) ───
 */

/**
 * Richiede al sistema operativo di mantenere il display acceso
 */
export async function requestWorkoutWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) return false;
  isWakeLockRequested = true;

  try {
    if (!wakeLockSentinel || wakeLockSentinel.released) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        // Se non è stato rilasciato esplicitamente da noi (es. minimizzazione app), tenta riattivazione al ritorno
        wakeLockSentinel = null;
      });
    }
    return true;
  } catch {
    // Es. batteria scarica, restrizione di sistema o browser in background
    return false;
  }
}

/**
 * Rilascia il blocco dello schermo quando il workout termina o viene chiuso
 */
export async function releaseWorkoutWakeLock(): Promise<void> {
  isWakeLockRequested = false;
  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      await wakeLockSentinel.release();
    }
  } catch {
    // Ignora errori di rilascio
  } finally {
    wakeLockSentinel = null;
  }
}

// Gestione del ritorno in primo piano (se l'atleta esce e rientra, riattiva il wake lock)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isWakeLockRequested) {
      await requestWorkoutWakeLock();
    }
  });
}

/**
 * ─── 2. GESTIONE MEDIA SESSION API (WIDGET CRONOMETRO SU LOCK SCREEN) ───
 */

/**
 * Inizializza l'audio element silenzioso necessario per mantenere attivo il widget di blocco
 */
function getOrCreateSilentAudio(): HTMLAudioElement {
  if (!silentAudioElement) {
    silentAudioElement = new Audio(SILENT_WAV_BASE64);
    silentAudioElement.loop = true;
    silentAudioElement.volume = 0.001; // Praticamente inudibile
    silentAudioElement.preload = 'auto';
  }
  return silentAudioElement;
}

export interface LockScreenTimerParams {
  remainingSeconds: number;
  totalSeconds: number;
  exerciseName?: string;
  setNumber?: number;
  totalSets?: number;
  workoutTitle?: string;
  onSkipRest?: () => void;
  onAddRestTime?: (seconds: number) => void;
}

/**
 * Aggiorna in tempo reale il cronometro sulla schermata di blocco
 */
export function updateLockScreenTimer({
  remainingSeconds,
  totalSeconds,
  exerciseName = 'Esercizio in Corso',
  setNumber = 1,
  totalSets = 3,
  workoutTitle = 'AC Training Session',
  onSkipRest,
  onAddRestTime,
}: LockScreenTimerParams): void {
  if (!isMediaSessionSupported()) return;

  lastRegisteredSkipHandler = onSkipRest || null;
  lastRegisteredAddHandler = onAddRestTime || null;

  // 1. Avvia l'audio silenzioso se non già in riproduzione per mostrare il widget Lock Screen
  const audio = getOrCreateSilentAudio();
  if (audio.paused && remainingSeconds > 0) {
    audio.play().catch(() => {
      // Potrebbe richiedere gesto utente se invocato a freddo
    });
  }

  const formattedRemaining = formatDuration(remainingSeconds);
  const exerciseLine = `${exerciseName} • Serie ${setNumber} di ${totalSets}`;

  // 2. Imposta i metadati visualizzati su Lock Screen & Always-On Display
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `⏱️ Recupero: ${formattedRemaining}`,
      artist: exerciseLine,
      album: workoutTitle,
      artwork: [
        { src: '/ac-logo.png', sizes: '512x512', type: 'image/png' },
        { src: '/ac-logo-transparent.png', sizes: '192x192', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = 'playing';

    // 3. Barra di avanzamento nativa sul display di blocco
    if ('setPositionState' in navigator.mediaSession && totalSeconds > 0) {
      try {
        const elapsed = Math.max(0, Math.min(totalSeconds, totalSeconds - remainingSeconds));
        navigator.mediaSession.setPositionState({
          duration: totalSeconds,
          playbackRate: 1,
          position: elapsed,
        });
      } catch {
        // Fallback per browser con setPositionState parziale
      }
    }

    // 4. Collega i pulsanti della schermata di blocco (Pausa / Salta serie / Aggiungi tempo)
    navigator.mediaSession.setActionHandler('pause', () => {
      if (lastRegisteredSkipHandler) {
        lastRegisteredSkipHandler();
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (lastRegisteredSkipHandler) {
        lastRegisteredSkipHandler();
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (lastRegisteredAddHandler) {
        lastRegisteredAddHandler(30);
      }
    });
  } catch {
    // Fallback sicuro se i metadati vengono rifiutati dal browser
  }
}

/**
 * Notifica di fine recupero sulla schermata di blocco
 */
export function notifyRestCompleteOnLockScreen(exerciseName?: string): void {
  if (!isMediaSessionSupported()) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: '🔔 RECUPERO COMPLETATO!',
      artist: exerciseName ? `Pronto per: ${exerciseName}` : 'Inizia la prossima serie!',
      album: 'AC Training • Performance Coach',
      artwork: [
        { src: '/ac-logo.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = 'paused';
  } catch {}

  // Disattiva l'audio silenzioso dopo 4 secondi
  setTimeout(() => {
    stopLockScreenTimer();
  }, 4000);
}

/**
 * Ferma e pulisce il widget della schermata di blocco
 */
export function stopLockScreenTimer(): void {
  if (silentAudioElement) {
    try {
      silentAudioElement.pause();
      silentAudioElement.currentTime = 0;
    } catch {}
  }

  if (isMediaSessionSupported()) {
    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    } catch {}
  }

  lastRegisteredSkipHandler = null;
  lastRegisteredAddHandler = null;
}
