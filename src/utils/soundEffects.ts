/**
 * Generatore di suoni sintetizzati ultraleggeri tramite Web Audio API
 * Funziona nativamente su tutti i browser moderni (iOS, Android, Chrome, Safari, Firefox) senza file MP3 esterni.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Inizializza o riattiva l'AudioContext in risposta a un'interazione utente
 * (fondamentale per sbloccare l'audio su iOS Safari e Chrome mobile).
 */
export function initOrResumeAudioContext(): AudioContext | null {
  return getAudioContext();
}

/**
 * Controlla se l'utente ha abilitato l'audio per i recuperi
 */
export function isRestAudioEnabled(): boolean {
  try {
    const saved = localStorage.getItem('ac_rest_audio_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  } catch {
    return true;
  }
}

/**
 * Emette un micro-beep per il countdown finale (3, 2, 1)
 */
export function playCountdownBeep(frequency = 600, duration = 0.09): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Fallback silente se l'audio è bloccato dal browser
  }
}

/**
 * Emette il suono di completamento del recupero (Triplo rintocco energico e limpido a campana per riprendere il set)
 */
export function playRestCompleteTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 587.33, timeOffset: 0, duration: 0.25, gainVal: 0.3 },     // D5
      { freq: 880.00, timeOffset: 0.12, duration: 0.3, gainVal: 0.35 },  // A5
      { freq: 1174.66, timeOffset: 0.25, duration: 0.45, gainVal: 0.4 }, // D6 (Rintocco finale squillante)
    ];

    notes.forEach(({ freq, timeOffset, duration, gainVal }) => {
      const startTime = ctx.currentTime + timeOffset;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch {
    // Fallback silente
  }
}

/**
 * Emette un colpo di impatto brutale con tuono / thunder bass & synth arpeggio elettrico
 */
export function playVictoryFanfare(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 1. BOATO TUONO / IMPACT BASS (Sub 50Hz punch)
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(160, ctx.currentTime);
    bassOsc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.6);
    bassGain.gain.setValueAtTime(0.5, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start();
    bassOsc.stop(ctx.currentTime + 0.6);

    // 2. SCARICA ELETTRICA / NOISE BURST
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    whiteNoise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start();

    // 3. ACCORDO POTENTE AD ALTA ENERGIA
    const chords = [659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        try {
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.28, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.55);
        } catch {}
      }, 80 + idx * 70);
    });
  } catch {
    // Fallback silente
  }
}
