// @ts-check
import { regularEyes, isCosmicEye } from '../public/cosmic-types.js';
import { limits, formatLimit } from '../public/limits.js';
import { withLocalDefaults } from '../public/local-defaults.js';
import { regenerateHorse, horseFingerprint } from './horse-regeneration.js';
import { migrateHorseVersion } from '../public/horse-version.js';
import { ConfigurationFiles } from './configuration.js';
import { readHorseSkills, awardHorseSkillXP } from '../public/skill-progress.js';
import { synchronizeCosmicPalettes } from './cosmic-palettes.js';
import { paletteAdditionsVersion, missingBundledPalettes } from './palette-additions.js';
import { validateRaritySettings } from '../public/rarity-settings.js';
import { horseSalePrice, saleModifiers, validateSaleModifiers } from '../public/sale-pricing.js';
import {
  registryKinds,
  defaultSpawnSettings,
  validateSpawnSettings,
  zoneCreatures,
  validateCreatures
} from '../public/spawn-config.js';
import { localCalendarDate } from '../public/dates.js';
import { readHorseDocument } from '../public/horse-transfer.js';
import { validateHorseName, horseRecords, updateHorseField } from '../public/horse-fields.js';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { replaceDurable, writeDurable, copyDurable, pruneBackups } from './durable-file.js';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { cooldownSeconds } from '../public/encounter-cooldown.js';
import { createEncounters } from './encounters.js';
import { locationsFor, validateZone } from '../public/zones.js';
import { catalogFor, validateDefinition, definitionKinds } from '../public/definitions.js';
import { validateKeeper } from '../public/keeper.js';
import { validateCopyPatch } from '../public/page-copy.js';

const snapshotIntervalMs = 60 * 60 * 1000;
const backupsPerKind = 20;
// Automatic upgrade backups. Manual `save-` backups are never pruned.
const upgradeBackupPrefixes = [
  'pre-spawning-',
  'pre-palette-additions-',
  'pre-cosmic-zone-cleanup-',
  'pre-horse-version-',
  'pre-horse-skills-',
  'pre-cosmic-palettes-',
  'pre-horse-updates-',
  'pre-sound-effects-'
];

/** Applies save-format upgrades to one horse in place and reports which kinds changed. */
function upgradeHorse(horse) {
  const version = migrateHorseVersion(horse);
  let details = false;
  if (horse.species === 'Friesan') {
    horse.species = 'Friesian';
    details = true;
  }
  const skills = readHorseSkills(horse.skills);
  if (JSON.stringify(skills) !== JSON.stringify(horse.skills)) {
    horse.skills = skills;
    details = true;
  }
  return { version, details };
}

