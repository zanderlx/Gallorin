const sortState=new Map();
const columns=['number','title','artist','duration','event'];
const defaultSort={key:null,direction:null};
export function nextMusicSort(previous,key){
 if(previous?.key!==key)return {key,direction:'asc'};
 if(previous.direction==='asc')return {key,direction:'desc'};
 return {key:null,direction:null};
}
export function compareMusicValues(a,b,direction='asc'){
 if(a===null||a===undefined)return b===null||b===undefined?0:1;
 if(b===null||b===undefined)return -1;
 const comparison=typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
 return direction==='desc'?-comparison:comparison;
}
function value(row,key){
 if(key==='number')return Number(row.querySelector('.music-row-number')?.textContent);
 if(key==='title')return row.cells[1]?.textContent.trim()||'';
 if(key==='sound')return row.querySelector('.music-sound-effect')?.textContent.trim()||'';
 if(key==='event')return row.querySelector('.music-event')?.textContent.trim()||'';
 if(key==='artist')return row.querySelector('.music-artist')?.textContent.trim()||'';
 const parts=row.querySelector('.music-duration')?.textContent.trim().match(/^(\d+):(\d{2})$/);
 return parts?Number(parts[1])*60+Number(parts[2]):null;
}
const tableKey=table=>table.closest('[data-playlist]')?.dataset.playlist||(table.dataset.libraryTable||'all-songs');
function sort(table,state){
 const rows=[...table.tBodies[0].querySelectorAll('tr[data-music-track]')];
 rows.sort((a,b)=>compareMusicValues(value(a,state.key||'number'),value(b,state.key||'number'),state.direction||'asc')||value(a,'number')-value(b,'number'));
 table.tBodies[0].append(...rows);
 for(const th of table.querySelectorAll('th[data-music-sort]')){
  const active=th.dataset.musicSort===state.key;
  th.setAttribute('aria-sort',active?(state.direction==='asc'?'ascending':'descending'):'none');
  const indicator=th.querySelector('.music-sort-indicator');indicator.hidden=!active;indicator.textContent=active?(state.direction==='asc'?'↑':'↓'):'';
 }
}
export function bindMusicSorting(root,signal){
 for(const table of root.querySelectorAll('.music-table')){
  [...table.tHead.rows[0].cells].slice(0,-1).forEach((th,index)=>{
   if(th.dataset.musicSort)return;
   const label=th.textContent.trim();th.dataset.musicSort=th.classList.contains('music-sound-effect')?'sound':th.classList.contains('music-event')?'event':th.classList.contains('music-artist')?'artist':th.classList.contains('music-duration')?'duration':columns[index];th.setAttribute('aria-sort','none');
   const button=document.createElement('button');button.type='button';button.className='music-sort-button';button.setAttribute('aria-label','Sort by '+(label==='#'?'number':label));
   const title=document.createElement('span');title.textContent=label;
   const indicator=document.createElement('span');indicator.className='music-sort-indicator';indicator.setAttribute('aria-hidden','true');indicator.hidden=true;
   button.append(title,indicator);th.replaceChildren(button);
  });
  sort(table,sortState.get(tableKey(table))||defaultSort);
 }
 root.addEventListener('click',event=>{
  const th=event.target.closest('th[data-music-sort]');if(!th||!root.contains(th))return;
  const table=th.closest('table'),key=tableKey(table),previous=sortState.get(key)||defaultSort;
  const next=nextMusicSort(previous,th.dataset.musicSort);
  sortState.set(key,next);sort(table,next);
 },{signal});
}
