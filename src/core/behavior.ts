/** Portable, testable simulation shared by desktop/web and future mobile clients. */
export type Activity='walk'|'idle'|'sit'|'groom'|'nap'|'play'|'look'|'jump'|'happy';
export type Direction=1|-1;
export const PET_IDS=['liam','ninoosh','ozy','slash'] as const;
export type PetId=typeof PET_IDS[number];
export type Placement='left'|'center'|'right';
export interface PetProfile {
 id:PetId; name:string; personality:'playful'|'calm'|'curious'|'energetic'; speed:number; scale:number;
}
export interface PetState {
 id:PetId; x:number; direction:Direction; activity:Activity;
 activityMs:number; elapsedMs:number; affection:number;
}
export interface Settings {
 size:number; floorOffset:number; placement:Placement;
 enabled:Record<PetId,boolean>; paused:boolean; playful:boolean;
 autoCheckUpdates:boolean;
}
export const PROFILES:Record<PetId,PetProfile>={
 liam:{id:'liam',name:'Liam',personality:'playful',speed:46,scale:1},
 ninoosh:{id:'ninoosh',name:'Ninoosh',personality:'calm',speed:29,scale:1.02},
 ozy:{id:'ozy',name:'Ozy',personality:'curious',speed:36,scale:1.04},
 slash:{id:'slash',name:'Slash',personality:'energetic',speed:51,scale:1.04}
};
export const DEFAULT_SETTINGS:Settings={
 size:140,floorOffset:16,placement:'left',
 enabled:{liam:true,ninoosh:true,ozy:true,slash:true},
 paused:false,playful:true,autoCheckUpdates:true
};
export function sanitizeSettings(raw:unknown):Settings {
 const r:Record<string,any>=raw&&typeof raw==='object'?raw as Record<string,any>:{};
 const sizes=[100,120,140,160,180],offsets=[0,12,16,24,48,80];
 const placement:Placement=['left','center','right'].includes(r.placement)?r.placement:'left';
 return {
  size:sizes.includes(r.size)?r.size:DEFAULT_SETTINGS.size,
  floorOffset:offsets.includes(r.floorOffset)?r.floorOffset:DEFAULT_SETTINGS.floorOffset,
  placement,
  enabled:Object.fromEntries(PET_IDS.map(id=>[id,r.enabled?.[id]!==false])) as Record<PetId,boolean>,
  paused:r.paused===true,playful:r.playful!==false,
  autoCheckUpdates:r.autoCheckUpdates!==false
 };
}
export const clamp=(x:number,min:number,max:number):number=>Math.min(Math.max(x,min),Math.max(min,max));
export function spawnX(placement:Placement,maxX:number,id:PetId):number {
 const bound=Math.max(0,maxX);
 const anchor=placement==='left'?0.08:placement==='right'?0.77:0.37;
 const offset:Record<PetId,number>={liam:0,ninoosh:.12,ozy:.24,slash:.36};
 return clamp(bound*(anchor+offset[id]),0,bound);
}
export function initialPet(id:PetId,maxX:number,placement:Placement='left'):PetState {
 return {id,x:spawnX(placement,maxX,id),direction:id==='liam'||id==='ozy'?1:-1,
  activity:'walk',elapsedMs:0,activityMs:2200,affection:0};
}
export function petCat(s:PetState):PetState {
 return {...s,activity:'happy',elapsedMs:0,activityMs:1300,affection:s.affection+1};
}
export function triggerActivity(s:PetState,activity:Activity):PetState {
 return {...s,activity,elapsedMs:0,activityMs:activity==='nap'?5000:activity==='walk'?2900:1500};
}
export function advancePet(old:PetState,deltaMs:number,maxX:number,random:()=>number=Math.random,playful=true):PetState {
 const s={...old},dt=clamp(deltaMs,0,250),bound=Math.max(0,maxX);
 s.elapsedMs+=dt;
 if(s.activity==='walk'){
  s.x+=s.direction*PROFILES[s.id].speed*dt/1000;
  if(s.x>=bound||s.x<=0) {
   s.x=clamp(s.x,0,bound);s.direction=s.x>=bound?-1:1;
   s.activity='look';s.elapsedMs=0;s.activityMs=650;
  }
 }
 if(s.elapsedMs>=s.activityMs){
  s.elapsedMs=0;
  if(['play','happy','jump','groom'].includes(s.activity)){
   s.activity='idle';s.activityMs=800;
  }else if(s.activity==='nap'){s.activity='sit';s.activityMs=1250;}
  else if(s.activity==='walk'){
   const roll=random();s.activity=roll<.14?'look':roll<.27?'sit':'idle';
   s.activityMs=800+random()*900;
  }else{
   const roll=random();
   const calm=PROFILES[s.id].personality==='calm';
   const curious=PROFILES[s.id].personality==='curious';
   if(roll<(calm?.23:curious?.16:.10))s.activity='nap';
   else if(roll<(calm?.49:curious?.32:.24))s.activity='sit';
   else if(roll<(calm?.66:.41))s.activity='groom';
   else if(playful&&roll<(calm?.70:curious?.56:.57))s.activity='jump';
   else s.activity='walk';
   s.activityMs=s.activity==='nap'?5400:s.activity==='walk'?2200+random()*3500:1500+random()*1100;
   if(s.activity==='walk'&&random()<.35)s.direction=s.direction===1?-1:1;
  }
 }
 s.x=clamp(s.x,0,bound);
 return s;
}
export function greetNearby(a:PetState,b:PetState):[PetState,PetState] {
 if(a.activity==='walk'&&b.activity==='walk'&&Math.abs(a.x-b.x)<38&&a.direction!==b.direction){
  return [triggerActivity(a,'look'),triggerActivity(b,'look')];
 }
 return [a,b];
}
