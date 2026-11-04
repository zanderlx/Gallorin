import { test } from 'node:test';
import assert from 'node:assert/strict';
import { folderHorseIds } from '../public/horse-folder-order.js';
import { moveHorseInFolders } from '../src/horse-folders.js';

const fixture = () => ({
  horses: [
    { id: 'a', name: 'Ash', favorite: false },
    { id: 'b', name: 'Birch', favorite: true },
    { id: 'c', name: 'Clover', favorite: false },
    { id: 'd', name: 'Dawn', favorite: false }
  ],
  horseFolders: [
    { id: 'one', name: 'One', horseIds: ['c', 'a'] },
    { id: 'two', name: 'Two', horseIds: [] }
  ]
});
test('manual folder orders support before, after and append without changing horse records', () => {
  const state = fixture(),
    original = structuredClone(state.horses);
  assert.deepEqual(folderHorseIds(state, 'one'), ['c', 'a']);
  moveHorseInFolders(state, { id: 'a', fromFolder: 'one', toFolder: 'one', targetId: 'c' });
  assert.deepEqual(folderHorseIds(state, 'one'), ['a', 'c']);
  moveHorseInFolders(state, { id: 'a', fromFolder: 'one', toFolder: 'one', targetId: 'c', placement: 'after' });
  assert.deepEqual(folderHorseIds(state, 'one'), ['c', 'a']);
  moveHorseInFolders(state, { id: 'c', fromFolder: 'one', toFolder: 'two' });
  assert.deepEqual(folderHorseIds(state, 'one'), ['a']);
  assert.deepEqual(folderHorseIds(state, 'two'), ['c']);
  assert.deepEqual(state.horses, original);
});
test('moving between Favorites, Unfiled and custom folders updates membership atomically', () => {
  const state = fixture();
  moveHorseInFolders(state, { id: 'a', fromFolder: 'one', toFolder: 'favorites', targetId: 'b', placement: 'after' });
  assert.deepEqual(folderHorseIds(state, 'favorites'), ['b', 'a']);
  assert.deepEqual(folderHorseIds(state, 'one'), ['c']);
  moveHorseInFolders(state, { id: 'a', fromFolder: 'favorites', toFolder: 'two' });
  assert.equal(state.horses[0].favorite, false);
  state.horseFolders[0].horseIds.push('a');
  moveHorseInFolders(state, { id: 'a', fromFolder: 'two', toFolder: 'unfiled', targetId: 'd' });
  assert.deepEqual(folderHorseIds(state, 'unfiled'), ['a', 'd']);
  assert.ok(state.horseFolders.every(folder => !folder.horseIds.includes('a')));
  moveHorseInFolders(state, { id: 'd', fromFolder: 'unfiled', toFolder: 'unfiled', targetId: 'a' });
  assert.deepEqual(folderHorseIds(state, 'unfiled'), ['d', 'a']);
});
test('invalid and stale drop requests cannot mutate a save', () => {
  for (const overrides of [
    { id: 'missing' },
    { fromFolder: 'missing' },
    { toFolder: 'missing' },
    { fromFolder: 'unfiled' },
    { targetId: 'missing' },
    { targetId: 'b' },
    { placement: 'invalid' },
    { placement: 'swap' }
  ]) {
    const state = fixture(),
      before = structuredClone(state);
    assert.throws(() => moveHorseInFolders(state, { id: 'a', fromFolder: 'one', toFolder: 'two', ...overrides }));
    assert.deepEqual(state, before);
  }
});
test('dropping on the same horse is safe, including its copy in another folder', () => {
  const state = fixture();
  state.horseFolders[1].horseIds = ['c', 'a'];
  moveHorseInFolders(state, { id: 'a', fromFolder: 'one', toFolder: 'two', targetId: 'a' });
  assert.deepEqual(folderHorseIds(state, 'one'), ['c']);
  assert.deepEqual(folderHorseIds(state, 'two'), ['c', 'a']);
  const before = structuredClone(state);
  moveHorseInFolders(state, { id: 'a', fromFolder: 'two', toFolder: 'two', targetId: 'a' });
  assert.deepEqual(state, before);
});
test('manual orders ignore stale IDs and include newly added members', () => {
  const state = fixture();
  state.horseFolderOrder = { favorites: ['missing', 'b', 'b'], unfiled: ['d'] };
  state.horses[0].favorite = true;
  assert.deepEqual(folderHorseIds(state, 'favorites'), ['b', 'a']);
  assert.deepEqual(folderHorseIds(state, 'unfiled'), ['d']);
});
