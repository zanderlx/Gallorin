import { html, raw, icon } from './ui.js';
import { draftDefinition } from './definitions.js';
import { traitsEditorPage } from './traits-editor.js';
import { locationsFor } from './zones.js';
import { zoneCreatures, defaultSpawnSettings, rarityTier } from './spawn-config.js';
import { formBaseline, formSignature } from './form-state.js';
import { raritySettings } from './rarity-settings.js';

export function speciesDeleteConfirmation(name) {
  return html`<div class="dialog-top"><h2 id="confirm-title">Delete ${name}</h2></div><p class="delete-warning">Are you sure you want to delete this species?</p><div class="form-actions"><button class="button secondary" data-action="cancel-delete" autofocus>Cancel</button><button class="button primary" data-action="confirm-delete">Delete Species</button></div>`;
}

const speciesRarities = [
  [4, 'Common'],
  [3, 'Uncommon'],
  [2, 'Rare'],
  [1, 'Ultra Rare'],
  [0, 'Cosmic']
];
const rarityName = species => speciesRarities.find(([tier]) => tier === rarityTier(species))?.[1] || 'Common';

export function sortSpeciesEntries(entries, sort = 'name') {
  const rank = species => speciesRarities.findIndex(([tier]) => tier === rarityTier(species));
  return [...entries].sort((a, b) => (sort === 'rarity' ? rank(a) - rank(b) : 0) || a.name.localeCompare(b.name));
}

export function updateSpeciesSort(root) {
  const list = root.querySelector('.species-manager .definition-list');
  const sort = root.querySelector('#species-sort')?.value || 'name';
  if (!list) return;
  const entries = [...list.children].map(element => ({
    element,
    name: element.dataset.name,
    rarityTier: Number(element.dataset.rarityTier)
  }));
  for (const entry of sortSpeciesEntries(entries, sort)) list.append(entry.element);
}

export function speciesSpawnRows(species, catalog, state) {
  return locationsFor(catalog, state).flatMap(zone => {
    const creatures = zoneCreatures(zone, catalog, catalog.spawning || defaultSpawnSettings);
    const creature = creatures.find(c => c.speciesId === species.id);
    if (!creature) return [];
    const tickets = Math.abs(creature.weight);
    const total = creatures.reduce((sum, c) => sum + Math.abs(c.weight), 0);
    return [
      {
        zone,
        weight: creature.weight,
        chance: total ? (tickets / total) * 100 : 0,
        status: !zone.enabled ? 'Zone closed' : !tickets ? 'Disabled (zero weight)' : 'Active'
      }
    ];
  });
}

function spawningPanel(species, catalog, state) {
  const rows = speciesSpawnRows(species, catalog, state);
  return html`<section class="panel"><h3>Where ${species.name} spawns</h3><p>Zone assignments and weights are managed in Zones.</p>
    ${rows.length ? html`<div class="species-spawn-list">${rows.map(({ zone, weight, chance }) => html`<article class="species-spawn-row"><div><h4>${zone.name}</h4><p>Weight: ${weight} · ${Number(chance.toFixed(2))}%</p></div><button class="button secondary" data-action="species-open-zone" data-id="${zone.id}">Edit zone</button></article>`)}</div>` : html`<div class="species-zones-empty"><p>This species is not assigned to any zone.</p><a class="button secondary" href="#dev/locations">Manage Zones</a></div>`}
    </section>`;
}

function overviewForm(species, catalog) {
  const current = !!species.id;
  const groups = [
    ...new Set(
      [
        'Alien',
        'Carnival',
        'Christmas',
        'Easter',
        'Halloween',
        'Medieval',
        'Royal',
        'Valentine',
        ...catalog.species.map(s => s.event),
        species.event
      ].filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));
  return html`<form id="definition-form" class="panel" data-kind="species" data-id="${species.id || ''}">
    <div class="panel-heading"><h2>${current ? 'Species details' : 'Create a species'}</h2></div>
    <div class="species-identity-fields">
    <label class="zone-field">Name<input name="name" value="${species.name}" maxlength="80" required></label>
    <label class="zone-field">Rarity<select name="rarityTier">${speciesRarities.map(
      ([tier, label]) =>
        html`<option value="${tier}" ${Number(species.rarityTier ?? 4) === tier ? html`selected` : ''}>${label}</option>`
    )}</select></label>
    <label class="zone-field">Group<select name="event"><option value="" ${!species.event ? html`selected` : ''}>None</option>${groups.map(group => html`<option value="${group}" ${species.event === group ? html`selected` : ''}>${group}</option>`)}</select></label>
    </div>
    <label class="zone-field">Description<textarea name="description" maxlength="4000" rows="4">${species.description || ''}</textarea></label>
    <input type="hidden" name="systemId" value="${species.systemId || ''}">
    <input type="hidden" name="traits" value="${JSON.stringify(species.traits || {})}">
    <input type="hidden" name="attributes" value="${JSON.stringify(species.attributes || {})}">
    <input type="hidden" name="restriction" value="${species.restriction || ''}">
    <p id="definition-status" class="form-status" role="status"></p>
    <div class="form-actions"><button class="button primary" type="submit">Save entry</button><button class="button secondary" type="reset">Cancel changes</button>
    ${current ? html`<button class="text-button" type="button" data-action="delete-definition" data-kind="species" data-id="${species.id}">Delete Entry</button>` : ''}</div>
  </form>`;
}

