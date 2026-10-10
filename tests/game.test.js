import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as core from '../dist/core.js';
import * as bossCore from '../dist/boss.js';
import * as typeACore from '../dist/type-a.js';

// Runs the actual game loop against lightweight DOM/timer adapters. No live browser state.
function harness(){
 const elements=new Map(),events=new Map(),windowEvents=new Map(),storage=new Map(),timeouts=[];
 const persistence={fail:false};
 const draws=[],labels=[],strokes=[],arcs=[],transforms=[];let matrix=[1,0,0,1,0,0],path=[];
 const point=(x,y)=>({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
 const gradient=()=>({addColorStop(){}});
 const drawing=new Proxy({
  save(){transforms.push([...matrix]);},restore(){matrix=transforms.pop();},translate(x,y){const p=point(x,y);matrix[4]=p.x;matrix[5]=p.y;},
  scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
  rotate(r){const [a,b,c,d]=matrix,co=Math.cos(r),si=Math.sin(r);matrix[0]=a*co+c*si;matrix[1]=b*co+d*si;matrix[2]=c*co-a*si;matrix[3]=d*co-b*si;},
  drawImage(img,...args){const [x,y,width,height]=args.slice(-4);const corners=[point(x,y),point(x+width,y),point(x,y+height),point(x+width,y+height)],xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);draws.push({matrix:[...matrix],alpha:this.globalAlpha,filter:this.filter,asset:img.asset,source:args.slice(0,-4),x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)});},
  beginPath(){path=[];},
  moveTo(x,y){path.push({kind:'move',...point(x,y)});},
  lineTo(x,y){path.push({kind:'line',...point(x,y)});},
  ellipse(x,y,rx,ry){path.push({kind:'ellipse',...point(x,y),rx,ry});},
  arc(x,y,r){const a={...point(x,y),radius:r*Math.hypot(matrix[0],matrix[1])};arcs.push(a);path.push({kind:'arc',...a});},
  stroke(){strokes.push({color:this.strokeStyle,glow:this.shadowColor,width:this.lineWidth,path:path.map(p=>({...p}))});},
  fillText(text,x,y){labels.push({text,...point(x,y),color:this.fillStyle,scale:Math.hypot(matrix[0],matrix[1])});},measureText(text){return {width:text.length*8};},
  createRadialGradient:gradient,createLinearGradient:gradient
 },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 function el(selector){if(elements.has(selector))return elements.get(selector);const obj={parentElement:{},style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',hidden:false,isConnected:true,disabled:false,onclick:null,listeners:new Map(),setPointerCapture(){},focus(){},setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k]??null;},getBoundingClientRect(){return {width:1448,height:818};},addEventListener(n,f){this.listeners.set(n,f);},querySelector:child=>el(`${selector} ${child}`),querySelectorAll:()=>[],getContext:()=>drawing};elements.set(selector,obj);return obj;}
 const document={querySelector:el,querySelectorAll:()=>[],addEventListener:(n,f)=>events.set(n,f),hidden:false,activeElement:el('#game')};
 const context=vm.createContext({...core,...bossCore,...typeACore,console,document,window:{addEventListener:(n,f)=>{if(!windowEvents.has(n))windowEvents.set(n,[]);windowEvents.get(n).push(f);}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(persistence.fail)throw new Error('storage unavailable');storage.set(k,v);}},setTimeout:f=>{timeouts.push(f);return timeouts.length;},clearTimeout(){},requestAnimationFrame(){},ResizeObserver:class{observe(){}},Image:class{set src(v){this.asset=v;this.complete=true;this.naturalWidth=v.includes('otter-')?1215:1500;this.naturalHeight=v.includes('otter-')?1295:1000;this.onload?.();}},Promise,Math,Date,Number,String,Set});
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
 vm.runInContext(source+`\nglobalThis.gameTest={start(p){player=p;records=[p];scene='playing';resetWorld();},characters(list,id){player=null;records=list;selectedId=id;selectCharacters();},deleteCharacterModal,startBossFight,bossTalk,abandonBoss,winBoss,drawBossAura,render:draw,startSwordCharge,releaseSword,cancelSword,bindSkillButton,jobModal,interact,setView(width){screenWidth=width;resetWorld();},setShake(amount){shake=amount;},update,attack,cast,jump,hitMonster,save,enterWorld,travel,drinkPotion,selectCharacters,worldMap,showMapView,showMapDetails,showMapTab,selectMapDestination,closeModal,die,inventory,shop,resetCombat,playerDamage,combatPose,combatDisplayX,drawMonster,drawEffects,refreshHealthHUD,otterFrame,otterOrbPoint,castOtter,catAreaHit,enemyTarget,bossPerception,COMBAT_SHEETS,useQuickSlot,useInventoryItem,registerInventorySlot,updateCamera,screenToWorld,startCatCharge,releaseCatCharge,startChickCharge,releaseChickCharge,chickArea,chickFrame,confirmHack,cycleHack,cancelChickAim,get:()=>({otterWave,otterShield,otterBubbles,otterConcert,chickCodes,chickStealth,chickCharge,hackerUlt,rabbitShield,rabbitOrbs,catCharge,catProjectiles,catFires,catBallot,mapView,mapSelection,selectedId,storageBroken,boss,potionCooldown,player,records,monsters,drops,pz,pvz,jumpPrep,jumpLanding,scene,cooldowns,invincible,hurtTime,camera,modal,attackTimer,swordUlt,guardTime,combatMotion,recovery,effects,walking,walkPhase,cameraZoom,shake,viewShakeX,viewShakeY,screenWidth}),keys,findInteraction};`,context);
 return {api:context.gameTest,persistence,draws,labels,strokes,arcs,elements,events,windowEvents,storage,timeouts,document,el,async flush(){while(timeouts.length)timeouts.shift()();await Promise.resolve();await Promise.resolve();}};
}
function advance(h,seconds){for(let t=0;t<seconds;t+=1/60)h.api.update(1/60);}

test('protester jumps 20% higher at different frame rates without extending airtime or W distance',()=>{
 const measure=(job,backstep,fps)=>{
  const h=harness(),p=core.createCharacter('점프','cat');Object.assign(p,{level:15,job,x:1000});p.mp=core.maxMp(p);h.api.start(p);
  backstep?h.api.cast('w'):h.api.jump();let apex=h.api.get().pz,landing=0;
  for(let i=0;i<fps*2;i++){h.api.update(1/fps);const state=h.api.get();apex=Math.max(apex,state.pz);if(!state.pz&&!state.jumpPrep){landing=i;break;}}
  return {apex,landing,x:p.x};
 };
 for(const fps of [30,60,120])for(const backstep of [false,true]){
  const base=measure(null,backstep,fps),advanced=measure('protester',backstep,fps);
  assert.ok(Math.abs(advanced.apex/base.apex-1.2)<1e-10);assert.equal(advanced.landing,base.landing);assert.equal(advanced.x,base.x);
 }
 for(const job of [null,'bodybuilder','swordsman'])assert.equal(core.jumpHeightMultiplier({classId:'penguin',job}),1);
});

test('ballot ultimate hits within the doubled radius and leaves targets beyond it unharmed',()=>{
 const h=harness(),p=core.createCharacter('범위','cat');Object.assign(p,{level:15,job:'protester',map:'alley',x:1000});p.mp=core.maxMp(p);h.api.start(p);
 const [near,far]=h.api.get().monsters;h.api.cast('r');const box=h.api.get().catBallot;
 Object.assign(near,{x:box.x+480,y:box.y,speed:0,hp:10000,maxHp:10000,home:box.x+480});
 Object.assign(far,{x:box.x+510,y:box.y,speed:0,hp:10000,maxHp:10000,home:box.x+510});
 advance(h,.1);assert.ok(near.hp<10000);assert.equal(far.hp,10000);assert.equal(near.x,box.x+460);
});

test('only advanced cats use the integrated ribbon artwork in portraits and movement',()=>{
 const h=harness(),p=core.createCharacter('복장','cat');h.api.start(p);
 render(h);assert.ok(h.draws.some(d=>d.asset==='assets/cat.png'));
 h.api.keys.add('ArrowLeft');h.api.update(1/60);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/cat-motion.png'));
 p.level=10;p.map='olympic';assert.equal(core.advanceJob(p,'protester').ok,true);
 h.api.update(1/60);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/cat-protester-motion.png'));
 h.api.characters([p],p.id);assert.ok(h.el('#screens').innerHTML.includes('assets/cat-protester.png'));
 for(const suffix of ['','-motion','-skills']){
  const original=fs.readFileSync(new URL(`../dist/assets/cat${suffix}.png`,import.meta.url));
  const dressed=fs.readFileSync(new URL(`../dist/assets/cat-protester${suffix}.png`,import.meta.url));
  assert.deepEqual(dressed.subarray(16,24),original.subarray(16,24),'frame geometry stays aligned');
 }
});

test('continuous controls move in all directions, jump keeps ground y independent and lands',()=>{
 const h=harness(),p=core.createCharacter('move');h.api.start(p);const x=p.x,y=p.y;h.api.keys.add('ArrowRight');h.api.jump();advance(h,.2);assert.ok(p.x>x+40);assert.ok(h.api.get().pz>0);assert.equal(p.y,y);
 h.api.keys.clear();advance(h,.8);assert.equal(h.api.get().pz,0);h.api.keys.add('ArrowUp');advance(h,2);assert.equal(p.y,580);h.api.keys.clear();h.api.keys.add('ArrowDown');advance(h,2);assert.equal(p.y,720);
});
test('one attack deals damage once, and dead monsters award XP and drops exactly once',()=>{
 const h=harness(),p=core.createCharacter('fight');p.map='alley';p.x=520;h.api.start(p);const m=h.api.get().monsters[0];m.x=600;m.y=p.y;
 h.api.attack();assert.equal(m.hp,m.maxHp-core.attackPower(p));h.api.attack();assert.equal(m.hp,m.maxHp-core.attackPower(p));advance(h,.35);h.api.attack();advance(h,.35);h.api.attack();assert.ok(m.dead);assert.equal(p.kills,1);const xp=p.xp;h.api.attack();assert.equal(p.xp,xp);assert.ok(h.api.get().drops.length>=2);
 p.x=m.x;advance(h,1);assert.ok(p.money>500);assert.ok(p.scrap>=1);
});
test('cat punches, claws and backsteps with a brief invulnerable jump',()=>{
 const h=harness(),p=core.createCharacter('고양이','cat');p.level=7;p.hp=core.maxHp(p);p.mp=core.maxMp(p);p.map='alley';p.x=1000;h.api.start(p);
 const m=h.api.get().monsters[0];m.x=1100;m.y=p.y;m.speed=0;m.hp=m.maxHp=1000;
 h.api.attack();assert.equal(m.hp,1000-core.attackPower(p));advance(h,.4);
 const before=m.hp;h.api.cast('q');assert.equal(before-m.hp,Math.round(core.attackPower(p)*core.effectiveSkill(p,'q').damage));
 const x=p.x;h.api.cast('w');assert.equal(p.x,x-core.effectiveSkill(p,'w').dash);assert.ok(h.api.get().invincible>=.7);assert.ok(h.api.get().pz>0);
});
test('cat walk, jump and every attack use distinct full-body motion poses',()=>{
 const h=harness(),p=core.createCharacter('동작','cat');p.level=15;p.job='protester';p.mp=core.maxMp(p);h.api.start(p);
 const current=()=>{render(h);return h.draws.find(d=>['assets/cat-protester-motion.png','assets/cat-protester-skills.png','assets/cat-protester.png'].includes(d.asset));};
 assert.equal(current().asset,'assets/cat-protester.png');
 const walk=new Set();h.api.keys.add('ArrowRight');for(let i=0;i<42;i++){h.api.update(1/60);const pose=current();assert.equal(pose.asset,'assets/cat-protester-motion.png');walk.add(pose.source.slice(0,2).join(','));assert.ok(Math.abs(pose.y+pose.height-p.y)<3);}
 assert.ok(walk.size>=3,'walking alternates visible arm and leg poses');h.api.keys.clear();
 h.api.jump();assert.equal(current().source[1],1000/3,'jump starts with a crouch');advance(h,.2);assert.equal(current().source[1],1000/3,'airborne pose stays on the jump row');advance(h,1.1);assert.equal(current().asset,'assets/cat-protester.png');
 h.api.attack();assert.equal(current().asset,'assets/cat-protester-motion.png');advance(h,.08);assert.equal(current().source[1],2000/3,'A shows the extended punch');advance(h,.3);
 h.api.cast('q');advance(h,.08);assert.equal(current().source[1],2000/3,'Q shows the wide claw swipe');advance(h,.4);
 h.api.cast('w');assert.equal(current().source[1],2000/3,'W uses the backward-leap pose');advance(h,1);
 p.mp=core.maxMp(p);assert.equal(h.api.startCatCharge('test'),true);assert.equal(current().asset,'assets/cat-protester-skills.png');assert.equal(current().source[0],95,'E holds the bottle while charging');
 h.api.releaseCatCharge('test');assert.equal(current().source[0],736,'E shows the throw on release');advance(h,.35);
 p.mp=core.maxMp(p);h.api.cast('r');assert.equal(current().source[0],1518,'R places the ballot box');
 for(const asset of ['cat-motion','cat-skills']){const png=fs.readFileSync(new URL(`../dist/assets/${asset}.png`,import.meta.url)),width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.equal(width,asset==='cat-motion'?1145:2172);assert.equal(height,asset==='cat-motion'?1374:724);}
});
test('cat artwork consistently faces travel and attack direction across mirrored atlas frames',()=>{
 // These headings describe the source artwork, independently of the renderer's transforms.
 const motionHeading=[-1,-1,1,-1,-1,-1,-1,-1,-1];
 for(const dir of [-1,1]){
  const h=harness(),p=core.createCharacter('방향','cat');Object.assign(p,{level:15,job:'protester',x:1100});p.mp=core.maxMp(p);h.api.start(p);
  const heading=()=>{render(h);const d=h.draws.find(d=>['assets/cat-protester.png','assets/cat-protester-motion.png','assets/cat-protester-skills.png'].includes(d.asset));assert.ok(d);const sourceDir=d.asset==='assets/cat-protester.png'?-1:d.asset==='assets/cat-protester-skills.png'?(d.source[0]===95?-1:1):motionHeading[Math.round(d.source[1]/(1000/3))*3+Math.round(d.source[0]/500)];return sourceDir*Math.sign(d.matrix[0]);};
  h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');const startX=p.x;
  for(let i=0;i<50;i++){h.api.update(1/60);assert.equal(heading(),dir,'every walking frame faces the movement direction');}
  assert.ok((p.x-startX)*dir>0);h.api.keys.clear();h.api.update(1/60);assert.equal(heading(),dir,'idle keeps the same heading');
  h.api.jump();assert.equal(heading(),dir);advance(h,.25);assert.equal(heading(),dir);advance(h,1);
  h.api.attack();advance(h,.08);assert.equal(heading(),dir);
  h.api.keys.add(dir<0?'ArrowRight':'ArrowLeft');h.api.update(1/60);assert.equal(heading(),dir,'a started punch keeps its hit direction');h.api.keys.clear();advance(h,.4);
  h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(1/60);h.api.keys.clear();
  h.api.cast('q');advance(h,.08);assert.equal(heading(),dir);advance(h,.4);
  const beforeBack=p.x;h.api.cast('w');assert.ok((p.x-beforeBack)*dir<0,'W travels backward intentionally');assert.equal(heading(),dir);advance(h,1);
  p.mp=core.maxMp(p);h.api.startCatCharge('test');assert.equal(heading(),dir);h.api.releaseCatCharge('test');assert.equal(heading(),dir);assert.ok((h.api.get().catProjectiles[0].toX-p.x)*dir>0);advance(h,.4);
  p.mp=core.maxMp(p);h.api.cast('r');assert.equal(heading(),dir);assert.ok((h.api.get().catBallot.x-p.x)*dir>0);
 }
});
test('protester bottle charges up to one second, explodes, burns and ballot box ticks for five seconds',()=>{
 const h=harness(),p=core.createCharacter('목소리','cat');p.level=15;p.job='protester';p.map='alley';p.x=1000;p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);
 const m=h.api.get().monsters[0];m.x=1490;m.y=p.y;m.home=m.x;m.speed=0;m.hp=m.maxHp=10000;
 assert.equal(h.api.startCatCharge('test'),true);advance(h,1.02);
 assert.equal(h.api.get().catCharge,null);assert.equal(h.api.get().catProjectiles.length,1);assert.equal(h.api.get().catProjectiles[0].toX,1490);
 advance(h,.6);assert.ok(m.hp<10000,'bottle explosion hit at maximum range');assert.equal(h.api.get().catFires.length,1);
 const afterExplosion=m.hp;advance(h,1);assert.ok(m.hp<afterExplosion,'lingering fire deals damage');
 m.x=p.x+130;m.home=m.x;const beforeR=m.hp;h.api.cast('r');assert.equal(h.api.get().catBallot.remaining,5);advance(h,1);assert.ok(m.hp<beforeR,'ballot box deals repeated area damage');advance(h,4.2);assert.equal(h.api.get().catBallot,null);
});
test('contact damage has global invulnerability, jumping avoids collision, lethal hit saves town respawn',()=>{
 const h=harness(),p=core.createCharacter('collision');p.map='alley';p.x=600;p.hp=100;h.api.start(p);const group=h.api.get().monsters;group.forEach(m=>{m.x=p.x;m.y=p.y;m.home=p.x;});advance(h,2.1);
 p.hp=100;group.forEach(m=>{m.x=p.x;m.y=p.y;});advance(h,.02);const hp=p.hp;advance(h,.3);assert.equal(p.hp,hp);
 advance(h,1);h.api.jump();advance(h,.2);p.hp=100;group.forEach(m=>{m.x=p.x;m.y=p.y;});advance(h,.2);assert.equal(p.hp,100);
 advance(h,1);p.hp=1;group.forEach(m=>{m.x=p.x;m.y=p.y;});advance(h,2);assert.equal(h.api.get().scene,'dead');assert.equal(p.map,'town');assert.equal(p.hp,100);assert.equal(p.money,500);
 const saved=JSON.parse(h.storage.get(core.SAVE_KEY));assert.equal(saved.characters[0].map,'town');assert.equal(saved.characters[0].hp,100);
});
test('skills consume MP once, respect cooldown/level, and active save restores exact dungeon position',async()=>{
 const h=harness(),p=core.createCharacter('skill');p.level=3;p.map='alley';p.x=1444;p.y=700;h.api.start(p);h.api.cast('q');assert.equal(p.mp,52);h.api.cast('q');assert.equal(p.mp,52);h.api.cast('r');assert.equal(p.mp,52);
 h.api.save();h.api.selectCharacters();const pending=h.api.enterWorld(p.id);await h.flush();await pending;assert.equal(h.api.get().player.map,'alley');assert.equal(h.api.get().player.x,1444);assert.equal(h.api.get().player.y,700);
});
test('portals move through town, weak dungeon, deep dungeon and back',async()=>{
 const h=harness(),p=core.createCharacter('portal');h.api.start(p);for(const to of ['alley','depths','alley','town']){const portal=core.MAPS[p.map].portals.find(x=>x.to===to);const pending=h.api.travel(portal);await h.flush();await pending;assert.equal(p.map,to);assert.equal(p.x,portal.spawnX);assert.equal(h.api.get().scene,'playing');}
});

test('ultimate grants a timed transformation once and returns to normal after 12 gameplay seconds',()=>{
 const h=harness(),p=core.createCharacter('각성');p.level=15;p.job='bodybuilder';p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);
 assert.equal(core.isPowered(p),false);h.api.cast('r');assert.equal(p.powerTime,12);assert.equal(p.mp,core.maxMp(p)-30);assert.equal(h.api.get().cooldowns.r,40);assert.ok(core.basicAttackPower(p)>core.attackPower(p));
 h.api.cast('r');assert.equal(p.mp,core.maxMp(p)-30);assert.equal(p.powerTime,12);
 h.api.worldMap();advance(h,4);assert.equal(p.powerTime,12);h.api.closeModal();advance(h,12.1);assert.equal(p.powerTime,0);assert.equal(core.basicAttackPower(p),core.attackPower(p));assert.ok(p.cooldowns.r>27&&p.cooldowns.r<28);
});
test('all combat skills gain distinct improvements in muscle form',()=>{
 const h=harness(),p=core.createCharacter('강화');p.level=15;p.job='bodybuilder';p.hp=1;p.mp=100;p.map='alley';p.x=530;h.api.start(p);
 const ordinary={q:core.effectiveSkill(p,'q'),w:core.effectiveSkill(p,'w'),e:core.effectiveSkill(p,'e')};p.powerTime=12;
 const boosted={q:core.effectiveSkill(p,'q'),w:core.effectiveSkill(p,'w'),e:core.effectiveSkill(p,'e')};
 assert.equal(boosted.q.damage,ordinary.q.damage*2);assert.equal(boosted.q.range,ordinary.q.range*1.5);assert.equal(boosted.w.dash,ordinary.w.dash*1.6);assert.equal(boosted.w.damage,ordinary.w.damage*2);assert.equal(boosted.e.heal,.7);
 for(const key of ['q','w','e'])assert.equal(boosted[key].cooldown,ordinary[key].cooldown*.5);
 h.api.get().monsters.forEach(m=>{m.dead=true;m.respawnIn=100;});h.api.cast('e');assert.equal(p.hp,1);const protection=h.api.get().invincible;h.api.update(1.5);assert.ok(Math.abs(p.hp-(1+core.maxHp(p)*.7))<1e-8);assert.ok(h.api.get().invincible<protection);assert.equal(h.api.get().recovery,null);
 const start=p.x;h.api.cast('w');assert.equal(p.x-start,boosted.w.dash);
 const m=h.api.get().monsters[0];m.hp=10000;m.dead=false;m.x=p.x+180;m.y=p.y;const before=m.hp;h.api.cast('q');assert.equal(before-m.hp,Math.round(core.attackPower(p)*boosted.q.damage));
});
test('travel preserves awakening and cooldowns, death removes awakening, re-entry retains cooldowns',async()=>{
 const h=harness(),p=core.createCharacter('보존');p.level=15;p.job='bodybuilder';p.hp=380;p.mp=100;h.api.start(p);h.api.cast('r');advance(h,2);const remaining=p.powerTime,cd=p.cooldowns.r;
 const travel=h.api.travel(core.MAPS.town.portals.find(p=>p.to==='gym'));await h.flush();await travel;assert.equal(p.powerTime,remaining);assert.equal(p.cooldowns.r,cd);assert.ok(p.visited.includes('gym'));
 h.api.save();h.api.selectCharacters();const entry=h.api.enterWorld(p.id);await h.flush();await entry;const restored=h.api.get().player;assert.equal(restored.powerTime,0);assert.equal(restored.cooldowns.r,cd);assert.equal(restored.level,15);assert.equal(restored.job,'bodybuilder');
 restored.powerTime=12;restored.money=902;h.api.die();assert.equal(restored.powerTime,0);assert.equal(restored.map,'town');assert.equal(restored.money,902);
});
test('map hotkey toggles the map, pauses gameplay and keeps keyboard state clean',()=>{
 const h=harness(),p=core.createCharacter('지도');h.api.start(p);h.api.keys.add('ArrowRight');const x=p.x;
 const event={code:'KeyM',repeat:false,preventDefault(){},target:{matches(){return false;}}};h.events.get('keydown')(event);
 assert.equal(h.api.get().modal,'world-map');assert.equal(h.api.keys.size,0);advance(h,2);assert.equal(p.x,x);assert.match(h.el('#modal-root').innerHTML,/23 지역 탐험/);for(const id of Object.keys(core.MAPS))assert.match(h.el('#modal-root').innerHTML,new RegExp(`data-map="${id}"`));
 h.events.get('keydown')(event);assert.equal(h.api.get().modal,null);assert.equal(h.api.keys.size,0);
});
test('new regions are playable via portals and record exploration; training room heals',async()=>{
 const h=harness(),p=core.createCharacter('탐험');h.api.start(p);const itinerary=['olympic','town','gym','town','crossroads','station6','dojo','station6','crossroads','town','park','subway','rooftop','relay','canal','foundry','gangnam','pocha','gangnam','foundry','nexus','foundry','canal','relay','rooftop','subway','depths','alley','town'];
 for(const to of itinerary){const portal=core.MAPS[p.map].portals.find(x=>x.to===to);assert.ok(portal);const pending=h.api.travel(portal);await h.flush();await pending;assert.equal(p.map,to);assert.equal(p.x,portal.spawnX);assert.ok(p.visited.includes(to));assert.equal(h.api.get().monsters.length,core.monsterCount(to));if(to==='gym'){p.hp=1;p.mp=0;advance(h,1);assert.ok(p.hp>=12.99);assert.ok(p.mp>=5.99);}}
 assert.equal(p.visited.length,17);
});

function render(h){h.draws.length=0;h.labels.length=0;h.arcs.length=0;h.strokes.length=0;h.api.render();return h.draws;}

test('town NPCs and station sign stay anchored to the street during movement and camera easing',()=>{
 const h=harness(),p=core.createCharacter('거리');h.api.start(p);h.api.setView(1440);
 const check=()=>{
  render(h);const camera=h.api.get().camera;
  const street=h.draws.find(d=>d.asset==='assets/city.png'&&d.height===810&&Math.abs(d.x+camera)<1e-8);
  assert.ok(street,'the street landmark uses the same camera as actors');
  for(const [text,x] of [['현토리',650],['마구리',1060],[core.MAPS.town.name,290]]){
   const label=h.labels.find(l=>l.text===text);assert.ok(label);assert.ok(Math.abs(label.x-street.x-x)<1e-8,`${text} slid against the street`);
  }
 };
 check();
 for(const direction of ['ArrowRight','ArrowLeft']){
  h.api.keys.add(direction);for(let i=0;i<120;i++){h.api.update(.05);check();}
  h.api.keys.clear();for(let i=0;i<30;i++){h.api.update(.05);check();}
 }
 assert.ok(h.api.get().camera<1e-6);
});
test('camera shake moves the background, NPCs and sign together',()=>{
 const h=harness(),p=core.createCharacter('흔들림');h.api.start(p);h.api.setView(1440);
 render(h);const beforeStreet=h.draws.find(d=>d.asset==='assets/city.png'&&d.height===810&&d.x===0),before=h.labels.find(l=>l.text==='현토리');
 h.api.setShake(8);render(h);
 const afterStreet=h.draws.filter(d=>d.asset==='assets/city.png'&&d.height===810).sort((a,b)=>Math.abs(a.x)-Math.abs(b.x))[0],after=h.labels.find(l=>l.text==='현토리');
 assert.ok(Math.abs((after.x-afterStreet.x)-(before.x-beforeStreet.x))<1e-8);
 assert.ok(Math.abs((after.y-afterStreet.y)-(before.y-beforeStreet.y))<1e-8);
});
test('background tiles cover map boundaries, tile transitions and viewports wider than a map',()=>{
 const h=harness();
 for(const [map,width,positions] of [['rooftop',1000,[45,2049,2051,3555]],['gym',2000,[45,1555]]]){
  const p=core.createCharacter('연결');p.map=map;h.api.start(p);
  for(const x of positions){p.x=x;h.api.setView(width);render(h);
   const tiles=h.draws.filter(d=>d.asset==='assets/districts.png'&&d.height===810).sort((a,b)=>a.x-b.x);
   assert.ok(tiles[0].x<=0);assert.ok(tiles.at(-1).x+tiles.at(-1).width>=width);
   for(let i=1;i<tiles.length;i++)assert.ok(Math.abs(tiles[i-1].x+tiles[i-1].width-tiles[i].x)<1e-8);
   const camera=h.api.get().camera;for(const tile of tiles)assert.ok(Math.abs((tile.x+camera)/tile.width-Math.round((tile.x+camera)/tile.width))<1e-8);
   assert.ok(camera>=0&&camera<=Math.max(0,core.MAPS[map].width-width));
  }
 }
});

