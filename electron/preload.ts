import {contextBridge,ipcRenderer} from 'electron';
import type {PetId,PetState} from '../src/core/behavior';
const id=new URLSearchParams(process.argv.find(x=>x.includes('--pet-id='))?.split('=')[1]||'').get('pet');
const pet=(id==='ninoosh'?'ninoosh':'liam') as PetId;
contextBridge.exposeInMainWorld('dpet',{
 onState:(listener:(state:PetState)=>void)=>{
  const handler=(_event:Electron.IpcRendererEvent,state:PetState)=>listener(state);
  ipcRenderer.on('dpet:state',handler);
  ipcRenderer.send('dpet:ready',pet);
  return()=>ipcRenderer.removeListener('dpet:state',handler);
 },
 onPat:(listener:()=>void)=>{
  const handler=()=>listener();
  ipcRenderer.on('dpet:pat',handler);
  return()=>ipcRenderer.removeListener('dpet:pat',handler);
 },
 pat:(id:PetId)=>ipcRenderer.send('dpet:pat',id)
});
