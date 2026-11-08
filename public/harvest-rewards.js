// Split each food total by rarity, rounding while conserving the total quantity.
export const HARVESTS = {
  apple: [
    { id: 'apple', name: 'Red Apples', rarity: 'common', chance: 0.8, emoji: '🍎' },
    { id: 'green-apple', name: 'Green Apples', rarity: 'rare', chance: 0.17, emoji: '🍏' },
    { id: 'pink-apple', name: 'Pink Apples', rarity: 'epic', chance: 0.03, shape: 'apple', color: '#f39ac3' }
  ],
  carrot: [
    { id: 'carrot', name: 'Orange Carrots', rarity: 'common', chance: 0.8, emoji: '🥕' },
    { id: 'white-carrot', name: 'White Carrots', rarity: 'rare', chance: 0.17, shape: 'carrot', color: '#f4e9cc' },
    { id: 'purple-carrot', name: 'Purple Carrots', rarity: 'epic', chance: 0.03, shape: 'carrot', color: '#9c58bd' }
  ],
  flower: [
    { id: 'pansy', name: 'Pansies', rarity: 'common', chance: 0.4, shape: 'pansy', color: '#afa0d6' },
    { id: 'daylily', name: 'Daylilies', rarity: 'common', chance: 0.4, shape: 'lily', color: '#eab273' },
    { id: 'vibrant-daylily', name: 'Vibrant Daylilies', rarity: 'rare', chance: 0.1, shape: 'lily', color: '#ff663d' },
    { id: 'bright-pansy', name: 'Bright Pansies', rarity: 'rare', chance: 0.1, shape: 'pansy', color: '#bc55f2' }
  ],
  berry: [
    { id: 'strawberry', name: 'Strawberries', rarity: 'common', chance: 0.8, emoji: '🍓' },
    { id: 'mint', name: 'Mint', rarity: 'rare', chance: 0.17, emoji: '🌿' },
    { id: 'pineberry', name: 'Pineberries', rarity: 'epic', chance: 0.03, shape: 'berry', color: '#fff2d8' }
  ],
  peach: [
    { id: 'peach', name: 'Peaches', rarity: 'common', chance: 0.97, emoji: '🍑' },
    { id: 'white-peach', name: 'White Peaches', rarity: 'epic', chance: 0.03, shape: 'peach', color: '#fff0e3' }
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
