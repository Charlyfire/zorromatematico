let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SoundCue = 'flip' | 'match' | 'success' | 'retry' | 'place' | 'reveal' | 'levelUp';

export function playSoundCue(cue: SoundCue, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  const note = (freq: number, start: number, duration: number, gainPeak = 0.12, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  switch (cue) {
    case 'flip':
      note(420, now, 0.09, 0.08, 'triangle');
      break;
    case 'place':
      note(520, now, 0.08, 0.09, 'triangle');
      break;
    case 'match':
      note(523.25, now, 0.14, 0.11, 'triangle');
      note(659.25, now + 0.09, 0.2, 0.12, 'triangle');
      break;
    case 'success':
      note(523.25, now, 0.14, 0.11, 'triangle');
      note(659.25, now + 0.11, 0.15, 0.11, 'triangle');
      note(783.99, now + 0.22, 0.28, 0.13, 'triangle');
      break;
    case 'levelUp':
      note(440, now, 0.12, 0.1, 'triangle');
      note(554.37, now + 0.1, 0.12, 0.1, 'triangle');
      note(659.25, now + 0.2, 0.12, 0.1, 'triangle');
      note(880, now + 0.3, 0.3, 0.12, 'triangle');
      break;
    case 'retry':
      note(310, now, 0.14, 0.08, 'sine');
      note(270, now + 0.11, 0.18, 0.07, 'sine');
      break;
    case 'reveal':
      note(480, now, 0.1, 0.08, 'sine');
      note(600, now + 0.08, 0.15, 0.09, 'sine');
      break;
  }
}

export function canSpeakSpanish(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakSpanish(text: string, enabled: boolean): void {
  if (!enabled || !canSpeakSpanish()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 0.94;
    utter.pitch = 1.02;
    const voices = synth.getVoices();
    const esVoice =
      voices.find((v) => v.lang.toLowerCase() === 'es-es') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (esVoice) utter.voice = esVoice;
    synth.speak(utter);
  } catch {
    // Ignore speech synthesis failures on restricted devices
  }
}

export function stopSpeaking(): void {
  if (canSpeakSpanish()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}
