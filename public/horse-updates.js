import { raritySettings, rarityNames } from './rarity-settings.js';
import { horseCardRank } from './horse-rank.js';
import { horseOverrideValue, horseOverrideBadge } from './horse-override-markers.js';
export { horseOverrideValue } from './horse-override-markers.js';
import { localCalendarDate } from './dates.js';
import { escapeHTML as e, icon, html, raw, setHTML } from './ui.js';
import { horseUpdateFields, horseTraitLimits, traitChoices, traitCountRange } from './horse-update-fields.js';
import { horseFieldOptions } from './horse-fields.js';
import { lockedCosmicLabel } from './horse-update-labels.js';

const modeLabel = {
  keep: 'Keep',
  set: 'Set',
  reroll: 'Reroll',
  clear: 'Clear',
  refresh: 'Use Personality Description',
  reset: 'Reset to Level 0',
  restore: 'Restore Original'
};
const sorted = values => [...values].sort((a, b) => a.name.localeCompare(b.name));
function optionsFor(key, catalog, state) {
  if (key === 'species') return sorted(catalog.species).map(s => [s.id, s.name]);
  if (key === 'palette') return sorted(catalog.palettes.filter(p => p.complete)).map(s => [s.id, s.name]);
  if (['personality', 'eye', 'gender', 'age', 'size'].includes(key))
    return horseFieldOptions(key, catalog, state).map(v => [v.value, v.label]);
  if (key === 'favorite')
    return [
      ['true', 'Yes'],
      ['false', 'No']
    ];
  if (key.startsWith('mutation:'))
    return sorted(
      catalog.mutations.filter(m => !['solar', 'lunar', 'heavenly', 'void', 'astral'].includes(m.name.toLowerCase()))
    ).map(s => [s.id, s.name]);
  if (key.startsWith('trait:')) return [];
  return null;
}
function control(field, catalog, state) {
  const options = optionsFor(field.key, catalog, state);
  if (field.type === 'skill')
    return '<div class="horse-update-skill"><label>Level<input data-value type="number" min="0" max="10" value="0"></label><label>XP<input data-xp type="number" min="0" max="34000" value="0"></label></div>';
  if (options)
    return (
      '<select data-value ' +
      (field.key.startsWith('trait:') ? 'multiple hidden aria-label="Choose traits"' : 'aria-label="Choose value"') +
      '><option value="">Choose…</option>' +
      options.map(([id, label]) => '<option value="' + e(id) + '">' + e(label) + '</option>').join('') +
      '</select>' +
      (field.key.startsWith('trait:') ? '<div class="horse-override-choices" data-trait-choices></div>' : '')
    );
  if (['notes', 'description'].includes(field.key))
    return '<textarea data-value rows="2" maxlength="4000" aria-label="' + e(field.label) + '"></textarea>';
  return (
    '<input data-value type="' +
    (field.type || 'text') +
    '" ' +
    (field.type === 'number' ? 'min="0" max="365000" step="1"' : '') +
    (field.type === 'date' ? ' min="0001-01-01" max="' + localCalendarDate(new Date()) + '"' : '') +
    ' ' +
    (field.type === 'color' ? 'value="#FFFFFF"' : '') +
    ' maxlength="' +
    (field.key === 'name' ? 60 : 100) +
    '" aria-label="' +
    e(field.label) +
    '">'
  );
}
function fieldRow(field, catalog, state, horse) {
  return html`<div class="horse-update-row" data-key="${field.key}">
    <strong>${field.label}${raw(horseOverrideBadge(horse, field.key, state.settings.developerEditMode))}</strong>
    <span class="horse-override-current" data-current-value>—</span>
    <span class="horse-override-proposed" data-override-value>—</span>
    <div class="horse-override-actions">
      <button type="button" class="icon-button" data-edit-override="${field.key}" title="Edit ${field.label}" aria-label="Edit ${field.label}">${raw(icon('edit'))}</button>
      <button type="button" class="icon-button" data-roll-override="${field.key}" title="Reroll ${field.label}" aria-label="Reroll ${field.label}" ${field.modes.some(mode => ['reroll', 'refresh'].includes(mode)) ? '' : raw('disabled')}>${raw(icon('reroll'))}</button>
      <button type="button" class="icon-button" data-remove-override="${field.key}" title="Remove ${field.label} override" aria-label="Remove ${field.label} override" ${horse.overriddenFields?.includes(field.key) ? '' : raw('hidden')}>${raw(icon('trash'))}</button>
    </div>
    <div data-editor hidden><select data-mode hidden aria-hidden="true" tabindex="-1">${field.modes.map(mode => html`<option value="${mode}">${modeLabel[mode]}</option>`)}<option value="restore" hidden>Restore Original</option></select>
    <div data-value-container hidden>${raw(control(field, catalog, state))}</div>
    ${field.key.startsWith('trait:') ? html`<input data-trait-count type="hidden" value="">` : ''}
    <p class="muted" data-field-help></p></div></div>`;
}
const hiddenFields = new Set(['name', 'age', 'daysOwned', 'favorite']);
export const editableHorseFields = horseUpdateFields.filter(
  field => !hiddenFields.has(field.key) && !field.key.startsWith('color:')
);
export function horseOverrideControls(horse, state, catalog) {
  if (!state.settings.horseUpdatesEnabled || !state.horses.some(h => h.id === horse.id)) return '';
  const arrow = html`<span class="chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></span>`;
  return String(html`<form id="horse-update-form" data-copy-ui novalidate><input hidden type="radio" name="horse" value="${horse.id}" checked>
    <div class="horse-update-rules"><div class="horse-edit-heading"><h2>Horse Overrides</h2></div><p class="horse-edit-notification" data-horse-notification role="status" aria-live="polite" hidden></p>
    ${[...new Set(editableHorseFields.map(f => f.group))].map(group => html`<details class="zone-editor-section horse-edit-section" data-override-section="${group}"><summary>${raw(icon(group === 'Species Traits' ? 'spark' : group === 'Mutations' ? 'wing' : group === 'Skills' ? 'agility' : group === 'Appearance' ? 'palette' : 'edit'))}<span>${group}</span>${arrow}</summary><div class="zone-disclosure-body"><div class="horse-edit-columns"><span>Field</span><span>Original</span><span>Override</span><span>Change</span></div>${editableHorseFields.filter(f => f.group === group).map(field => fieldRow(field, catalog, state, horse))}<div class="form-actions horse-section-actions" hidden><button type="button" class="button primary" data-save-section disabled>Save</button><button type="button" class="button secondary" data-cancel-section disabled>Cancel</button></div><p class="horse-section-status" role="status"></p></div></details>`)}
    </div>
    <dialog class="horse-edit-dialog horse-override-dialog" aria-labelledby="horse-override-field-title"><div class="dialog-top"><h2 id="horse-override-field-title"></h2><button type="button" class="icon-button" data-cancel-override aria-label="Cancel field edit">${raw(icon('close'))}</button></div><div data-dialog-editor></div><p role="status"></p><div class="form-actions"><button type="button" class="button primary" data-save-override>Use This Override</button><button type="button" class="button secondary" data-cancel-override>Cancel</button></div></dialog>
    <dialog class="horse-edit-dialog horse-species-confirm-dialog" aria-labelledby="horse-species-confirm-title"><div data-species-confirm-content></div><div class="form-actions"><button type="button" class="button primary" data-confirm-species-save>Confirm Save</button><button type="button" class="button secondary" data-cancel-species-save>Cancel</button></div></dialog>
    </form>`);
}
function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'object')
    return value === 'Awaiting species data' ? 'None' : value === '' ? 'Empty' : String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(', ') || 'None';
  if (value.name) return value.name + (value.colors ? ' (' + formatValue(value.colors) + ')' : '');
  return Object.entries(value)
    .map(([key, v]) => key + ': ' + formatValue(v))
    .join('; ');
}
export function speciesConfirmationContent(preview, catalog, horse) {
  const labels = {
    species: 'Species',
    rarityTier: 'Rarity',
    speciesEvent: 'Species Event',
    sizePercent: 'Size (%)',
    caughtAt: 'Acquisition Date'
  };
  const tiers = { 0: 'cosmic', 1: 'ultra-rare', 2: 'rare', 3: 'uncommon', 4: 'common' };
  const colors = raritySettings(catalog).colors;
  const proposed = horse ? structuredClone(horse) : null;
  if (proposed) for (const change of preview.items.flatMap(item => item.changes)) proposed[change.field] = change.after;
  const rank = (value, current) =>
    current
      ? horseCardRank(current, catalog)
      : { key: tiers[value] || 'none', label: rarityNames[tiers[value]] || 'None' };
  const rarity = value =>
    html`<span class="horse-confirm-rarity" ${colors[value.key] ? html`style="color:${colors[value.key]}"` : ''}>${value.label}</span>`;
  const rows = [];
  for (const change of preview.items.flatMap(item => item.changes)) {
    if (change.field === 'traits') {
      for (const category of new Set([...Object.keys(change.before || {}), ...Object.keys(change.after || {})])) {
        const before = change.before?.[category] || [],
          after = change.after?.[category] || [];
        if (JSON.stringify(before) !== JSON.stringify(after)) rows.push({ label: category, before, after });
      }
    } else if (change.field === 'rarityTier') {
      rows.push({
        label: 'Rarity',
        before: rank(change.before, horse),
        after: rank(change.after, proposed),
        rarity: true
      });
    } else if (!/Id$|^eyeLayers$|^Override status$|^traitsComplete$/.test(change.field)) {
      rows.push({
        label: labels[change.field] || change.field[0].toUpperCase() + change.field.slice(1),
        before: change.before,
        after: change.after
      });
    }
  }
  return html`<div class="dialog-top"><h2 id="horse-species-confirm-title">Confirm Species Changes</h2><button type="button" class="icon-button" data-cancel-species-save aria-label="Cancel species save">${raw(icon('close'))}</button></div><p>Updating a species also updates species-specific traits. The amount of traits stay the same. Update the amount of traits in the Traits override section. Cosmic horses get the max amount of traits per category</p><div class="horse-species-change-table"><table><thead><tr><th>Field</th><th>Current</th><th>After Change</th></tr></thead><tbody>${rows.map(row => html`<tr><th>${row.label}</th><td>${row.rarity ? rarity(row.before) : formatValue(row.before)}</td><td>${row.rarity ? rarity(row.after) : formatValue(row.after)}</td></tr>`)}</tbody></table></div>`;
}
export function bindHorseUpdates({ root, getState, getCatalog, preview, apply, onApplied }) {
  let working = false,
    editing = null,
    baselines = new Map(),
    rolledSections = new Map();
  const selectedHorse = form => getState().horses.find(h => h.id === form.querySelector('[name=horse]:checked')?.value);
  const editorInputs = editor => [...editor.querySelectorAll('input:not([data-trait-choice]),select,textarea')];
  const snapshot = editor =>
    editorInputs(editor).map(input => ({
      value: input.value,
      selected: input.multiple ? [...input.selectedOptions].map(o => o.value) : null
    }));
  const displayValue = (key, value) => (key === 'palette' ? value?.name || 'None' : formatValue(value));
  function showNotice(message, error = false) {
    const notice = root.querySelector('[data-horse-notification]');
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = message;
    notice.dataset.error = String(error);
    notice.scrollIntoView({ block: 'nearest' });
  }
  function clearSpeciesPreview(form) {
    delete form.dataset.resolvedSpeciesId;
    refreshTraits(form);
    for (const row of form.querySelectorAll('[data-species-generated]')) {
      delete row.dataset.speciesGenerated;
      delete row.dataset.resolvedValue;
      if (row.querySelector('[data-mode]').value === 'keep' && baselines.has(row.dataset.key))
        restoreInputs(row.querySelector('[data-editor]'), baselines.get(row.dataset.key));
    }
  }
  function rowChanged(row) {
    const mode = row.querySelector('[data-mode]').value;
    if (mode === 'keep') return false;
    if (mode === 'set' && baselines.has(row.dataset.key))
      return (
        JSON.stringify(snapshot(row.querySelector('[data-editor]')).slice(1)) !==
        JSON.stringify(baselines.get(row.dataset.key).slice(1))
      );
    if (mode === 'clear') {
      const value = horseOverrideValue(selectedHorse(row.closest('form')), row.dataset.key);
      return Array.isArray(value) ? value.length > 0 : !!value;
    }
    return true;
  }
  function syncSection(section) {
    const dirty = [...section.querySelectorAll('[data-key]')].some(rowChanged);
    section.querySelector('.horse-section-actions').hidden = !dirty;
    for (const button of section.querySelectorAll('[data-save-section],[data-cancel-section]'))
      button.disabled = working || !dirty;
  }
  function restoreInputs(editor, saved) {
    editorInputs(editor).forEach((input, index) => {
      input.value = saved[index].value;
      if (input.multiple)
        for (const option of input.options) option.selected = saved[index].selected.includes(option.value);
    });
  }
  function updateRow(row, form) {
    const horse = selectedHorse(form);
    if (!horse) return;
    const key = row.dataset.key,
      mode = row.querySelector('[data-mode]').value;
    const saved = horse.overriddenFields?.includes(key),
      input = row.querySelector('[data-value]');
    let value = saved ? displayValue(key, horseOverrideValue(horse, key)) : '—';
    if (mode === 'set')
      value = input.multiple
        ? [...input.selectedOptions].map(option => option.textContent).join(', ') || 'None'
        : input.tagName === 'SELECT'
          ? input.selectedOptions[0]?.textContent || 'Choose a value'
          : key.startsWith('skill:')
            ? `Level ${input.value} · ${row.querySelector('[data-xp]').value} XP`
            : input.value || 'Empty';
    else if (['reroll', 'refresh'].includes(mode)) value = row.dataset.resolvedValue || '—';
    else if (mode !== 'keep') value = modeLabel[mode];
    if (row.dataset.speciesGenerated && mode === 'keep') value = row.dataset.resolvedValue;
    row.querySelector('[data-override-value]').textContent = value;
    const remove = row.querySelector('[data-remove-override]');
    remove.hidden = mode === 'restore' || (!saved && mode === 'keep');
    remove.disabled = row.dataset.locked === 'true' || (saved && !horse.overrideOriginals?.[key] && mode === 'keep');
    syncSection(row.closest('[data-override-section]'));
    remove.title =
      remove.disabled && saved && !horse.overrideOriginals?.[key]
        ? 'Original value was not recorded for this older override'
        : 'Remove ' + row.querySelector('strong').textContent + ' override';
  }
  function finishEdit(form, save) {
    if (!editing) return;
    const { row, editor, before } = editing;
    if (!save)
      editorInputs(editor).forEach((input, index) => {
        input.value = before[index].value;
        if (input.multiple)
          for (const option of input.options) option.selected = before[index].selected.includes(option.value);
      });
    row.append(editor);
    editor.hidden = true;
    const dialog = form.querySelector('.horse-override-dialog');
    dialog.close();
    form.append(dialog);
    editing = null;
    updateRow(row, form);
    refreshTraits(form);
    row.querySelector('[data-edit-override]').focus();
  }
  function selectHorse(form, id) {
    if (editing) finishEdit(form, false);
    for (const input of form.querySelectorAll('[name=horse]')) input.checked = input.value === id;
    const horse = selectedHorse(form);
    if (!horse) return;
    invalidate();
    form.querySelector('.horse-update-rules').hidden = false;

    for (const row of form.querySelectorAll('[data-key]')) {
      const value = horseOverrideValue(horse, row.dataset.key),
        input = row.querySelector('[data-value]');
      const original = horse.overrideOriginals?.[row.dataset.key];
      row.querySelector('[data-current-value]').textContent = original
        ? displayValue(row.dataset.key, original.value)
        : horse.overriddenFields?.includes(row.dataset.key)
          ? 'Not recorded'
          : displayValue(row.dataset.key, value);
      row.querySelector('[data-mode]').value = 'keep';
      const protectedSlot = row.dataset.key.startsWith('mutation:') && !!lockedCosmicLabel({ mutations: [value] });
      row.querySelector('[data-edit-override]').disabled =
        protectedSlot || !horseUpdateFields.find(field => field.key === row.dataset.key).modes.includes('set');
      row.querySelector('[data-roll-override]').disabled ||= protectedSlot;
      row.dataset.locked = String(protectedSlot);
      row.querySelector('[data-value-container]').hidden = true;
      const count = row.querySelector('[data-trait-count]');
      if (count) count.value = '';
      delete row.dataset.resolvedValue;
      input.value = value && typeof value === 'object' ? value.id || '' : String(value ?? '');
      if (row.dataset.key === 'species')
        input.value = horse.speciesId || getCatalog().species.find(s => s.name === horse.species)?.id || '';
      if (row.dataset.key.startsWith('skill:')) {
        input.value = value.level;
        row.querySelector('[data-xp]').value = value.xp;
      }
    }
    refreshTraits(form);
    for (const row of form.querySelectorAll('[data-key^="trait:"]')) {
      const chosen = horseOverrideValue(horse, row.dataset.key);
      for (const option of row.querySelector('[data-value]').options) option.selected = chosen.includes(option.value);
    }
    refreshTraits(form);
    for (const row of form.querySelectorAll('[data-key]')) updateRow(row, form);
  }
  const invalidate = () => {
    const form = root.querySelector('#horse-update-form');
    if (form) for (const row of form.querySelectorAll('[data-key]')) updateRow(row, form);
  };
  function readSectionRules(section) {
    const rules = {};
    for (const row of section.querySelectorAll('[data-key]')) {
      const mode = row.querySelector('[data-mode]').value;
      if (!rowChanged(row)) continue;
      const key = row.dataset.key,
        rule = { mode },
        input = row.querySelector('[data-value]');
      if (mode === 'set') {
        if (input.tagName === 'SELECT' && !input.multiple && !input.value)
          throw new Error('Choose a value for ' + row.querySelector('strong').textContent + '.');
        rule.value = input.multiple ? [...input.selectedOptions].map(option => option.value) : input.value;
        if (key.startsWith('skill:'))
          rule.value = { level: Number(input.value), xp: Number(row.querySelector('[data-xp]').value) };
      }
      const count = row.querySelector('[data-trait-count]');
      if (mode === 'reroll' && count?.value.trim()) rule.count = Number(count.value);
      rules[key] = rule;
    }
    return rules;
  }
  async function resolveRerolls(form, section) {
    const rules = readSectionRules(section),
      key = section.dataset.overrideSection;
    rolledSections.delete(key);
    const rows = [...section.querySelectorAll('[data-key]')].filter(row =>
      ['reroll', 'refresh'].includes(row.querySelector('[data-mode]').value)
    );
    const speciesEdit = !!rules.species && rules.species.mode !== 'keep';
    if (section.querySelector('[data-key=species]')) clearSpeciesPreview(form);
    if (!rows.length && !speciesEdit) {
      refreshTraits(form);
      invalidate();
      return;
    }
    const wasWorking = working;
    working = true;
    for (const node of form.querySelectorAll('[data-override-section]')) syncSection(node);
    const status = section.querySelector('[role=status]');
    section.setAttribute('aria-busy', 'true');
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await preview(
        { ids: [selectedHorse(form).id], rules, allowDuplicates: !!getCatalog().spawning.ALLOW_DUPLICATE_MUTATIONS },
        controller.signal
      );
      if (!root.contains(form)) return;
      const proposed = structuredClone(selectedHorse(form));
      for (const change of result.preview.items[0].changes)
        if (change.field !== 'Override status') proposed[change.field] = change.after;
      if (speciesEdit) {
        form.dataset.resolvedSpeciesId = proposed.speciesId;
        refreshTraits(form);
        for (const row of form.querySelectorAll('[data-key^="trait:"]'))
          if (row.querySelector('[data-mode]').value === 'keep') {
            row.dataset.speciesGenerated = 'true';
            rows.push(row);
          }
      }
      for (const row of rows) {
        const value = horseOverrideValue(proposed, row.dataset.key),
          input = row.querySelector('[data-value]');
        if (input.multiple) {
          for (const option of input.options) option.selected = value.includes(option.value);
        } else if (row.dataset.key !== 'mutations')
          input.value =
            row.dataset.key === 'species'
              ? proposed.speciesId
              : value && typeof value === 'object'
                ? value.id || ''
                : String(value ?? '');
        row.dataset.resolvedValue = displayValue(row.dataset.key, value);
        updateRow(row, form);
      }
      rolledSections.set(key, { signature: JSON.stringify(rules), result });
      status.textContent = '';
    } catch (error) {
      const message = controller.signal.aborted ? 'Reroll timed out. Please try again.' : error.message;
      status.textContent = message;
      showNotice(message, true);
    } finally {
      clearTimeout(timeout);
      section.removeAttribute('aria-busy');
      working = wasWorking;
      for (const node of root.querySelectorAll('[data-override-section]')) syncSection(node);
    }
  }
  function confirmSpecies(form, result) {
    const dialog = form.querySelector('.horse-species-confirm-dialog');
    setHTML(
      dialog.querySelector('[data-species-confirm-content]'),
      speciesConfirmationContent(result.preview, getCatalog(), selectedHorse(form))
    );
    dialog.returnValue = '';
    return new Promise(resolve => {
      const onParentClose = () => dialog.close('cancel');
      root.addEventListener('close', onParentClose, { once: true });
      dialog.addEventListener(
        'close',
        () => {
          root.removeEventListener('close', onParentClose);
          resolve(dialog.returnValue === 'confirm');
        },
        { once: true }
      );
      dialog.onclick = event => {
        if (event.target.closest('[data-confirm-species-save]')) dialog.close('confirm');
        else if (event.target.closest('[data-cancel-species-save]')) dialog.close('cancel');
      };
      dialog.showModal();
      dialog.querySelector('[data-cancel-species-save]').focus();
    });
  }
  async function saveSection(form, section) {
    if (working) return;
    let rules;
    try {
      rules = readSectionRules(section);
    } catch (error) {
      section.querySelector('[role=status]').textContent = error.message;
      showNotice(error.message, true);
      return;
    }
    if (!Object.keys(rules).length) return;
    const drafts = new Map(
      [...form.querySelectorAll('[data-key]')]
        .filter(row => !section.contains(row) && row.querySelector('[data-mode]').value !== 'keep')
        .map(row => [row.dataset.key, snapshot(row.querySelector('[data-editor]'))])
    );
    const open = new Set(
      [...form.querySelectorAll('[data-override-section][open]')].map(node => node.dataset.overrideSection)
    );
    const scroll = root.querySelector('.profile-scroll-frame')?.scrollTop || 0;
    const id = selectedHorse(form).id;
    working = true;
    const controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), 15000);
    let applying = false;
    for (const node of form.querySelectorAll('[data-override-section]')) syncSection(node);
    section.querySelector('[role=status]').textContent = 'Saving…';
    try {
      const cached = rolledSections.get(section.dataset.overrideSection);
      if (
        Object.values(rules).some(rule => ['reroll', 'refresh'].includes(rule.mode)) &&
        cached?.signature !== JSON.stringify(rules)
      )
        throw new Error('Reroll the field again before saving.');
      const result =
        cached?.signature === JSON.stringify(rules)
          ? cached.result
          : await preview(
              { ids: [id], rules, allowDuplicates: !!getCatalog().spawning.ALLOW_DUPLICATE_MUTATIONS },
              controller.signal
            );
      if (!root.contains(form)) return;
      const changed = result.preview.items.some(item => item.changes.length);
      if (changed && rules.species) {
        clearTimeout(timeout);
        section.querySelector('[role=status]').textContent = '';
        if (!(await confirmSpecies(form, result))) return;
        if (!root.contains(form)) return;
        timeout = setTimeout(() => controller.abort(), 15000);
        section.querySelector('[role=status]').textContent = 'Saving…';
      }
      if (changed) {
        applying = true;
        await apply({ token: result.preview.token }, controller.signal);
      }
      onApplied();
      const next = root.querySelector('#horse-update-form');
      if (!next || selectedHorse(next)?.id !== id) return;
      const restoreDrafts = () => {
        for (const row of next.querySelectorAll('[data-key]'))
          if (drafts.has(row.dataset.key))
            restoreInputs(row.querySelector('[data-editor]'), drafts.get(row.dataset.key));
      };
      restoreDrafts();
      refreshTraits(next);
      restoreDrafts();
      refreshTraits(next);
      for (const row of next.querySelectorAll('[data-key]')) updateRow(row, next);
      for (const node of next.querySelectorAll('[data-override-section]'))
        node.open = open.has(node.dataset.overrideSection);
      const savedSection = [...next.querySelectorAll('[data-override-section]')].find(
        node => node.dataset.overrideSection === section.dataset.overrideSection
      );
      if (savedSection) savedSection.querySelector('[role=status]').textContent = changed ? 'Saved.' : 'No changes.';
      showNotice(changed ? section.dataset.overrideSection + ' saved.' : 'No changes to save.');
      const frame = root.querySelector('.profile-scroll-frame');
      if (frame) frame.scrollTop = scroll;
      for (const node of next.querySelectorAll('[data-override-section]'))
        if ([...node.querySelectorAll('[data-mode]')].some(input => ['reroll', 'refresh'].includes(input.value)))
          await resolveRerolls(next, node);
    } catch (error) {
      const message = controller.signal.aborted
        ? applying
          ? 'The save response timed out. Your edits were kept. Reload the app to check whether the save completed before retrying.'
          : 'Validation timed out. Your edits were kept; please try again.'
        : error.message.includes('preview expired')
          ? 'This reroll expired. Reroll the field again before saving.'
          : error.message;
      if (root.contains(section)) section.querySelector('[role=status]').textContent = message;
      showNotice(message, true);
    } finally {
      clearTimeout(timeout);
      working = false;
      for (const node of root.querySelectorAll('[data-override-section]')) syncSection(node);
    }
  }
  function refreshTraits(form) {
    const catalog = getCatalog(),
      state = getState(),
      speciesRow = form.querySelector('[data-key="species"]');
    let species;
    if (speciesRow.querySelector('[data-mode]').value === 'reroll' && form.dataset.resolvedSpeciesId)
      species = catalog.species.filter(s => s.id === form.dataset.resolvedSpeciesId);
    else if (speciesRow.querySelector('[data-mode]').value === 'set')
      species = catalog.species.filter(s => s.id === speciesRow.querySelector('[data-value]').value);
    else {
      const ids = [...form.querySelectorAll('[name=horse]:checked')].map(input => input.value);
      species = state.horses
        .filter(h => ids.includes(h.id))
        .map(h => catalog.species.find(s => s.id === h.speciesId || s.name === h.species))
        .filter(Boolean);
    }
    for (const category of Object.keys(horseTraitLimits)) {
      const select = form.querySelector('[data-key="trait:' + category + '"] [data-value]');
      const chosen = [...select.selectedOptions].map(o => o.value);
      const choices = traitChoices(species[0]?.traits?.[category]);
      const range = traitCountRange(
        category,
        species[0] || { name: '' },
        !!lockedCosmicLabel(selectedHorse(form) || {}),
        choices.length
      );
      setHTML(
        select,
        html`${choices.map(value => html`<option value="${value}" ${chosen.includes(value) ? raw('selected') : ''}>${value}</option>`)}`
      );
      const row = select.closest('[data-key]');
      setHTML(
        row.querySelector('[data-trait-choices]'),
        html`${choices.map(value => html`<label><input type="checkbox" data-trait-choice value="${value}" ${chosen.includes(value) ? raw('checked') : ''} ${!chosen.includes(value) && select.selectedOptions.length >= range.max ? raw('disabled') : ''}>${value}</label>`)}`
      );
      row.dataset.min = range.min;
      row.dataset.max = range.max;
      const count = row.querySelector('[data-trait-count]');
      count.min = range.min;
      count.max = range.max;
      const unknown = speciesRow.querySelector('[data-mode]').value === 'reroll' && !form.dataset.resolvedSpeciesId;
      row.querySelector('[data-mode] option[value="set"]').disabled = unknown || !choices.length;
      row.querySelector('[data-edit-override]').disabled = unknown || !choices.length;
      row.querySelector('[data-mode] option[value="clear"]').disabled = range.min > 0;
      row.querySelector('[data-field-help]').textContent = unknown
        ? 'Rerolling species: use Keep or Reroll here, or set a species first to choose exact traits.'
        : `Choose ${range.min}–${range.max} ${category} traits. Maximum ${horseTraitLimits[category]}. ${select.selectedOptions.length} selected. ${choices.length ? 'Uncheck a choice to make room for another.' : 'No choices defined for this species; reroll preserves saved values unless species changes.'}`;
    }
  }
  root.addEventListener('change', event => {
    const form = event.target.closest('#horse-update-form');
    if (!form) return;
    invalidate();
    if (event.target.matches('[name=horse]')) {
      selectHorse(form, event.target.value);
      return;
    }
    const row = event.target.closest('[data-key]');
    if (row && event.target.matches('[data-trait-choice]')) {
      const option = [...row.querySelector('[data-value]').options].find(o => o.value === event.target.value);
      option.selected = event.target.checked;
    }
    if (row && event.target.matches('[data-mode]')) {
      const mode = event.target.value;
      row.querySelector('[data-value-container]').hidden = mode !== 'set';
      const count = row.querySelector('[data-count-container]');
      if (count) count.hidden = mode !== 'reroll';
    }
    refreshTraits(form);
  });
  root.addEventListener('input', event => {
    const form = event.target.closest('#horse-update-form');
    if (!form) return;
    invalidate();
  });
  root.addEventListener('click', async event => {
    const form = event.target.closest('#horse-update-form');
    if (form && working) return;
    const sectionButton = event.target.closest('[data-save-section],[data-cancel-section]');
    if (form && sectionButton) {
      const section = sectionButton.closest('[data-override-section]');
      if (sectionButton.matches('[data-save-section]')) await saveSection(form, section);
      else {
        for (const row of section.querySelectorAll('[data-key]'))
          restoreInputs(row.querySelector('[data-editor]'), baselines.get(row.dataset.key));
        if (section.querySelector('[data-key=species]')) clearSpeciesPreview(form);
        refreshTraits(form);
        for (const row of form.querySelectorAll('[data-key]')) updateRow(row, form);
        rolledSections.delete(section.dataset.overrideSection);
        for (const row of section.querySelectorAll('[data-key]')) delete row.dataset.resolvedValue;
        section.querySelector('[role=status]').textContent = '';
      }
      return;
    }
    const roll = event.target.closest('[data-roll-override]');
    const remove = event.target.closest('[data-remove-override]');
    if (form && (roll || remove)) {
      const row = (roll || remove).closest('[data-key]');
      if (row.dataset.locked === 'true' || (roll || remove).disabled) return;
      const field = horseUpdateFields.find(field => field.key === row.dataset.key);
      row.querySelector('[data-mode]').value = roll
        ? field.modes.includes('reroll')
          ? 'reroll'
          : 'refresh'
        : selectedHorse(form).overrideOriginals?.[row.dataset.key]
          ? 'restore'
          : 'keep';
      invalidate();
      refreshTraits(form);
      updateRow(row, form);
      await resolveRerolls(form, row.closest('[data-override-section]'));
      return;
    }
    const edit = event.target.closest('[data-edit-override]');
    if (edit && form) {
      if (!selectedHorse(form)) return;
      const row = edit.closest('[data-key]'),
        editor = row.querySelector('[data-editor]'),
        dialog = form.querySelector('.horse-override-dialog');
      editing = { row, editor, before: snapshot(editor) };
      const mode = row.querySelector('[data-mode]');
      mode.value = 'set';
      row.append(dialog);
      dialog.querySelector('[data-dialog-editor]').append(editor);
      editor.hidden = false;
      const field = horseUpdateFields.find(f => f.key === row.dataset.key);
      dialog.querySelector('h2').textContent = field.label;
      dialog.querySelector('[role=status]').textContent = '';
      if (!field.key.startsWith('trait:'))
        editor.querySelector('[data-field-help]').textContent =
          field.type === 'skill'
            ? 'Level 0–10. XP 0–34,000; overflow advances levels and caps at level 10.'
            : field.key.startsWith('mutation')
              ? 'Maximum four mutations. Cosmic-defining slots stay protected. Choices must meet species thresholds; duplicates require the option below.'
              : field.key === 'palette'
                ? 'Only species-compatible palettes can be applied. Cosmic horses keep their defining palette. Colors may vary according to palette settings.'
                : field.key === 'name'
                  ? 'Maximum 60 characters.'
                  : ['notes', 'description'].includes(field.key)
                    ? 'Maximum 4,000 characters.'
                    : ['birthday', 'daysOwned'].includes(field.key)
                      ? 'Choose acquisition date or age in days, not both. Dates cannot be in the future. Age: 0–365,000 whole days.'
                      : field.key === 'origin'
                        ? '1–100 characters.'
                        : field.type === 'color'
                          ? 'Choose a color; stored as a six-digit hex value.'
                          : '';
      row.querySelector('[data-value-container]').hidden = row.querySelector('[data-mode]').value !== 'set';

      dialog.oncancel = event => {
        event.preventDefault();
        finishEdit(form, false);
      };
      dialog.showModal();
      editor.querySelector('[data-trait-choice]:not(:disabled),[data-value]:not([hidden])')?.focus();
      return;
    }
    if (form && event.target.closest('[data-cancel-override]')) {
      finishEdit(form, false);
      return;
    }
    if (form && event.target.closest('[data-save-override]') && editing) {
      const { row, editor } = editing,
        mode = row.querySelector('[data-mode]').value;
      const inputs =
        mode === 'set'
          ? [...editor.querySelectorAll('[data-value], [data-xp]')]
          : mode === 'reroll'
            ? [...editor.querySelectorAll('[data-trait-count]')]
            : [];
      const input = inputs.find(input => !input.checkValidity());
      const value = row.querySelector('[data-value]');
      let error = input ? input.validationMessage : '';
      if (mode === 'set' && ['origin', 'birthday', 'daysOwned'].includes(row.dataset.key) && !value.value.trim())
        error = 'Enter a value.';
      if (
        mode === 'set' &&
        row.dataset.key.startsWith('skill:') &&
        (!value.value.trim() || !row.querySelector('[data-xp]').value.trim())
      )
        error = 'Enter both level and XP.';
      if (row.querySelector('[data-mode]').selectedOptions[0].disabled)
        error = 'This operation is unavailable for the chosen species. Choose another operation.';
      if (mode === 'set' && value.tagName === 'SELECT' && !value.multiple && !value.value) error = 'Choose a value.';
      if (
        mode === 'set' &&
        value.multiple &&
        (value.selectedOptions.length < Number(row.dataset.min) ||
          value.selectedOptions.length > Number(row.dataset.max))
      )
        error = `Choose ${row.dataset.min}–${row.dataset.max} traits.`;
      if (error) {
        form.querySelector('.horse-override-dialog [role=status]').textContent = error;
        return;
      }
      invalidate();
      const section = row.closest('[data-override-section]');
      delete row.dataset.resolvedValue;
      finishEdit(form, true);
      await resolveRerolls(form, section);
      return;
    }
  });
  root.addEventListener(
    'submit',
    event => {
      if (event.target.id !== 'horse-update-form') return;
      event.preventDefault();
      event.stopPropagation();
      if (editing) event.target.querySelector('[data-save-override]').click();
    },
    true
  );
  return {
    initialize() {
      editing = null;
      rolledSections.clear();
      invalidate();
      const form = root.querySelector('#horse-update-form');
      if (form) {
        selectHorse(form, form.querySelector('[name=horse]').value);
        baselines = new Map(
          [...form.querySelectorAll('[data-key]')].map(row => [
            row.dataset.key,
            snapshot(row.querySelector('[data-editor]'))
          ])
        );
      }
    }
  };
}
