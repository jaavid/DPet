import {describe,it,expect} from 'vitest';
import sharp from 'sharp';
import path from 'node:path';
import {petBounds} from './windowGeometry';

describe('transparent desktop window stays on its selected monitor',()=>{
 it('clamps horizontally and vertically for an ordinary Mac desktop',()=>{
  expect(petBounds({x:0,y:25,width:1280,height:775},140,16,-200)).toEqual({x:0,y:644,width:140,height:140});
  expect(petBounds({x:0,y:25,width:1280,height:775},140,16,5000).x).toBe(1140);
 });
 it('supports monitors with negative origins',()=>{
  expect(petBounds({x:-1920,y:-120,width:1920,height:1080},180,80,2000)).toEqual({
   x:-180,y:700,width:180,height:180
  });
 });
 it('never places the cat beyond a very small work area',()=>{
  expect(petBounds({x:40,y:50,width:70,height:90},140,80,900)).toEqual({x:40,y:50,width:70,height:90});
 });
});

describe('repaired atlases',()=>{
 for(const id of ['liam','ninoosh','ozy','slash','toto','chico']){
  for(const kind of ['walk','actions']){
   it(id+'-'+kind+' has a transparent safety gutter around every cell',async()=>{
    const filename=path.join(process.cwd(),'public','assets',id+'-'+kind+'.png');
    const {data,info}=await sharp(filename).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    expect(info.width).toBe(320);expect(info.height).toBe(160);
    for(let frame=0;frame<8;frame++){
     const ox=(frame%4)*80,oy=Math.floor(frame/4)*80;
     let solid=0,maximumY=-1;
     for(let y=0;y<80;y++)for(let x=0;x<80;x++){
      const a=data[((oy+y)*info.width+ox+x)*info.channels+3];
      if(a>65){solid++;maximumY=Math.max(maximumY,y);}
      // No neighboring sprite fragment can occupy our four-pixel frame gutter.
      if(x<4||x>=76||y<4||y>=76)expect(a).toBe(0);
     }
     expect(solid).toBeGreaterThan(200);
     if(kind==='walk')expect(maximumY).toBeGreaterThanOrEqual(73);
    }
   });
  }
 }
});
