// @ts-check
import { withLocalDefaults } from '../public/local-defaults.js';
import { withCosmicEyes, regularEyes } from '../public/cosmic-types.js';
import { isCosmicPalette } from '../public/cosmic-types.js';
import { mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises';
import { replaceDurable } from './durable-file.js';
import { resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultRaritySettings, validateRaritySettings } from '../public/rarity-settings.js';
import { normalizeCatalog, validateDefinition } from '../public/definitions.js';
import { locationsFor, validateZone } from '../public/zones.js';
import {
  registryKinds,
  defaultSpawnSettings,
  standardTokens,
  rarityTier,
  systemID,
  validateSpawnSettings,
  zoneCreatures,
  validateCreatures
} from '../public/spawn-config.js';

const safeID = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id);
export class ConfigurationFiles {
  constructor(directory) {
    this.root = resolve(directory, 'config');
  }
  path(relative) {
    const path = resolve(this.root, relative);
    if (!path.startsWith(this.root + sep)) throw new Error('Invalid configuration path.');
    return path;
  }
  async json(relative) {
    return JSON.parse(await readFile(this.path(relative), 'utf8'));
  }
  async atomic(relative, value) {
    const path = this.path(relative);
    if (value === null) {
      await unlink(path).catch(e => {
        if (e.code !== 'ENOENT') throw e;
      });
      return;
    }
    await mkdir(resolve(path, '..'), { recursive: true });
    await replaceDurable(path, JSON.stringify(value, null, 2) + '\n');
  }
  async apply(files) {
    for (const [path, value] of Object.entries(files)) await this.atomic(path, value);
  }
  async recover(state) {
    let journal;
    try {
      journal = await this.json('transaction.json');
    } catch (e) {
      if (e.code === 'ENOENT') return;
      throw e;
    }
    if (!journal || !journal.before || !journal.after || !safeID(journal.revision))
      throw new Error('Invalid configuration recovery journal; files preserved.');
    // The player-save revision is the commit marker for the entire set of JSON files.
    await this.apply(state.configurationRevision === journal.revision ? journal.after : journal.before);
    await unlink(this.path('transaction.json'));
  }
  seed(base, state) {
    const catalog = normalizeCatalog(base);
    catalog.palettes = catalog.palettes.filter(p => !(p.name === 'Template' && !p.complete));
    catalog.species = catalog.species.map(s => ({ ...s, rarityTier: rarityTier(s), attributes: s.attributes || {} }));
    for (const [name, weight] of Object.entries(standardTokens)) {
      const existing = catalog.mutations.find(m => m.name === name && m.type === 'Standard');
      if (existing)
        Object.assign(existing, {
          weight,
          thresholds: existing.thresholds || {},
          sizeShift: existing.sizeShift ?? (name === 'Dwarfism' ? -1 : name === 'Gigantism' ? 1 : 0)
        });
      else
        catalog.mutations.push({
          id: `mutation-${systemID(name)}`,
          name,
          description: '',
          type: 'Standard',
          weight,
          thresholds: {},
          sizeShift: name === 'Dwarfism' ? -1 : name === 'Gigantism' ? 1 : 0
        });
    }
    catalog.personalities = catalog.personalities.map(p => ({
      ...p,
      systemId: p.systemId || p.id,
      behaviorTags: p.behaviorTags || []
    }));
    const settings = structuredClone(defaultSpawnSettings);
    for (const cosmic of settings.cosmic) {
      let mutation = catalog.mutations.find(m => m.name === cosmic.name && ['Mutated', 'Cosmic'].includes(m.type));
      if (!mutation) {
        mutation = {
          id: `cosmic-${cosmic.name.toLowerCase()}`,
          name: cosmic.name,
          type: 'Cosmic',
          description: '',
          weight: null,
          thresholds: {}
        };
        catalog.mutations.push(mutation);
      }
      cosmic.mutationId = mutation.id;
    }
    const zones = locationsFor(catalog, state).map(z => ({ ...z, creatures: zoneCreatures(z, catalog, settings) }));
    return { catalog, zones, settings };
  }
  // Size and modification time of every configuration file, so callers can skip re-reading
  // unchanged files. The recovery journal is excluded because it never holds live settings.
  async signature() {
    const entries = [];
    const walk = async (directory, prefix) => {
      let names;
      try {
        names = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (error.code === 'ENOENT') return;
        throw error;
      }
      for (const entry of names) {
        const relative = prefix + entry.name;
        if (entry.isDirectory()) await walk(resolve(directory, entry.name), relative + '/');
        else if (entry.name.endsWith('.json') && relative !== 'transaction.json') {
          const info = await stat(resolve(directory, entry.name));
          entries.push(`${relative}:${info.size}:${info.mtimeMs}`);
        }
      }
    };
    await walk(this.root, '');
    return entries.sort().join('|');
  }
  async exists() {
    try {
      await this.json('index.json');
      return true;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    for (const kind of registryKinds) {
      try {
        await readFile(this.path(`${kind}.json`));
      } catch (e) {
        if (e.code === 'ENOENT') continue;
        throw e;
      }
      throw new Error(
        'Configuration index.json is missing; existing registry files have been preserved. Restore the matching index before starting.'
      );
    }
    return false;
  }
  async read(base) {
    const index = await this.json('index.json');
    if (
      index.version !== 1 ||
      !Array.isArray(index.zoneIds) ||
      index.zoneIds.some(id => !safeID(id)) ||
      new Set(index.zoneIds).size !== index.zoneIds.length
    )
      throw new Error('Invalid config/index.json.');
    const catalog = normalizeCatalog(base);
    let needsSpeciesSpellingCleanup = false;
    for (const kind of registryKinds) {
      const entries = await this.json(`${kind}.json`);
      if (
        !Array.isArray(entries) ||
        entries.length > 10000 ||
        (!entries.length && kind !== 'mutations') ||
        entries.some(e => !safeID(e.id)) ||
        new Set(entries.map(e => e.id)).size !== entries.length
      )
        throw new Error(`Invalid ${kind}.json registry.`);
      catalog[kind] = entries.map(entry => {
        if (kind === 'species' && entry.name === 'Friesan') {
          entry = { ...entry, name: 'Friesian' };
          needsSpeciesSpellingCleanup = true;
        }
        if (kind === 'palettes' && entry.complete === false) return entry; // Preserve incomplete imported reference palettes, never spawn them.
        return { ...entry, ...validateDefinition(kind, entry) };
      });
      const systemIDs = catalog[kind].map(e => e.systemId).filter(Boolean);
      if (new Set(systemIDs).size !== systemIDs.length) throw new Error(`Duplicate system IDs in ${kind}.json.`);
      const keys = entries.map(
        e =>
          `${kind === 'mutations' ? e.type : kind === 'eyes' ? e.cosmicType || 'Normal' : ''}:${e.name?.toLowerCase()}`
      );
      if (new Set(keys).size !== keys.length) throw new Error(`Duplicate names in ${kind}.json.`);
    }
    catalog.eyes = withCosmicEyes(catalog.eyes);
    if (!regularEyes(catalog.eyes).length) throw new Error('Keep at least one normal eye color for spawning.');
    if (!catalog.palettes.some(p => p.complete)) throw new Error('Keep at least one complete palette for spawning.');
    const settings = validateSpawnSettings(
      withLocalDefaults(defaultSpawnSettings, await this.json('spawn-settings.json'))
    );
    for (const cosmic of settings.cosmic)
      if (!cosmic.mutationId)
        cosmic.mutationId = catalog.mutations.find(
          m => m.name === cosmic.name && ['Cosmic', 'Mutated'].includes(m.type)
        )?.id;
    for (const cosmic of settings.cosmic)
      if (
        cosmic.chance > 0 &&
        !catalog.mutations.some(m => m.id === cosmic.mutationId && ['Mutated', 'Cosmic'].includes(m.type))
      )
        throw new Error(`Cosmic ${cosmic.name} needs a registered Cosmic/Mutated mutation ID.`);
    for (const p of catalog.palettes)
      if ((p.speciesIds || []).some(id => !catalog.species.some(s => s.id === id)))
        throw new Error('A palette refers to an unknown species ID.');
    const personalityIDs = catalog.personalities.map(p => p.systemId);
    if (new Set(personalityIDs).size !== personalityIDs.length)
      throw new Error('Personality system IDs must be unique.');
    const zones = [];
    let needsPaletteCleanup = false;
    for (const id of index.zoneIds) {
      const z = await this.json(`zones/${id}.json`);
      if (
        z.id !== id ||
        typeof z.name !== 'string' ||
        !z.name.trim() ||
        typeof z.enabled !== 'boolean' ||
        !Array.isArray(z.palettePool) ||
        z.palettePool.some(n => !catalog.palettes.some(p => p.name === n && p.complete))
      )
        throw new Error(`Invalid zone file: ${id}.json.`);
      const normalPool = z.palettePool.filter(name => !isCosmicPalette({ name }));
      needsPaletteCleanup ||= normalPool.length !== z.palettePool.length;
      z.palettePool = normalPool;
      const creatures = validateCreatures(z.creatures, catalog);
      const names = creatures.map(c => catalog.species.find(s => s.id === c.speciesId).name);
      const metadata = validateZone(
        {
          ...z,
          speciesPool: names.length ? names : [catalog.species[0].name],
          palettePool: z.palettePool.length
            ? z.palettePool
            : [catalog.palettes.find(p => p.complete && !isCosmicPalette(p))?.name]
        },
        catalog
      );
      zones.push({
        ...z,
        ...metadata,
        custom: z.custom,
        event: z.event,
        creatures,
        speciesPool: names,
        palettePool: z.palettePool,
        enabled: z.enabled && creatures.some(c => Math.abs(c.weight) > 0) && z.palettePool.length > 0
      });
    }
    catalog.locations = zones;
    catalog.traits = Object.fromEntries(catalog.species.map(s => [s.name, s.traits]));
    catalog.spawning = settings;
    try {
      catalog.rarities = validateRaritySettings(await this.json('rarities.json'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      catalog.rarities = structuredClone(defaultRaritySettings);
    }
    return { catalog, zones, settings, needsPaletteCleanup, needsSpeciesSpellingCleanup };
  }
  documents({ catalog, zones, settings }) {
    const files = Object.fromEntries(registryKinds.map(kind => [`${kind}.json`, catalog[kind]]));
    files['spawn-settings.json'] = settings;
    files['rarities.json'] = validateRaritySettings(catalog.rarities || defaultRaritySettings);
    files['index.json'] = { version: 1, zoneIds: zones.map(z => z.id) };
    for (const zone of zones) {
      if (!safeID(zone.id)) throw new Error('Invalid zone ID.');
      files[`zones/${zone.id}.json`] = { ...zone, creatures: zoneCreatures(zone, catalog, settings) };
    }
    return files;
  }
  async commit(configuration, persistPlayer, after = this.documents(configuration)) {
    const before = {};
    let previous = [];
    try {
      previous = (await this.json('index.json')).zoneIds;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    for (const id of previous) if (!configuration.zones.some(z => z.id === id)) after[`zones/${id}.json`] = null;
    for (const path of Object.keys(after)) {
      try {
        before[path] = await this.json(path);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
        before[path] = null;
      }
    }
    const revision = randomUUID();
    await this.atomic('transaction.json', { revision, before, after });
    try {
      await this.apply(after);
      await persistPlayer(revision);
    } catch (error) {
      await this.apply(before);
      await unlink(this.path('transaction.json'));
      throw error;
    }
    // A failed cleanup is harmless: startup recovers the committed revision.
    await unlink(this.path('transaction.json')).catch(() => {});
  }
}
