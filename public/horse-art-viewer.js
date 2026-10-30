import { html, icon, raw, setHTML } from './ui.js';

export function bindHorseArtViewer() {
  let dialog;
  document.addEventListener('click', event => {
    const portrait = event.target.closest('[data-full-horse]');
    if (!portrait) return;
    const source = portrait.querySelector('svg');
    if (!source) return;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'horse-art-viewer';
      dialog.setAttribute('aria-label', 'Full horse illustration');
      document.body.append(dialog);
      dialog.addEventListener('click', event => {
        if (event.target.closest('[data-close-horse-art]')) return dialog.close();
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (!dialog.open) dialog.replaceChildren();
      });
    }
    const art = source.cloneNode(true);
    art.setAttribute('viewBox', '0 0 460 310');
    // Keep gradient IDs unique while the source profile remains open underneath.
    const ids = new Map([...art.querySelectorAll('[id]')].map(node => [node.id, `viewer-${crypto.randomUUID()}`]));
    for (const node of [art, ...art.querySelectorAll('*')]) {
      for (const attr of [...node.attributes]) {
        let value = attr.value;
        if (attr.name === 'id') value = ids.get(value) || value;
        else if (attr.localName === 'href' && value.startsWith('#'))
          value = `#${ids.get(value.slice(1)) || value.slice(1)}`;
        else for (const [oldID, newID] of ids) value = value.replaceAll(`url(#${oldID})`, `url(#${newID})`);
        node.setAttribute(attr.name, value);
      }
    }
    setHTML(
      dialog,
      html`<div class="horse-art-viewer-header"><button type="button" class="icon-button" data-close-horse-art aria-label="Close full horse illustration">${raw(icon('close'))}</button></div><div class="horse-art-viewer-stage"></div>`
    );
    const stage = dialog.querySelector('.horse-art-viewer-stage');
    stage.append(art);
    dialog.style.width = '';
    dialog.style.height = '94dvh';
    dialog.showModal();
    // Trim empty artwork above the ears and below the hooves without enlarging the horse.
    const bounds = art.getBoundingClientRect();
    const scale = Math.min(bounds.width / 460, bounds.height / 310);
    // Adornments such as antlers and wings can extend into the old empty margins.
    const hasTraits = !!art.querySelector('[data-trait-category]');
    const imageHeight = (hasTraits ? 310 : 258) * scale;
    art.setAttribute('viewBox', hasTraits ? '0 0 460 310' : '0 32 460 258');
    art.style.width = `${460 * scale}px`;
    art.style.height = `${imageHeight}px`;
    art.style.maxWidth = '100%';
    stage.style.padding = '12px';
    stage.style.height = `${imageHeight + 24}px`;
    dialog.style.width = `${460 * scale + 24 + dialog.offsetWidth - dialog.clientWidth}px`;
    dialog.style.height = `${imageHeight + 24 + dialog.offsetHeight - dialog.clientHeight}px`;
  });
  return { close: () => dialog?.close() };
}
