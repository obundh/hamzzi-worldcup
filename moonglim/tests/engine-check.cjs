'use strict';
const assert = require('node:assert/strict');
const E = require('../engine.js');
let checks = 0;
function ok(value, message) { checks++; assert.ok(value, message); }
function eq(actual, expected, message) { checks++; assert.deepEqual(actual, expected, message); }
function close(actual, expected, tolerance, message) { ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} / ${expected}`); }
const copy = v => JSON.parse(JSON.stringify(v));
const radius = p => Math.hypot(p.x - E.CENTER.x, p.y - E.CENTER.y);
const quiet = seed => { const s = E.create(seed); s.nextWaveAt = 100000; return s; };
function enemy(id, x, y, vx, vy, kindIndex = 0) {
  const kind = E.ENEMIES[kindIndex];
  return { id, x, y, vx, vy, r: 19, age: 0, near: false, kind: kind.id, name: kind.name, profileIndex: kind.profileIndex };
}

eq(E.WORLD_SIZE, 1000, 'World size contract');
eq(E.ARENA_RADIUS, 430, 'Circular arena contract');
eq(E.ENEMIES.map(n => n.name), ['디피진','저승사자','똔꾸리','다망해','공명','랫서쿠키'], 'Actual six hamster cast');
eq(E.ENEMIES.map(n => n.profileIndex), [0,1,2,3,4,5], 'Actual sprite indices');
eq(E.create(17), E.create(17), 'Seed is repeatable');
ok(E.create(17).baseAngle !== E.create(18).baseAngle, 'Different seeds vary incoming bearings');
assert.throws(() => E.create(NaN)); checks++;

// Movement has one speed in every direction and cannot leave the court.
{
  const a = quiet(1), b = quiet(1);
  for (let i = 0; i < 30; i++) { E.step(a, 1/60, {x:1,y:0}); E.step(b, 1/60, {x:1,y:1}); }
  close(radius(a.player), radius(b.player), 1e-8, 'Diagonal speed is normalized');
  close(radius(a.player), E.PLAYER_SPEED * .5, 1e-8, 'Player speed is real elapsed speed');
  for (let i = 0; i < 200; i++) { E.step(a, .1, {x:1,y:1}); ok(radius(a.player) <= E.ARENA_RADIUS-a.player.r+1e-8, 'Player stays inside circular boundary'); }
  const before = copy(a); E.step(a, Infinity, {x:1}); E.step(a,-1,{}); E.step(a,0,{}); eq(a,before,'Invalid elapsed inputs are no-op');
  const c = quiet(2); E.step(c,500,{x:NaN,y:Infinity}); close(c.elapsed,.1,1e-8,'Long browser frame is capped'); close(radius(c.player),0,1e-8,'Nonfinite input cannot teleport');
}

// Tunnelling: the enemy crosses completely past the player within one substep.
{
  const s = quiet(1); s.enemies=[enemy('fast',400,500,24000,0)];
  const events=E.step(s,1/120,{});
  eq(s.status,'over','One crossing contact immediately ends the run');
  eq(events.filter(e=>e.type==='hit').length,1,'Exactly one hit event');
  close(s.elapsed,71/24000,1e-9,'Survival timer stops at actual first swept contact');
  close(Math.hypot(s.enemies[0].x-s.player.x,s.enemies[0].y-s.player.y),29,1e-8,'Contact positions meet at visible collision circles');
  const stopped=copy(s);E.step(s,.1,{x:1,y:1});eq(s,stopped,'Game over is completely frozen');
}
{
  const s=quiet(4);s.enemies=[enemy('overlap',520,500,1,0)];
  E.step(s,1/120,{x:-1});eq(s.status,'over','No hidden opening invincibility');close(s.elapsed,0,1e-10,'Already-overlapping first contact has zero time');
}
{
  const s=quiet(5);s.enemies=[enemy('first-in-array',380,500,30000,0),enemy('earliest-contact',450,500,24000,0,2)];
  E.step(s,.1,{});eq(s.hit.enemyId,'earliest-contact','Earliest contact selected independent of array order');close(s.elapsed,21/24000,1e-8,'Earliest enemy sets exact timer');
}
{
  const s=quiet(6);s.enemies=[enemy('relative',600,500,-12000,0)];E.step(s,1/120,{x:1});
  eq(s.status,'over','Moving player and moving enemy relative collision');close(Math.hypot(s.enemies[0].x-s.player.x,s.enemies[0].y-s.player.y),29,1e-7,'Relative contact stays exact');
  const tangent=quiet(7);tangent.enemies=[enemy('tangent',400,529,24000,0)];E.step(tangent,1/120,{});eq(tangent.status,'over','Tangent contact counts as one hit');
  const outside=quiet(7);outside.enemies=[enemy('outside',400,529.01,24000,0)];E.step(outside,1/120,{});eq(outside.status,'playing','Clearly outside hit radius is safe');
}

// A pass is counted once, and expired/outgoing hamsters are actually removed.
{
  const s=quiet(3);s.enemies=[enemy('near',400,539,1000,0)];
  for(let i=0;i<60;i++)E.step(s,1/120,{});
  eq(s.nearMisses,1,'Near miss only once per passing hamster');
  const expired=enemy('expired',300,300,1,0);expired.age=12;
  s.enemies=[expired,enemy('outgoing',1050,500,100,0)];E.step(s,1/120,{});eq(s.enemies.length,0,'Expired and outgoing actors despawn');
}

// Different render cadences process exactly the same fixed simulation ticks.
{
  const snapshots=[];
  for(const fps of [30,60,120,240]){
    const s=E.create(11);for(let i=0;i<fps*8&&s.status==='playing';i++)E.step(s,1/fps,{});
    const snapshot=copy(s);delete snapshot.accumulator;snapshots.push(snapshot);
  }
  for(let i=1;i<snapshots.length;i++)eq(snapshots[i],snapshots[0],'First hit/pattern/time independent of FPS');
}

// Telegraph locks the target. Moving afterward cannot turn an incoming hamster.
{
  const s=E.create(12);
  while(!s.warnings.length)E.step(s,1/120,{});
  const warned=copy(s.warnings[0]);ok(warned.total>=.5,'Readable warning before the first rush');
  close(Math.hypot(warned.x-500,warned.y-500),430,1e-8,'Warning sits on court rim');
  close(warned.aimX,500,1e-8,'Aim locks at warned player X');close(warned.aimY,500,1e-8,'Aim locks at warned player Y');
  let spawn=null;
  while(!spawn){const ev=E.step(s,1/120,{x:1});spawn=ev.find(e=>e.type==='spawn');}
  const rushing=s.enemies.find(e=>e.id===spawn.id);
  close(rushing.vx,warned.vx,1e-8,'Moving player does not change aimed horizontal velocity');close(rushing.vy,warned.vy,1e-8,'Moving player does not change aimed vertical velocity');
  close(Math.hypot(spawn.x-500,spawn.y-500),510,1e-8,'Hamster originates outside court');
  ok(s.elapsed-warned.releaseAt>=-1e-8,'Rush never releases before warning duration');
}

eq(E.stageFor(0).index,0,'Opening difficulty');eq(E.stageFor(10).index,1,'10s stage');eq(E.stageFor(25).index,2,'25s stage');eq(E.stageFor(45).index,3,'45s stage');eq(E.stageFor(75).index,4,'75s stage');
eq(E.getRank(30).name,'뭉림고수','Named rank at30seconds');

// Real runs with ordinary player input. This is a bot observation, not human balancing.
let stationaryCases=0,botWins=0,longest=0,maxEnemies=0,maxWarnings=0,minWarning=Infinity;
const chooseInput=s=>{
  let best={x:0,y:0},bestScore=-Infinity;
  const plans=[...s.enemies,...s.warnings.map(w=>({x:w.sx,y:w.sy,vx:w.vx,vy:w.vy,delay:w.remaining,r:19}))];
  for(let i=-1;i<16;i++){
    const input=i<0?{x:0,y:0}:{x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)};
    let score=300;
    for(const t of [.12,.3,.6]){
      const px=s.player.x+input.x*E.PLAYER_SPEED*t,py=s.player.y+input.y*E.PLAYER_SPEED*t;
      const boundary=E.ARENA_RADIUS-10-Math.hypot(px-500,py-500);
      score=Math.min(score,boundary+70);
      for(const e of plans){const moved=Math.max(0,t-(e.delay||0)),ex=e.x+e.vx*moved,ey=e.y+e.vy*moved;score=Math.min(score,Math.hypot(ex-px,ey-py)-29);}
    }
    score-=Math.hypot(s.player.x+input.x*31-500,s.player.y+input.y*31-500)*.025;
    if(score>bestScore){bestScore=score;best=input;}
  }
  return best;
};
for(let seed=0;seed<40;seed++){
  const s=E.create(seed);let hitEvents=0;
  while(s.status==='playing'&&s.elapsed<10){const ev=E.step(s,.1,{});hitEvents+=ev.filter(e=>e.type==='hit').length;}
  eq(s.status,'over','Idle player is genuinely hittable');eq(hitEvents,1,'Idle case ends on first contact only');ok(s.elapsed>3&&s.elapsed<5,'Opening has time to react without hidden immunity');stationaryCases++;
}
for(let seed=0;seed<12;seed++){
  const s=E.create(1000+seed);
  while(s.status==='playing'&&s.elapsed<90){
    const input=chooseInput(s);const ev=E.step(s,.1,input);
    maxEnemies=Math.max(maxEnemies,s.enemies.length);maxWarnings=Math.max(maxWarnings,s.warnings.length);
    for(const w of s.warnings){minWarning=Math.min(minWarning,w.total);ok(w.total>=.5,'All late-stage warnings remain readable');ok(Math.hypot(w.aimX-500,w.aimY-500)<=420+1e-7,'Every rush aims inside court');}
    ok(s.enemies.length<=80&&s.warnings.length<=24,'Object counts remain bounded');
    ok(radius(s.player)<=420+1e-7,'Bot stays within playable boundary');
    if(ev.some(e=>e.type==='hit'))eq(s.status,'over','Bot first contact immediately ends run');
  }
  longest=Math.max(longest,s.elapsed);if(s.elapsed>=90)botWins++;
}
ok(longest>=45,'Ordinary movement can reach later wave families');ok(minWarning>=.5,'No late difficulty removes telegraph');
console.log(JSON.stringify({result:'passed',checks,stationaryCases,botCases:12,bot90SecondRuns:botWins,longestBotSeconds:Number(longest.toFixed(2)),maxEnemies,maxWarnings,minWarning,note:'Bot knows actor positions; this does not establish human difficulty.'},null,2));