function swordHarness(){
 const h=harness(),p=core.createCharacter('검사');Object.assign(p,{level:15,job:'swordsman',map:'alley',x:700,hp:380,mp:200});h.api.start(p);
 h.api.get().monsters.forEach((m,i)=>Object.assign(m,{x:800+i*70,home:800+i*70,y:p.y,hp:10000,maxHp:10000,speed:0}));
 return {h,p,monsters:h.api.get().monsters};
}
test('trainer dialog changes job once and updates persistent class-specific skills',()=>{
 const h=harness(),p=core.createCharacter('수련');p.level=10;p.map='dojo';p.x=780;h.api.start(p);h.api.interact();
 assert.equal(h.api.get().modal,'job');assert.match(h.el('#modal-root').innerHTML,/검사로 전직하기/);h.el('#advance-job').onclick();assert.equal(p.job,'swordsman');assert.equal(JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0].job,'swordsman');
 assert.match(h.el('#game-ui').innerHTML,/막기/);assert.match(h.el('#game-ui').innerHTML,/섬광 연참/);
});
test('swordsman block works at full HP, blocks contact and expires after one second',()=>{
 const {h,p,monsters}=swordHarness();advance(h,2.1);p.hp=core.maxHp(p);monsters.forEach(m=>m.x=p.x);h.api.cast('e');assert.equal(h.api.get().guardTime,1);const hp=p.hp;
 advance(h,.9);assert.equal(p.hp,hp);assert.ok(h.api.get().guardTime>0);advance(h,.6);assert.equal(h.api.get().guardTime,0);assert.ok(p.hp<hp);
});
test('sword ultimate targets nearest unique enemies one by one, caps at five and auto-strikes exactly once',()=>{
 const {h,p,monsters}=swordHarness();assert.equal(h.api.startSwordCharge(),true);assert.equal(p.mp,170);assert.equal(p.cooldowns.r,30);assert.equal(h.api.get().swordUlt.targets.length,1);
 const first=monsters[0].id;assert.equal(h.api.get().swordUlt.targets[0],first);assert.equal(h.api.startSwordCharge(),false);h.api.cast('q');assert.equal(p.mp,170);
 h.api.update(.6);assert.equal(h.api.get().swordUlt.targets.length,2);h.api.update(2.4);assert.equal(h.api.get().swordUlt.phase,'striking');assert.equal(h.api.get().swordUlt.targets.length,5);assert.equal(new Set(h.api.get().swordUlt.targets).size,5);
 const marked=new Set(h.api.get().swordUlt.targets);h.api.releaseSword('keyboard');advance(h,1);assert.equal(h.api.get().swordUlt,null);for(const m of monsters)assert.equal(m.hp,marked.has(m.id)?10000-core.attackPower(p)*7:10000);
 assert.ok(p.x>1000);const hp=monsters[0].hp;h.api.releaseSword('keyboard');advance(h,.5);assert.equal(monsters[0].hp,hp);assert.ok(p.cooldowns.r>25);
});
test('early release strikes marked living targets only; no enemies means no cost',()=>{
 const {h,p,monsters}=swordHarness();h.api.startSwordCharge();h.api.update(.65);monsters[0].dead=true;
 h.api.releaseSword('keyboard');advance(h,.5);assert.equal(monsters[0].hp,10000);assert.equal(monsters[1].hp,10000-core.attackPower(p)*14);assert.equal(monsters[2].hp,10000);
 const empty=harness(),safe=core.createCharacter('안전');safe.level=15;safe.job='swordsman';empty.api.start(safe);assert.equal(empty.api.startSwordCharge(),false);assert.equal(safe.mp,60);assert.equal(safe.cooldowns.r,0);
});
test('sword ultimate acquires the nearest five across the current map and frames distant edge targets',()=>{
 for(const fromRight of [false,true])for(const width of [750,1440])for(const single of [false,true]){
  const h=harness(),p=core.createCharacter('맵 조준');
  Object.assign(p,{level:30,job:'swordsman',map:'nexus',x:fromRight?3955:45,y:580,hp:1000,mp:200});
  h.api.start(p);h.api.setView(width);
  const monsters=h.api.get().monsters,positions=single?[3955]:[3955,1450,3350,2050,2750,1050];
  monsters.forEach((m,i)=>{const x=positions[i%positions.length];Object.assign(m,{dead:i>=positions.length,respawnIn:100,x:fromRight?4000-x:x,home:fromRight?4000-x:x,y:720,speed:0,hp:10000,maxHp:10000});});
  const expected=Array.from(monsters).filter(m=>!m.dead).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,5).map(m=>m.id);
  assert.ok(monsters.filter(m=>!m.dead).every(m=>Math.hypot(m.x-p.x,m.y-p.y)>650));
  assert.equal(h.api.startSwordCharge(),true);assert.equal(p.mp,170);assert.equal(p.cooldowns.r,30);
  assert.deepEqual(Array.from(h.api.get().swordUlt.targets),expected.slice(0,1));
  advance(h,2.5);render(h);const state=h.api.get();
  assert.equal(state.swordUlt.phase,'charging');assert.deepEqual(Array.from(state.swordUlt.targets),expected);
  assert.ok(Number.isFinite(state.cameraZoom)&&state.cameraZoom>0);assert.ok(Number.isFinite(state.camera));
  for(const draw of h.draws)for(const key of ['x','y','width','height'])assert.ok(Number.isFinite(draw[key]),key);
  for(const id of expected){const m=monsters.find(m=>m.id===id),screenX=(m.x-state.camera)*state.cameraZoom+state.viewShakeX;assert.ok(screenX>42&&screenX<width-42,`${screenX} clipped at ${width}`);}
  h.api.releaseSword('keyboard');advance(h,1);assert.equal(h.api.get().swordUlt,null);
  for(const m of monsters)assert.equal(m.hp,expected.includes(m.id)?10000-core.attackPower(p)*(single?14:7):10000);
  advance(h,1.5);assert.equal(h.api.get().cameraZoom,1);assert.ok(h.api.get().camera>=0);assert.ok(h.api.get().camera<=Math.max(0,core.MAPS[p.map].width-width));
 }
});
test('map-wide sword targeting cannot acquire enemies left behind in another map',async()=>{
 const {h,p,monsters}=swordHarness();
 const pending=h.api.travel(core.MAPS.alley.portals.find(portal=>portal.to==='depths'));await h.flush();await pending;
 assert.equal(p.map,'depths');const current=h.api.get().monsters;
 current.forEach((m,i)=>Object.assign(m,{x:1500+i*150,home:1500+i*150,y:720,speed:0,hp:10000,maxHp:10000}));
 assert.equal(h.api.startSwordCharge(),true);advance(h,2.5);
 const marked=Array.from(h.api.get().swordUlt.targets);assert.equal(marked.length,5);
 assert.ok(marked.every(id=>current.some(m=>m.id===id)));assert.ok(marked.every(id=>monsters.every(m=>m.id!==id)));
 h.api.releaseSword('keyboard');advance(h,1);assert.ok(monsters.every(m=>m.hp===10000));
});
test('keyboard hold/release and pointer ownership use the same charge without duplicate activation',()=>{
 const {h,p,monsters}=swordHarness(),event={code:'KeyR',repeat:false,preventDefault(){},target:{matches(){return false;}}};h.events.get('keydown')(event);assert.equal(h.api.get().swordUlt.phase,'charging');h.events.get('keydown')({...event,repeat:true});assert.equal(p.mp,170);h.events.get('keyup')({code:'KeyR'});advance(h,.3);assert.ok(monsters[0].hp<10000);
 p.cooldowns.r=0;p.mp=200;const b=h.el('r-button');b.dataset.skill='r';h.api.bindSkillButton(b);b.listeners.get('pointerdown')({pointerId:4,preventDefault(){}});h.events.get('keyup')({code:'KeyR'});assert.equal(h.api.get().swordUlt.phase,'charging');b.listeners.get('pointerup')({pointerId:4});assert.equal(h.api.get().swordUlt.phase,'striking');b.onclick({detail:1});assert.equal(p.mp,170);advance(h,.3);
 p.cooldowns.r=0;b.listeners.get('pointerdown')({pointerId:5,preventDefault(){}});b.listeners.get('pointercancel')({pointerId:5});assert.equal(h.api.get().swordUlt,null);
});
test('one locked target doubles sword R even with other enemies nearby, without repeating damage or costs',()=>{
 const {h,p,monsters}=swordHarness();h.api.startSwordCharge();h.api.releaseSword('keyboard');
 const ult=h.api.get().swordUlt;assert.equal(ult.targets.length,1);assert.equal(ult.damageMultiplier,2);
 assert.equal(p.mp,170);assert.equal(p.cooldowns.r,30);h.api.releaseSword('keyboard');assert.equal(ult.damageMultiplier,2);
 advance(h,.4);assert.equal(monsters[0].hp,10000-core.attackPower(p)*14);assert.ok(monsters.slice(1).every(m=>m.hp===10000));assert.equal(h.api.get().swordUlt,null);
 h.api.releaseSword('keyboard');advance(h,.4);assert.equal(monsters[0].hp,10000-core.attackPower(p)*14);
});
test('single-target bonus is frozen at release and never grows when a multi-target cast loses targets',()=>{
 const {h,p,monsters}=swordHarness();h.api.startSwordCharge();h.api.update(.65);h.api.releaseSword('keyboard');
 assert.equal(h.api.get().swordUlt.damageMultiplier,1);monsters[0].dead=true;advance(h,.4);
 assert.equal(monsters[0].hp,10000);assert.equal(monsters[1].hp,10000-core.attackPower(p)*7);
 const empty=swordHarness();empty.h.api.startSwordCharge();empty.monsters[0].dead=true;empty.h.api.releaseSword('keyboard');
 assert.equal(empty.h.api.get().swordUlt.damageMultiplier,1);advance(empty.h,.3);assert.equal(empty.h.api.get().swordUlt,null);
 assert.ok(empty.monsters.every(m=>m.hp===10000));assert.equal(empty.p.mp<180,true);assert.ok(empty.p.cooldowns.r>29);
 assert.equal(empty.h.api.get().effects.some(e=>e.type==='swordBlink'),false);
});

test('ultimate dash trail follows actual left, right, diagonal, edge and zero-distance teleports and expires',()=>{
 for(const [fromX,toX,fromY,toY] of [[900,2400,580,720],[2400,80,720,580],[45,2555,650,650],[1000,1038,650,650]]){
  const {h,p,monsters}=swordHarness();Object.assign(p,{x:fromX,y:fromY});monsters.forEach((m,i)=>Object.assign(m,{dead:i!==0,respawnIn:100,x:toX,home:toX,y:toY}));
  h.api.startSwordCharge();h.api.updateCamera(1);h.api.releaseSword('keyboard');h.api.update(.01);
  const s=h.api.get(),trail=s.effects.find(e=>e.type==='swordBlink');assert.ok(trail);assert.equal(trail.solo,true);
  closeTo(trail.x,fromX);closeTo(trail.y,fromY-50);closeTo(trail.toX,p.x);closeTo(trail.toY,p.y-50);
  h.strokes.length=0;h.api.drawEffects();
  for(const stroke of h.strokes){assert.ok(Number.isFinite(stroke.width));for(const point of stroke.path){assert.ok(Number.isFinite(point.x));assert.ok(Number.isFinite(point.y));}}
  if(Math.hypot(trail.toX-trail.x,trail.toY-trail.y)>=1){
   const spine=h.strokes.find(stroke=>stroke.color==='#ffe45c'&&stroke.width>20&&stroke.path.length===2);assert.ok(spine);
   closeTo(spine.path[0].x,fromX-s.camera);closeTo(spine.path[0].y,fromY-50);closeTo(spine.path[1].x,p.x-s.camera);closeTo(spine.path[1].y,p.y-50);
   assert.ok(h.strokes.some(stroke=>stroke.color==='#111117'&&stroke.width>spine.width));assert.ok(h.strokes.some(stroke=>stroke.color==='#fff9ce'));
  }
  advance(h,.6);assert.equal(h.api.get().effects.some(e=>e.type==='swordBlink'),false);
 }
});
test('charge and strikes cancel on lifecycle changes without delayed hits or cooldown refunds',async()=>{
 for(const phase of ['charging','striking'])for(const action of ['map','travel','blur','hidden','pagehide','selection','death']){
  const {h,p,monsters}=swordHarness();h.api.startSwordCharge();if(phase==='striking')h.api.releaseSword('keyboard');
  if(action==='map')h.api.worldMap();if(action==='travel'){const pending=h.api.travel(core.MAPS.alley.portals[0]);await h.flush();await pending;}
  if(['blur','pagehide'].includes(action))h.windowEvents.get(action).forEach(f=>f());
  if(action==='hidden'){h.document.hidden=true;h.events.get('visibilitychange')();}
  if(action==='selection')h.api.selectCharacters();if(action==='death')h.api.die();
  assert.equal(h.api.get().swordUlt,null,phase+' '+action);assert.ok(p.cooldowns.r>0);advance(h,4);assert.equal(monsters[0].hp,10000);
 }
});
test('reload cancels pending sword attacks but retains profession, MP cost and cooldown',async()=>{
 const {h,p}=swordHarness();h.api.startSwordCharge();h.api.save();h.api.selectCharacters();const pending=h.api.enterWorld(p.id);await h.flush();await pending;
 const restored=h.api.get().player;assert.equal(restored.job,'swordsman');assert.equal(restored.mp,170);assert.equal(restored.cooldowns.r,30);assert.equal(h.api.get().swordUlt,null);assert.equal(h.api.get().guardTime,0);
});

test('normal and muscular penguins use distinct walking frames driven by actual ground travel',()=>{
 for(const powered of [false,true]){
  const h=harness(),p=core.createCharacter('걸음');Object.assign(p,{level:15,job:'bodybuilder',powerTime:powered?12:0});h.api.start(p);
  const sheet=powered?'assets/penguin-power-walk.png':'assets/penguin-walk.png',poses=new Set();h.api.keys.add('ArrowRight');
  for(let i=0;i<40;i++){h.api.update(1/60);render(h);const sprite=h.draws.find(d=>d.asset===sheet);assert.ok(sprite);poses.add(JSON.stringify(sprite.source));assert.ok(Math.abs(sprite.y+sprite.height-p.y)<3);}
  assert.ok(poses.size>=5,'arms and legs advance through several actual sprite poses');
  h.api.keys.clear();const phase=h.api.get().walkPhase;advance(h,.5);render(h);assert.equal(h.api.get().walkPhase,phase);assert.equal(h.api.get().walking,false);assert.equal(h.draws.some(d=>d.asset===sheet),false);
 }
});
test('outward wall input is idle; sliding along a wall walks, and jumping never runs in midair',()=>{
 const h=harness(),p=core.createCharacter('벽');p.x=45;h.api.start(p);h.api.keys.add('ArrowLeft');advance(h,.2);assert.equal(h.api.get().walkPhase,0);assert.equal(h.api.get().walking,false);
 h.api.keys.add('ArrowDown');advance(h,.2);assert.ok(h.api.get().walkPhase>0);assert.equal(h.api.get().walking,true);
 h.api.jump();const phase=h.api.get().walkPhase;advance(h,.3);render(h);assert.equal(h.api.get().walkPhase,phase);assert.equal(h.api.get().walking,false);assert.equal(h.draws.some(d=>d.asset==='assets/penguin-walk.png'),false);
});
test('dash, sword teleport and knockback do not count as footsteps',()=>{
 const {h,p,monsters}=swordHarness();h.api.cast('w');h.api.update(.01);assert.equal(h.api.get().walkPhase,0);assert.equal(h.api.get().walking,false);
 p.cooldowns.r=0;h.api.startSwordCharge();h.api.releaseSword('keyboard');advance(h,.5);assert.equal(h.api.get().walkPhase,0);
 const knock=harness(),victim=core.createCharacter('피격');victim.map='alley';knock.api.start(victim);const m=knock.api.get().monsters[0];m.x=victim.x;m.y=victim.y;m.home=victim.x;const x=victim.x;advance(knock,2.1);assert.notEqual(victim.x,x);assert.equal(knock.api.get().walkPhase,0);
});
test('walking pauses in menus/hidden tabs, clears on blur and resets between scenes',async()=>{
 const h=harness(),p=core.createCharacter('휴식');h.api.start(p);h.api.keys.add('ArrowRight');advance(h,.15);const phase=h.api.get().walkPhase;
 h.api.worldMap();advance(h,.4);render(h);assert.equal(h.api.get().walkPhase,phase);assert.equal(h.api.get().walking,false);assert.equal(h.draws.some(d=>d.asset==='assets/penguin-walk.png'),false);
 h.api.closeModal();h.api.keys.add('ArrowRight');h.document.hidden=true;h.events.get('visibilitychange')();advance(h,.3);assert.equal(h.api.get().walkPhase,phase);
 h.document.hidden=false;h.api.keys.add('ArrowRight');advance(h,.1);h.windowEvents.get('blur').forEach(f=>f());assert.equal(h.api.get().walking,false);
 const pending=h.api.travel(core.MAPS.town.portals.find(x=>x.to==='gym'));await h.flush();await pending;assert.equal(h.api.get().walkPhase,0);assert.equal(h.api.get().walking,false);
});

const key=(h,code,repeat=false)=>h.events.get('keydown')({code,repeat,preventDefault(){},target:{matches(){return false;}}});
test('inventory toggles with I, pauses movement and binds numbers without consuming items',()=>{
 const h=harness(),p=core.createCharacter('가방');p.returnScrolls=2;p.hp=10;h.api.start(p);h.api.keys.add('ArrowRight');key(h,'KeyI');const x=p.x;advance(h,1);
 assert.equal(h.api.get().modal,'inventory');assert.equal(p.x,x);assert.equal(h.api.keys.size,0);
 h.api.inventory('returnScrolls');key(h,'Digit2');assert.equal(p.quickSlots[1],'returnScrolls');assert.equal(p.returnScrolls,2);assert.equal(p.hp,10);
 h.api.inventory('potions');key(h,'Digit3');assert.equal(p.quickSlots[2],'potions');assert.equal(p.potions,3);
 const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.deepEqual(saved.quickSlots,['potions','returnScrolls','potions']);
 key(h,'KeyI');assert.equal(h.api.get().modal,null);key(h,'Digit3');assert.equal(p.potions,2);assert.equal(p.hp,70);key(h,'Digit3',true);assert.equal(p.potions,2);
 key(h,'Digit1');assert.equal(p.potions,1);assert.equal(p.hp,100);key(h,'Digit1');assert.equal(p.potions,1);
 p.quickSlots[0]=null;key(h,'Digit1');assert.equal(p.potions,1);h.api.worldMap();key(h,'Digit3');assert.equal(p.potions,1);
});
test('scroll recall clears dungeon, jump and charge state and immediately saves the destination',()=>{
 for(const fromBag of [false,true]){
  const {h,p}=swordHarness();p.returnScrolls=2;p.quickSlots[1]='returnScrolls';p.hp=37;h.api.startSwordCharge();const mp=p.mp;
  if(fromBag){h.api.inventory('returnScrolls');h.el('#bag-use').onclick();}else key(h,'Digit2');
  assert.equal(p.map,'town');assert.equal(p.returnScrolls,1);assert.equal(p.hp,37);assert.equal(p.mp,mp);assert.equal(p.job,'swordsman');assert.equal(h.api.get().monsters.length,0);assert.equal(h.api.get().swordUlt,null);assert.equal(h.api.get().pz,0);assert.equal(h.api.get().modal,null);assert.equal(h.api.keys.size,0);
  const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.map,'town');assert.equal(saved.returnScrolls,1);assert.equal(saved.x,530);assert.equal(saved.cooldowns.r,30);
  key(h,'Digit2');assert.equal(p.returnScrolls,1);
 }
});
test('Maguri sells potions and both destination scrolls in both towns without overspending',()=>{
 for(const map of ['town','gangnam']){
  const h=harness(),p=core.createCharacter('쇼핑');p.map=map;p.x=1060;p.money=2000;h.api.start(p);h.api.interact();assert.equal(h.api.get().modal,'shop');assert.match(h.el('#modal-root').innerHTML,/마구리/);
  const gangnamPrice=map==='town'?1500:100;assert.ok(h.el('#modal-root').innerHTML.includes(`${gangnamPrice.toLocaleString()}원 · 구매`));
  for(const id of ['returnScrolls','gangnamScrolls']){assert.ok(h.el('#modal-root').innerHTML.includes(core.ITEMS[id].name));h.el(`#buy-${id}`).onclick();assert.equal(p[id],1);}
  assert.equal(p.money,1900-gangnamPrice);h.el('#buy-potions').onclick();assert.equal(p.potions,4);assert.equal(p.money,1850-gangnamPrice);
  const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.returnScrolls,1);assert.equal(saved.gangnamScrolls,1);
  for(const [id,price] of [['returnScrolls',100],['gangnamScrolls',gangnamPrice]]){
   p.money=price-1;h.api.shop();assert.ok(h.el('#modal-root').innerHTML.includes(`id="buy-${id}" disabled>${price.toLocaleString()}원 · 구매`));
   h.el(`#buy-${id}`).onclick();assert.equal(p[id],1);assert.equal(p.money,price-1);
  }
 }
});
test('buying repeatedly preserves the shop dialog and refreshes stock, balance and affordability',()=>{
 for(const map of ['town','gangnam']){
  const h=harness(),p=core.createCharacter('스크롤');Object.assign(p,{map,money:1700});h.api.start(p);h.api.shop();
  const body=h.el('.npc-dialog-body'),help=h.el('.npc-details'),button=h.el('#buy-gangnamScrolls');
  body.scrollTop=120;help.open=true;h.document.activeElement=button;
  const dialogMarkup=h.el('#modal-root').innerHTML;
  Object.defineProperty(h.el('#modal-root'),'innerHTML',{get:()=>dialogMarkup,set(){assert.fail('a purchase must not rebuild the dialog');}});
  for(let i=0;i<2;i++){
   const price=core.itemPrice(p,'gangnamScrolls'),balance=p.money,stock=p.gangnamScrolls;
   button.onclick();
   assert.equal(p.gangnamScrolls,stock+(balance>=price?1:0));
   assert.equal(body.scrollTop,120);assert.equal(help.open,true);assert.equal(h.document.activeElement,button);
   assert.equal(h.el('.shop-money').textContent,`${p.money.toLocaleString()}원`);
   assert.equal(h.el('#shop-stock-gangnamScrolls').textContent,`즉시 귀환 · 보유 ${p.gangnamScrolls}개`);
   for(const id of ['potions','largePotions','mpPotions','returnScrolls','gangnamScrolls'])assert.equal(h.el(`#buy-${id}`).disabled,p.money<core.itemPrice(p,id));
  }
 }
});
test('both recall scrolls appear in the bag, bind independently and work between towns after reload',async()=>{
 const h=harness(),p=core.createCharacter('왕복귀환');Object.assign(p,{returnScrolls:2,gangnamScrolls:2,hp:31,mp:17});h.api.start(p);
 h.api.inventory('returnScrolls');key(h,'Digit2');h.api.inventory('gangnamScrolls');key(h,'Digit3');
 assert.match(h.el('#modal-root').innerHTML,/강남역 귀환 주문서/);assert.match(h.el('#modal-root').innerHTML,/역삼역 1번 출구 귀환 주문서/);
 assert.deepEqual(p.quickSlots,['potions','returnScrolls','gangnamScrolls']);assert.equal(p.returnScrolls,2);assert.equal(p.gangnamScrolls,2);
 h.api.closeModal();key(h,'Digit3');assert.equal(p.map,'gangnam');assert.equal(p.gangnamScrolls,1);assert.equal(p.returnScrolls,2);assert.equal(p.hp,31);assert.equal(p.mp,17);
 key(h,'Digit3');assert.equal(p.gangnamScrolls,1);h.api.selectCharacters();const pending=h.api.enterWorld(p.id);await h.flush();await pending;
 const restored=h.api.get().player;assert.equal(restored.map,'gangnam');assert.deepEqual(Array.from(restored.quickSlots),['potions','returnScrolls','gangnamScrolls']);
 key(h,'Digit2');assert.equal(restored.map,'town');assert.equal(restored.returnScrolls,1);assert.equal(restored.gangnamScrolls,1);assert.equal(restored.hp,31);assert.equal(restored.mp,17);
 key(h,'Digit2');assert.equal(restored.returnScrolls,1);
 const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.map,'town');assert.equal(saved.returnScrolls,1);assert.equal(saved.gangnamScrolls,1);assert.ok(saved.visited.includes('gangnam'));
});
test('profession equipment follows idle, walking and airborne player while town uses new NPC sprites',()=>{
 const h=harness(),p=core.createCharacter('장비');p.level=15;h.api.start(p);render(h);
 assert.ok(h.draws.some(d=>d.asset==='assets/npc-hyuntori-white.png'));assert.ok(h.draws.some(d=>d.asset==='assets/npc-maguri-large-crate.png'));assert.equal(h.draws.some(d=>d.asset==='assets/job-equipment.png'),false);
 for(const job of ['bodybuilder','swordsman'])for(const power of [0,12]){
  p.job=job;p.powerTime=power;h.api.start(p);render(h);const idle=h.draws.find(d=>d.asset==='assets/job-equipment.png');assert.ok(idle);assert.equal(idle.source[0],job==='bodybuilder'?72:688);
  h.api.keys.add('ArrowRight');h.api.update(.12);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/job-equipment.png'));h.api.keys.clear();h.api.update(.01);render(h);const ground=h.draws.find(d=>d.asset==='assets/job-equipment.png');
  h.api.jump();advance(h,.3);render(h);const air=h.draws.find(d=>d.asset==='assets/job-equipment.png');assert.ok(air.y<ground.y-40);h.api.keys.clear();
 }
});

function cameraHarness(width=1440,x=1650){
 const h=harness(),p=core.createCharacter('시야');Object.assign(p,{level:15,job:'swordsman',map:'subway',x,hp:380,mp:200});h.api.start(p);h.api.setView(width);
 h.api.get().monsters.forEach((m,i)=>Object.assign(m,{x:x+[-600,-400,140,380,600,850][i],home:x+[-600,-400,140,380,600,850][i],y:p.y,hp:10000,maxHp:10000,speed:0}));
 return {h,p};
}
test('sword camera reveals both targeting extremes on desktop and narrow screens with readable unnumbered reticles',()=>{
 for(const width of [1440,750]){
  const {h,p}=cameraHarness(width);assert.equal(h.api.get().cameraZoom,1);h.api.startSwordCharge();advance(h,2.5);render(h);
  const state=h.api.get();assert.ok(state.cameraZoom<=.59);assert.ok(width/state.cameraZoom>1500);assert.equal(state.swordUlt.targets.length,5);
  for(const id of state.swordUlt.targets){const m=state.monsters.find(m=>m.id===id),screenX=(m.x-state.camera)*state.cameraZoom;assert.ok(screenX>42&&screenX<width-42,`${screenX} clipped at width ${width}`);}
  assert.equal(h.labels.filter(l=>/^[1-5]$/.test(l.text)).length,0);const reticles=h.arcs.filter(a=>Math.abs(a.radius-31)<1e-8);assert.equal(reticles.length,5);assert.ok(state.shake>=2);
 }
});
test('sword camera stays centered through teleports and returns smoothly after completion',()=>{
 const {h,p}=cameraHarness();h.api.startSwordCharge();advance(h,2.6);const before=h.api.get(),center=before.camera+before.screenWidth/(2*before.cameraZoom);h.api.releaseSword('keyboard');assert.ok(h.api.get().shake>=20);
 for(let i=0;i<5;i++){h.api.update(.13);const s=h.api.get();if(s.swordUlt){assert.ok(Math.abs(s.camera+s.screenWidth/(2*s.cameraZoom)-center)<3);assert.ok(s.cameraZoom<.6);}}
 advance(h,.6);assert.equal(h.api.get().swordUlt,null);advance(h,1.5);assert.equal(h.api.get().cameraZoom,1);assert.equal(h.api.get().shake,0);
});
test('zoomed background extensions cover canvas edges and pointer inverse matches the rendered world',()=>{
 for(const width of [750,1440,2400])for(const x of [80,1650,3200]){
  const {h,p}=cameraHarness(width,x);h.api.startSwordCharge();advance(h,.7);render(h);const s=h.api.get();
  const background=h.draws.filter(d=>d.asset==='assets/districts.png');assert.ok(Math.min(...background.map(d=>d.x))<=0);assert.ok(Math.max(...background.map(d=>d.x+d.width))>=width);
  for(const screenX of [0,width/2,width])for(const screenY of [0,400,809])assert.ok(background.some(d=>screenX>=d.x&&screenX<=d.x+d.width&&screenY>=d.y&&screenY<=d.y+d.height),`uncovered ${screenX},${screenY}`);
  const screenX=(p.x-s.camera)*s.cameraZoom+s.viewShakeX,screenY=p.y*s.cameraZoom+650*(1-s.cameraZoom)+s.viewShakeY,world=h.api.screenToWorld(screenX,screenY);assert.ok(Math.abs(world.x-p.x)<1e-8);assert.ok(Math.abs(world.y-p.y)<1e-8);
 }
});
test('every cancellation path resets the cinematic camera even while the game is paused',async()=>{
 for(const action of ['inventory','map','blur','hidden','travel','death','selection','pointer']){
  const {h,p}=cameraHarness();h.api.startSwordCharge();advance(h,.6);assert.ok(h.api.get().cameraZoom<1);
  if(action==='inventory')h.api.inventory();if(action==='map')h.api.worldMap();if(action==='blur')h.windowEvents.get('blur').forEach(f=>f());if(action==='hidden'){h.document.hidden=true;h.events.get('visibilitychange')();}
  if(action==='travel'){const task=h.api.travel(core.MAPS.subway.portals[0]);await h.flush();await task;}if(action==='death')h.api.die();if(action==='selection')h.api.selectCharacters();if(action==='pointer')h.api.cancelSword();
  const s=h.api.get();assert.equal(s.cameraZoom,1,action);assert.equal(s.shake,0,action);assert.equal(s.swordUlt,null,action);
 }
 const {h,p}=cameraHarness();p.mp=0;assert.equal(h.api.startSwordCharge(),false);assert.equal(h.api.get().cameraZoom,1);assert.equal(h.api.get().shake,0);
});

test('charge knockback and moving marked enemies widen framing without shifting the original focus',()=>{
 const {h,p}=cameraHarness(750);h.api.startSwordCharge();advance(h,1);const initialZoom=h.api.get().cameraZoom,focus=h.api.get().swordUlt.focusX;
 // A marked enemy keeps moving while contact damage pushes the caster out of the original circle.
 p.x+=81;const s=h.api.get(),far=s.monsters[4];far.x=focus+713;far.home=far.x;s.swordUlt.targets.push(far.id);advance(h,.6);render(h);
 const current=h.api.get();assert.equal(current.swordUlt.focusX,focus);assert.ok(current.cameraZoom<initialZoom);const mark=h.arcs.find(a=>Math.abs(a.radius-31)<1e-8&&Math.abs(a.x-((far.x-current.camera)*current.cameraZoom+current.viewShakeX))<1e-8);assert.ok(mark);assert.ok(mark.x+41<750);assert.ok(mark.x-41>0);
 const wide=current.cameraZoom;far.x=focus+400;far.home=far.x;p.x=focus;advance(h,.4);assert.ok(h.api.get().cameraZoom<=wide+.001);
});

