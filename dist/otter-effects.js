const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};

// Frame 9's mouth is measured in the original sheet, so outfit, facing and
// sprite scale use the same transform as the character instead of a HUD offset.
export function otterMouthPoint(x,y,z,dir,idol,width=1215,height=1295){
 const scale=178/(height/4)*.81,mouth=idol?{x:503,y:764,foot:917}:{x:501,y:756,foot:906};
 return {x:x+dir*(mouth.x-width*1.5/4)*scale,y:y-z+(mouth.y-mouth.foot)*scale};
}
export function waterJetPoint(e,t){
 const u=clamp(t,0,1),v=1-u;
 return {x:e.x+(e.toX-e.x)*u,y:v*v*e.y+2*v*u*(e.y-12)+u*u*e.toY};
}
export function drawWaterJet(ctx,e,camera){
 const progress=e.elapsed/e.travel,head=clamp(progress,0,1),tail=clamp((e.elapsed-e.travel*.7)/e.travel,0,1);
 if(head<=tail)return;
 ctx.save();ctx.globalAlpha=Math.min(1,e.life/.12);ctx.lineCap='round';
 const trace=(offset=0)=>{ctx.beginPath();for(let i=0;i<=24;i++){const t=tail+(head-tail)*i/24,p=waterJetPoint(e,t),ripple=Math.sin(t*29-e.elapsed*40)*1.6;const x=p.x-camera,y=p.y+ripple+offset;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}};
 trace();ctx.strokeStyle='#218ebca0';ctx.lineWidth=15;ctx.stroke();
 trace();ctx.strokeStyle='#54ccf5ef';ctx.lineWidth=10;ctx.stroke();
 trace(-2);ctx.strokeStyle='#eefcffed';ctx.lineWidth=3;ctx.stroke();
 trace(3);ctx.strokeStyle='#a0eaf2c0';ctx.lineWidth=2;ctx.stroke();
 // A moving, bright leading splash makes the launch readable before impact.
 const p=waterJetPoint(e,head);ctx.fillStyle='#d9fbff';ctx.beginPath();ctx.ellipse(p.x-camera,p.y,10,6,0,0,TAU);ctx.fill();
 for(let i=0;i<5;i++){const t=head-(head-tail)*noise(i+4),q=waterJetPoint(e,t),spread=(3+noise(i+18)*9)*Math.sin(t*Math.PI);ctx.fillStyle=i%3?'#a0eaf2b0':'#f1ffffe0';ctx.beginPath();ctx.ellipse(q.x-camera,q.y+(noise(i+8)-.5)*spread*2,2+noise(i)*3,1+noise(i+9)*2,-.3,0,TAU);ctx.fill();}
 ctx.restore();
}
export function drawWaterSplash(ctx,e,camera){
 const t=1-e.life/e.max;
 ctx.save();ctx.globalAlpha=Math.min(1,e.life/.12);ctx.translate(e.x-camera,e.y);
 for(let i=0;i<10;i++){const a=noise(i+61)*TAU,speed=20+noise(i+23)*65,r=t*speed,x=Math.cos(a)*r,y=Math.sin(a)*r*.7+35*t*t;ctx.fillStyle=i%3?'#8ddfead9':'#f2ffffe8';ctx.beginPath();ctx.ellipse(x,y,1.5+noise(i+2)*3,(2+noise(i+4)*4)*(1-t*.5),a+Math.PI/2,0,TAU);ctx.fill();}
 ctx.strokeStyle='#d6fcff';ctx.lineWidth=2*(1-t);ctx.beginPath();ctx.ellipse(0,5,t*34,t*12,0,0,TAU);ctx.stroke();ctx.restore();
}

export function drawWaterWave(ctx,w,camera,image){
 const time=w.elapsed,lane=w.skill.halfLane;
 ctx.save();ctx.translate(w.x-camera,w.y);ctx.scale(w.dir,1);
 if(image?.complete&&image.naturalWidth){
  const ground=ctx.createRadialGradient(0,0,5,0,0,lane);ground.addColorStop(0,'#8ce3ec26');ground.addColorStop(1,'#a9f3ff00');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(-10,0,88,lane+3,0,0,TAU);ctx.fill();
  // Slice distortion moves the crest and flowing face without changing the
  // attack lane or the sprite anchor. Transparent margins stay transparent.
  const width=205,height=lane*2+72,top=-lane-72,slices=24;
  const sourceTop=image.naturalHeight*.145,sourceHeight=image.naturalHeight*.74;
  for(let i=0;i<slices;i++){
   const sy=sourceTop+sourceHeight*i/slices,sh=sourceHeight/slices,y=top+height*i/slices,flow=Math.sin(time*9+i*.38)*2+Math.sin(time*5+i*.8);
   ctx.drawImage(image,0,sy,image.naturalWidth,sh,-119+flow,y,width,height/slices+.3);
  }
  // Spray drifts ahead of the breaking lip and settles independently.
  for(let i=0;i<8;i++){const t=(time*1.5+noise(i+270))%1,y=(noise(i+250)*2-1)*lane,x=28+t*35;ctx.globalAlpha=(1-t)*.65;ctx.fillStyle=i%3?'#efffff':'#94dce9';ctx.beginPath();ctx.ellipse(x,y-36-Math.sin(t*Math.PI)*15,2+noise(i+25)*2,3+noise(i+45)*3,.4,0,TAU);ctx.fill();}
  ctx.restore();return;
 }
 // A rounded drawn crest is a lightweight fallback if its art cannot load.
 const g=ctx.createLinearGradient(0,-110,0,lane);g.addColorStop(0,'#9fefff');g.addColorStop(.5,'#31bbee');g.addColorStop(1,'#147fc8b0');ctx.fillStyle=g;ctx.strokeStyle='#dfffff';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(-70,lane*.6);ctx.bezierCurveTo(-50,-30,-25,-125,33,-110);ctx.bezierCurveTo(80,-97,72,-55,45,-48);ctx.bezierCurveTo(60,-78,26,-95,15,-66);ctx.bezierCurveTo(-10,-6,20,lane*.65,65,lane*.8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
export function drawWaterOrb(ctx,x,y,r,elapsed,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(Math.sin(elapsed*3+x)*.06);
 const ry=r*(1+Math.sin(elapsed*4+x)*.035),g=ctx.createLinearGradient(-r,-ry,r,ry);
 g.addColorStop(0,'#aaf4ffb0');g.addColorStop(.5,'#44c8f5b8');g.addColorStop(1,'#198ddcc9');
 ctx.fillStyle=g;ctx.strokeStyle='#bbf7ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,r,ry,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.fillStyle='#f2ffffed';ctx.beginPath();ctx.ellipse(-r*.3,-ry*.4,r*.26,r*.14,-.5,0,TAU);ctx.fill();
 ctx.strokeStyle='#d6ffffa8';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.ellipse(0,0,r*.72,ry*.72,0,.35,1.5);ctx.stroke();
 ctx.restore();
}
export function drawWaterShield(ctx,x,y,elapsed){
 ctx.save();const g=ctx.createRadialGradient(x-24,y-28,4,x,y,80);g.addColorStop(0,'#f0ffff02');g.addColorStop(.6,'#8ae8f50a');g.addColorStop(.9,'#64c5d126');g.addColorStop(1,'#ccffff45');ctx.fillStyle=g;ctx.strokeStyle='#bdf3f48c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,57,77,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#f0ffffab';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,53,73,0,3.55,4.8);ctx.stroke();ctx.strokeStyle='#99e0e66b';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,55,75,0,.15+Math.sin(elapsed*2)*.1,1.4);ctx.stroke();ctx.restore();
}
