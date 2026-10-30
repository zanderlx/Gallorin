import { horseSalePrice } from './sale-pricing.js';
import { escapeHTML as e, number } from './ui.js';

export function createHorseDialogs({ getState, findHorse, save, onSaved, notify }) {
  let dialog,
    current,
    saving = false;
  function open(id, kind) {
    const horse = findHorse(id);
    if (!horse || !['catch', 'rename'].includes(kind)) return;
    if (kind === 'rename' && !getState().horses.some(h => h.id === id)) return;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'horse-edit-dialog';
      dialog.setAttribute('aria-labelledby', 'horse-edit-title');
      document.body.append(dialog);
      dialog.addEventListener('input', event => {
        if (current?.kind === 'catch' && event.target.name === 'value') {
          event.target.classList.toggle('default-horse-name', event.target.value === event.target.defaultValue);
        }
      });
      dialog.addEventListener('click', event => {
        if (event.target.closest('[data-horse-cancel]')) dialog.close();
      });
      dialog.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving) return;
        const { id, kind } = current;
        const value = new FormData(event.target).get('value');
        saving = true;
        dialog.querySelectorAll('button').forEach(button => (button.disabled = true));
        try {
          await save(kind === 'catch' ? 'catch' : 'rename', { id, name: value });
          dialog.close();
          await onSaved(id, kind);
          notify(kind === 'catch' ? 'Your companion is saved in My Horses.' : 'Horse updated.');
        } catch (error) {
          dialog.querySelector('[role=status]').textContent = error.message;
        } finally {
          saving = false;
          dialog.querySelectorAll('button').forEach(button => (button.disabled = false));
        }
      });
    }
    current = { id, kind };
    dialog.classList.toggle('catch-name-dialog', kind === 'catch');
    const title = kind === 'catch' ? 'Name Your New Companion?' : 'Rename Horse';
    const input = `<input class="${kind === 'catch' ? 'default-horse-name' : ''}" aria-label="Horse name" name="value" maxlength="60" value="${e(horse.name || horse.species)}">`;
    // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
    dialog.innerHTML = `<form><div class="dialog-top"><h2 id="horse-edit-title">${e(title)}</h2>${kind === 'catch' ? '' : '<button type="button" class="icon-button" data-horse-cancel aria-label="Close">×</button>'}</div><div class="horse-edit-body">${kind === 'catch' ? '<p>Choose a name before saving this horse to your stable</p>' : ''}${input}<p role="status"></p><div class="form-actions"><button type="submit" class="button primary">${kind === 'catch' ? 'Save' : 'Save Changes'}</button><button type="button" class="text-button" data-horse-cancel>Cancel</button>${kind === 'catch' ? `<button type="button" class="button secondary catch-sell" data-action="sell" data-id="${e(horse.id)}">Sell for ${number(horseSalePrice(horse, getState().settings).total)} Gold</button>` : ''}</div></div></form>`;
    dialog.showModal();
    dialog.querySelector('input,select').focus();
  }
  return { open, close: () => dialog?.close() };
}
