// Native details with reversible animation and scoped bulk controls.
export function bindMusicDisclosures(root, signal) {
  const running = new Map();
  const expanded = details => (details.dataset.expanding ? details.dataset.expanding === 'true' : details.open);
  const refresh = () => {
    const folders = [...root.querySelectorAll('[data-music-group]')],
      all = folders.every(expanded);
    const global = root.querySelector('[data-music-toggle-all]');
    if (global) {
      global.textContent = all ? 'Hide All' : 'Show All';
      global.setAttribute('aria-expanded', String(all));
    }
    for (const folder of folders) {
      const button = folder.querySelector('[data-music-toggle-folder]'),
        allChildren = expanded(folder) && [...folder.querySelectorAll('[data-playlist]')].every(expanded);
      if (button) {
        button.textContent = allChildren ? 'Hide All' : 'Show All';
        button.setAttribute('aria-expanded', String(allChildren));
      }
    }
  };
  const finish = (details, state) => {
    if (running.get(details) !== state) return;
    details.open = state.open;
    details.style.height = '';
    details.removeAttribute('data-expanding');
    details.removeAttribute('data-disclosure-animating');
    running.delete(details);
    refresh();
  };
  const setOpen = (details, open, animate = true) => {
    const previous = running.get(details);
    if (!previous && details.open === open) return;
    const height = details.getBoundingClientRect().height,
      summary = details.querySelector(':scope > summary'),
      content = summary.nextElementSibling;
    const opacity = previous && content ? Number(getComputedStyle(content).opacity) : open ? 0.5 : 1;
    previous?.heightAnimation.cancel();
    previous?.fadeAnimation?.cancel();
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      running.delete(details);
      details.style.height = '';
      details.removeAttribute('data-expanding');
      details.removeAttribute('data-disclosure-animating');
      details.open = open;
      return;
    }
    details.open = true;
    details.style.height = '';
    const style = getComputedStyle(details),
      summaryStyle = getComputedStyle(summary);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const target = open
      ? details.getBoundingClientRect().height
      : summary.getBoundingClientRect().height - parseFloat(summaryStyle.borderBottomWidth) + borders;
    details.style.height = height + 'px';
    details.dataset.expanding = String(open);
    details.setAttribute('data-disclosure-animating', '');
    const state = { open };
    state.heightAnimation = details.animate([{ height: height + 'px' }, { height: target + 'px' }], {
      duration: 280,
      easing: 'cubic-bezier(.22,1,.36,1)'
    });
    state.fadeAnimation = content?.animate([{ opacity }, { opacity: open ? 1 : 0 }], {
      duration: open ? 240 : 180,
      easing: 'ease-out'
    });
    running.set(details, state);
    state.heightAnimation.finished.then(() => finish(details, state)).catch(() => {});
    state.fadeAnimation?.finished.catch(() => {});
  };
  root.addEventListener(
    'click',
    event => {
      const global = event.target.closest('[data-music-toggle-all]'),
        local = event.target.closest('[data-music-toggle-folder]');
      if (global || local) {
        event.preventDefault();
        event.stopPropagation();
        if (global) {
          const folders = [...root.querySelectorAll('[data-music-group]')],
            open = !folders.every(expanded);
          folders.forEach(folder => setOpen(folder, open));
        } else {
          const folder = local.closest('[data-music-group]'),
            playlists = [...folder.querySelectorAll('[data-playlist]')];
          const open = !(expanded(folder) && playlists.every(expanded)),
            wasOpen = expanded(folder);
          playlists.forEach(playlist => setOpen(playlist, open, wasOpen));
          if (open && !wasOpen) setOpen(folder, true);
        }
        refresh();
        return;
      }
      const summary = event.target.closest('summary'),
        details = summary?.parentElement;
      if (!details?.matches('details.music-group,details.music-playlist')) return;
      event.preventDefault();
      setOpen(details, !expanded(details));
      refresh();
    },
    { signal }
  );
  root.addEventListener('toggle', refresh, { signal, capture: true });
  signal?.addEventListener(
    'abort',
    () => {
      for (const [details, state] of running) {
        state.heightAnimation.cancel();
        state.fadeAnimation?.cancel();
        finish(details, state);
      }
    },
    { once: true }
  );
  refresh();
}
