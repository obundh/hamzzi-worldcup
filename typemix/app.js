(() => {
  'use strict';
  const M = window.TypeMix;
  const $ = id => document.getElementById(id);
  if (!M) { $('run-status').textContent = '파일을 불러오지 못했어요. 새로고침해주세요.'; $('start').disabled = true; return; }
  const KEY = 'hamzzi-typemix-v1';
  const STEP = 2300;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = M.FIELDS.map(field => {
    const el = document.createElement('div');
    el.className = 'node';
    const label = document.createElement('span');
    label.className = 'field-label'; label.textContent = field.label;
    const value = document.createElement('span'); value.className = 'field-value';
    el.append(label, value); $('track').append(el);
    return { el, value };
  });
  let profile = {}, count = 0, mode = 'idle', elapsed = 0, lastTime = null, raf = 0;
  let stream = null, cameraPending = false, cameraEpoch = 0;
  const hamsters = [
    ['디피진',0],['저승사자',1],['똔꾸리',2],['다망해',3],['공명',4],['랫서쿠키',5],['이뭉',6]
  ];
  function setHamster(index) {
    const [name,tile] = hamsters[index];
    $('hamster-background').style.backgroundPosition = `${tile % 4 * 100 / 3}% ${Math.floor(tile / 4) * 100}%`;
    $('hamster-name').textContent = name;
  }

  function warnStorage(message) { $('storage-note').hidden = false; $('storage-note').textContent = message; }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({version:M.VERSION,profile})); }
    catch { warnStorage('이 브라우저에서는 저장할 수 없어요. 현재 추첨은 계속할 수 있어요.'); }
  }
  function renderTrack() {
    const done = mode === 'complete';
    const progress = Math.min(elapsed / STEP, 1);
    const active = Math.min(count, M.FIELDS.length - 1);
    let scroll = Math.max(0, active - (count ? 1 - progress : 1));
    if (reduceMotion) scroll = active;
    const first = done ? 15 : 42 - scroll * 27.4;
    const pitch = done ? 13.5 : 27.4;
    nodes.forEach((node, i) => {
      node.el.style.top = `${first + i * pitch}%`;
      node.el.classList.toggle('complete', i < count);
      node.value.textContent = i < count ? M.display(M.FIELDS[i].key, profile[M.FIELDS[i].key]) : '';
    });
    $('rail').style.top = `${first}%`;
    $('rail').style.height = `${(M.FIELDS.length - 1) * pitch}%`;
    const destination = first + active * pitch;
    const from = count ? destination - pitch : 8;
    $('traveler').style.top = `${done ? first + 5 * pitch : reduceMotion ? destination : from + (destination - from) * progress}%`;
    $('traveler').hidden = mode === 'idle' || done;
  }
  function render() {
    $('stage-hint').hidden = mode !== 'idle' || !!stream;
    $('stage-state').hidden = mode !== 'paused';
    $('stage-state').textContent = '일시정지';
    $('start').firstChild.textContent = mode === 'idle' ? '시작하기 ' : mode === 'complete' ? '다시 뽑기 ' : '처음부터 ';
    $('pause').hidden = mode === 'idle' || mode === 'complete';
    $('pause').textContent = mode === 'paused' ? '계속하기' : '일시정지';
    $('result').hidden = mode !== 'complete';
    if (mode === 'idle') $('run-status').textContent = '성별부터 국적까지, 6가지 조건을 뽑아요.';
    else if (mode === 'complete') $('run-status').textContent = '6 / 6 · 모두 뽑았어요.';
    else {
      const latest = count ? `${M.FIELDS[count-1].ko} ${M.describe(M.FIELDS[count-1].key,profile[M.FIELDS[count-1].key])} · ` : '';
      $('run-status').textContent = `${count} / 6 · ${latest}${mode === 'paused' ? '계속하기를 눌러주세요.' : M.FIELDS[count].ko + ' 뽑는 중…'}`;
    }
    renderTrack();
  }
  function showResult() {
    $('summary').replaceChildren();
    M.FIELDS.forEach(field => {
      const pair = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = field.ko; dd.textContent = M.describe(field.key,profile[field.key]);
      pair.append(dt,dd); $('summary').append(pair);
    });
    $('prompt').value = M.buildPrompt(profile);
    $('copy-status').textContent = '';
  }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; lastTime = null; }
  function tick(time) {
    if (mode !== 'running') return;
    if (lastTime !== null) elapsed += Math.min(100,Math.max(0,time-lastTime));
    lastTime = time;
    if (elapsed >= STEP) {
      const field = M.FIELDS[count];
      profile[field.key] = M.draw(field.key);
      count++; elapsed = 0; save();
      if (count === M.FIELDS.length) {
        mode = 'complete'; stopLoop(); showResult(); render(); return;
      }
      render();
    } else renderTrack();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    stopLoop(); profile = {}; count = 0; elapsed = 0; mode = 'running';
    setHamster(Math.floor(Math.random() * hamsters.length));
    $('prompt').value = ''; $('summary').replaceChildren(); $('copy-status').textContent = '';
    save(); render(); raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (mode === 'running') { mode = 'paused'; stopLoop(); render(); }
  }
  function resume() {
    if (mode !== 'paused' || document.hidden) return;
    mode = 'running'; lastTime = null; render(); raf = requestAnimationFrame(tick);
  }
  $('start').addEventListener('click',start);
  $('pause').addEventListener('click',() => mode === 'paused' ? resume() : pause());
  document.addEventListener('visibilitychange',() => { if (document.hidden) pause(); });

  $('copy').addEventListener('click',async () => {
    const text = $('prompt').value;
    if (mode !== 'complete' || !text) return;
    $('copy').disabled = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      $('copy-status').textContent = '복사했어요. GPT·Gemini에 붙여넣어 보세요.';
    } catch {
      $('prompt').focus(); $('prompt').select();
      $('copy-status').textContent = '자동 복사가 막혀 있어요. 선택된 글을 길게 누르거나 Ctrl/Cmd+C로 복사해주세요.';
    } finally { $('copy').disabled = false; }
  });
  function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; $('camera').srcObject = null; $('stage').classList.remove('has-camera');
    $('camera-toggle').textContent = '카메라 켜기'; $('camera-toggle').setAttribute('aria-pressed','false');
    $('camera-note').textContent = '다시 뽑으면 햄찌도 바뀌어요'; render();
  }
  $('camera-toggle').addEventListener('click',async () => {
    if (cameraPending) return;
    if (stream) { stopCamera(); return; }
    cameraPending = true; $('camera-toggle').disabled = true; $('camera-note').textContent = '카메라 연결 중…';
    const requestEpoch = cameraEpoch;
    let obtained = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      obtained = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      if (requestEpoch !== cameraEpoch || document.hidden) { obtained.getTracks().forEach(track => track.stop()); return; }
      $('camera').srcObject = obtained;
      await $('camera').play();
      if (requestEpoch !== cameraEpoch || document.hidden) { obtained.getTracks().forEach(track => track.stop()); $('camera').srcObject = null; return; }
      stream = obtained; $('stage').classList.add('has-camera');
      $('camera-toggle').textContent = '카메라 끄기'; $('camera-toggle').setAttribute('aria-pressed','true');
      $('camera-note').textContent = '이 기기 안에서만 표시 중'; render();
    } catch {
      if (obtained) obtained.getTracks().forEach(track => track.stop());
      $('camera').srcObject = null;
      $('camera-note').textContent = '연결하지 못했어요. 카메라 없이 진행할 수 있어요.';
    } finally {
      cameraPending = false; $('camera-toggle').disabled = false;
      if (!stream && $('camera-note').textContent === '카메라 연결 중…') $('camera-note').textContent = '다시 뽑으면 햄찌도 바뀌어요';
    }
  });
  window.addEventListener('pagehide',() => { cameraEpoch++; stopLoop(); stopCamera(); });
  window.addEventListener('pageshow',event => { if (event.persisted && mode === 'running') { mode = 'paused'; render(); } });
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      profile = M.restore(JSON.parse(raw)).profile; count = Object.keys(profile).length;
      mode = count === M.FIELDS.length ? 'complete' : count ? 'paused' : 'idle';
      if (mode === 'complete') showResult();
    }
  } catch {
    profile = {}; count = 0; mode = 'idle';
    warnStorage('이전 결과를 읽지 못해 새로 시작해요.');
  }
  render();
})();
