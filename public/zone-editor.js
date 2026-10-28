import { isCosmicPalette } from './cosmic-types.js';
import { zoneCreatures, defaultSpawnSettings, rarityTier } from './spawn-config.js';
import { html, raw, icon, setHTML } from './ui.js';
import { draftDefinition } from './definitions.js';
import { availableAtmospheres, atmosphereFor, atmosphereStyle, locationsFor, newZoneDraft, zoneTags } from './zones.js';

export function zonePreview(draft, catalog, saved = false) {
  const atmosphere = atmosphereFor(catalog, draft.atmosphere);
  return String(
    html`<section class="hero zone-preview ${['forest', 'autumn', 'moonlit', 'frost'].includes(atmosphere.id) ? atmosphere.id : 'atmosphere-custom'}" style="${atmosphereStyle(atmosphere)}" aria-label="${saved ? draft.name : 'Zone preview'}"><div class="hero-content"><h2>${draft.name || 'Zone preview'}</h2><p>${draft.description || ''}</p><div class="hero-bottom">${zoneTags(draft, catalog).map(tag => html`<span>${tag}</span>`)}</div></div></section>`
  );
}

export function zoneSpawnChances(creatures) {
  const total = creatures.reduce((sum, c) => sum + Math.abs(c.weight), 0);
  return new Map(creatures.map(c => [c.speciesId, total ? (Math.abs(c.weight) / total) * 100 : 0]));
}

export function syncZoneEditor(form, catalog, draft) {
  const chances = zoneSpawnChances(draft.creatures);
  for (const output of form.querySelectorAll('[data-zone-chance]')) {
    output.textContent = `${(chances.get(output.dataset.zoneChance) || 0).toFixed(2)}%`;
  }
  setHTML(form.parentElement.querySelector('#zone-preview'), raw(zonePreview(draft, catalog)));
}

export function zoneAtmosphereManager(catalog, draft = draftDefinition('atmospheres')) {
  const tint = /^#[\da-f]{6}$/i.test(draft.tint) ? draft.tint : '#526747';
  return html`<div class="zone-section-heading"><h2>Zone atmospheres</h2><button type="button" class="button secondary" data-action="new-definition" data-kind="atmospheres">Add atmosphere</button></div>
  <div class="library-workbench"><section class="panel library-list-panel"><div class="definition-list">${availableAtmospheres(catalog).map(a => html`<button type="button" class="definition-list-item ${a.id === draft.id ? 'selected' : ''}" data-action="edit-definition" data-kind="atmospheres" data-id="${a.id}"><strong>${a.name}</strong><small>${a.encounterTitle}</small></button>`)}</div></section>
  <form id="definition-form" class="panel" data-kind="atmospheres" data-id="${draft.id || ''}"><h3>${draft.id ? 'Edit atmosphere' : 'Create atmosphere'}</h3>
  <label class="zone-field">Name<input name="name" maxlength="80" required value="${draft.name || ''}"></label>
  <label class="zone-field">Encounter heading<input name="encounterTitle" maxlength="100" required value="${draft.encounterTitle || ''}"></label>
  <div class="color-control"><span>Tint</span><span class="color-inputs"><input type="color" data-color-picker="zone-tint" value="${tint}" aria-label="Atmosphere tint picker"><input name="color:tint" data-color-hex="zone-tint" value="${tint}" pattern="#[0-9a-fA-F]{6}" maxlength="7" required aria-label="Atmosphere tint hex value"></span></div>
  <label class="zone-field">Notes (optional)<textarea name="description" maxlength="4000" rows="2">${draft.description || ''}</textarea></label>
  <p class="preview-note">Shared by zones using this atmosphere.</p><p id="definition-status" class="form-status" role="status"></p>
  <div class="form-actions"><button class="button primary" type="submit">Save atmosphere</button><button class="button secondary" type="reset">Reset changes</button>${draft.id ? html`<button class="text-button" type="button" data-action="delete-definition" data-kind="atmospheres" data-id="${draft.id}">Delete atmosphere</button>` : ''}</div></form></div>`;
}

