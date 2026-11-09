export const SIZE = 10;
export const ROUND_SECONDS = 60;
export const FOODS = [
  { id: 'apple', name: 'Apples', emoji: '🍎' },
  { id: 'carrot', name: 'Carrots', emoji: '🥕' },
  { id: 'berry', name: 'Berries', emoji: '🫐' },
  { id: 'flower', name: 'Flowers', emoji: '🌼' },
  { id: 'peach', name: 'Peaches', emoji: '🍑' }
];
export const adjacent = (a, b, size = SIZE) =>
  Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs((a % size) - (b % size)) === 1;
export function extendPath(board, path, cell, size = SIZE) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= board.length) return path;
  if (!path.length) return [cell];
  if (path.length > 1 && cell === path.at(-2)) return path.slice(0, -1);
  return !path.includes(cell) && adjacent(path.at(-1), cell, size) && board[cell] === board[path[0]]
    ? [...path, cell]
    : path;
}
export function largestGroup(board, size = SIZE) {
  const seen = new Set();
  let largest = 0;
  for (let i = 0; i < board.length; i++) {
    if (seen.has(i)) continue;
    const stack = [i];
    seen.add(i);
    let count = 0;
    while (stack.length) {
      const cell = stack.pop();
      count++;
      for (const next of [cell - size, cell + size, cell - 1, cell + 1]) {
        if (
          next >= 0 &&
          next < board.length &&
          adjacent(cell, next, size) &&
          !seen.has(next) &&
          board[next] === board[cell]
        ) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    largest = Math.max(largest, count);
  }
  return largest;
}
export function ensurePlayable(board, rng = Math.random, size = SIZE) {
  if (largestGroup(board, size) >= 3) return false;
  for (let attempt = 0; attempt < 24; attempt++) {
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [board[i], board[j]] = [board[j], board[i]];
    }
    if (largestGroup(board, size) >= 3) return true;
  }
  // Bounded fallback preserves the food multiset, even with a pathological RNG.
  const food = FOODS.find(food => board.filter(id => id === food.id).length >= 3).id;
  for (let target = 0; target < 3; target++) {
    const source = board.findIndex((id, index) => index >= target && id === food);
    [board[target], board[source]] = [board[source], board[target]];
  }
  return true;
}
export function cascade(board, removed = [], rng = Math.random, size = SIZE, foods = FOODS) {
  const captured = new Set(removed);
  const next = Array(size * size);
  const moves = [];
  for (let col = 0; col < size; col++) {
    const survivors = [];
    for (let row = 0; row < size; row++) {
      const index = row * size + col;
      if (board[index] && !captured.has(index)) survivors.push({ food: board[index], row });
    }
    const missing = size - survivors.length;
    for (let row = 0; row < size; row++) {
      const survivor = survivors[row - missing];
      const food = survivor?.food ?? foods[Math.floor(rng() * foods.length)].id;
      const index = row * size + col;
      next[index] = food;
      moves.push({ index, food, from: survivor?.row ?? row - missing, to: row, col });
    }
  }
  return { board: next, moves };
}
export const rewardTime = (remaining, count, secondsPerItem = 0.25, totalSeconds = ROUND_SECONDS) =>
  Math.min(totalSeconds, remaining + count * secondsPerItem);
export function timerColor(seconds, totalSeconds = ROUND_SECONDS) {
  const fraction = Math.max(0, Math.min(1, seconds / totalSeconds));
  const low = fraction <= 0.5 ? [170, 32, 48] : [241, 183, 48];
  const high = fraction <= 0.5 ? [241, 183, 48] : [65, 205, 113];
  const mix = fraction <= 0.5 ? Math.max(0, (fraction - 0.2) / 0.3) : (fraction - 0.5) / 0.5;
  return `rgb(${low.map((channel, i) => Math.round(channel + (high[i] - channel) * mix)).join(', ')})`;
}

export function chooseFoods(count = 4, rng = Math.random) {
  const foods = [...FOODS];
  for (let i = foods.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [foods[i], foods[j]] = [foods[j], foods[i]];
  }
  return foods.slice(0, count);
}
export function activitySettings(settings = {}) {
  return {
    gridSize: settings.gridSize ?? 10,
    secondsPerItem: Math.round((settings.secondsPerItem ?? 0.25) * 4) / 4,
    totalSeconds: settings.totalSeconds ?? ROUND_SECONDS,
    noTimer: settings.noTimer ?? false,
    foodCount: settings.foodCount ?? 4
  };
}
