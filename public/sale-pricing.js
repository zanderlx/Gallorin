import { readHorseSkills } from './skill-progress.js';

export const defaultSaleModifiers = {
  traitBonus: 8,
  mutationBonus: 75,
  skillLevelBonus: 8,
  wingLevelBonus: 8,
  solarMultiplier: 10,
  lunarMultiplier: 15,
  heavenlyMultiplier: 20,
  voidMultiplier: 25,
  astralMultiplier: 30
};
export const saleModifierFields = [
  ['traitBonus', 'Gold Per Trait', 'Excludes Mane, Tail, and Eye Color'],
  ['mutationBonus', 'Gold Per Mutation', 'Includes each assigned mutation, including a Cosmic mutation.'],
  ['skillLevelBonus', 'Gold Per Skill Level', 'Adds gold for each Agility, Strength, Jump, and Bond level above 0.'],
  ['wingLevelBonus', 'Gold Per Wing Level', 'Adds gold for each Wing level above 0.'],
  ...['Solar', 'Lunar', 'Heavenly', 'Void', 'Astral'].map(name => [
    `${name.toLowerCase()}Multiplier`,
    `${name} Multiplier`,
    'Applied after the base price and all bonuses.'
  ])
];
export const saleModifiers = settings => ({ ...defaultSaleModifiers, ...settings.saleModifiers });

export function validateSaleModifiers(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some(key => !Object.hasOwn(defaultSaleModifiers, key))
  )
    throw new Error('Invalid sale modifiers.');
  const result = { ...defaultSaleModifiers, ...input };
  for (const [key, value] of Object.entries(result)) {
    const bonus = key.endsWith('Bonus');
    if (!Number.isFinite(value) || value < 0 || value > (bonus ? 1000000 : 1000) || (bonus && !Number.isInteger(value)))
      throw new Error(
        bonus
          ? 'Sale bonuses must be whole numbers from 0 to 1,000,000.'
          : 'Sale multipliers must be numbers from 0 to 1,000.'
      );
  }
  return result;
}

const featureName = value =>
  String(value || '')
    .trim()
    .toLowerCase();
const isAssigned = value =>
  typeof value === 'string' &&
  value.trim() &&
  !/^(none|no mutation|unassigned|awaiting species data)$/i.test(value.trim());

export function horseSalePrice(horse, settings) {
  const modifiers = validateSaleModifiers(saleModifiers(settings));
  const traitCount = Object.entries(horse.traits || {}).reduce((count, [category, values]) => {
    if (['mane', 'tail', 'eyecolor', 'eyecolors', 'eye', 'eyes'].includes(featureName(category).replace(/[\s_-]/g, '')))
      return count;
    return count + (Array.isArray(values) ? values.filter(isAssigned).length : 0);
  }, 0);
  const mutations = (horse.mutations || []).filter(m => isAssigned(typeof m === 'string' ? m : m?.name));
  const mutationCount = mutations.length;
  // Cosmic spawns normally have one special type. Imported records may have more;
  // use the strongest applicable multiplier once, without double-counting its name.
  const names = new Set([
    featureName(horse.specialSpawn),
    ...mutations.map(m => featureName(typeof m === 'string' ? m : m.name))
  ]);
  const specials = ['Solar', 'Lunar', 'Heavenly', 'Void', 'Astral'].filter(name => names.has(name.toLowerCase()));
  const special =
    specials.sort((a, b) => modifiers[`${b.toLowerCase()}Multiplier`] - modifiers[`${a.toLowerCase()}Multiplier`])[0] ||
    null;
  const multiplier = special ? modifiers[`${special.toLowerCase()}Multiplier`] : 1;
  const basePrice = settings.sellingPrice;
  const traitBonus = traitCount * modifiers.traitBonus;
  const mutationBonus = mutationCount * modifiers.mutationBonus;
  const skills = readHorseSkills(horse.skills);
  const skillLevels = ['agility', 'strength', 'jump', 'bond'].reduce((sum, name) => sum + skills[name].level, 0);
  const wingLevels = skills.wing.level;
  const skillLevelBonus = skillLevels * modifiers.skillLevelBonus;
  const wingLevelBonus = wingLevels * modifiers.wingLevelBonus;
  const subtotal = basePrice + traitBonus + mutationBonus + skillLevelBonus + wingLevelBonus;
  const total = Math.round(subtotal * multiplier);
  if (!Number.isSafeInteger(total) || total < 0)
    throw new Error('The calculated sale price is too large. Reduce the sale modifiers.');
  return {
    basePrice,
    traitCount,
    mutationCount,
    traitBonus,
    mutationBonus,
    skillLevels,
    wingLevels,
    skillLevelBonus,
    wingLevelBonus,
    subtotal,
    special,
    multiplier,
    total,
    modifiers
  };
}
