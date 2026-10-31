'use strict';
const assert = require('node:assert/strict');
const E = require('../engine.js');
let checks = 0;
function check(value, message) { checks++; assert.ok(value, message); }
function eq(actual, expected, message) { checks++; assert.deepEqual(actual, expected, message); }
function throws(fn, message) { checks++; assert.throws(fn, message); }
const clone = value => JSON.parse(JSON.stringify(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function flood(s) {
  const seen = new Set(), queue = [s.start];
  seen.add(`${Math.floor(s.start.x)},${Math.floor(s.start.y)}`);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], x = Math.floor(p.x), y = Math.floor(p.y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (E.walkable(s, nx, ny) && !seen.has(key)) { seen.add(key); queue.push({ x: nx, y: ny }); }
    }
  }
  return seen;
}

// Independent flood and text/profile truth, across seeds and both difficulties.
for (let seed = 0; seed < 300; seed++) {
  for (const difficulty of ['normal', 'story']) {
    const s = E.create(seed, difficulty);
    const seen = flood(s);
    let floors = 0;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      if (s.grid[y][x] !== '#') floors++;
      if (x === 0 || y === 0 || x === s.width - 1 || y === s.height - 1) check(s.grid[y][x] === '#', 'Closed map border');
    }
    eq(seen.size, floors, `No disconnected pockets at seed ${seed}`);
    for (const item of [...s.npcs, ...s.evidence, ...s.hides, ...s.pickups, s.exit, s.ghost]) check(seen.has(`${Math.floor(item.x)},${Math.floor(item.y)}`), 'Every authored object is reachable');
    eq(E.consistentIds(s).length, 6, 'No evidence starts with six suspects');
    eq(new Set(s.npcs.map(n => JSON.stringify(n.traits))).size, 6, 'Distinct profiles');
    const culprit = s.npcs.find(n => n.id === s.culprit);
    for (const clue of s.evidence) {
      eq(clue.value, culprit.traits[clue.trait], 'Clue is truthful');
      check(clue.text.includes(E.TRAITS.find(t => t.id === clue.trait).values[clue.value].split(' ')[0]), 'Clue text corresponds to its actual feature');
      s.found.push(clue.id);
      check(E.consistentIds(s).includes(s.culprit), 'No clue excludes culprit');
    }
    eq(E.consistentIds(s), [s.culprit], 'Three clues independently isolate one culprit');
    eq(E.serialize(E.create(seed, difficulty)), E.serialize(E.create(seed, difficulty)), 'Deterministic case creation');
    const restored = E.restore(E.serialize(s));
    eq(restored.found, s.found, 'Clues persist');
    eq(restored.npcs, s.npcs, 'Profiles and NPC placement persist');
    check(restored.safeUntil >= restored.elapsed + 12, 'Resume grace');
  }
}

function walkTo(s, destination) {
  const route = E.path(s, s.player, destination);
  check(route.length > 0, 'Autoplay route exists');
  for (const cell of route) {
    const target = { x: cell.x + .5, y: cell.y + .5 };
    for (let step = 0; distance(s.player, target) > .035; step++) {
      check(step < 40, 'No collision trap on a walkable path');
      const dx = target.x - s.player.x, dy = target.y - s.player.y;
      const length = Math.hypot(dx, dy), scale = Math.min(1, length / (2.55 * .04));
      E.update(s, .04, { x: dx / length * scale, y: dy / length * scale, light: true });
      check(E.walkable(s, s.player.x - .2, s.player.y - .2) && E.walkable(s, s.player.x + .2, s.player.y + .2), 'Player collider stays out of walls');
    }
  }
}

