import {TYPE_B,isTypeB,typeBPizzaCharge} from './type-b.js?v=148';
const TAU=Math.PI*2;
function ellipse(ctx,x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function cone(ctx,x,y,dir,range,angle,color){ctx.save();ctx.translate(x,y);ctx.scale(dir,.5);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,range,-angle,angle);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#ff8768';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
export function drawTypeBFloor(ctx,b,camera,time){
 if(!isTypeB(b))return;ctx.save();ctx.translate(-camera,0);
 for(const s of b.oil){const age=s.duration-s.remaining;if(age<.55)continue;const alpha=Math.min(1,s.remaining)*.75;ctx.globalAlpha=alpha;ellipse(ctx,s.x,s.y,s.rx,s.ry,'#221e38cc','#c580d5');ellipse(ctx,s.x-20,s.y-8,s.rx*.55,s.ry*.4,'#65607d55');for(let i=0;i<5;i++){const a=time*1.2+i*1.8;ellipse(ctx,s.x+Math.cos(a)*s.rx*.6,s.y+Math.sin(a)*s.ry*.6,4+Math.sin(time*3+i)*2,2,'#bb92dccc');}ctx.globalAlpha=1;}
 for(const s of b.debris){const t=1-s.remaining/s.duration;ellipse(ctx,s.x,s.y,s.rx,s.ry,`rgba(255,52,42,${.13+t*.2})`,'#ff8369');ellipse(ctx,s.x,s.y,s.rx*t,s.ry*t,null,'#ffe096');ctx.strokeStyle='#ffb880';ctx.beginPath();ctx.moveTo(s.x-12,s.y-12);ctx.lineTo(s.x+12,s.y+12);ctx.moveTo(s.x+12,s.y-12);ctx.lineTo(s.x-12,s.y+12);ctx.stroke();}
 if(b.phase==='arrival-warning'||b.phase==='arrival-drop'){ellipse(ctx,b.x,b.y,220,125,'#ff343440','#ff8c70');ellipse(ctx,b.x,b.y,190+Math.sin(time*14)*15,105,null,'#ffd190');ctx.fillStyle='#ffd8ae';ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.fillText('⚠ 낙하 위험',b.x,b.y);}
 const x=b.x,y=b.y,p=b.phase;
 if(['slash-charge','gun-charge','laser-charge','laser'].includes(p)){
  const laser=p.startsWith('laser'),gun=p.startsWith('gun'),range=laser?TYPE_B.laser.length:gun?1600:TYPE_B.slash.range,half=laser?TYPE_B.laser.halfLane:gun?27:TYPE_B.slash.halfLane,start=laser?x+b.dir*TYPE_B.laser.originOffset:x;
  ctx.fillStyle=p==='laser'?'#ff492869':'#ff55362d';ctx.fillRect(b.dir>0?start:start-range,y-half,range,half*2);ctx.strokeStyle='#ffab79';ctx.lineWidth=2;ctx.strokeRect(b.dir>0?start:start-range,y-half,range,half*2);
 }
 if(['stomp-charge','quake-charge','stomp','quake'].includes(p))cone(ctx,x,y,b.dir,TYPE_B.stomp.range,TYPE_B.stomp.halfAngle,p.endsWith('charge')?'#ff6b3c35':'#ff7f6066');
 if(p==='dash-charge'&&b.target){ctx.strokeStyle='#ff635988';ctx.lineWidth=100;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(b.target.x,b.target.y);ctx.stroke();ctx.strokeStyle='#ffe5ba';ctx.lineWidth=2;ctx.stroke();ellipse(ctx,b.target.x,b.target.y,40,23,null,'#ffd59f');}
 if(p.startsWith('pizza')){
  const c=TYPE_B.center,flash=p==='pizza-release';ctx.save();ctx.beginPath();ctx.rect(TYPE_B.floor.minX,TYPE_B.floor.minY,TYPE_B.floor.maxX-TYPE_B.floor.minX,TYPE_B.floor.maxY-TYPE_B.floor.minY);ctx.clip();ctx.translate(c.x,c.y);ctx.scale(1,.5);
  for(let i=0;i<4;i++){const safe=i===b.safeSector;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,3000,-Math.PI/2+i*Math.PI/2-Math.PI/4,-Math.PI/2+i*Math.PI/2+Math.PI/4);ctx.closePath();ctx.fillStyle=safe?'#52c8ff59':flash?'#ff492cbd':'#ff39343d';ctx.fill();ctx.strokeStyle=safe?'#abeaff':'#ff7b64';ctx.lineWidth=3;ctx.stroke();}
  ellipse(ctx,0,0,24,24,'#ff463acc');ctx.restore();
  const a=-Math.PI/2+b.safeSector*Math.PI/2,sx=c.x+Math.cos(a)*150,sy=c.y+Math.sin(a)*75;
  ctx.fillStyle='#d6f6ff';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('안전',sx,sy);
 }
 ctx.restore();
}
export function typeBFrame(b){
 if(['reboot','defeating','defeated'].includes(b.phase))return 7;
 if(b.walking)return b.phase==='dash'?6:1;
 return {slash:2,'slash-charge':0,gun:3,'gun-charge':0,'stomp-charge':4,'quake-charge':4,stomp:5,quake:5,'arrival-drop':5,'pizza-jump':4,'laser-charge':3,laser:3,'oil-charge':3,oil:3,awakening:4,shutdown:7}[b.phase]??0;
}
export function drawTypeBBody(ctx,b,camera,images,time){
 if(!isTypeB(b)||b.phase==='hidden'||b.phase==='arrival-warning')return;
 const img=images['b-type-boss-v148'];if(!img?.complete||!img.naturalWidth)return;
 const x=b.x-camera,y=b.y-b.z,red=b.stage===2||b.phase==='quake-charge'||b.phase==='dash-charge'||(b.phase==='reboot'&&b.elapsed>2.8),scale=TYPE_B.height/400;
 ctx.save();ellipse(ctx,x,b.y,210,60,'#02040799');
 if(red){const glow=ctx.createRadialGradient(x,y-210,10,x,y-210,310);glow.addColorStop(0,'#ff302233');glow.addColorStop(1,'#ff221000');ctx.fillStyle=glow;ctx.fillRect(x-340,y-520,680,560);}
 ctx.translate(x,y);ctx.scale(b.dir,1);const bob=b.walking?Math.abs(Math.sin(b.walkPhase*TAU*3))*4:Math.sin(time*2)*1.2;ctx.translate(0,-bob);
 ctx.imageSmoothingEnabled=true;ctx.filter=red?'sepia(.45) saturate(2.8) hue-rotate(320deg)':b.hit>0?'brightness(1.5)':'none';
 const walk=images['b-type-walk-v148'],useWalk=b.walking&&walk?.complete&&walk.naturalWidth;
 if(useWalk){const frame=Math.floor(b.walkPhase*4)%4;ctx.drawImage(walk,frame*768,0,768,480,-384*scale,-442.5*scale,768*scale,480*scale);}
 else{const f=typeBFrame(b);ctx.drawImage(img,(f%4)*768,Math.floor(f/4)*480,768,480,-384*scale,-442.5*scale,768*scale,480*scale);}
 ctx.filter='none';
 if(['laser-charge','laser','awakening','protocol','pizza-charge'].includes(b.phase)){
  const laser=b.phase.startsWith('laser'),cx=laser?265:35,cy=laser?-310:-255,a=ctx.createRadialGradient(cx,cy,0,cx,cy,70);a.addColorStop(0,'#fffde9');a.addColorStop(.2,'#ff936f');a.addColorStop(1,'#ff3d1600');ctx.fillStyle=a;ctx.fillRect(cx-70,cy-70,140,140);
 }
 ctx.restore();
 if(b.phase==='pizza-charge'){
  ctx.save();ctx.translate(TYPE_B.center.x-camera,TYPE_B.center.y-12);ctx.scale(1,.5);ctx.strokeStyle='#ffe2b8';ctx.shadowColor='#ff5d32';ctx.shadowBlur=22;ctx.lineWidth=7;
  const progress=Math.min(1,b.elapsed/typeBPizzaCharge(b)),start=-Math.PI/2;ctx.beginPath();ctx.arc(0,0,115,start,start+b.pizzaDirection*progress*TAU,b.pizzaDirection<0);ctx.stroke();
  const a=start+b.pizzaDirection*progress*TAU;ctx.translate(Math.cos(a)*115,Math.sin(a)*115);ctx.rotate(a+b.pizzaDirection*Math.PI/2);ctx.fillStyle='#fff4dc';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-12,-10);ctx.lineTo(-12,10);ctx.closePath();ctx.fill();ctx.restore();
 }
 if(b.phase==='reboot'||b.phase==='defeating'){
  const t=b.elapsed;
  for(let i=0;i<8;i++){
   const cx=x+Math.sin(i*6.3)*180,cy=y-80-(i%4)*78,age=(t+i*.21)%1;
   ctx.save();ctx.globalAlpha=b.phase==='reboot'&&t>1.4?.45:1-age;
   const smoke=ctx.createRadialGradient(cx,cy,0,cx,cy,55+age*70);smoke.addColorStop(0,t<1.4?'#ffd596':'#7e8386');smoke.addColorStop(.3,t<1.4?'#ff6e30':'#6f757799');smoke.addColorStop(1,'#1b1e2100');ctx.fillStyle=smoke;ctx.fillRect(cx-130,cy-130,260,260);ctx.restore();
  }
 }
 if(b.failedAwakening){ctx.save();ctx.translate(x,b.y-200);ctx.strokeStyle='#ff4129';ctx.shadowColor='#ff2713';ctx.shadowBlur=18;ctx.lineWidth=3;for(let i=0;i<12;i++){const a=i*TAU/12+time*.12,r=210+Math.sin(time*7+i)*20;ctx.globalAlpha=.35+.3*Math.sin(time*5+i)**2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.8);ctx.lineTo(Math.cos(a+.035)*(r+35),Math.sin(a+.035)*(r+35)*.8);ctx.stroke();}ctx.restore();}
 if(b.phase==='awakening'){ctx.save();ctx.strokeStyle='#ff5949';ctx.lineWidth=4;ctx.setLineDash([14,8]);ellipse(ctx,x,b.y,TYPE_B.awakening.range,TYPE_B.awakening.range/1.5,null,'#ff7969');ctx.setLineDash([]);ctx.restore();}
}
export function drawTypeBAir(ctx,b,camera,time){
 if(!isTypeB(b))return;ctx.save();
 for(const s of b.debris){const t=1-s.remaining/s.duration,x=s.x-camera,y=s.y-(1-t)*650;ctx.save();ctx.translate(x,y);ctx.rotate(time*5+s.x);ctx.fillStyle='#8b919b';ctx.strokeStyle='#262f3d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,-24);ctx.lineTo(28,-9);ctx.lineTo(15,24);ctx.lineTo(-24,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#d09b72';ctx.fillRect(-4,-12,7,28);ctx.restore();}
 for(const s of b.projectiles){const x=s.x-camera;ctx.strokeStyle='#ffe7a3';ctx.lineWidth=4;ctx.shadowColor='#ff9b41';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(x-s.dir*28,s.y-45);ctx.lineTo(x,s.y-45);ctx.stroke();}
 if(b.phase==='laser'){
  const x=b.laserOrigin.x-camera,to=x+b.dir*TYPE_B.laser.length,y=b.laserOrigin.y-36;
  ctx.shadowBlur=25;ctx.shadowColor='#ff451f';ctx.strokeStyle='#ff9344';ctx.lineWidth=26;ctx.beginPath();ctx.moveTo(b.x-camera+b.dir*265,b.y-310);ctx.lineTo(x,y);ctx.stroke();ctx.strokeStyle='#fff4d5';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#ff441eaa';ctx.lineWidth=100;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(to,y);ctx.stroke();ctx.strokeStyle='#ffb250';ctx.lineWidth=35+Math.sin(time*50)*5;ctx.stroke();ctx.strokeStyle='#fff4d5';ctx.lineWidth=12;ctx.stroke();
 }
 for(const s of b.oil){const age=s.duration-s.remaining;if(age>=.55)continue;const t=age/.55,x=s.fromX+(s.x-s.fromX)*t-camera,y=s.fromY+(s.y-s.fromY)*t-Math.sin(t*Math.PI)*90;ellipse(ctx,x,y,15,11,'#b886df','#efe4ff');}
 ctx.restore();
}
