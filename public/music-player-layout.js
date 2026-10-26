// Layout only: keep the existing audio transport and controls alive when collapsed.
export function bindPlayerLayout(bar) {
  const toggle = bar.querySelector('[data-player-collapse]');
  const setCompact = compact => {
    bar.classList.toggle('is-compact', compact);
    document.body.classList.toggle('music-player-compact', compact);
    toggle.setAttribute('aria-expanded', String(!compact));
    toggle.title = compact ? 'Expand music player' : 'Minimize music player';
    toggle.setAttribute('aria-label', toggle.title);
    for (const content of bar.querySelectorAll('.music-art,[data-context],.music-timeline')) {
      content.inert = compact;
      content.setAttribute('aria-hidden', String(compact));
    }
  };
  toggle.addEventListener('click', () => {
    const compact = !bar.classList.contains('is-compact');
    setCompact(compact);
    try {
      localStorage.setItem('gallorin-music-compact', String(compact));
    } catch {}
  });
  let compact = false;
  try {
    compact = localStorage.getItem('gallorin-music-compact') === 'true';
  } catch {}
  setCompact(compact);
}
