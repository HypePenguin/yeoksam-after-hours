// Encounter state is deliberately transient: leaving the room always starts a fresh duel.
export const SOLDIER = {
 name:'신원미상의 예비군',level:25,hp:30000,xp:3500,potionCooldown:10,
 slash:{windup:.42,interval:.26,range:205,halfLane:52,damage:84},
 palm:{charge:.8,speed:1680,length:1600,halfLane:64,damage:144,duration:1.4,interval:.35},
 ambush:{charge:.6,flight:.46,landing:.42,interval:.2,range:240,halfLane:60,damage:48},
 landing:{range:180,halfLane:90,height:65,damage:96},
 counter:{windup:.7,duration:3,minDamage:60,maxDamage:180,ratio:.75},recover:.72
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createSoldier(){
 return {id:'soldier-seunghyun',isBoss:true,x:1040,y:650,z:0,dir:-1,level:SOLDIER.level,hp:SOLDIER.hp,maxHp:SOLDIER.hp,hit:0,dead:false,active:false,rewardGranted:false,phase:'waiting',elapsed:0,order:0,strikes:0,projectiles:[],target:null,walking:false,walkPhase:0};
}
export const targetableBoss=b=>b.active&&!b.dead&&b.phase!=='leap';
export const counterDamage=(b,damage)=>targetableBoss(b)&&b.phase==='counter'&&damage>0?Math.round(clamp(damage*SOLDIER.counter.ratio,SOLDIER.counter.minDamage,SOLDIER.counter.maxDamage)):0;
function phase(b,next){b.phase=next;b.elapsed=0;b.strikes=0;b.walking=false;b.walkPhase=0;}
export function beginSoldier(b){if(b.active)return false;Object.assign(b,createSoldier(),{active:true,phase:'approach'});return true;}
export function stepSoldier(b,dt,p){
 const events=[];b.walking=false;if(!b.active||b.dead){b.walkPhase=0;return events;}
 b.elapsed+=dt;b.hit=Math.max(0,b.hit-dt);
 for(const shot of b.projectiles){
  shot.originX??=shot.x;const from=shot.originX;
  shot.hitCooldown=Math.max(0,(shot.hitCooldown||0)-dt);
  shot.life-=dt;if(shot.life<=0)continue;
  shot.x=shot.originX+shot.dir*Math.min(SOLDIER.palm.length,Math.abs(shot.x-shot.originX)+SOLDIER.palm.speed*dt);
  shot.length=Math.min(SOLDIER.palm.length,Math.abs(shot.x-shot.originX));
  events.push({type:'wave',x:from,toX:shot.x,y:shot.y,dir:shot.dir,damage:SOLDIER.palm.damage,height:150,halfLane:SOLDIER.palm.halfLane,shot});
 }
 b.projectiles=b.projectiles.filter(s=>s.life>0&&!s.spent);
 if(b.phase==='approach'){
  const beforeX=b.x,beforeY=b.y,dx=p.x-b.x,dy=p.y-b.y;b.dir=dx>=0?1:-1;
  if(Math.abs(dx)>155)b.x=clamp(b.x+Math.sign(dx)*250*dt,160,1440);
  b.y=clamp(b.y+Math.sign(dy)*Math.min(Math.abs(dy),155*dt),580,720);
  if((Math.abs(dx)<185&&Math.abs(dy)<28&&b.elapsed>.28)||b.elapsed>1.25){
   // One counter per ten patterns; each offensive pattern appears three times.
   const cycle=['slash','palm','ambush','slash','palm','ambush','counter','slash','palm','ambush'];
   let move=cycle[b.order++%cycle.length];
   if(move==='slash'&&Math.abs(dx)>250)move='palm';
   phase(b,move==='slash'?'slash-windup':move==='palm'?'palm-charge':move==='counter'?'counter-windup':'leap-charge');
  }
  const distance=Math.hypot(b.x-beforeX,b.y-beforeY);
  b.walking=b.phase==='approach'&&distance>.001;
  b.walkPhase=b.walking?(b.walkPhase+distance/160)%1:0;
 }else if(b.phase==='slash-windup'&&b.elapsed>=SOLDIER.slash.windup)phase(b,'slash');
 else if(b.phase==='slash'||b.phase==='flurry'){
  const flurry=b.phase==='flurry',count=flurry?5:2,move=flurry?SOLDIER.ambush:SOLDIER.slash,interval=move.interval;
  while(b.strikes<count&&b.elapsed>=b.strikes*interval){
   events.push({type:'melee',x:b.x,y:b.y,dir:b.dir,range:move.range,halfLane:move.halfLane,height:flurry?135:52,damage:move.damage,index:b.strikes++});
  }
  if(b.elapsed>=(count-1)*interval+.2)phase(b,'recover');
 }else if(b.phase==='counter-windup'&&b.elapsed>=SOLDIER.counter.windup)phase(b,'counter');
 else if(b.phase==='counter'&&b.elapsed>=SOLDIER.counter.duration)phase(b,'recover');
 else if(b.phase==='palm-charge'&&b.elapsed>=SOLDIER.palm.charge){
  const x=b.x+b.dir*64;b.projectiles.push({x,originX:x,length:0,y:b.y,dir:b.dir,life:SOLDIER.palm.duration,hitCooldown:0,spent:false});phase(b,'palm-release');events.push({type:'cast'});
 }else if(b.phase==='palm-release'&&b.elapsed>=SOLDIER.palm.duration)phase(b,'recover');
 else if(b.phase==='leap-charge'&&b.elapsed>=SOLDIER.ambush.charge){
  // At a wall, land on the open side rather than overlapping the player.
  let landingX=clamp(p.x-p.facing*125,160,1440);
  if(Math.abs(landingX-p.x)<85)landingX=clamp(p.x+p.facing*125,160,1440);
  b.target={x:landingX,y:p.y,dir:p.x>=landingX?1:-1};
  b.from={x:b.x,y:b.y};phase(b,'leap');
 }else if(b.phase==='leap'){
  const t=clamp(b.elapsed/SOLDIER.ambush.flight,0,1),ease=t*t*(3-2*t);
  b.x=b.from.x+(b.target.x-b.from.x)*ease;b.y=b.from.y+(b.target.y-b.from.y)*ease;b.z=Math.sin(t*Math.PI)*280;
  if(t>=1){b.z=0;b.dir=b.target.dir;phase(b,'landing');events.push({type:'land',x:b.x,y:b.y,...SOLDIER.landing});}
 }else if(b.phase==='landing'&&b.elapsed>=SOLDIER.ambush.landing)phase(b,'flurry');
 else if(b.phase==='recover'&&b.elapsed>=SOLDIER.recover){b.target=null;phase(b,'approach');}
 if(b.phase!=='approach')b.walkPhase=0;
 return events;
}
export function soldierHit(attack,p){
 if(p.z>=attack.height||Math.abs(p.y-attack.y)>attack.halfLane)return false;
 if(attack.type==='land')return ((p.x-attack.x)/attack.range)**2+((p.y-attack.y)/attack.halfLane)**2<=1;
 if(attack.type==='wave')return !attack.shot.spent&&p.x>=Math.min(attack.x,attack.toX)-28&&p.x<=Math.max(attack.x,attack.toX)+28;
 const front=(p.x-attack.x)*attack.dir;
 return front>=-22&&front<=attack.range;
}
export function defeatSoldier(b){
 if(!b.active||b.dead||b.rewardGranted||b.hp>0)return false;
 b.hp=0;b.dead=true;b.active=false;b.rewardGranted=true;b.phase='defeated';b.z=0;b.projectiles=[];b.target=null;b.walking=false;b.walkPhase=0;
 return true;
}
export const soldierCue=b=>b.phase==='counter'?`반격 중 ${Math.max(0,SOLDIER.counter.duration-b.elapsed).toFixed(1)}초 · 공격을 멈추세요!`:({waiting:'말을 걸어 결투를 시작하세요',approach:'거리를 유지하며 빈틈을 노리세요','slash-windup':'검 2연격 · 뒤로 빠지거나 점프',slash:'검 2연격','palm-charge':'백색 장풍 준비 · 위아래로 공격선을 피하세요','palm-release':'지속 장풍 · 범위에서 즉시 벗어나세요', 'leap-charge':'공중 기습 준비',leap:'등 뒤 착지 표시에서 벗어나세요',landing:'기습 연격 임박 · 이동 / 돌진 / 막기',flurry:'기습 5연격','counter-windup':'칼 돌리기 · 곧 3초간 반격, 공격 준비를 멈추세요',recover:'공격 기회',defeated:'결투 승리'})[b.phase]||'';
