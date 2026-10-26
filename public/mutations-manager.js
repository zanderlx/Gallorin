import { openEmojiPicker } from './emoji-picker.js';
import { fitMutationDescriptions } from './mutation-card-layout.js';
import { animateCardBody } from './collapsible-cards.js';
import { definitionTransferControls } from './definition-transfer-controls.js';
import { escapeHTML as e, icon, html, raw } from './ui.js';
import { formSignature, formBaseline } from './form-state.js';

const mutationEmojis = {
  'Springy Tendons': '🦘',
  'Powerful Lungs': '🫁',
  'Strong Muscles': '💪',
  'Nimble Hooves': '🩰',
  'Limber Tendons': '🏃',
  'Chimera Mane': '🦁',
  'Chimera Tail': '🐉',
  'Harlequin Mane': '🎭',
  'Harlequin Tail': '🎨',
  Dwarfism: '🐭',
  Gigantism: '🦣',
  Intelligence: '🧠',
  'Double Stamina': '🔋',
  'Close Bond': '💞',
  'Double Jump': '🪽',
  'Very Fertile': '🌱',
  Twins: '👯',
  'Perfect Twins': '🪞',
  Mutated: '🧬',
  Solar: '☀️',
  Lunar: '🌙',
  Heavenly: '👼',
  Void: '🕳️',
  Astral: '🌌'
};
Object.assign(mutationEmojis, {
  Alien: '👽',
  Arcane: '🔮',
  Arisen: '🕊️',
  Artisan: '🖌️',
  Crystallized: '💎',
  Dilute: '🫧',
  'Festive Eye': '🎄',
  'Flowering Sakura': '🌸',
  Frost: '❄️',
  Geode: '🪨',
  Ghost: '👻',
  Ghoul: '🧟',
  Gilded: '🪙',
  Glow: '💡',
  Haunting: '🕯️',
  Jester: '🃏',
  Lacebound: '🧵',
  'North Star': '🧭',
  Porcelain: '🏺',
  Reptile: '🦎',
  'Rose Infection': '🥀',
  'Tie Dye': '🌈',
  Trophy: '🏆',
  'X Ray': '🦴'
});
export const mutationEmoji = mutation =>
  mutation.emoji || mutationEmojis[mutation.name] || (mutation.type === 'Special' ? '🔮' : '🧬');
const typeOrder = ['Standard', 'Special', 'Mutated'];
const compareType = (a, b) =>
  (typeOrder.includes(a) ? typeOrder.indexOf(a) : typeOrder.length) -
    (typeOrder.includes(b) ? typeOrder.indexOf(b) : typeOrder.length) || a.localeCompare(b);
export const mutationTypes = entries => [...new Set([...typeOrder, ...entries.map(m => m.type)])].sort(compareType);

