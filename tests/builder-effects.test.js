import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const site=fileURLToPath(new URL('..',import.meta.url));
let core,bossCore,typeACore;

function harness(job='bodybuilder',power=0,dir=1){
 const elements=new Map(),events=new Map(),storage=new Map(),strokes=[],fills=[],labels=[];
 const stack=[];let matrix=[1,0,0,1,0,0],segments=[];
 const point=(x,y)=>({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
 const ctx=new Proxy({
  save(){stack.push({matrix:[...matrix],strokeStyle:this.strokeStyle,fillStyle:this.fillStyle,shadowColor:this.shadowColor,lineWidth:this.lineWidth,globalAlpha:this.globalAlpha});},
  restore(){const state=stack.pop();matrix=state.matrix;Object.assign(this,state);},
  translate(x,y){const p=point(x,y);matrix[4]=p.x;matrix[5]=p.y;},
  scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
  rotate(r){const[a,b,c,d]=matrix,co=Math.cos(r),si=Math.sin(r);matrix[0]=a*co+c*si;matrix[1]=b*co+d*si;matrix[2]=c*co-a*si;matrix[3]=d*co-b*si;},
  beginPath(){segments=[];},moveTo(x,y){segments.push({kind:'move',...point(x,y)});},lineTo(x,y){segments.push({kind:'line',...point(x,y)});},
  quadraticCurveTo(cx,cy,x,y){segments.push({kind:'quadratic',control:point(cx,cy),...point(x,y)});},
  bezierCurveTo(c1x,c1y,c2x,c2y,x,y){segments.push({kind:'bezier',control:point(c1x,c1y),control2:point(c2x,c2y),...point(x,y)});},
  arc(x,y,r){segments.push({kind:'arc',radius:r,...point(x,y)});},ellipse(x,y,rx,ry){segments.push({kind:'ellipse',rx,ry,...point(x,y)});},
  stroke(){strokes.push({color:this.strokeStyle,glow:this.shadowColor,width:this.lineWidth,path:structuredClone(segments)});},
  fill(){fills.push({color:this.fillStyle,path:structuredClone(segments)});},
  fillRect(x,y,w,h){fills.push({color:this.fillStyle,x,y,w,h});},
  fillText(text,x,y){labels.push({text,color:this.fillStyle,...point(x,y)});},measureText(text){return {width:text.length*8};},
  createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}
 },{get:(object,key)=>key in object?object[key]:()=>{}});
 function el(selector){
  if(elements.has(selector))return elements.get(selector);const classes=new Set();
  const node={style:{},dataset:{},parentElement:{},hidden:false,textContent:'',innerHTML:'',listeners:new Map(),classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on??!classes.has(k))classes.add(k);else classes.delete(k);}},
   setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k]??null;},querySelector:key=>el(`${selector} ${key}`),querySelectorAll:()=>[],addEventListener(k,fn){this.listeners.set(k,fn);},getContext:()=>ctx,getBoundingClientRect:()=>({width:1448,height:818}),focus(){}};
  elements.set(selector,node);return node;
 }
 const document={querySelector:el,querySelectorAll:()=>[],addEventListener:(key,fn)=>events.set(key,fn),hidden:false,activeElement:el('#game')};
 const sandbox=vm.createContext({...core,...bossCore,...typeACore,console,document,window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout(){return 1;},clearTimeout(){},requestAnimationFrame(){},ResizeObserver:class{observe(){}},Image:class{set src(v){this.asset=v;this.complete=true;this.naturalWidth=1500;this.naturalHeight=1000;this.onload?.();}},Promise,Math,Date,Number,String,Set});
 const source=fs.readFileSync(path.join(site,'dist/app.js'),'utf8').replace(/^import .*?;\n/gm,'');
 vm.runInContext(source+`\nglobalThis.api={start(p){player=p;records=[p];scene='playing';resetWorld();},attack,cast,hitMonster,playerDamage,update,jump,drawEffects,drawPlayer,drawCombatIndicators,startSwordCharge,releaseSword,combatPose,combatDisplayX,keys,get:()=>({player,monsters,effects,texts,combatMotion,cooldowns,attackTimer,invincible,pz,camera,recovery,swordUlt})};`,sandbox);
 const api=sandbox.api,p=core.createCharacter('효과검증');Object.assign(p,{job,level:20,map:'alley',x:1000,y:650,hp:480,mp:250});api.start(p);
 api.get().monsters.forEach(m=>Object.assign(m,{dead:true,respawnIn:100}));
 api.update(2.1);p.powerTime=power;
 api.keys.add(dir<0?'ArrowLeft':'ArrowRight');api.update(.001);api.keys.clear();
 return {api,p,el,strokes,fills,labels,clearDraws(){strokes.length=fills.length=labels.length=0;},target(){const m=api.get().monsters[0];Object.assign(m,{dead:false,x:p.x+dir*60,home:p.x+dir*60,y:p.y,speed:0,hp:100000,maxHp:100000});return m;}};
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const curved=stroke=>stroke.path.some(p=>['quadratic','bezier','arc','ellipse'].includes(p.kind));
function warm(color){
 if(typeof color!=='string')return false;let r,g,b;
 if(/^#[0-9a-f]{6,8}$/i.test(color)){r=parseInt(color.slice(1,3),16);g=parseInt(color.slice(3,5),16);b=parseInt(color.slice(5,7),16);}
 else {const rgb=color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);if(!rgb)return false;[,r,g,b]=rgb.map(Number);}
 return r>140&&g>100&&r-b>35;
}
function assertBuilderEffects(h,message){
 const effects=h.api.get().effects;assert.ok(effects.some(e=>e.type==='impact'),message+' has impact');
 assert.equal(effects.some(e=>['lightning','slash'].includes(e.type)),false,message+' has no electricity or blade slash');
 for(const e of effects)for(const field of ['color','accent','glow','outline'])assert.equal(warm(e[field]),false,`${message}: warm ${e.type}.${field}=${e[field]}`);
 assert.ok(effects.some(e=>e.color==='#f7fcff'),message+' has white wind/impact');
}
function drawEffects(h){h.clearDraws();h.api.drawEffects();}

