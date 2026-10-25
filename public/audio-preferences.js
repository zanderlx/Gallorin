export const defaultAudioPreferences={volume:15,muted:false,soundEffectsVolume:100};
export function audioPreferences(input={},previous=defaultAudioPreferences){
 const percent=(value,fallback)=>Number.isFinite(value)?Math.max(0,Math.min(100,value)):fallback;
 return {volume:percent(input.volume,previous.volume),muted:typeof input.muted==='boolean'?input.muted:previous.muted,soundEffectsVolume:percent(input.soundEffectsVolume,previous.soundEffectsVolume)};
}
