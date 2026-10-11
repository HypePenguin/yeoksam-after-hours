// Ground telegraphs, collision and effects share the same ellipse and fixed impact point.
export const ORB_ATTACK={range:700,preferred:310,retreat:175,charge:.6,flight:.85,cooldown:3.6,rx:90,ry:60,height:56};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function stepOrbCaster(m,dt,{target,visible,width}){
 m.attackCooldown=Math.max(0,(m.attackCooldown||0)-dt);
 if(!visible){m.cast=null;patrol(m,dt,width);return null;}
 if(m.cast){
  m.cast.elapsed+=dt;
  if(m.cast.elapsed<ORB_ATTACK.charge)return null;
  const locked=m.cast;m.cast=null;m.attackCooldown=ORB_ATTACK.cooldown;
  return {source:m,fromX:m.x+m.dir*42,fromY:m.y-72,x:locked.x,y:locked.y,elapsed:0,duration:ORB_ATTACK.flight,rx:ORB_ATTACK.rx,ry:ORB_ATTACK.ry,damage:m.attack};
 }
 const dx=target.x-m.x,dy=target.y-m.y,distance=Math.hypot(dx,dy*1.5);
 if(distance>ORB_ATTACK.range){patrol(m,dt,width);return null;}
 m.dir=dx>=0?1:-1;
 const beforeX=m.x,beforeY=m.y;
 if(distance>ORB_ATTACK.preferred){m.x=clamp(m.x+Math.sign(dx)*m.speed*dt,60,width-60);m.y=clamp(m.y+Math.sign(dy)*Math.min(Math.abs(dy),m.speed*.33*dt),580,720);}
 else if(distance<ORB_ATTACK.retreat)m.x=clamp(m.x-Math.sign(dx||m.dir)*m.speed*.7*dt,60,width-60);
 if(Math.hypot(m.x-beforeX,m.y-beforeY)>0)m.walkPhase=(m.walkPhase||0)+dt*m.speed/80;
 if(m.attackCooldown<=0){
  // Aim once, at the beginning of the warning. Moving afterwards dodges the shot.
  m.cast={x:clamp(target.x,45,width-45),y:clamp(target.y,580,720),elapsed:0};
 }
 return null;
}
function patrol(m,dt,width){
 const old=m.x;m.x=clamp(m.x+(m.dir||1)*m.speed*.7*dt,60,width-60);
 if(m.x===60||m.x===width-60){m.dir=m.x===60?1:-1;m.patrolY=580+Math.random()*140;}
 const dy=clamp(m.patrolY??m.y,580,720)-m.y;
 m.y=clamp(m.y+Math.sign(dy)*Math.min(Math.abs(dy),m.speed*.22*dt),580,720);
 if(m.x!==old)m.walkPhase=(m.walkPhase||0)+dt*m.speed/80;
}
export function orbBlastContains(orb,actor){return (actor.z||0)<ORB_ATTACK.height&&((actor.x-orb.x)/orb.rx)**2+((actor.y-orb.y)/orb.ry)**2<=1;}
export function orbFlightPoint(orb){
 const t=clamp(orb.elapsed/orb.duration,0,1);
 return {x:orb.fromX+(orb.x-orb.fromX)*t,y:orb.fromY+(orb.y-orb.fromY)*t-Math.sin(t*Math.PI)*135};
}
export function drawOrbWarning(ctx,orb,camera,progress,time){
 const x=orb.x-camera,y=orb.y;ctx.save();
 ctx.fillStyle='#db7fff28';ctx.strokeStyle='#f3b2ff';ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(x,y,orb.rx,orb.ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#f38aff33';ctx.beginPath();ctx.ellipse(x,y,orb.rx*clamp(progress,0,1),orb.ry*clamp(progress,0,1),0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#ffe0ff';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.lineDashOffset=-time*15;
 ctx.beginPath();ctx.ellipse(x,y,orb.rx,orb.ry,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.moveTo(x,y-8);ctx.lineTo(x,y+8);ctx.stroke();ctx.restore();
}
export function drawEnemyOrb(ctx,orb,camera){
 const p=orbFlightPoint(orb),x=p.x-camera,y=p.y;ctx.save();
 ctx.shadowColor='#ba7bff';ctx.shadowBlur=18;
 const glow=ctx.createRadialGradient(x-4,y-5,1,x,y,17);glow.addColorStop(0,'#ffffff');glow.addColorStop(.3,'#d2c4ff');glow.addColorStop(.7,'#995eff');glow.addColorStop(1,'#6630c500');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#d5b9ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,20,7,orb.elapsed*9,0,Math.PI*2);ctx.stroke();
 const prev=orbFlightPoint({...orb,elapsed:Math.max(0,orb.elapsed-.06)});
 ctx.strokeStyle='#b695ff88';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(prev.x-camera,prev.y);ctx.lineTo(x,y);ctx.stroke();ctx.restore();
}
