import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacter,normalizeCharacter,gainXp,maxHp,maxMp,xpNeeded,buyPotion,usePotion,canUseSkill,respawn,makeMonster,patrolMonster,MAPS,advanceJob,effectiveSkill,isPowered,monsterCount,findMapRoute,recommendedMap,MAP_ROUTES,WORLD_MAP_LAYOUT,worldMapConnections} from '../dist/core.js';
import {incomingDamage} from '../dist/core.js';

test('active defense multiplies passive defense before one final rounding',()=>{
 const p=createCharacter('피해계산');
 assert.equal(incomingDamage(p,100,.2),20);
 p.job='bodybuilder';
 assert.equal(incomingDamage(p,100,.5),45);
 assert.equal(incomingDamage(p,5,.5),2,'rounding the passive first would incorrectly produce 3');
 assert.equal(incomingDamage(p,84,.5),38);
 for(const power of [0,12]){p.level=20;p.powerTime=power;p.hp=maxHp(p);p.mp=250;const e=effectiveSkill(p,'e');assert.equal(e.heal,power?.7:.4);assert.equal(e.recovery,1.5);assert.equal(e.reduction,.5);assert.equal(canUseSkill(p,'e').ok,true);}
 p.job='swordsman';assert.equal(effectiveSkill(p,'e').guard,1);assert.equal(effectiveSkill(p,'r').reduction,.8);
});

test('new character starts with 500 won, HP/MP, supplies and town location',()=>{
 const p=createCharacter('역삼산책');assert.equal(p.money,500);assert.equal(p.map,'town');assert.equal(p.hp,100);assert.equal(p.mp,60);assert.equal(p.potions,3);
 assert.throws(()=>createCharacter('<script>'));assert.throws(()=>createCharacter(' '));assert.throws(()=>createCharacter('test','unknown'));
});
test('cat saves independently and can advance only with the Olympic Park organizer',()=>{
 const cat=createCharacter('나비','cat');assert.equal(cat.classId,'cat');assert.equal(cat.hp,90);assert.equal(cat.mp,70);
 assert.equal(effectiveSkill(cat,'q').name,'앞발 할퀴기');assert.equal(effectiveSkill(cat,'w').name,'뒤로 뛰기');
 cat.level=10;cat.hp=maxHp(cat);cat.mp=maxMp(cat);
 assert.equal(advanceJob(cat,'bodybuilder').ok,false);assert.equal(advanceJob(cat,'protester').ok,false);
 cat.map='olympic';assert.equal(advanceJob(cat,'protester').ok,true);assert.equal(effectiveSkill(cat,'e').charge,1);
 assert.equal(canUseSkill(cat,'e').ok,true);assert.equal(canUseSkill(cat,'r').ok,false);
 cat.level=15;assert.equal(canUseSkill(cat,'r').ok,true);
 assert.equal(normalizeCharacter(JSON.parse(JSON.stringify(cat))).job,'protester');
 assert.equal(normalizeCharacter({...cat,classId:'wanderer'}).job,null);
 assert.deepEqual(findMapRoute('town','olympic'),['town','olympic']);
});
test('purchase and use cannot duplicate money or consume a potion at full HP',()=>{
 const p=createCharacter('보리');assert.equal(usePotion(p).ok,false);assert.equal(p.potions,3);
 for(let i=0;i<10;i++)assert.equal(buyPotion(p).ok,true);
 assert.equal(p.money,0);assert.equal(p.potions,13);assert.equal(buyPotion(p).ok,false);assert.equal(p.potions,13);
 p.hp=30;assert.equal(usePotion(p).ok,true);assert.equal(p.hp,90);assert.equal(p.potions,12);
 p.hp=90;usePotion(p);assert.equal(p.hp,100);
});
test('early XP requirements are 60 percent until level 10 and Q/W still unlock at levels 3/6',()=>{
 for(let level=1;level<10;level++)assert.equal(xpNeeded(level),48*level);
 for(const level of [10,15,50,99])assert.equal(xpNeeded(level),80*level);
 const p=createCharacter('하루');p.hp=1;p.mp=0;assert.equal(gainXp(p,480),4);assert.equal(p.level,5);assert.equal(p.xp,0);assert.equal(p.hp,maxHp(p));assert.equal(p.mp,maxMp(p));
 for(const [level,q,w] of [[2,false,false],[3,true,false],[5,true,false],[6,true,true]]){p.level=level;p.mp=100;assert.equal(canUseSkill(p,'q').ok,q);assert.equal(canUseSkill(p,'w').ok,w);}
 assert.equal(canUseSkill(p,'q',1).ok,false);p.mp=0;assert.equal(canUseSkill(p,'q').ok,false);
});

