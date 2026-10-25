// A persisted deadline makes cooldowns survive page reloads and zone changes.
export function cooldownSeconds(state,now=Date.now()) {
 return state?.settings?.searchCooldownEnabled ? Math.max(0,Math.ceil(((state.searchAvailableAt||0)-now)/1000)) : 0;
}
export function cooldownLabel(seconds) {
 const minutes=Math.floor(seconds/60),remainder=seconds%60;
 return `${minutes ? minutes+' min ' : ''}${remainder} ${remainder===1 ? 'sec' : 'secs'}`;
}
// Only a timer observed while active can announce completion; cancellation clears it.
export function createCooldownCompletion(onComplete) {
 let activeDeadline=0;
 return (state,now=Date.now())=>{
  const deadline=state?.settings?.searchCooldownEnabled ? state.searchAvailableAt||0 : 0;
  if(activeDeadline && deadline===activeDeadline && now>=deadline){activeDeadline=0;onComplete();return;}
  activeDeadline=deadline>now ? deadline : 0;
 };
}
export function bindEncounterCooldown(getState,onComplete=()=>{}) {
 const checkCompletion=createCooldownCompletion(onComplete);
 let stack=document.querySelector('#notification-stack');
 if(!stack){stack=document.createElement('div');stack.id='notification-stack';document.body.append(stack);}
 const toast=document.querySelector('#toast');if(toast)stack.append(toast);
 const notice=document.createElement('div');notice.id='encounter-cooldown';notice.setAttribute('role','timer');notice.hidden=true;stack.append(notice);
 const update=()=>{
  const state=getState();checkCompletion(state);
  const seconds=cooldownSeconds(state);notice.hidden=!seconds;
  notice.textContent=seconds ? `Awaiting Respawn: ${cooldownLabel(seconds)}` : '';
  for(const button of document.querySelectorAll('[data-action="search"]')) {
   const disabled=seconds>0;
   // Rewriting title on every tick makes the native hover tooltip flash.
   if(button.disabled!==disabled)button.disabled=disabled;
   if(disabled && button.title!=='Search cooldown is active')button.title='Search cooldown is active';
   else if(!disabled && button.hasAttribute('title'))button.removeAttribute('title');
  }
 };
 setInterval(update,250);return update;
}
