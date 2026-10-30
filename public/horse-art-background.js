import { html } from './ui.js';

// Keep the original scenery and Coat Top-driven radial color selection.
export function horseArtBackground(coat, uid) {
  return html`<defs>
    <radialGradient id="${uid}bg"><stop stop-color="${coat}" stop-opacity=".22"/><stop offset="1" stop-color="#181d1b"/></radialGradient>
  </defs>
  <rect width="460" height="310" fill="#1a211f"/><rect width="460" height="310" fill="url(#${uid}bg)"/>
  <circle cx="245" cy="135" r="98" fill="none" stroke="${coat}" stroke-opacity=".12"/>
  <circle cx="245" cy="135" r="110" fill="none" stroke="${coat}" stroke-opacity=".08"/>
  <path d="M0 250Q130 214 230 248t230-2v64H0Z" fill="#131b17" opacity=".55"/>
  <g stroke="${coat}" stroke-opacity=".14" fill="none"><path d="m30 275 10-110 7 110m-9-75-17-22m19 38 23-25m341 84-6-140m2 55 21-25m-20-3-13-24M75 290l3-57m302 57 9-61"/><path d="m34 160 6-10 7 10m345-25 6-10 6 10"/></g>
  <ellipse cx="234" cy="275" rx="120" ry="12" fill="#0b1210" opacity=".6"/>`;
}

export function horseArtAccents(coat) {
  return html`<g fill="${coat}" opacity=".6"><path d="m101 91 2-6 2 6 6 2-6 2-2 6-2-6-6-2Zm260 62 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z"/><circle cx="155" cy="88" r="1.4"/><circle cx="347" cy="225" r="1.5"/><circle cx="109" cy="166" r="1"/><circle cx="239" cy="51" r="1.5"/></g>`;
}
