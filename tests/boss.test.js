import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLDIER,createSoldier,beginSoldier,stepSoldier,soldierHit,defeatSoldier,targetableBoss,counterDamage} from '../dist/boss.js';
import {createCharacter,normalizeCharacter,equipUniform,movementMultiplier,assignQuickSlot,MAPS,findMapRoute,monsterCount,mapTabFor} from '../dist/core.js';
const p={x:900,y:650,facing:1,z:0};
function tick(b,seconds,player=p){const events=[];for(let n=0;n<Math.round(seconds*100);n++)events.push(...stepSoldier(b,.01,player));return events;}
test('waiting soldier cannot be targeted; defeat rewards once and a rematch starts fresh',()=>{
 const b=createSoldier();assert.equal(targetableBoss(b),false);assert.deepEqual(tick(b,10),[]);assert.equal(beginSoldier(b),true);assert.equal(beginSoldier(b),false);
 assert.equal(targetableBoss(b),true);b.hp=0;b.projectiles=[{x:1}];assert.equal(defeatSoldier(b),true);assert.equal(defeatSoldier(b),false);assert.equal(b.projectiles.length,0);assert.equal(targetableBoss(b),false);assert.deepEqual(tick(b,10),[]);
 assert.equal(beginSoldier(b),true);assert.equal(b.hp,SOLDIER.hp);assert.equal(b.rewardGranted,false);assert.equal(b.order,0);
});
test('sword and ambush telegraphs are harmless and produce exactly two / five strikes',()=>{
 const b=createSoldier();beginSoldier(b);b.phase='slash-windup';assert.equal(tick(b,.41).length,0);const basic=tick(b,.9).filter(e=>e.type==='melee');assert.equal(basic.length,2);assert.deepEqual(basic.map(e=>e.damage),[84,84]);
 b.phase='landing';b.elapsed=0;b.strikes=0;assert.equal(tick(b,.41).length,0);const combo=tick(b,1.1).filter(e=>e.type==='melee');assert.equal(combo.length,5);assert.ok(combo.every(e=>e.damage===48));
});
test('palm charge launches one sustained forward beam that ends on expiry',()=>{
 for(const dir of [-1,1]){
  const b=createSoldier();beginSoldier(b);b.dir=dir;b.phase='palm-charge';assert.equal(tick(b,.79).length,0);assert.equal(b.projectiles.length,0);assert.equal(tick(b,.03).filter(e=>e.type==='cast').length,1);assert.equal(b.projectiles.length,1);
  const shot=b.projectiles[0],event={type:'wave',x:500,toX:500+dir*80,y:650,halfLane:34,height:150,shot};const target={x:500+dir*40,y:650,z:108};assert.equal(soldierHit(event,target),true);shot.spent=true;assert.equal(soldierHit(event,target),false);tick(b,.01);assert.equal(b.projectiles.length,0);
 }
});
test('ambush locks the landing snapshot, remains untargetable only in flight and faces players at both walls',()=>{
 for(const target of [p,{x:45,y:580,facing:1},{x:1555,y:720,facing:-1}]){
  const b=createSoldier();beginSoldier(b);b.phase='leap-charge';tick(b,.61,target);const locked={...b.target};assert.equal(b.phase,'leap');assert.equal(targetableBoss(b),false);assert.ok(Math.abs(locked.x-target.x)>=85);
  tick(b,.6,{x:800,y:650,facing:-target.facing});assert.deepEqual(b.target,locked);assert.equal(b.x,locked.x);assert.equal(b.y,locked.y);assert.equal(b.z,0);assert.equal(targetableBoss(b),true);
  assert.equal(soldierHit({type:'melee',x:b.x,y:b.y,dir:b.dir,range:240,halfLane:60,height:135},{...target,z:0}),true);
 }
});
test('sword collision respects facing, lane and jump height while palm and flurry reach aerial players',()=>{
 const sword={type:'melee',x:500,y:650,dir:1,range:155,halfLane:43,height:52};
 assert.equal(soldierHit(sword,{x:600,y:650,z:0}),true);assert.equal(soldierHit(sword,{x:477,y:650,z:0}),false);assert.equal(soldierHit(sword,{x:656,y:650,z:0}),false);assert.equal(soldierHit(sword,{x:600,y:694,z:0}),false);assert.equal(soldierHit(sword,{x:600,y:650,z:52}),false);
 assert.equal(soldierHit({...sword,height:135},{x:600,y:650,z:108}),true);
});
test('level 25 boss reaches the enlarged melee boundaries in both directions',()=>{
 const b=createSoldier();assert.equal(b.level,25);assert.equal(b.hp,30000);beginSoldier(b);
 for(const dir of [-1,1])for(const [phase,range,halfLane,height] of [['slash',205,52,52],['flurry',240,60,135]]){
  Object.assign(b,{x:800,y:650,dir,phase,elapsed:0,strikes:0});
  const attack=stepSoldier(b,.01,p).find(e=>e.type==='melee');assert.ok(attack);
  const target={x:800+dir*range,y:650+halfLane,z:height-1};
  assert.equal(soldierHit(attack,target),true,`${phase} enlarged edge ${dir}`);
  assert.equal(soldierHit(attack,{...target,x:target.x+dir}),false);
  assert.equal(soldierHit(attack,{...target,y:target.y+1}),false);
  assert.equal(soldierHit(attack,{...target,z:height}),false);
  assert.equal(soldierHit(attack,{x:800-dir*23,y:650,z:0}),false);
 }
});
test('white beam stays anchored, widens its lane, and expires without lingering hits',()=>{
 for(const dir of [-1,1]){
  const b=createSoldier();beginSoldier(b);Object.assign(b,{phase:'palm-release',elapsed:0});
  const shot={x:800,originX:800,length:0,y:650,dir,life:1.4};b.projectiles=[shot];
  const first=stepSoldier(b,.1,p).find(e=>e.type==='wave');assert.equal(first.x,800);assert.equal(shot.length,168);
  assert.equal(soldierHit(first,{x:800+dir*100,y:714,z:149}),true);
  assert.equal(soldierHit(first,{x:800+dir*100,y:715,z:0}),false);
  assert.equal(soldierHit(first,{x:800+dir*100,y:650,z:150}),false);
  assert.equal(soldierHit(first,{x:800-dir*29,y:650,z:0}),false);
  const later=stepSoldier(b,.5,p).find(e=>e.type==='wave');assert.equal(later.x,800);assert.ok(shot.length>320);
  assert.equal(soldierHit(later,{x:800+dir*50,y:650,z:0}),true,'beam remains near the hand');
  assert.equal(stepSoldier(b,.81,p).some(e=>e.type==='wave'),false);assert.equal(b.projectiles.length,0);
 }
});
test('landing hits once around both sides, respects ellipse and can be jumped',()=>{
 const b=createSoldier();beginSoldier(b);Object.assign(b,{phase:'leap',from:{x:500,y:650},target:{x:800,y:650,dir:1}});
 const land=stepSoldier(b,.46,p).find(e=>e.type==='land');assert.equal(land.damage,96);
 for(const dir of [-1,1]){assert.equal(soldierHit(land,{x:800+dir*180,y:650,z:0}),true);assert.equal(soldierHit(land,{x:800+dir*181,y:650,z:0}),false);}
 assert.equal(soldierHit(land,{x:800,y:650,z:65}),false);assert.equal(soldierHit(land,{x:960,y:730,z:0}),false);
 assert.equal(stepSoldier(b,.01,p).some(e=>e.type==='land'),false);
});
test('counter has a harmless sword-spin warning, three-second reflection stance and an attack opening',()=>{
 const b=createSoldier();beginSoldier(b);b.phase='counter-windup';
 assert.equal(counterDamage(b,200),0);assert.deepEqual(tick(b,.69),[]);assert.equal(b.phase,'counter-windup');
 stepSoldier(b,.011,p);assert.equal(b.phase,'counter');assert.equal(b.elapsed,0);assert.equal(targetableBoss(b),true);
 assert.equal(counterDamage(b,200),150);assert.deepEqual(stepSoldier(b,2.999,p),[]);assert.equal(b.phase,'counter');
 assert.deepEqual(stepSoldier(b,.002,p),[]);assert.equal(b.phase,'recover');assert.equal(counterDamage(b,200),0);
 stepSoldier(b,.721,p);assert.equal(b.phase,'approach');
});
test('counter reflection is bounded, requires a real attack and resets on defeat or a rematch',()=>{
 const b=createSoldier();beginSoldier(b);b.phase='counter';
 for(const [damage,reflected] of [[0,0],[-50,0],[1,60],[80,60],[200,150],[239,179],[240,180],[10000,180]])assert.equal(counterDamage(b,damage),reflected);
 b.active=false;assert.equal(counterDamage(b,200),0);b.active=true;b.hp=0;defeatSoldier(b);assert.equal(counterDamage(b,200),0);
 beginSoldier(b);assert.equal(counterDamage(b,200),0);assert.equal(b.phase,'approach');
});
test('each full pattern rotation uses counter once and each offensive pattern three times',()=>{
 const b=createSoldier();beginSoldier(b);const patterns=[];
 for(let i=0;i<20;i++){
  Object.assign(b,{x:800,y:650,phase:'approach',elapsed:.29});stepSoldier(b,.01,p);patterns.push(b.phase);
 }
 for(const cycle of [patterns.slice(0,10),patterns.slice(10)]){
  assert.equal(cycle.filter(phase=>phase==='counter-windup').length,1);
  for(const phase of ['slash-windup','palm-charge','leap-charge'])assert.equal(cycle.filter(item=>item===phase).length,3);
 }
 assert.deepEqual(patterns.slice(0,10),patterns.slice(10),'the rarer counter cadence repeats without drifting');
});
test('boss footsteps follow actual horizontal, vertical and diagonal travel at different frame rates',()=>{
 const move=(fps,target,seconds)=>{
  const b=createSoldier();beginSoldier(b);Object.assign(b,{x:1000,y:650});
  for(let i=0;i<Math.round(fps*seconds);i++)stepSoldier(b,1/fps,target);
  assert.equal(b.phase,'approach');assert.equal(b.walking,true);
  assert.ok(Math.abs(b.walkPhase-Math.hypot(b.x-1000,b.y-650)/160)<1e-10);
  return b;
 };
 for(const target of [{x:300,y:650},{x:1300,y:650},{x:1000,y:580},{x:300,y:580}]){
  const a=move(30,target,.2),b=move(120,target,.2);
  for(const key of ['x','y','walkPhase'])assert.ok(Math.abs(a[key]-b[key])<1e-10,`${key} varies with frame rate`);
 }
});
test('blocked movement is idle, wall slides walk, and clamped distance cannot over-advance the gait',()=>{
 const b=createSoldier();beginSoldier(b);Object.assign(b,{x:160,y:580,walkPhase:.5,walking:true});
 stepSoldier(b,.1,{x:-100,y:580});assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
 stepSoldier(b,.1,{x:-100,y:650});assert.equal(b.x,160);assert.equal(b.walking,true);assert.ok(Math.abs(b.walkPhase-(b.y-580)/160)<1e-10);
 Object.assign(b,{x:170,y:650,elapsed:0,walkPhase:0});stepSoldier(b,.1,{x:-100,y:650});
 assert.equal(b.x,160);assert.equal(b.walking,true);assert.equal(b.walkPhase,10/160);
 Object.assign(b,{x:1000,y:700,elapsed:0,walkPhase:0});stepSoldier(b,.2,{x:1000,y:800});
 assert.equal(b.y,720);assert.equal(b.walkPhase,20/160);
 stepSoldier(b,0,{x:100,y:600});assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
});
test('stopping, attack windups, airborne moves, defeat and rematches reset boss footsteps',()=>{
 const b=createSoldier();assert.equal(b.walking,false);assert.equal(b.walkPhase,0);beginSoldier(b);
 Object.assign(b,{x:1000,y:650,walking:true,walkPhase:.4});stepSoldier(b,.01,{x:1100,y:650});
 assert.equal(b.phase,'approach');assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
 for(const phase of ['slash-windup','slash','palm-charge','palm-release','leap-charge','leap','landing','flurry','counter-windup','counter','recover']){
  Object.assign(b,{phase,elapsed:0,walking:true,walkPhase:.6,from:{x:1000,y:650},target:{x:900,y:650,dir:1}});
  stepSoldier(b,.01,p);assert.equal(b.walking,false,phase);assert.equal(b.walkPhase,0,phase);
 }
 Object.assign(b,{phase:'approach',elapsed:.3,x:1000,y:650,walking:true,walkPhase:.6});stepSoldier(b,.01,{x:1100,y:650});
 assert.equal(b.phase,'slash-windup');assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
 Object.assign(b,{walking:true,walkPhase:.5,hp:0});defeatSoldier(b);assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
 Object.assign(b,{walking:true,walkPhase:.5});beginSoldier(b);assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
 Object.assign(b,{active:false,phase:'waiting',walking:true,walkPhase:.5});stepSoldier(b,.1,p);assert.equal(b.walking,false);assert.equal(b.walkPhase,0);
});
test('uniform is a persistent, non-stacking equipment bonus and never a consumable shortcut',()=>{
 const p=createCharacter('군복');assert.equal(equipUniform(p).ok,false);assert.equal(movementMultiplier(p),1);p.uniform=1;
 for(let i=0;i<4;i++){assert.equal(equipUniform(p).ok,true);assert.equal(movementMultiplier(p),i%2===0?1.2:1);}
 equipUniform(p);const restored=normalizeCharacter(JSON.parse(JSON.stringify(p)));assert.equal(restored.uniform,1);assert.equal(restored.uniformEquipped,true);assert.equal(movementMultiplier(restored),1.2);assert.equal(assignQuickSlot(p,0,'uniform').ok,false);
 assert.equal(normalizeCharacter({...p,uniform:0,uniformEquipped:true}).uniformEquipped,false);assert.equal(normalizeCharacter({...p,uniform:99}).uniform,1);
 const old={...p};delete old.uniform;delete old.uniformEquipped;delete old.bossWins;const migrated=normalizeCharacter(old);assert.equal(migrated.uniform,0);assert.equal(migrated.bossWins,0);assert.equal(movementMultiplier(migrated),1);
});
test('the boss room is reached through safe Gangnam town after the foundry, with reciprocal exits',()=>{
 const destinations=id=>MAPS[id].portals.map(p=>p.to).sort();
 assert.deepEqual(destinations('pocha'),['gangnam']);assert.deepEqual(destinations('gangnam'),['foundry','pocha']);
 assert.deepEqual(destinations('canal'),['foundry','relay']);assert.deepEqual(destinations('foundry'),['canal','gangnam','nexus']);
 assert.deepEqual(findMapRoute('canal','pocha'),['canal','foundry','gangnam','pocha']);assert.deepEqual(findMapRoute('pocha','canal'),['pocha','gangnam','foundry','canal']);
 assert.equal(MAPS.gangnam.name,'강남역');assert.equal(MAPS.gangnam.danger,0);assert.equal(monsterCount('gangnam'),0);assert.equal(mapTabFor('gangnam'),'town');
 assert.equal(MAPS.pocha.name,'한사발포차 역삼점');assert.equal(monsterCount('pocha'),0);assert.equal(mapTabFor('pocha'),'advanced');
});
