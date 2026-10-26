export async function smokePlaylistSelection(main) {
  await main.webContents.executeJavaScript('(' + verifySectionSelection.toString() + ')()');
}
async function verifySectionSelection() {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const id = document.querySelector('[data-library-kind=music] [data-song-options]:not([data-song-options=menu])')
    .dataset.songOptions;
  const library = await (await fetch('/api/music')).json();
  const original = Object.entries(library.assignments)
    .filter(([, ids]) => ids.includes(id))
    .map(([key]) => key);
  const open = () => {
    document.querySelector('[data-song-options="' + id + '"]').click();
    document.querySelector('[data-song-option=add]').click();
    return document.querySelector('.music-playlist-picker');
  };
  let modal = open(),
    all = modal.querySelector('[data-playlist-choice=wilds]'),
    child = modal.querySelector('[data-playlist-choice="wilds/aetherion"]'),
    prior = child.checked;
  all.checked = true;
  all.dispatchEvent(new Event('change', { bubbles: true }));
  const row = child.closest('tr');
  if (!child.disabled || child.checked || Number(getComputedStyle(row).opacity) > 0.5)
    throw Error('All Wilds did not disable and gray its children');
  if (modal.querySelector('[data-playlist-choice="stable/all"]').disabled)
    throw Error('All Wilds disabled another section');
  row.cells[1].click();
  if (child.checked) throw Error('Disabled playlist row remained clickable');
  all.checked = false;
  all.dispatchEvent(new Event('change', { bubbles: true }));
  if (child.disabled || child.checked !== prior) throw Error('Unchecking All did not restore individual selection');
  all.checked = true;
  all.dispatchEvent(new Event('change', { bubbles: true }));
  modal.querySelector('[data-save-playlists]').click();
  for (let n = 0; n < 100 && modal.open; n++) await wait(30);
  await wait(30);
  const saved = await (await fetch('/api/music')).json(),
    { selectedPlaylist } = await import('/music-context.js');
  if (
    !saved.assignments.wilds.includes(id) ||
    saved.assignments['wilds/aetherion'].includes(id) ||
    !selectedPlaylist(saved, 'wilds/future-zone').includes(id)
  )
    throw Error('All selection did not persist or apply section-wide');
  modal = open();
  for (const input of modal.querySelectorAll('[data-playlist-choice]'))
    input.checked = original.includes(input.dataset.playlistChoice);
  modal.querySelector('table').dispatchEvent(new Event('change', { bubbles: true }));
  // Restored individual choices follow the original memberships after All is cleared.
  for (const input of modal.querySelectorAll('[data-playlist-choice]'))
    if (!input.disabled) input.checked = original.includes(input.dataset.playlistChoice);
  modal.querySelector('[data-save-playlists]').click();
  for (let n = 0; n < 100 && modal.open; n++) await wait(30);
}
