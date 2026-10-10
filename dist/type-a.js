// A-type encounter state is transient; no projectiles or phases survive leaving the room.
export const TYPE_A={name:'A형',level:40,hp:72000,maxHpDamage:.1,xp:12000,money:6000,cores:15,height:370,width:1800,
 blade:{windup:.6,range:300,halfLane:65,damage:155},gun:{windup:.65,count:8,interval:.14,speed:1150,damage:62},
 dash:{charge:.85,duration:.5,speed:1700,damage:195},bomb:{count:4,interval:.5,flight:.9,radius:105,damage:160},
 safety:{duration:5,rx:125,ry:55},spin:{duration:4,radius:250,tick:.4,damage:112,speed:85},pull:{radius:570,damage:52},recover:.85};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const phase=(b,name)=>{b.phase=name;b.elapsed=0;b.strikes=0;b.walking=false;};
export const isTypeA=b=>b?.kind==='type-a';
export const typeATargetable=b=>b.active&&!b.dead&&b.phase!=='safety';
export const inTypeASafeZone=(p,s)=>!!s&&((p.x-s.x)/s.rx)**2+((p.y-s.y)/s.ry)**2<=1;
export function createTypeA(){return {kind:'type-a',id:'type-a',isBoss:true,level:TYPE_A.level,x:1150,y:650,z:0,dir:-1,hp:TYPE_A.hp,maxHp:TYPE_A.hp,active:false,dead:false,rewardGranted:false,phase:'waiting',elapsed:0,strikes:0,walking:false,walkPhase:0,hit:0,projectiles:[],bombs:[],safetyUsed:false,safeZone:null,enraged:false};}
export function beginTypeA(b){if(b.active)return false;Object.assign(b,createTypeA(),{active:true,phase:'approach'});return true;}
function beginSafety(b,p){
 p=p.safetyTarget||p;
 b.safetyUsed=true;b.projectiles=[];b.bombs=[];
 // At most 420 horizontal units away; fully inside the walkable floor and reachable in 5 seconds.
 const x=clamp(p.x+(p.x<TYPE_A.width/2?420:-420),160,TYPE_A.width-160);
 b.safeZone={x,y:650,rx:TYPE_A.safety.rx,ry:TYPE_A.safety.ry};phase(b,'safety');
}
export function damageTypeA(b,damage,p){
 if(!typeATargetable(b))return 0;
 const before=b.hp;b.hp=Math.max(0,b.hp-Math.max(0,damage));
 // A large critical hit must not skip the mandatory safety phase.
 if(!b.safetyUsed&&b.hp<=b.maxHp*.4){b.hp=b.maxHp*.4;beginSafety(b,p);}
 if(b.safetyUsed&&b.hp<=b.maxHp*.2&&!b.enraged){b.enraged=true;if(b.hp>0){b.projectiles=[];b.bombs=[];phase(b,'enrage');}}
 b.hit=.16;return before-b.hp;
}
export function stepTypeA(b,dt,p,random=Math.random){
 const events=[];b.walking=false;if(!b.active||b.dead)return events;
 b.elapsed+=dt;b.hit=Math.max(0,b.hit-dt);
 if(!b.safetyUsed&&b.hp<=b.maxHp*.4){beginSafety(b,p);return events;}
 if(b.phase==='safety'){
  if(b.elapsed>=TYPE_A.safety.duration){events.push({type:'execution',safeZone:{...b.safeZone}});b.safeZone=null;phase(b,'recover');}
  return events;
 }
 if(!b.enraged&&b.hp<=b.maxHp*.2){b.enraged=true;phase(b,'enrage');b.projectiles=[];b.bombs=[];}
 for(const shot of b.projectiles){const from=shot.x;shot.life-=dt;shot.x+=shot.dir*TYPE_A.gun.speed*dt;events.push({type:'bullet',x:from,toX:shot.x,y:shot.y,damage:TYPE_A.gun.damage,height:100,halfLane:25,shot});}
 b.projectiles=b.projectiles.filter(s=>s.life>0&&!s.spent);
 for(const bomb of b.bombs){bomb.remaining-=dt;if(bomb.remaining<=0){events.push({type:'bomb',x:bomb.x,y:bomb.y,radius:TYPE_A.bomb.radius,damage:TYPE_A.bomb.damage,height:160});}}
 b.bombs=b.bombs.filter(s=>s.remaining>0);
 if(b.phase==='approach'){
  if(p.hidden){b.elapsed=0;return events;}
  const x=b.x,y=b.y,dx=p.x-b.x,dy=p.y-b.y,speed=b.enraged?360:230;b.dir=dx>=0?1:-1;
  if(Math.abs(dx)>220)b.x=clamp(b.x+Math.sign(dx)*Math.min(Math.abs(dx)-220,speed*dt),140,TYPE_A.width-140);
  b.y=clamp(b.y+Math.sign(dy)*Math.min(Math.abs(dy),speed*.5*dt),590,710);
  const d=Math.hypot(b.x-x,b.y-y);b.walking=d>.001;b.walkPhase=(b.walkPhase+d/220)%1;
  if(b.elapsed>=(b.enraged?.5:.95)){
   const patterns=(b.enraged?['blade','gun','dash','bomb','pull','spin']:['blade','gun','dash','bomb']).filter(name=>name!=='blade'||Math.abs(p.x-b.x)<=360);
   const next=patterns[Math.floor(random()*patterns.length)];
   phase(b,`${next}-charge`);b.target={x:p.x,y:p.y};
  }
 }else if(b.phase==='blade-charge'&&b.elapsed>=TYPE_A.blade.windup){phase(b,'blade');events.push({type:'blade',x:b.x,y:b.y,dir:b.dir,...TYPE_A.blade,height:75});}
 else if(b.phase==='blade'&&b.elapsed>.38)phase(b,'recover');
 else if(b.phase==='gun-charge'&&b.elapsed>=TYPE_A.gun.windup)phase(b,'gun');
 else if(b.phase==='gun'){
  while(b.strikes<TYPE_A.gun.count&&b.elapsed>=b.strikes*TYPE_A.gun.interval){b.strikes++;b.projectiles.push({x:b.x+b.dir*125,originX:b.x+b.dir*125,y:b.y,dir:b.dir,life:1.8,spent:false});events.push({type:'muzzle',x:b.x+b.dir*125,y:b.y-215,dir:b.dir});}
  if(b.elapsed>1.25)phase(b,'recover');
 }else if(b.phase==='dash-charge'&&b.elapsed>=TYPE_A.dash.charge){
  b.from={x:b.x,y:b.y};const dx=b.target.x-b.x,dy=b.target.y-b.y,len=Math.hypot(dx,dy)||1;b.velocity={x:dx/len*TYPE_A.dash.speed,y:dy/len*TYPE_A.dash.speed};b.dashHit=false;phase(b,'dash');
 }else if(b.phase==='dash'){
  const from={x:b.x,y:b.y};b.x=clamp(b.x+b.velocity.x*dt,140,TYPE_A.width-140);b.y=clamp(b.y+b.velocity.y*dt,590,710);
  if(!b.dashHit)events.push({type:'dash',x:from.x,y:from.y,toX:b.x,toY:b.y,radius:85,height:180,damage:TYPE_A.dash.damage});
  if(b.elapsed>=TYPE_A.dash.duration)phase(b,'recover');
 }else if(b.phase==='bomb-charge'&&b.elapsed>=.6)phase(b,'bomb');
 else if(b.phase==='bomb'){
  while(b.strikes<TYPE_A.bomb.count&&b.elapsed>=b.strikes*TYPE_A.bomb.interval){b.bombs.push({x:p.x,y:p.y,fromX:b.x,fromY:b.y-200,remaining:TYPE_A.bomb.flight,duration:TYPE_A.bomb.flight});b.strikes++;events.push({type:'bomb-launch'});}
  if(b.strikes===4&&b.bombs.length===0)phase(b,'recover');
 }else if(b.phase==='spin-charge'&&b.elapsed>=.7)phase(b,'spin');
 else if(b.phase==='spin'){
  const dx=p.x-b.x,dy=p.y-b.y,len=Math.hypot(dx,dy)||1;
  b.x=clamp(b.x+dx/len*TYPE_A.spin.speed*dt,140,TYPE_A.width-140);b.y=clamp(b.y+dy/len*TYPE_A.spin.speed*dt,590,710);
  while(b.strikes<10&&b.elapsed>=b.strikes*TYPE_A.spin.tick){b.strikes++;events.push({type:'spin',x:b.x,y:b.y,...TYPE_A.spin,height:180});}
  if(b.elapsed>=TYPE_A.spin.duration)phase(b,'recover');
 }else if(b.phase==='pull-charge'&&b.elapsed>=.7){events.push({type:'pull',x:b.x,y:b.y,...TYPE_A.pull,height:Infinity});phase(b,'pull');}
 else if(b.phase==='pull'&&b.elapsed>=.4)phase(b,'recover');
 else if(b.phase==='enrage'&&b.elapsed>=1)phase(b,'approach');
 else if(b.phase==='recover'&&b.elapsed>=(b.enraged?.38:TYPE_A.recover))phase(b,'approach');
 return events;
}
export function typeAHit(e,p){
 if(e.type==='execution')return !inTypeASafeZone(p,e.safeZone);
 if(p.z>=e.height)return false;
 if(e.type==='blade')return Math.abs(p.y-e.y)<=e.halfLane&&(p.x-e.x)*e.dir>=-40&&(p.x-e.x)*e.dir<=e.range;
 if(e.type==='bullet')return !e.shot.spent&&Math.abs(p.y-e.y)<=e.halfLane&&p.x>=Math.min(e.x,e.toX)-20&&p.x<=Math.max(e.x,e.toX)+20;
 if(e.type==='dash'){
  const dx=e.toX-e.x,dy=(e.toY-e.y)*1.5,len=dx*dx+dy*dy,t=len?clamp(((p.x-e.x)*dx+(p.y-e.y)*1.5*dy)/len,0,1):0;
  return Math.hypot(p.x-e.x-t*dx,(p.y-e.y)*1.5-t*dy)<e.radius;
 }
 return ['bomb','spin','pull'].includes(e.type)&&Math.hypot(p.x-e.x,(p.y-e.y)*1.5)<e.radius;
}
export function defeatTypeA(b){if(!b.active||b.dead||b.hp>0||b.rewardGranted)return false;b.hp=0;b.dead=true;b.active=false;b.rewardGranted=true;b.phase='defeated';b.projectiles=[];b.bombs=[];b.safeZone=null;return true;}
export const typeACue=b=>b.phase==='safety'?`안전지대를 찾으세요! ${Math.max(0,TYPE_A.safety.duration-b.elapsed).toFixed(1)}초`:
 ({waiting:'F · A형 가동하기',approach:'칼날과 총구의 방향을 확인하세요','blade-charge':'칼날 베기 준비 · 뒤로 피하거나 점프',blade:'전방 칼날 베기','gun-charge':'전방 기관총 준비 · 위아래로 피하세요',gun:'기관총 연사','dash-charge':'붉은 충전 · 돌진 경로에서 벗어나세요',dash:'고속 돌진','bomb-charge':'표적 폭격 준비',bomb:'0.5초 간격 4연속 폭격 · 계속 이동하세요',enrage:'광폭화 · 이동속도와 공격 빈도 증가','spin-charge':'회전 칼날 준비 · 멀리 떨어지세요',spin:'4초 회전 칼날 · 접근 금지','pull-charge':'자기장 준비 · 원형 범위 밖으로',pull:'자기장 흡인',recover:'공격 기회',defeated:'A형 격파'})[b.phase]||'';
