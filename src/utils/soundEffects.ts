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
 * Emette un micro-beep per il countdown finale (3, 2, 1)
 */
export function playCountdownBeep(frequency = 600, duration = 0.08): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
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
 * Emette il suono di completamento del recupero (Doppio tono energico per riprendere)
 */
export function playRestCompleteTone(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Tono 1 (880 Hz - Nota La)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.12);

    // Tono 2 (1320 Hz - Nota Mi alta)
    setTimeout(() => {
      try {
        if (!ctx) return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1320, ctx.currentTime);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      } catch {}
    }, 120);
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
