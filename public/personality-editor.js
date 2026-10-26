import { formSignature, formBaseline } from './form-state.js';

export function closePersonalityEditor(form, onClose) {
  if (!form || formSignature(form) === formBaseline(form)) return onClose();
  let prompt = document.querySelector('#personality-save-confirm');
  if (prompt) prompt.remove();
  prompt = document.createElement('dialog');
  prompt.id = 'personality-save-confirm';
  prompt.className = 'eye-save-confirm';
  prompt.setAttribute('aria-labelledby', 'personality-save-title');
  // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
  prompt.innerHTML = `<div class="dialog-top"><h2 id="personality-save-title">Cancel Changes?</h2></div><p>Discard your unsaved personality changes and exit editing?</p><div class="form-actions"><button type="button" class="button secondary" data-decision="keep" autofocus>Keep Editing</button><button type="button" class="button secondary" data-decision="discard">Discard Changes</button></div>`;
  prompt.addEventListener('click', event => {
    const decision = event.target.closest('[data-decision]')?.dataset.decision;
    if (!decision) return;
    prompt.close();
    if (decision === 'discard') onClose();
  });
  prompt.addEventListener('close', () => prompt.remove());
  document.body.append(prompt);
  prompt.showModal();
}
