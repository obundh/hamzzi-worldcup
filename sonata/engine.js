/* Hamzzi Sonata v1.0 — original solo pursuit/deduction rules.
 * The deterministic action log is the save format of record.
 * This file contains no network, DOM, timer, or ambient random dependencies.
 */
(function (root) {
  'use strict';

  const CANDIDATES = [
    {id:'set',name:'셰빛',x:27,y:21},
    {id:'nekoko',name:'nekoko moew',x:301,y:21},
    {id:'ruk',name:'콕ㅏ',x:575,y:21},
    {id:'donut',name:'도넛굽는랫서팬더',x:27,y:108},
    {id:'kang',name:'강제아',x:301,y:108},
    {id:'jin',name:'진',x:575,y:108},
    {id:'cookie',name:'바삭쫀득쿠키',x:27,y:195},
    {id:'iaie',name:'이아이에',x:301,y:195},
    {id:'lumia',name:'루미아',x:575,y:195},
    {id:'bki',name:'bki',x:27,y:282},
    {id:'ddon',name:'뜬꾸리',x:301,y:282},
    {id:'mang',name:'망해',x:575,y:282},
    {id:'gong',name:'공명14',x:27,y:369},
    {id:'soft',name:'부드러운 저승사자',x:301,y:369},
    {id:'irung',name:'이몽',x:575,y:369},
    {id:'quiet',name:'조용한닝겐',quiet:true}
  ];
  const TRAITS = [
    {key:'cloak',name:'망토',values:['분홍 망토','보라 망토'],icons:['🩷','💜']},
    {key:'snack',name:'간식',values:['도토리','해바라기씨'],icons:['🌰','🌻']},
    {key:'hat',name:'모자',values:['베레모','밀짚모자'],icons:['🧢','👒']},
    {key:'item',name:'소지품',values:['열쇠','책'],icons:['🗝️','📖']}
  ];
  const MARKS = [
    {name:'숲',icon:'🌳'},
    {name:'물',icon:'💧'},
    {name:'집',icon:'🏠'},
    {name:'별',icon:'⭐'}
  ];
  const names = ['다락서재','달빛정원','분수광장','풍차언덕','해바라기밭','빵집골목','작은연못','시계탑','버섯숲','찻집테라스','나무다리','별빛정류장'];
  // Each mark appears three times; shared marks are deliberately nonlocal.
  const marks = [2,0,1,3,0,2,1,3,0,2,1,3];
  const NODES = names.map((name,id) => ({id,name,x:[12,37,63,88][id%4],y:[18,50,82][Math.floor(id/4)],mark:marks[id]}));
  const EDGES = [];
  for (let id=0;id<12;id++) {
    if (id%4<3) EDGES.push([id,id+1]);
    if (id<8) EDGES.push([id,id+4]);
  }
  const ADJ = NODES.map(node => EDGES.filter(edge=>edge.includes(node.id)).map(edge=>edge[0]===node.id?edge[1]:edge[0]));
  const DIST = NODES.map(start => {
    const distances = Array(12).fill(Infinity); distances[start.id]=0;
    const queue=[start.id];
    for(let i=0;i<queue.length;i++)for(const next of ADJ[queue[i]])if(!Number.isFinite(distances[next])){distances[next]=distances[queue[i]]+1;queue.push(next);}
    return distances;
  });
  const DIFFICULTIES = {easy:{name:'산책 탐정',nights:18},normal:{name:'달빛 탐정',nights:14},hard:{name:'명탐정',nights:11}};
  const IDS = new Set(CANDIDATES.map(candidate=>candidate.id));

  function bits(number) { let count=0; for(let n=number;n;n>>>=1)count+=n&1; return count; }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function fail(message) { throw new Error(message); }
  function seedValue(seed) {
    if(typeof seed==='number'){
      if(!Number.isSafeInteger(seed))fail('사건 번호가 올바르지 않아요.');
      return (seed>>>0)||0x9e3779b9;
    }
    if(typeof seed!=='string'||!seed.trim()||seed.length>80)fail('사건 번호가 올바르지 않아요.');
    let hash=2166136261;
    for(let i=0;i<seed.length;i++){hash^=seed.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return (hash>>>0)||0x9e3779b9;
  }
  function random(state) {
    let value=state.rng>>>0;value^=value<<13;value^=value>>>17;value^=value<<5;
    state.rng=value>>>0;return state.rng/4294967296;
  }
  function pick(state,values) { return values[Math.floor(random(state)*values.length)]; }
  function shuffle(state,values) {
    const result=[...values];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random(state)*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function traitValues(pattern) { return TRAITS.map((trait,index)=>trait.values[(pattern>>>index)&1]); }
  function patternValue(candidate) {
    const pattern=typeof candidate==='number'?candidate:candidate&&candidate.pattern;
    if(!Number.isInteger(pattern)||pattern<0||pattern>15)fail('후보의 게임용 특징이 올바르지 않아요.');
    return pattern;
  }
  function matchClue(candidate,clue) {
    const pattern=patternValue(candidate);
    if(!clue||clue.kind!=='count'||!Number.isInteger(clue.mask)||clue.mask<1||clue.mask>15||!Number.isInteger(clue.pattern)||clue.pattern<0||clue.pattern>15||!Number.isInteger(clue.count))fail('단서가 올바르지 않아요.');
    return bits(clue.mask)-bits((pattern^clue.pattern)&clue.mask)===clue.count;
  }
  function consistentIds(state) {
    return CANDIDATES.filter(candidate=>state.clues.every(clue=>matchClue(state.traitsById[candidate.id],clue))).map(candidate=>candidate.id);
  }
  function cluePool(targetPattern) {
    const clues=[];
    for(let mask=1;mask<16;mask++){
      const size=bits(mask);if(size<2)continue;
      for(let pattern=0;pattern<16;pattern++){
        if((pattern&~mask)!==0)continue;
        const count=size-bits((pattern^targetPattern)&mask);
        // Partial matches preserve deduction; direct all-same/all-different
        // profiles and single-feature reveals are deliberately excluded.
        if(count===0||count===size)continue;
        const items=TRAITS.flatMap((trait,index)=>(mask&(1<<index))?[trait.values[(pattern>>>index)&1]]:[]);
        clues.push({id:`c${mask}-${pattern}-${count}`,kind:'count',mask,pattern,count,items,text:`${items.join(' · ')} — 이 ${size}가지 중 정확히 ${count}가지가 맞아요.`});
      }
    }
    return clues;
  }
  function makeClues(state) {
    const target=state.traitsById[state.identity];
    const pool=cluePool(target);let remaining=Array.from({length:16},(_,index)=>index);const selected=[];
    for(let step=0;remaining.length>1&&step<4;step++){
      const options=pool.map(clue=>({clue,remaining:remaining.filter(pattern=>matchClue(pattern,clue))})).filter(option=>option.remaining.length>0&&option.remaining.length<remaining.length);
      if(!options.length)fail('이 사건의 단서를 구성할 수 없어요.');
      let bestDistance=Infinity;let best=[];
      for(const option of options){
        const distance=Math.abs(option.remaining.length-remaining.length/2);
        if(distance<bestDistance){bestDistance=distance;best=[option];}
        else if(distance===bestDistance)best.push(option);
      }
      const chosen=pick(state,best);selected.push(chosen.clue);remaining=chosen.remaining;
    }
    if(remaining.length!==1||remaining[0]!==target)fail('이 사건의 유일해 검증에 실패했어요.');
    return selected;
  }
  function log(state,kind,text) {
    state.log.push({turn:state.actions.length,night:state.night,kind,text});
    if(state.log.length>40)state.log.splice(0,state.log.length-40);
  }
  function possiblePositions(state) {
    if(state&&Array.isArray(state.tracking))return [...state.tracking];
    if(!state||!Array.isArray(state.trace)||!state.trace.length)return [];
    let positions=NODES.filter(node=>node.id!==0&&node.mark===state.trace[0].mark).map(node=>node.id);
    for(const trace of state.trace.slice(1)){
      const expanded=new Set();
      for(const position of positions)for(let to=0;to<12;to++)if(DIST[position][to]===trace.steps)expanded.add(to);
      positions=[...expanded].filter(id=>NODES[id].mark===trace.mark).sort((a,b)=>a-b);
    }
    return positions;
  }
  function moveShadow(state,steps) {
    const options=NODES.filter(node=>DIST[state.targetPos][node.id]===steps).map(node=>node.id);
    state.targetPos=pick(state,options);state.mark=NODES[state.targetPos].mark;
    const expanded=new Set();
    for(const position of state.tracking)for(let to=0;to<12;to++)if(DIST[position][to]===steps)expanded.add(to);
    state.tracking=[...expanded].filter(id=>NODES[id].mark===state.mark).sort((a,b)=>a-b);
    state.trace.push({turn:state.actions.length,night:state.night,mark:state.mark,steps});
    state.hintPositions=[];
    if(!possiblePositions(state).includes(state.targetPos))fail('추적 기록이 실제 위치와 맞지 않아요.');
  }
  function create(seed,difficulty='normal') {
    if(!Object.prototype.hasOwnProperty.call(DIFFICULTIES,difficulty))fail('난이도가 올바르지 않아요.');
    const normalized=seedValue(seed);
    const state={v:1,seed:normalized,rng:normalized,difficulty,maxNights:DIFFICULTIES[difficulty].nights,player:0,targetPos:0,identity:'',traitsById:{},clueDeck:[],clues:[],night:1,ap:2,status:'playing',actions:[],log:[],trace:[],tracking:[],hints:0,hintPositions:[],lastEvent:{type:'start'},spent:0,searches:0,catches:0,misses:0,fledThisNight:false,score:null};
    const patterns=shuffle(state,Array.from({length:16},(_,index)=>index));
    CANDIDATES.forEach((candidate,index)=>{state.traitsById[candidate.id]=patterns[index];});
    state.identity=pick(state,CANDIDATES).id;
    state.targetPos=pick(state,NODES.filter(node=>node.id!==0)).id;state.mark=NODES[state.targetPos].mark;
    state.tracking=NODES.filter(node=>node.id!==0&&node.mark===state.mark).map(node=>node.id);
    state.trace=[{turn:0,night:1,mark:state.mark,steps:0}];
    state.clueDeck=makeClues(state);
    log(state,'start',`사건 시작. ${MARKS[state.mark].name} 표식이 있는 곳에서 그림자가 목격됐어요.`);
    return state;
  }
  function cleanAction(action) {
    if(!action||typeof action!=='object'||Array.isArray(action))fail('행동이 올바르지 않아요.');
    switch(action.type){
      case 'move':if(!Number.isInteger(action.to)||action.to<0||action.to>=12)fail('이동할 장소가 올바르지 않아요.');return {type:'move',to:action.to};
      case 'search':case 'wait':case 'hint':return {type:action.type};
      case 'accuse':if(!IDS.has(action.id))fail('지목할 후보가 올바르지 않아요.');return {type:'accuse',id:action.id};
      default:fail('알 수 없는 행동이에요.');
    }
  }
  function finishNight(state,cost) {
    state.spent+=cost;state.ap-=cost;
    if(state.ap>0)return;
    if(state.night>=state.maxNights){
      state.status='last-chance';state.ap=0;
      log(state,'last-chance','새벽이 밝았어요. 이동과 수색은 끝났지만, 마지막 정체 추리를 한 번 할 수 있어요.');
      return;
    }
    state.night++;state.ap=2;
    if(!state.fledThisNight){moveShadow(state,1);log(state,'shadow',`밤이 바뀌었어요. 그림자가 한 칸 이동했고, ${MARKS[state.mark].name} 표식에서 흔적이 발견됐어요.`);}
    else log(state,'night',`다음 밤이에요. 그림자는 이번 밤에 이미 도망쳤으므로 더 움직이지 않아요.`);
    state.fledThisNight=false;
  }
  function score(state) {
    if(state.status!=='won')return 0;
    return Math.max(100,800+(state.maxNights*2-state.spent)*15-state.hints*75-state.misses*10);
  }
  function act(previous,rawAction) {
    if(!previous||previous.v!==1||!Array.isArray(previous.actions)||!Array.isArray(previous.clues))fail('진행 중인 사건이 올바르지 않아요.');
    const action=cleanAction(rawAction);
    if(previous.status==='won'||previous.status==='lost')fail('이미 끝난 사건이에요.');
    if(previous.status==='last-chance'&&action.type!=='accuse')fail('마지막 정체 추리만 할 수 있어요.');
    if(previous.status!=='playing'&&previous.status!=='last-chance')fail('사건 상태가 올바르지 않아요.');
    if(action.type==='move'&&!ADJ[previous.player].includes(action.to))fail('길로 연결된 이웃 장소로만 이동할 수 있어요.');
    if(action.type==='hint'&&previous.hints>=3)fail('추적 도움은 사건당 세 번까지 사용할 수 있어요.');
    if(previous.actions.length>=128)fail('행동 기록이 너무 길어요.');
    const state=copy(previous);state.actions.push(action);
    if(action.type==='accuse'){
      state.status=action.id===state.identity?'won':'lost';state.lastEvent={type:'accuse',correct:state.status==='won',id:action.id};
      log(state,state.status,state.status==='won'?`${CANDIDATES.find(candidate=>candidate.id===action.id).name}의 정체를 밝혔어요!`:'지목한 햄찌는 그림자의 주인이 아니었어요.');
      state.score=score(state);return state;
    }
    if(action.type==='hint'){
      state.hints++;state.hintPositions=possiblePositions(state);state.lastEvent={type:'hint'};
      log(state,'hint',`추적 도움 ${state.hints}/3: 지금까지의 흔적과 이동 거리에 맞는 장소 ${state.hintPositions.length}곳을 표시했어요.`);return state;
    }
    if(action.type==='move'){
      state.player=action.to;state.lastEvent={type:'move',to:action.to};log(state,'move',`${NODES[action.to].name}(으)로 이동했어요.`);finishNight(state,1);return state;
    }
    if(action.type==='wait'){
      state.lastEvent={type:'wait'};log(state,'wait','남은 행동을 마치고 다음 흔적을 기다려요.');finishNight(state,state.ap);return state;
    }
    state.searches++;
    if(state.player===state.targetPos){
      state.tracking=[state.player];
      state.catches++;const clue=state.clueDeck[state.clues.length];
      if(clue)state.clues.push(copy(clue));
      state.lastEvent={type:'search',found:true,newClue:Boolean(clue),clueId:clue?clue.id:null};
      log(state,'found',clue?`수색 성공! 단서 ${state.clues.length}/${state.clueDeck.length}을 확보했어요.`:'수색 성공! 확보할 정체 단서는 이미 모두 모았어요. 이제 정체를 추리해 보세요.');
      moveShadow(state,2);state.fledThisNight=true;
      log(state,'flee',`그림자가 두 칸 도망쳤어요. 새 흔적은 ${MARKS[state.mark].name} 표식이에요.`);
    }else{
      state.tracking=state.tracking.filter(id=>id!==state.player);
      if(state.hintPositions.length)state.hintPositions=possiblePositions(state);
      state.misses++;state.lastEvent={type:'search',found:false,newClue:false};log(state,'miss','이곳에는 그림자가 없어요. 발자국과 다음 이동을 다시 살펴보세요.');
    }
    finishNight(state,1);return state;
  }
  function replay(seed,difficulty,actions) {
    if(!Array.isArray(actions)||actions.length>128)fail('저장된 행동 기록이 올바르지 않아요.');
    let state=create(seed,difficulty);
    for(const action of actions)state=act(state,action);
    return state;
  }
  function restore(saved) {
    if(!saved||typeof saved!=='object'||Array.isArray(saved)||saved.v!==1)fail('저장된 사건 형식이 올바르지 않아요.');
    // Derived fields are discarded. Only a valid deterministic action log may
    // reconstruct positions, clues, outcome, and score.
    return replay(saved.seed,saved.difficulty,saved.actions);
  }
  const API={VERSION:1,CANDIDATES,TRAITS,MARKS,NODES,EDGES,ADJ,DIST,DIFFICULTIES,create,act,replay,restore,matchClue,consistentIds,possiblePositions,traitValues,score};
  root.SonataEngine=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
