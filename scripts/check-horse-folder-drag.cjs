// Serialized into the muted renderer by check-horse-folders.cjs --drag-only.
async function checkHorseDragging(win, action, ids, directory) {
  const { writeFile } = require('node:fs/promises');
  const { join } = require('node:path');
  await action('save-horse-folder', { name: 'Trail', horseIds: ids });
  const created = await action('save-horse-folder', { name: 'Meadow', horseIds: [] });
  const [trail, meadow] = created.state.horseFolders.map(folder => folder.id);
  const temporary = await action('save-horse-folder', { name: 'Temporary', horseIds: [] });
  const temporaryId = temporary.state.horseFolders.at(-1).id;
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
  win.webContents.debugger.attach('1.3');
  for (const motion of ['no-preference', 'reduce']) {
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: motion }]
    });
    await win.webContents.executeJavaScript(
      '(' +
        performDrop.toString() +
        ')(' +
        JSON.stringify({ from: trail, to: meadow, id: ids[2], previewOnly: true }) +
        ')'
    );
    await run(() => {
      const placeholder = document.querySelector('.horse-drop-placeholder');
      if (!placeholder || placeholder.getBoundingClientRect().height < 100)
        throw Error('Live drop slot is not visible');
      placeholder.scrollIntoView({ block: 'center', behavior: 'instant' });
      document
        .querySelectorAll('[data-folder-horse]')
        .forEach(card => card.getAnimations().forEach(animation => animation.finish()));
    });
    await run(async () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Hidden Chromium windows may return the preceding compositor frame on the first capture.
    await win.webContents.capturePage();
    await new Promise(resolve => setTimeout(resolve, 150));
    await writeFile(join(directory, 'horse-preview-' + motion + '.png'), (await win.webContents.capturePage()).toPNG());
    await run(() => {
      const { source, dataTransfer } = window.horseDragCheck;
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
      if (document.querySelector('.horse-drop-placeholder,.horse-dragging'))
        throw Error('Cancelled drag left a preview behind');
      if (getComputedStyle(source).display === 'none') throw Error('Cancelled drag did not restore its horse');
      if (window.horseDragCheck.folder.open) throw Error('Cancelled drag left its destination expanded');
      if (window.horseDragCheck.folder.querySelector('.grid-empty').hidden)
        throw Error('Cancelled drag did not restore the empty-folder message');
    });
    await expectOrder(trail, ids);
    await win.webContents.executeJavaScript(
      '(' +
        performDrop.toString() +
        ')(' +
        JSON.stringify({ from: trail, to: trail, id: ids[2], targetId: ids[0], previewOnly: true }) +
        ')'
    );
    await run(() => {
      const grid = window.horseDragCheck.folder.querySelector('.horse-grid');
      const visible = [...grid.children].filter(el => getComputedStyle(el).display !== 'none');
      if (!visible[0].classList.contains('horse-drop-placeholder') || visible.length !== 3)
        throw Error('Live reorder did not shift the remaining horses around the drop slot');
      const { source, dataTransfer } = window.horseDragCheck;
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    });
  }
  win.webContents.debugger.detach();
  await win.webContents.executeJavaScript(
    '(' +
      performDrop.toString() +
      ')(' +
      JSON.stringify({ from: trail, to: temporaryId, id: ids[2], previewOnly: true }) +
      ')'
  );
  await action('delete-horse-folder', { id: temporaryId });
  await run(() => {
    const { source, target, init, dataTransfer } = window.horseDragCheck;
    target.dispatchEvent(new DragEvent('drop', init));
    source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
  });
  await settled();
  await run(() => {
    if (!document.querySelector('.horse-folder-drop-status').textContent)
      throw Error('Failed save needs an error message');
    if (document.querySelector('.horse-drop-placeholder,.horse-dragging'))
      throw Error('Failed drop did not restore the original layout');
  });
  await expectOrder(trail, ids);
  win.reload();
  await settled();
  // Drag events exercise the application's real handlers and API persistence.
  await drop(trail, trail, ids[2], ids[0]);
  await expectOrder(trail, [ids[2], ids[0], ids[1]]);
  await run(() => {
    const select = document.querySelector('#horse-sort');
    const direction = document.querySelector('[data-action=sort-direction]');
    select.value = 'name';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (direction.hidden || direction.disabled) throw Error('Name sort needs an active direction control');
    const names = () => [...document.querySelectorAll('.horse-card-open')].map(button => button.textContent);
    if (names().join(',') !== 'Ash,Moss,Willow') throw Error('Name ascending order failed');
    direction.click();
    if (names().join(',') !== 'Willow,Moss,Ash') throw Error('Name descending order failed');
    select.value = 'custom';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (!direction.hidden || !direction.disabled || direction.dataset.direction !== 'asc')
      throw Error('Switching from descending to Custom left automatic sorting active');
    const grid = document.querySelector('#collection-grid');
    const markup = grid.innerHTML;
    direction.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    if (grid.innerHTML !== markup || direction.dataset.direction !== 'asc')
      throw Error('Custom accepted a stray sort direction event');
  });
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
function performDrop({ from, to, id, targetId, after, previewOnly }) {
  const source = document.querySelector(`[data-music-group="${from}"] [data-folder-horse="${id}"]`);
  if (source) source.closest('details').open = true;
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
  if (getComputedStyle(source).display !== 'none') throw Error('Picked-up horse still occupies its old slot');
  const placeholder = document.querySelector('.horse-drop-placeholder');
  if (placeholder?.closest('details') !== folder) throw Error('Drop placeholder is not in the destination folder');
  if (previewOnly) {
    window.horseDragCheck = { source, target, folder, dataTransfer, init };
    return;
  }
  target.dispatchEvent(new DragEvent('drop', init));
  if (getComputedStyle(source).display !== 'none' || !document.querySelector('.horse-drop-placeholder'))
    throw Error('Picked-up horse flashed back while saving the drop');
  source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
}
module.exports = { checkHorseDragging };