// Complete actual input-based walking/interactions (not direct clue injection).
let autoplayTicks = 0;
for (const seed of [3, 17, 69, 314, 2026]) {
  const s = E.create(seed, 'story'); s.safeUntil = Infinity;
  for (const npc of s.npcs) { walkTo(s, npc); eq(E.interact(s).id, npc.id, 'NPC dialogue reachable'); }
  eq(s.visited.length, 6, 'All six met');
  for (const clue of s.evidence) { walkTo(s, clue); eq(E.interact(s).id, clue.id, 'Clue physically collectible'); }
  eq(s.found.length, 3, 'Three physically collected clues');
  eq(E.accuse(s, s.culprit).type, 'blocked', 'Remote accusation rejected');
  const checkpoint = E.restore(E.serialize(s));
  eq(checkpoint.player, { ...s.player, moving: false, sprinting: false }, 'Checkpoint preserves player resources and coordinates, clears held movement');
  walkTo(s, s.exit);
  eq(E.nearby(s).type, 'exit', 'Final exit action priority');
  eq(E.interact(s).type, 'exit', 'Final exit opens deduction');
  eq(E.accuse(s, E.consistentIds(s)[0]).type, 'won', 'Evidence-driven accusation wins');
  eq(E.restore(E.serialize(s)).status, 'won', 'Win save restores');
  const before = E.serialize(s); E.update(s, .1, { x: 1, light: true }); eq(E.serialize(s), before, 'Won world cannot continue moving');
  autoplayTicks += Math.round(s.elapsed * 25);
}

// Wrong names, missing clues, malformed input, walls, and stamina are bounded.
{
  const s = E.create(12);
  eq(E.accuse(s, s.culprit).type, 'blocked', 'Three clues required');
  eq(E.accuse(s, 'unknown').type, 'blocked', 'Unknown suspects rejected');
  s.found = s.evidence.map(c => c.id);
  eq(E.accuse(s, s.npcs.find(n => n.id !== s.culprit).id).type, 'lost', 'Wrong name loses');
  eq(E.restore(E.serialize(s)).status, 'lost', 'Wrong-name ending persists');
}
{
  const s = E.create(1); s.safeUntil = Infinity;
  s.player.x = 1.5; s.player.y = 1.5;
  for (let i = 0; i < 300; i++) E.update(s, .1, { x: -1, y: -1, sprint: true, light: true });
  check(s.player.x >= 1.2 && s.player.y >= 1.2, 'Closed-border collision');
  check(s.player.stamina >= 0 && s.player.stamina <= 100, 'Stamina bounded');
  check(s.player.battery >= 0 && s.player.battery <= 100, 'Battery bounded');
  const x = s.player.x, y = s.player.y;
  E.update(s, Infinity, { x: NaN }); eq([s.player.x, s.player.y], [x, y], 'Nonfinite dt rejected');
  const before = s.elapsed; E.update(s, 300, {}); check(s.elapsed - before <= .10001, 'Long frame capped');
  s.player.battery = 0; const prior = s.discovered.reduce((a, b) => a + b, 0); E.update(s, .1, {}); check(s.discovered.reduce((a, b) => a + b, 0) >= prior, 'Empty light stays navigable');
}

