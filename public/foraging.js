import { html, setHTML } from './ui.js';
import {
  SIZE,
  ROUND_SECONDS,
  FOODS,
  extendPath,
  cascade,
  ensurePlayable,
  rewardTime,
  timerColor
} from './foraging-engine.js';

export function foragingPage() {
  return String(html`<div class="page-heading"><div><span class="eyebrow">ACTIVITIES</span><h1>Wilds Foraging</h1><p>Gather a little of the wilds to bring home.</p></div></div>
    <section class="foraging" aria-label="Wilds Foraging game">
      <p class="foraging-instructions">Hold and drag through 3 or more matching foods. Connect up, down, left or right. Backtrack to undo a link. Each item restores 1 second.</p>
      <div class="foraging-layout">
        <div class="foraging-clock"><output class="foraging-seconds">60s</output><div class="foraging-timer" role="progressbar" aria-label="Time remaining" aria-valuemin="0" aria-valuemax="60" aria-valuenow="60"><div class="foraging-timer-fill"></div></div><span class="foraging-bonus" aria-live="polite"></span></div>
        <div class="foraging-board" aria-label="Food grid" tabindex="0" aria-describedby="foraging-status"><div class="foraging-tiles"></div><svg class="foraging-path" viewBox="0 0 100 100" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" /></svg><div class="foraging-overlay" hidden><h2>Game Over</h2><p>Your gathered food is saved in Inventory.</p><button type="button" class="button primary" data-foraging-restart>Play Again</button></div></div>
        <div class="foraging-dashboard" aria-label="Collected this round">${FOODS.map(food => html`<div><span aria-hidden="true">${food.emoji}</span><span>${food.name}</span><strong data-foraging-count="${food.id}">0</strong></div>`)}</div>
      </div><p id="foraging-status" role="status">The wilds are waking…</p><p class="foraging-help">60 seconds per round · Food goes straight to Inventory · Time pauses while food falls.<br>Keyboard: arrows to move, Space to start a chain, Enter to collect, Escape to cancel.</p>
    </section>`);
}

export function bindForaging(root, { collect, notify }) {
  const boardElement = root.querySelector('.foraging-board');
  const tiles = root.querySelector('.foraging-tiles');
  const line = root.querySelector('polyline');
  const overlay = root.querySelector('.foraging-overlay');
  const status = root.querySelector('#foraging-status');
  const timer = root.querySelector('.foraging-timer');
  const fill = root.querySelector('.foraging-timer-fill');
  const bonus = root.querySelector('.foraging-bonus');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let board = [],
    path = [],
    phase = 'intro',
    pointer = null,
    remaining = ROUND_SECONDS;
  let frame,
    last = performance.now(),
    disposed = false,
    cursor = 0,
    keyboardChain = false;
  let animations = [];
  let counts = Object.fromEntries(FOODS.map(food => [food.id, 0]));
  function paintPath() {
    line.setAttribute(
      'points',
      path.map(cell => `${(cell % SIZE) * 10 + 5},${Math.floor(cell / SIZE) * 10 + 5}`).join(' ')
    );
    for (const tile of tiles.children) {
      tile.classList.toggle('is-selected', path.includes(Number(tile.dataset.cell)));
      tile.classList.toggle('is-cursor', Number(tile.dataset.cell) === cursor);
    }
  }
  function clearPath() {
    path = [];
    keyboardChain = false;
    if (pointer !== null && boardElement.hasPointerCapture(pointer)) boardElement.releasePointerCapture(pointer);
    pointer = null;
    paintPath();
  }
  function paintTimer() {
    fill.style.transform = `scaleY(${remaining / ROUND_SECONDS})`;
    fill.style.backgroundColor = timerColor(remaining);
    timer.setAttribute('aria-valuenow', String(Math.ceil(remaining)));
    root.querySelector('.foraging-seconds').textContent = `${Math.ceil(remaining)}s`;
  }
  function advance(now) {
    if (phase === 'playing') remaining = Math.max(0, remaining - (now - last) / 1000);
    last = now;
    paintTimer();
    if (remaining === 0 && phase === 'playing') {
      phase = 'over';
      clearPath();
      overlay.hidden = false;
      status.textContent = 'Round complete. Your harvest is saved.';
      root.querySelector('[data-foraging-restart]').focus({ preventScroll: true });
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
        return html`<div class="foraging-tile" data-cell="${index}" data-food="${id}" style="left:${(index % SIZE) * 10}%;top:${Math.floor(index / SIZE) * 10}%" aria-label="${food.name}, row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}"><span>${food.emoji}</span></div>`;
      })}`
    );
  }
  async function drop(removed = []) {
    const opening = !board.length;
    phase = opening ? 'intro' : 'falling';
    const result = cascade(board, removed);
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
    if (ensurePlayable(board)) renderTiles();
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
      await collect(food, selected.length);
      if (disposed) return;
      counts[food] += selected.length;
      root.querySelector(`[data-foraging-count="${food}"]`).textContent = String(counts[food]);
      remaining = rewardTime(remaining, selected.length);
      bonus.textContent = `+${selected.length}s`;
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
      boardElement.focus({ preventScroll: true });
      pointer = event.pointerId;
      boardElement.setPointerCapture(pointer);
      path = extendPath(board, [], cellAt(event));
      paintPath();
    },
    options
  );
  boardElement.addEventListener(
    'pointermove',
    event => {
      if (phase !== 'playing' || event.pointerId !== pointer) return;
      for (const point of event.getCoalescedEvents?.() || [event]) path = extendPath(board, path, cellAt(point));
      path = extendPath(board, path, cellAt(event));
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
  boardElement.addEventListener(
    'keydown',
    event => {
      if (phase !== 'playing' || event.target !== boardElement) return;
      const delta = { ArrowUp: -SIZE, ArrowDown: SIZE, ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (delta !== undefined) {
        event.preventDefault();
        const next = cursor + delta;
        if (
          next >= 0 &&
          next < 100 &&
          (Math.abs(delta) === SIZE || Math.floor(next / SIZE) === Math.floor(cursor / SIZE))
        )
          cursor = next;
        if (keyboardChain) path = extendPath(board, path, cursor);
        paintPath();
      } else if (event.key === ' ') {
        event.preventDefault();
        keyboardChain = true;
        path = extendPath(board, path, cursor);
        paintPath();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        void capture();
      } else if (event.key === 'Escape') clearPath();
    },
    options
  );
  function start() {
    board = [];
    clearPath();
    remaining = ROUND_SECONDS;
    counts = Object.fromEntries(FOODS.map(food => [food.id, 0]));
    for (const count of root.querySelectorAll('[data-foraging-count]')) count.textContent = '0';
    overlay.hidden = true;
    bonus.textContent = '';
    status.textContent = 'The wilds are waking…';
    paintTimer();
    void drop();
  }
  root.querySelector('[data-foraging-restart]').addEventListener('click', start, options);
  start();
  frame = requestAnimationFrame(tick);
  return () => {
    disposed = true;
    controller.abort();
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
  };
}
