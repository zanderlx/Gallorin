import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareMusicValues, nextMusicSort } from '../public/music-table-sort.js';
test('music sorting handles numeric durations and keeps missing metadata last in both directions', () => {
  const values = [125, null, 9, 300, 0];
  assert.deepEqual(
    [...values].sort((a, b) => compareMusicValues(a, b, 'asc')),
    [0, 9, 125, 300, null]
  );
  assert.deepEqual(
    [...values].sort((a, b) => compareMusicValues(a, b, 'desc')),
    [300, 125, 9, 0, null]
  );
  assert.deepEqual(values, [125, null, 9, 300, 0]);
});
test('music title sorting is case-insensitive and uses natural numeric order', () => {
  const names = ['Song 10', 'apple', 'Song 2', 'Berry'];
  assert.deepEqual(
    [...names].sort((a, b) => compareMusicValues(a, b, 'asc')),
    ['apple', 'Berry', 'Song 2', 'Song 10']
  );
  assert.deepEqual(
    [...names].sort((a, b) => compareMusicValues(a, b, 'desc')),
    ['Song 10', 'Song 2', 'Berry', 'apple']
  );
});

test('sort headers cycle ascending, descending, and unsorted row order', () => {
  let state = nextMusicSort({ key: 'number', direction: 'asc' }, 'title');
  assert.deepEqual(state, { key: 'title', direction: 'asc' });
  state = nextMusicSort(state, 'title');
  assert.deepEqual(state, { key: 'title', direction: 'desc' });
  state = nextMusicSort(state, 'title');
  assert.deepEqual(state, { key: null, direction: null });
  state = nextMusicSort(state, 'title');
  assert.deepEqual(state, { key: 'title', direction: 'asc' });
  assert.deepEqual(nextMusicSort({ key: 'number', direction: 'asc' }, 'number'), { key: 'number', direction: 'desc' });
});
