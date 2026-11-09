// One-time test stock for an explicitly selected, closed local development save.
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { copyDurable, replaceDurable } from '../src/durable-file.js';
import { withInventorySamples } from '../src/inventory-samples.js';

if (process.argv.length !== 3) throw new Error('Usage: node scripts/seed-inventory-samples.js <data-directory>');
const directory = resolve(process.argv[2]);
const file = join(directory, 'player', 'save.json');
const original = await readFile(file, 'utf8');
const state = JSON.parse(original);
if (state.version !== 1 || !Array.isArray(state.horses) || !Array.isArray(state.inventory))
  throw new Error('Expected an existing Gallorin save.');
if (state.inventorySamplesGranted) {
  console.log('Inventory test items were already added. No changes made.');
} else {
  const next = withInventorySamples(state);
  next.savedAt = new Date().toISOString();
  await mkdir(join(directory, 'backups'), { recursive: true });
  const backup = join(directory, 'backups', `pre-inventory-samples-${Date.now()}-${randomUUID()}.json`);
  await copyDurable(file, backup);
  if ((await readFile(file, 'utf8')) !== original) throw new Error('Save changed. Close the app and try again.');
  await replaceDurable(file, JSON.stringify(next) + '\n');
  console.log('Backup: ' + backup);
  for (const item of next.inventory) console.log(`${item.name}: ${item.count}`);
}
