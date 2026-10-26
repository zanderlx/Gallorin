// Delegate once so buttons added by modals and page renders work automatically.
const bindings = new WeakMap();
export function textButtonFor(target) {
  const element = target?.closest ? target : target?.parentElement;
  if (!element || element.closest('select,option,summary,[role="menu"],[role="listbox"],#sidebar')) return null;
  if (element.matches('input[type="file"]')) return null; // Label-generated file clicks are not a second button press.
  const button = element.closest(
    'button,a.button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"]'
  );
  if (
    !button ||
    button.matches(':disabled') ||
    button.closest('[inert],[aria-disabled="true"]') ||
    ['menu', 'listbox', 'tree', 'true'].includes(button.getAttribute('aria-haspopup')) ||
    ['combobox', 'menuitem', 'option'].includes(button.getAttribute('role'))
  )
    return null;
  const content = button.cloneNode(true);
  content
    .querySelectorAll('svg,img,[aria-hidden="true"],[hidden],.sr-only,input,select')
    .forEach(node => node.remove());
  const text = button.matches('input') ? button.value : content.textContent;
  return /[\p{L}\p{N}]/u.test(text || '') ? button : null;
}
export function bindTextButtonSounds(root, play, onError = () => {}) {
  bindings.get(root)?.abort();
  const controller = new AbortController();
  bindings.set(root, controller);
  root.addEventListener(
    'click',
    event => {
      if ((event.button !== undefined && event.button !== 0) || !textButtonFor(event.target)) return;
      // Capture before action handlers disable/remove the button; never delay its action.
      void Promise.resolve().then(play).catch(onError);
    },
    { capture: true, signal: controller.signal }
  );
  return () => controller.abort();
}
