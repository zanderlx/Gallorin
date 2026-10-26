// Preserve native details/keyboard behavior while animating reversible sidebar toggles.
const bindings = new WeakMap();
export function bindNavigationDisclosures(root, { onChange, onWildsOpen }) {
  bindings.get(root)?.abort();
  const controller = new AbortController(),
    running = new Map();
  bindings.set(root, controller);
  const expanded = details => (details.dataset.navExpanded ? details.dataset.navExpanded === 'true' : details.open);
  const setOpen = (details, open, navigate) => {
    const previous = running.get(details),
      summary = details.querySelector('summary');
    const height = details.getBoundingClientRect().height;
    previous?.animation.cancel();
    onChange(details.dataset.group, open);
    summary.setAttribute('aria-expanded', String(open));
    const finish = () => {
      details.open = open;
      details.style.height = '';
      details.removeAttribute('data-nav-expanded');
      running.delete(details);
      if (open && navigate) onWildsOpen();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    details.open = true;
    details.style.height = '';
    const target = open ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
    details.style.height = height + 'px';
    details.dataset.navExpanded = String(open);
    const animation = details.animate([{ height: height + 'px' }, { height: target + 'px' }], {
      duration: 260,
      easing: 'cubic-bezier(.22,1,.36,1)'
    });
    running.set(details, { animation });
    animation.finished
      .then(() => {
        if (running.get(details)?.animation === animation) finish();
      })
      .catch(() => {});
  };
  root
    .querySelectorAll('nav details')
    .forEach(details => details.querySelector('summary').setAttribute('aria-expanded', String(details.open)));
  root.addEventListener(
    'click',
    event => {
      const summary = event.target.closest('nav details > summary');
      if (!summary || !root.contains(summary)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(
        summary.parentElement,
        !expanded(summary.parentElement),
        !!event.target.closest('[data-action="wilds-home"]')
      );
    },
    { signal: controller.signal }
  );
  controller.signal.addEventListener(
    'abort',
    () => {
      for (const { animation } of running.values()) animation.cancel();
      running.clear();
    },
    { once: true }
  );
}
