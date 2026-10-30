import { brandLogo } from './brand-logo.js';
import { horseGenderIcon } from './gender-icon.js';
import { horseArt, horseHeadArt } from './art.js';
import { horseCardRank } from './horse-rank.js';
import { raritySettings } from './rarity-settings.js';
import { locationsFor } from './zones.js';

export const escapeHTML = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
// Markup that is already safe: html`` results, or trusted fragments wrapped with raw().
class SafeHTML {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}
/** Marks trusted markup (icons, generated art, other renderers' output) so html`` keeps it as is. */
export const raw = value => new SafeHTML(String(value ?? ''));
export function setHTML(target, markup) {
  if (!(markup instanceof SafeHTML)) throw new Error('Use html or raw for trusted markup.');
  target.innerHTML = String(markup);
}
export function appendHTML(target, markup) {
  if (!(markup instanceof SafeHTML)) throw new Error('Use html or raw for trusted markup.');
  target.insertAdjacentHTML('beforeend', String(markup));
}
const htmlPart = value =>
  value instanceof SafeHTML ? value.value : Array.isArray(value) ? value.map(htmlPart).join('') : escapeHTML(value);
/**
 * Tagged template that escapes every interpolated value unless it is html`` output or raw().
 * Arrays are joined and null or undefined render nothing, like a plain template would print
 * them through escapeHTML. Call String() on the result when returning it from a renderer.
 */
export const html = (strings, ...values) =>
  new SafeHTML(strings.reduce((out, text, i) => out + text + (i < values.length ? htmlPart(values[i]) : ''), ''));
