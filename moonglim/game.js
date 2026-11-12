(function () {
  'use strict';
  const E=window.MoonglimEngine;
  const $=id=>document.getElementById(id);
  const KEY='hamzzi-moonglim-v1';
  const PHYSICAL_KEYS={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright',KeyP:'p',KeyR:'r',Space:' ',Escape:'escape',Enter:'enter',Tab:'tab'};
  const movementKeys=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright']);
  const eventKey=ev=>PHYSICAL_KEYS[ev.code]||ev.key.toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=n=>(Math.floor((Math.max(0,n)+1e-9)*100)/100).toFixed(2);
  const fresh=()=>({version:1,best:0,last:0,attempts:0,sound:true,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  let records=fresh(),mode='ready',state=null,renderer,audio,ready=false;
  let keys=new Set(),dirs=new Set(),pointer=null,lastFrame=0,lastHud=0,overAt=0,readyAt=0;
  let warned=false,toastAt=0;
  let lastControlsMode=null;
  function text(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value;}
  function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(records));return true;}catch(_){notice('기록을 저장하지 못했어요. 이 창에서는 계속 기록됩니다.',true);return false;}}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(!raw)return;
      if(raw.version!==1)throw Error('version');
      const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=604800;
      records={...fresh(),best:valid(raw.best)?raw.best:0,last:valid(raw.last)?raw.last:0,attempts:Number.isInteger(raw.attempts)&&raw.attempts>=0?Math.min(10000000,raw.attempts):0,sound:raw.sound!==false,reduceMotion:typeof raw.reduceMotion==='boolean'?raw.reduceMotion:fresh().reduceMotion};
    }catch(_){notice('이전 기록을 읽지 못했어요. 이번 수련은 계속할 수 있습니다.',true);}
  }
  function updateRecords(){
    $('best-top').textContent=format(records.best);$('best-record').textContent=format(records.best);
    $('last-record').textContent=records.last>0?`${format(records.last)}초`:'—';$('attempts').textContent=records.attempts.toLocaleString('ko-KR');
    $('rank-name').textContent=E.getRank(records.best).name;
    $('sound').checked=records.sound;$('motion').checked=records.reduceMotion;
  }
  function clearInput(){
    keys.clear();dirs.clear();
    if(pointer&&$('arena').hasPointerCapture?.(pointer.id))try{$('arena').releasePointerCapture(pointer.id);}catch(_){}
    pointer=null;document.querySelectorAll('.dpad .active').forEach(el=>el.classList.remove('active'));
  }
  function hud(){
    text('clock',format(state?.elapsed||0));text('near-count',`${state?.nearMisses||0}회`);
    text('phase',mode==='ready'?'입장 준비':mode==='paused'?'잠시 숨 고르기':mode==='over'?'수련 종료':E.stageFor(state.elapsed).name);
    if(lastControlsMode===mode)return;lastControlsMode=mode;
    text('time-label',mode==='over'?'이번 생존 기록':'이번 수련');
    $('pause').disabled=mode==='ready'||mode==='over';$('pause').innerHTML=mode==='paused'?'<span>▶</span> 계속하기 <kbd>P</kbd>':'<span>Ⅱ</span> 일시정지 <kbd>P</kbd>';
    $('reset-record').disabled=mode==='playing'||mode==='paused';$('quick-retry').hidden=mode!=='over';
  }
  function overlay(html,kind=''){
    $('overlay-card').className='overlay-card'+(kind?' '+kind:'');$('overlay-card').innerHTML=html;$('overlay').hidden=false;
    $('overlay').classList.toggle('result-screen',kind==='result');
    if(kind==='result'){$('overlay').setAttribute('role','dialog');$('overlay').setAttribute('aria-modal','true');$('overlay').setAttribute('aria-labelledby','overlay-title');}
    else{for(const attr of ['role','aria-modal','aria-labelledby'])$('overlay').removeAttribute(attr);}
    requestAnimationFrame(()=>{$('overlay-card').querySelector('button')?.focus({preventScroll:true});});
  }
  function announce(text){$('live').textContent=text;}
  function newSeed(){return window.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0;}
  function start(){
    if(!ready||mode==='playing'||(mode==='over'&&performance.now()-overAt<350))return;
    clearInput();state=E.create(newSeed());mode='playing';lastFrame=performance.now();
    document.body.classList.add('focus-play');$('overlay').hidden=true;records.attempts++;persist();updateRecords();hud();renderer.resize();
    window.scrollTo(0,0);
    $('arena').focus({preventScroll:true});
    audio.setEnabled(records.sound);audio.start().then(()=>{if(mode==='playing')audio.play('start');else audio.pause();});
    announce('수련 시작. 햄찌에게 한 번 닿으면 끝납니다.');
  }
  function home(){
    clearInput();mode='ready';state=E.create(20261112);document.body.classList.remove('focus-play');audio.pause();hud();renderer.resize();
    overlay('<p class="kicker">대나무숲, 다시 한 번.</p><h2 id="overlay-title">준비됐나요?<br><em>뭉림고수.</em></h2><p class="overlay-copy">가장자리의 표식을 보고 움직이세요.<br>한 번 닿으면 바로 끝납니다.</p><button class="primary" data-action="start">수련 시작 <span>→</span></button><p class="overlay-hint">방향키 / WASD · 모바일은 드래그</p>');
  }
  function pause(reason=''){
    if(mode!=='playing')return;
    mode='paused';clearInput();audio.pause();hud();
    overlay(`<p class="kicker">잠시, 숨을 고르는 시간</p><h2 id="overlay-title">수련 일시정지</h2><p class="overlay-copy">${reason?esc(reason):'햄찌들도 발걸음을 멈췄어요.'}<br>현재 ${format(state.elapsed)}초 · 기록은 계속 이어집니다.</p><button class="primary" data-action="resume">계속 피하기 <span>→</span></button><button class="text-btn pause-restart" data-action="restart">새 수련으로 다시 시작</button><p class="overlay-hint">P / Escape로 계속하기</p>`);
    announce('수련을 일시정지했습니다.');
  }
  function resume(){
    if(mode!=='paused'||$('confirm').open)return;
    clearInput();mode='playing';$('overlay').hidden=true;lastFrame=performance.now();audio.resume();hud();window.scrollTo(0,0);$('arena').focus({preventScroll:true});announce('수련을 이어갑니다.');
  }
  function finish(hit){
    if(mode!=='playing')return;
    mode='over';overAt=performance.now();clearInput();audio.play('hit');
    const time=Number(format(state.elapsed)),newBest=time>records.best;
    records.last=time;records.best=Math.max(records.best,time);persist();updateRecords();hud();
    const rank=E.getRank(time);
    overlay(`<p class="kicker">${newBest?'나의 최고 기록 경신!':'이번 수련이 끝났어요'}</p><h2 id="overlay-title">부딪혔다!</h2><div class="result-score">${format(time)}<small>초</small></div><span class="result-rank">${esc(rank.name)}</span><p class="overlay-copy">${esc(hit.name||'햄찌')}와 부딪혔어요.<br>${esc(rank.description)}</p><p class="result-best">나의 최고 <strong>${format(records.best)}초</strong> · 아슬회피 ${state.nearMisses}회</p><button class="primary" data-action="start">다시 도전 <span>↻</span></button><button class="text-btn result-home" data-action="home">수련장으로</button><p class="overlay-hint">Space / R로 바로 재도전</p>`,'result');
    setTimeout(()=>{if(mode==='over')audio.pause();},750);
    announce(`${esc(hit.name||'햄찌')}와 부딪혔습니다. ${format(time)}초 생존. ${newBest?'최고 기록을 세웠습니다.':''} 다시 도전할 수 있습니다.`);
  }
  function input(dt){
    let x=Number(keys.has('d')||keys.has('arrowright')||dirs.has('right'))-Number(keys.has('a')||keys.has('arrowleft')||dirs.has('left'));
    let y=Number(keys.has('s')||keys.has('arrowdown')||dirs.has('down'))-Number(keys.has('w')||keys.has('arrowup')||dirs.has('up'));
    if(!x&&!y&&pointer){const p=renderer.toWorld(pointer.x,pointer.y);const dx=p.x-state.player.x,dy=p.y-state.player.y,d=Math.hypot(dx,dy);if(d>3){const v=Math.min(1,d/(E.PLAYER_SPEED*Math.max(dt,.001)));x=dx/d*v;y=dy/d*v;}}
    return{x,y};
  }
  function frame(){
    const now=performance.now();
    const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
    if(ready&&state){
      if(mode==='playing'){
        const events=E.step(state,dt,input(dt));
        for(const ev of events){if(ev.type==='hit'){finish(ev);break;}if(ev.type==='near')audio.play('near');else if(ev.type==='stage'){audio.play('stage');announce(E.stageFor(state.elapsed).name+' 단계에 들어왔습니다.');}else if(ev.type==='warning'&&now-toastAt>420){audio.play('warning');toastAt=now;}}
      }
      renderer.draw(state,{time:now/1000,reduceMotion:records.reduceMotion,mode,hitProgress:mode==='over'?Math.min(1,(now-overAt)/650):0});
      if(now-lastHud>32){hud();lastHud=now;}
    }
    requestAnimationFrame(frame);
  }
  $('overlay-card').addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b||b.disabled)return;
    const action=b.id==='start'?'start':b.dataset.action;
    if(action==='start')start();else if(action==='resume')resume();else if(action==='home')home();else if(action==='restart'){mode='ready';start();}
  });
  $('pause').addEventListener('click',()=>{if(mode==='playing')pause();else if(mode==='paused')resume();});
  $('quick-retry').addEventListener('click',start);
  $('sound').addEventListener('change',ev=>{records.sound=ev.target.checked;audio?.setEnabled(records.sound);persist();if(records.sound&&mode==='playing')audio.start();});
  $('motion').addEventListener('change',ev=>{records.reduceMotion=ev.target.checked;persist();});
  $('reset-record').addEventListener('click',()=>{if(mode==='playing')pause();$('reset-error').hidden=true;$('confirm').showModal();$('cancel-reset').focus();});
  $('cancel-reset').addEventListener('click',()=>$('confirm').close());
  $('confirm-reset').addEventListener('click',()=>{
    const next={...records,best:0,last:0,attempts:0};
    try{localStorage.setItem(KEY,JSON.stringify(next));records=next;updateRecords();$('confirm').close();if(mode==='over')home();notice('수련 기록을 초기화했습니다.');announce('수련 기록을 초기화했습니다.');}
    catch(_){$('reset-error').textContent='기록을 지우지 못했어요. 기존 기록은 유지됩니다.';$('reset-error').hidden=false;}
  });
  $('confirm').addEventListener('close',()=>$('reset-record').focus({preventScroll:true}));
  document.addEventListener('keydown',ev=>{
    if($('confirm').open)return;
    const k=eventKey(ev);
    const textEntry=ev.target.matches('textarea,select,input:not([type="checkbox"])');
    if(textEntry&&k!=='p'&&k!=='escape')return;
    if(ev.target.matches('input[type="checkbox"]')&&!movementKeys.has(k)&&k!=='p'&&k!=='escape')return;
    if(mode==='over'&&k==='tab'){const buttons=[...$('overlay-card').querySelectorAll('button')];if(ev.shiftKey&&document.activeElement===buttons[0]){ev.preventDefault();buttons.at(-1)?.focus();}else if(!ev.shiftKey&&document.activeElement===buttons.at(-1)){ev.preventDefault();buttons[0]?.focus();}return;}
    if((k===' '||k==='enter')&&ev.target.closest('button,a'))return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','escape','p','r'].includes(k))ev.preventDefault();
    if(mode==='playing')keys.add(k);
    if(ev.repeat)return;
    if(k==='p'||k==='escape'){if(mode==='playing')pause();else if(mode==='paused')resume();else if(mode==='over'&&k==='escape')home();}
    else if((k===' '||k==='r')&&(mode==='ready'||mode==='over'))start();
  });
  document.addEventListener('keyup',ev=>keys.delete(eventKey(ev)));
  const arena=$('arena');
  arena.addEventListener('pointerdown',ev=>{if(mode!=='playing')return;ev.preventDefault();arena.setPointerCapture(ev.pointerId);pointer={id:ev.pointerId,x:ev.clientX,y:ev.clientY};});
  arena.addEventListener('pointermove',ev=>{if(pointer?.id===ev.pointerId){ev.preventDefault();pointer.x=ev.clientX;pointer.y=ev.clientY;}});
  const releasePointer=ev=>{if(pointer?.id===ev.pointerId)pointer=null;};
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])arena.addEventListener(kind,releasePointer);
  document.querySelectorAll('[data-dir]').forEach(btn=>{
    btn.addEventListener('pointerdown',ev=>{if(mode!=='playing')return;ev.preventDefault();btn.setPointerCapture(ev.pointerId);dirs.add(btn.dataset.dir);btn.classList.add('active');});
    const release=()=>{dirs.delete(btn.dataset.dir);btn.classList.remove('active');};
    for(const kind of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(kind,release);
  });
  window.addEventListener('blur',()=>{clearInput();if(mode==='playing')pause('화면을 벗어나 잠시 멈췄어요.');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='playing')pause('다른 화면을 보는 동안 시간이 멈춥니다.');audio?.pause();}});
  window.addEventListener('resize',()=>renderer?.resize());
  window.addEventListener('pagehide',()=>{clearInput();audio?.pause();});

  function boot(){
    if(!E||!window.MoonglimRenderer||!window.MoonglimAudio){notice('게임 파일을 불러오지 못했어요. 새로고침해 주세요.',true);return;}
    load();audio=new window.MoonglimAudio();audio.setEnabled(records.sound);updateRecords();
    $('runners').innerHTML=E.ENEMIES.map(n=>`<div class="runner"><span class="sprite" style="background-position:${n.profileIndex%4*100/3}% ${Math.floor(n.profileIndex/4)*100}%" aria-hidden="true"></span><span>${esc(n.name)}</span></div>`).join('');
    const image=new Image();let settled=false;
    const finish=atlas=>{
      if(settled)return;settled=true;renderer=new window.MoonglimRenderer(arena,atlas);state=E.create(20261112);ready=true;readyAt=performance.now();lastFrame=readyAt;hud();
      $('start').disabled=false;$('start').innerHTML='수련 시작 <span>→</span>';
      if(!atlas)notice('캐릭터 이미지를 불러오지 못했어요. 새로고침하면 다시 시도합니다.',true);
      requestAnimationFrame(frame);
    };
    image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src='../halloween/assets/npc-atlas.png';
    setTimeout(()=>finish(image.complete&&image.naturalWidth?image:null),15000);
  }
  boot();
})();
