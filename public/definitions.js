import { rarityTier, systemID, validateThresholds, defaultSpeciesTiers } from './spawn-config.js';
import { withCosmicEyes, cosmicEyeColors } from './cosmic-types.js';
import { mutatedPalettes } from './mutated-palettes.js';
export const regions = ['Coat Top', 'Coat Bottom', 'Hair', 'Hoof', 'Nose', 'Sock', 'Keratin', 'Paint', 'Pattern'];
export const traitCategories = ['Mane', 'Tail', 'Pattern', 'Paint', 'Cosmetic', 'Keratin', 'Ears', 'Whiskers'];
export const themeTokens = [
  'bg',
  'panel',
  'panel-deep',
  'sidebar',
  'border',
  'gold',
  'gold-soft',
  'text',
  'muted',
  'burgundy',
  'green'
];
export const defaultThemes = [
  {
    id: 'default',
    name: 'Gallorin Original',
    description: 'The original mahogany, burgundy, and antique gold.',
    scheme: 'dark',
    colors: [
      '#1d1b18',
      '#28231f',
      '#211d1a',
      '#211b19',
      '#463c30',
      '#d2b477',
      '#a58a5d',
      '#eee5d6',
      '#b6aa98',
      '#6d343c',
      '#a3bd91'
    ]
  },
  {
    id: 'pastel-rose',
    name: 'Rosewater',
    description: 'Blush pink, warm ivory, and dusty rose.',
    scheme: 'light',
    colors: [
      '#fcf1f3',
      '#fffafb',
      '#f5e3e8',
      '#f4dce3',
      '#d8b7c2',
      '#78435b',
      '#86546a',
      '#3d2932',
      '#70515e',
      '#8a4965',
      '#416349'
    ]
  },
  {
    id: 'pastel-lavender',
    name: 'Lavender Cloud',
    description: 'Lilac clouds and soft plum accents.',
    scheme: 'light',
    colors: [
      '#f4f0fc',
      '#fcfaff',
      '#eae1f6',
      '#e5daf4',
      '#c8b7df',
      '#65447f',
      '#735689',
      '#332b43',
      '#655773',
      '#74518d',
      '#46684e'
    ]
  },
  {
    id: 'pastel-mint',
    name: 'Mint Meadow',
    description: 'Pale sage, cream, and eucalyptus.',
    scheme: 'light',
    colors: [
      '#eff8f1',
      '#fbfefa',
      '#e0eee3',
      '#d9eadf',
      '#abc8b4',
      '#346451',
      '#4c705d',
      '#293e32',
      '#506b58',
      '#3c705b',
      '#3f6743'
    ]
  },
  {
    id: 'pastel-sky',
    name: 'Bluebell Morning',
    description: 'Powder blue with soft periwinkle accents.',
    scheme: 'light',
    colors: [
      '#f0f6fc',
      '#fafcff',
      '#e1ecf6',
      '#dbe7f4',
      '#b2c5df',
      '#3e5e88',
      '#536d8d',
      '#29384b',
      '#52677f',
      '#4d6591',
      '#43684d'
    ]
  },
  {
    id: 'pastel-peach',
    name: 'Peach Blossom',
    description: 'Apricot cream and warm terracotta.',
    scheme: 'light',
    colors: [
      '#fff4ed',
      '#fffcf8',
      '#f6e7da',
      '#f3dfcf',
      '#d4b49c',
      '#75452e',
      '#805037',
      '#402e25',
      '#6b5040',
      '#87492e',
      '#426448'
    ]
  },
  {
    id: 'pastel-lemon',
    name: 'Lemon Chiffon',
    description: 'Butter yellow and honeyed gold.',
    scheme: 'light',
    colors: [
      '#fffbee',
      '#fffef8',
      '#f3ecd5',
      '#efe6ca',
      '#c9ba8c',
      '#67551e',
      '#705e29',
      '#383121',
      '#62583d',
      '#75601e',
      '#436243'
    ]
  },
  {
    id: 'pastel-aqua',
    name: 'Sea Glass',
    description: 'Soft turquoise and lagoon teal.',
    scheme: 'light',
    colors: [
      '#effafa',
      '#faffff',
      '#deeeee',
      '#d5e9e8',
      '#a9c7c5',
      '#285e60',
      '#39676a',
      '#243b3d',
      '#496568',
      '#28686b',
      '#426649'
    ]
  },
  {
    id: 'pastel-slate',
    name: 'Silver Mist',
    description: 'Pearl gray and smoky indigo.',
    scheme: 'light',
    colors: [
      '#f4f5fa',
      '#fdfdff',
      '#e7e9f0',
      '#dfe2ed',
      '#bac0d1',
      '#4d5474',
      '#5c627c',
      '#2e3242',
      '#596078',
      '#505c83',
      '#44654c'
    ]
  }
].map(t => ({ ...t, colors: Object.fromEntries(themeTokens.map((key, i) => [key, t.colors[i]])) }));
export const baseAtmospheres = [
  {
    id: 'forest',
    name: 'Evergreen forest',
    encounterTitle: 'Among the whispering trees',
    tint: '#426553',
    description: 'Soft moss and fireflies beneath an ancient canopy.'
  },
  {
    id: 'autumn',
    name: 'Amber woodland',
    encounterTitle: 'Beyond the amber leaves',
    tint: '#7a3b22',
    description: 'Copper leaves drift between warm lanterns.'
  },
  {
    id: 'moonlit',
    name: 'Moonlit grove',
    encounterTitle: 'Under a sky full of wishes',
    tint: '#49375f',
    description: 'Silver moonlight and quiet, starlit magic.'
  },
  {
    id: 'frost',
    name: 'Frosted forest',
    encounterTitle: 'Where the silver branches shimmer',
    tint: '#87a8bb',
    description: 'Gentle hoofprints wind through glittering frost.'
  }
];
export const definitionKinds = {
  species: 'Species',
  palettes: 'Palettes',
  eyes: 'Eye colors',
  personalities: 'Personalities',
  mutations: 'Mutations',
  items: 'Items & potions',
  themes: 'Item themes',
  atmospheres: 'Zone atmospheres',
  siteThemes: 'Themes'
};
export function normalizeCatalog(source) {
  const catalog = structuredClone(source);
  for (const kind of Object.keys(definitionKinds)) {
    const entries =
      catalog[kind] || (kind === 'atmospheres' ? baseAtmospheres : kind === 'siteThemes' ? defaultThemes : []);
    catalog[kind] = entries.map((entry, i) => {
      const item = typeof entry === 'string' ? { name: entry } : entry;
      return { ...item, id: item.id || `${kind}-${i}`, description: item.description || '' };
    });
  }
  catalog.species = catalog.species.map(s => ({
    ...s,
    rarityTier: rarityTier(s),
    attributes: s.attributes || {},
    traits: s.traits || catalog.traits?.[s.name] || Object.fromEntries(traitCategories.map(k => [k, []]))
  }));
  catalog.siteThemes = catalog.siteThemes.map(theme =>
    theme.id === 'default' && theme.name === 'Aetherion Original' ? { ...theme, name: 'Gallorin Original' } : theme
  );
  catalog.personalities = catalog.personalities.map(p => ({
    ...p,
    systemId: p.systemId || p.id,
    behaviorTags: p.behaviorTags || []
  }));
  catalog.palettes = catalog.palettes.map(p => ({
    ...p,
    global: p.global ?? !p.speciesIds?.length,
    speciesIds: p.speciesIds || [],
    assetSkins: p.assetSkins || []
  }));
  catalog.eyes = withCosmicEyes(
    catalog.eyes.map(p => ({ ...p, textureId: p.textureId || '', layers: p.layers || [] }))
  );
  catalog.traits = Object.fromEntries(catalog.species.map(s => [s.name, s.traits]));
  catalog.locations = catalog.locations.map(l => ({
    ...l,
    atmosphere: l.atmosphere || (l.id === 'hallowhoof' ? 'autumn' : 'forest'),
    speciesPool:
      l.speciesPool ||
      (l.id === 'hallowhoof'
        ? ['Ghoulsteed', 'Hauntmare', 'Calaverita']
        : catalog.species
            .filter(s => l.id !== 'aetherion' || Object.hasOwn(defaultSpeciesTiers, s.name.toLowerCase()))
            .map(s => s.name)),
    palettePool:
      l.palettePool ||
      (l.id === 'hallowhoof' ? ['Pumpkin', 'Ghoulish', 'Monochrome'] : ['Natural Gold', 'Amethyst', 'Emerald'])
  }));
  return catalog;
}
export function catalogFor(original, state) {
  const catalog = normalizeCatalog(state.library || original);
  for (const palette of mutatedPalettes)
    if (
      !catalog.palettes.some(p => p.id === palette.id || p.name.toLowerCase() === palette.name.toLowerCase()) &&
      !state.deletedBuiltinPalettes?.includes(palette.id)
    )
      catalog.palettes.push(structuredClone(palette));
  for (const theme of defaultThemes)
    if (!catalog.siteThemes.some(t => t.id === theme.id) && !state.deletedWebsiteThemes?.includes(theme.id))
      catalog.siteThemes.push(structuredClone(theme));
  return catalog;
}
export function draftDefinition(kind) {
  return {
    name: '',
    description: '',
    rarityTier: 4,
    attributes: {},
    speciesIds: [],
    assetSkins: [],
    textureId: '',
    layers: [],
    behaviorTags: [],
    systemId: '',
    thresholds: {},
    event: '',
    restriction: '',
    group: 'Custom',
    rarity: kind === 'eyes' ? 'Common' : 'Custom',
    type: kind === 'mutations' ? 'Standard' : 'Accessory',
    price: 0,
    theme: '',
    weight: 0,
    sizeShift: 0,
    global: true,
    traits: Object.fromEntries(traitCategories.map(k => [k, []])),
    colors:
      kind === 'palettes'
        ? Object.fromEntries(regions.map(r => [r, '#d6b4df']))
        : kind === 'siteThemes'
          ? { ...defaultThemes[1].colors }
          : ['#8a689e'],
    scheme: 'light',
    encounterTitle: 'A new companion awaits',
    tint: '#8c709f'
  };
}
export function validateDefinition(kind, input) {
  if (!Object.hasOwn(definitionKinds, kind) || !input || typeof input !== 'object')
    throw new Error('Choose a valid definition to edit.');
  const text = (key, max = 100, required = false) => {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
      throw new Error(`${key} must ${required ? 'contain text and ' : ''}be ${max} characters or fewer.`);
    return value.trim();
  };
  const color = value => {
    if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))
      throw new Error('Enter each color as a six-digit hex value, such as #D6B4DF.');
    return value.toUpperCase();
  };
  const number = (key, nullable = false) => {
    if (nullable && (input[key] === null || input[key] === '')) return null;
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 1000000)
      throw new Error(`${key} must be between 0 and 1,000,000.`);
    return input[key];
  };
  const result = { name: text('name', 80, true), description: text('description', 4000) };
  const strings = (key, max = 100) => {
    const values = input[key] ?? [];
    if (
      !Array.isArray(values) ||
      values.length > 10000 ||
      values.some(v => typeof v !== 'string' || !v.trim() || v.length > max)
    )
      throw new Error(`${key} must contain valid text entries.`);
    return [...new Set(values.map(v => v.trim()))];
  };
  if (['species', 'palettes', 'eyes', 'mutations', 'personalities'].includes(kind)) {
    result.systemId =
      text('systemId', 100) ||
      (kind === 'mutations' ? `${systemID(input.type || 'Standard')}-${systemID(result.name)}` : systemID(result.name));
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(result.systemId))
      throw new Error('System IDs use letters, digits, underscores, and hyphens.');
  }
  if (kind === 'species') {
    const tier = input.rarityTier ?? 4;
    if (!Number.isInteger(tier) || tier < 0 || tier > 4)
      throw new Error('Choose a valid rarity from Common through Cosmic.');
    result.rarityTier = tier;
    const attributes = input.attributes ?? {};
    if (
      !attributes ||
      typeof attributes !== 'object' ||
      Array.isArray(attributes) ||
      Object.keys(attributes).length > 30 ||
      Object.entries(attributes).some(
        ([k, v]) =>
          !/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(k) ||
          ['constructor', 'prototype', '__proto__'].includes(k) ||
          !Number.isFinite(v)
      )
    )
      throw new Error('Base attributes must be named finite numbers.');
    result.attributes = structuredClone(attributes);
    const traits = input.traits;
    if (!traits || typeof traits !== 'object' || Array.isArray(traits) || Object.keys(traits).length > 30)
      throw new Error('Provide up to 30 trait categories.');
    const entries = Object.entries(traits).map(([key, values]) => {
      if (
        !key.trim() ||
        key.length > 60 ||
        ['__proto__', 'constructor', 'prototype'].includes(key) ||
        !Array.isArray(values) ||
        values.length > 100 ||
        values.some(v => typeof v !== 'string' || !v.trim() || v.length > 100)
      )
        throw new Error('Trait categories need a name and up to 100 trait names of 100 characters or fewer.');
      return [key.trim(), [...new Set(values.map(v => v.trim()))]];
    });
    result.traits = Object.fromEntries(entries);
    result.traitsComplete = !!(result.traits.Mane?.length && result.traits.Tail?.length);
    result.event = text('event') || null;
    result.restriction = text('restriction') || null;
  }
  if (kind === 'palettes') {
    if (
      input.variationPercent != null &&
      (typeof input.variationPercent !== 'number' ||
        !Number.isFinite(input.variationPercent) ||
        input.variationPercent < 0 ||
        input.variationPercent > 100)
    )
      throw new Error('Color variance must be between 0 and 100%.');
    result.variationPercent = input.variationPercent ?? null;
    result.speciesIds = strings('speciesIds');
    result.assetSkins = strings('assetSkins', 200);
    if (input.global !== undefined && typeof input.global !== 'boolean')
      throw new Error('Choose whether the palette is global.');
    result.global = input.global ?? !result.speciesIds.length;
    result.colors = Object.fromEntries(regions.map(r => [r, color(input.colors?.[r])]));
    Object.assign(result, { group: text('group', 80, true), complete: true });
  }
  if (kind === 'eyes') {
    if (!Array.isArray(input.colors) || !input.colors.length || input.colors.length > 6)
      throw new Error('Choose one to six eye colors.');
    result.colors = input.colors.map(color);
    result.rarity = text('rarity', 60, true);
    if (input.cosmicType) {
      if (!Object.hasOwn(cosmicEyeColors, input.cosmicType)) throw new Error('Choose a valid Cosmic horse type.');
      result.cosmicType = input.cosmicType;
      result.name = input.cosmicType;
      result.rarity = 'Cosmic';
      result.systemId = `cosmic-eye-${input.cosmicType.toLowerCase()}`;
    } else if (result.rarity === 'Cosmic') throw new Error('Cosmic eyes are reserved for Cosmic artwork.');
    result.textureId = text('textureId', 200) || `eye-${systemID(result.name)}`;
    if (!Array.isArray(input.layers ?? []) || (input.layers || []).length > 20)
      throw new Error('Provide up to 20 eye layers.');
    result.layers = (input.layers || []).map((layer, i) => {
      if (
        !layer ||
        typeof layer !== 'object' ||
        Array.isArray(layer) ||
        typeof layer.textureId !== 'string' ||
        layer.textureId.length > 200 ||
        (layer.opacity !== undefined && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1))
      )
        throw new Error('Eye layers need textureId and optional opacity from 0 to 1.');
      return {
        id: String(layer.id || `layer-${i + 1}`).slice(0, 100),
        textureId: layer.textureId,
        ...(layer.color ? { color: color(layer.color) } : {}),
        opacity: layer.opacity ?? 1
      };
    });
  }
  if (kind === 'mutations') {
    result.emoji = text('emoji', 32);
    Object.assign(result, {
      type: text('type', 60, true),
      weight: number('weight', true),
      thresholds: validateThresholds(input.thresholds)
    });
    result.sizeShift = input.sizeShift ?? (result.name === 'Dwarfism' ? -1 : result.name === 'Gigantism' ? 1 : 0);
    if (!Number.isInteger(result.sizeShift) || Math.abs(result.sizeShift) > 10)
      throw new Error('Size shift must be an integer between -10 and 10.');
    if (result.weight !== null && !Number.isInteger(result.weight))
      throw new Error('Mutation weights must be whole ticket counts.');
  }
  if (kind === 'personalities') {
    result.behaviorTags = strings('behaviorTags');
    result.emoji = text('emoji', 32);
  }
  if (kind === 'items')
    Object.assign(result, {
      type: text('type', 60, true),
      rarity: text('rarity', 60, true),
      price: number('price'),
      theme: text('theme')
    });
  if (kind === 'themes') result.event = text('event');
  if (kind === 'atmospheres')
    Object.assign(result, { tint: color(input.tint), encounterTitle: text('encounterTitle', 100, true) });
  if (kind === 'siteThemes') {
    if (!['light', 'dark'].includes(input.scheme)) throw new Error('Choose light or dark interface controls.');
    Object.assign(result, {
      scheme: input.scheme,
      colors: Object.fromEntries(themeTokens.map(k => [k, color(input.colors?.[k])]))
    });
    for (const mode of ['dark', 'light'])
      if (input[`${mode}Colors`])
        result[`${mode}Colors`] = Object.fromEntries(themeTokens.map(k => [k, color(input[`${mode}Colors`][k])]));
  }
  return result;
}