test('XP switches to the original cost precisely at level 10, including multi-level rewards',()=>{
 const p=createCharacter('경계');assert.equal(gainXp(p,2159),8);assert.equal(p.level,9);assert.equal(p.xp,431);
 assert.equal(gainXp(p,1),1);assert.equal(p.level,10);assert.equal(p.xp,0);
 assert.equal(gainXp(p,799),0);assert.equal(p.level,10);assert.equal(gainXp(p,1),1);assert.equal(p.level,11);assert.equal(p.xp,0);
 const multi=createCharacter('연속');multi.level=9;assert.equal(gainXp(multi,432+800+880+13),3);assert.equal(multi.level,12);assert.equal(multi.xp,13);
});

test('existing early saves settle excess XP once, retain progress, and preserve death recovery',()=>{
 const base={...createCharacter('기존경험치'),level:9,xp:719,map:'depths',visited:['town','depths'],x:1710,y:680,hp:150,mp:50,money:1000,potions:7,cooldowns:{q:1,w:2,e:0,r:0}};
 const restored=normalizeCharacter(base);assert.equal(restored.level,10);assert.equal(restored.xp,287);assert.equal(restored.hp,maxHp(restored));assert.equal(restored.mp,maxMp(restored));assert.equal(canUseSkill(restored,'e').ok,false,'level 10 still requires a job');
 for(const key of ['map','x','y','money','potions','job'])assert.equal(restored[key],base[key]);assert.deepEqual(restored.cooldowns,base.cooldowns);
 assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(restored))),restored);
 const partial=normalizeCharacter({...base,level:2,xp:159});assert.equal(partial.level,3);assert.equal(partial.xp,63);assert.equal(canUseSkill(partial,'q').ok,false,'saved cooldown remains in force');assert.equal(canUseSkill(partial,'q',0).ok,true);
 const multiple=normalizeCharacter({...base,level:1,xp:300});assert.equal(multiple.level,4);assert.equal(multiple.xp,12);
 const below=normalizeCharacter({...base,level:1,xp:47});assert.equal(below.level,1);assert.equal(below.xp,47);
 const dead=normalizeCharacter({...base,hp:0});assert.equal(dead.map,'town');assert.equal(dead.level,10);assert.equal(dead.xp,287);assert.equal(dead.hp,maxHp(dead));
 const high={...base,level:10,xp:799};assert.deepEqual(normalizeCharacter(high),high);
});
test('job advancement requires level 10 at the correct school, persists, and gates E/R',()=>{
 for(const [job,map] of [['bodybuilder','gym'],['swordsman','dojo']]){
  const p=createCharacter('전직');p.level=9;p.map=map;assert.equal(advanceJob(p,job).ok,false);
  p.level=10;p.map='town';assert.equal(advanceJob(p,job).ok,false);p.hp=1;assert.equal(canUseSkill(p,'e').ok,false);
  p.map=map;assert.equal(advanceJob(p,job).ok,true);assert.equal(canUseSkill(p,'e').ok,true);assert.equal(advanceJob(p,job).ok,false);
  p.level=14;assert.equal(canUseSkill(p,'r').ok,false);p.level=15;assert.equal(canUseSkill(p,'r').ok,true);
  assert.equal(normalizeCharacter(JSON.parse(JSON.stringify(p))).job,job);respawn(p);assert.equal(p.job,job);
  p.hp=maxHp(p);assert.equal(canUseSkill(p,'e').ok,true);p.powerTime=12;assert.equal(isPowered(p),job==='bodybuilder');
 }
 const p=createCharacter('기존');p.level=15;p.xp=300;const restored=normalizeCharacter({...p,job:'invalid'});assert.equal(restored.job,null);assert.equal(restored.level,15);assert.equal(restored.xp,300);
 assert.equal(normalizeCharacter({...p,level:9,job:'bodybuilder'}).job,null);
});
test('death has no progression or inventory penalty, and dead saves recover safely',()=>{
 const p=createCharacter('테스터');Object.assign(p,{level:5,hp:0,mp:0,map:'depths',x:2200,money:730,scrap:9,cores:3,xp:18,potions:2});
 const restored=normalizeCharacter(JSON.parse(JSON.stringify(p)));assert.equal(restored.map,'town');assert.equal(restored.hp,maxHp(p));
 respawn(p);assert.equal(p.money,730);assert.equal(p.scrap,9);assert.equal(p.cores,3);assert.equal(p.xp,18);assert.equal(p.potions,2);assert.equal(p.level,5);
});
test('save roundtrip preserves dungeon coordinates and rejects invalid data',()=>{
 const p=createCharacter('저장검증');Object.assign(p,{map:'alley',x:1512.5,y:683,hp:49,mp:13.5,money:830,cores:2,savedAt:new Date().toISOString(),visited:['town','alley']});
 assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(p))),p);
 assert.equal(normalizeCharacter(null),null);assert.equal(normalizeCharacter({name:'n'}),null);
 const safe=normalizeCharacter({...p,map:'missing',x:Infinity,y:-500,hp:NaN,money:-99});assert.equal(safe.map,'town');assert.equal(safe.y,580);assert.equal(safe.hp,100);assert.equal(safe.money,0);
});
test('farther monsters get stronger and all portals lead to valid maps',()=>{
 const weak=makeMonster('alley',0),far=makeMonster('alley',5),deep=makeMonster('depths',5);assert.ok(far.level>weak.level);assert.ok(deep.hp>far.hp);assert.ok(deep.attack>far.attack);
 for(const m of Object.values(MAPS))for(const portal of m.portals){assert.ok(MAPS[portal.to]);assert.ok(portal.spawnX>0&&portal.spawnX<MAPS[portal.to].width);}
});

