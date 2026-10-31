# Generated Halloween game assets

Generated with the built-in `image_gen.imagegen` tool on 2026-10-31. No external art download,
Pillow drawing, background removal, or third-party asset pack was used.
The original pumpkin ghost created earlier in this chat is the identity reference.
NPC identities follow the user's supplied profile screenshot and confirmed name mapping.

## Files and verified layout

| File | Actual dimensions | Layout | Transparency |
| --- | --- | --- | --- |
| ghost-atlas.png | 1254 × 1254 | 4 columns × 4 rows, 16 visibly distinct full-body poses | RGBA, alpha 0–255; 34.7% fully transparent |
| scare-atlas.png | 1254 × 1254 | 2 × 2, 4 increasingly close face crops | RGB, dark opaque backgrounds intentional |
| npc-atlas.png | 1774 × 887 | 4 × 2, 7 occupied cells + empty last cell | RGBA, alpha 0–255; 58.0% fully transparent |
| ghost-portrait.png | 1024 × 1536 | Original full-body ghost from concept discussion | RGBA, alpha 0–254 |
| title-scene.png | 1672 × 941 | Wide title backdrop | RGB |

Use fractional source-cell dimensions (`image.width / columns`, `image.height / rows`).
The image tool did not return the requested nominal 2048-pixel size. Do not hardcode
512-pixel cells. The empty eighth NPC cell contains only alpha 0/1 export noise,
no visible eighth character. All 16 ghost cell pixel hashes differ; the four scare
frames also differ. This is generated keyframe animation with some pose variation,
not a rigidly rigged skeletal animation.

Ghost frame rows: 0 idle, 1 drifting/walking, 2 chasing, 3 lunging; four poses each.
Scare frames are ordered row-major from distant upper body to extreme face close-up.
NPC order: 0 디피진 (white sunglasses), 1 저승사자 (black hood), 2 똔꾸리 (red scarf),
3 다망해 (striped cloth), 4 공명 (sunflower), 5 랫서쿠키 (orange red panda + bowl),
6 이뭉 (gray-white detective with beret, cape, flashlight), 7 empty.

## Generated source identifiers

- Ghost atlas: `exec-cb34ddc8-867d-4292-acf5-71821cb94653.png`
- NPC atlas: `exec-578e2582-62c8-4f31-a7e2-ae4a6111e767.png`
- Scare atlas: `exec-a9e8c1d5-f33c-4775-9cd9-bbea700becc6.png`
- Title scene: `exec-28dc8edf-2547-4529-8eec-97c164bd6411.png`
- Original portrait/reference: `exec-98e7b771-7a90-4f32-b8cc-9ab20fb56330.png`

Full PNGs were copied unchanged into this directory. Inspection used Pillow read-only
for dimensions, alpha statistics and per-cell pixel hashes; no image pixels were repaired.

## Full prompts

### ghost-atlas.png

```text
Use case: stylized-concept. Asset type: exact-grid 2D horror game animated enemy sprite atlas.
Use the reference image as CHARACTER IDENTITY only. Make a SPRITE SHEET, exactly 4 equal columns by 4 equal rows, 16 full-body poses of the SAME rotten pumpkin ghost, on genuinely TRANSPARENT alpha background. Square canvas, ideally 2048x2048. Every cell is exactly one quarter of canvas width and height. Each character centered in its own cell, similar height about 78% of cell, fully within cell with generous blank gutters. No body part may cross a cell boundary. No visible grid lines, labels, text, frames, scenery, floor shadows or background. Do not scatter poses arbitrarily.

Preserve reference: collapsed rotten orange-gray jack-o'-lantern head, crooked stem, uneven carved black eyeholes with faint dirty amber embers, toothy jagged pumpkin mouth, pale waxy elongated hands, long wet moldy charcoal-green burial shroud, filthy torn trailing hem, thin crouched humanoid form. Highly grotesque practical-creature-effects material rendering, damp fibers, fungi, grime, disturbing anatomy, near-photographic painterly texture. No blood or open wounds, no weapons, no extra limbs.

Camera in EVERY cell is the same near-front three-quarter view, slightly from above, character facing lower right. Same scale, lighting and design throughout. Cold blue subtle rim light and dirty warm pumpkin glints. Entire body with head stem and all fingers inside each cell.
ROW 1 (top) columns1..4: four subtly different IDLE breathing frames, head hangs left then center then right then center, hands flex and robe sways slightly.
ROW 2 columns1..4: four DRIFT/WALK frames, alternating lean left/right, hands and robe trailing through a coherent cycle.
ROW 3 columns1..4: four CHASE frames, hunched forward and more aggressive, arms alternately reaching, more sweeping robe, coherent sequence.
ROW 4 columns1..4: four LUNGE frames, coiling then reaching both hands forward then maximum reach then recoiling, same frame centers and scale.
The 16 frames must be visibly distinct animated poses, NOT repeated identical copies. Genuine alpha transparency around every pose, no baked black rectangle, no checkerboard. No objects beyond the 16 ghosts.
```

### npc-atlas.png

