import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GameStore } from '../src/store.js';
import { foodSalePrice, itemSalePrices } from '../public/item-sales.js';
import { economyPage, economyHistory } from '../public/economy-settings.js';
import { inventoryPage } from '../public/inventory.js';
const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url)));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url)));
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-item-sales-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await new GameStore(directory, catalog, defaults).init();
  store.state.inventory = [
    { id: 'apple', name: 'Red Apples', type: 'food', rarity: 'common', count: 10 },
    { id: 'green-apple', name: 'Green Apples', type: 'food', rarity: 'rare', count: 3 },
    { id: 'pink-apple', name: 'Pink Apples', type: 'food', rarity: 'epic', count: 2 },
    { id: 'lasso', name: 'Lassos', type: 'gear', count: 5 }
  ];
  await store.persist(store.state);
  return { store, directory };
}
test('food defaults to type and food sale prices validate', () => {
  assert.match(inventoryPage('inventory/food', { inventory: [] }), /value="type" selected/);
  for (const [rarity, price] of Object.entries({ common: 1, rare: 5, epic: 15 }))
    assert.equal(foodSalePrice({ type: 'food', rarity }), price);
  assert.throws(() => foodSalePrice({ type: 'gear' }));
  for (const value of [-1, 1.5, Infinity, '5', 1000001])
    assert.throws(() => itemSalePrices({ itemSalePrices: { rare: value } }));
});
test('food sales persist quantity, gold, history and custom prices together', async t => {
  const { store, directory } = await fixture(t);
  const gold = store.state.gold;
  await store.action('sell-food', { id: 'apple', count: 4 });
  await store.action('sell-food', { id: 'green-apple', count: 3 });
  await store.action('sell-food', { id: 'pink-apple', count: 1 });
  assert.equal(store.state.gold, gold + 4 + 15 + 15);
  assert.equal(store.state.inventory.find(item => item.id === 'apple').count, 6);
  assert.ok(!store.state.inventory.some(item => item.id === 'green-apple'));
  assert.equal(store.state.transactions.filter(t => t.type === 'Food sold').length, 3);
  await store.action('item-sale-settings', { prices: { common: 2, rare: 6, epic: 20 } });
  await store.action('sell-food', { id: 'apple', count: 1 });
  const reopened = await new GameStore(directory, catalog, defaults).init();
  assert.equal(reopened.state.gold, gold + 36);
  assert.equal(reopened.state.settings.itemSalePrices.epic, 20);
  assert.equal(reopened.state.inventory.find(item => item.id === 'lasso').count, 5);
  const balance = reopened.state.gold;
  await reopened.action('economy-settings', { sellingPrice: 90 });
  assert.equal(reopened.state.gold, balance);
});
test('invalid or repeated food sales cannot spend unavailable inventory or change gold', async t => {
  const { store } = await fixture(t);
  for (const payload of [
    { id: 'apple', count: 0 },
    { id: 'apple', count: 11 },
    { id: 'apple', count: 1.5 },
    { id: 'lasso', count: 1 }
  ]) {
    const before = store.snapshot();
    await assert.rejects(store.action('sell-food', payload));
    assert.deepEqual(store.snapshot(), before);
  }
  const results = await Promise.allSettled([
    store.action('sell-food', { id: 'apple', count: 10 }),
    store.action('sell-food', { id: 'apple', count: 10 })
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
});
test('economy starts collapsed, separates gold and paginates food and horse history', () => {
  const state = {
    settings: defaults,
    gold: 123,
    sold: [],
    transactions: Array.from({ length: 23 }, (_, i) => ({
      type: 'Food sold',
      itemName: 'Red Apples',
      count: i + 1,
      amount: i + 1,
      at: new Date(2026, 0, i + 1).toISOString()
    }))
  };
  const page = economyPage(state);
  assert.ok(page.indexOf('id="gold-form"') < page.indexOf('Horse Sale Settings'));
  assert.ok(page.indexOf('Horse Sale Settings') < page.indexOf('Item Sale Settings'));
  assert.ok(page.indexOf('Item Sale Settings') < page.indexOf('Sale History'));
  assert.doesNotMatch(page, /<details[^>]* open/);
  assert.match(page, /data-economy-show-all/);
  const history = String(economyHistory(state, 3));
  assert.equal((history.match(/<tr>/g) || []).length, 4);
  assert.match(history, /Page 3 of 3/);
});
