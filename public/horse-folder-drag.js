import { createHorseDragImage } from './horse-drag-image.js';
import { bindHorsePointerDragging } from './horse-pointer-drag.js';

export function bindHorseFolderDragging(root, services, signal) {
  let drag = null;
  let pending = false;
  const options = { signal };
  const layoutRect = card => {
    const rect = card.getBoundingClientRect();
    const transform = getComputedStyle(card).transform;
    const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform);
    const x = matrix?.m41 || 0,
      y = matrix?.m42 || 0;
    return {
      left: rect.left - x,
      right: rect.right - x,
      top: rect.top - y,
      bottom: rect.bottom - y,
      width: rect.width,
      height: rect.height
    };
  };
  const movePreview = change => {
    const cards = [...root.querySelectorAll('[data-folder-horse]')].filter(card => card !== drag?.source);
    const before = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
    cards.forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
    change();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const card of cards) {
      const previous = before.get(card),
        next = card.getBoundingClientRect();
      if (!previous.width || !next.width) continue;
      const x = previous.left - next.left,
        y = previous.top - next.top;
      if (x || y)
        card.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }], {
          duration: 160,
          easing: 'ease-out'
        });
    }
  };
  const cleanup = keepOpen => {
    if (!drag) return;
    cancelAnimationFrame(drag.frame);
    drag.image.remove();
    for (const [element, title] of drag.titles)
      if (element.isConnected && !element.hasAttribute('title')) element.setAttribute('title', title);
    document.body.classList.remove('horse-drag-in-progress');
    drag.placeholder.remove();
    drag.source.classList.remove('horse-dragging');
    for (const [empty, hidden] of drag.emptyStates) empty.hidden = hidden;
    for (const [folder, open] of drag.openStates) if (folder !== keepOpen) folder.open = open;
    root.querySelectorAll('.horse-drop-target').forEach(el => el.classList.remove('horse-drop-target'));
    root
      .querySelectorAll('[data-folder-horse]')
      .forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
    root.classList.remove('horse-drag-active');
    drag = null;
  };
  const lift = () => {
    if (!drag || drag.source.classList.contains('horse-dragging')) return;
    movePreview(() => {
      drag.source.before(drag.placeholder);
      drag.source.classList.add('horse-dragging');
    });
  };
  const preview = event => {
    const folder = event.target.closest('[data-music-group]');
    if (!folder || !root.contains(folder)) return false;
    lift();
    root.querySelectorAll('.horse-drop-target').forEach(el => el.classList.remove('horse-drop-target'));
    folder.classList.add('horse-drop-target');
    if (event.target.closest('.horse-drop-placeholder')) return true;
    const grid = folder.querySelector('.horse-folder-body > .horse-grid');
    const hovered = event.target.closest('[data-folder-horse]');
    let card = hovered;
    if (card === drag.source) return true;
    // Grid gaps target the container, so resolve them to the nearest visible slot.
    if (!card && !event.target.closest('summary')) {
      let nearest = null,
        distance = Infinity;
      for (const candidate of grid.children) {
        if (
          candidate !== drag.placeholder &&
          (!candidate.hasAttribute('data-folder-horse') || candidate === drag.source)
        )
          continue;
        const rect = layoutRect(candidate);
        if (!rect.width || !rect.height) continue;
        const x = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
        const y = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
        const squared = x * x + y * y;
        if (squared < distance || (squared === distance && candidate === drag.placeholder)) {
          nearest = candidate;
          distance = squared;
        }
      }
      if (nearest === drag.placeholder) return true;
      card = nearest;
    }
    const rect = card ? layoutRect(card) : null;
    const placement =
      !hovered &&
      rect &&
      (event.clientY >= rect.bottom || (event.clientY > rect.top && event.clientX > rect.left + rect.width / 2))
        ? 'after'
        : 'before';
    const next = card ? (placement === 'after' ? card.nextElementSibling : card) : null;
    if (
      next !== drag.placeholder &&
      !(drag.placeholder.parentElement === grid && drag.placeholder.nextElementSibling === next)
    ) {
      movePreview(() => {
        if (!drag.openStates.has(folder)) drag.openStates.set(folder, folder.open);
        folder.open = true;
        for (const empty of grid.querySelectorAll('.grid-empty')) {
          if (!drag.emptyStates.has(empty)) drag.emptyStates.set(empty, empty.hidden);
          empty.hidden = true;
        }
        grid.insertBefore(drag.placeholder, next);
      });
    }
    drag.destination = { toFolder: folder.dataset.musicGroup, targetId: card?.dataset.folderHorse, placement };
    return true;
  };
  root.querySelectorAll('.horse-folder-card img').forEach(img => (img.draggable = false));
  bindHorsePointerDragging(root, signal);
  root.addEventListener(
    'dragstart',
    event => {
      const source = event.target.closest('[data-folder-horse]');
      if (!source || pending) {
        event.preventDefault();
        return;
      }
      cleanup();
      const placeholder = document.createElement('div');
      placeholder.className = 'horse-drop-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = 'Drop here';
      placeholder.style.minHeight = source.getBoundingClientRect().height + 'px';
      const fromFolder = source.closest('[data-music-group]').dataset.musicGroup;
      const payload = { id: source.dataset.folderHorse, fromFolder };
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-gallorin-horse', JSON.stringify(payload));
      const titles = new Map(
        [...document.querySelectorAll('[title]')].map(element => [element, element.getAttribute('title')])
      );
      titles.forEach((title, element) => element.removeAttribute('title'));
      document.body.classList.add('horse-drag-in-progress');
      drag = {
        source,
        placeholder,
        payload,
        titles,
        emptyStates: new Map(),
        openStates: new Map(),
        destination: null,
        image: createHorseDragImage(root, source, event),
        frame: 0
      };
      // Wait until the native drag starts before taking its source out of the grid.
      drag.frame = requestAnimationFrame(lift);
      root.classList.add('stable-instant-update');
      root.classList.add('horse-drag-active');
      root.querySelector('.horse-folder-drop-status').textContent = '';
    },
    options
  );
  root.addEventListener(
    'dragover',
    event => {
      if (!drag || pending || !preview(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    options
  );
  document.addEventListener(
    'dragover',
    event => {
      if (drag && !pending) drag.image.move(event);
    },
    { ...options, capture: true }
  );
  root.addEventListener(
    'dragleave',
    event => {
      if (!root.contains(event.relatedTarget))
        root.querySelectorAll('.horse-drop-target').forEach(el => el.classList.remove('horse-drop-target'));
    },
    options
  );
  root.addEventListener(
    'dragend',
    () => {
      if (!pending) cleanup();
    },
    options
  );
  root.addEventListener(
    'drop',
    async event => {
      if (!drag || pending) return;
      const folder = event.target.closest('[data-music-group]');
      if (!folder || !root.contains(folder)) return;
      event.preventDefault();
      if (!drag.destination || drag.destination.toFolder !== folder.dataset.musicGroup) preview(event);
      if (!drag.destination) {
        const next = drag.source.nextElementSibling;
        drag.destination = {
          toFolder: drag.payload.fromFolder,
          targetId: next?.dataset.folderHorse,
          placement: 'before'
        };
      }
      const payload = { ...drag.payload, ...drag.destination };
      drag.image.remove();
      pending = true;
      root.inert = true;
      root.setAttribute('aria-busy', 'true');
      try {
        await services.action('move-horse-folder', payload);
        cleanup(folder);
        services.redraw({ animate: false });
      } catch (error) {
        cleanup();
        root.querySelector('.horse-folder-drop-status').textContent = error.message;
      } finally {
        pending = false;
        root.inert = false;
        root.removeAttribute('aria-busy');
      }
    },
    options
  );
  signal?.addEventListener('abort', () => cleanup(), { once: true });
}