test('class combat effects regression coverage',async t=>{
 [core,bossCore,typeACore]=await Promise.all(['core.js','boss.js','type-a.js'].map(name=>import(pathToFileURL(path.join(site,'dist',name)).href)));

 await t.test('A/Q/W use white impact in both forms, both directions, with and without targets',()=>{
  for(const power of [0,12])for(const dir of [-1,1])for(const key of ['a','q','w'])for(const hits of [false,true]){
   const h=harness('bodybuilder',power,dir),m=hits?h.target():null,before={x:h.p.x,hp:m?.hp,mp:h.p.mp};
   const skill=key==='a'?null:core.effectiveSkill(h.p,key),damage=key==='a'?core.basicAttackPower(h.p):Math.round(core.attackPower(h.p)*skill.damage);
   key==='a'?h.api.attack():h.api.cast(key);const state=h.api.get(),label=`${key} power=${power} dir=${dir} hits=${hits}`;
   assertBuilderEffects(h,label);if(m)assert.equal(before.hp-m.hp,damage,label+' keeps damage');
   assert.equal(h.p.mp,before.mp-(skill?.mp||0));if(skill)assert.equal(state.cooldowns[key],skill.cooldown);
   assert.equal(state.combatMotion.kind,key==='w'?'shoulder':'punch');close(state.combatMotion.duration,key==='a'?(power?.24:.34):key==='q'?.42:.3);
   close(h.p.x,before.x+(key==='w'?dir*skill.dash:0));assert.equal(h.p.powerTime,power===0?0:power-.001);
   assert.ok(state.effects.some(e=>e.type===(key==='w'?'dash':'windSwing')));
   if(m)assert.ok(state.effects.some(e=>e.type==='spark'&&!warm(e.color)),'landed hit sparkle stays cool');
  }
 });

 await t.test('actual A/Q/W/R rendering contains curved white/cyan impact and no angular bolt or yellow stroke',()=>{
  for(const power of [0,12])for(const key of ['a','q','w','r']){
   if(power&&key==='r')continue;const h=harness('bodybuilder',power);h.target();key==='a'?h.api.attack():h.api.cast(key);
   for(const elapsed of [0,.1]){
    if(elapsed)h.api.update(elapsed);drawEffects(h);
    assert.ok(h.strokes.some(curved),`${key}/${power}: curved impact must be actually drawn`);
    assert.ok(h.strokes.some(s=>s.color==='#f7fcff'),`${key}/${power}: white core`);
    assert.ok(h.strokes.some(s=>s.color==='#bfeaff'||s.color==='#9edfff'),`${key}/${power}: pale cyan detail`);
    assert.equal(h.strokes.some(s=>s.path.length===6&&s.path[0].kind==='move'&&s.path.slice(1).every(p=>p.kind==='line')),false,'no six-point lightning zigzag');
    for(const s of h.strokes){assert.equal(warm(s.color),false,`${key}: warm stroke ${s.color}`);assert.equal(warm(s.glow),false,`${key}: warm glow ${s.glow}`);}
    for(const f of h.fills)assert.equal(warm(f.color),false,`${key}: warm fill ${f.color}`);
   }
  }
 });

 await t.test('W follows the existing clamped route, including airborne and blocked dashes',()=>{
  for(const power of [0,12])for(const dir of [-1,1])for(const airborne of [false,true])for(const gap of [null,35,0]){
   const h=harness('bodybuilder',power,dir),wall=dir<0?45:core.MAPS[h.p.map].width-45;h.p.x=gap===null?1000:wall-dir*gap;
   if(airborne){h.api.jump();h.api.update(.2);}const start=h.p.x,y=h.p.y-45-h.api.get().pz,destination=core.clamp(start+dir*core.effectiveSkill(h.p,'w').dash,45,core.MAPS[h.p.map].width-45);
   h.api.cast('w');const {effects,combatMotion}=h.api.get(),trail=effects.find(e=>e.type==='dash'),impact=effects.find(e=>e.type==='impact'&&e.followDash);
   assert.ok(trail&&impact);close(h.p.x,destination);close(combatMotion.fromX,start);close(combatMotion.toX,destination);
   close(impact.followDash.fromX,start);close(impact.followDash.toX,destination);close(impact.followDash.duration,.3*.82);
   for(const dt of [.1,.18]){
    h.api.update(dt);drawEffects(h);const display=h.api.combatDisplayX(),camera=h.api.get().camera;
    close(trail.x,start);close(trail.toX,destination);close(trail.y,y);close(trail.toY,y);
    const spine=h.strokes.filter(s=>s.color==='#f7fcff'&&s.width===8&&s.path.length===2&&s.path[1].kind==='line');
    if(start===destination){assert.equal(spine.length,0);continue;}assert.equal(spine.length,1);
    close(spine[0].path[0].x,start-camera);close(spine[0].path[1].x,display-camera);close(spine[0].path[0].y,y);close(spine[0].path[1].y,y);
    assert.ok(h.strokes.some(s=>s.color==='#426679'&&s.width===16&&JSON.stringify(s.path)===JSON.stringify(spine[0].path)));
   }
  }
 });

 await t.test('R startup keeps transformation, cooldown reductions, damage and powered re-cast rejection',()=>{
  const h=harness(),m=h.target();h.p.cooldowns.q=8;h.p.cooldowns.w=6;h.p.cooldowns.e=4;const mp=h.p.mp,damage=Math.round(core.attackPower(h.p)*core.effectiveSkill(h.p,'r').damage);
  h.api.cast('r');assertBuilderEffects(h,'R');assert.equal(h.p.powerTime,12);assert.equal(h.p.mp,mp-30);assert.equal(m.hp,100000-damage);
  assert.deepEqual({...h.p.cooldowns},{q:4,w:3,e:2,r:40});assert.equal(h.api.get().combatMotion,null);assert.equal(h.api.get().invincible,1.5);
  assert.ok(h.api.get().effects.some(e=>e.type==='ring'&&e.color==='#f7fcff'));
  const fx=h.api.get().effects.length;h.api.cast('r');assert.equal(h.api.get().effects.length,fx);assert.equal(h.p.mp,mp-30);assert.equal(h.p.powerTime,12);
 });

 await t.test('powered steam replaces aura rings while green E retains its recovery behavior',()=>{
  for(const power of [0,12]){
   const h=harness('bodybuilder',power);h.clearDraws();h.api.drawPlayer();
   for(const s of h.strokes)assert.equal(warm(s.color)||warm(s.glow),false,'powered aura is cool');
   for(const f of h.fills)assert.equal(warm(f.color),false,'powered particles are cool');
   if(power){assert.equal(h.strokes.some(s=>s.path.some(p=>p.kind==='ellipse')),false,'no surrounding aura rings');assert.ok(h.strokes.some(s=>s.path.some(p=>p.kind==='bezier')),'rising steam wisps');}
   const name=h.labels.find(l=>l.text.includes(h.p.name));assert.ok(name);assert.equal(warm(name.color),false);
   h.p.hp=10;h.api.cast('e');assert.equal(h.api.get().effects.find(e=>e.type==='ring').color,'#baffb1');assert.equal(h.api.get().recovery.duration,1.5);assert.equal(h.api.playerDamage(100),45);
   h.api.update(1.5);close(h.p.hp,10+core.maxHp(h.p)*(power?.7:.4));assert.equal(h.api.get().recovery,null);
  }
 });

 await t.test('untrained A/Q/W keep plain motions, recoil and damage without generated attack effects',()=>{
  for(const key of ['a','q','w'])for(const dir of [-1,1])for(const hits of [false,true]){
   const h=harness(null,0,dir);h.p.level=8;const m=hits?h.target():null;
   const before={x:h.p.x,mp:h.p.mp,hp:m?.hp},skill=key==='a'?null:core.effectiveSkill(h.p,key);
   const damage=key==='a'?core.basicAttackPower(h.p):Math.round(core.attackPower(h.p)*skill.damage);
   key==='a'?h.api.attack():h.api.cast(key);const state=h.api.get();
   assert.equal(state.effects.length,0,`${key}/${dir}/${hits}: no bolt, swing, spark or trail`);
   assert.equal(state.combatMotion.kind,key==='w'?'belly':'punch');
   assert.equal(h.p.mp,before.mp-(skill?.mp||0));if(skill)assert.equal(state.cooldowns[key],skill.cooldown);
   close(h.p.x,before.x+(key==='w'?dir*skill.dash:0));
   if(m){assert.equal(m.hp,before.hp-damage);assert.equal(m.hit,.28);assert.equal(m.hitDir,dir);assert.equal(state.texts.find(t=>t.text===String(damage)).color,'#e0e5e8');}
   if(key==='w'){close(h.api.combatDisplayX(),before.x);h.api.update(.1);assert.ok((h.api.combatDisplayX()-before.x)*dir>0);}
   drawEffects(h);assert.equal(h.strokes.length,0);assert.equal(h.fills.length,0);
  }
 });

 await t.test('swordsman retains yellow lightning, yellow/black dash and sword R',()=>{
  for(const job of ['swordsman'])for(const key of ['a','q','w']){
   const h=harness(job);h.target();key==='a'?h.api.attack():h.api.cast(key);const effects=h.api.get().effects;
   assert.ok(effects.some(e=>e.type==='lightning'&&e.color==='#ffe45c'));assert.equal(effects.some(e=>['impact','windSwing'].includes(e.type)),false);
   if(key==='w'){h.api.update(.1);drawEffects(h);assert.ok(h.strokes.some(s=>s.color==='#ffe45c'&&s.width===6));assert.ok(h.strokes.some(s=>s.color==='#111117'&&s.width===9));}
   else assert.ok(effects.some(e=>e.type==='slash'&&e.color==='#ffe45c'));
  }
  const h=harness('swordsman');h.target();assert.equal(h.api.startSwordCharge(),true);h.api.update(.2);h.clearDraws();h.api.drawCombatIndicators();
  assert.ok(h.strokes.some(s=>s.color==='#ffe45c'));assert.ok(h.strokes.some(s=>s.color==='#101014'));
  h.api.releaseSword('keyboard');h.api.update(.01);assert.ok(h.api.get().effects.some(e=>e.type==='lightning'&&e.color==='#ffe45c'));
 });
});
