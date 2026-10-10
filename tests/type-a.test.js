import test from 'node:test';
import assert from 'node:assert/strict';
import {TYPE_A,createTypeA,beginTypeA,stepTypeA,typeATargetable,damageTypeA,typeAHit,defeatTypeA,inTypeASafeZone,typeACue} from '../dist/type-a.js';
import {MAPS,findMapRoute,createCharacter,normalizeCharacter,useItem,makeMonster,monsterCount} from '../dist/core.js';
const p={x:600,y:650,z:0,facing:1};
const active=()=>{const b=createTypeA();beginTypeA(b);return b;};
function tick(b,seconds,player=p){const out=[];for(let n=0;n<Math.round(seconds*100);n++)out.push(...stepTypeA(b,.01,player));return out;}
test('new hunting path progresses through level 40 and ends at the level 40 boss room',()=>{
 assert.deepEqual(findMapRoute('nexus','hangar'),['nexus','accelerator','arsenal','reactor','hangar']);
 for(const [id,min,max] of [['accelerator',31,33],['arsenal',34,36],['reactor',37,40]]){assert.equal(makeMonster(id,0).level,min);assert.equal(makeMonster(id,monsterCount(id)-1).level,max);}
 assert.equal(MAPS.hangar.bossLevel,40);assert.equal(monsterCount('hangar'),0);
});
test('blade windup is harmless; forward arc and jump height define the hit',()=>{
 const b=active();b.phase='blade-charge';assert.equal(tick(b,.59).length,0);const e=tick(b,.03).find(e=>e.type==='blade');assert.ok(e);
 assert.equal(typeAHit(e,{x:b.x+b.dir*200,y:b.y,z:0}),true);assert.equal(typeAHit(e,{x:b.x-b.dir*150,y:b.y,z:0}),false);assert.equal(typeAHit(e,{x:b.x+b.dir*200,y:b.y,z:90}),false);
});
test('machinegun emits eight forward bullets and swept collision does not tunnel',()=>{
 const b=active();b.phase='gun';tick(b,1.15);assert.equal(b.projectiles.length,8);assert.ok(b.projectiles.every(s=>s.dir===-1));
 const e={type:'bullet',x:700,toX:500,y:650,height:100,halfLane:25,shot:{spent:false}};
 assert.equal(typeAHit(e,p),true);assert.equal(typeAHit(e,{...p,y:710}),false);e.shot.spent=true;assert.equal(typeAHit(e,p),false);
});
test('bombardment launches four snapshots at half-second intervals and detonates after a visible delay',()=>{
 const b=active();b.phase='bomb';const launches=[];let last=0;
 for(let i=0;i<180;i++){
  const target={...p,x:200+i*3};const events=stepTypeA(b,.01,target);
  if(events.some(e=>e.type==='bomb-launch')){launches.push(i/100);assert.equal(b.bombs.at(-1).x,target.x);}
  if(i===20)last=b.bombs[0].x;
  if(i===40)assert.equal(b.bombs[0].x,last,'a marked position stops tracking');
 }
 assert.equal(launches.length,4);for(let i=1;i<4;i++)assert.ok(Math.abs(launches[i]-launches[i-1]-.5)<.02);
 assert.equal(b.bombs.length,2);assert.equal(tick(b,.7).filter(e=>e.type==='bomb').length,2);
});
test('red dash commits to a telegraphed position, moves and hits along its swept path',()=>{
 const b=active();b.phase='dash-charge';b.target={...p};const x=b.x;assert.equal(tick(b,.84).length,0);tick(b,.03);const events=tick(b,.3);assert.ok(b.x<x);assert.ok(events.some(e=>e.type==='dash'));
 const e={type:'dash',x:900,y:650,toX:400,toY:650,radius:85,height:180};assert.equal(typeAHit(e,p),true);assert.equal(typeAHit(e,{...p,y:750}),false);
});
test('40 percent transition cannot be skipped; shield lasts five seconds and safe area is reachable at either edge',()=>{
 for(const x of [45,600,1755]){
  const b=active(),player={...p,x};damageTypeA(b,999999,player);assert.equal(b.hp,b.maxHp*.4);assert.equal(b.phase,'safety');assert.equal(typeATargetable(b),false);assert.equal(damageTypeA(b,1000,player),0);
  const s={...b.safeZone};assert.ok(Math.abs(s.x-x)<=420);assert.ok(s.x-s.rx>=45&&s.x+s.rx<=1755);assert.ok(s.y-s.ry>=580&&s.y+s.ry<=720);
  assert.equal(tick(b,4.99,player).length,0);const e=tick(b,.02,player).find(e=>e.type==='execution');assert.ok(e);
  assert.equal(typeAHit(e,{...player,x:s.x,y:s.y}),false);assert.equal(typeAHit(e,{...player,x:s.x+s.rx+1,z:500}),true,'jumping alone cannot avoid execution');
  assert.equal(inTypeASafeZone({x:s.x+s.rx,y:s.y},s),true);assert.equal(typeATargetable(b),true);
  damageTypeA(b,1,player);assert.notEqual(b.phase,'safety');
 }
});
test('20 percent enrages once, moves faster and recovers faster with four-second moving spin and circular pull',()=>{
 const b=active();b.safetyUsed=true;b.hp=b.maxHp*.21;damageTypeA(b,b.maxHp*.02,p);assert.equal(b.enraged,true);assert.equal(b.phase,'enrage');tick(b,1.02);assert.equal(b.phase,'approach');
 const slow=active(),fast=active();fast.enraged=true;stepTypeA(slow,.1,p);stepTypeA(fast,.1,p);assert.ok(1150-fast.x>1150-slow.x);
 slow.phase=fast.phase='recover';slow.elapsed=fast.elapsed=0;tick(slow,.4);tick(fast,.4);assert.equal(slow.phase,'recover');assert.equal(fast.phase,'approach');
 b.phase='spin';b.elapsed=0;b.strikes=0;const x=b.x;const events=tick(b,3.99);assert.equal(b.phase,'spin');assert.equal(events.filter(e=>e.type==='spin').length,10);assert.ok(b.x<x);tick(b,.02);assert.equal(b.phase,'recover');
 const e={type:'pull',x:1000,y:650,radius:570,height:Infinity};assert.equal(typeAHit(e,{...p,x:450}),true);assert.equal(typeAHit(e,{...p,x:420}),false);
});
test('defeat/restart clears attacks and phase flags; boss room potion cooldown and new location survive save reload',()=>{
 const b=active();b.hp=0;assert.equal(defeatTypeA(b),true);assert.equal(defeatTypeA(b),false);beginTypeA(b);assert.equal(b.hp,TYPE_A.hp);assert.equal(b.safetyUsed,false);assert.equal(b.enraged,false);
 const c=createCharacter('저장');Object.assign(c,{level:38,map:'hangar',mp:0,mpPotions:3,typeAWins:2});assert.equal(useItem(c,'mpPotions').ok,true);assert.equal(c.mpPotionCooldown,10);assert.equal(useItem(c,'mpPotions').ok,false);const restored=normalizeCharacter(c);assert.equal(restored.map,'hangar');assert.equal(restored.typeAWins,2);assert.equal(restored.mpPotionCooldown,10);
});

