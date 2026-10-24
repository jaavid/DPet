import type {Activity} from './behavior';

/** All four approved transparent atlases are 320×160, 4 columns by 2 rows. */
export const SPRITE = {size:80,columns:4,rows:2,frames:8,walkFrameMs:120} as const;

/** Artwork order: idle, look, sit, groom, sleep, play/crouch, jump, happy/meow. */
export const ACTION_FRAME:Readonly<Record<Exclude<Activity,'walk'>,number>> = {
  idle:0, look:1, sit:2, groom:3, nap:4, play:5, jump:6, happy:7
};

export function spriteFrame(activity:Activity,elapsedMs:number):number{
  if(activity==='walk')return Math.floor(Math.max(0,elapsedMs)/SPRITE.walkFrameMs)%SPRITE.frames;
  return ACTION_FRAME[activity];
}
export function spriteSource(frame:number):{x:number,y:number,width:number,height:number}{
  if(!Number.isInteger(frame)||frame<0||frame>=SPRITE.frames)throw Error('Sprite frame out of range: '+frame);
  return {x:frame%SPRITE.columns*SPRITE.size,y:Math.floor(frame/SPRITE.columns)*SPRITE.size,width:SPRITE.size,height:SPRITE.size};
}
