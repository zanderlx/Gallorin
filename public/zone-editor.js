import { isCosmicPalette } from './cosmic-types.js';
import { zoneCreatures, defaultSpawnSettings, rarityTier } from './spawn-config.js';
import { html, raw, icon, setHTML } from './ui.js';
import { formBaseline, formSignature } from './form-state.js';
import {
  availableAtmospheres,
  atmosphereFor,
  atmosphereStyle,
  locationsFor,
  zoneAtmosphere,
  zoneTags
} from './zones.js';

const rarityNames = { 4: 'Common', 3: 'Uncommon', 2: 'Rare', 1: 'Ultra Rare', 0: 'Cosmic' };

export function zonePreview(draft, catalog, saved = false) {
  const atmosphere = zoneAtmosphere(draft, catalog);
  return String(
    html`<section class="hero zone-preview ${['forest', 'autumn', 'moonlit', 'frost'].includes(atmosphere.id) ? atmosphere.id : 'atmosphere-custom'}" style="${atmosphereStyle(atmosphere)}" aria-label="${saved ? draft.name : 'Zone preview'}"><div class="hero-content"><h2>${draft.name || 'Zone preview'}</h2><p>${draft.description || ''}</p><div class="hero-bottom">${zoneTags(draft, catalog).map(tag => html`<span>${tag}</span>`)}</div></div></section>`
  );
}

export function zoneSpawnChances(creatures) {
  const total = creatures.reduce((sum, c) => sum + Math.abs(c.weight), 0);
  return new Map(creatures.map(c => [c.speciesId, total ? (Math.abs(c.weight) / total) * 100 : 0]));
}

export function filterZoneSpecies(species, query = '', tier = '', sort = 'name', direction = 'asc') {
  const search = query.trim().toLowerCase();
  return species
    .filter(s => s.name.toLowerCase().includes(search) && (tier === '' || rarityTier(s) === Number(tier)))
    .sort(
      (a, b) =>
        ((sort === 'rarity' ? rarityTier(b) - rarityTier(a) : 0) || a.name.localeCompare(b.name)) *
        (direction === 'desc' ? -1 : 1)
    );
}

export function updateZoneSpecies(form, catalog) {
  const entries = filterZoneSpecies(
    catalog.species,
    form.querySelector('#zone-species-search').value,
    form.querySelector('#zone-species-rarity').value,
    form.querySelector('#zone-species-sort').value,
    form.querySelector('#zone-species-direction').value
  );
  const order = new Map(entries.map((entry, i) => [entry.id, i]));
  for (const row of form.querySelectorAll('[data-zone-species]')) {
    row.hidden = !order.has(row.dataset.zoneSpecies);
    row.style.order = String(order.get(row.dataset.zoneSpecies) ?? entries.length);
  }
  form.querySelector('#zone-species-empty').hidden = entries.length > 0;
}

export function syncZoneEditor(form, catalog, draft) {
  const chances = zoneSpawnChances(draft.creatures);
  for (const output of form.querySelectorAll('[data-zone-chance]'))
    output.textContent = `${(chances.get(output.dataset.zoneChance) || 0).toFixed(2)}%`;
  setHTML(form.querySelector('#zone-preview'), raw(zonePreview(draft, catalog)));
  form.querySelector('[data-zone-palette-count]').textContent = `${draft.palettePool.length} selected`;
}

export function applyZonePreset(form, catalog) {
  const atmosphere = atmosphereFor(catalog, form.elements.atmosphere.value);
  form.elements['color:zone-tint'].value = atmosphere.tint;
  form.querySelector('[data-color-picker="zone-tint"]').value = atmosphere.tint;
  form.elements.encounterTitle.value = atmosphere.encounterTitle;
}

