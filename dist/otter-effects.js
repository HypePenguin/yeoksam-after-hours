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
 // Keep the original side-on crest and flat footing. The newer art supplies
 // flowing colour inside this silhouette rather than dictating a diagonal shape.
 const crest=()=>{ctx.beginPath();ctx.moveTo(-80,4);ctx.bezierCurveTo(-55,-15,-23,-7,-2,-49);ctx.bezierCurveTo(25,-108,74,-78,50,-44);ctx.bezierCurveTo(50,-70,19,-66,16,-35);ctx.bezierCurveTo(13,-10,56,-15,77,1);ctx.closePath();};
 // The surface footprint uses the actual hit lane, not the crest's height.
 const ground=ctx.createLinearGradient(-85,0,85,0);ground.addColorStop(0,'#c6faff00');ground.addColorStop(.5,'#77e4ff20');ground.addColorStop(1,'#75ddf568');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(0,0,85,lane,0,0,TAU);ctx.fill();
 ctx.save();ctx.clip();ctx.lineCap='round';
 for(let i=0;i<9;i++){const y=(i-4)*lane*.22,spread=Math.sqrt(1-(y/lane)**2),flow=Math.sin(time*9+i)*3;ctx.strokeStyle=i%2?'#e1fbff9c':'#97eafa70';ctx.lineWidth=i%3===0?2.5:1.5;ctx.beginPath();ctx.moveTo(-64*spread,y);ctx.bezierCurveTo(-36*spread,y-4+flow,20*spread,y+5-flow,55*spread,y);ctx.stroke();}
 ctx.restore();
 // Foam at both Y boundaries makes the wider attack area readable.
 ctx.lineCap='round';ctx.strokeStyle='#c7faffad';ctx.lineWidth=2;
 for(const edge of [-1,1]){ctx.beginPath();ctx.moveTo(-12,edge*lane);ctx.bezierCurveTo(5,edge*(lane-5),17,edge*(lane-2),23,edge*lane);ctx.stroke();}
 // Small breaking wavelets fill the wider lane without turning it into a wall.
 for(const offset of [-.7,.7]){const y=offset*lane,flow=Math.sin(time*8+offset)*2;
  ctx.beginPath();ctx.moveTo(5,y+5);ctx.bezierCurveTo(20,y-3,25,y-30,47,y-26+flow);ctx.bezierCurveTo(64,y-24,65,y-9,52,y-7);ctx.quadraticCurveTo(55,y-24,42,y-19);ctx.bezierCurveTo(29,y-15,39,y+2,65,y+6);ctx.closePath();ctx.fillStyle='#88e5f54a';ctx.fill();ctx.strokeStyle='#c7faffad';ctx.lineWidth=2;ctx.stroke();
 }
 for(let i=0;i<9;i++){const y=(i-4)*lane/4,spread=Math.sqrt(Math.max(0,1-(y/lane)**2)),t=(time*2+noise(i+340))%1;ctx.globalAlpha=(1-t)*.65;ctx.fillStyle='#e9ffff';ctx.beginPath();ctx.ellipse(64*spread+t*7,y,2+t*2,1.5+t,0,0,TAU);ctx.fill();}ctx.globalAlpha=1;
 const g=ctx.createLinearGradient(0,-90,0,8);g.addColorStop(0,'#e0fcff');g.addColorStop(.4,'#6adcf5');g.addColorStop(.75,'#29bce3');g.addColorStop(1,'#1795c080');ctx.fillStyle=g;crest();ctx.fill();
 ctx.save();crest();ctx.clip();
 if(image?.complete&&image.naturalWidth){ctx.globalAlpha=.65;const flow=Math.sin(time*7)*3;ctx.drawImage(image,0,image.naturalHeight*.145,image.naturalWidth,image.naturalHeight*.74,-85+flow,-103,166,115);ctx.globalAlpha=1;}
 // Smooth cel-shaded ribbons move forward through the wave's face.
 ctx.lineCap='round';
 for(let i=0;i<4;i++){const offset=i*12,flow=Math.sin(time*8+i)*2;ctx.strokeStyle=i%2?'#b1f6ff9c':'#2ea6d06b';ctx.lineWidth=i%2?3:5;ctx.beginPath();ctx.moveTo(-69+flow,2-offset*.12);ctx.bezierCurveTo(-24,-9-offset*.25,3+flow,-29-offset,32,-62-offset*.2);ctx.stroke();}
 ctx.restore();
 ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#b7f3ff';ctx.lineWidth=2;crest();ctx.stroke();
 // A luminous breaking lip and small spray improve detail without a tall wall.
 ctx.beginPath();ctx.moveTo(-69,-1);ctx.bezierCurveTo(-40,-13,-18,-14,-2,-49);ctx.bezierCurveTo(25,-108,74,-78,50,-44);ctx.strokeStyle='#bff7ff';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#e9ffff';ctx.lineWidth=3;ctx.stroke();
 for(let i=0;i<7;i++){const t=(time*1.8+noise(i+270))%1,x=28+t*39,y=-54-Math.sin(t*Math.PI)*34+(noise(i+250)-.5)*16;ctx.globalAlpha=(1-t)*.7;ctx.fillStyle=i%3?'#eaffff':'#91e8f9';ctx.beginPath();ctx.ellipse(x,y,1.5+noise(i+25)*1.5,2+noise(i+45)*2,.3,0,TAU);ctx.fill();}
 ctx.restore();
}
export function drawWaterOrb(ctx,x,y,r,elapsed,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(Math.sin(elapsed*3+x)*.06);
 const ry=r*(1+Math.sin(elapsed*4+x)*.035),g=ctx.createLinearGradient(-r,-ry,r,ry);
 g.addColorStop(0,'#efffff28');g.addColorStop(.5,'#b0f2ff38');g.addColorStop(1,'#75dffb62');
 ctx.fillStyle=g;ctx.strokeStyle='#ddfcffc9';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,r,ry,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.fillStyle='#f2ffffed';ctx.beginPath();ctx.ellipse(-r*.3,-ry*.4,r*.26,r*.14,-.5,0,TAU);ctx.fill();
 ctx.strokeStyle='#d6ffffa8';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.ellipse(0,0,r*.72,ry*.72,0,.35,1.5);ctx.stroke();
 ctx.restore();
}
export function drawWaterShield(ctx,x,y,elapsed){
 ctx.save();const g=ctx.createRadialGradient(x-24,y-28,4,x,y,80);g.addColorStop(0,'#f0ffff02');g.addColorStop(.6,'#8ae8f50a');g.addColorStop(.9,'#64c5d126');g.addColorStop(1,'#ccffff45');ctx.fillStyle=g;ctx.strokeStyle='#bdf3f48c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,57,77,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.strokeStyle='#f0ffffab';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,53,73,0,3.55,4.8);ctx.stroke();ctx.strokeStyle='#99e0e66b';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,55,75,0,.15+Math.sin(elapsed*2)*.1,1.4);ctx.stroke();ctx.restore();
}
