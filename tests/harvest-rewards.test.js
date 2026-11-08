import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HARVESTS, harvestItems, splitHarvest } from '../public/harvest-rewards.js';
import { harvestIcon } from '../public/harvest-icons.js';

test('rarity odds sum to one and every reward has a matching icon', () => {
  for (const options of Object.values(HARVESTS)) {
    assert.ok(Math.abs(options.reduce((sum, item) => sum + item.chance, 0) - 1) < 1e-9);
    assert.ok(options.filter(item => item.rarity === 'common').reduce((sum, item) => sum + item.chance, 0) >= 0.8);
  }
  assert.equal(new Set(harvestItems.map(item => item.id)).size, 15);
  for (const item of harvestItems) assert.ok(String(harvestIcon(item.id)).length > 5);
});
test('rounded splits conserve totals and match rarity proportions', () => {
  for (const [food, options] of Object.entries(HARVESTS)) {
    const rewards = splitHarvest(food, 1000);
    for (const option of options)
      assert.equal(rewards.find(item => item.id === option.id).count, Math.round(option.chance * 1000));
    for (let count = 0; count < 300; count++) {
      const result = splitHarvest(food, count);
      assert.equal(
        result.reduce((sum, item) => sum + item.count, 0),
        count
      );
      assert.ok(
        result.every(item => Math.abs(item.count - count * options.find(option => option.id === item.id).chance) < 1)
      );
    }
  }
  assert.deepEqual(
    splitHarvest('peach', 24).map(item => [item.id, item.count]),
    [
      ['peach', 23],
      ['white-peach', 1]
    ]
  );
  assert.deepEqual(splitHarvest('apple', 0), []);
});
