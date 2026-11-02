// Serialized into the muted renderer by check-horse-folders.cjs --drag-only.
async function checkHorseDragging(win, action, ids, directory) {
  const { writeFile } = require('node:fs/promises');
  const { join } = require('node:path');
  await action('save-horse-folder', { name: 'Trail', horseIds: ids });
  const created = await action('save-horse-folder', { name: 'Meadow', horseIds: [] });
  const [trail, meadow] = created.state.horseFolders.map(folder => folder.id);
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  const settled = async () => {
    for (let i = 0; i < 150; i++) {
      if (
        await run(
          () =>
            document.querySelector('[data-horse-folder-edit]') && !document.querySelector('#collection-grid[aria-busy]')
        )
      )
        return;
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    throw Error('Drag save did not settle');
  };
  const drop = async (from, to, id, targetId, after = false) => {
    await win.webContents.executeJavaScript(
      '(' + performDrop.toString() + ')(' + JSON.stringify({ from, to, id, targetId, after }) + ')'
    );
    await settled();
    await run(() => {
      if (document.querySelector('.horse-folder-drop-status').textContent) throw Error('Drag failed');
      if ([...document.querySelectorAll('.horse-card')].some(card => getComputedStyle(card).animationName !== 'none'))
        throw Error('Drag replayed card entrance animation');
    });
  };
  const expectOrder = async (folder, expected) => {
    const actual = await win.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('[data-music-group="${folder}"] [data-folder-horse]'), el => el.dataset.folderHorse)`
    );
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw Error('Unexpected horse order: ' + JSON.stringify({ folder, actual, expected }));
  };
  win.reload();
  await settled();
  // Native drag events exercise the application's real drag handlers and API persistence.
  await drop(trail, trail, ids[2], ids[0]);
  await expectOrder(trail, [ids[2], ids[0], ids[1]]);
  await drop(trail, trail, ids[0], ids[1], true);
  await expectOrder(trail, [ids[2], ids[1], ids[0]]);
  await win.webContents.executeJavaScript(`document.querySelector('[data-music-group="${meadow}"]').open = false`);
  await drop(trail, meadow, ids[2]);
  await expectOrder(trail, [ids[1], ids[0]]);
  await expectOrder(meadow, [ids[2]]);
  await drop(trail, 'favorites', ids[0]);
  await expectOrder(trail, [ids[1]]);
  await drop('favorites', 'unfiled', ids[0]);
  await expectOrder('unfiled', [ids[0]]);
  await win.webContents.executeJavaScript(`document.querySelector('[data-music-group="${meadow}"]').open = true`);
  await drop(meadow, 'unfiled', ids[2], ids[0]);
  await expectOrder('unfiled', [ids[2], ids[0]]);
  await run(() => {
    const search = document.querySelector('#horse-search');
    search.value = 'Moss';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await drop('unfiled', meadow, ids[2]);
  await run(() => {
    const search = document.querySelector('#horse-search');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expectOrder(meadow, [ids[2]]);
  win.reload();
  await settled();
  await expectOrder(meadow, [ids[2]]);
  await expectOrder(trail, [ids[1]]);
  await expectOrder('unfiled', [ids[0]]);
  await run(async () => {
    document
      .querySelectorAll('.horse-card')
      .forEach(card => card.getAnimations().forEach(animation => animation.finish()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await writeFile(join(directory, 'horse-drag.png'), (await win.webContents.capturePage()).toPNG());
}
function performDrop({ from, to, id, targetId, after }) {
  const source = document.querySelector(`[data-music-group="${from}"] [data-folder-horse="${id}"]`);
  const folder = document.querySelector(`[data-music-group="${to}"]`);
  const target = targetId ? folder.querySelector(`[data-folder-horse="${targetId}"]`) : folder.querySelector('summary');
  if (!source || !target) throw Error('Missing drag source or target');
  const dataTransfer = new DataTransfer();
  source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
  const rect = target.getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    dataTransfer,
    clientX: rect.left + rect.width * (after ? 0.8 : 0.2),
    clientY: rect.top + rect.height / 2
  };
  target.dispatchEvent(new DragEvent('dragover', init));
  if (!folder.classList.contains('horse-drop-target')) throw Error('Drop target did not highlight');
  target.dispatchEvent(new DragEvent('drop', init));
  source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
}
module.exports = { checkHorseDragging };
