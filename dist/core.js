/** Stable character IDs keep existing saves compatible as artwork and rules evolve. */
export const SAVE_KEY = 'yeoksam-after-hours.v1';
export const CLASSES = [
 {id:'wanderer',name:'펭귄 모험가',description:'평소에는 동글동글, 결정적인 순간에는 누구보다 든든하게.',hp:100,mp:60,attack:18},
 {id:'rabbit',name:'토끼 모험가',description:'동그란 안경 너머로 빛나는 마법. 마구리에게 마법사의 길을 배워요.',hp:85,mp:90,attack:16},
 {id:'chick',name:'병아리 모험가',description:'작은 날개와 빠른 두뇌. 메이플아지트에서 해커의 길을 배워요.',hp:95,mp:80,attack:17},
 {id:'otter',name:'수달 모험가',description:'주먹과 물결로 시작해, 메이플아지트의 휴프로에게 아이돌의 길을 배워요.',hp:100,mp:80,attack:17},
 {id:'cat',name:'고양이 모험가',description:'민첩한 발과 날카로운 발톱. 올림픽공원에서 새로운 길을 찾아요.',hp:90,mp:70,attack:17}
];
export const POWER_DURATION = 12;
export const JOBS = {
 idol:{id:'idol',name:'아이돌',classId:'otter',map:'maple',e:'물방울 가드',r:'콘서트',passive:'콘서트로 자신과 아군 지원'},
 hacker:{id:'hacker',name:'해커',classId:'chick',map:'maple',e:'시스템 정지',r:'해킹',passive:'경험치 획득량 +30%'},
 mage:{id:'mage',name:'마법사',classId:'rabbit',map:'town',maps:['town','gangnam','yeoksamStreet'],e:'마력 방벽',r:'존경!',passive:'W가 순간 이동으로 변경'},
 bodybuilder:{id:'bodybuilder',name:'바디빌더',map:'gym',e:'회복',r:'근육 각성',passive:'받는 피해 10% 감소'},
 swordsman:{id:'swordsman',name:'검사',map:'dojo',e:'막기',r:'섬광 연참',passive:'기본 이동속도 +10%'},
 protester:{id:'protester',name:'시위대',map:'olympic',classId:'cat',e:'화염병',r:'부정선거',passive:'점프 높이 +20% · 기본 이동속도 +10%'}
};
export const jobName=p=>JOBS[p?.job]?.name||(CLASSES.find(c=>c.id===p?.classId)?.name||'펭귄 모험가');
export const ITEMS = {
 mpPotions:{name:'아이스아메리카노',image:'assets/item-americano.webp',icon:'🥤',description:'MP를 100 회복합니다. MP가 가득 차면 소모하지 않아요. 보스방에서는 HP 회복 아이템과 별도로 재사용 대기 10초가 적용됩니다.',usable:true,price:500},
 potions:{name:'감자칩',image:'assets/item-chips.webp',icon:'🥔',description:'HP를 60 회복합니다. 체력이 가득 차면 소모하지 않아요. 보스전에서는 재사용 대기 10초가 적용됩니다.',usable:true,price:50,hpRestore:60},
 largePotions:{name:'샌드위치',image:'assets/item-sandwich.webp',icon:'🥪',description:'HP를 150 회복합니다. 체력이 가득 차면 소모하지 않아요. 보스전에서는 기존 HP 회복 아이템과 재사용 대기 10초를 공유합니다.',usable:true,price:500,hpRestore:150},
 returnScrolls:{name:'역삼역 1번 출구 이동장치',image:'assets/item-device.webp',icon:'역',description:'역삼역 1번 출구로 즉시 돌아갑니다. HP와 MP는 그대로 유지돼요. 보스방에서는 사용할 수 없어요.',usable:true,price:100,recall:{map:'town',x:530,y:648}},
 gangnamScrolls:{name:'강남역 이동장치',image:'assets/item-device.webp',icon:'강',description:'강남역 마을로 즉시 돌아갑니다. HP와 MP는 그대로 유지돼요. 보스방에서는 사용할 수 없어요.',usable:true,price:100,recall:{map:'gangnam',x:650,y:648}},
 yeoksamStreetScrolls:{name:'역삼역 주변 거리 이동장치',image:'assets/item-device.webp',icon:'거',description:'역삼역주변거리로 즉시 돌아갑니다. HP와 MP는 그대로 유지돼요. 보스방에서는 사용할 수 없어요.',usable:true,price:100,recall:{map:'yeoksamStreet',x:850,y:648}},
 scrap:{name:'로봇 부품',image:'assets/item-parts.webp',icon:'⚙',description:'로봇에게서 얻은 수집 재료입니다.',usable:false},
 typeATitle:{name:'A형',image:'assets/item-badge.webp',icon:'A',description:'A형 처치 보상 칭호. 장착하면 닉네임 위에 은색으로 표시되고 공격력이 5% 증가합니다. 군복과 함께 장착할 수 있어요.',usable:false,equippable:true,equipmentType:'칭호'},
 uniform:{name:'군복',image:'assets/item-uniform.webp',icon:'▣',description:'신원미상의 예비군의 결투 보상. 장착하면 위장 군복을 입고, 걷기와 공중 이동 속도가 20% 증가합니다.',usable:false,equippable:true},
 cores:{name:'에너지 코어',image:'assets/item-core.webp',icon:'◇',description:'강한 로봇에게서 얻은 수집 재료입니다.',usable:false}
};
export const equipmentName=p=>p?.job==='hacker'?'노트북':p?.job==='bodybuilder'?'핑크 덤벨':p?.job==='swordsman'?'일본도':'없음';
export const jumpHeightMultiplier=p=>p?.classId==='cat'&&p?.job==='protester'?1.2:1;
// Derive passives from the saved job so old characters benefit without accumulating bonuses.
export const hasTypeATitle=p=>!!(p?.typeATitle>0&&p.typeATitleEquipped);
export const itemEquipped=(p,id)=>id==='typeATitle'?hasTypeATitle(p):id==='uniform'&&p.uniform>0&&p.uniformEquipped;
export function equipTypeATitle(p){if(!(p.typeATitle>0))return {ok:false,message:'먼저 A형을 처치해 칭호를 얻으세요.'};p.typeATitleEquipped=!p.typeATitleEquipped;return {ok:true,message:p.typeATitleEquipped?'A형 칭호 장착 · 공격력 +5%':'A형 칭호를 해제했어요.'};}
export const movementMultiplier=p=>(['swordsman','protester'].includes(p?.job)?1.1:1)*(p?.uniform>0&&p.uniformEquipped?1.2:1)*(p?.respectTime>0?1.2:1)*(p?.concertTime>0?1.2:1);
export const incomingDamage=(p,damage,multiplier=1)=>Math.max(0,Math.round(damage*(p?.job==='bodybuilder'?0.9:1)*(p?.respectTime>0?.8:1)*multiplier));
export function equipUniform(p){if(!p.uniform)return {ok:false,message:'먼저 신원미상의 예비군을 처치해 군복을 얻으세요.'};p.uniformEquipped=!p.uniformEquipped;return {ok:true,message:p.uniformEquipped?'군복 장착 · 이동속도 +20%':'군복을 벗었어요.'};}
export const validItem=id=>Object.hasOwn(ITEMS,id);
export const shopItemsFor=p=>['potions','largePotions','mpPotions',...(p.map==='yeoksamStreet'?['yeoksamStreetScrolls']:['returnScrolls','gangnamScrolls'])];
export const itemPrice=(p,id)=>validItem(id)?id==='gangnamScrolls'&&p.map==='town'?1500:ITEMS[id].price:undefined;
export function assignQuickSlot(p,index,id){
 if(!Number.isInteger(index)||index<0||index>2)return {ok:false,message:'1~3번 슬롯을 선택해 주세요.'};
 if(id!==null&&(!validItem(id)||!ITEMS[id].usable))return {ok:false,message:'사용할 수 있는 아이템만 등록할 수 있어요.'};
 if(id!==null&&!(p[id]>0))return {ok:false,message:'보유한 아이템만 등록할 수 있어요.'};
 p.quickSlots[index]=id;
 return {ok:true,message:id===null?`${index+1}번 슬롯을 비웠어요.`:`${ITEMS[id].name}을 ${index+1}번에 등록했어요.`};
}
export function buyItem(p,id){
 const item=validItem(id)?ITEMS[id]:null,price=itemPrice(p,id);
 if(!price||!shopItemsFor(p).includes(id))return {ok:false,message:'판매하지 않는 아이템이에요.'};
 if(p.money<price)return {ok:false,message:`소지금이 부족해요. ${item.name}은 ${price.toLocaleString()}원입니다.`};
 p.money-=price;p[id]=(p[id]||0)+1;return {ok:true,message:`${item.name} 1개를 구입했어요.`};
}
export function useItem(p,id){
 if(validItem(id)&&ITEMS[id].hpRestore)return usePotion(p,id);
 if(id==='mpPotions'){
  if(MAPS[p.map]?.boss&&p.mpPotionCooldown>0)return {ok:false,message:`아이스아메리카노는 ${Math.ceil(p.mpPotionCooldown)}초 뒤에 사용할 수 있어요.`};
  if(!(p.mpPotions>0))return {ok:false,message:'아이스아메리카노가 없어요. 마구리의 상점에서 구입하세요.'};
  if(p.mp>=maxMp(p))return {ok:false,message:'MP가 이미 가득 찼어요.'};
  const restored=Math.min(100,maxMp(p)-p.mp);p.mpPotions--;p.mp+=restored;p.mpPotionCooldown=MAPS[p.map]?.boss?10:0;
  return {ok:true,message:`MP가 ${Math.round(restored)} 회복되었어요.`};
 }
 const item=validItem(id)?ITEMS[id]:null,destination=item?.recall;
 if(!destination)return {ok:false,message:'사용할 수 없는 아이템이에요.'};
 if(MAPS[p.map]?.boss)return {ok:false,message:'보스방에서는 이동장치를 사용할 수 없어요.'};
 if(!(p[id]>0))return {ok:false,message:`${item.name}가 없어요. 마구리의 상점에서 구입할 수 있어요.`};
 if(p.map===destination.map)return {ok:false,message:`이미 ${MAPS[destination.map].name}에 있어요. 이동장치는 소모하지 않았어요.`};
 // Apply consumption and destination together so saves never lose an in-flight recall.
 p[id]--;p.map=destination.map;p.x=destination.x;p.y=destination.y;
 if(!p.visited.includes(p.map))p.visited.push(p.map);
 return {ok:true,recalled:true,message:`${MAPS[p.map].name} 이동 완료!`};
}
export const SKILLS = [
 {key:'q',name:'펭귄 펀치',icon:'✦',level:3,mp:8,cooldown:2.2,damage:2.1,range:210,description:'전방의 적을 힘껏 공격해요.',enhanced:'피해 2배 · 범위 1.5배 · 재사용 시간 절반'},
 {key:'w',name:'배치기 돌진',icon:'»',level:6,mp:12,cooldown:4,damage:2.7,range:270,dash:230,description:'앞으로 미끄러지며 경로의 적을 공격해요.',enhanced:'피해 2배 · 돌진 1.6배 · 재사용 시간 절반'},
 {key:'e',name:'한 번 더!',icon:'✚',level:10,requiresJob:true,mp:18,cooldown:9,damage:0,range:0,heal:.4,recovery:1.5,reduction:.5,moveSpeed:.6,description:'팔을 X자로 막아 1.5초간 받는 피해를 50% 줄이고 HP를 최대치의 40%만큼 서서히 회복해요. 회복 중 이동속도는 평소의 60%이며 일반 공격과 다른 스킬은 사용할 수 없어요.',enhanced:'HP 70% 지속 회복 · 피해 50% 감소 · 재사용 시간 절반'},
 {key:'r',name:'근육은 못 참지',icon:'◆',level:15,requiresJob:true,mp:30,cooldown:30,damage:6,range:400,description:'충격파와 함께 12초간 거대한 근육 펭귄으로 변신해요.',enhanced:'변신 중 기본 공격 1.8배 · Q/W/E 전부 강화'}
];

