import { escapeHTML as e, icon } from './ui.js';
import { horseUpdateFields, horseTraitLimits } from './horse-update-fields.js';
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
      (field.key.startsWith('trait:') ? 'multiple aria-label="Choose traits"' : 'aria-label="Choose value"') +
      '><option value="">Choose…</option>' +
      options.map(([id, label]) => '<option value="' + e(id) + '">' + e(label) + '</option>').join('') +
      '</select>'
    );
  if (['notes', 'description'].includes(field.key))
    return '<textarea data-value rows="2" maxlength="4000" aria-label="' + e(field.label) + '"></textarea>';
  return (
    '<input data-value type="' +
    (field.type || 'text') +
    '" ' +
    (field.type === 'number' ? 'min="0" max="365000" step="1"' : '') +
    ' ' +
    (field.type === 'color' ? 'value="#FFFFFF"' : '') +
    ' maxlength="100" aria-label="' +
    e(field.label) +
    '">'
  );
}
export function horseUpdatesPage(state, catalog) {
  return (
    '<section id="horse-updates"><div class="settings-section-heading"><h1>Horse Updates</h1></div><p class="horse-update-intro">Keep existing details, reroll selected fields, or choose exact values. Preview first; apply only when ready. Cosmic-defining mutations stay protected. Every application creates a save backup.</p>' +
    (!state.settings.horseUpdatesEnabled
      ? '<section class="panel"><p>Enable Horse Updates to unlock this developer tool.</p><button class="button primary" data-enable-horse-updates="true">Enable Horse Updates</button></section>'
      : '<button type="button" class="button secondary horse-update-disable" data-enable-horse-updates="false">Disable Horse Updates</button><form id="horse-update-form" data-copy-ui><section class="panel"><h2>Choose Horses</h2><div class="horse-update-selection-tools"><input data-horse-search type="search" placeholder="Search horses…" aria-label="Search horses"><button type="button" class="button secondary" data-horse-select="all">Select Visible</button><button type="button" class="button secondary" data-horse-select="none">Clear Selection</button><span data-selected-count>0 selected · Maximum 100</span></div><div class="horse-update-horses">' +
        state.horses
          .map(
            h =>
              '<label class="horse-update-horse" data-search="' +
              e((h.name + ' ' + h.species).toLowerCase()) +
              '"><input type="checkbox" name="horse" value="' +
              e(h.id) +
              '"><span><strong>' +
              e(h.name || h.species) +
              '</strong><small>' +
              e(h.species) +
              ' · Schema ' +
              (h.schemaVersion || 1) +
              ' · Revision ' +
              (h.revision || 1) +
              (lockedCosmicLabel(h) ? ' · 🔒 ' + e(lockedCosmicLabel(h)) : '') +
              '</small></span></label>'
          )
          .join('') +
        (!state.horses.length ? '<p>No stable horses yet.</p>' : '') +
        '</div></section><section class="panel horse-update-rules"><h2>Choose What Changes</h2><p>Everything starts at Keep. Missing species trait lists are preserved. Rerolling size uses the final mutations; keeping size preserves it. Changing a personality keeps your description unless you select it too.</p>' +
        [...new Set(horseUpdateFields.map(f => f.group))]
          .map(
            (group, index) =>
              '<details ' +
              (index === 0 ? 'open' : '') +
              '><summary>' +
              e(group) +
              '</summary>' +
              horseUpdateFields
                .filter(f => f.group === group)
                .map(
                  field =>
                    '<div class="horse-update-row" data-key="' +
                    e(field.key) +
                    '"><strong>' +
                    e(field.label) +
                    '</strong><select data-mode aria-label="' +
                    e(field.label) +
                    ' operation">' +
                    field.modes.map(mode => '<option value="' + mode + '">' + modeLabel[mode] + '</option>').join('') +
                    '</select><div data-value-container hidden>' +
                    control(field, catalog, state) +
                    '</div>' +
                    (field.key.startsWith('trait:')
                      ? '<label data-count-container hidden>Count (blank = random)<input data-trait-count type="number" min="' +
                        (['Mane', 'Tail'].includes(field.label) ? 1 : 0) +
                        '" max="' +
                        horseTraitLimits[field.label] +
                        '" placeholder="Auto"></label>'
                      : '') +
                    '</div>'
                )
                .join('') +
              '</details>'
          )
          .join('') +
        '<label class="horse-update-duplicates"><input type="checkbox" name="allowDuplicates" ' +
        (catalog.spawning.ALLOW_DUPLICATE_MUTATIONS ? 'checked' : '') +
        '> Allow Duplicate Mutations For This Update</label><p>Mutation rerolls use the current weights and species thresholds. Individual slot rerolls draw one eligible mutation. Cosmic slots are kept. Age in days and acquisition date control the same date; choose one.</p><div class="form-actions"><button type="submit" class="button primary">' +
        icon('refresh') +
        ' Preview Changes</button></div></section></form><section id="horse-update-preview" aria-live="polite"></section>') +
    '</section>'
  );
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
    working = false;
  const invalidate = () => {
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
      const choices = [...new Set(species[0]?.traits?.[category] || [])].filter(
        v => v !== 'None' && species.every(s => s.traits?.[category]?.includes(v))
      );
      select.innerHTML = choices
        .map(
          value =>
            '<option value="' +
            e(value) +
            '" ' +
            (chosen.includes(value) ? 'selected' : '') +
            '>' +
            e(value) +
            '</option>'
        )
        .join('');
    }
  }
  root.addEventListener('change', event => {
    const form = event.target.closest('#horse-update-form');
    if (!form) return;
    invalidate();
    const row = event.target.closest('[data-key]');
    if (row && event.target.matches('[data-mode]')) {
      const mode = event.target.value;
      row.querySelector('[data-value-container]').hidden = mode !== 'set';
      const count = row.querySelector('[data-count-container]');
      if (count) count.hidden = mode !== 'reroll';
    }
    refreshTraits(form);
    form.querySelector('[data-selected-count]').textContent =
      form.querySelectorAll('[name=horse]:checked').length + ' selected · Maximum 100';
  });
  root.addEventListener('input', event => {
    const form = event.target.closest('#horse-update-form');
    if (!form) return;
    if (event.target.matches('[data-horse-search]')) {
      const query = event.target.value.toLowerCase();
      for (const row of form.querySelectorAll('[data-search]')) row.hidden = !row.dataset.search.includes(query);
    } else invalidate();
  });
  root.addEventListener('click', async event => {
    const unlock = event.target.closest('[data-enable-horse-updates]');
    if (unlock) {
      if (working) return;
      working = true;
      try {
        await enable(unlock.dataset.enableHorseUpdates === 'true');
        invalidate();
        onApplied();
      } catch (error) {
        notify(error.message, true);
      } finally {
        working = false;
      }
      return;
    }
    const select = event.target.closest('[data-horse-select]');
    if (select) {
      const form = select.closest('form');
      for (const input of form.querySelectorAll('[name=horse]'))
        if (select.dataset.horseSelect === 'none' || !input.closest('label').hidden)
          input.checked = select.dataset.horseSelect === 'all';
      form.querySelector('[name=horse]')?.dispatchEvent(new Event('change', { bubbles: true }));
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
      notify('Horse updates applied. Backup saved.');
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
      if (working) return;
      invalidate();
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
        token = result.preview.token;
        const changed = result.preview.items.filter(item => item.changes.length);
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
