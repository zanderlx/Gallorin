export async function smokePlaylistRemoval(main){
 await main.webContents.executeJavaScript('('+verifyRemoval.toString()+')()');
}
async function verifyRemoval(){
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const read=async()=>await(await fetch('/api/music')).json();
 async function remove(button,cancel=false){
  const before=await read();button.click();
  const dialog=document.querySelector('.music-playlist-remove-dialog');
  if(!dialog?.open||!dialog.textContent.includes('All Songs'))throw Error('Playlist removal confirmation missing');
  if(JSON.stringify((await read()).assignments)!==JSON.stringify(before.assignments))throw Error('Removal saved before confirmation');
  dialog.querySelector(cancel?'[data-no]':'[data-yes]').click();
  for(let i=0;i<100&&dialog.isConnected;i++)await wait(25);
  if(dialog.isConnected)throw Error('Playlist confirmation did not close');
  if(cancel&&JSON.stringify((await read()).assignments)!==JSON.stringify(before.assignments))throw Error('Cancel changed playlist');
 }
 document.querySelector('[data-playlist="wilds/aetherion"]').open=false;
 const other=()=>document.querySelector('[data-playlist="wilds/hallowhoof"] [data-playlist-remove]');
 await remove(other(),true);await remove(other());
 if(document.querySelector('[data-playlist="wilds/aetherion"]').open)throw Error('Playlist collapsed state was lost');
 const card=document.querySelector('[data-playlist="wilds/aetherion"]');card.open=true;
 const row=card.querySelector('[data-music-track]');
 row.querySelector('strong').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 await wait(450);
 if(!row.classList.contains('is-current'))throw Error('Double-click row playback failed');
 document.activeElement?.blur();
 if(Number(getComputedStyle(row.querySelector('.music-row-play')).opacity)!==0||Number(getComputedStyle(row.querySelector('.music-row-trash')).opacity)!==0||Number(getComputedStyle(row.querySelector('.music-row-number')).opacity)!==1)throw Error('Active row hover-only controls failed');
 if(getComputedStyle(row.querySelector('.music-duration')).textAlign!=='left')throw Error('Duration alignment failed');
 if(document.querySelector('[data-playlist-add],[data-playlist-move],[data-playlist-reset]'))throw Error('Removed playlist controls are still present');
 if(document.querySelector('.music-library h2').textContent!=='All Songs'||!document.querySelector('.music-library .music-import'))throw Error('All Songs/import placement failed');
 await remove(card.querySelector('[data-playlist-remove][data-index="1"]'));
 const first=await read();
 if(first.assignments['wilds/aetherion'].length!==1)throw Error('Playlist removal failed');
 await remove(document.querySelector('[data-playlist="wilds/aetherion"] [data-playlist-remove][data-index="0"]'));
 const second=await read();
 if(second.assignments['wilds/aetherion'].length!==0||second.tracks.length!==first.tracks.length)throw Error('Playlist removal affected library files or empty state');
 if((await window.gallorinMusic.state()).track?.id!==second.assignments.default[0])throw Error('Empty playlist did not use the configured Default');
 if(document.querySelector('[data-playlist="wilds/aetherion"] [data-music-track]'))throw Error('Default song was inserted into an empty playlist');
 // Reselect the removed location after navigation; removed tracks must not return.
 location.hash='wilds/aetherion';await wait(500);
 if((await window.gallorinMusic.state()).playlist.some(id=>first.assignments['wilds/aetherion'].includes(id)))throw Error('Removed song returned after navigation');
 location.hash='dev/music';await wait(500);
}
