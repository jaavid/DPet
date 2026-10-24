import {advancePet,initialPet,petCat,PROFILES,type PetId,type PetState,type Activity} from './core/behavior';
import {spriteFrame,spriteSource,SPRITE} from './core/spriteAtlas';
import './style.css';
const stage=document.querySelector<HTMLElement>('#stage')!;
const desktop=Boolean(window.dpet);
document.body.classList.add(desktop?'desktop':'preview');
const ids:PetId[]=desktop
 ?[new URLSearchParams(location.search).get('pet')==='ninoosh'?'ninoosh':'liam']
 :['liam','ninoosh'];
const sprites=new Map<string,HTMLImageElement>();
for(const id of ['liam','ninoosh'] as PetId[]){
 for(const sheet of ['walk','actions']){
  const img=new Image();
  img.src='./assets/'+id+'-'+sheet+'.png';
  sprites.set(id+'/'+sheet,img);
 }
}
const states=new Map<PetId,PetState>();
const contexts=new Map<PetId,CanvasRenderingContext2D>();
const clocks=new Map<PetId,number>();
const previewSize=152;
function addPet(id:PetId):void{
 const canvas=document.createElement('canvas');
 canvas.width=80;canvas.height=80;
 canvas.className='pet pet-'+id;canvas.title='Pet '+PROFILES[id].name;
 canvas.setAttribute('aria-label',PROFILES[id].name);
 stage.append(canvas);
 const ctx=canvas.getContext('2d',{alpha:true})!;
 ctx.imageSmoothingEnabled=false;
 contexts.set(id,ctx);
 states.set(id,initialPet(id,Math.max(0,innerWidth-previewSize),id==='liam'?'left':'center'));
 clocks.set(id,performance.now());
 canvas.addEventListener('click',()=>{
  if(desktop)window.dpet?.pat(id);
  else {
   const old=states.get(id);
   if(old){states.set(id,petCat(old));clocks.set(id,performance.now());}
  }
 });
}
ids.forEach(addPet);
window.dpet?.onState(next=>{
 const previous=states.get(next.id);
 if(!previous)return;
 if(previous.activity!==next.activity||previous.direction!==next.direction)clocks.set(next.id,performance.now());
 states.set(next.id,next);
});
window.dpet?.onPat(()=>{for(const id of ids)clocks.set(id,performance.now());});
let paused=false;
const pause=document.querySelector<HTMLButtonElement>('#pause');
pause?.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume roaming':'Pause roaming';});
for(const id of ['liam','ninoosh'] as PetId[]){
 document.getElementById(id+'-pat')?.addEventListener('click',()=>{
  const state=states.get(id);
  if(state){states.set(id,petCat(state));clocks.set(id,performance.now());}
 });
}
let last=performance.now();
function draw(now:number):void{
 const elapsed=Math.min(250,now-last);last=now;
 for(const id of ids){
  let s=states.get(id)!;
  if(!desktop&&!paused){
   s=advancePet(s,elapsed,Math.max(0,innerWidth-previewSize),Math.random);
   states.set(id,s);
  }
  const canvas=stage.querySelector<HTMLCanvasElement>('.pet-'+id)!;
  if(!desktop)canvas.style.transform='translateX('+Math.round(s.x)+'px)';
  const ctx=contexts.get(id)!;ctx.clearRect(0,0,80,80);
  ctx.save();
  if(s.direction===-1){ctx.translate(80,0);ctx.scale(-1,1);}
  const t=now-(clocks.get(id)??now);
  const frame=spriteFrame(s.activity,t);
  const key=id+'/'+(s.activity==='walk'?'walk':'actions');
  const sprite=sprites.get(key)!;
  if(sprite.complete&&sprite.naturalWidth){
   const rect=spriteSource(frame);
   ctx.drawImage(sprite,rect.x,rect.y,rect.width,rect.height,0,0,SPRITE.size,SPRITE.size);
  }else{
   // Fallback when assets have not loaded.
   ctx.fillStyle=id==='liam'?'#f5ead9':'#d6c5af';
   ctx.beginPath();ctx.ellipse(40,51,29,21,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
