// Pointer-driven horse movement avoids the OS cursor imposed by native HTML dragging.
export function bindHorsePointerDragging(root, signal) {
  let pointer = null;
  let suppressClick = false;
  const options = { signal };
  const emit = (target, type, event) =>
    target?.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        dataTransfer: pointer.data,
        clientX: event.clientX,
        clientY: event.clientY
      })
    );
  const finish = (event, drop = false) => {
    if (!pointer) return;
    if (event.pointerId != null && event.pointerId !== pointer.id) return;
    if (root.hasPointerCapture(pointer.id)) root.releasePointerCapture(pointer.id);
    if (pointer.active) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (drop && target && root.contains(target)) emit(target, 'drop', event);
      emit(pointer.source, 'dragend', event);
      suppressClick = true;
    }
    pointer = null;
  };
  root.querySelectorAll('[data-folder-horse]').forEach(card => (card.draggable = false));
  root.addEventListener(
    'pointerdown',
    event => {
      if (event.button !== 0 || root.hasAttribute('aria-busy')) return;
      suppressClick = false;
      const source = event.target.closest('[data-folder-horse]');
      if (source)
        pointer = { source, x: event.clientX, y: event.clientY, id: event.pointerId, active: false, data: null };
    },
    options
  );
  document.addEventListener(
    'pointermove',
    event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      if (!pointer.active && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 6) return;
      event.preventDefault();
      if (!pointer.active) {
        pointer.active = true;
        pointer.data = new DataTransfer();
        emit(pointer.source, 'dragstart', { clientX: pointer.x, clientY: pointer.y });
        if (event.isTrusted) root.setPointerCapture(pointer.id);
      }
      emit(document.elementFromPoint(event.clientX, event.clientY), 'dragover', event);
    },
    { ...options, passive: false }
  );
  document.addEventListener('pointerup', event => finish(event, true), options);
  document.addEventListener('pointercancel', event => finish(event), options);
  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape' && pointer?.active) {
        event.preventDefault();
        finish({ clientX: pointer.x, clientY: pointer.y });
      }
    },
    options
  );
  window.addEventListener(
    'blur',
    () => {
      if (pointer) finish({ clientX: pointer.x, clientY: pointer.y });
    },
    options
  );
  root.addEventListener(
    'click',
    event => {
      if (suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    { ...options, capture: true }
  );
  signal.addEventListener(
    'abort',
    () => {
      pointer = null;
    },
    { once: true }
  );
}
