import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function smokePlayerLayout(main, directory) {
  const size = main.getSize();
  try {
    for (const narrow of [false, true]) {
      if (narrow) {
        main.setSize(800, 800);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      await main.webContents.executeJavaScript('(' + verifyCompact.toString() + ')(' + JSON.stringify(narrow) + ')');
      await writeFile(
        join(directory, narrow ? 'player-compact-narrow.png' : 'player-compact.png'),
        (await main.webContents.capturePage()).toPNG()
      );
      await main.webContents.executeJavaScript('(' + verifyExpanded.toString() + ')()');
    }
  } finally {
    main.setSize(...size);
  }
}
async function verifyCompact(narrow) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const bar = document.querySelector('.music-player'),
    toggle = bar.querySelector('[data-player-collapse]');
  if (bar.classList.contains('is-compact')) {
    toggle.click();
    await wait(400);
  }
  const expanded = bar.getBoundingClientRect().height,
    before = await window.gallorinMusic.state();
  toggle.click();
  await wait(90);
  const intermediate = bar.getBoundingClientRect().height,
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && !(intermediate < expanded && intermediate > (narrow ? 88 : 56)))
    throw Error('Player did not animate its height');
  await wait(340);
  const after = await window.gallorinMusic.state(),
    box = bar.getBoundingClientRect();
  if (Math.abs(box.height - (narrow ? 88 : 56)) > 1) throw Error('Compact player height incorrect');
  if (
    before.track?.id !== after.track?.id ||
    before.playing !== after.playing ||
    after.currentTime < before.currentTime
  )
    throw Error('Minimizing interrupted audio');
  for (const content of bar.querySelectorAll('.music-art,[data-context],.music-timeline'))
    if (!content.inert || getComputedStyle(content).visibility !== 'hidden')
      throw Error('Compact details still visible or focusable');
  for (const content of bar.querySelectorAll('.music-buttons,.music-volume,.music-track-link,.music-compact-note')) {
    const rect = content.getBoundingClientRect();
    if (rect.height < 1 || rect.left < 0 || rect.right > innerWidth || rect.bottom > innerHeight)
      throw Error('Compact controls overflow');
  }
  if (
    toggle.getAttribute('aria-expanded') !== 'false' ||
    Math.abs(document.querySelector('#sidebar').getBoundingClientRect().bottom - box.top) > 1
  )
    throw Error('Sidebar offset or toggle state incorrect');
}
async function verifyExpanded() {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
    bar = document.querySelector('.music-player'),
    toggle = bar.querySelector('[data-player-collapse]');
  toggle.click();
  await wait(400);
  if (
    bar.classList.contains('is-compact') ||
    bar.querySelector('.music-timeline').inert ||
    getComputedStyle(bar.querySelector('.music-timeline')).visibility === 'hidden'
  )
    throw Error('Player did not restore expanded details');
  toggle.click();
  await wait(60);
  toggle.click();
  await wait(400);
  if (bar.classList.contains('is-compact') || toggle.getAttribute('aria-expanded') !== 'true')
    throw Error('Player rapid reversal failed');
}
