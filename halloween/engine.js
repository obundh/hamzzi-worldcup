(function (root) {
  'use strict';

  const VERSION = 1;
  const WIDTH = 35;
  const HEIGHT = 27;
  const SUSPECTS = [
    { id: 'dipijin', name: '디피진', profileIndex: 0 },
    { id: 'reaper', name: '저승사자', profileIndex: 1 },
    { id: 'ddon', name: '똔꾸리', profileIndex: 2 },
    { id: 'mang', name: '다망해', profileIndex: 3 },
    { id: 'gong', name: '공명', profileIndex: 4 },
    { id: 'cookie', name: '랫서쿠키', profileIndex: 5 }
  ];
  const TRAITS = [
    { id: 'wax', name: '가져온 양초', values: ['하얀 양초', '보라 양초'] },
    { id: 'ribbon', name: '초대장 리본', values: ['붉은 리본', '검은 리본'] },
    { id: 'mark', name: '초대장 문양', values: ['달 문양', '별 문양'] }
  ];
  const HELP = [
    '선글라스를 벗고 봤어. 소환진 옆에 양초 찌꺼기가 남아 있더라. 불빛을 오래 켜면 그 녀석도 널 볼 거야.',
    '내가 불렀냐고? 이름만 보고 의심하지 마. 소환 흔적 셋을 대조해. 문에 정확한 이름을 새겨야 끝나.',
    '달리면 발소리가 나! 따라오면 모퉁이를 돌아 옷장으로 들어가. 바로 앞에서 숨는 건 소용없어.',
    '다 망했어… 초대장에 묶인 리본이 떨어져 있었어. 누가 어떤 물건을 가져왔는지는 수첩에 적어 뒀지?',
    '저 문은 왔던 곳에 있어. 해바라기 말고 소환진의 문양을 봐. 달인지 별인지, 그게 마지막 조각이야.',
    '간식도 못 먹고 갇혔네. 건전지를 보면 챙겨. 손전등을 꺼도 조금은 보이니까, 계속 켜둘 필요는 없어.'
  ];
  const ALIBI_PLACES = ['남쪽 창고', '끊어진 다리 앞', '북쪽 연회실', '옷장 복도', '시든 정원', '빈 주방'];
  const IDS = new Set(SUSPECTS.map(n => n.id));
  const EVIDENCE_IDS = new Set(TRAITS.map(t => t.id));
  const MODES = new Set(['patrol', 'chase', 'search', 'stunned', 'attack']);
  const CONFIG = {
    normal: { patrol: 1.26, chase: 3.05, vision: 7.2, memory: 4.5, grace: 18, drain: .38 },
    story: { patrol: 1.02, chase: 2.35, vision: 5.2, memory: 2.9, grace: 24, drain: .24 }
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pos = (x, y) => ({ x: x + .5, y: y + .5 });
  const cellKey = p => Math.floor(p.y) * WIDTH + Math.floor(p.x);

  function random(seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffle(items, rng) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; --i) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function walkable(state, x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    return tx >= 0 && ty >= 0 && tx < state.width && ty < state.height && state.grid[ty][tx] !== '#';
  }

  function maze(rng) {
    const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill('#'));
    const stack = [[1, 1]];
    grid[1][1] = '.';
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const options = shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]], rng)
        .filter(([dx, dy]) => x + dx > 0 && x + dx < WIDTH - 1 && y + dy > 0 && y + dy < HEIGHT - 1 && grid[y + dy][x + dx] === '#');
      if (!options.length) { stack.pop(); continue; }
      const [dx, dy] = options[0];
      grid[y + dy / 2][x + dx / 2] = '.';
      grid[y + dy][x + dx] = '.';
      stack.push([x + dx, y + dy]);
    }
    const rooms = [[2, 2], [8, 4], [17, 4], [29, 4], [6, 14], [18, 14], [30, 22], [29, 10], [10, 22], [22, 22]];
    for (const [cx, cy] of rooms) {
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) grid[y][x] = '.';
    }
    // Short loops give the player alternatives during a chase, without disconnected pockets.
    for (let i = 0; i < 24; i++) {
      const x = 2 + Math.floor(rng() * (WIDTH - 4));
      const y = 2 + Math.floor(rng() * (HEIGHT - 4));
      if (grid[y][x] === '#' && ((grid[y][x - 1] === '.' && grid[y][x + 1] === '.') || (grid[y - 1][x] === '.' && grid[y + 1][x] === '.'))) grid[y][x] = '.';
    }
    return grid.map(row => row.join(''));
  }

  function path(state, from, to) {
    if (!from || !to || !walkable(state, from.x, from.y) || !walkable(state, to.x, to.y)) return [];
    const sx = Math.floor(from.x), sy = Math.floor(from.y), tx = Math.floor(to.x), ty = Math.floor(to.y);
    const target = ty * state.width + tx;
    const start = sy * state.width + sx;
    const prev = new Int32Array(state.width * state.height).fill(-1);
    const queue = [start];
    prev[start] = start;
    for (let i = 0; i < queue.length && prev[target] === -1; i++) {
      const current = queue[i], x = current % state.width, y = Math.floor(current / state.width);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, next = ny * state.width + nx;
        if (walkable(state, nx, ny) && prev[next] === -1) { prev[next] = current; queue.push(next); }
      }
    }
    if (prev[target] === -1) return [];
    const result = [];
    let cursor = target;
    while (true) {
      result.push({ x: cursor % state.width, y: Math.floor(cursor / state.width) });
      if (cursor === start) break;
      cursor = prev[cursor];
    }
    return result.reverse();
  }

  function lineOfSight(state, a, b) {
    const length = dist(a, b), steps = Math.max(1, Math.ceil(length * 8));
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      if (Math.floor(x) === Math.floor(b.x) && Math.floor(y) === Math.floor(b.y)) continue;
      if (!walkable(state, x, y)) return false;
    }
    return true;
  }

  function canOccupy(state, x, y, radius) {
    return [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]
      .every(([dx, dy]) => walkable(state, x + dx, y + dy));
  }

  function reveal(state, light) {
    const radius = light && state.player.battery > 0 ? 5.4 : 2.6;
    const p = state.player;
    for (let y = Math.max(0, Math.floor(p.y - radius)); y <= Math.min(state.height - 1, Math.ceil(p.y + radius)); y++) {
      for (let x = Math.max(0, Math.floor(p.x - radius)); x <= Math.min(state.width - 1, Math.ceil(p.x + radius)); x++) {
        if (Math.hypot(x + .5 - p.x, y + .5 - p.y) <= radius && lineOfSight(state, p, { x: x + .5, y: y + .5 })) state.discovered[y * state.width + x] = 1;
      }
    }
  }

  function farthest(state, from, avoid) {
    let best = state.start, longest = -1;
    for (const candidate of state.patrolPoints) {
      const len = path(state, from, candidate).length;
      if ((!avoid || dist(candidate, avoid) > 8) && len > longest) { longest = len; best = candidate; }
    }
    return { x: best.x, y: best.y };
  }

  function makeEvidence(traits) {
    return [
      { id: 'wax', ...pos(29, 10), title: '소환진의 촛농', trait: 'wax', value: traits.wax,
        text: traits.wax ? '돌바닥에 굳은 촛농은 보라색이다. 소환자는 보라 양초를 가져왔다.' : '돌바닥에 굳은 촛농은 흰색이다. 소환자는 하얀 양초를 가져왔다.' },
      { id: 'ribbon', ...pos(10, 22), title: '문틈의 리본', trait: 'ribbon', value: traits.ribbon,
        text: traits.ribbon ? '문틈에 끼인 리본은 타지 않은 부분까지 검다. 소환자의 초대장에는 검은 리본이 묶여 있었다.' : '문틈에 붉은 천 조각이 끼어 있다. 소환자의 초대장에는 붉은 리본이 묶여 있었다.' },
      { id: 'mark', ...pos(22, 22), title: '젖은 초대장 조각', trait: 'mark', value: traits.mark,
        text: traits.mark ? '소환진에서 주운 초대장 귀퉁이에 별이 찍혀 있다. 소환자의 초대장에는 별 문양이 있었다.' : '소환진에서 주운 초대장 귀퉁이에 초승달이 찍혀 있다. 소환자의 초대장에는 달 문양이 있었다.' }
    ];
  }

  function create(seed, difficulty = 'normal') {
    if (!Number.isInteger(seed) || !CONFIG[difficulty]) throw new Error('유효하지 않은 사건 설정입니다.');
    seed >>>= 0;
    const rng = random(seed);
    const grid = maze(rng);
    const rooms = shuffle([[8, 4], [17, 4], [29, 4], [6, 14], [18, 14], [30, 22]], rng);
    // Every binary feature is evenly represented, and each complete profile is unique.
    const patterns = shuffle([0, 1, 2, 5, 6, 7], rng);
    const culprit = SUSPECTS[Math.floor(rng() * SUSPECTS.length)].id;
    const npcs = SUSPECTS.map((person, i) => ({
      ...person, ...pos(...rooms[i]),
      traits: { wax: patterns[i] & 1, ribbon: patterns[i] >> 1 & 1, mark: patterns[i] >> 2 & 1 },
      alibi: `“종이 울릴 때 나는 ${ALIBI_PLACES[i]}에 있었어.”`,
      dialogue: HELP[i]
    }));
    const state = {
      version: VERSION, seed, difficulty, status: 'playing', elapsed: 0, width: WIDTH, height: HEIGHT, grid,
      start: pos(2, 2), exit: pos(2, 2), altar: pos(2, 2), culprit,
      player: { ...pos(2, 2), facing: 0, stamina: 100, battery: 100, lives: 2, hidden: false, moving: false, sprinting: false },
      ghost: { x: 0, y: 0, facing: Math.PI / 2, mode: 'patrol', animTime: 0, path: [], target: null, lastSeen: null, memoryUntil: 0, thinkIn: 0, wait: 0, patrolIndex: 0 },
      npcs, evidence: makeEvidence(npcs.find(n => n.id === culprit).traits), found: [], visited: [],
      hides: [pos(4, 3), pos(8, 3), pos(16, 3), pos(28, 3), pos(5, 13), pos(17, 13), pos(29, 21), pos(28, 9), pos(9, 21), pos(21, 21)],
      pickups: [[7, 5], [18, 5], [30, 5], [7, 15], [19, 15], [31, 23], [30, 11], [11, 23]].map(([x, y], i) => ({ id: `battery-${i}`, ...pos(x, y), used: false })),
      discovered: Array(WIDTH * HEIGHT).fill(0),
      safeUntil: CONFIG[difficulty].grace, lastAccused: null, captures: 0,
      patrolPoints: [...rooms.map(p => pos(...p)), pos(29, 10), pos(10, 22), pos(22, 22), pos(2, 2)],
      revealIn: 0, noiseIn: 0, revision: 0
    };
    // A starting closet and every authored object must be on the connected floor.
    if (!walkable(state, state.hides[0].x, state.hides[0].y)) state.hides[0] = pos(3, 2);
    const spawn = farthest(state, state.start);
    Object.assign(state.ghost, spawn);
    reveal(state, true);
    return state;
  }

  function consistentIds(state) {
    const clues = state.evidence.filter(c => state.found.includes(c.id));
    return state.npcs.filter(n => clues.every(c => n.traits[c.trait] === c.value)).map(n => n.id);
  }

  function nearby(state) {
    if (!state || state.status !== 'playing') return null;
    const p = state.player;
    if (p.hidden) return { type: 'hide', id: 'closet', label: '옷장에서 나오기' };
    const objects = [
      ...state.evidence.filter(c => !state.found.includes(c.id)).map(c => ({ ...c, type: 'clue', label: `${c.title} 조사하기`, rank: 0 })),
      ...state.npcs.map(n => ({ ...n, type: 'npc', label: `${n.name}에게 말 걸기`, rank: 1 })),
      ...state.pickups.filter(pickup => !pickup.used).map(pickup => ({ ...pickup, type: 'battery', label: '건전지 챙기기', rank: 2 })),
      ...state.hides.map((h, i) => ({ ...h, id: `hide-${i}`, type: 'hide', label: '옷장에 숨기', rank: 3 })),
      { ...state.exit, id: 'exit', type: 'exit', label: state.found.length === 3 ? '문에 소환자의 이름 새기기' : `닫힌 문 확인하기 · 단서 ${state.found.length}/3`, rank: state.found.length === 3 ? -1 : 4 }
    ];
    const reachable = objects.filter(o => dist(p, o) <= 1.35 && lineOfSight(state, p, o));
    reachable.sort((a, b) => a.rank - b.rank || dist(p, a) - dist(p, b));
    const object = reachable[0];
    return object ? { type: object.type, id: object.id, label: object.label } : null;
  }

  function interact(state) {
    const target = nearby(state);
    if (!target) return { type: 'blocked', text: '조금 더 가까이 가야 해요.' };
    state.revision++;
    if (target.type === 'npc') {
      const n = state.npcs.find(npc => npc.id === target.id);
      if (!state.visited.includes(n.id)) state.visited.push(n.id);
      return { type: 'npc', id: n.id, title: n.name, text: `${n.alibi}\n\n${n.dialogue}`, alibi: n.alibi, traits: { ...n.traits } };
    }
    if (target.type === 'clue') {
      const clue = state.evidence.find(c => c.id === target.id);
      if (!state.found.includes(clue.id)) state.found.push(clue.id);
      return { type: 'clue', id: clue.id, title: clue.title, text: clue.text };
    }
    if (target.type === 'battery') {
      const pickup = state.pickups.find(p => p.id === target.id);
      pickup.used = true;
      state.player.battery = Math.min(100, state.player.battery + 65);
      return { type: 'battery', title: '건전지를 챙겼다', text: '손전등 전력이 회복됐어요.' };
    }
    if (target.type === 'hide') return toggleHide(state);
    return state.found.length === 3 ? { type: 'exit', title: '누가 문을 열었나', text: '세 흔적과 초대 명부를 대조한 뒤 소환자의 이름을 새겨요.' } :
      { type: 'blocked', title: '이름 없는 문', text: '문이 열리지 않아요. 소환 흔적 세 가지를 찾아서, 여섯 햄찌의 소지품과 대조해야 해요.' };
  }

  function toggleHide(state) {
    if (state.status !== 'playing') return { type: 'blocked', text: '사건이 끝났어요.' };
    if (state.player.hidden) {
      state.player.hidden = false;
      state.revision++;
      return { type: 'unhide', text: '옷장에서 나왔어요.' };
    }
    const close = state.hides.some(h => dist(h, state.player) <= 1.35 && lineOfSight(state, h, state.player));
    if (!close) return { type: 'blocked', text: '옷장 가까이에서 숨을 수 있어요.' };
    if (state.ghost.mode === 'chase' && dist(state.ghost, state.player) < 3.4 && lineOfSight(state, state.ghost, state.player)) {
      return { type: 'blocked', text: '이미 들켰어요! 모퉁이를 돌아 시야를 벗어나세요.' };
    }
    state.player.hidden = true;
    state.player.moving = false;
    state.player.sprinting = false;
    state.ghost.memoryUntil = 0;
    if (state.ghost.mode === 'chase') state.ghost.mode = 'search';
    state.revision++;
    return { type: 'hide', title: '숨을 죽였다', text: '안에서는 움직이지 않아요. 발소리가 멀어지면 다시 나오세요.' };
  }

  function accuse(state, id) {
    if (state.status !== 'playing') return { type: 'blocked', text: '이미 끝난 사건이에요.' };
    if (!IDS.has(id)) return { type: 'blocked', text: '초대 명부에서 이름을 골라 주세요.' };
    if (dist(state.player, state.altar) > 1.5 || !lineOfSight(state, state.player, state.altar)) return { type: 'blocked', text: '처음 들어온 문 앞에서만 이름을 새길 수 있어요.' };
    if (state.found.length !== 3) return { type: 'blocked', text: '소환 흔적 세 가지가 모두 필요해요.' };
    state.lastAccused = id;
    state.revision++;
    if (id !== state.culprit) {
      state.status = 'lost';
      state.ghost.mode = 'attack';
      return { type: 'lost', reason: 'accusation', title: '다른 이름이었다', text: '문에 새긴 이름이 검게 지워졌다. 등 뒤에서 젖은 발소리가 멈췄다.' };
    }
    state.status = 'won';
    state.ghost.mode = 'stunned';
    const n = state.npcs.find(npc => npc.id === id);
    return { type: 'won', title: '문이 열렸다', text: `${n.name}의 초대장이 타들어 갔다. 세 흔적이 한 이름을 가리키자, 호박 속 불빛이 꺼졌다. 이뭉은 새벽 공기를 마셨다.` };
  }

  function choosePatrol(state) {
    const ghost = state.ghost;
    for (let tries = 0; tries < state.patrolPoints.length; tries++) {
      ghost.patrolIndex = (ghost.patrolIndex + 1) % state.patrolPoints.length;
      const candidate = state.patrolPoints[ghost.patrolIndex];
      if (dist(ghost, candidate) > 2 && (!state.player.hidden || dist(state.player, candidate) > 5)) return { x: candidate.x, y: candidate.y };
    }
    return farthest(state, ghost, state.player);
  }

  function followGhost(state, target, speed, dt) {
    const g = state.ghost;
    if (!target) return;
    g.thinkIn -= dt;
    if (g.thinkIn <= 0 || !g.path.length) {
      g.path = path(state, g, target);
      g.thinkIn = .38;
      // Continue along an aligned corridor; center only before a perpendicular turn.
      if (g.path.length) {
        const here = g.path[0], next = g.path[1];
        if (dist(g, { x: here.x + .5, y: here.y + .5 }) < .08 || (next && ((next.x !== here.x && Math.abs(g.y - here.y - .5) < .04) || (next.y !== here.y && Math.abs(g.x - here.x - .5) < .04)))) g.path.shift();
      }
    }
    let remaining = speed * dt;
    while (remaining > 0 && g.path.length) {
      const next = { x: g.path[0].x + .5, y: g.path[0].y + .5 };
      const dx = next.x - g.x, dy = next.y - g.y, distance = Math.hypot(dx, dy);
      if (distance < .015) { g.path.shift(); continue; }
      const amount = Math.min(remaining, distance);
      const nx = g.x + dx / distance * amount, ny = g.y + dy / distance * amount;
      if (!canOccupy(state, nx, ny, .15)) { g.path = []; g.thinkIn = 0; break; }
      g.facing = Math.atan2(dy, dx);
      g.x = nx; g.y = ny;
      remaining -= amount;
      if (amount >= distance) g.path.shift();
    }
  }

  function catchPlayer(state) {
    const p = state.player, g = state.ghost;
    p.lives--;
    state.captures++;
    state.revision++;
    p.hidden = false;
    p.moving = false;
    p.sprinting = false;
    if (p.lives <= 0) {
      p.lives = 0;
      state.status = 'lost';
      g.mode = 'attack';
      return { type: 'lost', reason: 'caught', title: '불빛이 꺼졌다', text: '두 번째 발소리는 피하지 못했다. 이뭉의 초대장이 바닥에 떨어졌다.' };
    }
    Object.assign(p, state.start, { stamina: 100, battery: Math.max(40, p.battery) });
    Object.assign(g, farthest(state, state.start), { mode: 'patrol', path: [], target: null, lastSeen: null, memoryUntil: 0, thinkIn: 0, wait: 0 });
    state.safeUntil = state.elapsed + CONFIG[state.difficulty].grace;
    reveal(state, true);
    return { type: 'caught', title: '아직 한 번은 더', text: '문 앞에서 정신을 차렸다. 찾은 단서는 그대로다. 잠시 발소리가 멀어졌다.' };
  }

  function tick(state, dt, input, events) {
    const cfg = CONFIG[state.difficulty], p = state.player, g = state.ghost;
    state.elapsed += dt;
    g.animTime += dt;
    const light = input.light !== false && !p.hidden && p.battery > 0;
    let mx = Number.isFinite(input.x) ? clamp(input.x, -1, 1) : 0;
    let my = Number.isFinite(input.y) ? clamp(input.y, -1, 1) : 0;
    const magnitude = Math.hypot(mx, my);
    if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
    p.moving = !p.hidden && magnitude > .05;
    p.sprinting = p.moving && !!input.sprint && p.stamina > 1;
    if (p.moving) {
      p.facing = Math.atan2(my, mx);
      const speed = p.sprinting ? 4.2 : 2.55;
      const nx = p.x + mx * speed * dt, ny = p.y + my * speed * dt;
      if (canOccupy(state, nx, p.y, .21)) p.x = nx;
      if (canOccupy(state, p.x, ny, .21)) p.y = ny;
    }
    p.stamina = clamp(p.stamina + (p.sprinting ? -21 : 15) * dt, 0, 100);
    // Empty light still leaves a navigable ambient radius: batteries never softlock a run.
    p.battery = clamp(p.battery - (light ? cfg.drain : 0) * dt, 0, 100);
    state.revealIn -= dt;
    if (state.revealIn <= 0) { reveal(state, light); state.revealIn = .16; }

    const wasChasing = g.mode === 'chase';
    const safe = state.elapsed < state.safeUntil;
    const distance = dist(g, p);
    const visible = !safe && !p.hidden && distance < (light ? cfg.vision : cfg.vision * .62) && lineOfSight(state, g, p);
    if (visible) {
      g.mode = 'chase';
      g.lastSeen = { x: p.x, y: p.y };
      g.target = { ...g.lastSeen };
      g.memoryUntil = state.elapsed + cfg.memory;
      g.wait = 0;
    } else if (g.mode === 'chase') {
      if (p.hidden || state.elapsed >= g.memoryUntil) { g.mode = 'search'; g.target = g.lastSeen; g.wait = 3.5; g.path = []; }
    }
    // Sprint noise reaches around corners, but it supplies a last-heard position,
    // never a continuously updated target through walls.
    state.noiseIn -= dt;
    if (!safe && !p.hidden && p.sprinting && !visible && g.mode !== 'chase' && distance < 8 && state.noiseIn <= 0) {
      state.noiseIn = 1.5;
      const route = path(state, g, p);
      if (route.length > 0 && route.length < 13) {
        g.mode = 'search'; g.lastSeen = { x: p.x, y: p.y }; g.target = { ...g.lastSeen }; g.wait = 3.5; g.path = []; g.thinkIn = 0;
      }
    }
    if (wasChasing !== (g.mode === 'chase')) events.push({ type: g.mode === 'chase' ? 'chase' : 'calm' });
    if (g.mode === 'patrol') {
      if (!g.target || dist(g, g.target) < .3) { g.target = choosePatrol(state); g.path = []; g.thinkIn = 0; }
      followGhost(state, g.target, cfg.patrol, dt);
    } else if (g.mode === 'chase') {
      followGhost(state, g.lastSeen, cfg.chase, dt);
    } else if (g.mode === 'search') {
      if (g.target && cellKey(g) !== cellKey(g.target)) followGhost(state, g.target, cfg.patrol * 1.35, dt);
      else {
        g.wait -= dt;
        if (g.wait <= 0) { g.mode = 'patrol'; g.target = choosePatrol(state); g.path = []; g.thinkIn = 0; }
      }
    }
    if (!safe && !p.hidden && dist(g, p) < .56 && lineOfSight(state, g, p)) events.push(catchPlayer(state));
  }

  function update(state, dtSeconds, input = {}) {
    if (!state || state.status !== 'playing' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return [];
    const events = [];
    let remaining = Math.min(dtSeconds, .1);
    while (remaining > 1e-8 && state.status === 'playing') {
      const dt = Math.min(remaining, 1 / 60);
      tick(state, dt, input, events);
      remaining -= dt;
    }
    return events;
  }

  function serialize(state) {
    return {
      version: VERSION, seed: state.seed, difficulty: state.difficulty, status: state.status, elapsed: state.elapsed,
      player: { x: state.player.x, y: state.player.y, facing: state.player.facing, stamina: state.player.stamina, battery: state.player.battery, lives: state.player.lives, hidden: state.player.hidden },
      ghost: { x: state.ghost.x, y: state.ghost.y, facing: state.ghost.facing, mode: state.ghost.mode, animTime: state.ghost.animTime },
      found: state.found.slice(), visited: state.visited.slice(), usedPickups: state.pickups.filter(p => p.used).map(p => p.id),
      discovered: state.discovered.slice(), lastAccused: state.lastAccused, captures: state.captures
    };
  }

  function restore(saved) {
    if (!saved || typeof saved !== 'object' || saved.version !== VERSION || !Number.isInteger(saved.seed) || !CONFIG[saved.difficulty]) throw new Error('읽을 수 없는 저장 기록이에요.');
    if (!['playing', 'won', 'lost'].includes(saved.status)) throw new Error('잘못된 사건 상태예요.');
    const state = create(saved.seed, saved.difficulty);
    const p = saved.player, g = saved.ghost;
    const finite = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
    if (!p || !g || !finite(saved.elapsed, 0, 604800) || !finite(p.x, 0, WIDTH) || !finite(p.y, 0, HEIGHT) || !canOccupy(state, p.x, p.y, .21) || !finite(p.facing, -100000, 100000) || !finite(p.stamina, 0, 100) || !finite(p.battery, 0, 100) || ![0, 1, 2].includes(p.lives) || typeof p.hidden !== 'boolean') throw new Error('저장된 플레이어 위치가 올바르지 않아요.');
    if (p.hidden && !state.hides.some(h => dist(h, p) <= 1.35 && lineOfSight(state, h, p))) throw new Error('저장된 은신 위치가 올바르지 않아요.');
    if (!finite(g.x, 0, WIDTH) || !finite(g.y, 0, HEIGHT) || !canOccupy(state, g.x, g.y, .15) || !finite(g.facing, -100000, 100000) || !MODES.has(g.mode) || !finite(g.animTime, 0, 604800)) throw new Error('저장된 귀신 위치가 올바르지 않아요.');
    const validIds = (list, allowed) => Array.isArray(list) && list.length <= allowed.size && new Set(list).size === list.length && list.every(id => allowed.has(id));
    if (!validIds(saved.found, EVIDENCE_IDS) || !validIds(saved.visited, IDS) || !validIds(saved.usedPickups, new Set(state.pickups.map(item => item.id)))) throw new Error('저장된 단서 기록이 올바르지 않아요.');
    if (!Array.isArray(saved.discovered) || saved.discovered.length !== WIDTH * HEIGHT || !saved.discovered.every(v => v === 0 || v === 1)) throw new Error('저장된 지도가 올바르지 않아요.');
    if (saved.lastAccused !== null && !IDS.has(saved.lastAccused)) throw new Error('저장된 지목 이름이 올바르지 않아요.');
    if (!Number.isInteger(saved.captures) || saved.captures < 0 || saved.captures > 2) throw new Error('저장된 생존 기록이 올바르지 않아요.');
    if (saved.status === 'playing' && (p.lives < 1 || saved.lastAccused !== null)) throw new Error('이어할 수 없는 사건이에요.');
    if (saved.status === 'won' && (saved.lastAccused !== state.culprit || saved.found.length !== 3 || p.lives < 1)) throw new Error('완료 기록이 올바르지 않아요.');
    if (saved.status === 'lost' && p.lives > 0 && (saved.lastAccused === null || saved.lastAccused === state.culprit || saved.found.length !== 3)) throw new Error('종료 기록이 올바르지 않아요.');
    state.elapsed = saved.elapsed;
    state.status = saved.status;
    Object.assign(state.player, p, { moving: false, sprinting: false });
    Object.assign(state.ghost, g, { path: [], target: null, lastSeen: null, memoryUntil: 0, thinkIn: 0, wait: 0 });
    if (state.status === 'playing') state.ghost.mode = 'patrol';
    state.found = saved.found.slice(); state.visited = saved.visited.slice();
    state.pickups.forEach(item => { item.used = saved.usedPickups.includes(item.id); });
    state.discovered = saved.discovered.slice(); state.lastAccused = saved.lastAccused; state.captures = saved.captures;
    // Reading the resume screen never exposes the player to an immediate attack.
    state.safeUntil = state.elapsed + 12;
    reveal(state, true);
    return state;
  }

  const API = { VERSION, SUSPECTS, TRAITS, create, update, nearby, interact, accuse, toggleHide, consistentIds, serialize, restore, walkable, path, lineOfSight };
  root.HalloweenEngine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
