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
export function drawMolotovExplosion(ctx,e,t){
 const age=1-t,fade=clamp(t*2,0,1),r=e.size;
 ctx.save();ctx.shadowBlur=0;
 for(let i=0;i<10;i++){const a=i*TAU/10,spread=(.12+age*.58)*r;smoke(ctx,Math.cos(a)*spread,Math.sin(a)*spread*.42-24-age*55,22+age*35,.33*fade);}
 const flash=ctx.createRadialGradient(0,-12,1,0,-12,r*.65);flash.addColorStop(0,`rgba(255,251,199,${Math.max(0,1-age*4)})`);flash.addColorStop(.3,`rgba(255,173,38,${fade*.48})`);flash.addColorStop(1,'#ff5c0000');ctx.fillStyle=flash;ctx.beginPath();ctx.ellipse(0,-12,r*.65,r*.4,0,0,TAU);ctx.fill();
 for(let i=0;i<18;i++){const a=i*2.399,spread=Math.sqrt(noise(i+7))*r*(.12+age*.58),x=Math.cos(a)*spread,y=Math.sin(a)*spread*.45;flame(ctx,x,y,8+noise(i)*10,(40+noise(i+3)*60)*Math.sin(Math.PI*Math.min(.95,age+.12)),i+age*8,fade);}
 for(let i=0;i<24;i++){const a=i*2.399,v=35+noise(i+31)*r*.9,x=Math.cos(a)*v*age,y=Math.sin(a)*v*age*.55-70*age+105*age*age;ctx.strokeStyle=i%4?'#ffe4a0':'#9ec38a';ctx.lineWidth=i%4?1.5:2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*8,y-Math.sin(a)*5);ctx.stroke();}ctx.restore();
}
export function drawFireField(ctx,f,camera,time){
 const x=f.x-camera,y=f.y,r=f.radius,age=f.duration-f.remaining,fade=clamp(f.remaining/.55,0,1);
 ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#34221950';ctx.beginPath();ctx.ellipse(x,y,r*.91,r*.59,0,0,TAU);ctx.fill();
 const glow=ctx.createRadialGradient(x,y,4,x,y,r);glow.addColorStop(0,'#ff8a164d');glow.addColorStop(.65,'#fc521424');glow.addColorStop(1,'#ec340000');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(x,y,r,r*.66,0,0,TAU);ctx.fill();
 for(let i=0;i<9;i++){const a=i*2.399,rr=Math.sqrt(noise(i+8))*r*.75;smoke(ctx,x+Math.cos(a)*rr+Math.sin(time+i)*12,y+Math.sin(a)*rr*.6-30-((time*.4+noise(i))%1)*70,18+noise(i+20)*14,.15);}
 const points=Array.from({length:32},(_,i)=>{const a=i*2.399,rr=Math.sqrt(noise(i+80))*r*.9;return {i,x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*.62};}).sort((a,b)=>a.y-b.y);
 for(const p of points){const pulse=.7+.3*Math.sin(time*9+p.i*1.7);flame(ctx,p.x,p.y,5+noise(p.i+12)*6,(23+noise(p.i+22)*34)*pulse*Math.min(1,age*8+.25),time*7+p.i);}
 for(let i=0;i<12;i++){const life=(time*.7+noise(i+52))%1,a=i*2.399;ctx.globalAlpha=fade*(1-life)*.65;ctx.fillStyle='#ffd98c';ctx.fillRect(x+Math.cos(a)*r*.75+life*12,y+Math.sin(a)*r*.42-life*90,1.5,3);}ctx.restore();
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
