import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../dist/type-b.js';
import * as C from '../dist/core.js';
const p={x:1300,y:555,z:0},random=()=>.1;
function live(){const b=B.createTypeB();Object.assign(b,{active:true,phase:'approach'});return b;}
function run(b,seconds,player=p,r=random){const out=[];for(let t=0;t<seconds;t+=.01)out.push(...B.stepTypeB(b,.01,player,r));return out;}
function until(b,predicate,max=30,r=random){const out=[];for(let t=0;t<max&&!predicate(b);t+=.01)out.push(...B.stepTypeB(b,.01,p,r));assert.ok(predicate(b),'state deadline');return out;}
function pizzaFinished(b){return !b.phase.startsWith('pizza');}
test('B appears only past the entrance trigger, warns, falls and hits on landing',()=>{
 const b=B.createTypeB();assert.equal(B.triggerTypeB(b,{x:719,y:650}),false);assert.equal(B.typeBTargetable(b),false);assert.equal(B.triggerTypeB(b,{x:720,y:650}),true);
 assert.equal(b.phase,'arrival-warning');assert.equal(B.damageTypeB(b,999999),0);run(b,1.51);assert.equal(b.phase,'arrival-drop');const events=run(b,.66);assert.equal(events.filter(e=>e.type==='landing').length,1);assert.equal(b.z,0);assert.equal(B.typeBHit(events.find(e=>e.type==='landing'),{x:b.x,y:b.y,z:0}),true);
});
test('slash, bullets, stomp, charge and laser use their forward and swept geometry',()=>{
 for(const name of ['slash','gun','stomp','dash','laser']){
  const b=live();b.phase=name+'-charge';b.dir=1;b.target={x:b.x+600,y:b.y};const events=run(b,3);const kind={gun:'bullet'}[name]||name;assert.ok(events.some(e=>e.type===kind),name);
 }
 const slash={type:'slash',x:1000,y:550,dir:1,...B.TYPE_B.slash,height:105};assert.equal(B.typeBHit(slash,{x:1300,y:600,z:0}),true);assert.equal(B.typeBHit(slash,{x:900,y:550,z:0}),false);assert.equal(B.typeBHit(slash,{x:1200,y:550,z:110}),false);
 const cone={type:'stomp',x:1000,y:550,dir:1,...B.TYPE_B.stomp,height:80};assert.equal(B.typeBHit(cone,{x:1200,y:600,z:0}),true);assert.equal(B.typeBHit(cone,{x:800,y:550,z:0}),false);
 const beam={type:'laser',x:1000,y:550,dir:1,...B.TYPE_B.laser,height:Infinity};assert.equal(B.typeBHit(beam,{x:2200,y:600,z:300}),true);assert.equal(B.typeBHit(beam,{x:1200,y:620,z:0}),false);
 const b=live();b.phase='laser-charge';const laser=run(b,3).filter(e=>e.type==='laser');assert.equal(laser.length,Math.ceil(B.TYPE_B.laser.duration/B.TYPE_B.laser.interval));
 const bullet={type:'bullet',x:900,toX:1300,y:550,halfLane:27,height:110,shot:{spent:false}};assert.equal(B.typeBHit(bullet,{x:1100,y:550,z:0}),true);bullet.shot.spent=true;assert.equal(B.typeBHit(bullet,{x:1100,y:550,z:0}),false);
});
test('scrap storm runs ten seconds independently while other attacks keep running',()=>{
 const b=live();b.phase='quake-charge';const startup=run(b,1.26);assert.ok(startup.some(e=>e.type==='stomp'));assert.ok(b.quakeRemaining>9.98);b.phase='gun-charge';b.elapsed=0;
 const events=run(b,10.95);assert.ok(events.some(e=>e.type==='bullet'));assert.ok(events.filter(e=>e.type==='debris').length>=15);assert.equal(b.quakeRemaining,0);assert.equal(b.debris.length,0);
 const e=events.find(e=>e.type==='debris');assert.equal(B.typeBHit(e,{x:e.x,y:e.y,z:500}),true);
});
test('liquid reaches the floor before slowing and expires separately after ten seconds',()=>{
 const b=live();b.phase='oil-charge';run(b,.81);assert.equal(b.oil.length,8);assert.equal(B.typeBMoveSlow(b,p),1);run(b,.56);assert.equal(B.typeBMoveSlow(b,p),.6);assert.equal(B.typeBMoveSlow(b,{x:45,y:360}),1);b.phase='awakening';b.elapsed=0;run(b,9.5);assert.equal(b.oil.length,0);
});
test('50 percent gives four directional releases; 20 percent gives three full cycles, each starts at twelve',()=>{
 for(const r of [()=>.1,()=>.9]){
  const b=live();assert.equal(B.damageTypeB(b,999999,r),120000);assert.equal(b.hp,120000);assert.equal(b.phase,'pizza-jump');assert.equal(b.safeSector,0);
  let events=until(b,pizzaFinished,30,r).filter(e=>e.type==='pizza');assert.deepEqual(events.map(e=>e.sector),r()<.5?[0,1,2,3]:[0,3,2,1]);assert.ok(!b.dead);
  B.damageTypeB(b,999999,r);assert.equal(b.hp,48000);events=until(b,pizzaFinished,30,r).filter(e=>e.type==='pizza');assert.equal(events.length,12);assert.deepEqual(events.filter((_,i)=>i%4===0).map(e=>e.sector),[0,0,0]);
  for(let i=0;i<4;i++){const angle=i*Math.PI/2,point={x:1200+Math.sin(angle)*200,y:555-Math.cos(angle)*100,z:0};assert.equal(B.inPizzaSafeZone(point,i),true);assert.equal(B.typeBHit({type:'pizza',sector:i,center:B.TYPE_B.center,height:Infinity},point),false);assert.equal(B.inPizzaSafeZone(point,(i+1)%4),false);}
  assert.equal(B.inPizzaSafeZone({x:1200,y:555},0),false);
 }
});
test('mandatory 20 percent sequence queues if threshold is crossed during the first pizza',()=>{
 const b=live();B.damageTypeB(b,120000);run(b,.7);B.damageTypeB(b,999999);assert.equal(b.pendingPizza,3);const events=until(b,pizzaFinished).filter(e=>e.type==='pizza');assert.equal(events.length,16);
});
function secondPhase(){const b=live();b.pizza50=b.pizza20=true;B.damageTypeB(b,999999);assert.equal(b.phase,'reboot');assert.equal(B.defeatTypeB(b),false);run(b,4.01);assert.equal(b.stage,2);assert.equal(b.hp,B.TYPE_B.hp/4);assert.equal(b.phase,'protocol');run(b,4.9);assert.equal(b.phase,'protocol');run(b,.12);assert.equal(b.phase,'approach');return b;}
test('first depletion reboots at quarter health with five-second red protocol and faster recovery',()=>{
 const b=secondPhase();b.phase='recover';b.elapsed=0;run(b,.29);assert.equal(b.phase,'approach');const first=live();first.phase='recover';run(first,.29);assert.equal(first.phase,'recover');
 b.x=400;b.elapsed=0;const firstX=400;run(b,.1);assert.ok(b.x-firstX>30);
});
test('phase two random pizza is a single cycle and cannot be selected consecutively',()=>{
 const b=secondPhase();b.lastPattern='laser';B.stepTypeB(b,.4,p,()=>.999);assert.equal(b.phase,'pizza-jump');assert.equal(b.pizzaRemaining,1);until(b,pizzaFinished);until(b,b=>b.phase==='approach');B.stepTypeB(b,.4,p,()=>.999);assert.notEqual(b.phase,'pizza-jump');
});
test('awakening is invulnerable and has one global ten-second deadline, including approach and mistakes',()=>{
 const b=secondPhase();B.damageTypeB(b,999999,random);assert.equal(b.hp,30000);assert.equal(b.phase,'awakening');assert.equal(B.damageTypeB(b,999),0);
 assert.equal(B.startTypeBQte(b,{x:b.x+500,y:b.y}),false);run(b,2);assert.equal(B.startTypeBQte(b,{x:b.x,y:b.y}),true);
 assert.equal(B.inputTypeBQte(b,b.qteSequence[0]),'correct');assert.equal(B.inputTypeBQte(b,'ArrowDown'),'wrong');assert.equal(b.qteProgress,0);assert.ok(b.elapsed>=2);
 for(const key of b.qteSequence)B.inputTypeBQte(b,key);assert.equal(b.phase,'shutdown');assert.equal(b.awakenBlocked,true);run(b,1.4);B.damageTypeB(b,1);assert.notEqual(b.phase,'awakening');
});
test('failed awakening fully heals, doubles future damage once, final death rewards only once',()=>{
 const b=secondPhase();B.damageTypeB(b,999999);run(b,10.01);assert.equal(b.hp,60000);assert.equal(b.attackMultiplier,2);assert.equal(b.qteActive,false);b.phase='slash-charge';b.elapsed=0;b.dir=1;const e=run(b,.73).find(e=>e.type==='slash');assert.equal(e.damage,B.TYPE_B.slash.damage*2);
 b.phase='approach';B.damageTypeB(b,50000);assert.notEqual(b.phase,'awakening');B.damageTypeB(b,999999);assert.equal(b.phase,'defeating');assert.equal(B.defeatTypeB(b),false);const events=run(b,1.51);assert.equal(events.filter(e=>e.type==='victory').length,1);assert.equal(B.defeatTypeB(b),true);assert.equal(B.defeatTypeB(b),false);
});
test('gold B title persists, replaces A title and adds exactly twenty percent attack and ten percent speed',()=>{
 const p=C.createCharacter('금빛');const atk=C.attackPower(p),speed=C.movementMultiplier(p);p.typeBTitle=1;p.typeATitle=1;p.typeATitleEquipped=true;
 assert.equal(C.equipTypeBTitle(p).ok,true);assert.equal(p.typeATitleEquipped,false);assert.ok(Math.abs(C.attackPower(p)-atk*1.2)<1e-10);assert.equal(C.movementMultiplier(p),speed*1.1);
 const restored=C.normalizeCharacter(JSON.parse(JSON.stringify(p)));assert.equal(C.hasTypeBTitle(restored),true);assert.equal(C.equipTypeATitle(restored).ok,true);assert.equal(C.hasTypeBTitle(restored),false);
 assert.ok(C.ITEMS.typeBTitle.image.endsWith('item-b-badge.svg'));assert.equal(C.normalizeCharacter(C.createCharacter('기존')).typeBTitle,0);
});
test('waiting-room NPC entrance and boss-room respawn connect the world without exposing a bypass portal',()=>{
 assert.equal(C.MAPS.proBoss.bossLevel,70);assert.equal(C.MAPS.proBoss.respawn.map,'proExam');assert.equal(C.MAPS.proExam.portals.find(p=>p.to==='proBoss').requiresNPC,true);assert.ok(C.MAPS.proBoss.portals.some(p=>p.to==='proExam'));
 const p=C.createCharacter('좌표');p.map='proBoss';p.y=400;assert.equal(C.normalizeCharacter(p).y,400);
});
test('hacker crowd control stops ordinary boss attacks without freezing rubble or mandatory mechanic clocks',()=>{
 const b=live();b.phase='slash-charge';b.quakeRemaining=2;b.quakeClock=.6;const events=B.stepTypeB(b,.8,{...p,stunned:true});assert.equal(b.phase,'slash-charge');assert.equal(b.elapsed,0);assert.ok(b.quakeRemaining<2);events.push(...B.stepTypeB(b,.2,{...p,stunned:true}));assert.ok(events.some(e=>e.type==='debris'));
 B.beginTypeBPizza(b);B.stepTypeB(b,.7,{...p,stunned:true});assert.equal(b.phase,'pizza-charge');
});
