import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultRaritySettings, validateRaritySettings } from '../public/rarity-settings.js';

test('legacy rarity settings keep their existing border and glow appearance', () => {
  const legacy = { version: 1, colors: { ...defaultRaritySettings.colors } };
  const migrated = validateRaritySettings(legacy);
  assert.deepEqual(migrated, defaultRaritySettings);
  assert.deepEqual(legacy, { version: 1, colors: defaultRaritySettings.colors });
});

test('border-only colors persist and glow cannot be enabled without a border', () => {
  const input = {
    version: 1,
    colors: { ...defaultRaritySettings.colors },
    glow: { common: true, uncommon: true, rare: false, 'ultra-rare': true, cosmic: true }
  };
  const saved = validateRaritySettings(input);
  assert.equal(saved.glow.common, false);
  assert.equal(saved.colors.common, null);
  assert.equal(saved.glow.rare, false);
  assert.equal(saved.colors.rare, defaultRaritySettings.colors.rare);
  assert.deepEqual(validateRaritySettings(JSON.parse(JSON.stringify(saved))), saved);
});

test('rarity glow settings reject malformed or unknown conditions', () => {
  for (const glow of [
    null,
    [],
    { rare: true },
    { ...defaultRaritySettings.glow, rare: 'yes' },
    { ...defaultRaritySettings.glow, unknown: false }
  ]) {
    assert.throws(() => validateRaritySettings({ ...defaultRaritySettings, glow }), /glow choices/);
  }
});
