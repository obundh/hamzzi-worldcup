(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const CENTER = { x: 500, y: 500 };
  const RADIUS = 430;
  const COLORS = ['#d7e1db', '#597f77', '#b76655', '#8ca9b2', '#d6ab4f', '#cc8953'];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function noise(x, y, seed) {
    let h = Math.imul(x + 37, 374761393) ^ Math.imul(y + 113, 668265263) ^ seed;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967295;
  }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, TAU); }
  function leaf(c, x, y, size, angle, color) {
    c.save(); c.translate(x, y); c.rotate(angle); c.fillStyle = color;
    c.beginPath(); c.moveTo(-size * .55, 0); c.quadraticCurveTo(0, -size * .32, size * .55, 0);
    c.quadraticCurveTo(0, size * .19, -size * .55, 0); c.fill(); c.restore();
  }
  function line(c, x1, y1, x2, y2, color, width) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function loaded(image) { return !!image && (image.naturalWidth || image.width) > 0 && image.complete !== false; }

  class MoonglimRenderer {
    constructor(canvas, atlas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.atlas = atlas;
      this.width = 1; this.height = 1; this.scale = 1; this.offsetX = 0; this.offsetY = 0; this.dpr = 1;
      this.background = document.createElement('canvas');
      this.background.width = 1000; this.background.height = 1000;
      this._makeBackground(); this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, Math.round(rect.width || this.canvas.clientWidth || 600));
      this.height = Math.max(1, Math.round(rect.height || this.canvas.clientHeight || 600));
      this.dpr = Math.min(2, Math.max(1, root.devicePixelRatio || 1));
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.scale = Math.min(this.width, this.height) / 1000;
      this.offsetX = (this.width - 1000 * this.scale) / 2;
      this.offsetY = (this.height - 1000 * this.scale) / 2;
    }

    toWorld(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      // Use the actual displayed rectangle, including a resize that precedes resize().
      const scale = Math.min(rect.width, rect.height) / 1000 || this.scale;
      const ox = (rect.width - 1000 * scale) / 2, oy = (rect.height - 1000 * scale) / 2;
      return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
    }

    _makeBackground() {
      const c = this.background.getContext('2d');
      const sky = c.createLinearGradient(0, 0, 1000, 1000);
      sky.addColorStop(0, '#34564b'); sky.addColorStop(.5, '#23483c'); sky.addColorStop(1, '#142f28');
      c.fillStyle = sky; c.fillRect(0, 0, 1000, 1000);
      // The dense grove surrounds the open practice court. Painted once, never per frame.
      for (let i = 0; i < 47; i++) {
        const n = noise(i, 4, 3181), n2 = noise(i, 9, 3181);
        const x = i / 46 * 1110 - 55, w = 13 + n * 20, lean = (n2 - .5) * 125;
        c.save(); c.translate(x, 500); c.rotate(lean / 1400);
        const bamboo = c.createLinearGradient(-w / 2, 0, w / 2, 0);
        bamboo.addColorStop(0, '#183c2f'); bamboo.addColorStop(.33, '#71936c');
        bamboo.addColorStop(.67, '#466e4d'); bamboo.addColorStop(1, '#163e30');
        c.fillStyle = bamboo; c.fillRect(-w / 2, -620, w, 1250);
        for (let y = -600 + n * 40; y < 650; y += 92 + n * 27) {
          c.fillStyle = '#183e2d'; c.fillRect(-w / 2 - 2, y, w + 4, 5);
          c.fillStyle = '#9cb48480'; c.fillRect(-w / 2, y + 5, w, 2);
          line(c, w / 2 - 2, y + 15, w / 2 - 2, y + 74, '#98ac7045', 1);
          const side = n2 > .5 ? 1 : -1;
          line(c, side * w / 2, y, side * 84, y - 34, '#2d5435', 3);
          for (let j = 0; j < 4; j++) leaf(c, side * (30 + j * 17), y - 15 - j * 10, 42 - j * 4, side * -.65, j % 2 ? '#456f44' : '#658852');
        }
        c.restore();
      }
      const rim = c.createRadialGradient(500, 500, 330, 500, 500, 495);
      rim.addColorStop(0, '#a5af82'); rim.addColorStop(.65, '#899b68'); rim.addColorStop(1, '#354d34');
      c.fillStyle = rim; circle(c, 500, 500, 451); c.fill();
      for (let i = 0; i < 230; i++) {
        const a = noise(i, 2, 9301) * TAU, r = 431 + noise(i, 3, 9301) * 27;
        const x = 500 + Math.cos(a) * r, y = 500 + Math.sin(a) * r;
        c.fillStyle = i % 3 ? '#537344' : '#9ca76b'; circle(c, x, y, 2 + noise(i, 4, 9301) * 8); c.fill();
      }
      c.save(); circle(c, 500, 500, RADIUS); c.clip();
      const floor = c.createLinearGradient(130, 100, 920, 1000);
      floor.addColorStop(0, '#e0d9b9'); floor.addColorStop(.5, '#cfceb1'); floor.addColorStop(1, '#b4c0a3');
      c.fillStyle = floor; c.fillRect(0, 0, 1000, 1000);
      for (let y = 42; y < 1000; y += 83) for (let x = -50; x < 1050; x += 113) {
        const offset = Math.floor(y / 83) % 2 ? 56 : 0;
        const n = noise(x, y, 9824), px = x + offset;
        c.fillStyle = 'rgba(' + (n > .5 ? '244,236,202,' : '91,113,87,') + (.015 + n * .06) + ')';
        c.fillRect(px + 2, y + 2, 109, 79);
        c.strokeStyle = 'rgba(75,99,79,.12)'; c.lineWidth = 1;
        c.strokeRect(px, y, 113, 83);
        c.strokeStyle = 'rgba(253,247,219,.30)'; c.beginPath(); c.moveTo(px + 1, y + 1); c.lineTo(px + 111, y + 1); c.stroke();
        if (n > .62) {
          c.strokeStyle = '#71836a23'; c.beginPath(); c.moveTo(px + 26, y + 1); c.lineTo(px + 31, y + 16);
          c.lineTo(px + 23, y + 33); c.lineTo(px + 29, y + 44); c.stroke();
        }
      }
      for (let i = 0; i < 1450; i++) {
        const x = noise(i, 7, 5043) * 1000, y = noise(i, 8, 5043) * 1000;
        c.fillStyle = i % 2 ? '#304e3b0c' : '#fff9db20'; c.fillRect(x, y, 1 + i % 2, 1);
      }
      // Worn concentric marks, etched in the paving rather than bright target graphics.
      c.strokeStyle = '#647b6033'; c.lineWidth = 1.5;
      for (const r of [103, 109, 314, 320]) { circle(c, 500, 500, r); c.stroke(); }
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12;
        line(c, 500 + Math.cos(a) * 307, 500 + Math.sin(a) * 307, 500 + Math.cos(a) * 325, 500 + Math.sin(a) * 325, '#647b6038', 2);
      }
      c.save(); c.translate(500, 500); c.rotate(Math.PI / 4);
      c.strokeStyle = '#7c8c6928'; c.lineWidth = 2; c.strokeRect(-40, -40, 80, 80); c.restore();
      // Broad diagonal sunlight and soft stalk shadows leave the court readable.
      c.save(); c.globalAlpha = .075;
      for (let i = 0; i < 8; i++) {
        c.fillStyle = '#173a2d'; c.beginPath(); c.moveTo(i * 195 - 400, -100); c.lineTo(i * 195 - 350, -100);
        c.lineTo(i * 195 + 530, 1100); c.lineTo(i * 195 + 475, 1100); c.closePath(); c.fill();
      }
      c.restore();
      const sun = c.createLinearGradient(0, 0, 950, 830);
      sun.addColorStop(0, '#fff1bf35'); sun.addColorStop(.6, '#fff1bf00'); sun.addColorStop(1, '#204b2b12');
      c.fillStyle = sun; c.fillRect(0, 0, 1000, 1000);
      for (let i = 0; i < 35; i++) {
        const a = noise(i, 17, 2913) * TAU, r = 383 + noise(i, 18, 2913) * 42;
        leaf(c, 500 + Math.cos(a) * r, 500 + Math.sin(a) * r, 10 + i % 9, a + .7, '#6a81514a');
      }
      c.restore();
      circle(c, 500, 500, RADIUS); c.strokeStyle = '#405f4380'; c.lineWidth = 5; c.stroke();
      circle(c, 500, 500, RADIUS - 7); c.strokeStyle = '#f0e1b259'; c.lineWidth = 2; c.stroke();
      const vignette = c.createRadialGradient(500, 450, 300, 500, 500, 700);
      vignette.addColorStop(0, '#102e2000'); vignette.addColorStop(1, '#102e206b');
      c.fillStyle = vignette; c.fillRect(0, 0, 1000, 1000);
    }

    _atlas(index, x, y, size, flip, tilt, bob) {
      const c = this.ctx;
      c.save(); c.translate(x, y + (bob || 0)); c.rotate(tilt || 0); c.scale(flip ? -1 : 1, 1);
      if (loaded(this.atlas)) {
        const sw = (this.atlas.naturalWidth || this.atlas.width) / 4;
        const sh = (this.atlas.naturalHeight || this.atlas.height) / 2;
        c.drawImage(this.atlas, index % 4 * sw, Math.floor(index / 4) * sh, sw, sh, -size / 2, -size * .76, size, size * sh / sw);
      } else {
        // Visible resilience if the asset request fails; production uses the generated atlas.
        c.fillStyle = index === 6 ? '#e8e6d6' : COLORS[index] || '#d2c9a9';
        c.beginPath(); c.ellipse(0, -23, 25, 29, 0, 0, TAU); c.fill();
        circle(c, -15, -46, 10); c.fill(); circle(c, 15, -46, 10); c.fill();
        c.fillStyle = '#243d32'; circle(c, -7, -29, 3); c.fill(); circle(c, 7, -29, 3); c.fill();
      }
      c.restore();
    }

    _warning(w, time, reduced) {
      const c = this.ctx;
      const a = Number.isFinite(w.angle) ? w.angle : Math.atan2(w.y - 500, w.x - 500);
      const x = 500 + Math.cos(a) * 423, y = 500 + Math.sin(a) * 423;
      const progress = 1 - clamp(w.remaining / Math.max(.01, w.total || .7), 0, 1);
      const size = reduced ? 30 : 27 + progress * 8;
      const g = c.createRadialGradient(x, y, 3, x, y, 53);
      g.addColorStop(0, 'rgba(164,73,34,' + (.25 + progress * .2) + ')'); g.addColorStop(1, 'rgba(164,73,34,0)');
      c.fillStyle = g; c.fillRect(x - 53, y - 53, 106, 106);
      circle(c, x, y, size); c.fillStyle = '#fcf0c9e8'; c.fill();
      c.strokeStyle = '#9f502e'; c.lineWidth = 3; c.stroke();
      c.beginPath(); c.arc(x, y, size + 5, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
      c.strokeStyle = '#713a25'; c.lineWidth = 4; c.stroke();
      // A geometric inward chevron remains understandable without color.
      c.save(); c.translate(x, y); c.rotate(a + Math.PI);
      c.strokeStyle = '#713a25'; c.lineWidth = 4.5; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-7, -11); c.lineTo(6, 0); c.lineTo(-7, 11); c.stroke();
      if (progress > .65) { c.beginPath(); c.moveTo(-17, -11); c.lineTo(-4, 0); c.lineTo(-17, 11); c.stroke(); }
      c.restore();
    }

    _runner(actor, time, reduced, player) {
      const c = this.ctx, vx = actor.vx || 0, vy = actor.vy || 0;
      const speed = Math.hypot(vx, vy), running = speed > 5;
      const phase = time * (player ? 19 : 24) + (Number(actor.id) || actor.profileIndex || 0) * .7;
      const bob = !reduced && running ? Math.abs(Math.sin(phase)) * -5 : 0;
      const ux = speed ? vx / speed : 0, uy = speed ? vy / speed : 0;
      if (!player && running && !reduced) {
        for (let i = 1; i <= 3; i++) {
          const d = 14 + i * 14;
          const px = actor.x - ux * d, py = actor.y - uy * d + 3;
          line(c, px - ux * 12 - uy * 5, py - uy * 12 + ux * 5, px, py, 'rgba(249,244,212,' + (.26 - i * .055) + ')', 3);
          c.fillStyle = 'rgba(87,105,68,' + (.13 - i * .025) + ')';
          circle(c, px + Math.sin(phase + i) * 6, py + Math.cos(phase + i) * 4, 3 + i * 2); c.fill();
        }
      }
      c.save(); c.translate(actor.x, actor.y);
      const shadow = c.createRadialGradient(0, 3, 3, 0, 3, player ? 39 : 32);
      shadow.addColorStop(0, '#193c3159'); shadow.addColorStop(1, '#193c3100');
      c.scale(1, .42); c.fillStyle = shadow; circle(c, 0, 6, player ? 42 : 37); c.fill(); c.restore();
      if (player) {
        circle(c, actor.x, actor.y + 2, 31); c.fillStyle = '#faf4d769'; c.fill();
        c.strokeStyle = '#325e4855'; c.lineWidth = 1.5; c.stroke();
      }
      const facing = Number.isFinite(actor.facing) ? actor.facing : Math.atan2(vy, vx);
      const flip = running ? vx < -3 : player && Math.cos(facing) < -.1;
      const tilt = !reduced && running ? clamp(vx / 310, -1, 1) * .075 + Math.sin(phase) * .025 : 0;
      this._atlas(player ? 6 : actor.profileIndex || 0, actor.x, actor.y, player ? 104 : 92, flip, tilt, bob);
      // These floor markers are the actual collision radii, not decoration on the fur.
      circle(c, actor.x, actor.y, actor.r || (player ? 10 : 19));
      c.fillStyle = player ? '#173f37dd' : '#9d4f2e9c'; c.fill();
      c.lineWidth = player ? 3 : 2; c.strokeStyle = player ? '#fff8d9' : '#fff3d7c9'; c.stroke();
      if (player) { circle(c, actor.x, actor.y, 3); c.fillStyle = '#f4cb66'; c.fill(); }
    }

    _leaves(time) {
      const c = this.ctx;
      for (let i = 0; i < 9; i++) {
        const x = (noise(i, 1, 9432) * 1000 + time * (8 + i)) % 1120 - 60;
        const y = (noise(i, 3, 9432) * 1000 + time * (12 + i * .5)) % 1140 - 70;
        leaf(c, x + Math.sin(time * .6 + i) * 20, y, 12 + i % 6, time * .35 + i, '#3f704e59');
      }
    }

    draw(state, options) {
      const opts = Object.assign({ time: 0, reduceMotion: false, mode: 'playing', hitProgress: 0 }, options);
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#214437'; c.fillRect(0, 0, this.width, this.height);
      c.save(); c.translate(this.offsetX, this.offsetY); c.scale(this.scale, this.scale);
      const hitProgress = clamp(opts.hitProgress || 0, 0, 1);
      if (!opts.reduceMotion && opts.mode === 'over' && hitProgress > 0 && hitProgress < .45) {
        const amount = 4 * (1 - hitProgress / .45);
        c.translate(Math.sin(hitProgress * 89) * amount, Math.cos(hitProgress * 67) * amount);
      }
      c.drawImage(this.background, 0, 0);
      if (!state) { c.restore(); return; }
      for (const w of state.warnings || []) this._warning(w, opts.time, opts.reduceMotion);
      const actors = (state.enemies || []).map(e => ({ actor: e, player: false }));
      if (opts.mode === 'ready' && actors.length === 0) {
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6 - Math.PI / 2;
          actors.push({ actor: { id: i, x: 500 + Math.cos(a) * 352, y: 500 + Math.sin(a) * 352, r: 19, profileIndex: i, vx: 0, vy: 0 }, player: false });
        }
      }
      if (state.player) actors.push({ actor: state.player, player: true });
      actors.sort((a, b) => a.actor.y - b.actor.y);
      for (const obj of actors) this._runner(obj.actor, opts.time, opts.reduceMotion || opts.mode === 'paused', obj.player);
      if (!opts.reduceMotion && opts.mode !== 'paused') this._leaves(opts.time);
      if (opts.mode === 'over' && state.hit && state.player) {
        const p = state.player, t = opts.reduceMotion ? .55 : hitProgress;
        circle(c, p.x, p.y, 22 + t * 62); c.strokeStyle = 'rgba(152,69,39,' + (.75 * (1 - t)) + ')'; c.lineWidth = 5; c.stroke();
        if (!opts.reduceMotion && t < .8) for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8 + .2, start = 29 + t * 25, end = start + 15 * (1 - t);
          line(c, p.x + Math.cos(a) * start, p.y + Math.sin(a) * start, p.x + Math.cos(a) * end, p.y + Math.sin(a) * end, '#ad603d99', 4);
        }
      }
      c.restore();
    }
  }

  root.MoonglimRenderer = MoonglimRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = MoonglimRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
