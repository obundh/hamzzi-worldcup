# 뭉림고수 — implementation contract

User explicitly requested a new Dodge/Bamboo Master inspired webgame named 뭉림고수.
Latest correction: six HAMSTERS rush at Imoong, not arrows. ONE contact immediately
ends the run. Survival seconds are the score; quick retry. No combat, hearts, revival,
ghost, deduction, maze, powerups or unrelated game substitution.
Standalone path `/moonglim/`; existing World Cup/Sonata/Halloween remain untouched.

Ownership: engine.js + tests/engine-check.cjs by engine agent; renderer.js by rendering
agent; index.html, style.css, game.js, audio.js, README and integration/release by parent.

## Engine API

Classic script exports global `MoonglimEngine` and CommonJS.
`WORLD_SIZE=1000`, `CENTER={x:500,y:500}`, `ARENA_RADIUS=430`.
`ENEMIES=[{id,name,profileIndex,color}]` six NPC sprite indices 0..5:
디피진(dipijin), 저승사자(reaper), 똔꾸리(ddon), 다망해(mang), 공명(gong), 랫서쿠키(cookie).
Player Imoong index6 in existing `../halloween/assets/npc-atlas.png` (4cols×2rows1774×887 RGBA).

`create(seed)` returns playing state; UI can keep it static as ready preview.
`step(state,dtSeconds,input)` mutates state, returns events array.
Input `{x:-1..1,y:-1..1}` only; diagonal normalized. No sprint or attack.
Player bounded inside circular arena and dt substepped or swept collisions so no tunneling.
No invisible grace after starts: opening waves provide a readable natural introduction.
`getRank(seconds)` returns `{name,description}`; `stageFor(seconds)` returns `{index,name}`.

Required state: `version,seed,status` ('playing','over'), `elapsed,player:{x,y,r,vx,vy,facing}`,
`enemies:[{id,kind,profileIndex,name,x,y,vx,vy,r,age}]`,
`warnings:[{id,x,y,angle,remaining,total,kind}]`, `nearMisses,spawned,hit` (null or hit record).
Enemy kind is one of ENEMIES ids; profileIndex always numeric0..5.
Hit `{name,kind,x,y,time}` also available in event `{type:'hit',...hit}`.
Events `warning`, `spawn`, `near`, `stage`, `hit` may be used for particles/audio.
Warn at arena rim >=0.5s before rush. Lock aim at telegraph, no homing. Seeded patterns
grow denser/faster with elapsed time. Incoming hamsters always originate outside arena,
cross the arena in straight lines, disappear after leaving. Keep bounded object counts.
Avoid impossible random spawning on player. Collision uses visible small ground circles,
not entire illustrated fur silhouette. First contact→over; further step must no-op.

## Renderer API

Classic script global `MoonglimRenderer` class.
`new MoonglimRenderer(canvas,atlasImage|null)`, `resize()`,
`draw(state,{time,reduceMotion,mode,hitProgress})` (mode ready/playing/paused/over).
`toWorld(clientX,clientY)` returns world coordinates using canvas client rect and fit.
`get scale()` or property public; square 1000×1000 centered arena, no camera movement.
Source atlas fractional 4×2 crops. NPCs 0..5; Imoong6. Use true generated sprites.
Original atmospheric bamboo grove courtyard, rich jade/ivory/moss/amber palette, useful
ground hit marker, readable rim telegraphs, lively hamster run bob/lean/dust/trails.
Boundary always visible. No copied original art; original Canvas bamboo/stone/shadows okay.
Warning uses both symbol/shape and color; enemies have clear tiny collision markers.
Reduced-motion removes scenic leaves/shake/bob but preserves essential movement/warnings.
Canvas DPR<=2, cache background to offscreen canvas, avoid expensive perframe world regen.

## UI and persistence

Title '뭉림고수'. Clear copy '햄찌들이 달려온다. 한 번 닿으면 끝.'
Keyboard WASD/arrows; Space start/retry; Escape/P pause; mouse/touch drag target movement
limited by player speed (no teleport), optional touch D-pad (all coarse-pointer widths).
Native semantic start/retry/pause/sound/reducedmotion buttons, no auto audio before click.
Pause on blur/tab hide; no huge elapsed jump after resume. dt cap on frame return.
Best record + recent attempt + attempt count on dedicated localStorage key only.
Storage failure keeps same-tab records and visible notice. No public/server ranking claim.
One contact immediately ends run; results show seconds, best, culprit and clear retry.
No active run resume from disk, no long intro. R/Space retry after short accidental-input guard.
Actual page at `/moonglim/` must be verified locally/live for latest requested game.
