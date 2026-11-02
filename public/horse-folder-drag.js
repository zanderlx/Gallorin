export function bindHorseFolderDragging(root, services, signal) {
  let dragged = null;
  let pending = false;
  const options = { signal };
  const clear = () => {
    root
      .querySelectorAll('.horse-drop-target,.horse-dragging')
      .forEach(el => el.classList.remove('horse-drop-target', 'horse-dragging'));
    root.querySelectorAll('[data-drop-side]').forEach(el => el.removeAttribute('data-drop-side'));
  };
  const position = event => {
    const folder = event.target.closest('[data-music-group]');
    if (!folder || !root.contains(folder)) return null;
    const card = event.target.closest('[data-folder-horse]');
    return {
      folder,
      card,
      placement:
        card && event.clientX > card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2
          ? 'after'
          : 'before'
    };
  };
  // Images must not start their own native drag instead of the horse drag.
  root.querySelectorAll('.horse-folder-card img').forEach(img => (img.draggable = false));
  root.addEventListener(
    'dragstart',
    event => {
      const card = event.target.closest('[data-folder-horse]');
      if (!card || pending) {
        event.preventDefault();
        return;
      }
      dragged = { id: card.dataset.folderHorse, fromFolder: card.closest('[data-music-group]').dataset.musicGroup };
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-gallorin-horse', JSON.stringify(dragged));
      card.classList.add('horse-dragging');
      root.querySelector('.horse-folder-drop-status').textContent = '';
    },
    options
  );
  root.addEventListener(
    'dragover',
    event => {
      if (!dragged || pending) return;
      const target = position(event);
      if (!target) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      root.querySelectorAll('.horse-drop-target').forEach(el => el.classList.remove('horse-drop-target'));
      root.querySelectorAll('[data-drop-side]').forEach(el => el.removeAttribute('data-drop-side'));
      target.folder.classList.add('horse-drop-target');
      if (target.card) target.card.dataset.dropSide = target.placement;
    },
    options
  );
  root.addEventListener(
    'dragleave',
    event => {
      if (!root.contains(event.relatedTarget)) clear();
    },
    options
  );
  root.addEventListener(
    'dragend',
    () => {
      dragged = null;
      clear();
    },
    options
  );
  root.addEventListener(
    'drop',
    async event => {
      if (!dragged || pending) return;
      const target = position(event);
      if (!target) return;
      event.preventDefault();
      const payload = {
        ...dragged,
        toFolder: target.folder.dataset.musicGroup,
        targetId: target.card?.dataset.folderHorse,
        placement: target.placement
      };
      dragged = null;
      clear();
      pending = true;
      root.inert = true;
      root.setAttribute('aria-busy', 'true');
      try {
        await services.action('move-horse-folder', payload);
        services.redraw({ animate: false });
      } catch (error) {
        root.querySelector('.horse-folder-drop-status').textContent = error.message;
      } finally {
        pending = false;
        root.inert = false;
        root.removeAttribute('aria-busy');
      }
    },
    options
  );
  signal?.addEventListener('abort', clear, { once: true });
}
