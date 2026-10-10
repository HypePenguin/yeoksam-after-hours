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
 trace();ctx.strokeStyle='#126b9180';ctx.lineWidth=15;ctx.stroke();
 trace();ctx.strokeStyle='#54c4e5dd';ctx.lineWidth=10;ctx.stroke();
 trace(-2);ctx.strokeStyle='#eefcffed';ctx.lineWidth=3;ctx.stroke();
 trace(3);ctx.strokeStyle='#a0eaf2c0';ctx.lineWidth=2;ctx.stroke();
 // A moving, bright leading splash makes the launch readable before impact.
 const p=waterJetPoint(e,head);ctx.fillStyle='#d9fbff';ctx.beginPath();ctx.ellipse(p.x-camera,p.y,10,6,0,0,TAU);ctx.fill();
 for(let i=0;i<12;i++){const t=head-(head-tail)*noise(i+4),q=waterJetPoint(e,t),spread=(3+noise(i+18)*9)*Math.sin(t*Math.PI);ctx.fillStyle=i%3?'#a0eaf2b0':'#f1ffffe0';ctx.beginPath();ctx.ellipse(q.x-camera,q.y+(noise(i+8)-.5)*spread*2,2+noise(i)*3,1+noise(i+9)*2,-.3,0,TAU);ctx.fill();}
 ctx.restore();
}
export function drawWaterSplash(ctx,e,camera){
 const t=1-e.life/e.max;
 ctx.save();ctx.globalAlpha=Math.min(1,e.life/.12);ctx.translate(e.x-camera,e.y);
 for(let i=0;i<22;i++){const a=noise(i+61)*TAU,speed=20+noise(i+23)*65,r=t*speed,x=Math.cos(a)*r,y=Math.sin(a)*r*.7+35*t*t;ctx.fillStyle=i%3?'#8ddfead9':'#f2ffffe8';ctx.beginPath();ctx.ellipse(x,y,1.5+noise(i+2)*3,(2+noise(i+4)*4)*(1-t*.5),a+Math.PI/2,0,TAU);ctx.fill();}
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
  const sourceTop=image.naturalHeight*.16,sourceHeight=image.naturalHeight*.665;
  for(let i=0;i<slices;i++){
   const sy=sourceTop+sourceHeight*i/slices,sh=sourceHeight/slices,y=top+height*i/slices,flow=Math.sin(time*9+i*.38)*2+Math.sin(time*5+i*.8);
   ctx.drawImage(image,0,sy,image.naturalWidth,sh,-119+flow,y,width,height/slices+.3);
  }
  // Spray drifts ahead of the breaking lip and settles independently.
  for(let i=0;i<28;i++){const t=(time*1.5+noise(i+270))%1,y=(noise(i+250)*2-1)*lane,x=28+t*35;ctx.globalAlpha=(1-t)*.65;ctx.fillStyle=i%3?'#efffff':'#94dce9';ctx.beginPath();ctx.ellipse(x,y-36-Math.sin(t*Math.PI)*15,1+noise(i+25)*1.5,2+noise(i+45)*2,.4,0,TAU);ctx.fill();}
  ctx.restore();return;
 }
 // The base occupies the same depth as the hit lane; the raised crest is
