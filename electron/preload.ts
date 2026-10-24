import {contextBridge,ipcRenderer} from 'electron';
import type {PetId,PetState} from '../src/core/behavior';
contextBridge.exposeInMainWorld('dpet',{
 onState:(listener:(state:PetState)=>void)=>{
  const handler=(_event:Electron.IpcRendererEvent,state:PetState)=>listener(state);
  ipcRenderer.on('dpet:state',handler);
  ipcRenderer.send('dpet:ready');
  return()=>ipcRenderer.removeListener('dpet:state',handler);
 },
 onPat:(listener:()=>void)=>{
  const handler=()=>listener();
  ipcRenderer.on('dpet:pat',handler);
  return()=>ipcRenderer.removeListener('dpet:pat',handler);
 },
 pat:(id:PetId)=>ipcRenderer.send('dpet:pat',id)
});
