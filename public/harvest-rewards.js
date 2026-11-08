// Split each food total by rarity, rounding while conserving the total quantity.
export const HARVESTS = {
  apple: [
    { id: 'apple', name: 'Red Apples', rarity: 'common', chance: 0.8, emoji: '🍎' },
    { id: 'green-apple', name: 'Green Apples', rarity: 'rare', chance: 0.17, emoji: '🍏' },
    {
      id: 'pink-apple',
      name: 'Pink Apples',
      rarity: 'epic',
      chance: 0.03,
      emoji: '🍎',
      filter: 'saturate(0.45) brightness(1.4) hue-rotate(325deg)'
    }
  ],
  carrot: [
    { id: 'carrot', name: 'Orange Carrots', rarity: 'common', chance: 0.8, emoji: '🥕' },
    {
      id: 'white-carrot',
      name: 'White Carrots',
      rarity: 'rare',
      chance: 0.17,
      emoji: '🥕',
      filter: 'grayscale(0.95) brightness(1.8)'
    },
    {
      id: 'purple-carrot',
      name: 'Purple Carrots',
      rarity: 'epic',
      chance: 0.03,
      emoji: '🥕',
      filter: 'hue-rotate(235deg) saturate(0.8)'
    }
  ],
  flower: [
    {
      id: 'pansy',
      name: 'Pansies',
      rarity: 'common',
      chance: 0.4,
      emoji: '🌸',
      filter: 'hue-rotate(280deg) saturate(0.65)'
    },
    {
      id: 'daylily',
      name: 'Daylilies',
      rarity: 'common',
      chance: 0.4,
      emoji: '🌼',
      filter: 'sepia(0.5) saturate(1.5)'
    },
    {
      id: 'vibrant-daylily',
      name: 'Vibrant Daylilies',
      rarity: 'rare',
      chance: 0.1,
      emoji: '🌼',
      filter: 'sepia(1) saturate(5) hue-rotate(330deg)'
    },
    {
      id: 'bright-pansy',
      name: 'Bright Pansies',
      rarity: 'rare',
      chance: 0.1,
      emoji: '🌸',
      filter: 'hue-rotate(280deg) saturate(2) brightness(1.1)'
    }
  ],
  berry: [
    { id: 'strawberry', name: 'Strawberries', rarity: 'common', chance: 0.8, emoji: '🍓' },
    { id: 'mint', name: 'Mint', rarity: 'rare', chance: 0.17, emoji: '🌿' },
    {
      id: 'pineberry',
      name: 'Pineberries',
      rarity: 'epic',
      chance: 0.03,
      emoji: '🍓',
      filter: 'grayscale(0.9) brightness(2.2)'
    }
  ],
  peach: [
    { id: 'peach', name: 'Peaches', rarity: 'common', chance: 0.97, emoji: '🍑' },
    {
      id: 'white-peach',
      name: 'White Peaches',
      rarity: 'epic',
      chance: 0.03,
      emoji: '🍑',
      filter: 'saturate(0.15) brightness(1.6)'
    }
  ]
};
export const harvestItems = Object.values(HARVESTS).flat();
export function splitHarvest(food, count) {
  const quotas = HARVESTS[food].map((item, index) => ({
    item,
    index,
    exact: count * item.chance,
    count: Math.floor(count * item.chance)
  }));
  let remainder = count - quotas.reduce((sum, row) => sum + row.count, 0);
  const order = [...quotas].sort((a, b) => b.exact - b.count - (a.exact - a.count) || a.index - b.index);
  for (const row of order) {
    if (remainder-- <= 0) break;
    row.count++;
  }
  return quotas
    .filter(row => row.count > 0)
    .map(({ item, count }) => ({ id: item.id, name: item.name, type: 'food', rarity: item.rarity, count }));
}