export function zoneEditorPage(catalog, state, draft = newZoneDraft()) {
  const locations = locationsFor(catalog, state);
  const settings = catalog.spawning || defaultSpawnSettings;
  const weights = new Map(zoneCreatures(draft, catalog, settings).map(c => [c.speciesId, c.weight]));
  const chances = zoneSpawnChances(zoneCreatures(draft, catalog, settings));
  return String(html`<div class="zones-manager definitions-main"><div class="definitions-header"><h1 class="manager-heading" data-copy-key="page.title">My Zones</h1><button type="button" class="button primary" data-action="new-zone">${raw(icon('spark'))} Add zone</button></div>
  <section class="zone-collection" aria-label="Saved zones"><div class="zone-manager-grid">${locations.map(l => html`<article class="panel zone-card"><div class="zone-card-summary"><h2>${l.name}</h2><span class="badge">${l.enabled ? 'Visible in Wilds' : 'Hidden from Wilds'}</span><p>${zoneCreatures(l, catalog, settings).filter(c => Math.abs(c.weight) > 0).length} species · ${l.palettePool.length} palettes</p></div><div class="zone-card-actions"><button type="button" class="button secondary" data-action="edit-zone" data-id="${l.id}">Edit zone</button><button type="button" class="icon-button zone-delete" data-action="delete-zone" data-id="${l.id}" aria-label="Delete ${l.name}" title="Delete zone">${raw(icon('trash'))}</button></div></article>`)}</div></section>
  <div class="zone-workbench"><form id="zone-form" class="panel" data-id="${draft.id || ''}"><div class="zone-section-heading"><h2>${draft.id ? 'Edit zone' : 'Create zone'}</h2><button type="button" class="text-button" data-action="random-zone">Generate random zone</button></div>
  <section class="zone-editor-section"><h3>Details</h3><label class="zone-field">Zone name<input name="name" maxlength="60" required value="${draft.name}"></label><label class="setting-row"><span>Show this zone in the Wilds navigation.</span><input type="checkbox" class="toggle" name="enabled" ${raw(draft.enabled ? 'checked' : '')}></label></section>
  <section class="zone-editor-section"><h3>Species spawns</h3><p class="preview-note">Select species and set ticket weights. Chances use absolute weights; zero disables a species.</p><div class="zone-spawn-list">${catalog.species.map(sp => html`<div class="zone-creature-row"><label class="zone-choice"><input type="checkbox" name="speciesPool" value="${sp.name}" ${raw(draft.speciesPool.includes(sp.name) ? 'checked' : '')}><span>${sp.name}</span></label><label>Weight<input type="number" name="weight:${sp.id}" min="-1000000" max="1000000" step="any" required value="${weights.get(sp.id) ?? settings.tierWeights[rarityTier(sp)]}" aria-label="${sp.name} spawn weight"></label><output data-zone-chance="${sp.id}" aria-label="${sp.name} spawn chance">${(chances.get(sp.id) || 0).toFixed(2)}%</output></div>`)}</div></section>
  <section class="zone-editor-section"><h3>Palettes</h3><div class="zone-options">${catalog.palettes.filter(p => p.complete && !isCosmicPalette(p)).map(p => html`<label class="zone-choice"><input type="checkbox" name="palettePool" value="${p.name}" ${raw(draft.palettePool.includes(p.name) ? 'checked' : '')}><span>${p.name}</span></label>`)}</div></section>
  <section class="zone-editor-section"><h3>Appearance</h3><label class="zone-field">Atmosphere<select name="atmosphere">${availableAtmospheres(catalog).map(a => html`<option value="${a.id}" ${raw(draft.atmosphere === a.id ? 'selected' : '')}>${a.name}</option>`)}</select><small>Manage shared atmospheres below.</small></label><label class="zone-field">Description (optional)<textarea name="description" maxlength="600" rows="2">${draft.description}</textarea></label><label class="zone-field">Tags (optional)<textarea name="tags" rows="2" maxlength="2020">${zoneTags(draft, catalog).join('\n')}</textarea><small>One per line. Up to 20 tags.</small></label></section>
  <p id="zone-status" class="form-status" role="status"></p><div class="form-actions"><button class="button primary" type="submit">${raw(icon('check'))} ${draft.id ? 'Save zone changes' : 'Create zone'}</button><button class="button secondary" type="reset">Reset changes</button></div></form><aside id="zone-preview">${raw(zonePreview(draft, catalog))}</aside></div>
  <section id="zone-atmospheres" class="zone-atmospheres" aria-label="Zone atmospheres">${zoneAtmosphereManager(catalog)}</section></div>`);
}
