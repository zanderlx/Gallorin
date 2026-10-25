import {isCosmicPalette} from './cosmic-types.js';
export const soundEffectGroups=[{id:'events',name:'Events',items:[{id:'effect/cosmic-spawn',name:'Cosmic Horse Spawn'},{id:'effect/horse-sold',name:'Horse Sold'},{id:'effect/respawn-ready',name:'Horse Respawn Timer Finished'}]}];
export const isSoundEffect=track=>track?.kind==='effect';
export function newCosmicEncounters(previous,next,zone){
 const seen=new Set(Object.values(previous?.encounters||{}).flat().map(h=>h.id));
 return (next?.encounters?.[zone]||[]).filter(h=>!seen.has(h.id)&&(h.spawnPath==='Cosmic'||isCosmicPalette({name:h.specialSpawn})));
}

// Events choose one valid effect and never change the background playlist.
export function effectForEvent(library,event,rng=Math.random){
 const ids=Array.isArray(library.assignments?.[event])?library.assignments[event]:[];
 const tracks=ids.map(id=>library.tracks.find(track=>track.id===id&&isSoundEffect(track))).filter(Boolean);
 return tracks.length?tracks[Math.floor(rng()*tracks.length)]:null;
}