export const MAPS = {
 maple:{id:'maple',name:'메이플아지트',subtitle:'PC방 · 해커 / 아이돌 전직 Lv. 10',en:'MAPLE HIDEOUT',description:'역삼역 1번 출구에서 이어지는 PC방. 컴퓨터 앞에 앉아 작업 중인 휴프로에게 Lv.10 병아리는 해커, 수달은 아이돌로 전직할 수 있어요.',width:1800,danger:0,minLevel:1,maxLevel:1,color:'#9fe8cf',background:'maple-hideout',portals:[]},
 town:{id:'town',name:'역삼역 1번 출구',subtitle:'마을 · 안전 구역',en:'YEOKSAM STATION',description:'모험이 시작되는 역삼역. 안내를 듣고 물약을 챙겨요.',width:2600,danger:0,minLevel:1,maxLevel:1,position:[12,20],color:'#8bdbc2',portals:[]},
 olympic:{id:'olympic',name:'올림픽공원',subtitle:'시위대 전직 · Lv. 10',en:'OLYMPIC PARK',description:'역삼역 1번 출구와 연결된 공원. 빨간 두건을 두르고 화염병을 든 여우 레드폭스에게 Lv. 10 고양이가 시위대 전직을 배울 수 있어요.',width:2200,danger:0,minLevel:1,maxLevel:1,color:'#f6b09d',background:'olympic-park',portals:[]},
 crossroads:{id:'crossroads',name:'역삼역사거리',subtitle:'사냥터 · Lv. 1–3',en:'YEOKSAM CROSSROADS',description:'역삼역 1번 출구와 6번 출구를 잇는 사거리. 신호 로봇을 조심하세요.',width:2400,danger:1,minLevel:1,maxLevel:3,position:[38,20],color:'#f1c477',background:'crossroads',monster:'신호 로봇',robotTint:'hue-rotate(25deg)',portals:[]},
 station6:{id:'station6',name:'역삼역 6번 출구',subtitle:'출구 광장 · 안전 구역',en:'YEOKSAM STATION · EXIT 6',description:'사거리를 건너 도착한 조용한 출구 광장. 오른쪽 포탈은 강남성균검도관으로 이어집니다.',width:1800,danger:0,minLevel:1,maxLevel:1,position:[64,20],color:'#9edbc8',background:'station-six',portals:[]},
 alley:{id:'alley',name:'테헤란 뒷골목',subtitle:'던전 · Lv. 1–3',en:'TEHERAN BACKSTREET',description:'작은 로봇들이 돌아다니는 첫 번째 사냥터.',width:2600,danger:1,minLevel:1,maxLevel:3,position:[12,51],color:'#93d8db',tint:'#113b5270',monster:'꼬마 로봇',portals:[]},
 depths:{id:'depths',name:'불 꺼진 공사장',subtitle:'던전 · Lv. 4–8',en:'THE SILENT BLOCK',description:'가동을 멈추지 않는 경비 로봇이 공사장을 지켜요.',width:3000,danger:2,minLevel:4,maxLevel:8,position:[12,82],color:'#c4afe5',tint:'#181e42ab',monster:'경비 로봇',robotTint:'hue-rotate(145deg) saturate(.8)',portals:[]},
 gym:{id:'gym',name:'피치플레이헬스&필라테스 역삼점',subtitle:'바디빌더 전직 · Lv. 10',en:'PEACH PLAY · YEOKSAM',description:'역삼역 1번 출구와 바로 연결됩니다. Lv. 10부터 코치에게 바디빌더 전직을 배워요. HP와 MP가 빠르게 회복됩니다.',width:1600,danger:0,minLevel:1,maxLevel:1,position:[64,51],color:'#efbb84',backgroundTile:0,portals:[]},
 dojo:{id:'dojo',name:'강남성균검도관',subtitle:'검사 전직 · Lv. 10',en:'GANGNAM SUNGKYUN KENDO',description:'역삼역 6번 출구에서 들어올 수 있어요. Lv. 10부터 사범에게 검사로 전직해 막기를 배워요. Lv. 15에는 섬광 연참을 습득합니다.',width:1600,danger:0,minLevel:1,maxLevel:1,position:[89,20],color:'#a9d3f0',background:'dojo',portals:[]},
 park:{id:'park',name:'달빛 근린공원',subtitle:'던전 · Lv. 3–5',en:'MOONLIT NEIGHBORHOOD PARK',description:'달빛이 비치는 산책로. 수풀 사이로 정찰 로봇이 나타나요.',width:2600,danger:1,minLevel:3,maxLevel:5,position:[38,51],color:'#a3d7a2',backgroundTile:1,monster:'정찰 로봇',robotTint:'hue-rotate(45deg)',portals:[]},
 subway:{id:'subway',name:'폐쇄된 지하 승강장',subtitle:'던전 · Lv. 6–9',en:'FORGOTTEN SUBWAY PLATFORM',description:'운행이 끝난 승강장에 남은 순찰 로봇. 공원과 공사장을 이어 줍니다.',width:3300,danger:3,minLevel:6,maxLevel:9,position:[38,82],color:'#8ac9f2',backgroundTile:2,monster:'순찰 로봇',robotTint:'hue-rotate(70deg) saturate(1.4)',portals:[]},
 rooftop:{id:'rooftop',name:'테헤란 스카이루프',subtitle:'던전 · Lv. 10–13',en:'TEHERAN SKYROOF',description:'강화 로봇이 지키는 옥상. 오른쪽 끝 포탈 너머 방치된 중계소에서 Lv. 13 이후의 사냥을 이어가요.',width:3600,danger:4,minLevel:10,maxLevel:13,position:[64,82],color:'#efa6b7',backgroundTile:3,monster:'강화 로봇',robotTint:'hue-rotate(175deg) saturate(1.6)',portals:[]},
 relay:{id:'relay',name:'방치된 중계소',subtitle:'고레벨 던전 · Lv. 13–16',en:'ABANDONED SIGNAL RELAY',description:'옥상 안테나 아래 전파 로봇이 모여 있어요. Lv. 13부터 사냥하며 Lv. 15 궁극기를 준비하기 좋은 곳입니다.',width:3200,danger:5,minLevel:13,maxLevel:16,color:'#e9bd83',background:'high-dungeons',backgroundTile:0,monster:'전파 로봇',monsterCount:8,robotTint:'hue-rotate(215deg) saturate(1.25)',portals:[]},
 canal:{id:'canal',name:'지하 냉각수로',subtitle:'고레벨 던전 · Lv. 17–20',en:'UNDERGROUND COOLING CANAL',description:'중계소 아래로 이어지는 푸른 수로. 냉각 로봇 무리를 상대하고 오른쪽 자동화 주조소로 사냥을 이어가세요.',width:3400,danger:6,minLevel:17,maxLevel:20,color:'#82d8d3',background:'high-dungeons',backgroundTile:1,monster:'냉각 로봇',monsterCount:8,robotTint:'hue-rotate(55deg) saturate(1.7)',portals:[]},
 foundry:{id:'foundry',name:'자동화 주조소',subtitle:'고레벨 던전 · Lv. 21–24',en:'AUTOMATED FOUNDRY',description:'밤새 붉게 타오르는 용광로와 제련 로봇. 더 강한 접촉 공격에 대비해 회복과 막기를 활용하세요. 강남역 마을에서 정비하거나 중앙 제어실로 사냥을 이어갈 수 있어요.',width:3600,danger:7,minLevel:21,maxLevel:24,color:'#f3a28a',background:'high-dungeons',backgroundTile:2,monster:'제련 로봇',monsterCount:9,robotTint:'hue-rotate(195deg) saturate(2)',portals:[]},
 gangnam:{id:'gangnam',name:'강남역',subtitle:'마을 · 안전 구역',en:'GANGNAM STATION',description:'자동화 주조소를 지나 만나는 안전한 마을. 마구리에게 물약과 귀환 주문서를 구입하고, 오른쪽 빨간 포탈로 한사발포차 보스에 도전하세요.',width:2200,danger:0,minLevel:1,maxLevel:1,color:'#9ce1d4',background:'gangnam',portals:[]},
 pocha:{id:'pocha',name:'한사발포차 역삼점',subtitle:'중간보스 · 권장 Lv. 20–25',en:'HANSABAL POCHA · DUEL',description:'강남역 마을의 빨간 포탈로 들어오는 포차. 신원미상의 예비군에게 말을 걸면 Lv. 25 중간보스 결투가 시작됩니다. 전투 중 물약 재사용 10초. 보상: EXP 3,500 · 이동속도 +20% 군복.',width:1600,danger:0,boss:true,respawn:{map:'gangnam',x:650,y:648},minLevel:20,maxLevel:25,color:'#eabb77',background:'hansabal-pocha',portals:[]},
 nexus:{id:'nexus',name:'중앙 제어실',subtitle:'고레벨 던전 · Lv. 25–30',en:'CENTRAL CONTROL NEXUS',description:'도시의 로봇을 제어하는 중앙 시설. 오른쪽 가속 실험구역부터 Lv. 31–40의 새로운 사냥길이 이어집니다.',width:4000,danger:8,minLevel:25,maxLevel:30,color:'#c7b3f6',background:'high-dungeons',backgroundTile:3,monster:'코어 수호 로봇',monsterCount:10,robotTint:'hue-rotate(110deg) saturate(2)',portals:[]},
 accelerator:{id:'accelerator',name:'가속 실험구역',subtitle:'고레벨 던전 · Lv. 31–33',en:'ACCELERATOR LAB',description:'중앙 제어실 뒤의 폐쇄 실험구역. 푸른 가속 코일 사이를 고속 정찰 로봇이 지켜요.',width:3800,danger:9,minLevel:31,maxLevel:33,color:'#7cdcf2',background:'endgame-dungeons',backgroundTile:0,monster:'가속 정찰 로봇',monsterCount:10,robotTint:'hue-rotate(35deg) saturate(1.6)',portals:[]},
 arsenal:{id:'arsenal',name:'병기 조립라인',subtitle:'고레벨 던전 · Lv. 34–36',en:'WEAPONS ASSEMBLY',description:'전투 로봇이 생산되는 심층 공장. 조립 로봇을 돌파하고 적색 동력로로 이동하세요.',width:4000,danger:10,minLevel:34,maxLevel:36,color:'#bea6f7',background:'endgame-dungeons',backgroundTile:1,monster:'병기 조립 로봇',monsterCount:11,robotTint:'hue-rotate(120deg) saturate(1.7)',portals:[]},
 reactor:{id:'reactor',name:'적색 동력로',subtitle:'고레벨 던전 · Lv. 37–40',en:'CRIMSON REACTOR',description:'Lv. 40까지 사냥할 수 있는 최심부. 오른쪽 빨간 포탈은 Lv. 35 A형이 있는 수료조건으로 연결됩니다.',width:4200,danger:11,minLevel:37,maxLevel:40,color:'#ff8e9d',background:'endgame-dungeons',backgroundTile:2,monster:'동력로 수호 로봇',monsterCount:12,robotTint:'hue-rotate(185deg) saturate(2.2)',portals:[]},
 hangar:{id:'hangar',name:'수료조건',subtitle:'보스 · Lv. 35 A형',en:'GRADUATION REQUIREMENT',description:'대형 전투 로봇 A형. F로 가동합니다. HP 40%에 5초 안전지대 시험, 20%에 광폭화합니다. 파란 영역으로 이동하거나 무적기로 즉사를 피하세요. 오른쪽 포탈은 A형 칭호를 장착한 상태에서만 역삼역주변거리로 이동할 수 있어요. 전투 중에는 이용할 수 없습니다.',width:1800,danger:0,boss:true,respawn:{map:'gangnam',x:650,y:648},bossName:'A형',bossLevel:35,minLevel:35,maxLevel:40,color:'#ff7088',background:'endgame-dungeons',backgroundTile:3,portals:[]},
 yeoksamStreet:{id:'yeoksamStreet',name:'역삼역주변거리',subtitle:'마을 · 안전 구역',en:'YEOKSAM NEIGHBORHOOD',description:'수료조건 너머의 조용한 역삼 거리. 마구리에게 물약을 구입하고 쉬어 갈 수 있어요. 왼쪽 포탈은 수료조건으로 돌아갑니다.',width:2200,danger:0,minLevel:1,maxLevel:1,color:'#9ce1a5',background:'city',portals:[]}

};
// Every connection is bidirectional and arrivals stay outside the return portal's interaction radius.
function connect(a,ax,b,bx){
 const add=(from,x,to,tx)=>MAPS[from].portals.push({x,y:646,to,spawnX:tx+(tx<MAPS[to].width/2?190:-190),spawnY:648,label:MAPS[to].name,level:MAPS[to].boss?`보스 · 권장 Lv. ${MAPS[to].minLevel}–${MAPS[to].maxLevel}`:MAPS[to].danger?`권장 Lv. ${MAPS[to].minLevel}–${MAPS[to].maxLevel}`:'안전 구역'});
 add(a,ax,b,bx);add(b,bx,a,ax);
}
connect('town',2430,'alley',100);
connect('town',1830,'crossroads',100);
connect('crossroads',2230,'station6',100);
connect('station6',1630,'dojo',100);
connect('alley',2430,'depths',100);
connect('town',100,'park',2430);
connect('town',1370,'gym',1430);
connect('town',2090,'olympic',100);
connect('town',1610,'maple',100);
connect('park',100,'subway',1540);
connect('depths',2830,'subway',100);
connect('subway',3130,'rooftop',100);
connect('rooftop',3430,'relay',100);
connect('relay',3030,'canal',100);
connect('canal',3230,'foundry',100);
connect('foundry',2950,'gangnam',100);
connect('gangnam',1930,'pocha',100);
connect('foundry',3430,'nexus',100);
connect('nexus',3830,'accelerator',100);
connect('accelerator',3630,'arsenal',100);
connect('arsenal',3830,'reactor',100);
connect('reactor',4030,'hangar',100);
connect('hangar',1640,'yeoksamStreet',100);

