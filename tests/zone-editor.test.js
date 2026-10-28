import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoneSpawnChances, zoneAtmosphereManager } from '../public/zone-editor.js';
import { baseAtmospheres } from '../public/definitions.js';

test('zone percentages match encounter tickets including signed, zero and empty weights', () => {
  const chances = zoneSpawnChances([
    { speciesId: 'one', weight: -10 },
    { speciesId: 'two', weight: 30 },
    { speciesId: 'disabled', weight: 0 }
  ]);
  assert.equal(chances.get('one'), 25);
  assert.equal(chances.get('two'), 75);
  assert.equal(chances.get('disabled'), 0);
  assert.equal(zoneSpawnChances([{ speciesId: 'zero', weight: 0 }]).get('zero'), 0);
  assert.equal(zoneSpawnChances([]).size, 0);
});

test('integrated atmosphere manager supports create edit and delete with escaped content', () => {
  const catalog = { atmospheres: baseAtmospheres };
  const create = String(zoneAtmosphereManager(catalog));
  assert.match(create, /data-kind="atmospheres"/);
  assert.match(create, /name="encounterTitle"/);
  assert.match(create, /name="color:tint"/);
  assert.doesNotMatch(create, /data-action="delete-definition"/);
  const edit = String(zoneAtmosphereManager(catalog, { ...baseAtmospheres[0], name: '<script>test</script>' }));
  assert.match(edit, /data-action="delete-definition"/);
  assert.match(edit, /&lt;script&gt;test&lt;\/script&gt;/);
  assert.doesNotMatch(edit, /<script>/);
});