export function zoneEditorPage(catalog, state) {
  const locations = locationsFor(catalog, state);
  const settings = catalog.spawning || defaultSpawnSettings;
  return String(html`<div class="zones-manager definitions-main"><div class="definitions-header"><h1 class="manager-heading" data-copy-key="page.title">My Zones</h1><button type="button" class="button primary" data-action="new-zone">${raw(icon('spark'))} Create zone</button></div>
  <section class="zone-collection" aria-label="Saved zones"><div class="zone-manager-grid">${locations.map(l => html`<article class="panel zone-card">${raw(zonePreview(l, catalog, true))}<div class="zone-card-actions"><div><span class="badge">${l.enabled ? 'Visible in Wilds' : 'Hidden from Wilds'}</span><p>${zoneCreatures(l, catalog, settings).filter(c => Math.abs(c.weight) > 0).length} species · ${l.palettePool.length} palettes</p></div><div class="form-actions"><button type="button" class="button secondary" data-action="edit-zone" data-id="${l.id}" aria-label="Edit ${l.name}">Edit zone</button><button type="button" class="icon-button zone-delete" data-action="delete-zone" data-id="${l.id}" aria-label="Delete ${l.name}" title="Delete zone">${raw(icon('trash'))}</button></div></div></article>`)}</div>${!locations.length ? html`<div class="empty-state">${raw(icon('compass'))}<h2>No zones yet</h2><p>Create a zone to choose its species and appearance.</p></div>` : ''}</section></div>`);
}

export function zoneEditorForm(catalog, draft) {
  const settings = catalog.spawning || defaultSpawnSettings;
  const weights = new Map(zoneCreatures(draft, catalog, settings).map(c => [c.speciesId, c.weight]));
  const chances = zoneSpawnChances(zoneCreatures(draft, catalog, settings));
  const appearance = zoneAtmosphere(draft, catalog);
  return html`<div class="dialog-top"><h2 id="zone-editor-title">${draft.id ? 'Edit zone' : 'Create zone'}</h2><button type="button" class="icon-button" data-zone-close aria-label="Close zone editor">${raw(icon('close'))}</button></div>
  <form id="zone-form" data-id="${draft.id || ''}"><div class="zone-editor-identity"><label class="zone-field">Zone name<input name="name" maxlength="60" required value="${draft.name}"></label><label class="setting-row"><span>Show this zone in the Wilds navigation.</span><input type="checkbox" class="toggle" name="enabled" ${raw(draft.enabled ? 'checked' : '')}></label></div>

  <details class="zone-editor-section" open><summary>Species spawns</summary><div class="zone-disclosure-body"><p class="preview-note">Weights determine spawn chances. Zero disables a species.</p><div class="zone-species-controls"><label class="zone-field">Find species<input type="search" id="zone-species-search" placeholder="Search species…"></label><label class="zone-field">Rarity<select id="zone-species-rarity"><option value="">All rarities</option>${[4, 3, 2, 1, 0].map(t => html`<option value="${t}">${rarityNames[t]}</option>`)}</select></label><label class="zone-field">Sort by<select id="zone-species-sort"><option value="name">Name</option><option value="rarity">Rarity</option></select></label><label class="zone-field">Order<select id="zone-species-direction"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label></div>
  <div class="zone-spawn-list">${filterZoneSpecies(catalog.species).map(sp => html`<div class="zone-creature-row" data-zone-species="${sp.id}"><label class="zone-choice"><input type="checkbox" name="speciesPool" value="${sp.name}" ${raw(draft.speciesPool.includes(sp.name) ? 'checked' : '')}><span>${sp.name}<small>${rarityNames[rarityTier(sp)]}</small></span></label><label>Weight<input type="number" name="weight:${sp.id}" min="-1000000" max="1000000" step="any" required value="${weights.get(sp.id) ?? settings.tierWeights[rarityTier(sp)]}" aria-label="${sp.name} spawn weight"></label><output data-zone-chance="${sp.id}" aria-label="${sp.name} spawn chance">${(chances.get(sp.id) || 0).toFixed(2)}%</output></div>`)}</div><p id="zone-species-empty" role="status" hidden>No species match your filters.</p></div></details>
  <details class="zone-editor-section"><summary>Appearance &amp; atmosphere</summary><div class="zone-disclosure-body"><div id="zone-preview">${raw(zonePreview(draft, catalog))}</div><label class="zone-field">Artwork &amp; atmosphere preset<select name="atmosphere">${availableAtmospheres(catalog).map(a => html`<option value="${a.id}" ${raw(draft.atmosphere === a.id ? 'selected' : '')}>${a.name}</option>`)}</select></label><div class="color-control"><span>Tint</span><span class="color-inputs"><input type="color" data-color-picker="zone-tint" value="${appearance.tint}" aria-label="Zone tint picker"><input name="color:zone-tint" data-color-hex="zone-tint" value="${appearance.tint}" pattern="#[0-9a-fA-F]{6}" maxlength="7" required aria-label="Zone tint hex value"></span></div><label class="zone-field">Encounter heading<input name="encounterTitle" maxlength="100" required value="${appearance.encounterTitle}"></label><label class="zone-field">Description (optional)<textarea name="description" maxlength="600" rows="2">${draft.description}</textarea></label><label class="zone-field">Tags (optional)<textarea name="tags" rows="2" maxlength="2020">${zoneTags(draft, catalog).join('\n')}</textarea><small>One per line. Up to 20 tags.</small></label></div></details>
  <details class="zone-editor-section"><summary>Palettes <span class="badge" data-zone-palette-count>${draft.palettePool.length} selected</span></summary><div class="zone-disclosure-body zone-options">${catalog.palettes.filter(p => p.complete && !isCosmicPalette(p)).map(p => html`<label class="zone-choice"><input type="checkbox" name="palettePool" value="${p.name}" ${raw(draft.palettePool.includes(p.name) ? 'checked' : '')}><span>${p.name}</span></label>`)}</div></details>
  <p id="zone-status" class="form-status" role="status"></p><div class="form-actions zone-editor-actions"><button class="button primary" type="submit">${raw(icon('check'))} ${draft.id ? 'Save zone changes' : 'Create zone'}</button><button class="button secondary" type="reset">Reset changes</button><button class="button secondary" type="button" data-zone-close>Close</button><button type="button" class="text-button" data-action="random-zone">Generate random zone</button></div></form>`;
}

