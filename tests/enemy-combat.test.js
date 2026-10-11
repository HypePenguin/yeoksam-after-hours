import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,makeMonster,monsterCount,findMapRoute,normalizeCharacter,createCharacter,respawn} from '../dist/core.js';
import {ORB_ATTACK,stepOrbCaster,orbBlastContains,orbFlightPoint} from '../dist/enemy-combat.js';

test('four post-A hunting maps cover every level 41–60 with two distinct combat types',()=>{
 const levels=new Set();
 for(const [id,min,max] of [['dataStreet',41,45],['security',46,50],['compute',51,55],['proving',56,60]]){
  const map=MAPS[id],group=Array.from({length:monsterCount(id)},(_,i)=>makeMonster(id,i));
  assert.equal(map.minLevel,min);assert.equal(map.maxLevel,max);assert.equal(group[0].level,min);assert.equal(group.at(-1).level,max);
  assert.deepEqual(new Set(group.map(m=>m.combatType)),new Set(['melee','ranged']));
  for(const m of group){levels.add(m.level);assert.ok(m.x>=600&&m.x<=map.width-600);assert.ok(m.speed<300);assert.ok(m.hp>0&&m.xp>0);assert.ok(m.asset.includes(m.combatType));}
 }
 assert.deepEqual([...levels].sort((a,b)=>a-b),Array.from({length:20},(_,i)=>41+i));
 assert.deepEqual(findMapRoute('yeoksamStreet','proExam'),['yeoksamStreet','dataStreet','security','compute','proving','proExam']);
 assert.equal(monsterCount('proExam'),0);assert.equal(MAPS.proExam.boss,undefined);
 const p=createCharacter('귀환');p.map='compute';respawn(p);assert.equal(p.map,'yeoksamStreet');
 for(const id of ['dataStreet','security','compute','proving','proExam']){const p=createCharacter('저장');p.map=id;p.level=60;p.x=700;const saved=normalizeCharacter(p);assert.equal(saved.map,id);assert.equal(saved.x,700);assert.equal(saved.level,60);}
});
test('orb caster locks a ground target before the windup, sends a curved projectile and waits between casts',()=>{
 const m=makeMonster('dataStreet',1);Object.assign(m,{x:900,y:650,speed:0,attackCooldown:0});
 const target={x:1200,y:660},input={target,visible:true,width:3800};
 assert.equal(stepOrbCaster(m,.01,input),null);assert.equal(m.cast.x,1200);
 target.x=1600;target.y=720;
 assert.equal(stepOrbCaster(m,.3,input),null);
 const orb=stepOrbCaster(m,.3,input);assert.ok(orb);assert.equal(orb.x,1200);assert.equal(orb.y,660);assert.equal(m.cast,null);
 assert.equal(stepOrbCaster(m,.1,input),null);assert.equal(m.cast,null);
 const from=orbFlightPoint(orb),middle=orbFlightPoint({...orb,elapsed:orb.duration/2}),to=orbFlightPoint({...orb,elapsed:orb.duration});
 assert.equal(from.x,orb.fromX);assert.ok(middle.y<Math.min(from.y,to.y));assert.equal(to.x,1200);assert.ok(Math.abs(to.y-660)<1e-8);
});
test('ellipse collision matches warning axes and allows evasion by moving out or jumping',()=>{
 const orb={x:1000,y:650,rx:ORB_ATTACK.rx,ry:ORB_ATTACK.ry};
 for(const [dx,dy,inside] of [[0,0,true],[89,0,true],[0,59,true],[91,0,false],[0,61,false],[89,59,false]])assert.equal(orbBlastContains(orb,{x:1000+dx,y:650+dy}),inside);
 assert.equal(orbBlastContains(orb,{x:1000,y:650,z:ORB_ATTACK.height}),false);
});
test('ranged enemies respect stealth, windup cancellation, distance and map bounds',()=>{
 const m=makeMonster('dataStreet',1);Object.assign(m,{x:900,y:650,attackCooldown:0});const target={x:1200,y:650};
 stepOrbCaster(m,.01,{target,visible:true,width:3800});assert.ok(m.cast);
 stepOrbCaster(m,.01,{target,visible:false,width:3800});assert.equal(m.cast,null);
 target.x=3500;stepOrbCaster(m,.01,{target,visible:true,width:3800});assert.equal(m.cast,null);
 Object.assign(m,{x:60,dir:-1});stepOrbCaster(m,1,{target,visible:false,width:3800});assert.equal(m.x,60);assert.equal(m.dir,1);
});