test('actual contact briefly winces in both forms, keeps movement responsive and resumes walking',()=>{
 for(const powered of [false,true]){
  const h=harness(),p=core.createCharacter('표정');Object.assign(p,{map:'alley',x:1000,level:15,job:'bodybuilder',powerTime:powered?12:0,hp:380});h.api.start(p);
  const group=h.api.get().monsters;group.forEach(m=>{m.dead=true;m.respawnIn=100;});advance(h,2.1);
  const m=group[0];Object.assign(m,{dead:false,x:p.x,y:p.y,speed:0});const before=p.hp;h.api.update(.01);
  assert.ok(p.hp<before);assert.equal(h.api.get().hurtTime,.32);render(h);
  const asset=powered?'assets/penguin-power-poses.png':'assets/penguin-hurt.png',crop=powered?[974,9,676,870]:[274,156,726,965];
  assert.ok(h.draws.some(d=>d.asset===asset&&JSON.stringify(d.source)===JSON.stringify(crop)));
  m.dead=true;const x=p.x;h.api.keys.add('ArrowRight');advance(h,.1);assert.ok(p.x>x);assert.ok(h.api.get().hurtTime>0);
  h.api.cast('q');assert.ok(p.cooldowns.q>0,'hurt is a visual reaction, not a stun');advance(h,.45);assert.equal(h.api.get().hurtTime,0);render(h);
  assert.ok(h.draws.some(d=>d.asset===(powered?'assets/penguin-power-walk.png':'assets/penguin-walk.png')));
  h.api.keys.clear();h.api.update(.01);render(h);
  if(powered)assert.ok(h.draws.some(d=>d.asset===asset&&JSON.stringify(d.source)===JSON.stringify([145,9,676,870])));
 }
});
test('invulnerability and guard do not trigger hurt; travel and death clear the reaction',async()=>{
 const h=harness(),p=core.createCharacter('방어');Object.assign(p,{map:'alley',x:1000,level:15,job:'swordsman',hp:380});h.api.start(p);
 const group=h.api.get().monsters;group.forEach(m=>{m.dead=true;m.respawnIn=100;});const m=group[0];Object.assign(m,{dead:false,x:p.x,y:p.y,speed:0});
 h.api.update(.01);assert.equal(h.api.get().hurtTime,0);assert.equal(p.hp,380);
 m.dead=true;advance(h,2.1);h.api.cast('e');Object.assign(m,{dead:false,x:p.x,y:p.y});h.api.update(.01);assert.equal(h.api.get().hurtTime,0);assert.equal(p.hp,380);
 m.dead=true;advance(h,2.6);Object.assign(m,{dead:false,x:p.x,y:p.y});h.api.update(.01);assert.ok(h.api.get().hurtTime>0);
 const pending=h.api.travel(core.MAPS.alley.portals.find(p=>p.to==='town'));assert.equal(h.api.get().hurtTime,0);await h.flush();await pending;assert.equal(h.api.get().hurtTime,0);
 p.map='alley';h.api.start(p);h.api.get().monsters.forEach(m=>{m.dead=true;m.respawnIn=100;});advance(h,2.1);p.hp=1;Object.assign(h.api.get().monsters[0],{dead:false,x:p.x,y:p.y,speed:0});h.api.update(.01);
 assert.equal(h.api.get().scene,'dead');assert.equal(h.api.get().hurtTime,0);
});
test('saved level six characters can immediately use W, while level five stays locked',async()=>{
 for(const level of [5,6]){
  const h=harness(),p=core.createCharacter('질주');p.level=level;h.api.start(p);h.api.save();h.api.selectCharacters();const pending=h.api.enterWorld(p.id);await h.flush();await pending;
  const restored=h.api.get().player,x=restored.x,mp=restored.mp;h.api.cast('w');assert.equal(restored.x-x,level===6?230:0);assert.equal(restored.mp,mp-(level===6?12:0));
 }
});

test('crossroads robots hurt the player and award loot, while exit six remains safe',()=>{
 const h=harness(),p=core.createCharacter('사거리');Object.assign(p,{map:'crossroads',x:700});h.api.start(p);
 const group=h.api.get().monsters;assert.equal(group.length,6);group.forEach(m=>{m.dead=true;m.respawnIn=100;});advance(h,2.1);
 const m=group[0];Object.assign(m,{dead:false,x:p.x,y:p.y,speed:0});const hp=p.hp;h.api.update(.01);assert.ok(p.hp<hp);
 h.api.hitMonster(m,m.hp);assert.equal(p.kills,1);assert.ok(p.xp>0);assert.ok(h.api.get().drops.some(d=>d.type==='money'));
 p.map='station6';h.api.start(p);assert.equal(h.api.get().monsters.length,0);const hurtHp=p.hp;advance(h,1);assert.ok(p.hp>hurtHp);
});


test('map recommends the Lv13 hunting area and gives the next real portal from the player position',()=>{
 const h=harness(),p=core.createCharacter('경로');p.level=13;p.x=530;h.api.start(p);h.api.worldMap();
 assert.match(h.el('#modal-root').innerHTML,/Lv. 13 추천 사냥터/);assert.match(h.el('#modal-root').innerHTML,/고레벨 던전/);
 h.el('#map-recommend').onclick();let detail=h.el('#map-details').innerHTML;assert.match(detail,/<h3>방치된 중계소<\/h3>/);assert.match(detail,/포탈 4번/);assert.match(detail,/왼쪽으로 이동/);assert.match(detail,/왼쪽부터 1번째 포탈/);assert.match(detail,/data-map-link="park"/);
 assert.equal(p.map,'town');assert.equal(p.x,530);assert.equal(h.api.get().modal,'world-map');
 h.api.showMapDetails('dojo');detail=h.el('#map-details').innerHTML;assert.match(detail,/포탈 3번/);assert.match(detail,/오른쪽으로 이동/);assert.match(detail,/왼쪽부터 4번째 포탈/);
 h.api.showMapDetails('nexus');assert.match(h.el('#map-details').innerHTML,/Lv. 25–30/);assert.match(h.el('#map-details').innerHTML,/현재 레벨보다 강한 적/);
});
test('every new dungeon supports combat rewards, respawning and exact saved re-entry',async()=>{
 for(const id of ['relay','canal','foundry','nexus']){
  const h=harness(),p=core.createCharacter('심야사냥');Object.assign(p,{map:id,level:core.MAPS[id].minLevel,job:'swordsman',x:600,y:648});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);
  const group=h.api.get().monsters;assert.equal(group.length,core.monsterCount(id));const m=group[0];m.y=p.y;
  const beforeHp=m.hp;h.api.cast('q');assert.ok(m.hp<beforeHp);h.api.hitMonster(m,10000);const xp=p.xp;assert.ok(xp>0);assert.equal(p.kills,1);h.api.hitMonster(m,10000);assert.equal(p.xp,xp);
  p.x=m.x;advance(h,.1);assert.ok(p.money>500);assert.equal(p.cores,1);
  // Isolate respawn/save verification from the new map-wide patrol encounters.
  group.forEach(enemy=>enemy.speed=0);p.x=60;p.y=680;advance(h,12.2);assert.equal(m.dead,false);assert.equal(m.hp,m.maxHp);
  p.x=1743;p.y=691;h.api.save();h.api.selectCharacters();const pending=h.api.enterWorld(p.id);await h.flush();await pending;
  const saved=h.api.get().player;assert.equal(saved.map,id);assert.equal(saved.x,1743);assert.equal(saved.y,691);assert.equal(saved.job,'swordsman');assert.ok(saved.visited.includes(id));assert.equal(h.api.get().monsters.length,core.monsterCount(id));
 }
});
test('new dungeon backgrounds use four distinct in-bounds atlas quadrants',()=>{
 const h=harness(),p=core.createCharacter('배경');const sources=new Set();
 for(const id of ['relay','canal','foundry','nexus']){p.map=id;h.api.start(p);const draws=render(h).filter(d=>d.asset==='assets/high-dungeons.png'&&d.height===810);assert.ok(draws.length);const source=draws[0].source;assert.equal(source[2],750);assert.equal(source[3],500);assert.ok(source[0]>=0&&source[0]+source[2]<=1500);assert.ok(source[1]>=0&&source[1]+source[3]<=1000);sources.add(source.join(','));}
 assert.equal(sources.size,4);
});


test('jump animates distinct crouch, ascent, apex, descent and landing poses in both forms',()=>{
 for(const powered of [false,true]){
  const h=harness(),p=core.createCharacter('도약');Object.assign(p,{job:'bodybuilder',level:15,powerTime:powered?12:0});h.api.start(p);
  const asset=powered?'assets/penguin-power-jump.png':'assets/penguin-jump.png',poses=new Set(),x=p.x,y=p.y;
  h.api.keys.add('ArrowRight');key(h,'Space');const prep=h.api.get().jumpPrep;
  key(h,'Space',true);h.api.jump();assert.equal(h.api.get().jumpPrep,prep,'repeated input must not restart preparation');
  let highest=0,sawLanding=false;
  for(let i=0;i<75;i++){
   render(h);const sprite=h.draws.find(d=>d.asset===asset&&d.source[2]>100);
   if(sprite)poses.add(JSON.stringify(sprite.source));
   assert.equal(p.y,y);highest=Math.max(highest,h.api.get().pz);
   if(h.api.get().jumpLanding>0){sawLanding=true;assert.equal(h.api.get().pz,0);}
   if(sprite)assert.equal(h.draws.some(d=>d.asset.includes('-walk.png')),false);
   h.api.update(1/60);
  }
  assert.equal(poses.size,6);assert.ok(highest>90&&highest<120);assert.ok(sawLanding);assert.ok(p.x>x+200);
  assert.equal(h.api.get().jumpPrep,0);assert.equal(h.api.get().jumpLanding,0);assert.equal(h.api.get().pz,0);
  render(h);assert.ok(h.draws.some(d=>d.asset===(powered?'assets/penguin-power-walk.png':'assets/penguin-walk.png')));
 }
});
test('jump pauses in menus, cannot double-jump and clears on travel and recall',async()=>{
 const h=harness(),p=core.createCharacter('착지');h.api.start(p);h.api.jump();advance(h,.25);
 const before=h.api.get();h.api.jump();assert.equal(h.api.get().pvz,before.pvz);assert.equal(h.api.get().pz,before.pz);
 h.api.worldMap();advance(h,2);assert.equal(h.api.get().pz,before.pz);h.api.closeModal();advance(h,1);assert.equal(h.api.get().pz,0);
 h.api.jump();const travel=h.api.travel(core.MAPS.town.portals.find(p=>p.to==='gym'));await h.flush();await travel;
 assert.equal(h.api.get().jumpPrep,0);assert.equal(h.api.get().jumpLanding,0);assert.equal(h.api.get().pz,0);
 p.returnScrolls=1;p.quickSlots[1]='returnScrolls';h.api.jump();advance(h,.2);h.api.useQuickSlot(1);
 assert.equal(p.map,'town');assert.equal(h.api.get().jumpPrep,0);assert.equal(h.api.get().jumpLanding,0);assert.equal(h.api.get().pz,0);
});
test('airborne form changes preserve the jump and sword charge cancels all jump poses',()=>{
 const h=harness(),p=core.createCharacter('공중변신');Object.assign(p,{job:'bodybuilder',level:15,mp:200});h.api.start(p);h.api.jump();advance(h,.25);
 const z=h.api.get().pz;h.api.cast('r');assert.equal(h.api.get().pz,z);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/penguin-power-jump.png'));
 p.powerTime=.01;h.api.update(.02);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/penguin-jump.png'));advance(h,1);assert.equal(h.api.get().pz,0);
 const sword=swordHarness();sword.h.api.jump();advance(sword.h,.2);sword.h.api.startSwordCharge();render(sword.h);
 assert.equal(sword.h.api.get().pz,0);assert.equal(sword.h.api.get().jumpPrep,0);assert.equal(sword.h.api.get().jumpLanding,0);assert.equal(sword.h.draws.some(d=>d.asset.endsWith('-jump.png')),false);
});

function bossHarness(job='swordsman'){
 const h=harness(),p=core.createCharacter('결투');Object.assign(p,{level:20,job,map:'pocha',x:1040,y:650,hp:480,mp:250,potions:20,returnScrolls:2,gangnamScrolls:2});h.api.start(p);return {h,p};
}
test('boss waits as an NPC, starts only on confirmation and blocks ordinary room exits',async()=>{
 const {h,p}=bossHarness();const b=h.api.get().boss;assert.equal(h.api.get().monsters.length,0);h.api.hitMonster(b,1000);assert.equal(b.hp,bossCore.SOLDIER.hp);h.api.cast('r');assert.equal(h.api.get().swordUlt,null);
 h.api.interact();assert.equal(h.api.get().modal,'boss-talk');advance(h,5);assert.equal(b.active,false);h.el('#challenge-boss').onclick();assert.equal(b.active,true);assert.equal(h.api.get().monsters[0],b);assert.equal(h.api.findInteraction(),null);
 await h.api.travel(core.MAPS.pocha.portals[0]);assert.equal(p.map,'pocha');assert.equal(b.active,true);p.hp=300;b.phase='recover';b.elapsed=-10;advance(h,1);assert.equal(p.hp,300,'no safe-room passive regeneration during combat');
});
test('boss potion cooldown is shared by all shortcuts and inventory, pauses in menus, and starts only on success',()=>{
 const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;b.phase='recover';b.elapsed=-30;p.quickSlots=['potions','potions','potions'];
 h.api.useQuickSlot(0);assert.equal(p.potions,20);assert.equal(h.api.get().potionCooldown,0);p.hp=100;h.api.useQuickSlot(0);assert.equal(p.hp,160);assert.equal(p.potions,19);assert.equal(h.api.get().potionCooldown,10);
 h.api.useQuickSlot(1);h.api.useQuickSlot(2);assert.equal(p.potions,19);h.api.inventory();h.api.useInventoryItem('potions',true);advance(h,12);assert.equal(h.api.get().potionCooldown,10);assert.equal(p.potions,19);
 h.api.closeModal();advance(h,10.1);assert.equal(h.api.get().potionCooldown,0);h.api.useQuickSlot(2);assert.equal(p.potions,18);assert.equal(p.hp,220);assert.equal(h.api.get().potionCooldown,10);
});
test('boss rapid combo inflicts distinct hits, guard blocks it and sustained beams repeat damage',()=>{
 const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;b.phase='recover';b.elapsed=-10;advance(h,1);p.x=900;p.y=650;
 Object.assign(b,{x:800,y:650,dir:1,phase:'flurry',elapsed:0,strikes:0});const hits=[];
 for(let frame=0;frame<60;frame++){const before=p.hp;h.api.update(1/60);if(p.hp<before)hits.push(before-p.hp);}
 assert.deepEqual(hits,[48,48,48,48,48]);assert.equal(p.hp,480-48*5);assert.equal(h.api.get().hurtTime>0,true);
 p.hp=480;Object.assign(b,{phase:'flurry',elapsed:0,strikes:0});h.api.cast('e');advance(h,1);assert.equal(p.hp,480);
 b.phase='recover';b.elapsed=-10;advance(h,2);b.projectiles=[{x:p.x-10,y:p.y,dir:1,life:3,spent:false}];advance(h,.5);assert.equal(p.hp,192);assert.equal(b.projectiles.length,1);
 p.y=720;const hp=p.hp;advance(h,.4);assert.equal(p.hp,hp);p.y=650;advance(h,.02);assert.equal(p.hp,hp-144);
});
test('boss defeat gives one reward per victory, saves XP and equips the unique uniform',()=>{
 const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;h.api.hitMonster(b,bossCore.SOLDIER.hp);assert.equal(b.dead,true);assert.equal(b.active,false);assert.equal(p.bossWins,1);assert.equal(p.uniform,1);assert.equal(p.kills,1);assert.equal(p.level,22);assert.equal(p.xp,220);assert.equal(h.api.get().modal,'boss-victory');
 h.api.winBoss();h.api.hitMonster(b,999999);assert.equal(p.bossWins,1);assert.equal(p.xp,220);const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.uniform,1);assert.equal(saved.bossWins,1);
 h.el('#equip-reward').onclick();assert.equal(p.uniformEquipped,true);const x=p.x;h.api.keys.add('ArrowRight');for(let i=0;i<30;i++)h.api.update(1/60);h.api.keys.clear();assert.ok(Math.abs(p.x-x-188.1)<.01);assert.equal(JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0].uniformEquipped,true);
 h.api.startBossFight();h.api.hitMonster(b,bossCore.SOLDIER.hp);assert.equal(p.uniform,1);assert.equal(p.bossWins,2);
});
test('boss abandonment, recall, death and reload reset combat without carrying projectiles or potion time',async()=>{
 const {h,p}=bossHarness();h.api.startBossFight();p.hp=200;h.api.useInventoryItem('potions');const hp=p.hp;h.api.abandonBoss();assert.equal(p.hp,hp);assert.equal(h.api.get().boss.active,false);assert.equal(h.api.get().boss.hp,bossCore.SOLDIER.hp);assert.equal(h.api.get().potionCooldown,0);
 h.api.startBossFight();h.api.hitMonster(h.api.get().boss,1000);h.api.save();h.api.selectCharacters();const entry=h.api.enterWorld(p.id);await h.flush();await entry;const restored=h.api.get().player;assert.equal(restored.map,'pocha');assert.equal(h.api.get().boss.active,false);assert.equal(h.api.get().boss.hp,bossCore.SOLDIER.hp);
 h.api.startBossFight();h.api.useInventoryItem('returnScrolls');assert.equal(restored.map,'town');assert.equal(h.api.get().boss,null);assert.equal(h.api.get().potionCooldown,0);assert.equal(restored.returnScrolls,1);
 const again=bossHarness();again.h.api.startBossFight();again.h.api.die();assert.equal(again.p.map,'town');assert.equal(again.h.api.get().boss,null);assert.equal(again.p.bossWins,0);
});
test('either scroll escapes a live boss by bag or shortcut and resets combat without healing or rewards',()=>{
 for(const id of ['returnScrolls','gangnamScrolls'])for(const fromBag of [false,true]){
  const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;b.phase='recover';b.elapsed=-30;
  p.hp=120;h.api.useInventoryItem('potions');assert.equal(h.api.get().potionCooldown,10);
  if(fromBag){h.api.jump();advance(h,.2);assert.ok(h.api.get().pz>0);}else{h.api.startSwordCharge();assert.ok(h.api.get().swordUlt);}
  b.projectiles=[{x:400,y:650,dir:1,life:1,spent:false}];const hp=p.hp,mp=p.mp;p.quickSlots[2]=id;
  if(fromBag){h.api.inventory(id);h.el('#bag-use').onclick();}else key(h,'Digit3');
  const state=h.api.get(),destination=core.ITEMS[id].recall;
  assert.equal(p.map,destination.map);assert.equal(p[id],1);assert.equal(p.hp,hp);assert.equal(p.mp,mp);assert.equal(p.bossWins,0);assert.equal(p.uniform,0);
  assert.equal(state.boss,null);assert.equal(state.potionCooldown,0);assert.equal(state.monsters.length,0);assert.equal(state.swordUlt,null);assert.equal(state.pz,0);assert.equal(state.pvz,0);assert.equal(state.modal,null);assert.equal(state.guardTime,0);
  const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.map,destination.map);assert.equal(saved.x,destination.x);assert.equal(saved[id],1);assert.equal(saved.hp,hp);assert.equal(saved.mp,mp);
  assert.equal(saved.cooldowns.r,fromBag?0:30);
 }
});
test('sword ultimate marks boss once and waits for an already-marked airborne target before striking',()=>{
 const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;b.x=p.x+100;b.phase='recover';b.elapsed=-10;h.api.startSwordCharge('keyboard');advance(h,.7);assert.deepEqual(Array.from(h.api.get().swordUlt.targets),[b.id]);
 b.phase='leap';b.elapsed=0;b.from={x:b.x,y:b.y};b.target={x:b.x,y:b.y,dir:-1};h.api.releaseSword('keyboard');advance(h,.2);assert.equal(b.hp,bossCore.SOLDIER.hp);assert.ok(h.api.get().swordUlt);advance(h,.8);assert.equal(b.hp,bossCore.SOLDIER.hp-core.attackPower(p)*14);assert.equal(h.api.get().swordUlt,null);
});
test('map-wide sword targeting respects an inactive or airborne boss and reaches a distant active boss',()=>{
 const {h,p}=bossHarness();assert.equal(h.api.startSwordCharge(),false);
 h.api.startBossFight();const b=h.api.get().boss;p.x=45;b.x=core.MAPS.pocha.width-45;b.phase='leap';
 const mp=p.mp;assert.equal(h.api.startSwordCharge(),false);assert.equal(p.mp,mp);assert.equal(p.cooldowns.r,0);
 b.phase='recover';b.elapsed=-10;assert.equal(h.api.startSwordCharge(),true);
 assert.deepEqual(Array.from(h.api.get().swordUlt.targets),[b.id]);
 h.api.releaseSword('keyboard');advance(h,.3);assert.equal(b.hp,bossCore.SOLDIER.hp-core.attackPower(p)*14);
});
test('boss sprites and warning lanes render on the same world camera as the room',()=>{
 const {h,p}=bossHarness();h.api.setView(1000);render(h);const bg=h.draws.find(d=>d.asset==='assets/hansabal-pocha.png'&&Math.abs(d.x+h.api.get().camera)<1e-8),soldier=h.draws.find(d=>d.asset==='assets/soldier-boss.png');assert.ok(bg);assert.ok(soldier);assert.equal(soldier.source.length,4);
 h.api.startBossFight();const b=h.api.get().boss;for(const phase of ['slash-windup','palm-charge','leap','landing','flurry','palm-release']){b.phase=phase;b.target={x:800,y:650,dir:1};b.z=phase==='leap'?200:0;render(h);assert.ok(h.draws.some(d=>d.asset==='assets/soldier-boss.png'));}
 for(const phase of ['counter-windup','counter']){b.phase=phase;b.elapsed=.3;b.z=0;render(h);assert.ok(h.draws.some(d=>d.asset==='assets/soldier-counter.png'));}
});
test('boss pursuit animates eight valid walking poses, keeps feet on the ground and mirrors with the camera',()=>{
 const atlas=fs.readFileSync(new URL('../dist/assets/soldier-walk.png',import.meta.url)),width=atlas.readUInt32BE(16),height=atlas.readUInt32BE(20);
 for(const dir of [-1,1]){
  const {h,p}=bossHarness();h.api.setView(1000);h.api.startBossFight();const b=h.api.get().boss;
  Object.assign(b,{x:dir<0?1200:400,y:650});p.x=dir<0?300:1400;const crops=new Set();
  for(let i=0;i<8;i++){
   h.api.update(.08);assert.equal(b.phase,'approach');assert.equal(b.walking,true);assert.equal(b.dir,dir);render(h);
   const sprite=h.draws.find(d=>d.asset==='assets/soldier-walk.png');assert.ok(sprite);
   const [x,y,w,hgt]=sprite.source;assert.ok(x>=0&&y>=0&&w>0&&hgt>0&&x+w<=width&&y+hgt<=height);
   crops.add(sprite.source.join(','));assert.ok(Math.abs(sprite.y+sprite.height-b.y)<12,'the sprite stays registered to the floor');
  }
  assert.equal(crops.size,8,'a complete stride displays eight distinct poses');
  b.dir=-1;render(h);const left=h.draws.find(d=>d.asset==='assets/soldier-walk.png');
  b.dir=1;render(h);const right=h.draws.find(d=>d.asset==='assets/soldier-walk.png');
  assert.ok(Math.abs(left.x+left.width+right.x-2*(b.x-h.api.get().camera))<1e-8,'facing mirrors around the same body anchor');
  assert.equal(left.y,right.y);assert.ok(Math.abs(left.width-right.width)<1e-8);
  p.x=200;h.api.updateCamera(1);render(h);const before=h.draws.find(d=>d.asset==='assets/soldier-walk.png'),camera=h.api.get().camera;
  p.x=1300;h.api.updateCamera(1);render(h);const after=h.draws.find(d=>d.asset==='assets/soldier-walk.png'),cameraDelta=h.api.get().camera-camera;
  assert.ok(cameraDelta>100);assert.ok(Math.abs(after.x-before.x+cameraDelta)<1e-8);assert.equal(after.y,before.y);
 }
});
test('boss walking art never overrides stationary, waiting, dead, airborne or combat poses',()=>{
 const {h}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;
 const cases=[{walking:false},{active:false},{dead:true},{z:100},...['waiting','defeated','slash-windup','slash','palm-charge','palm-release','leap-charge','leap','landing','flurry','counter-windup','counter','recover'].map(phase=>({phase}))];
 for(const state of cases){
  Object.assign(b,{active:true,dead:false,phase:'approach',walking:true,walkPhase:.4,z:0,...state});render(h);
  assert.equal(h.draws.some(d=>d.asset==='assets/soldier-walk.png'),false,JSON.stringify(state));
  assert.ok(h.draws.some(d=>d.asset===`assets/${b.phase.startsWith('counter')?'soldier-counter':'soldier-boss'}.png`));
 }
});
test('counter preparation and reflection use white wind strokes and glow throughout their animations',()=>{
 const {h}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;
 for(const [phase,times] of [['counter-windup',[0,.35,.69]],['counter',[0,1.5,2.99]]])for(const elapsed of times){
  Object.assign(b,{phase,elapsed});h.strokes.length=0;h.labels.length=0;h.api.drawBossAura(b);
  assert.ok(h.strokes.length>0,'a visible wind warning is drawn');
  for(const stroke of h.strokes){assert.equal(stroke.color,'#ffffff');assert.equal(stroke.glow,'#ffffff');}
  const warning=h.labels.find(label=>label.text.includes('반격'));assert.ok(warning);assert.match(warning.color,/^#f[0-9a-f]f[0-9a-f]ff$/i);
 }
 b.active=false;h.strokes.length=0;h.api.drawBossAura(b);assert.equal(h.strokes.length,0);
});
test('all six counter poses have valid crops and remain fixed to the room while the camera moves',()=>{
 const atlas=fs.readFileSync(new URL('../dist/assets/soldier-counter.png',import.meta.url)),width=atlas.readUInt32BE(16),height=atlas.readUInt32BE(20);
 for(const dir of [-1,1]){
  const {h,p}=bossHarness();h.api.setView(1000);h.api.startBossFight();const b=h.api.get().boss;b.dir=dir;
  const crops=new Set();
  for(const [phase,times] of [['counter-windup',[0,.24,.47]],['counter',[0,.13,.25]]])for(const elapsed of times){
   Object.assign(b,{phase,elapsed});render(h);const sprite=h.draws.find(d=>d.asset==='assets/soldier-counter.png');assert.ok(sprite);
   const [x,y,w,hgt]=sprite.source;assert.equal(sprite.source.length,4);assert.ok(x>=0&&y>=0&&w>0&&hgt>0&&x+w<=width&&y+hgt<=height);crops.add(sprite.source.join(','));
  }
  assert.equal(crops.size,6);p.x=200;h.api.updateCamera(1);render(h);const before=h.draws.find(d=>d.asset==='assets/soldier-counter.png'),camera=h.api.get().camera;
  p.x=1300;h.api.updateCamera(1);render(h);const after=h.draws.find(d=>d.asset==='assets/soldier-counter.png'),cameraDelta=h.api.get().camera-camera;
  assert.ok(cameraDelta>100);assert.ok(Math.abs(after.x-before.x+cameraDelta)<1e-8);assert.equal(after.y,before.y);assert.ok(Math.abs(after.width-before.width)<1e-8);assert.ok(Math.abs(after.height-before.height)<1e-8);
 }
});

function counterHarness(job='swordsman',power=0){
 const {h,p}=bossHarness(job);h.api.startBossFight();const b=h.api.get().boss;b.phase='recover';b.elapsed=-20;advance(h,1);
 Object.assign(b,{x:p.x+100,y:p.y,phase:'counter',elapsed:0});p.powerTime=power;return {h,p,b};
}
function strikeCounter(h,key){
 if(key==='a')h.api.attack();else h.api.cast(key);
 if(h.api.get().swordUlt){h.api.releaseSword('keyboard');h.api.update(1/60);}
}
test('all offensive inputs reflect exactly once, including powered attacks, invulnerable dashes and damage-reduced sword ultimates',()=>{
 const cases=[['swordsman',0,'a',85],['swordsman',0,'q',178],['swordsman',0,'w',180],['swordsman',0,'r',36],['bodybuilder',0,'a',77],['bodybuilder',0,'q',160],['bodybuilder',0,'w',162],['bodybuilder',0,'r',162],['bodybuilder',12,'a',137],['bodybuilder',12,'q',162],['bodybuilder',12,'w',162]];
 for(const [job,power,key,expected] of cases){
  const {h,p,b}=counterHarness(job,power);assert.ok(h.api.get().invincible<=0);strikeCounter(h,key);
  assert.equal(p.hp,480-expected,`${job} ${key} power ${power}`);assert.equal(b.hp,b.maxHp);assert.equal(p.bossWins,0);assert.equal(p.kills,0);assert.equal(p.xp,0);
  if(key==='w'||key==='r'&&job==='bodybuilder')assert.ok(h.api.get().invincible>0,'offensive invulnerability does not swallow reflection');if(key==='r'&&job==='swordsman')assert.ok(h.api.get().invincible<=0,'sword R uses damage reduction without adding invincibility');
  render(h);assert.equal(h.labels.filter(l=>l.text===`−${expected} · 반격`).length,1);
  const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.hp,p.hp);assert.equal(saved.bossWins,0);
 }
});
test('counter warning and recovery accept damage while the full three-second stance is harmless unless attacked',()=>{
 const {h,p,b}=counterHarness();b.phase='counter-windup';h.api.hitMonster(b,200);assert.equal(b.hp,b.maxHp-200);assert.equal(p.hp,480);
 advance(h,.72);assert.equal(b.phase,'counter');const hp=b.hp;advance(h,2.9);assert.equal(b.phase,'counter');assert.equal(p.hp,480);
 h.api.hitMonster(b,200);assert.equal(p.hp,330);assert.equal(b.hp,hp);advance(h,.15);assert.equal(b.phase,'recover');
 h.api.hitMonster(b,200);assert.equal(b.hp,hp-200);assert.equal(p.hp,330);
});
test('counter ignores spawn invulnerability and guard, but every successful repeat attack still applies passive defense',()=>{
 const {h,p,b}=counterHarness();h.api.cast('e');assert.ok(h.api.get().guardTime>0);h.api.attack();assert.equal(p.hp,480);assert.equal(b.hp,b.maxHp);advance(h,1.01);h.api.attack();assert.equal(p.hp,395);
 h.api.attack();assert.equal(p.hp,395,'attack cooldown prevents duplicate input');advance(h,.35);h.api.attack();assert.equal(p.hp,310);
 const fresh=bossHarness();fresh.h.api.startBossFight();const freshBoss=fresh.h.api.get().boss;freshBoss.phase='counter';assert.ok(fresh.h.api.get().invincible>0);
 fresh.h.api.hitMonster(freshBoss,200);assert.equal(fresh.p.hp,330);assert.equal(freshBoss.hp,freshBoss.maxHp);
 for(const power of [0,12]){
  const builder=counterHarness('bodybuilder',power);builder.h.api.hitMonster(builder.b,200);builder.h.api.hitMonster(builder.b,200);
  assert.equal(builder.p.hp,210);assert.equal(builder.b.hp,builder.b.maxHp);
 }
});
test('lethal reflection safely ends every attack path and saves a clean town respawn without boss rewards',()=>{
 for(const [job,key] of [['swordsman','a'],['swordsman','q'],['swordsman','w'],['swordsman','r'],['bodybuilder','r']]){
  const {h,p,b}=counterHarness(job);p.hp=1;const money=p.money;strikeCounter(h,key);
  const state=h.api.get();assert.equal(state.scene,'dead',`${job} ${key}`);assert.equal(state.boss,null);assert.equal(state.swordUlt,null);assert.equal(state.guardTime,0);assert.equal(state.potionCooldown,0);
  assert.equal(p.map,'town');assert.equal(p.hp,core.maxHp(p));assert.equal(p.powerTime,0);assert.equal(p.uniform,0);assert.equal(p.bossWins,0);assert.equal(p.kills,0);assert.equal(p.xp,0);assert.equal(p.money,money);assert.equal(b.hp,b.maxHp);
  const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(saved.map,'town');assert.equal(saved.hp,core.maxHp(p));assert.equal(saved.powerTime,0);assert.equal(saved.bossWins,0);assert.equal(saved.uniform,0);
  h.api.hitMonster(b,99999);assert.equal(p.hp,core.maxHp(p));assert.equal(b.hp,b.maxHp,'stale attack cannot trigger a second hit after death');
  h.el('#revive').onclick();h.api.hitMonster(b,99999);assert.equal(p.hp,core.maxHp(p));assert.equal(b.hp,b.maxHp,'stale boss reference is rejected after revival');
 }
});

