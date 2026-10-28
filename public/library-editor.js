import { mutationTypes } from './mutations-manager.js';
import { registryKinds } from './spawn-config.js';
import { personalitiesManagerPage } from './personalities-manager.js';
import { speciesManagerPage } from './species-manager.js';
import { escapeHTML as e, heading, icon } from './ui.js';
import { definitionKinds, draftDefinition, regions, themeTokens } from './definitions.js';
import { colorsForMode } from './theme-modes.js';

export const editorRoutes = {
  species: 'species',
  colors: 'palettes',
  eyes: 'eyes',
  personalities: 'personalities',
  mutations: 'mutations',
  items: 'items',
  themes: 'themes',
  atmospheres: 'atmospheres',
  appearance: 'siteThemes'
};
const textField = (label, key, value, required = false, suggestions = []) =>
  `<label class="zone-field">${label}<input name="${key}" value="${e(value || '')}" maxlength="${key === 'name' ? 80 : 100}" ${required ? 'required' : ''} ${suggestions.length ? `list="${key}-suggestions"` : ''}></label>${suggestions.length ? `<datalist id="${key}-suggestions">${[...new Set(suggestions.filter(Boolean))].map(v => `<option value="${e(v)}"></option>`).join('')}</datalist>` : ''}`;
const jsonField = (label, key, value) =>
  `<label class="zone-field">${label}<textarea name="${key}" rows="4" maxlength="8192">${e(JSON.stringify(value, null, 2))}</textarea></label>`;
