import {app,net,Notification,shell} from 'electron';
import {autoUpdater} from 'electron-updater';
type Release={tag_name:string;html_url:string;draft:boolean;prerelease:boolean;assets?:{name:string;browser_download_url:string}[]};
export type UpdatePhase='idle'|'checking'|'up-to-date'|'available'|'downloading'|'downloaded'|'error';
export type UpdateStatus={phase:UpdatePhase;version?:string;url?:string;downloadUrl?:string;message?:string};
const RELEASES='https://api.github.com/repos/jaavid/DPet/releases?per_page=20';
const DOWNLOADS='https://github.com/jaavid/DPet/releases';
const INTERVAL=4*60*60*1000;
function parseVersion(value:string):number[]|null{
 const m=/^v?(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/.exec(value);
 return m?[Number(m[1]),Number(m[2]),Number(m[3]),m[4]===undefined?1:0,Number(m[4]??0)]:null;
}
export function newerVersion(candidate:string,current:string):boolean{
 const a=parseVersion(candidate),b=parseVersion(current);
 if(!a||!b)return false;
 for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i];}
 return false;
}
function notify(version:string):void{
 try{
  if(Notification.isSupported())new Notification({
   title:'DPet update available',body:'Version '+version+' is ready. Open the DPet tray menu.'
  }).show();
 }catch(err){console.warn('DPet notification unavailable:',err);}
}
export class UpdateService{
 private state:UpdateStatus={phase:'idle'};
 private timer:ReturnType<typeof setInterval>|undefined;
 private checking=false;
 private readonly desktopWindowsUpdater=process.platform==='win32'&&app.isPackaged;
 constructor(private onChange:()=>void,private enabled:()=>boolean){
  if(this.desktopWindowsUpdater){
   autoUpdater.autoDownload=true;
   autoUpdater.autoInstallOnAppQuit=true;
   autoUpdater.allowPrerelease=true;
   autoUpdater.setFeedURL({provider:'github',owner:'jaavid',repo:'DPet'});
   autoUpdater.on('update-available',(info)=>{
    this.update({phase:'downloading',version:info.version});
   });
   autoUpdater.on('update-downloaded',(info)=>{
    this.update({phase:'downloaded',version:info.version});
    notify(info.version);
   });
   autoUpdater.on('error',(err)=>{
    console.warn('DPet updater failed, fallback to GitHub release check:',err);
    // Keep release-notification fallback available when update metadata is missing.
    if(this.state.phase!=='available'&&this.state.phase!=='downloaded')
      this.update({phase:'error',message:'Installer auto-update unavailable; check Releases'});
   });
  }
 }
 get status():UpdateStatus{return this.state;}
 private update(status:UpdateStatus):void{this.state=status;this.onChange();}
 start():void{
  if(!app.isPackaged)return;
  setTimeout(()=>{if(this.enabled())void this.check();},15_000).unref();
  this.timer=setInterval(()=>{if(this.enabled())void this.check();},INTERVAL);
  this.timer.unref();
 }
 stop():void{if(this.timer)clearInterval(this.timer);}
 async check(manual=false):Promise<void>{
  if(this.checking)return;
  if(!this.enabled()&&!manual)return;
  this.checking=true;
  const prior=this.state;
  this.update({phase:'checking'});
  try{
   const response=await net.fetch(RELEASES,{headers:{
    'Accept':'application/vnd.github+json','User-Agent':'DPet-Desktop-Updater'
   }});
   if(!response.ok)throw new Error('GitHub HTTP '+response.status);
   const releases=await response.json() as Release[];
   const architecture=process.arch==='arm64'?'arm64':'x64';
   const isInstaller=(name:string):boolean=>{
     if(process.platform==='win32')return name==='DPet-Setup-'+app.getVersion().replace(/-beta\..*$/,'')+'-'+architecture+'.exe'||/^DPet-Setup-.*-x64\.exe$/.test(name);
     if(process.platform==='darwin')return name.endsWith('-mac-'+architecture+'.dmg');
     if(process.platform==='linux')return name.endsWith('-linux-'+architecture+'.deb')||name.endsWith('-linux-'+architecture+'.AppImage');
     return false;
   };
   const release=releases.find(r=>!r.draft&&
    !!parseVersion(r.tag_name)&&newerVersion(r.tag_name,app.getVersion())&&
    r.html_url.startsWith(DOWNLOADS+'/tag/')&&
    (r.assets?.some(a=>isInstaller(a.name))??false)
   );
   if(release){
    const suffix=process.platform==='linux'?'-linux-'+architecture+'.deb':
      '-mac-'+architecture+'.dmg';
    const asset=release.assets?.find(a=>a.name.endsWith(suffix)&&
      a.browser_download_url.startsWith(DOWNLOADS+'/download/'));
    this.update({phase:'available',version:release.tag_name.replace(/^v/,''),
      url:release.html_url,downloadUrl:asset?.browser_download_url});
    if(prior.version!==release.tag_name.replace(/^v/,''))notify(release.tag_name);
    if(this.desktopWindowsUpdater){
     // Windows NSIS supports automatic download and replacement on quit.
     // If beta.yml does not exist, the release menu still works.
     try{await autoUpdater.checkForUpdates();}
     catch(err){console.warn('DPet NSIS updater unavailable, use release link:',err);}
    }
   }else{
    this.update({phase:'up-to-date'});
   }
  }catch(err){
   this.update({phase:'error',message:err instanceof Error?err.message:'Update check failed'});
  }finally{this.checking=false;}
 }
 openRelease():void{
  const link=process.platform==='darwin'||process.platform==='linux'?this.state.downloadUrl:undefined;
  const target=link?.startsWith(DOWNLOADS+'/download/')?link:
    this.state.url?.startsWith(DOWNLOADS+'/tag/')?this.state.url:DOWNLOADS;
  void shell.openExternal(target);
 }
 installDownloaded():void{
  if(this.desktopWindowsUpdater&&this.state.phase==='downloaded')autoUpdater.quitAndInstall(false,true);
 }
}
