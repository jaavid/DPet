/**
 * Deterministic update manifests for GitHub Releases populated by the release job.
 * electron-builder is invoked with --publish never.
 */
import {readdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const dir='release',version=JSON.parse(readFileSync('package.json','utf8')).version;
if(!/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/.test(version))throw new Error('Invalid build version: '+version);
const names=readdirSync(dir);
const suffix=version.includes('-beta.')?'beta':'latest';
const info=name=>({url:name,sha512:createHash('sha512').update(readFileSync(join(dir,name))).digest('base64'),size:statSync(join(dir,name)).size});
const yaml=(files)=>{
 if(files.length===0)throw new Error('No updatable installer found for '+version);
 const main=files[0];
 return 'version: '+version+'\nfiles:\n'+files.map(f=>[
  '  - url: '+f.url,'    sha512: '+f.sha512,'    size: '+f.size
 ].join('\n')).join('\n')+
  '\npath: '+main.url+'\nsha512: '+main.sha512+
  "\nreleaseDate: '"+new Date().toISOString()+"'\n";
};
if(process.platform==='win32'){
 const installer=names.find(x=>x==='DPet-Setup-'+version+'-x64.exe');
 if(!installer)throw new Error('Windows installer missing; no update feed generated');
 writeFileSync(join(dir,suffix+'.yml'),yaml([info(installer)]));
 console.log('Generated '+suffix+'.yml');
}else if(process.platform==='darwin'){
 const zips=['arm64','x64'].map(arch=>names.find(x=>x==='DPet-'+version+'-mac-'+arch+'.zip')).filter(Boolean);
 if(zips.length!==2)throw new Error('macOS ZIP files missing');
 // macOS auto-install requires Apple code signing; manifests are future-ready.
 writeFileSync(join(dir,suffix+'-mac.yml'),yaml(zips.map(info)));
 console.log('Generated '+suffix+'-mac.yml');
}
