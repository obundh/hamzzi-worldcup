(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  class HalloweenAudio {
    constructor() {
      this.context = null; this.master = null; this.drone = null; this.wind = null;
      this.enabled = true; this.paused = false; this.started = false;
      this.previous = null; this.stepDistance = 0; this.heartbeat = 0; this.clock = 0;
      this.nodes = []; this.voices = new Set(); this.noiseBuffer = null;
    }

    async start() {
      if (this.context) { await this.resume(); return; }
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!AudioContext) return;
      try {
        const a = this.context = new AudioContext();
        const compressor = a.createDynamicsCompressor();
        compressor.threshold.value = -18; compressor.knee.value = 14;
        compressor.ratio.value = 8; compressor.attack.value = .006; compressor.release.value = .2;
        this.master = a.createGain(); this.master.gain.value = this.enabled ? .3 : 0;
        this.master.connect(compressor); compressor.connect(a.destination);
        this.nodes.push(compressor, this.master);
        this.noiseBuffer = a.createBuffer(1, a.sampleRate * 3, a.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * .025) / 1.025; data[i] = last * 3.5; }
        this.drone = a.createGain(); this.drone.gain.value = .055;
        const low = a.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 155; low.Q.value = .6;
        this.drone.connect(low); low.connect(this.master); this.nodes.push(this.drone, low);
        [49, 73.55, 98.17].forEach((frequency, i) => {
          const osc = a.createOscillator(); osc.type = i ? 'sine' : 'triangle'; osc.frequency.value = frequency;
          const gain = a.createGain(); gain.gain.value = i === 2 ? .13 : .32;
          osc.connect(gain); gain.connect(this.drone); osc.start(); this.nodes.push(osc, gain);
        });
        const wind = a.createBufferSource(); wind.buffer = this.noiseBuffer; wind.loop = true;
        const filter = a.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 410; filter.Q.value = .35;
        this.wind = a.createGain(); this.wind.gain.value = .04;
        wind.connect(filter); filter.connect(this.wind); this.wind.connect(this.master); wind.start();
        this.nodes.push(wind, filter, this.wind);
        this.started = true; this.paused = false;
        if (a.state === 'suspended') await a.resume();
      } catch (_) {
        this.started = false;
      }
    }

    setEnabled(value) {
      this.enabled = !!value;
      if (this.master && this.context) {
        const t = this.context.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(this.enabled && !this.paused ? .3 : 0, t, .035);
      }
    }

    _voice(source, gain, duration, filter) {
      const a = this.context;
      if (!a || !this.master) return;
      source.connect(filter || gain);
      if (filter) filter.connect(gain);
      gain.connect(this.master);
      const record = { source, gain, filter };
      this.voices.add(record);
      source.onended = () => {
        this.voices.delete(record);
        try { source.disconnect(); gain.disconnect(); if (filter) filter.disconnect(); } catch (_) { /* already disconnected */ }
      };
      source.start(); source.stop(a.currentTime + duration);
    }

    _tone(frequency, end, duration, volume, type, delay) {
      const a = this.context;
      if (!a) return;
      const t = a.currentTime + (delay || 0), osc = a.createOscillator(), gain = a.createGain();
      osc.type = type || 'sine'; osc.frequency.setValueAtTime(frequency, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(8, end || frequency), t + duration);
      gain.gain.setValueAtTime(0, a.currentTime); gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + Math.min(.018, duration * .2));
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      this._voice(osc, gain, duration + (delay || 0) + .03);
    }

    _noise(duration, volume, frequency, highpass) {
      const a = this.context;
      if (!a || !this.noiseBuffer) return;
      const src = a.createBufferSource(); src.buffer = this.noiseBuffer;
      const gain = a.createGain(); gain.gain.setValueAtTime(volume, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, a.currentTime + duration);
      const filter = a.createBiquadFilter(); filter.type = highpass ? 'highpass' : 'lowpass';
      filter.frequency.value = frequency || 500; filter.Q.value = .45;
      this._voice(src, gain, duration + .02, filter);
    }

    update(state, dt) {
      if (!state || !state.player) return;
      const p = state.player;
      if (!this.context || !this.enabled || this.paused || state.status !== 'playing') {
        this.previous = { x: p.x, y: p.y }; return;
      }
      dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .1); this.clock += dt;
      if (this.previous) {
        const moved = Math.hypot(p.x - this.previous.x, p.y - this.previous.y);
        if (moved < .6) this.stepDistance += moved;
        if (this.stepDistance > .64 && !p.hidden) {
          this.stepDistance %= .64; this._noise(.10, .11, 430);
          this._tone(108, 49, .10, .025, 'triangle');
        }
      }
      this.previous = { x: p.x, y: p.y };
      const ghost = state.ghost;
      const d = ghost ? Math.hypot(p.x - ghost.x, p.y - ghost.y) : 30;
      const danger = ghost && ghost.mode === 'chase' ? clamp(1 - d / 12, .28, 1) : clamp(1 - d / 6.5, 0, .5);
      this.heartbeat -= dt;
      if (danger > .15 && this.heartbeat <= 0) {
        this.heartbeat = 1.25 - danger * .69;
        this._tone(61, 38, .14, .035 + danger * .045, 'sine');
        this._tone(51, 33, .12, .025 + danger * .03, 'sine', .16);
        if (ghost.mode === 'chase') this._noise(.22, .025 + danger * .025, 210);
      }
      const now = this.context.currentTime;
      if (this.drone) this.drone.gain.setTargetAtTime(.05 + danger * .12, now, .4);
      if (this.wind) this.wind.gain.setTargetAtTime(.035 + danger * .035, now, .5);
    }

    play(kind) {
      if (!this.context || !this.enabled || this.paused || this.context.state !== 'running') return;
      if (kind === 'caught' || kind === 'scare' || kind === 'lost') {
        // A bounded sting: compressed master, no external audio and no abrupt full-volume burst.
        this._noise(.65, .30, 510, true);
        this._tone(490, 77, .62, .14, 'sawtooth');
        this._tone(763, 117, .47, .095, 'triangle', .025);
        this._tone(61, 29, .95, .18, 'sine');
      } else if (kind === 'clue' || kind === 'battery') {
        this._tone(523.25, 523.25, .25, .065, 'sine');
        this._tone(783.99, 783.99, .34, .052, 'sine', .10);
      } else if (kind === 'chase') {
        this._noise(.8, .14, 330);
        this._tone(82.4, 61.7, .7, .07, 'triangle');
      } else if (kind === 'hide' || kind === 'unhide') {
        this._noise(.18, .08, 850);
      } else if (kind === 'won') {
        [261.63, 329.63, 392, 523.25].forEach((f, i) => this._tone(f, f, 1.15, .045, 'sine', i * .11));
      } else if (kind === 'npc' || kind === 'click') {
        this._tone(310, 230, .07, .035, 'triangle');
      } else if (kind === 'blocked') {
        this._tone(145, 120, .16, .035, 'sine');
      }
    }

    pause() {
      this.paused = true; this.previous = null; this.stepDistance = 0;
      if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, .025);
      for (const v of this.voices) { try { v.source.stop(); } catch (_) { /* already ended */ } }
    }

    async resume() {
      this.paused = false; this.previous = null;
      if (!this.context) return;
      try {
        if (this.context.state === 'suspended') await this.context.resume();
        if (this.master) this.master.gain.setTargetAtTime(this.enabled ? .3 : 0, this.context.currentTime, .04);
      } catch (_) { /* Browser may require another user gesture; game remains playable. */ }
    }

    destroy() {
      for (const v of this.voices) { try { v.source.stop(); } catch (_) { /* already ended */ } }
      this.voices.clear();
      for (const node of this.nodes) {
        try { if (typeof node.stop === 'function') node.stop(); node.disconnect(); } catch (_) { /* already ended */ }
      }
      this.nodes.length = 0;
      if (this.context) { try { this.context.close(); } catch (_) { /* already closed */ } }
      this.context = null; this.started = false;
    }
  }

  root.HalloweenAudio = HalloweenAudio;
  if (typeof module !== 'undefined' && module.exports) module.exports = HalloweenAudio;
})(typeof globalThis !== 'undefined' ? globalThis : window);