export class GameStore {
  constructor(directory, catalog, defaults, options = {}) {
    this.directory = directory;
    this.catalog = catalog;
    this.defaults = defaults;
    /** @type {Promise<unknown>} */
    this.queue = Promise.resolve();
    this.files = new ConfigurationFiles(directory);
    this.rng = options.rng;
    this.horseUpdatePreviews = new Map();
    /** @type {import('./types.js').SaveState | undefined} */
    this.state = undefined;
  }
  async init() {
    await mkdir(join(this.directory, 'player'), { recursive: true });
    await mkdir(join(this.directory, 'backups'), { recursive: true });
    this.file = join(this.directory, 'player', 'save.json');
    let existingSave = true;
    try {
      this.state = JSON.parse(await readFile(this.file, 'utf8'));
      if (
        this.state.version !== 1 ||
        !Array.isArray(this.state.horses) ||
        !Array.isArray(this.state.sold) ||
        !this.state.settings
      )
        throw new Error('Invalid save structure');
    } catch (error) {
      if (error.code !== 'ENOENT')
        throw new Error(`Cannot read save; existing file has been preserved. ${error.message}`, { cause: error });
      existingSave = false;
      this.state = {
        version: 1,
        gold: this.defaults.startingGold,
        settings: structuredClone(this.defaults),
        horses: [],
        sold: [],
        inventory: [],
        transactions: [],
        encounters: {},
        searches: {},
        createdAt: new Date().toISOString(),
        savedAt: null
      };
      await this.persist(this.state, false);
    }
    this.state.settings = withLocalDefaults(this.defaults, this.state.settings);
    this.state.customLocations ??= [];
    this.state.settings.saleModifiers = validateSaleModifiers(saleModifiers(this.state.settings));
    await this.files.recover(this.state);
    if (!(await this.files.exists())) {
      if (existingSave)
        await copyFile(this.file, join(this.directory, 'backups', `pre-spawning-${Date.now()}-${randomUUID()}.json`));
      const seeded = this.files.seed(catalogFor(this.catalog, this.state), this.state);
      const next = this.snapshot();
      await this.files.commit(seeded, async revision => {
        await this.files.read(seeded.catalog);
        next.configurationRevision = revision;
        next.paletteAdditionsVersion = paletteAdditionsVersion;
        await this.persist(next);
      });
      this.state = next;
    }
    await this.addBundledPalettes();
    await this.upgradeHorses();
    await this.readConfiguration();
    await this.pruneOldBackups();
    return this;
  }
  // One-time additive upgrade: appends known bundled palettes to an existing registry without touching local entries.
  async addBundledPalettes() {
    if ((this.state.paletteAdditionsVersion || 0) >= paletteAdditionsVersion) return;
    const configuration = await this.files.read(catalogFor(this.catalog, this.state));
    const additions = missingBundledPalettes(this.catalog, configuration.catalog, this.state);
    const next = this.snapshot();
    next.paletteAdditionsVersion = paletteAdditionsVersion;
    if (!additions.length) {
      await this.persist(next);
      this.state = next;
      return;
    }
    const backup = `pre-palette-additions-${Date.now()}-${randomUUID()}`;
    await copyFile(this.file, join(this.directory, 'backups', `${backup}.json`));
    await copyFile(this.files.path('palettes.json'), join(this.directory, 'backups', `${backup}-palettes.json`));
    // Only palettes.json is written, so existing entries keep their stored form exactly.
    const palettes = [...(await this.files.json('palettes.json')), ...additions];
    try {
      await this.files.commit(
        configuration,
        async revision => {
          await this.files.read(catalogFor(this.catalog, this.state));
          next.configurationRevision = revision;
          await this.persist(next);
        },
        { 'palettes.json': palettes }
      );
    } catch (error) {
      // The transaction restored the previous files; play continues and the upgrade retries next launch.
      console.warn(`Bundled palette upgrade skipped: ${error.message}`);
      return;
    }
    this.state = next;
  }
  async persist(next, backup = true) {
    next.savedAt = new Date().toISOString();
    if (backup) {
      // One-step undo for the change being saved; the delete dialog promises this file.
      await copyFile(this.file, join(this.directory, 'backups', 'previous-save.json'));
      await this.snapshotIfDue();
    }
    // Compact JSON: about a third smaller and faster to write than pretty-printed saves.
    await replaceDurable(this.file, JSON.stringify(next) + '\n');
  }
  // Keeps a point-in-time copy before the first change of each session and at most hourly after.
  async snapshotIfDue() {
    const now = Date.now();
    if (this.lastSnapshotAt !== undefined && now - this.lastSnapshotAt < snapshotIntervalMs) return;
    await copyDurable(this.file, join(this.directory, 'backups', `snapshot-${now}.json`));
    this.lastSnapshotAt = now;
    await pruneBackups(join(this.directory, 'backups'), 'snapshot-', backupsPerKind);
  }
  async pruneOldBackups() {
    const directory = join(this.directory, 'backups');
    for (const prefix of upgradeBackupPrefixes) await pruneBackups(directory, prefix, backupsPerKind);
  }
  snapshot() {
    return structuredClone(this.state);
  }
  getCatalog(state = this.state) {
    const catalog = catalogFor(this.catalog, state);
    if (this.configuration) {
      for (const kind of registryKinds) catalog[kind] = structuredClone(this.configuration.catalog[kind]);
      catalog.locations = structuredClone(this.configuration.zones);
      catalog.traits = Object.fromEntries(catalog.species.map(s => [s.name, s.traits]));
      catalog.spawning = structuredClone(this.configuration.settings);
      catalog.rarities = structuredClone(this.configuration.catalog.rarities);
    }
    return catalog;
  }
  // Reloads configuration only when its files changed (game edits or hand edits), then reapplies
  // the cleanups that depend on it. Unchanged files cost one stat per file.
  async readConfiguration() {
    const signature = await this.files.signature();
    if (this.configuration && signature === this.configurationSignature) return;
    await this.loadConfiguration();
    this.configurationSignature = await this.files.signature();
  }
  // Save-only upgrades run once at startup; imported horses get the same upgrade on import.
  async upgradeHorses() {
    const next = this.snapshot();
    const results = horseRecords(next).map(upgradeHorse);
    const prefixes = [
      results.some(result => result.version) && 'pre-horse-version-',
      results.some(result => result.details) && 'pre-horse-skills-'
    ].filter(Boolean);
    if (!prefixes.length) return;
    for (const prefix of prefixes)
      await copyFile(this.file, join(this.directory, 'backups', `${prefix}${Date.now()}-${randomUUID()}.json`));
    await this.persist(next);
    this.state = next;
  }
  async loadConfiguration() {
    const configuration = await this.files.read(catalogFor(this.catalog, this.state));
    const overrides = new Set(this.state.customLocations.map(z => z.id));
    this.state.customLocations = configuration.zones
      .filter(z => z.custom || overrides.has(z.id))
      .map(z => structuredClone(z));
    this.configuration = configuration;
    if (configuration.needsPaletteCleanup || configuration.needsSpeciesSpellingCleanup) {
      const next = this.snapshot();
      await copyFile(
        this.file,
        join(this.directory, 'backups', `pre-cosmic-zone-cleanup-${Date.now()}-${randomUUID()}.json`)
      );
      await this.files.commit(configuration, async revision => {
        next.configurationRevision = revision;
        await this.persist(next);
      });
      this.state = next;
    }
    const next = this.snapshot();
    if (synchronizeCosmicPalettes(horseRecords(next), this.getCatalog(next))) {
      await copyFile(
        this.file,
        join(this.directory, 'backups', `pre-cosmic-palettes-${Date.now()}-${randomUUID()}.json`)
      );
      await this.persist(next);
      this.state = next;
    }
  }
  refreshConfiguration() {
    const run = this.queue.then(() => this.readConfiguration());
    this.queue = run.catch(() => {});
    return run;
  }
  previewHorseUpdates(payload = {}) {
    const run = this.queue.then(async () => {
      await this.readConfiguration();
      if (!this.state.settings.horseUpdatesEnabled) throw new Error('Enable Horse Updates before updating horses.');
      if (
        !Array.isArray(payload.ids) ||
        !payload.ids.length ||
        payload.ids.length > 100 ||
        new Set(payload.ids).size !== payload.ids.length
      )
        throw new Error('Select 1–100 different stable horses.');
      if (typeof payload.allowDuplicates !== 'boolean')
        throw new Error('Choose whether this update allows duplicate mutations.');
      const catalog = this.getCatalog();
      const selected = payload.ids.map(id => {
        const horse = this.state.horses.find(h => h.id === id);
        if (!horse) throw new Error('Choose horses currently in your stable.');
        return horse;
      });
      const results = selected.map(original => ({
        id: original.id,
        name: original.name || original.species,
        before: horseFingerprint(original),
        schemaVersion: original.schemaVersion,
        revision: original.revision,
        ...regenerateHorse(original, payload.rules, catalog, this.state, {
          rng: this.rng,
          allowDuplicates: payload.allowDuplicates
        })
      }));
      const preview = {
        token: randomUUID(),
        expires: Date.now() + 600000,
        catalog: horseFingerprint(catalog),
        settings: horseFingerprint(this.state.settings),
        results
      };
      for (const [token, value] of this.horseUpdatePreviews)
        if (value.expires < Date.now()) this.horseUpdatePreviews.delete(token);
      while (this.horseUpdatePreviews.size >= 10)
        this.horseUpdatePreviews.delete(this.horseUpdatePreviews.keys().next().value);
      this.horseUpdatePreviews.set(preview.token, preview);
      return {
        preview: {
          token: preview.token,
          expires: preview.expires,
          items: results.map(({ horse, before, ...result }) => result)
        }
      };
    });
    this.queue = run.catch(() => {});
    return run;
  }
  action(type, payload = {}) {
    const run = this.queue.then(async () => {
      await this.readConfiguration();
      const next = this.snapshot();
      const catalog = this.getCatalog(next);
      if (type === 'horse-updates-enabled') {
        if (typeof payload.enabled !== 'boolean') throw new Error('Choose whether horse updates are enabled.');
        next.settings.horseUpdatesEnabled = payload.enabled;
      } else if (type === 'apply-horse-updates') {
        if (!next.settings.horseUpdatesEnabled) throw new Error('Enable Horse Updates before updating horses.');
        const preview = this.horseUpdatePreviews.get(payload.token);
        if (!preview || preview.expires < Date.now()) throw new Error('This preview expired. Generate a new preview.');
        if (preview.catalog !== horseFingerprint(catalog) || preview.settings !== horseFingerprint(next.settings))
          throw new Error('Configuration changed. Generate a new preview.');
        for (const result of preview.results) {
          const index = next.horses.findIndex(h => h.id === result.id);
          if (index < 0 || horseFingerprint(next.horses[index]) !== result.before)
            throw new Error('A selected horse changed. Generate a new preview.');
          if (result.changes.length) next.horses[index] = structuredClone(result.horse);
        }
        if (!preview.results.some(result => result.changes.length)) throw new Error('This preview has no changes.');
        await copyFile(
          this.file,
          join(this.directory, 'backups', 'pre-horse-updates-' + Date.now() + '-' + randomUUID() + '.json')
        );
      } else if (type === 'search' || type === 'visit') {
        const location = locationsFor(catalog, next).find(l => l.id === payload.locationId && l.enabled);
        if (!location) throw new Error('Unknown location.');
        if (type === 'search' && cooldownSeconds(next))
          throw new Error('Awaiting Respawn: the search cooldown is still active.');
        // Zones are never left empty; the cooldown only gates searching for a fresh set.
        if (type === 'search' || !next.encounters[location.id]?.length) {
          const searchNumber = next.searches[location.id] || 0;
          next.encounters[location.id] = createEncounters(
            catalog,
            location.id,
            next.settings.horsesPerSearch,
            searchNumber,
            location,
            this.rng
          );
          next.searches[location.id] = searchNumber + 1;
          if (type === 'search' && next.settings.searchCooldownEnabled)
            next.searchAvailableAt = Date.now() + next.settings.searchCooldownSeconds * 1000;
        }
      } else if (type === 'catch' || type === 'sell') {
        let horse = next.horses.find(h => h.id === payload.id);
        const isCollected = !!horse;
        if (!horse)
          horse = Object.values(next.encounters)
            .flat()
            .find(h => h.id === payload.id);
        if (!horse) throw new Error('This horse has already left the clearing.');
        if (type === 'catch') {
          if (isCollected) throw new Error('This horse is already in your stable.');
          if (!next.settings.ignoreStableLimit && next.horses.length >= next.settings.stableCapacity)
            throw new Error('Your stable is full. Adjust capacity in Game Settings.');
          const caughtAt = new Date().toISOString();
          next.horses.push({
            ...horse,
            birthday: localCalendarDate(caughtAt),
            personalityDescription: horse.personalityDescription ?? horse.personality.description ?? '',
            name: payload.name === undefined ? horse.name : validateHorseName(payload.name),
            caughtAt
          });
        } else {
          next.horses = next.horses.filter(h => h.id !== horse.id);
          const salePricing = horseSalePrice(horse, next.settings);
          if (!Number.isSafeInteger(next.gold + salePricing.total))
            throw new Error('This sale would exceed the supported gold balance.');
          next.sold.push({ ...horse, soldAt: new Date().toISOString(), soldFor: salePricing.total, salePricing });
          next.gold += salePricing.total;
          next.transactions.push({
            id: randomUUID(),
            type: 'Horse sold',
            horseId: horse.id,
            horseName: horse.name,
            species: horse.species,
            amount: salePricing.total,
            salePricing,
            at: new Date().toISOString()
          });
        }
        for (const key of Object.keys(next.encounters)) {
          const index = next.encounters[key].findIndex(h => h.id === horse.id);
          if (index < 0) continue;
          const location = locationsFor(catalog, next).find(l => l.id === key && l.enabled);
          // Replace only the removed slot, atomically with its capture or sale.
          if (location)
            next.encounters[key].splice(
              index,
              1,
              ...createEncounters(catalog, key, 1, next.searches[key] || 0, location, this.rng)
            );
          else next.encounters[key].splice(index, 1);
        }
      } else if (type === 'import-horse') {
        if (JSON.stringify(payload).length > limits.horseFileBytes)
          throw new Error(`Horse files must be ${formatLimit(limits.horseFileBytes)} or smaller.`);
        const horse = readHorseDocument(payload);
        if (!next.settings.ignoreStableLimit && next.horses.length >= next.settings.stableCapacity)
          throw new Error('Your stable is full. Adjust capacity in Game Settings.');
        const caughtAt = new Date().toISOString();
        const imported = { ...horse, id: randomUUID(), birthday: localCalendarDate(caughtAt), caughtAt };
        upgradeHorse(imported);
        next.horses.push(imported);
      } else if (type === 'rename' || type === 'favorite') {
        const horse = next.horses.find(h => h.id === payload.id);
        if (!horse) throw new Error('Horse not found in your stable.');
        if (type === 'rename') {
          horse.name = validateHorseName(payload.name);
        } else horse.favorite = !horse.favorite;
      } else if (type === 'horse-skill-xp') {
        if (!next.settings.developerEditMode) throw new Error('Enable Edit Mode to add skill XP.');
        const horse = next.horses.find(h => h.id === payload.id);
        if (!horse) throw new Error('Horse not found in your stable.');
        horse.skills = awardHorseSkillXP(horse.skills, payload.skill, payload.xp);
      } else if (type === 'horse-field') {
        if (!next.settings.developerEditMode) throw new Error('Enable Edit Mode to change horse details.');
        const horse = horseRecords(next).find(h => h.id === payload.id);
        if (!horse) throw new Error('Horse not found.');
        updateHorseField(horse, payload.field, payload.value, catalog, next);
      } else if (type === 'horse-description') {
        const horse = next.horses.find(h => h.id === payload.id);
        if (!horse) throw new Error('Horse not found in your stable.');
        if (typeof payload.description !== 'string' || payload.description.length > 4000)
          throw new Error('Description must be 4,000 characters or fewer.');
        horse.personalityDescription = payload.description;
      } else if (type === 'horse-notes') {
        const horse = horseRecords(next).find(h => h.id === payload.id);
        if (!horse) throw new Error('Horse not found.');
        if (typeof payload.notes !== 'string' || payload.notes.length > 4000)
          throw new Error('Notes must be 4,000 characters or fewer.');
        horse.notes = payload.notes;
      } else if (type === 'save-profile') {
        const previousAbout = next.keeper?.about;
        next.keeper = validateKeeper(payload);
        if (next.keeper.about.includes('i<3horses') && previousAbout !== next.keeper.about)
          next.settings.developerSettingsVisible = true;
      } else if (type === 'disable-developer-settings') {
        next.settings.developerSettingsVisible = false;
        next.settings.developerEditMode = false;
      } else if (type === 'delete-profile') {
        delete next.keeper;
      } else if (type === 'delete-horse') {
        const exists = [...next.horses, ...next.sold, ...Object.values(next.encounters).flat()].some(
          h => h.id === payload.id
        );
        if (!exists) throw new Error('Horse not found.');
        next.horses = next.horses.filter(h => h.id !== payload.id);
        next.sold = next.sold.filter(h => h.id !== payload.id);
        for (const key of Object.keys(next.encounters))
          next.encounters[key] = next.encounters[key].filter(h => h.id !== payload.id);
      } else if (type === 'delete-zone') {
        if (!locationsFor(catalog, next).some(l => l.id === payload.id)) throw new Error('Zone not found.');
        next.customLocations = next.customLocations.filter(l => l.id !== payload.id);
        next.deletedLocationIds = [...new Set([...(next.deletedLocationIds || []), payload.id])];
        delete next.encounters[payload.id];
        delete next.searches[payload.id];
        if (next.pageCopy) delete next.pageCopy[`wilds/${payload.id}`];
        if (next.pageCopy?.site) delete next.pageCopy.site[`nav-wilds-${payload.id}`];
      } else if (type === 'delete-definition') {
        const { kind, id } = payload;
        if (!Object.hasOwn(definitionKinds, kind)) throw new Error('Unknown definition type.');
        const entry = catalog[kind].find(d => d.id === id);
        if (!entry) throw new Error('Definition not found.');
        if (kind === 'siteThemes' && id === 'default') throw new Error('The original theme is kept as the fallback.');
        if (kind === 'eyes' && isCosmicEye(entry)) throw new Error('Cosmic eye colors cannot be deleted.');
        if (kind === 'eyes' && !isCosmicEye(entry) && regularEyes(catalog.eyes).length === 1)
          throw new Error('Keep at least one normal eye color for spawning.');
        if (
          ['species', 'palettes', 'eyes', 'personalities', 'atmospheres'].includes(kind) &&
          catalog[kind].length === 1
        )
          throw new Error('Keep at least one entry of this type for the horse generator.');
        catalog[kind] = catalog[kind].filter(d => d.id !== id);
        if (kind === 'mutations')
          for (const cosmic of catalog.spawning.cosmic) if (cosmic.mutationId === id) cosmic.chance = 0;
        if (kind === 'palettes')
          next.deletedBuiltinPalettes = [...new Set([...(next.deletedBuiltinPalettes || []), id])];
        if (['species', 'palettes'].includes(kind)) {
          const pool = kind === 'species' ? 'speciesPool' : 'palettePool';
          for (const zone of [...catalog.locations, ...next.customLocations]) {
            zone[pool] = zone[pool].filter(name => name !== entry.name);
            if (kind === 'species') zone.creatures = (zone.creatures || []).filter(c => c.speciesId !== id);
            if (!zone[pool].length) zone.enabled = false;
          }
        }
        if (kind === 'species')
          for (const palette of catalog.palettes)
            palette.speciesIds = (palette.speciesIds || []).filter(sid => sid !== id);
        if (kind === 'atmospheres')
          for (const zone of [...catalog.locations, ...next.customLocations])
            if (zone.atmosphere === id) zone.atmosphere = catalog.atmospheres[0].id;
        if (kind === 'themes') for (const item of catalog.items) if (item.theme === entry.name) item.theme = '';
        if (kind === 'siteThemes') {
          next.deletedWebsiteThemes = [...new Set([...(next.deletedWebsiteThemes || []), id])];
          if (next.settings.websiteTheme === id) next.settings.websiteTheme = 'default';
        }
        next.library = catalog;
      } else if (type === 'rarity-settings') {
        catalog.rarities = validateRaritySettings(payload);
      } else if (type === 'spawn-settings') {
        const settings = { ...catalog.spawning, ...payload };
        catalog.spawning = validateSpawnSettings(settings);
      } else if (type === 'current-gold' || type === 'economy-settings') {
        if (!Number.isSafeInteger(payload.gold) || payload.gold < 0 || payload.gold > 1000000000)
          throw new Error('Gold must be a whole number between 0 and 1,000,000,000.');
        if (type === 'economy-settings') {
          if (!Number.isInteger(payload.sellingPrice) || payload.sellingPrice < 0 || payload.sellingPrice > 1000000)
            throw new Error('Selling price must be a whole number between 0 and 1,000,000.');
          next.settings.sellingPrice = payload.sellingPrice;
          if (payload.saleModifiers !== undefined) validateSaleModifiers(payload.saleModifiers);
          next.settings.saleModifiers = validateSaleModifiers(
            payload.saleModifiers === undefined
              ? saleModifiers(next.settings)
              : { ...saleModifiers(next.settings), ...payload.saleModifiers }
          );
        }
        const amount = payload.gold - next.gold;
        next.gold = payload.gold;
        if (amount || type === 'current-gold')
          next.transactions.push({
            id: randomUUID(),
            type: 'Developer balance adjustment',
            amount,
            at: new Date().toISOString()
          });
      } else if (type === 'settings') {
        if (payload.searchCooldownEnabled !== undefined) {
          if (typeof payload.searchCooldownEnabled !== 'boolean')
            throw new Error('Search cooldown must be enabled or disabled.');
          next.settings.searchCooldownEnabled = payload.searchCooldownEnabled;
        }
        if (payload.searchCooldownSeconds !== undefined) {
          if (
            !Number.isInteger(payload.searchCooldownSeconds) ||
            payload.searchCooldownSeconds < 1 ||
            payload.searchCooldownSeconds > 86400
          )
            throw new Error('Search cooldown must be a whole number from 1 to 86400 seconds.');
          next.settings.searchCooldownSeconds = payload.searchCooldownSeconds;
        }
        if (!next.settings.searchCooldownEnabled) next.searchAvailableAt = 0;
        for (const [key, min, max] of [
          ['horsesPerSearch', 1, 12],
          ['sellingPrice', 0, 1000000],
          ['startingGold', 0, 1000000],
          ['stableCapacity', 1, 10000]
        ]) {
          if (!Number.isInteger(payload[key]) || payload[key] < min || payload[key] > max)
            throw new Error(`${key} must be a whole number between ${min} and ${max}.`);
          next.settings[key] = payload[key];
        }
        if (typeof payload.ignoreStableLimit !== 'boolean')
          throw new Error('Stable limit override must be true or false.');
        next.settings.ignoreStableLimit = payload.ignoreStableLimit;
        if (payload.ALLOW_DUPLICATE_MUTATIONS !== undefined)
          catalog.spawning = validateSpawnSettings({
            ...catalog.spawning,
            ALLOW_DUPLICATE_MUTATIONS: payload.ALLOW_DUPLICATE_MUTATIONS
          });
      } else if (type === 'save-zone') {
        const zone = validateZone(payload, catalog);
        const existing = payload.id ? locationsFor(catalog, next).find(l => l.id === payload.id) : null;
        if (payload.id && !existing) throw new Error('Zone not found.');
        if (
          locationsFor(catalog, next).some(
            l => l.id !== existing?.id && l.name.toLowerCase() === zone.name.toLowerCase()
          )
        )
          throw new Error('A zone with that name already exists. Choose a different name.');
        if (existing)
          zone.event = payload.event === undefined ? existing.event : zone.event ? existing.event || zone.event : null;
        const weights = new Map((existing?.creatures || []).map(c => [c.speciesId, c.weight]));
        const provided = payload.creatures === undefined ? null : validateCreatures(payload.creatures, catalog);
        const matching =
          provided &&
          provided.length === zone.speciesPool.length &&
          provided.every(c => zone.speciesPool.includes(catalog.species.find(s => s.id === c.speciesId).name));
        zone.creatures = matching
          ? provided
          : zone.speciesPool
              .map(name => catalog.species.find(s => s.name === name))
              .map(s => ({ speciesId: s.id, weight: weights.get(s.id) ?? catalog.spawning.tierWeights[s.rarityTier] }));
        zone.speciesPool = zone.creatures.map(c => catalog.species.find(s => s.id === c.speciesId).name);
        if (zone.enabled && !zone.creatures.some(c => Math.abs(c.weight) > 0))
          throw new Error('An open zone needs at least one species with a nonzero weight.');
        const override = next.customLocations.find(l => l.id === payload.id);
        if (override) Object.assign(override, zone, { custom: existing.custom });
        else if (existing)
          next.customLocations.push({ ...existing, ...zone, custom: existing.custom, id: existing.id });
        else next.customLocations.push({ ...zone, id: `zone-${randomUUID()}` });
      } else if (type === 'save-traits') {
        const existing = catalog.species.find(s => s.id === payload.id);
        if (!existing) throw new Error('Species not found.');
        const validated = validateDefinition('species', { ...existing, traits: payload.traits });
        Object.assign(existing, { traits: validated.traits, traitsComplete: validated.traitsComplete });
      } else if (type === 'save-definition') {
        const { kind, id } = payload;
        let values = payload.values;
        const cosmicEye = kind === 'eyes' && catalog.eyes.find(eye => eye.id === id && isCosmicEye(eye));
        if (cosmicEye) values = { ...values, cosmicType: cosmicEye.cosmicType };
        const existing = id ? catalog[kind]?.find(d => d.id === id) : null;
        // Mutation identifiers are generated on creation and remain stable through edits.
        const input = ['mutations', 'species'].includes(kind)
          ? {
              ...values,
              systemId: existing?.systemId || randomUUID(),
              ...(kind === 'species' ? { attributes: values.attributes ?? existing?.attributes ?? {} } : {})
            }
          : values;
        const definition = validateDefinition(
          kind,
          kind === 'species' && input.traits === undefined
            ? { ...input, traits: catalog.species.find(s => s.id === id)?.traits || {} }
            : input
        );
        if (id && !existing) throw new Error('Definition not found.');
        if (kind === 'siteThemes' && id === 'default')
          throw new Error('The original theme is preserved. Duplicate it to customize a copy.');
        if (
          catalog[kind].some(
            d =>
              d.id !== id &&
              d.name.toLowerCase() === definition.name.toLowerCase() &&
              (kind !== 'mutations' || d.type === definition.type) &&
              (kind !== 'eyes' || (d.cosmicType || 'Normal') === (definition.cosmicType || 'Normal'))
          )
        )
          throw new Error('That name is already in use. Choose another name.');
        const updated = { ...existing, ...definition, id: existing?.id || `${kind}-${randomUUID()}` };
        if (existing) catalog[kind] = catalog[kind].map(d => (d.id === id ? updated : d));
        else catalog[kind].push(updated);
        // Rewrite future pool references as one atomic transaction; horse snapshots stay intact.
        if (existing && existing.name !== updated.name && ['species', 'palettes'].includes(kind)) {
          const pool = kind === 'species' ? 'speciesPool' : 'palettePool';
          for (const location of [...catalog.locations, ...next.customLocations]) {
            location[pool] = location[pool].map(name => (name === existing.name ? updated.name : name));
          }
        }
        if (kind === 'mutations' && !['Cosmic', 'Mutated'].includes(updated.type))
          for (const cosmic of catalog.spawning.cosmic) if (cosmic.mutationId === updated.id) cosmic.chance = 0;
        if (
          registryKinds.includes(kind) &&
          catalog[kind].some(d => d.id !== updated.id && d.systemId === updated.systemId)
        )
          throw new Error('That system ID is already in use.');
        if (kind === 'palettes' && updated.speciesIds.some(sid => !catalog.species.some(s => s.id === sid)))
          throw new Error('Choose registered species for this palette.');
        if (kind === 'species') {
          const locations = [...catalog.locations, ...next.customLocations];
          if (
            values.zoneIds !== undefined &&
            (!Array.isArray(values.zoneIds) || values.zoneIds.some(zid => !locations.some(z => z.id === zid)))
          )
            throw new Error('Choose registered zones.');
          for (const zone of locations) {
            const included =
              values.zoneIds === undefined ? zone.speciesPool.includes(updated.name) : values.zoneIds.includes(zone.id);
            zone.speciesPool = zone.speciesPool.filter(name => name !== updated.name);
            const previous = (zone.creatures || []).find(c => c.speciesId === updated.id);
            zone.creatures = (zone.creatures || []).filter(c => c.speciesId !== updated.id);
            if (included) {
              zone.speciesPool.push(updated.name);
              zone.creatures.push({
                speciesId: updated.id,
                weight:
                  previous && existing?.rarityTier === updated.rarityTier
                    ? previous.weight
                    : catalog.spawning.tierWeights[updated.rarityTier]
              });
            }
            if (!zone.speciesPool.length) zone.enabled = false;
          }
        }
        if (existing && kind === 'themes' && existing.name !== updated.name) {
          for (const item of catalog.items) if (item.theme === existing.name) item.theme = updated.name;
        }
        next.library = catalog;
      } else if (type === 'website-theme') {
        if (!catalog.siteThemes.some(t => t.id === payload.id)) throw new Error('Choose an available website theme.');
        if (payload.mode !== undefined && !['dark', 'light'].includes(payload.mode))
          throw new Error('Choose dark or light mode.');
        next.settings.websiteTheme = payload.id;
        next.settings.websiteThemeMode = payload.mode || 'dark';
      } else if (type === 'developer-edit-mode') {
        if (typeof payload.enabled !== 'boolean') throw new Error('Choose whether edit mode is enabled.');
        next.settings.developerEditMode = payload.enabled;
      } else if (type === 'save-copy') {
        const entries = validateCopyPatch(payload);
        next.pageCopy ??= {};
        const page = { ...(next.pageCopy[payload.scope] || {}) };
        for (const [key, text] of Object.entries(entries)) {
          if (text === null) delete page[key];
          else page[key] = text;
        }
        if (Object.keys(page).length) next.pageCopy[payload.scope] = page;
        else delete next.pageCopy[payload.scope];
      } else if (type === 'backup') {
        await writeDurable(
          join(this.directory, 'backups', `save-${Date.now()}-${randomUUID().slice(0, 8)}.json`),
          JSON.stringify(next, null, 2) + '\n',
          { exclusive: true }
        );
      } else throw new Error('Unknown action.');
      synchronizeCosmicPalettes(horseRecords(next), catalog);
      const previousHorses = new Map(horseRecords(this.state).map(horse => [horse.id, horse]));
      for (const horse of horseRecords(next)) {
        migrateHorseVersion(horse);
        const before = previousHorses.get(horse.id);
        if (before && JSON.stringify(before) !== JSON.stringify(horse)) {
          horse.revision = (before.revision || 1) + 1;
          horse.updatedAt = new Date().toISOString();
        }
      }
      if (
        [
          'rarity-settings',
          'save-traits',
          'save-definition',
          'delete-definition',
          'save-zone',
          'delete-zone',
          'spawn-settings'
        ].includes(type) ||
        (type === 'settings' && payload.ALLOW_DUPLICATE_MUTATIONS !== undefined)
      ) {
        const settings = catalog.spawning || defaultSpawnSettings;
        const zones = locationsFor(catalog, next).map(z => ({ ...z, creatures: zoneCreatures(z, catalog, settings) }));
        let committed;
        await this.files.commit({ catalog, zones, settings }, async revision => {
          committed = await this.files.read(catalog);
          next.configurationRevision = revision;
          await this.persist(next);
        });
        this.configuration = committed;
      } else await this.persist(next);
      this.state = next;
      if (type === 'apply-horse-updates') this.horseUpdatePreviews.delete(payload.token);
      // Each action builds a fresh copy, so the stored state is returned without cloning it again.
      // Callers only serialize it and must not mutate it.
      return this.state;
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
