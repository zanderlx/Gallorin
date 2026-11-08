import { html, raw, icon, number, setHTML } from './ui.js';
import { inventorySections } from './inventory-sections.js';

const itemIcons = { lasso: '➰', apple: '🍎', carrot: '🥕', flower: '🌼', berry: '🫐', peach: '🍑' };
const view = { sort: 'name', direction: 'asc' };

export function inventoryItems(items = [], category = 'all', sort = 'name', direction = 'asc') {
  return items
    .filter(item => item && typeof item.name === 'string' && Number.isSafeInteger(item.count) && item.count > 0)
    .filter(item => category === 'all' || item.type === category)
    .sort((a, b) => {
      const result = (sort === 'count' ? a.count - b.count : 0) || a.name.localeCompare(b.name);
      return direction === 'desc' ? -result : result;
    });
}

export function inventoryCards(items, category, sort = 'name', direction = 'asc') {
  const entries = inventoryItems(items, category, sort, direction);
  return entries.length
    ? html`${entries.map(item => html`<article class="inventory-card panel"><div class="inventory-item-icon" aria-hidden="true">${itemIcons[item.id] || raw(icon('bag'))}</div><div class="inventory-item-details"><h2>${item.name}</h2><span class="inventory-item-type">${inventorySections.find(([path]) => path === 'inventory/' + item.type)?.[1] || item.type}</span></div><span class="inventory-item-count" aria-label="Count: ${item.count}">×${number(item.count)}</span></article>`)}`
    : html`<p class="inventory-empty" role="status">Inventory is empty</p>`;
}

export function inventoryPage(route, state) {
  const category = route.split('/')[1];
  return String(
    html`<nav class="inventory-tabs" aria-label="Inventory sections">${inventorySections.map(([path, label]) => html`<a href="#${path}" ${path === route ? raw('aria-current="page"') : ''}>${label}</a>`)}</nav><div class="page-heading"><h1>${inventorySections.find(([path]) => path === route)?.[1] || 'Inventory'}</h1></div><div class="collection-toolbar inventory-toolbar"><div class="inventory-summary" role="status">Item types: ${inventoryItems(state.inventory, category).length}</div><div class="inventory-sort-controls"><label class="sort-field">Sort By <select id="inventory-sort"><option value="name" ${view.sort === 'name' ? raw('selected') : ''}>Name</option><option value="count" ${view.sort === 'count' ? raw('selected') : ''}>Count</option></select></label><button type="button" class="icon-button inventory-sort-direction" data-inventory-direction="${view.direction}" aria-label="${view.direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending'}" title="${view.direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending'}">${raw(icon('arrow'))}</button></div></div><div id="inventory-grid" class="inventory-grid">${inventoryCards(state.inventory, category, view.sort, view.direction)}</div>`
  );
}

export function bindInventory(root, route, state) {
  const select = root.querySelector('#inventory-sort');
  const button = root.querySelector('[data-inventory-direction]');
  if (!select || !button) return;
  const update = () => {
    button.dataset.inventoryDirection = view.direction;
    const label =
      view.direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending';
    button.setAttribute('aria-label', label);
    button.title = label;
    setHTML(
      root.querySelector('#inventory-grid'),
      inventoryCards(state.inventory, route.split('/')[1], view.sort, view.direction)
    );
  };
  select.addEventListener('change', () => {
    view.sort = select.value;
    update();
  });
  button.addEventListener('click', () => {
    view.direction = view.direction === 'asc' ? 'desc' : 'asc';
    update();
  });
}
