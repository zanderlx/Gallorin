export function formSignature(form) {
  return JSON.stringify(
    [...form.elements]
      .filter(
        el =>
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) &&
          (!['zone-form', 'species-palettes-form'].includes(form.id) || el.name)
      )
      .map(el => [
        el.name,
        el.type === 'checkbox' || el.type === 'radio'
          ? el.checked
          : el.name === 'variationPercent' && String(el.value).trim() !== '' && Number.isFinite(Number(el.value))
            ? Number(el.value)
            : el.value
      ])
  );
}
const baselines = new WeakMap();
export const formBaseline = form => baselines.get(form);
export function restoreBaseline(form, baseline) {
  if (baseline !== undefined) baselines.set(form, baseline);
  updateFormState(form);
}
export function updateFormState(form) {
  if (!form || !baselines.has(form)) return;
  const changed = formSignature(form) !== baselines.get(form);
  for (const button of form.querySelectorAll('button[type="submit"],button[type="reset"]')) button.hidden = !changed;
}
export function trackForms(root) {
  for (const form of root.querySelectorAll(
    '#rarity-settings-form,#traits-form,#species-palettes-form,#settings-form,#spawn-settings-form,#economy-form,#gold-form,#keeper-form,#horse-description-form,#horse-notes-form,#definition-form,#zone-form'
  )) {
    if (!baselines.has(form)) baselines.set(form, formSignature(form));
    updateFormState(form);
  }
}
