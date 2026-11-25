# 랜덤 이상형 필터

User correction: reproduce the confirmed reference presentation and sequence.
Do not add the earlier ten invented fields, preference selectors or image styles.
Reference: https://shorti.ai/en/v/instagram_DfoY6hjviiO
Original: https://www.instagram.com/reel/DfoY6hjviiO/
Confirmed sequence: Gender → Age → Height → Weight → Job → Nationality.
White vertical rail; white-rimmed gray nodes turn yellow with white values to right.
Separate yellow dot descends and automatically reveals results; rail scrolls upward.
Observed: Male/Female, age16/23/69/78/82, height222cm, weight260kg.
Exact original random tables and any later fields are unavailable. Do not claim exact
RNG replication. Implement the six observed fields, source-like surprising values.

Latest user addition: fill the former human/camera backdrop with existing hamster
assets. Reuse halloween/assets/npc-atlas.png, default Imoong; new run picks a hamster.
Static route /typemix/. Existing games untouched. No redistributed creator video/face,
soundtrack or logo. Optional webcam only after camera-button click; no upload, mic,
login or external model call. Dark camera-like background works without camera.
One final Korean image prompt preserving all six results, copy to GPT/Gemini manually.

## Ownership
Root: index.html, style.css, app.js, README, integrated QA and deployment.
Model agent: model.js and tests/model-check.cjs ONLY.

## Model contract
Classic script window.TypeMix and CommonJS; VERSION=1.
FIELDS=[{key,label,ko}], order gender,age,height,weight,job,nationality.
Profile primitives: gender male|female; age,height,weight integers; other stable IDs.
draw(key,rng=Math.random) returns value; generate(rng=Math.random) full profile.
display(key,value) English on-screen value: Male,23,222cm,260kg,Doctor,Korean.
describe(key,value) Korean summary/prompt including units.
validate(profile) complete known-fields-only profile.
validatePartial(profile) ordered prefix, empty allowed; no unknown fields.
buildPrompt(profile) ONE Korean generation prompt, throws for invalid.
restore(saved) validates {version:1,profile} ordered prefix or full, sanitizes or throws.
Reject prototype properties as fields/catalog IDs.

Independent numeric draws, no BMI or age/gender correction. Age16..90, height100..230cm,
weight35..300kg inclusive, uniform integer. These are implementation ranges, not verified
original tables. At least16 recognizable jobs and nationalities with English labels
and Korean descriptions. Do not equate nationality and ethnicity.
Prompt includes ALL values literally, one fictional fully-clothed person, full body9:16,
age-appropriate presentation, stylized exaggeration for unrealistic numeric proportions,
no infographic/text/watermark or celebrity likeness. If minor, no romantic/sexual framing;
keep job as imaginary setting, no silent correction. Do not promise impossible fidelity.

## UI
Portrait9:16 stage. Start/reset, optional camera, pause/resume.
Six automatic reveal steps ~2.3s each with moving yellow dot. Restart cancels prior loop.
Hidden tab pauses. Reduced-motion keeps timing without vertical travel or flashing.
Final result: six-value summary and one readonly prompt with copy; simple GPT/Gemini links.
No preference/style/download options.
Storage key hamzzi-typemix-v1. Save prefix after each reveal; reload prefix paused.
Full result restores prompt. Corrupt/blocked storage recovers with accurate status.
Clipboard success only after actual success; failure selects prompt for manual copy.

## Verification
Model boundaries/catalog/invalid-save tests; desktop/mobile real-browser full round,
pause/restart/hidden race, reload, clipboard failure, camera denial, no unintended camera
activation or external requests. Inspect rendered screenshots.