function deletionHarness(){
 const h=harness(),first=core.createCharacter('밤산책'),second=core.createCharacter('밤 산책');
 h.api.characters([first,second],second.id);h.api.save();h.api.deleteCharacterModal(second.id);
 return {h,first,second,input:h.el('#delete-confirmation'),button:h.el('#confirm-delete'),submit:()=>h.el('#delete-character-form').onsubmit({preventDefault(){}})};
}
test('character deletion requires the exact name, spaces and final period on every submission',()=>{
 const {h,input,button,submit}=deletionHarness(),saved=h.storage.get(core.SAVE_KEY);
 for(const value of ['', '밤산책 정말로 삭제하겠습니다.', '밤 산책 정말로 삭제하겠습니다', ' 밤 산책 정말로 삭제하겠습니다.', '밤 산책 정말로 삭제하겠습니다. ', '(밤 산책) 정말로 삭제하겠습니다.']){
  input.value=value;input.oninput();assert.equal(button.disabled,true);submit();assert.equal(h.api.get().records.length,2);assert.equal(h.storage.get(core.SAVE_KEY),saved);
 }
 input.value='밤 산책 정말로 삭제하겠습니다.';input.oninput();assert.equal(button.disabled,false);
});
test('confirmed deletion removes only the captured character, persists and handles duplicate submissions',()=>{
 const {h,first,second,input,submit}=deletionHarness();input.value='밤 산책 정말로 삭제하겠습니다.';input.oninput();const previousSubmit=h.el('#delete-character-form').onsubmit;
 submit();assert.deepEqual(Array.from(h.api.get().records,p=>p.id),[first.id]);assert.equal(h.api.get().selectedId,first.id);assert.equal(h.api.get().modal,null);assert.equal(h.api.get().player,null);assert.equal(h.api.get().scene,'characters');
 const stored=JSON.parse(h.storage.get(core.SAVE_KEY));assert.equal(stored.version,1);assert.deepEqual(stored.characters.map(p=>p.id),[first.id]);assert.ok(!stored.characters.some(p=>p.id===second.id));
 previousSubmit({preventDefault(){}});assert.equal(h.api.get().records.length,1);assert.equal(h.api.get().selectedId,first.id);
});
test('cancel and IME composition never delete a character, including a queued submit after closing',()=>{
 const {h,input,submit}=deletionHarness(),before=h.storage.get(core.SAVE_KEY);input.value='밤 산책 정말로 삭제하겠습니다.';input.oncompositionstart();submit();assert.equal(h.api.get().records.length,2);
 let prevented=false;h.el('#delete-character-form').onkeydown({key:'Enter',isComposing:true,preventDefault(){prevented=true;}});assert.equal(prevented,true);input.oncompositionend();assert.equal(h.el('#confirm-delete').disabled,false);
 h.el('#cancel-delete').onclick();submit();assert.equal(h.api.get().records.length,2);assert.equal(h.api.get().modal,null);assert.equal(h.storage.get(core.SAVE_KEY),before);
});
test('failed deletion storage write preserves selection and records and permits an explicit retry',()=>{
 const {h,second,input,submit}=deletionHarness(),before=h.storage.get(core.SAVE_KEY);input.value='밤 산책 정말로 삭제하겠습니다.';input.oninput();h.persistence.fail=true;submit();
 assert.equal(h.api.get().records.length,2);assert.equal(h.api.get().selectedId,second.id);assert.equal(h.api.get().modal,'delete-character');assert.equal(h.storage.get(core.SAVE_KEY),before);assert.match(h.el('#delete-error').textContent,/삭제하지 않았어요/);
 h.persistence.fail=false;submit();assert.equal(h.api.get().records.length,1);assert.equal(h.api.get().storageBroken,false);
});
test('last-character deletion produces an empty selection with creation available and no possible re-entry',async()=>{
 const h=harness(),p=core.createCharacter('마지막');h.api.characters([p],p.id);h.api.deleteCharacterModal(p.id);h.el('#delete-confirmation').value='마지막 정말로 삭제하겠습니다.';h.el('#delete-character-form').onsubmit({preventDefault(){}});
 assert.equal(h.api.get().records.length,0);assert.equal(h.api.get().selectedId,null);assert.match(h.el('#screens').innerHTML,/id="enter-world" disabled/);assert.match(h.el('#screens').innerHTML,/id="delete-character" disabled/);assert.match(h.el('#screens').innerHTML,/id="new-character"/);assert.equal(JSON.parse(h.storage.get(core.SAVE_KEY)).characters.length,0);
 await h.api.enterWorld(p.id);assert.equal(h.api.get().scene,'characters');assert.equal(h.api.get().player,null);
});

test('job passives survive old-save restore and respawn without stacking equipment bonuses',()=>{
 for(const [job,map,speed,damage] of [['swordsman','dojo',1.1,100],['bodybuilder','gym',1,90]]){
  const p=core.createCharacter('특성');p.level=10;p.map=map;
  assert.equal(core.movementMultiplier(p),1);assert.equal(core.incomingDamage(p,100),100);
  assert.equal(core.advanceJob(p,job).ok,true);assert.equal(core.movementMultiplier(p),speed);assert.equal(core.incomingDamage(p,100),damage);
  // No new saved fields are needed, including for characters created before these bonuses.
  let restored=core.normalizeCharacter(JSON.parse(JSON.stringify(p)));
  for(let i=0;i<3;i++){
   core.respawn(restored);restored.uniform=1;core.equipUniform(restored);
   assert.equal(core.movementMultiplier(restored),speed*1.2);assert.equal(core.incomingDamage(restored,100),damage);
   core.equipUniform(restored);assert.equal(core.movementMultiplier(restored),speed);
   restored=core.normalizeCharacter(JSON.parse(JSON.stringify(restored)));
  }
 }
});

test('swordsman moves 10% faster on every axis and in air while W follows its job-specific dash distance',()=>{
 for(const job of [null,'swordsman','bodybuilder'])for(const uniform of [false,true])for(const airborne of [false,true]){
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1]]){
   const h=harness(),p=core.createCharacter('보폭');Object.assign(p,{level:20,job,uniform:uniform?1:0,uniformEquipped:uniform,hp:480,mp:250});h.api.start(p);
   if(dx)h.api.keys.add(dx>0?'ArrowRight':'ArrowLeft');if(dy)h.api.keys.add(dy>0?'ArrowDown':'ArrowUp');if(airborne)h.api.jump();
   const x=p.x,y=p.y,norm=Math.hypot(dx,dy),speed=(job==='swordsman'?1.1:1)*(uniform?1.2:1);
   for(let i=0;i<12;i++)h.api.update(1/60);
   assert.ok(Math.abs(p.x-x-dx/norm*285*speed*.2)<.001);assert.ok(Math.abs(p.y-y-dy/norm*175*speed*.2)<.001);
   if(airborne)assert.ok(h.api.get().pz>0);
   h.api.keys.clear();const before=p.x;h.api.cast('w');assert.ok(Math.abs(Math.abs(p.x-before)-(job==='swordsman'?276:230))<.001);
  }
 }
});

test('bodybuilder reduces contact and all boss attack patterns in normal and powered form with matching damage labels',()=>{
 for(const [job,power,contact,slash,flurry,wave] of [[null,0,100,84,48,144],['swordsman',0,100,84,48,144],['bodybuilder',0,90,76,43,130],['bodybuilder',12,90,76,43,130]]){
  const h=harness(),p=core.createCharacter('강인함');Object.assign(p,{level:20,job,powerTime:power,map:'alley',x:1000,hp:480,mp:250});h.api.start(p);
  const group=h.api.get().monsters;group.forEach(m=>{m.dead=true;m.respawnIn=100;});advance(h,2.1);
  Object.assign(group[0],{dead:false,x:p.x,y:p.y,speed:0,attack:100});h.api.update(.01);assert.equal(p.hp,480-contact);
  render(h);assert.ok(h.labels.some(l=>l.text===`−${contact}`));const hp=p.hp;h.api.update(.01);assert.equal(p.hp,hp,'invulnerability still prevents repeat contact');
  for(const [phase,expected] of [['slash',slash],['flurry',flurry],['wave',wave]]){
   const {h:duel,p:fighter}=bossHarness(job);fighter.powerTime=power;duel.api.startBossFight();const b=duel.api.get().boss;b.phase='recover';b.elapsed=-10;advance(duel,1);
   fighter.x=900;fighter.y=650;Object.assign(b,{x:800,y:650,dir:1,phase:phase==='wave'?'recover':phase,elapsed:0,strikes:0});
   if(phase==='wave')b.projectiles=[{x:890,y:650,dir:1,life:3,spent:false}];
   duel.api.update(.01);assert.equal(fighter.hp,480-expected,`${job} ${phase} power ${power}`);
   render(duel);assert.ok(duel.labels.some(l=>l.text===`−${expected}`));
  }
 }
});


test('M opens the overview every time and retains the old detailed route guide as a tab',()=>{
 const h=harness(),p=core.createCharacter('지도보기');h.api.start(p);h.api.worldMap();
 assert.equal(h.api.get().mapView,'overview');assert.equal(h.el('#map-view-overview').hidden,false);assert.equal(h.el('#map-view-details').hidden,true);
 const html=h.el('#modal-root').innerHTML;assert.match(html,/role="tablist"/);assert.match(html,/상세 안내/);assert.match(html,/초반 사냥/);assert.match(html,/고레벨 던전/);assert.match(html,/마을 · 전직/);
 const graph=html.slice(html.indexOf('<div class="atlas-board">'),html.indexOf('<div class="atlas-legend">'));
 assert.equal([...graph.matchAll(/data-map="/g)].length,23);assert.equal([...graph.matchAll(/data-map-edge="/g)].length,23);assert.equal([...graph.matchAll(/aria-current="location"/g)].length,1);
 h.api.showMapView('details');assert.equal(h.el('#map-view-overview').hidden,true);assert.equal(h.el('#map-view-details').hidden,false);
 h.api.closeModal();h.api.worldMap();assert.equal(h.api.get().mapView,'overview');assert.equal(h.api.get().mapSelection,p.map);
});

test('overview selects a destination without moving the current location and shares it with details',()=>{
 const h=harness(),p=core.createCharacter('연결보기');p.map='canal';p.x=2000;p.visited.push('canal');h.api.start(p);h.api.worldMap();
 const before=JSON.stringify(p);h.api.selectMapDestination('pocha');
 assert.equal(h.api.get().mapView,'overview');assert.equal(h.api.get().mapSelection,'pocha');assert.equal(JSON.stringify(p),before);
 assert.match(h.el('#atlas-selection').innerHTML,/한사발포차 역삼점/);assert.match(h.el('#atlas-selection').innerHTML,/포탈 3번/);assert.match(h.el('#atlas-selection').innerHTML,/자동화 주조소부터/);assert.match(h.el('#atlas-selection').innerHTML,/왼쪽부터 2번째 포탈/);
 assert.match(h.el('#modal-root').innerHTML,/atlas-node hunt current visited" data-map="canal"/);
 h.api.showMapView('details');assert.match(h.el('#map-details').innerHTML,/<h3>한사발포차 역삼점<\/h3>/);
 h.api.showMapView('overview');h.el('#atlas-locate').onclick();assert.equal(h.api.get().mapSelection,'canal');assert.match(h.el('#atlas-selection').innerHTML,/바로 연결된 지역/);
});
test('the new safe town shows its current location and only its actual foundry and boss neighbors',()=>{
 const h=harness(),p=core.createCharacter('강남지도');p.map='gangnam';p.visited.push('gangnam');h.api.start(p);h.api.worldMap();
 assert.match(h.el('#modal-root').innerHTML,/atlas-node safe current visited" data-map="gangnam"/);
 const here=h.el('#atlas-selection').innerHTML;assert.match(here,/data-atlas-link="foundry"/);assert.match(here,/data-atlas-link="pocha"/);assert.doesNotMatch(here,/data-atlas-link="canal"/);
 h.api.selectMapDestination('pocha');assert.match(h.el('#atlas-selection').innerHTML,/포탈 1번/);assert.match(h.el('#atlas-selection').innerHTML,/왼쪽부터 2번째 포탈/);
 h.api.showMapView('details');assert.match(h.el('#map-details').innerHTML,/강남역/);assert.doesNotMatch(h.el('#map-details').innerHTML,/냉각수로 끝/);
});

function combatHarness(job='bodybuilder',power=0){
 const h=harness(),p=core.createCharacter('동작검증');Object.assign(p,{job,level:20,map:'alley',x:1000,y:650,hp:480,mp:250});h.api.start(p);
 h.api.get().monsters.forEach(m=>{m.dead=true;m.respawnIn=100;});advance(h,2.1);p.powerTime=power;
 return {h,p};
}
const closeTo=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,message||`${actual} differs from ${expected}`);

test('one-second sword guard rejects keyboard, held and pointer attacks before any resource or damage effect',()=>{
 const {h,p,monsters}=swordHarness();h.api.cast('q');assert.ok(h.api.get().combatMotion);h.api.cast('e');assert.equal(h.api.get().combatMotion,null);
 const mp=p.mp,cd=JSON.stringify(p.cooldowns),hp=monsters.map(m=>m.hp),x=p.x,effects=h.api.get().effects.length;
 for(const code of ['KeyA','KeyQ','KeyW','KeyE','KeyR']){key(h,code);h.events.get('keyup')({code});}
 h.api.keys.add('KeyA');h.api.attack();assert.equal(h.api.startSwordCharge('assist'),false);
 for(const skill of ['a','q','w','r']){const b=h.el(`guard-${skill}`);b.dataset.skill=skill;h.api.bindSkillButton(b);b.onclick({detail:0});if(skill==='r'){b.listeners.get('pointerdown')({pointerId:8,preventDefault(){}});b.listeners.get('pointerup')({pointerId:8});}}
 assert.equal(p.mp,mp);assert.equal(JSON.stringify(p.cooldowns),cd);assert.deepEqual(monsters.map(m=>m.hp),hp);assert.equal(p.x,x);assert.equal(h.api.get().effects.length,effects);assert.equal(h.api.get().swordUlt,null);
 h.api.update(.99);assert.ok(h.api.get().guardTime>0);assert.deepEqual(monsters.map(m=>m.hp),hp);h.api.keys.clear();h.api.update(.011);assert.equal(h.api.get().guardTime,0);
 h.api.attack();assert.ok(monsters[0].hp<hp[0]);assert.equal(h.api.startSwordCharge('assist'),true,'R can activate immediately after guard finishes');
});

test('sword guard blocks contact and every boss attack pattern without a hurt reaction',()=>{
 for(const phase of ['slash','flurry','wave']){
  const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;Object.assign(b,{phase:'recover',elapsed:-20});advance(h,1);
  p.x=900;p.y=650;Object.assign(b,{x:800,y:650,dir:1,phase:phase==='wave'?'recover':phase,elapsed:0,strikes:0});h.api.cast('e');
  if(phase==='wave')b.projectiles=[{x:890,y:650,dir:1,life:3,spent:false}];h.api.update(.01);
  assert.equal(p.hp,480,phase);assert.equal(h.api.get().hurtTime,0);assert.ok(h.api.get().guardTime>0);
 }
});

test('builder E heals over exactly 1.5 active seconds, pauses with gameplay, and preserves normal and powered budgets',()=>{
 for(const power of [0,12]){
  const {h,p}=combatHarness('bodybuilder',power);p.hp=10;const fraction=power?.7:.4,inv=h.api.get().invincible;h.api.cast('e');
  assert.equal(p.hp,10);assert.equal(h.api.get().invincible,inv);assert.equal(h.api.get().recovery.remaining,1.5);assert.equal(h.api.combatPose().kind,'recover');
  h.api.update(.75);closeTo(p.hp,10+480*fraction*.5);closeTo(h.api.get().recovery.remaining,.75);
  h.api.worldMap();const hp=p.hp;h.api.update(5);assert.equal(p.hp,hp);closeTo(h.api.get().recovery.remaining,.75);h.api.closeModal();
  h.document.hidden=true;h.api.update(5);assert.equal(p.hp,hp);h.document.hidden=false;
  h.api.update(.6);assert.ok(h.api.get().recovery);h.api.update(.2);closeTo(p.hp,10+480*fraction);assert.equal(h.api.get().recovery,null);
  const finished=p.hp;h.api.update(.5);assert.equal(p.hp,finished,'no delayed heal after the budget is spent');
 }
});

test('builder E can defend at full HP, caps healing, and blocks attacks in both forms',()=>{
 for(const power of [0,12]){
  const {h,p}=combatHarness('bodybuilder',power);h.api.cast('e');assert.ok(h.api.get().recovery);assert.equal(p.hp,480);assert.equal(h.api.playerDamage(100),45);
  const mp=p.mp,x=p.x,cd={...p.cooldowns},fx=h.api.get().effects.length;
  h.api.attack();for(const key of ['q','w','e','r'])h.api.cast(key);
  assert.equal(h.api.combatPose().kind,'recover');assert.equal(p.mp,mp);assert.equal(p.x,x);assert.deepEqual({...p.cooldowns},cd);assert.equal(h.api.get().effects.length,fx);assert.ok(h.api.get().recovery);
  h.api.update(.5);assert.equal(h.api.combatPose().kind,'recover');assert.equal(p.hp,480);h.api.update(1);assert.equal(p.hp,480);assert.equal(h.api.get().recovery,null);assert.equal(h.api.playerDamage(100),90);
  h.api.attack();assert.equal(h.api.combatPose().kind,'punch');h.api.cast('q');assert.ok(p.cooldowns.q>0);
 }
});

test('builder recovery slows all movement to 60 percent in either form and outfit, then restores normal speed',()=>{
 for(const power of [0,12])for(const equipped of [false,true])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]]){
  const {h,p}=combatHarness('bodybuilder',power);Object.assign(p,{uniform:1,uniformEquipped:equipped,x:1200,y:650,hp:10});
  if(dx)h.api.keys.add(dx>0?'ArrowRight':'ArrowLeft');if(dy)h.api.keys.add(dy>0?'ArrowDown':'ArrowUp');
  h.api.cast('e');const scale=equipped?1.2:1,norm=Math.hypot(dx,dy);h.api.update(.2);
  closeTo(p.x,1200+dx/norm*285*scale*.6*.2);closeTo(p.y,650+dy/norm*175*scale*.6*.2);
  assert.ok(h.api.get().walking);assert.ok(p.hp>10);assert.equal(h.api.playerDamage(100),45);
  h.api.keys.clear();h.api.update(1.3);assert.equal(h.api.get().recovery,null);assert.equal(h.api.playerDamage(100),90);
  p.x=1200;p.y=650;h.api.keys.add('ArrowRight');h.api.update(.2);closeTo(p.x,1200+285*scale*.2);
 }
});

test('recovery slow uses only its remaining lifetime when a movement frame crosses expiry',()=>{
 for(const power of [0,12]){
  const {h,p}=combatHarness('bodybuilder',power);p.x=1000;h.api.keys.add('ArrowRight');h.api.cast('e');
  h.api.update(1.4);closeTo(p.x,1000+285*.6*1.4);h.api.update(.2);
  closeTo(p.x,1000+285*(.6*1.5+.1));assert.equal(h.api.get().recovery,null);
  h.api.update(0);assert.ok(Number.isFinite(p.x));
 }
});

test('builder recovery halves contact, every boss pattern and counter after its passive, without adding invincibility',()=>{
 for(const power of [0,12]){
  const {h,p}=combatHarness('bodybuilder',power);h.api.cast('e');assert.ok(h.api.get().invincible<=0);const m=h.api.get().monsters[0];Object.assign(m,{dead:false,x:p.x,y:p.y,speed:0,attack:100});h.api.update(.01);assert.equal(p.hp,435);render(h);assert.ok(h.labels.some(l=>l.text==='−45'));
  for(const [phase,damage] of [['slash',38],['flurry',22],['wave',65]]){
   const {h:duel,p:fighter}=bossHarness('bodybuilder');duel.api.startBossFight();const b=duel.api.get().boss;Object.assign(b,{phase:'recover',elapsed:-20});advance(duel,1);fighter.powerTime=power;
   fighter.x=900;fighter.y=650;Object.assign(b,{x:800,y:650,dir:1,phase:phase==='wave'?'recover':phase,elapsed:0,strikes:0});duel.api.cast('e');
   if(phase==='wave')b.projectiles=[{x:890,y:650,dir:1,life:3,spent:false}];duel.api.update(.01);assert.equal(fighter.hp,480-damage,`${phase} power=${power}`);render(duel);assert.ok(duel.labels.some(l=>l.text===`−${damage}`));
  }
  const counter=counterHarness('bodybuilder',power);counter.h.api.cast('e');counter.h.api.hitMonster(counter.b,200);assert.equal(counter.p.hp,412,'150 reflected × .9 passive × .5 active = 68');assert.equal(counter.b.hp,counter.b.maxHp);
 }
});

test('sword R reduces real contact and boss hits during charge and strikes without granting offensive invincibility',()=>{
 for(const phase of ['charging','striking']){
  const {h,p}=combatHarness('swordsman');const m=h.api.get().monsters[0];Object.assign(m,{dead:false,x:p.x+100,home:p.x+100,y:p.y,speed:0,attack:100,hp:10000,maxHp:10000});
  assert.equal(h.api.startSwordCharge(),true);assert.ok(h.api.get().invincible<=0);assert.equal(h.api.playerDamage(100),20);
  if(phase==='striking')h.api.releaseSword('keyboard');else m.x=p.x;
  h.api.update(.01);assert.equal(p.hp,460,phase);assert.equal(h.api.get().swordUlt.phase,phase);h.api.cancelSword();assert.equal(h.api.playerDamage(100),100);assert.equal(h.api.get().combatMotion,null);
  for(const [pattern,damage] of [['slash',17],['flurry',10],['wave',29]]){
   const {h:duel,p:fighter}=bossHarness();duel.api.startBossFight();const b=duel.api.get().boss;Object.assign(b,{phase:'recover',elapsed:-20});advance(duel,1);fighter.x=900;fighter.y=650;Object.assign(b,{x:800,y:650,dir:1});duel.api.startSwordCharge();
   if(phase==='striking')duel.api.releaseSword('keyboard');Object.assign(b,{phase:pattern==='wave'?'recover':pattern,elapsed:0,strikes:0});
   if(pattern==='wave')b.projectiles=[{x:900,y:650,dir:1,length:100,originX:800,life:3,spent:false}];duel.api.update(.01);assert.equal(fighter.hp,480-damage,`${phase} ${pattern}`);
  }
 }
 const {h,p}=bossHarness();h.api.startBossFight();Object.assign(h.api.get().boss,{phase:'recover',elapsed:-20});advance(h,1);h.api.startSwordCharge();h.api.releaseSword('keyboard');h.api.update(.01);assert.ok(h.api.get().invincible<=0,'a strike itself does not introduce invincibility');assert.equal(h.api.get().swordUlt.phase,'striking');h.api.update(.2);assert.equal(h.api.get().swordUlt,null);assert.equal(h.api.playerDamage(100),100);
});

test('sword charge and strike counter damage use the same 80 percent reduction',()=>{
 const {h,p,b}=counterHarness();h.api.startSwordCharge();h.api.hitMonster(b,200);assert.equal(p.hp,450);assert.equal(h.api.get().swordUlt.phase,'charging');h.api.releaseSword('keyboard');h.api.update(.01);assert.equal(p.hp,414);assert.equal(b.hp,b.maxHp);assert.equal(h.api.get().swordUlt.phase,'striking');
});

test('every hunting monster recoils visibly, fades once on death and restores a clean respawn while boss reactions stay unchanged',()=>{
 for(const map of Object.values(core.MAPS).filter(m=>core.monsterCount(m.id)>0)){
  const h=harness(),p=core.createCharacter('로봇피격');Object.assign(p,{level:30,map:map.id,x:1000,y:650,hp:680,mp:350});h.api.start(p);const m=h.api.get().monsters[0];Object.assign(m,{x:1100,home:1100,y:650,speed:0,hp:10000,maxHp:10000});
  h.api.hitMonster(m,1);assert.equal(m.hit,.28);assert.equal(m.hitDir,1);assert.equal(m.hp,9999);assert.equal(h.api.get().effects.length,0,'untrained hits keep the robot recoil without elemental effects');
  h.api.update(.08);h.draws.length=0;h.api.drawMonster(m);const recoil=h.draws.find(d=>d.asset==='assets/robot.png');assert.ok(Math.abs(recoil.matrix[1])>0,`${map.id} has visible recoil rotation`);
  h.api.update(.25);assert.equal(m.hit,0);h.draws.length=0;h.api.drawMonster(m);closeTo(h.draws.find(d=>d.asset==='assets/robot.png').matrix[1],0);
  m.hp=1;h.api.hitMonster(m,1);assert.equal(m.dead,true);assert.equal(m.deathFx,.28);const kills=p.kills,xp=p.xp,drops=h.api.get().drops.length;h.api.hitMonster(m,999);assert.equal(p.kills,kills);assert.equal(p.xp,xp);assert.equal(h.api.get().drops.length,drops);
  h.api.update(.14);h.draws.length=0;h.api.drawMonster(m);const fading=h.draws.find(d=>d.asset==='assets/robot.png');assert.ok(fading.alpha>0&&fading.alpha<1);h.api.update(.15);h.draws.length=0;h.api.drawMonster(m);assert.equal(h.draws.length,0);
  p.x=45;m.respawnIn=.01;h.api.update(.02);assert.equal(m.dead,false);assert.equal(m.hp,m.maxHp);assert.equal(m.hit,0);assert.equal(m.deathFx,0);
 }
 const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;h.api.hitMonster(b,1);assert.equal(b.hit,.16);assert.equal(b.hitDir,undefined);assert.equal(b.deathFx,undefined);assert.equal(b.hp,b.maxHp-1);
});

