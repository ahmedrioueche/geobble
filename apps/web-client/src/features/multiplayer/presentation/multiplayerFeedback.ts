const SOUND_PREF_KEY = "geobble.multiplayer.sound";
const HAPTIC_PREF_KEY = "geobble.multiplayer.haptics";

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
};

export const readSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SOUND_PREF_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
};

export const writeSoundEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage failures.
  }
};

export const readHapticsEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(HAPTIC_PREF_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
};

export const writeHapticsEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HAPTIC_PREF_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage failures.
  }
};

const playTone = (
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gainValue = 0.08,
  delayMs = 0,
): void => {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    const startAt = ctx.currentTime + delayMs / 1000;
    const stopAt = startAt + durationMs / 1000;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(gainValue, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt);
  } catch {
    // Audio playback is best-effort.
  }
};

export type MultiplayerCue =
  | "correct"
  | "wrong"
  | "tick"
  | "round-start"
  | "powerup";

export const triggerMultiplayerCue = (
  cue: MultiplayerCue,
  options: { soundEnabled: boolean; hapticsEnabled: boolean },
): void => {
  if (options.soundEnabled) {
    switch (cue) {
      case "correct":
        playTone(587.33, 110, "triangle", 0.09, 0);
        playTone(880, 180, "triangle", 0.1, 90);
        break;
      case "wrong":
        playTone(220, 140, "sawtooth", 0.07, 0);
        playTone(164.81, 200, "sawtooth", 0.07, 110);
        break;
      case "tick":
        playTone(760, 45, "sine", 0.045, 0);
        break;
      case "round-start":
        playTone(440, 80, "sine", 0.06, 0);
        playTone(659.25, 110, "sine", 0.06, 70);
        break;
      case "powerup":
        playTone(523.25, 70, "triangle", 0.07, 0);
        playTone(659.25, 70, "triangle", 0.07, 55);
        playTone(783.99, 120, "triangle", 0.08, 110);
        break;
    }
  }

  if (
    options.hapticsEnabled &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    try {
      if (cue === "correct") navigator.vibrate([25, 35, 45]);
      else if (cue === "wrong") navigator.vibrate([70, 40, 70]);
      else if (cue === "powerup") navigator.vibrate(20);
    } catch {
      // Ignore vibration failures.
    }
  }
};

