// B-type encounter clocks, hazards and inputs are transient and reset on every entry.
export const TYPE_B={name:'B형',level:70,hp:240000,phase2Hp:60000,height:488,width:2400,triggerX:720,xp:60000,money:15000,cores:40,
 floor:{minX:45,maxX:2355,minY:360,maxY:750},center:{x:1200,y:555},
 slash:{windup:.72,range:400,halfLane:105,damage:420},gun:{windup:.7,count:12,interval:.1,speed:1400,damage:105},
 stomp:{windup:.85,range:390,halfAngle:Math.PI*.32,damage:480},quake:{windup:1.25,duration:10,interval:.65,warning:.9,rx:90,ry:60,damage:240},
 dash:{windup:.95,duration:.6,speed:1350,damage:440},laser:{originOffset:400,windup:1.1,duration:1.6,length:1600,halfLane:62,interval:.25,damage:165},
 oil:{windup:.8,duration:10,rx:112,ry:65,slow:.6},pizza:{jump:.65,charge:1.1,openingCharge:2.4,flash:.35,damage:820},awakening:{duration:10,count:10,range:180},recover:.68};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const change=(b,next)=>{b.phase=next;b.elapsed=0;b.strikes=0;b.walking=false;};
export const isTypeB=b=>b?.kind==='type-b';
export const typeBTargetable=b=>b.active&&!b.dead&&!['hidden','arrival-warning','arrival-drop','reboot','protocol','awakening','pizza-jump','defeating','defeated'].includes(b.phase);
export const typeBContains=(p,s)=>((p.x-s.x)/s.rx)**2+((p.y-s.y)/s.ry)**2<=1;
// Angles use floor space: zero points to 12 o'clock, increasing clockwise.
export const pizzaAngle=(p,c=TYPE_B.center)=>Math.atan2(p.x-c.x,-(p.y-c.y)*2);
export function inPizzaSafeZone(p,sector,center=TYPE_B.center){
 if(Math.hypot(p.x-center.x,(p.y-center.y)*2)<24)return false;
 const a=pizzaAngle(p,center)-sector*Math.PI/2,wrapped=Math.atan2(Math.sin(a),Math.cos(a));return Math.abs(wrapped)<=Math.PI/4;
}
export const typeBMoveSlow=(b,p)=>b?.oil?.some(s=>s.duration-s.remaining>=.55&&typeBContains(p,s))?TYPE_B.oil.slow:1;
export function createTypeB(){return {kind:'type-b',id:'type-b',isBoss:true,level:70,x:1160,y:555,z:0,dir:-1,hp:TYPE_B.hp,maxHp:TYPE_B.hp,active:false,dead:false,rewardGranted:false,phase:'hidden',stage:1,elapsed:0,strikes:0,walking:false,walkPhase:0,hit:0,projectiles:[],debris:[],oil:[],quakeRemaining:0,quakeClock:0,pizza50:false,pizza20:false,pendingPizza:0,pizzaRemaining:0,lastPattern:null,awakenUsed:false,qteActive:false,qteSequence:[],qteProgress:0,attackMultiplier:1,failedAwakening:false};}
export function triggerTypeB(b,p){if(b.phase!=='hidden'||p.x<TYPE_B.triggerX)return false;b.active=true;b.target={x:clamp(p.x+240,850,1700),y:clamp(p.y,470,650)};b.x=b.target.x;b.y=b.target.y;change(b,'arrival-warning');return true;}
export function beginTypeBPizza(b,cycles=1,random=Math.random){
 b.pizzaRemaining=cycles;b.pizzaPulse=0;b.safeSector=0;b.pizzaDirection=random()<.5?1:-1;b.from={x:b.x,y:b.y};b.target={...TYPE_B.center};b.projectiles=[];change(b,'pizza-jump');b.lastPattern='pizza';
}
function beginAwakening(b,random=Math.random){
 b.awakenUsed=true;b.qteActive=false;b.qteProgress=0;b.qteSequence=Array.from({length:TYPE_B.awakening.count},()=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'][Math.min(3,Math.floor(random()*4))]);
 b.projectiles=[];b.debris=[];b.quakeRemaining=0;change(b,'awakening');
}
export function startTypeBQte(b,p){
 if(b.phase!=='awakening'||b.qteActive||Math.hypot(p.x-b.x,(p.y-b.y)*1.5)>TYPE_B.awakening.range)return false;
 b.qteActive=true;b.qteProgress=0;return true;
}
export function inputTypeBQte(b,key){
 if(b.phase!=='awakening'||!b.qteActive)return 'inactive';
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))return 'ignored';
 if(key!==b.qteSequence[b.qteProgress]){b.qteProgress=0;return 'wrong';}
 b.qteProgress++;
 if(b.qteProgress===TYPE_B.awakening.count){b.qteActive=false;b.awakenBlocked=true;change(b,'shutdown');return 'success';}
 return 'correct';
}
export function damageTypeB(b,damage,random=Math.random){
 if(!typeBTargetable(b))return 0;
 const before=b.hp;b.hp=Math.max(0,b.hp-Math.max(0,damage));b.hit=.15;
 if(b.stage===1){
  if(!b.pizza50&&b.hp<=b.maxHp*.5){b.hp=b.maxHp*.5;b.pizza50=true;beginTypeBPizza(b,1,random);}
  else if(!b.pizza20&&b.hp<=b.maxHp*.2){b.hp=b.maxHp*.2;b.pizza20=true;if(b.phase.startsWith('pizza'))b.pendingPizza=3;else beginTypeBPizza(b,3,random);}
  else if(b.hp===0){if(b.phase.startsWith('pizza'))b.hp=1;else{b.projectiles=[];b.debris=[];b.oil=[];b.quakeRemaining=0;change(b,'reboot');}}
 }else if(!b.awakenUsed&&b.hp<=b.maxHp*.5){b.hp=b.maxHp*.5;beginAwakening(b,random);}
 else if(b.hp===0){b.projectiles=[];b.debris=[];b.oil=[];b.quakeRemaining=0;change(b,'defeating');}
 return before-b.hp;
}
export const typeBPizzaCharge=b=>b.pizzaPulse===0?TYPE_B.pizza.openingCharge:TYPE_B.pizza.charge;
const bounds=(b)=>{b.x=clamp(b.x,TYPE_B.floor.minX+150,TYPE_B.floor.maxX-150);b.y=clamp(b.y,TYPE_B.floor.minY+35,TYPE_B.floor.maxY-35);};
const scaleDamage=(b,e)=>({...e,damage:e.damage*b.attackMultiplier});
function debrisPoint(b,p,random){
 const aimed=random()<.65;return {x:clamp(aimed?p.x:(TYPE_B.floor.minX+random()*(TYPE_B.floor.maxX-TYPE_B.floor.minX)),TYPE_B.floor.minX+90,TYPE_B.floor.maxX-90),y:clamp(aimed?p.y:TYPE_B.floor.minY+random()*(TYPE_B.floor.maxY-TYPE_B.floor.minY),TYPE_B.floor.minY+60,TYPE_B.floor.maxY-60)};
}
export function stepTypeB(b,dt,p,random=Math.random){
 const events=[];b.walking=false;if(!b.active||b.dead)return events;
 b.elapsed+=dt;b.hit=Math.max(0,b.hit-dt);
 const emit=e=>events.push(scaleDamage(b,e));
 // The rubble storm is independent of the boss's current attack state.
 if(b.quakeRemaining>0){
  const activeDt=Math.min(dt,b.quakeRemaining);b.quakeRemaining=Math.max(0,b.quakeRemaining-dt);b.quakeClock+=activeDt;
  while(b.quakeClock>=TYPE_B.quake.interval){b.quakeClock-=TYPE_B.quake.interval;b.debris.push({...debrisPoint(b,p,random),remaining:TYPE_B.quake.warning,duration:TYPE_B.quake.warning,rx:TYPE_B.quake.rx,ry:TYPE_B.quake.ry});}
 }
 for(const s of b.debris){s.remaining-=dt;if(s.remaining<=0)emit({type:'debris',...s,damage:TYPE_B.quake.damage,height:Infinity});}
 b.debris=b.debris.filter(s=>s.remaining>0);
 for(const s of b.oil)s.remaining-=dt;b.oil=b.oil.filter(s=>s.remaining>0);
 for(const shot of b.projectiles){const from=shot.x;shot.x+=shot.dir*TYPE_B.gun.speed*dt;shot.life-=dt;emit({type:'bullet',x:from,toX:shot.x,y:shot.y,halfLane:27,height:110,shot,damage:TYPE_B.gun.damage});}
 b.projectiles=b.projectiles.filter(s=>s.life>0&&!s.spent);
 if(p.stunned&&['approach','recover','slash-charge','slash','stomp-charge','stomp','quake-charge','quake','gun-charge','gun','dash-charge','dash','laser-charge','laser','oil-charge','oil'].includes(b.phase)){b.elapsed-=dt;return events;}
 if(b.phase==='arrival-warning'&&b.elapsed>=1.5){b.z=850;change(b,'arrival-drop');}
 else if(b.phase==='arrival-drop'){
  b.z=850*(1-clamp(b.elapsed/.65,0,1))**2;
  if(b.elapsed>=.65){b.z=0;emit({type:'landing',x:b.x,y:b.y,rx:220,ry:125,height:100,damage:440});change(b,'recover');}
 }else if(b.phase==='reboot'){
  if(b.elapsed>=4){b.stage=2;b.hp=b.maxHp=TYPE_B.phase2Hp;b.protocolRemaining=5;b.projectiles=[];change(b,'protocol');events.push({type:'protocol'});}
 }else if(b.phase==='protocol'){
  b.protocolRemaining=Math.max(0,b.protocolRemaining-dt);if(b.elapsed>=5)change(b,'approach');
 }else if(b.phase==='awakening'){
  if(b.elapsed>=TYPE_B.awakening.duration){b.qteActive=false;b.hp=b.maxHp;b.attackMultiplier=2;b.failedAwakening=true;change(b,'awakened');events.push({type:'awaken-failed'});}
 }else if(b.phase==='awakened'&&b.elapsed>=1.5)change(b,'approach');
 else if(b.phase==='shutdown'&&b.elapsed>=1.3)change(b,'recover');
 else if(b.phase==='defeating'&&b.elapsed>=1.5){b.dead=true;b.active=false;change(b,'defeated');events.push({type:'victory'});}
 else if(b.phase==='pizza-jump'){
  const t=clamp(b.elapsed/TYPE_B.pizza.jump,0,1),ease=t*t*(3-2*t);b.x=b.from.x+(b.target.x-b.from.x)*ease;b.y=b.from.y+(b.target.y-b.from.y)*ease;b.z=Math.sin(t*Math.PI)*280;
  if(t===1){b.z=0;change(b,'pizza-charge');events.push({type:'pizza-land'});}
 }else if(b.phase==='pizza-charge'&&b.elapsed>=typeBPizzaCharge(b)){emit({type:'pizza',sector:b.safeSector,center:{...TYPE_B.center},damage:TYPE_B.pizza.damage,height:Infinity});change(b,'pizza-release');}
 else if(b.phase==='pizza-release'&&b.elapsed>=TYPE_B.pizza.flash){
  b.pizzaPulse++;
  if(b.pizzaPulse<4){b.safeSector=(b.safeSector+b.pizzaDirection+4)%4;change(b,'pizza-charge');}
  else if(--b.pizzaRemaining>0){b.pizzaPulse=0;b.safeSector=0;b.pizzaDirection=random()<.5?1:-1;change(b,'pizza-charge');}
  else if(b.pendingPizza){const n=b.pendingPizza;b.pendingPizza=0;beginTypeBPizza(b,n,random);}
  else change(b,'recover');
 }else if(b.phase==='approach'){
  if(p.hidden){b.elapsed=0;return events;}
  const from={x:b.x,y:b.y},dx=p.x-b.x,dy=p.y-b.y,speed=b.stage===2?350:230;b.dir=dx>=0?1:-1;
  if(Math.abs(dx)>240)b.x+=Math.sign(dx)*Math.min(Math.abs(dx)-240,speed*dt);
  b.y+=Math.sign(dy)*Math.min(Math.abs(dy),speed*.65*dt);bounds(b);
  const d=Math.hypot(b.x-from.x,b.y-from.y);b.walking=d>.001;b.walkPhase=(b.walkPhase+d/115)%1;
  if(b.elapsed>=(b.stage===2?.38:.85)){
   const pool=['slash','gun','stomp','quake','dash','laser','oil',...(b.stage===2&&b.lastPattern!=='pizza'?['pizza']:[])].filter(n=>!['slash','stomp'].includes(n)||Math.abs(dx)<480);
   const next=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];b.lastPattern=next;b.target={x:p.x,y:p.y};
   if(next==='pizza')beginTypeBPizza(b,1,random);else change(b,next+'-charge');
  }
 }else if(b.phase==='slash-charge'&&b.elapsed>=TYPE_B.slash.windup){emit({type:'slash',x:b.x,y:b.y,dir:b.dir,...TYPE_B.slash,height:105});change(b,'slash');}
 else if(b.phase==='slash'&&b.elapsed>=.36)change(b,'recover');
 else if(b.phase==='stomp-charge'&&b.elapsed>=TYPE_B.stomp.windup){emit({type:'stomp',x:b.x,y:b.y,dir:b.dir,...TYPE_B.stomp,height:80});change(b,'stomp');}
 else if(b.phase==='stomp'&&b.elapsed>=.45)change(b,'recover');
 else if(b.phase==='quake-charge'&&b.elapsed>=TYPE_B.quake.windup){emit({type:'stomp',x:b.x,y:b.y,dir:b.dir,...TYPE_B.stomp,damage:560,height:90});b.quakeRemaining=10;b.quakeClock=0;change(b,'quake');events.push({type:'quake-start'});}
 else if(b.phase==='quake'&&b.elapsed>=.45)change(b,'recover');
 else if(b.phase==='gun-charge'&&b.elapsed>=TYPE_B.gun.windup)change(b,'gun');
 else if(b.phase==='gun'){
  while(b.strikes<TYPE_B.gun.count&&b.elapsed>=b.strikes*TYPE_B.gun.interval){b.strikes++;b.projectiles.push({x:b.x+b.dir*190,y:b.y,dir:b.dir,life:1.8,spent:false});events.push({type:'muzzle',x:b.x+b.dir*190,y:b.y-180,dir:b.dir});}
  if(b.elapsed>=1.35)change(b,'recover');
 }else if(b.phase==='dash-charge'&&b.elapsed>=TYPE_B.dash.windup){
  const dx=b.target.x-b.x,dy=b.target.y-b.y,len=Math.hypot(dx,dy)||1;b.velocity={x:dx/len*TYPE_B.dash.speed,y:dy/len*TYPE_B.dash.speed};b.dashHit=false;change(b,'dash');
 }else if(b.phase==='dash'){
  const from={x:b.x,y:b.y};b.x+=b.velocity.x*dt;b.y+=b.velocity.y*dt;bounds(b);b.walking=true;b.walkPhase=(b.walkPhase+dt*7)%1;
  if(!b.dashHit)emit({type:'dash',x:from.x,y:from.y,toX:b.x,toY:b.y,radius:110,height:140,damage:TYPE_B.dash.damage});
  if(b.elapsed>=TYPE_B.dash.duration)change(b,'recover');
 }else if(b.phase==='laser-charge'&&b.elapsed>=TYPE_B.laser.windup){b.laserOrigin={x:b.x+b.dir*TYPE_B.laser.originOffset,y:b.y};change(b,'laser');}
 else if(b.phase==='laser'){
  while(b.strikes<Math.ceil(TYPE_B.laser.duration/TYPE_B.laser.interval)&&b.elapsed>=b.strikes*TYPE_B.laser.interval){b.strikes++;emit({type:'laser',...b.laserOrigin,dir:b.dir,...TYPE_B.laser,height:Infinity});}
  if(b.elapsed>=TYPE_B.laser.duration)change(b,'recover');
 }else if(b.phase==='oil-charge'&&b.elapsed>=TYPE_B.oil.windup){
  // Each patch has its own lifetime; the targeted one guarantees the threat remains relevant.
  const points=[{x:p.x,y:p.y},...Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7;return {x:b.x+Math.cos(a)*420,y:b.y+Math.sin(a)*160};})];
  b.oil.push(...points.map(q=>({x:clamp(q.x,150,2250),y:clamp(q.y,390,715),rx:TYPE_B.oil.rx,ry:TYPE_B.oil.ry,remaining:TYPE_B.oil.duration,duration:TYPE_B.oil.duration,flight:.55,fromX:b.x,fromY:b.y-150})));change(b,'oil');events.push({type:'oil-spray'});
 }else if(b.phase==='oil'&&b.elapsed>=.55)change(b,'recover');
 else if(b.phase==='recover'&&b.elapsed>=(b.stage===2?.28:TYPE_B.recover))change(b,'approach');
 return events;
}
export function typeBHit(e,p){
 if(p.z>=(e.height??Infinity))return false;
 if(e.type==='pizza')return !inPizzaSafeZone(p,e.sector,e.center);
 if(['debris','landing'].includes(e.type))return typeBContains(p,e);
 if(e.type==='slash')return Math.abs(p.y-e.y)<=e.halfLane&&(p.x-e.x)*e.dir>=-55&&(p.x-e.x)*e.dir<=e.range;
 if(e.type==='stomp'){const dx=(p.x-e.x)*e.dir,dy=(p.y-e.y)*2;return Math.hypot(dx,dy)<=e.range&&Math.abs(Math.atan2(dy,dx))<=e.halfAngle;}
 if(e.type==='laser')return Math.abs(p.y-e.y)<=e.halfLane&&(p.x-e.x)*e.dir>=0&&(p.x-e.x)*e.dir<=e.length;
 if(e.type==='bullet')return !e.shot.spent&&Math.abs(p.y-e.y)<=e.halfLane&&p.x>=Math.min(e.x,e.toX)-25&&p.x<=Math.max(e.x,e.toX)+25;
 if(e.type==='dash'){const dx=e.toX-e.x,dy=(e.toY-e.y)*2,len=dx*dx+dy*dy,t=len?clamp(((p.x-e.x)*dx+(p.y-e.y)*2*dy)/len,0,1):0;return Math.hypot(p.x-e.x-t*dx,(p.y-e.y)*2-t*dy)<=e.radius;}
 return false;
}
export function defeatTypeB(b){if(!b.dead||b.phase!=='defeated'||b.rewardGranted)return false;b.rewardGranted=true;return true;}
export const typeBCue=b=>b.phase==='awakening'?`B형이 각성하려고 합니다. B형에게 접근하여 각성을 막으세요! ${Math.max(0,10-b.elapsed).toFixed(1)}초`:
 b.phase.startsWith('pizza')?`피자 패턴 · ${b.pizzaDirection>0?'시계':'반시계'} 방향 · ${b.pizzaPulse+1}/4 방출${b.pizzaRemaining>1?` · ${b.pizzaRemaining}세트 남음`:''}`:
 ({hidden:'조용한 기계실… 앞으로 이동하세요','arrival-warning':'낙하 위험! 바닥 표시에서 벗어나세요','arrival-drop':'B형 낙하',approach:'검과 총구, 다리의 움직임을 확인하세요','slash-charge':'전방 광선검 준비',slash:'광선검 베기','gun-charge':'기관총 조준 · 사선에서 벗어나세요',gun:'기관총 연사','stomp-charge':'다리 찍기 · 전방 부채꼴 주의',stomp:'전방 충격파','quake-charge':'붉은 충전 · 고철 낙하 준비',quake:'고철 잔해 낙하 · 10초간 바닥 표시 주의','dash-charge':'표적 고정 · 돌진 경로에서 벗어나세요',dash:'6족 고속 돌진','laser-charge':'광선 충전 · 전방 긴 사선 주의',laser:'지속 레이저','oil-charge':'액체 살포 준비',oil:'점성 액체 · 이동속도 40% 감소',recover:'공격 기회',reboot:'기체 정지… 재부팅 감지',protocol:'섬멸 프로토콜 발동',shutdown:'각성 저지 성공!',awakened:'각성 저지 실패 · HP 완전 회복 / 공격력 2배',defeating:'B형 시스템 붕괴',defeated:'B형 격파'})[b.phase]||'';
