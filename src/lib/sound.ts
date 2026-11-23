/** Tiny square-wave beeps, like the original handhelds. */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function tone(freq: number, startOffset: number, duration: number, volume = 0.05) {
  ctx ??= new AudioContext();
  const t0 = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  button() {
    if (enabled) tone(1320, 0, 0.05);
  },
  ok() {
    if (!enabled) return;
    tone(988, 0, 0.08);
    tone(1319, 0.09, 0.12);
  },
  no() {
    if (enabled) tone(220, 0, 0.18);
  },
  alert() {
    if (!enabled) return;
    for (let i = 0; i < 3; i++) tone(1760, i * 0.16, 0.08, 0.04);
  },
  fanfare() {
    if (!enabled) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.11, 0.12));
  },
};
