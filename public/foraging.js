import { harvestIcon } from './harvest-icons.js';
import { html, setHTML } from './ui.js';
import {
  chooseFoods,
  activitySettings,
  FOODS,
  extendPath,
  cascade,
  ensurePlayable,
  rewardTime,
  timerColor
} from './foraging-engine.js';

export function foragingPage() {
  return String(html`<section class="foraging" aria-label="Wilds Foraging game"><h1>Wilds Foraging</h1><button type="button" class="button" data-foraging-finish hidden>Finish Foraging</button>
      <div class="foraging-layout"><div class="foraging-scene">
        <div class="foraging-clock"><output class="foraging-seconds">60s</output><div class="foraging-timer" role="progressbar" aria-label="Time remaining" aria-valuemin="0" aria-valuemax="60" aria-valuenow="60"><div class="foraging-timer-fill"></div></div></div>
        <div class="foraging-board" aria-label="Food grid" aria-describedby="foraging-status"><div class="foraging-tiles"></div><svg class="foraging-path" viewBox="0 0 100 100" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" /></svg><div class="foraging-dialog" role="dialog" aria-modal="false" aria-labelledby="foraging-dialog-title"><h2 id="foraging-dialog-title">Wilds Foraging</h2><div data-foraging-dialog-body></div><div class="foraging-dialog-actions"><button type="button" class="button primary" data-foraging-start>Start Foraging</button><button type="button" class="button secondary" data-foraging-exit hidden>Exit</button></div></div></div>
        <div class="foraging-dashboard is-pending" aria-label="Collected this round" aria-hidden="true"><div aria-hidden="true"><span>&nbsp;</span><span>&nbsp;</span><strong>&nbsp;</strong></div></div>
      </div></div><p id="foraging-status" class="foraging-sr" role="status"></p>

    </section>`);
}