test('class attack and guard poses select valid atlas rows, mirror correctly and never duplicate held equipment',()=>{
 const cases=[[null,0,'a','combat-brawler',0,'punch'],[null,0,'q','combat-brawler',0,'punch'],[null,0,'w','combat-brawler',1,'belly'],['bodybuilder',0,'a','combat-brawler',0,'punch'],['bodybuilder',0,'q','combat-brawler',0,'punch'],['bodybuilder',0,'w','combat-brawler',2,'shoulder'],['bodybuilder',0,'e','combat-brawler',3,'recover'],['bodybuilder',12,'a','combat-power',0,'punch'],['bodybuilder',12,'q','combat-power',0,'punch'],['bodybuilder',12,'w','combat-power',1,'shoulder'],['bodybuilder',12,'e','combat-power',2,'recover'],['swordsman',0,'a','combat-swordsman',0,'slash'],['swordsman',0,'q','combat-swordsman',0,'slash'],['swordsman',0,'w','combat-swordsman',1,'draw'],['swordsman',0,'e','combat-swordsman',2,'guard']];
 for(const [job,power,skill,asset,row,kind] of cases)for(const dir of [-1,1]){
  const {h,p}=combatHarness(job,power);h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.01);h.api.keys.clear();skill==='a'?h.api.attack():h.api.cast(skill);assert.equal(h.api.combatPose().kind,kind);
  const duration=h.api.get().combatMotion?.duration,samples=duration?[0,.2,.6,.9]:[0,.2];let elapsed=0;const seen=[];
  for(const fraction of samples){if(fraction)h.api.update((duration||1)*fraction-elapsed);elapsed=(duration||1)*fraction;h.api.setShake(0);render(h);
   const pose=h.api.combatPose(),draws=h.draws.filter(d=>d.asset===`assets/${asset}.png`);assert.equal(draws.length,1,`${job} ${skill}`);const body=draws[0],frame=h.api.COMBAT_SHEETS[asset].frames[row*4+pose.frame];assert.deepEqual(body.source,Array.from(frame.slice(0,4)));assert.equal(Math.sign(body.matrix[0]),dir);assert.equal(h.draws.filter(d=>d.asset==='assets/job-equipment.png').length,0);assert.ok(Number.isFinite(body.x)&&Number.isFinite(body.y));seen.push(body.source.join(','));
  }
  if(duration)assert.equal(new Set(seen).size,4,`${asset} ${skill} has windup, contact, followthrough and recovery poses`);
 }
 const {h}=combatHarness();for(const [asset,sheet] of Object.entries(h.api.COMBAT_SHEETS)){const data=fs.readFileSync(new URL(`../dist/assets/${asset}.png`,import.meta.url)),width=data.readUInt32BE(16),height=data.readUInt32BE(20);for(const [x,y,w,h] of sheet.frames){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,`${asset}: ${x},${y},${w},${h} outside ${width}×${height}`);}}
});

test('W keeps immediate combat distance while rendering a directional dash and excluding keyboard movement from its pose',()=>{
 for(const job of [null,'bodybuilder','swordsman'])for(const dir of [-1,1]){
  const {h,p}=combatHarness(job);h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.01);h.api.keys.clear();const start=p.x;h.api.cast('w');const destination=p.x;closeTo(destination-start,dir*(job==='swordsman'?276:230));closeTo(h.api.combatDisplayX(),start);const gait=h.api.get().walkPhase;
  h.api.keys.add('ArrowRight');h.api.update(.1);assert.equal(p.x,destination);assert.ok((h.api.combatDisplayX()-start)*dir>0);assert.ok((destination-h.api.combatDisplayX())*dir>0);assert.equal(h.api.get().walkPhase,gait);assert.equal(h.api.get().walking,false);
  h.api.keys.clear();h.api.update(.21);closeTo(h.api.combatDisplayX(),destination);assert.equal(h.api.get().combatMotion,null);
 }
});

test('combat motion, recovery and guard clear on world and scene changes and never enter character saves',async()=>{
 for(const mode of ['motion','recovery','guard'])for(const action of ['travel','scroll','death','selection','restart','boss']){
  const job=mode==='recovery'?'bodybuilder':'swordsman',{h,p}=action==='boss'?bossHarness(job):combatHarness(job);p.returnScrolls=1;p.hp=300;
  h.api.cast(mode==='motion'?'w':'e');const before=h.api.get();assert.ok(mode==='motion'?before.combatMotion:mode==='recovery'?before.recovery:before.guardTime);
  h.api.save();const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];for(const field of ['combatMotion','recovery','guardTime'])assert.equal(Object.hasOwn(saved,field),false);
  if(action==='travel'){const task=h.api.travel(core.MAPS[p.map].portals[0]);assert.equal(h.api.get().combatMotion,null);assert.equal(h.api.get().recovery,null);await h.flush();await task;}
  if(action==='scroll')h.api.useInventoryItem('returnScrolls');if(action==='death')h.api.die();if(action==='selection')h.api.selectCharacters();if(action==='restart')h.api.start(p);if(action==='boss')h.api.startBossFight();
  const state=h.api.get();assert.equal(state.combatMotion,null,`${mode} ${action}`);assert.equal(state.recovery,null,`${mode} ${action}`);assert.equal(state.guardTime,0,`${mode} ${action}`);
 }
});

test('sword guard ends its contact protection at one second without lingering invincibility',()=>{
 const {h,p}=combatHarness('swordsman'),m=h.api.get().monsters[0];Object.assign(m,{dead:false,x:p.x,y:p.y,speed:0,attack:100});h.api.cast('e');h.api.update(.9);h.api.update(.099);assert.equal(p.hp,480);assert.ok(h.api.get().guardTime>0);assert.ok(h.api.get().invincible<=0);h.api.update(.002);assert.equal(h.api.get().guardTime,0);assert.equal(p.hp,380);
});

test('sword attacks retain lightning while powered recovery uses one combined status banner',()=>{
 for(const job of ['swordsman'])for(const skill of ['a','q','w']){
  const {h}=combatHarness(job);skill==='a'?h.api.attack():h.api.cast(skill);assert.ok(h.api.get().effects.some(e=>e.type==='lightning'&&e.color==='#ffe45c'),`${job} ${skill}`);
 }
 const builder=combatHarness();builder.h.api.cast('r');assert.ok(builder.h.api.get().effects.some(e=>e.type==='impact'&&e.color==='#f7fcff'));builder.h.api.cast('e');assert.equal(builder.h.el('#power-banner').hidden,true);assert.equal(builder.h.el('#combat-banner').hidden,false);assert.match(builder.h.el('#combat-title').textContent,/근육 각성.*한 번 더/);builder.h.api.update(1.51);assert.equal(builder.h.el('#power-banner').hidden,false);assert.equal(builder.h.el('#combat-banner').hidden,true);
 const sword=counterHarness();sword.h.api.startSwordCharge();sword.h.api.releaseSword('keyboard');sword.h.api.update(.01);assert.ok(sword.h.api.get().effects.some(e=>e.type==='lightning'&&e.color==='#ffe45c'));
});


test('holding basic attack cannot immediately overwrite the Q strike or W dash animation',()=>{
 for(const key of ['q','w'])for(const job of [null,'swordsman','bodybuilder']){
  const h=harness(),p=core.createCharacter('연계');Object.assign(p,{level:25,job,mp:300});h.api.start(p);h.api.keys.add('KeyA');h.api.cast(key);
  const initial=h.api.get().combatMotion.kind;advance(h,.2);assert.equal(h.api.get().combatMotion.kind,initial);
  if(key==='w')assert.ok(h.api.get().combatMotion.fromX!==undefined);
  advance(h,.2);assert.equal(h.api.get().combatMotion.kind,job==='swordsman'?'slash':'punch');assert.equal(h.api.get().combatMotion.fromX,undefined);
 }
});

const UNIFORM_PLAYER_ASSETS=new Set([
 'builder-recovery-walk','power-recovery-walk',
 'sword-guard-walk','penguin','penguin-hurt','penguin-power-poses','penguin-walk','penguin-power-walk',
 'penguin-jump','penguin-power-jump','combat-brawler','combat-swordsman','combat-power'
]);
function uniformPlayerDraws(h){
 return h.draws.filter(d=>typeof d.asset==='string'&&UNIFORM_PLAYER_ASSETS.has(d.asset.replace(/^assets\/(?:uniform-)?/,'').replace(/\.png$/,'')));
}
function assertUniformRender(h,asset,equipped){
 h.api.setShake(0);render(h);
 const expected=`assets/${equipped?'uniform-':''}${asset}.png`,draws=uniformPlayerDraws(h);
 assert.ok(draws.length>0,`${expected}: a player body must be drawn`);
 // Includes the small hand restored over the dumbbell: no original sleeve may leak.
 for(const d of draws)assert.equal(d.asset,expected,'body and restored hand must use the same outfit');
 const bodies=draws.filter(d=>d.source[2]>100);
 assert.equal(bodies.length,1,`${expected}: render exactly one complete player body`);
 for(const d of draws)for(const field of ['x','y','width','height'])assert.ok(Number.isFinite(d[field]),`${field} must be finite`);
 return bodies[0];
}
function assertUniformGeometry(actual,expected){
 assert.deepEqual(actual.source,expected.source,'outfit keeps the authored source rectangle');
 assert.deepEqual(actual.matrix,expected.matrix,'outfit keeps the same facing and world transform');
 for(const field of ['x','y','width','height'])closeTo(actual[field],expected[field],`outfit preserves ${field}`);
}
function uniformCardSources(h){
 const cards=new Map();
 for(const match of h.el('#screens').innerHTML.matchAll(/<button\b[^>]*data-character="([^"]+)"[\s\S]*?<\/button>/g)){
  const src=match[0].match(/<img\b[^>]*src="([^"]+)"/);
  assert.ok(src,'saved character card has a portrait');cards.set(match[1],src[1]);
 }
 return cards;
}

test('uniform renders only when owned and equipped, and the inventory toggle updates the player immediately',()=>{
 for(const [uniform,uniformEquipped,expected] of [[0,false,false],[0,true,false],[1,false,false],[1,true,true]]){
  const h=harness(),p=core.createCharacter('군복조건');Object.assign(p,{uniform,uniformEquipped});h.api.start(p);
  assertUniformRender(h,'penguin',expected);
 }
 const h=harness(),p=core.createCharacter('군복장착');p.uniform=1;h.api.start(p);
 for(const equipped of [true,false,true]){
  h.api.inventory('uniform');h.el('#bag-use').onclick();
  assert.equal(p.uniformEquipped,equipped);assertUniformRender(h,'penguin',equipped);
  assert.equal(h.el('.avatar').getAttribute('src'),`assets/${equipped?'uniform-':''}penguin.png`);
  assert.equal(JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0].uniformEquipped,equipped);
  h.api.closeModal();
 }
});

test('uniform switches idle and hurt sprites in both jobs and muscle form without moving equipment or restoring old sleeves',()=>{
 for(const [job,power] of [[null,0],['swordsman',0],['bodybuilder',0],['bodybuilder',12]])for(const reaction of ['idle','hurt'])for(const dir of [-1,1]){
  const {h,p}=combatHarness(job,power);p.uniform=1;
  h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.001);h.api.keys.clear();h.api.update(0);
  if(reaction==='hurt'){
   const m=h.api.get().monsters[0];Object.assign(m,{dead:false,x:p.x,y:p.y,speed:0});h.api.update(.01);m.dead=true;
   assert.ok(h.api.get().hurtTime>0,'real contact triggers the hurt pose');
  }
  const asset=power?'penguin-power-poses':reaction==='hurt'?'penguin-hurt':'penguin';
  const original=assertUniformRender(h,asset,false),equipment=h.draws.filter(d=>d.asset==='assets/job-equipment.png');
  assert.equal(Math.sign(original.matrix[0]),dir);
  for(const equipped of [true,false,true]){
   assert.equal(core.equipUniform(p).ok,true);const body=assertUniformRender(h,asset,equipped);assertUniformGeometry(body,original);
   const current=h.draws.filter(d=>d.asset==='assets/job-equipment.png');assert.equal(current.length,equipment.length);
   current.forEach((d,i)=>assertUniformGeometry(d,equipment[i]));
   assert.equal(uniformPlayerDraws(h).length,job==='bodybuilder'?2:1,'only bodybuilders redraw a hand over held equipment');
  }
 }
});

test('uniform follows all eight walking frames in both directions and both jobs while hand and foot anchors stay fixed',()=>{
 for(const [job,power] of [['swordsman',0],['bodybuilder',0],['bodybuilder',12]])for(const dir of [-1,1]){
  const {h,p}=combatHarness(job,power);p.uniform=1;
  const asset=power?'penguin-power-walk':'penguin-walk',poses=new Set();h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');
  for(let i=0;i<80;i++){
   h.api.update(1/60);const plain=assertUniformRender(h,asset,false);poses.add(plain.source.join(','));
   core.equipUniform(p);const dressed=assertUniformRender(h,asset,true);assertUniformGeometry(dressed,plain);
   assert.equal(Math.sign(dressed.matrix[0]),dir);core.equipUniform(p);assertUniformGeometry(assertUniformRender(h,asset,false),plain);
  }
  assert.equal(poses.size,8,`${job}/${power}/${dir}: every walking pose was covered`);
 }
});

test('uniform follows all six jump phases in both jobs and muscle form and can be removed in midair',()=>{
 for(const [job,power] of [['swordsman',0],['bodybuilder',0],['bodybuilder',12]])for(const dir of [-1,1]){
  const {h,p}=combatHarness(job,power);p.uniform=1;
  h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.001);h.api.keys.clear();h.api.jump();
  const asset=power?'penguin-power-jump':'penguin-jump',poses=new Set();let airborne=false,landing=false;
  for(let i=0;i<75;i++){
   const state=h.api.get();airborne||=state.pz>0;landing||=state.jumpLanding>0;render(h);
   if(h.draws.some(d=>d.asset===`assets/${asset}.png`&&d.source[2]>100)){
    const plain=assertUniformRender(h,asset,false);poses.add(plain.source.join(','));const z=state.pz;
    core.equipUniform(p);const dressed=assertUniformRender(h,asset,true);assertUniformGeometry(dressed,plain);
    assert.equal(Math.sign(dressed.matrix[0]),dir);assert.equal(h.api.get().pz,z,'equipping cannot restart or advance the jump');
    core.equipUniform(p);assertUniformGeometry(assertUniformRender(h,asset,false),plain);
   }
   h.api.update(1/60);
  }
  assert.equal(poses.size,6,`${job}/${power}/${dir}: crouch, ascent, apex, descent and landing were covered`);
  assert.ok(airborne&&landing);assert.equal(h.api.get().pz,0);
 }
});

test('uniform covers every class attack, guard and recovery row without reverting during any combat phase',()=>{
 const cases=[[null,0,'a','combat-brawler'],[null,0,'q','combat-brawler'],[null,0,'w','combat-brawler'],
  ['bodybuilder',0,'a','combat-brawler'],['bodybuilder',0,'q','combat-brawler'],['bodybuilder',0,'w','combat-brawler'],['bodybuilder',0,'e','combat-brawler'],
  ['bodybuilder',12,'a','combat-power'],['bodybuilder',12,'q','combat-power'],['bodybuilder',12,'w','combat-power'],['bodybuilder',12,'e','combat-power'],
  ['swordsman',0,'a','combat-swordsman'],['swordsman',0,'q','combat-swordsman'],['swordsman',0,'w','combat-swordsman'],['swordsman',0,'e','combat-swordsman']];
 for(const [job,power,key,asset] of cases)for(const dir of [-1,1]){
  const {h,p}=combatHarness(job,power);p.uniform=1;h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.001);h.api.keys.clear();
  key==='a'?h.api.attack():h.api.cast(key);assert.ok(h.api.combatPose());
  const duration=h.api.get().combatMotion?.duration,samples=duration?[0,.2,.6,.9]:[0,.2];let elapsed=0;
  for(const fraction of samples){
   if(fraction)h.api.update((duration||1)*fraction-elapsed);elapsed=(duration||1)*fraction;
   const plain=assertUniformRender(h,asset,false);
   for(const equipped of [true,false]){
    core.equipUniform(p);const body=assertUniformRender(h,asset,equipped);assertUniformGeometry(body,plain);assert.equal(Math.sign(body.matrix[0]),dir);
    assert.equal(h.draws.filter(d=>d.asset==='assets/job-equipment.png').length,0,'combat atlas already contains the held equipment');
   }
  }
 }
 const {h,p}=swordHarness();p.uniform=1;core.equipUniform(p);assert.equal(h.api.startSwordCharge(),true);
 assertUniformRender(h,'combat-swordsman',true);h.api.releaseSword('keyboard');h.api.update(.01);assertUniformRender(h,'combat-swordsman',true);
 core.equipUniform(p);assertUniformRender(h,'combat-swordsman',false);
});

test('isolated combat canvases are cached separately for each outfit and reused when equipping again',()=>{
 for(const [job,power,asset] of [['swordsman',0,'combat-swordsman'],['bodybuilder',0,'combat-brawler'],['bodybuilder',12,'combat-power']]){
  const {h,p}=combatHarness(job,power);p.uniform=1;const canvases=[];
  h.document.createElement=tag=>{
   assert.equal(tag,'canvas');const c={width:0,height:0,asset:null};
   const context={drawImage(img){c.asset=img.asset;},getImageData(x,y,w,height){return {data:new Uint8ClampedArray(w*height*4).fill(255)};},putImageData(){}};
   c.getContext=()=>context;canvases.push(c);return c;
  };
  h.api.attack();assertUniformRender(h,asset,false);assert.equal(canvases.length,1,'first original pose is isolated once');
  for(const equipped of [true,false,true,false]){
   core.equipUniform(p);assertUniformRender(h,asset,equipped);assert.equal(canvases.length,2,'same frame has one cached canvas per image');
  }
  h.api.update(.1);assertUniformRender(h,asset,false);assert.equal(canvases.length,3,'a different frame needs its own crop');
  core.equipUniform(p);assertUniformRender(h,asset,true);assert.equal(canvases.length,4);
  assert.deepEqual(canvases.map(c=>c.asset),[`assets/${asset}.png`,`assets/uniform-${asset}.png`,`assets/${asset}.png`,`assets/uniform-${asset}.png`]);
 }
});

test('uniform changes the HUD and each saved character portrait independently and leaves new characters undressed',async()=>{
 const h=harness(),dressed=core.createCharacter('입은펭귄'),owned=core.createCharacter('벗은펭귄'),fresh=core.createCharacter('새펭귄');
 Object.assign(dressed,{level:20,job:'bodybuilder',uniform:1,uniformEquipped:true,powerTime:12});owned.uniform=1;
 h.api.characters([dressed,owned,fresh],dressed.id);assert.equal(h.api.get().player,null);
 assert.deepEqual([...uniformCardSources(h)],[[dressed.id,'assets/uniform-penguin.png'],[owned.id,'assets/penguin.png'],[fresh.id,'assets/penguin.png']]);
 h.el('#new-character').onclick();assert.match(h.el('#modal-root').innerHTML,/src="assets\/penguin\.png"/);assert.doesNotMatch(h.el('#modal-root').innerHTML,/assets\/uniform-/);h.api.closeModal();
 const enter=h.api.enterWorld(dressed.id);assert.match(h.el('#screens').innerHTML,/src="assets\/uniform-penguin\.png"/);await h.flush();await enter;
 const p=h.api.get().player;assert.equal(h.el('.avatar').getAttribute('src'),'assets/uniform-penguin.png');
 p.powerTime=12;h.api.update(.11);assert.equal(h.el('.avatar').getAttribute('src'),'assets/uniform-penguin-power-poses.png');
 h.api.inventory('uniform');h.el('#bag-use').onclick();assert.equal(h.el('.avatar').getAttribute('src'),'assets/penguin-power-poses.png');h.api.closeModal();
 p.powerTime=.01;h.api.update(.11);assert.equal(h.el('.avatar').getAttribute('src'),'assets/penguin.png');
 h.api.inventory('uniform');h.el('#bag-use').onclick();h.api.closeModal();h.api.selectCharacters();
 assert.equal(uniformCardSources(h).get(dressed.id),'assets/uniform-penguin.png');assert.equal(uniformCardSources(h).get(owned.id),'assets/penguin.png');
});

test('equipping a uniform does not change town NPCs, trainers, the soldier, robots or their anchors',()=>{
 const maps={town:['npc-hyuntori-white','npc-maguri-large-crate'],gangnam:['npc-maguri-large-crate'],gym:['npc-emperor-coach'],dojo:['npc-tiger-master'],pocha:['soldier-boss'],alley:['robot']};
 for(const [map,assets] of Object.entries(maps)){
  const h=harness(),p=core.createCharacter('군복과이웃');Object.assign(p,{map,level:20,uniform:1});h.api.start(p);render(h);
  const expected=h.draws.filter(d=>assets.some(a=>d.asset===`assets/${a}.png`));assert.ok(expected.length>0,map);
  core.equipUniform(p);assertUniformRender(h,'penguin',true);
  const actual=h.draws.filter(d=>assets.some(a=>d.asset===`assets/${a}.png`));assert.equal(actual.length,expected.length,map);
  actual.forEach((d,i)=>{assert.equal(d.asset,expected[i].asset);assertUniformGeometry(d,expected[i]);});
  for(const a of assets)assert.equal(h.draws.some(d=>d.asset===`assets/uniform-${a}.png`),false);
 }
});

test('saved uniform appearance survives re-entry and death without changing ownership, progress or the respawn rule',async()=>{
 for(const job of ['swordsman','bodybuilder'])for(const equipped of [false,true]){
  const {h,p}=combatHarness(job,job==='bodybuilder'?12:0);Object.assign(p,{uniform:1,uniformEquipped:equipped,money:902,scrap:9,cores:4,bossWins:2});
  h.api.save();h.api.selectCharacters();const entry=h.api.enterWorld(p.id);await h.flush();await entry;
  const restored=h.api.get().player;assert.equal(restored.uniform,1);assert.equal(restored.uniformEquipped,equipped);assert.equal(restored.powerTime,0);assert.equal(restored.job,job);
  assertUniformRender(h,'penguin',equipped);restored.powerTime=job==='bodybuilder'?12:0;h.api.die();
  assert.equal(h.api.get().scene,'dead');assert.equal(restored.map,'town');assert.equal(restored.powerTime,0);assert.equal(restored.uniform,1);assert.equal(restored.uniformEquipped,equipped);
  assertUniformRender(h,'penguin',equipped);const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];
  for(const [field,value] of Object.entries({uniform:1,uniformEquipped:equipped,job,level:20,money:902,scrap:9,cores:4,bossWins:2,map:'town'}))assert.equal(saved[field],value,field);
  h.el('#revive').onclick();assert.equal(h.api.get().scene,'playing');assertUniformRender(h,'penguin',equipped);assert.equal(restored.hp,core.maxHp(restored));
  const old={...saved};delete old.uniform;delete old.uniformEquipped;const migrated=core.normalizeCharacter(old);h.api.start(migrated);assertUniformRender(h,'penguin',false);
 }
});

test('moving sword guard cycles eight poses in both outfits and directions, then restores normal walking',()=>{
 for(const dir of [-1,1]){
  const {h,p}=combatHarness('swordsman');p.uniform=1;
  h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.cast('e');const seen=new Set();
  for(let i=0;i<48;i++){
   const before=p.x;h.api.update(1/60);assert.ok((p.x-before)*dir>0);assert.ok(h.api.get().guardTime>0);assert.equal(h.api.combatPose().kind,'guard');
   const plain=assertUniformRender(h,'sword-guard-walk',false);seen.add(plain.source.join(','));
   core.equipUniform(p);const dressed=assertUniformRender(h,'sword-guard-walk',true);assertUniformGeometry(dressed,plain);assert.equal(Math.sign(dressed.matrix[0]),dir);
   assert.equal(h.draws.some(d=>d.asset==='assets/job-equipment.png'),false,'guard atlas already carries the sword');core.equipUniform(p);
  }
  assert.equal(seen.size,8);core.equipUniform(p);h.api.update(.201);assert.equal(h.api.get().guardTime,0);assert.equal(h.api.combatPose(),null);assertUniformRender(h,'penguin-walk',true);
  h.api.keys.clear();h.api.update(.01);assertUniformRender(h,'penguin',true);
 }
});

test('builder recovery walks through eight crossed-arm poses in both forms, outfits and directions',()=>{
 for(const power of [0,12])for(const dir of [-1,1]){
  const {h,p}=combatHarness('bodybuilder',power);p.uniform=1;
  const asset=power?'power-recovery-walk':'builder-recovery-walk';h.api.keys.add(dir>0?'ArrowRight':'ArrowLeft');h.api.cast('e');const seen=new Set();
  for(let i=0;i<84;i++){
   h.api.update(1/60);assert.ok(h.api.get().recovery);const plain=assertUniformRender(h,asset,false);seen.add(plain.source.join(','));
   core.equipUniform(p);const dressed=assertUniformRender(h,asset,true);assertUniformGeometry(dressed,plain);assert.equal(Math.sign(dressed.matrix[0]),dir);core.equipUniform(p);
   assert.equal(h.draws.some(d=>d.asset==='assets/job-equipment.png'),false);
   const data=fs.readFileSync(new URL(`../dist/assets/${asset}.png`,import.meta.url)),[x,y,w,height]=plain.source;
   assert.ok(x>=0&&y>=0&&x+w<=data.readUInt32BE(16)&&y+height<=data.readUInt32BE(20),'walk frame stays in atlas');
  }
  assert.equal(seen.size,8);h.api.update(.11);assert.equal(h.api.get().recovery,null);assertUniformRender(h,power?'penguin-power-walk':'penguin-walk',false);
 }
});

test('recovery footsteps stop at walls, while airborne or paused, and retain defense against attack input',()=>{
 for(const power of [0,12])for(const equipped of [false,true]){
  const {h,p}=combatHarness('bodybuilder',power);Object.assign(p,{uniform:1,uniformEquipped:equipped,x:45});h.api.cast('e');h.api.keys.add('ArrowLeft');h.api.update(.1);
  const phase=h.api.get().walkPhase;assert.equal(h.api.get().walking,false);assertUniformRender(h,power?'combat-power':'combat-brawler',equipped);
  h.api.keys.add('ArrowDown');h.api.update(.1);assert.notEqual(h.api.get().walkPhase,phase);assertUniformRender(h,power?'power-recovery-walk':'builder-recovery-walk',equipped);
  h.api.worldMap();const time=h.api.get().recovery.remaining,x=p.x,y=p.y;h.api.update(1);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(h.api.get().recovery.remaining,time);assertUniformRender(h,power?'combat-power':'combat-brawler',equipped);h.api.closeModal();
  h.api.keys.add('ArrowRight');h.api.jump();h.api.update(.2);assert.ok(h.api.get().pz>0);assert.equal(h.api.get().walking,false);assertUniformRender(h,power?'combat-power':'combat-brawler',equipped);
  h.api.attack();assert.equal(h.api.combatPose().kind,'recover');assertUniformRender(h,power?'combat-power':'combat-brawler',equipped);assert.ok(h.api.get().recovery);
 }
});

test('guard gait follows clamped ground travel, stops in menus and air, and keeps movement protected',()=>{
 for(const equipped of [false,true]){
  const {h,p}=combatHarness('swordsman');Object.assign(p,{uniform:1,uniformEquipped:equipped,x:45});
  const m=h.api.get().monsters[0];Object.assign(m,{dead:false,x:45,home:45,y:p.y,speed:0,attack:100,hp:10000,maxHp:10000});h.api.cast('e');const phase=h.api.get().walkPhase;
  h.api.keys.add('ArrowLeft');h.api.update(.1);assert.equal(h.api.get().walking,false);assert.equal(h.api.get().walkPhase,phase);assertUniformRender(h,'combat-swordsman',equipped);
  h.api.keys.add('ArrowDown');h.api.update(.1);assert.equal(h.api.get().walking,true);assert.notEqual(h.api.get().walkPhase,phase);assertUniformRender(h,'sword-guard-walk',equipped);assert.equal(p.hp,480);
  const mp=p.mp,enemyHp=m.hp;h.api.attack();h.api.cast('q');h.api.cast('w');h.api.startSwordCharge();assert.equal(p.mp,mp);assert.equal(m.hp,enemyHp);assert.equal(h.api.get().combatMotion,null);assert.equal(h.api.get().swordUlt,null);
  h.api.worldMap();assertUniformRender(h,'combat-swordsman',equipped);h.api.closeModal();h.api.keys.clear();h.api.update(.02);const stopped=h.api.get().walkPhase;
  assertUniformRender(h,'combat-swordsman',equipped);h.api.update(.1);assert.equal(h.api.get().walkPhase,stopped);
  h.api.keys.add('ArrowRight');h.api.jump();h.api.update(.2);assert.ok(h.api.get().pz>0);assert.equal(h.api.get().walking,false);render(h);assert.equal(h.draws.some(d=>d.asset.endsWith('sword-guard-walk.png')),false);
 }
});

test('advanced W draws straight class-colored trails only along the clamped dash path in either direction and in air',()=>{
 for(const job of ['bodybuilder','swordsman'])for(const dir of [-1,1])for(const airborne of [false,true])for(const edgeGap of [null,35,0]){
  const {h,p}=combatHarness(job);h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.01);h.api.keys.clear();
  const wall=dir<0?45:core.MAPS[p.map].width-45;p.x=edgeGap===null?1000:wall-dir*edgeGap;
  if(airborne){h.api.jump();h.api.update(.2);assert.ok(h.api.get().pz>0);}
  const start=p.x,y=p.y-45-h.api.get().pz,destination=core.clamp(start+dir*core.effectiveSkill(p,'w').dash,45,core.MAPS[p.map].width-45);h.api.cast('w');
  const state=h.api.get(),trail=state.effects.find(e=>e.type==='dash'),bolt=state.effects.find(e=>e.followDash);assert.ok(trail);assert.ok(bolt?.followDash);
  closeTo(p.x,destination);closeTo(state.combatMotion.fromX,start);closeTo(state.combatMotion.toX,destination);
  closeTo(trail.x,start);closeTo(trail.toX,destination);closeTo(trail.y,y);closeTo(trail.toY,y);assert.equal(state.effects.some(e=>e.type==='slash'),false);
  closeTo(bolt.followDash.fromX,start);closeTo(bolt.followDash.toX,destination);closeTo(bolt.followDash.duration,state.combatMotion.duration*.82);
  for(const dt of [.1,.18]){
   h.api.update(dt);h.strokes.length=0;h.api.drawEffects();const s=h.api.get(),display=h.api.combatDisplayX();
   assert.ok(display>=Math.min(start,destination)-1e-8&&display<=Math.max(start,destination)+1e-8);closeTo(trail.x,start);closeTo(trail.toX,destination);closeTo(trail.y,y);closeTo(trail.toY,y);
   assert.equal(s.effects.some(e=>e.type==='slash'||e.type==='windSwing'),false,'W never renders a fan swing');
   const spine=h.strokes.filter(stroke=>stroke.color===(job==='bodybuilder'?'#f7fcff':'#ffe45c')&&stroke.width===(job==='swordsman'?17:8));
   if(start===destination){assert.equal(spine.length,0,'a blocked dash cannot invent travel');continue;}
   assert.equal(spine.length,1);const points=spine[0].path;assert.deepEqual(points.map(point=>point.kind),['move','line']);
   closeTo(points[0].x,start-s.camera);closeTo(points[0].y,y);closeTo(points[1].x,display-s.camera);closeTo(points[1].y,y);
   const outline=h.strokes.find(stroke=>stroke.color===(job==='bodybuilder'?'#426679':'#111117')&&stroke.width===(job==='swordsman'?30:16));assert.ok(outline);assert.deepEqual(outline.path,points);
   for(const stroke of h.strokes)for(const point of stroke.path){assert.ok(Number.isFinite(point.x));assert.ok(Number.isFinite(point.y));}
  }
 }
 const {h}=combatHarness('swordsman');h.api.cast('q');assert.ok(h.api.get().effects.some(e=>e.type==='slash'),'Q keeps its intentional sword swing');
});

