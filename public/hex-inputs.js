import { html, setHTML } from './ui.js';

export const validHex = value => /^#[0-9a-f]{6}$/i.test(value);

export const hexInputValue = value => `#${value.replace(/[^0-9a-f]/gi, '').slice(0, 6)}`;

function showHexPopup(message, returnToField) {
  const dialog = document.createElement('dialog');
  dialog.className = 'eye-save-confirm';
  dialog.setAttribute('aria-label', 'Invalid hex color');
  const template = document.createElement('template');
  setHTML(
    template,
    html`<div class="dialog-top"><h2>Invalid hex color</h2></div><p>${message}</p><div class="form-actions"><button type="button" class="button primary" autofocus>Go to field</button></div>`
  );
  dialog.append(template.content);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.remove();
    returnToField();
  });
  document.body.append(dialog);
  dialog.showModal();
}

export function handleInvalidHex(event, showPopup = showHexPopup) {
  const field = event.target;
  if (!field.matches('[data-color-hex]')) return;
  event.preventDefault();
  const first = [...field.form.querySelectorAll('[data-color-hex]')].find(
    input => input.willValidate && !input.validity.valid
  );
  if (first !== field) return;
  queueMicrotask(() => {
    if (!field.isConnected) return;
    for (let parent = field.parentElement; parent; parent = parent.parentElement)
      if (parent.tagName === 'DETAILS') parent.open = true;
    const focusField = () => {
      if (!field.isConnected) return;
      field.scrollIntoView({ block: 'center', behavior: 'instant' });
      field.focus({ preventScroll: true });
      field.select();
    };
    focusField();
    showPopup(
      `Invalid hex value in ${field.getAttribute('aria-label') || 'color field'}. Use # followed by six digits from 0–9 or A–F, such as #AABBCC.`,
      focusField
    );
  });
}
