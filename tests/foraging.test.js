import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOODS,
  adjacent,
  extendPath,
  largestGroup,
  ensurePlayable,
  cascade,
  rewardTime,
  activitySettings,
  timerColor
} from '../public/foraging-engine.js';
import { groups } from '../public/ui.js';

test('Activities follows Town and includes Wilds Foraging; flowers are collectible', () => {
  assert.equal(groups[groups.findIndex(group => group.title === 'Town') + 1].title, 'Activities');
  assert.ok(FOODS.some(food => food.id === 'flower'));
});
test('chains turn, backtrack, reject diagonals, repeats, different food and row wrapping, with no length cap', () => {
  const board = Array(100).fill('apple');
  let path = [];
  for (const cell of [0, 1, 11, 12, 22]) path = extendPath(board, path, cell);
  assert.deepEqual(path, [0, 1, 11, 12, 22]);
  assert.deepEqual(extendPath(board, path, 12), [0, 1, 11, 12]);
  assert.deepEqual(extendPath(board, path, 11), path);
  assert.deepEqual(extendPath(board, path, 33), path);
  board[23] = 'flower';
  assert.deepEqual(extendPath(board, path, 23), path);
  assert.equal(adjacent(9, 10), false);
  path = [];
  board.fill('flower');
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++) path = extendPath(board, path, row * 10 + (row % 2 ? 9 - col : col));
  assert.equal(path.length, 100);
});
test('gravity preserves survivor order and spawns every missing tile above the boundary', () => {
  const board = Array.from({ length: 100 }, (_, i) => FOODS[i % 5].id);
  board[0] = 'flower';
  board[10] = 'berry';
  board[20] = 'peach';
  const result = cascade(board, [30, 50, 90], () => 0);
  assert.deepEqual([result.board[30], result.board[40], result.board[50]], ['flower', 'berry', 'peach']);
  assert.ok(result.moves.filter(move => move.col === 0 && move.to < 3).every(move => move.from < 0));
  assert.ok(result.moves.filter(move => move.col !== 0).every(move => move.from === move.to));
  const intro = cascade([], [], () => 0);
  assert.equal(intro.board.length, 100);
  assert.ok(intro.moves.every(move => move.from < 0));
});
test('dead boards are repaired without losing foods even when random shuffles cannot help', () => {
  const board = Array.from({ length: 100 }, (_, i) => FOODS[(Math.floor(i / 10) + (i % 10)) % 5].id);
  assert.equal(largestGroup(board), 1);
  const before = [...board].sort();
  assert.equal(
    ensurePlayable(board, () => 0.99999),
    true
  );
  assert.ok(largestGroup(board) >= 3);
  assert.deepEqual([...board].sort(), before);
  assert.equal(ensurePlayable(board), false);
  for (let i = 0; i < 200; i++) {
    const next = cascade([]).board;
    ensurePlayable(next);
    assert.ok(largestGroup(next) >= 3);
  }
});
test('time reward defaults to a quarter second per food, capped, with timer urgency', () => {
  assert.equal(activitySettings().secondsPerItem, 0.25);
  assert.equal(activitySettings({ secondsPerItem: 1 }).secondsPerItem, 1);
  assert.equal(rewardTime(12, 7), 13.75);
  assert.equal(rewardTime(59, 7), 60);
  assert.equal(timerColor(60), 'rgb(65, 205, 113)');
  assert.equal(timerColor(30), 'rgb(241, 183, 48)');
  assert.equal(timerColor(12), 'rgb(170, 32, 48)');
  assert.equal(timerColor(0), timerColor(12));
});

test('configured grids refill using only the round food pool', () => {
  const foods = FOODS.slice(0, 2);
  const result = cascade([], [], Math.random, 6, foods);
  assert.equal(result.board.length, 36);
  assert.ok(result.board.every(id => foods.some(food => food.id === id)));
  ensurePlayable(result.board, Math.random, 6);
  assert.ok(largestGroup(result.board, 6) >= 3);
  assert.equal(rewardTime(20, 3, 2), 26);
});

test('quarter-second rewards respect a configured timer cap and urgency scale', () => {
  assert.equal(rewardTime(12, 3, 0.25, 90), 12.75);
  assert.equal(rewardTime(89.5, 3, 0.25, 90), 90);
  assert.equal(timerColor(90, 90), timerColor(60));
  assert.equal(timerColor(45, 90), timerColor(30));
});
