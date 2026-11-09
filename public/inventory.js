import { harvestIcon } from './harvest-icons.js';
import { HARVESTS } from './harvest-rewards.js';
import { html, raw, icon, number, setHTML } from './ui.js';
import { inventorySections } from './inventory-sections.js';

const view = { sort: 'name', direction: 'asc', query: '', family: '' };
const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'cosmic', 'none'];
const familyLabels = { apple: 'Apples', carrot: 'Carrots', flower: 'Flowers', berry: 'Berries', peach: 'Peaches' };
const title = value => value.charAt(0).toUpperCase() + value.slice(1);
export function inventoryFamily(item) {
  return (
    Object.entries(HARVESTS).find(
      ([key, entries]) => key === item.id || entries.some(entry => entry.id === item.id)
    )?.[0] || item.type
  );
}
const rarity = item => item.rarity || 'none';
export function inventoryItems(
  items = [],
  category = 'all',
  sort = 'name',
  direction = 'asc',
  query = '',
  family = ''
) {
  return items
    .filter(item => item && typeof item.name === 'string' && Number.isSafeInteger(item.count) && item.count > 0)
    .filter(item => (category === 'all' || item.type === category) && (!family || inventoryFamily(item) === family))
    .filter(item =>
      `${item.name} ${rarity(item)} ${familyLabels[inventoryFamily(item)] || inventoryFamily(item)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
    .sort((a, b) => {
      const order =
        sort === 'count'
          ? a.count - b.count
          : sort === 'rarity'
            ? rarities.indexOf(rarity(a)) - rarities.indexOf(rarity(b))
            : sort === 'type'
              ? (familyLabels[inventoryFamily(a)] || inventoryFamily(a)).localeCompare(
                  familyLabels[inventoryFamily(b)] || inventoryFamily(b)
                )
              : 0;
      return (direction === 'desc' ? -1 : 1) * (order || a.name.localeCompare(b.name));
    });
}
const card = (item, category) =>
  html`<article class="inventory-card panel"><div class="inventory-item-icon" aria-hidden="true">${harvestIcon(item.id) || (item.id === 'lasso' ? '➰' : raw(icon('bag')))}</div><div class="inventory-item-details"><h2 title="${item.name}">${item.name}</h2>${category === 'all' || item.rarity ? html`<span class="inventory-item-meta">${category === 'all' ? html`<span class="inventory-item-type">${inventorySections.find(([path]) => path === 'inventory/' + item.type)?.[1] || item.type}</span>` : ''}${category === 'all' && item.rarity ? ' · ' : ''}${item.rarity ? html`<span class="inventory-item-rarity">${title(item.rarity)}</span>` : ''}</span>` : ''}</div><span class="inventory-item-count" aria-label="Count: ${item.count}">×${number(item.count)}</span></article>`;
export function inventoryCards(items, category, sort = 'name', direction = 'asc', query = '', family = '') {
  const entries = inventoryItems(items, category, sort, direction, query, family);
  if (!entries.length)
    return html`<p class="inventory-empty" role="status">${query || family ? 'No items match your search' : 'Inventory is empty'}</p>`;
  if (!['rarity', 'type'].includes(sort))
    return html`<div class="inventory-grid">${entries.map(item => card(item, category))}</div>`;
  const group = item => (sort === 'rarity' ? rarity(item) : inventoryFamily(item));
  return html`${[...new Set(entries.map(group))].map(key => html`<section class="eye-rarity-section inventory-section"><h2>${sort === 'rarity' ? (key === 'none' ? 'No rarity' : title(key)) : familyLabels[key] || title(key)}</h2><div class="inventory-grid">${entries.filter(item => group(item) === key).map(item => card(item, category))}</div></section>`)}`;
}
export function inventoryPage(route, state) {
  const category = route.split('/')[1];
  const families = [...new Set(inventoryItems(state.inventory, category).map(inventoryFamily))].sort((a, b) =>
    (familyLabels[a] || a).localeCompare(familyLabels[b] || b)
  );
  return String(
    html`<nav class="inventory-tabs" aria-label="Inventory sections">${inventorySections.map(([path, label]) => html`<a href="#${path}" ${path === route ? raw('aria-current="page"') : ''}>${label}</a>`)}</nav><div class="page-heading inventory-heading"><h1>${inventorySections.find(([path]) => path === route)?.[1] || 'Inventory'}</h1></div><div class="eye-grid-controls inventory-controls"><label class="zone-field"><input id="inventory-search" type="search" placeholder="Search..." aria-label="Search inventory" value="${view.query}"></label><label class="zone-field">Type<select id="inventory-type"><option value="">All Types</option>${families.map(key => html`<option value="${key}" ${view.family === key ? raw('selected') : ''}>${familyLabels[key] || title(key)}</option>`)}</select></label><div class="definition-sort-controls"><label class="zone-field">Sort By<select id="inventory-sort">${['name', 'count', 'rarity', 'type'].map(key => html`<option value="${key}" ${view.sort === key ? raw('selected') : ''}>${title(key)}</option>`)}</select></label><button type="button" class="icon-button sort-direction" data-inventory-direction="${view.direction}" data-direction="${view.direction}" aria-label="${view.direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending'}" title="${view.direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending'}">${raw(icon('arrow'))}</button></div></div><div id="inventory-grid">${inventoryCards(state.inventory, category, view.sort, view.direction, view.query, families.includes(view.family) ? view.family : '')}</div>`
  );
}
export function bindInventory(root, route, state) {
  const select = root.querySelector('#inventory-sort'),
    button = root.querySelector('[data-inventory-direction]'),
    search = root.querySelector('#inventory-search'),
    family = root.querySelector('#inventory-type');
  if (!select || !button) return;
  view.family = family.value;
  const update = () => {
    button.dataset.inventoryDirection = button.dataset.direction = view.direction;
    const label =
      view.direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending';
    button.setAttribute('aria-label', label);
    button.title = label;
    setHTML(
      root.querySelector('#inventory-grid'),
      inventoryCards(state.inventory, route.split('/')[1], view.sort, view.direction, view.query, view.family)
    );
  };
  select.addEventListener('change', () => {
    view.sort = select.value;
    update();
  });
  family.addEventListener('change', () => {
    view.family = family.value;
    update();
  });
  search.addEventListener('input', () => {
    view.query = search.value;
    update();
  });
  button.addEventListener('click', () => {
    view.direction = view.direction === 'asc' ? 'desc' : 'asc';
    update();
  });
}
