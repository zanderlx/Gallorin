import { stablePage } from './pages.js';
import { profileContent } from './profile.js';
import { horseAcquisitionDate, horseDaysOwned, localCalendarDate } from './dates.js';
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
  reset: 'Reset to Level 0'
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
export function horseOverrideValue(horse, key) {
  const [kind, name] = key.split(':');
  if (kind === 'trait') return horse.traits?.[name] || horse.traits?.[name + 's'] || [];
  if (kind === 'mutation') return horse.mutations?.[Number(name)] || null;
  if (kind === 'color') return horse.palette?.colors?.[name] || '';
  if (kind === 'skill') return horse.skills?.[name] || { level: 0, xp: 0 };
  if (key === 'description') return horse.personalityDescription ?? horse.personality?.description ?? '';
  if (key === 'birthday') return horseAcquisitionDate(horse) || horse.birthday || '';
  if (key === 'daysOwned') return horseDaysOwned(horse);
  if (key === 'mutations') return horse.mutations || [];
  return horse[key];
}
function fieldRow(field, catalog, state) {
  return html`<div class="horse-update-row" data-key="${field.key}">
    <strong>${field.label}</strong><span class="horse-override-current" data-current-value>—</span>
    <button type="button" class="button secondary" data-edit-override="${field.key}" aria-label="Edit ${field.label}">Edit<span data-rule-summary> · Keep</span></button>
    <div data-editor hidden><label>Operation<select data-mode aria-label="${field.label} operation">${field.modes.map(mode => html`<option value="${mode}">${modeLabel[mode]}</option>`)}</select></label>
    <div data-value-container hidden>${raw(control(field, catalog, state))}</div>
    ${field.key.startsWith('trait:') ? html`<label data-count-container hidden>Count (blank = random)<input data-trait-count type="number" min="0" max="${horseTraitLimits[field.label]}" placeholder="Auto"></label>` : ''}
    <p class="muted" data-field-help></p></div></div>`;
}
export function horseUpdatesPage(state, catalog) {
  return String(
    html`<section id="horse-updates">${raw(stablePage('all', state, catalog).replace('>My Horses</h1>', '>Horse Overrides</h1>'))}<dialog class="horse-overrides-profile horse-import-preview" aria-labelledby="profile-title"></dialog></section>`
  );
}
export function horseOverrideProfile(horse, state, catalog) {
  const controls = html`<section class="panel horse-update-rules"><div class="settings-section-heading"><h2 data-override-title>Horse Overrides</h2><button type="button" class="button secondary" data-reset-overrides>Reset Overrides</button></div><p>Current saved values appear below. Edit a field to prepare a change; values stay unchanged until you preview and apply. Closing this profile clears prepared overrides.</p>
      <p>Species changes require compatible traits and palettes. Size rerolls use the final mutations. A new personality keeps the description unless you edit it too.</p>
      ${[...new Set(horseUpdateFields.map(f => f.group))].map(group => html`<section class="horse-override-group"><h3>${group}</h3>${horseUpdateFields.filter(f => f.group === group).map(field => fieldRow(field, catalog, state))}</section>`)}
      <label class="horse-update-duplicates"><input type="checkbox" name="allowDuplicates" ${catalog.spawning.ALLOW_DUPLICATE_MUTATIONS ? raw('checked') : ''}> Allow Duplicate Mutations For This Override</label>
      <p>Four mutation slots maximum; Cosmic slots are kept. Choose either all-mutation reroll or individual slots. Acquisition date and age in days control the same date; choose one.</p>
      <div class="form-actions"><button type="submit" class="button primary">${raw(icon('refresh'))} Preview Changes</button></div></section>
      <dialog class="horse-edit-dialog horse-override-dialog" aria-labelledby="horse-override-field-title"><div class="dialog-top"><h2 id="horse-override-field-title"></h2><button type="button" class="icon-button" data-cancel-override aria-label="Cancel field edit">${raw(icon('close'))}</button></div><div data-dialog-editor></div><p role="status"></p><div class="form-actions"><button type="button" class="button primary" data-save-override>Use This Override</button><button type="button" class="button secondary" data-cancel-override>Cancel</button></div></dialog>
      <section id="horse-update-preview" aria-live="polite"></section>`;
  const content = state.settings.horseUpdatesEnabled
    ? html`<button type="button" class="button secondary horse-update-disable" data-enable-horse-updates="false">Disable Horse Overrides</button>${controls}`
    : html`<p>Enable Horse Overrides to keep, set, or reroll this horse’s values. Every application creates a save backup; Cosmic-defining mutations stay protected.</p><button type="button" class="button primary" data-enable-horse-updates="true">Enable Horse Overrides</button>`;
  return html`<form id="horse-update-form" data-copy-ui novalidate><input hidden type="radio" name="horse" value="${horse.id}" checked>${raw(profileContent(horse, state, { importPreview: true, catalog, overrideContent: String(content) }))}</form>`;
}
function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'object') return value === '' ? 'Empty' : String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(', ') || 'None';
  if (value.name) return value.name + (value.colors ? ' (' + formatValue(value.colors) + ')' : '');
  return Object.entries(value)
    .map(([key, v]) => key + ': ' + formatValue(v))
    .join('; ');
}
export function bindHorseUpdates({ root, getState, getCatalog, preview, apply, enable, onApplied, notify }) {
  let token = null,
    working = false,
    editing = null,
    draftRevision = 0;
  const selectedHorse = form => getState().horses.find(h => h.id === form.querySelector('[name=horse]:checked')?.value);
  const editorInputs = editor => [...editor.querySelectorAll('input:not([data-trait-choice]),select,textarea')];
  const snapshot = editor =>
    editorInputs(editor).map(input => ({
      value: input.value,
      selected: input.multiple ? [...input.selectedOptions].map(o => o.value) : null
    }));
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
    const dialog = form.querySelector('dialog');
    dialog.close();
    form.append(dialog);
    editing = null;
    const mode = row.querySelector('[data-mode]').value,
      input = row.querySelector('[data-value]');
    row.querySelector('[data-rule-summary]').textContent =
      ' · ' +
      modeLabel[mode] +
      (mode === 'set'
        ? ': ' +
          (input.multiple
            ? [...input.selectedOptions].map(o => o.textContent).join(', ') || 'None'
            : input.tagName === 'SELECT'
              ? input.selectedOptions[0]?.textContent || ''
              : input.value)
        : '');
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
    form.querySelector('[data-override-title]').textContent = horse.name || horse.species;

    for (const row of form.querySelectorAll('[data-key]')) {
      const value = horseOverrideValue(horse, row.dataset.key),
        input = row.querySelector('[data-value]');
      row.querySelector('[data-current-value]').textContent = formatValue(value);
      row.querySelector('[data-mode]').value = 'keep';
      row.querySelector('[data-rule-summary]').textContent = ' · Keep';
      const protectedSlot = row.dataset.key.startsWith('mutation:') && !!lockedCosmicLabel({ mutations: [value] });
      row.querySelector('[data-edit-override]').disabled = protectedSlot;
      if (protectedSlot) row.querySelector('[data-rule-summary]').textContent = ' · Cosmic locked';
      row.querySelector('[data-value-container]').hidden = true;
      const count = row.querySelector('[data-count-container]');
      if (count) {
        count.hidden = true;
        row.querySelector('[data-trait-count]').value = '';
      }
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
  }
  const invalidate = () => {
    draftRevision++;
    token = null;
    const output = root.querySelector('#horse-update-preview');
    if (output) output.replaceChildren();
  };
  function refreshTraits(form) {
    const catalog = getCatalog(),
      state = getState(),
      speciesRow = form.querySelector('[data-key="species"]');
    let species;
    if (speciesRow.querySelector('[data-mode]').value === 'set')
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
      const unknown = speciesRow.querySelector('[data-mode]').value === 'reroll';
      row.querySelector('[data-mode] option[value="set"]').disabled = unknown || !choices.length;
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
    const page = root.querySelector('#horse-updates');
    if (!page) return;
    const close = event.target.closest('[data-close-overrides]');
    if (close) {
      event.preventDefault();
      page.querySelector('.horse-overrides-profile').close();
      invalidate();
      return;
    }
    const horseCard = event.target.closest('#collection-grid .horse-card');
    if (horseCard && !event.target.closest('[data-action="favorite"]')) {
      event.stopPropagation();
      event.preventDefault();
      const id = horseCard.querySelector('[data-action="inspect"]').dataset.id;
      const horse = getState().horses.find(h => h.id === id);
      const dialog = page.querySelector('.horse-overrides-profile');
      editing = null;
      setHTML(dialog, horseOverrideProfile(horse, getState(), getCatalog()));
      if (getState().settings.horseUpdatesEnabled) selectHorse(dialog.querySelector('form'), id);
      dialog.oncancel = () => invalidate();
      dialog.showModal();
      return;
    }
    const form = event.target.closest('#horse-update-form');
    if (form && event.target.closest('[data-reset-overrides]')) {
      selectHorse(form, selectedHorse(form)?.id);
      return;
    }
    const edit = event.target.closest('[data-edit-override]');
    if (edit && form) {
      if (!selectedHorse(form)) return;
      const row = edit.closest('[data-key]'),
        editor = row.querySelector('[data-editor]'),
        dialog = form.querySelector('dialog');
      editing = { row, editor, before: snapshot(editor) };
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
      const count = row.querySelector('[data-count-container]');
      if (count) count.hidden = row.querySelector('[data-mode]').value !== 'reroll';
      dialog.oncancel = event => {
        event.preventDefault();
        finishEdit(form, false);
      };
      dialog.showModal();
      editor.querySelector('[data-mode]').focus();
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
        form.querySelector('dialog [role=status]').textContent = error;
        return;
      }
      invalidate();
      finishEdit(form, true);
      return;
    }
    const unlock = event.target.closest('[data-enable-horse-updates]');
    if (unlock) {
      if (working) return;
      working = true;
      const horseId = selectedHorse(unlock.closest('form'))?.id;
      try {
        await enable(unlock.dataset.enableHorseUpdates === 'true');
        invalidate();
        onApplied();
        [...root.querySelectorAll('#collection-grid [data-action="inspect"]')]
          .find(button => button.dataset.id === horseId)
          ?.click();
        root.querySelector('[data-profile-tab="overrides"]')?.click();
      } catch (error) {
        notify(error.message, true);
      } finally {
        working = false;
      }
      return;
    }
    const button = event.target.closest('[data-apply-horse-updates]');
    if (!button || working || !token) return;
    working = true;
    button.disabled = true;
    try {
      await apply({ token });
      token = null;
      onApplied();
      notify('Horse overrides applied. Backup saved.');
    } catch (error) {
      invalidate();
      notify(error.message, true);
    } finally {
      working = false;
      button.disabled = false;
    }
  });
  root.addEventListener(
    'submit',
    async event => {
      const form = event.target;
      if (form.id !== 'horse-update-form') return;
      event.preventDefault();
      event.stopPropagation();
      if (editing) {
        form.querySelector('[data-save-override]').click();
        return;
      }
      if (working) return;
      invalidate();
      const revision = draftRevision;
      working = true;
      const button = form.querySelector('[type=submit]');
      button.disabled = true;
      try {
        const rules = {};
        for (const row of form.querySelectorAll('[data-key]')) {
          const mode = row.querySelector('[data-mode]').value;
          if (mode === 'keep') continue;
          const key = row.dataset.key,
            rule = { mode },
            input = row.querySelector('[data-value]');
          if (mode === 'set') {
            if (input.tagName === 'SELECT' && !input.multiple && !input.value)
              throw new Error('Choose a value for ' + row.querySelector('strong').textContent + '.');
            rule.value = input.multiple ? [...input.selectedOptions].map(o => o.value) : input.value;
            if (key === 'favorite') rule.value = rule.value === 'true';
            if (key === 'daysOwned') rule.value = input.value.trim() ? Number(input.value) : NaN;
            if (key.startsWith('skill:'))
              rule.value = {
                level: input.value.trim() ? Number(input.value) : NaN,
                xp: row.querySelector('[data-xp]').value.trim() ? Number(row.querySelector('[data-xp]').value) : NaN
              };
          }
          const count = row.querySelector('[data-trait-count]');
          if (mode === 'reroll' && count?.value.trim()) rule.count = Number(count.value);
          rules[key] = rule;
        }
        const result = await preview({
          ids: [...form.querySelectorAll('[name=horse]:checked')].map(i => i.value),
          rules,
          allowDuplicates: form.elements.allowDuplicates.checked
        });
        if (revision !== draftRevision || !root.contains(form)) return;
        token = result.preview.token;
        const changed = result.preview.items.filter(item => item.changes.length);
        // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
        root.querySelector('#horse-update-preview').innerHTML =
          '<section class="panel"><h2>Review Changes</h2><p>' +
          changed.length +
          ' of ' +
          result.preview.items.length +
          ' horses will change. Nothing has been applied. Preview expires in 10 minutes.</p>' +
          result.preview.items
            .map(
              item =>
                '<details open><summary>' +
                e(item.name) +
                ' · Revision ' +
                item.revision +
                '</summary>' +
                item.warnings.map(w => '<p class="horse-update-warning">' + e(w) + '</p>').join('') +
                (item.changes.length
                  ? '<div class="horse-update-table-wrap"><table><thead><tr><th>Field</th><th>Current</th><th>Proposed</th></tr></thead><tbody>' +
                    item.changes
                      .map(
                        c =>
                          '<tr><th>' +
                          e(c.field) +
                          '</th><td>' +
                          e(formatValue(c.before)) +
                          '</td><td>' +
                          e(formatValue(c.after)) +
                          '</td></tr>'
                      )
                      .join('') +
                    '</tbody></table></div>'
                  : '<p>No changes.</p>') +
                '</details>'
            )
            .join('') +
          (changed.length
            ? '<div class="form-actions"><button type="button" class="button primary" data-apply-horse-updates>Apply Reviewed Changes</button></div>'
            : '') +
          '</section>';
      } catch (error) {
        notify(error.message, true);
      } finally {
        working = false;
        button.disabled = false;
      }
    },
    true
  );
}