export function filterMutations(
  entries,
  query = '',
  type = '',
  sort = 'name',
  direction = sort === 'weight' ? 'desc' : 'asc'
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter(
      m =>
        (!type || m.type === type) &&
        words.every(word => `${m.name} ${m.type} ${m.description || ''}`.toLowerCase().includes(word))
    )
    .sort(
      (a, b) =>
        (direction === 'desc' ? -1 : 1) *
        (sort === 'type'
          ? compareType(a.type, b.type) || a.name.localeCompare(b.name)
          : sort === 'weight'
            ? Math.abs(a.weight || 0) - Math.abs(b.weight || 0) || a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name))
    );
}
export function mutationResults(entries, sort = 'type', showWeights = false, direction = 'asc', expanded = new Set()) {
  if (sort !== 'type') return mutationCards(entries, showWeights, expanded);
  const types = mutationTypes(entries).filter(type => entries.some(m => m.type === type));
  if (direction === 'desc') types.reverse();
  return types
    .map(
      type =>
        `<section class="eye-rarity-section" data-mutation-section><div class="mutation-section-heading"><h2>${e(type)}</h2><button type="button" class="button secondary" data-action="toggle-mutation-section" aria-expanded="false">Show</button></div><div class="eye-definition-grid mutation-definition-grid personality-card-grid">${mutationCards(
          entries.filter(m => m.type === type),
          showWeights,
          expanded,
          false
        )}</div></section>`
    )
    .join('');
}
export function mutationCards(entries, showWeights = false, expanded = new Set(), showType = true) {
  return entries
    .map(m => {
      const open = expanded.has(m.id);
      return String(
        html`<article class="panel personality-card mutation-collapse-card" data-mutation-card data-id="${m.id}"><div class="personality-card-heading"><div class="mutation-title-block ${showType ? 'mutation-title-with-type' : ''}"><h2 title="${m.name}"><span class="personality-emoji" aria-hidden="true">${mutationEmoji(m)}</span><span class="mutation-card-name">${m.name}</span></h2><span class="mutation-preview-type ${showType ? '' : 'mutation-type-expanded-only'}">${m.type}</span></div><button type="button" class="icon-button personality-toggle" data-action="toggle-mutation" data-name="${m.name}" aria-label="${open ? 'Collapse' : 'Expand'} ${m.name}" aria-expanded="${open}" aria-controls="mutation-body-${m.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div><div class="personality-card-body" id="mutation-body-${m.id}" ${open ? '' : 'hidden inert'}><p class="personality-card-description" tabindex="0" aria-label="${m.name} description">${m.description || 'No description yet.'}</p>${showWeights ? html`<div class="mutation-card-meta"><span>Weight: ${Math.abs(m.weight || 0).toLocaleString()}</span></div>` : ''}<div class="personality-card-actions"><button type="button" class="button secondary" data-action="edit-definition" data-kind="mutations" data-id="${m.id}">${raw(icon('edit'))} Edit</button></div></div></article>`
      );
    })
    .join('');
}
function refreshMutationExpansion(root) {
  for (const button of root.querySelectorAll(
    '[data-action="toggle-all-mutations"],[data-action="toggle-mutation-section"]'
  )) {
    const scope =
      button.dataset.action === 'toggle-mutation-section' ? button.closest('[data-mutation-section]') : root;
    const cards = [...scope.querySelectorAll('[data-mutation-card]')];
    const section = button.dataset.action === 'toggle-mutation-section';
    const isOpen = card => card.querySelector('.personality-toggle').getAttribute('aria-expanded') === 'true';
    const open = cards.length > 0 && (section ? cards.some(isOpen) : cards.every(isOpen));
    button.textContent = open ? (section ? 'Hide' : 'Hide All') : section ? 'Show' : 'Show All';
    button.setAttribute('aria-expanded', String(open));
  }
}
export function toggleMutations(root, button) {
  const individual = button.dataset.action === 'toggle-mutation';
  const scope = button.dataset.action === 'toggle-mutation-section' ? button.closest('[data-mutation-section]') : root;
  const cards = individual
    ? [button.closest('[data-mutation-card]')]
    : [...scope.querySelectorAll('[data-mutation-card]')];
  const isOpen = card => card.querySelector('.personality-toggle').getAttribute('aria-expanded') === 'true';
  const expand = individual
    ? !isOpen(cards[0])
    : button.dataset.action === 'toggle-mutation-section'
      ? !cards.some(isOpen)
      : !cards.every(isOpen);
  const bodies = cards.map(card => {
    const body = card.querySelector('.personality-card-body');
    return { body, height: body.animate ? (body.hidden ? 0 : body.getBoundingClientRect().height) : undefined };
  });
  for (const card of cards) {
    const toggle = card.querySelector('.personality-toggle');
    toggle.setAttribute('aria-expanded', String(expand));
    toggle.setAttribute('aria-label', `${expand ? 'Collapse' : 'Expand'} ${toggle.dataset.name}`);
  }
  fitMutationDescriptions(root);
  for (const { body, height } of bodies) animateCardBody(body, expand, height);
  refreshMutationExpansion(root);
}
export function mutationsManagerPage(catalog) {
  return `<div class="definitions-header eye-manager-header"><h1 class="manager-heading">Mutations Manager</h1><button type="button" class="button secondary definition-import" data-action="import-definition" data-kind="mutations" title="Import Mutation" aria-label="Import Mutation">${icon('download')}</button><button class="button primary" data-action="new-definition" data-kind="mutations">${icon('spark')} Create Mutation</button></div>
  <div class="eye-grid-controls"><label class="zone-field"><input id="mutation-search" type="search" placeholder="Search..." aria-label="Search mutations"></label><button type="button" class="button secondary" data-action="toggle-all-mutations" aria-expanded="false">Show All</button><label class="zone-field">Type<select id="mutation-type"><option value="">All Types</option>${mutationTypes(
    catalog.mutations
  )
    .map(type => `<option value="${e(type)}">${e(type)}</option>`)
    .join(
      ''
    )}</select></label><label class="zone-field eye-percent-control"><span><input id="mutation-weights" type="checkbox"> Show Weights</span></label><div class="definition-sort-controls"><label class="zone-field">Sort By<select id="mutation-sort"><option value="type" selected>Type</option><option value="name">Name</option><option value="weight">Weight</option></select></label><button type="button" class="icon-button sort-direction" data-action="mutation-sort-direction" data-direction="asc" aria-label="Ascending order. Switch to descending" title="Ascending order. Switch to descending">${icon('arrow')}</button></div></div>
  <div id="mutation-grid">${mutationResults(filterMutations(catalog.mutations, '', '', 'type'))}</div><p id="mutation-empty" role="status" ${catalog.mutations.length ? 'hidden' : ''}>No mutations match your filters.</p>`;
}
export function updateMutationGrid(root, catalog) {
  const toggle = root.querySelector('[data-action="mutation-sort-direction"]');
  const direction = toggle.dataset.direction;
  const label = direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const entries = filterMutations(
    catalog.mutations,
    root.querySelector('#mutation-search').value,
    root.querySelector('#mutation-type').value,
    root.querySelector('#mutation-sort').value,
    direction
  );
  const sort = root.querySelector('#mutation-sort').value;
  const expanded = new Set(
    [...root.querySelectorAll('[data-mutation-card]')]
      .filter(card => card.querySelector('.personality-toggle').getAttribute('aria-expanded') === 'true')
      .map(card => card.dataset.id)
  );
  const grid = root.querySelector('#mutation-grid');
  grid.classList.toggle('eye-definition-grid', sort !== 'type');
  grid.classList.toggle('mutation-definition-grid', sort !== 'type');
  grid.classList.toggle('personality-card-grid', sort !== 'type');
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  grid.innerHTML = mutationResults(entries, sort, root.querySelector('#mutation-weights').checked, direction, expanded);
  refreshMutationExpansion(root);
  root.querySelector('#mutation-empty').hidden = entries.length > 0;
}