test('legacy saves become normal penguins without losing progress; corrupted cooldowns are bounded',()=>{
 const raw={id:'legacy',name:'밤산책',classId:'wanderer',level:6,xp:73,hp:200,mp:110,money:1342,potions:10,scrap:21,cores:8,kills:40,map:'depths',x:1710,y:700,savedAt:'2026-10-04T00:00:00.000Z'};
 const p=normalizeCharacter(raw);for(const key of Object.keys(raw))assert.equal(p[key],raw[key]);assert.equal(p.powerTime,0);assert.deepEqual(p.visited,['town','depths']);assert.deepEqual(p.cooldowns,{q:0,w:0,e:0,r:0});
 const bad=normalizeCharacter({...raw,powerTime:9999,cooldowns:{r:999,q:-10,e:'bad'},visited:['bad','town','town']});assert.equal(bad.powerTime,0);assert.equal(bad.cooldowns.r,30);assert.equal(bad.cooldowns.q,0);assert.equal(bad.cooldowns.e,0);assert.deepEqual(bad.visited,['town','depths']);
});
test('all twenty-three regions have return routes, progressive enemies, and safe portal arrivals',()=>{
 assert.equal(Object.keys(MAPS).length,23);const visited=new Set(),queue=['town'];while(queue.length){const id=queue.shift();if(visited.has(id))continue;visited.add(id);for(const p of MAPS[id].portals){const back=MAPS[p.to].portals.find(b=>b.to===id);assert.ok(back,`${id} -> ${p.to} return`);assert.ok(Math.abs(back.x-p.spawnX)>145);assert.ok(p.spawnX>45&&p.spawnX<MAPS[p.to].width-45);queue.push(p.to);}}
 assert.equal(visited.size,23);
 for(const map of Object.values(MAPS)){if(!map.danger)continue;assert.equal(makeMonster(map.id,0).level,map.minLevel);assert.equal(makeMonster(map.id,monsterCount(map.id)-1).level,map.maxLevel);}
});

test('inventory migration preserves zero supplies and validates persisted shortcuts',()=>{
 const raw={...createCharacter('가방'),potions:0,returnScrolls:4,quickSlots:['returnScrolls',null,'potions']};
 assert.deepEqual(normalizeCharacter(raw),raw);
 const legacy={...raw};delete legacy.returnScrolls;delete legacy.gangnamScrolls;delete legacy.quickSlots;
 const restored=normalizeCharacter(legacy);assert.equal(restored.potions,0);assert.equal(restored.returnScrolls,0);assert.equal(restored.gangnamScrolls,0);assert.deepEqual(restored.quickSlots,['potions',null,null]);
 const corrupt=normalizeCharacter({...raw,returnScrolls:-4,quickSlots:['scrap','__proto__','missing','potions']});assert.equal(corrupt.returnScrolls,0);assert.deepEqual(corrupt.quickSlots,[null,null,null]);
 assert.equal(normalizeCharacter({...raw,returnScrolls:Infinity}).returnScrolls,0);
});