test('R locks stay yellow and black, unnumbered, screen-sized and attached only to surviving targets under zoom',()=>{
 for(const width of [1440,750]){
  const {h}=cameraHarness(width);h.api.startSwordCharge();advance(h,2.5);const s=h.api.get(),targets=s.swordUlt.targets.map(id=>s.monsters.find(m=>m.id===id));assert.equal(targets.length,5);
  targets[0].x+=37;targets[0].y-=16;targets[1].dead=true;render(h);
  const state=h.api.get(),rings=h.strokes.filter(stroke=>stroke.path.some(point=>point.kind==='arc'&&Math.abs(point.radius-31)<1e-8)),yellow=rings.filter(stroke=>stroke.color==='#ffe45c'),black=rings.filter(stroke=>stroke.color==='#101014');
  assert.equal(yellow.length,4);assert.equal(black.length,4);assert.equal(rings.length,8);assert.equal(h.labels.some(label=>/^[1-5]$/.test(label.text)),false);
  for(const m of targets.filter(m=>!m.dead)){
   const match=yellow.find(stroke=>{const a=stroke.path.find(point=>point.kind==='arc'),world=h.api.screenToWorld(a.x,a.y);return Math.abs(world.x-m.x)<1e-8&&Math.abs(world.y-(m.y-58))<1e-8;});assert.ok(match,'reticle follows the current target position through both camera transforms');
   const a=match.path.find(point=>point.kind==='arc');closeTo(a.radius,31);assert.equal(match.width,3.5);
   assert.ok(black.some(stroke=>stroke.width>match.width&&JSON.stringify(stroke.path)===JSON.stringify(match.path)),'yellow ring has the same dark outline path');
  }
  const charge=h.strokes.filter(stroke=>stroke.path.some(point=>point.kind==='arc'&&Math.abs(point.radius-72*state.cameraZoom)<1e-8));
  assert.deepEqual(charge.map(stroke=>stroke.color),['#101014','#ffe45c']);assert.ok(state.cameraZoom<1);
 }
});

test('sword A/Q reach expands only after advancement and builder Q cooldown stacks with awakening',()=>{
 for(const job of [null,'bodybuilder','swordsman'])for(const key of ['a','q'])for(const axis of ['x','y']){
  const {h,p}=combatHarness(job),m=h.api.get().monsters[0];
  const offset=key==='a'?(axis==='x'?145:80):(axis==='x'?235:105);
  Object.assign(m,{dead:false,x:p.x+(axis==='x'?offset:30),y:p.y+(axis==='y'?offset:0),hp:10000,maxHp:10000});
  key==='a'?h.api.attack():h.api.cast(key);
  assert.equal(m.hp<10000,job==='swordsman',`${job}/${key}/${axis}: newly added reach`);
 }
 for(const power of [0,12]){
  const {h,p}=combatHarness('bodybuilder',power);h.api.cast('q');closeTo(p.cooldowns.q,power?.85:1.7);
 }
});

test('boss landing shockwave damages nearby players once and respects sword guard',()=>{
 for(const guarded of [false,true]){
  const {h,p}=bossHarness();h.api.startBossFight();const b=h.api.get().boss;Object.assign(b,{phase:'recover',elapsed:-10});advance(h,1);
  p.x=900;p.y=650;Object.assign(b,{phase:'leap',elapsed:0,from:{x:500,y:650},target:{x:775,y:650,dir:1}});
  if(guarded)h.api.cast('e');const hp=p.hp;advance(h,.47);assert.equal(p.hp,hp-(guarded?0:96));const after=p.hp;advance(h,.1);assert.equal(p.hp,after);
 }
});

test('MP potion purchase, recovery cap, old saves and slot persistence',()=>{
 const p=core.createCharacter('마나');p.money=1000;p.level=10;
 assert.equal(core.buyItem(p,'mpPotions').ok,true);assert.equal(p.money,500);assert.equal(p.mpPotions,1);
 assert.equal(core.buyItem(p,'mpPotions').ok,true);assert.equal(core.buyItem(p,'mpPotions').ok,false);
 p.mp=0;assert.equal(core.useItem(p,'mpPotions').ok,true);assert.equal(p.mp,Math.min(100,core.maxMp(p)));assert.equal(p.mpPotionCooldown,0);
 p.mp=core.maxMp(p)-20;core.useItem(p,'mpPotions');assert.equal(p.mp,core.maxMp(p));
 p.mpPotions=1;assert.equal(core.useItem(p,'mpPotions').ok,false);assert.equal(p.mpPotions,1);
 core.assignQuickSlot(p,1,'mpPotions');const saved=core.normalizeCharacter(p);assert.equal(saved.mpPotions,1);assert.equal(saved.quickSlots[1],'mpPotions');
 const old={...p};delete old.mpPotions;delete old.mpPotionCooldown;const migrated=core.normalizeCharacter(old);assert.equal(migrated.mpPotions,0);assert.equal(migrated.mpPotionCooldown,0);
});
test('MP potion cooldown applies throughout boss room, pauses in inventory and is independent of HP potion',()=>{
 const {h,p}=bossHarness();p.mpPotions=10;p.mp=0;p.quickSlots=['mpPotions','mpPotions','potions'];
 h.api.useQuickSlot(0);assert.equal(p.mp,Math.min(100,core.maxMp(p)));assert.equal(p.mpPotionCooldown,10);assert.equal(p.mpPotions,9);
 h.api.useQuickSlot(1);assert.equal(p.mpPotions,9);
 h.api.inventory('mpPotions');h.api.update(4);assert.equal(p.mpPotionCooldown,10);h.api.useInventoryItem('mpPotions',true);assert.equal(p.mpPotions,9);h.api.closeModal();
 h.api.startBossFight();assert.equal(p.mpPotionCooldown,10);p.hp=100;h.api.useQuickSlot(2);assert.equal(p.hp,160);assert.equal(h.api.get().potionCooldown,10);
 const b=h.api.get().boss;b.phase='recover';b.elapsed=-20;advance(h,10.1);assert.equal(p.mpPotionCooldown,0);p.mp=0;h.api.useQuickSlot(1);assert.equal(p.mp,Math.min(100,core.maxMp(p)));assert.equal(p.mpPotions,8);
 const saved=core.normalizeCharacter(p);assert.equal(saved.mpPotionCooldown,10);
 p.map='town';p.mp=0;h.api.useQuickSlot(0);h.api.useQuickSlot(1);assert.equal(p.mp,200);assert.equal(p.mpPotionCooldown,0);assert.equal(p.mpPotions,6);
});

test('A-type safety execution kills outside even with damage reduction, but safe floor and timed immunity survive',()=>{
 for(const mode of ['outside','safe','backstep','guard','recovery']){
  const h=harness(),p=core.createCharacter('A형시험',mode==='backstep'?'cat':'wanderer');Object.assign(p,{level:35,job:mode==='backstep'?'protester':mode==='recovery'?'bodybuilder':'swordsman',map:'hangar',x:1100,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);h.api.startBossFight();
  const b=h.api.get().boss;b.phase='recover';b.elapsed=-20;advance(h,1);h.api.hitMonster(b,999999);assert.equal(b.phase,'safety');
  const frozen=b.hp;h.api.attack();h.api.cast('q');assert.equal(b.hp,frozen);h.api.worldMap();advance(h,2);assert.equal(b.elapsed,0);h.api.closeModal();
  advance(h,4.7);
  if(mode==='safe'){p.x=b.safeZone.x;p.y=b.safeZone.y;}
  if(mode==='backstep')h.api.cast('w');
  if(mode==='guard'||mode==='recovery')h.api.cast('e');
  advance(h,.4);
  assert.equal(h.api.get().scene,['outside','recovery'].includes(mode)?'dead':'playing',mode);
 }
});
test('A-type encounter requires interaction, awards once, and abandon/recall clears its hazards',()=>{
 const h=harness(),p=core.createCharacter('로봇결투');Object.assign(p,{level:35,job:'swordsman',map:'hangar',x:1150,y:650,returnScrolls:2});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);const b=h.api.get().boss;assert.equal(b.active,false);
 h.api.interact();assert.match(h.el('#modal-root').innerHTML,/Lv.35 A형/);h.el('#challenge-boss').onclick();assert.equal(b.active,true);
 b.safetyUsed=true;b.hp=1;const money=p.money,cores=p.cores;h.api.hitMonster(b,2);assert.equal(b.dead,true);assert.equal(p.typeAWins,1);assert.equal(p.money,money+6000);assert.equal(p.cores,cores+15);h.api.winBoss();assert.equal(p.typeAWins,1);
 h.api.closeModal();h.api.startBossFight();const rematch=h.api.get().boss;assert.equal(rematch.hp,typeACore.TYPE_A.hp);assert.equal(rematch.safetyUsed,false);h.api.abandonBoss();assert.equal(h.api.get().boss.active,false);
 h.api.startBossFight();h.api.useInventoryItem('returnScrolls');assert.equal(p.map,'town');assert.equal(h.api.get().boss,null);
});
test('A-type pull changes position inside its radius and spin deals repeated damage with visible animation frames',()=>{
 const h=harness(),p=core.createCharacter('회전시험');Object.assign(p,{level:35,job:'swordsman',map:'hangar',x:1100,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);h.api.startBossFight();const b=h.api.get().boss;b.phase='recover';b.elapsed=-20;advance(h,1);
 b.enraged=true;b.safetyUsed=true;b.phase='pull-charge';b.elapsed=.69;const before=p.x;h.api.update(.02);assert.ok(p.x>before+200);assert.ok(p.hp<core.maxHp(p));
 b.phase='spin';b.elapsed=0;b.strikes=0;p.x=b.x-120;p.hp=core.maxHp(p);const frames=new Set();for(let i=0;i<120;i++){h.api.update(1/60);render(h);frames.add(h.draws.find(d=>d.asset==='assets/type-a.png').source.slice(0,2).join(','));}
 assert.ok(frames.size>=2);assert.ok(p.hp<core.maxHp(p)-100);assert.equal(h.el('#boss-name').textContent,'Lv.35 A형 · 광폭화');
});

// Victory clears persistent effects while their damage tick is still resolving.
test('cat ballot can finish A-type without reading a cleared effect',()=>{
 const h=harness(),p=core.createCharacter('지속피해','cat');Object.assign(p,{level:35,job:'protester',map:'hangar',x:1100,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);h.api.startBossFight();const b=h.api.get().boss;p.x=b.x-100;b.safetyUsed=true;b.hp=1;h.api.cast('r');assert.doesNotThrow(()=>advance(h,.6));assert.equal(b.dead,true);assert.equal(p.typeAWins,1);assert.equal(h.api.get().catBallot,null);
});

test('rabbit progression is isolated and old characters cannot become mages',()=>{
 const p=core.createCharacter('안경토끼','rabbit');assert.equal(p.mp,90);assert.equal(core.jobName(p),'토끼 모험가');assert.equal(core.canUseSkill(p,'q').ok,false);
 p.level=10;p.map='town';assert.equal(core.advanceJob(p,'swordsman').ok,false);assert.equal(core.advanceJob(p,'mage').ok,true);assert.equal(core.effectiveSkill(p,'w').name,'순간 이동');assert.equal(core.canUseSkill(p,'r').ok,false);
 p.level=15;assert.equal(core.canUseSkill(p,'r').ok,true);assert.equal(core.normalizeCharacter(p).job,'mage');p.job='bodybuilder';assert.equal(core.normalizeCharacter(p).job,null);
 const penguin=core.createCharacter('펭귄');penguin.level=15;assert.equal(core.advanceJob(penguin,'mage').ok,false);
});
function rabbitHarness(job='mage'){
 const h=harness(),p=core.createCharacter('토끼시험','rabbit');Object.assign(p,{level:15,job,map:'alley',x:1000,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);const mobs=h.api.get().monsters;for(const m of mobs){m.x=m.home=2300;m.y=650;m.speed=0;m.hp=m.maxHp=10000;}return {h,p,mobs};
}
test('rabbit basic orb hits the first forward enemy, never behind or beyond short range; Q penetrates forward',()=>{
 const {h,p,mobs}=rabbitHarness(null);mobs[0].x=mobs[0].home=1140;mobs[1].x=mobs[1].home=1240;mobs[2].x=mobs[2].home=910;
 h.api.attack();assert.equal(mobs[0].hp,10000);advance(h,.4);assert.ok(mobs[0].hp<10000);assert.equal(mobs[1].hp,10000);assert.equal(mobs[2].hp,10000);assert.equal(h.api.get().rabbitOrbs.length,0);
 for(const m of mobs){m.hp=10000;m.x=m.home=1700;}h.api.attack();advance(h,.5);assert.ok(mobs.every(m=>m.hp===10000));
 mobs[0].x=1150;mobs[1].x=1290;mobs[2].x=910;h.api.cast('q');assert.ok(mobs[0].hp<10000);assert.ok(mobs[1].hp<10000);assert.equal(mobs[2].hp,10000);assert.equal(h.api.get().combatMotion.kind,'rabbitLightning');
});
test('rabbit W rolls forward before promotion, teleports after promotion, and does no damage',()=>{
 for(const job of [null,'mage']){const {h,p,mobs}=rabbitHarness(job),before=mobs.map(m=>m.hp);const x=p.x;h.api.cast('w');assert.equal(p.x-x,job?260:180);assert.equal(h.api.get().cooldowns.w,2);assert.equal(h.api.get().combatMotion.kind,job?'rabbitTeleport':'rabbitRoll');if(!job)assert.ok(h.api.combatDisplayX()<p.x);assert.deepEqual(mobs.map(m=>m.hp),before);advance(h,2.1);assert.equal(h.api.get().cooldowns.w,0);}
});
test('rabbit E absorbs damage up to its pool, expires after three seconds and pulses area damage',()=>{
 const {h,p,mobs}=rabbitHarness();mobs[0].x=1120;h.api.cast('e');assert.ok(mobs[0].hp<10000);const pool=Math.round(core.maxHp(p)*.3);assert.equal(h.api.get().rabbitShield.hp,pool);assert.equal(h.api.playerDamage(40),0);assert.equal(h.api.get().rabbitShield.hp,pool-40);assert.equal(h.api.playerDamage(pool),40);assert.equal(h.api.get().rabbitShield,null);
 h.api.get().cooldowns.e=0;h.api.cast('e');for(const m of mobs)m.x=m.home=2300;advance(h,3.1);assert.equal(h.api.get().rabbitShield,null);
});
test('respect target selection is cancellable, confirmation costs once and buffs expire without permanent stats',()=>{
 const {h,p,mobs}=rabbitHarness(),baseHp=core.maxHp(p),baseAttack=core.attackPower(p),mp=p.mp;mobs[0].x=1180;mobs[1].x=1800;
 h.api.cast('r');assert.equal(h.api.get().modal,'respect-target');assert.match(h.el('#modal-root').innerHTML,/토끼시험 · 나/);assert.equal(p.mp,mp);h.api.closeModal();assert.equal(h.api.get().cooldowns.r,0);
 h.api.cast('r');h.el('#respect-self').onclick();assert.equal(p.mp,mp-46);assert.equal(p.respectTime,10);assert.equal(core.maxHp(p),Math.round(baseHp*1.2));assert.equal(core.attackPower(p),baseAttack*1.2);assert.equal(core.movementMultiplier(p),1.2);assert.equal(h.api.playerDamage(100,mobs[0]),56);assert.equal(h.api.playerDamage(100,mobs[1]),80);assert.equal(h.api.get().combatMotion.kind,'rabbitSalute');h.el('#respect-self').onclick();assert.equal(p.mp,mp-46);
 h.api.worldMap();advance(h,2);assert.equal(p.respectTime,10);h.api.closeModal();for(const m of mobs)m.x=m.home=2300;advance(h,3.1);assert.equal(mobs[0].respectTime,0);assert.ok(p.respectTime>6);advance(h,7);assert.equal(p.respectTime,0);assert.equal(core.maxHp(p),baseHp);assert.ok(p.hp<=baseHp);assert.equal(core.attackPower(p),baseAttack);assert.equal(core.movementMultiplier(p),1);
});
test('respect weakens both bosses and immunity execution still ignores ordinary shields',()=>{
 for(const map of ['pocha','hangar']){const {h,p}=rabbitHarness();p.map=map;h.api.start(p);h.api.startBossFight();const b=h.api.get().boss;p.x=b.x-100;h.api.cast('r');h.el('#respect-self').onclick();assert.equal(b.respectTime,3);assert.equal(h.api.playerDamage(100,b),56);}
 const {h,p}=rabbitHarness();p.map='hangar';h.api.start(p);h.api.startBossFight();const b=h.api.get().boss;b.phase='recover';b.elapsed=-20;advance(h,1);h.api.hitMonster(b,999999);advance(h,4.7);h.api.cast('e');advance(h,.4);assert.equal(h.api.get().scene,'dead');
});
test('rabbit movement, jumps and every skill render distinct frames with direction and cleanup',()=>{
 const {h,p}=rabbitHarness();const frames=new Set();const capture=()=>{render(h);const d=h.draws.find(d=>d.asset==='assets/rabbit-motion.png');assert.ok(d);frames.add(d.source.slice(0,2).join(','));};capture();
 h.api.keys.add('ArrowRight');for(let i=0;i<20;i++){h.api.update(.03);capture();}h.api.keys.clear();h.api.jump();for(let i=0;i<20;i++){h.api.update(.04);capture();}
 for(const key of ['a','q','w','e','r']){key==='a'?h.api.attack():h.api.cast(key);if(key==='r')h.el('#respect-self').onclick();h.api.update(.12);capture();advance(h,1);}
 assert.ok(frames.size>=10,`frames=${frames.size}`);h.api.resetCombat();assert.equal(h.api.get().rabbitOrbs.length,0);assert.equal(h.api.get().rabbitShield,null);
});

test('rabbit promotion extends Q hit range; basic orb requires and spends exactly two MP',()=>{
 for(const job of [null,'mage']){
  const {h,p,mobs}=rabbitHarness(job);mobs[0].x=mobs[0].home=1450;h.api.cast('q');assert.equal(mobs[0].hp<10000,job==='mage');assert.equal(p.mp,core.maxMp(p)-20);
 }
 const {h,p}=rabbitHarness();p.mp=1.99;h.api.attack();assert.equal(h.api.get().rabbitOrbs.length,0);assert.equal(p.mp,1.99);advance(h,.3);p.mp=2;h.api.attack();assert.equal(h.api.get().rabbitOrbs.length,1);assert.equal(p.mp,0);assert.equal(h.el('#mp-text').textContent,`0 / ${core.maxMp(p)}`);
 assert.deepEqual(core.skillsFor(p).map(s=>s.mp),[20,8,29,46]);
});
test('E shield is added to HP display and its bar tracks absorption then disappears on expiry',()=>{
 const {h,p,mobs}=rabbitHarness();for(const m of mobs)m.x=m.home=2300;p.hp=200;h.api.cast('e');const pool=Math.round(core.maxHp(p)*.3);
 assert.equal(h.el('#hp-text').textContent,`200 + ${pool} / ${core.maxHp(p)}`);assert.equal(h.el('#hp-shield').hidden,false);assert.match(h.el('#hp-text').title,new RegExp(`합계 ${200+pool}`));
 assert.equal(h.api.playerDamage(30),0);advance(h,.12);assert.equal(h.el('#hp-text').textContent,`200 + ${pool-30} / ${core.maxHp(p)}`);assert.ok(parseFloat(h.el('#hp-shield').style.width)>0);
 advance(h,3);assert.equal(h.el('#hp-shield').hidden,true);assert.equal(h.el('#hp-text').textContent,`200 / ${core.maxHp(p)}`);
});

test('Maguri offers rabbit promotion at level ten in either town, then returns to her shop',()=>{
 for(const map of ['town','gangnam']){
  const {h,p}=rabbitHarness(null);Object.assign(p,{map,x:1050,y:650,level:9});h.api.start(p);h.api.interact();assert.equal(h.api.get().modal,'shop');h.api.closeModal();
  p.level=10;h.api.interact();assert.equal(h.api.get().modal,'job');assert.match(h.el('#modal-root').innerHTML,/마구리 · 마법사 전직/);h.api.closeModal();h.api.interact();assert.equal(h.api.get().modal,'job');
  render(h);assert.ok(h.draws.some(d=>d.asset==='assets/rabbit-novice-motion.png'));
  h.el('#advance-job').onclick();assert.equal(p.job,'mage');render(h);assert.ok(h.draws.some(d=>d.asset==='assets/rabbit-motion.png'));assert.match(h.el('.avatar').src,/rabbit-motion/);
  h.api.interact();assert.equal(h.api.get().modal,'shop');assert.match(h.el('#modal-root').innerHTML,/MP 포션/);
 }
});
test('Hyuntori remains a guide for rabbits and other characters keep Maguri shop access',()=>{
 const {h,p}=rabbitHarness(null);Object.assign(p,{map:'town',x:650,y:621,level:15});h.api.start(p);h.api.interact();assert.equal(h.api.get().modal,'gm');assert.match(h.el('#modal-root').innerHTML,/운영자 현토리/);
 for(const classId of ['cat','wanderer']){const other=harness(),c=core.createCharacter('상점',classId);Object.assign(c,{level:15,map:'town',x:1050,y:650});other.api.start(c);other.api.interact();assert.equal(other.api.get().modal,'shop');}
});

test('rabbit Q requires twenty MP and spends it once for novice and mage',()=>{
 for(const job of [null,'mage']){
  const {h,p}=rabbitHarness(job);p.mp=19;h.api.cast('q');assert.equal(p.mp,19);assert.equal(h.api.get().cooldowns.q,0);
  p.mp=20;h.api.cast('q');assert.equal(p.mp,0);assert.ok(h.api.get().cooldowns.q>0);
 }
});

test('new rabbit can use the automatically registered MP potion with slot two',()=>{
 const h=harness(),p=core.createCharacter('첫포션','rabbit');h.api.start(p);p.mp=0;h.api.useQuickSlot(1);
 assert.equal(p.mp,Math.min(100,core.maxMp(p)));assert.equal(p.mpPotions,0);assert.equal(p.quickSlots[1],'mpPotions');
});

test('both towns regenerate HP and MP twice as fast without changing other areas or exceeding caps',()=>{
 for(const [map,hpRate,mpRate] of [['town',12,4.4],['gangnam',12,4.4],['gym',12,6],['dojo',6,2.2],['alley',0,2.2]]){
  const h=harness(),p=core.createCharacter('휴식');Object.assign(p,{level:20,map,hp:100,mp:0});h.api.start(p);
  for(const m of h.api.get().monsters)m.x=m.home=2300;
  for(let i=0;i<60;i++)h.api.update(1/60);
  assert.ok(Math.abs(p.hp-(100+hpRate))<1e-8,map);assert.ok(Math.abs(p.mp-mpRate)<1e-8,map);
  if(map==='town'||map==='gangnam'){
   p.hp=core.maxHp(p)-1;p.mp=core.maxMp(p)-1;for(let i=0;i<60;i++)h.api.update(1/60);
   assert.equal(p.hp,core.maxHp(p));assert.equal(p.mp,core.maxMp(p));
  }
 }
});

test('every Type A attack adds ten percent of target max HP before defense, including repeated spin hits',()=>{
 const attacks=[['blade',155],['bullet',62],['dash',195],['bomb',160],['spin',112],['pull',52]];
 for(const [classId,job] of [['wanderer','bodybuilder'],['cat','protester'],['rabbit','mage']])for(const [kind,base] of attacks){
  const h=harness(),p=core.createCharacter('추가피해',classId);Object.assign(p,{level:35,job,map:'hangar'});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);h.api.startBossFight();
  const b=h.api.get().boss;b.phase='recover';b.elapsed=-20;advance(h,1);p.x=b.x-100;p.y=b.y;p.hp=core.maxHp(p)-50;
  b.elapsed=0;b.strikes=0;
  if(kind==='blade'){b.phase='blade-charge';b.elapsed=.59;}
  if(kind==='bullet'){b.phase='recover';b.elapsed=-20;b.projectiles=[{x:p.x+5,y:p.y,dir:-1,life:1,spent:false}];}
  if(kind==='dash'){b.phase='dash';b.velocity={x:-1000,y:0};b.dashHit=false;}
  if(kind==='bomb'){b.phase='recover';b.elapsed=-20;b.bombs=[{x:p.x,y:p.y,remaining:.01}];}
  if(kind==='spin')b.phase='spin';
  if(kind==='pull'){b.phase='pull-charge';b.elapsed=.69;}
  const before=p.hp,expected=core.incomingDamage(p,base+core.maxHp(p)*.1);
  h.api.update(.02);assert.equal(before-p.hp,expected,`${classId} ${kind}`);
  if(kind==='spin'){const hp=p.hp;advance(h,.4);assert.equal(hp-p.hp,expected,`${classId} next spin hit`);}
 }
});

test('graduation exit requires equipped title before challenge and after victory, and stays blocked in combat',async()=>{
 const h=harness(),p=core.createCharacter('다음거리');Object.assign(p,{level:35,map:'hangar',hp:780});h.api.start(p);
 const out=core.MAPS.hangar.portals.find(p=>p.to==='yeoksamStreet');assert.ok(out);assert.equal(core.MAPS.hangar.name,'수료조건');p.x=out.x;p.y=out.y;
 render(h);assert.ok(h.labels.some(l=>l.text==='역삼역주변거리'));assert.equal(h.api.findInteraction().to,'yeoksamStreet');
 await h.api.travel(out);assert.equal(p.map,'hangar');assert.equal(h.api.get().scene,'playing');assert.match(h.el('#toast').textContent,/A형 칭호를 장착/);
 p.typeATitle=1;h.api.interact();assert.equal(p.map,'hangar');assert.equal(h.api.get().scene,'playing');core.equipTypeATitle(p);
 let pending=h.api.travel(out);await h.flush();await pending;assert.equal(p.map,'yeoksamStreet');assert.equal(h.api.get().monsters.length,0);assert.equal(h.api.get().boss,null);
 assert.equal(core.normalizeCharacter(p).map,'yeoksamStreet');p.x=1050;p.y=654;h.api.interact();assert.equal(h.api.get().modal,'shop');const money=p.money;h.el('#buy-mpPotions').onclick();assert.equal(p.money,money-500);assert.equal(p.mpPotions,1);h.api.closeModal();
 core.equipTypeATitle(p);const back=core.MAPS.yeoksamStreet.portals.find(p=>p.to==='hangar');pending=h.api.travel(back);await h.flush();await pending;assert.equal(p.map,'hangar');
 core.equipTypeATitle(p);h.api.startBossFight();const b=h.api.get().boss;p.x=out.x;p.y=out.y;render(h);assert.ok(!h.labels.some(l=>l.text==='역삼역주변거리'));assert.equal(h.api.findInteraction(),null);await h.api.travel(out);assert.equal(p.map,'hangar');
 b.safetyUsed=true;b.hp=1;h.api.hitMonster(b,2);assert.equal(b.dead,true);h.api.closeModal();render(h);assert.ok(h.labels.some(l=>l.text==='역삼역주변거리'));assert.equal(h.api.findInteraction().to,'yeoksamStreet');
 core.equipTypeATitle(p);await h.api.travel(out);assert.equal(p.map,'hangar');assert.equal(h.api.get().scene,'playing');core.equipTypeATitle(p);
 pending=h.api.travel(out);await h.flush();await pending;assert.equal(p.map,'yeoksamStreet');assert.equal(p.typeAWins,1);
 h.api.worldMap();assert.match(h.el('#modal-root').innerHTML,/역삼역주변거리/);assert.match(h.el('#modal-root').innerHTML,/수료조건/);assert.doesNotMatch(h.el('#modal-root').innerHTML,/A형 격납고/);
});


test('large HP potion is sold for 500, heals 150, caps at max HP and persists in slots',()=>{
 const h=harness(),p=core.createCharacter('고급물약');Object.assign(p,{level:20,hp:100,money:1000});h.api.start(p);h.api.shop();
 assert.match(h.el('#modal-root').innerHTML,/고급 체력 물약/);assert.match(h.el('#modal-root').innerHTML,/HP \+150/);
 h.el('#buy-largePotions').onclick();assert.equal(p.money,500);assert.equal(p.largePotions,1);h.el('#buy-largePotions').onclick();assert.equal(p.money,0);assert.equal(p.largePotions,2);assert.equal(h.el('#buy-largePotions').disabled,true);
 assert.equal(core.buyItem(p,'largePotions').ok,false);h.api.closeModal();core.assignQuickSlot(p,2,'largePotions');h.api.useQuickSlot(2);assert.equal(p.hp,250);assert.equal(p.largePotions,1);
 p.hp=core.maxHp(p)-20;h.api.useQuickSlot(2);assert.equal(p.hp,core.maxHp(p));assert.equal(p.largePotions,0);
 p.largePotions=1;h.api.useQuickSlot(2);assert.equal(p.largePotions,1);const restored=core.normalizeCharacter(p);assert.equal(restored.largePotions,1);assert.equal(restored.quickSlots[2],'largePotions');
 const old={...p};delete old.largePotions;assert.equal(core.normalizeCharacter(old).largePotions,0);
});
test('large HP potions share boss cooldown with regular HP potions in both directions',()=>{
 const {h,p}=bossHarness();p.largePotions=3;p.hp=100;h.api.startBossFight();p.quickSlots=['largePotions','potions','largePotions'];
 h.api.useQuickSlot(0);assert.equal(p.hp,250);assert.equal(p.largePotions,2);assert.equal(h.api.get().potionCooldown,10);
 h.api.useQuickSlot(1);assert.equal(p.potions,20);h.api.inventory('largePotions');h.api.useInventoryItem('largePotions',true);assert.equal(p.largePotions,2);h.api.closeModal();
 const b=h.api.get().boss;b.phase='recover';b.elapsed=-30;advance(h,10.1);h.api.useQuickSlot(1);assert.equal(p.hp,310);assert.equal(p.potions,19);h.api.useQuickSlot(2);assert.equal(p.largePotions,2);
});

test('Type A victory grants one unequipped title; inventory toggles title independently from uniform',()=>{
 const h=harness(),p=core.createCharacter('칭호보상');Object.assign(p,{level:35,map:'hangar',uniform:1,uniformEquipped:true});h.api.start(p);h.api.startBossFight();
 const b=h.api.get().boss;b.safetyUsed=true;b.hp=1;h.api.hitMonster(b,2);assert.equal(p.typeATitle,1);assert.equal(p.typeATitleEquipped,false);assert.match(h.el('#modal-root').innerHTML,/A형 칭호/);
 h.api.closeModal();h.api.inventory('typeATitle');const base=core.attackPower(p);h.el('#bag-use').onclick();assert.equal(p.typeATitleEquipped,true);assert.equal(p.uniformEquipped,true);assert.equal(core.attackPower(p),base*1.05);
 assert.match(h.el('#modal-root').innerHTML,/해제하기/);const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0];assert.equal(core.normalizeCharacter(saved).typeATitleEquipped,true);
 h.el('#bag-use').onclick();assert.equal(core.attackPower(p),base);assert.equal(p.typeATitle,1);assert.equal(p.uniformEquipped,true);
 h.api.closeModal();h.api.startBossFight();const again=h.api.get().boss;again.safetyUsed=true;again.hp=1;h.api.hitMonster(again,2);assert.equal(p.typeAWins,2);assert.equal(p.typeATitle,1);
});
test('silver title is above nickname for each character and muscle form only while equipped',()=>{
 for(const classId of ['wanderer','cat','rabbit'])for(const powered of [false,true]){
 const h=harness(),p=core.createCharacter('칭호확인',classId);Object.assign(p,{level:35,typeATitle:1,typeATitleEquipped:true,job:classId==='wanderer'?'bodybuilder':null,powerTime:powered?12:0});h.api.start(p);render(h);
 const name=h.labels.find(l=>l.text.startsWith('칭호확인')),title=h.labels.find(l=>l.text==='A형');assert.ok(title);assert.equal(title.color,'#d5d9e1');assert.equal(title.x,name.x);assert.ok(title.y<name.y);
 core.equipTypeATitle(p);render(h);assert.ok(!h.labels.some(l=>l.text==='A형'));
 }
});
test('title migration, ownership checks and attack bonus remain stable across jobs, buffs and reload',()=>{
 const p=core.createCharacter('기존격파');assert.equal(core.equipTypeATitle(p).ok,false);p.typeATitleEquipped=true;assert.equal(core.hasTypeATitle(p),false);
 const legacy={...p,typeAWins:1};delete legacy.typeATitle;delete legacy.typeATitleEquipped;const migrated=core.normalizeCharacter(legacy);assert.equal(migrated.typeATitle,1);assert.equal(migrated.typeATitleEquipped,false);
 for(const [classId,job] of [['wanderer','swordsman'],['wanderer','bodybuilder'],['cat','protester'],['rabbit','mage']]){
 const c=core.createCharacter('공격칭호',classId);Object.assign(c,{level:35,job,typeATitle:1,respectTime:10,powerTime:12});const base=core.attackPower(c);core.equipTypeATitle(c);assert.equal(core.attackPower(c),base*1.05);assert.equal(core.basicAttackPower(c),Math.round(base*1.05*(job==='bodybuilder'?1.8:1)));core.equipTypeATitle(c);assert.equal(core.attackPower(c),base);
 }
});

test('cat bottle buffs explosion damage and independent explosion/fire radii at hit boundaries',()=>{
 for(const phase of ['explosion','fire'])for(const axis of ['x','y'])for(const edge of [-1,1]){
  const h=harness(),p=core.createCharacter('화염강화','cat');Object.assign(p,{level:15,job:'protester',map:'alley',x:1000});p.mp=core.maxMp(p);h.api.start(p);
  const skill=core.effectiveSkill(p,'e');assert.equal(skill.damage,2.75);assert.equal(skill.radius,105*1.5);assert.ok(Math.abs(skill.burnRadius-105*.86*1.7)<1e-9);
  h.api.startCatCharge('test');h.api.releaseCatCharge('test');const bottle=h.api.get().catProjectiles[0];bottle.elapsed=bottle.duration;
  const monsters=h.api.get().monsters,m=monsters[0];monsters.forEach(m=>{m.x=2300;m.home=m.x;m.speed=0;m.hp=m.maxHp=10000;});
  const radius=phase==='explosion'?skill.radius:skill.burnRadius;
  const position=()=>{m.x=bottle.toX+(axis==='x'?radius+edge:0);m.y=bottle.toY+(axis==='y'?(radius+edge)/1.5:0);m.home=m.x;m.knockback=0;m.hp=10000;};
  if(phase==='explosion')position();h.api.update(.001);
  const fire=h.api.get().catFires[0];assert.equal(fire.radius,skill.burnRadius);assert.equal(fire.duration,3);
  assert.equal(h.api.get().effects.find(e=>e.type==='ring'&&e.color==='#ffb565').size,skill.radius);
  if(phase==='fire'){position();fire.tick=0;h.api.update(.001);}
  assert.equal(10000-m.hp,edge<0?Math.round(core.attackPower(p)*(phase==='explosion'?2.75:.43)):0,`${phase} ${axis} ${edge}`);
 }
});

test('Yeoksam street shop replaces destination scrolls while keeping potions and purchase scroll position',()=>{
 const h=harness(),p=core.createCharacter('거리상점');Object.assign(p,{map:'yeoksamStreet',money:300});h.api.start(p);h.api.shop();
 const html=h.el('#modal-root').innerHTML;assert.match(html,/역삼역 주변 거리 귀환 주문서/);assert.doesNotMatch(html,/buy-returnScrolls|buy-gangnamScrolls/);
 for(const id of ['potions','largePotions','mpPotions'])assert.ok(html.includes(`buy-${id}`));
 assert.equal(core.buyItem(p,'returnScrolls').ok,false);assert.equal(core.buyItem(p,'gangnamScrolls').ok,false);assert.equal(p.money,300);
 const body=h.el('.npc-dialog-body');body.scrollTop=110;const button=h.el('#buy-yeoksamStreetScrolls');h.document.activeElement=button;
 Object.defineProperty(h.el('#modal-root'),'innerHTML',{get:()=>html,set(){assert.fail('purchase rebuilt shop');}});
 for(let i=1;i<=3;i++){button.onclick();assert.equal(p.yeoksamStreetScrolls,i);assert.equal(p.money,300-i*100);assert.equal(body.scrollTop,110);assert.equal(h.document.activeElement,button);}
 assert.equal(button.disabled,true);button.onclick();assert.equal(p.yeoksamStreetScrolls,3);
 for(const map of ['town','gangnam']){p.map=map;assert.equal(core.buyItem(p,'yeoksamStreetScrolls').ok,false);assert.ok(!core.shopItemsFor(p).includes('yeoksamStreetScrolls'));assert.ok(core.shopItemsFor(p).includes('returnScrolls'));assert.ok(core.shopItemsFor(p).includes('gangnamScrolls'));}
});
test('street scroll saves and binds, recalls from combat, preserves HP/MP and never consumes at destination',()=>{
 const h=harness(),p=core.createCharacter('거리귀환');Object.assign(p,{level:35,map:'hangar',yeoksamStreetScrolls:2,hp:200,mp:90,typeATitle:1});h.api.start(p);h.api.inventory('yeoksamStreetScrolls');key(h,'Digit2');h.api.closeModal();h.api.startBossFight();
 key(h,'Digit2');assert.equal(p.map,'yeoksamStreet');assert.equal(p.yeoksamStreetScrolls,1);assert.equal(p.hp,200);assert.equal(p.mp,90);assert.equal(h.api.get().boss,null);assert.ok(p.visited.includes('yeoksamStreet'));
 key(h,'Digit2');assert.equal(p.yeoksamStreetScrolls,1);const saved=JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0],restored=core.normalizeCharacter(saved);assert.equal(restored.yeoksamStreetScrolls,1);assert.equal(restored.quickSlots[1],'yeoksamStreetScrolls');assert.equal(restored.map,'yeoksamStreet');
 const old={...p};delete old.yeoksamStreetScrolls;assert.equal(core.normalizeCharacter(old).yeoksamStreetScrolls,0);
});