// height above it. This keeps a tall wave from disguising its ground footprint.
 const ground=ctx.createRadialGradient(0,0,4,0,0,lane);ground.addColorStop(0,'#6cd9e740');ground.addColorStop(1,'#a9f3ff00');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(-8,0,85,lane+4,0,0,TAU);ctx.fill();
 const crest=y=>-32+Math.sin(y*.035+time*5)*5;
 const height=y=>43+Math.cos(y/lane*Math.PI/2)*27+Math.sin(y*.045+time*6)*4;
 const faceX=y=>26+Math.sin(y*.037-time*5)*6;
 const body=ctx.createLinearGradient(-48,-60,40,12);body.addColorStop(0,'#79deed28');body.addColorStop(.4,'#278eafb8');body.addColorStop(.7,'#66d4e4c9');body.addColorStop(.9,'#d0f4f3ad');body.addColorStop(1,'#1f718ea8');ctx.fillStyle=body;
 ctx.beginPath();ctx.moveTo(-70,-lane);for(let i=0;i<=32;i++){const y=-lane+lane*2*i/32;ctx.lineTo(crest(y),y-height(y));}for(let i=32;i>=0;i--){const y=-lane+lane*2*i/32;ctx.lineTo(faceX(y),y);}ctx.lineTo(-70,lane);ctx.closePath();ctx.fill();
 // Rounded overhang and several thin reflections describe the curling water.
 for(let k=0;k<5;k++){ctx.beginPath();for(let i=0;i<=36;i++){const y=-lane+lane*2*i/36,x=crest(y)+k*9+Math.sin(y*.02+time*4)*2,py=y-height(y)+k*k*1.8;i?ctx.lineTo(x,py):ctx.moveTo(x,py);}ctx.strokeStyle=['#f3ffffdd','#caf9f6aa','#a0edf09e','#4cafc098','#c5f5f4a0'][k];ctx.lineWidth=k===0?5:2;ctx.stroke();}
 for(let k=0;k<16;k++){const y=-lane+lane*2*k/15,x=crest(y);ctx.strokeStyle='#d5f9f36a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+8,y-height(y)+5);ctx.bezierCurveTo(x+30,y-height(y)+12,faceX(y)-15,y-13,faceX(y),y);ctx.stroke();}
 // Foam breaks into small irregular flecks rather than a solid neon outline.
 for(let i=0;i<125;i++){const y=(noise(i+89)*2-1)*lane,x=crest(y)+(noise(i+4)-.5)*17,py=y-height(y)+(noise(i+56)-.5)*10+Math.sin(time*9+i)*2;ctx.globalAlpha=.5+noise(i+12)*.45;ctx.fillStyle=i%4?'#effffc':'#b1e9e7';ctx.beginPath();ctx.ellipse(x,py,1+noise(i+13)*4,.6+noise(i+71)*1.7,-.2,0,TAU);ctx.fill();}
 for(let i=0;i<45;i++){const y=(noise(i+250)*2-1)*lane,t=(time*1.4+noise(i+270))%1,x=crest(y)+t*45,py=y-height(y)-Math.sin(t*Math.PI)*18+t*height(y);ctx.globalAlpha=(1-t)*.7;ctx.fillStyle='#deffff';ctx.beginPath();ctx.ellipse(x,py,1+noise(i+25)*2,2+noise(i+45)*2,.4,0,TAU);ctx.fill();}
 ctx.globalAlpha=.65;ctx.strokeStyle='#e6fbf4';ctx.lineWidth=2;
 for(let k=0;k<3;k++){ctx.beginPath();for(let i=0;i<=30;i++){const y=-lane+lane*2*i/30,x=faceX(y)+k*8+Math.sin(y*.08+time*12)*3;i?ctx.lineTo(x,y+3):ctx.moveTo(x,y+3);}ctx.stroke();}
 ctx.restore();
}
export function drawWaterOrb(ctx,x,y,r,elapsed,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(Math.sin(elapsed*3+x)*.06);
 const ry=r*(1+Math.sin(elapsed*4+x)*.035),g=ctx.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r*1.08);
 g.addColorStop(0,'#f1ffff40');g.addColorStop(.38,'#c2f8ff24');g.addColorStop(.65,'#70d1e34d');g.addColorStop(.85,'#167390a6');g.addColorStop(.94,'#c8fcf9b9');g.addColorStop(1,'#4091ad9e');
 ctx.fillStyle=g;ctx.strokeStyle='#aceef3ae';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,0,r,ry,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#f3ffffe8';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.ellipse(0,0,r*.83,ry*.83,0,3.65,4.75);ctx.stroke();
 ctx.strokeStyle='#c9fffca6';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,0,r*.83,ry*.83,0,.35,1.6);ctx.stroke();
 ctx.fillStyle='#ffffffee';ctx.beginPath();ctx.ellipse(-r*.33,-ry*.5,r*.18,r*.08,-.6,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(r*.4,ry*.5,1.3,0,TAU);ctx.fill();
 ctx.strokeStyle='#bdfaf682';ctx.lineWidth=1;for(let k=0;k<3;k++){const py=r*(.12+k*.17);ctx.beginPath();ctx.moveTo(-r*.58,py);ctx.bezierCurveTo(-r*.15,py-5,0,py+Math.sin(elapsed*4+k)*3,r*.55,py-2);ctx.stroke();}
 ctx.restore();
}
export function drawWaterShield(ctx,x,y,elapsed){
 ctx.save();const g=ctx.createRadialGradient(x-24,y-28,4,x,y,80);g.addColorStop(0,'#f0ffff02');g.addColorStop(.6,'#8ae8f50a');g.addColorStop(.9,'#64c5d126');g.addColorStop(1,'#ccffff45');ctx.fillStyle=g;ctx.strokeStyle='#bdf3f48c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,57,77,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#f0ffffab';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,53,73,0,3.55,4.8);ctx.stroke();ctx.strokeStyle='#99e0e66b';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,55,75,0,.15+Math.sin(elapsed*2)*.1,1.4);ctx.stroke();ctx.restore();
}
