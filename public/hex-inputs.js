export const normalizeHexText = value =>
  '#' +
  String(value)
    .replace(/[^0-9a-f]/gi, '')
    .slice(0, 6)
    .toUpperCase();

export function sanitizeHexInput(field) {
  const value = normalizeHexText(field.value);
  if (field.value !== value) {
    const caret = field.selectionStart;
    const position = caret === null ? null : normalizeHexText(field.value.slice(0, caret)).length;
    field.value = value;
    if (position !== null) field.setSelectionRange(position, position);
  }
  // Native required/pattern validation stays accurate after picker changes, presets, and resets.
  return /^#[0-9A-F]{6}$/.test(value);
}
