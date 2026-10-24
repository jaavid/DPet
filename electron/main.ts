import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen } from 'electron';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {
 advancePet, initialPet, petCat, triggerActivity, greetNearby, clamp, sanitizeSettings,
 DEFAULT_SETTINGS, PROFILES, type PetId, type PetState, type Settings, type Activity,
 type Placement
} from '../src/core/behavior';
const IDS:PetId[]=['liam','ninoosh'];
type PetRuntime={window:BrowserWindow,state:PetState,mask:Uint8Array|null,acceptsClick:boolean};
const pets=new Map<PetId,PetRuntime>();
let tray:Tray|null=null;
let settings:Settings={...DEFAULT_SETTINGS,enabled:{...DEFAULT_SETTINGS.enabled}};
let tickTimer:NodeJS.Timeout|null=null;
let lastTick=Date.now();
function spritePath(id:PetId):string{
 const file=id+'-walk.png';
 const packaged=path.join(__dirname,'../dist/assets',file);
 return existsSync(packaged)?packaged:path.join(app.getAppPath(),'public/assets',file);
}
function settingsPath():string{return path.join(app.getPath('userData'),'settings.json');}
function loadSettings():void{
 try{settings=sanitizeSettings(JSON.parse(readFileSync(settingsPath(),'utf8')));}
 catch{settings={...DEFAULT_SETTINGS,enabled:{...DEFAULT_SETTINGS.enabled}};}
}
function persist():void{
 try{writeFileSync(settingsPath(),JSON.stringify(settings,null,2),'utf8');}
 catch(err){console.error('Could not save DPet settings:',err);}
}
function getWorkArea(id:PetId):Electron.Rectangle{
 const current=pets.get(id);
 return current?screen.getDisplayMatching(current.window.getBounds()).workArea:screen.getPrimaryDisplay().workArea;
}
function imageMask(id:PetId):Uint8Array|null{
 const image=nativeImage.createFromPath(spritePath(id));
 if(image.isEmpty())return null;
 const sz=image.getSize();if(sz.width!==320||sz.height!==160)return null;
 const bytes=image.toBitmap(),mask=new Uint8Array(80*80);
 for(let i=0;i<8;i++){
  const ox=(i%4)*80,oy=Math.floor(i/4)*80;
  for(let y=0;y<80;y++)for(let x=0;x<80;x++){
   if(bytes[((oy+y)*sz.width+ox+x)*4+3]>100)mask[y*80+x]=1;
  }
 }
 return mask;
}
function pointOnPet(point:Electron.Point,pet:PetRuntime):boolean{
 const r=pet.window.getBounds();
 const px=Math.floor((point.x-r.x)*80/r.width),py=Math.floor((point.y-r.y)*80/r.height);
 if(px<0||py<0||px>=80||py>=80)return false;
 return pet.mask?pet.mask[py*80+px]===1:(px>8&&px<75&&py>8&&py<76);
}
function reposition(id:PetId):void{
 const p=pets.get(id);if(!p||p.window.isDestroyed())return;
 const area=getWorkArea(id);
 p.state.x=clamp(p.state.x,0,Math.max(0,area.width-settings.size));
 p.window.setBounds({
  x:area.x+Math.round(p.state.x),y:area.y+area.height-settings.size-settings.floorOffset,
  width:settings.size,height:settings.size
 },false);
}
function moveToPreset():void{
 for(const id of IDS){
  const p=pets.get(id);if(!p)continue;
  p.state=initialPet(id,Math.max(0,getWorkArea(id).width-settings.size),settings.placement);
  reposition(id);
 }
}
function changeSize(size:number):void{
 settings.size=size;persist();
 for(const p of pets.values())p.window.setSize(size,size,false);
 for(const id of IDS)reposition(id);
 updateMenu();
}
function updateMenu():void{tray?.setContextMenu(makeMenu());}
function pat(id:PetId):void{
 const pet=pets.get(id);if(!pet)return;
 pet.state=petCat(pet.state);
 pet.window.webContents.send('dpet:state',pet.state);
 pet.window.webContents.send('dpet:pat');
}
function doAction(id:PetId,activity:Activity):void{
 const pet=pets.get(id);if(!pet)return;
 pet.state=triggerActivity(pet.state,activity);
 pet.window.webContents.send('dpet:state',pet.state);
}
function makeMenu():Menu{
 const activityItems=(id:PetId):Electron.MenuItemConstructorOptions[]=>
  (['walk','sit','groom','nap','play','look','jump'] as Activity[]).map(activity=>({
   label:activity[0].toUpperCase()+activity.slice(1),
   click:()=>doAction(id,activity)
  }));
 return Menu.buildFromTemplate([
  {label:'DPet • Liam & Ninoosh',enabled:false},
  {type:'separator'},
  {label:settings.paused?'Resume roaming':'Pause roaming',click:()=>{settings.paused=!settings.paused;persist();updateMenu();}},
  {label:'Pets',submenu:IDS.map(id=>({
   label:PROFILES[id].name,type:'checkbox',checked:settings.enabled[id],
   click:()=>{
    settings.enabled[id]=!settings.enabled[id];persist();
    const p=pets.get(id);
    if(settings.enabled[id])p?.window.showInactive();else p?.window.hide();
    updateMenu();
   }
  }))},
  {label:'Size',submenu:[100,120,140,160,180].map(size=>({
   label:size===100?'Tiny · 100 px':size===120?'Small · 120 px':size===140?'Medium · 140 px':size===160?'Large · 160 px':'Extra large · 180 px',
   type:'radio' as const,checked:settings.size===size,click:()=>changeSize(size)
  }))},
  {label:'Start position',submenu:(['left','center','right'] as Placement[]).map(placement=>({
   label:placement[0].toUpperCase()+placement.slice(1),type:'radio' as const,checked:settings.placement===placement,
   click:()=>{settings.placement=placement;persist();moveToPreset();updateMenu();}
  }))},
  {label:'Distance from bottom',submenu:[0,12,16,24,48,80].map(offset=>({
   label:offset+' px',type:'radio' as const,checked:settings.floorOffset===offset,
   click:()=>{settings.floorOffset=offset;persist();for(const id of IDS)reposition(id);updateMenu();}
  }))},
  {label:'Playful behavior',type:'checkbox',checked:settings.playful,click:()=>{
   settings.playful=!settings.playful;persist();updateMenu();
  }},
  {type:'separator'},
  ...IDS.map(id=>({label:PROFILES[id].name+' actions',submenu:[
   {label:'Pet '+PROFILES[id].name,click:()=>pat(id)},...activityItems(id)
  ]})),
  {type:'separator'},
  {label:'Launch at login',type:'checkbox',checked:app.getLoginItemSettings().openAtLogin,enabled:app.isPackaged,
   click:(item)=>app.setLoginItemSettings({openAtLogin:item.checked})},
  {label:'Quit DPet',click:()=>app.quit()}
 ]);
}
function makePet(id:PetId):void{
 const area=screen.getPrimaryDisplay().workArea;
 const s=initialPet(id,Math.max(0,area.width-settings.size),settings.placement);
 const win=new BrowserWindow({
  width:settings.size,height:settings.size,
  x:area.x+Math.round(s.x),y:area.y+area.height-settings.size-settings.floorOffset,
  transparent:true,frame:false,resizable:false,fullscreenable:false,hasShadow:false,
  skipTaskbar:true,alwaysOnTop:true,show:false,backgroundColor:'#00000000',
  webPreferences:{
   preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,
   nodeIntegration:false,sandbox:true
  }
 });
 win.setAlwaysOnTop(true,'floating');
 win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:false});
 win.setIgnoreMouseEvents(true,{forward:true});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 const runtime:PetRuntime={window:win,state:s,mask:imageMask(id),acceptsClick:false};
 pets.set(id,runtime);
 win.once('ready-to-show',()=>{if(settings.enabled[id])win.showInactive();});
 const query={pet:id};
 if(app.isPackaged)void win.loadFile(path.join(__dirname,'../dist/index.html'),{query});
 else void win.loadURL('http://127.0.0.1:5173/?pet='+id);
 win.webContents.on('did-finish-load',()=>win.webContents.send('dpet:state',runtime.state));
}
function tick():void{
 const now=Date.now(),dt=Math.min(250,now-lastTick);lastTick=now;
 for(const id of IDS){
  const p=pets.get(id);if(!p||p.window.isDestroyed()||!settings.enabled[id])continue;
  if(!settings.paused)p.state=advancePet(p.state,dt,Math.max(0,getWorkArea(id).width-settings.size),Math.random,settings.playful);
 }
 const a=pets.get('liam'),b=pets.get('ninoosh');
 if(a&&b&&settings.enabled.liam&&settings.enabled.ninoosh&&!settings.paused){
  // Only greet on the same display.
  if(screen.getDisplayMatching(a.window.getBounds()).id===screen.getDisplayMatching(b.window.getBounds()).id){
   const [aa,bb]=greetNearby(a.state,b.state);a.state=aa;b.state=bb;
  }
 }
 const cursor=screen.getCursorScreenPoint();
 for(const id of IDS){
  const p=pets.get(id);if(!p||p.window.isDestroyed()||!settings.enabled[id])continue;
  reposition(id);
  p.window.webContents.send('dpet:state',p.state);
  const inside=pointOnPet(cursor,p);
  if(inside!==p.acceptsClick){
   p.acceptsClick=inside;
   p.window.setIgnoreMouseEvents(!inside,{forward:true});
  }
 }
}
function startApp():void{
 loadSettings();
 const image=nativeImage.createFromPath(spritePath('liam'));
 const icon=image.isEmpty()?nativeImage.createEmpty():image.crop({x:0,y:0,width:80,height:80}).resize({width:22,height:22});
 tray=new Tray(icon);tray.setToolTip('DPet · Liam & Ninoosh');updateMenu();
 tray.on('double-click',()=>pat('liam'));
 for(const id of IDS)makePet(id);
 ipcMain.on('dpet:ready',(_event,id:PetId)=>{
  const pet=pets.get(id);if(pet)pet.window.webContents.send('dpet:state',pet.state);
 });
 ipcMain.on('dpet:pat',(_event,id:PetId)=>{if(IDS.includes(id))pat(id);});
 screen.on('display-metrics-changed',()=>{for(const id of IDS)reposition(id);});
 lastTick=Date.now();tickTimer=setInterval(tick,60);
}
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{for(const [id,p] of pets)if(settings.enabled[id])p.window.showInactive();});
 app.whenReady().then(()=>{
  if(process.platform==='darwin')app.dock?.hide();
  if(process.platform==='win32')app.setAppUserModelId('app.dpet.desktop');
  startApp();
 }).catch(console.error);
 app.on('before-quit',()=>{if(tickTimer)clearInterval(tickTimer);persist();});
 app.on('window-all-closed',()=>app.quit());
}
