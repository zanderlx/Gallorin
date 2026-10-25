import {musicContexts,musicTracks} from './music-context.js';

// Removal is scoped to one assignment. Library deletion remains a separate action.
export function confirmPlaylistRemoval({library,locations,context,id,signal,remove,onRemoved,notify}){
 const track=musicTracks(library).find(track=>track.id===id);
 if(!track)return null;
 const playlist=musicContexts(locations).find(item=>item.id===context);
 const dialog=document.createElement('dialog');dialog.className='music-delete-dialog music-playlist-remove-dialog';
 dialog.setAttribute('aria-label','Remove Song from Playlist?');
 dialog.innerHTML='<h2>Remove Song from Playlist?</h2><p></p><div><button type="button" class="button secondary" data-no>Cancel</button><button type="button" class="button danger" data-yes>Remove</button></div>';
 dialog.querySelector('p').textContent='Remove “'+track.name+'” from “'+(playlist?.name||context)+'”? The song will remain in All Songs.';
 document.body.append(dialog);
 const close=()=>{dialog.close();dialog.remove();};
 signal.addEventListener('abort',close,{once:true});
 dialog.addEventListener('close',()=>{signal.removeEventListener('abort',close);dialog.remove();},{once:true});
 dialog.querySelector('[data-no]').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
 });
 dialog.querySelector('[data-yes]').onclick=async()=>{
  dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
  try{await remove(context,id);dialog.close();onRemoved();}
  catch(error){notify(error.message,true);dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
 };
 dialog.showModal();dialog.querySelector('[data-no]').focus();return dialog;
}