test('all six damaging attacks emit the increased damage including repeated hits',()=>{
 for(const [phase,seconds,eventType,damage] of [['blade-charge',.61,'blade',155],['gun',1.15,'bullet',62],['dash-charge',1.1,'dash',195],['bomb',2.45,'bomb',160],['spin',3.99,'spin',112],['pull-charge',.71,'pull',52]]){
  const b=active();b.phase=phase;b.target={...p};
  const hits=tick(b,seconds).filter(e=>e.type===eventType);
  assert.ok(hits.length>0,eventType);assert.ok(hits.every(e=>e.damage===damage),eventType);
 }
});

test('pattern selection uses each random draw, permits repeats and unlocks enrage-only attacks',()=>{
 const b=active(),near={...p,x:b.x-200};
 const choose=(roll,player=near)=>{b.phase='approach';b.elapsed=.96;stepTypeA(b,0,player,()=>roll);return b.phase;};
 assert.deepEqual([.9,.3,.3,.01,.6].map(r=>choose(r)),['bomb-charge','gun-charge','gun-charge','blade-charge','dash-charge']);
 assert.deepEqual([.01,.4,.9].map(r=>choose(r,p)),['gun-charge','dash-charge','bomb-charge']);
 b.enraged=true;
 assert.deepEqual([.75,.99].map(r=>choose(r)),['pull-charge','spin-charge']);
});

test('safety countdown and execution use the same five-second deadline',()=>{
 const b=active();damageTypeA(b,999999,p);
 assert.match(typeACue(b),/5\.0초/);
 assert.equal(stepTypeA(b,4.9,p).length,0);assert.match(typeACue(b),/0\.1초/);
 assert.equal(stepTypeA(b,.1,p).filter(e=>e.type==='execution').length,1);
 assert.equal(stepTypeA(b,.1,p).filter(e=>e.type==='execution').length,0);
});
