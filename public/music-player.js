import {bindPlayerLayout} from './music-player-layout.js';
import {soundEffectGroups,isSoundEffect,newCosmicEncounters,effectForEvent} from './music-effects.js';
import {createAudioPreferenceStore} from './audio-preference-store.js';
import {revealPlayingSong} from './music-navigation.js';
import {createAudioSettings} from './audio-settings.js';
import {audioPreferences as normalizeAudio} from './audio-preferences.js';
import {musicContext,selectedPlaylist,playlistSource,defaultMusicTrack,musicTracks} from './music-context.js';
import {musicManagerPage,bindMusicManager,updateMusicRows} from './music-manager.js';
import {createMusicEngine} from './music-engine.js';

const speakerIcon=muted=>'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(muted?'<path d="m3 3 18 18M9 5l3-2v6M12 15v6l-6-5H3V8h2"/>':'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>')+'</svg>';
const builtin=defaultMusicTrack;
const time=value=>{const s=Math.max(0,Math.floor(value||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
export function createMusicPlayer({notify,getLocations}){
 let loading,playback;
 let library={tracks:[],assignments:{},fadeSeconds:2},context='default',started=false,loaded=false,updating=false;
 const desktop=window.gallorinMusic;
 const engine=desktop?null:createMusicEngine();
 const transport=desktop||{state:async()=>engine.snapshot(),command:value=>engine.command(value)};
 let preferences=normalizeAudio();
 if(!desktop){try{const saved=JSON.parse(localStorage.getItem('gallorin-audio')||'null');if(saved&&Number.isFinite(saved.volume))preferences=normalizeAudio(saved);}catch{}}
 const bar=document.createElement('footer');bar.className='music-player';bar.setAttribute('aria-label','Music player');
 bar.innerHTML='<div class="music-now"><button type="button" class="music-art" data-now-playing-link aria-label="Show current song" title="Show current song">♫</button><span class="music-compact-note" aria-hidden="true">♫</span><div><button type="button" class="music-track-link" data-song title="Show current song">Music</button><small data-context>Gallorin Studios</small></div><button type="button" class="music-collapse" data-player-collapse aria-expanded="true" aria-label="Minimize music player" title="Minimize music player"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div><div class="music-transport"><div class="music-buttons"><button type="button" data-music="stop" title="Stop" aria-label="Stop music">■</button><button type="button" data-music="previous" title="Previous song" aria-label="Previous song">⏮</button><button type="button" class="music-play" data-music="toggle" title="Play / Pause" aria-label="Play music">▶</button><button type="button" data-music="next" title="Next song" aria-label="Next song">⏭</button><button type="button" data-music="restart" title="Restart song" aria-label="Restart song">↺</button></div><div class="music-timeline"><span data-current>0:00</span><input type="range" data-seek min="0" max="0" step="0.1" value="0" aria-label="Song progress"><span data-duration>0:00</span></div></div><div class="music-volume"><button type="button" data-music="mute" title="Mute music" aria-label="Mute music">'+speakerIcon(false)+'</button><input type="range" data-volume min="0" max="100" value="'+preferences.volume+'" aria-label="Music volume"><output data-volume-value>'+preferences.volume+'%</output></div><span class="music-error" role="status"></span>';
 document.body.append(bar);document.body.classList.add('has-music-player');bindPlayerLayout(bar);
 const q=selector=>bar.querySelector(selector);
 async function api(url,body){
  const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to update music.');return result;
 }
 const renderPreferences=value=>{
  preferences=value;
  const mute=q('[data-music="mute"]'),key=String(value.muted);
  if(mute.dataset.muted!==key){mute.innerHTML=speakerIcon(value.muted);mute.dataset.muted=key;}
  mute.setAttribute('aria-label',value.muted?'Unmute music':'Mute music');mute.title=value.muted?'Unmute music':'Mute music';mute.setAttribute('aria-pressed',key);
  if(document.activeElement!==q('[data-volume]'))q('[data-volume]').value=value.volume;
  q('[data-volume-value]').textContent=value.volume+'%';
 };
 const preferenceStore=createAudioPreferenceStore({
  initial:preferences,onChange:renderPreferences,
  async save(value,changed=value){
   if(desktop&&window.desktopMenu) {
    // Include music volume for compatibility with an already-running desktop host.
    const music={volume:value.volume,muted:value.muted};
    if ('soundEffectsVolume' in changed) music.soundEffectsVolume=value.soundEffectsVolume;
    return window.desktopMenu.setAudio(music);
   }
   if ('volume' in changed) await transport.command({type:'volume',value:value.volume/100});
   if ('muted' in changed) await transport.command({type:'mute',value:value.muted});
   if ('soundEffectsVolume' in changed) await transport.command({type:'sfx-volume',value:value.soundEffectsVolume/100});
   try{localStorage.setItem('gallorin-audio',JSON.stringify(value));}catch{}
  }
 });
 renderPreferences(preferences);
 const setPreferences=value=>preferenceStore.set(value);
 const audioSettings=createAudioSettings({
  getState:async()=>{await preferenceStore.flush();return desktop?window.desktopMenu.audio():preferences;},
  saveState:async value=>{await setPreferences(value);return preferences;},
  getMusic:()=>desktop?window.desktopMenu.musicSettings():api('/api/music'),
  saveFade:async value=>{library=desktop?await window.desktopMenu.setCrossfade(value):await api('/api/music/fade',{fadeSeconds:value});await select();},
  notify
 });
 document.addEventListener('gallorin-audio-settings',()=>void audioSettings.open());
 function notifyReplacements(){
    for(const replacement of library.assignmentReplacements||[]){
     const name=trackId=>musicTracks(library).find(t=>t.id===trackId)?.name||'Previous sound';
     const event=soundEffectGroups.flatMap(group=>group.items).find(event=>event.id===replacement.event)?.name||replacement.event;
     notify(`${event}: replaced ${name(replacement.from)} with ${name(replacement.to)}.`);
    }
 }
 async function refreshLibrary(){if(!loading)loading=api('/api/music').then(value=>{library=value;loaded=true;return value;}).finally(()=>{loading=null;});return loading;}
 async function select(){
  if(!loaded)return;
  const tracks=selectedPlaylist(library,context).map(id=>{const track=musicTracks(library).find(t=>t.id===id)||builtin;return {...track,url:location.origin+'/api/music/media/'+track.id};});
  await transport.command({type:'playlist',key:playlistSource(library,context),tracks,fadeSeconds:library.fadeSeconds});
  if(!desktop&&!started){started=true;await setPreferences(preferences);await transport.command({type:'play'});}
  await refresh();
 }
 async function refresh(){
  if(updating||document.hidden)return;updating=true;
  try{
   const preferenceVersion=preferenceStore.version();const state=await transport.state();if(!state)return;playback=state;updateMusicRows(document.querySelector('.music-manager'),state);
   preferenceStore.sync({volume:state.volume,muted:state.muted,soundEffectsVolume:state.soundEffectsVolume??preferences.soundEffectsVolume},preferenceVersion);
   q('[data-song]').textContent=state.track?.name||(state.playlist?.length===0?'No Music':builtin.name);q('[data-song]').title='Show '+q('[data-song]').textContent+' in All Songs';q('[data-song]').disabled=!state.track;q('[data-now-playing-link]').disabled=!state.track;
   q('[data-context]').textContent=state.track?.artist??'Gallorin Studios';
   for(const direction of ['previous','next'])q('[data-music="'+direction+'"]').disabled=(state.playlist?.length||1)<2;
   const play=q('[data-music="toggle"]');play.disabled=state.playlist?.length===0;play.textContent=state.playing?'Ⅱ':'▶';play.setAttribute('aria-label',state.playing?'Pause music':'Play music');
   const seek=q('[data-seek]');if(document.activeElement!==seek){seek.max=state.duration;seek.value=state.currentTime;}seek.disabled=!state.duration;
   q('[data-current]').textContent=time(state.currentTime);q('[data-duration]').textContent=time(state.duration);
   q('.music-error').textContent=state.error||'';
  }catch{}finally{updating=false;}
 }
 bar.addEventListener('click',async event=>{
  if(event.target.closest('[data-now-playing-link],[data-song]')){try{const state=await transport.state();if(!await revealPlayingSong(state.track?.id))notify('This song is not in the music library.',true);}catch(error){notify(error.message,true);}return;}
  const button=event.target.closest('[data-music]');if(!button)return;
  try{
   if(button.dataset.music==='mute'){await setPreferences({muted:!preferences.muted});await refresh();return;}
   const state=await transport.state();
   if(button.dataset.music==='toggle')await transport.command({type:state.playing?'pause':'play'});
   if(['next','previous'].includes(button.dataset.music))await transport.command({type:button.dataset.music});
   if(button.dataset.music==='stop')await transport.command({type:'stop'});
   if(button.dataset.music==='restart'){await transport.command({type:'seek',value:0});await transport.command({type:'play'});}
   await refresh();
  }catch(error){notify(error.message,true);}
 });
 q('[data-seek]').addEventListener('input',()=>{q('[data-current]').textContent=time(Number(q('[data-seek]').value));});
 q('[data-seek]').addEventListener('change',()=>{void transport.command({type:'seek',value:Number(q('[data-seek]').value)});});
 q('[data-volume]').addEventListener('input',()=>{const volume=Number(q('[data-volume]').value);q('[data-volume-value]').textContent=volume+'%';void setPreferences({volume}).catch(error=>notify(error.message,true));});
 if(!desktop)void setPreferences(preferences).catch(error=>notify(error.message,true));
 setInterval(()=>void refresh(),350);
 async function playEffect(id){
  if(!loaded)await refreshLibrary();
  const track=library.tracks.find(t=>t.id===id&&isSoundEffect(t));if(!track)return;
  await transport.command({type:'effect',track:{...track,url:location.origin+'/api/music/media/'+track.id}});await refresh();
 }
 async function playEvent(event){
  if(!loaded)await refreshLibrary();
  const track=effectForEvent(library,event);
  if(track)await playEffect(track.id);
 }
 async function spawnEffects(previous,next,zone){
  const cosmic=newCosmicEncounters(previous,next,zone);
  for(const horse of cosmic)await playEvent('effect/cosmic-spawn');
 }
 function page(){return musicManagerPage(library,getLocations());}
 function bind(root){
  bindMusicManager(root,{
   getLibrary:()=>library,getPlaybackState:()=>playback,getLocations,notify,openAudioSettings:()=>audioSettings.open(),
   async saveSettings(assignments,fadeSeconds){library=await api('/api/music/settings',{assignments,fadeSeconds});context=musicContext(location.hash.slice(1),library)||context;await select();},
   async importFiles(files,kind='music'){
    for(const file of files){
     if(!file.name.toLowerCase().endsWith('.mp3')||file.size>50*1024*1024)throw Error('Choose MP3 files up to 50 MB each.');
     const response=await fetch('/api/music/import?kind='+encodeURIComponent(kind),{method:'POST',headers:{'Content-Type':'audio/mpeg','X-File-Name':encodeURIComponent(file.name)},body:file});
     const result=await response.json();if(!response.ok)throw Error(result.error);library=result;
    }
    notify(files.length+' '+(kind==='effect'?'sound effect':'song')+(files.length===1?'':'s')+' imported.');
   },
   async preview(id,playlistContext){
    if(isSoundEffect(library.tracks.find(t=>t.id===id))){await playEffect(id);return;}
    const ids=playlistContext?selectedPlaylist(library,playlistContext):musicTracks(library).filter(t=>!isSoundEffect(t)).map(t=>t.id);
    const tracks=ids.map(songId=>{const track=musicTracks(library).find(t=>t.id===songId);return {...track,url:location.origin+'/api/music/media/'+track.id};});
    if(playlistContext)context=playlistContext;
    await transport.command({type:'playlist',key:playlistContext||'library',startId:id,tracks,fadeSeconds:library.fadeSeconds});
    await transport.command({type:'play'});await refresh();
   },
   async updateSong(id,values){
    library=await api('/api/music/update',{id,values});
    notifyReplacements();
    const track=musicTracks(library).find(t=>t.id===id);
    await transport.command({type:'metadata',id,name:track.name,artist:track.artist});await refresh();
   },
   async setEventSound(event,oldId,newId){
    const id=newId||oldId;if(!id)return;
    const events=soundEffectGroups.flatMap(group=>group.items).filter(item=>(library.assignments[item.id]||[]).includes(id)).map(item=>item.id).filter(key=>key!==event);
    if(newId)events.push(event);
    library=await api('/api/music/assign',{id,playlistIds:events});
    const eventName=soundEffectGroups.flatMap(group=>group.items).find(item=>item.id===event)?.name||event;
    notify(`${eventName} sound effect ${oldId ? 'updated' : 'added'}`);
    await refresh();
   },
   async assignSong(id,playlistIds){
    library=await api('/api/music/assign',{id,playlistIds});
    notifyReplacements();
    const state=await transport.state();if(!isSoundEffect(library.tracks.find(t=>t.id===id))&&state.playlistKey!=='library')await select();
   },
   async deleteSong(id){const effect=isSoundEffect(library.tracks.find(t=>t.id===id));library=await api('/api/music/delete',{id});if(!effect)await select();}
  });
 }
 return {page,bind,spawnEffects,playEvent,async route(route){try{if(!loaded)await refreshLibrary();context=musicContext(route,library)||context;await select();}catch(error){notify(error.message,true);}}};
}
