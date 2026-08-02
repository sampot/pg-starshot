/**
 * Original arcade-ish SFX via Web Audio — no commercial samples.
 */

export class StarshotAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.18;
    this._shootGate = 0;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   */
  tone(freq, dur, type = "square", gain = 0.12, when = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  shoot() {
    // Gate rapid-fire noise
    const now = performance.now();
    if (now - this._shootGate < 40) return;
    this._shootGate = now;
    this.tone(880, 0.04, "square", 0.06);
    this.tone(440, 0.05, "triangle", 0.04, 0.01);
  }

  hit() {
    this.tone(220, 0.06, "sawtooth", 0.1);
    this.tone(140, 0.1, "triangle", 0.08, 0.03);
  }

  chip() {
    this.tone(360, 0.04, "square", 0.07);
  }

  hurt() {
    this.tone(160, 0.12, "sawtooth", 0.1);
    this.tone(90, 0.2, "triangle", 0.1, 0.06);
  }

  waveClear() {
    for (let i = 0; i < 6; i++) {
      this.tone(320 * Math.pow(1.18, i), 0.09, "square", 0.09, i * 0.07);
    }
  }

  gameOver() {
    this.tone(280, 0.15, "sawtooth", 0.1);
    this.tone(180, 0.22, "triangle", 0.1, 0.12);
    this.tone(90, 0.35, "sine", 0.1, 0.28);
  }

  startBeep() {
    this.tone(520, 0.08, "square", 0.1);
    this.tone(780, 0.1, "triangle", 0.08, 0.07);
  }
}