export function speciesManagerPage(catalog, state, draft, tab = 'overview', sort = 'rarity') {
  const appearance = raritySettings(catalog);
  const rarityColor = entry => appearance.colors[rarityName(entry).toLowerCase().replaceAll(' ', '-')] || 'var(--text)';
  const species = draft || sortSpeciesEntries(catalog.species, sort)[0] || draftDefinition('species');
  if (!species.id || !['overview', 'traits', 'zones'].includes(tab)) tab = 'overview';
  return String(html`<div class="species-manager" data-species-id="${species.id || ''}" data-species-tab="${tab}"><div class="definitions-header eye-manager-header"><h1 class="manager-heading">Species Manager</h1><button type="button" class="button primary" data-action="new-definition" data-kind="species">${raw(icon('spark'))} Create Species</button></div>
    <div class="species-workbench"><div class="species-list-column"><div class="species-list-controls"><label class="zone-field">Find A Species<input id="definition-search" type="search" placeholder="Search species…"></label>
    <label class="zone-field species-sort-field">Sort By<select id="species-sort"><option value="name" ${sort === 'name' ? html`selected` : ''}>Name</option><option value="rarity" ${sort === 'rarity' ? html`selected` : ''}>Rarity</option></select></label></div>
    <section class="panel library-list-panel"><div class="definition-list">${sortSpeciesEntries(catalog.species, sort).map(s => html`<button class="definition-list-item ${s.id === species.id ? 'selected' : ''}" data-action="edit-definition" data-kind="species" data-id="${s.id}" data-name="${s.name}" data-rarity-tier="${rarityTier(s)}" data-search="${`${s.name} ${rarityName(s)}`.toLowerCase()}"><strong>${s.name}</strong><small><span class="species-rarity" style="color:${rarityColor(s)}">${rarityName(s)}</span> · ${Object.values(s.traits || {}).reduce((sum, values) => sum + values.length, 0)} traits</small></button>`)}</div><p id="definition-no-results" hidden>No matching species.</p></section></div>
    <section class="species-detail"><div class="species-detail-heading"><div class="species-tabs" role="tablist" aria-label="Species details">${[
      ['overview', 'Overview'],
      ['traits', 'Traits'],
      ['zones', 'Zones']
    ].map(
      ([key, label]) =>
        html`<button type="button" role="tab" id="species-tab-${key}" tabindex="${key === tab ? 0 : -1}" aria-selected="${key === tab}" aria-controls="species-tab-panel" data-action="species-tab" data-tab="${key}" ${!species.id && key !== 'overview' ? html`disabled` : ''}>${label}</button>`
    )}</div></div>
    <div id="species-tab-panel" role="tabpanel" aria-labelledby="species-tab-${tab}">${!species.id ? html`<p>Save this species to manage its traits and view spawning.</p>` : ''}${tab === 'traits' ? raw(traitsEditorPage(catalog, species.id, true)) : tab === 'zones' ? spawningPanel(species, catalog, state) : overviewForm(species, catalog)}</div></section></div></div>`);
}

export function syncSpeciesControls(root) {
  const manager = root.querySelector('.species-manager');
  if (!manager) return;
  const dirty = [...manager.querySelectorAll('form')].some(
    form => formBaseline(form) !== undefined && formSignature(form) !== formBaseline(form)
  );
  for (const button of manager.querySelectorAll(
    '.library-list-panel button, [data-action="species-tab"], [data-action="new-definition"]'
  ))
    button.disabled = dirty || (!manager.dataset.speciesId && button.dataset.tab && button.dataset.tab !== 'overview');
}
