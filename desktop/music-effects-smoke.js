import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
// Executed only by the isolated desktop smoke run.
export async function smokeSoundEffects(main,audioWindow,dataDirectory){
 const effectId=await main.webContents.executeJavaScript('('+exerciseEffects.toString()+')()');
 await new Promise(resolve=>setTimeout(resolve,180));
 await writeFile(join(dataDirectory,'sound-effects-smoke.png'),(await main.webContents.capturePage()).toPNG());
 await main.webContents.executeJavaScript('('+exerciseCosmicSpawn.toString()+')()');
 await new Promise(resolve=>setTimeout(resolve,3100));
 await main.webContents.reload();
 await new Promise(resolve=>setTimeout(resolve,1800));
 if((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).activeEffectIds.length)throw Error('Saved cosmic encounters replayed their effect after reload');
 await main.webContents.executeJavaScript("location.hash='dev/music'");
 await new Promise(resolve=>setTimeout(resolve,600));
 if(!await main.webContents.executeJavaScript('('+((id)=>Boolean([...document.querySelectorAll('[data-song-options]')].find(button=>button.dataset.songOptions===id))).toString()+')('+JSON.stringify(effectId)+')'))throw Error('Imported effect did not persist');
}
async function exerciseEffects(){
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const until=async test=>{for(let n=0;n<150;n++){if(await test())return;await wait(30);}throw Error('Sound effects UI timed out');};
 const library=await(await fetch('/api/music')).json(),twinkle=library.tracks.find(track=>track.kind==='effect');
 if(!twinkle||!document.querySelector('[data-library-kind=effect]')||document.querySelector('[data-library-kind=music] [data-song-options="'+twinkle.id+'"]'))throw Error('Twinkle did not move to All Sound Effects');
 const data=await(await fetch('/api/music/media/'+twinkle.id)).arrayBuffer(),transfer=new DataTransfer();
 transfer.items.add(new File([data],'Smoke Effect.mp3',{type:'audio/mpeg'}));
 const input=document.querySelector('[data-music-import=effect]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 await until(()=>[...document.querySelectorAll('[data-library-kind=effect] tr')].some(row=>row.textContent.includes('Smoke Effect')));
 const updated=await(await fetch('/api/music')).json(),effect=updated.tracks.find(track=>track.name==='Smoke Effect');
 const options=()=>document.querySelector('[data-library-kind=effect] [data-song-options="'+effect.id+'"]').click();
 options();document.querySelector('[data-song-option=edit]').click();
 document.querySelector('[data-song-edit-name]').value='Edited Effect';document.querySelector('[data-song-edit-artist]').value='Effect Composer';
 document.querySelector('[data-song-edit-name]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 await until(()=>!document.querySelector('[data-song-edit-name]'));
 const events=document.querySelector('[data-library-kind=events]');
 const row=events.querySelector('tr[data-sound-event="effect/cosmic-spawn"]');
 if(!row||events.querySelector('[data-music-import]'))throw Error('Event table or import placement is incorrect');
 row.querySelector('[data-song-options]').click();
 if(document.querySelector('[data-song-option=add]'))throw Error('Event options still expose Add');
 document.querySelector('[data-song-option=edit]').click();
 const select=row.querySelector('select[aria-label="Sound effect"]');
 if(!select||row.querySelector('.music-event select')||![...select.options].some(option=>option.value===effect.id))throw Error('Event row does not offer the newly imported sound effect');
 select.value=effect.id;row.querySelector('[data-save-song-row]').click();
 await until(()=>!document.querySelector('[data-library-kind=events] .music-editing'));
 const assigned=await(await fetch('/api/music')).json();
 if(assigned.assignments['effect/cosmic-spawn']?.length!==1||assigned.assignments['effect/cosmic-spawn'][0]!==effect.id)throw Error('Event edit did not replace its sound effect');
 const stateBefore=await window.gallorinMusic.state();
 document.querySelector('[data-library-kind=effect] [data-preview-song="'+effect.id+'"]').click();
 await until(async()=>(await window.gallorinMusic.state()).activeEffectIds.includes(effect.id));
 const stateAfter=await window.gallorinMusic.state();
 if(stateBefore.track?.id!==stateAfter.track?.id||stateBefore.playing!==stateAfter.playing)throw Error('Effect preview interrupted background music');
 options();document.querySelector('[data-song-option=delete]').click();
 if(!document.querySelector('.music-delete-dialog p').textContent.includes('sound events'))throw Error('Effect delete confirmation is incorrect');
 document.querySelector('.music-delete-dialog [data-no]').click();await wait(30);
 return effect.id;
}
async function exerciseCosmicSpawn(){
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const post=async(type,payload)=>{const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,payload})});if(!response.ok)throw Error(await response.text());};
 const original=(await(await fetch('/api/state')).json()).catalog.spawning.cosmic;
 const audio=await window.desktopMenu.audio();
 try{
  await post('spawn-settings',{cosmic:original.map(c=>({...c,chance:c.name==='Solar'?100:0}))});
  await window.desktopMenu.setAudio({...audio,soundEffectsVolume:25});
  location.hash='wilds/aetherion';
  for(let n=0;n<100&&!document.querySelector('[data-action=search]');n++)await wait(30);
  await wait(300);
  for(let n=0;n<120&&(await window.gallorinMusic.state()).activeEffectIds.length;n++)await wait(30);
  await wait(500);
  const before=await window.gallorinMusic.state();
  document.querySelector('[data-action=search]').click();
  let triggered=false;
  for(let n=0;n<100;n++){if((await window.gallorinMusic.state()).activeEffectIds.length){triggered=true;break;}await wait(30);}
  if(!triggered)throw Error('Cosmic search did not trigger an assigned sound effect');
  const after=await window.gallorinMusic.state();
  if(after.track.id!==before.track.id||after.playing!==before.playing||after.soundEffectsVolume!==25)throw Error('Cosmic effect state mismatch: '+JSON.stringify({before,after}));
 }finally{await post('spawn-settings',{cosmic:original});await window.desktopMenu.setAudio(audio);}
}
