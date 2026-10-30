import { html, raw } from './ui.js';
import { horseArtLayers } from './horse-art-layers.js';

// Directional light stays in model coordinates; the shared mirror makes it
// upper-left light on screen. Transparent stops preserve every palette pigment.
export function horseDepthDefinitions(prefix) {
  return html`<linearGradient id="${prefix}-coat-volume" x1=".9" y1="0" x2=".25" y2="1"><stop stop-color="#FFF4D6" stop-opacity=".19"/><stop offset=".36" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".78" stop-color="#17251E" stop-opacity=".09"/><stop offset="1" stop-color="#111B18" stop-opacity=".28"/></linearGradient>
  <radialGradient id="${prefix}-barrel-light" cx=".52" cy=".18" r=".8"><stop stop-color="#FFF8E8" stop-opacity=".18"/><stop offset=".52" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#142019" stop-opacity=".16"/></radialGradient>
  <linearGradient id="${prefix}-hair-volume" x1="1" y1="0" x2="0" y2=".8"><stop stop-color="#FFF5DA" stop-opacity=".21"/><stop offset=".32" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#101A16" stop-opacity=".28"/></linearGradient>
  <linearGradient id="${prefix}-far-leg-volume" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#18251E" stop-opacity=".18"/><stop offset="1" stop-color="#101913" stop-opacity=".38"/></linearGradient>`;
}

export function farLegArt(colors, prefix) {
  // Duplicate the supplied leg contours and their pigment boundaries together.
  // The upper crop sits inside the barrel, which occludes the attachment seam.
  return html`<g data-depth="far-legs">${[
    { name: 'front', x: 400, y: 390, width: 76, shift: 43 },
    { name: 'hind', x: 674, y: 380, width: 120, shift: -46 }
  ].map(({ name, x, y, width, shift }) => {
    const id = `${prefix}-far-${name}`;
    const layers = horseArtLayers.filter(layer => ['coat top', 'coat bottom', 'sock', 'hoof'].includes(layer.name));
    const silhouettes = layers.map(layer =>
      raw(layer.markup.split('<mask')[0].replaceAll('__PREFIX__', `${id}-`).replaceAll('__COLOR__', '#FFFFFF'))
    );
    return html`<g data-far-leg="${name}" data-leg-source="original-svg" transform="translate(${shift} -5)"><defs><clipPath id="${id}-crop"><rect x="${x}" y="${y}" width="${width}" height="260"/></clipPath><clipPath id="${id}-shape">${silhouettes}</clipPath></defs><g clip-path="url(#${id}-crop)">${layers.map(layer => html`<g data-leg-channel="${layer.channel}" fill="none">${raw(layer.markup.replaceAll('__PREFIX__', `${id}-`).replaceAll('__COLOR__', colors[layer.channel]))}</g>`)}<rect x="${x}" y="${y}" width="${width}" height="260" fill="url(#${prefix}-far-leg-volume)" clip-path="url(#${id}-shape)"/></g></g>`;
  })}</g>`;
}

export function coatDepthArt(prefix) {
  return html`<g data-depth="coat-volume" clip-path="url(#${prefix}-trait-coat)"><rect x="190" y="130" width="610" height="510" fill="url(#${prefix}-coat-volume)"/><ellipse cx="542" cy="346" rx="205" ry="104" fill="url(#${prefix}-barrel-light)"/>
  <g fill="#18251C" opacity=".10"><path d="M302 233Q326 282 379 333Q371 347 378 362Q344 322 322 282Z"/><path d="M470 355Q463 397 482 416Q532 448 606 420Q548 449 482 430Q453 410 470 355Z"/><path d="M666 347Q670 392 704 421L724 462Q689 424 676 404Q660 376 666 347Z"/></g>
  <g fill="none" stroke-linecap="round"><path d="M386 320Q415 299 444 325M680 307Q715 303 739 336" stroke="#FFF6E1" stroke-opacity=".15" stroke-width="7"/><path d="M381 365Q383 389 398 405M678 366Q683 391 697 402" stroke="#263124" stroke-opacity=".18" stroke-width="2"/><path d="M252 217Q271 215 278 226" stroke="#FFF8EA" stroke-opacity=".12" stroke-width="4"/></g></g>`;
}

export function hairDepthArt(paths, prefix) {
  return html`<g data-depth="hair-volume"><defs><linearGradient id="${prefix}-hair-volume" x1="1" y1="0" x2="0" y2=".8"><stop stop-color="#FFF5DA" stop-opacity=".21"/><stop offset=".32" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#101A16" stop-opacity=".28"/></linearGradient></defs>${paths.map(d => html`<path d="${d}" fill="url(#${prefix}-hair-volume)"/>`)}</g>`;
}
