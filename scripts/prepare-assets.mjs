import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pub=path.join(root,'public/assets'),build=path.join(root,'build');
mkdirSync(pub,{recursive:true});mkdirSync(build,{recursive:true});
const liam=Buffer.from(readFileSync(path.join(root,'assets/liam-walk.png.b64'),'utf8').trim(),'base64');
writeFileSync(path.join(pub,'liam-walk.png'),liam);
const palettes={
 liam:{coat:'#f5f0e9',shade:'#ddcfc1',face:'#f5f0e9',mask:'#675040',patch:'#594436',eye:'#f4c94c',tail:'#70513f',nose:'#d98892',ears:'point'},
 ninoosh:{coat:'#e6d7c3',shade:'#c2b29f',face:'#b6a795',mask:'#847669',patch:'#c6b9a8',eye:'#b6a66d',tail:'#66605e',nose:'#9d7775',ears:'fold'}
};
function catSvg(id,pose,index){
 const c=palettes[id],p=index*Math.PI/4;
 const walk=pose==='walk',sit=['sit','groom'].includes(pose),sleep=pose==='nap';
 const bob=walk?Math.round(Math.sin(p*2)*1.5):0;
 const legs=[{x:40,far:true,phi:0},{x:53,far:false,phi:Math.PI},{x:109,far:true,phi:Math.PI*.58},{x:121,far:false,phi:Math.PI*1.58}];
 function leg(l){
  const stride=walk?Math.round(Math.sin(p+l.phi)*12):0;
  const lift=walk?Math.round(Math.max(0,Math.cos(p+l.phi))*6):0;
  const tx=l.x+stride;
  const fill=l.far?c.shade:c.coat;
  return '<path d="M'+l.x+' 86 Q'+(l.x+stride*.4)+' 115 '+(tx+2)+' '+(134-lift)+' Q'+tx+' '+(144-lift)+' '+(tx-9)+' '+(140-lift)+' Q'+(tx-14)+' '+(138-lift)+' '+(tx-7)+' '+(132-lift)+' L'+(l.x-8)+' 92Z" fill="'+fill+'" stroke="'+c.mask+'" stroke-width="2.3"/>';
 }
 let tail='',body='',feet='',head='',hx=121,hy=73;
 if(sleep){
  hx=126;hy=114;
  tail='<path d="M50 121 Q27 138 66 141" stroke="'+c.tail+'" stroke-width="11" fill="none" stroke-linecap="round"/>';
  body='<ellipse cx="78" cy="122" rx="56" ry="20" fill="'+c.coat+'" stroke="'+c.mask+'" stroke-width="2.5"/>';
  body+='<path d="M39 125 Q67 118 101 130" stroke="'+c.shade+'" stroke-width="8" fill="none"/>';
  head='<ellipse cx="'+hx+'" cy="'+hy+'" rx="23" ry="18" fill="'+c.face+'" stroke="'+c.mask+'" stroke-width="2.5"/>';
 }else if(sit){
  hx=116;hy=77;
  tail='<path d="M65 122 Q28 135 48 143 Q65 150 76 137" stroke="'+c.tail+'" stroke-width="12" fill="none" stroke-linecap="round"/>';
  body='<path d="M63 86 Q63 61 111 70 Q133 72 129 113 L136 137 Q120 151 77 144 Q44 145 53 116 Z" fill="'+c.coat+'" stroke="'+c.mask+'" stroke-width="2.5"/>';
  if(id==='liam')body+='<path d="M83 78 Q100 75 99 97" stroke="'+c.patch+'" stroke-width="13" fill="none"/>';
  feet='<ellipse cx="93" cy="142" rx="16" ry="6" fill="'+c.coat+'" stroke="'+c.mask+'" stroke-width="2"/><ellipse cx="123" cy="142" rx="14" ry="6" fill="'+c.coat+'" stroke="'+c.mask+'" stroke-width="2"/>';
  head='<ellipse cx="'+hx+'" cy="'+hy+'" rx="25" ry="24" fill="'+c.face+'" stroke="'+c.mask+'" stroke-width="2.5"/>';
  if(pose==='groom')feet+='<path d="M120 120 Q138 119 142 91" stroke="'+c.coat+'" stroke-width="11" fill="none" stroke-linecap="round"/><ellipse cx="142" cy="91" rx="7" ry="5" fill="'+c.coat+'"/>';
 }else{
  tail='<path d="M47 82 Q24 66 33 37 Q39 21 20 26" stroke="'+c.tail+'" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M16 26 Q28 19 31 28" stroke="'+(id==='liam'?c.coat:c.shade)+'" stroke-width="11" fill="none" stroke-linecap="round"/>';
  body=legs.filter(l=>l.far).map(leg).join('');
  body+='<ellipse cx="78" cy="'+(85+bob)+'" rx="51" ry="25" fill="'+c.coat+'" stroke="'+c.mask+'" stroke-width="2.5"/>';
  body+=id==='liam'?'<path d="M60 64 Q75 72 73 86 Q54 95 48 75Z" fill="'+c.patch+'"/><path d="M104 65 Q118 78 109 94 Q90 99 85 79Z" fill="'+c.patch+'"/>':'<path d="M50 84 Q83 100 117 85" fill="none" stroke="'+c.shade+'" stroke-width="10" opacity=".4"/>';
  feet=legs.filter(l=>!l.far).map(leg).join('');
  head='<ellipse cx="'+hx+'" cy="'+(hy+bob)+'" rx="26" ry="25" fill="'+c.face+'" stroke="'+c.mask+'" stroke-width="2.5"/>';
  hy+=bob;
 }
 const ears=sleep?'':c.ears==='fold'
   ?'<path d="M'+(hx-17)+' '+(hy-20)+' l-8 -15 l14 3 l6 10Z M'+(hx+9)+' '+(hy-21)+' l9 -14 l6 17 l-6 1Z" fill="'+c.mask+'" stroke="'+c.tail+'" stroke-width="1.9"/>'
   :'<path d="M'+(hx-18)+' '+(hy-18)+' l-7 -25 l21 17Z M'+(hx+11)+' '+(hy-22)+' l16 -22 l5 28Z" fill="'+c.mask+'" stroke="'+c.tail+'" stroke-width="2"/><path d="M'+(hx-18)+' '+(hy-33)+' l8 8 l-9 -3Z M'+(hx+23)+' '+(hy-33)+' l2 11 l-8 0Z" fill="#d89c99"/>';
 const markings=sleep?'':id==='liam'
  ?'<path d="M'+(hx-18)+' '+(hy-14)+' Q'+(hx-5)+' '+(hy-28)+' '+(hx+13)+' '+(hy-12)+' l-10 14 l-21 -2Z" fill="'+c.patch+'"/><path d="M'+(hx-6)+' '+(hy-22)+' l5 11 l4 -11" fill="none" stroke="#2f2927" stroke-width="3"/>'
  :'<path d="M'+(hx-18)+' '+(hy-14)+' Q'+(hx+9)+' '+(hy-31)+' '+(hx+21)+' '+(hy-12)+' Q'+(hx+10)+' '+(hy+4)+' '+(hx-12)+' '+(hy+4)+'Z" fill="'+c.mask+'" opacity=".8"/>';
 const eye=sleep?'<path d="M128 113 l9 2" fill="none" stroke="'+c.tail+'" stroke-width="2.6"/>':
   pose==='groom'?'<path d="M'+(hx+4)+' '+(hy-1)+' q8 -6 14 0" fill="none" stroke="'+c.tail+'" stroke-width="2"/>':
   '<ellipse cx="'+(hx+12)+'" cy="'+(hy-3)+'" rx="5" ry="5.8" fill="'+c.eye+'" stroke="'+c.tail+'" stroke-width="1.8"/><ellipse cx="'+(hx+13)+'" cy="'+(hy-3)+'" rx="1.5" ry="4" fill="#2b2825"/>';
 const muzzle='<ellipse cx="'+(hx+12)+'" cy="'+(hy+13)+'" rx="15" ry="9" fill="'+c.coat+'" opacity=".95"/>';
 const nose='<path d="M'+(hx+26)+' '+(hy+8)+' l6 3 l-6 3Z" fill="'+c.nose+'"/>';
 const whisker='<path d="M'+(hx+18)+' '+(hy+13)+' l21 -7 M'+(hx+17)+' '+(hy+15)+' l21 4" fill="none" stroke="'+c.shade+'" stroke-width="1.5"/>';
 const transform=pose==='jump'?'translate(0,-12)':pose==='play'?'translate(0,-5)':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><g transform="'+transform+'">'+tail+body+feet+head+ears+markings+muzzle+eye+nose+whisker+'</g></svg>';
}
async function makeSheet(id,action){
 const poses=['idle','idle','sit','groom','nap','look','play','jump'];
 const frames=[];
 for(let k=0;k<8;k++){
  const svg=Buffer.from(catSvg(id,action?poses[k]:'walk',k));
  const png=await sharp(svg).resize(80,80).png().toBuffer();
  frames.push({input:png,left:k%4*80,top:Math.floor(k/4)*80});
 }
 await sharp({create:{width:320,height:160,channels:4,background:'#00000000'}})
 .composite(frames).png().toFile(path.join(pub,id+'-'+(action?'actions':'walk')+'.png'));
}
for(const id of ['liam','ninoosh']){
 await makeSheet(id,true);
 if(id==='ninoosh') await makeSheet(id,false);
}
const background=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#163941"/><stop offset="1" stop-color="#4a8b79"/></linearGradient></defs><rect x="18" y="18" width="988" height="988" rx="235" fill="url(#g)"/><circle cx="512" cy="500" r="353" fill="#ffffff" opacity=".07"/><circle cx="777" cy="237" r="45" fill="#edcd7c"/></svg>');
const portrait=await sharp(liam).extract({left:0,top:0,width:80,height:80}).resize(750,750,{kernel:'nearest'}).png().toBuffer();
const icon=await sharp(background).composite([{input:portrait,left:133,top:149}]).png().toBuffer();
writeFileSync(path.join(build,'icon.png'),icon);
const thumb=await sharp(icon).resize(256,256).png().toBuffer();
const ico=Buffer.alloc(22+thumb.length);
ico.writeUInt16LE(0,0);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);
ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);
ico.writeUInt32LE(thumb.length,14);ico.writeUInt32LE(22,18);thumb.copy(ico,22);
writeFileSync(path.join(build,'icon.ico'),ico);
if(process.platform==='darwin'){
 const tmp=mkdtempSync(path.join(os.tmpdir(),'dpet-icon-'));
 const dir=path.join(tmp,'DPet.iconset');mkdirSync(dir);
 for(const n of [16,32,128,256,512]){
  for(const scale of [1,2]){
   const png=await sharp(icon).resize(n*scale,n*scale).png().toBuffer();
   writeFileSync(path.join(dir,'icon_'+n+'x'+n+(scale===2?'@2x':'')+'.png'),png);
  }
 }
 execFileSync('iconutil',['-c','icns','-o',path.join(build,'icon.icns'),dir]);
 rmSync(tmp,{recursive:true,force:true});
}
console.log('DPet prepared: walking, custom activities, branded macOS and Windows icons');