export function createZoneEditor(renderEditor) {
  const dialog = document.createElement('dialog');
  dialog.className = 'zone-editor-dialog';
  dialog.setAttribute('aria-labelledby', 'zone-editor-title');
  document.body.append(dialog);
  const prompt = document.createElement('dialog');
  prompt.className = 'zone-save-confirm';
  prompt.setAttribute('aria-labelledby', 'zone-save-title');
  setHTML(
    prompt,
    html`<div class="dialog-top"><h2 id="zone-save-title">Save changes?</h2></div><p>You have unsaved zone changes.</p><div class="form-actions"><button type="button" class="button secondary" data-zone-decision="keep" autofocus>Keep editing</button><button type="button" class="button secondary" data-zone-decision="discard">Discard changes</button><button type="button" class="button primary" data-zone-decision="save">Save</button></div>`
  );
  document.body.append(prompt);
  function requestClose() {
    const form = dialog.querySelector('form');
    if (!form || formSignature(form) === formBaseline(form)) dialog.close();
    else if (!prompt.open) prompt.showModal();
  }
  prompt.addEventListener('click', event => {
    const decision = event.target.closest('[data-zone-decision]')?.dataset.zoneDecision;
    if (!decision) return;
    prompt.close();
    if (decision === 'discard') dialog.close();
    if (decision === 'save') dialog.querySelector('form')?.requestSubmit();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener(
    'invalid',
    event => {
      const section = event.target.closest('details');
      if (section) section.open = true;
    },
    true
  );
  dialog.addEventListener('close', () => {
    if (!dialog.open) dialog.replaceChildren();
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-zone-close]')) requestClose();
    else if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        requestClose();
    }
  });
  return {
    dialog,
    close() {
      prompt.close();
      dialog.close();
    },
    open(draft) {
      setHTML(dialog, renderEditor(draft));
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      dialog.querySelector('[name="name"]').focus({ preventScroll: true });
    }
  };
}
