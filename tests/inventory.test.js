import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inventoryItems, inventoryPage } from '../public/inventory.js';
import { withInventorySamples } from '../src/inventory-samples.js';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

test('sample command backs up its selected save and grants only once', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-inventory-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'player'));
  const file = join(directory, 'player', 'save.json');
  const original = JSON.stringify({ version: 1, horses: [{ id: 'keep' }], gold: 123, inventory: [] });
  await writeFile(file, original);
  const script = fileURLToPath(new URL('../scripts/seed-inventory-samples.js', import.meta.url));
  execFileSync(process.execPath, [script, directory]);
  const saved = await readFile(file, 'utf8');
  const state = JSON.parse(saved);
  assert.equal(state.inventory.length, 6);
  assert.deepEqual(state.horses, [{ id: 'keep' }]);
  assert.equal(state.gold, 123);
  const backups = await readdir(join(directory, 'backups'));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(join(directory, 'backups', backups[0]), 'utf8'), original);
  execFileSync(process.execPath, [script, directory]);
  assert.equal(await readFile(file, 'utf8'), saved);
});

test('sample grant keeps existing items and player data, and cannot be repeated', () => {
  const state = {
    horses: [{ id: 'keep' }],
    gold: 87,
    inventory: [{ id: 'lasso', name: 'Lassos', type: 'gear', count: 2 }]
  };
  const before = structuredClone(state);
  const next = withInventorySamples(state, () => 0.48);
  assert.deepEqual(state, before);
  assert.deepEqual(next.horses, state.horses);
  assert.equal(next.gold, state.gold);
  assert.equal(next.inventory[0].count, 7);
  assert.equal(next.inventory.length, 6);
  assert.ok(next.inventory.filter(item => item.type === 'food').every(item => item.count === 13));
  assert.deepEqual(withInventorySamples(next), next);
  for (const roll of [0, 0.99999]) {
    assert.ok(
      withInventorySamples({ inventory: [] }, () => roll).inventory.every(item => item.count >= 1 && item.count <= 25)
    );
  }
});

test('inventory filters by type and sorts numerically by count without changing saved order', () => {
  const items = [
    { id: 'lasso', name: 'Lassos', type: 'gear', count: 5 },
    { id: 'apple', name: 'Apples', type: 'food', count: 20 },
    { id: 'berry', name: 'Berries', type: 'food', count: 3 }
  ];
  const before = structuredClone(items);
  assert.deepEqual(
    inventoryItems(items, 'food').map(item => item.name),
    ['Apples', 'Berries']
  );
  assert.deepEqual(
    inventoryItems(items, 'all', 'count').map(item => item.count),
    [3, 5, 20]
  );
  assert.deepEqual(
    inventoryItems(items, 'all', 'count', 'desc').map(item => item.count),
    [20, 5, 3]
  );
  assert.deepEqual(
    inventoryItems(items, 'all', 'name', 'desc').map(item => item.name),
    ['Lassos', 'Berries', 'Apples']
  );
  assert.deepEqual(items, before);
  assert.deepEqual(inventoryItems([null, { name: 'Bad', count: -1 }, { name: 'Zero', count: 0 }]), []);
});

test('inventory cards escape names, show counts, and keep empty categories plain', () => {
  const state = { inventory: [{ id: 'custom', name: '<script>item</script>', type: 'gear', count: 5 }] };
  const page = inventoryPage('inventory/gear', state);
  assert.match(page, /&lt;script&gt;item&lt;\/script&gt;/);
  assert.doesNotMatch(page, /<script>/);
  assert.match(page, /aria-label="Count: 5"/);
  assert.match(page, /id="inventory-sort"/);
  assert.match(inventoryPage('inventory/pets', state), /Inventory is empty/);
  assert.doesNotMatch(page, /satchel|Phase 5|companion your own/i);
});
