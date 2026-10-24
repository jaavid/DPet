import {describe,it,expect} from 'vitest';
import sharp from 'sharp';
import path from 'node:path';
import {ACTION_FRAME,SPRITE,spriteFrame,spriteSource} from './spriteAtlas';

describe('approved sprites',()=>{
  it('maps all the action poses without accidental swaps',()=>{
    expect(ACTION_FRAME).toEqual({idle:0,look:1,sit:2,groom:3,nap:4,play:5,jump:6,happy:7});
    expect(spriteFrame('walk',0)).toBe(0);
    expect(spriteFrame('walk',960)).toBe(0);
    expect(spriteFrame('play',9999)).toBe(5);
    expect(spriteSource(6)).toEqual({x:160,y:80,width:80,height:80});
  });
  for(const pet of ['liam','ninoosh']){
    for(const action of ['walk','actions']){
      it(pet+'-'+action+' is an 8-frame transparent atlas',async()=>{
        const file=path.join(process.cwd(),'assets','sprite-sheets',pet+'-'+action+'.png');
        const img=sharp(file);
        const m=await img.metadata();
        expect([m.width,m.height,m.hasAlpha]).toEqual([SPRITE.columns*SPRITE.size,SPRITE.rows*SPRITE.size,true]);
        for(let i=0;i<SPRITE.frames;i++){
          const {x,y,width,height}=spriteSource(i);
          const region=await sharp(file).extract({left:x,top:y,width,height}).ensureAlpha().stats();
          expect(region.channels[3].mean).toBeGreaterThan(1);
          expect(region.channels[3].min).toBe(0);
        }
      });
    }
  }
});
