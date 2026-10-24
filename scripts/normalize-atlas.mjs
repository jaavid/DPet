import sharp from 'sharp';

/**
 * Repairs generated sheets that contain neighboring-cell fragments and inconsistent
 * baselines. Raw artwork stays untouched in assets/sprite-sheets; generated 320x160
 * transparent atlases are placed in public/assets.
 *
 * Key invariants: a 4px alpha gutter inside each frame, one connected silhouette
 * per frame, a fixed walking ground line and one scale across the 8 poses.
 */
const FRAME = 80;
const COUNT = 8;
const PAD = 5;
const ALPHA_THRESHOLD = 65;

function cleanTile(raw, info, frame) {
  const ch=info.channels;
  const ox=(frame%4)*FRAME, oy=Math.floor(frame/4)*FRAME;
  const pixels=Buffer.alloc(FRAME*FRAME*4);
  const opaque=new Uint8Array(FRAME*FRAME);
  for(let y=0;y<FRAME;y++)for(let x=0;x<FRAME;x++){
    const i=y*FRAME+x,si=((oy+y)*info.width+ox+x)*ch,di=i*4;
    pixels[di]=raw[si];pixels[di+1]=raw[si+1];pixels[di+2]=raw[si+2];
    pixels[di+3]=raw[si+3];
    if(pixels[di+3]>=ALPHA_THRESHOLD)opaque[i]=1;
  }
  const labels=new Int32Array(FRAME*FRAME);
  let winner=0,winnerSize=0,nextLabel=1;
  const queue=new Int32Array(FRAME*FRAME);
  for(let i=0;i<opaque.length;i++){
    if(!opaque[i]||labels[i])continue;
    let start=0,end=1;queue[0]=i;labels[i]=nextLabel;
    while(start<end){
      const current=queue[start++],x=current%FRAME,y=Math.floor(current/FRAME);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;
        if(nx<0||nx>=FRAME||ny<0||ny>=FRAME)continue;
        const ni=ny*FRAME+nx;
        if(opaque[ni]&&!labels[ni]){labels[ni]=nextLabel;queue[end++]=ni;}
      }
    }
    if(end>winnerSize){winner=nextLabel;winnerSize=end;}
    nextLabel++;
  }
  if(winnerSize<100)throw new Error('Missing pet silhouette at frame '+frame);
  let minX=FRAME,minY=FRAME,maxX=0,maxY=0;
  const keep=new Uint8Array(FRAME*FRAME);
  // Retain edge antialiasing immediately adjacent to the main component.
  for(let i=0;i<opaque.length;i++){
    const x=i%FRAME,y=Math.floor(i/FRAME);
    let connected=labels[i]===winner;
    if(!connected&&pixels[i*4+3]>0){
      outer:for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;
        if(nx>=0&&nx<FRAME&&ny>=0&&ny<FRAME&&labels[ny*FRAME+nx]===winner){connected=true;break outer;}
      }
    }
    if(!connected){pixels[i*4+3]=0;continue;}
    keep[i]=1;
    if(x<minX)minX=x;if(x>maxX)maxX=x;
    if(y<minY)minY=y;if(y>maxY)maxY=y;
  }
  return {pixels,minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1,keep,mainSize:winnerSize};
}

export async function normalizeAtlas(input,kind='walk'){
  if(kind!=='walk'&&kind!=='actions')throw new Error('Unknown atlas kind '+kind);
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==FRAME*4||info.height!==FRAME*2)throw new Error('Atlas must be 320x160 PNG');
  const tiles=Array.from({length:COUNT},(_,i)=>cleanTile(data,info,i));
  const maxW=Math.max(...tiles.map(t=>t.width)),maxH=Math.max(...tiles.map(t=>t.height));
  const scale=Math.min(1,(FRAME-2*PAD)/maxW,(FRAME-2*PAD)/maxH);
  const parts=[];
  for(const [index,t] of tiles.entries()){
    const width=Math.max(1,Math.floor(t.width*scale));
    const height=Math.max(1,Math.floor(t.height*scale));
    const extracted=Buffer.alloc(t.width*t.height*4);
    for(let y=0;y<t.height;y++){
      for(let x=0;x<t.width;x++){
        const s=((t.minY+y)*FRAME+(t.minX+x))*4;
        const d=(y*t.width+x)*4;
        t.pixels.copy(extracted,d,s,s+4);
      }
    }
    let piece=sharp(extracted,{raw:{width:t.width,height:t.height,channels:4}});
    if(width!==t.width||height!==t.height)piece=piece.resize(width,height,{kernel:'nearest'});
    // Jump artwork needs some vertical space beneath the feet for visual flight.
    const ground=(kind==='actions'&&index===6)?FRAME-13:FRAME-PAD;
    const left=index%4*FRAME+Math.floor((FRAME-width)/2);
    const top=Math.floor(index/4)*FRAME+Math.min(FRAME-PAD-height,ground-height);
    if(left%FRAME<PAD||top%FRAME<0||left%FRAME+width>FRAME-PAD||top%FRAME+height>FRAME-PAD){
      throw new Error('Sprite escaped safe frame '+index);
    }
    parts.push({input:await piece.png().toBuffer(),left,top});
  }
  const output=await sharp({create:{width:320,height:160,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite(parts).png().toBuffer();
  return output;
}