export function createMutationEditor(renderEditor) {
  const dialog = document.createElement('dialog');
  dialog.className = 'eye-definition-dialog mutation-definition-dialog';
  dialog.setAttribute('aria-labelledby', 'mutation-editor-title');
  const prompt = document.createElement('dialog');
  prompt.className = 'eye-save-confirm';
  prompt.setAttribute('aria-labelledby', 'mutation-save-title');
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  prompt.innerHTML = `<div class="dialog-top"><h2 id="mutation-save-title">Save Changes?</h2></div><p>You have unsaved mutation changes. Save them before closing?</p><div class="form-actions"><button type="button" class="button secondary" data-mutation-decision="keep" autofocus>Keep Editing</button><button type="button" class="button secondary" data-mutation-decision="discard">Discard Changes</button><button type="button" class="button primary" data-mutation-decision="save">Save</button></div>`;
  document.body.append(dialog, prompt);
  function requestClose() {
    const form = dialog.querySelector('form');
    if (!form || formSignature(form) === formBaseline(form)) dialog.close();
    else if (!prompt.open) prompt.showModal();
  }
  prompt.addEventListener('click', event => {
    const decision = event.target.closest('[data-mutation-decision]')?.dataset.mutationDecision;
    if (!decision) return;
    prompt.close();
    if (decision === 'discard') dialog.close();
    if (decision === 'save') dialog.querySelector('form')?.requestSubmit();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener('close', () => {
    if (!dialog.open) dialog.replaceChildren();
  });
  dialog.addEventListener('click', event => {
    const emojiButton = event.target.closest('[data-mutation-emoji]');
    if (emojiButton) {
      const input = dialog.querySelector('[name="emoji"]');
      openEmojiPicker({
        value: input.value,
        onSelect: emoji => {
          input.value = emoji;
          emojiButton.textContent = emoji;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      return;
    }
    if (event.target.closest('[data-mutation-close]')) return requestClose();
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      requestClose();
  });
  return {
    dialog,
    open(draft) {
      const template = document.createElement('template');
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      template.innerHTML = renderEditor(draft);
      const form = template.content.querySelector('#definition-form');
      form.querySelector('.panel-heading')?.remove();
      form.querySelector('[data-action="duplicate-definition"]')?.remove();
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      dialog.innerHTML = `<div class="dialog-top"><h2 id="mutation-editor-title">${draft?.id ? `Edit ${e(draft.name)}` : draft?.imported ? 'Import Mutation' : 'Create Mutation'}</h2><button type="button" class="icon-button" data-mutation-close aria-label="Close mutation editor">${icon('close')}</button></div>`;
      definitionTransferControls(form, dialog, draft, 'mutations', 'Mutation');
      const fields = form.querySelector('.definition-fields');
      const row = document.createElement('div');
      row.className = 'eye-name-rarity';
      row.append(
        fields.querySelector('[name="name"]').closest('label'),
        fields.querySelector('[name="type"]').closest('label')
      );
      row.classList.add('mutation-name-type-row');
      const emojiField = document.createElement('label');
      emojiField.className = 'zone-field mutation-emoji-field';
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      emojiField.innerHTML = `Emoji<button type="button" class="button secondary" data-mutation-emoji aria-label="Choose mutation emoji">${e(mutationEmoji(draft))}</button><input type="hidden" name="emoji" value="${e(mutationEmoji(draft))}">`;
      row.prepend(emojiField);
      fields.prepend(row);
      dialog.append(form);
      dialog.scrollTop = 0;
      if (!dialog.open) dialog.showModal();
      form.elements.name.focus();
    }
  };
}
