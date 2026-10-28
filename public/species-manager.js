import { html, raw } from './ui.js';
import { draftDefinition } from './definitions.js';
import { traitsEditorPage } from './traits-editor.js';
import { locationsFor } from './zones.js';
import { zoneCreatures, defaultSpawnSettings } from './spawn-config.js';
import { formBaseline, formSignature } from './form-state.js';

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
  return html`<section class="panel"><h3>Where ${species.name} spawns</h3><p>Zone assignments and weights are managed in Zones. This overview reads those same records. Ticket shares apply to the regular species roll; special spawn rules may also apply.</p>
    ${rows.length ? html`<div class="species-spawn-list">${rows.map(({ zone, weight, chance, status }) => html`<article class="species-spawn-row"><div><h4>${zone.name}</h4><p>${status}${zone.event ? ' · Event zone' : ''} · Weight ${weight} · ${Number(chance.toFixed(2))}% of regular tickets</p></div><button class="button secondary" data-action="species-open-zone" data-id="${zone.id}">Edit zone</button></article>`)}</div>` : html`<p>This species is not assigned to any zone.</p>`}
    <a class="text-link" href="#dev/locations">Manage Zones</a></section>`;
}

function overviewForm(species) {
  const current = !!species.id;
  return html`<form id="definition-form" class="panel" data-kind="species" data-id="${species.id || ''}">
    <h3>${current ? 'Species details' : 'Create a species'}</h3><p>Changes apply to future encounters. Saved horses retain their details and traits.</p>
    <label class="zone-field">Name<input name="name" value="${species.name}" maxlength="80" required></label>
    <label class="zone-field">Description (optional)<textarea name="description" maxlength="4000" rows="4">${species.description || ''}</textarea></label>
    <input type="hidden" name="systemId" value="${species.systemId || ''}">
    <input type="hidden" name="traits" value="${JSON.stringify(species.traits || {})}">
    <input type="hidden" name="attributes" value="${JSON.stringify(species.attributes || {})}">
    <label class="zone-field">Rarity Tier<select name="rarityTier">${['Cosmic', 'Ultra Rare', 'Rare', 'Uncommon', 'Common'].map((label, tier) => html`<option value="${tier}" ${Number(species.rarityTier ?? 4) === tier ? html`selected` : ''}>${label}</option>`)}</select></label>
    <label class="zone-field">Event or group (optional)<input name="event" value="${species.event || ''}" maxlength="100"></label>
    <label class="zone-field">Acquisition or rarity notes (optional)<input name="restriction" value="${species.restriction || ''}" maxlength="100"></label>
    <p>Manage appearance in Traits and view zone assignments in Spawning. Rarity changes update the default ticket weight in assigned zones.</p>
    <p id="definition-status" class="form-status" role="status"></p>
    <div class="form-actions"><button class="button primary" type="submit">Save entry</button><button class="button secondary" type="reset">Cancel changes</button>
    ${current ? html`<button class="text-button" type="button" data-action="delete-definition" data-kind="species" data-id="${species.id}">Delete Entry</button><button class="text-button" type="button" data-action="duplicate-definition" data-kind="species" data-id="${species.id}">Duplicate</button>` : ''}</div>
  </form>`;
}

export function speciesManagerPage(catalog, state, draft, tab = 'overview', supplied = false) {
  const species =
    draft || [...catalog.species].sort((a, b) => a.name.localeCompare(b.name))[0] || draftDefinition('species');
  if (!species.id || !['overview', 'traits', 'spawning'].includes(tab)) tab = 'overview';
  return String(html`<div class="species-manager" data-species-id="${species.id || ''}" data-species-tab="${tab}"><h1>Species Manager</h1><p>Species details, appearance traits, and spawning information in one place. Save or cancel edits before switching species or tabs.</p>
    <div class="species-workbench"><section class="panel library-list-panel"><label class="zone-field">Find a species<input id="definition-search" type="search" placeholder="Search species…"></label><button class="button primary" data-action="new-definition" data-kind="species">Add species</button>
    <div class="definition-list">${[...catalog.species].sort((a, b) => a.name.localeCompare(b.name)).map(s => html`<button class="definition-list-item ${s.id === species.id ? 'selected' : ''}" data-action="edit-definition" data-kind="species" data-id="${s.id}" data-search="${s.name.toLowerCase()}"><strong>${s.name}</strong><small>${Object.values(s.traits || {}).reduce((sum, values) => sum + values.length, 0)} traits</small></button>`)}</div><p id="definition-no-results" hidden>No matching species.</p></section>
    <section class="species-detail"><h2>${species.name || 'New species'}</h2><div class="species-tabs" role="tablist" aria-label="Species details">${[
      ['overview', 'Overview'],
      ['traits', 'Traits'],
      ['spawning', 'Spawning']
    ].map(
      ([key, label]) =>
        html`<button type="button" role="tab" id="species-tab-${key}" tabindex="${key === tab ? 0 : -1}" aria-selected="${key === tab}" aria-controls="species-tab-panel" data-action="species-tab" data-tab="${key}" ${!species.id && key !== 'overview' ? html`disabled` : ''}>${label}</button>`
    )}</div>
    ${!species.id ? html`<p>Save this species to manage its traits and view spawning.</p>` : ''}
    <div id="species-tab-panel" role="tabpanel" aria-labelledby="species-tab-${tab}">${tab === 'traits' ? raw(traitsEditorPage(catalog, species.id, supplied, true)) : tab === 'spawning' ? spawningPanel(species, catalog, state) : overviewForm(species)}</div></section></div></div>`);
}

export function syncSpeciesControls(root) {
  const manager = root.querySelector('.species-manager');
  if (!manager) return;
  const dirty = [...manager.querySelectorAll('form')].some(
    form => formBaseline(form) !== undefined && formSignature(form) !== formBaseline(form)
  );
  for (const button of manager.querySelectorAll('.library-list-panel button, [data-action="species-tab"]'))
    button.disabled = dirty || (!manager.dataset.speciesId && button.dataset.tab && button.dataset.tab !== 'overview');
}
