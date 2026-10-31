(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, p) => a + (b - a) * p;
  function noise(x, y, seed) {
    let v = Math.imul(x + 139, 374761393) ^ Math.imul(y + 719, 668265263) ^ (seed | 0);
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function canvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function loaded(image) {
    return !!image && (image.naturalWidth || image.width) > 0 && image.complete !== false;
  }
  function walkable(s, x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    return ix >= 0 && iy >= 0 && ix < s.width && iy < s.height && s.grid[iy][ix] !== '#';
  }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  class HalloweenRenderer {
    constructor(element, assets) {
      this.canvas = element;
      this.ctx = element.getContext('2d', { alpha: false });
      this.assets = assets || {};
      this.camera = { x: 0, y: 0 };
      this.width = 1; this.height = 1; this.dpr = 1; this.tile = 64;
      this.world = null; this.worldKey = ''; this.firstCamera = true;
      this.light = canvas(1, 1);
      this.visibility = null; this.lastVisibilityKey = '';
      this.lastPlayer = null; this.playerStride = 0;
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, Math.round(rect.width || this.canvas.clientWidth || 800));
      this.height = Math.max(1, Math.round(rect.height || this.canvas.clientHeight || 600));
      this.dpr = Math.min(2, Math.max(1, root.devicePixelRatio || 1));
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.tile = this.width < 500 ? 56 : this.width < 850 ? 60 : 68;
      this.light.width = this.width; this.light.height = this.height;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.lastVisibilityKey = ''; this.firstCamera = true; this.lastPlayer = null;
    }

    worldToScreen(x, y) {
      return { x: (x - this.camera.x) * this.tile, y: (y - this.camera.y) * this.tile };
    }

    _makeWorld(s) {
      const k = s.seed + ':' + s.width + ':' + s.height;
      if (k === this.worldKey) return;
      const t = 48;
      this.world = canvas(s.width * t, s.height * t);
      const c = this.world.getContext('2d');
      c.fillStyle = '#091416'; c.fillRect(0, 0, this.world.width, this.world.height);
      for (let y = 0; y < s.height; y++) {
        for (let x = 0; x < s.width; x++) {
          const wall = s.grid[y][x] === '#', n = noise(x, y, s.seed);
          const px = x * t, py = y * t;
          if (wall) {
            c.fillStyle = 'rgb(' + Math.round(33 + n * 8) + ',' + Math.round(49 + n * 10) + ',' + Math.round(48 + n * 11) + ')';
            c.fillRect(px, py, t, t);
            c.fillStyle = 'rgba(2,9,11,.50)'; c.fillRect(px, py + t - 8, t, 8);
            c.fillStyle = 'rgba(126,149,125,.12)'; c.fillRect(px + 1, py + 1, t - 2, 2);
            c.strokeStyle = 'rgba(6,20,22,.7)'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(px, py + 22); c.lineTo(px + t, py + 22);
            const offset = (y % 2) ? 12 : 33;
            c.moveTo(px + offset, py); c.lineTo(px + offset, py + 22);
            c.moveTo(px + 48 - offset, py + 22); c.lineTo(px + 48 - offset, py + 48); c.stroke();
            if (n > .64) {
              c.fillStyle = 'rgba(29,50,32,.5)';
              for (let i = 0; i < 4; i++) c.fillRect(px + noise(x + i, y, s.seed) * 35, py + 4 + i * 6, 10 + i * 2, 3);
            }
          } else {
            c.fillStyle = 'rgb(' + Math.round(42 + n * 10) + ',' + Math.round(54 + n * 11) + ',' + Math.round(50 + n * 11) + ')';
            c.fillRect(px, py, t, t);
            c.strokeStyle = 'rgba(8,18,19,.55)'; c.lineWidth = 1;
            c.strokeRect(px + 1.5, py + 1.5, t - 3, t - 3);
            c.strokeStyle = 'rgba(162,166,126,.05)';
            c.beginPath(); c.moveTo(px + 3, py + 3); c.lineTo(px + 44, py + 3); c.stroke();
            if (n < .32) {
              c.strokeStyle = 'rgba(4,15,18,.6)'; c.beginPath();
              c.moveTo(px + 5 + n * 25, py + 3); c.lineTo(px + 19, py + 20);
              c.lineTo(px + 16, py + 29); c.lineTo(px + 34, py + 42); c.stroke();
            }
            for (let i = 0; i < 4; i++) {
              const m = noise(x * 7 + i, y * 13 - i, s.seed);
              c.fillStyle = i % 2 ? 'rgba(174,156,100,.10)' : 'rgba(5,15,16,.17)';
              c.fillRect(px + m * 44, py + noise(y + i, x - i, s.seed) * 44, 1.5 + m * 3, 1.5);
            }
            // A wall casts a permanent thin shadow onto the floor immediately below it.
            if (y > 0 && s.grid[y - 1][x] === '#') {
              const g = c.createLinearGradient(0, py, 0, py + 13);
              g.addColorStop(0, 'rgba(0,5,7,.55)'); g.addColorStop(1, 'rgba(0,5,7,0)');
              c.fillStyle = g; c.fillRect(px, py, t, 13);
            }
          }
        }
      }
      this.worldKey = k; this.firstCamera = true; this.lastVisibilityKey = '';
    }

    _ray(s, x, y, angle, length) {
      const dx = Math.cos(angle) * .115, dy = Math.sin(angle) * .115;
      let px = x, py = y;
      for (let d = 0; d < length; d += .115) {
        const nx = px + dx, ny = py + dy;
        if (!walkable(s, nx, ny)) return { x: px + dx * .4, y: py + dy * .4 };
        px = nx; py = ny;
      }
      return { x: px, y: py };
    }

    _canSee(s, target, maxDistance) {
      const p = s.player, d = distance(p, target);
      if (d > maxDistance) return false;
      if (d < .2) return true;
      const end = this._ray(s, p.x, p.y, Math.atan2(target.y - p.y, target.x - p.x), d);
      return Math.hypot(end.x - target.x, end.y - target.y) < .24;
    }

    _lightPolygon(c, s, min, max, rays, radius, remove, angle, cone) {
      const p = s.player, o = this.worldToScreen(p.x, p.y);
      c.save(); c.beginPath();
      if (cone) c.moveTo(o.x, o.y);
      for (let i = 0; i <= rays; i++) {
        const a = min + (max - min) * i / rays;
        const point = this._ray(s, p.x, p.y, a, radius);
        const v = this.worldToScreen(point.x, point.y);
        if (!i && !cone) c.moveTo(v.x, v.y); else c.lineTo(v.x, v.y);
      }
      c.closePath(); c.clip();
      const g = c.createRadialGradient(o.x, o.y, this.tile * .35, o.x, o.y, this.tile * radius);
      g.addColorStop(0, 'rgba(0,0,0,' + remove + ')');
      g.addColorStop(.45, 'rgba(0,0,0,' + remove * .8 + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, this.width, this.height); c.restore();
    }

    _drawLighting(s, opts) {
      const l = this.light.getContext('2d');
      l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, this.width, this.height);
      l.fillStyle = 'rgba(0,4,7,.965)'; l.fillRect(0, 0, this.width, this.height);
      l.globalCompositeOperation = 'destination-out';
      const x1 = Math.max(0, Math.floor(this.camera.x)), y1 = Math.max(0, Math.floor(this.camera.y));
      const x2 = Math.min(s.width, Math.ceil(this.camera.x + this.width / this.tile));
      const y2 = Math.min(s.height, Math.ceil(this.camera.y + this.height / this.tile));
      l.fillStyle = 'rgba(0,0,0,.12)';
      for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
        if (s.discovered && s.discovered[y * s.width + x]) {
          const v = this.worldToScreen(x, y); l.fillRect(v.x, v.y, this.tile + 1, this.tile + 1);
        }
      }
      this._lightPolygon(l, s, 0, TAU, 84, s.player.hidden ? 1.6 : 3.1, .88, 0, false);
      if (opts.flashlight !== false && s.player.battery > 0 && !s.player.hidden) {
        const facing = Number.isFinite(s.player.facing) ? s.player.facing : 0;
        this._lightPolygon(l, s, facing - .60, facing + .60, 46, 8.2, .94, facing, true);
      }
      // Sprites rise vertically above their floor position. Light their visible upper body
      // as well, so a tall ghost's face is not accidentally hidden by a floor-only cone.
      const lightSprite = (point, radius, strength, offset) => {
        const v = this.worldToScreen(point.x, point.y - offset), r = this.tile * radius;
        const g = l.createRadialGradient(v.x, v.y, this.tile * .12, v.x, v.y, r);
        g.addColorStop(0, 'rgba(0,0,0,' + strength + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g; l.fillRect(v.x - r, v.y - r, r * 2, r * 2);
      };
      for (const npc of s.npcs || []) if (this._canSee(s, npc, 5)) lightSprite(npc, .85, .5, .5);
      if (s.ghost && this._canSee(s, s.ghost, opts.flashlight !== false && s.player.battery > 0 ? 8 : 3.2)) {
        lightSprite(s.ghost, 1.4, .57, .9);
      }
      l.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(this.light, 0, 0);
      const p = this.worldToScreen(s.player.x, s.player.y);
      const g = this.ctx.createRadialGradient(p.x, p.y, this.tile * .25, p.x, p.y, this.tile * 2.2);
      g.addColorStop(0, 'rgba(221,170,77,.075)'); g.addColorStop(1, 'rgba(221,170,77,0)');
      this.ctx.fillStyle = g; this.ctx.fillRect(0, 0, this.width, this.height);
    }

    _glow(x, y, radius, color, alpha) {
      const c = this.ctx, v = this.worldToScreen(x, y), r = radius * this.tile;
      const g = c.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
      g.addColorStop(0, 'rgba(' + color + ',' + alpha + ')'); g.addColorStop(1, 'rgba(' + color + ',0)');
      c.fillStyle = g; c.fillRect(v.x - r, v.y - r, r * 2, r * 2);
    }

    _label(text, x, y, color) {
      const c = this.ctx, v = this.worldToScreen(x, y);
      c.save(); c.font = '600 11px "Malgun Gothic",system-ui,sans-serif';
      const w = c.measureText(text).width + 14;
      roundRect(c, v.x - w / 2, v.y - 10, w, 22, 5);
      c.fillStyle = 'rgba(3,11,13,.86)'; c.fill();
      c.strokeStyle = 'rgba(178,164,126,.25)'; c.lineWidth = 1; c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color || '#e4ddc9';
      c.fillText(text, v.x, v.y + 1); c.restore();
    }

    _drawAtlas(image, index, cols, rows, x, y, size, flip, bob) {
      if (!loaded(image)) return false;
      const c = this.ctx, v = this.worldToScreen(x, y);
      const sw = (image.naturalWidth || image.width) / cols, sh = (image.naturalHeight || image.height) / rows;
      const w = this.tile * size, h = w * sh / sw;
      c.save(); c.translate(v.x, v.y + (bob || 0)); c.scale(flip ? -1 : 1, 1);
      c.drawImage(image, (index % cols) * sw, Math.floor(index / cols) * sh, sw, sh, -w / 2, -h * .79, w, h);
      c.restore(); return true;
    }

    _drawFallback(x, y, color, monster) {
      const c = this.ctx, v = this.worldToScreen(x, y);
      c.save(); c.translate(v.x, v.y);
      c.fillStyle = color; c.beginPath(); c.ellipse(0, -12, monster ? 17 : 13, monster ? 27 : 16, 0, 0, TAU); c.fill();
      c.fillStyle = monster ? '#dd8c3b' : '#e1dfd0';
      c.beginPath(); c.arc(0, monster ? -31 : -23, monster ? 13 : 11, 0, TAU); c.fill();
      c.fillStyle = '#10191a'; c.fillRect(-6, -25, 3, 4); c.fillRect(4, -25, 3, 4);
      c.restore();
    }

    _drawProps(s, opts) {
      const c = this.ctx, t = this.tile;
      for (const h of s.hides || []) {
        if (!this._canSee(s, h, 7)) continue;
        const v = this.worldToScreen(h.x, h.y);
        c.fillStyle = '#302c23'; c.fillRect(v.x - t * .28, v.y - t * .5, t * .56, t * .66);
        c.strokeStyle = '#85704b'; c.lineWidth = 1.5; c.strokeRect(v.x - t * .27, v.y - t * .49, t * .54, t * .64);
        c.strokeStyle = '#111d1a'; c.beginPath(); c.moveTo(v.x, v.y - t * .46); c.lineTo(v.x, v.y + t * .12); c.stroke();
        c.fillStyle = '#b8a267'; c.fillRect(v.x - 4, v.y - 6, 2, 5); c.fillRect(v.x + 2, v.y - 6, 2, 5);
        this._glow(h.x, h.y, .8, '93,168,128', .1);
        if (distance(s.player, h) < 2.3) this._label('숨을 곳', h.x, h.y - .75, '#b1d7b9');
      }
      for (const e of s.evidence || []) {
        if ((s.found || []).includes(e.id) || !this._canSee(s, e, 7)) continue;
        const v = this.worldToScreen(e.x, e.y);
        const pulse = opts.reduceMotion ? 1 : .85 + Math.sin(opts.time * 2) * .15;
        this._glow(e.x, e.y, .95, '231,184,90', .22 * pulse);
        c.save(); c.translate(v.x, v.y - 6); c.rotate(-.15);
        c.fillStyle = '#c1aa76'; c.fillRect(-10, -12, 20, 25);
        c.strokeStyle = '#574b33'; c.lineWidth = 1; c.strokeRect(-10, -12, 20, 25);
        c.fillStyle = '#795b3c'; c.fillRect(-6, -6, 12, 1); c.fillRect(-6, -2, 9, 1); c.fillRect(-6, 2, 11, 1);
        c.fillStyle = '#8e452e'; c.beginPath(); c.arc(4, 8, 3, 0, TAU); c.fill(); c.restore();
        if (distance(s.player, e) < 3.5) this._label('소환 흔적', e.x, e.y - .6, '#ecd99a');
      }
      for (const p of s.pickups || []) {
        if (p.used || !this._canSee(s, p, 6)) continue;
        const v = this.worldToScreen(p.x, p.y);
        c.fillStyle = '#a0af94'; c.fillRect(v.x - 6, v.y - 10, 12, 19);
        c.fillStyle = '#344943'; c.fillRect(v.x - 4, v.y - 6, 8, 7);
        c.fillStyle = '#c9bb80'; c.fillRect(v.x - 3, v.y - 13, 6, 3);
        this._glow(p.x, p.y, .6, '151,201,157', .12);
      }
      if (s.exit && this._canSee(s, s.exit, 8)) {
        const v = this.worldToScreen(s.exit.x, s.exit.y);
        this._glow(s.exit.x, s.exit.y, 1.5, '211,143,61', .27);
        c.fillStyle = '#141b18'; c.fillRect(v.x - t * .36, v.y - t * .72, t * .72, t * .9);
        c.strokeStyle = '#82714d'; c.lineWidth = 3; c.strokeRect(v.x - t * .36, v.y - t * .72, t * .72, t * .9);
        c.strokeStyle = '#a15a36'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(v.x - 14, v.y - 32); c.lineTo(v.x + 14, v.y + 2);
        c.moveTo(v.x + 14, v.y - 32); c.lineTo(v.x - 14, v.y + 2); c.stroke();
        c.fillStyle = '#c0a15c'; c.beginPath(); c.arc(v.x + 11, v.y - 8, 2.5, 0, TAU); c.fill();
        this._label((s.found || []).length >= 3 ? '범인의 이름을 새겨라' : '봉인된 출구', s.exit.x, s.exit.y - 1.05, '#eed19b');
      }
    }

    _drawCharacters(s, opts) {
      const objects = [];
      for (const npc of s.npcs || []) if (this._canSee(s, npc, 7)) objects.push({ kind: 'npc', data: npc, y: npc.y });
      const p = s.player, g = s.ghost;
      objects.push({ kind: 'player', data: p, y: p.y });
      if (g && this._canSee(s, g, opts.flashlight !== false && p.battery > 0 ? 8 : 3.2)) {
        objects.push({ kind: 'ghost', data: g, y: g.y });
      }
      objects.sort((a, b) => a.y - b.y);
      for (const obj of objects) {
        const a = obj.data;
        if (obj.kind === 'npc') {
          this._glow(a.x, a.y, 1.25, '221,153,65', .13);
          const bob = opts.reduceMotion ? 0 : Math.sin(opts.time * 1.8 + a.profileIndex) * 1;
          if (!this._drawAtlas(this.assets.npc, a.profileIndex, 4, 2, a.x, a.y, 1.35, false, bob)) this._drawFallback(a.x, a.y, '#9a9b7a', false);
          if (distance(p, a) < 4.4) this._label(a.name, a.x, a.y - 1.11, (s.visited || []).includes(a.id) ? '#b8ceba' : '#e8d7ab');
        } else if (obj.kind === 'ghost') {
          const d = distance(p, a), mode = a.mode || 'patrol';
          let row = mode === 'attack' ? 3 : mode === 'chase' ? 2 : mode === 'patrol' || mode === 'search' ? 1 : 0;
          if (mode === 'search' && a.target && Math.floor(a.x) === Math.floor(a.target.x) && Math.floor(a.y) === Math.floor(a.target.y)) row = 0;
          if (d < 1.3 && mode === 'chase') row = 3;
          const fps = row === 2 ? 9 : row === 3 ? 12 : row === 1 ? 6 : 3;
          const frame = opts.reduceMotion ? 0 : Math.floor((a.animTime || opts.time) * fps) % 4;
          const bob = opts.reduceMotion ? 0 : Math.sin(opts.time * 3.5) * this.tile * .035;
          this._glow(a.x, a.y - .6, 1.45, '160,64,21', .16);
          if (!this._drawAtlas(this.assets.ghost, row * 4 + frame, 4, 4, a.x, a.y, 2.35, Math.cos(a.facing || 0) < -.15, bob)) {
            if (loaded(this.assets.portrait)) this._drawAtlas(this.assets.portrait, 0, 1, 1, a.x, a.y, 1.55, false, bob);
            else this._drawFallback(a.x, a.y, '#252c23', true);
          }
        } else {
          this.ctx.save(); if (p.hidden) this.ctx.globalAlpha = .33;
          const old = this.lastPlayer;
          const moved = old ? Math.hypot(old.x - p.x, old.y - p.y) : 0;
          this.playerStride += Math.min(.2, moved) * 11;
          this.lastPlayer = { x: p.x, y: p.y };
          const bob = !opts.reduceMotion && moved > .0001 ? Math.sin(this.playerStride) * 1.5 : 0;
          if (!this._drawAtlas(this.assets.npc, 6, 4, 2, p.x, p.y, 1.27, Math.cos(p.facing || 0) < -.15, bob)) this._drawFallback(p.x, p.y, '#536451', false);
          const v = this.worldToScreen(p.x, p.y), f = p.facing || 0;
          if (opts.flashlight !== false && p.battery > 0 && !p.hidden) {
            this.ctx.fillStyle = '#f7deb0'; this.ctx.beginPath();
            this.ctx.arc(v.x + Math.cos(f) * 15, v.y - 8 + Math.sin(f) * 9, 3, 0, TAU); this.ctx.fill();
          }
          this.ctx.restore();
        }
      }
    }

    _drawMap(s) {
      const c = this.ctx;
      const pad = this.width < 500 ? 16 : 28;
      const maxW = Math.min(this.width - pad * 2, 680), maxH = Math.min(this.height - pad * 2 - 42, 520);
      const unit = Math.min(maxW / s.width, maxH / s.height);
      const w = unit * s.width, h = unit * s.height;
      const x0 = (this.width - w) / 2, y0 = (this.height - h) / 2 + 16;
      c.save(); c.fillStyle = 'rgba(1,7,9,.92)'; c.fillRect(0, 0, this.width, this.height);
      c.font = '600 14px "Malgun Gothic",system-ui,sans-serif'; c.fillStyle = '#e6d6af'; c.textAlign = 'center';
      c.fillText('탐색 지도 · 밝혀낸 길만 표시', this.width / 2, y0 - 26);
      c.fillStyle = '#071416'; c.fillRect(x0 - 8, y0 - 8, w + 16, h + 16);
      for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
        const known = s.discovered && s.discovered[y * s.width + x];
        if (!known) continue;
        c.fillStyle = s.grid[y][x] === '#' ? '#213b3d' : '#66746b';
        c.fillRect(x0 + x * unit, y0 + y * unit, Math.ceil(unit), Math.ceil(unit));
      }
      const mark = (point, color, size) => {
        c.fillStyle = color; c.beginPath(); c.arc(x0 + point.x * unit, y0 + point.y * unit, Math.max(2.5, unit * size), 0, TAU); c.fill();
      };
      const known = point => s.discovered && s.discovered[Math.floor(point.y) * s.width + Math.floor(point.x)];
      for (const n of s.npcs || []) if (known(n)) mark(n, '#ddb56a', .32);
      for (const e of s.evidence || []) if (known(e) && !(s.found || []).includes(e.id)) mark(e, '#c6d8ae', .3);
      if (s.exit) { mark(s.exit, '#d18e5d', .4); }
      mark(s.player, '#faf2d7', .42);
      c.font = '11px "Malgun Gothic",system-ui,sans-serif'; c.fillStyle = '#c5cbbf';
      c.fillText('흰색: 이뭉   노랑: 햄찌   연두: 흔적   주황: 출구', this.width / 2, y0 + h + 28);
      c.restore();
    }

    draw(state, options) {
      const opts = Object.assign({ time: 0, flashlight: true, reduceMotion: false, showMap: false, danger: 0 }, options);
      opts.time = Number.isFinite(opts.time) ? opts.time : 0;
      const c = this.ctx;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#03090b'; c.fillRect(0, 0, this.width, this.height);
      if (!state || !state.grid || !state.player) {
        if (loaded(this.assets.title)) {
          const img = this.assets.title, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
          const scale = Math.max(this.width / iw, this.height / ih);
          c.drawImage(img, (this.width - iw * scale) / 2, (this.height - ih * scale) / 2, iw * scale, ih * scale);
          c.fillStyle = 'rgba(1,7,9,.25)'; c.fillRect(0, 0, this.width, this.height);
        }
        return;
      }
      this._makeWorld(state);
      const vw = this.width / this.tile, vh = this.height / this.tile;
      // Keep the detective in usable play space even beside the outer maze wall.
      // Negative camera coordinates deliberately show darkness outside the building.
      const tx = state.player.x - vw * .5;
      const ty = state.player.y - vh * (this.width < 500 ? .44 : .48);
      if (this.firstCamera || opts.reduceMotion) { this.camera.x = tx; this.camera.y = ty; this.firstCamera = false; }
      else { this.camera.x = mix(this.camera.x, tx, .18); this.camera.y = mix(this.camera.y, ty, .18); }
      const scale = this.tile / 48;
      c.drawImage(this.world, -this.camera.x * this.tile, -this.camera.y * this.tile, this.world.width * scale, this.world.height * scale);
      this._drawProps(state, opts); this._drawCharacters(state, opts); this._drawLighting(state, opts);
      const danger = clamp(opts.danger || (state.ghost && state.ghost.mode === 'chase' ? .7 : 0), 0, 1);
      const vg = c.createRadialGradient(this.width / 2, this.height / 2, this.width * .23, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, danger > .1 ? 'rgba(91,17,7,' + (danger * .6) + ')' : 'rgba(0,0,0,.62)');
      c.fillStyle = vg; c.fillRect(0, 0, this.width, this.height);
      if (state.player.hidden) {
        c.fillStyle = 'rgba(3,15,14,.28)'; c.fillRect(0, 0, this.width, this.height);
        c.strokeStyle = 'rgba(143,182,151,.3)'; c.lineWidth = 3; c.strokeRect(10, 10, this.width - 20, this.height - 20);
      }
      if (opts.showMap) this._drawMap(state);
    }

    drawScare(progress, reduceMotion) {
      const c = this.ctx, p = clamp(progress, 0, 1);
      c.save(); c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = '#070605'; c.fillRect(0, 0, this.width, this.height);
      const image = loaded(this.assets.scare) ? this.assets.scare : this.assets.portrait;
      if (loaded(image)) {
        const atlas = image === this.assets.scare, cols = atlas ? 2 : 1, rows = atlas ? 2 : 1;
        const frame = atlas ? reduceMotion ? 1 : Math.min(3, Math.floor(p * 4)) : 0;
        const sw = (image.naturalWidth || image.width) / cols, sh = (image.naturalHeight || image.height) / rows;
        const scale = Math.max(this.width / sw, this.height / sh) * (reduceMotion ? 1 : 1 + p * .075);
        const dx = reduceMotion ? 0 : Math.sin(p * 21) * (1 - p) * 3;
        c.drawImage(image, (frame % cols) * sw, Math.floor(frame / cols) * sh, sw, sh, (this.width - sw * scale) / 2 + dx, (this.height - sh * scale) / 2, sw * scale, sh * scale);
      }
      const v = c.createRadialGradient(this.width / 2, this.height * .45, this.width * .2, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .65);
      v.addColorStop(0, 'rgba(44,10,0,0)'); v.addColorStop(1, 'rgba(39,3,0,.88)');
      c.fillStyle = v; c.fillRect(0, 0, this.width, this.height);
      // One fade, never repeated strobing or full-screen white flashing.
      const fade = p < .08 ? 1 - p / .08 : p > .91 ? (p - .91) / .09 : 0;
      if (fade > 0) { c.fillStyle = 'rgba(0,0,0,' + fade + ')'; c.fillRect(0, 0, this.width, this.height); }
      c.restore();
    }
  }

  root.HalloweenRenderer = HalloweenRenderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = HalloweenRenderer;
})(typeof globalThis !== 'undefined' ? globalThis : window);
