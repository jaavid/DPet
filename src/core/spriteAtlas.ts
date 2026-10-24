import {PROFILES,type Activity,type PetId} from './behavior';

/** Every atlas has eight transparent 80x80 cells in a 4x2 grid. */
export const SPRITE = {size:80,columns:4,rows:2,frames:8,walkFrameMs:120} as const;

/** Artwork order: idle, look, sit, groom, sleep, play/crouch, jump, happy/meow. */
export const ACTION_FRAME:Readonly<Record<Exclude<Activity,'walk'>,number>> = {
  idle:0, look:1, sit:2, groom:3, nap:4, play:5, jump:6, happy:7
};

export const BIRD_ACTION_FRAME:Readonly<Record<Exclude<Activity,'walk'>,number>> = {
 idle:0, look:2, sit:0, groom:7, nap:1, play:3, jump:4, happy:6
};
export function spriteFrame(activity:Activity,elapsedMs:number,id?:PetId):number{
 if(activity==='walk')return Math.floor(Math.max(0,elapsedMs)/SPRITE.walkFrameMs)%SPRITE.frames;
 return id&&PROFILES[id].species==='cockatiel'?BIRD_ACTION_FRAME[activity]:ACTION_FRAME[activity];
}
export function spriteSource(frame:number):{x:number,y:number,width:number,height:number}{
  if(!Number.isInteger(frame)||frame<0||frame>=SPRITE.frames)throw Error('Sprite frame out of range: '+frame);
  return {x:frame%SPRITE.columns*SPRITE.size,y:Math.floor(frame/SPRITE.columns)*SPRITE.size,width:SPRITE.size,height:SPRITE.size};
}
