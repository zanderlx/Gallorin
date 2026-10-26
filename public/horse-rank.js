const specialTypes = new Set(['solar', 'lunar', 'heavenly', 'void', 'astral']);
const normalized = value =>
  String(value || '')
    .trim()
    .toLowerCase();

export function horseCardRank(horse, catalog) {
  const special =
    specialTypes.has(normalized(horse.specialSpawn)) ||
    (horse.mutations || []).some(m => specialTypes.has(normalized(typeof m === 'string' ? m : m?.name)));
  if (special) return { key: 'cosmic', label: 'Cosmic' };
  // Current species definitions govern ranks; snapshots keep unknown/deleted species readable.
  const species =
    catalog?.species?.find(s => s.id === horse.speciesId) || catalog?.species?.find(s => s.name === horse.species);
  const event = species ? species.event : horse.speciesEvent;
  const tier = species?.rarityTier ?? horse.rarityTier;
  if (tier === 0) return { key: 'cosmic', label: 'Cosmic' };
  if (event) return { key: 'none', label: 'Event' };
  if (tier === 1) return { key: 'ultra-rare', label: 'Ultra Rare' };
  if (tier === 2) return { key: 'rare', label: 'Rare' };
  if (tier === 3) return { key: 'uncommon', label: 'Uncommon' };
  return { key: 'common', label: 'Common' };
}
