// Muted Electron integration checks. All saves, browser storage and diagnostics are isolated.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
app.commandLine.appendSwitch('mute-audio');
if (process.argv.includes('--reduced-motion')) app.commandLine.appendSwitch('force-prefers-reduced-motion');
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
const deadline = setTimeout(() => app.exit(1), 60000);
(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-foraging-ui-'));
  console.log('Diagnostics: ' + directory);
  app.setPath('userData', join(directory, 'browser'));
  process.env.HORSE_DATA_DIR = join(directory, 'data');
  process.env.PORT = '0';
  await app.whenReady();
  const backend = await import(pathToFileURL(resolve(__dirname, '../server.js')).href);
  const origin = await backend.serverReady;
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 1000,
    webPreferences: { backgroundThrottling: false, offscreen: true }
  });
  win.webContents.setAudioMuted(true);
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  const wait = async fn => {
    for (let i = 0; i < 200; i++) {
      if (await run(fn)) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw Error('Timed out: ' + fn.toString());
  };
  await win.loadURL(origin + '/#activities/foraging');
  await wait(() => document.querySelector('.foraging-dialog') && !document.querySelector('.foraging-dialog').hidden);
  assert.equal(await run(() => document.querySelectorAll('.foraging-tile').length), 0);
  assert.equal(await run(() => document.querySelector('.foraging-dashboard').classList.contains('is-pending')), true);
  assert.equal(await run(() => document.querySelectorAll('[data-foraging-count]').length), 0);
  assert.equal(await run(() => document.querySelectorAll('.foraging-board .foraging-dialog ol li').length), 3);
  await new Promise(resolve => setTimeout(resolve, 150));
  await writeFile(join(directory, 'foraging-rules.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => {
    if (document.querySelector('#sidebar').inert) document.querySelector('.mobile-menu').click();
  });
  assert.equal(await run(() => document.querySelector('#sidebar').inert), false);
  await run(() => document.querySelector('#sidebar a[href="#stable/all"]').click());
  await wait(() => location.hash === '#stable/all' && !document.querySelector('.foraging'));
  await run(() => {
    location.hash = 'activities/foraging';
  });
  await wait(() => !!document.querySelector('[data-foraging-start]'));

  const initialBoard = await run(() => {
    const rect = document.querySelector('.foraging-board').getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await run(() => document.querySelector('[data-foraging-start]').click());
  await wait(() => document.querySelectorAll('.foraging-tile').length === 100);
  const startedBoard = await run(() => {
    const rect = document.querySelector('.foraging-board').getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  assert.deepEqual(startedBoard, initialBoard);

  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  assert.equal(await run(() => document.querySelectorAll('.foraging-dashboard > div').length), 4);
  assert.equal(await run(() => document.querySelector('.foraging-dashboard').classList.contains('is-pending')), false);
  assert.ok(await run(() => Number(document.querySelector('.foraging-timer').getAttribute('aria-valuenow')) <= 60));
  assert.ok(
    await run(() => {
      const scene = document.querySelector('.foraging-scene').getBoundingClientRect();
      const board = document.querySelector('.foraging-board').getBoundingClientRect();
      const timer = document.querySelector('.foraging-timer').getBoundingClientRect();
      return (
        Math.abs(board.x - scene.x - scene.width * 0.245) < 1 &&
        Math.abs(board.y - scene.y - scene.height * 0.23) < 1 &&
        Math.abs(board.width - scene.width * 0.509) < 1 &&
        Math.abs(timer.x - scene.x - scene.width * 0.202) < 1 &&
        Math.abs(timer.height - scene.height * 0.352) < 1
      );
    })
  );

  assert.equal(
    await run(() => document.querySelector('[data-group="Town"]').nextElementSibling.dataset.group),
    'Activities'
  );
  for (const [width, height] of [
    [1600, 1200],
    [1100, 800],
    [760, 700],
    [420, 900]
  ]) {
    win.setSize(width, height);
    await new Promise(resolve => setTimeout(resolve, 100));
    const metrics = await run(() => {
      const scene = document.querySelector('.foraging-scene').getBoundingClientRect();
      const area = document.querySelector('.foraging').getBoundingClientRect();
      const player = document.querySelector('.music-player').getBoundingClientRect();
      return {
        width: scene.width,
        fits: scene.left >= 0 && scene.right <= innerWidth && scene.top >= area.top && scene.bottom <= player.top + 1,
        collapsed: document.querySelector('#sidebar').inert,
        expectedCollapsed: innerWidth <= 900 || document.body.classList.contains('foraging-nav-collapsed')
      };
    });
    assert.ok(metrics.fits, JSON.stringify({ width, height, metrics }));
    assert.equal(metrics.collapsed, metrics.expectedCollapsed);
    if (metrics.collapsed) {
      await run(() => document.querySelector('.mobile-menu').click());
      assert.equal(await run(() => document.querySelector('#sidebar').inert), false);
      await run(() => document.querySelector('.scrim').click());
      assert.equal(await run(() => document.querySelector('#sidebar').inert), true);
    }
    await new Promise(resolve => setTimeout(resolve, 350));
    await writeFile(join(directory, `foraging-responsive-${width}.png`), (await win.webContents.capturePage()).toPNG());
  }
  win.setSize(1280, 1000);
  await new Promise(resolve => setTimeout(resolve, 100));
  // Find an actual orthogonal three-cell path, then drag it with native input.
  const trail = await run(() => {
    const tiles = [...document.querySelectorAll('.foraging-tile')];
    const adjacent = (a, b) => Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) + Math.abs((a % 10) - (b % 10)) === 1;
    for (let a = 0; a < 100; a++)
      for (let b = 0; b < 100; b++)
        for (let c = 0; c < 100; c++) {
          if (
            a !== c &&
            adjacent(a, b) &&
            adjacent(b, c) &&
            tiles[a].dataset.food === tiles[b].dataset.food &&
            tiles[a].dataset.food === tiles[c].dataset.food
          ) {
            return {
              food: tiles[a].dataset.food,
              points: [a, b, c].map(index => {
                const rect = tiles[index].getBoundingClientRect();
                return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
              })
            };
          }
        }
    throw Error('Dead board');
  });
  const input = async (type, point) => {
    win.webContents.sendInputEvent({ type, ...point, button: 'left', clickCount: 1 });
    await new Promise(resolve => setTimeout(resolve, 40));
  };
  await input('mouseDown', trail.points[0]);
  await input('mouseMove', trail.points[1]);
  assert.equal(await run(() => document.querySelectorAll('.is-selected').length), 2);
  await input('mouseMove', trail.points[0]);
  assert.equal(await run(() => document.querySelectorAll('.is-selected').length), 1);
  await input('mouseUp', trail.points[0]);
  assert.equal(
    await run(() =>
      [...document.querySelectorAll('[data-foraging-count]')].reduce((sum, el) => sum + Number(el.textContent), 0)
    ),
    0
  );
  await input('mouseDown', trail.points[0]);
  await input('mouseMove', trail.points[1]);
  await input('mouseMove', trail.points[2]);
  await input('mouseUp', trail.points[2]);
  await wait(() => [...document.querySelectorAll('[data-foraging-count]')].some(el => el.textContent === '3'));
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  assert.equal(await run(() => document.querySelector('.foraging-bonus')), null);
  await writeFile(join(directory, 'foraging-wide.png'), (await win.webContents.capturePage()).toPNG());
  // Advance the monotonic clock, rather than waiting a minute, to exercise real game-over code.
  await run(() => {
    const now = performance.now.bind(performance);
    performance.now = () => now() + 61000;
    document
      .querySelector('.foraging-board')
      .dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
    performance.now = now;
  });
  await wait(
    () =>
      !document.querySelector('.foraging-dialog').hidden &&
      document.querySelector('[data-foraging-start]').textContent === 'Play Again'
  );
  assert.equal(await run(() => document.querySelector('.foraging-timer').getAttribute('aria-valuenow')), '0');
  assert.equal(
    await run(() =>
      [...document.querySelectorAll('.foraging-rewards strong')].reduce(
        (sum, el) => sum + Number(el.textContent.replace('×', '')),
        0
      )
    ),
    3
  );
  assert.equal(
    await run(() => document.querySelector('[data-foraging-dialog-body]').textContent.includes('Your harvest')),
    false
  );
  await new Promise(resolve => setTimeout(resolve, 150));
  await writeFile(join(directory, 'foraging-completed.png'), (await win.webContents.capturePage()).toPNG());
  const restart = await run(() => {
    document.querySelector('[data-foraging-start]').click();
    document
      .querySelector('.foraging-board')
      .dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true }));
    return {
      selected: document.querySelectorAll('.is-selected').length,
      seconds: document.querySelector('.foraging-seconds').textContent,
      animated: document.querySelector('.foraging-board').getAnimations({ subtree: true }).length,
      visible: [...document.querySelectorAll('.foraging-tile')].some(
        el =>
          el.getBoundingClientRect().bottom >
          document.querySelector('.foraging-board').getBoundingClientRect().top +
            document.querySelector('.foraging-board').clientTop +
            0.1
      )
    };
  });
  assert.equal(restart.seconds, '60s');
  assert.equal(restart.selected, 0);
  assert.equal(restart.animated, 100);
  assert.equal(restart.visible, false);
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  win.setSize(420, 900);
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.ok(await run(() => document.documentElement.scrollWidth <= innerWidth));
  await writeFile(join(directory, 'foraging-narrow.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => {
    location.hash = 'inventory/food';
  });
  await wait(() => document.querySelectorAll('.inventory-card').length > 0);
  assert.equal(
    await run(() =>
      [...document.querySelectorAll('.inventory-item-count')].reduce(
        (sum, el) => sum + Number(el.textContent.replace('×', '')),
        0
      )
    ),
    3
  );
  // Exercise failure recovery and keyboard input using an isolated deterministic board.
  await run(async () => {
    const { foragingPage, bindForaging } = await import('/foraging.js');
    const { setHTML, raw } = await import('/ui.js');
    const root = document.querySelector('#main');
    setHTML(root, raw(foragingPage()));
    const random = Math.random;
    Math.random = () => 0.99999;
    window.foragingTest = { failures: 0, saved: 0 };
    window.foragingTest.dispose = bindForaging(root, {
      settings: { foodCount: 1, noTimer: true },
      complete: async counts => {
        if (!window.foragingTest.failures) throw Error('Test save failure');
        window.foragingTest.saved += counts.apple;
        return [{ id: 'apple', name: 'Red Apples', rarity: 'common', count: counts.apple }];
      },
      notify: () => {
        window.foragingTest.failures++;
      }
    });
    document.querySelector('[data-foraging-start]').click();
    Math.random = random;
  });
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  const fixedTrail = await run(() =>
    [...document.querySelectorAll('.foraging-tile')].slice(0, 3).map(el => {
      const rect = el.getBoundingClientRect();
      return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
    })
  );
  async function pointerCapture() {
    await input('mouseDown', fixedTrail[0]);
    await input('mouseMove', fixedTrail[1]);
    await input('mouseMove', fixedTrail[2]);
    await input('mouseUp', fixedTrail[2]);
  }
  await pointerCapture();
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  assert.equal(await run(() => window.foragingTest.saved), 0);
  await run(() => document.querySelector('[data-foraging-finish]').click());
  await wait(() => window.foragingTest.failures === 1);
  assert.equal(await run(() => document.querySelector('[data-foraging-start]').textContent), 'Retry');
  await run(() => document.querySelector('[data-foraging-start]').click());
  await wait(() => window.foragingTest.saved === 3);
  await run(() => window.foragingTest.dispose());
  await run(async () => {
    const { foragingPage, bindForaging } = await import('/foraging.js');
    const { setHTML, raw } = await import('/ui.js');
    const root = document.querySelector('#main');
    setHTML(root, raw(foragingPage()));
    window.foragingTest.dispose = bindForaging(root, {
      settings: { gridSize: 6, foodCount: 2, noTimer: true, secondsPerItem: 0.25, totalSeconds: 90 },
      complete: async () => [],
      notify: () => {}
    });
    document.querySelector('[data-foraging-start]').click();
  });
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  assert.equal(await run(() => document.querySelectorAll('.foraging-tile').length), 36);
  assert.equal(
    await run(() => new Set([...document.querySelectorAll('.foraging-tile')].map(el => el.dataset.food)).size),
    2
  );
  assert.equal(await run(() => document.querySelector('.foraging-clock').hidden), true);
  assert.equal(await run(() => document.querySelector('.foraging-timer').getAttribute('aria-valuemax')), '90');
  assert.equal(await run(() => document.querySelector('.foraging-seconds').textContent), '90s');
  await run(() => document.querySelector('[data-foraging-finish]').click());
  assert.equal(await run(() => !document.querySelector('.foraging-dialog').hidden), true);
  assert.equal(await run(() => document.querySelectorAll('[data-foraging-dialog-body] li').length), 0);
  await run(() => window.foragingTest.dispose());
  win.setSize(1280, 1000);
  await run(async () => {
    const { activitiesSettingsPage } = await import('/activities-settings.js');
    const { attachSettingsNumbers } = await import('/game-settings.js');
    const { trackForms } = await import('/form-state.js');
    const { setHTML, raw } = await import('/ui.js');
    const root = document.querySelector('#main');
    setHTML(root, raw(activitiesSettingsPage({ settings: { activities: { gridSize: 8 } } })));
    attachSettingsNumbers(root);
    trackForms(root);
  });
  assert.equal(await run(() => document.querySelectorAll('#activities-settings-form .settings-number').length), 4);
  await run(() => document.querySelector('[aria-label="Increase Time per Ingredient"]').click());
  assert.equal(await run(() => document.querySelector('[name=secondsPerItem]').value), '1.25');
  await run(() => document.querySelector('[aria-label="Increase Grid Size"]').click());
  assert.equal(await run(() => document.querySelector('[name=gridSize]').value), '9');
  assert.equal(await run(() => document.querySelector('#activities-settings-form button[type=submit]').hidden), false);
  await run(() => document.querySelector('#activities-settings-form button[type=reset]').click());
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(await run(() => document.querySelector('[name=gridSize]').value), '8');
  await run(() => document.querySelector('#activities-settings-form [data-action=defaults]').click());
  assert.equal(await run(() => document.querySelector('[name=gridSize]').value), '10');
  await writeFile(join(directory, 'activities-settings-wide.png'), (await win.webContents.capturePage()).toPNG());
  win.setSize(420, 900);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.ok(await run(() => document.documentElement.scrollWidth <= innerWidth));
  await writeFile(join(directory, 'activities-settings-narrow.png'), (await win.webContents.capturePage()).toPNG());
  // Clear a whole board, force a dead refill, and inspect the automatic top drop.
  await run(async () => {
    const { foragingPage, bindForaging } = await import('/foraging.js');
    const { setHTML, raw } = await import('/ui.js');
    const root = document.querySelector('#main');
    setHTML(root, raw(foragingPage()));
    window.stalemateTest = { random: Math.random, animate: Element.prototype.animate, drops: 0, times: [] };
    Element.prototype.animate = function (...args) {
      if (document.querySelector('#foraging-status').textContent.startsWith('No trails left')) {
        window.stalemateTest.drops++;
        window.stalemateTest.times.push(document.querySelector('.foraging-seconds').textContent);
        if (!args[0][0].transform.includes('-')) throw Error('Redealt ingredient did not start above the board');
      }
      return window.stalemateTest.animate.apply(this, args);
    };
    Math.random = () => 0.99999;
    window.stalemateTest.dispose = bindForaging(root, {
      settings: { gridSize: 4, secondsPerItem: 0 },
      complete: async () => [],
      notify: message => {
        throw Error(message);
      }
    });
    document.querySelector('[data-foraging-start]').click();
    Math.random = window.stalemateTest.random;
  });
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  await new Promise(resolve => setTimeout(resolve, 1100));
  const snake = await run(() =>
    Array.from({ length: 16 }, (_, i) => {
      const row = Math.floor(i / 4),
        col = row % 2 ? 3 - (i % 4) : i % 4;
      const rect = document.querySelectorAll('.foraging-tile')[row * 4 + col].getBoundingClientRect();
      return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
    })
  );
  await input('mouseDown', snake[0]);
  for (const point of snake.slice(1)) await input('mouseMove', point);
  assert.equal(await run(() => document.querySelectorAll('.is-selected').length), 16);
  const timeBefore = await run(() => document.querySelector('.foraging-seconds').textContent);
  await run(() => {
    let index = 0;
    Math.random = () => {
      if (index >= 16) return 0.99999;
      const row = index % 4,
        col = Math.floor(index++ / 4);
      return (((row + col) % 4) + 0.1) / 4;
    };
  });
  await input('mouseUp', snake.at(-1));
  await wait(() => window.stalemateTest.drops === 16);
  assert.ok(await run(() => window.stalemateTest.times.every(time => time === window.stalemateTest.times[0])));
  const redealTime = parseInt(await run(() => window.stalemateTest.times[0]));
  assert.ok(redealTime <= parseInt(timeBefore) && redealTime >= parseInt(timeBefore) - 1);
  assert.ok(redealTime < 60);
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  assert.equal(await run(() => document.querySelector('[data-foraging-count="flower"]').textContent), '16');
  assert.ok(
    await run(async () => {
      const { largestGroup } = await import('/foraging-engine.js');
      return (
        largestGroup(
          [...document.querySelectorAll('.foraging-tile')].map(el => el.dataset.food),
          4
        ) >= 3
      );
    })
  );
  await run(() => {
    Math.random = window.stalemateTest.random;
    Element.prototype.animate = window.stalemateTest.animate;
    window.stalemateTest.dispose();
  });
  win.setSize(1280, 1000);
  await run(async () => {
    const { foragingPage, bindForaging } = await import('/foraging.js');
    const { harvestItems } = await import('/harvest-rewards.js');
    const { setHTML, raw } = await import('/ui.js');
    const root = document.querySelector('#main');
    setHTML(root, raw(foragingPage()));
    window.fullHarvestDispose = bindForaging(root, {
      settings: { noTimer: true },
      complete: async () => harvestItems.map(item => ({ ...item, count: 123 })),
      notify: message => {
        throw Error(message);
      }
    });
    document.querySelector('[data-foraging-start]').click();
  });
  await wait(() => document.querySelector('#foraging-status').textContent.startsWith('Find a matching'));
  await run(() => document.querySelector('[data-foraging-finish]').click());
  await wait(() => document.querySelectorAll('.foraging-rewards li').length === 15);
  for (const width of [1280, 1100, 420]) {
    win.setSize(width, 1000);
    await new Promise(resolve => setTimeout(resolve, 150));
    const fits = await run(() => {
      const dialog = document.querySelector('.foraging-dialog');
      return [
        dialog,
        dialog.querySelector('[data-foraging-dialog-body]'),
        dialog.querySelector('ul'),
        ...dialog.querySelectorAll('li, .foraging-reward-name')
      ].every(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1);
    });
    if (!fits) {
      console.log(
        await run(() =>
          [
            document.querySelector('.foraging-dialog'),
            ...document.querySelectorAll('.foraging-dialog li, .foraging-dialog .foraging-reward-name')
          ]
            .filter(el => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
            .map(el => ({
              text: el.textContent,
              width: el.clientWidth,
              scrollWidth: el.scrollWidth,
              height: el.clientHeight,
              scrollHeight: el.scrollHeight
            }))
        )
      );
      await writeFile(join(directory, 'reward-overflow.png'), (await win.webContents.capturePage()).toPNG());
    }
    assert.ok(fits, `Full reward list overflows at ${width}`);
    assert.equal(await run(() => document.querySelectorAll('.foraging-rewards small').length), 15);
    assert.equal(await run(() => document.querySelectorAll('.foraging-rewards strong').length), 15);
    await writeFile(join(directory, `full-harvest-${width}.png`), (await win.webContents.capturePage()).toPNG());
  }
  await run(() => window.fullHarvestDispose());
  win.setSize(1600, 1200);
  await run(async () => {
    const { harvestItems } = await import('/harvest-rewards.js');
    const { inventoryCards } = await import('/inventory.js');
    const { setHTML, html } = await import('/ui.js');
    setHTML(
      document.querySelector('#main'),
      html`<h1>Harvest variants</h1><div class="inventory-grid">${inventoryCards(
        harvestItems.map(item => ({ ...item, type: 'food', count: 3 })),
        'food'
      )}</div>`
    );
  });
  await new Promise(resolve => setTimeout(resolve, 150));
  await writeFile(join(directory, 'harvest-variants.png'), (await win.webContents.capturePage()).toPNG());
  win.destroy();
  await backend.closeGameServer();
  clearTimeout(deadline);
  console.log(
    'Foraging drag, backtracking, capture, inventory, game over, blank replay intro and responsive layout passed.'
  );
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
