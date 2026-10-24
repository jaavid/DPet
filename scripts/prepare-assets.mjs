import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {normalizeAtlas} from './normalize-atlas.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pub=path.join(root,'public/assets'),build=path.join(root,'build');
mkdirSync(pub,{recursive:true});mkdirSync(build,{recursive:true});
// Retain original Liam image for application branding; normalized atlas is for animation only.
const liam=readFileSync(path.join(root,'assets','sprite-sheets','liam-walk.png'));
// Sprite sheets are versioned artwork. Never overwrite them with procedural placeholders.
const atlasNames=['liam-walk','liam-actions','ninoosh-walk','ninoosh-actions'];
for(const name of atlasNames){
 const input=path.join(root,'assets','sprite-sheets',name+'.png');
 const file=readFileSync(input);
 const meta=await sharp(file).metadata();
 if(meta.width!==320||meta.height!==160||!meta.hasAlpha){
  throw new Error('Bad sprite atlas '+name+': expected 320x160 transparent PNG');
 }
 const normalized=await normalizeAtlas(file,name.endsWith('walk')?'walk':'actions');
 writeFileSync(path.join(pub,name+'.png'),normalized);
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
console.log('DPet prepared: isolated, padded sprite frames and branded macOS/Windows icons');
