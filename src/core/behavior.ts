/** Portable DPet simulation — no DOM, OS, Electron or renderer dependencies. */
export type Activity = 'walk' | 'idle' | 'sit' | 'groom' | 'nap' | 'play' | 'look' | 'jump';
export type Direction = 1 | -1;
export type PetId = 'liam' | 'ninoosh';
export type Placement = 'left' | 'center' | 'right';
export interface PetProfile { id:PetId; name:string; personality:'playful'|'calm'; speed:number; scale:number; }
export interface PetState {
  id:PetId; x:number; direction:Direction; activity:Activity;
  activityMs:number; elapsedMs:number; affection:number;
}
export interface Settings {
  size:number; floorOffset:number; placement:Placement;
  enabled:Record<PetId,boolean>; paused:boolean; playful:boolean;
}
export const PROFILES:Record<PetId,PetProfile> = {
  liam:{id:'liam',name:'Liam',personality:'playful',speed:46,scale:1},
  ninoosh:{id:'ninoosh',name:'Ninoosh',personality:'calm',speed:29,scale:1.02},
};
export const DEFAULT_SETTINGS:Settings = {
  size:140,floorOffset:16,placement:'left',
  enabled:{liam:true,ninoosh:true},paused:false,playful:true
};
export function sanitizeSettings(raw:unknown):Settings {
  const r:Record<string,any> = raw && typeof raw==='object' ? raw as Record<string,any> : {};
  const sizes=[100,120,140,160,180], offsets=[0,12,24,48,80];
  return {
    size:sizes.includes(r.size)?r.size:140,
    floorOffset:offsets.includes(r.floorOffset)?r.floorOffset:16, // normalized below
    placement:['left','center','right'].includes(r.placement)?r.placement:'left',
    enabled:{liam:r.enabled?.liam!==false,ninoosh:r.enabled?.ninoosh!==false},
    paused:r.paused===true,
    playful:r.playful!==false
  };
}
export const clamp=(x:number,min:number,max:number):number=>Math.min(Math.max(x,min),Math.max(min,max));
export function spawnX(placement:Placement,maxX:number,id:PetId):number {
  const bound=Math.max(0,maxX);
  const anchor=placement==='left'?0.08:placement==='right'?0.86:0.5;
  return clamp(bound*anchor+(id==='ninoosh'?Math.min(120,bound*.17):0),0,bound);
}
export function initialPet(id:PetId,maxX:number,placement:Placement='left'):PetState {
  return {id,x:spawnX(placement,maxX,id),direction:id==='liam'?1:-1,activity:'walk',elapsedMs:0,activityMs:2200,affection:0};
}
export function petCat(s:PetState):PetState {
  return {...s,activity:'play',elapsedMs:0,activityMs:1300,affection:s.affection+1};
}
export function triggerActivity(s:PetState,activity:Activity):PetState {
  return {...s,activity,elapsedMs:0,activityMs:activity==='nap'?5000:activity==='walk'?2900:1500};
}
export function advancePet(
  old:PetState,deltaMs:number,maxX:number,random:()=>number=Math.random,playful=true
):PetState {
  const s={...old}, dt=clamp(deltaMs,0,250),bound=Math.max(0,maxX);
  s.elapsedMs+=dt;
  if(s.activity==='walk'){
    s.x+=s.direction*PROFILES[s.id].speed*dt/1000;
    if(s.x>=bound || s.x<=0) {
      s.x=clamp(s.x,0,bound);
      s.direction=s.x>=bound?-1:1;
      s.activity='look';s.elapsedMs=0;s.activityMs=650;
    }
  }
  if(s.elapsedMs>=s.activityMs){
    s.elapsedMs=0;
    if(s.activity==='play'||s.activity==='jump'||s.activity==='groom') {
      s.activity='idle'; s.activityMs=800;
    }else if(s.activity==='nap') {s.activity='sit';s.activityMs=1250;}
    else if(s.activity==='walk'){
      const roll=random();
      s.activity=roll<.14?'look':roll<.27?'sit':'idle';
      s.activityMs=800+random()*900;
    }else{
      const roll=random();
      const calm=s.id==='ninoosh';
      if(roll<(calm?.23:.12))s.activity='nap';
      else if(roll<(calm?.49:.25))s.activity='sit';
      else if(roll<(calm?.66:.42))s.activity='groom';
      else if(playful && roll<(calm?.70:.52))s.activity='jump';
      else s.activity='walk';
      s.activityMs=s.activity==='nap'?5400:s.activity==='walk'?2200+random()*3500:1500+random()*1100;
      if(s.activity==='walk' && random()<.35)s.direction=s.direction===1?-1:1;
    }
  }
  s.x=clamp(s.x,0,bound);
  return s;
}
/** A gentle reaction when the cats meet, without forcing either to teleport. */
export function greetNearby(a:PetState,b:PetState):[PetState,PetState] {
  if(a.activity==='walk'&&b.activity==='walk'&&Math.abs(a.x-b.x)<38 && a.direction!==b.direction){
    return [triggerActivity(a,'look'),triggerActivity(b,'look')];
  }
  return [a,b];
}
