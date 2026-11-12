(function (root) {
  'use strict';

  class MoonglimAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.compressor = null;
      this.enabled = true;
      this.paused = true;
      this.voices = new Set();
      this.noise = null;
    }

    async start() {
      const AudioContext = root.AudioContext || root.webkitAudioContext;
      if (!this.context && !AudioContext) return false;
      try {
        if (!this.context) {
          const c = this.context = new AudioContext();
          this.master = c.createGain();
          this.master.gain.value = 0;
          this.compressor = c.createDynamicsCompressor();
          this.compressor.threshold.value = -20;
          this.compressor.knee.value = 15;
          this.compressor.ratio.value = 6;
          this.compressor.attack.value = .008;
          this.compressor.release.value = .16;
          this.master.connect(this.compressor);
          this.compressor.connect(c.destination);
          this.noise = c.createBuffer(1, Math.ceil(c.sampleRate * .4), c.sampleRate);
          const samples = this.noise.getChannelData(0);
          let previous = 0;
          for (let i = 0; i < samples.length; i++) {
            previous = (previous + (Math.random() * 2 - 1) * .22) / 1.22;
            samples[i] = previous;
          }
        }
        this.paused = false;
        if (this.context.state === 'suspended') await this.context.resume();
        this._volume();
        return this.context.state === 'running';
      } catch (_) {
        // Audio availability must never prevent a run from starting.
        return false;
      }
    }

    _volume() {
      if (!this.context || !this.master || this.context.state === 'closed') return;
      const t = this.context.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.enabled && !this.paused ? .24 : 0, t, .018);
    }

    setEnabled(value) {
      this.enabled = !!value;
      if (!this.enabled) this._stopVoices();
      this._volume();
    }

    _voice(source, gain, duration, delay, filter) {
      const c = this.context;
      if (!c || !this.master) return;
      if (this.voices.size >= 18) this._stopVoice(this.voices.values().next().value);
      source.connect(filter || gain);
      if (filter) filter.connect(gain);
      gain.connect(this.master);
      const record = {source, gain, filter};
      this.voices.add(record);
      source.onended = () => {
        this.voices.delete(record);
        for (const node of [source, gain, filter]) if (node) { try { node.disconnect(); } catch (_) {} }
      };
      const at = c.currentTime + delay;
      source.start(at);
      source.stop(at + duration + .04);
    }

    _tone(from, to, length, volume, type = 'sine', delay = 0) {
      const c = this.context, at = c.currentTime + delay;
      const source = c.createOscillator(), gain = c.createGain();
      source.type = type;
      source.frequency.setValueAtTime(from, at);
      source.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(volume, at + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, at + length);
      this._voice(source, gain, length, delay);
    }

    _rustle(length, volume, frequency, delay = 0) {
      const c = this.context, at = c.currentTime + delay;
      const source = c.createBufferSource(), gain = c.createGain(), filter = c.createBiquadFilter();
      source.buffer = this.noise;
      filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(volume, at + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, at + length);
      this._voice(source, gain, length, delay, filter);
    }

    play(kind) {
      if (!this.context || this.context.state !== 'running' || this.paused || !this.enabled) return;
      if (kind === 'warning') {
        this._rustle(.14, .18, 1450);
        this._tone(480, 350, .075, .055, 'triangle');
      } else if (kind === 'near') {
        this._tone(1046.5, 1396.9, .15, .075);
        this._tone(1568, 1568, .13, .025, 'sine', .045);
      } else if (kind === 'hit') {
        this._tone(185, 64, .23, .18, 'triangle');
        this._tone(540, 160, .12, .075);
        this._rustle(.11, .16, 750);
      } else if (kind === 'stage') {
        this._tone(523.25, 523.25, .18, .055, 'triangle');
        this._tone(659.25, 659.25, .23, .055, 'triangle', .09);
      } else if (kind === 'start' || kind === 'retry') {
        this._tone(392, 392, .15, .065, 'triangle');
        this._tone(523.25, 523.25, .22, .065, 'triangle', .09);
        this._tone(783.99, 783.99, .25, .045, 'sine', .18);
      } else if (kind === 'click') {
        this._tone(690, 510, .055, .045, 'triangle');
      }
    }

    _stopVoice(record) {
      if (!record) return;
      try { record.source.stop(); } catch (_) {}
      this.voices.delete(record);
      for (const node of [record.source, record.gain, record.filter]) if (node) { try { node.disconnect(); } catch (_) {} }
    }

    _stopVoices() {
      for (const record of [...this.voices]) this._stopVoice(record);
    }

    pause() {
      this.paused = true;
      this._stopVoices();
      this._volume();
    }

    async resume() {
      this.paused = false;
      if (!this.context) return false;
      try {
        if (this.context.state === 'suspended') await this.context.resume();
        this._volume();
        return this.context.state === 'running';
      } catch (_) { return false; }
    }

    destroy() {
      this.paused = true;
      this._stopVoices();
      for (const node of [this.master, this.compressor]) if (node) { try { node.disconnect(); } catch (_) {} }
      if (this.context) { try { const result = this.context.close(); if (result?.catch) result.catch(() => {}); } catch (_) {} }
      this.context = null; this.master = null; this.compressor = null; this.noise = null;
    }
  }

  root.MoonglimAudio = MoonglimAudio;
  if (typeof module !== 'undefined' && module.exports) module.exports = MoonglimAudio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