const checkbox = (label, key, checked) =>
  `<label class="zone-choice"><input type="checkbox" name="${key}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
const editorGuidance = {
  species: [
    'Manage species, rarity tiers, and zone assignments.',
    'Saves update species.json and the selected zone creature files. Existing horses retain their snapshots.'
  ],
  palettes: [
    'Create complete nine-region horse palettes and organize them by type or event.',
    'Palette edits affect future horses using this palette. Existing horse colors are preserved.'
  ],
  eyes: [
    'Manage eye colors, textures, and visual layers.',
    'Spawns read eyes.json for random eye definitions and visual IDs.'
  ],
  personalities: [
    'Write personality names and descriptions for future companions.',
    'New encounters use these descriptions. Gameplay effects are not simulated.'
  ],
  mutations: [
    'Manage mutation ticket weights and attribute thresholds.',
    'Standard mutations drive the cascading slots. Thresholds check the species base attributes; size shifts affect the final size.'
  ],
  items: [
    'Define accessories and potions, their prices, rarities, and item themes.',
    'Editing an item does not grant it. Inventory, gacha rewards, and item use remain planned.'
  ],
  themes: [
    'Organize item styles and optional event associations.',
    'These themes label items and future rewards. Website colors are managed in Appearance & Themes.'
  ],
  atmospheres: [
    'Customize zone tints and encounter headings.',
    'Choose the saved atmosphere in a zone editor to apply its appearance and encounter heading.'
  ],
  siteThemes: ['', 'Save your color variants, then select the theme above to apply it throughout the website.']
};
export function colorControl(key, value = '#D6B4DF', label = key) {
  const valid = /^#[\da-f]{6}$/i.test(value) ? value : '#D6B4DF';
  return `<div class="color-control"><span>${e(label)}</span><span class="color-inputs"><input type="color" data-color-picker="${e(key)}" value="${valid}" aria-label="${e(label)} color picker"><input name="color:${e(key)}" data-color-hex="${e(key)}" value="${e(value)}" pattern="#[0-9a-fA-F]{6}" maxlength="7" required aria-label="${e(label)} hex value"></span></div>`;
}
export function themePicker(catalog, state) {
  const mode = state.settings.websiteThemeMode || 'dark';
  return `<section class="theme-picker"><div class="theme-mode-switch" aria-label="Website color mode"><button class="button secondary" data-action="theme-mode" data-mode="dark" aria-pressed="${mode === 'dark'}">☾ Dark · default</button><button class="button secondary" data-action="theme-mode" data-mode="light" aria-pressed="${mode === 'light'}">☀ Light</button></div><div class="theme-grid">${catalog.siteThemes
    .map(theme => {
      const colors = colorsForMode(theme, theme.id === 'default' ? 'dark' : mode);
      return `<button type="button" class="theme-card" data-action="apply-theme" data-id="${e(theme.id)}" aria-pressed="${(state.settings.websiteTheme || 'default') === theme.id}"><span class="theme-swatches">${['bg', 'sidebar', 'panel', 'burgundy', 'gold'].map(k => `<span style="background:${colors[k]}"></span>`).join('')}</span><strong>${e(theme.name)}</strong><small>${e(theme.description)}</small><span class="theme-current-label"${(state.settings.websiteTheme || 'default') === theme.id ? '' : ' aria-hidden="true"'}>✓ Current Theme</span></button>`;
    })
    .join('')}</div></section>`;
}
export function libraryEditorPage(kind, catalog, state, draft) {
  if (kind === 'species') return speciesManagerPage(catalog, state, draft);
  if (kind === 'personalities') return personalitiesManagerPage(catalog, draft);
  const showEditor = kind !== 'personalities' || !!draft;
  draft ||= draftDefinition(kind);
  const current = draft.id ? catalog[kind].find(d => d.id === draft.id) : null;
  const readOnly = kind === 'siteThemes' && draft.id === 'default';
  const kindName = definitionKinds[kind];
  const primary = registryKinds.includes(kind);
  const managers = {
    species: 'Species Manager',
    palettes: 'Palettes Manager',
    eyes: 'Eye Color Manager',
    mutations: 'Mutations Manager',
    personalities: 'Personalities Manager'
  };
  let fields = '';
  if (kind === 'palettes')
    fields = `<label class="zone-field">Type<select name="group" required>${[
      ...new Set([...catalog.palettes.map(p => p.group), draft.group || 'Custom'])
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map(group => `<option value="${e(group)}" ${group === draft.group ? 'selected' : ''}>${e(group)}</option>`)
      .join('')}</select></label>
    <label class="zone-field palette-variance-field">Color Variance Override (%)<input type="number" name="variationPercent" min="0" max="100" step="1" required value="${draft.variationPercent ?? catalog.spawning?.paletteVariationPercent ?? 25}" data-default-variance="${catalog.spawning?.paletteVariationPercent ?? 25}" title="Use the default value to follow the main Color Variation setting"><small>0=disabled, max 100 · Default: ${catalog.spawning?.paletteVariationPercent ?? 25}</small></label>
    <div class="color-editor-grid">${regions.map(r => colorControl(r, draft.colors?.[r] || '#D6B4DF')).join('')}</div>
    ${checkbox('Global (available to all species)', 'global', draft.global ?? !draft.speciesIds?.length)}
    <fieldset class="zone-pool palette-species-links"><legend>Species Linked</legend>${catalog.species.map(sp => `<label class="zone-choice"><input type="checkbox" name="speciesIds" value="${e(sp.id)}" ${(draft.speciesIds || []).includes(sp.id) ? 'checked' : ''}><span>${e(sp.name)}</span></label>`).join('')}</fieldset>
    <input type="hidden" name="assetSkins" value="${e((draft.assetSkins || []).join('\n'))}">`;
  if (kind === 'eyes')
    fields =
      `<input type="hidden" name="cosmicType" value="${e(draft.cosmicType || '')}">` +
      `<input type="hidden" name="textureId" value="${e(draft.textureId || '')}">` +
      `<input type="hidden" name="layers" value="${e(JSON.stringify(draft.layers || []))}">` +
      `<label class="zone-field">Rarity<select name="rarity">${[...new Set(['Common', 'Uncommon', 'Rare', ...(draft.cosmicType ? ['Cosmic'] : []), ...catalog.eyes.filter(d => !d.cosmicType).map(d => d.rarity), draft.rarity].filter(rarity => rarity && rarity.toLowerCase() !== 'custom' && (draft.cosmicType || rarity !== 'Cosmic')))].map(rarity => `<option value="${e(rarity)}" ${rarity === draft.rarity ? 'selected' : ''}>${e(rarity)}</option>`).join('')}</select></label>` +
      `<div id="eye-color-rows" class="color-editor-grid">${(draft.colors || ['#8A689E']).map((c, i) => `<div class="eye-color-row">${colorControl(String(i), c, `Eye color ${i + 1}`)}<button class="text-button" type="button" data-action="remove-eye-color">Remove color</button></div>`).join('')}</div><button class="button secondary" type="button" data-action="add-eye-color">Add eye color</button>`;
  if (kind === 'mutations')
    fields =
      `<label class="zone-field">Type<select name="type">${mutationTypes([
        ...catalog.mutations,
        ...(draft.type ? [{ type: draft.type }] : [])
      ])
        .map(type => `<option value="${e(type)}" ${type === draft.type ? 'selected' : ''}>${e(type)}</option>`)
        .join('')}</select></label>` +
      `<label class="zone-field">Selection Weight (0 = disabled, higher = more common, lower = less common)<input type="number" min="0" max="1000000" step="1" name="weight" value="${draft.weight ?? 0}"></label>` +
      jsonField('Attribute Thresholds (JSON: {"stamina":{"min":10,"max":100}})', 'thresholds', draft.thresholds || {}) +
      `<label class="zone-field">Size Index Shift<input type="number" name="sizeShift" min="-10" max="10" step="1" value="${draft.sizeShift ?? (draft.name === 'Dwarfism' ? -1 : draft.name === 'Gigantism' ? 1 : 0)}"></label>`;
  if (kind === 'personalities')
    fields = `<input type="hidden" name="behaviorTags" value="${e(JSON.stringify(draft.behaviorTags || []))}">`;
  if (kind === 'items')
    fields =
      textField(
        'Item type (choose or type your own)',
        'type',
        draft.type || 'Accessory',
        true,
        catalog.items.map(d => d.type || 'Accessory')
      ) +
      textField(
        'Rarity (choose or type your own)',
        'rarity',
        draft.rarity || 'Common',
        true,
        catalog.items.map(d => d.rarity)
      ) +
      textField(
        'Theme (optional, or add one in Item Themes)',
        'theme',
        draft.theme,
        false,
        catalog.themes.map(d => d.name)
      ) +
      `<label class="zone-field">Price in gold<input name="price" type="number" min="0" max="1000000" step="any" value="${draft.price ?? 0}" required></label><p class="callout">Item definitions are ready for inventory and gacha. Item use and potion effects are not active yet.</p>`;
  if (kind === 'themes')
    fields = textField(
      'Event (optional)',
      'event',
      draft.event,
      false,
      catalog.species.map(d => d.event)
    );
  if (kind === 'atmospheres')
    fields =
      textField('Encounter heading', 'encounterTitle', draft.encounterTitle, true) +
      colorControl('tint', draft.tint, 'Woodland tint') +
      '<p class="preview-note">A new atmosphere becomes available in the zone editor immediately.</p>';
  if (kind === 'siteThemes')
    fields = `<input name="scheme" type="hidden" value="dark">${['dark', 'light'].map(mode => `<fieldset class="zone-pool"><legend>${mode === 'dark' ? 'Dark variant · default' : 'Light variant'}</legend><div class="color-editor-grid">${themeTokens.map(key => colorControl(`${mode}:${key}`, colorsForMode(draft, mode)[key], { bg: 'Page background', panel: 'Panels', 'panel-deep': 'Secondary surfaces', sidebar: 'Sidebar', border: 'Borders', gold: 'Accent text', 'gold-soft': 'Secondary accent', text: 'Main text', muted: 'Secondary text', burgundy: 'Primary buttons', green: 'Success color' }[key])).join('')}</div></fieldset>`).join('')}<p class="preview-note">Save both variants, then choose a theme and mode above. The original theme keeps its original dark appearance.</p>`;
  return `${primary ? '' : heading('', kindName, editorGuidance[kind][0])}
    ${primary ? `<div class="definitions-main"><div class="definitions-header ${kind === 'personalities' ? 'personality-manager-header' : ''}"><h1 class="manager-heading">${managers[kind]}</h1>${kind === 'personalities' ? `<button class="button primary" data-action="new-definition" data-kind="personalities">${icon('spark')} Add New</button>` : ''}</div>` : ''}
    ${kind === 'siteThemes' ? themePicker(catalog, state) : ''}
    <div class="library-workbench"><section class="panel library-list-panel">${kind === 'personalities' ? `<label class="zone-field personality-search"><input type="search" id="definition-search" placeholder="Search..." aria-label="Search personalities"></label>` : `<div class="panel-heading"><h2>Your collection of options</h2></div><label class="zone-field">Find an entry<input type="search" id="definition-search" placeholder="Search by name…"></label><button class="button primary" data-action="new-definition" data-kind="${kind}">${icon('spark')} Add new</button>`}<div class="definition-list">${catalog[kind].map(d => `<button class="definition-list-item ${d.id === draft.id ? 'selected' : ''}" data-action="edit-definition" data-kind="${kind}" data-id="${e(d.id)}" data-search="${e(`${d.name} ${d.group || d.type || d.rarity || ''}`.toLowerCase())}"><strong>${e(d.name)}</strong><small>${e(d.group || d.type || d.event || d.rarity || (d.traitsComplete === false ? 'Trait data incomplete' : ''))}</small></button>`).join('')}</div><p id="definition-no-results" hidden>No matching entries.</p></section>
    <form id="definition-form" class="panel" ${showEditor ? '' : 'hidden'} data-kind="${kind}" data-id="${e(draft.id || '')}"><div class="panel-heading"><div><h2>${current ? 'Edit ' + e(current.name) : 'Create a new entry'}</h2><p>${e(editorGuidance[kind][1])}</p></div>${kind === 'personalities' ? `<button type="button" class="icon-button personality-editor-close" data-action="close-personality-editor" aria-label="Close personality editor">${icon('close')}</button>` : ''}</div>
    ${readOnly ? '<p class="callout">The original theme is always preserved. Duplicate it below to make your own version.</p>' : ''}
    <fieldset class="definition-fields" ${readOnly ? 'disabled' : ''}>
    ${textField('Name', 'name', draft.name, true)}
    <label class="zone-field">${kind === 'palettes' ? 'Notes' : kind === 'species' ? 'Description (optional)' : kind === 'eyes' ? 'Description' : 'Description & notes'}<textarea name="description" maxlength="4000" rows="4" placeholder="Add appearance, behavior, lore, or other details…">${e(draft.description || '')}</textarea></label>
    ${['species', 'palettes', 'eyes', 'personalities'].includes(kind) ? `<input type="hidden" name="systemId" value="${e(draft.systemId || '')}">` : primary && kind !== 'mutations' ? textField('System ID', 'systemId', draft.systemId) : ''}${fields}</fieldset>
    <p id="definition-status" class="form-status" role="status"></p>
    <div class="form-actions">${!readOnly ? '<button class="button primary" type="submit">Save entry</button><button class="button secondary" type="reset">Cancel changes</button>' : ''}${current && !readOnly ? `<button class="text-button" type="button" data-action="delete-definition" data-kind="${kind}" data-id="${e(current.id)}">Delete Entry</button>` : ''}${current && !['personalities', 'palettes'].includes(kind) ? `<button class="text-button" type="button" data-action="duplicate-definition" data-kind="${kind}" data-id="${e(current.id)}">Duplicate</button>` : ''}</div>
    </form></div>${primary ? '</div>' : ''}`;
}
export function readDefinitionForm(form) {
  const data = new FormData(form),
    kind = form.dataset.kind;
  const values = Object.fromEntries(data);
  const colors = [...data].filter(([key]) => key.startsWith('color:'));
  if (kind === 'eyes') values.colors = colors.map(([, value]) => value);
  if (kind === 'palettes') values.colors = Object.fromEntries(colors.map(([key, value]) => [key.slice(6), value]));
  if (kind === 'siteThemes') {
    for (const mode of ['dark', 'light'])
      values[`${mode}Colors`] = Object.fromEntries(
        colors
          .filter(([key]) => key.startsWith(`color:${mode}:`))
          .map(([key, value]) => [key.slice(`color:${mode}:`.length), value])
      );
    values.colors = values.darkColors;
  }
  const lines = key =>
    String(values[key] || '')
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean);
  const json = key => {
    try {
      return JSON.parse(values[key]);
    } catch {
      throw new Error(`${key} must be valid JSON.`);
    }
  };
  if (kind === 'species') {
    values.rarityTier = Number(values.rarityTier);
    if (data.has('traits')) values.traits = json('traits');
    if (data.has('attributes')) values.attributes = json('attributes');
  }
  if (kind === 'personalities') values.behaviorTags = json('behaviorTags');
  if (kind === 'eyes') {
    values.layers = json('layers');
  }
  if (kind === 'mutations') {
    values.thresholds = json('thresholds');
    values.sizeShift = Number(values.sizeShift);
  }
  if (kind === 'palettes') {
    const variance = Number(data.get('variationPercent'));
    if (
      !String(data.get('variationPercent') ?? '').trim() ||
      !Number.isFinite(variance) ||
      variance < 0 ||
      variance > 100
    )
      throw new Error('Color variance must be between 0 and 100%.');
    values.variationPercent =
      variance === Number(form.elements.variationPercent.dataset.defaultVariance) ? null : variance;
    values.global = form.elements.global.checked;
    values.speciesIds = data.getAll('speciesIds');
    values.assetSkins = lines('assetSkins');
  }

  if (kind === 'mutations') values.weight = values.weight === '' ? null : Number(values.weight);
  if (kind === 'items') values.price = Number(values.price);
  if (kind === 'atmospheres') values.tint = values['color:tint'];
  return { kind, id: form.dataset.id || undefined, values };
}
export function applyWebsiteTheme(catalog, state) {
  const selected =
    catalog.siteThemes.find(t => t.id === state.settings.websiteTheme) ||
    catalog.siteThemes.find(t => t.id === 'default');
  const mode = selected.id === 'default' ? 'dark' : state.settings.websiteThemeMode || 'dark';
  const colors = colorsForMode(selected, mode);
  document.documentElement.dataset.theme = selected.id;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.style.colorScheme = mode;
  for (const key of themeTokens) document.documentElement.style.setProperty(`--${key}`, colors[key]);
  document.documentElement.style.setProperty('--button-text', '#FFFFFF');
}
