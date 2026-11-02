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
  const drop = async (from, to, id, targetId, after = false, overCard = false) => {
    await win.webContents.executeJavaScript(
      '(' + performDrop.toString() + ')(' + JSON.stringify({ from, to, id, targetId, after, overCard }) + ')'
    );
    await settled();
    await run(() => {
      if (document.querySelector('.horse-folder-drop-status').textContent) throw Error('Drag failed');
      if (document.querySelector('.horse-drag-image,.horse-native-drag-image'))
        throw Error('Drop left a floating drag image behind');
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
    await run(() => {
      const placeholder = document.querySelector('.horse-drop-placeholder');
      const rect = placeholder.getBoundingClientRect();
      placeholder.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: window.horseDragCheck.dataTransfer,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        })
      );
    });
    // Hidden Chromium windows may return the preceding compositor frame on the first capture.
    await win.webContents.capturePage();
    await new Promise(resolve => setTimeout(resolve, 150));
    await writeFile(join(directory, 'horse-preview-' + motion + '.png'), (await win.webContents.capturePage()).toPNG());
    await run(() => {
      const { source, dataTransfer } = window.horseDragCheck;
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
      if (document.querySelector('.horse-drop-placeholder,.horse-dragging,.horse-drag-image,.horse-native-drag-image'))
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
        JSON.stringify({ from: trail, to: trail, id: ids[2], targetId: ids[0], overCard: true, previewOnly: true }) +
        ')'
    );
    await run(() => {
      const { source, folder, dataTransfer } = window.horseDragCheck;
      const visible = [...folder.querySelector('.horse-grid').children].filter(
        el => getComputedStyle(el).display !== 'none'
      );
      if (
        !visible[0].classList.contains('horse-drop-placeholder') ||
        visible[1].querySelector('.horse-card-open').textContent !== 'Willow' ||
        visible[2].querySelector('.horse-card-open').textContent !== 'Ash'
      )
        throw Error('Hovered horse and later cards must shift down in order');
      visible
        .filter(el => el.hasAttribute('data-folder-horse'))
        .forEach(card => card.getAnimations().forEach(animation => animation.finish()));
      const left = visible[1].getBoundingClientRect(),
        right = visible[2].getBoundingClientRect();
      folder.querySelector('.horse-grid').dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          clientX: (left.right + right.left) / 2,
          clientY: left.top + left.height / 2
        })
      );
      const inserted = [...folder.querySelector('.horse-grid').children].filter(
        el => getComputedStyle(el).display !== 'none'
      );
      if (
        inserted[0].querySelector('.horse-card-open')?.textContent !== 'Willow' ||
        !inserted[1].classList.contains('horse-drop-placeholder') ||
        inserted[1].textContent !== 'Drop here'
      )
        throw Error('Moving from a card into a gap did not preserve insertion behavior');
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    });
    await expectOrder(trail, ids);
    await drop(trail, trail, ids[2], ids[0], false, true);
    await expectOrder(trail, [ids[2], ids[0], ids[1]]);
    await drop(trail, trail, ids[2], ids[1], true);
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
    await win.webContents.executeJavaScript(
      '(' +
        performDrop.toString() +
        ')(' +
        JSON.stringify({ from: trail, to: trail, id: ids[2], targetId: ids[2], previewOnly: true }) +
        ')'
    );
    await run(() => {
      const { source, folder, dataTransfer } = window.horseDragCheck;
      const grid = folder.querySelector('.horse-grid');
      const cards = [...grid.querySelectorAll('[data-folder-horse]')].filter(card => card !== source);
      cards.forEach(card => card.getAnimations().forEach(animation => animation.finish()));
      const [left, right] = cards.map(card => card.getBoundingClientRect());
      const init = {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: (left.right + right.left) / 2,
        clientY: left.top + left.height / 2
      };
      for (let repeat = 0; repeat < 10; repeat++) {
        grid.dispatchEvent(new DragEvent('dragover', init));
        const visible = [...grid.children].filter(el => getComputedStyle(el).display !== 'none');
        if (
          visible[0] !== cards[0] ||
          !visible[1].classList.contains('horse-drop-placeholder') ||
          visible[2] !== cards[1]
        )
          throw Error('Dragging in the gap must stay between the two horses');
      }
      grid.dispatchEvent(new DragEvent('drop', init));
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    });
    await settled();
    await expectOrder(trail, [ids[0], ids[2], ids[1]]);
    await drop(trail, trail, ids[2], ids[1], true);
    await expectOrder(trail, ids);
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
  await drop(trail, meadow, ids[0], ids[2], false, true);
  await expectOrder(trail, [ids[1]]);
  await expectOrder(meadow, [ids[0], ids[2]]);
  await drop(meadow, trail, ids[0]);
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
function performDrop({ from, to, id, targetId, after, previewOnly, overCard }) {
  const source = document.querySelector(`[data-music-group="${from}"] [data-folder-horse="${id}"]`);
  if (source) source.closest('details').open = true;
  const folder = document.querySelector(`[data-music-group="${to}"]`);
  const targetCard = targetId ? folder.querySelector(`[data-folder-horse="${targetId}"]`) : null;
  const target = targetCard
    ? overCard
      ? targetCard
      : folder.querySelector('.horse-grid')
    : folder.querySelector('summary');
  if (!source || !target) throw Error('Missing drag source or target');
  const dataTransfer = new DataTransfer();
  source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
  const rect = (targetCard || target).getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    dataTransfer,
    clientX: overCard
      ? rect.left + rect.width / 2
      : targetCard
        ? after
          ? rect.right + 2
          : rect.left - 2
        : rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  };
  target.dispatchEvent(new DragEvent('dragover', init));
  if (!folder.classList.contains('horse-drop-target')) throw Error('Drop target did not highlight');
  if (getComputedStyle(source).display !== 'none') throw Error('Picked-up horse still occupies its old slot');
  const image = document.querySelector('.horse-drag-image');
  if (
    !image ||
    getComputedStyle(image).opacity !== '1' ||
    getComputedStyle(image.querySelector('.horse-card')).opacity !== '1'
  )
    throw Error('Floating horse preview must be fully opaque');
  if (getComputedStyle(image).pointerEvents !== 'none') throw Error('Drag preview blocks its drop targets');
  if (Math.abs(image.getBoundingClientRect().left - init.clientX) > 1)
    throw Error('Drag preview did not follow the cursor');
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
