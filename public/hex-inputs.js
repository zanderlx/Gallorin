export const validHex = value => /^#[0-9a-f]{6}$/i.test(value);

export function handleInvalidHex(event, showPopup = message => globalThis.alert(message)) {
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
    showPopup(
      `Invalid hex value in ${field.getAttribute('aria-label') || 'color field'}. Use # followed by six digits from 0–9 or A–F, such as #AABBCC.`
    );
    field.scrollIntoView({ block: 'center', behavior: 'instant' });
    field.focus({ preventScroll: true });
    field.select();
  });
}