function chickFixture(map='alley',job='hacker'){
 const h=harness(),p=core.createCharacter('해커 테스트','chick');Object.assign(p,{level:15,job,map,x:1000,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);
 h.api.get().monsters.forEach((m,i)=>Object.assign(m,{x:1250+i*70,home:1250+i*70,y:650,speed:0,hp:10000,maxHp:10000}));return {h,p};
}
test('chick promotion is available only from Hyupro in Maple hideout at level 10',()=>{
 const {h,p}=chickFixture('maple',null);p.level=9;p.x=960;
 assert.equal(core.advanceJob(p,'hacker').ok,false);p.level=10;p.map='town';assert.equal(core.advanceJob(p,'hacker').ok,false);
 assert.ok(core.MAPS.town.portals.some(g=>g.to==='maple'));assert.ok(core.MAPS.maple.portals.some(g=>g.to==='town'));
 p.map='maple';h.api.interact();assert.match(h.el('#modal-root').innerHTML,/휴프로/);assert.match(h.el('#modal-root').innerHTML,/해커/);
 assert.equal(core.advanceJob(p,'hacker').ok,true);assert.equal(core.equipmentName(p),'노트북');assert.equal(core.normalizeCharacter(p).job,'hacker');
 h.api.closeModal();render(h);assert.ok(h.draws.some(d=>d.asset==='assets/npc-hyupro.png'));
 h.api.characters([p],p.id);assert.match(h.el('#screens').innerHTML,/background-position:0 66.6667%/);
});
test('novice chick basic attack has extended reach while Q is a shorter scratch',()=>{
 const {h,p}=chickFixture('alley',null);const [inside,outside]=h.api.get().monsters;inside.x=p.x+190;outside.x=p.x+201;
 assert.equal(core.effectiveSkill(p,'q').range,175);h.api.cast('w');h.api.attack();assert.equal(10000-inside.hp,Math.round(core.attackPower(p)*1.2));assert.equal(outside.hp,10000);assert.equal(h.api.get().chickStealth,0);
 advance(h,.5);inside.x=p.x+90;const hp=inside.hp;h.api.attack();assert.equal(hp-inside.hp,core.attackPower(p));
});
test('stealth gives 50% movement, prevents tracking/contact, expires, and magic reveals it',()=>{
 const {h,p}=chickFixture();const m=h.api.get().monsters[0];Object.assign(m,{x:p.x,y:p.y,home:p.x,speed:100});
 h.api.cast('w');const hp=p.hp,x=p.x;h.api.keys.add('ArrowRight');h.api.update(.2);h.api.keys.clear();assert.ok(Math.abs(p.x-x-285*1.5*.2)<1e-8);assert.equal(p.hp,hp);assert.ok(m.x<x,'hidden player does not pull the patrolling enemy toward them');
 h.api.playerDamage(20,null,'physical');assert.ok(h.api.get().chickStealth>0);h.api.playerDamage(20,null,'magic');assert.equal(h.api.get().chickStealth,0);
 const b=chickFixture();b.h.api.cast('w');advance(b.h,5.1);assert.equal(b.h.api.get().chickStealth,0);
});
test('hacker basic attack emits visible code and hits only the first enemy along its path',()=>{
 const {h,p}=chickFixture();const [near,far]=h.api.get().monsters;near.x=p.x+180;far.x=p.x+260;
 h.api.attack();assert.equal(near.hp,10000);assert.equal(h.api.get().chickCodes.length,1);assert.equal(h.api.get().chickCodes[0].tokens.length,3);
 render(h);assert.ok(h.labels.some(l=>h.api.get().chickCodes[0].tokens.includes(l.text)));
 advance(h,.4);assert.equal(near.hp,10000-core.attackPower(p));assert.equal(far.hp,10000);assert.equal(h.api.get().chickCodes.length,0);
});
test('hacker code respects range, travels left, and clears on combat reset',()=>{
 const {h,p}=chickFixture();h.api.get().monsters.forEach((m,i)=>m.x=p.x+521+i*30);h.api.attack();advance(h,.8);assert.ok(h.api.get().monsters.every(m=>m.hp===10000));
 h.api.keys.add('ArrowLeft');h.api.update(.01);h.api.keys.clear();const m=h.api.get().monsters[0];m.x=p.x-300;h.api.attack();advance(h,.5);assert.equal(m.hp,10000-core.attackPower(p));
 h.api.attack();h.api.resetCombat();assert.equal(h.api.get().chickCodes.length,0);
});
test('hacker Q damages only the nearest target and does not pay when none are in range',()=>{
 const {h,p}=chickFixture();const [near,far]=h.api.get().monsters;near.x=p.x-120;far.x=p.x+180;
 h.api.cast('w');h.api.cast('q');assert.equal(near.hp,10000-Math.round(core.attackPower(p)*2.1*1.2));assert.equal(far.hp,10000);assert.ok(h.api.get().effects.some(e=>e.type==='ring'&&e.color==='#65baff'));assert.equal(h.api.get().chickStealth,0);
 const b=chickFixture();b.h.api.get().monsters.forEach(m=>m.x=b.p.x+600);const mp=b.p.mp;b.h.api.cast('q');assert.equal(b.p.mp,mp);assert.equal(b.h.api.get().cooldowns.q,0);
});
test('W grants half a second of invulnerability even after attacking reveals the chick',()=>{
 const {h,p}=chickFixture();advance(h,2.1);h.api.cast('w');assert.equal(h.api.get().invincible,.5);h.api.attack();assert.equal(h.api.get().chickStealth,0);
 const m=h.api.get().monsters[0];m.x=p.x;m.y=p.y;const hp=p.hp;advance(h,.45);assert.equal(p.hp,hp);advance(h,.1);assert.ok(p.hp<hp);
});
test('E keeps stealth while charging, moves its rectangle, pays once, freezes and grays enemies',()=>{
 const {h,p}=chickFixture();h.api.cast('w');const mp=p.mp;assert.equal(h.api.startChickCharge('test'),true);const first=h.api.chickArea().x;
 advance(h,1);assert.ok(h.api.chickArea().x>first+200);assert.ok(h.api.get().chickStealth>0);assert.ok(p.mp>=mp);
 const m=h.api.get().monsters[0],a=h.api.chickArea();Object.assign(m,{x:a.x,y:a.y,home:a.x});const start=m.x,before=p.mp;
 assert.equal(h.api.releaseChickCharge('test'),true);assert.equal(before-p.mp,24);assert.equal(h.api.releaseChickCharge('test'),false);assert.equal(h.api.get().cooldowns.e,14);
 assert.equal(10000-m.hp,Math.round(core.attackPower(p)*4.5*1.2));assert.equal(m.stunTime,2);assert.equal(h.api.get().chickStealth,0);advance(h,1);assert.equal(m.x,start);
 render(h);assert.ok(h.draws.some(d=>d.asset==='assets/robot.png'&&d.filter.includes('grayscale')));advance(h,2.1);assert.equal(m.stunTime,0);
});
test('E auto fires after 1.5 seconds, blocks other attacks, and cancels safely on blur',()=>{
 const {h,p}=chickFixture();h.api.startChickCharge('keyboard');const mp=p.mp;h.api.cast('q');h.api.attack();assert.equal(p.mp,mp);assert.equal(h.api.get().attackTimer,0);
 advance(h,1.49);assert.ok(h.api.get().chickCharge);advance(h,.02);assert.equal(h.api.get().chickCharge,null);assert.ok(h.api.get().cooldowns.e>13);assert.ok(p.mp<mp-18);
 const b=chickFixture();b.h.api.startChickCharge('keyboard');b.h.windowEvents.get('blur').forEach(f=>f());assert.equal(b.h.api.get().chickCharge,null);assert.equal(b.h.api.get().cooldowns.e,0);
});
test('hacking picks the nearest enemy regardless of level or HP, cycles with arrows, zooms out and types in place',()=>{
 const {h,p}=chickFixture();const list=h.api.get().monsters;list.forEach((m,i)=>Object.assign(m,{level:2,x:1200+i*200,home:1200+i*200}));list[1].level=9;list[2].level=9;list[2].hp=9000;
 h.api.cast('r');assert.equal(h.api.get().hackerUlt.targetId,list[0].id);assert.equal(h.api.playerDamage(100),20);
 const key=code=>h.events.get('keydown')({code,repeat:false,target:{matches:()=>false},preventDefault(){}});
 key('ArrowRight');assert.equal(h.api.get().hackerUlt.targetId,list[1].id);key('ArrowLeft');assert.equal(h.api.get().hackerUlt.targetId,list[0].id);
 const x=p.x;h.api.keys.add('ArrowUp');advance(h,.3);assert.equal(p.x,x);assert.equal(p.y,650);assert.ok(h.api.get().cameraZoom<.8);assert.ok(h.api.chickFrame()>=12);
 key('Enter');render(h);assert.ok(h.labels.some(l=>l.text.includes('타다다다닥')));assert.equal(h.api.get().hackerUlt.phase,'channeling');assert.ok(list[0].hack);assert.equal(h.api.playerDamage(100),20);
 const hp=list[0].hp,tx=list[0].x;advance(h,4.95);assert.ok(list[0].hack);assert.equal(list[0].x,tx);assert.equal(hp-list[0].hp,9*Math.round(core.attackPower(p)*1.25));
 advance(h,.1);assert.equal(list[0].hack,null);assert.equal(hp-list[0].hp,10*Math.round(core.attackPower(p)*1.25));assert.equal(h.api.get().hackerUlt,null);assert.equal(h.api.playerDamage(100),100);
});
test('hack selection expires, absent enemies cost nothing, and cancellation removes control',()=>{
 const {h,p}=chickFixture();h.api.cast('r');advance(h,10.1);assert.equal(h.api.get().hackerUlt,null);
 const b=chickFixture('maple');const mp=b.p.mp;b.h.api.cast('r');assert.equal(b.p.mp,mp);assert.equal(b.h.api.get().cooldowns.r,0);
 const c=chickFixture();c.h.api.cast('r');c.h.api.confirmHack();const target=c.h.api.get().monsters.find(m=>m.hack);c.h.api.worldMap();assert.equal(target.hack,null);assert.equal(c.h.api.get().hackerUlt,null);
});
test('E and R control the active soldier without counter reflection and resume after release',()=>{
 const {h,p}=chickFixture('pocha');h.api.startBossFight();const b=h.api.get().boss;Object.assign(b,{phase:'counter',elapsed:1,x:p.x+110,y:650});
 const hp=p.hp;h.api.startChickCharge('test');h.api.releaseChickCharge('test');assert.equal(p.hp,hp);assert.ok(b.stunTime>0);const elapsed=b.elapsed;advance(h,1);assert.equal(b.elapsed,elapsed);
 h.api.cast('r');h.api.confirmHack();assert.ok(b.hack);advance(h,.5);assert.equal(p.hp,hp);h.api.cancelChickAim();assert.equal(b.hack,null);
});
test('chick walk, jump, punch, laptop charge and seated typing use different atlas frames',()=>{
 const {h,p}=chickFixture();assert.equal(h.api.chickFrame(),8);h.api.keys.add('ArrowRight');const frames=new Set();for(let i=0;i<40;i++){h.api.update(1/60);frames.add(h.api.chickFrame());}assert.ok(frames.size>=3);h.api.keys.clear();
 h.api.jump();assert.equal(h.api.chickFrame(),28);advance(h,.2);assert.equal(h.api.chickFrame(),29);advance(h,1);
 h.api.attack();assert.equal(h.api.chickFrame(),16);advance(h,.12);assert.equal(h.api.chickFrame(),18);advance(h,.4);
 h.api.startChickCharge('test');assert.equal(h.api.chickFrame(),11);h.api.cancelChickAim();h.api.cast('r');assert.ok(h.api.chickFrame()>=12);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/chick-motion.png'));
});

test('cat E roots charge and throw, then allows movement while the projectile and fire persist',()=>{
 const h=harness(),p=core.createCharacter('화염병 시전','cat');Object.assign(p,{level:15,job:'protester',x:1100,y:640});p.mp=core.maxMp(p);h.api.start(p);
 h.api.keys.add('ArrowRight');h.api.keys.add('ArrowDown');assert.equal(h.api.startCatCharge('test'),true);
 const x=p.x,y=p.y;h.api.jump();h.api.update(.5);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(h.api.get().pz,0);assert.equal(h.api.get().walking,false);
 h.api.releaseCatCharge('test');const mp=p.mp;h.api.attack();h.api.cast('w');h.api.cast('r');h.api.jump();assert.equal(p.mp,mp);assert.equal(h.api.get().combatMotion.kind,'catThrow');
 h.api.update(.27);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(h.api.get().jumpPrep,0);
 h.api.update(.02);assert.ok(p.x>x);assert.ok(p.y>y);assert.ok(h.api.get().catProjectiles.length>0,'movement resumes before the bottle lands');
});
test('cat R locks all actions for 0.3 seconds across frame rates, without locking the five-second field',()=>{
 for(const fps of [30,60,120]){
  const h=harness(),p=core.createCharacter('투표함 시전','cat');Object.assign(p,{level:15,job:'protester',x:1100});p.mp=core.maxMp(p);h.api.start(p);h.api.cast('r');
  const x=p.x,mp=p.mp;h.api.keys.add('ArrowRight');h.api.attack();h.api.cast('q');h.api.cast('w');h.api.startCatCharge('test');h.api.jump();
  assert.equal(p.mp,mp);assert.equal(h.api.get().catCharge,null);assert.equal(h.api.get().jumpPrep,0);assert.equal(h.api.get().combatMotion.kind,'catBallot');
  for(let i=0;i<fps/2;i++)h.api.update(1/fps);
  assert.ok(Math.abs(p.x-x-285*.2)<1e-7,'only 0.2 seconds of the first half-second are movable');assert.ok(h.api.get().catBallot.remaining>4);
  h.api.attack();assert.equal(h.api.get().combatMotion.kind,'catPunch');
 }
});
test('cancelled cat E and scene resets cannot leave a movement lock behind',()=>{
 const h=harness(),p=core.createCharacter('시전 취소','cat');Object.assign(p,{level:15,job:'protester',x:1100});p.mp=core.maxMp(p);h.api.start(p);
 h.api.startCatCharge('keyboard');h.windowEvents.get('blur').forEach(fn=>fn());h.api.keys.add('ArrowRight');h.api.update(.1);assert.equal(p.x,1128.5);
 h.api.cast('r');h.api.resetCombat();h.api.keys.add('ArrowRight');h.api.update(.1);assert.equal(p.x,1157);
});

test('dungeon patrol never snaps back to the spawn after chasing, and stun pauses it',()=>{
 const h=harness(),p=core.createCharacter('순찰 확인');p.map='alley';p.x=100;h.api.start(p);const m=h.api.get().monsters[0];Object.assign(m,{x:1700,home:600,y:650,patrolY:650,speed:100,dir:1});
 h.api.update(.1);assert.equal(m.x,1707);
 p.x=1900;h.api.update(.1);assert.equal(m.x,1717,'nearby player is still pursued');
 p.x=100;h.api.update(.1);assert.equal(m.x,1724,'patrol resumes at the chase endpoint');
 m.stunTime=1;h.api.update(.5);assert.equal(m.x,1724);h.api.update(.51);assert.ok(m.x>1724);
});

test('expanded hacker E hits the added width and height, but not beyond the preview border',()=>{
 const {h,p}=chickFixture();h.api.startChickCharge('test');const area=h.api.chickArea();assert.equal(area.width,332);assert.equal(area.height,152);
 const [wide,tall,outside]=h.api.get().monsters;Object.assign(wide,{x:area.x+166,y:area.y});Object.assign(tall,{x:area.x,y:area.y+76});Object.assign(outside,{x:area.x+167,y:area.y});
 h.api.releaseChickCharge('test');assert.ok(wide.hp<10000);assert.ok(tall.hp<10000);assert.equal(outside.hp,10000);render(h);assert.ok(h.labels.some(l=>l.text==='> SYSTEM HALTED_'));
});
test('hacker initial selection uses both axes and retargets to the nearest living enemy',()=>{
 const {h,p}=chickFixture();const [a,b]=h.api.get().monsters;Object.assign(a,{x:p.x+90,y:p.y+70,level:99});Object.assign(b,{x:p.x-100,y:p.y,level:1});
 h.api.cast('r');assert.equal(h.api.get().hackerUlt.targetId,b.id);b.dead=true;h.api.update(.01);assert.equal(h.api.get().hackerUlt.targetId,a.id);
 assert.equal(h.el('#hack-controls').hidden,false);h.api.confirmHack();h.api.update(.2);assert.equal(h.el('#hack-controls').hidden,true);
});

test('hacker types standing still and keeps a full walking cycle during held basic attack',()=>{
 const {h,p}=chickFixture('maple');h.api.attack();assert.equal(h.api.chickFrame(),16);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/chick-typing.png'&&d.source[1]===0));advance(h,.4);
 const x=p.x,frames=new Set();h.api.keys.add('ArrowRight');h.api.keys.add('KeyA');
 for(let i=0;i<50;i++){h.api.update(1/60);assert.equal(h.api.get().walking,true);frames.add(h.api.chickFrame());}
 assert.ok(p.x>x+200);assert.deepEqual([...frames].sort(),[20,21,22,23]);
 h.api.keys.delete('ArrowRight');h.api.keys.add('ArrowLeft');h.api.update(1/60);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/chick-typing.png'&&d.matrix[0]<0));
 h.api.keys.delete('ArrowLeft');h.api.update(1/60);assert.ok(h.api.chickFrame()>=16&&h.api.chickFrame()<20);
 h.api.keys.clear();advance(h,.4);assert.equal(h.api.chickFrame(),8);
});
test('hacker ultimate keeps its seated typing atlas while basic attacks use the standing atlas',()=>{
 const {h,p}=chickFixture();h.api.cast('r');h.api.confirmHack();render(h);
 assert.ok(h.api.chickFrame()>=12&&h.api.chickFrame()<=14);assert.ok(h.draws.some(d=>d.asset==='assets/chick-motion.png'));assert.ok(!h.draws.some(d=>d.asset==='assets/chick-typing.png'));
});

test('chick jump follows anticipation, rise, fall and landing with a separate laptop set',()=>{
 for(const job of [null,'hacker']){
  const {h,p}=chickFixture('maple',job),offset=job?28:24;h.api.jump();assert.equal(h.api.chickFrame(),offset);const seen=new Set();
  for(let i=0;i<65;i++){h.api.update(1/60);const state=h.api.get();if(state.pz>0||state.jumpPrep>0||state.jumpLanding>0){seen.add(h.api.chickFrame());render(h);const sprite=h.draws.find(d=>d.asset==='assets/chick-actions.png');assert.ok(sprite);assert.ok(sprite.source[1]>=(job?389:0)&&sprite.source[1]<(job?740:389));}}
  assert.ok(seen.has(offset+1));assert.ok(seen.has(offset+2));assert.ok(seen.has(offset+3));assert.equal(h.api.get().pz,0);
 }
});
test('novice punches and scratches use isolated action frames instead of bleeding atlas rows',()=>{
 const {h,p}=chickFixture('maple',null);h.api.attack();assert.equal(h.api.chickFrame(),32);advance(h,.12);assert.equal(h.api.chickFrame(),33);render(h);
 const sprite=h.draws.find(d=>d.asset==='assets/chick-actions.png');assert.ok(sprite);assert.ok(sprite.source[1]>=740);assert.ok(!h.draws.some(d=>d.asset==='assets/chick-motion.png'));
 advance(h,.4);h.api.cast('q');assert.equal(h.api.chickFrame(),34);advance(h,.15);assert.equal(h.api.chickFrame(),35);
});
test('hacker keeps the laptop jump pose when attacking in midair',()=>{
 const {h,p}=chickFixture('maple');h.api.jump();advance(h,.2);h.api.attack();assert.equal(h.api.chickFrame(),29);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/chick-actions.png'));assert.ok(!h.draws.some(d=>d.asset==='assets/chick-typing.png'));
});

test('chick restores the original chunky walk sequences with the original pre-edit artwork',()=>{
 for(const job of [null,'hacker']){const {h,p}=chickFixture('maple',job);h.api.keys.add('ArrowRight');const seen=new Set();for(let i=0;i<40;i++){h.api.update(.01);const phase=h.api.get().walkPhase;assert.equal(h.api.chickFrame(),(job?[9,8,10,8]:[1,2,3,2])[Math.floor(phase*4)%4]);seen.add(h.api.chickFrame());}assert.ok(seen.size>=2);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/chick-motion.png'));h.api.keys.clear();h.api.update(.02);assert.equal(h.api.chickFrame(),job?8:0);render(h);assert.ok(h.draws.some(d=>d.asset==='assets/chick-motion.png'));}
});
test('chick walk cadence uses the original 165-unit cycle instead of the rushed 80-unit rig',()=>{
 const {h,p}=chickFixture('maple',null);const x=p.x;h.api.keys.add('ArrowRight');h.api.update(.1);assert.ok(Math.abs(h.api.get().walkPhase-(p.x-x)/165)<1e-9);
});

test('hacker E shares the preview and impact area and remains centered at both lane edges',()=>{
 for(const y of [580,720]){const {h,p}=chickFixture();p.y=y;h.api.startChickCharge('test');const a=h.api.chickArea();assert.equal(a.y,650);assert.ok(a.y-a.height/2<=580&&a.y+a.height/2>=720);h.api.releaseChickCharge('test');const impact=h.api.get().effects.find(e=>e.type==='hackZone');for(const key of ['x','y','width','height'])assert.equal(impact[key],a[key]);}
});


test('hacker E aim advances twice as fast while keeping the maximum reach',()=>{
 const {h,p}=chickFixture();h.api.startChickCharge('test');const c=h.api.get().chickCharge;assert.equal(c.skill.charge,1.5);assert.equal(c.skill.stun,2);
 for(const dir of [-1,1]){c.dir=dir;c.elapsed=0;const start=h.api.chickArea().x;c.elapsed=.25;assert.ok(Math.abs((h.api.chickArea().x-start)*dir-122.5)<1e-8);c.elapsed=1;assert.equal(h.api.chickArea().x,p.x+dir*600);c.elapsed=1.49;assert.equal(h.api.chickArea().x,p.x+dir*600);}
});
test('hacker ultimate returns to normal player camera while channeling, retaining its damage and protection',()=>{
 const {h,p}=chickFixture();h.api.cast('r');advance(h,.5);assert.ok(h.api.get().cameraZoom<.8);h.api.confirmHack();advance(h,1.2);const state=h.api.get();assert.equal(state.hackerUlt.phase,'channeling');assert.equal(state.cameraZoom,1);assert.equal(h.api.playerDamage(100),20);assert.ok(state.monsters.some(m=>m.hack));assert.ok(Math.abs(state.camera-core.clamp(p.x-state.screenWidth*.45,0,core.MAPS[p.map].width-state.screenWidth))<2);
});


test('cat basic attack expands by 30 percent in both directions and W has no evasion text',()=>{
 for(const job of [null,'protester'])for(const dir of [-1,1]){
  const h=harness(),p=core.createCharacter('고양이 범위','cat');Object.assign(p,{level:15,job,map:'alley',x:1000,y:650});p.mp=core.maxMp(p);h.api.start(p);
  h.api.keys.add(dir<0?'ArrowLeft':'ArrowRight');h.api.update(.01);h.api.keys.clear();const [inside,wideOutside,tallOutside]=h.api.get().monsters;
  for(const m of [inside,wideOutside,tallOutside])Object.assign(m,{hp:10000,maxHp:10000,speed:0});Object.assign(inside,{x:p.x+dir*166,y:p.y+97});Object.assign(wideOutside,{x:p.x+dir*167,y:p.y});Object.assign(tallOutside,{x:p.x+dir*100,y:p.y+98});
  h.api.attack();assert.equal(inside.hp,10000-core.attackPower(p));assert.equal(wideOutside.hp,10000);assert.equal(tallOutside.hp,10000);h.api.cast('w');render(h);assert.ok(!h.labels.some(l=>l.text==='회피!'));assert.ok(h.api.get().invincible>=.7);
 }
});
test('each ballot damage tick pulls living targets toward its center without outward knockback or overshoot',()=>{
 const h=harness(),p=core.createCharacter('끌어당기기','cat');Object.assign(p,{level:15,job:'protester',map:'alley',x:1000,y:650});p.mp=core.maxMp(p);h.api.start(p);h.api.cast('r');const b=h.api.get().catBallot,group=h.api.get().monsters;
 const offsets=[[300,0],[-300,0],[0,60],[0,-60],[5,0],[510,0]];
 group.forEach((m,i)=>Object.assign(m,{x:b.x+offsets[i][0],y:b.y+offsets[i][1],hp:10000,maxHp:10000,speed:0}));
 for(let tick=0;tick<3;tick++){
  const before=group.map(m=>({hp:m.hp,d:Math.hypot(m.x-b.x,m.y-b.y)}));h.api.catAreaHit(b.x,b.y,b.skill.range,b.skill.damage,b.skill.pull);
  group.forEach((m,i)=>{if(i===5){assert.equal(m.hp,before[i].hp);assert.equal(Math.hypot(m.x-b.x,m.y-b.y),before[i].d);}else{assert.equal(before[i].hp-m.hp,Math.round(core.attackPower(p)*.9));assert.ok(Math.abs(Math.hypot(m.x-b.x,m.y-b.y)-Math.max(0,before[i].d-20))<1e-8);}});
 }
});
test('ballot cannot pull a boss when damage is blocked or reflected',()=>{
 for(const map of ['pocha','hangar']){
  const h=harness(),p=core.createCharacter('보스 판정','cat');Object.assign(p,{level:35,job:'protester',map,x:1000,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);h.api.startBossFight();const b=h.api.get().boss;Object.assign(b,{x:1200,y:650,phase:map==='pocha'?'counter':'safety',elapsed:1});
  const x=b.x,y=b.y,hp=b.hp;h.api.catAreaHit(1000,650,490,.9,20);assert.equal(b.hp,hp);assert.equal(b.x,x);assert.equal(b.y,y);
 }
});

function ballotFixture(map='alley'){
 const h=harness(),p=core.createCharacter('도발','cat');Object.assign(p,{level:25,job:'protester',map,x:1000,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);
 if(core.MAPS[map].boss)h.api.startBossFight();
 h.api.cast('r');return {h,p,box:h.api.get().catBallot};
}
test('ballot has 1500 HP, taunts within its damage ellipse, and monsters prioritize it over a closer player',()=>{
 const {h,p,box}=ballotFixture(),group=h.api.get().monsters;group.forEach(m=>m.dead=true);
 const m=group[0];Object.assign(m,{dead:false,x:p.x-80,y:p.y,hp:100000,maxHp:100000,speed:80,attack:10});
 assert.equal(box.hp,1500);assert.equal(box.maxHp,1500);assert.equal(h.api.enemyTarget(m),box);
 const x=m.x;h.api.update(.1);assert.ok(m.x>x,'chases past the closer player toward the box');
 m.x=box.x+box.skill.range+1;assert.equal(h.api.enemyTarget(m),p);
 m.x=box.x;m.y=box.y+box.skill.range/1.5+1;assert.equal(h.api.enemyTarget(m),p);
 m.x=box.x-12;m.y=box.y;p.x=m.x;advance(h,2.1);
 assert.equal(p.hp,core.maxHp(p),'contact attacks hit the prioritized box');assert.equal(box.hp,1480,'contact damage has a per-enemy 1.1 second interval');
 render(h);assert.ok(h.labels.some(l=>l.text==='투표함 · 1480 / 1500'));
});
test('multiple monsters can destroy the box, immediately end its damage, and return to chasing the player',()=>{
 const {h,p,box}=ballotFixture(),group=h.api.get().monsters;group.forEach(m=>m.dead=true);
 for(const m of group.slice(0,2))Object.assign(m,{dead:false,x:box.x+10,y:box.y,hp:100000,maxHp:100000,speed:0,attack:800});
 h.api.update(.1);assert.equal(box.hp,0);assert.equal(h.api.get().catBallot,null);
 const m=group[0];assert.equal(h.api.enemyTarget(m),p);const hp=m.hp;p.x=500;m.speed=100;const x=m.x;advance(h,.5);assert.ok(m.x<x);assert.equal(m.hp,hp,'destroyed ballot no longer ticks');
});
test('ballot expiry and leaving the encounter clear both taunt and the summon',()=>{
 const {h,p,box}=ballotFixture();h.api.get().monsters.forEach(m=>m.dead=true);advance(h,5.1);assert.equal(h.api.get().catBallot,null);assert.equal(h.api.enemyTarget({x:box.x,y:box.y}),p);
 p.mp=core.maxMp(p);h.api.get().cooldowns.r=0;h.api.cast('r');assert.ok(h.api.get().catBallot);h.api.selectCharacters();assert.equal(h.api.get().catBallot,null);
});
test('both bosses aim at the nearby box and switch back when it expires',()=>{
 for(const map of ['pocha','hangar']){
  const {h,p,box}=ballotFixture(map),b=h.api.get().boss;Object.assign(b,{x:box.x+250,y:box.y,phase:'approach',elapsed:0});p.x=box.x-400;
  assert.equal(h.api.bossPerception().x,box.x);assert.equal(h.api.bossPerception().hidden,false);
  h.api.update(.1);assert.equal(b.dir,-1);box.remaining=0;assert.equal(h.api.bossPerception().x,p.x);
 }
});
test('soldier melee and sustained beam damage the box with independent beam hit intervals',()=>{
 const {h,p,box}=ballotFixture('pocha'),b=h.api.get().boss;p.x=45;
 Object.assign(b,{x:box.x-100,y:box.y,dir:1,phase:'slash',elapsed:0,strikes:0});h.api.update(.01);assert.equal(box.hp,1500-bossCore.SOLDIER.slash.damage);
 Object.assign(b,{phase:'recover',elapsed:0});b.projectiles=[{x:box.x-200,originX:box.x-200,y:box.y,dir:1,life:1.4,hitCooldown:0,spent:false}];
 advance(h,.2);const hp=box.hp;assert.equal(hp,1500-bossCore.SOLDIER.slash.damage-bossCore.SOLDIER.palm.damage);advance(h,.1);assert.equal(box.hp,hp);advance(h,.2);assert.equal(box.hp,hp-bossCore.SOLDIER.palm.damage);
});
test('A-type projectiles hit the box and its targeted bombs follow the taunted target',()=>{
 const {h,p,box}=ballotFixture('hangar'),b=h.api.get().boss;p.x=45;
 Object.assign(b,{x:box.x+250,y:box.y,phase:'bomb',elapsed:0,strikes:0});h.api.update(.01);assert.equal(b.bombs[0].x,box.x);assert.equal(b.bombs[0].y,box.y);
 b.bombs=[];b.phase='recover';b.elapsed=0;b.projectiles=[{x:box.x-5,y:box.y,dir:1,life:1,spent:false}];h.api.update(.01);
 assert.equal(box.hp,1500-typeACore.TYPE_A.gun.damage-150);assert.ok(b.projectiles[0].spent);
});
test('A-type safety placement uses the actual player position even while taunted',()=>{
 const {h,p,box}=ballotFixture('hangar'),b=h.api.get().boss;Object.assign(b,{x:box.x,y:box.y,phase:'recover',elapsed:0});p.x=45;
 b.hp=b.maxHp*.4;h.api.update(.01);assert.equal(b.phase,'safety');assert.ok(Math.abs(b.safeZone.x-p.x)<=420);
});
function otterFixture(map='alley',job='idol',level=15){
 const h=harness(),p=core.createCharacter('물수달','otter');Object.assign(p,{map,job,level,x:1000,y:650});p.hp=core.maxHp(p);p.mp=core.maxMp(p);h.api.start(p);h.api.get().monsters.forEach(m=>m.dead=true);return {h,p};
}
function placeOtterEnemy(h,index,x,y,hp=10000){const m=h.api.get().monsters[index];Object.assign(m,{dead:false,x,y,home:x,hp,maxHp:hp,speed:0,attack:0});return m;}
test('otter creation, unlock levels and idol advancement are compatible with saved characters',()=>{
 const p=core.createCharacter('현구','otter');assert.equal(p.hp,100);assert.equal(p.mp,80);assert.equal(p.money,500);
 assert.equal(core.canUseSkill(p,'q').ok,false);p.level=3;assert.equal(core.canUseSkill(p,'q').ok,true);assert.equal(core.canUseSkill(p,'w').ok,false);
 p.level=6;assert.equal(core.canUseSkill(p,'w').ok,true);p.level=10;assert.equal(core.canUseSkill(p,'e').ok,false);
 assert.equal(core.advanceJob(p,'hacker').ok,false);assert.equal(core.advanceJob(p,'idol').ok,false);p.map='maple';assert.equal(core.advanceJob(p,'idol').ok,true);
 assert.equal(core.canUseSkill(p,'e').ok,true);assert.equal(core.canUseSkill(p,'r').ok,false);p.level=15;assert.equal(core.canUseSkill(p,'r').ok,true);
 p.concertTime=5;const loaded=core.normalizeCharacter(p);assert.equal(loaded.classId,'otter');assert.equal(loaded.job,'idol');assert.equal(loaded.concertTime,0);
 const chick=core.createCharacter('해커','chick');Object.assign(chick,{map:'maple',level:10});assert.equal(core.advanceJob(chick,'idol').ok,false);assert.equal(core.advanceJob(chick,'hacker').ok,true);
});
test('Hyupro offers idol advancement to otters and keeps hacker advancement for chicks',()=>{
 for(const [classId,job] of [['otter','idol'],['chick','hacker']]){
  const h=harness(),p=core.createCharacter('전직',classId);Object.assign(p,{level:10,map:'maple',x:960,y:648});h.api.start(p);h.api.interact();
  assert.equal(h.api.get().modal,'job');assert.ok(h.el('#modal-root').innerHTML.includes(core.JOBS[job].name+'로 전직하기'));h.el('#advance-job').onclick();assert.equal(p.job,job);assert.equal(h.api.get().modal,null);
 }
});
test('otter punches with no MP cost and water Q only damages the nearest valid front target',()=>{
 const {h,p}=otterFixture('alley',null),near=placeOtterEnemy(h,0,p.x+110,p.y),far=placeOtterEnemy(h,1,p.x+300,p.y),behind=placeOtterEnemy(h,2,p.x-60,p.y),offLane=placeOtterEnemy(h,3,p.x+50,p.y+85);
 const mp=p.mp;h.api.attack();assert.equal(p.mp,mp);assert.equal(near.hp,10000-core.basicAttackPower(p));assert.equal(far.hp,10000);assert.equal(behind.hp,10000);
 advance(h,.4);const hp=near.hp;h.api.cast('q');assert.equal(p.mp,mp-core.effectiveSkill(p,'q').mp);assert.equal(near.hp,hp-Math.round(core.attackPower(p)*2.4));assert.equal(far.hp,10000);assert.equal(behind.hp,10000);assert.equal(offLane.hp,10000);assert.equal(h.api.otterFrame(),9);
 h.api.cast('q');assert.equal(near.hp,hp-Math.round(core.attackPower(p)*2.4),'cooldown prevents a duplicate shot');
});
test('water Q and wave aim left after moving left instead of following the original artwork direction',()=>{
 const {h,p}=otterFixture();h.api.keys.add('ArrowLeft');h.api.update(.01);h.api.keys.clear();const m=placeOtterEnemy(h,0,p.x-150,p.y);
 h.api.cast('q');assert.ok(m.hp<10000);const jet=h.api.get().effects.find(e=>e.type==='otterJet');assert.ok(jet.toX<jet.x);h.api.cast('w');assert.equal(h.api.get().otterWave.dir,-1);
});
test('small wave crosses multiple enemies, hits each once and has a bounded travel distance',()=>{
 const {h,p}=otterFixture(),a=placeOtterEnemy(h,0,p.x+180,p.y),b=placeOtterEnemy(h,1,p.x+480,p.y),outside=placeOtterEnemy(h,2,p.x+780,p.y);const hp=p.hp,x=p.x;
 h.api.cast('w');const w=h.api.get().otterWave,damage=w.damage;advance(h,1.2);
 assert.equal(h.api.get().otterWave,null);assert.equal(a.hp,10000-damage);assert.equal(b.hp,10000-damage);assert.equal(outside.hp,10000);assert.equal(p.x,x,'first press sends a wave without moving the caster');assert.equal(p.hp,hp);
});
test('quick W repress rides without an extra cost and does not grant invulnerability or block contact damage',()=>{
 const {h,p}=otterFixture();advance(h,2.1);h.api.cast('w');advance(h,.2);const mp=p.mp,wait=h.api.get().cooldowns.w,inv=h.api.get().invincible;
 h.api.cast('w');const w=h.api.get().otterWave;assert.ok(w.riding);assert.equal(p.mp,mp);assert.equal(h.api.get().cooldowns.w,wait);assert.equal(h.api.get().invincible,inv);assert.equal(h.api.otterFrame(),11);
 const m=placeOtterEnemy(h,0,p.x,p.y);m.attack=20;const hp=p.hp,x=p.x;h.api.keys.add('ArrowLeft');h.api.update(.02);assert.ok(w.x>x,'wave progresses despite opposite keyboard input; a hit can still knock the player back');assert.equal(p.hp,hp-20);
 h.api.jump();assert.equal(h.api.get().jumpPrep,0);h.api.keys.clear();advance(h,1.1);assert.equal(h.api.get().otterWave,null);
});
test('late W repress does not ride, spend MP twice or reset its cooldown',()=>{
 const {h,p}=otterFixture();h.api.cast('w');advance(h,.7);const w=h.api.get().otterWave,mp=p.mp,wait=h.api.get().cooldowns.w;h.api.cast('w');assert.equal(w.riding,false);assert.equal(p.mp,mp);assert.equal(h.api.get().cooldowns.w,wait);
});
test('three orbiting bubbles pop independently and survive the shield breaking',()=>{
 const {h,p}=otterFixture();h.api.cast('e');const b=h.api.get().otterBubbles,shield=h.api.get().otterShield;assert.equal(b.orbs.length,3);assert.equal(shield.hp,Math.round(core.maxHp(p)*.3));
 b.elapsed=.01;const point=h.api.otterOrbPoint(b,0);b.elapsed=0;const m=placeOtterEnemy(h,0,point.x,point.y);h.api.update(.01);
 assert.equal(b.orbs[0].active,false);assert.equal(b.orbs.filter(o=>o.active).length,2);assert.equal(m.hp,10000-Math.round(core.attackPower(p)*1.8));
 assert.equal(h.api.playerDamage(shield.hp+50),50);assert.equal(h.api.get().otterShield,null);assert.equal(b.orbs.filter(o=>o.active).length,2);
 m.dead=true;advance(h,5.1);assert.equal(h.api.get().otterBubbles,null);
});
test('all three bubbles can damage separate targets in one frame and shield remains until five seconds',()=>{
 const {h,p}=otterFixture();h.api.cast('e');const b=h.api.get().otterBubbles;const hp=core.maxHp(p),shield=h.api.get().otterShield;
 b.elapsed=.01;const points=[0,1,2].map(i=>h.api.otterOrbPoint(b,i));b.elapsed=0;points.forEach((pt,i)=>placeOtterEnemy(h,i,pt.x,pt.y));h.api.update(.01);
 assert.equal(b.orbs.filter(o=>o.active).length,0);for(const m of h.api.get().monsters.slice(0,3))assert.equal(m.hp,10000-Math.round(core.attackPower(p)*1.8));
 h.api.get().monsters.forEach(m=>m.dead=true);assert.equal(h.api.get().otterShield,shield);assert.equal(p.hp,hp);advance(h,4.8);assert.ok(h.api.get().otterShield);advance(h,.3);assert.equal(h.api.get().otterShield,null);assert.equal(h.api.get().otterBubbles,null);
});
test('otter shield is added to the HP display and absorbs reduced damage before health',()=>{
 const {h,p}=otterFixture();h.api.cast('e');h.api.refreshHealthHUD();const shield=h.api.get().otterShield.hp;assert.equal(h.el('#hp-text').textContent,`${p.hp} + ${shield} / ${core.maxHp(p)}`);assert.equal(h.api.playerDamage(50),0);assert.equal(h.api.get().otterShield.hp,shield-50);
});
test('concert damages only visible enemies for ten ticks, heals 10 percent HP per second and removes its 20 percent buffs at five seconds',()=>{
 const {h,p}=otterFixture();p.hp=10;const base=core.attackPower(p),speed=core.movementMultiplier(p);h.api.cast('r');const c=h.api.get().otterConcert;
 const a=placeOtterEnemy(h,0,c.bounds.left+250,p.y),b=placeOtterEnemy(h,1,c.bounds.right-100,p.y),outside=placeOtterEnemy(h,2,c.bounds.right+200,p.y);
 assert.equal(core.attackPower(p),base*1.2);assert.equal(core.movementMultiplier(p),speed*1.2);h.api.update(.49);assert.equal(a.hp,10000);h.api.update(.02);assert.equal(a.hp,10000-Math.round(base*1.2));
 advance(h,4.51);assert.equal(h.api.get().otterConcert,null);assert.equal(a.hp,10000-10*Math.round(base*1.2));assert.equal(b.hp,a.hp);assert.equal(outside.hp,10000);assert.ok(Math.abs(p.hp-(10+core.maxHp(p)*.5))<1e-8);assert.equal(core.attackPower(p),base);assert.equal(core.movementMultiplier(p),speed);
});
test('concert allows movement while retaining dance, attack locks and 50 percent damage reduction',()=>{
 const {h,p}=otterFixture();advance(h,2.1);h.api.cast('r');const x=p.x,y=p.y,mp=p.mp;assert.equal(h.api.playerDamage(100),50);assert.ok(h.api.get().invincible<=0);
 h.api.keys.add('ArrowRight');h.api.keys.add('ArrowUp');h.api.keys.add('KeyA');h.api.jump();for(const key of ['q','w','e','r'])h.api.cast(key);assert.equal(p.mp,mp);assert.equal(h.api.get().jumpPrep,0);
 advance(h,.7);assert.ok(p.x>x);assert.ok(p.y<y);assert.ok(h.api.get().walking);assert.equal(h.api.get().otterWave,null);assert.equal(h.api.get().otterShield,null);assert.ok([13,14].includes(h.api.otterFrame()));
 h.api.keys.clear();advance(h,4.4);h.api.keys.add('ArrowRight');h.api.update(.1);assert.ok(p.x>x);assert.equal(h.api.playerDamage(100),100);
});
test('concert support is limited to the stage, and leaving it removes healing and ally buffs',()=>{
 const {h,p}=otterFixture();h.api.cast('r');const c=h.api.get().otterConcert;p.x=c.bounds.right+100;p.hp=10;h.api.update(.1);assert.equal(p.hp,10);assert.equal(p.concertTime,0);assert.equal(h.api.playerDamage(100),50,'caster reduction persists while dancing');
 p.x=c.x;h.api.update(.1);assert.ok(p.hp>10);assert.ok(p.concertTime>0);
});
test('concert ticks and orbit durations pause with menus, and leaving clears all temporary state',()=>{
 const {h,p}=otterFixture();h.api.cast('e');h.api.cast('r');const c=h.api.get().otterConcert,b=h.api.get().otterBubbles;h.api.inventory();advance(h,1);assert.equal(c.remaining,5);assert.equal(b.remaining,5);h.api.closeModal();h.api.update(.1);assert.ok(c.remaining<5);
 h.api.save();const loaded=core.normalizeCharacter(JSON.parse(h.storage.get(core.SAVE_KEY)).characters[0]);assert.equal(loaded.concertTime,0);
 h.api.selectCharacters();for(const key of ['otterConcert','otterShield','otterBubbles','otterWave'])assert.equal(h.api.get()[key],null);assert.equal(p.concertTime,0);
});
test('concert can finish either boss safely without accessing a cleared concert',()=>{
 for(const map of ['pocha','hangar']){
  const {h,p}=otterFixture(map);h.api.startBossFight();const b=h.api.get().boss;Object.assign(b,{hp:1,x:p.x+200,y:p.y,phase:'recover',elapsed:0,safetyUsed:true,enraged:true});h.api.cast('r');assert.doesNotThrow(()=>h.api.update(.5));assert.equal(b.dead,true);assert.equal(h.api.get().modal,'boss-victory');assert.equal(h.api.get().otterConcert,null);assert.equal(p.concertTime,0);
 }
});
test('otter walk, jump, punch, water, wave, shield and dance use directionally consistent dedicated poses',()=>{
 for(const job of [null,'idol']){
  const {h,p}=otterFixture('town',job);const asset=job?'assets/otter-idol-skirt-motion.png':'assets/otter-motion.png';render(h);assert.ok(h.draws.some(d=>d.asset===asset));assert.equal(h.api.otterFrame(),0);
  h.api.keys.add('ArrowLeft');const seen=new Set();for(let i=0;i<48;i++){h.api.update(1/60);seen.add(h.api.otterFrame());}assert.deepEqual([...seen].sort(),[1,2,3]);render(h);assert.ok(h.draws.find(d=>d.asset===asset).matrix[0]<0);
  h.api.keys.clear();h.api.jump();assert.equal(h.api.otterFrame(),4);advance(h,.18);assert.equal(h.api.otterFrame(),5);advance(h,1);h.api.attack();assert.equal(h.api.otterFrame(),7);advance(h,.15);assert.equal(h.api.otterFrame(),8);advance(h,.4);
  h.api.cast('q');assert.equal(h.api.otterFrame(),9);h.api.cast('w');assert.equal(h.api.otterFrame(),10);h.api.cast('w');assert.equal(h.api.otterFrame(),11);advance(h,1.1);
  if(job){h.api.cast('e');assert.equal(h.api.otterFrame(),12);h.api.cast('r');const dance=new Set();for(let i=0;i<50;i++){h.api.update(1/60);dance.add(h.api.otterFrame());}assert.deepEqual([...dance].sort(),[13,14]);render(h);assert.ok(h.labels.some(l=>l.text==='콘서트 ♡'));}
 }
});
test('otter selection portraits use the idle tile and both atlases have equal geometry',()=>{
 const h=harness();for(const job of [null,'idol']){const p=core.createCharacter('선택','otter');Object.assign(p,{job,level:15});h.api.characters([p],p.id);const html=h.el('#screens').innerHTML;assert.ok(html.includes('수달 '+(job?'아이돌':'모험가')+' 기본 자세'));assert.ok(html.includes(`assets/${job?'otter-idol-skirt-motion':'otter-motion'}.png`));}
 const a=fs.readFileSync(new URL('../dist/assets/otter-motion.png',import.meta.url)),b=fs.readFileSync(new URL('../dist/assets/otter-idol-skirt-motion.png',import.meta.url));assert.deepEqual(a.subarray(16,24),b.subarray(16,24));assert.equal(a[25],6,'RGBA retains transparency');assert.equal(b[25],6);
});
test('otter Q/W exclude the next row artwork while concert keeps the full head at the same scale',()=>{
 for(const job of [null,'idol']){
  const {h}=otterFixture('town',job),asset=job?'assets/otter-idol-skirt-motion.png':'assets/otter-motion.png';
  h.api.cast('q');render(h);const q=h.draws.find(d=>d.asset===asset);assert.ok(q.source[1]<=650);assert.ok(q.source[1]+q.source[3]<939,'Q cannot include row 4 head pixels');
  const scale=q.height/q.source[3];advance(h,.5);h.api.cast('w');render(h);const w=h.draws.find(d=>d.asset===asset);assert.ok(w.source[1]+w.source[3]<939);
  if(job){advance(h,.5);h.api.cast('r');render(h);const r=h.draws.find(d=>d.asset===asset);assert.ok(r.source[1]<=939,'dance includes top of head');assert.ok(Math.abs(r.height/r.source[3]-scale)<.01,'poses keep the same artwork scale');}
 }
});

test('otter punch includes the complete overflowing fist effect in both outfits and directions',()=>{
 for(const job of [null,'idol'])for(const direction of ['ArrowRight','ArrowLeft']){
  const {h}=otterFixture('town',job),asset=job?'assets/otter-idol-skirt-motion.png':'assets/otter-motion.png';
  h.api.keys.add(direction);h.api.update(.01);h.api.keys.clear();h.api.attack();advance(h,.15);assert.equal(h.api.otterFrame(),8);render(h);
  const [body,overflow]=h.draws.filter(d=>d.asset===asset);
  assert.ok(overflow,'effect beyond the tile boundary is drawn');assert.equal(overflow.source[0],body.source[0]+body.source[2]);assert.equal(overflow.source[0]+overflow.source[2],340);
  assert.equal(overflow.source[1]+overflow.source[3],819,'exclude the neighboring Q tail');
  assert.equal(Math.sign(overflow.matrix[0]),direction==='ArrowLeft'?-1:1);assert.equal(overflow.matrix[0],body.matrix[0]);
  assert.ok(Math.abs(overflow.height/overflow.source[3]-body.height/body.source[3])<1e-9,'effect keeps the artwork scale');
 }
});

test('otter wave hits the expanded vertical boundary in both directions and stops outside it',()=>{
 for(const job of [null,'idol'])for(const dir of [1,-1])for(const dy of [96,-96,97,-97]){
  const {h,p}=otterFixture('alley',job);p.y=dy>0?620:680;
  h.api.keys.add(dir===1?'ArrowRight':'ArrowLeft');h.api.update(.01);h.api.keys.clear();
  const target=placeOtterEnemy(h,0,p.x+dir*200,p.y+dy);
  h.api.cast('w');const damage=h.api.get().otterWave.damage;advance(h,.4);
  assert.equal(target.hp,10000-(Math.abs(dy)<=96?damage:0));
 }
});

test('concert keeps running while walking in either direction with the normal movement speed buff',()=>{
 for(const dir of [1,-1]){
  const {h,p}=otterFixture('town');h.api.cast('r');const c=h.api.get().otterConcert,x=p.x,mp=p.mp;
  h.api.keys.add(dir===1?'ArrowRight':'ArrowLeft');h.api.update(.2);
  assert.ok(Math.abs(p.x-x-dir*285*1.2*.2)<1e-8);assert.equal(h.api.get().otterConcert,c);assert.equal(c.remaining,4.8);assert.ok(p.mp>=mp);
  assert.ok([13,14].includes(h.api.otterFrame()));render(h);const pose=h.draws.find(d=>d.asset==='assets/otter-idol-skirt-motion.png');assert.equal(Math.sign(pose.matrix[0]),dir);
  h.api.keys.clear();const stopped=p.x;h.api.update(.2);assert.equal(p.x,stopped);assert.equal(h.api.get().otterConcert,c);
 }
});
