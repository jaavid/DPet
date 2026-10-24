import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen } from 'electron';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {UpdateService} from './updater';
import {petBounds} from '../src/core/windowGeometry';
import {
 advancePet, initialPet, petCat, triggerActivity, greetNearby, clamp, sanitizeSettings,
 DEFAULT_SETTINGS, PROFILES, PET_IDS, type PetId, type PetState, type Settings, type Activity,
 type Placement
} from '../src/core/behavior';
const IDS:PetId[]=[...PET_IDS];
type PetRuntime={window:BrowserWindow,state:PetState,displayId:number,mask:Uint8Array|null,acceptsClick:boolean};
const pets=new Map<PetId,PetRuntime>();
let tray:Tray|null=null;
let settings:Settings={...DEFAULT_SETTINGS,enabled:{...DEFAULT_SETTINGS.enabled}};
let tickTimer:NodeJS.Timeout|null=null;
let lastTick=Date.now();
let updates:UpdateService|null=null;
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
 // Pin a pet to its original monitor. getDisplayMatching(window bounds) can
 // switch displays while the small transparent window straddles an edge.
 return screen.getAllDisplays().find(d=>d.id===current?.displayId)?.workArea
   ?? screen.getPrimaryDisplay().workArea;
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
 const bounds=petBounds(area,settings.size,settings.floorOffset,p.state.x);
 p.state.x=bounds.x-area.x;
 const old=p.window.getBounds();
 if(old.x!==bounds.x||old.y!==bounds.y||old.width!==bounds.width||old.height!==bounds.height){
   p.window.setBounds(bounds,false);
 }
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
  (['walk','sit','groom','nap','play','look','jump','happy'] as Activity[]).map(activity=>({
   label:activity[0].toUpperCase()+activity.slice(1),
   click:()=>doAction(id,activity)
  }));
 return Menu.buildFromTemplate([
  {label:'DPet • Liam, Ninoosh, Ozy & Slash',enabled:false},
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
  {label:'Updates',submenu:[
   {label:'Automatically check for updates',type:'checkbox',checked:settings.autoCheckUpdates,
    click:()=>{settings.autoCheckUpdates=!settings.autoCheckUpdates;persist();updateMenu();}},
   {label:(()=>{
    const u=updates?.status;
    if(!u||u.phase==='idle')return 'Current version: '+app.getVersion();
    if(u.phase==='checking')return 'Checking GitHub…';
    if(u.phase==='up-to-date')return 'Up to date: '+app.getVersion();
    if(u.phase==='available')return 'New version: '+u.version;
    if(u.phase==='downloading')return 'Downloading update: '+u.version;
    if(u.phase==='downloaded')return 'Ready to install: '+u.version;
    return 'Unable to check for updates';
   })(),enabled:false},
   {label:'Check for updates now',click:()=>{void updates?.check(true);}},
   {label:process.platform==='darwin'?'Download update (macOS requires manual install)':
     process.platform==='linux'?'Download update (.deb manual install)':'Open latest release',
    click:()=>updates?.openRelease()},
   {label:'Restart to install downloaded update',visible:process.platform==='win32',
    enabled:updates?.status.phase==='downloaded',click:()=>updates?.installDownloaded()}
  ]},
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
  ...petBounds(area,settings.size,settings.floorOffset,s.x),
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
 const runtime:PetRuntime={window:win,state:s,displayId:screen.getPrimaryDisplay().id,mask:imageMask(id),acceptsClick:false};
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
 if(!settings.paused){
  const visible=IDS.map(id=>pets.get(id)).filter((p):p is PetRuntime=>!!p&&settings.enabled[p.state.id]);
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
   const a=visible[i],b=visible[j];
   if(a.displayId!==b.displayId)continue;
   const [one,two]=greetNearby(a.state,b.state);
   a.state=one;b.state=two;
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
 tray=new Tray(icon);tray.setToolTip('DPet · Four desktop cats');updateMenu();
 tray.on('double-click',()=>pat('liam'));
 for(const id of IDS)makePet(id);
 updates=new UpdateService(updateMenu,()=>settings.autoCheckUpdates);
 updates.start();
 ipcMain.on('dpet:ready',(event)=>{
  for(const p of pets.values())if(p.window.webContents.id===event.sender.id)event.sender.send('dpet:state',p.state);
 });
 ipcMain.on('dpet:pat',(event)=>{
  for(const [id,p] of pets)if(p.window.webContents.id===event.sender.id){pat(id);break;}
 });
 screen.on('display-metrics-changed',()=>{for(const id of IDS)reposition(id);});
 lastTick=Date.now();tickTimer=setInterval(tick,60);
}
// Transparent, movable overlays work more reliably through X11/XWayland than
// native Wayland, where compositors generally restrict absolute positioning.
if(process.platform==='linux')
 app.commandLine.appendSwitch('ozone-platform',process.env.DPET_OZONE_PLATFORM||'x11');
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{for(const [id,p] of pets)if(settings.enabled[id])p.window.showInactive();});
 app.whenReady().then(()=>{
  if(process.platform==='darwin')app.dock?.hide();
  if(process.platform==='win32')app.setAppUserModelId('app.dpet.desktop');
  startApp();
 }).catch(console.error);
 app.on('before-quit',()=>{if(tickTimer)clearInterval(tickTimer);updates?.stop();persist();});
 app.on('window-all-closed',()=>app.quit());
}
