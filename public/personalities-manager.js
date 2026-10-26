import { animateCardBody } from './collapsible-cards.js';
import { escapeHTML as e, icon } from './ui.js';

const defaultEmojis = {
  Anxious: '😰',
  Affectionate: '🥰',
  Clingy: '🫂',
  Curious: '🧐',
  Energetic: '⚡',
  Grumpy: '😠',
  Lazy: '😴',
  Playful: '😜'
};
export const personalityEmojis = [
  '🙂',
  '😰',
  '🥰',
  '🫂',
  '🧐',
  '⚡',
  '😠',
  '😴',
  '😜',
  '😊',
  '😎',
  '🤔',
  '😇',
  '🥺',
  '😈',
  '🤗',
  '🦄',
  '🐴',
  '🌟',
  '🌸',
  '🔥',
  '💖',
  '🍀',
  '🌙'
];
export const personalityEmoji = entry =>
  entry.emoji || (/^personalities-[0-7]$/.test(entry.id || '') ? defaultEmojis[entry.name] : null) || '🙂';

export function personalityForm(draft) {
  return `<form id="definition-form" class="panel personality-card" data-kind="personalities" data-id="${e(draft.id || '')}"><div class="personality-card-heading"><h2>${draft.id ? 'Edit Personality' : 'Create Personality'}</h2><button type="button" class="icon-button personality-editor-close" data-action="close-personality-editor" aria-label="Close personality editor">${icon('close')}</button></div><div class="personality-name-row"><label class="zone-field personality-emoji-field">Emoji<button type="button" class="button secondary personality-emoji-picker" data-action="choose-personality-emoji" aria-label="Choose personality emoji">${e(personalityEmoji(draft))}</button><input type="hidden" name="emoji" value="${e(personalityEmoji(draft))}"></label><label class="zone-field">Name<input name="name" value="${e(draft.name || '')}" maxlength="80" required></label></div><label class="zone-field">Description<textarea name="description" rows="5" maxlength="4000">${e(draft.description || '')}</textarea></label><input type="hidden" name="systemId" value="${e(draft.systemId || '')}"><input type="hidden" name="behaviorTags" value="${e(JSON.stringify(draft.behaviorTags || []))}"><p id="definition-status" class="form-status" role="status"></p><div class="form-actions"><button class="button primary" type="submit">Save</button>${draft.id ? `<button class="text-button" type="button" data-action="delete-definition" data-kind="personalities" data-id="${e(draft.id)}">Delete Entry</button>` : ''}</div></form>`;
}

export function personalityCard(entry) {
  return `<article class="panel personality-card definition-list-item" data-personality-card data-search="${e(`${entry.name} ${entry.description || ''}`.toLowerCase())}"><div class="personality-card-heading"><h2><span class="personality-emoji">${e(personalityEmoji(entry))}</span> ${e(entry.name)}</h2><button type="button" class="icon-button personality-toggle" data-action="toggle-personality" aria-expanded="false" aria-controls="personality-body-${e(entry.id)}" aria-label="Expand ${e(entry.name)}" data-name="${e(entry.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div><div class="personality-card-body" id="personality-body-${e(entry.id)}" hidden><p class="personality-card-description" tabindex="0" aria-label="${e(entry.name)} description">${e(entry.description || '')}</p><div class="personality-card-actions"><button type="button" class="button secondary" data-action="edit-definition" data-kind="personalities" data-id="${e(entry.id)}">${icon('edit')} Edit</button></div></div></article>`;
}

export function togglePersonalities(root, button) {
  const cards = [...root.querySelectorAll('[data-personality-card]')];
  const all = button.dataset.action === 'toggle-all-personalities';
  const expand = all
    ? cards.some(card => card.querySelector('.personality-toggle').getAttribute('aria-expanded') !== 'true')
    : button.getAttribute('aria-expanded') !== 'true';
  for (const card of all ? cards : [button.closest('[data-personality-card]')]) {
    const toggle = card.querySelector('.personality-toggle');
    animateCardBody(card.querySelector('.personality-card-body'), expand);
    toggle.setAttribute('aria-expanded', String(expand));
    toggle.setAttribute('aria-label', `${expand ? 'Collapse' : 'Expand'} ${toggle.dataset.name}`);
  }
  const control = root.querySelector('[data-action="toggle-all-personalities"]');
  const allOpen =
    cards.length > 0 &&
    cards.every(card => card.querySelector('.personality-toggle').getAttribute('aria-expanded') === 'true');
  control.textContent = allOpen ? 'Hide All' : 'Show All';
  control.setAttribute('aria-expanded', String(allOpen));
}

export function personalitiesManagerPage(catalog, draft) {
  const entries = catalog.personalities;
  return `<div class="definitions-header eye-manager-header personality-manager-header"><h1 class="manager-heading">Personalities Manager</h1></div><div class="eye-grid-controls personality-grid-controls"><label class="zone-field personality-search"><input type="search" id="definition-search" placeholder="Search..." aria-label="Search personalities"></label><button type="button" class="button secondary" data-action="toggle-all-personalities" aria-expanded="false">Show All</button><button class="button primary" data-action="new-definition" data-kind="personalities">${icon('spark')} Add New</button></div><div class="personality-card-grid">${entries.map(entry => (draft?.id === entry.id ? personalityForm(draft) : personalityCard(entry))).join('')}</div><p id="definition-no-results" hidden>No matching personalities.</p>`;
}
