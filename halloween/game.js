(function () {
  'use strict';
  const E = window.HalloweenEngine;
  const $ = (id) => document.getElementById(id);
  const modal = $('modal');
  const content = $('modal-content');
  const SAVE_KEY = 'hamzzi-halloween-v1';
  const SETTINGS_KEY = 'hamzzi-halloween-settings-v1';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let settings = {sound:true, reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  let state = null, saved = null, mode = 'home', ready = false, selected = null;
  let excluded = new Set(), keys = new Set(), directions = new Set(), touchSprint = false;
  let flashlight = true, showMap = false, last = 0, hudAt = 0, savedAt = 0;
  let scareAt = 0, toastTimer, returnFocus = null, endingReason = '', dialogKind = '';
  let noticeUntil = 0, noticeText = '', assets = {}, loadErrors = [];
  let renderer, audio;

  function storageWarning(text) { $('storage-warning').textContent = text; $('storage-warning').hidden = !text; }
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); if (s) { settings.sound = s.sound !== false; settings.reduceMotion = typeof s.reduceMotion === 'boolean' ? s.reduceMotion : settings.reduceMotion; } } catch (_) { storageWarning('이 브라우저에서는 설정을 저장하지 못할 수 있습니다.'); }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); } catch (_) { storageWarning('설정 저장에 실패했습니다. 이번 플레이에는 적용됩니다.'); } syncSettings(); }
  function syncSettings() { $('home-sound').checked=settings.sound; $('home-motion').checked=settings.reduceMotion; audio?.setEnabled(settings.sound); }
  function readSave() {
    try {
      const raw=localStorage.getItem(SAVE_KEY);
      if (!raw) { saved=null; $('resume').hidden=true; return; }
      const value=JSON.parse(raw);
      if (value.version!==1 || !value.cup) throw new Error('version');
      E.restore(value.cup);
      saved=value; $('resume').hidden=value.cup.status!=='playing';
      if (!['normal','story'].includes(value.cup.difficulty)) throw new Error('difficulty');
    } catch (_) { saved=null; $('resume').hidden=true; storageWarning('이전 진행 기록을 읽지 못했습니다. 새로 시작하거나 기록을 초기화할 수 있습니다.'); }
  }
  function save() {
    if (!state) return;
    const value={version:1,cup:E.serialize(state),excluded:[...excluded],selected,flashlight};
    saved=value; savedAt=state.elapsed;
    try { localStorage.setItem(SAVE_KEY,JSON.stringify(value)); }
    catch (_) { storageWarning('진행을 저장하지 못했습니다. 이 창을 닫으면 기록이 사라질 수 있습니다.'); }
  }
  function announce(text) { $('live').textContent=text; }
  function toast(text) {
    clearTimeout(toastTimer); $('toast').textContent=text; $('toast').hidden=false;
    toastTimer=setTimeout(()=>{$('toast').hidden=true;},3400); announce(text);
  }
  function clearInput() { keys.clear(); directions.clear(); touchSprint=false; document.querySelectorAll('.active').forEach(el=>el.classList.remove('active')); }
  function avatar(index,extra='') { return `<span class="avatar ${extra}" style="background-position:${(index%4)*100/3}% ${Math.floor(index/4)*100}%" aria-hidden="true"></span>`; }
  function traits(npc) { return E.TRAITS.map(t=>`<li>${esc(t.name)} · ${esc(t.values[npc.traits[t.id]])}</li>`).join(''); }
  function dialog(title,html,options={}) {
    if (!modal.open) returnFocus=document.activeElement;
    dialogKind=options.kind||'generic';
    modal.className=options.wide?'notebook':'';
    content.innerHTML=`<div class="dialog-inner">${options.close===false?'':`<button class="dialog-close" data-action="close" aria-label="닫기">×</button>`}<div class="dialog-topline">${esc(options.tag||'HAMZZI / AFTER DARK')}</div><h2 id="modal-title">${title}</h2>${html}</div>`;
    clearInput(); audio?.pause();
    if (!modal.open) modal.showModal();
    requestAnimationFrame(()=>{const el=(options.focus&&content.querySelector(options.focus))||content.querySelector('[autofocus]')||content.querySelector('button'); el?.focus({preventScroll:true});});
  }
  function closeDialog() { if(modal.open) modal.close(); }
  modal.addEventListener('close',()=>{
    clearInput();
    if (mode==='play'&&!document.hidden) audio?.resume();
    if (returnFocus?.isConnected && !returnFocus.closest('[hidden]')) returnFocus.focus({preventScroll:true});
    else if(mode==='play') $('world').focus({preventScroll:true});
  });
  modal.addEventListener('cancel',ev=>{if(mode==='ending')ev.preventDefault();});
  function showIntro(diff) {
      dialog('마지막 초대장',`<p>10월 31일, 밤 11시 59분.<br>할로윈 파티가 끝나자 출입문이 잠겼다.</p><p class="story-letter">“우리 여섯 중 누군가 문을 열었어.<br>그것이 들어왔어.<br>소환자의 이름을 찾아, 문에 새겨 줘.”</p><p>이뭉은 손전등을 켰다. 바닥에는 <strong>밀랍, 리본, 문양</strong> 세 가지 소환 흔적이 남아 있다.</p><p class="muted">수첩의 참석자 기록과 흔적을 대조하세요. 흔적 3개를 모은 뒤 출입문에서 한 명을 지목합니다. 대화와 수첩을 읽는 동안 시간은 멈춥니다.</p><button class="btn-primary" data-action="launch" data-difficulty="${diff}" autofocus>초대장을 접고 들어가기 <span>→</span></button>`,{kind:'intro',tag:'OCTOBER 31 · 23:59'});
  }
  function beginStory() {
    if(!ready)return;
    const diff=document.querySelector('input[name="difficulty"]:checked').value;
    if((state?.status==='playing')||(saved?.cup.status==='playing')) {
      dialog('새로운 밤을 시작할까요?',`<p>진행 중인 미로와 수사 기록이 새 사건으로 바뀝니다.</p><div class="dialog-actions"><button class="btn-secondary" data-action="close">취소</button><button class="btn-primary" data-action="new-confirm" data-difficulty="${diff}">새로 시작</button></div>`,{kind:'new-confirm'});
    } else showIntro(diff);
  }
  async function startAudio() {
    try { audio.setEnabled(settings.sound); await audio.start(); if(modal.open)audio.pause(); } catch (_) { toast('소리를 시작하지 못했습니다. 게임은 계속할 수 있습니다.'); }
  }
  function launch(difficulty) {
    const seed=window.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now()>>>0;
    state=E.create(seed,difficulty); excluded=new Set(); selected=null; flashlight=true; endingReason='';
    enterGame(); save(); toast('세 가지 소환 흔적을 찾으세요. 지도 M · 수첩 J');
  }
  function enterGame() {
    mode='play'; showMap=false; $('home').hidden=true; $('stage').hidden=false;
    $('stage').classList.remove('scaring'); $('scare-label').hidden=true;
    closeDialog(); clearInput(); startAudio(); renderer.resize(); last=performance.now();
    updateHud(); $('world').focus({preventScroll:true});
  }
  function resumeGame() {
    if(!saved||!ready) return;
    try {
      state=E.restore(saved.cup); excluded=new Set((saved.excluded||[]).filter(id=>E.SUSPECTS.some(n=>n.id===id)));
      selected=E.SUSPECTS.some(n=>n.id===saved.selected)?saved.selected:null;
      flashlight=saved.flashlight!==false; endingReason=''; enterGame(); toast('수사를 이어갑니다. 잠시 귀신에게 들키지 않습니다.');
    } catch (_) { toast('진행 기록을 복원하지 못했습니다. 새 사건을 시작해 주세요.'); }
  }
  function goHome() {
    mode='home'; clearInput(); audio?.pause(); $('stage').hidden=true; $('home').hidden=false;
    $('stage').classList.remove('scaring'); $('scare-label').hidden=true;
    if(modal.open)modal.close();
    if(state){saved={version:1,cup:E.serialize(state),excluded:[...excluded],selected,flashlight};$('resume').hidden=state.status!=='playing';}
    else readSave();
    $('start').focus({preventScroll:true}); window.scrollTo(0,0);
  }
  function pauseMenu() {
    if(!state||mode!=='play')return;
    save();
    dialog('잠시, 숨을 고르자.',`<p>귀신도 발걸음을 멈췄습니다. 수사는 자동으로 저장됩니다.</p><button class="btn-primary" data-action="close" autofocus>다시 수사하기 <span>→</span></button><button class="btn-secondary" data-action="notebook">수사 수첩 보기 <span>▤</span></button><button class="btn-secondary" data-action="help">조작 방법 <span>?</span></button><label class="settings-row"><span>소리<small>배경음과 발소리, 놀람 효과</small></span><input type="checkbox" data-setting="sound" ${settings.sound?'checked':''}></label><label class="settings-row"><span>놀람 연출 줄이기<small>확대와 흔들림을 줄이고 얼굴 노출을 낮춥니다.</small></span><input type="checkbox" data-setting="reduceMotion" ${settings.reduceMotion?'checked':''}></label><div class="dialog-actions"><button class="text-btn" data-action="home">저장하고 나가기</button><button class="text-btn" data-action="reset">진행 기록 초기화</button></div>`,{kind:'pause',tag:'PAUSED / 안전한 시간'});
  }
  function help() {
    dialog('길을 잃었을 때.',`<dl class="instruction-list"><dt>WASD / 방향키</dt><dd>이동 · 휴대폰은 화면 아래 방향 버튼</dd><dt>Shift / 달리기</dt><dd>누르는 동안 달리기. 체력은 걸으면 회복됩니다.</dd><dt>E / 조사</dt><dd>가까운 흔적 조사, NPC 대화, 출입문 확인</dd><dt>Space / 숨기</dt><dd>은신처 가까이에서 숨기 / 나오기</dd><dt>F / 빛</dt><dd>손전등 켜기 / 끄기. 켜면 멀리서 들킬 수 있습니다.</dd><dt>J / 수첩</dt><dd>흔적과 참석자 기록 대조 · 용의자 표시</dd><dt>M / 지도</dt><dd>방문한 길과 발견한 흔적 표시</dd><dt>Escape</dt><dd>일시정지</dd></dl><p>소환 흔적 <strong>세 가지를 모두 만족하는 한 명</strong>이 범인입니다. 수첩의 참석자 기록을 보고 맞지 않는 사람을 제외하세요.</p><p class="muted">귀신에게 두 번 잡히거나 출입문에서 범인을 잘못 지목하면 밤이 끝납니다. 한 번 잡혀도 단서는 유지됩니다. 읽는 동안은 안전합니다.</p><button class="btn-primary" data-action="${mode==='play'?'pause':'close'}" autofocus>알겠어 <span>→</span></button>`,{kind:'help'});
  }
  function notebook(focusId=null) {
    if(!state)return;
    const near=E.nearby(state); const atExit=near?.type==='exit';
    const notes=state.evidence.map(ev=>state.found.includes(ev.id)?`<article class="evidence-note"><h3>◆ ${esc(ev.title)}</h3><p>${esc(ev.text)}</p></article>`:`<article class="evidence-note empty"><h3>◇ 미발견 흔적</h3><p>미로 바닥에 남은 ${esc(ev.title)}을 찾아보세요.</p></article>`).join('');
    const people=state.npcs.map(n=>`<article class="suspect${excluded.has(n.id)?' excluded':''}${selected===n.id?' selected':''}"><button class="suspect-select" data-action="select" data-id="${esc(n.id)}" aria-pressed="${selected===n.id}" aria-label="${esc(n.name)} 선택">${avatar(n.profileIndex)}<span class="suspect-name">${esc(n.name)}</span></button><ul class="suspect-traits">${traits(n)}</ul><p class="suspect-alibi">${state.visited.includes(n.id)?esc(n.alibi):'아직 대화하지 않았습니다.'}</p><label class="exclude"><input type="checkbox" data-exclude="${esc(n.id)}" ${excluded.has(n.id)?'checked':''}>용의자에서 제외 표시</label></article>`).join('');
    const who=state.npcs.find(n=>n.id===selected);
    const can=atExit&&state.found.length===3&&who;
    dialog('수사 수첩',`<div class="notebook-head"><p class="muted">한 가지 흔적만으로 결정하지 마세요. 세 가지가 모두 맞아야 합니다.</p><span class="dialog-tag">${state.found.length} / 3</span></div><div class="journal-layout"><section aria-label="여섯 용의자"><div class="suspect-grid">${people}</div></section><aside class="journal-side"><span class="eyebrow">바닥에 남은 소환 흔적</span><div class="evidence-list">${notes}</div><div class="accuse-box"><p>${state.found.length<3?'흔적 3개를 모두 찾은 뒤 출입문으로 돌아가세요.':!atExit?'출입문으로 돌아가 이름을 새기세요.':who?`선택한 이름: <strong>${esc(who.name)}</strong><br>기회는 한 번입니다.`:'소환자로 의심되는 햄찌를 선택하세요.'}</p><button class="btn-primary" data-action="accuse-confirm" ${can?'':'disabled'}>${who?esc(who.name)+' 지목하기':'이름을 선택하세요'}</button></div></aside></div>`,{kind:'notebook',wide:true,focus:typeof focusId==='string'?`[data-id="${focusId}"]`:null,tag:'CASE FILE / 모든 기록은 자동 저장'});
  }
  function accuseConfirm() {
    const who=state?.npcs.find(n=>n.id===selected); if(!who)return;
    dialog('이 이름을 새길까요?',`${avatar(who.profileIndex,'dialog-avatar')}<p class="end-name" style="text-align:center">${esc(who.name)}</p><p>세 가지 소환 흔적이 모두 이 햄찌의 기록과 일치하나요? <strong>잘못 지목하면 탈출할 수 없습니다.</strong></p><div class="dialog-actions"><button class="btn-secondary" data-action="notebook">다시 생각하기</button><button class="btn-primary" data-action="accuse">이름 새기기</button></div>`,{kind:'accuse',tag:'LAST CHOICE / 마지막 선택'});
  }
  function resetConfirm() {
    dialog('진행 기록을 초기화할까요?',`<p>이 게임의 현재 미로, 찾은 흔적, 수첩 표시가 삭제됩니다. 되돌릴 수 없습니다.</p><p class="muted">소리 설정과 다른 햄찌 게임의 기록은 유지됩니다.</p><div class="dialog-actions"><button class="btn-secondary" data-action="${state&&mode==='play'?'pause':'close'}">취소</button><button class="btn-primary" data-action="reset-confirm">초기화</button></div>`,{kind:'reset'});
  }
  function reset() {
    try { localStorage.removeItem(SAVE_KEY); }
    catch (_) { toast('기록을 삭제하지 못했습니다. 기존 진행은 유지됩니다.'); return; }
    state=null;saved=null;excluded=new Set();selected=null;storageWarning('');mode='home';closeDialog();goHome();toast('진행 기록을 초기화했습니다.');
  }
  function endScreen() {
    mode='ending'; clearInput(); save(); audio.pause();
    const won=state.status==='won';
    const culprit=state.npcs.find(n=>n.id===state.culprit);
    const minutes=Math.floor(state.elapsed/60), seconds=Math.floor(state.elapsed%60).toString().padStart(2,'0');
    dialog(won?'문이, 열렸다.':'밤은 끝나지 않았다.',`${avatar(culprit?.profileIndex??0,'dialog-avatar')}<p class="end-name" style="text-align:center">${esc(culprit?.name||'누군가')}</p><p>${won?'세 흔적이 하나의 이름을 가리켰다. 이름을 새기자 복도 끝의 호박빛이 꺼졌다. 이뭉은 뒤돌아보지 않고 문을 나섰다.':endingReason==='accusation'?'문은 잘못된 이름을 받아들이지 않았다. 문틈에서 차가운 손이 뻗어 나왔다.':'발소리가 멎었을 때, 그것은 이미 바로 뒤에 있었다. 이뭉의 손전등이 바닥에 떨어졌다.'}</p><p class="muted">실제로 문을 연 햄찌는 ${esc(culprit?.name||'누군가')}였습니다. ${won?'수사를 완수했습니다.':'다음 밤에는 흔적 세 가지를 함께 대조해 보세요.'}</p><div class="end-stats"><span>수사 ${minutes}:${seconds}</span><span>흔적 ${state.found.length}/3</span><span>대화 ${state.visited.length}/6</span></div><button class="btn-primary" data-action="new-ending" autofocus>다른 밤에 도전하기 <span>→</span></button><button class="btn-secondary" data-action="home">첫 화면으로 <span>↗</span></button>`,{kind:'ending',tag:won?'CASE CLOSED / 소환자를 밝혀냈다':'CASE LOST / 수사 종료',close:false});
    announce(won?'소환자를 밝혀내고 탈출했습니다.':'수사가 끝났습니다.');
  }
  function toggleLight() { flashlight=!flashlight; $('light').setAttribute('aria-pressed',flashlight);$('touch-light').setAttribute('aria-pressed',flashlight);toast(flashlight?'손전등을 켰습니다.':'손전등을 껐습니다. 가까운 곳만 보입니다.'); }
  function toggleMap() { showMap=!showMap;$('map').setAttribute('aria-pressed',showMap);$('map-legend').hidden=!showMap;announce(showMap?'지도를 펼쳤습니다. 방문한 길만 표시합니다.':'지도를 접었습니다.'); }
  function interact() { if(mode!=='play'||modal.open)return; handleEvents([E.interact(state)]);save();updateHud(); }
  function hide() { if(mode!=='play'||modal.open)return;handleEvents([E.toggleHide(state)]);save();updateHud(); }
  function handleEvents(events) {
    for(const ev of events||[]) {
      if(!ev)continue;
      if(ev.type==='caught'||ev.type==='lost') {
        if(mode==='scare')continue;
        mode='scare';scareAt=performance.now();clearInput();$('stage').classList.add('scaring');$('scare-label').hidden=settings.reduceMotion;
        audio.play('caught');save();announce(ev.type==='lost'?'귀신에게 잡혔습니다.':'귀신에게 잡혔습니다. 기회가 한 번 남았습니다.');
      } else if(ev.type==='clue') {
        audio.play('clue'); toast('소환 흔적을 찾았습니다. 수첩 J에서 확인하세요.');
        dialog(esc(ev.title||'소환 흔적'),`<p class="story-letter">${esc(ev.text)}</p><p class="muted">수첩에 기록했습니다. 참석자 기록과 세 흔적을 대조하세요.</p><button class="btn-primary" data-action="close" autofocus>수사 계속하기 <span>→</span></button><button class="btn-secondary" data-action="notebook">수첩에서 대조하기 <span>▤</span></button>`,{kind:'clue',tag:'EVIDENCE / 소환 흔적'});
      } else if(ev.type==='npc') {
        const n=state.npcs.find(n=>n.id===ev.id);
        dialog(esc(ev.title||n?.name||'목격자'),`${avatar(n?.profileIndex??0,'dialog-avatar')}<p class="npc-quote">${esc(ev.text)}</p><button class="btn-primary" data-action="close" autofocus>조심해서 다녀올게 <span>→</span></button>`,{kind:'npc',tag:'TESTIMONY / 목격자의 말'});
      } else if(ev.type==='won') { closeDialog();endScreen(); }
      else if(ev.type==='exit') {notebook();}
      else if(ev.type==='blocked'||ev.type==='hide'||ev.type==='unhide'||ev.type==='battery') { if(ev.text)toast(ev.text); if(ev.type==='battery')audio.play('clue'); }
      else if(ev.type==='chase') {noticeText='들켰다. 달리거나 은신처를 찾으세요.';noticeUntil=performance.now()+4000;announce('귀신이 추격합니다.');}
      else if(ev.type==='calm') {noticeText='발소리가 멀어졌다.';noticeUntil=performance.now()+3000;}
    }
  }
  function updateHud() {
    if(!state)return;
    const p=state.player, near=E.nearby(state);
    $('health').textContent=p.lives>=2?'♥ ♥':'♥ ♡';$('health').setAttribute('aria-label',`남은 기회 ${p.lives}회`);
    $('stamina').value=p.stamina;$('battery').value=p.battery;
    $('mission').innerHTML=`소환 흔적 <b>${state.found.length}</b> / 3`;
    $('mission-sub').textContent=state.found.length===3?'출입문에서 소환자의 이름을 새기세요.':'흔적과 여섯 명의 기록을 대조하세요.';
    const chasing=state.ghost.mode==='chase';$('threat').hidden=!chasing;
    $('location-label').textContent=p.hidden?'은신 중 · 숨기 버튼이나 Space로 나옵니다.':chasing?'그것이 당신을 보았다.':state.found.length===3?'세 흔적은 한 명을 가리킨다.':'문을 닫기 전까지, 뒤를 보지 마.';
    $('context-text').textContent=performance.now()<noticeUntil?noticeText:near?near.label:state.found.length===3?'출입문으로 돌아가 수첩에서 범인을 지목하세요.':'흔적은 바닥에, 거짓말은 여섯 명 사이에 있습니다.';
    $('interact').hidden=!near;$('interact').querySelector('span').textContent=near?.label||'살펴보기';
    $('touch-interact').disabled=!near;$('touch-interact').textContent=near?.type==='npc'?'대화':near?.type==='exit'?'출입문':'조사';
    $('touch-hide').textContent=p.hidden?'나오기':'숨기';
    $('light').setAttribute('aria-pressed',flashlight);$('touch-light').setAttribute('aria-pressed',flashlight);
  }
  content.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-action]'); if(!btn||btn.disabled)return;
    const action=btn.dataset.action;
    if(action==='close')closeDialog();
    else if(action==='launch')launch(btn.dataset.difficulty);
    else if(action==='new-confirm'){showIntro(btn.dataset.difficulty);}
    else if(action==='notebook')notebook();
    else if(action==='select'){selected=btn.dataset.id;save();notebook(selected);}
    else if(action==='pause')pauseMenu();
    else if(action==='help')help();
    else if(action==='home'){save();mode='home';closeDialog();goHome();}
    else if(action==='reset')resetConfirm();
    else if(action==='reset-confirm')reset();
    else if(action==='accuse-confirm')accuseConfirm();
    else if(action==='accuse'){
      const event=E.accuse(state,selected);
      if(state.status==='lost'){endingReason='accusation';closeDialog();endScreen();}
      else if(state.status==='won'){closeDialog();endScreen();}
      else { if(event?.text)toast(event.text);notebook(); }
      save();
    } else if(action==='new-ending'){mode='home';state=null;saved=null;closeDialog();goHome();beginStory();}
  });
  content.addEventListener('change',ev=>{
    const el=ev.target;
    if(el.dataset.setting){settings[el.dataset.setting]=el.checked;saveSettings(); if(settings.sound)startAudio();}
    if(el.dataset.exclude){if(el.checked)excluded.add(el.dataset.exclude);else excluded.delete(el.dataset.exclude);save();const card=el.closest('.suspect');card.classList.toggle('excluded',el.checked);}
  });
  $('start').addEventListener('click',beginStory);$('resume').addEventListener('click',resumeGame);
  $('help-home').addEventListener('click',help);$('reset-home').addEventListener('click',resetConfirm);
  $('pause').addEventListener('click',pauseMenu);$('journal').addEventListener('click',notebook);
  $('map').addEventListener('click',toggleMap);$('light').addEventListener('click',toggleLight);
  $('interact').addEventListener('click',interact);$('touch-interact').addEventListener('click',interact);
  $('touch-hide').addEventListener('click',hide);$('touch-light').addEventListener('click',toggleLight);
  $('home-sound').addEventListener('change',ev=>{settings.sound=ev.target.checked;saveSettings();});
  $('home-motion').addEventListener('change',ev=>{settings.reduceMotion=ev.target.checked;saveSettings();});
  document.addEventListener('keydown',ev=>{
    if(mode!=='play'||modal.open||ev.target.matches('input,textarea,select'))return;
    const key=ev.key.toLowerCase();
    if((key===' '||key==='enter')&&ev.target.closest('button,a'))return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' ','e','f','j','m','escape'].includes(key))ev.preventDefault();
    keys.add(key);if(ev.repeat)return;
    if(key==='e')interact();else if(key===' ')hide();else if(key==='f')toggleLight();else if(key==='j')notebook();else if(key==='m')toggleMap();else if(key==='escape')pauseMenu();
  });
  document.addEventListener('keyup',ev=>keys.delete(ev.key.toLowerCase()));
  document.querySelectorAll('[data-dir]').forEach(btn=>{
    btn.addEventListener('pointerdown',ev=>{if(mode!=='play'||modal.open)return;ev.preventDefault();btn.setPointerCapture(ev.pointerId);directions.add(btn.dataset.dir);btn.classList.add('active');});
    const release=()=>{directions.delete(btn.dataset.dir);btn.classList.remove('active');};
    btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);btn.addEventListener('lostpointercapture',release);
  });
  $('touch-run').addEventListener('pointerdown',ev=>{if(mode!=='play'||modal.open)return;ev.preventDefault();ev.currentTarget.setPointerCapture(ev.pointerId);touchSprint=true;ev.currentTarget.classList.add('active');});
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])$('touch-run').addEventListener(kind,()=>{touchSprint=false;$('touch-run').classList.remove('active');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='play'){save();if(!modal.open)pauseMenu();}audio?.pause();}});
  window.addEventListener('blur',()=>{clearInput();if(mode==='play'&&!modal.open)pauseMenu();audio?.pause();});
  window.addEventListener('pagehide',()=>{save();audio?.pause();});
  window.addEventListener('resize',()=>renderer?.resize());

  function frame(now) {
    const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
    if(state&&(mode==='play'||mode==='scare')) {
      if(mode==='play'&&!modal.open&&!document.hidden) {
        const x=Number(keys.has('d')||keys.has('arrowright')||directions.has('right'))-Number(keys.has('a')||keys.has('arrowleft')||directions.has('left'));
        const y=Number(keys.has('s')||keys.has('arrowdown')||directions.has('down'))-Number(keys.has('w')||keys.has('arrowup')||directions.has('up'));
        handleEvents(E.update(state,dt,{x,y,sprint:keys.has('shift')||touchSprint,light:flashlight}));
        audio.update(state,dt);
        if(state.elapsed-savedAt>4)save();
      }
      if(mode==='scare') {
        const progress=(now-scareAt)/1500;
        renderer.drawScare(Math.min(1,progress),settings.reduceMotion);
        if(progress>=1){$('stage').classList.remove('scaring');$('scare-label').hidden=true;if(state.status==='lost')endScreen();else{mode='play';toast('기회가 한 번 남았습니다. 찾은 흔적은 유지됩니다.');}}
      } else renderer.draw(state,{time:now/1000,flashlight,reduceMotion:settings.reduceMotion,showMap,danger:state.ghost.mode==='chase'});
      if(now-hudAt>100){updateHud();hudAt=now;}
    }
    requestAnimationFrame(frame);
  }
  function loadImage(key,url) {
    return new Promise(resolve=>{const img=new Image();let settled=false;const finish=(value)=>{if(settled){if(value)assets[key]=value;return;}settled=true;assets[key]=value;if(!ready)$('asset-status').textContent=`게임 에셋 준비 ${Object.keys(assets).length} / 4`;resolve();};img.onload=()=>finish(img);img.onerror=()=>{loadErrors.push(key);finish(null);};img.src=url;setTimeout(()=>{if(!settled){loadErrors.push(key);finish(null);}},30000);});
  }
  async function boot() {
    if(!E||!window.HalloweenRenderer||!window.HalloweenAudio){$('asset-status').textContent='게임 파일을 불러오지 못했습니다. 새로고침해 주세요.';return;}
    $('home-cast').innerHTML=E.SUSPECTS.map(n=>`<div class="cast-person">${avatar(n.profileIndex)}<span>${esc(n.name)}</span></div>`).join('');
    audio=new window.HalloweenAudio();syncSettings();readSave();
    await Promise.all([loadImage('ghost','assets/ghost-atlas.png'),loadImage('npc','assets/npc-atlas.png'),loadImage('scare','assets/scare-atlas.png'),loadImage('title','assets/title-scene.png')]);
    renderer=new window.HalloweenRenderer($('world'),assets);
    ready=true;$('start').disabled=false;$('resume').disabled=false;$('start').innerHTML='문 안으로 들어가기 <span>→</span>';
    $('asset-status').textContent=loadErrors.length?'일부 이미지를 불러오지 못했습니다. 새로고침하면 다시 시도합니다.':'소리와 갑작스러운 놀람 연출이 포함됩니다.';
    requestAnimationFrame(frame);
  }
  boot();
})();
