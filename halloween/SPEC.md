# 문을 연 햄찌 — implementation contract

Standalone original 2D overhead horror maze + fair deduction game at `/halloween/`.
Player Imoong; six NPC suspects: dipijin 디피진, reaper 저승사자, ddon 똔꾸리,
mang 다망해, gong 공명, cookie 랫서쿠키. A pumpkin ghost chases the player.
Keep existing root World Cup and `/sonata/` unchanged.

## Ownership

- engine.js + engine-check.cjs: engine agent.
- renderer.js + audio.js: rendering agent.
- assets/* and ASSETS.md: image agent.
- index.html, style.css, game.js, README.md, integration/release: parent.

## Engine public API

Classic script exports `globalThis.HalloweenEngine` and CommonJS for Node checks.
`create(seed, difficulty='normal')`, `update(state, dtSeconds, input)` mutates state and
returns an array of events. Inputs `{x:-1..1,y:-1..1,sprint:boolean,light:boolean}`.
`nearby(state)` returns null or `{type,id,label}` within interaction range.
`interact(state)` returns an event `{type,title,text,...}`. `accuse(state,id)` returns event.
`toggleHide(state)` returns event. `consistentIds(state)` returns clue-consistent ids.
`restore(saved)` validates/restores or throws. `serialize(state)` yields JSON-safe object.
Expose `SUSPECTS`, `TRAITS`, `walkable(state,x,y)`, `path(state,from,to)` (grid cells).
Use integers for seed, string difficulty 'normal' or 'story'.

State fields required by rendering/UI:
`version,seed,difficulty,status` ('playing','won','lost'), `elapsed,width,height,grid`
(array of strings, '#' wall and '.' path), `start:{x,y}`, `exit:{x,y}`, `altar:{x,y}`
(may equal exit), `player:{x,y,facing,stamina,battery,lives,hidden}`,
`ghost:{x,y,facing,mode,animTime}`, `npcs:[{id,name,x,y,profileIndex,traits,alibi}]`,
`evidence:[{id,x,y,title,text,trait,value}]`, `found:[evidence ids]`,
`visited:[npc ids]`, `hides:[{x,y}]`, `pickups:[{id,x,y,used}]`,
`discovered` array of 0/1 per grid cell, `culprit` id (client-side secret, no competitive claim).
facing is radians, 0 to right, PI/2 down. Grid positions are continuous center coordinates.
SUSPECTS records use `id,name,profileIndex` (0..5 matching above).
TRAITS records use `id,name,values:[two strings]`.
npc.traits is `{traitId: valueIndex}`. Evidence text truthfully gives one culprit trait.
All 3 evidence combined select exactly one of 6, all cases. Each NPC has an alibi
and a short helpful dialogue, each profile remains recognizable. Talking pauses in UI.

Events: `caught` (lives remains >0, reposition safely), `lost` (second hit),
`won`, `clue` (id,title,text), `npc` (id,title,text), `battery`,
`hide`, `unhide`, `blocked` (text), `chase`, `calm`.
An accusation only succeeds at exit/altar after all 3 pieces, wrong accusation loses.
No free remote accusations. A caught event starts a 1.4s scare and then returns play.

## Art contract

Generate actual assets with built-in image_gen. No asset-only placeholders.
`assets/ghost-atlas.png`: true alpha 4 columns x 4 rows, 16 full-body frames,
row 0 idle (4), row 1 drift/walk (4), row 2 chase (4), row 3 lunge (4).
Same rotten pumpkin ghost identity as generated reference. Image may be 2048x2048.
`assets/scare-atlas.png`: 2 columns x 2 rows, 4 increasingly close attack-face frames,
edge-to-edge dark backgrounds okay here.
`assets/npc-atlas.png`: alpha 4 columns x 2 rows, indices0..5 six NPCs above,
index6 Imoong gray white hamster detective, index7 empty.
Each character centered inside cell, margins, exact alignment; no labels.
`assets/ghost-portrait.png`: original generated full-body pumpkin ghost (copy).
`assets/title-scene.png`: optional atmospheric generated ruined Halloween maze scene.
Asset manifest reports actual dimensions and alpha; do not claim transparent if not.

## Renderer public API

Classic script exports `globalThis.HalloweenRenderer` class.
`new HalloweenRenderer(canvas, assets)` where assets keyed `ghost,npc,scare,title,portrait`
are loaded Image objects or null. `resize()` fits CSS size & DPR<=2.
`draw(state,{time,flashlight,reduceMotion,showMap,danger})` each animation frame.
`drawScare(progress,reduceMotion)` may draw to main canvas OR game.js uses overlay.
Camera follows player, coherent tile-lit maze, vignette/fog/flashlight, textured walls,
floor/candle/props, original NPC sprites, usable movement view on portrait phones.
Fog discovery and minimap must not reveal culprit. showMap toggles floor plan overlay.
Optional `worldToScreen(x,y)`, public `camera`. Do not own input or DOM modal state.

## Audio public API

Classic script exports `globalThis.HalloweenAudio` class.
`new HalloweenAudio()`; `start()` after user gesture; `setEnabled(bool)`;
`update(state,dt)`; `play(kind)`; `pause()`; `resume()`; `destroy()`.
Original procedural WebAudio drone, footsteps, nearby threat, clue sound, scare sting.
Bounded volume, no auto audio before interaction, no rapid flashing.

## Parent UI

Title + short story + controls + difficulty + resume/new-game + sound toggle.
WASD/arrows move, Shift sprint, E interact, F light, Space hide at closet,
J notebook, M map, Escape pause. Touch D-pad, sprint, interact, hide and other buttons.
HUD health2, stamina, light battery, clue count, contextual action, NPC names.
Notebook semantic buttons for 6 suspects, full evidence, manually exclude, accuse
only at altar/exit with 3 clues and confirmation. Timer and AI pause for dialogs,
notebook, settings, tab hide and blur. Captured animation bounded, reduced-motion setting.
Dedicated local save key, resume with safe grace, confirmed reset, scoped storage only.
No third-party runtime dependencies, no network APIs, no external fonts mandatory.
