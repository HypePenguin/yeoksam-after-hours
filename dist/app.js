import {SAVE_KEY,CLASSES,SKILLS,MAPS,clamp,xpNeeded,maxHp,maxMp,attackPower,createCharacter,normalizeCharacter,gainXp,xpReward,respawn,buyPotion,usePotion,canUseSkill,makeMonster,patrolMonster,POWER_DURATION,isPowered,basicAttackPower,effectiveSkill,JOBS,jobName,skillsFor,skillUnlocked,advanceJob,ITEMS,itemPrice,shopItemsFor,buyItem,useItem,assignQuickSlot,equipmentName,MAP_ROUTES,mapTabFor,monsterCount,recommendedMap,findMapRoute,movementMultiplier,jumpHeightMultiplier,equipUniform,equipTypeATitle,itemEquipped,hasTypeATitle,incomingDamage,WORLD_MAP_LAYOUT,worldMapConnections} from './core.js?v=96';
import {SOLDIER,createSoldier,beginSoldier,stepSoldier,soldierHit,defeatSoldier,targetableBoss,soldierCue,counterDamage} from './boss.js?v=96';
import {TYPE_A,isTypeA,createTypeA,beginTypeA,stepTypeA,typeATargetable,damageTypeA,typeAHit,defeatTypeA,typeACue} from './type-a.js?v=96';
const $=s=>document.querySelector(s);
const canvas=$('#game'),ctx=canvas.getContext('2d'),screens=$('#screens'),ui=$('#game-ui'),modalRoot=$('#modal-root');
const images={};let assetsReady=false,assetFailed=false;
const UNIFORM_ASSETS=new Set(['penguin','penguin-hurt','penguin-power-poses','penguin-walk','penguin-power-walk','penguin-jump','penguin-power-jump','combat-brawler','combat-swordsman','combat-power','sword-guard-walk','builder-recovery-walk','power-recovery-walk']);
const hasUniform=p=>!!(p?.uniform>0&&p.uniformEquipped);
const characterAsset=(asset,p=player)=>hasUniform(p)&&UNIFORM_ASSETS.has(asset)?`uniform-${asset}`:asset;
function characterImage(asset,p=player){
 const dressed=images[characterAsset(asset,p)];
 return dressed?.complete&&dressed.naturalWidth?dressed:images[asset];
}
const catAsset=(asset,p=player)=>p?.job==='protester'?asset.replace('cat','cat-protester'):asset;
const rabbitPortraits={};
const otterAsset=(p=player)=>p?.job==='idol'?'otter-idol-skirt-motion':'otter-motion';
const rabbitAsset=(p=player)=>p?.job==='mage'?'rabbit-motion':'rabbit-novice-motion';
const characterPortrait=(p,powered=false)=>p?.classId==='otter'?(rabbitPortraits[otterAsset(p)]||`assets/${otterAsset(p)}.png`):p?.classId==='chick'?(rabbitPortraits[p.job==='hacker'?'chick-hacker':'chick-motion']||'assets/chick-motion.png'):p?.classId==='rabbit'?(rabbitPortraits[rabbitAsset(p)]||`assets/${rabbitAsset(p)}.png`):p?.classId==='cat'?`assets/${catAsset('cat',p)}.png`:`assets/${characterAsset(powered?'penguin-power-poses':'penguin',p)}.png`;
const ITEM_ART_ASSETS=[...new Set(Object.values(ITEMS).map(item=>item.image).filter(Boolean))].map(src=>src.slice(7,-4));
const loadAssets=Promise.all([...ITEM_ART_ASSETS,'otter-motion','otter-idol-skirt-motion','chick-actions','chick-typing','chick-motion','npc-hyupro','maple-hideout','rabbit-novice-motion','rabbit-motion','type-a','endgame-dungeons','combat-brawler','combat-swordsman','combat-power','soldier-boss','soldier-counter','soldier-walk','gangnam','hansabal-pocha','city','crossroads','station-six','player','robot','penguin','penguin-power','penguin-hurt','penguin-power-poses','districts','high-dungeons','dojo','penguin-walk','penguin-power-walk','penguin-jump','penguin-power-jump','cat','cat-motion','cat-skills','cat-protester','cat-protester-motion','cat-protester-skills','npc-redfox','olympic-park','npc-hyuntori-white','npc-maguri-large-crate','npc-emperor-coach','npc-tiger-master','job-equipment','sword-guard-walk','builder-recovery-walk','power-recovery-walk',...[...UNIFORM_ASSETS].map(name=>`uniform-${name}`)].map(name=>new Promise(resolve=>{const img=new Image();images[name]=img;img.onload=()=>resolve();img.onerror=()=>{assetFailed=true;resolve();};img.src=`assets/${name}.png`;}))).then(()=>{assetsReady=true;prepareRabbitPortrait();});
let records=[],storageBroken=false;
try{const saved=localStorage.getItem(SAVE_KEY);if(saved){const parsed=JSON.parse(saved);if(!parsed||parsed.version!==1||!Array.isArray(parsed.characters))throw new Error('invalid save');records=parsed.characters.map(normalizeCharacter).filter(Boolean);}}catch{storageBroken=true;}
let scene='title',player=null,selectedId=records[0]?.id??null,modal=null,returnFocus=null,keys=new Set(),monsters=[],drops=[],effects=[],texts=[],camera=0,worldTime=0,screenWidth=1440,prev=0,lastHud=0,saveClock=0,toastTimer=null,transitionId=0,lastSavedLabel='',walking=false,walkPhase=0,soundOn=false,audioContext=null;
let rabbitOrbs=[],rabbitShield=null;
let otterWave=null,otterShield=null,otterBubbles=null,otterConcert=null;
let chickStealth=0,chickCharge=null,hackerUlt=null,chickCodes=[];
let inventorySelection='potions',boss=null,potionCooldown=0,catCharge=null,catCastLock=0,catProjectiles=[],catFires=[],catBallot=null;
const bossActive=()=>!!boss?.active;
const canTarget=m=>!m.dead&&(!m.isBoss||(isTypeA(m)?typeATargetable(m):targetableBoss(m)));
const bossInfo=()=>isTypeA(boss)?TYPE_A:SOLDIER;
let cameraZoom=1,viewShakeX=0,viewShakeY=0;
const CAMERA_GROUND=650;
const viewOffsetY=()=>CAMERA_GROUND*(1-cameraZoom);
const viewWidth=()=>screenWidth/cameraZoom;
const screenToWorld=(x,y)=>({x:(x-viewShakeX)/cameraZoom+camera,y:(y-viewOffsetY()-viewShakeY)/cameraZoom});
let pz=0,pvz=0,jumpScale=1,jumpPrep=0,jumpLanding=0,facing=1,attackTimer=0,invincible=0,hurtTime=0,cooldowns={q:0,w:0,e:0,r:0},interactionTarget=null,shake=0,swordUlt=null,guardTime=0,combatMotion=null,recovery=null;
const NPCS=[{id:'gm',x:650,y:621,name:'현토리',role:'운영자 · 게임 안내',asset:'npc-hyuntori-white',icon:'?'},{id:'shop',x:1060,y:654,name:'마구리',role:'회복 아이템 · 이동장치',asset:'npc-maguri-large-crate',icon:'+'}];
const MAGURI_CROP=[94,25,1115,1157];
// Match the previous frog's eye spacing; the larger silhouette comes from the crate.
const MAGURI_WIDTH=64.3;
const TRAINERS={
 maple:{id:'hyupro',job:'hacker',x:960,y:648,name:'휴프로',role:'해커 / 아이돌 전직 · Lv. 10',asset:'npc-hyupro',height:240,width:206,icon:'E'},
 gym:{id:'bodybuilder-coach',job:'bodybuilder',x:780,y:645,name:'근육 코치',role:'바디빌더 전직 · Lv. 10',asset:'npc-emperor-coach',height:280,crop:[34,35,957,1484],icon:'E'},
 dojo:{id:'sword-master',job:'swordsman',x:780,y:645,name:'검도 사범',role:'검사 전직 · Lv. 10',asset:'npc-tiger-master',height:193,crop:[37,16,968,1502],icon:'E'},
 olympic:{id:'park-organizer',job:'protester',x:940,y:648,name:'레드폭스',role:'시위대 전직 · Lv. 10',asset:'npc-redfox',height:184,crop:[63,10,909,1513],icon:'E'}
};
const GANGNAM_NPCS=[{...NPCS.find(n=>n.id==='shop'),x:1050,y:654}];
const mapNPCs=()=>player?.map==='town'?NPCS:['gangnam','yeoksamStreet'].includes(player?.map)?GANGNAM_NPCS:TRAINERS[player?.map]?[{...TRAINERS[player.map],...(player.map==='maple'&&player.classId==='otter'?{job:'idol'}:{})}]:[];
const icon=(name)=>({map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16"/></svg>',bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 8V6a5 5 0 0 1 10 0v2M5 8h14l1 13H4L5 8Z"/><path d="M9 13h6"/></svg>',save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 3h13l4 4v14H3V3h1Z"/><path d="M7 3v6h9V3M7 21v-8h10v8"/></svg>',menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 6h14M5 12h14M5 18h14"/></svg>',sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m11 4-6 5H2v6h3l6 5V4ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/></svg>'}[name]);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2700);}
function beep(freq=350,duration=.07,type='sine',volume=.05){if(!soundOn)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(freq,audioContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(freq*.6,audioContext.currentTime+duration);gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+duration);}catch{}}
function save(silent=true){
 if(player){player.savedAt=new Date().toISOString();const i=records.findIndex(p=>p.id===player.id);if(i>=0)records[i]={...player};else records.push({...player});}
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,characters:records}));storageBroken=false;lastSavedLabel='방금 저장됨';if(!silent)toast('현재 위치와 진행 상황을 저장했어요.');return true;}catch{storageBroken=true;if(!silent)toast('브라우저 저장 공간에 접근할 수 없어요. 진행 상황이 유지되지 않을 수 있습니다.');return false;}
}
function setScene(next){if(next!=='playing'){if(player){player.respectTime=0;player.hp=Math.min(player.hp,maxHp(player));}boss=null;potionCooldown=0;}cancelCatCharge();catProjectiles=[];catFires=[];catBallot=null;$('.game-shell').classList.remove('boss-fight');resetJump();resetGait();cancelSword();resetCombat();hurtTime=0;scene=next;keys.clear();ui.innerHTML='';$('#touch-controls').classList.toggle('playing',next==='playing');$('.game-shell').classList.toggle('is-playing',next==='playing');resize();}
function title(){transitionId++;resetOtter();player=null;closeModal();setScene('title');screens.innerHTML=`<div class="title-screen"><div class="title-content"><div class="eyebrow"><span></span> 불이 꺼진 도시에서, 모험이 켜진다.</div><p class="english-title">YEOKSAM<br>AFTER HOURS</p><h1>역삼의 밤<span>夜</span></h1><p class="intro">익숙한 거리, 조금 다른 밤.<br>작은 용기를 챙겨 도시 밖으로 떠나보세요.</p><button class="primary start-button" id="start-button">시작하기 <span>ENTER ↵</span></button><div class="save-caption">진행 상황은 이 브라우저에 자동 저장됩니다.</div></div><div class="scene-caption"><span class="station-pill">2</span><div>역삼 Yeoksam<small>37.5006° N &nbsp; 127.0364° E</small></div></div></div>`;$('#start-button').onclick=selectCharacters;}
function selectCharacters(){
 if(player){resetOtter();save();}player=null;closeModal();setScene('characters');
 if(!records.some(p=>p.id===selectedId))selectedId=records[0]?.id??null;
 screens.innerHTML=`<div class="screen-overlay"><div class="screen-top"><button class="text-button" id="back-title">‹ 시작 화면</button><span>YOUR LITTLE ADVENTURE</span></div><h2 class="screen-title">오늘은 누구의 이야기인가요?</h2><p class="screen-subtitle">캐릭터를 더블 클릭하거나 선택 후 모험을 시작하세요.</p><div class="characters">${records.map(p=>`<button class="character-card ${p.id===selectedId?'selected':''}" data-character="${escapeHtml(p.id)}" aria-pressed="${p.id===selectedId}"><span class="level">Lv. ${p.level}</span>${p.classId==='otter'?`<span class="rabbit-selection-portrait" role="img" aria-label="수달 ${p.job==='idol'?'아이돌':'모험가'} 기본 자세" style="background-image:url(assets/${otterAsset(p)}.png)"></span>`:p.classId==='chick'?`<span class="rabbit-selection-portrait" role="img" aria-label="병아리 ${p.job==='hacker'?'해커':'모험가'} 기본 자세" style="background-image:url(assets/chick-motion.png);background-position:0 ${p.job==='hacker'?'66.6667%':'0'}"></span>`:p.classId==='rabbit'?`<span class="rabbit-selection-portrait" role="img" aria-label="${p.job==='mage'?'토끼 마법사':'토끼 모험가'} 기본 자세" style="background-image:url(assets/${rabbitAsset(p)}.png)"></span>`:`<img src="${characterPortrait(p)}" alt="${p.classId==='chick'?'병아리 모험가':p.classId==='cat'?'고양이 모험가':hasUniform(p)?'군복을 입은 펭귄 모험가':'펭귄 모험가'}">`}<h3>${escapeHtml(p.name)}</h3><small>${jobName(p)} · ${MAPS[p.map].name}</small></button>`).join('')}<button class="character-card new-card" id="new-character"><span>＋</span><strong>새 캐릭터 생성하기</strong><small style="margin-top:10px">새로운 이야기를 시작해요</small></button></div><div class="character-actions"><button class="primary" id="enter-world" ${selectedId?'':'disabled'}>모험 시작하기</button><button class="character-delete" id="delete-character" ${selectedId?'':'disabled'}>선택한 캐릭터 삭제</button></div>${records.length===0?'<p class="empty-copy">아직 캐릭터가 없어요. 첫 모험가를 만들어 보세요.</p>':''}<p class="save-caption">이 브라우저에 저장된 캐릭터 · ${records.length}명</p></div>`;
 $('#back-title').onclick=title;$('#new-character').onclick=createModal;$('#enter-world').onclick=()=>enterWorld(selectedId);$('#delete-character').onclick=()=>deleteCharacterModal(selectedId);
 document.querySelectorAll('[data-character]').forEach(el=>{el.onclick=()=>{selectedId=el.dataset.character;document.querySelectorAll('[data-character]').forEach(c=>{c.classList.toggle('selected',c===el);c.setAttribute('aria-pressed',String(c===el));});$('#enter-world').disabled=false;$('#delete-character').disabled=false;};el.ondblclick=()=>enterWorld(el.dataset.character);});
}
function deleteCharacterModal(id){
 if(scene!=='characters'||player)return;
 const target=records.find(p=>p.id===id);if(!target)return;
 const expected=`${target.name} 정말로 삭제하겠습니다.`;
 showModal('delete-character','캐릭터 삭제',`<p><strong>${escapeHtml(target.name)}</strong> · Lv. ${target.level} · ${jobName(target)}<br>이 캐릭터의 레벨, 아이템, 진행 기록이 모두 삭제되며 복구할 수 없습니다.</p><form id="delete-character-form"><label for="delete-confirmation">아래 문장을 공백과 마침표까지 똑같이 입력해 주세요.</label><p class="delete-phrase" id="delete-phrase">${escapeHtml(expected)}</p><input id="delete-confirmation" aria-describedby="delete-phrase delete-error" autocomplete="off" spellcheck="false" placeholder="확인 문장을 입력하세요" required><div class="error" id="delete-error" role="alert"></div><div class="delete-actions"><button class="secondary" id="cancel-delete" type="button">취소</button><button class="danger-button" id="confirm-delete" type="submit" disabled>캐릭터 삭제하기</button></div></form>`,'#delete-confirmation');
 const input=$('#delete-confirmation'),button=$('#confirm-delete'),form=$('#delete-character-form');let composing=false,completed=false;
 const validate=()=>{button.disabled=composing||input.value!==expected;$('#delete-error').textContent='';};
 input.oninput=validate;input.oncompositionstart=()=>{composing=true;validate();};input.oncompositionend=()=>{composing=false;validate();};
 form.onkeydown=e=>{if(e.key==='Enter'&&(e.isComposing||composing))e.preventDefault();};
 $('#cancel-delete').onclick=closeModal;
 form.onsubmit=e=>{
  e.preventDefault();
  if(completed||composing||e.isComposing||scene!=='characters'||player||modal!=='delete-character')return;
  if(input.value!==expected){button.disabled=true;$('#delete-error').textContent='확인 문장을 공백과 마침표까지 정확히 입력해 주세요.';return;}
  if(!records.some(p=>p.id===id&&p.name===target.name))return;
  const remaining=records.filter(p=>p.id!==id);
  // Commit storage first: a failed write must leave the character and selection intact.
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,characters:remaining}));}
  catch{storageBroken=true;$('#delete-error').textContent='저장에 실패해 캐릭터를 삭제하지 않았어요. 다시 시도해 주세요.';return;}
  completed=true;button.disabled=true;records=remaining;storageBroken=false;lastSavedLabel='방금 저장됨';transitionId++;
  if(!records.some(p=>p.id===selectedId))selectedId=records[0]?.id??null;
  closeModal();selectCharacters();toast(`${target.name} 캐릭터를 삭제했어요.`);
  (selectedId?$('#enter-world'):$('#new-character')).focus();
 };
}
function showModal(kind,heading,content,focusSelector=null){
 walking=false;cancelSword();cancelCatCharge();cancelChickAim();keys.clear();modal=kind;returnFocus=document.activeElement;
 const npcDialogue=['gm','shop','job','portal','boss-talk'].includes(kind);
 modalRoot.innerHTML=`<div class="modal-backdrop ${npcDialogue?'npc-dialog-backdrop':''}"><section class="modal ${npcDialogue?'npc-dialog':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal-header"><h2 id="dialog-title">${heading}</h2><button class="close-button" aria-label="닫기">×</button></div>${npcDialogue?`<div class="npc-dialog-body">${content}</div>`:content}</section></div>`;
 $('.close-button').onclick=closeModal;$('.modal-backdrop').onclick=e=>{if(e.target===e.currentTarget)closeModal();};
 requestAnimationFrame(()=>{const preferred=focusSelector?$(focusSelector):null;(preferred&&!preferred.disabled?preferred:$('.bag-item.selected')||$('.modal input')||$('.modal button'))?.focus();});
}
function closeModal(){modal=null;modalRoot.innerHTML='';keys.clear();if(scene==='playing')canvas.focus({preventScroll:true});else if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
function createModal(){
 showModal('create','새로운 모험가',`<form id="create-form"><div class="class-choices" role="radiogroup" aria-label="캐릭터 종류">${CLASSES.map((kind,i)=>`<label class="class-option"><input type="radio" name="class-id" value="${kind.id}" ${i===0?'checked':''}><img src="${characterPortrait({classId:kind.id})}" alt=""><span><strong>${kind.name}</strong><small>${kind.id==='otter'?'휴프로에게 아이돌 전직':kind.id==='chick'?'메이플아지트에서 해커 전직':kind.id==='rabbit'?'마구리에게 마법사 전직':kind.id==='cat'?'올림픽공원에서 시위대 전직':'헬스장·검도장에서 전직'}</small><small>HP ${maxHp({classId:kind.id,level:1})} · MP ${kind.mp}</small></span></label>`).join('')}</div><label for="character-name">모험가의 이름</label><input id="character-name" placeholder="이름을 지어주세요" maxlength="12" autocomplete="off" required><div class="error" id="name-error" role="alert"></div><p>Lv. 1 · 시작 지원금 500원 · 감자칩 3개</p><button class="primary" type="submit">이 캐릭터로 시작하기</button></form>`);
 $('#create-form').onsubmit=e=>{e.preventDefault();try{if(records.length>=12)throw new Error('캐릭터는 최대 12명까지 만들 수 있어요.');const name=$('#character-name').value.trim();if(records.some(p=>p.name===name))throw new Error('이미 사용 중인 이름이에요.');const classId=document.querySelector('input[name="class-id"]:checked')?.value||'wanderer';const p=createCharacter(name,classId);records.push(p);selectedId=p.id;const stored=save();closeModal();selectCharacters();toast(stored?'모험가가 탄생했어요. 캐릭터를 더블 클릭해 보세요.':'캐릭터를 만들었지만 브라우저 저장에 실패했어요.');}catch(error){$('#name-error').textContent=error.message;}};
}
async function enterWorld(id){
 const source=records.find(p=>p.id===id);if(!source||scene==='loading')return;closeModal();player=normalizeCharacter(source);selectedId=id;const token=++transitionId;setScene('loading');
 screens.innerHTML=`<div class="screen-overlay">${player.classId==='otter'?`<span class="loading-icon otter-loading-portrait" role="img" aria-label="수달 ${player.job==='idol'?'아이돌':'모험가'} 대표 이미지" style="background-image:url(assets/${otterAsset(player)}.png)"></span>`:`<img class="loading-icon" src="${characterPortrait(player)}" alt="">`}<h2 class="screen-title">${MAPS[player.map].name} · 입장 준비 중</h2><div class="loading-track"><i></i></div><p class="screen-subtitle">Space와 방향키를 함께 누르면 대각선으로 점프해요.</p></div>`;
 await Promise.all([loadAssets,new Promise(r=>setTimeout(r,1000))]);if(token!==transitionId)return;if(assetFailed)toast('일부 이미지가 로드되지 않았어요. 새로고침해 주세요.');
 resetWorld();setScene('playing');screens.innerHTML='';buildHUD();canvas.focus();save();toast(player.kills===0?'역삼역에 오신 걸 환영해요! 운영자 현토리에게 F로 말을 걸어보세요.':`${player.name}, 다시 오신 걸 환영해요.`);
}
function resetWorld(){cancelCatCharge();catProjectiles=[];catFires=[];catBallot=null;if(!MAPS[player.map].boss)player.mpPotionCooldown=0;boss=player.map==='hangar'?createTypeA():player.map==='pocha'?createSoldier():null;potionCooldown=0;resetJump();resetGait();cancelSword();resetCombat();hurtTime=0;monsters=Array.from({length:monsterCount(player.map)},(_,i)=>makeMonster(player.map,i));drops=[];effects=[];texts=[];attackTimer=0;invincible=2;cooldowns=player.cooldowns;camera=clamp(player.x-screenWidth*.45,0,Math.max(0,MAPS[player.map].width-screenWidth));saveClock=0;}
async function travel(portal){
 if(scene!=='playing')return;if(bossActive()){toast('결투 중에는 출구를 사용할 수 없어요. 메뉴에서 도전을 포기하거나 이동장치를 사용하세요.');return;}if(player.map==='hangar'&&portal.to==='yeoksamStreet'&&!hasTypeATitle(player)){toast('A형 칭호를 장착해야 이동할 수 있어요. I 키로 가방을 열어 A형 칭호를 장착하세요.');return;}const target={...portal};save();closeModal();setScene('loading');const token=++transitionId;
 screens.innerHTML=`<div class="screen-overlay"><small class="eyebrow">NEXT STOP</small><h2 class="screen-title">${MAPS[target.to].name}</h2><div class="loading-track"><i></i></div><p class="screen-subtitle">${MAPS[target.to].danger?'로봇과 부딪히면 피해를 받아요. 점프로 피할 수 있어요.':'마을에서는 천천히 체력이 회복됩니다.'}</p></div>`;
 await new Promise(r=>setTimeout(r,800));if(token!==transitionId)return;player.map=target.to;player.x=target.spawnX;player.y=target.spawnY??648;if(!player.visited.includes(target.to))player.visited.push(target.to);resetWorld();setScene('playing');screens.innerHTML='';buildHUD();save();canvas.focus();toast(`${MAPS[player.map].name}에 도착했어요.`);
}
const OTTER_SKILL_ART={a:'assets/otter-skill-a.png',q:'assets/otter-skill-q.png',w:'assets/otter-skill-w.png',e:'assets/otter-skill-e.png',r:'assets/otter-skill-r.png'};
function skillSymbolMarkup(key,fallback){
 return player.classId==='otter'&&OTTER_SKILL_ART[key]?`<img class="skill-art" src="${OTTER_SKILL_ART[key]}" alt="" aria-hidden="true" draggable="false"><span class="skill-cue" hidden></span>`:fallback;
}
function buildHUD(){ui.innerHTML=`<div class="game-screen"><div class="hud-top"><div class="player-panel"><img class="avatar" src="${characterPortrait(player)}" alt=""><div class="player-info"><div class="player-name"><span id="hud-level" class="level"></span><strong id="hud-name"></strong></div><small id="hud-job" class="job-label"></small><div class="resource-meter"><div class="bar-label"><span>HP</span><span id="hp-text"></span></div><div class="bar hp"><i id="hp-bar"></i><i id="hp-shield" hidden></i></div></div><div class="resource-meter"><div class="bar-label"><span>MP</span><span id="mp-text"></span></div><div class="bar mp"><i id="mp-bar"></i></div></div><div class="resource-meter"><div class="bar-label"><span>EXP</span><span id="xp-text" class="xp-label"></span></div><div class="bar exp"><i id="xp-bar"></i></div></div></div></div><div class="map-panel"><small>${MAPS[player.map].en}</small><div class="map-title">${MAPS[player.map].name}</div><div class="map-subtitle">${MAPS[player.map].subtitle}</div></div><div class="hud-tools"><button id="map-button" aria-label="지도 보기 (M)" title="지도 · M">${icon('map')}</button><button id="inventory-button" aria-label="인벤토리 열기 (I)" title="인벤토리 · I">${icon('bag')}</button><button id="save-button" aria-label="현재 위치 저장" title="현재 위치 저장">${icon('save')}</button><button id="menu-button" aria-label="게임 메뉴 (Esc)" title="메뉴 · Esc">${icon('menu')}</button></div></div><div class="power-banner" id="power-banner" hidden><strong>근육 각성</strong><span id="power-clock"></span><small>모든 스킬 강화</small><div class="power-track"><i id="power-bar"></i></div></div><div class="power-banner combat-banner" id="combat-banner" hidden><strong id="combat-title"></strong><span id="combat-clock"></span><small id="combat-detail"></small><div class="power-track"><i id="combat-bar"></i></div></div><div class="boss-hud" id="boss-hud" hidden><div><strong id="boss-name">Lv.${bossInfo().level} ${bossInfo().name}</strong><span id="boss-hp-text"></span></div><div class="boss-hp-track"><i id="boss-hp-fill"></i></div><p id="boss-cue"></p><small id="boss-potion-clock"></small></div><div class="hack-controls" id="hack-controls" role="group" aria-label="해킹 대상 선택" hidden><span class="hack-controls-label">대상 선택</span><button id="hack-prev" aria-label="이전 적 선택">←</button><button id="hack-confirm" title="Enter로 해킹 확정">확정 <kbd>↵</kbd></button><button id="hack-next" aria-label="다음 적 선택">→</button><button id="hack-cancel" title="Esc로 취소">취소 <kbd>Esc</kbd></button></div><div class="type-a-warning" id="type-a-warning" role="status" hidden></div><div class="context-hint" id="context-hint" hidden></div><div class="hud-bottom"><div class="hotbar"><button class="skill${player.classId==='otter'?' otter-skill':''}" data-skill="a" title="기본 공격 · A${player.classId==='rabbit'?' · MP 2':''}"><span class="skill-symbol">${skillSymbolMarkup('a',player.classId==='rabbit'?'◉':'╱')}</span><b>A</b>${player.classId==='rabbit'?'<span class="lock-level">2</span>':''}</button>${skillsFor(player).map(s=>`<button class="skill${player.classId==='otter'?' otter-skill':''}" data-skill="${s.key}" aria-label="${s.name}, ${s.key.toUpperCase()} 키, 레벨 ${s.level}, MP ${s.mp}" title="${s.name} · Lv.${s.level} · MP ${s.mp} · ${s.description}"><span class="skill-symbol">${skillSymbolMarkup(s.key,s.icon)}</span><b>${s.key.toUpperCase()}</b><span class="lock-level"></span></button>`).join('')}<div class="item-hotbar">${[0,1,2].map(i=>`<button class="skill item-slot" data-item-slot="${i}"></button>`).join('')}</div></div><div class="game-bottom-right"><span class="money" id="hud-money"></span><span class="saved" id="hud-saved"></span></div></div></div>`;
 $('#map-button').onclick=worldMap;$('#inventory-button').onclick=inventory;$('#save-button').onclick=()=>save(false);$('#menu-button').onclick=menu;document.querySelectorAll('[data-skill]').forEach(bindSkillButton);document.querySelectorAll('[data-item-slot]').forEach(b=>b.onclick=()=>{useQuickSlot(Number(b.dataset.itemSlot));canvas.focus();});refreshHUD();
}
function refreshHealthHUD(){
 const hp=Math.ceil(player.hp),shield=Math.ceil((rabbitShield?.hp||0)+(otterShield?.hp||0)),maximum=maxHp(player),scale=Math.max(maximum,player.hp+shield);
 const text=$('#hp-text');text.textContent=shield?`${hp} + ${shield} / ${maximum}`:`${hp} / ${maximum}`;
 text.title=shield?`체력 ${hp} / ${maximum} · 보호막 ${shield} · 합계 ${hp+shield}`:`체력 ${hp} / ${maximum}`;
 text.setAttribute('aria-label',text.title);
 $('#hp-bar').style.width=`${player.hp/scale*100}%`;
 const bar=$('#hp-shield');bar.hidden=!shield;bar.style.left=`${player.hp/scale*100}%`;bar.style.width=`${shield/scale*100}%`;
}
function refreshHUD(){if(scene!=='playing'||!$('#hud-level'))return;$('#hud-name').textContent=player.name;$('#hud-job').title=JOBS[player.job]?.passive||'';$('#hud-job').textContent=jobName(player)+(player.uniformEquipped?' · 군복 +20%':'');$('#xp-text').textContent=`${player.xp} / ${xpNeeded(player.level)}`;$('#hud-level').textContent=`Lv.${player.level}`;refreshHealthHUD();$('#mp-text').textContent=`${Math.floor(player.mp)} / ${maxMp(player)}`;$('#mp-bar').style.width=`${player.mp/maxMp(player)*100}%`;$('#xp-bar').style.width=`${player.xp/xpNeeded(player.level)*100}%`;$('#xp-bar').parentElement.title=`경험치 ${player.xp} / ${xpNeeded(player.level)}`;$('#hud-money').textContent=player.money.toLocaleString();refreshItemSlots();refreshBossHUD();$('#hud-saved').textContent=storageBroken?'저장 실패 · 브라우저 설정 확인':lastSavedLabel||'자동 저장 중';skillsFor(player).forEach(s=>{const b=$(`[data-skill="${s.key}"]`),locked=!skillUnlocked(player,s);
 b.title=locked?`잠금 · Lv.${s.level} 해금${s.requiresJob?' · 전직 필요':''}`:`${s.name} · Lv.${s.level}${s.requiresJob?' · 전직 필요':''} · ${s.description}`;
 b.setAttribute('aria-label',locked?`${s.key.toUpperCase()} 키, 잠금, 레벨 ${s.level}에 해금${s.requiresJob?', 전직 필요':''}`:`${s.name}, ${s.key.toUpperCase()} 키, 레벨 ${s.level}${s.requiresJob?' 전직 후':''}, MP ${s.mp}`);
 b.setAttribute('aria-disabled',String(locked));b.classList.toggle('locked',locked);b.classList.toggle('cooldown',!locked&&cooldowns[s.key]>0);
 const symbol=b.querySelector('.skill-symbol'),cue=player.classId==='otter'&&s.key==='w'&&otterWave&&!otterWave.riding&&otterWave.elapsed<=otterWave.skill.rideWindow?'↗':cooldowns[s.key]>0?String(Math.ceil(cooldowns[s.key])):'';
 if(player.classId==='otter'&&!locked){
  if(symbol.dataset.art!==s.key){symbol.innerHTML=skillSymbolMarkup(s.key,s.icon);symbol.dataset.art=s.key;}
  const overlay=symbol.querySelector('.skill-cue');overlay.textContent=cue;overlay.hidden=!cue;
 }else{symbol.textContent=locked?'🔒':cue||s.icon;delete symbol.dataset.art;}
 b.querySelector('.lock-level').textContent=locked?`Lv.${s.level}`:`${s.mp}`;
 });const powered=isPowered(player);$('.game-shell').classList.toggle('powered',powered);$('.game-shell').classList.toggle('sword-cinematic',!!swordUlt||cameraZoom<.99);$('#power-banner').hidden=!powered||!!recovery;$('#power-clock').textContent=`${Math.ceil(player.powerTime)}초`;$('#power-bar').style.width=`${player.powerTime/POWER_DURATION*100}%`;const avatar=$('.avatar'),avatarSrc=characterPortrait(player,powered);avatar.style.objectPosition=player.classId==='cat'?'center':powered?'9% center':'center';if(avatar.getAttribute('src')!==avatarSrc)avatar.setAttribute('src',avatarSrc);document.querySelectorAll('[data-skill]').forEach(b=>b.classList.toggle('empowered',powered&&['a','q','w','e'].includes(b.dataset.skill)));refreshCombatHUD();const hint=$('#context-hint');hint.classList.toggle('small-npc-hint',interactionTarget?.id==='shop');if(interactionTarget){hint.hidden=false;hint.innerHTML=`<kbd>F</kbd> ${interactionTarget.id?escapeHtml(interactionTarget.name)+'에게 말 걸기':escapeHtml(interactionTarget.label)+' 이동'}`;}else{hint.hidden=true;}}
function help(){showModal('help','모험 안내',`<div class="help-grid"><span><kbd>← ↑ ↓ →</kbd></span><span>거리의 네 방향으로 이동</span><span><kbd>SPACE</kbd></span><span>점프 · 이동하면서 대각선 점프</span><span><kbd>A</kbd></span><span>기본 공격 · 누르고 있으면 연속 공격</span><span><kbd>Q W E R</kbd></span><span>Q Lv. 3 · W Lv. 6 · E 전직 Lv. 10 · R Lv. 15</span><span><kbd>M</kbd></span><span>지도 · 현재 지역과 포탈 연결 보기</span><span><kbd>F</kbd></span><span>가까운 NPC와 대화 / 포탈 이용</span><span><kbd>1 2 3</kbd></span><span>등록한 아이템 사용 · I에서 등록 변경</span><span><kbd>I</kbd> <kbd>ESC</kbd></span><span>인벤토리 / 메뉴 · 열면 일시정지</span></div><p class="help-note">펭귄은 Lv. 10부터 피치플레이헬스&amp;필라테스 역삼점에서 바디빌더, 강남성균검도관에서 검사로 전직해요. 고양이는 역삼역 1번 출구에서 올림픽공원으로 이동해 빨간 두건을 두르고 화염병을 든 여우 레드폭스에게 시위대로 전직할 수 있어요. 피치플레이는 1번 출구에서 바로 갈 수 있어요. 검도관은 1번 출구 → 역삼역사거리 → 6번 출구를 거쳐 이동해요. 수달은 메이플아지트에서 휴프로에게 아이돌로 전직합니다. 수달 W는 발사 후 0.6초 안에 다시 누르면 파도를 탑니다(무적 아님). 아이돌 E는 보호막과 물방울 3개, R은 5초 콘서트입니다. R은 Lv. 15에 배웁니다. 바디빌더는 12초간 근육 각성, 검사는 최대 5명을 조준해 연속 베기를 발동해요. 시위대는 E를 최대 1초간 눌러 화염병 사거리를 늘리고, R로 투표함을 5초간 설치해요.</p><p>쓰러진 로봇의 돈과 아이템은 가까이 가면 줍습니다. MP는 자연 회복되고, 마을에서는 HP도 회복돼요. 사망하면 아무것도 잃지 않고 마을에서 부활합니다.</p><p>진행 상황은 현재 브라우저에 저장됩니다. 브라우저 데이터를 지우거나 다른 기기를 쓰면 이어지지 않습니다.</p>`);}
function refreshBossHUD(){
 const hud=$('#boss-hud');if(!hud)return;hud.hidden=!bossActive();$('.game-shell').classList.toggle('boss-fight',bossActive());
 const warning=$('#type-a-warning');warning.hidden=!bossActive()||!isTypeA(boss)||!['safety','enrage'].includes(boss.phase);if(!warning.hidden)warning.textContent=boss.phase==='safety'?`안전지대를 찾으세요! ${Math.max(0,TYPE_A.safety.duration-boss.elapsed).toFixed(1)}초 · 파란 영역 / 무적기로 회피`:'A형 광폭화 · 회전 칼날과 자기장 주의';
 if(!bossActive())return;
 $('#boss-name').textContent=`Lv.${bossInfo().level} ${bossInfo().name}${boss.enraged?' · 광폭화':''}`;
 $('#boss-hp-text').textContent=`${Math.ceil(boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()}`;
 $('#boss-hp-fill').style.width=`${boss.hp/boss.maxHp*100}%`;$('#boss-cue').textContent=isTypeA(boss)?typeACue(boss):soldierCue(boss);hud.classList.toggle('counter-active',boss.phase==='counter');
 $('#boss-potion-clock').textContent=`HP 회복 ${potionCooldown>0?potionCooldown.toFixed(1)+'초':'준비'} · MP 음료 ${player.mpPotionCooldown>0?player.mpPotionCooldown.toFixed(1)+'초':'준비'} · 각각 10초 대기`;
}
function itemCooldown(id){return id==='mpPotions'?(MAPS[player.map].boss?player.mpPotionCooldown||0:0):ITEMS[id]?.hpRestore&&bossActive()?potionCooldown:0;}
function itemIconMarkup(id){const item=ITEMS[id];return item?.image?`<img class="item-art" src="${item.image}" alt="" aria-hidden="true" draggable="false">`:item?.icon??'＋';}
function refreshItemSlots(){
 document.querySelectorAll('[data-item-slot]').forEach(b=>{
  const index=Number(b.dataset.itemSlot),id=player.quickSlots[index],item=ITEMS[id],wait=itemCooldown(id),waiting=wait>0;
  b.classList.toggle('illustrated-item',!!item?.image);b.innerHTML=`<span class="skill-symbol">${itemIconMarkup(id)}${waiting?`<span class="item-cooldown">${Math.ceil(wait)}</span>`:''}</span><b>${index+1}</b><span class="lock-level">${item?player[id]:''}</span>`;
  b.title=item?`${item.name} · ${index+1} · 보유 ${player[id]}개`:`${index+1}번 빈 슬롯 · I에서 등록`;
  if(waiting)b.title+=` · 재사용 ${Math.ceil(wait)}초`;b.setAttribute('aria-label',b.title);b.classList.toggle('cooldown',waiting);b.classList.toggle('empty',!item||player[id]===0);
 });
}
function inventory(selected=inventorySelection,focusSelector=null){
 if(scene!=='playing'||!player)return;
 inventorySelection=Object.hasOwn(ITEMS,selected)?selected:'potions';const item=ITEMS[inventorySelection];
 showModal('inventory','인벤토리',`<div class="bag-summary"><span>${jobName(player)} · 장비 <strong>${equipmentName(player)}</strong>${player.uniformEquipped?' · 군복 착용 (+20%)':''}${hasTypeATitle(player)?' · A형 칭호 (공격력 +5%)':''}</span><span>${player.money.toLocaleString()}원</span></div>${JOBS[player.job]?`<p>직업 특성 · ${JOBS[player.job].passive}</p>`:''}<div class="bag-items">${Object.entries(ITEMS).map(([id,item])=>`<button class="bag-item ${id===inventorySelection?'selected':''}" data-bag-item="${id}" aria-pressed="${id===inventorySelection}"><span class="item-icon">${itemIconMarkup(id)}</span><strong>${item.name}</strong><small>${player[id]}개 · ${item.equippable?(itemEquipped(player,id)?'장착 중':item.equipmentType||'방어구'):item.usable?'소모품':'수집 재료'}</small></button>`).join('')}</div><div class="item-detail"><span class="item-detail-art">${itemIconMarkup(inventorySelection)}</span><div><strong>${item.name}</strong><p>${item.description}</p>${itemCooldown(inventorySelection)>0?`<p>재사용 ${Math.ceil(itemCooldown(inventorySelection))}초 · 가방을 닫으면 시간이 흘러요.</p>`:''}</div><button class="secondary" id="bag-use" ${(!item.usable&&!item.equippable)||player[inventorySelection]===0?'disabled':''}>${item.equippable?(itemEquipped(player,inventorySelection)?'해제하기':'장착하기'):'사용하기'}</button></div><h3 class="bag-slots-title">아이템 단축키</h3><p class="bag-instruction">아이템을 고른 뒤 아래 슬롯이나 숫자키를 누르면 등록돼요.</p><div class="bag-slots">${player.quickSlots.map((id,i)=>`<div><button class="slot-assign" data-assign-slot="${i}" aria-label="${i+1}번에 ${item.name} 등록" ${!item.usable||player[inventorySelection]===0?'disabled':''}><kbd>${i+1}</kbd>${id?`<span class="slot-item-art">${itemIconMarkup(id)}</span>`:''}<span>${ITEMS[id]?.name??'빈 슬롯'}</span></button><button class="slot-clear" data-clear-slot="${i}" aria-label="${i+1}번 슬롯 비우기" ${id?'':'disabled'}>비우기</button></div>`).join('')}</div><p class="bag-footnote">등록은 저장됩니다. 가방을 닫고 1 · 2 · 3으로 사용하세요. 닫기 I / Esc</p>`,focusSelector||`[data-bag-item="${inventorySelection}"]`);
 $('.modal').classList.add('inventory-modal');
 document.querySelectorAll('[data-bag-item]').forEach(b=>b.onclick=()=>{inventory(b.dataset.bagItem);});
 document.querySelectorAll('[data-assign-slot]').forEach(b=>b.onclick=()=>registerInventorySlot(Number(b.dataset.assignSlot)));
 document.querySelectorAll('[data-clear-slot]').forEach(b=>b.onclick=()=>registerInventorySlot(Number(b.dataset.clearSlot),null));
 $('#bag-use').onclick=()=>{if(item.equippable){const result=inventorySelection==='typeATitle'?equipTypeATitle(player):equipUniform(player);toast(result.message);if(result.ok){save();inventory(inventorySelection,'#bag-use');refreshHUD();}}else useInventoryItem(inventorySelection,true);};
}
function registerInventorySlot(index,id=inventorySelection){
 if(modal!=='inventory')return;const result=assignQuickSlot(player,index,id);
 if(result.ok){save();inventory(inventorySelection,`[data-assign-slot="${index}"]`);refreshHUD();}toast(result.message);
}
function useQuickSlot(index){
 if(scene!=='playing'||modal)return;
 const id=player.quickSlots[index];if(!id){toast(`${index+1}번 슬롯이 비어 있어요. I를 눌러 아이템을 등록하세요.`);return;}
 useInventoryItem(id);
}
function useInventoryItem(id,fromInventory=false){
 if(scene!=='playing'||(modal&&!(fromInventory&&modal==='inventory')))return;
 if(ITEMS[id]?.hpRestore&&bossActive()&&potionCooldown>0){toast(`HP 회복 아이템은 ${Math.ceil(potionCooldown)}초 뒤에 사용할 수 있어요.`);return;}
 const isMp=id==='mpPotions',before=isMp?player.mp:player.hp,result=useItem(player,id);toast(result.message);
 if(result.ok){
  if(ITEMS[id]?.hpRestore&&bossActive())potionCooldown=SOLDIER.potionCooldown;
  if(result.recalled){closeModal();resetWorld();buildHUD();effects.push({type:'ring',x:player.x,y:player.y-25,life:.8,max:.8,color:'#b6e6ff',size:120});canvas.focus();}
  else textAt(`+${Math.round((isMp?player.mp:player.hp)-before)} ${isMp?'MP':'HP'}`,player.x,player.y-105,isMp?'#a8dfff':'#a1eebd');
  beep(700,.18);save();
 }
 if(modal==='inventory'&&fromInventory)inventory(inventorySelection,'#bag-use');refreshHUD();
}
function menu(){if(!player)return;showModal('menu','잠깐 쉬어 가기',`<p>${escapeHtml(player.name)} · Lv. ${player.level} · ${jobName(player)}<br>${MAPS[player.map].name}</p><button class="primary" id="resume">모험 계속하기</button>${bossActive()?'<button class="secondary menu-wide" id="abandon-boss">도전 포기 · 방 입구로</button>':''}<button class="secondary menu-wide" id="manual-save">현재 위치 저장하기</button><button class="secondary menu-wide" id="menu-map">지도 보기 · M</button><button class="secondary menu-wide" id="view-skills">스킬 보기</button><button class="secondary menu-wide" id="menu-help">조작법 보기</button><button class="secondary menu-wide" id="sound-toggle">효과음 ${soundOn?'끄기':'켜기'}</button><button class="text-button menu-wide" id="exit-game">저장하고 캐릭터 선택으로</button>`);$('#resume').onclick=closeModal;if(bossActive())$('#abandon-boss').onclick=abandonBoss;$('#manual-save').onclick=()=>save(false);$('#exit-game').onclick=selectCharacters;$('#sound-toggle').onclick=()=>{soundOn=!soundOn;beep(650);menu();};$('#menu-map').onclick=worldMap;$('#view-skills').onclick=skillBook;$('#menu-help').onclick=help;}
function skillBook(){showModal('skills',`${jobName(player)}의 스킬`,`${skillsFor(player).map(s=>`<div class="skill-description"><kbd>${s.key.toUpperCase()}</kbd><div><strong>${s.name}</strong><small>Lv. ${s.level}${s.requiresJob?' · 전직 후':''} · MP ${s.mp} · 재사용 ${s.cooldown}초</small><p>${s.description}</p>${s.enhanced?`<p class="enhanced-copy">바디빌더 각성 중: ${s.enhanced}</p>`:''}</div><span>${skillUnlocked(player,s)?'습득':'잠김'}</span></div>`).join('')}<p>Lv. 10에 펭귄은 헬스장·검도장, 고양이는 올림픽공원, 토끼는 마구리, 병아리와 수달은 메이플아지트의 휴프로에게 전직해 E를 배웁니다. 전직 후 Lv. 15에 R을 배워요. 누르고 쓰는 스킬은 메뉴·지도·맵 이동 시 취소됩니다.</p>`);}
function jobModal(job){
 const target=JOBS[job];if(!target)return;
 const current=player.job,ready=!current&&player.level>=10&&player.classId===(target.classId||'wanderer');
 showModal('job',`${['hacker','idol'].includes(job)?'휴프로 · ':job==='mage'?'마구리 · ':job==='protester'?'레드폭스 · ':''}${target.name} 전직`, `<p>${job==='idol'?'물을 다루는 재능과 무대에서 빛나는 매력을 함께 키워 봅시다.':job==='hacker'?'코드를 읽으면 적의 빈틈이 보여요. 메이플아지트에서 시작해 봅시다.':job==='mage'?'마법은 서로를 지키는 힘이기도 해요.':job==='protester'?'작은 목소리도 함께 모이면 멀리 퍼져요.':target.name==='바디빌더'?'꾸준한 훈련으로 강인한 몸을 만들어 보세요.':'마음을 가라앉히고 한 번의 베기에 집중하세요.'}</p><div class="job-choice"><strong>직업 특성 · ${target.passive}</strong><p>전직 후 항상 적용됩니다.</p><strong>Lv. 10 · E ${target.e}</strong><p>${job==='idol'?'5초 보호막과 서로 독립적인 물방울 3개를 얻어요. 물방울은 적에게 닿으면 피해를 주고 하나씩 사라집니다.':job==='hacker'?'최대 1.5초 차징해 사각 범위에 강력한 피해와 2초 경직을 줍니다.':job==='mage'?'3초간 피해를 흡수하는 보호막과 주변 마력 방출.':job==='protester'?'최대 1초 차징해 화염병을 던집니다. 폭발 후 바닥에 불길이 남아요.':job==='bodybuilder'?'HP 40%를 1.5초간 회복하고 받는 피해를 50% 줄입니다.':'1초 동안 칼로 공격을 막습니다.'}</p><strong>Lv. 15 · R ${target.r}</strong><p>${job==='idol'?'스포트라이트 아래에서 5초간 춤을 춥니다. 화면 안 적들에게 지속 피해, 자신과 아군 공격·이동 +20%, 초당 HP 10% 회복, 받는 피해 50% 감소. 춤추면서 이동할 수 있고 다른 공격은 불가해요.':job==='hacker'?'좌우로 대상을 선택하고 Enter로 확정합니다. 노트북을 두드리며 5초간 경직과 지속 피해를 주고 받는 피해가 80% 감소합니다.':job==='mage'?'아군을 선택해 10초간 강화하고 주변 적의 공격력을 3초간 30% 낮춥니다.':job==='protester'?'체력 1500의 투표함을 5초간 설치합니다. 주변 적을 도발하고 투표지로 지속 피해를 주며 중심으로 끌어당깁니다.':job==='bodybuilder'?'12초간 거대해지며 기본 공격과 Q·W·E가 강화됩니다.':'R을 누르면 가까운 적부터 최대 5명을 조준해 연속으로 벱니다.'}</p></div><p>${current?`현재 직업은 ${jobName(player)}입니다. 전직은 캐릭터당 한 번입니다.`:ready?'한 번 선택한 직업은 변경할 수 없습니다. 다른 직업은 새 캐릭터로 시작할 수 있어요.':`현재 Lv. ${player.level}. Lv. 10이 되면 전직할 수 있어요.`}</p>${ready?`<button class="primary" id="advance-job">${target.name}로 전직하기</button>`:''}`);
 if(ready)$('#advance-job').onclick=()=>{const result=advanceJob(player,job);if(result.ok){cancelSword();resetCombat();save();closeModal();buildHUD();}toast(result.message);};
}

function interact(){if(scene!=='playing'||modal)return;interactionTarget=findInteraction();if(!interactionTarget){toast('NPC나 포탈에 조금 더 가까이 가보세요.');return;}const t=interactionTarget;if(t.id==='soldier'){bossTalk();return;}if(t.job){jobModal(t.id==='hyupro'&&player.classId==='otter'?'idol':t.job);return;}if(!t.id){if((MAPS[t.to].danger||MAPS[t.to].boss)&&player.level<MAPS[t.to].minLevel){showModal('portal','더 깊은 거리로',`<p>${MAPS[t.to].name}에는 Lv. ${MAPS[t.to].minLevel}–${MAPS[t.to].maxLevel} ${MAPS[t.to].boss?'중간보스가':'로봇이'} 있어요.<br>현재 Lv. ${player.level}입니다. 도전을 이어가시겠어요?</p><button class="primary" id="portal-confirm">${MAPS[t.to].name} 이동</button>`);$('#portal-confirm').onclick=()=>travel(t);}else travel(t);return;}if(t.id==='shop'&&player.classId==='rabbit'&&!player.job&&player.level>=10){jobModal('mage');return;}if(t.id==='gm'){showModal('gm','운영자 현토리',`<p>역삼역에 온 걸 환영해요, <strong>${escapeHtml(player.name)}</strong>!<br>이곳은 안전한 마을이에요. 처음엔 오른쪽의 회복 아이템 상인 마구리에게 들러 보세요.</p><p>오른쪽 끝의 테헤란 뒷골목 포탈에서 <strong>F</strong>를 누르면 첫 사냥터로 이동할 수 있어요. 로봇은 귀엽지만 부딪히면 아프니 조심하세요!</p><details class="npc-details"><summary>아이템 · 전직 · 성장 안내</summary><p>I키로 인벤토리를 열고 아이템을 1·2·3번에 등록할 수 있어요. 마구리에게 이동장치를 사 두면 멀리서도 마을로 돌아올 수 있죠. M키로 지도를 확인해 보세요. 피치플레이헬스&amp;필라테스 역삼점은 이곳 1번 출구에서 바로 갈 수 있어요. 강남성균검도관에 가려면 몬스터가 있는 역삼역사거리를 지나 6번 출구로 가세요. Q는 Lv. 3, W는 Lv. 6에 배워요. Lv. 10부터 펭귄은 헬스장·검도장, 고양이는 올림픽공원, 토끼는 마구리, 병아리와 수달은 메이플아지트의 휴프로에게 전직해 E를 배웁니다. 전직 후 Lv. 15에 R을 습득합니다! 쓰러져도 돈이나 아이템을 잃지 않으니 편하게 모험해 보세요.</p></details><button class="primary" id="gm-help">자세한 조작법 보기</button>`);$('#gm-help').onclick=help;}else shop();}
const shopItemSummary=id=>`${ITEMS[id]?.hpRestore?`HP +${ITEMS[id].hpRestore}`:id==='mpPotions'?'MP +100':'즉시 귀환'} · 보유 ${player[id]}개`;
function refreshShop(){
 // Keep the existing dialog nodes so buying preserves scroll, focus and expanded help.
 $('.shop-money').textContent=`${player.money.toLocaleString()}원`;
 for(const id of shopItemsFor(player)){
  $(`#shop-stock-${id}`).textContent=shopItemSummary(id);
  $(`#buy-${id}`).disabled=player.money<itemPrice(player,id);
 }
}
function shop(){
 showModal('shop','마구리의 보따리 상점',`<p class="shop-balance">소지금 <strong class="shop-money">${player.money.toLocaleString()}원</strong> · 한 번에 1개씩 구매</p>${shopItemsFor(player).map(id=>{const item=ITEMS[id],price=itemPrice(player,id);return `<div class="shop-item"><span class="bottle-icon">${itemIconMarkup(id)}</span><div><strong>${item.name}</strong><small id="shop-stock-${id}">${shopItemSummary(id)}</small></div><button class="secondary" id="buy-${id}" ${player.money<price?'disabled':''}>${price.toLocaleString()}원 · 구매</button></div>`;}).join('')}<details class="npc-details"><summary>이동장치 · 단축키 안내</summary><p><kbd>I</kbd> 인벤토리에서 사용하거나 1 · 2 · 3번에 등록하세요. 이동장치의 목적지에 이미 있다면 소모되지 않아요. 다른 지역에서도 목적지로 돌아올 수 있어요.</p></details>`);
 $('.modal').classList.add('shop-dialog');
 for(const id of shopItemsFor(player))$(`#buy-${id}`).onclick=()=>{const result=buyItem(player,id);if(result.ok){save();beep(800);refreshShop();}toast(result.message);refreshHUD();};
}
function findInteraction(){if(!player||bossActive())return null;const candidates=[...(boss?[{id:'soldier',name:bossInfo().name,x:boss.x,y:boss.y}]:[]),...mapNPCs(),...MAPS[player.map].portals];return candidates.filter(o=>Math.hypot(player.x-o.x,(player.y-o.y)*1.8)<145).sort((a,b)=>Math.hypot(player.x-a.x,player.y-a.y)-Math.hypot(player.x-b.x,player.y-b.y))[0]??null;}
const MAP_TABS=[['hunt','초반 사냥'],['advanced','고레벨 던전'],['town','마을 · 전직']];
function mapNode(id,index){
 const map=MAPS[id],current=id===player.map,visited=player.visited.includes(id);
 return `<li><button class="map-node ${current?'current':''}" data-map="${id}" style="--region-color:${map.color}" aria-pressed="false"><span class="node-marker">${index+1}</span><span class="node-copy"><strong>${escapeHtml(map.name)}</strong><small>${map.boss?`${map.bossName||'신원미상의 예비군'} · 대화로 도전`:map.danger?`${map.monster} · ${monsterCount(id)}마리`:id==='gym'?'바디빌더 전직 · Lv. 10':id==='dojo'?'검사 전직 · Lv. 10':'안전 구역'}</small></span><span class="node-state"><b>${map.danger||map.boss?`Lv. ${map.minLevel}–${map.maxLevel}`:'안전'}</b><small>${current?'● 현재 위치':visited?'✓ 탐험 완료':'미탐험'}</small></span></button></li>`;
}
let mapView='overview',mapSelection=null;
function atlasMarkup(){
 const edges=worldMapConnections();
 return `<div class="atlas-toolbar"><div><span class="atlas-location-dot" aria-hidden="true"></span>현재 위치 <strong>${escapeHtml(MAPS[player.map].name)}</strong></div><button id="atlas-locate">내 위치 찾기</button></div><div class="atlas-scroll" id="atlas-scroll" tabindex="0" aria-label="지역 연결 지도. 좁은 화면에서는 좌우로 스크롤하세요."><div class="atlas-board"><div class="atlas-background" aria-hidden="true"></div><svg class="atlas-roads" viewBox="0 0 1120 610" preserveAspectRatio="none" aria-hidden="true">${edges.map(edge=>{const a=WORLD_MAP_LAYOUT[edge.from],b=WORLD_MAP_LAYOUT[edge.to];return `<g><path class="atlas-road-border" d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/><path class="atlas-road" data-map-edge="${edge.key}" d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/></g>`;}).join('')}</svg>${Object.entries(WORLD_MAP_LAYOUT).map(([id,point])=>{
  const map=MAPS[id],current=id===player.map,visited=player.visited.includes(id),kind=map.boss?'boss':map.danger?'hunt':'safe';
  const level=map.boss?`보스 · Lv. ${map.bossLevel||25}`:map.danger?`Lv. ${map.minLevel}–${map.maxLevel}`:id==='gym'?'바디빌더 전직':id==='dojo'?'검사 전직':id==='olympic'?'시위대 전직':id==='maple'?'해커 전직':'안전 구역';
  return `<button class="atlas-node ${kind} ${current?'current':''} ${visited?'visited':''}" data-map="${id}" aria-pressed="false" ${current?'aria-current="location"':''} aria-label="${escapeHtml(map.name)} · ${level}${current?' · 현재 위치':''}" title="${escapeHtml(map.name)}" style="left:${point.x/1120*100}%;top:${point.y/610*100}%">${current?'<span class="atlas-here">현재 위치</span>':''}<span class="atlas-dot" aria-hidden="true">${map.boss?'⚔':''}</span><span class="atlas-label"><strong>${point.label}</strong><small>${level}</small></span></button>`;
 }).join('')}</div></div><div class="atlas-legend"><span><i class="safe"></i>안전 · 전직</span><span><i class="hunt"></i>사냥터</span><span><i class="boss"></i>보스</span><span><i class="road"></i>포탈 연결</span><small>지역을 누르면 가는 길이 표시돼요.</small></div><div id="atlas-selection" class="atlas-selection" aria-live="polite"></div>`;
}
function worldMap(){
 if(scene!=='playing'||!player)return;
 const recommended=recommendedMap(player.level);mapView='overview';mapSelection=player.map;
 showModal('world-map','역삼 월드맵',`<nav class="map-view-tabs" role="tablist" aria-label="지도 보기 방식"><button id="map-view-tab-overview" role="tab" data-map-view="overview" aria-selected="true" aria-controls="map-view-overview">전체 지도</button><button id="map-view-tab-details" role="tab" data-map-view="details" aria-selected="false" aria-controls="map-view-details" tabindex="-1">상세 안내</button></nav><section id="map-view-overview" role="tabpanel" aria-labelledby="map-view-tab-overview">${atlasMarkup()}</section><section id="map-view-details" role="tabpanel" aria-labelledby="map-view-tab-details" hidden><div class="map-summary"><span>현재 위치 <strong>${escapeHtml(MAPS[player.map].name)}</strong></span><span>${player.visited.length} / ${Object.keys(MAPS).length} 지역 탐험</span></div><button class="map-recommend" id="map-recommend"><span>Lv. ${player.level} 추천 사냥터</span><strong>${recommended.name}</strong><span>Lv. ${recommended.minLevel}–${recommended.maxLevel} <b>경로 보기 →</b></span></button><div class="map-layout"><div class="map-browser"><nav class="map-tabs" aria-label="지도 분류">${MAP_TABS.map(([id,label])=>`<button data-map-tab="${id}" aria-pressed="false" aria-controls="map-panel-${id}">${label}</button>`).join('')}</nav><div class="map-route-panels">${MAP_TABS.map(([id])=>`<div id="map-panel-${id}" data-map-panel="${id}" hidden>${MAP_ROUTES.filter(route=>route.tab===id).map(route=>`<section class="map-route"><div class="route-heading"><h3>${route.title}</h3><p>${route.hint}</p></div><ol class="route-list">${route.maps.map(mapNode).join('')}</ol></section>`).join('')}</div>`).join('')}</div></div><aside class="map-details" id="map-details" aria-label="선택 지역과 이동 경로" aria-live="polite"></aside></div><p class="map-footnote">선으로 이어진 지역은 왕복 포탈로 연결됩니다. 지역을 선택하면 길을 안내해요. 실제 이동은 포탈에서 <kbd>F</kbd> · 닫기 <kbd>M</kbd> / <kbd>Esc</kbd></p></section>`);
 $('.modal').classList.add('world-map-modal');
 document.querySelectorAll('[data-map-view]').forEach(button=>{
  button.onclick=()=>showMapView(button.dataset.mapView);
  button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'overview':e.key==='End'?'details':mapView==='overview'?'details':'overview';showMapView(next);$(`#map-view-tab-${next}`).focus();};
 });
 document.querySelectorAll('[data-map-tab]').forEach(button=>button.onclick=()=>showMapTab(button.dataset.mapTab));
 document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>selectMapDestination(button.dataset.map));
 $('#map-recommend').onclick=()=>selectMapDestination(recommended.id);
 $('#atlas-locate').onclick=()=>{selectMapDestination(player.map);centerAtlas();};
 showMapTab(mapTabFor(player.map));showMapDetails(player.map);showMapView('overview');
}
function centerAtlas(){
 const scroll=$('#atlas-scroll'),point=WORLD_MAP_LAYOUT[player.map],board=$('.atlas-board');
 if(scroll&&board)scroll.scrollTo?.({left:point.x/1120*board.clientWidth-scroll.clientWidth/2,top:0,behavior:'smooth'});
}
function showMapView(view){
 if(!['overview','details'].includes(view))return;
 mapView=view;$('.world-map-modal').classList.toggle('atlas-mode',view==='overview');
 for(const id of ['overview','details']){const active=id===view;const button=$(`#map-view-tab-${id}`);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$(`#map-view-${id}`).hidden=!active;}
 if(view==='overview')requestAnimationFrame(centerAtlas);
 else{showMapTab(mapTabFor(mapSelection));showMapDetails(mapSelection);}
}
function updateAtlasSelection(id){
 const map=MAPS[id],current=id===player.map,route=findMapRoute(player.map,id);
 const routeEdges=new Set(route.slice(1).map((to,i)=>[route[i],to].sort().join(':')));
 document.querySelectorAll('[data-map-edge]').forEach(path=>{path.classList.toggle('on-route',routeEdges.has(path.dataset.mapEdge));path.classList.toggle('nearby',current&&path.dataset.mapEdge.split(':').includes(player.map));});
 const next=route.length>1?MAPS[player.map].portals.find(p=>p.to===route[1]):null;
 const portalNumber=next?[...MAPS[player.map].portals].sort((a,b)=>a.x-b.x).indexOf(next)+1:0;
 const direction=next?(Math.abs(next.x-player.x)<100?'가까운':next.x<player.x?'왼쪽':'오른쪽'):'';
 $('#atlas-selection').innerHTML=`<div class="atlas-destination"><span>${current?'지금 있는 곳':'선택한 목적지'}</span><strong>${escapeHtml(map.name)}</strong><button id="atlas-open-details">상세 정보 · 포탈 안내</button></div><div class="atlas-navigation">${current?'<strong>바로 연결된 지역</strong>':`<strong>포탈 ${route.length-1}번 · ${direction}의 ${escapeHtml(MAPS[next.to].name)}부터</strong><p>왼쪽부터 ${portalNumber}번째 포탈에서 <kbd>F</kbd></p>`}<div class="atlas-neighbors">${current?'':'<span>연결 지역</span>'}${map.portals.map(portal=>`<button data-atlas-link="${portal.to}">${escapeHtml(WORLD_MAP_LAYOUT[portal.to].label)}</button>`).join('')}</div></div>`;
 document.querySelectorAll('[data-atlas-link]').forEach(button=>button.onclick=()=>selectMapDestination(button.dataset.atlasLink));
 $('#atlas-open-details').onclick=()=>{showMapView('details');$('#map-view-tab-details').focus();};
}
function showMapTab(id){
 if(!MAP_TABS.some(([key])=>key===id))return;
 document.querySelectorAll('[data-map-tab]').forEach(button=>{const active=button.dataset.mapTab===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 document.querySelectorAll('[data-map-panel]').forEach(panel=>{panel.hidden=panel.dataset.mapPanel!==id;});
}
function selectMapDestination(id){if(!MAPS[id])return;showMapTab(mapTabFor(id));showMapDetails(id,mapView==='details');}
function showMapDetails(id,focusDetails=false){
 const map=MAPS[id];if(!map)return;mapSelection=id;updateAtlasSelection(id);
 const route=findMapRoute(player.map,id),current=id===player.map,next=route.length>1?MAPS[player.map].portals.find(p=>p.to===route[1]):null;
 const portalNumber=next?[...MAPS[player.map].portals].sort((a,b)=>a.x-b.x).indexOf(next)+1:0;
 const direction=next?(Math.abs(next.x-player.x)<100?'가까운 곳':next.x<player.x?'왼쪽으로 이동':'오른쪽으로 이동'):'';
 document.querySelectorAll('[data-map]').forEach(button=>{const selected=button.dataset.map===id;button.classList.toggle('selected',selected);button.classList.toggle('on-route',!current&&route.includes(button.dataset.map));button.setAttribute('aria-pressed',String(selected));});
 const background=map.background|| (Number.isInteger(map.backgroundTile)?'districts':'city'),tile=map.backgroundTile;
 const artStyle=`background-image:url('assets/${background}.png');${Number.isInteger(tile)?`background-size:200% 200%;background-position:${tile%2?'100%':'0'} ${tile>1?'100%':'0'};`:''}`;
 $('#map-details').innerHTML=`<button class="map-list-back" id="map-list-back">↑ 지역 목록으로</button><div class="map-art" style="${artStyle}" aria-hidden="true"></div><div class="map-detail-body"><span class="map-detail-tag">${current?'● 현재 위치':player.visited.includes(id)?'✓ 탐험 완료':'◇ 미탐험'} · ${map.danger||map.boss?`Lv. ${map.minLevel}–${map.maxLevel}`:'안전 구역'}</span><h3>${escapeHtml(map.name)}</h3><p>${map.description}</p>${map.boss?(id==='hangar'?'<div class="map-monster-info">보스 <strong>Lv.35 A형</strong><span>EXP ${xpReward(player,TYPE_A.xp).toLocaleString()} · 6,000원 · 에너지 코어 15개</span></div>':'<div class="map-monster-info">중간보스 <strong>Lv.25 신원미상의 예비군</strong><span>EXP 3,500 · 군복 · 회복 아이템 대기 10초</span></div>'):''}${map.danger?`<div class="map-monster-info">${map.monster} <strong>${monsterCount(id)}마리</strong>${player.level<map.minLevel?'<span>현재 레벨보다 강한 적이 있어요.</span>':''}</div>`:''}<div class="map-navigation"><h4>${current?'지금 이동할 수 있는 곳':`현재 위치에서 포탈 ${route.length-1}번`}</h4>${next?`<div class="map-next"><small>다음 포탈 · ${direction}</small><strong>${escapeHtml(MAPS[next.to].name)}</strong><span>왼쪽부터 ${portalNumber}번째 포탈에서 <kbd>F</kbd></span></div><ol class="map-breadcrumb" aria-label="현재 위치부터 목적지까지">${route.map((step,i)=>`<li>${i?'<span aria-hidden="true">→</span>':''}<button data-map-link="${step}" ${i===route.length-1?'aria-current="location"':''}>${escapeHtml(MAPS[step].name)}</button></li>`).join('')}</ol>`:''}${!current?`<details class="map-adjacent"><summary>이 지역의 연결 포탈 · ${map.portals.length}곳</summary>`:''}<div class="map-connections">${[...map.portals].sort((a,b)=>a.x-b.x).map((portal,i)=>`<button data-map-link="${portal.to}"><span>${i+1}</span>${escapeHtml(portal.label)}<b>↔</b></button>`).join('')}</div>${!current?'</details>':''}</div></div>`;
 document.querySelectorAll('[data-map-link]').forEach(button=>button.onclick=()=>selectMapDestination(button.dataset.mapLink));
 $('#map-list-back').onclick=()=>$('.map-tabs').scrollIntoView?.({block:'start',behavior:'smooth'});
 if(focusDetails&&window.matchMedia?.('(max-width:650px)').matches)$('#map-details').scrollIntoView?.({block:'start',behavior:'smooth'});
}
function cancelSword(immediate=true){
 const hadView=!!swordUlt||cameraZoom!==1;swordUlt=null;if(combatMotion?.ultimate)combatMotion=null;
 if(immediate&&hadView){cameraZoom=1;shake=0;viewShakeX=0;viewShakeY=0;if(player)camera=clamp(player.x-screenWidth*.45,0,Math.max(0,MAPS[player.map].width-screenWidth));}
}
function updateCamera(dt){
 const oldCenter=camera+viewWidth()/2;
 // Map-wide targeting is independent of the finite camera baseline; widen for marked enemies.
 const safety=isTypeA(boss)&&bossActive()&&boss.phase==='safety';
 let targetZoom=safety?Math.min(.8,screenWidth/(TYPE_A.width+80)):1;
 const hackSelecting=hackerUlt?.phase==='selecting';
 if(hackSelecting)targetZoom=Math.min(.65,screenWidth/(MAPS[player.map].width+120));
 if(swordUlt&&!safety){
  const u=swordUlt,marked=monsters.filter(m=>!m.dead&&u.targets.includes(m.id));
  u.viewRadius=Math.max(u.viewRadius,Math.abs(player.x-u.focusX)+(u.phase==='charging'?u.skill.cameraRange:0),...marked.map(m=>Math.abs(m.x-u.focusX)));
  targetZoom=Math.min(.58,Math.max(1,screenWidth-152)/(2*(u.viewRadius+35)));
 }
 cameraZoom+=(targetZoom-cameraZoom)*(1-Math.exp(-dt*(swordUlt?13:7)));
 if(Math.abs(cameraZoom-targetZoom)<.001)cameraZoom=targetZoom;
 const width=viewWidth(),maxLeft=Math.max(0,MAPS[player.map].width-width);
 // Let the cinematic frame extend past map edges so distant edge reticles remain visible.
 const desiredLeft=hackSelecting?MAPS[player.map].width/2-width/2:safety?TYPE_A.width/2-width/2:swordUlt?swordUlt.focusX-width/2:clamp(player.x-width*.45,0,maxLeft);
 const center=oldCenter+(desiredLeft+width/2-oldCenter)*(1-Math.exp(-dt*10));
 camera=safety||swordUlt||hackSelecting||cameraZoom!==1?center-width/2:clamp(center-width/2,0,maxLeft);
}

function swordCandidates(seen=new Set()){
 // resetWorld keeps this list scoped to the current map, including an active boss duel.
 return monsters.filter(m=>canTarget(m)&&!seen.has(m.id))
  .sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
}
function startSwordCharge(input='keyboard'){
 if(scene!=='playing'||modal||swordUlt||guardTime>0||player.job!=='swordsman')return false;
 const check=canUseSkill(player,'r',cooldowns.r);if(!check.ok){toast(check.message);return false;}
 if(!swordCandidates().length){toast('현재 맵에 조준할 적이 없어요.');return false;}
 player.mp-=check.skill.mp;cooldowns.r=check.skill.cooldown;walking=false;resetJump();combatMotion=null;
 swordUlt={phase:'charging',input,elapsed:0,nextMark:0,targets:[],seen:new Set(),skill:check.skill,map:player.map,focusX:player.x,viewRadius:check.skill.cameraRange};
 shake=Math.max(shake,10);
 updateSword(0);refreshHUD();save();return true;
}
function releaseSword(input){
 if(swordUlt?.phase!=='charging'||swordUlt.input!==input)return;
 // Freeze at release, including an already-marked airborne boss. Later deaths cannot raise damage.
 const count=monsters.filter(m=>!m.dead&&swordUlt.targets.includes(m.id)).length;
 swordUlt.damageMultiplier=count===1?swordUlt.skill.singleTargetMultiplier:1;
 swordUlt.phase='striking';swordUlt.index=0;swordUlt.nextStrike=0;resetJump();shake=Math.max(shake,20);refreshHUD();
}
function updateSword(dt){
 const u=swordUlt;if(!u)return;if(player.map!==u.map){cancelSword();return;}
 if(u.phase==='charging'){
  u.elapsed=Math.min(u.skill.charge,u.elapsed+dt);
  while(u.nextMark<=u.elapsed+1e-8&&u.nextMark<u.skill.charge){
   if(u.targets.length<u.skill.maxTargets){const target=swordCandidates(u.seen)[0];if(target){u.targets.push(target.id);u.seen.add(target.id);beep(600+u.targets.length*80,.06);}}
   u.nextMark+=u.skill.charge/u.skill.maxTargets;
  }
  if(u.elapsed>=u.skill.charge-1e-8)releaseSword(u.input);
 }else{
  u.nextStrike-=dt;
  while(swordUlt===u&&u.nextStrike<=0){
   if(u.index>=u.targets.length){cancelSword(false);save();break;}
   const id=u.targets[u.index++],m=monsters.find(m=>m.id===id&&!m.dead);if(!m)continue;
   if(m.isBoss&&m.phase==='leap'){u.index--;u.nextStrike=.08;break;}
   const fromX=player.x,fromY=player.y;facing=m.x>=player.x?1:-1;
   player.x=clamp(m.x-facing*38,45,MAPS[player.map].width-45);player.y=clamp(m.y,580,720);playCombatMotion('slash',.2,{ultimate:true});
   const solo=u.damageMultiplier>1;
   effects.push({type:'swordBlink',x:fromX,y:fromY-50,toX:player.x,toY:player.y-50,life:.36,max:.36,...FX_PALETTES.electric,solo},{type:'slash',x:m.x,y:m.y-45,dir:facing,life:.28,max:.28,color:'#ffe45c',size:solo?235:195});
   if(solo)textAt('단일 대상 · 피해 2배',m.x,m.y-155,'#ffe45c');
   lightningAt(m.x,m.y-48,solo?210:165);hitMonster(m,Math.round(attackPower(player)*u.skill.damage*u.damageMultiplier));if(scene!=='playing')return;shake=Math.max(shake,solo?16:12);beep(950,.07,'triangle');u.nextStrike+=.16;
  }
 }
}
function bindSkillButton(b){
 if(b.dataset.skill==='e'){
  b.addEventListener('pointerdown',e=>{if(player?.job==='hacker'){e.preventDefault();if(startChickCharge(`pointer:${e.pointerId}`))b.setPointerCapture(e.pointerId);return;}if(player?.job!=='protester')return;e.preventDefault();if(startCatCharge(`pointer:${e.pointerId}`))b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointerup',e=>{if(player?.job==='hacker')releaseChickCharge(`pointer:${e.pointerId}`);if(player?.job==='protester')releaseCatCharge(`pointer:${e.pointerId}`);});
  for(const type of ['pointercancel','lostpointercapture'])b.addEventListener(type,e=>{if(chickCharge?.input===`pointer:${e.pointerId}`)chickCharge=null;if(catCharge?.input===`pointer:${e.pointerId}`)cancelCatCharge();});
 }
 if(b.dataset.skill==='r'){
  b.addEventListener('pointerdown',e=>{if(player.job!=='swordsman')return;e.preventDefault();if(startSwordCharge(`pointer:${e.pointerId}`))b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointerup',e=>{if(player.job==='swordsman')releaseSword(`pointer:${e.pointerId}`);});
  for(const type of ['pointercancel','lostpointercapture'])b.addEventListener(type,e=>{if(swordUlt?.phase==='charging'&&swordUlt.input===`pointer:${e.pointerId}`){cancelSword();refreshHUD();}});
 }
 b.onclick=e=>{if(b.dataset.skill==='e'&&player.job==='hacker'){if(e.detail===0&&startChickCharge('assist'))releaseChickCharge('assist');canvas.focus();return;}if(b.dataset.skill==='r'&&player.job==='swordsman'){if(e.detail===0)startSwordCharge('assist');return;}if(b.dataset.skill==='e'&&player.job==='protester'){if(e.detail===0&&startCatCharge('assist'))releaseCatCharge('assist');canvas.focus();return;}if(b.dataset.skill==='a')attack();else if(b.dataset.skill==='potion')drinkPotion();else cast(b.dataset.skill);canvas.focus();};
}
function refreshCombatHUD(){
 const controls=$('#hack-controls');controls.hidden=hackerUlt?.phase!=='selecting';$('#hack-prev').onclick=()=>cycleHack(-1);$('#hack-next').onclick=()=>cycleHack(1);$('#hack-confirm').onclick=confirmHack;$('#hack-cancel').onclick=cancelChickAim;
 const banner=$('#combat-banner');banner.classList.toggle('otter-status',player?.classId==='otter');banner.hidden=!hackerUlt&&!chickCharge&&chickStealth<=0&&!swordUlt&&guardTime<=0&&!recovery&&!catCharge&&!rabbitShield&&!otterShield&&!otterBubbles&&!otterConcert&&!otterWave&&!(player?.respectTime>0);
 if(player?.respectTime>0||rabbitShield){$('#combat-title').textContent=player.respectTime>0?'존경! · 아군 강화':'마력 방벽';$('#combat-clock').textContent=`${Math.ceil(player.respectTime||rabbitShield?.remaining||0)}초`;$('#combat-detail').textContent=player.respectTime>0?'이동·공격·최대 HP +20% / 피해 20% 감소':`남은 보호막 ${Math.ceil(rabbitShield.hp)}`;$('#combat-bar').style.width=`${(player.respectTime?player.respectTime/10:rabbitShield.remaining/3)*100}%`;}
 if(swordUlt){const charging=swordUlt.phase==='charging',alive=monsters.filter(m=>!m.dead&&swordUlt.targets.includes(m.id)).length,solo=charging?alive===1:swordUlt.damageMultiplier>1;$('#combat-title').textContent=charging?'섬광 연참 · 기 모으기':'섬광 연참';$('#combat-clock').textContent=charging?`${swordUlt.elapsed.toFixed(1)} / 3초`:'연속 베기';$('#combat-detail').textContent=charging?`${alive} / 5명 조준${solo?' · 단일 대상 2배':''} · 받는 피해 80% 감소 · 손을 떼면 발동`:`연속 베기${solo?' · 단일 대상 2배':''} · 받는 피해 80% 감소`;$('#combat-bar').style.width=`${swordUlt.elapsed/3*100}%`;}
 else if(guardTime>0){$('#combat-title').textContent='막기';$('#combat-clock').textContent=`${guardTime.toFixed(1)}초`;$('#combat-detail').textContent='공격 차단 · 공격/스킬 사용 불가';$('#combat-bar').style.width=`${guardTime*100}%`;}
 else if(recovery){$('#combat-title').textContent=isPowered(player)?'근육 각성 · 한 번 더!':'한 번 더!';$('#combat-clock').textContent=`${recovery.remaining.toFixed(1)}초`;$('#combat-detail').textContent='HP 회복 · 피해 50% 감소 · 이동 60% · 공격 불가';$('#combat-bar').style.width=`${recovery.remaining/recovery.duration*100}%`;}
 else if(catCharge){$('#combat-title').textContent='화염병 · 사거리 충전';$('#combat-clock').textContent=`${catCharge.elapsed.toFixed(1)} / 1초`;$('#combat-detail').textContent='차징·투척 중 이동 불가 · 1초에 자동 발동';$('#combat-bar').style.width=`${catCharge.elapsed*100}%`;}
 if(hackerUlt||chickCharge||chickStealth>0){const u=hackerUlt;$('#combat-title').textContent=u?'해킹':chickCharge?'시스템 정지 · 차징':'시크릿 모드';$('#combat-clock').textContent=u?`${Math.ceil(u.remaining)}초`:chickCharge?`${chickCharge.elapsed.toFixed(1)} / ${chickCharge.skill.charge}초`:`${chickStealth.toFixed(1)}초`;$('#combat-detail').textContent=u?(u.phase==='selecting'?'가까운 적 우선 · 피해 80% 감소':'해킹당함! · 5초 경직과 지속 피해 · 피해 80% 감소'):chickCharge?'E를 놓으면 발동 · 차징 중 은신 유지':'이동속도 +50% · 다음 공격 +20%';$('#combat-bar').style.width=`${(u?u.remaining/(u.phase==='selecting'?u.skill.selection:u.skill.duration):chickCharge?chickCharge.elapsed/chickCharge.skill.charge:chickStealth/5)*100}%`;}
 if(player.classId==='otter'&&(otterConcert||otterShield||otterBubbles||otterWave)){
  const c=otterConcert,w=otterWave,b=otterBubbles;
  $('#combat-title').textContent=c?'콘서트 ♡':w?.riding?'파도 타기':w&&!w.riding&&w.elapsed<=w.skill.rideWindow?'W 다시 누르면 파도 타기':'물방울 가드';
  $('#combat-clock').textContent=`${(c?.remaining??Math.max(otterShield?.remaining||0,b?.remaining||0,w?(w.remaining/w.skill.speed):0)).toFixed(1)}초`;
  $('#combat-detail').textContent=c?'공격·이동 +20% · 초당 HP 10% · 피해 50% 감소':w?.riding?'무적 아님 · 파도가 끝나면 내립니다':`보호막 ${Math.ceil(otterShield?.hp||0)} · 물방울 ${b?.orbs.filter(o=>o.active).length||0}개${w?' · 0.6초 안에 W 재입력':''}`;
  $('#combat-bar').style.width=`${(c?c.remaining/5:w?w.remaining/w.skill.range:Math.max(otterShield?.remaining||0,b?.remaining||0)/5)*100}%`;
 }

}
function drawCombatIndicators(){
 if(guardTime>0||recovery){ctx.save();ctx.strokeStyle=recovery?'#baffb1':'#abe8ff';ctx.lineWidth=4;ctx.shadowColor=recovery?'#a6ed89':'#64cbff';ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(player.x-camera,player.y-(isPowered(player)?100:56)-pz,isPowered(player)?82:53,isPowered(player)?110:74,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(!swordUlt)return;
 swordUlt.targets.forEach(id=>{
  const m=monsters.find(m=>m.id===id&&!m.dead);if(!m)return;
  // World position with screen-sized reticles keeps distant targets legible after zooming out.
  ctx.save();ctx.translate(m.x-camera,m.y-58);ctx.scale(1/cameraZoom,1/cameraZoom);
  ctx.beginPath();ctx.arc(0,0,31,0,Math.PI*2);ctx.moveTo(-41,0);ctx.lineTo(-23,0);ctx.moveTo(41,0);ctx.lineTo(23,0);
  ctx.strokeStyle='#101014';ctx.lineWidth=9;ctx.stroke();
  ctx.strokeStyle='#ffe45c';ctx.lineWidth=3.5;ctx.shadowColor='#ffd52a';ctx.shadowBlur=10;ctx.setLineDash([13,7]);ctx.lineDashOffset=-worldTime*24;ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;
  // Dark brackets under yellow corners stay readable over both monsters and lights.
  ctx.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){ctx.moveTo(sx*19,sy*39);ctx.lineTo(sx*39,sy*39);ctx.lineTo(sx*39,sy*19);}
  ctx.strokeStyle='#101014';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#ffe45c';ctx.lineWidth=3;ctx.stroke();
  ctx.restore();
 });
 if(swordUlt.phase==='charging'){ctx.save();ctx.beginPath();ctx.arc(player.x-camera,player.y-58,72,-Math.PI/2,-Math.PI/2+Math.PI*2*swordUlt.elapsed/3);ctx.strokeStyle='#101014';ctx.lineWidth=9;ctx.stroke();ctx.strokeStyle='#ffe45c';ctx.lineWidth=4;ctx.shadowColor='#ffd52a';ctx.shadowBlur=10;ctx.stroke();ctx.restore();}
}
function bossTalk(){
 if(!boss||bossActive())return;
 if(isTypeA(boss)){typeATalk();return;}
 showModal('boss-talk',`${SOLDIER.name} · Lv. ${SOLDIER.level}`,`<div class="boss-intro"><span class="boss-eyebrow">한사발포차 역삼점 · 중간보스</span><h3>“준비됐나? 제대로 겨뤄 보자.”</h3><p>더 빠르고 넓어진 검 2연격, 범위 안에서 지속 피해를 주는 백색 장풍, 착지 충격파와 등 뒤 기습 5연격을 사용합니다. 바닥의 공격 예고를 보고 피하세요. 칼을 한 바퀴 돌리면 공격을 멈추세요. 이어지는 3초 동안 공격하면 보스 대신 내가 피해를 받습니다.</p><ul><li>권장 Lv. 20–25 · 체력 ${SOLDIER.hp.toLocaleString()}</li><li>반격 피해는 돌진·궁극기의 무적과 막기를 뚫습니다. 공격을 멈추면 안전합니다.</li><li>전투 중 감자칩은 공통 재사용 대기 <strong>10초</strong></li><li>출구는 잠깁니다. 메뉴에서 도전을 포기하거나 이동장치를 사용할 수 있어요.</li></ul><p class="boss-reward">승리 보상 · EXP ${xpReward(player,SOLDIER.xp).toLocaleString()} + 군복<br><small>군복 장착 시 이동속도 +20% · 중복 획득 없음</small></p>${player.level<20?'<p>현재 레벨은 권장 레벨보다 낮아요. 충분히 준비한 뒤 도전해 보세요.</p>':''}<button class="primary" id="challenge-boss">${boss.dead?'다시 결투하기':'결투 시작하기'}</button></div>`,'#challenge-boss');
 $('#challenge-boss').onclick=startBossFight;
}
function startBossFight(){
 if(scene!=='playing'||!MAPS[player.map].boss||!boss||!(isTypeA(boss)?beginTypeA(boss):beginSoldier(boss)))return;
 closeModal();resetJump();resetGait();cancelSword();resetCombat();hurtTime=0;attackTimer=0;
 player.x=isTypeA(boss)?600:720;player.y=650;facing=1;invincible=.8;potionCooldown=0;
 monsters=[boss];effects=[];texts=[];drops=[];interactionTarget=null;
 buildHUD();save();canvas.focus();toast('결투 시작! 공격 예고를 보고 피한 뒤 빈틈을 노리세요.');
}
function abandonBoss(){
 if(!bossActive())return;closeModal();player.x=290;player.y=648;resetWorld();buildHUD();save();toast('도전을 마쳤어요. 준비가 되면 다시 말을 걸어 주세요.');
}
function winBoss(){
 if(isTypeA(boss)){winTypeA();return;}
 if(!boss||!defeatSoldier(boss))return;
 const owned=player.uniform>0;resetOtter();cancelSword();potionCooldown=0;player.uniform=1;player.bossWins++;player.kills++;
 const gained=gainXp(player,SOLDIER.xp);save();refreshHUD();
 effects.push({type:'ring',x:boss.x,y:boss.y-30,life:1,max:1,color:'#ffe0a0',size:200});beep(850,.45);
 showModal('boss-victory','결투 승리',`<div class="boss-intro"><span class="boss-eyebrow">신원미상의 예비군 격파 · ${player.bossWins}회</span><h3>“좋은 실력이군. 이 군복을 받아라.”</h3><p class="boss-reward">EXP +${xpReward(player,SOLDIER.xp).toLocaleString()}${gained?` · Lv. ${player.level} 달성`:''}</p><div class="job-choice"><strong>▣ 군복 ${owned?'보유 중':'획득'}</strong><p>장착하면 이동속도가 20% 증가합니다.<br>${owned?'이미 가진 군복은 유지됩니다.':'인벤토리(I)에서 언제든 장착하거나 벗을 수 있어요.'}</p></div><button class="primary menu-wide" id="equip-reward">${player.uniformEquipped?'군복을 입고 계속하기':'군복 장착하고 계속하기'}</button><button class="text-button menu-wide" id="leave-reward">나중에 장착하기 · 닫기</button></div>`,'#equip-reward');
 $('#equip-reward').onclick=()=>{if(!player.uniformEquipped)equipUniform(player);save();closeModal();refreshHUD();};
 $('#leave-reward').onclick=closeModal;
}
function updateBossFight(dt){
 if(chickStunned(boss)){boss.walking=false;return;}
 if(!bossActive())return;
 if(isTypeA(boss)){updateTypeAFight(dt);return;}
 for(const shot of boss.projectiles)shot.ballotHitCooldown=Math.max(0,(shot.ballotHitCooldown||0)-dt);
 const events=stepSoldier(boss,dt,bossPerception());
 for(const event of events){
  if(event.type==='land'){shake=Math.max(shake,8);effects.push({type:'ring',x:boss.x,y:boss.y,life:.35,max:.35,color:'#ffc080',size:SOLDIER.landing.range});}
  if(event.type==='cast'){beep(190,.3,'sawtooth',.03);continue;}
  if(event.type==='melee')effects.push({type:'slash',x:event.x,y:event.y-65,dir:event.dir,life:.18,max:.18,color:'#ffc0a0',size:event.range});
  const box=liveBallot();
  if(box&&soldierHit(event,{...box,z:0})&&(!event.shot||!event.shot.ballotHitCooldown)){
   if(event.shot)event.shot.ballotHitCooldown=SOLDIER.palm.interval;
   damageBallot(event.damage,boss);
  }
  if(!soldierHit(event,{x:player.x,y:player.y,z:pz}))continue;
  // A sustained beam can hit again after its own interval, including after re-entry.
  if(event.shot?.hitCooldown>0)continue;
  if(invincible>0)continue;
  if(event.shot)event.shot.hitCooldown=SOLDIER.palm.interval;
  if(guardTime>0){textAt('막기',player.x,player.y-120,'#b9eaff');beep(750,.05);continue;}
  const damage=playerDamage(event.damage,boss,event.type==='wave'?'magic':'physical');player.hp=Math.max(0,player.hp-damage);hurtTime=.32;invincible=.14;shake=Math.max(shake,event.type==='wave'?10:5);
  textAt(`−${damage}`,player.x,player.y-115,'#ff9b91');beep(120,.1,'square',.018);
  if(player.hp<=0){die();return;}
 }
}
function typeATalk(){
 showModal('boss-talk','Lv.35 A형 · 가동 대기',`<div class="boss-intro"><span class="boss-eyebrow">수료조건 · 전투 로봇</span><h3>침입자 감지. 전투 프로토콜 준비.</h3><p>전방 칼날, 기관총 연사, 붉은 충전 후 돌진, 0.5초 간격 4연속 표적 폭격을 사용합니다. 모든 타격에 내 최대 HP의 10%만큼 추가 피해가 적용됩니다.</p><ul><li>HP 40%: ${TYPE_A.safety.duration}초간 무적. 파란 안전지대 밖은 즉사합니다. 무적기나 막기로 회피할 수 있습니다.</li><li>HP 20%: 광폭화. 이동과 패턴이 빨라지고 4초 회전 칼날, 넓은 원형 자기장 흡인이 추가됩니다.</li><li>체력 ${TYPE_A.hp.toLocaleString()} · 회복 아이템 재사용 10초</li></ul><p class="boss-reward">EXP ${xpReward(player,TYPE_A.xp).toLocaleString()} · 6,000원 · 에너지 코어 15개 · A형 칭호</p><button class="primary" id="challenge-boss">${boss.dead?'A형 다시 가동':'A형 가동 · 전투 시작'}</button></div>`,'#challenge-boss');
 $('#challenge-boss').onclick=startBossFight;
}
function winTypeA(){
 if(!defeatTypeA(boss))return;
 resetOtter();cancelSword();cancelCatCharge();catProjectiles=[];catFires=[];catBallot=null;potionCooldown=0;player.typeAWins=(player.typeAWins||0)+1;player.kills++;
 player.typeATitle=1;player.money+=TYPE_A.money;player.cores+=TYPE_A.cores;gainXp(player,TYPE_A.xp);save();refreshHUD();
 showModal('boss-victory','A형 격파',`<div class="boss-intro"><h3>전투 프로토콜 종료.</h3><p>${player.typeAWins}번째 A형 격파! A형 칭호를 장착하면 역삼역주변거리로 이동할 수 있어요.</p><p class="boss-reward">EXP +${xpReward(player,TYPE_A.xp).toLocaleString()} · 6,000원 · 에너지 코어 15개 · A형 칭호</p><p>I 키로 가방을 열어 A형 칭호를 장착하면 공격력이 5% 증가합니다.</p><button class="primary" id="type-a-reward-close">모험 계속하기</button></div>`,'#type-a-reward-close');
 $('#type-a-reward-close').onclick=closeModal;
}
function updateTypeAFight(dt){
 const events=stepTypeA(boss,dt,bossPerception());
 for(const e of events){
  if(e.type==='muzzle'){effects.push({type:'spark',x:e.x,y:e.y,life:.12,max:.12,color:'#ffdb9a',size:36});beep(130,.04,'square',.008);continue;}
  if(e.type==='bomb-launch'){beep(420,.06);continue;}
  if(e.type==='blade')effects.push({type:'slash',x:e.x,y:e.y-95,dir:e.dir,life:.32,max:.32,color:'#ff8295',size:e.range});
  if(e.type==='bomb')effects.push({type:'ring',x:e.x,y:e.y-12,life:.45,max:.45,color:'#ff7755',size:e.radius});
  if(e.type==='execution'){shake=16;effects.push({type:'ring',x:player.x,y:650,life:.7,max:.7,color:'#ff3159',size:1200});}
  const box=liveBallot();
  if(box&&typeAHit(e,{...box,z:0})){
   damageBallot(e.type==='execution'?box.hp:e.damage+box.maxHp*TYPE_A.maxHpDamage,boss);
   if(e.type==='bullet'){e.shot.spent=true;continue;}
   if(e.type==='dash')boss.dashHit=true;
  }
  if(!typeAHit(e,{x:player.x,y:player.y,z:pz}))continue;
  if(e.type==='bullet')e.shot.spent=true;
  if(e.type==='dash')boss.dashHit=true;
  // The safety blast ignores defense/reduction and jumping, but respects actual invulnerability skills.
  if(invincible>0||guardTime>0){if(e.type==='execution')textAt('회피 성공!',player.x,player.y-150,'#b8f4ff');continue;}
  if(e.type==='pull'){
   const dx=boss.x-player.x,dy=boss.y-player.y,d=Math.hypot(dx,dy)||1,travel=Math.max(0,d-100);
   player.x=clamp(player.x+dx/d*travel,45,MAPS[player.map].width-45);player.y=clamp(player.y+dy/d*travel,580,720);
   resetGait();
  }
  const damage=e.type==='execution'?player.hp:playerDamage(e.damage+maxHp(player)*TYPE_A.maxHpDamage,boss,['blade','dash','spin','bullet'].includes(e.type)?'physical':'magic');
  player.hp=Math.max(0,player.hp-damage);hurtTime=.32;invincible=.12;shake=Math.max(shake,e.type==='bomb'?10:5);
  textAt(e.type==='execution'?'즉사':`−${damage}`,player.x,player.y-120,'#ff8b91');
  if(player.hp<=0){die();return;}
 }
}
function typeAFrame(b){
 if(b.dead)return 8;
 if(b.phase==='safety'||b.phase==='enrage')return 12;
 if(b.walking)return [1,2,3,2][Math.floor(b.walkPhase*4)%4];
 return {'blade-charge':4,blade:b.elapsed<.2?5:6,'gun-charge':7,gun:7,'dash-charge':8,dash:9,'bomb-charge':10,bomb:(b.elapsed%.5)<.22?11:10,'spin-charge':4,spin:13+Math.floor(b.elapsed/.1)%2,'pull-charge':8,pull:15}[b.phase]??0;
}
function drawTypeABoss(){
 const b=boss,img=images['type-a'];if(!img?.complete||!img.naturalWidth)return;
 const frame=typeAFrame(b),cell=img.naturalWidth/4,ch=img.naturalHeight/4,scale=TYPE_A.height/(ch*.96),x=b.x-camera;
 ctx.save();ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(x,b.y+5,90,20,0,0,Math.PI*2);ctx.fill();
 ctx.translate(x,b.y);ctx.scale(b.dir,1);ctx.imageSmoothingEnabled=true;ctx.globalAlpha=b.dead?.45:1;
 if(b.phase==='dash-charge'||b.enraged){ctx.shadowColor='#ff274f';ctx.shadowBlur=b.phase==='dash-charge'?20+Math.sin(worldTime*24)*12:14;ctx.filter='sepia(.2) saturate(1.6)';}
 if(b.hit>0)ctx.filter='brightness(1.6)';if(chickStunned(b))ctx.filter='grayscale(1)';
 ctx.save();ctx.translate(-cell*.5*scale,-ch*.98*scale);ctx.scale(scale,scale);
 // Only the fully extended blade crosses its atlas cell; clip away the neighboring robot's lower leg.
 if(frame===5){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(cell*1.25,0);ctx.lineTo(cell*1.25,ch*.47);ctx.lineTo(cell,ch*.47);ctx.lineTo(cell,ch);ctx.lineTo(0,ch);ctx.closePath();ctx.clip();ctx.drawImage(img,cell,ch,cell*1.25,ch,0,0,cell*1.25,ch);}
 else{
  if(frame===6||frame===10){ctx.beginPath();ctx.moveTo(cell*.24,0);ctx.lineTo(cell,0);ctx.lineTo(cell,ch);ctx.lineTo(0,ch);ctx.lineTo(0,ch*.47);ctx.lineTo(cell*.24,ch*.47);ctx.closePath();ctx.clip();}
  ctx.drawImage(img,frame%4*cell,Math.floor(frame/4)*ch,cell,ch,0,0,cell,ch);
 }
 ctx.restore();ctx.filter='none';ctx.shadowBlur=0;
 if(b.phase==='gun'&&b.elapsed%TYPE_A.gun.interval<.07){ctx.fillStyle='#fff1ae';ctx.beginPath();ctx.moveTo(120,-220);ctx.lineTo(175,-230);ctx.lineTo(145,-206);ctx.lineTo(178,-198);ctx.lineTo(120,-201);ctx.closePath();ctx.fill();}
 if(b.phase==='bomb-charge'||b.phase==='bomb'&&b.elapsed%.5>=.22){ctx.fillStyle='#242c35';ctx.strokeStyle='#ff546a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(35,-TYPE_A.height+20,19,0,Math.PI*2);ctx.fill();ctx.stroke();}
 if(b.phase==='safety'){ctx.strokeStyle='#a6e6ff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-TYPE_A.height*.48,125,TYPE_A.height*.54,0,0,Math.PI*2);ctx.stroke();}
 ctx.restore();label(b.dead?'A형 · 가동 정지':`Lv.35 A형${b.enraged?' · 광폭화':''}`,x,b.y-TYPE_A.height-24,b.enraged?'#ff8b9c':'#f2d2d8',18);
}
function drawTypeATelegraphs(){
 const b=boss;ctx.save();
 const zone=(x,y,rx,ry,color)=>{ctx.fillStyle=color+'35';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x-camera,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();};
 if(b.phase==='safety'){
  const s=b.safeZone;ctx.fillStyle='#ef234d66';ctx.fillRect(-camera,570,TYPE_A.width,160);
  for(let x=0;x<TYPE_A.width;x+=85){ctx.strokeStyle='#ff668466';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-camera,575);ctx.lineTo(x+100-camera,725);ctx.stroke();}
  // Blue is drawn last so hazard stripes never obscure the safe zone.
  ctx.fillStyle='#176f9f';ctx.strokeStyle='#72d8ff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(s.x-camera,s.y,s.rx,s.ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();label('안전지대',s.x-camera,s.y-13,'#effcff',20);
 }
 if(b.phase==='blade-charge'){ctx.fillStyle='#ff496644';ctx.fillRect(b.x-camera+(b.dir<0?-TYPE_A.blade.range:0),b.y-65,TYPE_A.blade.range,130);}
 if(b.phase==='gun-charge'||b.phase==='gun'){ctx.fillStyle='#ffb05222';ctx.fillRect(b.dir>0?b.x-camera:-camera,b.y-25,b.dir>0?TYPE_A.width-b.x:b.x,50);}
 if(b.phase==='dash-charge'){
  ctx.strokeStyle='#ff385d';ctx.lineWidth=50;ctx.globalAlpha=.22;ctx.beginPath();ctx.moveTo(b.x-camera,b.y);ctx.lineTo(b.target.x-camera,b.target.y);ctx.stroke();ctx.globalAlpha=1;
  zone(b.x,b.y,105,48,'#ff385d');label('돌진 준비',b.x-camera,b.y-TYPE_A.height-55,'#ffacb9',16);
 }
 for(const bomb of b.bombs){
  const t=1-bomb.remaining/bomb.duration;zone(bomb.x,bomb.y,TYPE_A.bomb.radius,TYPE_A.bomb.radius/1.5,'#ff664e');
  ctx.strokeStyle='#ffe4b8';ctx.lineWidth=4;ctx.beginPath();ctx.arc(bomb.x-camera,bomb.y,22,-Math.PI/2,-Math.PI/2+t*Math.PI*2);ctx.stroke();
  const x=bomb.fromX+(bomb.x-bomb.fromX)*t-camera,y=bomb.fromY+(bomb.y-bomb.fromY)*t-Math.sin(t*Math.PI)*120;
  ctx.fillStyle='#303c49';ctx.strokeStyle='#ff6475';ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 for(const shot of b.projectiles){const height=70+140*Math.max(0,1-Math.abs(shot.x-shot.originX)/320);ctx.strokeStyle='#ffdd9e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(shot.x-camera-shot.dir*25,shot.y-height);ctx.lineTo(shot.x-camera,shot.y-height);ctx.stroke();}
 if(b.phase==='spin-charge'||b.phase==='spin'){
  zone(b.x,b.y,TYPE_A.spin.radius,TYPE_A.spin.radius/1.5,'#ff5979');
  if(b.phase==='spin')for(let i=0;i<4;i++){const a=worldTime*17+i*Math.PI/2;ctx.strokeStyle=i%2?'#fff3ef':'#f85076';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(b.x-camera,b.y-95,TYPE_A.spin.radius,TYPE_A.spin.radius*.5,0,a,a+1.1);ctx.stroke();}
 }
 if(b.phase==='pull-charge'||b.phase==='pull'){
  zone(b.x,b.y,TYPE_A.pull.radius,TYPE_A.pull.radius/1.5,'#a6a2ff');
  for(let i=0;i<3;i++){const r=TYPE_A.pull.radius*(1-((worldTime*1.8+i/3)%1));ctx.strokeStyle='#c2baffaa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x-camera,b.y,r,r/1.5,0,0,Math.PI*2);ctx.stroke();}
 }
 ctx.restore();
}

const SOLDIER_FRAMES=[
 [19,11,414,498,283,498],[462,85,579,410,376,410],[1078,49,394,459,202,459],
 [148,520,428,489,163,489],[577,543,523,461,216,461],[1143,529,362,451,178,475]
];
const COUNTER_FRAMES=[
 [155,0,292,515,149,509],[425,58,510,458,363,453],[1040,58,391,458,241,453],
 [130,521,316,483,173,476],[644,532,334,472,144,465],[1090,541,340,463,190,456]
];
// Shared body scale with per-pose hip / planted-foot anchors prevents sliding between frames.
const SOLDIER_WALK_FRAMES=[
 [0,0,384,512,206,502],[384,0,384,512,189,502],[768,0,384,512,190,502],[1152,0,384,512,200,502],
 [0,512,384,512,202,488],[384,512,384,512,188,488],[768,512,384,512,190,488],[1152,512,384,512,200,488]
];
function drawBoss(){
 if(!boss)return;
 if(isTypeA(boss)){drawTypeABoss();return;}
 const b=boss,phase=b.phase,counterPose=phase==='counter-windup'?Math.min(2,Math.floor(b.elapsed/SOLDIER.counter.windup*3)):phase==='counter'?3+Math.floor(b.elapsed/.12)%3:-1,walkPose=b.active&&!b.dead&&b.z===0&&phase==='approach'&&b.walking?Math.floor(b.walkPhase*8)%8:-1,img=images[counterPose>=0?'soldier-counter':walkPose>=0?'soldier-walk':'soldier-boss'],x=b.x-camera;
 const pose=phase==='leap'?5:['palm-charge','leap-charge'].includes(phase)?3:phase==='palm-release'?4:['slash','flurry'].includes(phase)?1+(Math.max(0,b.strikes-1)%2):phase==='landing'?2:0;
 ctx.save();ctx.fillStyle='#03101866';ctx.beginPath();ctx.ellipse(x,b.y+4,38*(1-b.z/420),10,0,0,Math.PI*2);ctx.fill();
 if(img?.complete&&img.naturalWidth){
  const [sx,sy,sw,sh,ax,ay]=counterPose>=0?COUNTER_FRAMES[counterPose]:walkPose>=0?SOLDIER_WALK_FRAMES[walkPose]:SOLDIER_FRAMES[pose],scale=counterPose>=0?175/446:walkPose>=0?175/470:175/498;
  ctx.translate(x,b.y-b.z);if(b.dir>0)ctx.scale(-1,1);ctx.imageSmoothingEnabled=true;ctx.filter=chickStunned(b)?'grayscale(1)':b.hit>0?'brightness(1.8)':'none';
  ctx.drawImage(img,sx,sy,sw,sh,-ax*scale,-ay*scale,sw*scale,sh*scale);
 }ctx.restore();
 drawBossAura(b);
 if(!b.active){label(`${SOLDIER.name} · Lv.${SOLDIER.level}`,x,b.y-195,'#ffe0a9',16);label(b.dead?'다시 도전 가능 · F':'대화하여 결투 시작 · F',x,b.y-224,'#bdebdc',13);}
}
function drawBossAura(b){
 if(!b.active)return;
 if(b.phase==='palm-charge'||b.phase==='palm-release'){
  const charge=b.phase==='palm-charge'?Math.min(1,b.elapsed/SOLDIER.palm.charge):1;
  const x=b.x-camera+b.dir*(b.phase==='palm-release'?68:43),y=b.y-132;
  ctx.save();ctx.translate(x,y);ctx.shadowColor='#ffffff';ctx.shadowBlur=28;
  const glow=ctx.createRadialGradient(0,0,1,0,0,34);glow.addColorStop(0,'#ffffff');glow.addColorStop(.32,'#fffffff0');glow.addColorStop(1,'#ffffff00');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,26+charge*8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,6+charge*7,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
  for(let i=0;i<5;i++){const a=i*Math.PI*.4+worldTime*7,r=18+(1-charge)*24;ctx.beginPath();ctx.arc(0,0,r,a,a+.8);ctx.stroke();}
  ctx.restore();
 }
 if(b.phase==='counter-windup'||b.phase==='counter'){
  const active=b.phase==='counter',rotation=active?b.elapsed*Math.PI*7:b.elapsed/SOLDIER.counter.windup*Math.PI*2;
  ctx.save();ctx.translate(b.x-camera,b.y-88);ctx.strokeStyle='#ffffff';ctx.shadowColor='#ffffff';ctx.shadowBlur=12;ctx.lineCap='round';
  // Offset, broken arcs read as wind swept by the blade rather than a solid shield.
  const layers=active?4:2;
  for(let i=0;i<layers;i++){
   const radius=(active?110:65)+i*6,angle=rotation+i*Math.PI*.62,tilt=(i%2?-.16:.12);
   ctx.globalAlpha=active?.8-i*.13:.7-i*.2;ctx.lineWidth=active?4.5-i*.8:2;
   ctx.beginPath();ctx.ellipse(0,(i-1)*11,radius,active?42+i*7:60,tilt,angle,angle+Math.PI*(active?1.12:.85));ctx.stroke();
   ctx.globalAlpha*=.5;ctx.lineWidth=1.2;
   ctx.beginPath();ctx.ellipse(0,(i-1)*11,radius+8,active?45+i*7:64,tilt,angle-.3,angle+Math.PI*.75);ctx.stroke();
  }
  if(active){
   ctx.globalAlpha=.5;ctx.lineWidth=1.5;
   for(let i=0;i<5;i++){const a=rotation*.65+i*Math.PI*.4;ctx.beginPath();ctx.ellipse(0,72,118+i*3,19,0,a,a+.5);ctx.stroke();}
  }
  ctx.restore();label(active?'반격 중 · 공격 금지':'칼 돌리기 · 반격 준비',b.x-camera,b.y-207,'#f3fbff',14);
 }
}
function drawBossTelegraphs(){
 if(!bossActive())return;if(isTypeA(boss)){drawTypeATelegraphs();return;}const b=boss;
 const lane=(x,y,dir,length,half,color)=>{
  ctx.save();ctx.translate(x-camera,y);ctx.scale(dir,1);ctx.fillStyle=color+'38';ctx.strokeStyle=color;ctx.lineWidth=2;
  ctx.fillRect(-22,-half,length+22,half*2);ctx.strokeRect(-22,-half,length+22,half*2);
  for(let dx=40;dx<length;dx+=65){ctx.beginPath();ctx.moveTo(dx-10,-8);ctx.lineTo(dx,0);ctx.lineTo(dx-10,8);ctx.stroke();}ctx.restore();
 };
 if(b.phase==='slash-windup')lane(b.x,b.y,b.dir,SOLDIER.slash.range,SOLDIER.slash.halfLane,'#ffb080');
 if(b.phase==='palm-charge')lane(b.x,b.y,b.dir,b.dir>0?1600-b.x:b.x,SOLDIER.palm.halfLane,'#ffffff');
 if(['leap','landing','flurry'].includes(b.phase)&&b.target){
  lane(b.target.x,b.target.y,b.target.dir,SOLDIER.ambush.range,SOLDIER.ambush.halfLane,'#ff937c');
  ctx.save();ctx.strokeStyle='#ffb593';ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.beginPath();ctx.ellipse(b.target.x-camera,b.target.y,SOLDIER.landing.range,SOLDIER.landing.halfLane,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(b.phase==='leap-charge'){
  ctx.save();ctx.strokeStyle='#ffd0a0';ctx.lineWidth=4;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=15;
  ctx.beginPath();ctx.arc(b.x-camera+b.dir*42,b.y-132,18+Math.sin(worldTime*18)*3,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,b.elapsed/SOLDIER.ambush.charge));ctx.stroke();ctx.restore();
 }
 for(const shot of b.projectiles){
  if(shot.spent)continue;const length=Math.max(8,shot.length||0);
  ctx.save();ctx.translate(shot.x-camera,shot.y-132);ctx.scale(shot.dir,1);
  ctx.shadowColor='#fff';ctx.shadowBlur=26;ctx.lineCap='round';
  for(const [width,alpha] of [[128,.15],[88,.4],[38,1]]){ctx.globalAlpha=alpha;ctx.strokeStyle='#ffffff';ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(-length,0);ctx.lineTo(0,0);ctx.stroke();}
  ctx.globalAlpha=.85;ctx.lineWidth=2;
  for(let i=0;i<4;i++){const offset=(worldTime*900+i*80)%length;ctx.beginPath();ctx.ellipse(-offset,0,15,58+i%2*6,-.2,-1.2,1.2);ctx.stroke();}
  ctx.restore();
 }
}
function resetJump(){pz=0;pvz=0;jumpScale=1;jumpPrep=0;jumpLanding=0;}
function jump(){
 if(hackerUlt||otterConcert||otterWave?.riding||catCharge||catCastLock>0)return;
 if(scene!=='playing'||modal||swordUlt||pz>0||pvz!==0||jumpPrep>0)return;
 walking=false;jumpPrep=player?.classId==='cat' ? .11 : .065;jumpLanding=0;beep(isPowered(player)?190:310,.12,'triangle',.04);
}
function updateJump(dt){
 jumpLanding=Math.max(0,jumpLanding-dt);
 if(jumpPrep>0){
  const preparing=Math.min(dt,jumpPrep);jumpPrep=Math.max(0,jumpPrep-preparing);dt-=preparing;
  if(jumpPrep>0)return;
  // Scale the entire vertical trajectory: +20% height without extra airtime.
  jumpScale=jumpHeightMultiplier(player);pvz=540*jumpScale;pz=jumpScale;
 }
 if(pz<=0&&pvz<=0)return;
 pvz-=1350*jumpScale*dt;pz+=pvz*dt;
 if(pz<=0){
  pz=0;pvz=0;jumpLanding=isPowered(player) ? .16 : player?.classId==='cat' ? .15 : .12;
  effects.push({type:'ring',x:player.x,y:player.y+2,life:.24,max:.24,color:isPowered(player)?'#bfeaff88':'#d7eced66',size:isPowered(player)?62:30});
 }
}
function jumpFrame(){
 if(jumpPrep>0)return 0;
 if(pz>0){if(pvz/jumpScale>350)return 1;if(pvz/jumpScale>105)return 2;if(pvz/jumpScale>-120)return 3;return 4;}
 return jumpLanding>0?5:-1;
}
function textAt(text,x,y,color='#ffe2a7'){texts.push({text,x,y,life:1.15,max:1.15,color});}
function resetCombat(){resetOtter();catCastLock=0;chickStealth=0;chickCodes=[];cancelChickAim();for(const m of monsters){m.stunTime=0;m.hack=null;}rabbitOrbs=[];rabbitShield=null;guardTime=0;recovery=null;combatMotion=null;}
function playerDamage(raw,source=null,kind='magic'){
 if(kind==='magic'&&raw>0)chickStealth=0;
 let damage=incomingDamage(player,raw*(source?.respectTime>0?.7:1),(hackerUlt?.skill?1-hackerUlt.skill.reduction:1)*(swordUlt?1-swordUlt.skill.reduction:1)*(recovery?1-recovery.reduction:1)*(otterConcert?1-otterConcert.skill.reduction:1));
 if(rabbitShield){const absorbed=Math.min(rabbitShield.hp,damage);rabbitShield.hp-=absorbed;damage-=absorbed;if(rabbitShield.hp<=0)rabbitShield=null;}
 if(otterShield){const absorbed=Math.min(otterShield.hp,damage);otterShield.hp-=absorbed;damage-=absorbed;if(otterShield.hp<=0)otterShield=null;}
 return damage;
}
function playCombatMotion(kind,duration,extra={}){if(kind!=='chickType')walking=false;combatMotion={kind,duration,elapsed:0,dir:facing,...extra};}
const FX_PALETTES={
 builder:{color:'#f7fcff',accent:'#bfeaff',glow:'#9edfff',outline:'#426679'},
 electric:{color:'#ffe45c',accent:'#fff9ce',glow:'#ffe45c',outline:'#111117'}
};
const attackPalette=()=>FX_PALETTES[player?.job==='bodybuilder'?'builder':'electric'];
function attackImpactAt(x,y,size=80,dir=facing){
 if(!player?.job)return null;
 if(player.classId==='otter'){const effect={type:'ring',x,y,size,life:.24,max:.24,color:'#a6edff'};effects.push(effect);return effect;}
 if(player.job==='hacker'){const effect={type:'ring',x,y,size,life:.22,max:.22,color:'#a7ffe2'};effects.push(effect);return effect;}
 if(player.job!=='bodybuilder')return lightningAt(x,y,size,dir);
 const effect={type:'impact',x,y,size,dir,life:.24,max:.24,...FX_PALETTES.builder};effects.push(effect);return effect;
}
function swingEffect(x,y,size,life){return {type:player.job==='bodybuilder'?'windSwing':'slash',x,y,size,dir:facing,life,max:life,...attackPalette()};}
function lightningAt(x,y,size=80,dir=facing){const effect={type:'lightning',x,y,size,dir,life:.22,max:.22,color:'#ffe45c',seed:Math.random()*20};effects.push(effect);return effect;}
function updateCombat(dt){
 if(combatMotion){combatMotion.elapsed+=dt;if(combatMotion.elapsed>=combatMotion.duration)combatMotion=null;}
 if(recovery){const r=recovery,step=Math.min(dt,r.remaining),before=player.hp;player.hp=Math.min(maxHp(player),player.hp+r.healTotal*step/r.duration);r.healed+=player.hp-before;r.remaining=Math.max(0,r.remaining-step);if(r.remaining<=1e-8){recovery=null;textAt(`+${Math.round(r.healed)} HP`,player.x,player.y-140,'#baffb1');save();}}
}
// Otter spells and summons are local encounter state; none survive a reload or map change.
function resetOtter(){otterWave=null;otterShield=null;otterBubbles=null;otterConcert=null;if(player)player.concertTime=0;}
const inConcert=(p,c=otterConcert)=>!!c&&p.x>=c.bounds.left&&p.x<=c.bounds.right&&p.y>=c.bounds.top&&p.y<=c.bounds.bottom;
function concertCanHit(m,c){
 const half=m.isBoss?90:30,height=m.isBoss?300:100;
 return canTarget(m)&&m.x+half>=c.bounds.left&&m.x-half<=c.bounds.right&&m.y>=c.bounds.top&&m.y-height<=c.bounds.bottom;
}
function otterAttack(){
 if(otterConcert)return;
 attackTimer=.34;playCombatMotion('otterPunch',attackTimer);
 effects.push({type:'ring',x:player.x+facing*58,y:player.y-60-pz,life:.18,max:.18,color:'#e6f5ef',size:42});
 for(const m of [...monsters])if(canTarget(m)&&Math.abs(m.y-player.y)<72&&(m.x-player.x)*facing>=-25&&(m.x-player.x)*facing<=138&&pz<110){hitMonster(m,basicAttackPower(player));if(scene!=='playing'||modal)break;}
 beep(290,.07);save();
}
function castOtter(key){
 if(otterConcert)return;
 // A second deliberate press rides the already-paid wave even while W is cooling down.
 if(key==='w'&&otterWave&&!otterWave.riding&&otterWave.elapsed<=otterWave.skill.rideWindow&&otterWave.remaining>0){
  otterWave.riding=true;player.x=otterWave.x;player.y=otterWave.y;facing=otterWave.dir;resetJump();resetGait();combatMotion=null;
  textAt('파도 타기',player.x,player.y-150,'#b6f0ff');beep(650,.13);refreshHUD();return;
 }
 const check=canUseSkill(player,key,cooldowns[key]);if(!check.ok){toast(check.message);return;}
 const s=check.skill;player.mp-=s.mp;cooldowns[key]=s.cooldown;
 if(key==='q'){
  const target=monsters.filter(m=>canTarget(m)&&(m.x-player.x)*facing>=0&&(m.x-player.x)*facing<=s.range&&Math.abs(m.y-player.y)<=s.halfLane&&pz<120).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
  attackTimer=Math.max(attackTimer,.42);playCombatMotion('otterWater',.42);
  effects.push({type:'otterJet',x:player.x+facing*30,y:player.y-108-pz,toX:target?.x??clamp(player.x+facing*s.range,45,MAPS[player.map].width-45),toY:target?target.y-(target.isBoss?160:48):player.y-92-pz,dir:facing,life:.38,max:.38,color:'#bcf5ff'});
  if(target)hitMonster(target,Math.round(attackPower(player)*s.damage));beep(600,.16);
 }else if(key==='w'){
  const x=clamp(player.x+facing*35,45,MAPS[player.map].width-45);
  otterWave={x,y:player.y,dir:facing,elapsed:0,remaining:Math.min(s.range,facing>0?MAPS[player.map].width-45-x:x-45),skill:s,hit:new Set(),riding:false,damage:Math.round(attackPower(player)*s.damage)};
  playCombatMotion('otterWave',.35);beep(480,.22);
 }else if(key==='e'){
  otterShield={hp:Math.round(maxHp(player)*s.shield),remaining:s.duration};
  otterBubbles={remaining:s.duration,elapsed:0,skill:s,orbs:[0,1,2].map(i=>({index:i,active:true,previous:null}))};
  playCombatMotion('otterGuard',.5);effects.push({type:'ring',x:player.x,y:player.y-50,life:.5,max:.5,color:'#9de9ff',size:110});beep(820,.2);
 }else if(key==='r'){
  if(otterWave?.riding)otterWave.riding=false;
  resetJump();resetGait();combatMotion=null;walking=false;
  otterConcert={x:player.x,y:player.y,elapsed:0,remaining:s.duration,tick:s.tick,skill:s,bounds:{left:camera,right:camera+viewWidth(),top:-viewOffsetY()/cameraZoom,bottom:(810-viewOffsetY())/cameraZoom}};
  player.concertTime=s.duration;attackTimer=0;textAt('콘서트 ♡',player.x,player.y-175,'#ffd0e8');beep(950,.35);
 }
 if(scene==='playing'){refreshHUD();save();}
}
function otterOrbPoint(b,i){const a=b.elapsed*2.8+i*Math.PI*2/3;return {x:player.x+Math.cos(a)*b.skill.orbit,y:clamp(player.y+Math.sin(a)*48,550,750)};}
function sweptOrbDistance(m,from,to){
 const dx=to.x-from.x,dy=(to.y-from.y)*1.5,length=dx*dx+dy*dy,t=length?clamp(((m.x-from.x)*dx+(m.y-from.y)*1.5*dy)/length,0,1):0;
 return Math.hypot(m.x-from.x-t*dx,(m.y-from.y)*1.5-t*dy);
}
function updateOtterCombat(dt){
 if(otterWave){
  const w=otterWave,from=w.x,step=Math.min(w.remaining,w.skill.speed*dt);w.elapsed+=dt;w.x=clamp(w.x+w.dir*step,45,MAPS[player.map].width-45);w.remaining=Math.max(0,w.remaining-step);
  if(w.riding){player.x=w.x;player.y=w.y;facing=w.dir;walking=false;}
  for(const m of [...monsters])if(canTarget(m)&&!w.hit.has(m.id)&&Math.abs(m.y-w.y)<=w.skill.halfLane&&m.x>=Math.min(from,w.x)-45&&m.x<=Math.max(from,w.x)+45){w.hit.add(m.id);hitMonster(m,w.damage);if(scene!=='playing'||modal)return;}
  if(otterWave===w&&w.remaining<=1e-8)otterWave=null;
 }
 if(otterShield){otterShield.remaining=Math.max(0,otterShield.remaining-dt);if(!otterShield.remaining)otterShield=null;}
 if(otterBubbles){
  const b=otterBubbles,step=Math.min(dt,b.remaining);b.elapsed+=step;b.remaining=Math.max(0,b.remaining-step);
  for(const orb of b.orbs){if(!orb.active)continue;const to=otterOrbPoint(b,orb.index),from=orb.previous||to;orb.previous=to;
   const target=monsters.filter(m=>canTarget(m)&&pz<120&&sweptOrbDistance(m,from,to)<(m.isBoss?80:38)).sort((a,c)=>Math.hypot(a.x-to.x,a.y-to.y)-Math.hypot(c.x-to.x,c.y-to.y))[0];
   if(target){orb.active=false;effects.push({type:'ring',x:to.x,y:to.y-55-pz,life:.3,max:.3,color:'#b8f2ff',size:50});hitMonster(target,Math.round(attackPower(player)*b.skill.damage));if(scene!=='playing'||modal)return;}
  }
  if(otterBubbles===b&&b.remaining<=1e-8)otterBubbles=null;
 }
 if(otterConcert){
  const c=otterConcert,step=Math.min(dt,c.remaining);c.elapsed+=step;c.remaining=Math.max(0,c.remaining-step);c.tick-=step;
  // Single-player ally list; apply support only to allies standing inside this stage.
  for(const ally of [player]){
   ally.concertTime=inConcert(ally,c)?Math.max(c.remaining,1e-8):0;
   if(ally.concertTime)ally.hp=Math.min(maxHp(ally),ally.hp+maxHp(ally)*c.skill.heal*step);
  }
  while(c.tick<=1e-8){c.tick+=c.skill.tick;
   for(const m of [...monsters])if(concertCanHit(m,c)){hitMonster(m,Math.round(attackPower(player)*c.skill.damage),0);if(scene!=='playing'||modal||otterConcert!==c)return;}
  }
  if(otterConcert===c&&c.remaining<=1e-8){otterConcert=null;player.concertTime=0;save();}
 }
}
function otterFrame(){
 if(otterConcert)return Math.floor(otterConcert.elapsed*5)%2?14:13;
 if(otterWave?.riding)return 11;
 if(hurtTime>0)return 15;
 const jump=jumpFrame();if(jump>=0)return [4,5,5,5,5,6][jump];
 const motion=combatMotion,t=motion?motion.elapsed/motion.duration:0;
 if(motion?.kind==='otterPunch')return t<.3?7:8;
 if(motion?.kind==='otterWater')return 9;
 if(motion?.kind==='otterWave')return 10;
 if(motion?.kind==='otterGuard')return 12;
 return walking?[1,2,3,2][Math.floor(walkPhase*4)%4]:0;
}
// Generated poses share a scale, but their row boundaries and planted feet need individual anchors.
// Row 4 starts above the mathematical quarter; crop bands prevent its heads leaking into Q/W.
const OTTER_ROWS=[[0,320],[320,640],[640,930],[930,1295]];
const OTTER_FEET={
 normal:[308,307,309,308,616,586,616,616,904,906,907,915,1219,1219,1219,1219],
 idol:[312,310,312,311,620,578,619,620,915,917,918,914,1240,1239,1238,1241]
};
function drawOtterPlayer(){
 const img=images[otterAsset()];if(!img?.complete||!img.naturalWidth)return;
 const frame=otterFrame(),cw=img.naturalWidth/4,x=player.x-camera,scale=178/(img.naturalHeight/4),[top,bottom]=OTTER_ROWS[Math.floor(frame/4)],foot=OTTER_FEET[player.job==='idol'?'idol':'normal'][frame],column=frame%4,sourceX=Math.max(column*cw,({9:340,10:650,11:916})[frame]||0),sourceWidth=(column+1)*cw-sourceX;
 ctx.save();ctx.fillStyle='#03162560';ctx.beginPath();ctx.ellipse(x,player.y+3,27,7,0,0,Math.PI*2);ctx.fill();ctx.translate(x,player.y-pz);
 const dir=otterWave?.riding?otterWave.dir:otterConcert?facing:(combatMotion?.dir??facing);ctx.scale(dir,1);
 if(walking&&pz===0)ctx.translate(0,-Math.abs(Math.sin(walkPhase*Math.PI*4))*2);
 if(otterConcert){ctx.translate(Math.sin(otterConcert.elapsed*7)*3,-Math.abs(Math.sin(otterConcert.elapsed*7))*3);ctx.rotate(Math.sin(otterConcert.elapsed*5)*.035);}
 ctx.globalAlpha=hurtTime<=0&&invincible>0&&Math.floor(invincible*13)%2===0?.55:1;ctx.imageSmoothingEnabled=true;
 ctx.drawImage(img,sourceX,top,sourceWidth,bottom-top,(sourceX-(column+.5)*cw)*scale,(top-foot)*scale,sourceWidth*scale,(bottom-top)*scale);
 // The fist effect crosses the first tile; only this band is clear of the adjacent Q pose.
 if(frame===8){const effectTop=680,effectBottom=819,effectWidth=340-cw;ctx.drawImage(img,cw,effectTop,effectWidth,effectBottom-effectTop,cw*.5*scale,(effectTop-foot)*scale,effectWidth*scale,(effectBottom-effectTop)*scale);}
 ctx.restore();
 drawPlayerName(player.name,x,player.y-pz-160,player.job==='idol'?'#ffd0e8':'#d6efe7');
}
function waterBubble(x,y,r=15,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);g.addColorStop(0,'#eeffff');g.addColorStop(.35,'#98e9ff88');g.addColorStop(1,'#238bcad9');ctx.fillStyle=g;ctx.strokeStyle='#bcf6ff';ctx.lineWidth=2;ctx.shadowColor='#72daff';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffffdd';ctx.beginPath();ctx.ellipse(x-r*.35,y-r*.4,r*.22,r*.12,-.6,0,Math.PI*2);ctx.fill();ctx.restore();
}
function otterHeart(x,y,size,alpha=1){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=alpha;ctx.fillStyle='#ff8ec8';ctx.strokeStyle='#fff2fb';ctx.lineWidth=.12;ctx.shadowColor='#ffa2d4';ctx.shadowBlur=8;
 ctx.beginPath();ctx.moveTo(0,.85);ctx.bezierCurveTo(-1.25,.1,-1.15,-.65,-.55,-.7);ctx.bezierCurveTo(-.2,-.72,0,-.4,0,-.3);ctx.bezierCurveTo(.15,-.8,1.05,-.95,1.05,-.25);ctx.bezierCurveTo(1.05,.2,.45,.65,0,.85);ctx.fill();ctx.stroke();ctx.restore();
}
function drawOtterEffects(){
 for(const e of effects)if(e.type==='otterJet'){
  ctx.save();ctx.globalAlpha=e.life/e.max;ctx.strokeStyle='#4cb7e3aa';ctx.lineWidth=18;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(e.x-camera,e.y);ctx.quadraticCurveTo((e.x+e.toX)/2-camera,e.y-15,e.toX-camera,e.toY);ctx.stroke();ctx.strokeStyle='#cefbff';ctx.lineWidth=6;ctx.stroke();
  for(let i=1;i<=5;i++){const t=i/5;waterBubble(e.x+(e.toX-e.x)*t-camera,e.y+(e.toY-e.y)*t+Math.sin(i*2+worldTime*25)*5,4+2*t,e.life/e.max);}ctx.restore();
 }
 if(otterWave){const w=otterWave,x=w.x-camera,y=w.y;ctx.save();ctx.translate(x,y);ctx.scale(w.dir,1);ctx.shadowColor='#5ddbff';ctx.shadowBlur=12;
  const g=ctx.createLinearGradient(0,-80,0,10);g.addColorStop(0,'#defaff');g.addColorStop(.35,'#5bcff5');g.addColorStop(1,'#126b9c88');ctx.fillStyle=g;ctx.strokeStyle='#d4faff';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-80,4);ctx.bezierCurveTo(-55,-15,-23,-7,-2,-49);ctx.bezierCurveTo(25,-108,74,-78,50,-44);ctx.bezierCurveTo(50,-70,19,-66,16,-35);ctx.bezierCurveTo(13,-10,56,-15,77,1);ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<6;i++)waterBubble(-68+i*26,3+Math.sin(worldTime*10+i)*4,3+i%3,.75);ctx.restore();
 }
 if(otterShield){ctx.save();ctx.strokeStyle='#b6f4ff';ctx.lineWidth=3;ctx.fillStyle='#8bdfff18';ctx.shadowColor='#9ae8ff';ctx.shadowBlur=12;ctx.beginPath();ctx.ellipse(player.x-camera,player.y-64-pz,57,77,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
 if(otterBubbles){const b=otterBubbles;for(const orb of b.orbs)if(orb.active){const p=otterOrbPoint(b,orb.index);waterBubble(p.x-camera,p.y-55-pz,17,Math.min(1,b.remaining));}}
 if(otterConcert){
  const c=otterConcert,x=player.x-camera,y=player.y,fade=Math.min(1,c.elapsed*4,c.remaining*2);ctx.save();ctx.globalAlpha=fade;
  const g=ctx.createLinearGradient(x,30,x,y);g.addColorStop(0,'#fff0fa66');g.addColorStop(1,'#ffabdb0a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-16,0);ctx.lineTo(x+16,0);ctx.lineTo(x+155,y+8);ctx.lineTo(x-155,y+8);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e8a5d9';ctx.fillStyle='#ffc5e52b';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+4,157,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let i=0;i<16;i++){const a=i*2.4+c.elapsed*1.3,r=65+(i%5)*24,px=x+Math.cos(a)*r,py=y-50-(c.elapsed*45+i*27)%185;otterHeart(px,py,6+(i%3)*3,fade*.85);}
  for(let i=0;i<10;i++){const a=i*2.9+c.elapsed*2;waterBubble(x+Math.cos(a)*(70+i%4*28),y-20-Math.abs(Math.sin(a))*70,5+i%4,fade*.65);}
  // Subtle edge markers communicate that the concert covers the visible stage, not the entire map.
  ctx.strokeStyle='#b8e9ff88';ctx.setLineDash([6,12]);ctx.lineWidth=2;ctx.strokeRect(c.bounds.left-camera+2,c.bounds.top+2,c.bounds.right-c.bounds.left-4,c.bounds.bottom-c.bounds.top-4);ctx.setLineDash([]);label('콘서트 ♡',x,y-205,'#ffd5ed',15);ctx.restore();
 }
}

// Rabbit spells are local combat state; saved characters retain only skill cooldowns.
function rabbitAttack(){
 if(player.mp<2){attackTimer=.25;toast('MP가 부족해요. 마법 구체는 MP 2가 필요해요.');return;}
 player.mp-=2;
 attackTimer=.42;playCombatMotion('rabbitOrb',.32);
 rabbitOrbs.push({x:player.x+facing*30,y:player.y,z:pz,dir:facing,remaining:255,damage:basicAttackPower(player)});beep(690,.09);refreshHUD();save();
}
function castRabbit(key){
 const check=canUseSkill(player,key,cooldowns[key]);if(!check.ok){toast(check.message);return;}
 const skill=check.skill;
 if(key==='r'){respectTargetModal();return;}
 player.mp-=skill.mp;cooldowns[key]=skill.cooldown;
 if(key==='q'){
  playCombatMotion('rabbitLightning',.42);attackTimer=Math.max(attackTimer,.42);
  effects.push({type:'rabbitLightning',x:player.x,y:player.y-60-pz,toX:clamp(player.x+facing*skill.range,45,MAPS[player.map].width-45),life:.38,max:.38});
  for(const m of [...monsters])if(canTarget(m)&&Math.abs(m.y-player.y)<70&&(m.x-player.x)*facing>=-20&&(m.x-player.x)*facing<=skill.range&&pz<120){hitMonster(m,Math.round(attackPower(player)*skill.damage));if(scene!=='playing'||modal)break;}
  beep(390,.18,'sawtooth',.025);
 }else if(key==='w'){
  const fromX=player.x;player.x=clamp(player.x+facing*skill.dash,45,MAPS[player.map].width-45);resetGait();
  playCombatMotion(player.job==='mage'?'rabbitTeleport':'rabbitRoll',.3,player.job==='mage'?{}:{fromX,toX:player.x});
  effects.push({type:'ring',x:fromX,y:player.y-45-pz,life:.28,max:.28,color:'#ccb1ff',size:50},{type:'ring',x:player.x,y:player.y-45-pz,life:.32,max:.32,color:'#aa8dff',size:65});
  beep(830,.08);
 }else if(key==='e'){
  rabbitShield={remaining:skill.duration,hp:Math.round(maxHp(player)*skill.shield)};playCombatMotion('rabbitShield',.55);
  effects.push({type:'ring',x:player.x,y:player.y-38,life:.55,max:.55,color:'#c8b3ff',size:skill.range});
  for(const m of [...monsters])if(canTarget(m)&&Math.hypot(m.x-player.x,(m.y-player.y)*1.5)<=skill.range){hitMonster(m,Math.round(attackPower(player)*skill.damage));if(scene!=='playing'||modal)break;}
  beep(580,.3);
 }
 if(scene==='playing'){refreshHUD();save();}
}
function respectTargetModal(){
 showModal('respect-target','존경! · 사용할 대상을 골라주세요',`<p>선택한 아군을 10초간 강화합니다. 현재는 혼자 플레이하므로 자신을 선택할 수 있어요.</p><button class="respect-target" id="respect-self"><img src="${characterPortrait(player)}" alt="토끼 마법사"><span><strong>${escapeHtml(player.name)} · 나</strong><small>Lv. ${player.level} ${jobName(player)} · HP ${Math.ceil(player.hp)} / ${maxHp(player)}</small><small>이동속도·공격력·최대 HP +20% · 받는 피해 20% 감소</small></span></button><p>주변 적: 3초간 공격력 −30% · 취소하면 MP와 쿨타임을 소모하지 않습니다.</p>`,'#respect-self');
 $('#respect-self').onclick=applyRespect;
}
function applyRespect(){
 if(modal!=='respect-target'||scene!=='playing'||player?.job!=='mage')return false;
 const check=canUseSkill(player,'r',cooldowns.r);if(!check.ok){toast(check.message);return false;}
 const before=maxHp(player),skill=check.skill;player.mp-=skill.mp;cooldowns.r=skill.cooldown;player.respectTime=skill.duration;player.hp=Math.min(maxHp(player),player.hp+maxHp(player)-before);
 closeModal();playCombatMotion('rabbitSalute',1);attackTimer=Math.max(attackTimer,1);
 for(const m of monsters)if(!m.dead&&(!m.isBoss||m.active)&&Math.hypot(m.x-player.x,(m.y-player.y)*1.5)<=skill.range){m.respectTime=3;}
 effects.push({type:'ring',x:player.x,y:player.y-40,life:.85,max:.85,color:'#e4ccff',size:skill.range});textAt('존경!',player.x,player.y-165,'#f0daff');beep(920,.35);refreshHUD();save();return true;
}
function updateRabbit(dt){
 if(player.respectTime>0){player.respectTime=Math.max(0,player.respectTime-dt);if(!player.respectTime)player.hp=Math.min(player.hp,maxHp(player));}
 for(const m of monsters)if(m.respectTime>0)m.respectTime=Math.max(0,m.respectTime-dt);
 if(rabbitShield){rabbitShield.remaining-=dt;if(rabbitShield.remaining<=0)rabbitShield=null;}
 for(const orb of [...rabbitOrbs]){
  const start=orb.x,distance=Math.min(orb.remaining,650*dt);orb.x+=orb.dir*distance;orb.remaining-=distance;
  const target=monsters.filter(m=>canTarget(m)&&Math.abs(m.y-orb.y)<58&&orb.z<120&&m.x>=Math.min(start,orb.x)-25&&m.x<=Math.max(start,orb.x)+25).sort((a,b)=>Math.abs(a.x-start)-Math.abs(b.x-start))[0];
  if(target){orb.remaining=0;hitMonster(target,orb.damage);if(scene!=='playing'||modal)break;}
 }
 rabbitOrbs=rabbitOrbs.filter(o=>o.remaining>0);
}
function prepareRabbitPortrait(){
 for(const [name,row] of [['otter-motion',0],['otter-idol-skirt-motion',0],['chick-motion',0],['chick-hacker',2]])try{const img=images[name.startsWith('otter')?name:'chick-motion'],c=document.createElement('canvas');c.width=256;c.height=256;c.getContext('2d').drawImage(img,0,row*img.naturalHeight/4,img.naturalWidth/4,img.naturalHeight/4,0,0,256,256);rabbitPortraits[name]=c.toDataURL('image/png');}catch{}
 for(const name of ['rabbit-novice-motion','rabbit-motion'])try{const img=images[name],c=document.createElement('canvas');c.width=256;c.height=256;c.getContext('2d').drawImage(img,0,0,img.naturalWidth/4,img.naturalHeight/4,0,0,256,256);rabbitPortraits[name]=c.toDataURL('image/png');}catch{}
}
function rabbitFrame(){
 const kind=combatMotion?.kind,t=combatMotion?combatMotion.elapsed/combatMotion.duration:0;
 if(kind==='rabbitSalute')return 14;if(hurtTime>0)return 15;
 if(kind==='rabbitOrb')return t<.3?8:9;if(kind==='rabbitLightning')return t<.2?8:10;
 if(kind==='rabbitRoll')return 11;if(kind==='rabbitTeleport')return 12;if(kind==='rabbitShield')return 13;
 const jump=jumpFrame();if(jump>=0)return [4,5,5,6,6,7][jump];
 return walking?[1,2,3,2][Math.floor(walkPhase*4)%4]:0;
}
function drawRabbitPlayer(x,y){
 const img=images[rabbitAsset()];if(!img?.complete||!img.naturalWidth)return;
 const frame=rabbitFrame(),cw=img.naturalWidth/4,ch=img.naturalHeight/4,height=148;
 ctx.save();ctx.fillStyle='#03162570';ctx.beginPath();ctx.ellipse(x,y+3,25,7,0,0,Math.PI*2);ctx.fill();ctx.translate(x,y-pz);
 if((combatMotion?.dir??facing)<0)ctx.scale(-1,1);
 if(combatMotion?.kind==='rabbitRoll'){ctx.translate(0,-55);ctx.rotate(combatMotion.elapsed/combatMotion.duration*Math.PI*2);ctx.translate(0,55);}
 if(walking&&pz===0)ctx.translate(0,-Math.abs(Math.sin(walkPhase*Math.PI*4))*2);
 ctx.globalAlpha=hurtTime<=0&&invincible>0&&Math.floor(invincible*13)%2===0?.55:1;
 ctx.drawImage(img,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,-height/2,-height,height,height);ctx.restore();
 drawPlayerName(player.name,x,y-pz-height-8,'#ead9ff');
}
function drawRabbitEffects(){
 for(const orb of rabbitOrbs){const x=orb.x-camera,y=orb.y-60-orb.z;ctx.save();ctx.shadowColor='#a765ff';ctx.shadowBlur=20;ctx.fillStyle='#eee1ff';ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ad7bff';ctx.lineWidth=5;ctx.stroke();ctx.globalAlpha=.5;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-orb.dir*40,y);ctx.lineTo(x-orb.dir*13,y);ctx.stroke();ctx.restore();}
 for(const e of effects)if(e.type==='rabbitLightning'){
  ctx.save();ctx.globalAlpha=e.life/e.max;ctx.shadowColor='#a54cff';ctx.shadowBlur=20;ctx.strokeStyle='#bd80ff';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(e.x-camera,e.y);
  for(let i=1;i<=12;i++)ctx.lineTo(e.x+(e.toX-e.x)*i/12-camera,e.y+(i===12?0:Math.sin(i*17+e.life*40)*19));ctx.stroke();ctx.strokeStyle='#f3ddff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 }
 if(rabbitShield||player?.respectTime>0){ctx.save();ctx.strokeStyle=rabbitShield?'#ccb8ff':'#efceff';ctx.lineWidth=rabbitShield?3:1.5;ctx.shadowColor='#bb82ff';ctx.shadowBlur=12;ctx.beginPath();ctx.ellipse(player.x-camera,player.y-pz-64,56,rabbitShield?78:68,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const m of monsters)if(m.respectTime>0&&!m.dead)label('존경 · 공격 −30%',m.x-camera,m.y-(m.isBoss?240:126),'#dfbaff',12);
}

function cancelCatCharge(){catCharge=null;}
function startCatCharge(input='keyboard'){
 if(scene!=='playing'||modal||player?.job!=='protester'||catCharge||catCastLock>0||swordUlt||guardTime>0||recovery)return false;
 const check=canUseSkill(player,'e',cooldowns.e);if(!check.ok){toast(check.message);return false;}
 catCharge={input,elapsed:0,skill:check.skill};combatMotion=null;walking=false;beep(420,.09);return true;
}
function releaseCatCharge(input='keyboard'){
 if(!catCharge||catCharge.input!==input)return false;
 const charge=catCharge;catCharge=null;
 const check=canUseSkill(player,'e',cooldowns.e);if(!check.ok)return false;
 const skill=check.skill,strength=clamp(charge.elapsed/skill.charge,0,1),distance=skill.range+(skill.maxRange-skill.range)*strength;
 player.mp-=skill.mp;cooldowns.e=skill.cooldown;
 catProjectiles.push({x:player.x+facing*20,y:player.y-82,toX:clamp(player.x+facing*distance,45,MAPS[player.map].width-45),toY:player.y-24,elapsed:0,duration:.35+strength*.2,skill});
 catCastLock=.28;playCombatMotion('catThrow',catCastLock);textAt(strength>.95?'최대 사거리!':'화염병!',player.x,player.y-156,'#ffb47b');beep(570,.18);refreshHUD();save();return true;
}
function catAreaHit(x,y,radius,damage,pull=0){
 for(const m of [...monsters])if(canTarget(m)&&Math.hypot(m.x-x,(m.y-y)*1.5)<radius){
  const before=m.hp;
  // Ballot hits pull inward instead of applying the normal outward hit knockback.
  hitMonster(m,Math.round(attackPower(player)*damage),pull?0:14);
  if(scene!=='playing')break;
  if(pull>0&&!m.dead&&m.hp>0&&m.hp<before){
   const dx=x-m.x,dy=y-m.y,distance=Math.hypot(dx,dy),step=Math.min(pull,distance);
   if(distance>0){m.x=clamp(m.x+dx/distance*step,60,MAPS[player.map].width-60);m.y=clamp(m.y+dy/distance*step,580,720);}
  }
 }
}
// Summons are encounter-only objects, never saved with the character.
function liveBallot(){return catBallot&&catBallot.hp>0&&catBallot.remaining>0?catBallot:null;}
function enemyTarget(m){
 const box=liveBallot();
 return box&&Math.hypot(m.x-box.x,(m.y-box.y)*1.5)<=box.skill.range?box:player;
}
function damageBallot(raw,source){
 const box=liveBallot();if(!box)return;
 const damage=Math.max(0,Math.round(raw*(source?.respectTime>0?.7:1)));
 box.hp=Math.max(0,box.hp-damage);box.hit=.18;
 textAt(`−${damage}`,box.x,box.y-95,'#ffc7a3');
 if(box.hp<=0){catBallot=null;effects.push({type:'ring',x:box.x,y:box.y-35,life:.35,max:.35,color:'#d6cbbb',size:65});textAt('투표함 파괴',box.x,box.y-125,'#e9d8c3');}
}
function updateCatCombat(dt){
 if(catCharge){catCharge.elapsed=Math.min(catCharge.skill.charge,catCharge.elapsed+dt);if(catCharge.elapsed>=catCharge.skill.charge)releaseCatCharge(catCharge.input);}
 for(const bottle of catProjectiles){bottle.elapsed+=dt;if(bottle.elapsed<bottle.duration)continue;
  catAreaHit(bottle.toX,bottle.toY,bottle.skill.radius,bottle.skill.damage);
  catFires.push({x:bottle.toX,y:bottle.toY,radius:bottle.skill.burnRadius,remaining:bottle.skill.burn,duration:bottle.skill.burn,tick:.5});
  effects.push({type:'ring',x:bottle.toX,y:bottle.toY,life:.48,max:.48,color:'#ffb565',size:bottle.skill.radius});shake=Math.max(shake,4);beep(155,.24,'sawtooth',.025);
 }
 catProjectiles=catProjectiles.filter(b=>b.elapsed<b.duration);
 for(const fire of catFires){fire.remaining-=dt;fire.tick-=dt;if(fire.tick<=0){fire.tick+=.5;catAreaHit(fire.x,fire.y,fire.radius,.43);}}
 catFires=catFires.filter(f=>f.remaining>0);
 if(catBallot){const ballot=catBallot;ballot.hit=Math.max(0,ballot.hit-dt);for(const [id,time] of ballot.contactCooldowns)ballot.contactCooldowns.set(id,Math.max(0,time-dt));ballot.remaining-=dt;ballot.tick-=dt;if(ballot.tick<=0){ballot.tick+=ballot.skill.tick;catAreaHit(ballot.x,ballot.y,ballot.skill.range,ballot.skill.damage,ballot.skill.pull);}if(catBallot===ballot&&ballot.remaining<=0)catBallot=null;}
}
// Chick combat state lives only in this encounter; no invisible/stunned save states.
const chickStunned=m=>!!m&&!m.dead&&((m.stunTime||0)>0||!!m.hack);
function bossPerception(){
 if(!boss)return {x:player.x,y:player.y,facing,hidden:false};
 const target=enemyTarget(boss);
 if(target!==player)return {x:target.x,y:target.y,facing,hidden:false,safetyTarget:player};
 if(chickStealth<=0)boss.lastSeen={x:player.x,y:player.y,facing};
 return {...(boss.lastSeen||{x:boss.x+boss.dir*250,y:boss.y,facing}),hidden:chickStealth>0};
}
function cancelChickAim(){
 chickCharge=null;
 if(hackerUlt?.phase==='channeling'){const m=monsters.find(m=>m.id===hackerUlt.targetId);if(m)m.hack=null;}
 hackerUlt=null;keys?.delete('ArrowLeft');keys?.delete('ArrowRight');
}
function consumeStealth(){const multiplier=chickStealth>0?1.2:1;chickStealth=0;return multiplier;}
function chickBurst(m,size=90){
 effects.push({type:'impact',x:m.x,y:m.y-60,size,life:.32,max:.32,color:'#8bd8ff',accent:'#ffffff',glow:'#238dff',outline:'#286dc2'});
 effects.push({type:'ring',x:m.x,y:m.y-60,size,life:.3,max:.3,color:'#65baff'});
}
function chickPunch(strong){
 const skill=strong?effectiveSkill(player,'q'):null,boost=consumeStealth(),range=skill?.range||200,damage=Math.round(attackPower(player)*(skill?.damage||1)*boost);
 attackTimer=strong?.4:.32;playCombatMotion(strong?'chickScratch':'chickPunch',attackTimer);
 effects.push({type:strong?'claw':'windSwing',x:player.x+facing*(strong?80:45),y:player.y-60-pz,size:strong?95:155,dir:facing,life:.3,max:.3,color:'#fff5cb',accent:'#ffffff',glow:'#f1dca2',outline:'#857046'});
 for(const m of [...monsters])if(canTarget(m)&&Math.abs(m.y-player.y)<(strong?95:72)&&(m.x-player.x)*facing>=-25&&(m.x-player.x)*facing<range&&pz<110){hitMonster(m,damage);if(scene!=='playing'||modal)break;}
 beep(360,.12);refreshHUD();
}
function chickCodeAttack(){
 const tokens=['hp--','0xFF','{ }','sudo','1010','</>','exec()','null'];
 attackTimer=.32;playCombatMotion('chickType',attackTimer);
 chickCodes.push({x:player.x,y:player.y,z:pz,origin:player.x,dir:facing,remaining:520,damage:Math.round(attackPower(player)*consumeStealth()),tokens:Array.from({length:3},()=>tokens[Math.floor(Math.random()*tokens.length)])});
 beep(650,.07);refreshHUD();
}
function castChick(key){
 if(key==='e'){startChickCharge('keyboard');return;}
 const check=canUseSkill(player,key,cooldowns[key]);if(!check.ok){toast(check.message);return;}
 const skill=check.skill;
 const target=key==='q'&&player.job==='hacker'?monsters.filter(m=>canTarget(m)&&Math.hypot(m.x-player.x,m.y-player.y)<=skill.range).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]:null;
 if(key==='q'&&player.job==='hacker'&&!target){toast('사거리 안에 해킹할 적이 없어요.');return;}
 if(key==='r'){
  const targets=hackCandidates();if(!targets.length){toast('현재 맵에 해킹할 적이 없어요.');return;}
  player.mp-=skill.mp;cooldowns.r=skill.cooldown;resetJump();keys.clear();combatMotion=null;
  hackerUlt={phase:'selecting',targetId:targets[0].id,skill,remaining:skill.selection};walking=false;
 }else{
  player.mp-=skill.mp;cooldowns[key]=skill.cooldown;
  if(key==='q'){if(target){facing=target.x>=player.x?1:-1;attackTimer=.4;playCombatMotion('chickType',.4);chickBurst(target);hitMonster(target,Math.round(attackPower(player)*skill.damage*consumeStealth()));beep(820,.13);}else chickPunch(true);}
  if(key==='w'){chickStealth=skill.duration;invincible=Math.max(invincible,skill.invulnerable);textAt('은신 · 이동속도 +50%',player.x,player.y-160,'#a0efdd');effects.push({type:'ring',x:player.x,y:player.y-40,life:.4,max:.4,color:'#a7ffe2',size:85});}
 }
 refreshHUD();save();
}
function startChickCharge(input='keyboard'){
 if(scene!=='playing'||modal||player?.job!=='hacker'||chickCharge||hackerUlt||attackTimer>0)return false;
 const check=canUseSkill(player,'e',cooldowns.e);if(!check.ok){toast(check.message);return false;}
 chickCharge={input,elapsed:0,skill:check.skill,dir:facing};refreshHUD();return true;
}
function chickArea(c=chickCharge){
 const d=Math.min(c.skill.maxRange,c.skill.range+c.skill.aimSpeed*Math.max(0,c.elapsed));
 return {x:clamp(player.x+c.dir*d,c.skill.width/2+45,MAPS[player.map].width-c.skill.width/2-45),y:clamp(player.y,580+Math.min(70,c.skill.height/2),720-Math.min(70,c.skill.height/2)),width:c.skill.width,height:c.skill.height};
}
function releaseChickCharge(input='keyboard'){
 if(!chickCharge||chickCharge.input!==input)return false;
 const c=chickCharge,area=chickArea(c);chickCharge=null;
 if(scene!=='playing'||modal)return false;
 const check=canUseSkill(player,'e',cooldowns.e);if(!check.ok)return false;
 player.mp-=c.skill.mp;cooldowns.e=c.skill.cooldown;const damage=Math.round(attackPower(player)*c.skill.damage*consumeStealth());
 playCombatMotion('chickHack',.5);effects.push({type:'hackZone',...area,life:.8,max:.8,color:'#9effe0',size:1});
 for(const m of [...monsters])if(canTarget(m)&&Math.abs(m.x-area.x)<=area.width/2&&Math.abs(m.y-area.y)<=area.height/2){
  // Control suppresses an active counter before the hacking payload lands.
  m.stunTime=Math.max(m.stunTime||0,c.skill.stun);m.walking=false;hitMonster(m,damage);
  if(scene!=='playing'||modal)break;
 }
 beep(780,.2);shake=Math.max(shake,4);refreshHUD();save();return true;
}
function hackCandidates(){return monsters.filter(canTarget).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y)||String(a.id).localeCompare(String(b.id)));}
function cycleHack(dir){
 if(hackerUlt?.phase!=='selecting')return;const list=hackCandidates().sort((a,b)=>a.x-b.x||a.y-b.y);
 if(!list.length){cancelChickAim();toast('해킹할 적이 사라졌어요.');return;}
 const i=list.findIndex(m=>m.id===hackerUlt.targetId);hackerUlt.targetId=list[(i+dir+list.length)%list.length].id;refreshHUD();
}
function confirmHack(){
 if(scene!=='playing'||modal||hackerUlt?.phase!=='selecting')return false;
 const u=hackerUlt,m=monsters.find(m=>m.id===u.targetId&&canTarget(m));
 if(!m){const list=hackCandidates();if(list.length){u.targetId=list[0].id;toast('대상이 바뀌었어요. 다시 확정하세요.');}else cancelChickAim();return false;}
 u.phase='channeling';u.remaining=u.skill.duration;const boost=consumeStealth();
 m.hack={remaining:u.skill.duration,tick:u.skill.tick,damage:Math.round(attackPower(player)*u.skill.damage*boost)};m.walking=false;
 textAt('해킹당함!',m.x,m.y-(m.isBoss?240:140),'#9cffe1');beep(550,.25);keys.clear();refreshHUD();return true;
}
function updateChickCombat(dt){
 chickStealth=Math.max(0,chickStealth-dt);
 for(const shot of [...chickCodes]){
  const from=shot.x,step=Math.min(shot.remaining,760*dt);shot.x+=shot.dir*step;shot.remaining-=step;
  const target=monsters.filter(m=>canTarget(m)&&Math.abs(m.y-shot.y)<60&&shot.z<110&&(m.x-shot.origin)*shot.dir>=0&&(m.x-shot.origin)*shot.dir<=520&&m.x>=Math.min(from,shot.x)-18&&m.x<=Math.max(from,shot.x)+18).sort((a,b)=>(a.x-b.x)*shot.dir)[0];
  if(target){shot.remaining=0;chickBurst(target,38);hitMonster(target,shot.damage);if(scene!=='playing'||modal)return;}
 }
 chickCodes=chickCodes.filter(s=>s.remaining>0&&s.x>=0&&s.x<=MAPS[player.map].width);

 for(const m of [...monsters]){
  m.stunTime=Math.max(0,(m.stunTime||0)-dt);
  if(m.dead){m.stunTime=0;m.hack=null;continue;}
  if(m.hack){const h=m.hack,step=Math.min(dt,h.remaining);h.remaining=Math.max(0,h.remaining-step);h.tick-=step;
   while(h.tick<=1e-8){h.tick+=.5;if(canTarget(m))hitMonster(m,h.damage);if(scene!=='playing'||modal)return;if(m.dead)break;}
   if(h.remaining<=1e-8||m.dead)m.hack=null;
  }
 }
 if(chickCharge){chickCharge.elapsed=Math.min(chickCharge.skill.charge,chickCharge.elapsed+dt);if(chickCharge.elapsed>=chickCharge.skill.charge)releaseChickCharge(chickCharge.input);}
 if(hackerUlt){
  const u=hackerUlt;u.remaining=Math.max(0,u.remaining-dt);
  if(u.phase==='selecting'){
   const list=hackCandidates();if(!list.length){cancelChickAim();return;}
   if(!list.some(m=>m.id===u.targetId))u.targetId=list[0].id;
   if(u.remaining<=0){cancelChickAim();toast('대상 선택 시간이 끝났어요.');}
  }else if(u.remaining<=0||!monsters.some(m=>m.id===u.targetId&&!m.dead&&m.hack))cancelChickAim();
 }
}
// Per-pose source bounds exclude adjacent rows; generated art is not a uniform grid.
const CHICK_ACTION_FRAMES=[[61, 50, 269, 320, 181, 370], [405, 35, 292, 317, 543, 352], [769, 42, 267, 342, 905, 384], [1133, 68, 263, 304, 1267, 372], [60, 404, 269, 320, 181, 724], [419, 391, 261, 312, 543, 703], [774, 397, 259, 337, 905, 734], [1133, 423, 264, 306, 1267, 729], [60, 746, 266, 326, 181, 1072], [405, 744, 309, 320, 543, 1064], [759, 746, 268, 321, 905, 1067], [1108, 747, 315, 320, 1267, 1067]];
function chickFrame(){
 if(hackerUlt)return 12+Math.floor(worldTime*(hackerUlt.phase==='channeling'?28:10))%3;
 const jumpPose=jumpFrame();if(jumpPose>=0)return 24+(player.job==='hacker'?4:0)+[0,1,1,2,2,3][jumpPose];
 if(combatMotion?.kind==='chickType')return walking?20+Math.floor(walkPhase*4)%4:16+Math.floor(combatMotion.elapsed*16)%4;
 if(chickCharge||combatMotion?.kind==='chickHack')return 11;
 if(hurtTime>0)return 15;
 if(['chickPunch','chickScratch'].includes(combatMotion?.kind))return (combatMotion.kind==='chickScratch'?34:32)+(combatMotion.elapsed/combatMotion.duration<.3?0:1);
 if(walking)return player.job==='hacker'?[9,8,10,8][Math.floor(walkPhase*4)%4]:[1,2,3,2][Math.floor(walkPhase*4)%4];
 return player.job==='hacker'?8:0;
}
function drawChickPlayer(){
 const pose=chickFrame(),action=pose>=24,typing=pose>=16&&pose<24,img=images[action?'chick-actions':typing?'chick-typing':'chick-motion'];if(!img?.complete||!img.naturalWidth)return;
 const frame=typing?pose-16:pose,cw=img.naturalWidth/4,ch=img.naturalHeight/(typing?2:4),height=138,x=combatDisplayX()-camera,y=player.y;
 ctx.save();ctx.fillStyle='#03162560';ctx.beginPath();ctx.ellipse(x,y+3,28,7,0,0,Math.PI*2);ctx.fill();ctx.translate(x,y-pz);ctx.scale(typing&&walking?facing:combatMotion?.dir??chickCharge?.dir??facing,1);
 ctx.globalAlpha=chickStealth>0?.38:invincible>0&&Math.floor(invincible*13)%2===0?.6:1;
 if(chickStealth>0){ctx.shadowColor='#9affe2';ctx.shadowBlur=10;}
 const furious=hackerUlt?.phase==='channeling';
 const bob=furious?Math.sin(worldTime*45)*1.6:walking?Math.abs(Math.sin(walkPhase*Math.PI*4))*2:0;
 if(action){const [sx,sy,sw,sh,anchorX,feetY]=CHICK_ACTION_FRAMES[pose-24],scale=146/362;ctx.drawImage(img,sx,sy,sw,sh,(sx-anchorX)*scale,(sy-feetY)*scale-bob,sw*scale,sh*scale);}else ctx.drawImage(img,frame%4*cw,Math.floor(frame/4)*ch,cw,ch,-height/2,-height+5-bob,height,height);
 if(furious){
  ctx.fillStyle='#8bdcff';ctx.strokeStyle='#e0fbff';ctx.lineWidth=2;
  for(let i=0;i<4;i++){const t=(worldTime*2.5+i*.23)%1,sx=(i%2?1:-1)*(32+t*15),sy=-107+t*32;ctx.beginPath();ctx.moveTo(sx,sy-7);ctx.quadraticCurveTo(sx+6,sy+5,sx,sy+5);ctx.quadraticCurveTo(sx-6,sy+5,sx,sy-7);ctx.fill();}
  for(let i=0;i<3;i++){const sx=-28+i*23;ctx.beginPath();ctx.moveTo(sx,-43);ctx.lineTo(sx+Math.sin(worldTime*50+i)*9,-32);ctx.stroke();}
 }
 ctx.restore();
 if(furious)label('타다다다닥! 💦',x,y-pz-178,'#b7efff',14);
 drawPlayerName(player.name,x,y-pz-height-14,'#fff2b7');
}
// The frame always matches the actual hit rectangle; particles only decorate its edges.
function drawHackGrid(width,height,progress,charging){
 const l=-width/2,t=-height/2,p=clamp(progress,0,1),phase=worldTime*(charging?1.1:2.4);
 ctx.save();ctx.shadowColor='#32efc4';ctx.shadowBlur=charging?8:18;
 const glow=ctx.createLinearGradient(0,t,0,-t);glow.addColorStop(0,'#041c3288');glow.addColorStop(.5,charging?'#1aaf9140':'#38ffce66');glow.addColorStop(1,'#061c3988');ctx.fillStyle=glow;ctx.fillRect(l,t,width,height);
 ctx.strokeStyle=charging?'#62efc65c':'#98ffe699';ctx.lineWidth=1;
 for(let x=l+24;x<width/2;x+=24){ctx.beginPath();ctx.moveTo(x,t);ctx.lineTo(x,-t);ctx.stroke();}
 for(let y=t+22;y<height/2;y+=22){ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(-l,y);ctx.stroke();}
 const scan=t+((phase%1)+1)%1*height;ctx.fillStyle='#8fffe535';ctx.fillRect(l,scan-5,width,10);ctx.strokeStyle='#b5fff0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(l,scan);ctx.lineTo(-l,scan);ctx.stroke();
 ctx.strokeStyle='#65ffe0';ctx.lineWidth=1;ctx.strokeRect(l,t,width,height);
 ctx.strokeStyle='#e4fff8';ctx.lineWidth=3;
 for(const sx of [-1,1])for(const sy of [-1,1]){const x=sx*width/2,y=sy*height/2;ctx.beginPath();ctx.moveTo(x-sx*20,y);ctx.lineTo(x,y);ctx.lineTo(x,y-sy*16);ctx.stroke();}
 ctx.font='bold 11px monospace';ctx.textAlign='left';
 const codes=['0xA7','0101','root','0xFF','exec','1010'];
 for(let i=0;i<6;i++){const x=l+12+(i%3)*(width-30)/3,y=t+18+((phase*27+i*29)%(height-30));ctx.fillStyle=i%2?'#9de0ffbb':'#9dffe5cc';ctx.fillText(codes[(i+Math.floor(phase))%codes.length],x,y);}
 if(!charging){
  ctx.strokeStyle='#8bddff';ctx.lineWidth=2;const spread=1+p*.23;ctx.strokeRect(l*spread,t*spread,width*spread,height*spread);
  for(let i=0;i<14;i++){const x=Math.sin(i*17.3)*width*.5,y=Math.cos(i*9.7)*height*.5;ctx.fillStyle=i%2?'#a5ffd9':'#80bfff';ctx.fillRect(x*(1+p*.6),y*(1+p*.9)-p*30,5+(i%3)*3,3);}
  ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillStyle='#effff9';ctx.fillText('> SYSTEM HALTED_',0,-height/2-12-p*12);
 }
 ctx.restore();
}
function drawChickEffects(){
 ctx.save();
 ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.shadowColor='#298bff';ctx.shadowBlur=9;
 for(const shot of chickCodes)shot.tokens.forEach((token,i)=>{ctx.globalAlpha=1-i*.23;ctx.fillStyle=i?'#7ccaff':'#e0f7ff';ctx.fillText(token,shot.x-camera-shot.dir*i*32,shot.y-62-shot.z+(i%2?9:-6));});
 ctx.globalAlpha=1;ctx.shadowBlur=0;
 if(chickCharge){const a=chickArea();ctx.save();ctx.translate(a.x-camera,a.y);drawHackGrid(a.width,a.height,chickCharge.elapsed/chickCharge.skill.charge,true);ctx.restore();label(`SYSTEM LOCK · ${Math.round(chickCharge.elapsed/chickCharge.skill.charge*100)}%`,a.x-camera,a.y-a.height/2-23,'#b4ffe4',13);}
 for(const m of monsters){
  if(!chickStunned(m))continue;const x=m.x-camera,height=m.isBoss?(isTypeA(m)?TYPE_A.height:180):72+m.level*3;
  ctx.strokeStyle='#95ffdc';ctx.lineWidth=2;
  for(let i=0;i<8;i++){const offset=Math.sin(worldTime*27+i*13)*55,y=m.y-height+i*height/8;ctx.fillStyle=i%2?'#a4ffe7aa':'#b7a1ff99';ctx.fillRect(x+offset-22,y,25+(i%3)*12,3);}
  label(m.hack?'해킹당함!':'시스템 정지',x,m.y-height-47,'#adffe7',14);
 }
 if(hackerUlt){const m=monsters.find(m=>m.id===hackerUlt.targetId&&!m.dead);if(m){
  const x=m.x-camera,height=m.isBoss?(isTypeA(m)?TYPE_A.height:180):72+m.level*3,y=m.y-height-85+Math.sin(worldTime*6)*5;
  ctx.fillStyle='#c4ffe8';ctx.shadowColor='#6cfbdb';ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(x-18,y);ctx.lineTo(x+18,y);ctx.lineTo(x,y+22);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  label(hackerUlt.phase==='selecting'?`대상 · Lv.${m.level} · HP ${Math.ceil(m.hp)}`:'해킹 연결 중',x,y-24,'#c2ffe6',14);
 }}ctx.restore();
}

function attack(){
 if(chickCharge||hackerUlt||otterConcert)return;
 if(scene!=='playing'||modal||swordUlt||guardTime>0||recovery||attackTimer>0)return;
 if(catCharge||catCastLock>0)return;
 if(player.classId==='chick'){if(player.job==='hacker')chickCodeAttack();else chickPunch(false);return;}
 if(player.classId==='otter'){otterAttack();return;}
 if(player.classId==='rabbit'){rabbitAttack();return;}
 if(player.classId==='cat'){
  attackTimer=.31;playCombatMotion('catPunch',.31);effects.push({type:'claw',x:player.x+facing*62.4,y:player.y-67-pz,size:62.4,dir:facing,life:.18,max:.18,color:'#f8e9e7'});
  monsters.filter(m=>canTarget(m)&&Math.abs(m.y-player.y)<97.5&&Math.abs(m.x-player.x)<166.4&&(m.x-player.x)*facing>-32.5&&pz<110).forEach(m=>hitMonster(m,basicAttackPower(player)));
  beep(330,.06,'triangle');return;
 }
 const powered=isPowered(player),sword=player.job==='swordsman';attackTimer=powered?.24:.34;playCombatMotion(player.job==='swordsman'?'slash':'punch',attackTimer);attackImpactAt(player.x+facing*(powered?86:48),player.y-60-pz,powered?125:sword?86.4:72);
 if(player.job)effects.push(swingEffect(player.x,player.y-45-pz,powered?160:sword?120:100,.22));beep(300,.06,'triangle');
 monsters.filter(m=>!m.dead&&Math.abs(m.y-player.y)<(powered?105:sword?86.4:72)&&Math.abs(m.x-player.x)<(powered?195:sword?156:130)&&(m.x-player.x)*facing>-25&&pz<110).forEach(m=>hitMonster(m,basicAttackPower(player)));
}
function cast(key){
 if(hackerUlt||chickCharge||otterConcert)return;
 if(scene!=='playing'||modal||swordUlt||guardTime>0||recovery)return;
 if(player.classId==='chick'){castChick(key);return;}
 if(player.classId==='otter'){castOtter(key);return;}
 if(player.classId==='rabbit'){castRabbit(key);return;}
 if(player.classId==='cat'){
  if(catCharge||catCastLock>0)return;
  if(key==='e'){startCatCharge('keyboard');return;}
  const check=canUseSkill(player,key,cooldowns[key]);if(!check.ok){toast(check.message);return;}
  const skill=check.skill;player.mp-=skill.mp;cooldowns[key]=skill.cooldown;
  if(key==='q'){
   attackTimer=Math.max(attackTimer,.36);playCombatMotion('catClaw',.36);
   effects.push({type:'claw',x:player.x+facing*95,y:player.y-67-pz,size:skill.range*.74,dir:facing,life:.32,max:.32,color:'#f9c7d0'});
   monsters.filter(m=>canTarget(m)&&Math.abs(m.y-player.y)<105&&Math.abs(m.x-player.x)<skill.range&&(m.x-player.x)*facing>-25).forEach(m=>hitMonster(m,Math.round(attackPower(player)*skill.damage)));
   beep(620,.12,'sawtooth',.018);
  }else if(key==='w'){
   const from=player.x;player.x=clamp(from-facing*skill.dash,45,MAPS[player.map].width-45);jumpScale=jumpHeightMultiplier(player);pz=20*jumpScale;pvz=500*jumpScale;jumpPrep=0;jumpLanding=0;invincible=Math.max(invincible,skill.invulnerable);
   playCombatMotion('catBack',.34);effects.push({type:'dash',x:from,y:player.y-45,toX:player.x,toY:player.y-45,life:.35,max:.35,color:'#d9eaf5',accent:'#fff',outline:'#62778d',glow:'#e6f3ff',travelDuration:.28});
   beep(720,.12);
  }else if(key==='r'){
   catCastLock=.3;playCombatMotion('catBallot',catCastLock);
   catBallot={x:clamp(player.x+facing*58,45,MAPS[player.map].width-45),y:player.y,hp:skill.hp,maxHp:skill.hp,hit:0,contactCooldowns:new Map(),remaining:skill.duration,skill,tick:.05};effects.push({type:'ring',x:catBallot.x,y:catBallot.y-20,life:.7,max:.7,color:'#fff3d8',size:skill.range});
   textAt('부정선거',catBallot.x,catBallot.y-165,'#ffe7cf');beep(520,.3,'triangle');
  }
  refreshHUD();save();return;
 }
 if(key==='r'&&player.job==='swordsman'){startSwordCharge('keyboard');return;}
 const check=canUseSkill(player,key,cooldowns[key]);if(!check.ok){toast(check.message);return;}
 const skill=check.skill;player.mp-=skill.mp;cooldowns[key]=skill.cooldown;
 if(key==='r'){
  player.powerTime=POWER_DURATION;combatMotion=null;attackImpactAt(player.x,player.y-100,210);invincible=Math.max(invincible,1.5);shake=10;
  // Existing Q/W/E cooldowns immediately benefit from the awakening too.
  for(const k of ['q','w','e'])cooldowns[k]*=.5;
  effects.push({type:'ring',x:player.x,y:player.y-45,life:.9,max:.9,...FX_PALETTES.builder,size:skill.range});
  monsters.filter(m=>!m.dead&&Math.hypot(m.x-player.x,(m.y-player.y)*1.4)<skill.range).forEach(m=>hitMonster(m,Math.round(attackPower(player)*skill.damage)));
  if(scene!=='playing')return;
  textAt('근육은 못 참지!',player.x,player.y-220,FX_PALETTES.builder.color);toast('12초간 근육 각성! Q · W · E가 모두 강화됩니다.');beep(150,.45,'sawtooth',.025);
 }else if(key==='e'&&skill.guard){
  combatMotion=null;walking=false;guardTime=skill.guard;textAt('막기',player.x,player.y-140,'#bdeeff');beep(650,.2);
 }else if(key==='e'){
  combatMotion=null;walking=false;recovery={remaining:skill.recovery,duration:skill.recovery,reduction:skill.reduction,moveSpeed:skill.moveSpeed,healTotal:maxHp(player)*skill.heal,healed:0};
  textAt('회복 · 피해 50% 감소',player.x,player.y-150,'#baffb1');effects.push({type:'ring',x:player.x,y:player.y-45,life:.7,max:.7,color:'#baffb1',size:isPowered(player)?150:75});beep(750,.3);
 }else{
  const startX=player.x;if(key==='w'){walking=false;player.x=clamp(player.x+facing*skill.dash,45,MAPS[player.map].width-45);invincible=Math.max(invincible,isPowered(player)?1:.55);}
  attackTimer=Math.max(attackTimer,.3);
  playCombatMotion(key==='w'?(player.job==='swordsman'?'draw':player.job==='bodybuilder'?'shoulder':'belly'):(player.job==='swordsman'?'slash':'punch'),key==='w'?.3:.42,key==='w'?{fromX:startX,toX:player.x}:{});
  // Untrained punches and belly dashes use their body animation without elemental effects.
  if(player.job){
   if(key==='w'){
    const route={fromX:startX,toX:player.x,duration:.3*.82},y=player.y-45-pz;
    effects.push({type:'dash',x:startX,y,toX:player.x,toY:y,life:.42,max:.42,...attackPalette(),sword:player.job==='swordsman',travelDuration:route.duration});
    const bolt=attackImpactAt(startX,y,isPowered(player)?105:65);bolt.followDash=route;bolt.life=bolt.max=.34;
   }else{
    attackImpactAt(player.x+facing*45,player.y-60-pz,isPowered(player)?170:110);
    effects.push(swingEffect(player.x,player.y-45-pz,skill.range,.38));
   }
  }
  monsters.filter(m=>!m.dead&&Math.abs(m.y-player.y)<(isPowered(player)?135:player.job==='swordsman'&&key==='q'?114:95)&&Math.abs(m.x-startX)<skill.range&&(m.x-startX)*facing>-25).forEach(m=>hitMonster(m,Math.round(attackPower(player)*skill.damage)));
  if(scene!=='playing')return;
  shake=isPowered(player)?5:3;beep(500,.22,'sawtooth',.025);
 }
 refreshHUD();save();
}
function drinkPotion(allowModal=false){useInventoryItem('potions',allowModal);}
// Counter punishes each landed attack, including attacks with offensive invulnerability.
function reflectBossAttack(b,rawDamage){
 const damage=playerDamage(rawDamage,b);
 player.hp=Math.max(0,player.hp-damage);hurtTime=.32;shake=Math.max(shake,8);
 textAt('반격!',b.x,b.y-190,'#ffffff');textAt(`−${damage} · 반격`,player.x,player.y-120,'#ffffff');
 effects.push({type:'blink',x:b.x,y:b.y-85,toX:player.x,toY:player.y-55,life:.22,max:.22,color:'#ffffff',size:1});
 beep(155,.12,'square',.022);
 if(player.hp<=0){die();return;}
 refreshHUD();save();
}
function hitMonster(m,damage,knockback=14){if(scene!=='playing'||!canTarget(m))return;if(m.isBoss){if(m!==boss)return;if(isTypeA(m)){const dealt=damageTypeA(m,damage,player);textAt(String(dealt),m.x,m.y-300,'#ffbdad');if(m.hp<=0)winBoss();return;}const reflected=chickStunned(m)?0:counterDamage(m,damage);if(reflected){reflectBossAttack(m,reflected);return;}m.hp=Math.max(0,m.hp-damage);m.hit=.16;textAt(String(damage),m.x,m.y-180,!player.job?'#e0e5e8':player.job==='bodybuilder'?FX_PALETTES.builder.color:undefined);if(m.hp<=0)winBoss();return;}m.hp-=damage;m.hit=.28;m.hitDir=facing;if(!chickStunned(m))m.x=clamp(m.x+facing*knockback,60,MAPS[player.map].width-60);textAt(String(damage),m.x,m.y-90,!player.job?'#e0e5e8':player.job==='bodybuilder'?FX_PALETTES.builder.color:undefined);if(player.classId==='rabbit')effects.push({type:'ring',x:m.x,y:m.y-45,life:.22,max:.22,color:'#d5a6ff',size:48});else attackImpactAt(m.x,m.y-38,42);shake=Math.max(shake,isPowered(player)?5:2.5);if(player.job)effects.push({type:'spark',x:m.x,y:m.y-38,life:.2,max:.2,color:player.job==='hacker'?'#a7ffe2':player.job==='mage'?'#d8baff':player.job==='bodybuilder'?FX_PALETTES.builder.accent:'#ffd79a',size:25});if(m.hp>0)return;m.dead=true;m.deathFx=.28;m.respawnIn=12;player.kills++;drops.push({x:m.x-17,y:m.y+6,type:'money',amount:14+m.level*8,life:60},{x:m.x+20,y:m.y-3,type:m.level>=4?'cores':'scrap',amount:1,life:60});if(Math.random()<.22)drops.push({x:m.x+4,y:m.y+23,type:'potions',amount:1,life:60});const gained=gainXp(player,12+m.level*7);if(gained){textAt(`LEVEL UP · ${player.level}`,player.x,player.y-155,'#b8ffe3');const unlocked=skillsFor(player).filter(s=>skillUnlocked(player,s)&&s.level>player.level-gained);toast(`Lv. ${player.level} 달성! HP·MP 완전 회복${unlocked.length?' · '+unlocked.map(s=>s.key.toUpperCase()+' '+s.name).join(', ')+' 습득':''}${!player.job&&player.level>=10&&player.level-gained<10?(['chick','otter'].includes(player.classId)?' · 메이플아지트에서 전직 가능':player.classId==='rabbit'?' · 마구리에게 전직 가능':player.classId==='cat'?' · 올림픽공원에서 전직 가능':' · 헬스장/검도장에서 전직 가능'):''}`);effects.push({type:'ring',x:player.x,y:player.y-40,life:1,max:1,color:'#ffe6a6',size:160});beep(900,.45);}save();}
function die(){if(scene!=='playing')return;closeModal();setScene('dead');beep(130,.5,'triangle');screens.innerHTML=`<div class="screen-overlay"><div class="death-symbol">☾</div><h2 class="screen-title">잠시, 숨을 고를 시간</h2><p class="screen-subtitle">괜찮아요. 돈과 아이템은 그대로입니다.<br>마을에서 다시 모험을 시작해 보세요.</p><button class="primary" id="revive">마을에서 부활하기</button></div>`;respawn(player);save();$('#revive').onclick=()=>{resetWorld();setScene('playing');screens.innerHTML='';buildHUD();canvas.focus();toast('체력과 MP가 모두 회복되었어요. 다시 출발해 볼까요?');};}
function update(dt){
 walking=false;worldTime+=dt;if(scene!=='playing'||modal||document.hidden)return;
 // Apply recovery slow and cast locks only to their active fraction of this frame.
 const moveDt=Math.max(0,dt-(1-(recovery?.moveSpeed??1))*Math.min(dt,recovery?.remaining||0)-Math.min(dt,catCharge?dt:catCastLock));
 catCastLock=Math.max(0,catCastLock-dt);
 player.mpPotionCooldown=Math.max(0,(player.mpPotionCooldown||0)-dt);
 if(bossActive())potionCooldown=Math.max(0,potionCooldown-dt);
 guardTime=Math.max(0,guardTime-dt);updateCombat(dt);hurtTime=Math.max(0,hurtTime-dt);updateSword(dt);if(modal||scene!=='playing')return;
 if(invincible>0)invincible-=dt;if(attackTimer>0)attackTimer-=dt;for(const k in cooldowns)cooldowns[k]=Math.max(0,cooldowns[k]-dt);if(player.powerTime>0){player.powerTime=Math.max(0,player.powerTime-dt);if(player.powerTime===0){toast('평범한 펭귄으로 돌아왔어요.');save();}}shake=Math.max(0,shake-dt*20);if(swordUlt?.phase==='charging')shake=Math.max(shake,2+swordUlt.elapsed*.9);
 let dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);if(swordUlt||combatMotion?.fromX!==undefined){dx=0;dy=0;}if(hackerUlt||otterWave?.riding){dx=0;dy=0;}if(dx)facing=dx;const norm=Math.hypot(dx,dy)||1;
 const stepX=player.x,stepY=player.y,wasGrounded=pz===0&&pvz===0;
 player.x=clamp(player.x+dx/norm*285*movementMultiplier(player)*(chickStealth>0?1.5:1)*moveDt,45,MAPS[player.map].width-45);player.y=clamp(player.y+dy/norm*175*movementMultiplier(player)*(chickStealth>0?1.5:1)*moveDt,580,720);
 updateJump(dt);
 // Count only clamped keyboard movement, before dash, knockback or teleport effects.
 const stepDistance=Math.hypot(player.x-stepX,player.y-stepY);
 walking=wasGrounded&&jumpFrame()<0&&stepDistance>.001&&!swordUlt;
 if(walking)walkPhase=(walkPhase+stepDistance/(isPowered(player)?220:165))%1;
 if(keys.has('KeyA')&&!swordUlt)attack();if(modal||scene!=='playing')return;
 const townRegen=['town','gangnam','yeoksamStreet'].includes(player.map)?2:1;
 player.mp=Math.min(maxMp(player),player.mp+dt*(player.map==='gym'?6:2.2)*townRegen);if(!MAPS[player.map].danger&&!bossActive())player.hp=Math.min(maxHp(player),player.hp+dt*(player.map==='gym'?12:6)*townRegen);
 updateRabbit(dt);if(scene!=='playing'||modal)return;
 updateOtterCombat(dt);if(scene!=='playing'||modal)return;
 updateCatCombat(dt);if(scene!=='playing')return;
 updateChickCombat(dt);if(scene!=='playing'||modal)return;
 updateBossFight(dt);if(scene!=='playing'||modal)return;
 for(const m of monsters){if(m.isBoss)continue;if(m.dead){m.deathFx=Math.max(0,(m.deathFx||0)-dt);m.respawnIn-=dt;if(m.respawnIn<=0&&Math.abs(m.home-player.x)>230){m.dead=false;m.hp=m.maxHp;m.x=m.home;m.hit=0;m.deathFx=0;}continue;}m.hit=Math.max(0,m.hit-dt);if(chickStunned(m))continue;const target=enemyTarget(m),taunted=target!==player,distance=Math.hypot(target.x-m.x,(target.y-m.y)*1.5);if((taunted||chickStealth<=0)&&distance<(taunted?target.skill.range:380)&&distance>28){m.dir=target.x>m.x?1:-1;m.x+=Math.sign(target.x-m.x)*m.speed*dt;m.y=clamp(m.y+Math.sign(target.y-m.y)*m.speed*.33*dt,580,720);}else if(!taunted&&(chickStealth>0||distance>=380)){patrolMonster(m,player.map,dt);}
 if(taunted){
  if(Math.hypot(target.x-m.x,(target.y-m.y)*1.5)<55&&Math.abs(m.y-target.y)<34&&!(target.contactCooldowns.get(m.id)>0)){target.contactCooldowns.set(m.id,1.1);damageBallot(m.attack,m);}
  continue;
 }
 if(chickStealth<=0&&distance<55&&Math.abs(m.y-player.y)<34&&pz<48&&invincible<=0){if(guardTime>0)continue;const damage=playerDamage(m.attack,m,'physical');player.hp=Math.max(0,player.hp-damage);hurtTime=.32;invincible=1.1;shake=4;player.x=clamp(player.x+(player.x>=m.x?27:-27),45,MAPS[player.map].width-45);textAt(`−${damage}`,player.x,player.y-105,'#ff9b91');beep(120,.13,'square',.018);if(player.hp<=0){die();return;}}
 }
 for(const drop of drops){drop.life-=dt;const distance=Math.hypot(drop.x-player.x,(drop.y-player.y)*1.6);if(distance<100){drop.x+=(player.x-drop.x)*dt*9;drop.y+=(player.y-drop.y)*dt*9;if(distance<32){player[drop.type]+=drop.amount;drop.life=0;const labels={money:'원',scrap:' 로봇 부품',cores:' 에너지 코어',potions:' 감자칩'};textAt(`+${drop.amount}${labels[drop.type]}`,player.x,player.y-100,drop.type==='money'?'#ffe1a1':'#a6ecdf');beep(850,.05);save();}}}
 drops=drops.filter(d=>d.life>0);effects.forEach(e=>e.life-=dt);effects=effects.filter(e=>e.life>0);texts.forEach(t=>{t.life-=dt;t.y-=dt*30;});texts=texts.filter(t=>t.life>0);
 updateCamera(dt);
 interactionTarget=findInteraction();saveClock+=dt;if(saveClock>4){saveClock=0;save();}lastHud+=dt;if(lastHud>.1){lastHud=0;refreshHUD();}
}
function roundedRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function label(text,x,y,color='#edf5df',size=16){ctx.font=`500 ${size}px "IBM Plex Sans KR", sans-serif`;ctx.textAlign='center';const width=ctx.measureText(text).width;roundedRect(x-width/2-10,y-15,width+20,27,5,'#0a2334d9');ctx.fillStyle=color;ctx.fillText(text,x,y+4);}
const PLAYER_POSES={
 normal:{asset:'penguin',crop:[274,156,726,965],grip:[375,817],hand:27},
 hurt:{asset:'penguin-hurt',crop:[274,156,726,965],grip:[375,817],hand:27},
 power:{asset:'penguin-power-poses',crop:[145,9,676,870],grip:[248,636],hand:35},
 powerHurt:{asset:'penguin-power-poses',crop:[974,9,676,870],grip:[1077,636],hand:35}
};
const currentPlayerPose=()=>PLAYER_POSES[isPowered(player)?(hurtTime>0?'powerHurt':'power'):(hurtTime>0?'hurt':'normal')];
function sprite(name,x,y,w,h,{flip=false,tint='',alpha=1,bob=0,crop:customCrop=null}={}){
 const pose=PLAYER_POSES[name],img=pose?characterImage(pose.asset):images[name];if(!img?.complete||!img.naturalWidth)return;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y-bob);if(flip)ctx.scale(-1,1);ctx.filter=tint;
 // Crop only at render time; the original transparent artwork remains untouched.
 const crop=customCrop??pose?.crop??(name==='penguin'?[278,161,717,956]:name==='penguin-power'?[49,53,1180,1173]:name==='npc-hyuntori-white'?[265,127,737,1046]:name==='npc-maguri-large-crate'?MAGURI_CROP:null);
 if(crop){ctx.imageSmoothingEnabled=true;ctx.drawImage(img,...crop,-w/2,-h,w,h);}else ctx.drawImage(img,-w/2,-h,w,h);
 ctx.restore();
}
function drawBackground(mapId){
 const isPlay=['playing','dead'].includes(scene)&&player,map=MAPS[mapId],useAtlas=isPlay&&Number.isInteger(map.backgroundTile),img=isPlay&&map.background?images[map.background]:useAtlas?images.districts:images.city;
 if(!img?.complete||!img.naturalWidth){ctx.fillStyle='#153644';ctx.fillRect(0,0,screenWidth,810);return;}
 ctx.save();
 const source=useAtlas?[(map.backgroundTile%2)*img.naturalWidth/2,Math.floor(map.backgroundTile/2)*img.naturalHeight/2,img.naturalWidth/2,img.naturalHeight/2]:[0,0,img.naturalWidth,img.naturalHeight];
 if(!isPlay){const width=Math.max(screenWidth,1215);ctx.drawImage(img,...source,(screenWidth-width)/2,0,width,810);}
 else{
  // Street, actors and all scene extensions share the exact same camera transform.
  const tile=1600,off=-camera,pad=(24+shake)/cameraZoom,width=viewWidth();
  const top=(-viewOffsetY()-pad)/cameraZoom,bottom=(810-viewOffsetY()+pad)/cameraZoom;
  const start=Math.floor((camera-pad)/tile)*tile-tile;
  for(let x=start;x+off<width+pad;x+=tile){
   const edge=Math.max(1,source[3]*.025);
   // Extend the existing sky/pavement edge textures instead of exposing empty zoom borders.
   if(top<0)ctx.drawImage(img,source[0],source[1],source[2],edge,x+off,top,tile,-top+1);
   if(bottom>810)ctx.drawImage(img,source[0],source[1]+source[3]-edge,source[2],edge,x+off,809,tile,bottom-809);
   ctx.drawImage(img,...source,x+off,0,tile,810);
  }
  if(top<0){const skyFade=ctx.createLinearGradient(0,top,0,0);skyFade.addColorStop(0,'#092333');skyFade.addColorStop(.78,'#092333');skyFade.addColorStop(1,'#09233300');ctx.fillStyle=skyFade;ctx.fillRect(-pad,top,width+2*pad,-top);}
  if(map.tint){ctx.fillStyle=map.tint;ctx.fillRect(-pad,top,width+2*pad,bottom-top);}

 }
 ctx.restore();
}
function drawPortal(portal){
 const destination=MAPS[portal.to],x=portal.x-camera,y=portal.y,isBossPortal=!!destination?.boss,isSafePortal=!!destination&&!destination.danger&&!isBossPortal;
 const rgb=isBossPortal?'255,82,105':isSafePortal?'100,255,115':'122,239,214';
 ctx.save();ctx.shadowColor=isBossPortal?'#ff395d':isSafePortal?'#46ef71':'#6af6cf';ctx.shadowBlur=isBossPortal?34:26;
 for(let i=0;i<3;i++){ctx.strokeStyle=`rgba(${rgb},${.75-i*.2})`;ctx.lineWidth=4-i;ctx.beginPath();ctx.ellipse(x,y-48,35+i*5+Math.sin(worldTime*2+i)*3,68+i*3,0,0,Math.PI*2);ctx.stroke();}
 const glow=ctx.createRadialGradient(x,y-40,2,x,y-40,60);glow.addColorStop(0,isBossPortal?'#ff456640':isSafePortal?'#64ff7328':'#8fffe428');glow.addColorStop(1,isBossPortal?'#ff456600':isSafePortal?'#64ff7300':'#8fffe400');ctx.fillStyle=glow;ctx.fillRect(x-65,y-120,130,150);
 ctx.shadowBlur=0;ctx.strokeStyle=isBossPortal?'#ff718aaa':isSafePortal?'#83ff8875':'#9dedda75';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+19,48,12,0,0,Math.PI*2);ctx.stroke();
 label(portal.label,x,y-141,isBossPortal?'#ffb9c4':isSafePortal?'#c1ffc1':'#b9ffe7',16);label(isBossPortal?`보스방 · Lv.${destination.bossLevel||25}`:portal.level,x,y-112,isBossPortal?'#ff91a3':isSafePortal?'#a6f4ad':'#a9cbcf',12);ctx.restore();
}
function drawNPC(npc){
 const x=npc.x-camera,y=npc.y,isShop=npc.id==='shop',height=npc.height??(isShop?MAGURI_WIDTH*MAGURI_CROP[3]/MAGURI_CROP[2]:npc.id==='gm'?122:104),width=npc.width??(npc.crop?height*npc.crop[2]/npc.crop[3]:isShop?MAGURI_WIDTH:npc.id==='gm'?86:74);
 ctx.fillStyle='#041f2d55';ctx.beginPath();ctx.ellipse(x,y+2,npc.crop?width*.32:isShop?MAGURI_WIDTH*.44:25,isShop?4:8,0,0,Math.PI*2);ctx.fill();
 sprite(npc.asset||'player',x,y,width,height,{tint:npc.tint||'',crop:npc.crop});
 label(npc.name,x,y-height-18,'#ffdea6',15);label(npc.role,x,y-height-45,'#a2d9c8',12);
 ctx.fillStyle='#ffe7ad';ctx.font='bold 22px "Space Grotesk"';ctx.textAlign='center';ctx.fillText(npc.icon,x,y-height-67+Math.sin(worldTime*3)*3);
}
function drawMonster(m){
 if(m.dead&&!m.deathFx)return;const x=m.x-camera,y=m.y,size=72+m.level*3,recoil=m.dead?m.deathFx/.28:m.hit/.28,pulse=Math.sin(Math.PI*clamp(recoil,0,1)),dir=m.hitDir||1;
 ctx.fillStyle='#00182665';ctx.beginPath();ctx.ellipse(x,y+3,28,8,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(x,y);ctx.rotate(dir*(m.dead?(1-recoil)*.9:pulse*.18));ctx.scale(1+pulse*.13,1-pulse*.12);
 sprite('robot',dir*pulse*9,-pulse*7,size,size,{flip:m.dir<0,tint:(MAPS[player.map].robotTint||'')+(chickStunned(m)?' grayscale(1)':m.hit>.19?' brightness(1.65)':''),alpha:m.dead?recoil:1,bob:chickStunned(m)||recoil>0?0:Math.sin(worldTime*5+m.phase)*3});ctx.restore();
 if(m.dead)return;label(`Lv.${m.level} ${MAPS[player.map].monster||'로봇'}`,x,y-size-16,m.level>=4?'#e5c7ff':'#cfefeb',12);roundedRect(x-26,y-size+1,52,4,2,'#15343f');roundedRect(x-26,y-size+1,52*clamp(m.hp/m.maxHp,0,1),4,2,m.level>=4?'#b69bdd':'#85c9b4');
}
// Source rectangles include edge padding; per-pose anchors keep heads and planted feet registered.
// Normal walk frame 4 has extra side padding for the uniform sleeve; its world anchor stays fixed.
const WALK_SHEETS={
 normal:{name:'penguin-walk',frames:[
  [32,49,333,441,168.5,437],[444,49,282,442,140,438],[822,49,288,441,146,437],[1181,49,334,442,161,438],
  [51,551,291,429,149.5,425],[444,551,282,429,140.5,425],[828,551,282,429,140.5,425],[1195,551,292,429,147.5,425]
 ]},
 power:{name:'penguin-power-walk',frames:[
  [13,10,377,497,204.5,493],[407,12,348,495,176.5,491],[787,10,337,497,175,493],[1143,15,383,492,205,488],
  [11,520,382,490,203,486],[407,521,355,492,184,488],[793,521,328,492,169.5,488],[1142,523,390,488,208.5,484]
 ]}
};
function resetGait(){walking=false;walkPhase=0;}
function drawWalkSprite(powered,height,alpha){
 const sheet=WALK_SHEETS[powered?'power':'normal'],img=characterImage(sheet.name);
 if(!img?.complete||!img.naturalWidth)return false;
 const [sx,sy,sw,sh,anchorX,footY]=sheet.frames[Math.floor(walkPhase*8)%8],scale=height/(footY-3);
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;if(facing<0)ctx.scale(-1,1);
 ctx.drawImage(img,sx,sy,sw,sh,-anchorX*scale,-footY*scale,sw*scale,sh*scale);
 ctx.restore();return true;
}
// Per-pose anchors share an airborne baseline so tucked feet do not drag the torso down.
const JUMP_SHEETS={"normal":{"name":"penguin-jump","height":476,"frames":[{"crop":[62,106,401,400],"anchor":[267,496],"grip":[120,367],"hip":[231,447]},{"crop":[554,8,408,502],"anchor":[756,500],"grip":[607,242],"hip":[720,409]},{"crop":[1088,21,390,475],"anchor":[1305,500],"grip":[1148,263],"hip":[1269,406]},{"crop":[47,520,453,446],"anchor":[287,1002],"grip":[116,772],"hip":[251,885]},{"crop":[563,518,413,469],"anchor":[772,1002],"grip":[617,765],"hip":[736,889]},{"crop":[1079,598,400,414],"anchor":[1301,1002],"grip":[1143,888],"hip":[1265,953]}]},"power":{"name":"penguin-power-jump","height":493,"frames":[{"crop":[30,90,461,426],"anchor":[284,512],"grip":[86,307],"hip":[248,379]},{"crop":[551,9,455,507],"anchor":[793,512],"grip":[607,342],"hip":[757,331]},{"crop":[1046,8,469,507],"anchor":[1341,512],"grip":[1106,336],"hip":[1305,315]},{"crop":[24,514,501,447],"anchor":[287,987],"grip":[117,757],"hip":[251,824]},{"crop":[525,514,510,481],"anchor":[774,987],"grip":[566,746],"hip":[738,824]},{"crop":[1035,603,493,394],"anchor":[1310,987],"grip":[1090,895],"hip":[1274,871]}]}};
// Every jump drawing uses one body scale, so crouching compresses the pose rather than enlarging it.
function drawJumpSprite(powered,frame,height,alpha){
 const sheet=JUMP_SHEETS[powered?'power':'normal'],body=characterImage(sheet.name);
 if(!body?.complete||!body.naturalWidth)return null;
 const pose=sheet.frames[frame],source=pose.crop,grip=pose.grip,sx=height/sheet.height,sy=sx;
 const dx=(source[0]-pose.anchor[0])*sx,dy=(source[1]-pose.anchor[1])*sy;
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;if(facing<0)ctx.scale(-1,1);
 ctx.drawImage(body,...source,dx,dy,source[2]*sx,source[3]*sy);ctx.restore();
 return {source,grip,body,sx,sy,dx,dy,hand:powered?18:14,hipX:(pose.hip[0]-pose.anchor[0])*sx,hipY:(pose.hip[1]-pose.anchor[1])*sy};
}
// Grip locations track the near hand in each walking pose (original artwork pixels).
const WALK_GRIPS={normal:[[68,363],[480,381],[856,382],[1224,364],[202,844],[510,878],[892,879],[1355,846]],power:[[52,360],[460,363],[835,367],[1187,357],[52,858],[455,867],[842,870],[1186,853]]};
function drawEquipment(powered,activeWalk,height,width,alpha,jumpPose=null){
 const img=images['job-equipment'];if(!player.job||!img?.complete||!img.naturalWidth)return;
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;if(facing<0)ctx.scale(-1,1);
 const bob=!jumpPose&&!activeWalk&&scene==='playing'&&!modal&&!document.hidden&&pz===0?Math.sin(worldTime*2)*1.1:0;
 ctx.translate(0,-bob);
 if(player.job==='swordsman'){
  // A sheathed katana hangs from the hip; it follows the body, not the walking hand.
  ctx.translate(jumpPose?.hipX??-9,jumpPose?.hipY??-height*.37);ctx.rotate(1.6+(activeWalk?Math.sin(walkPhase*Math.PI*2)*.045:0));
  const scale=78/794;ctx.drawImage(img,688,218,517,794,-85*scale,-110*scale,517*scale,794*scale);
 }else if(player.job==='bodybuilder'){
  let source,grip,body,sx,sy,dx,dy;
  if(jumpPose){
   ({source,grip,body,sx,sy,dx,dy}=jumpPose);
  }else if(activeWalk){
   const type=powered?'power':'normal',frame=Math.floor(walkPhase*8)%8,sheet=WALK_SHEETS[type];
   source=sheet.frames[frame];grip=WALK_GRIPS[type][frame];body=characterImage(sheet.name);sx=sy=height/(source[5]-3);dx=-source[4]*sx;dy=-source[5]*sy;
  }else{
   const pose=currentPlayerPose();source=pose.crop;grip=pose.grip;body=characterImage(pose.asset);sx=width/source[2];sy=height/source[3];dx=-width/2;dy=-height;
  }
  const gx=dx+(grip[0]-source[0])*sx,gy=dy+(grip[1]-source[1])*sy,scale=(powered?61:35)/488;
  ctx.drawImage(img,72,416,488,467,gx-246*scale,gy-222*scale,488*scale,467*scale);
  // Put the existing hand back over the grip so the dumbbell is visibly held.
  const half=jumpPose?jumpPose.hand:activeWalk?(powered?13:10):currentPlayerPose().hand;
  ctx.drawImage(body,grip[0]-half,grip[1]-half,half*2,half*2,gx-half*sx,gy-half*sy,half*2*sx,half*2*sy);
 }
 ctx.restore();
}
// Normal combat crops include 8px padding; matching anchor offsets preserve the original pose positions.
const COMBAT_SHEETS={"combat-brawler":{"height":282,"frames":[[39,38,244,293,122,286],[345,44,288,288,129,280],[660,52,305,280,130,272],[1001,28,212,306,105,296],[34,374,263,266,127,260],[358,349,241,293,116,285],[651,371,318,255,139,263],[1001,336,212,307,105,298],[30,684,265,256,131,249],[325,695,294,243,149,238],[637,705,336,212,153,228],[1009,647,213,297,97,286],[45,944,262,294,116,285],[369,939,220,299,105,290],[659,972,256,263,131,257],[970,940,259,298,136,289]]},"combat-swordsman":{"height":282,"frames":[[31,6,306,392,138,384],[383,100,344,298,133,290],[744,132,417,271,117,258],[1119,104,317,294,121,286],[20,432,260,288,149,280],[353,438,295,280,163,274],[680,463,478,258,181,249],[1109,422,327,299,131,290],[8,673,303,391,161,383],[376,759,317,305,140,297],[733,793,313,270,128,263],[1105,760,335,304,135,296]]},"combat-power":{"height":347,"frames":[[39,22,338,345,149.0,335],[395,26,364,345,131.0,332],[759,42,343,325,120.25,314],[1141,14,291,360,145.75,345],[28,401,343,316,140.5,305],[391,415,336,298,107.5,286],[745,451,375,184,187.5,269],[1141,374,281,350,145.5,343],[62,724,281,350,130.25,339],[433,725,275,350,134.5,341],[790,741,278,333,138.25,325],[1143,723,281,352,143.5,343]]}};
// Crop and isolate each authored sprite once. The original atlases remain untouched;
// isolation removes neighboring swords that overlap a rectangular atlas cell.
const combatFrameCache=new WeakMap();
function isolatedCombatFrame(asset,index,img,frame){
 let frames=combatFrameCache.get(img);if(!frames){frames=new Map();combatFrameCache.set(img,frames);}
 const key=asset+index;if(frames.has(key))return frames.get(key);
 let result=null;
 try{
  const [sx,sy,w,h]=frame,c=document.createElement('canvas');c.width=w;c.height=h;const cctx=c.getContext('2d',{willReadFrequently:true});cctx.drawImage(img,sx,sy,w,h,0,0,w,h);
  const data=cctx.getImageData(0,0,w,h),pixels=data.data,seen=new Uint8Array(w*h);let largest=[];
  for(let p=0;p<seen.length;p++){if(seen[p]||pixels[p*4+3]<=32)continue;const stack=[p],component=[];seen[p]=1;while(stack.length){const q=stack.pop();component.push(q);const x=q%w,y=Math.floor(q/w);for(const n of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(n>=0&&!seen[n]&&pixels[n*4+3]>32){seen[n]=1;stack.push(n);}}if(component.length>largest.length)largest=component;}
  const keep=new Uint8Array(w*h);for(const p of largest){const x=p%w,y=Math.floor(p/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)keep[p+dy*w+dx]=1;}
  for(let p=0;p<keep.length;p++)if(!keep[p])pixels[p*4+3]=0;
  cctx.putImageData(data,0,0);result=c;
 }catch{}frames.set(key,result);return result;
}
function combatPose(){
 if(guardTime>0)return {kind:'guard',frame:guardTime>.9?0:hurtTime>0?2:1,dir:facing};
 if(swordUlt?.phase==='charging')return {kind:'draw',frame:0,dir:facing};
 if(combatMotion){const t=combatMotion.elapsed/combatMotion.duration;return {...combatMotion,frame:t<.12?0:t<.48?1:t<.82?2:3};}
 if(recovery)return {kind:'recover',frame:recovery.remaining>1.4?0:hurtTime>0?2:1,dir:facing};
 return null;
}
const dashProgress=(elapsed,duration)=>1-(1-clamp(elapsed/duration,0,1))**3;
function combatDisplayX(){
 if(combatMotion?.fromX===undefined)return player.x;
 const ease=dashProgress(combatMotion.elapsed,combatMotion.duration*.82);
 return player.x+(combatMotion.fromX-combatMotion.toX)*(1-ease);
}
const GUARD_WALK_SHEET={"height":348,"frames":[[14,117,367,352,169,351],[396,115,366,358,170,353],[780,116,368,359,171,352],[1168,118,357,352,166,350],[15,600,371,348,172,346],[396,597,368,352,170,349],[780,598,367,352,170,348],[1164,597,364,352,170,349]]};
function drawGuardWalk(height,alpha,dir){
 const img=characterImage('sword-guard-walk');if(!img?.complete||!img.naturalWidth)return false;
 const [sx,sy,w,h,anchor,feet]=GUARD_WALK_SHEET.frames[Math.floor(walkPhase*8)%8],scale=height/GUARD_WALK_SHEET.height;
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;if(dir<0)ctx.scale(-1,1);
 ctx.drawImage(img,sx,sy,w,h,-anchor*scale,-feet*scale,w*scale,h*scale);ctx.restore();return true;
}
const RECOVERY_WALK_SHEETS={"normal":{"name":"builder-recovery-walk","height":412.5,"frames":[[87,15,278,413,135.0,410],[531,15,276,417,134.5,414],[972,16,277,417,136.5,414],[1417,14,276,415,135.0,412],[78,456,287,410,144.0,407],[532,457,275,414,133.5,411],[972,455,277,417,136.5,414],[1418,456,277,413,134.0,410]]},"power":{"name":"power-recovery-walk","height":487,"frames":[[55,7,316,498,150.5,492],[437,8,306,501,142.0,495],[814,8,309,500,145.0,494],[1202,8,308,497,145.0,491],[52,514,325,497,151.5,491],[433,515,308,500,145.0,493],[813,515,310,500,145.5,493],[1201,515,315,499,146.5,492]]}};
function drawRecoveryWalk(powered,height,alpha,dir){
 const sheet=RECOVERY_WALK_SHEETS[powered?'power':'normal'],img=characterImage(sheet.name);
 if(!img?.complete||!img.naturalWidth)return false;
 const [sx,sy,w,h,anchor,feet]=sheet.frames[Math.floor(walkPhase*8)%8],scale=height/sheet.height;
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;if(dir<0)ctx.scale(-1,1);
 ctx.drawImage(img,sx,sy,w,h,-anchor*scale,-feet*scale,w*scale,h*scale);ctx.restore();return true;
}
function drawCombatSprite(powered,height,alpha,activeWalk=false){
 const pose=combatPose();if(!pose)return false;
 if(pose.kind==='guard'&&activeWalk&&drawGuardWalk(height,alpha,pose.dir))return true;
 if(pose.kind==='recover'&&activeWalk&&drawRecoveryWalk(powered,height,alpha,pose.dir))return true;
 const asset=powered?'combat-power':player.job==='swordsman'?'combat-swordsman':'combat-brawler',sheet=COMBAT_SHEETS[asset],img=characterImage(asset);if(!img?.complete||!img.naturalWidth)return false;
 const row=asset==='combat-swordsman'?({slash:0,draw:1,guard:2}[pose.kind]??0):powered?({punch:0,shoulder:1,recover:2}[pose.kind]??0):({punch:0,belly:1,shoulder:2,recover:3}[pose.kind]??0);
 const index=row*4+pose.frame,frame=sheet.frames[index],[sx,sy,w,h,anchor,feet]=frame,scale=height/sheet.height,crop=isolatedCombatFrame(asset,index,img,frame);
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;if(pose.dir<0)ctx.scale(-1,1);
 if(crop)ctx.drawImage(crop,0,0,w,h,-anchor*scale,-feet*scale,w*scale,h*scale);else ctx.drawImage(img,sx,sy,w,h,-anchor*scale,-feet*scale,w*scale,h*scale);
 ctx.restore();return true;
}
// Body heat rises from shoulders and torso; no enclosing aura or orbiting rings.
function drawPowerSteam(x,y,front){
 ctx.save();ctx.translate(x,y);ctx.shadowBlur=0;
 const count=front?4:8;
 for(let i=0;i<count;i++){
  const seed=i+(front?8:0),phase=(worldTime*.52+seed*.173)%1,side=seed%2?1:-1;
  const opacity=Math.sin(phase*Math.PI)*(front?.3:.55);
  const sx=side*((front?25:55)+(seed%3)*12)+Math.sin(phase*5+seed)*12;
  const sy=-65-(seed%3)*30-phase*105,radius=10+phase*18;
  ctx.save();ctx.translate(sx,sy);ctx.scale(1,1.5);
  const mist=ctx.createRadialGradient(0,0,0,0,0,radius);
  mist.addColorStop(0,`rgba(255,255,255,${opacity})`);
  mist.addColorStop(.45,`rgba(242,248,250,${opacity*.6})`);
  mist.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=mist;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.strokeStyle=`rgba(250,253,255,${opacity*.8})`;ctx.lineWidth=2+2*(1-phase);ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(sx,sy+18);ctx.bezierCurveTo(sx-side*14,sy+4,sx+side*14,sy-8,sx+side*5,sy-25);ctx.stroke();
 }
 ctx.restore();
}
const CAT_SKILL_CROPS=[
 [95,62,513,629],   // Wind up the bottle close to the chest.
 [724+12,56,704,637], // Release the bottle above the leading paw.
 [1448+70,128,528,577] // Place the ballot box at the feet.
];
// Normalize each drawing to face right before applying the player's facing.
// The atlas alternates leading feet, but its source drawings also change direction.
const CAT_MOTION_FACING=[-1,-1,1,-1,-1,-1,-1,-1,-1];
const CAT_SKILL_FACING=[-1,1,1];
function catPose(){
 if(catCharge)return {sheet:'cat-skills',frame:0};
 const motion=combatMotion?.kind;
 if(motion==='catThrow')return {sheet:'cat-skills',frame:1};
 if(motion==='catBallot')return {sheet:'cat-skills',frame:2};
 if(motion==='catBack')return {sheet:'cat-motion',frame:8};
 if(motion==='catPunch')return {sheet:'cat-motion',frame:combatMotion.elapsed/combatMotion.duration<.16?1:6};
 if(motion==='catClaw')return {sheet:'cat-motion',frame:combatMotion.elapsed/combatMotion.duration<.16?6:7};
 const airborne=jumpFrame();
 if(airborne>=0){const frame=[3,4,4,4,4,5][airborne];return {sheet:'cat-motion',frame};}
 if(walking){return {sheet:'cat-motion',frame:[0,1,2,1][Math.floor(walkPhase*4)%4]};}
 return null;
}
function drawCatPose(pose,height){
 const img=images[catAsset(pose.sheet)];if(!img?.complete||!img.naturalWidth)return false;
 const [sx,sy,sw,sh]=pose.sheet==='cat-motion'?
  [(pose.frame%3)*img.naturalWidth/3,Math.floor(pose.frame/3)*img.naturalHeight/3,img.naturalWidth/3,img.naturalHeight/3]:CAT_SKILL_CROPS[pose.frame];
 const width=height*sw/sh;
 const sourceFacing=(pose.sheet==='cat-motion'?CAT_MOTION_FACING:CAT_SKILL_FACING)[pose.frame];
 ctx.save();ctx.scale(sourceFacing,1);ctx.imageSmoothingEnabled=true;ctx.drawImage(img,sx,sy,sw,sh,-width/2,-height,width,height);ctx.restore();
 return true;
}
function drawCatPlayer(x,y){
 const height=132,alpha=hurtTime<=0&&invincible>0&&Math.floor(invincible*13)%2===0?.55:1;
 ctx.save();ctx.fillStyle='#03162570';ctx.beginPath();ctx.ellipse(x,y+3,Math.max(18,32-pz*.09),Math.max(3,8-pz*.02),0,0,Math.PI*2);ctx.fill();ctx.translate(x,y-pz);
 if((combatMotion?.dir??facing)<0)ctx.scale(-1,1);
 const pose=catPose(),step=walking&&pz===0?Math.sin(walkPhase*Math.PI*4):0;
 if(walking)ctx.translate(0,-Math.abs(step)*1.4);
 if(combatMotion?.kind==='catBack')ctx.rotate(-.08);
 ctx.globalAlpha=alpha;ctx.filter=hurtTime>0?'brightness(1.35)':'none';
 if(!pose||!drawCatPose(pose,height))sprite(catAsset('cat'),0,0,height*.835,height,{flip:true});
 ctx.filter='none';
 ctx.restore();drawPlayerName(player.name,x,y-pz-height-15,'#e5f3ff');
}
function drawPlayerName(name,x,y,color){
 if(hasTypeATitle(player))label('A형',x,y-30,'#d5d9e1',14);
 label(name,x,y,color,14);
}
function drawPlayer(){
 if(player.classId==='otter'){drawOtterPlayer();return;}
 if(player.classId==='chick'){drawChickPlayer();return;}
 if(player.classId==='rabbit'){drawRabbitPlayer(combatDisplayX()-camera,player.y);return;}
 if(player.classId==='cat'){drawCatPlayer(combatDisplayX()-camera,player.y);return;}
 const x=combatDisplayX()-camera,y=player.y,powered=isPowered(player),height=powered?205:118,pose=currentPlayerPose(),width=height*pose.crop[2]/pose.crop[3];
 ctx.save();ctx.fillStyle='#03162570';ctx.beginPath();ctx.ellipse(x,y+3,(powered?48:27)-pz*.08,Math.max(3,9-pz*.02),0,0,Math.PI*2);ctx.fill();
 if(powered)drawPowerSteam(x,y-pz,false);
 // Keep the brief facial reaction legible before resuming the invulnerability blink.
 const alpha=hurtTime<=0&&invincible>0&&Math.floor(invincible*13)%2===0?.55:1;
 const activeJump=hurtTime<=0&&!swordUlt?jumpFrame():-1;
 const activeWalk=activeJump<0&&hurtTime<=0&&walking&&scene==='playing'&&!modal&&!document.hidden&&pz===0&&!swordUlt;
 ctx.translate(x,y-pz);
 const drawnCombat=drawCombatSprite(powered,height,alpha,activeWalk);
 const jumpPose=!drawnCombat&&activeJump>=0?drawJumpSprite(powered,activeJump,height,alpha):null;
 const drawnWalk=!drawnCombat&&!jumpPose&&activeWalk&&drawWalkSprite(powered,height,alpha);
 if(!drawnCombat&&!drawnWalk&&!jumpPose){
  sprite(powered?(hurtTime>0?'powerHurt':'power'):(hurtTime>0?'hurt':'normal'),0,0,width,height,{flip:facing<0,alpha,bob:scene==='playing'&&!modal&&!document.hidden&&pz===0?Math.sin(worldTime*2)*1.1:0});
 }
 if(!drawnCombat)drawEquipment(powered,drawnWalk,height,width,alpha,jumpPose);
 if(powered)drawPowerSteam(0,0,true);
 ctx.restore();
 drawPlayerName(powered?`${player.name} · 근육 각성`:player.name,x,y-pz-height-14,powered?'#e1f7ff':'#e5f3ff');
}
function drawDrop(drop){const x=drop.x-camera,y=drop.y+Math.sin(worldTime*4+drop.x)*4;ctx.save();ctx.shadowColor=drop.type==='money'?'#ffd678':'#86fbe8';ctx.shadowBlur=12;ctx.fillStyle=drop.type==='money'?'#ffcb72':drop.type==='potions'?'#ff9393':'#8de7da';ctx.translate(x,y);if(drop.type==='money'){ctx.beginPath();ctx.ellipse(0,0,8,10,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#9c6a34';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('₩',0,4);}else{const img=images[ITEMS[drop.type]?.image?.slice(7,-4)];if(img?.complete&&img.naturalWidth){ctx.shadowBlur=6;ctx.drawImage(img,-13,-13,26,26);}else{ctx.rotate(Math.PI/4);ctx.fillRect(-6,-6,12,12);}}ctx.restore();}
function drawDashTrail(e){
 const progress=dashProgress(e.max-e.life,e.travelDuration),dx=(e.toX-e.x)*progress,dy=(e.toY-e.y)*progress;
 if(Math.abs(dx)<1)return;
 ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dx,dy);
 ctx.shadowBlur=0;ctx.strokeStyle=e.outline||'#111117';ctx.lineWidth=e.sword?30:16;ctx.stroke();
 ctx.shadowColor=e.glow||e.color;ctx.shadowBlur=e.sword?28:18;ctx.strokeStyle=e.color;ctx.lineWidth=e.sword?17:8;ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle=e.accent||'#fff9ce';ctx.lineWidth=e.sword?5:2;ctx.stroke();
 for(const offset of [-10,10]){ctx.beginPath();ctx.moveTo(dx*.12,offset);ctx.lineTo(dx*.94,dy+offset);ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.stroke();}
 if(e.sword)for(const offset of [-23,23]){ctx.beginPath();ctx.moveTo(dx*.06,offset);ctx.lineTo(dx*.75,dy*.75+offset);ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.stroke();}
}
function drawSwordBlink(e,t){
 const dx=e.toX-e.x,dy=e.toY-e.y,length=Math.hypot(dx,dy);
 if(length<1)return;
 const weight=(e.solo?1.3:1)*Math.min(2.4,1/Math.sqrt(cameraZoom));
 ctx.rotate(Math.atan2(dy,dx));ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);
 ctx.shadowBlur=0;ctx.strokeStyle=e.outline;ctx.lineWidth=34*weight;ctx.stroke();
 ctx.shadowColor=e.glow;ctx.shadowBlur=32;ctx.strokeStyle=e.color;ctx.lineWidth=20*weight;ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle=e.accent;ctx.lineWidth=6*weight;ctx.stroke();
 // Straight speed streaks and a jagged filament follow the actual teleport route.
 for(const side of [-1,1])for(const n of [1,2]){
  const offset=side*(14+n*11)*weight;ctx.beginPath();ctx.moveTo(length*(.05+n*.06),offset);ctx.lineTo(length*(.98-n*.07),offset);
  ctx.strokeStyle=n===1?e.accent:e.color;ctx.lineWidth=(n===1?3:2)*weight;ctx.stroke();
 }
 const steps=Math.max(3,Math.min(24,Math.ceil(length/85)));
 ctx.beginPath();ctx.moveTo(0,0);for(let i=1;i<steps;i++)ctx.lineTo(length*i/steps,(i%2?1:-1)*13*weight*t);ctx.lineTo(length,0);
 ctx.strokeStyle=e.outline;ctx.lineWidth=6*weight;ctx.stroke();ctx.strokeStyle=e.color;ctx.lineWidth=3*weight;ctx.stroke();
 // The arrival flash stays legible during the map-wide camera zoom.
 for(const tilt of [-.7,.7]){const reach=43*weight*t;ctx.beginPath();ctx.moveTo(length-Math.cos(tilt)*reach,-Math.sin(tilt)*reach);ctx.lineTo(length+Math.cos(tilt)*reach,Math.sin(tilt)*reach);ctx.strokeStyle=e.accent;ctx.lineWidth=4*weight;ctx.stroke();}
}
// Rounded pressure rings and wind curves distinguish fists from electrical sword strikes.
function drawImpact(e,t){
 const radius=e.size*(.14+(1-t)*.38);ctx.lineCap='round';
 ctx.strokeStyle=e.color;ctx.lineWidth=4*t+1;ctx.beginPath();ctx.ellipse(0,0,radius,radius*.72,0,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle=e.accent;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,radius*1.25,radius*.9,0,-.4,Math.PI*1.4);ctx.stroke();
 ctx.strokeStyle=e.color;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*radius*.45,Math.sin(a)*radius*.32);ctx.lineTo(Math.cos(a)*radius*.83,Math.sin(a)*radius*.6);ctx.stroke();}
}
function drawWindSwing(e,t){
 ctx.scale(e.dir||1,1);ctx.lineCap='round';
 for(let i=0;i<3;i++){const scale=1-i*.19;ctx.strokeStyle=i===1?e.accent:e.color;ctx.lineWidth=i===0?7:2.5;ctx.beginPath();ctx.ellipse(e.size*.18+(1-t)*e.size*.15,-i*3,e.size*.52*scale,e.size*.25*scale,-.12,-1.45+(1-t)*.35,1.1+(1-t)*.35);ctx.stroke();}
}
function drawCatFields(){
 for(const fire of catFires){const x=fire.x-camera,y=fire.y,t=fire.remaining/fire.duration;ctx.save();ctx.globalAlpha=.45+.25*t;const glow=ctx.createRadialGradient(x,y,2,x,y,fire.radius);glow.addColorStop(0,'#ffe9a7a8');glow.addColorStop(.55,'#fb71376c');glow.addColorStop(1,'#f23b1700');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(x,y-10,fire.radius,fire.radius*.55,0,0,Math.PI*2);ctx.fill();for(let i=0;i<11;i++){const px=x+Math.sin(i*17)*fire.radius*.72,py=y-8-(i%3)*6-Math.abs(Math.sin(worldTime*8+i))*20*t;ctx.fillStyle=i%2?'#ffb64b':'#ff6b38';ctx.beginPath();ctx.ellipse(px,py,5+4*t,10+8*t,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
 for(const bottle of catProjectiles){const t=clamp(bottle.elapsed/bottle.duration,0,1),x=bottle.x+(bottle.toX-bottle.x)*t-camera,y=bottle.y+(bottle.toY-bottle.y)*t-90*Math.sin(Math.PI*t);ctx.save();ctx.translate(x,y);ctx.rotate(t*9);ctx.shadowColor='#ff8b46';ctx.shadowBlur=16;ctx.fillStyle='#b45339';ctx.fillRect(-8,-12,16,22);ctx.fillStyle='#ffbd58';ctx.fillRect(-5,-8,10,15);ctx.fillStyle='#efe0b6';ctx.fillRect(-3,-17,6,6);ctx.restore();}
 if(catBallot){const b=catBallot,x=b.x-camera,y=b.y,t=b.remaining/b.skill.duration;ctx.save();ctx.globalAlpha=Math.min(1,t*3);ctx.strokeStyle='#f4d8c0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y-43,b.skill.range*.82,b.skill.range*.36,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=b.hit>0?'#ffffff':'#ece6d9';ctx.strokeStyle='#493f49';ctx.lineWidth=3;ctx.fillRect(x-24,y-75,48,69);ctx.strokeRect(x-24,y-75,48,69);ctx.fillStyle='#aeb9bb';ctx.fillRect(x-28,y-82,56,12);ctx.fillStyle='#403b43';ctx.fillRect(x-9,y-79,18,3);roundedRect(x-43,y-114,86,7,3,'#29252ddd');roundedRect(x-43,y-114,86*b.hp/b.maxHp,7,3,'#a8e7c4');label(`투표함 · ${Math.ceil(b.hp)} / ${b.maxHp}`,x,y-135,'#d9ffe8',11);for(let i=0;i<15;i++){const a=i*2.4+worldTime*3,r=(45+(i%5)*35)*b.skill.range/245;ctx.save();ctx.translate(x+Math.cos(a)*r,y-95+Math.sin(a*1.3)*42*b.skill.range/245);ctx.rotate(a);ctx.fillStyle='#fffaf0';ctx.fillRect(-7,-4,14,8);ctx.strokeStyle='#d6bc8e';ctx.strokeRect(-7,-4,14,8);ctx.restore();}ctx.restore();}
 if(catCharge){const skill=catCharge.skill,t=catCharge.elapsed/skill.charge,reach=skill.range+(skill.maxRange-skill.range)*t,x=player.x+facing*reach-camera;ctx.save();ctx.strokeStyle='#ffb777';ctx.setLineDash([9,7]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(player.x-camera,player.y-20);ctx.quadraticCurveTo((player.x-camera+x)/2,player.y-150,x,player.y-20);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.ellipse(x,player.y-20,skill.radius*.7,skill.radius*.25,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
function drawEffects(){effects.forEach(e=>{const t=e.life/e.max,route=e.followDash,x=route?route.fromX+(route.toX-route.fromX)*dashProgress(e.max-e.life,route.duration):e.x;ctx.save();ctx.translate(x-camera,e.y);ctx.globalAlpha=Math.min(1,t*2);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.glow||e.color;ctx.shadowBlur=18;ctx.lineWidth=e.type==='slash'?9:4;if(e.type==='lightning'){
  ctx.scale(e.dir||1,1);const phase=(1-t)*4;
  for(let bolt=0;bolt<3;bolt++){ctx.beginPath();for(let i=0;i<6;i++){const x=-e.size*.4+i*e.size*.2,y=Math.sin(i*2.2+bolt*2+e.seed+phase)*e.size*.19+(bolt-1)*e.size*.17;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.lineWidth=bolt===1?4:2;ctx.stroke();ctx.strokeStyle='#fffbd5';ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle=e.color;}
 }else if(e.type==='hackZone'){drawHackGrid(e.width,e.height,1-t,false);}else if(e.type==='claw'){ctx.scale(e.dir||1,1);ctx.lineCap='round';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-e.size*.4,-e.size*.3+i*e.size*.22);ctx.quadraticCurveTo(e.size*.15,-e.size*.55+i*e.size*.22,e.size*.48,e.size*.18+i*e.size*.22);ctx.lineWidth=5;ctx.stroke();}}else if(e.type==='impact'){drawImpact(e,t);}else if(e.type==='windSwing'){drawWindSwing(e,t);}else if(e.type==='dash'){drawDashTrail(e);}else if(e.type==='swordBlink'){drawSwordBlink(e,t);}else if(e.type==='blink'){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(e.toX-e.x,e.toY-e.y);ctx.lineWidth=5;ctx.stroke();}else if(e.type==='slash'){ctx.scale(e.dir||1,1);ctx.beginPath();ctx.ellipse(30,0,e.size*.65,e.size*.4,-.2,-1.4+(.9-t)*.5,1.4+(.9-t)*.5);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(40,-1,e.size*.52,e.size*.31,-.2,-1.3,1.3);ctx.stroke();}else if(e.type==='ring'){ctx.beginPath();ctx.ellipse(0,0,e.size*(1-t+.2),e.size*(1-t+.2)*.45,0,0,Math.PI*2);ctx.stroke();}else{for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillRect(Math.cos(a)*e.size*(1-t),Math.sin(a)*e.size*(1-t),5,5);}}ctx.restore();});texts.forEach(t=>{ctx.save();ctx.globalAlpha=Math.min(1,t.life*2);ctx.font=`bold ${t.text.length>10?16:22}px "Space Grotesk","IBM Plex Sans KR",sans-serif`;ctx.textAlign='center';ctx.strokeStyle='#0c2533';ctx.lineWidth=4;ctx.strokeText(t.text,t.x-camera,t.y);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x-camera,t.y);ctx.restore();});}
function draw(){
 const isPlay=(scene==='playing'||scene==='dead')&&player;
 ctx.clearRect(0,0,screenWidth,810);
 ctx.save();
 // Shake the whole world together so actors stay anchored to the street.
 viewShakeX=isPlay&&shake>0?(Math.random()-.5)*shake:0;viewShakeY=isPlay&&shake>0?(Math.random()-.5)*shake:0;
 if(isPlay){ctx.translate(viewShakeX,viewShakeY+viewOffsetY());ctx.scale(cameraZoom,cameraZoom);}
 drawBackground(player?.map??'town');
 if(isPlay){
  if(!bossActive())MAPS[player.map].portals.forEach(drawPortal);
  drawBossTelegraphs();
  if(player.map==='town')label(MAPS.town.name,290-camera,407,'#d4f4df',20);
  else if(['gangnam','yeoksamStreet'].includes(player.map))label(MAPS[player.map].name,1070-camera,345,'#d4f4df',20);
  else if(player.map==='station6')label(MAPS.station6.name,490-camera,252,'#d4f4df',20);
  else label(MAPS[player.map].name,820-camera,375,MAPS[player.map].color,20);
  const entities=[
   ...monsters.filter(m=>(!m.dead||m.deathFx>0)&&!m.isBoss).map(m=>({y:m.y,draw:()=>drawMonster(m)})),
   ...drops.map(d=>({y:d.y,draw:()=>drawDrop(d)})),
   ...mapNPCs().map(n=>({y:n.y,draw:()=>drawNPC(n)})),
   ...(boss?[{y:boss.y,draw:drawBoss}]:[]),
   {y:player.y,draw:drawPlayer}
  ];
  entities.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());drawCatFields();
  drawCombatIndicators();drawEffects();drawRabbitEffects();drawChickEffects();drawOtterEffects();
  if(MAPS[player.map].danger>=2){
   for(let i=0;i<20;i++){const x=(i*163+worldTime*13)%screenWidth,y=120+(i*97)%520;ctx.fillStyle=`rgba(190,163,243,${.15+Math.sin(worldTime+i)*.1})`;ctx.fillRect(x,y,3,3);}
  }
 }else if(scene==='title'){
  for(let i=0;i<12;i++){const x=(i*137+worldTime*7)%screenWidth,y=100+(i*73)%500;ctx.fillStyle=`rgba(255,226,147,${.13+Math.sin(worldTime*1.3+i)*.1})`;ctx.fillRect(x,y,2,2);}
 }
 ctx.restore();
}
function frame(time){const dt=prev?Math.min((time-prev)/1000,.04):.016;prev=time;update(dt);draw();requestAnimationFrame(frame);}
function resize(){const box=$('.game-shell').getBoundingClientRect();screenWidth=Math.round(box.width/box.height*810);canvas.width=screenWidth;canvas.height=810;ctx.imageSmoothingEnabled=false;if(player&&scene==='playing')updateCamera(1);}
const gameCodes=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyA','KeyQ','KeyW','KeyE','KeyR','KeyF','Digit1','Digit2','Digit3','KeyI','KeyM']);
document.addEventListener('keydown',e=>{
 if(modal){if(e.code==='Escape'||(!e.repeat&&((modal==='world-map'&&e.code==='KeyM')||(modal==='inventory'&&e.code==='KeyI')))){e.preventDefault();closeModal();return;}if(modal==='inventory'&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();if(!e.repeat)registerInventorySlot(Number(e.code.slice(-1))-1);return;}if(e.code==='Tab'){const focusables=[...modalRoot.querySelectorAll('button,input,summary,[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length>0);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
 if(e.target.matches('input,textarea'))return;
 if(scene==='title'&&e.code==='Enter'){e.preventDefault();selectCharacters();return;}
 if(scene!=='playing')return;
 if(hackerUlt?.phase==='selecting'&&['ArrowLeft','ArrowRight','Enter','Escape'].includes(e.code)){e.preventDefault();if(!e.repeat){if(e.code==='Enter')confirmHack();else if(e.code==='Escape')cancelChickAim();else cycleHack(e.code==='ArrowLeft'?-1:1);}return;}
 if(gameCodes.has(e.code)||e.code==='Escape')e.preventDefault();
 keys.add(e.code);if(e.repeat)return;
 if(e.code==='Space')jump();else if(e.code==='KeyA')attack();else if(['KeyQ','KeyW','KeyE','KeyR'].includes(e.code))cast(e.code.slice(-1).toLowerCase());else if(e.code==='KeyF')interact();else if(['Digit1','Digit2','Digit3'].includes(e.code))useQuickSlot(Number(e.code.slice(-1))-1);else if(e.code==='KeyI')inventory();else if(e.code==='KeyM')worldMap();else if(e.code==='Escape')menu();
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyR')releaseSword('keyboard');if(e.code==='KeyE'){releaseCatCharge('keyboard');releaseChickCharge('keyboard');}});window.addEventListener('blur',()=>{walking=false;cancelSword();cancelCatCharge();cancelChickAim();keys.clear();if(player)save();});document.addEventListener('visibilitychange',()=>{walking=false;if(document.hidden){cancelSword();cancelCatCharge();cancelChickAim();}keys.clear();prev=0;if(player)save();});window.addEventListener('pagehide',()=>{walking=false;cancelSword();cancelCatCharge();cancelChickAim();if(player)save();});
canvas.addEventListener('pointerdown',e=>{canvas.focus();if(scene!=='playing'||modal)return;const r=canvas.getBoundingClientRect(),point=screenToWorld((e.clientX-r.left)/r.width*screenWidth,(e.clientY-r.top)/r.height*810),{x,y}=point;const nearby=findInteraction();if(nearby&&Math.abs(nearby.x-x)<80&&y>nearby.y-Math.max(170,nearby.height??0)&&y<nearby.y+40)interact();});
document.querySelectorAll('[data-hold]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(hackerUlt?.phase==='selecting'){if(['ArrowLeft','ArrowRight'].includes(b.dataset.hold))cycleHack(b.dataset.hold==='ArrowLeft'?-1:1);return;}b.setPointerCapture(e.pointerId);keys.add(b.dataset.hold);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys.delete(b.dataset.hold));});
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>({jump,interact,potion:drinkPotion}[b.dataset.action]?.()));
$('#start-button').onclick=selectCharacters;
new ResizeObserver(resize).observe($('.game-shell'));resize();requestAnimationFrame(frame);
if(storageBroken)setTimeout(()=>toast('저장 데이터를 읽지 못했어요. 브라우저 저장 설정을 확인해 주세요.'),800);
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};register({name:'read_game_progress',title:'모험 진행 상황 보기',description:'현재 플레이 화면과 저장된 캐릭터의 레벨, 위치, HP, MP, 소지품을 읽습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('입력은 빈 객체여야 합니다.');return {scene,active:player?{name:player.name,level:player.level,hp:player.hp,mp:player.mp,map:player.map,x:Math.round(player.x),money:player.money,potions:player.potions,mpPotions:player.mpPotions,mpPotionCooldown:player.mpPotionCooldown,returnScrolls:player.returnScrolls,gangnamScrolls:player.gangnamScrolls,quickSlots:[...player.quickSlots],equipment:equipmentName(player),uniformEquipped:player.uniformEquipped,boss:boss?{phase:boss.phase,hp:boss.hp,active:boss.active,potionCooldown}:null,job:player.job,xp:player.xp,xpNeeded:xpNeeded(player.level),guardSeconds:guardTime,recoverySeconds:recovery?.remaining||0,damageReduction:swordUlt?.skill.reduction||recovery?.reduction||0,ultimate:swordUlt?{phase:swordUlt.phase,elapsed:swordUlt.elapsed,targets:swordUlt.targets.length}:null,powerSeconds:Math.ceil(player.powerTime),visited:[...player.visited],cooldowns:{...cooldowns}}:null,characters:records.map(p=>({name:p.name,level:p.level,map:p.map}))};}});register({name:'save_game_progress',title:'현재 모험 저장',description:'게임 화면에서 현재 캐릭터의 위치와 진행 상황을 이 브라우저에 저장합니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('입력은 빈 객체여야 합니다.');if(scene!=='playing'||!player)throw new Error('먼저 캐릭터를 선택하고 게임에 입장해 주세요.');if(!save(false))throw new Error('브라우저 저장에 실패했습니다.');return {saved:true,name:player.name,map:player.map};}});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
