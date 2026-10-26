// @ts-check
// Shared JSDoc shapes for type checking. These stay loose on purpose: they name the
// fields the server relies on and allow the rest, so older saves still type-check.

/**
 * @typedef {object} HorseFields
 * @property {string} id
 * @property {string} species
 * @property {string} [name]
 * @property {boolean} [favorite]
 * @property {string} [notes]
 * @property {string} [caughtAt]
 * @property {string} [soldAt]
 * @property {number} [soldFor]
 * @property {unknown} [skills]
 */
/** @typedef {HorseFields & Record<string, any>} Horse */

/**
 * @typedef {object} TransactionFields
 * @property {string} id
 * @property {string} type
 * @property {number} amount
 * @property {string} at
 * @property {string} [horseId]
 */
/** @typedef {TransactionFields & Record<string, any>} Transaction */

/**
 * @typedef {object} SaveStateFields
 * @property {1} version
 * @property {number} gold
 * @property {Record<string, any>} settings
 * @property {Horse[]} horses
 * @property {Horse[]} sold
 * @property {Transaction[]} transactions
 * @property {unknown[]} inventory
 * @property {Record<string, Horse[]>} encounters
 * @property {Record<string, number>} searches
 * @property {Record<string, any>[]} [customLocations]
 * @property {string} [configurationRevision]
 * @property {number} [paletteAdditionsVersion]
 * @property {string} createdAt
 * @property {string | null} savedAt
 */
/** @typedef {SaveStateFields & Record<string, any>} SaveState */

/**
 * @typedef {object} Catalog
 * @property {Record<string, any>[]} species
 * @property {Record<string, any>[]} palettes
 * @property {Record<string, any>[]} mutations
 * @property {Record<string, any>[]} [locations]
 */

export {};