test('old scrolls stay bound to Yeoksam while Gangnam counts, shortcuts and location survive saving',()=>{
 const old={...createCharacter('옛주문서'),returnScrolls:4,quickSlots:['returnScrolls',null,'potions']};delete old.gangnamScrolls;
 const migrated=normalizeCharacter(old);assert.equal(migrated.returnScrolls,4);assert.equal(migrated.gangnamScrolls,0);assert.deepEqual(migrated.quickSlots,old.quickSlots);
 const current={...migrated,map:'gangnam',x:1320,y:680,visited:['town','gangnam'],gangnamScrolls:3,quickSlots:['potions','returnScrolls','gangnamScrolls']};
 assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(current))),current);
 for(const bad of [-1,Infinity,NaN,'4'])assert.equal(normalizeCharacter({...current,gangnamScrolls:bad}).gangnamScrolls,0);
 assert.equal(normalizeCharacter({...current,gangnamScrolls:2.8}).gangnamScrolls,2);
});

test('both scrolls charge the town price, recall between towns and preserve resources',async()=>{
 const {ITEMS,buyItem,useItem,assignQuickSlot}=await import('../dist/core.js');
 for(const [id,destination] of [['returnScrolls','town'],['gangnamScrolls','gangnam']]){
  const p=createCharacter('두마을');assert.equal(assignQuickSlot(p,2,id).ok,false);assert.equal(ITEMS[id].price,100);
  const price=id==='gangnamScrolls'?1500:100;p.money=price-1;
  const refused=buyItem(p,id);assert.equal(refused.ok,false);assert.ok(refused.message.includes(price.toLocaleString()));assert.equal(p.money,price-1);assert.equal(p[id],0);
  p.money=price;assert.equal(buyItem(p,id).ok,true);assert.equal(p[id],1);assert.equal(p.money,0);assert.equal(assignQuickSlot(p,2,id).ok,true);
  for(const from of ['town','gangnam','gym','dojo','station6','foundry','pocha']){
   Object.assign(p,{map:from,x:710,y:680,hp:24,mp:11,xp:39,[id]:2});p.cooldowns.q=2;
   const before={hp:p.hp,mp:p.mp,xp:p.xp,money:p.money},result=useItem(p,id);
   assert.equal(result.ok,from!==destination,`${id} from ${from}`);assert.equal(p[id],from===destination?2:1);
   assert.equal(p.map,destination);for(const [key,value] of Object.entries(before))assert.equal(p[key],value);assert.equal(p.cooldowns.q,2);
   if(result.ok){assert.equal(p.x,ITEMS[id].recall.x);assert.equal(p.y,648);assert.ok(p.visited.includes(destination));}
  }
  p[id]=0;const before=JSON.stringify(p);assert.equal(useItem(p,id).ok,false);assert.equal(JSON.stringify(p),before);
 }
});

test('consumable shopping, assignment and recall are atomic and retain combat resources',async()=>{
 const {buyItem,useItem,assignQuickSlot}=await import('../dist/core.js');const p=createCharacter('귀환');
 assert.equal(assignQuickSlot(p,1,'returnScrolls').ok,false);assert.equal(buyItem(p,'returnScrolls').ok,true);assert.equal(p.money,400);assert.equal(p.returnScrolls,1);
 assert.equal(assignQuickSlot(p,1,'returnScrolls').ok,true);assert.equal(assignQuickSlot(p,2,'potions').ok,true);assert.equal(assignQuickSlot(p,3,'potions').ok,false);assert.equal(assignQuickSlot(p,0,'scrap').ok,false);
 assert.equal(useItem(p,'returnScrolls').ok,false);assert.equal(p.returnScrolls,1);
 p.map='depths';p.x=1800;p.hp=24;p.mp=11;p.xp=39;p.cooldowns.q=2;const before={hp:p.hp,mp:p.mp,xp:p.xp,money:p.money};
 assert.equal(useItem(p,'returnScrolls').recalled,true);assert.equal(p.returnScrolls,0);assert.equal(p.map,'town');assert.equal(p.x,530);assert.equal(p.y,648);for(const [key,value] of Object.entries(before))assert.equal(p[key],value);assert.equal(p.cooldowns.q,2);
 assert.equal(useItem(p,'returnScrolls').ok,false);assert.equal(p.returnScrolls,0);assert.deepEqual(normalizeCharacter(p).quickSlots,['potions','returnScrolls','potions']);
 p.money=99;assert.equal(buyItem(p,'returnScrolls').ok,false);assert.equal(p.money,99);assert.equal(p.returnScrolls,0);assert.equal(buyItem(p,'__proto__').ok,false);
 assert.equal(assignQuickSlot(p,0,null).ok,true);assert.equal(p.quickSlots[0],null);
});