// Independent wall occlusion and unobstructed visible chase/capture.
{
  const s = E.create(92); s.safeUntil = 0;
  let blockedPair;
  for (let y = 2; y < s.height - 2 && !blockedPair; y++) for (let x = 2; x < s.width - 2 && !blockedPair; x++) {
    if (s.grid[y][x] === '#' && s.grid[y][x - 1] === '.' && s.grid[y][x + 1] === '.') blockedPair = [{ x: x - .5, y: y + .5 }, { x: x + 1.5, y: y + .5 }];
  }
  check(blockedPair, 'Wall-occlusion fixture found');
  Object.assign(s.player, blockedPair[0]); Object.assign(s.ghost, blockedPair[1], { target: null });
  check(!E.lineOfSight(s, s.player, s.ghost), 'Wall blocks line of sight');
  E.update(s, .1, { light: true }); check(s.ghost.mode !== 'chase', 'Ghost does not see through wall');
}
{
  const s = E.create(77); s.safeUntil = 0;
  Object.assign(s.player, s.start); Object.assign(s.ghost, { x: s.start.x + 1, y: s.start.y, target: null });
  let events = E.update(s, .1, { light: true }); check(events.some(e => e.type === 'chase'), 'Visible player starts chase');
  for (let i = 0; i < 50 && s.player.lives === 2; i++) events = E.update(s, .1, { light: true });
  eq(s.player.lives, 1, 'First capture consumes one life');
  check(events.some(e => e.type === 'caught'), 'First capture emits caught');
  eq([s.player.x, s.player.y], [s.start.x, s.start.y], 'First capture safely respawns');
  check(s.safeUntil > s.elapsed, 'Respawn has grace');
  s.safeUntil = 0; Object.assign(s.ghost, s.player, { mode: 'patrol', path: [], target: null });
  events = E.update(s, .1, { light: true });
  eq(s.player.lives, 0, 'Second capture consumes final life');
  eq(s.status, 'lost', 'Second capture loses');
  check(events.some(e => e.type === 'lost'), 'Final capture emits lost');
  eq(E.restore(E.serialize(s)).status, 'lost', 'Caught ending persists');
}

// Hide only in an authored closet, and not in plain sight during close pursuit.
{
  const s = E.create(333); s.safeUntil = 0;
  const hide = s.hides[1];
  Object.assign(s.player, hide); Object.assign(s.ghost, { x: hide.x + .8, y: hide.y, mode: 'chase' });
  eq(E.toggleHide(s).type, 'blocked', 'Cannot vanish when seen nearby');
  Object.assign(s.ghost, s.npcs[5], { mode: 'patrol' });
  if (distance(s.ghost, s.player) < 5) Object.assign(s.ghost, s.evidence[2]);
  eq(E.toggleHide(s).type, 'hide', 'Closet enables hiding');
  Object.assign(s.ghost, s.player, { mode: 'search', target: { ...s.player }, lastSeen: { ...s.player } });
  E.update(s, .1, { x: 1, y: 1, sprint: true, light: true });
  check(s.player.hidden && s.player.lives === 2 && !s.player.moving, 'Hidden player is neither exposed nor moving');
  eq(E.restore(E.serialize(s)).player.hidden, true, 'Hidden checkpoint persists');
  eq(E.toggleHide(s).type, 'unhide', 'Can leave closet');
}

// Patrol actually traverses rooms instead of oscillating during route recomputation.
{
  const s = E.create(42); s.safeUntil = Infinity;
  const origin = { ...s.ghost };
  const visited = new Set();
  let furthest = 0;
  for (let i = 0; i < 1200; i++) { E.update(s, .1, { light: false }); visited.add(`${Math.floor(s.ghost.x)},${Math.floor(s.ghost.y)}`); furthest = Math.max(furthest, distance(origin, s.ghost)); check(E.walkable(s, s.ghost.x, s.ghost.y), 'Ghost remains on floor'); }
  check(visited.size > 70, 'Patrol visits many corridor cells');
  check(furthest > 10, 'Patrol travels far from spawn');
}

// Corrupt save fields fail without being trusted as playable state.
{
  const saved = E.serialize(E.create(9));
  for (const mutate of [s => { s.version = 99; }, s => { s.player.x = NaN; }, s => { s.player.x = .5; }, s => { s.found = ['wax', 'wax']; }, s => { s.ghost.x = -1; }, s => { s.discovered = []; }, s => { s.status = 'won'; }, s => { s.player.lives = 0; }, s => { s.visited = ['fake']; }, s => { s.seed = '9'; }, s => { s.elapsed = -1; }]) {
    const bad = clone(saved); mutate(bad); throws(() => E.restore(bad), 'Malformed save rejected');
  }
  throws(() => E.create(4, 'impossible'));
  throws(() => E.create(1.5));
}

console.log(JSON.stringify({ result: 'passed', checks, seededCases: 600, walkedFullCases: 5, autoplayTicks }, null, 2));