```text
Use case: stylized-concept. Asset type: exact-grid friendly NPC sprite atlas for a 2D top-down horror game.
REFERENCE: the supplied roster screenshot contains tiny illustrated profile icons; preserve identities from the designated profiles only. Ignore all website text.
Make ONE horizontal transparent sprite sheet, EXACTLY 4 equal columns by 2 equal rows. Wide canvas with ratio2:1 (ideally2048x1024). Each of eight cells is a square of exactly same size. One character centered in each of first SEVEN cells, eighth cell fully EMPTY and transparent. Do NOT add an eighth character. All characters are friendly vulnerable NPCs, NOT monsters. Same scale, 3/4 front view slightly from above, facing lower right. Entire body and accessories inside each cell with generous10% padding. Real transparent alpha background, no labels, no text, no grids, no frames, no floor, no scenery, no cast shadows.

Style: refined hand-painted 2D indie game sprites, fluffy expressive hamsters, softly textured fur, clean dark outlines, warm ivory highlights and subdued teal shadow edges. Their world is haunted, so expressions are wary or nervous, but characters themselves retain the cute original appearance. Avoid plastic3D toys, photoreal animals, big generic horror fangs or distorted limbs.

Row1 cell1: 디피진 based on reference column3row2: plump WHITE hamster, round gray ears, black sunglasses perched on FOREHEAD, pink little tongue, tiny blue drool strand. No clothing.
Row1 cell2: 저승사자 based on reference column2bottomrow: WHITE hamster with mint/cyan round eyes, pale pink cheeks, BLACK HOODED CLOAK around white face; small wooden scythe close to body, friendly nervous expression.
Row1 cell3: 똔꾸리 based on reference column2row4: round BEIGE hamster, dark brown small ears and crown stripe, enormous BURGUNDY RED SCARF wrapped across lower face with one short trailing end.
Row1 cell4: 다망해 based on reference column3row4: small fluffy WHITE hamster, tiny TEAL-tinted round ears, holding the edge of a blue-white striped CLOTH in its mouth, cloth drapes to its paws.
Row2 cell1: 공명 based on reference column1bottomrow: small YELLOW hamster sitting in the dark brown center of a SUNFLOWER; orange-yellow petals form a wide collar, short green stem and one leaf under it.
Row2 cell2: 랫서쿠키 based on reference column1row2: fluffy ORANGE RED PANDA-like hamster character with small round ears, white muzzle and cheek markings, dark forepaws holding a small PURPLE snack bowl, thick orange-brown ringed tail curves close to body.
Row2 cell3: 이뭉 player based on reference column3bottomrow: chubby LIGHT GRAY and WHITE hamster with round ears and a little smile, NAVY BERET, short dark GREEN CAPE, holding a little warm amber FLASHLIGHT aimed lower right. Keep flashlightbeam tiny, not a background beam.
Row2 cell4: entirely empty transparency.
Respect the exact cell order. Seven distinct sprites only.
```

### scare-atlas.png

```text
Use case: stylized-concept. Asset type: exact-grid 4-frame horror jumpscare face atlas.
Reference image is the locked identity of the ONE pumpkin ghost. Make ONE image divided into EXACTLY2 equal columns and2 equal rows, four same-sized rectangular frames filling the whole canvas, each frame showing the SAME ghost face at increasing attack proximity. Square atlas overall. Frames have no borders or gaps, but the division is geometrically exact halfway across both axes. NO labels, text or multiple heads within one frame.

Frame upperleft: ghost's rotten tilted pumpkin head and upper shoulders facing directly toward viewer, crooked stem, moldy wet rind, asymmetrical black carved sockets with dirty amber pinpoint embers, jagged uneven pumpkin mouth, dark soaked shroud. Head fills65% of that frame.
Frame upperright: same ghost leans rapidly closer; head fills85% of cell, mouth slightly more open, long pale fingers grip lower edges, faint directional motion only at outeredges.
Frame lowerleft: huge distorted close-up same face fillsentirecell; wet rotting pumpkin fibers, inside of broken mouth has pale waxy ghostskin, uneven tooth-like wooden pumpkin shards, oneeyeholelarger, no neat symmetrical design.
Frame lowerright: maximum terrifying close-up same face, mouth and hollow eyes looming nearly againstlens, tilted sideways, crooked pale fingers barelyvisibleedges, very unsettling disgusting realisticcreaturetextures. No explicitblood or wounds.

All4 backgrounds solid nearblack with subtle coldblue and dirtyamber faceillumination, edge-to-edge faces visible; no scenery. Cohesive near-photographic practical horror effects, slimy rotten pumpkin, fungal rind spots, wet burial gauze, sticky fibers, unsettlingly incorrect humanlike faceunderpumpkin. Different attack crops clearly increasing through fourframes. The frame MUST be frightening, not a festive pumpkin decoration, cartoon or toy. No extra creatures, no bats, no weapons, no flash graphics or bright white screen.
```

### title-scene.png

```text
Use case: stylized-concept. Assettype: wide16:9 title-screen background illustration for a Korean original web horror maze game. No text, titles, letters, branding or HUD.
Use the supplied pumpkin ghost as character identity reference only. Wide cinematic painterly near-photographic haunted environment, but deliberately legible as an overhead/oblique view into a maze of abandoned stone corridors in a decaying Halloween manor. Cold teal moonlight, damp dark stone tiles, charred wallpaper, sparse warm candles, wilted dried orange pumpkin garlands. Thick maze walls form an unmistakable winding route. A small gray-white hamster detective with navy beret, darkgreen cape and amber flashlight appears near lowerleft, dwarfed by the old maze. On the RIGHT side, the same huge rotting jack-o'-lantern ghost half-emerges from darkness behind a wall, long waxy fingers gripping stone, wet moldy shroud and slumped crooked pumpkinhead looming over the passage. Disturbing and ominous but no gore. The leftmost third should be darker and relatively uncluttered to place separate UI textlater; no painted textinimage. Glowing small exitdoor visible far uppercenter, verysubtle. Original horrorillustration with tactile textures, amber-orange as a restrained accent, mostlyblack/deepteal, carefullyilluminated ghostface. Strongcomposition, eerie negative space, no collage or panels, no blood, no photorealhumans.
```
