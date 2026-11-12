(function (root) {
  'use strict';

  const VERSION = 1;
  const WORLD_SIZE = 1000;
  const CENTER = Object.freeze({ x: 500, y: 500 });
  const ARENA_RADIUS = 430;
  const PLAYER_SPEED = 310;
  const PLAYER_RADIUS = 10;
  const STEP = 1 / 120;
  const MAX_FRAME = .1;
  const ENEMY_CAP = 80;
  const WARNING_CAP = 24;
  const ENEMIES = [
    { id: 'dipijin', name: '디피진', profileIndex: 0, color: '#d7e8e5' },
    { id: 'reaper', name: '저승사자', profileIndex: 1, color: '#94c8bd' },
    { id: 'ddon', name: '똔꾸리', profileIndex: 2, color: '#cb7662' },
    { id: 'mang', name: '다망해', profileIndex: 3, color: '#a8cbd1' },
    { id: 'gong', name: '공명', profileIndex: 4, color: '#e1c46c' },
    { id: 'cookie', name: '랫서쿠키', profileIndex: 5, color: '#d69a64' }
  ];
  const STAGES = [
    { at: 0, index: 0, name: '숲의 첫인사' },
    { at: 10, index: 1, name: '햄찌 러시' },
    { at: 25, index: 2, name: '양쪽을 조심해' },
    { at: 45, index: 3, name: '몰려오는 햄찌들' },
    { at: 75, index: 4, name: '뭉림의 경지' }
  ];
  const RANKS = [
    { at: 0, name: '첫걸음 뭉찌', description: '달려오는 쪽을 보고, 살짝 비켜 보세요.' },
    { at: 10, name: '숲길 수련생', description: '발놀림이 가벼워지기 시작했어요.' },
    { at: 20, name: '날쌘 뭉찌', description: '햄찌 사이로 빈틈이 보이나요?' },
    { at: 30, name: '뭉림고수', description: '대나무숲이 실력을 인정했어요.' },
    { at: 60, name: '전설의 뭉찌', description: '이뭉의 발걸음에 바람이 실립니다.' },
    { at: 90, name: '대나무숲의 주인', description: '오늘의 숲은 이뭉의 무대예요.' }
  ];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;

  function stageFor(seconds) {
    const t = Math.max(0, finite(seconds, 0));
    const stage = STAGES.findLast ? STAGES.findLast(s => t >= s.at) : STAGES.slice().reverse().find(s => t >= s.at);
    return { index: stage.index, name: stage.name };
  }

  function getRank(seconds) {
    const t = Math.max(0, finite(seconds, 0));
    const rank = RANKS.slice().reverse().find(r => t >= r.at);
    return { name: rank.name, description: rank.description };
  }

  function random(state) {
    state.rng = state.rng + 0x6D2B79F5 >>> 0;
    let n = state.rng;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  }

  function create(seed = 1) {
    if (!Number.isInteger(seed)) throw new Error('유효한 수련 번호가 필요합니다.');
    seed >>>= 0;
    const state = {
      version: VERSION, seed, status: 'playing', elapsed: 0,
      player: { x: CENTER.x, y: CENTER.y, r: PLAYER_RADIUS, vx: 0, vy: 0, facing: 0 },
      enemies: [], warnings: [], nearMisses: 0, spawned: 0, hit: null,
      rng: seed, accumulator: 0, nextWaveAt: 1.1, waveIndex: 0,
      nextId: 1, stageIndex: 0, baseAngle: 0, kindOffset: 0
    };
    state.baseAngle = random(state) * Math.PI * 2;
    state.kindOffset = Math.floor(random(state) * ENEMIES.length);
    return state;
  }

  function waveSettings(time) {
    const stage = stageFor(time).index;
    const interval = [1.3, 1.1, .98, .86, .74][stage];
    const lead = [.8, .75, .68, .61, .56][stage];
    const speed = Math.min(455, 242 + time * 2.25);
    return { stage, interval, lead, speed };
  }

  function addWarning(state, angle, aimX, aimY, kindIndex, cfg, events) {
    if (state.warnings.length >= WARNING_CAP || state.enemies.length + state.warnings.length >= ENEMY_CAP) return;
    const type = ENEMIES[kindIndex % ENEMIES.length];
    const targetLength = Math.hypot(aimX - CENTER.x, aimY - CENTER.y);
    if (targetLength > ARENA_RADIUS - PLAYER_RADIUS) {
      const k = (ARENA_RADIUS - PLAYER_RADIUS) / targetLength;
      aimX = CENTER.x + (aimX - CENTER.x) * k; aimY = CENTER.y + (aimY - CENTER.y) * k;
    }
    const sx = CENTER.x + Math.cos(angle) * 510;
    const sy = CENTER.y + Math.sin(angle) * 510;
    const dx = aimX - sx, dy = aimY - sy, len = Math.hypot(dx, dy) || 1;
    const warning = {
      id: 'w' + state.nextId++, x: CENTER.x + Math.cos(angle) * ARENA_RADIUS,
      y: CENTER.y + Math.sin(angle) * ARENA_RADIUS, angle,
      remaining: cfg.lead, total: cfg.lead, kind: type.id, profileIndex: type.profileIndex,
      aimX, aimY, sx, sy, vx: dx / len * cfg.speed, vy: dy / len * cfg.speed,
      releaseAt: state.elapsed + cfg.lead
    };
    state.warnings.push(warning);
    events.push({ type: 'warning', id: warning.id, kind: warning.kind, x: warning.x, y: warning.y });
  }

  function wave(state, events) {
    const cfg = waveSettings(state.elapsed), n = state.waveIndex++;
    // A golden-angle progression avoids camping a permanently quiet side.
    const a = state.baseAngle + n * 2.399963229728653 + (random(state) - .5) * .42;
    const p = state.player, type = state.kindOffset + n;
    addWarning(state, a, p.x, p.y, type, cfg, events);
    if ((cfg.stage === 1 && n % 4 === 3) || cfg.stage >= 2) {
      if (cfg.stage >= 3 && n % 3 === 1) {
        // Parallel lanes have generous gaps; the whole fan is telegraphed together.
        const px = -Math.sin(a) * 105, py = Math.cos(a) * 105;
        addWarning(state, a - .24, p.x + px, p.y + py, type + 1, cfg, events);
        addWarning(state, a + .24, p.x - px, p.y - py, type + 2, cfg, events);
      } else {
        const opposite = a + Math.PI * (.78 + random(state) * .44);
        addWarning(state, opposite, p.x, p.y, type + 1, cfg, events);
        if (cfg.stage === 4 && n % 4 === 0) addWarning(state, a + Math.PI / 2, p.x, p.y, type + 2, cfg, events);
      }
    }
    state.nextWaveAt += cfg.interval;
  }

  function release(state, events) {
    const remaining = [];
    for (const w of state.warnings) {
      if (state.elapsed + 1e-9 < w.releaseAt) { remaining.push(w); continue; }
      if (state.enemies.length >= ENEMY_CAP) continue;
      const type = ENEMIES.find(e => e.id === w.kind);
      const enemy = {
        id: 'e' + state.nextId++, kind: type.id, profileIndex: type.profileIndex,
        name: type.name, x: w.sx, y: w.sy, vx: w.vx, vy: w.vy,
        r: 19, age: 0, near: false
      };
      state.enemies.push(enemy); state.spawned++;
      events.push({ type: 'spawn', id: enemy.id, kind: enemy.kind, x: enemy.x, y: enemy.y });
    }
    state.warnings = remaining;
  }

  // First intersection of a moving relative point with the collision circle.
  // Both actors move within a substep: testing only their final positions would tunnel.
  function collisionFraction(dx, dy, mx, my, radius) {
    const c = dx * dx + dy * dy - radius * radius;
    if (c <= 0) return 0;
    const a = mx * mx + my * my;
    if (a < 1e-14) return null;
    const b = 2 * (dx * mx + dy * my), discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    return t >= -1e-10 && t <= 1 + 1e-10 ? clamp(t, 0, 1) : null;
  }

  function closestDistance(dx, dy, mx, my) {
    const l2 = mx * mx + my * my;
    const t = l2 ? clamp(-(dx * mx + dy * my) / l2, 0, 1) : 0;
    return Math.hypot(dx + mx * t, dy + my * t);
  }

  function tick(state, dt, input, events) {
    const stage = stageFor(state.elapsed);
    if (stage.index !== state.stageIndex) { state.stageIndex = stage.index; events.push({ type: 'stage', ...stage }); }
    if (state.elapsed + 1e-9 >= state.nextWaveAt) wave(state, events);
    release(state, events);

    const p = state.player, ox = p.x, oy = p.y;
    let ix = clamp(finite(input.x, 0), -1, 1), iy = clamp(finite(input.y, 0), -1, 1);
    const magnitude = Math.hypot(ix, iy);
    if (magnitude > 1) { ix /= magnitude; iy /= magnitude; }
    let nx = ox + ix * PLAYER_SPEED * dt, ny = oy + iy * PLAYER_SPEED * dt;
    const cx = nx - CENTER.x, cy = ny - CENTER.y, length = Math.hypot(cx, cy), bound = ARENA_RADIUS - p.r;
    if (length > bound) { nx = CENTER.x + cx / length * bound; ny = CENTER.y + cy / length * bound; }
    const px = nx - ox, py = ny - oy;
    p.vx = px / dt; p.vy = py / dt;
    if (magnitude > .01) p.facing = Math.atan2(iy, ix);

    let first = null, fraction = 1;
    for (const enemy of state.enemies) {
      const t = collisionFraction(enemy.x - ox, enemy.y - oy, enemy.vx * dt - px, enemy.vy * dt - py, p.r + enemy.r);
      if (t !== null && (first === null || t < fraction)) { first = enemy; fraction = t; }
    }
    p.x = ox + px * fraction; p.y = oy + py * fraction;
    for (const enemy of state.enemies) {
      const dx = enemy.x - ox, dy = enemy.y - oy;
      const mx = enemy.vx * dt * fraction - px * fraction, my = enemy.vy * dt * fraction - py * fraction;
      enemy.x += enemy.vx * dt * fraction; enemy.y += enemy.vy * dt * fraction; enemy.age += dt * fraction;
      if (!first && !enemy.near && closestDistance(dx, dy, mx, my) < p.r + enemy.r + 16 &&
          (enemy.x - p.x) * (enemy.vx - p.vx) + (enemy.y - p.y) * (enemy.vy - p.vy) > 0) {
        enemy.near = true; state.nearMisses++; events.push({ type: 'near', id: enemy.id, kind: enemy.kind });
      }
    }
    state.elapsed += dt * fraction;
    for (const w of state.warnings) w.remaining = Math.max(0, w.releaseAt - state.elapsed);
    if (first) {
      state.status = 'over'; p.vx = 0; p.vy = 0;
      state.hit = { name: first.name, kind: first.kind, x: p.x, y: p.y, time: state.elapsed, enemyId: first.id, enemyX: first.x, enemyY: first.y };
      events.push({ type: 'hit', ...state.hit });
      return;
    }
    state.enemies = state.enemies.filter(e => {
      const dx = e.x - CENTER.x, dy = e.y - CENTER.y;
      return e.age < 12 && !(Math.hypot(dx, dy) > ARENA_RADIUS + 110 && dx * e.vx + dy * e.vy > 0);
    });
  }

  function step(state, dtSeconds, input = {}) {
    if (!state || state.status !== 'playing' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return [];
    const events = [];
    state.accumulator += Math.min(dtSeconds, MAX_FRAME);
    while (state.accumulator + 1e-10 >= STEP && state.status === 'playing') {
      state.accumulator = Math.max(0, state.accumulator - STEP);
      tick(state, STEP, input || {}, events);
    }
    if (state.status === 'over') state.accumulator = 0;
    return events;
  }

  const API = { VERSION, WORLD_SIZE, CENTER, ARENA_RADIUS, PLAYER_SPEED, PLAYER_RADIUS, ENEMIES, RANKS, create, step, getRank, stageFor };
  root.MoonglimEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
