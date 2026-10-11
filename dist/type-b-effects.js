import {TYPE_B,isTypeB,typeBPizzaCharge,typeBPizzaOpening,typeBArrivalFlash,typeBMuzzle,typeBFireRay} from './type-b.js?v=150';
const TAU=Math.PI*2;
function ellipse(ctx,x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function cone(ctx,x,y,dir,range,angle,color){ctx.save();ctx.translate(x,y);ctx.scale(dir,.5);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,range,-angle,angle);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#ff8768';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
export function drawTypeBFloor(ctx,b,camera,time){
 if(!isTypeB(b))return;ctx.save();ctx.translate(-camera,0);
 for(const s of b.oil){const age=s.duration-s.remaining;if(age<.55)continue;const alpha=Math.min(1,s.remaining)*.75;ctx.globalAlpha=alpha;ellipse(ctx,s.x,s.y,s.rx,s.ry,'#221e38cc','#c580d5');ellipse(ctx,s.x-20,s.y-8,s.rx*.55,s.ry*.4,'#65607d55');for(let i=0;i<5;i++){const a=time*1.2+i*1.8;ellipse(ctx,s.x+Math.cos(a)*s.rx*.6,s.y+Math.sin(a)*s.ry*.6,4+Math.sin(time*3+i)*2,2,'#bb92dccc');}ctx.globalAlpha=1;}
 for(const s of b.debris){const t=1-s.remaining/s.duration;ellipse(ctx,s.x,s.y,s.rx,s.ry,`rgba(255,52,42,${.13+t*.2})`,'#ff8369');ellipse(ctx,s.x,s.y,s.rx*t,s.ry*t,null,'#ffe096');ctx.strokeStyle='#ffb880';ctx.beginPath();ctx.moveTo(s.x-12,s.y-12);ctx.lineTo(s.x+12,s.y+12);ctx.moveTo(s.x+12,s.y-12);ctx.lineTo(s.x-12,s.y+12);ctx.stroke();}
 if(b.phase==='arrival-warning'||b.phase==='arrival-drop'){
  const f=TYPE_B.floor,alpha=typeBArrivalFlash(b);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#ff1624';ctx.fillRect(f.minX,f.minY,f.maxX-f.minX,f.maxY-f.minY);ctx.strokeStyle='#ff9582';ctx.lineWidth=7;ctx.strokeRect(f.minX,f.minY,f.maxX-f.minX,f.maxY-f.minY);
  ctx.beginPath();ctx.rect(f.minX,f.minY,f.maxX-f.minX,f.maxY-f.minY);ctx.clip();ctx.strokeStyle='#ffb8a3';ctx.lineWidth=10;for(let x=f.minX-400;x<f.maxX+400;x+=120){ctx.beginPath();ctx.moveTo(x,f.maxY);ctx.lineTo(x+390,f.minY);ctx.stroke();}ctx.restore();
 }
 const x=b.x,y=b.y,p=b.phase;
 if(p==='slash-charge'){ctx.fillStyle='#ff55362d';ctx.fillRect(b.dir>0?x:x-TYPE_B.slash.range,y-TYPE_B.slash.halfLane,TYPE_B.slash.range,TYPE_B.slash.halfLane*2);}
 if(['stomp-charge','quake-charge','stomp','quake'].includes(p))cone(ctx,x,y,b.dir,TYPE_B.stomp.range,TYPE_B.stomp.halfAngle,p.endsWith('charge')?'#ff6b3c35':'#ff7f6066');
 if(p==='dash-charge'&&b.target){ctx.strokeStyle='#ff635988';ctx.lineWidth=100;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(b.target.x,b.target.y);ctx.stroke();ctx.strokeStyle='#ffe5ba';ctx.lineWidth=2;ctx.stroke();ellipse(ctx,b.target.x,b.target.y,40,23,null,'#ffd59f');}
 // No colored safe-zone preview: only the three damaging sectors flare on release.
 for(const e of b.impacts||[])if(e.type==='pizza'){
  const c=TYPE_B.center,t=1-e.life/e.max;ctx.save();ctx.globalAlpha=(1-t)**1.5;ctx.beginPath();ctx.rect(TYPE_B.floor.minX,TYPE_B.floor.minY,TYPE_B.floor.maxX-TYPE_B.floor.minX,TYPE_B.floor.maxY-TYPE_B.floor.minY);ctx.clip();ctx.translate(c.x,c.y);ctx.scale(1,.5);
  for(let i=0;i<4;i++)if(i!==e.sector){const a=-Math.PI/2+i*Math.PI/2;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,3000,a-Math.PI/4,a+Math.PI/4);ctx.closePath();const g=ctx.createRadialGradient(0,0,0,0,0,1200);g.addColorStop(0,'#fff4b5ee');g.addColorStop(.12,'#ff9d39db');g.addColorStop(.45,'#ff302ea8');g.addColorStop(1,'#b60e1844');ctx.fillStyle=g;ctx.fill();
   ctx.strokeStyle='#ffe6a9';ctx.shadowColor='#ff472b';ctx.shadowBlur=16;ctx.lineWidth=4;for(let k=0;k<9;k++){const ray=a-Math.PI/4+(k+.5)/9*Math.PI/2,r=150+t*1450;ctx.beginPath();ctx.moveTo(Math.cos(ray)*r*.55,Math.sin(ray)*r*.55);ctx.lineTo(Math.cos(ray)*r,Math.sin(ray)*r);ctx.stroke();}}
  ctx.restore();
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
 const gun=b.phase==='gun',firing=b.phase==='laser',charge=b.phase.endsWith('charge'),recoil=gun?Math.exp(-(b.elapsed%TYPE_B.gun.interval)*45):firing?.5+.5*Math.sin(time*55):0;
 if(recoil)ctx.translate(-recoil*5,-recoil*2);
 const pulse=(b.impacts||[]).filter(e=>['landing','pizza'].includes(e.type)).reduce((v,e)=>Math.max(v,(e.life/e.max)**3),0);ctx.scale(1+pulse*.035,1-pulse*.025);
 if(charge)ctx.scale(1+Math.sin(b.elapsed*9)*.005,1+Math.sin(b.elapsed*9)*.003);
 ctx.imageSmoothingEnabled=true;ctx.filter=red?'sepia(.45) saturate(2.8) hue-rotate(320deg)':b.hit>0?'brightness(1.6) contrast(1.1)':'brightness(1.08) contrast(1.1) saturate(1.15)';
 const walk=images['b-type-walk-v148'],useWalk=b.walking&&walk?.complete&&walk.naturalWidth;
 if(useWalk){const frame=Math.floor(b.walkPhase*4)%4;ctx.drawImage(walk,frame*768,0,768,480,-384*scale,-442.5*scale,768*scale,480*scale);}
 else{const f=typeBFrame(b);ctx.drawImage(img,(f%4)*768,Math.floor(f/4)*480,768,480,-384*scale,-442.5*scale,768*scale,480*scale);}
 ctx.filter='none';
 if(['laser-charge','laser','awakening','protocol','pizza-charge'].includes(b.phase)){
  const laser=b.phase.startsWith('laser'),cx=laser?265:35,cy=laser?-310:-255,a=ctx.createRadialGradient(cx,cy,0,cx,cy,70);a.addColorStop(0,'#fffde9');a.addColorStop(.2,'#ff936f');a.addColorStop(1,'#ff3d1600');ctx.fillStyle=a;ctx.fillRect(cx-70,cy-70,140,140);
 }
 ctx.restore();
 if(b.phase==='pizza-charge'&&typeBPizzaOpening(b)){
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
export function drawTypeBAir(ctx,b,camera,time,images={}){
 if(!isTypeB(b))return;ctx.save();
 for(const s of b.debris){
  const fall=TYPE_B.quake.fall,t=Math.max(0,1-s.remaining/fall);if(t<=0)continue;
  const altitude=(1-t*t)*850,x=s.x-camera,y=s.y-altitude,stretch=1+t*.28,img=images['b-type-debris-v150'];
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffab65';ctx.shadowColor='#ff5525';ctx.shadowBlur=18;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x-10,y-190);ctx.lineTo(x,y-12);ctx.stroke();ctx.strokeStyle='#ffe7b2';ctx.lineWidth=2;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(x+(k-1)*27,y-250-k*25);ctx.lineTo(x+(k-1)*18,y-45);ctx.stroke();}ctx.restore();
  ctx.save();ctx.translate(x,y);ctx.rotate((s.spin||0)+t*1.5);ctx.scale(1,stretch);ctx.shadowColor='#ff6b32';ctx.shadowBlur=8;
  if(img?.complete&&img.naturalWidth){const cell=img.naturalWidth/2,row=img.naturalHeight/2,n=s.variant||0;ctx.drawImage(img,(n%2)*cell,Math.floor(n/2)*row,cell,row,-68,-68,136,136);}
  else{ctx.fillStyle='#b0b9c6';ctx.fillRect(-24,-35,48,70);}ctx.restore();
 }
 for(const e of b.impacts||[])if(['landing','debris'].includes(e.type)){
  const t=1-e.life/e.max,x=e.x-camera,y=e.y,size=e.type==='landing'?1400:e.rx*1.8;ctx.save();ctx.globalAlpha=(1-t)**2;ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffad69';ctx.shadowColor='#ff481e';ctx.shadowBlur=20;ctx.lineWidth=12*(1-t)+2;ellipse(ctx,x,y,size*t,size*t*.35,null,'#ffe6b0');ctx.restore();
  ctx.save();ctx.globalAlpha=(1-t)*.6;for(let k=0;k<10;k++){const a=k*TAU/10,r=30+t*(e.type==='landing'?330:110),g=ctx.createRadialGradient(x+Math.cos(a)*r,y+Math.sin(a)*r*.35,0,x+Math.cos(a)*r,y+Math.sin(a)*r*.35,18+t*32);g.addColorStop(0,'#c6b59a99');g.addColorStop(1,'#69513c00');ctx.fillStyle=g;ctx.fillRect(x+Math.cos(a)*r-60,y+Math.sin(a)*r*.35-60,120,120);}ctx.restore();
 }
 for(const s of b.projectiles){const x=s.x-camera,y=s.y;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ff9b3c';ctx.lineWidth=10;ctx.shadowColor='#ff7c2a';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(x-s.vx*55,y-s.vy*55);ctx.lineTo(x,y);ctx.stroke();ctx.strokeStyle='#fff6ce';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
 if(['gun-charge','laser-charge'].includes(b.phase)&&b.target){const ray=typeBFireRay(b,b.target,TYPE_B.laser.length),tx=b.target.x-camera,ty=b.target.y-65;ctx.save();ctx.strokeStyle='#ff816475';ctx.lineWidth=2;ctx.setLineDash([18,14]);ctx.beginPath();ctx.moveTo(ray.start.x-camera,ray.start.y);ctx.lineTo(ray.end.x-camera,ray.end.y);ctx.stroke();ctx.setLineDash([]);ctx.translate(tx,ty);ctx.rotate(time*1.5);ellipse(ctx,0,0,24,24,null,'#ffb294');for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(29,0);ctx.lineTo(39,0);ctx.stroke();}ctx.restore();}
 if(b.phase==='gun'){
  const m=typeBMuzzle(b),pulse=Math.exp(-(b.elapsed%TYPE_B.gun.interval)*40);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=pulse;ctx.translate(m.x-camera,m.y);ctx.rotate(Math.atan2(b.target.y-65-m.y,b.target.x-m.x));ctx.fillStyle='#fff4b3';ctx.shadowColor='#ff8127';ctx.shadowBlur=24;ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(70,-19);ctx.lineTo(46,0);ctx.lineTo(70,19);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.restore();
 }
 if(b.phase==='laser'&&b.laserRay){
  const ray=b.laserRay,a=ray.start,z=ray.end,x=a.x-camera,y=a.y,len=Math.hypot(z.x-a.x,z.y-a.y),angle=Math.atan2(z.y-a.y,z.x-a.x),strength=Math.min(1,b.elapsed/.12,(TYPE_B.laser.duration-b.elapsed)/.18),half=TYPE_B.laser.halfLane;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.max(0,strength);const g=ctx.createLinearGradient(0,-half,0,half);g.addColorStop(0,'#ff342100');g.addColorStop(.22,'#ff4d3270');g.addColorStop(.42,'#ffbc6adf');g.addColorStop(.5,'#fffdefff');g.addColorStop(.58,'#ffbc6adf');g.addColorStop(.78,'#ff4d3270');g.addColorStop(1,'#ff342100');ctx.fillStyle=g;ctx.shadowColor='#ff6929';ctx.shadowBlur=24;ctx.fillRect(0,-half,len,half*2);
  ctx.strokeStyle='#fff4c7';ctx.lineWidth=2;for(let k=0;k<5;k++){const start=(time*1200+k*370)%len;ctx.beginPath();ctx.moveTo(start,-half*.65+Math.sin(time*16+k)*4);ctx.lineTo(Math.min(len,start+120),-half*.65+Math.sin(time*16+k)*4);ctx.stroke();}ellipse(ctx,0,0,38,28,'#fff0bce6');ctx.restore();
 }
 for(const s of b.oil){const age=s.duration-s.remaining;if(age>=.55)continue;const t=age/.55,x=s.fromX+(s.x-s.fromX)*t-camera,y=s.fromY+(s.y-s.fromY)*t-Math.sin(t*Math.PI)*90;ellipse(ctx,x,y,15,11,'#b886df','#efe4ff');}
 ctx.restore();
}
export function drawTypeBScreen(ctx,b,width,height,time){
 if(!isTypeB(b)||!b.active)return;ctx.save();
 const pulse=(b.impacts||[]).filter(e=>e.type==='pizza'||e.type==='landing').reduce((v,e)=>Math.max(v,e.life/e.max),0),red=b.stage===2;
 const g=ctx.createRadialGradient(width*.5,height*.48,height*.16,width*.5,height*.48,Math.max(width,height)*.65);g.addColorStop(0,'#00000000');g.addColorStop(.65,`rgba(${red?'88,12,10':'14,24,36'},${.03+pulse*.06})`);g.addColorStop(1,`rgba(${red?'130,14,12':'0,4,10'},${.14+pulse*.16})`);ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 if(pulse){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=pulse*.09;ctx.fillStyle='#ffd3aa';ctx.fillRect(0,0,width,height);}ctx.restore();
}