export const number = value => Number(value).toLocaleString();
export const icons = {
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.5 1.5 0 0 1 1-2.8h2A4 4 0 0 0 21 11a9 9 0 0 0-9-8Z"/><circle cx="7" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="17" cy="11" r="1"/>',
  more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
  music: '<path d="M9 18V5l12-2v13M9 8l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  agility: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
  strength: '<path d="M7 12h10M3 8v8m4-10v12m10-12v12m4-10v8M3 12h4m10 0h4"/>',
  jump: '<path d="M12 20V4m-6 6 6-6 6 6M4 20h16"/>',
  wing: '<path d="M3 19C3 8 13 3 21 3c-1 9-5 17-14 17H3Zm0 0L17 7m-9 8v-5m4 1 5 1"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  edit: '<path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-5-5L3 14l-1 7Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  stable: '<path d="m3 10 9-7 9 7v11H3Z M9 21v-9h6v9M3 10h18M9 12l6 9m0-9-6 9"/>',
  town: '<path d="M3 21V9l4-3 4 3v12m2 0V3h7v18M1 21h22M6 12h2m-2 4h2m8-10h1m-1 4h1m-1 4h1"/>',
  bag: '<path d="M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  heart: '<path d="M20.5 4.8a5 5 0 0 0-7 0L12 6.3l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-9.2a5 5 0 0 0 0-7Z"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm7 0v4m-2-2h4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  reroll:
    '<path d="M20.5 8A9 9 0 0 0 5 5L3 7m0-4v4h4m-3.5 9A9 9 0 0 0 19 19l2-2m0 4v-4h-4"/><rect x="8" y="8" width="8" height="8" rx="1.5"/><path d="M10.5 10.5h.01M13.5 13.5h.01M12 12h.01" stroke-width="2.5"/>',
  shuffle: '<path d="m16 3 4 4-4 4m0 2 4 4-4 4M4 7h3c4 0 6 10 10 10h3M4 17h3c2 0 3-2 5-5m2-3c1-1 2-2 3-2h3"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m12 8 3 4-3 4-3-4Z"/>',
  leaf: '<path d="M20 3C8 2 2 8 5 15s17 6 15-12ZM5 20 16 9"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  book: '<path d="M12 7v14M12 7C9 4 5 3 3 3v14c3 0 6 1 9 4 3-3 6-4 9-4V3c-2 0-6 1-9 4Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
};
export const icon = name =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
export const groups = [
  {
    title: 'Town',
    icon: 'town',
    items: [
      ['town/gacha', 'Gacha Machine'],
      ['town/spirit', 'Spirit Tame'],
      ['town/plush', 'Plush Machine'],
      ['town/cave', 'Ancient Cave'],
      ['town/digsite', 'Digsite']
    ]
  },
  {
    title: 'Stables',
    icon: 'stable',
    open: true,
    items: [
      ['stable/all', 'My Horses'],
      ['stable/breeding', 'Breeding']
    ]
  },
  {
    title: 'Inventory',
    icon: 'bag',
    items: [
      ['inventory/accessories', 'Accessories'],
      ['inventory/potions', 'Potions']
    ]
  },
  {
    title: 'Wilds',
    icon: 'compass',
    open: true,
    items: [
      ['wilds/aetherion', 'Aetherion Wilds'],
      ['wilds/hallowhoof', 'Hallowhoof']
    ]
  },
  {
    title: 'Developer Settings',
    icon: 'settings',
    items: [
      ['dev/settings', 'Game Settings'],
      ['dev/species', 'Species'],
      ['dev/colors', 'Colors & Palettes'],
      ['dev/mutations', 'Mutations'],
      ['dev/items', 'Inventory & Items'],
      ['dev/locations', 'Events & Locations']
    ]
  }
];
const workbench = groups.find(g => g.title === 'Developer Settings');
workbench.items = [['dev/settings', 'Game Settings']];
groups.push(
  {
    title: 'Compendium',
    icon: 'book',
    items: [
      ['dev/species', 'Species'],
      ['dev/colors', 'Palettes'],
      ['dev/eyes', 'Eye Colors'],
      ['dev/personalities', 'Personalities'],
      ['dev/mutations', 'Mutations'],
      ['dev/rarities', 'Rarities'],
      ['dev/locations', 'Zones'],
      ['dev/items', 'Items & Potions'],
      ['dev/themes', 'Item Themes']
    ]
  },
  {
    title: 'User Interface',
    icon: 'spark',
    items: [
      ['dev/appearance', 'Appearance & Themes'],
      ['dev/saves', 'Save Management'],
      ['dev/music', 'Music & Sound Effects']
    ]
  }
);
groups.splice(groups.indexOf(workbench), 1);
groups.push(workbench);
for (const group of groups) if (group.title !== 'Stables') group.items.sort((a, b) => a[1].localeCompare(b[1]));
export function navigationSection(route) {
  return (
    groups.find(group => group.items.some(([path]) => path === route)) ||
    (route.startsWith('wilds/')
      ? groups.find(group => group.title === 'Wilds')
      : { title: 'Gallorin', icon: 'compass' })
  );
}
export function sidebar(route, state, openGroups, catalog, appVersion = '') {
  const locations = catalog ? locationsFor(catalog, state) : [{ id: 'hallowhoof', event: true }];
  const navigation = groups
    .filter(group => group.title !== 'Developer Settings' || state.settings?.developerSettingsVisible === true)
    .map(group =>
      group.title === 'Wilds' && catalog
        ? { ...group, items: locations.filter(l => l.enabled).map(l => [`wilds/${l.id}`, l.name]) }
        : group
    )
    .map(group => ({
      ...group,
      items: group.title === 'Stables' ? group.items : [...group.items].sort((a, b) => a[1].localeCompare(b[1]))
    }));
  return `<a href="#wilds/aetherion" class="brand">${brandLogo()}<span><span class="brand-title">GALLORIN</span><small>A HORSEKEEPER’S CHRONICLE</small></span></a>
    <nav>${navigation
      .map(
        group => `<details data-group="${group.title}" ${openGroups.has(group.title) ? 'open' : ''}>
      <summary>${group.title === 'Wilds' ? `<a class="nav-group-home" href="#wilds/aetherion" data-action="wilds-home">${icon(group.icon)}<span>Wilds</span></a>` : `${icon(group.icon)}<span>${group.title}</span>`}<span class="chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></summary>
      <div class="nav-items">${group.items.map(([path, label]) => `<a href="#${path}" ${route === path ? 'aria-current="page"' : ''}><span>${escapeHTML(label)}</span>${path === 'stable/all' ? `<span class="count">${state.horses.length}</span>` : ''}</a>`).join('')}</div>
    </details>`
      )
      .join('')}</nav>
    <div class="sidebar-foot"><span>Gallorin${appVersion ? ` v${escapeHTML(appVersion)}` : ''}</span><span aria-hidden="true">|</span><button type="button" id="sidebar-changelog" aria-haspopup="dialog">Changelog</button></div>`;
}
export function card(horse, state, mode = 'wild', catalog) {
  const title = horse.name || horse.species;
  const characters = Array.from(title);
  const cardTitle = characters.length > 13 ? `${characters.slice(0, 13).join('')}…` : title;
  const collected = mode === 'stable';
  const rank = horseCardRank(horse, catalog);
  const appearance = raritySettings(catalog),
    rankColor = appearance.colors[rank.key];
  const female = horse.gender === 'Female';

  return String(html`<article class="horse-card" data-card-rank="${rankColor ? rank.key : 'none'}" ${rankColor && appearance.glow[rank.key] ? raw('data-rarity-glow') : ''} ${rankColor ? html`style="--horse-rank-color:${rankColor}"` : ''} aria-label="${title} · ${rank.label}">
    <div class="card-picture">${raw(mode === 'wild' ? horseArt(horse) : horseHeadArt(horse))}
    ${collected ? html`<button class="favorite ${horse.favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${horse.id}" aria-label="${horse.favorite ? 'Unfavorite' : 'Favorite'} ${title}" aria-pressed="${horse.favorite}">${raw(icon('heart'))}</button>` : ''}</div>
    <div class="card-body"><div class="card-title"><span class="gender ${female ? 'gender-female' : 'gender-male'}" role="img" aria-label="${female ? 'Female' : 'Male'}">${raw(horseGenderIcon(horse.gender))}</span><h3><button class="horse-card-open" data-action="inspect" data-id="${horse.id}" title="${title}" aria-label="View ${title}">${cardTitle}</button></h3></div></div></article>`);
}
export function emptyState(title, description, link, linkLabel, symbol = 'stable') {
  return `<div class="empty-state"><div class="empty-symbol">${icon(symbol)}</div><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}${link ? `<a class="button primary" href="#${link}">${linkLabel} ${icon('arrow')}</a>` : ''}</div>`;
}
export function heading(kicker, title, description, extra = '') {
  return `<div class="page-heading"><div>${kicker ? `<span class="eyebrow">${kicker}</span>` : ''}<h1>${title}</h1><p>${description}</p></div>${extra}</div>`;
}