test('training venues follow the requested exit route with no gym-dojo shortcut',()=>{
 const destinations=id=>MAPS[id].portals.map(p=>p.to).sort();
 assert.deepEqual(destinations('gym'),['town']);assert.deepEqual(destinations('dojo'),['station6']);
 assert.deepEqual(destinations('station6'),['crossroads','dojo']);assert.deepEqual(destinations('crossroads'),['station6','town']);
 assert.ok(destinations('town').includes('gym'));assert.ok(destinations('town').includes('crossroads'));
 assert.equal(MAPS.gym.name,'피치플레이헬스&필라테스 역삼점');assert.equal(MAPS.dojo.name,'강남성균검도관');assert.ok(MAPS.crossroads.danger>0);assert.equal(MAPS.station6.danger,0);
 for(const map of ['gym','dojo','crossroads','station6']){const raw={...createCharacter('길찾기'),map,x:710,y:680};const restored=normalizeCharacter(raw);assert.equal(restored.map,map);assert.equal(restored.x,710);assert.ok(restored.visited.includes(map));}
});


test('upper dungeons cover levels 13–30 with denser, bounded progressive spawns',()=>{
 const ids=['relay','canal','foundry','nexus'],counts=[8,8,9,10];let previousMax=13,previousHp=0;
 ids.forEach((id,i)=>{const map=MAPS[id],count=monsterCount(id);assert.equal(count,counts[i]);assert.ok(map.minLevel<=previousMax+1);assert.ok(map.maxLevel>previousMax);
  const group=Array.from({length:count},(_,index)=>makeMonster(id,index));assert.equal(group[0].level,map.minLevel);assert.equal(group.at(-1).level,map.maxLevel);
  for(const [index,m] of group.entries()){assert.ok(m.x>=600&&m.x<=map.width-600);assert.ok(m.level>=map.minLevel&&m.level<=map.maxLevel);assert.ok(m.hp>previousHp);if(index)assert.ok(m.x>group[index-1].x);}
  previousMax=map.maxLevel;previousHp=group.at(-1).hp;
 });assert.equal(previousMax,30);assert.equal(monsterCount('town'),0);
});
test('map guide uses real portal edges and returns shortest bidirectional routes',()=>{
 const represented=new Set();for(const route of MAP_ROUTES){route.maps.forEach(id=>represented.add(id));for(let i=1;i<route.maps.length;i++)assert.ok(MAPS[route.maps[i-1]].portals.some(p=>p.to===route.maps[i]),route.id);}
 assert.equal(represented.size,Object.keys(MAPS).length);
 assert.deepEqual(findMapRoute('town','nexus'),['town','park','subway','rooftop','relay','canal','foundry','nexus']);
 assert.deepEqual(findMapRoute('nexus','town'),['nexus','foundry','canal','relay','rooftop','subway','park','town']);
 assert.deepEqual(findMapRoute('gym','dojo'),['gym','town','crossroads','station6','dojo']);
 assert.deepEqual(findMapRoute('relay','relay'),['relay']);assert.deepEqual(findMapRoute('missing','town'),[]);assert.deepEqual(findMapRoute('town','__proto__'),[]);
});
test('hunting recommendations advance at each difficulty boundary without recommending an overlevelled zone',()=>{
 for(const [level,id] of [[1,'alley'],[3,'park'],[4,'depths'],[6,'subway'],[10,'rooftop'],[12,'rooftop'],[13,'relay'],[16,'relay'],[17,'canal'],[20,'canal'],[21,'foundry'],[24,'foundry'],[25,'nexus'],[30,'nexus'],[31,'accelerator'],[33,'accelerator'],[34,'arsenal'],[36,'arsenal'],[37,'reactor'],[40,'reactor'],[99,'reactor']]){assert.equal(recommendedMap(level).id,id);assert.ok(recommendedMap(level).minLevel<=level);}
});


