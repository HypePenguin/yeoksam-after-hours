// Visuals use encounter time; they never alter collision, damage or summon lifetime.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export function bottlePoint(b,t){t=clamp(t,0,1);return {x:b.x+(b.toX-b.x)*t,y:b.y+(b.toY-b.y)*t-90*Math.sin(Math.PI*t)};}
function flame(ctx,x,y,w,h,phase,alpha=1){
 const bend=Math.sin(phase)*w*.7;
 ctx.save();ctx.translate(x,y);ctx.globalAlpha*=alpha;
 const g=ctx.createLinearGradient(0,0,bend,-h);g.addColorStop(0,'#ff3f0c');g.addColorStop(.35,'#ff911a');g.addColorStop(.7,'#ffd66c');g.addColorStop(1,'#ffefb000');ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-w,0);
 ctx.bezierCurveTo(-w*1.45,-h*.18,-w*.2,-h*.23,-w*.7,-h*.48);
 ctx.bezierCurveTo(-w*.2,-h*.4,bend-w*.55,-h*.58,bend,-h);
 ctx.bezierCurveTo(bend+w*.2,-h*.66,w*.1,-h*.51,w*.48,-h*.38);
 ctx.quadraticCurveTo(w*.7,-h*.46,w*.66,-h*.63);
 ctx.bezierCurveTo(w*1.75,-h*.36,w*1.25,-h*.18,w,0);ctx.closePath();ctx.fill();
 const core=ctx.createLinearGradient(0,0,0,-h*.5);core.addColorStop(0,'#fff9d4');core.addColorStop(.5,'#ffe185');core.addColorStop(1,'#ffd37100');ctx.fillStyle=core;
 ctx.beginPath();ctx.moveTo(-w*.45,0);ctx.bezierCurveTo(-w*.8,-h*.12,bend*.25-w*.12,-h*.22,bend*.45,-h*.5);ctx.bezierCurveTo(bend*.15+w*.3,-h*.28,w*.7,-h*.1,w*.45,0);ctx.fill();ctx.restore();
}
function smoke(ctx,x,y,size,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,size);g.addColorStop(0,`rgba(64,55,50,${alpha})`);g.addColorStop(.65,`rgba(88,79,72,${alpha*.5})`);g.addColorStop(1,'rgba(85,77,70,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,size,0,TAU);ctx.fill();}
export function drawMolotov(ctx,b,camera,time){
 const t=clamp(b.elapsed/b.duration,0,1),p=bottlePoint(b,t),dir=Math.sign(b.toX-b.x)||1;
 ctx.save();
 for(let i=1;i<=7;i++){const q=bottlePoint(b,Math.max(0,t-i*.023));ctx.globalAlpha=(1-i/8)*.42;ctx.fillStyle=i%2?'#ffd994':'#ff7827';ctx.beginPath();ctx.arc(q.x-camera,q.y,Math.max(1,3-i*.25),0,TAU);ctx.fill();}
 ctx.globalAlpha=1;ctx.translate(p.x-camera,p.y);ctx.rotate(dir*(t*TAU*1.2+.35));
 const glass=ctx.createLinearGradient(-9,0,9,0);glass.addColorStop(0,'#123b24');glass.addColorStop(.35,'#63a75c');glass.addColorStop(.65,'#36753d');glass.addColorStop(1,'#0b2d20');ctx.fillStyle=glass;ctx.strokeStyle='#bce6a8';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(-3,-20);ctx.lineTo(3,-20);ctx.lineTo(3,-11);ctx.bezierCurveTo(3,-8,9,-8,9,-3);ctx.lineTo(9,13);ctx.quadraticCurveTo(0,18,-9,13);ctx.lineTo(-9,-3);ctx.bezierCurveTo(-9,-8,-3,-8,-3,-11);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#a87d324d';ctx.fillRect(-7,3,14,8);ctx.fillStyle='#ddd1a4';ctx.fillRect(-7,-1,14,7);ctx.strokeStyle='#e8ffdeaa';ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(-5,11);ctx.stroke();ctx.fillStyle='#d8c49a';ctx.fillRect(-4,-22,8,4);
 ctx.strokeStyle='#eee0b6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1,-23);ctx.quadraticCurveTo(8,-27,7,-31);ctx.stroke();flame(ctx,7,-29,4,17, time*22,.95);ctx.restore();
}
// Soft hot gas and irregular flame sheets replace repeated, sharply outlined flame icons.
// All particle seeds and motion are deterministic so pausing never reshuffles the effect.
function hotGas(ctx,x,y,w,h,heat,alpha){
 if(alpha<=0||w<=0||h<=0)return;
 ctx.save();ctx.translate(x,y);ctx.scale(w,h);ctx.globalAlpha*=alpha;
 const g=ctx.createRadialGradient(-.16,.16,.04,0,0,1);
 g.addColorStop(0,heat>.6?'#fff4c9':'#ffd46e');g.addColorStop(.2,'#ffbc39');g.addColorStop(.46,'#ff6d16dd');g.addColorStop(.72,'#d9380866');g.addColorStop(1,'#7d170000');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
}
function fireTongue(ctx,x,y,w,h,time,seed,alpha){
 if(h<=0||alpha<=0)return;
 const bend=(Math.sin(time*4.3+seed)*.55+Math.sin(time*8.1+seed*2.3)*.22)*w;
 const curl=Math.sin(time*6.7+seed*.71)*w*.45;
 ctx.save();ctx.translate(x,y);ctx.globalAlpha*=alpha;
 const g=ctx.createLinearGradient(0,3,bend,-h);
 g.addColorStop(0,'#fff6c2');g.addColorStop(.15,'#ffdc69f0');g.addColorStop(.43,'#ff981dd9');g.addColorStop(.72,'#f74a0a8c');g.addColorStop(1,'#ca300000');
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-w,0);
 ctx.bezierCurveTo(-w*1.08,-h*.16,-w*.52+curl,-h*.27,-w*.48+curl,-h*.45);
 ctx.bezierCurveTo(-w*.55+curl,-h*.62,bend-w*.3,-h*.72,bend,-h);
 ctx.bezierCurveTo(bend+w*.08,-h*.72,w*.26-curl,-h*.6,w*.48-curl,-h*.4);
 ctx.bezierCurveTo(w*.8-curl,-h*.24,w*.95,-h*.1,w,0);ctx.closePath();ctx.fill();
 // A thin, broken white-yellow core sits at the fuel, never at the cool flame tip.
 hotGas(ctx,-w*.12,-h*.13,w*.8,h*.24,.9,.75);
 hotGas(ctx,bend*.4+curl*.2,-h*.45,w*.48,h*.2,.3,.36);
 ctx.restore();
}
// Adjacent VFX frames dissolve into each other while sharing one planted ground anchor.
function fireAtlas(ctx,img,row,phase,x,y,width,alpha=1){
 if(!img?.complete||!img.naturalWidth)return false;
 const cw=img.naturalWidth/4,ch=img.naturalHeight/2,height=width*ch/cw;
 const frame=Math.floor(phase),mix=phase-frame;
 ctx.save();ctx.imageSmoothingEnabled=true;
 for(const [index,weight] of [[frame,1-mix],[(frame+1)%4,mix]]){
  if(weight<=0)continue;ctx.save();ctx.globalAlpha*=alpha*weight;
  ctx.drawImage(img,(index%4)*cw,row*ch,cw,ch,x-width/2,y-height*(row===0?.90:.76),width,height);ctx.restore();
 }
 ctx.restore();return true;
}
export function drawMolotovExplosion(ctx,e,t,texture){
 const age=clamp(1-t,0,1),r=e.size,seed=(e.x||0)*.013+(e.y||0)*.021;
 ctx.save();ctx.shadowBlur=0;
 // The first impulse is flat along the road; the hot gas then billows upwards.
 const spread=r*(.14+.8*(1-Math.exp(-age*7))),heat=Math.exp(-age*3.8);
 const ground=ctx.createRadialGradient(0,0,1,0,0,spread);
 ground.addColorStop(0,`rgba(255,205,106,${heat*.64})`);ground.addColorStop(.55,`rgba(255,104,18,${heat*.28})`);ground.addColorStop(1,'#ff680000');
 ctx.save();ctx.scale(1,.5);ctx.fillStyle=ground;ctx.beginPath();ctx.arc(0,0,spread,0,TAU);ctx.fill();ctx.restore();
 // Smoke starts behind the flame and expands as combustion cools.
 for(let i=0;i<13;i++){
  const n=noise(i+seed),a=i*2.399,reach=(.15+age*.62)*r*Math.sqrt(n);
  const x=Math.cos(a)*reach+age*18,y=Math.sin(a)*reach*.4-15-age*(45+n*62);
  smoke(ctx,x,y,14+age*(24+n*32),Math.sin(Math.PI*age)*(.12+n*.09));
 }
 const textured=fireAtlas(ctx,texture,0,Math.min(3,age*3.6),0,0,r*2.4,clamp(t*2,0,1));
 if(!textured)for(let i=0;i<21;i++){
  const n=noise(i+seed+51),a=i*2.399,reach=(.08+age*.68)*r*Math.sqrt(n),ignition=clamp(age*14-noise(i+8)*.7,0,1);
  const x=Math.cos(a)*reach,y=Math.sin(a)*reach*.42-8-age*(20+n*45);
  const size=(14+n*21)*(.55+Math.sin(Math.PI*age)*.9);
  hotGas(ctx,x,y,size,size*(1.2+n*.8),heat,ignition*heat*(.68+n*.28));
  if(i%2===0)fireTongue(ctx,x,y+size*.5,size*.36,size*(1.8+n),age*2.2,i+seed,ignition*heat*.6);
 }
 // Very brief white flash, followed by ballistic sparks and tiny green glass shards.
 const flash=Math.pow(Math.max(0,1-age/.19),2);
 if(flash>0){ctx.save();ctx.globalCompositeOperation='screen';hotGas(ctx,0,-16,r*.38,r*.26,1,flash);ctx.restore();}
 for(let i=0;i<30;i++){
  const a=i*2.399,n=noise(i+33),speed=r*(.35+n*.65),life=clamp((1-age)*(1-age)*2,0,1);
  const x=Math.cos(a)*speed*age,y=Math.sin(a)*speed*age*.48-100*age+135*age*age;
  ctx.save();ctx.globalAlpha*=life;ctx.strokeStyle=i%5?'#ffd580':'#91b9a177';ctx.lineWidth=i%5?1.1:1.6;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*(3+n*9)*(1-age),y+(3+n*7)*(1-age));ctx.stroke();ctx.restore();
 }
 ctx.restore();
}
export function drawFireField(ctx,f,camera,time,texture){
 const x=f.x-camera,y=f.y,r=f.radius,age=Math.max(0,f.duration-f.remaining);
 const fade=clamp(f.remaining/.65,0,1),ignite=clamp(age/.16,0,1),seed=f.x*.017+f.y*.023;
 ctx.save();ctx.shadowBlur=0;ctx.globalAlpha*=fade;
 // Irregular dark fuel patches and ember beds, without a visible circular boundary.
 for(let i=0;i<8;i++){
  const a=i*2.399,rr=Math.sqrt(noise(i+76))*r*.65,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.57;
  ctx.save();ctx.translate(px,py);ctx.scale(1,.42);
  const g=ctx.createRadialGradient(0,0,2,0,0,r*.4);g.addColorStop(0,'#2015137a');g.addColorStop(.58,'#31191430');g.addColorStop(1,'#24100c00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*.4,0,TAU);ctx.fill();ctx.restore();
 }
 const glow=ctx.createRadialGradient(x,y,2,x,y,r);glow.addColorStop(0,'#ff9c2638');glow.addColorStop(.65,'#f35e121a');glow.addColorStop(1,'#c9340000');ctx.save();ctx.translate(x,y);ctx.scale(1,.64);ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.restore();
 // Each smoke plume has its own rising life and drift, rather than pulsing in place.
 for(let i=0;i<14;i++){
  const n=noise(i+seed+11),life=(age*(.42+n*.15)+n)%1,a=i*2.399,rr=Math.sqrt(noise(i+8))*r*.8;
  smoke(ctx,x+Math.cos(a)*rr+life*26,y+Math.sin(a)*rr*.57-life*(75+n*50)-14,11+life*26,Math.sin(Math.PI*life)*.13*ignite);
 }
 const points=Array.from({length:40},(_,i)=>{const a=i*2.399,rr=Math.sqrt(noise(i+80))*r*.89;return {i,x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*.6};}).sort((a,b)=>a.y-b.y);
 const textured=fireAtlas(ctx,texture,1,(age*5)%4,x,y,r*2.4,ignite);
 if(!textured)for(const p of points){
  const n=noise(p.i+seed),cycle=(age*(1.25+n*.9)+n)%1;
  const lift=Math.sin(Math.PI*cycle),w=4+n*6,h=(20+n*43)*(.45+lift*.75)*ignite*(.55+fade*.45);
  hotGas(ctx,p.x,p.y-3,w*2.6,8+n*6,.7,ignite*.36);
  fireTongue(ctx,p.x+Math.sin(time*3+p.i)*2,p.y,w,h,time,p.i+seed,(.42+lift*.38)*ignite);
  // Small detached tongues peel away and disappear as they rise.
  hotGas(ctx,p.x+Math.sin(p.i+cycle*4)*5+cycle*9,p.y-h*.48-cycle*20,w*(1-cycle)*.9,8*(1-cycle)+2,.2,lift*.22*ignite);
 }
 for(let i=0;i<18;i++){
  const n=noise(i+52),life=(age*(.6+n*.5)+n)%1,a=i*2.399;
  ctx.save();ctx.globalAlpha*=Math.sin(Math.PI*life)*.68*ignite;ctx.strokeStyle=i%3?'#ffc677':'#ff8d32';ctx.lineWidth=1;
  const px=x+Math.cos(a)*r*.78+life*14,py=y+Math.sin(a)*r*.46-life*(55+n*55);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-1.5,py+2+life*3);ctx.stroke();ctx.restore();
 }
 ctx.restore();
}
export function ballotPaper(b,time,i){
 const height=(noise(i+91)+time*.24)%1,angle=time*4.8+i*2.399,heightScale=150+Math.min(80,b.skill.range*.16),radius=(.17+.65*height)*b.skill.range;
 return {x:b.x+Math.cos(angle)*radius,y:b.y-14-height*heightScale+Math.sin(angle)*radius*.24,depth:Math.sin(angle),angle:angle*.7+Math.sin(time*9+i)*.35,size:6+height*5,height};
}
function papers(ctx,b,camera,time,front){
 for(let i=0;i<42;i++){const p=ballotPaper(b,time,i);if((p.depth>=0)!==front)continue;ctx.save();ctx.translate(p.x-camera,p.y);ctx.rotate(p.angle);ctx.scale(.4+Math.abs(Math.cos(time*6+i))*.6,1);ctx.globalAlpha*=.55+.4*(1-p.height);ctx.shadowBlur=0;
 const g=ctx.createLinearGradient(-p.size,-p.size,p.size,p.size);g.addColorStop(0,'#fffdf3');g.addColorStop(1,'#b4c8d2');ctx.fillStyle=g;ctx.strokeStyle='#738a9870';ctx.lineWidth=.7;ctx.fillRect(-p.size,-p.size*.7,p.size*2,p.size*1.4);ctx.strokeRect(-p.size,-p.size*.7,p.size*2,p.size*1.4);
 ctx.strokeStyle='#6a829c';ctx.lineWidth=.8;for(let j=0;j<3;j++){ctx.strokeRect(-p.size*.7,-p.size*.45+j*p.size*.4,p.size*.23,p.size*.23);ctx.beginPath();ctx.moveTo(-p.size*.25,-p.size*.32+j*p.size*.4);ctx.lineTo(p.size*.6,-p.size*.32+j*p.size*.4);ctx.stroke();}ctx.strokeStyle='#cc4b51';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-p.size*.72,-p.size*.1);ctx.lineTo(-p.size*.55,p.size*.03);ctx.lineTo(-p.size*.32,-p.size*.23);ctx.stroke();ctx.restore();}
}
export function drawBallotVortex(ctx,b,camera,time){
 const x=b.x-camera,y=b.y,fade=clamp(b.remaining/.45,0,1);ctx.save();ctx.globalAlpha=fade;
 // Open helical ribbons, rather than an opaque cone, leave enemies visible inside.
 ctx.lineWidth=1.2;ctx.shadowBlur=0;
 for(let strand=0;strand<3;strand++){ctx.strokeStyle=strand%2?'#d9f3ff30':'#fff8e530';ctx.beginPath();for(let j=0;j<=64;j++){const h=j/64,a=time*4.8+h*TAU*2+strand*TAU/3,r=(.17+.65*h)*b.skill.range,px=x+Math.cos(a)*r,py=y-14-h*220+Math.sin(a)*r*.24;if(!j)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.stroke();}
 papers(ctx,b,camera,time,false);
 ctx.fillStyle='#08101f55';ctx.beginPath();ctx.ellipse(x+6,y,46,12,0,0,TAU);ctx.fill();
 const face=ctx.createLinearGradient(x-32,y-85,x+28,y);face.addColorStop(0,b.hit>0?'#fff':'#f5f5ed');face.addColorStop(1,'#aab9c4');ctx.fillStyle=face;ctx.strokeStyle='#4b6274';ctx.lineWidth=1.5;ctx.fillRect(x-32,y-80,62,72);ctx.strokeRect(x-32,y-80,62,72);
 ctx.fillStyle='#758b9d';ctx.beginPath();ctx.moveTo(x+30,y-80);ctx.lineTo(x+46,y-92);ctx.lineTo(x+46,y-20);ctx.lineTo(x+30,y-8);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#e6edf1';ctx.beginPath();ctx.moveTo(x-35,y-81);ctx.lineTo(x-19,y-94);ctx.lineTo(x+47,y-94);ctx.lineTo(x+31,y-81);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#152630';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-7,y-86);ctx.lineTo(x+17,y-89);ctx.stroke();ctx.fillStyle='#d85551';ctx.fillRect(x-35,y-78,8,14);ctx.fillRect(x+25,y-78,8,14);
 ctx.fillStyle='#edf2f3';ctx.fillRect(x-20,y-62,38,34);ctx.strokeStyle='#597286';ctx.strokeRect(x-20,y-62,38,34);ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#334e67';ctx.fillText('투표함',x-1,y-46);ctx.font='7px monospace';ctx.fillText('BALLOT',x-1,y-34);
 papers(ctx,b,camera,time,true);ctx.restore();
}
