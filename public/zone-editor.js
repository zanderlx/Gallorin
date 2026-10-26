import { isCosmicPalette } from './cosmic-types.js';
import { zoneCreatures, defaultSpawnSettings } from './spawn-config.js';
import { escapeHTML as e, icon } from './ui.js';
import { availableAtmospheres, atmosphereFor, atmosphereStyle, locationsFor, newZoneDraft, zoneTags } from './zones.js';

export function zonePreview(draft, catalog, saved = false) {
  const atmosphere = atmosphereFor(catalog, draft.atmosphere);
  return `<section class="hero zone-preview ${['forest', 'autumn', 'moonlit', 'frost'].includes(atmosphere.id) ? atmosphere.id : 'atmosphere-custom'}" style="${atmosphereStyle(atmosphere)}" aria-label="${saved ? e(draft.name) : 'Zone preview'}"><div class="hero-content"><h2>${e(draft.name || 'An undiscovered place')}</h2><p>${e(draft.description || 'Give this little corner of the world a story of its own.')}</p><div class="hero-bottom">${zoneTags(
    draft,
    catalog
  )
    .map(tag => `<span>${e(tag)}</span>`)
    .join('<span class="hero-divider" aria-hidden="true"></span>')}</div></div></section>`;
}
export function zoneEditorPage(catalog, state, draft = newZoneDraft()) {
  const locations = locationsFor(catalog, state);
  const creatureWeights = new Map(
    zoneCreatures(draft, catalog, catalog.spawning || defaultSpawnSettings).map(c => [c.speciesId, c.weight])
  );
  const choices = (name, values, selected) =>
    values
      .map(
        value =>
          `<label class="zone-choice"><input type="checkbox" name="${name}" value="${e(value)}" ${selected.includes(value) ? 'checked' : ''}><span>${e(value)}</span></label>`
      )
      .join('');
  return `<div class="page-heading"><h1 data-copy-key="page.title">My Zones</h1></div>
  <section class="zone-collection"><div class="library-grid">${locations.map(l => `<article class="panel zone-card">${zonePreview(l, catalog, true)}<div class="zone-card-actions"><span class="badge">${l.speciesPool.length} species · ${l.palettePool.length} palettes</span><div class="form-actions"><button class="text-button" data-action="edit-zone" data-id="${l.id}">Edit zone</button><button type="button" class="icon-button zone-delete" data-action="delete-zone" data-id="${l.id}" aria-label="Delete ${e(l.name)}" title="Delete zone">${icon('trash')}</button></div></div></article>`).join('')}</div></section>
  <div class="settings-layout zone-layout"><form id="zone-form" class="panel" data-id="${e(draft.id || '')}">
    <div class="panel-heading">${icon('compass')}<div><h2>${draft.id ? 'Edit your zone' : 'Create a zone'}</h2></div></div>
    <div class="zone-draft-actions"><button type="button" class="button secondary" data-action="random-zone">${icon('spark')} Generate random zone</button><button type="button" class="text-button" data-action="new-zone">Start fresh</button></div>
    <label class="zone-field">Zone name<input name="name" maxlength="60" required placeholder="e.g. Moonwhisper Hollow" value="${e(draft.name)}"></label>

    <label class="zone-field">Description<textarea name="description" maxlength="600" rows="4" required placeholder="What awaits beyond the trees?">${e(draft.description)}</textarea></label>
    <label class="zone-field">Tags<textarea name="tags" rows="3" maxlength="2020" aria-describedby="zone-tags-help">${e(zoneTags(draft, catalog).join('\n'))}</textarea><small id="zone-tags-help">One tag per line. Add or remove lines to change the tags shown on the Wilds page. Leave blank for no tags (up to 20 tags, 100 characters each).</small></label>
    <label class="zone-field">Atmosphere<select name="atmosphere">${availableAtmospheres(catalog)
      .map(a => `<option value="${a.id}" ${draft.atmosphere === a.id ? 'selected' : ''}>${e(a.name)}</option>`)
      .join('')}</select></label>
    <p class="preview-note">Need more options? Add <a class="text-link" href="#dev/species">species</a>, <a class="text-link" href="#dev/colors">palettes</a>, or <a class="text-link" href="#dev/atmospheres">atmospheres</a> in the workbench.</p>
    <label class="setting-row"><span>Show this zone in the Wilds navigation.</span><input type="checkbox" class="toggle" name="enabled" ${draft.enabled ? 'checked' : ''}></label>
    <label class="setting-row"><span>Event</span><input type="checkbox" class="toggle" name="event" ${draft.event ? 'checked' : ''}></label>
    <fieldset class="zone-pool"><legend>Creatures Per Zone</legend><p>Select species and their absolute ticket weights. Zero disables a species; rarity tiers provide the initial weights.</p><div class="zone-options">${catalog.species.map(sp => `<div class="zone-creature-row"><label class="zone-choice"><input type="checkbox" name="speciesPool" value="${e(sp.name)}" ${draft.speciesPool.includes(sp.name) ? 'checked' : ''}><span>${e(sp.name)}</span></label><label>Weight<input type="number" name="weight:${e(sp.id)}" min="-1000000" max="1000000" step="1" value="${creatureWeights.get(sp.id) ?? (catalog.spawning || defaultSpawnSettings).tierWeights[sp.rarityTier ?? 4]}" aria-label="${e(sp.name)} spawn weight"></label></div>`).join('')}</div></fieldset>
    <fieldset class="zone-pool"><legend>Colors of this world</legend><p>Select one or more complete palettes for future encounters.</p><div class="zone-options">${choices(
      'palettePool',
      catalog.palettes.filter(p => p.complete && !isCosmicPalette(p)).map(p => p.name),
      draft.palettePool
    )}</div></fieldset>
    <p id="zone-status" class="form-status" role="status"></p><div class="form-actions"><button class="button primary" type="submit">${icon('check')} ${draft.id ? 'Save zone changes' : 'Create zone'}</button><button class="button secondary" type="reset">Reset changes</button></div>
  </form><aside><div id="zone-preview">${zonePreview(draft, catalog)}</div></aside></div>
`;
}
