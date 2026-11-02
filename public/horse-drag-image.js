// Chromium dims native drag images; use a solid, pointer-transparent card instead.
export function createHorseDragImage(root, source, event) {
  const rect = source.getBoundingClientRect();
  const image = source.cloneNode(true);
  image.className = 'horse-drag-image';
  image.removeAttribute('data-folder-horse');
  image.removeAttribute('draggable');
  image.setAttribute('aria-hidden', 'true');
  image.inert = true;
  image.style.width = rect.width + 'px';
  image.style.height = rect.height + 'px';
  // Keep the copied SVG gradients and masks independent of the hidden source.
  const ids = new Map();
  const prefix = 'drag-' + crypto.randomUUID() + '-';
  image.querySelectorAll('[id]').forEach(el => {
    ids.set(el.id, prefix + el.id);
    el.id = prefix + el.id;
  });
  for (const el of image.querySelectorAll('*')) {
    el.removeAttribute('data-action');
    el.removeAttribute('data-id');
    for (const attribute of [...el.attributes]) {
      let value = attribute.value;
      for (const [oldId, newId] of ids)
        value = value === '#' + oldId ? '#' + newId : value.replaceAll('url(#' + oldId + ')', 'url(#' + newId + ')');
      if (value !== attribute.value) el.setAttribute(attribute.name, value);
    }
  }
  const nativeImage = document.createElement('canvas');
  nativeImage.className = 'horse-native-drag-image';
  nativeImage.width = nativeImage.height = 1;
  nativeImage.setAttribute('aria-hidden', 'true');
  root.append(image, nativeImage);
  event.dataTransfer.setDragImage(nativeImage, 0, 0);
  const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const move = event => {
    image.style.transform = `translate(${event.clientX - offsetX}px, ${event.clientY - offsetY}px)`;
  };
  move(event);
  return {
    move,
    remove: () => {
      image.remove();
      nativeImage.remove();
    }
  };
}
