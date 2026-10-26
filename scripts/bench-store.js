// Measures GameStore costs against synthetic saves in a temporary folder (never the real save).
// Usage: node scripts/bench-store.js [sizes...]   e.g. node scripts/bench-store.js 100 1000 5000
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { GameStore } from '../src/store.js';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('data/definitions/catalog.json', root), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('data/defaults/settings.json', root), 'utf8'));
const sizes = process.argv.slice(2).map(Number).filter(Boolean);
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const time = async (fn, runs) => {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return Number(median(samples).toFixed(1));
};

const rows = [];
for (const size of sizes.length ? sizes : [100, 1000, 5000]) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-bench-'));
  try {
    let store = await new GameStore(directory, catalog, defaults).init();
    await store.action('visit', { locationId: 'aetherion' });
    const template = store.state.encounters.aetherion[0];
    const save = store.snapshot();
    save.settings.ignoreStableLimit = true;
    for (let i = 0; i < size; i++) {
      save.horses.push({ ...structuredClone(template), id: randomUUID(), name: `Horse ${i}` });
      const soldId = randomUUID();
      save.sold.push({ ...structuredClone(template), id: soldId, soldAt: new Date().toISOString(), soldFor: 100 });
      save.transactions.push({ id: randomUUID(), type: 'Horse sold', horseId: soldId, amount: 100, at: save.savedAt });
    }
    await writeFile(join(directory, 'player', 'save.json'), JSON.stringify(save));
    store = await new GameStore(directory, catalog, defaults).init();
    const id = store.state.horses[0].id;
    const runs = size >= 5000 ? 8 : 20;
    rows.push({
      'stable + sold': `${size} + ${size}`,
      'save MB': Number(((await stat(join(directory, 'player', 'save.json'))).size / 1048576).toFixed(1)),
      'click ms': await time(() => store.action('favorite', { id }), runs),
      'page load ms': await time(async () => {
        await store.refreshConfiguration();
        JSON.stringify({ state: store.snapshot(), catalog: store.getCatalog() });
      }, runs)
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
console.table(rows);