// Route lists describe actual adjacent portals; the map never implies a shortcut.
export const MAP_ROUTES = [
 {id:'maple-route',tab:'town',title:'해커 · 아이돌 전직',hint:'Lv.10 · 메이플아지트의 휴프로',maps:['town','maple']},
 {id:'backstreet',tab:'hunt',title:'골목 사냥길',hint:'Lv. 1–9 · 공사장을 지나 승강장으로',maps:['town','alley','depths','subway']},
 {id:'parkway',tab:'hunt',title:'공원 사냥길',hint:'Lv. 3–9 · 승강장으로 가는 짧은 길',maps:['town','park','subway']},
 {id:'deep-route',tab:'advanced',title:'도시의 깊은 밤',hint:'Lv. 10–30 · 아래로 갈수록 강한 몬스터',maps:['rooftop','relay','canal','foundry','nexus']},
 {id:'endgame-route',tab:'advanced',title:'A형을 향한 심층 사냥길',hint:'Lv. 31–40 · 마지막 지역에서 Lv.35 A형에 도전',maps:['nexus','accelerator','arsenal','reactor','hangar','yeoksamStreet']},
 {id:'boss-route',tab:'advanced',title:'신원미상의 예비군의 결투',hint:'주조소 → 강남역에서 정비 → Lv.25 보스',maps:['foundry','gangnam','pocha']},
 {id:'yeoksam-street-route',tab:'town',title:'역삼역주변거리',hint:'수료조건 → 안전구역 · A형 칭호 장착 필수 · 전투 중 이동 불가',maps:['hangar','yeoksamStreet']},
 {id:'gangnam-route',tab:'town',title:'강남역 마을',hint:'주조소에서 이동 · 물약과 두 마을 귀환 주문서',maps:['foundry','gangnam']},
 {id:'gym-route',tab:'town',title:'바디빌더 전직',hint:'Lv. 10 · 1번 출구에서 바로 이동',maps:['town','gym']},
 {id:'dojo-route',tab:'town',title:'검사 전직',hint:'Lv. 10 · 몬스터가 있는 사거리를 통과',maps:['town','crossroads','station6','dojo']},
 {id:'olympic-route',tab:'town',title:'고양이 · 시위대 전직',hint:'Lv. 10 · 1번 출구에서 올림픽공원으로',maps:['town','olympic']}
];
export const mapTabFor=id=>['rooftop','relay','canal','foundry','nexus','pocha','accelerator','arsenal','reactor','hangar'].includes(id)?'advanced':['town','crossroads','station6','gym','dojo','gangnam','olympic','yeoksamStreet','maple'].includes(id)?'town':'hunt';
// A schematic world layout; paths are derived from real portals, never from visual proximity.
export const WORLD_MAP_LAYOUT = {
 gym:{x:140,y:72,label:'피치플레이'},town:{x:350,y:72,label:'역삼역 1번 출구'},crossroads:{x:560,y:72,label:'역삼역사거리'},station6:{x:770,y:72,label:'역삼역 6번 출구'},dojo:{x:980,y:72,label:'강남성균검도관'},
 depths:{x:140,y:235,label:'불 꺼진 공사장'},alley:{x:350,y:235,label:'테헤란 뒷골목'},park:{x:560,y:235,label:'달빛 근린공원'},
 subway:{x:350,y:338,label:'폐쇄된 승강장'},rooftop:{x:560,y:338,label:'테헤란 스카이루프'},relay:{x:770,y:338,label:'방치된 중계소'},canal:{x:980,y:338,label:'지하 냉각수로'},
 nexus:{x:560,y:441,label:'중앙 제어실'},foundry:{x:770,y:441,label:'자동화 주조소'},gangnam:{x:980,y:441,label:'강남역'},
 accelerator:{x:350,y:441,label:'가속 실험구역'},arsenal:{x:140,y:441,label:'병기 조립라인'},reactor:{x:140,y:528,label:'적색 동력로'},hangar:{x:350,y:528,label:'수료조건'},yeoksamStreet:{x:560,y:528,label:'역삼역주변거리'},
 pocha:{x:980,y:528,label:'한사발포차'},
 maple:{x:90,y:140,label:'메이플아지트'},
 olympic:{x:250,y:140,label:'올림픽공원'}
};
export function worldMapConnections(){
 const seen=new Set(),edges=[];
 for(const map of Object.values(MAPS))for(const portal of map.portals){
  const key=[map.id,portal.to].sort().join(':');if(seen.has(key))continue;
  seen.add(key);edges.push({key,from:map.id,to:portal.to});
 }
 return edges;
}
export const monsterCount=id=>MAPS[id]?.danger?(MAPS[id].monsterCount??6):0;
export function recommendedMap(level){
 const candidates=Object.values(MAPS).filter(m=>m.danger&&m.id!=='crossroads').sort((a,b)=>b.minLevel-a.minLevel);
 return candidates.find(m=>level>=m.minLevel)??MAPS.alley;
}
export function findMapRoute(from,to){
 if(!Object.hasOwn(MAPS,from)||!Object.hasOwn(MAPS,to))return [];
 const queue=[[from]],seen=new Set([from]);
 for(let i=0;i<queue.length;i++){
  const path=queue[i],last=path.at(-1);if(last===to)return path;
  for(const portal of MAPS[last].portals)if(!seen.has(portal.to)){seen.add(portal.to);queue.push([...path,portal.to]);}
 }
 return [];
}

