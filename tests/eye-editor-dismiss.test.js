import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEyeEditor } from '../public/eyes-manager.js';

test('eye editor ignores selection drags and closes only for a click beginning and ending on the backdrop', t => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
    else delete globalThis.document;
  });
  globalThis.document = {
    createElement() {
      const handlers = new Map();
      const dialog = {
        closeCount: 0,
        setAttribute() {},
        addEventListener: (name, callback) => handlers.set(name, callback),
        getBoundingClientRect: () => ({ left: 100, right: 400, top: 100, bottom: 400 }),
        querySelector: () => null,
        closest: () => null,
        close() {
          this.closeCount++;
        },
        fire(name, x, target = dialog) {
          handlers.get(name)({ target, clientX: x, clientY: 200 });
        }
      };
      return dialog;
    },
    body: { append() {} }
  };
  const { dialog } = createEyeEditor(
    () => '',
    () => []
  );
  const text = { closest: () => null };
  dialog.fire('pointerdown', 200, text);
  dialog.fire('click', 500);
  assert.equal(dialog.closeCount, 0, 'dragging text beyond the modal keeps it open');
  dialog.fire('pointerdown', 200);
  dialog.fire('click', 500);
  assert.equal(dialog.closeCount, 0, 'dragging from modal padding also keeps it open');
  dialog.fire('pointerdown', 500);
  dialog.fire('click', 200);
  assert.equal(dialog.closeCount, 0, 'dragging into the modal keeps it open');
  dialog.fire('pointerdown', 500);
  dialog.fire('pointercancel', 500);
  dialog.fire('click', 500);
  assert.equal(dialog.closeCount, 0, 'a canceled gesture cannot close the modal');
  dialog.fire('pointerdown', 500);
  dialog.fire('click', 500);
  assert.equal(dialog.closeCount, 1, 'an intentional backdrop click still closes it');
});