export function bindForaging(root, { complete, notify, settings: savedSettings = {} }) {
  const boardElement = root.querySelector('.foraging-board');
  const tiles = root.querySelector('.foraging-tiles');
  const line = root.querySelector('polyline');
  const settings = activitySettings(savedSettings);
  const SIZE = settings.gridSize;
  const dialog = root.querySelector('.foraging-dialog');
  const dialogBody = root.querySelector('[data-foraging-dialog-body]');
  const startButton = root.querySelector('[data-foraging-start]');
  const exitButton = root.querySelector('[data-foraging-exit]');
  const finishButton = root.querySelector('[data-foraging-finish]');
  let foods = [];
  boardElement.style.setProperty('--grid-size', SIZE);
  root.querySelector('.foraging-clock').hidden = settings.noTimer;
  finishButton.hidden = !settings.noTimer;
  const status = root.querySelector('#foraging-status');
  const timer = root.querySelector('.foraging-timer');
  const fill = root.querySelector('.foraging-timer-fill');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let board = [],
    path = [],
    phase = 'ready',
    pointer = null,
    remaining = settings.totalSeconds;
  let frame,
    last = performance.now(),
    disposed = false;
  let animations = [];
  let roundId;
  let counts = Object.fromEntries(FOODS.map(food => [food.id, 0]));
  function paintPath() {
    line.setAttribute(
      'points',
      path
        .map(
          cell => `${(cell % SIZE) * (100 / SIZE) + 50 / SIZE},${Math.floor(cell / SIZE) * (100 / SIZE) + 50 / SIZE}`
        )
        .join(' ')
    );
    for (const tile of tiles.children) {
      tile.classList.toggle('is-selected', path.includes(Number(tile.dataset.cell)));
    }
  }
  function clearPath() {
    path = [];
    if (pointer !== null && boardElement.hasPointerCapture(pointer)) boardElement.releasePointerCapture(pointer);
    pointer = null;
    paintPath();
  }
  function paintTimer() {
    fill.style.transform = `scaleY(${remaining / settings.totalSeconds})`;
    fill.style.backgroundColor = timerColor(remaining, settings.totalSeconds);
    timer.setAttribute('aria-valuenow', String(Math.ceil(remaining)));
    root.querySelector('.foraging-seconds').textContent = `${Math.ceil(remaining)}s`;
  }
  function advance(now) {
    if (phase === 'playing' && !settings.noTimer) remaining = Math.max(0, remaining - Math.max(0, now - last) / 1000);
    last = Math.max(last, now);
    paintTimer();
    if (remaining === 0 && phase === 'playing') {
      finish();
    }
  }
  function tick(now) {
    if (disposed) return;
    advance(now);
    frame = requestAnimationFrame(tick);
  }
  function renderTiles() {
    setHTML(
      tiles,
      html`${board.map((id, index) => {
        const food = FOODS.find(food => food.id === id);
        return html`<div class="foraging-tile" data-cell="${index}" data-food="${id}" style="left:${(index % SIZE) * (100 / SIZE)}%;top:${Math.floor(index / SIZE) * (100 / SIZE)}%" aria-label="${food.name}, row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}"><span>${food.emoji}</span></div>`;
      })}`
    );
  }
  async function drop(removed = [], redeal = false) {
    const opening = !board.length || redeal;
    phase = opening ? 'intro' : 'falling';
    const result = redeal
      ? {
          board,
          moves: board.map((food, index) => ({
            index,
            food,
            from: Math.floor(index / SIZE) - SIZE,
            to: Math.floor(index / SIZE),
            col: index % SIZE
          }))
        }
      : cascade(board, removed, Math.random, SIZE, foods);
    board = result.board;
    renderTiles();
    const reduced =
      matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    animations = result.moves
      .filter(move => move.from !== move.to)
      .map(move => {
        const distance = move.from - move.to;
        return tiles.children[move.index].animate(
          [
            { transform: `translateY(${distance * 100}%)`, opacity: 0.7 },
            { transform: 'translateY(3%)', opacity: 1, offset: 0.86 },
            { transform: 'translateY(0)', opacity: 1 }
          ],
          {
            duration: reduced ? 80 : 400 + Math.abs(distance) * 24,
            delay: reduced ? 0 : move.col * (opening ? 65 : 24) + (SIZE - 1 - move.to) * 18,
            easing: 'cubic-bezier(.3,.05,.65,1)',
            fill: 'both'
          }
        );
      });
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    if (disposed) return;
    animations.forEach(animation => animation.cancel());
    animations = [];
    if (ensurePlayable(board, Math.random, SIZE)) {
      status.textContent = 'No trails left. Fresh ingredients are falling…';
      return drop([], true);
    }
    phase = 'playing';
    last = performance.now();
    status.textContent = 'Find a matching trail. Every item you gather is yours to keep.';
    paintPath();
  }
  async function capture() {
    advance(performance.now());
    if (phase !== 'playing') return;
    const selected = [...path];
    clearPath();
    if (selected.length < 3) return;
    phase = 'saving';
    status.textContent = 'Gathering your harvest…';
    const food = board[selected[0]];
    try {
      if (disposed) return;
      counts[food] += selected.length;
      root.querySelector(`[data-foraging-count="${food}"]`).textContent = String(counts[food]);
      remaining = rewardTime(remaining, selected.length, settings.secondsPerItem, settings.totalSeconds);
      paintTimer();
      await drop(selected);
    } catch (error) {
      if (disposed) return;
      phase = 'playing';
      last = performance.now();
      status.textContent = 'Unable to save this harvest. Try the chain again.';
      notify(error.message, true);
    }
  }
  function cellAt(event) {
    const rect = boardElement.getBoundingClientRect();
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * SIZE);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * SIZE);
    return col >= 0 && col < SIZE && row >= 0 && row < SIZE ? row * SIZE + col : -1;
  }
  boardElement.addEventListener(
    'pointerdown',
    event => {
      advance(performance.now());
      if (phase !== 'playing' || pointer !== null || event.button !== 0 || !event.isPrimary) return;
      event.preventDefault();
      pointer = event.pointerId;
      boardElement.setPointerCapture(pointer);
      path = extendPath(board, [], cellAt(event), SIZE);
      paintPath();
    },
    options
  );
  boardElement.addEventListener(
    'pointermove',
    event => {
      if (phase !== 'playing' || event.pointerId !== pointer) return;
      for (const point of event.getCoalescedEvents?.() || [event]) path = extendPath(board, path, cellAt(point), SIZE);
      path = extendPath(board, path, cellAt(event), SIZE);
      paintPath();
    },
    options
  );
  boardElement.addEventListener(
    'pointerup',
    event => {
      if (event.pointerId === pointer) void capture();
    },
    options
  );
  boardElement.addEventListener('pointercancel', clearPath, options);
  boardElement.addEventListener('lostpointercapture', clearPath, options);
  window.addEventListener('blur', clearPath, options);
  function start() {
    exitButton.hidden = true;
    boardElement.append(dialog);
    dialog.classList.remove('is-completion');
    dialog.querySelector('h2').textContent = 'Wilds Foraging';
    board = [];
    roundId = crypto.randomUUID();
    clearPath();
    remaining = settings.totalSeconds;
    counts = Object.fromEntries(FOODS.map(food => [food.id, 0]));
    for (const count of root.querySelectorAll('[data-foraging-count]')) count.textContent = '0';
    foods = chooseFoods(settings.foodCount);
    setHTML(
      root.querySelector('.foraging-dashboard'),
      html`${foods.map(food => html`<div><span aria-hidden="true">${food.emoji}</span><span>${food.name}</span><strong data-foraging-count="${food.id}">0</strong></div>`)}`
    );
    root.querySelector('.foraging-dashboard').classList.remove('is-pending');
    root.querySelector('.foraging-dashboard').removeAttribute('aria-hidden');
    root.querySelector('.foraging-dashboard').style.gridTemplateColumns = `repeat(${foods.length}, minmax(0, 1fr))`;
    dialog.hidden = true;
    status.textContent = 'The wilds are waking…';
    paintTimer();
    void drop();
  }
  async function finish() {
    if (!['playing', 'retry'].includes(phase)) return;
    phase = 'saving';
    clearPath();
    root.querySelector('.foraging').append(dialog);
    dialog.classList.add('is-completion');
    dialog.querySelector('h2').textContent = 'Wilds Foraging Rewards';
    dialog.hidden = false;
    startButton.disabled = true;
    exitButton.hidden = true;
    startButton.textContent = 'Saving…';
    setHTML(dialogBody, html`<p>Preparing rewards…</p>`);
    try {
      const rewards = await complete({ ...counts }, roundId);
      if (disposed) return;
      phase = 'over';
      setHTML(
        dialogBody,
        html`<ul class="foraging-rewards" style="--reward-rows:${Math.max(1, Math.ceil(rewards.length / 5))};--reward-mobile-rows:${Math.max(1, Math.ceil(rewards.length / 3))}">${rewards.map(item => html`<li data-rarity="${item.rarity}"><span class="foraging-reward-icon">${harvestIcon(item.id)}</span><span class="foraging-reward-name">${item.name}</span><strong>×${item.count}</strong><small>${item.rarity}</small></li>`)}</ul>${rewards.length ? '' : html`<p>No ingredients collected this round.</p>`}`
      );
      startButton.textContent = 'Play Again';
      exitButton.hidden = false;
    } catch (error) {
      if (disposed) return;
      phase = 'retry';
      setHTML(dialogBody, html`<p>Unable to save rewards. Retry to finish this round.</p>`);
      startButton.textContent = 'Retry';
      notify(error.message, true);
    } finally {
      if (!disposed) startButton.disabled = false;
    }
  }

  function showRules() {
    phase = 'ready';
    clearPath();
    board = [];
    foods = [];
    counts = Object.fromEntries(FOODS.map(food => [food.id, 0]));
    tiles.replaceChildren();
    boardElement.append(dialog);
    dialog.classList.remove('is-completion');
    dialog.querySelector('h2').textContent = 'Wilds Foraging';
    const dashboard = root.querySelector('.foraging-dashboard');
    dashboard.classList.add('is-pending');
    dashboard.setAttribute('aria-hidden', 'true');
    setHTML(
      dashboard,
      html`<div aria-hidden="true"><span>&nbsp;</span><span>&nbsp;</span><strong>&nbsp;</strong></div>`
    );
    remaining = settings.totalSeconds;
    paintTimer();
    setHTML(
      dialogBody,
      html`<ol><li>Hold and drag through 3+ matching foods. No diagonals.</li><li>Release to collect; backtrack to undo a link.</li><li>${settings.noTimer ? 'Choose Finish Foraging when done.' : `${settings.totalSeconds}s per round. Each food adds ${settings.secondsPerItem}s (max ${settings.totalSeconds}s).`}</li></ol>`
    );
    startButton.textContent = 'Start Foraging';
    exitButton.hidden = true;
    dialog.hidden = false;
    status.textContent = '';
  }
  exitButton.addEventListener(
    'click',
    () => {
      if (phase !== 'over') return;
      showRules();
      startButton.focus({ preventScroll: true });
    },
    options
  );
  showRules();
  startButton.addEventListener('click', () => (phase === 'retry' ? void finish() : start()), options);
  finishButton.addEventListener('click', finish, options);
  dialog.hidden = false;
  timer.setAttribute('aria-valuemax', String(settings.totalSeconds));
  paintTimer();
  frame = requestAnimationFrame(tick);
  return () => {
    disposed = true;
    dialog.hidden = true;
    controller.abort();
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
  };
}