export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const xpNeeded=level=>(level<10?48:80)*level;
const classFor=p=>CLASSES.find(c=>c.id===p.classId)||CLASSES[0];
// Round the rabbit's 70% base HP before applying temporary max-HP buffs.
export const maxHp=p=>Math.round(Math.round((classFor(p).hp+(p.level-1)*20)*(p.classId==='rabbit'?7:10)/10)*(p.respectTime>0?1.2:1));
export const maxMp=p=>classFor(p).mp+(p.level-1)*10;
export const attackPower=p=>(classFor(p).attack+(p.level-1)*5)*(p.respectTime>0?1.2:1)*(hasTypeATitle(p)?1.05:1)*(p.concertTime>0?1.2:1);
export const isPowered=p=>p?.job==='bodybuilder'&&p.powerTime>0;
export const basicAttackPower=p=>Math.round(attackPower(p)*(isPowered(p)?1.8:1));
export function effectiveSkill(p,key){
 const base=SKILLS.find(s=>s.key===key);if(!base)return null;let skill={...base};
 if(p?.classId==='otter'){
  const clean={...skill,heal:0,recovery:0,reduction:0,enhanced:''};
  if(key==='q')return {...clean,name:'물 뿜기',icon:'💦',mp:10,cooldown:3,damage:2.4,range:420,halfLane:60,description:'입에서 물을 뿜어 전방 사거리 안의 가장 가까운 적 하나를 공격합니다.'};
  if(key==='w')return {...clean,name:'작은 파도',icon:'≈',mp:14,cooldown:6,damage:1.6,range:560,speed:560,halfLane:96,rideWindow:.6,description:'앞으로 파도를 보냅니다. 0.6초 안에 W를 다시 누르면 남은 거리를 파도에 타고 이동합니다. 추가 MP 소모는 없고 무적은 아닙니다.'};
  if(key==='e')return {...clean,name:'물방울 가드',icon:'◉',mp:22,cooldown:10,damage:1.8,shield:.3,duration:5,orbit:100,description:'최대 HP의 30% 보호막과 3개의 물방울을 5초간 얻습니다. 각 물방울은 적 하나에게 닿으면 피해를 주고 따로 사라집니다. 보호막이 깨져도 남은 물방울은 유지됩니다.'};
  if(key==='r')return {...clean,name:'콘서트',icon:'♡',mp:40,cooldown:40,damage:1,tick:.5,duration:5,buff:.2,heal:.1,reduction:.5,description:'5초간 춤을 춥니다. 춤추는 동안 이동할 수 있습니다. 시전할 때 화면에 보이는 적들에게 지속 피해를 주고, 해당 무대 안의 자신과 아군은 공격력·이동속도 +20%, 초당 최대 HP 10% 회복. 춤추는 동안 받는 피해 50% 감소. 다른 공격·점프는 사용할 수 없습니다.'};
 }
 if(p?.classId==='chick'){
  const clean={...skill,heal:0,recovery:0,reduction:0,enhanced:''};
  if(key==='q')return {...clean,name:p.job==='hacker'?'코드 침투':'할퀴기',icon:'✦',mp:8,cooldown:2.4,damage:2.1,range:p.job==='hacker'?520:175,description:p.job==='hacker'?'사거리 안에서 가장 가까운 적 하나를 해킹해 푸른 폭발과 함께 피해를 줍니다.':'앞쪽의 적을 발톱으로 긁습니다.'};
  if(key==='w')return {...clean,name:'시크릿 모드',icon:'◌',mp:14,cooldown:10,damage:0,range:0,duration:5,invulnerable:.5,description:'사용 직후 0.5초 무적 · 최대 5초 은신 · 이동속도 +50%. 적 추적과 접촉 피해를 피하며, 마법 피격 또는 공격 발동 시 해제돼요. 은신 중 다음 공격 +20%. E 차징 중 유지됩니다.'};
  if(key==='e')return {...clean,name:'시스템 정지',icon:'▧',mp:24,cooldown:14,damage:4.5,range:110,maxRange:600,charge:1.5,aimSpeed:490,width:332,height:152,stun:2,description:'E를 최대 1.5초 눌러 사각 범위를 빠르게 전진시켜요. 차징 중에는 이동할 수 없어요. 놓으면 범위 피해와 2초 경직. 경직된 적은 흑백으로 변해요.'};
  if(key==='r')return {...clean,name:'해킹',icon:'⌘',mp:38,cooldown:40,damage:1.25,tick:.5,duration:5,selection:10,reduction:.8,description:'대상 선택 중 시야를 넓혀 가장 가까운 적을 먼저 조준하고, 확정하면 원래 시야로 돌아옵니다. 좌우로 선택, Enter로 확정, Esc로 취소. 5초 경직과 지속 피해. 선택·해킹 중 이동 불가, 받는 피해 80% 감소. 10초 안에 확정하세요.'};
 }
 if(p?.classId==='rabbit'){
  const clean={...skill,heal:0,recovery:0,reduction:0,enhanced:''};
  if(key==='q')return {...clean,name:'보랏빛 번개',icon:'ϟ',mp:20,cooldown:2.8,damage:2.4,range:p.job==='mage'?540:360,description:p.job==='mage'?'전방으로 보라색 번개를 쏘아 경로의 적을 공격해요. 전직으로 사거리가 50% 늘어납니다.':'전방으로 보라색 번개를 쏘아 경로의 적을 공격해요.'};
  if(key==='w')return {...clean,name:p.job==='mage'?'순간 이동':'앞구르기',icon:'↠',mp:8,cooldown:2,damage:0,range:0,dash:p.job==='mage'?260:180,description:p.job==='mage'?'전방으로 순간 이동해요. 피해는 없으며 재사용은 2초예요.':'앞으로 빠르게 굴러요. 피해는 없으며 재사용은 2초예요.'};
  if(key==='e')return {...clean,name:'마력 방벽',icon:'◈',mp:29,cooldown:9,damage:2.6,range:240,shield:.3,duration:3,description:'3초간 최대 HP의 30%를 흡수하는 보호막을 얻고 주변에 마력을 방출해요.'};
  if(key==='r')return {...clean,name:'존경!',icon:'敬',mp:46,cooldown:35,damage:0,range:360,duration:10,description:'대상을 선택하고 경례합니다. 10초간 이동속도·공격력·최대 HP +20%, 받는 피해 20% 감소. 주변 적은 3초간 존경 상태로 공격력이 30% 감소해요.'};
 }
 if(p?.classId==='cat'){
  if(key==='q')return {...skill,name:'앞발 할퀴기',icon:'爪',mp:9,cooldown:2.4,damage:2.25,range:195,description:'전방의 적을 발톱으로 크게 할퀴어요.',enhanced:''};
  if(key==='w')return {...skill,name:'뒤로 뛰기',icon:'↶',mp:12,cooldown:3.5,damage:0,range:0,dash:210,invulnerable:.7,description:'바라보는 방향의 뒤로 빠르게 뛰어 0.7초 동안 무적이 돼요.',enhanced:''};
  if(key==='e')return {...skill,name:p.job==='protester'?'화염병':'전직 스킬',icon:'🔥',mp:20,cooldown:7,damage:2.75,range:180,maxRange:490,charge:1,radius:189,burnRadius:184.212,burn:3,description:p.job==='protester'?'E를 최대 1초간 누르면 사거리가 늘어요. 차징·투척 중 이동할 수 없고, 착탄 후 바닥에 3초간 불길을 남깁니다.':'올림픽공원에서 시위대로 전직하세요.',enhanced:''};
  if(key==='r')return {...skill,name:p.job==='protester'?'부정선거':'전직 궁극기',icon:'▣',mp:36,cooldown:32,damage:.9,range:490,duration:5,tick:.5,pull:20,hp:1500,description:p.job==='protester'?'시전 직후 0.3초간 행동할 수 없습니다. 체력 1500의 투표함을 5초간 설치해 주변 적의 우선 공격대상이 됩니다. 지속 피해를 주며 맞을 때마다 중심으로 조금씩 끌어당겨요.':'올림픽공원에서 시위대로 전직하세요.',enhanced:''};
 }
 if(base.requiresJob&&!JOBS[p.job])skill={...skill,name:key==='e'?'전직 스킬':'전직 궁극기',description:'Lv. 10부터 헬스장 또는 검도장에서 전직하세요.',enhanced:''};
 if(p.job==='swordsman'&&key==='q')skill={...skill,name:'번개 베기',range:skill.range*1.2,rearRange:140,description:'검을 크게 휘둘러 전방과 몸 주변, 등 뒤 가까운 적을 베어요.'};
 if(p.job==='swordsman'&&key==='w')skill={...skill,name:'발도 돌진',range:skill.range*1.2,dash:skill.dash*1.2,description:'검을 뽑으며 앞으로 돌진해 경로의 적을 베어요.'};
 if(p.job==='bodybuilder'&&key==='q')skill={...skill,cooldown:1.7};
 if(p.job==='bodybuilder'&&key==='w')skill={...skill,name:'어깨 돌진',description:'어깨를 내밀어 전방의 적에게 강하게 부딪혀요.'};
 if(p.job==='swordsman'&&key==='e')skill={...skill,name:'막기',icon:'◈',heal:0,recovery:0,reduction:0,guard:2,releaseDash:effectiveSkill(p,'w').dash/2,releaseRange:180,releaseDamage:1.8,releaseDuration:.28,description:'2초 동안 검으로 공격을 막아요. 막는 동안 E를 다시 누르면 즉시 막기를 풀고 W 거리의 절반만큼 전진하며 주변을 발도로 베어요. 막기에 성공할 때마다 이 발도의 피해가 10%씩 증가하며 최대 50%까지 강해집니다. 강화는 이번 막기에만 적용됩니다. 추가 MP 소모 없이 기존 재사용 시간을 유지합니다. 방어 중에는 다른 공격과 스킬을 사용할 수 없어요.',enhanced:''};
 if(p.job==='swordsman'&&key==='r')skill={...skill,name:'섬광 연참',icon:'⚔',range:'map',cameraRange:650,damage:7,singleTargetMultiplier:2,charge:3,maxTargets:5,reduction:.8,description:'R을 눌러 현재 맵 전체에서 가까운 적부터 최대 5명을 조준해요. 손을 떼거나 3초가 지나면 순간이동하며 베어요. 발동 시 살아 있는 조준 대상이 1명이면 피해가 2배가 돼요. 기 모으기와 연속 베기 중 받는 피해가 80% 감소해요.',enhanced:''};
 if(p.job==='bodybuilder'&&key==='r')skill={...skill,cooldown:40};
 if(!isPowered(p)||key==='r')return skill;
 return {...skill,description:key==='e'?'팔을 X자로 막아 1.5초간 받는 피해를 50% 줄이고 HP를 최대치의 70%만큼 서서히 회복해요. 회복 중 이동속도는 평소의 60%이며 일반 공격과 다른 스킬은 사용할 수 없어요.':skill.description,damage:skill.damage*2,range:skill.range*(key==='w'?1.6:1.5),dash:skill.dash?skill.dash*1.6:undefined,heal:skill.heal ? .7 : undefined,cooldown:skill.cooldown*.5};
}
export const skillsFor=p=>SKILLS.map(s=>effectiveSkill(p,s.key));
export const skillUnlocked=(p,s)=>p.level>=s.level&&(!s.requiresJob||!!JOBS[p.job]);
export function advanceJob(p,job){
 const target=Object.hasOwn(JOBS,job)?JOBS[job]:null;
 if(!target)return {ok:false,message:'선택할 수 없는 직업이에요.'};
 if(p.classId!==(target.classId||'wanderer'))return {ok:false,message:'이 캐릭터가 전직할 수 없는 직업이에요.'};
 if(p.job)return {ok:false,message:'이미 전직했어요. 이 캐릭터의 직업은 변경할 수 없어요.'};
 if(p.level<10)return {ok:false,message:'전직은 Lv. 10부터 할 수 있어요.'};
 if(!(target.maps||[target.map]).includes(p.map))return {ok:false,message:job==='mage'?'안전구역의 마구리에게 전직을 배워요.':`${MAPS[target.map].name}의 사범에게 전직을 배워요.`};
 p.job=job;p.powerTime=0;
 return {ok:true,message:`${target.name} 전직 완료! E · ${target.e} 습득${p.level>=15?' / R · '+target.r+' 습득':''}`};
}
export const uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function createCharacter(name,classId='wanderer'){
 const clean=String(name).trim();
 if(!/^[\p{L}\p{N}_ ]{1,12}$/u.test(clean))throw new Error('이름은 한글·영문·숫자 1~12자로 입력해 주세요.');
 const stats=CLASSES.find(c=>c.id===classId);if(!stats)throw new Error('선택할 수 없는 캐릭터입니다.');
 return {id:uid(),name:clean,classId,job:null,level:1,xp:0,hp:maxHp({classId,level:1}),mp:stats.mp,money:500,potions:3,largePotions:0,mpPotions:classId==='rabbit'?1:0,mpPotionCooldown:0,returnScrolls:0,gangnamScrolls:0,yeoksamStreetScrolls:0,quickSlots:['potions',classId==='rabbit'?'mpPotions':null,null],uniform:0,uniformEquipped:false,typeATitle:0,typeATitleEquipped:false,bossWins:0,typeAWins:0,scrap:0,cores:0,kills:0,map:'town',x:530,y:648,savedAt:null,visited:['town'],respectTime:0,concertTime:0,powerTime:0,cooldowns:{q:0,w:0,e:0,r:0}};
}
export function normalizeCharacter(raw){
 if(!raw||typeof raw.id!=='string'||typeof raw.name!=='string')return null;
 let p;try{p=createCharacter(raw.name,CLASSES.some(c=>c.id===raw.classId)?raw.classId:'wanderer');}catch{return null;}
 // Starter supplies are only granted on creation, never while loading older saves.
 p.mpPotions=0;p.quickSlots=['potions',null,null];
 p.id=raw.id.slice(0,100);
 for(const key of ['level','xp','money','potions','largePotions','mpPotions','returnScrolls','gangnamScrolls','yeoksamStreetScrolls','scrap','cores','kills','bossWins','typeAWins'])if(Number.isFinite(raw[key]))p[key]=Math.floor(clamp(raw[key],key==='level'?1:0,key==='level'?99:9999999));
 if(Array.isArray(raw.quickSlots))p.quickSlots=Array.from({length:3},(_,i)=>validItem(raw.quickSlots[i])&&ITEMS[raw.quickSlots[i]].usable?raw.quickSlots[i]:null);
 p.uniform=Number.isFinite(raw.uniform)&&raw.uniform>0?1:0;p.uniformEquipped=p.uniform>0&&raw.uniformEquipped===true;
 // Existing victories also unlock the new reward; equipping remains the player's choice.
 p.typeATitle=p.typeAWins>0||(Number.isFinite(raw.typeATitle)&&raw.typeATitle>0)?1:0;p.typeATitleEquipped=p.typeATitle>0&&raw.typeATitleEquipped===true;
 p.job=p.level>=10&&Object.hasOwn(JOBS,raw.job)&&(p.classId===(JOBS[raw.job].classId||'wanderer'))?raw.job:null;
 p.map=MAPS[raw.map]?raw.map:'town';p.x=Number.isFinite(raw.x)?clamp(raw.x,45,MAPS[p.map].width-45):530;p.y=Number.isFinite(raw.y)?clamp(raw.y,580,720):648;
 p.mpPotionCooldown=MAPS[p.map]?.boss&&Number.isFinite(raw.mpPotionCooldown)?clamp(raw.mpPotionCooldown,0,10):0;
 p.hp=Number.isFinite(raw.hp)?clamp(raw.hp,0,maxHp(p)):maxHp(p);p.mp=Number.isFinite(raw.mp)?clamp(raw.mp,0,maxMp(p)):maxMp(p);
 p.savedAt=typeof raw.savedAt==='string'?raw.savedAt:null;
 p.visited=[...new Set(['town',...(Array.isArray(raw.visited)?raw.visited.filter(id=>MAPS[id]):[]),p.map])];
 // Re-enter in normal form; retain cooldowns so reopening cannot recharge the ultimate.
 for(const s of SKILLS)p.cooldowns[s.key]=Number.isFinite(raw.cooldowns?.[s.key])?clamp(raw.cooldowns[s.key],0,effectiveSkill(p,s.key).cooldown):0;
 if(p.hp<=0)respawn(p);
 // Spend saved XP against the reduced early-game thresholds without losing the remainder.
 if(p.level<10)gainXp(p,0);
 return p;
}
export const xpReward=(p,amount)=>Math.round(Math.max(0,amount)*(p.classId==='chick'&&p.job==='hacker'?1.3:1));
export function gainXp(p,amount){p.xp+=xpReward(p,amount);let gained=0;while(p.xp>=xpNeeded(p.level)&&p.level<99){p.xp-=xpNeeded(p.level);p.level++;gained++;p.hp=maxHp(p);p.mp=maxMp(p);}return gained;}
export function respawn(p){
 // Boss checkpoints are on the approach side, never beyond a title-gated exit.
 const destination=MAPS[p.map]?.respawn||{map:'town',x:530,y:648};
 p.map=destination.map;p.x=destination.x;p.y=destination.y;
 p.powerTime=0;p.respectTime=0;p.concertTime=0;p.hp=maxHp(p);p.mp=maxMp(p);p.mpPotionCooldown=0;
 if(!p.visited.includes(p.map))p.visited.push(p.map);
 return p;
}
export function buyPotion(p){return buyItem(p,'potions');}
export function usePotion(p,id='potions'){const amount=validItem(id)?ITEMS[id].hpRestore:0;if(!amount||!(p[id]>0))return {ok:false,message:'회복 아이템이 없어요. 마구리의 상점을 찾아보세요.'};if(p.hp>=maxHp(p))return {ok:false,message:'체력이 이미 가득 찼어요.'};const restored=Math.min(amount,maxHp(p)-p.hp);p[id]--;p.hp+=restored;return {ok:true,message:`체력이 ${Math.round(restored)} 회복되었어요.`};}
export function canUseSkill(p,key,cooldown=p.cooldowns?.[key]??0){
 const s=effectiveSkill(p,key);if(!s)return {ok:false,message:'알 수 없는 스킬이에요.'};
 if(p.level<s.level)return {ok:false,message:`${s.name}은 Lv. ${s.level}에 배울 수 있어요.`};
 if(s.requiresJob&&!JOBS[p.job])return {ok:false,message:['chick','otter'].includes(p.classId)?'메이플아지트의 휴프로에게 먼저 전직해 주세요.':p.classId==='rabbit'?'마구리에게 먼저 전직해 주세요.':p.classId==='cat'?'올림픽공원에서 먼저 전직해 주세요.':'헬스장이나 검도장에서 먼저 전직해 주세요.'};
 if(key==='r'&&isPowered(p))return {ok:false,message:'이미 근육 펭귄으로 변신 중이에요.'};
 if(cooldown>0)return {ok:false,message:'스킬이 아직 준비되지 않았어요.'};
 if(p.mp<s.mp)return {ok:false,message:'MP가 부족해요. 잠시 기다리면 회복됩니다.'};
 if(s.heal&&!s.reduction&&p.hp>=maxHp(p))return {ok:false,message:'체력이 이미 가득 찼어요.'};return {ok:true,skill:s};
}
export function makeMonster(mapId,index){
 const map=MAPS[mapId],intervals=Math.max(1,monsterCount(mapId)-1),step=(map.width-600-(map.monsterCount?600:250))/intervals,x=600+index*step;
 const level=map.minLevel+Math.floor(index*(map.maxLevel-map.minLevel)/intervals),strong=map.danger>=2;
 const hp=strong?60+level*15:28+level*12;
 return {id:uid(),x,y:620+(index%3)*37,home:x,level,hp,maxHp:hp,attack:strong?9+level*3:5+level*3,speed:strong?55+level*5:34+level*7,dead:false,respawnIn:0,hit:0,dir:index%2?1:-1,patrolY:580+(index*53)%141,phase:index*1.7};
}

// Spawn coordinates are used for respawning only, never as a patrol leash.
export function patrolMonster(m,mapId,dt){
 const left=60,right=MAPS[mapId].width-60;
 m.x=clamp(m.x+(m.dir||1)*m.speed*.7*dt,left,right);
 if(m.x<=left||m.x>=right){m.dir=m.x<=left?1:-1;m.patrolY=580+Math.random()*140;}
 const target=clamp(m.patrolY??m.y,580,720),dy=target-m.y;
 m.y=clamp(m.y+Math.sign(dy)*Math.min(Math.abs(dy),m.speed*.22*dt),580,720);
}