test('overview contains every region once and exactly the bidirectional portal graph',()=>{
 assert.deepEqual(Object.keys(WORLD_MAP_LAYOUT).sort(),Object.keys(MAPS).sort());
 const actual=worldMapConnections(),expected=new Set(Object.values(MAPS).flatMap(m=>m.portals.map(p=>[m.id,p.to].sort().join(':'))));
 assert.equal(actual.length,23);assert.equal(actual.length,expected.size);assert.deepEqual(new Set(actual.map(e=>e.key)),expected);
 for(const edge of actual){assert.ok(MAPS[edge.from].portals.some(p=>p.to===edge.to));assert.ok(MAPS[edge.to].portals.some(p=>p.to===edge.from));}
 assert.equal(actual.some(e=>e.key==='dojo:gym'),false);
 for(const {x,y} of Object.values(WORLD_MAP_LAYOUT)){assert.ok(x>80&&x<1040);assert.ok(y>40&&y<570);}
});

test('overview roads neither cross unrelated roads nor pass through unrelated region markers',()=>{
 const edges=worldMapConnections(),orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<edges.length;i++){
  const edge=edges[i],a=WORLD_MAP_LAYOUT[edge.from],b=WORLD_MAP_LAYOUT[edge.to];
  for(const [id,p] of Object.entries(WORLD_MAP_LAYOUT)){
   if(id===edge.from||id===edge.to)continue;
   const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2)));
   assert.ok(Math.hypot(p.x-a.x-t*(b.x-a.x),p.y-a.y-t*(b.y-a.y))>30,`${edge.key} passes through ${id}`);
  }
  for(const other of edges.slice(i+1)){
   if([other.from,other.to].some(id=>id===edge.from||id===edge.to))continue;
   const c=WORLD_MAP_LAYOUT[other.from],d=WORLD_MAP_LAYOUT[other.to];
   assert.equal(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0,false,`${edge.key} crosses ${other.key}`);
  }
 }
});

test('new rabbits receive one MP potion in slot two without replenishing saved characters',()=>{
 const p=createCharacter('첫마법','rabbit');assert.equal(p.mpPotions,1);assert.deepEqual(p.quickSlots,['potions','mpPotions',null]);
 const restored=normalizeCharacter(p);assert.equal(restored.mpPotions,1);assert.deepEqual(restored.quickSlots,p.quickSlots);
 p.mpPotions=0;p.quickSlots=['potions','returnScrolls',null];
 const used=normalizeCharacter(p);assert.equal(used.mpPotions,0);assert.deepEqual(used.quickSlots,p.quickSlots);
 delete p.mpPotions;delete p.quickSlots;const legacy=normalizeCharacter(p);assert.equal(legacy.mpPotions,0);assert.deepEqual(legacy.quickSlots,['potions',null,null]);
 for(const id of ['wanderer','cat']){const other=createCharacter('다른캐릭터',id);assert.equal(other.mpPotions,0);assert.equal(other.quickSlots[1],null);}
});

test('all character classes unlock W at level six, including restored saves',()=>{
 for(const classId of ['wanderer','cat','rabbit']){
  const p=createCharacter('해금확인',classId);p.level=5;assert.equal(canUseSkill(p,'w').ok,false);
  p.level=6;const restored=normalizeCharacter(p);assert.equal(effectiveSkill(restored,'w').level,6);assert.equal(canUseSkill(restored,'w').ok,true);
 }
});

test('ordinary enemies patrol both ends of every dungeon while staying in the walkable area',()=>{
 for(const map of Object.values(MAPS).filter(m=>m.danger&&!m.boss)){
  const m=makeMonster(map.id,0);m.speed=1000;let min=m.x,max=m.x;
  for(let t=0;t<map.width*3/(m.speed*.7);t+=1/60){patrolMonster(m,map.id,1/60);min=Math.min(min,m.x);max=Math.max(max,m.x);assert.ok(m.y>=580&&m.y<=720);assert.ok(m.x>=60&&m.x<=map.width-60);}
  assert.equal(min,60,map.id);assert.equal(max,map.width-60,map.id);
 }
});
test('patrol continues smoothly from current position and respects zero movement speed',()=>{
 const m=makeMonster('alley',0);Object.assign(m,{home:600,x:1700,y:650,patrolY:650,dir:1,speed:100});patrolMonster(m,'alley',.1);assert.equal(m.x,1707);
 m.speed=0;patrolMonster(m,'alley',1);assert.equal(m.x,1707);assert.equal(m.y,650);
});
