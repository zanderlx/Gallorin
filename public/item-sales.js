export const defaultItemSalePrices = { common: 1, rare: 5, epic: 15 };
export function itemSalePrices(settings = {}) {
  if (
    settings.itemSalePrices != null &&
    (typeof settings.itemSalePrices !== 'object' || Array.isArray(settings.itemSalePrices))
  )
    throw new Error('Invalid item sale prices.');
  const prices = { ...defaultItemSalePrices, ...settings.itemSalePrices };
  if (
    Object.keys(prices).some(key => !Object.hasOwn(defaultItemSalePrices, key)) ||
    Object.values(prices).some(value => !Number.isSafeInteger(value) || value < 0 || value > 1000000)
  )
    throw new Error('Item prices must be whole numbers from 0 to 1,000,000.');
  return prices;
}
export function foodSalePrice(item, settings = {}) {
  if (item?.type !== 'food') throw new Error('Only food can be sold.');
  const price = itemSalePrices(settings)[item.rarity || 'common'];
  if (price === undefined) throw new Error('This food rarity has no sale price.');
  return price;
}
