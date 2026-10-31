import { cosmicArtworkEye } from './cosmic-types.js';
import { html } from './ui.js';
import { horseModel } from './horse-art-model.js';
import { horseArtBackground, horseArtAccents } from './horse-art-background.js';

// Retain the previous renderer as an explicit, reusable alternative.
export { legacyHorseArt, legacyHorseHeadArt } from './legacy-art.js';

let providedArtwork = false;
export function setProvidedHorseArtwork(enabled) {
  providedArtwork = enabled === true;
}

export const horseFullViewBox = '0 0 460 310';
export const horseHeadViewBox = '270 10 145 170';

export function horseHeadArt(horse, large = false) {
  return horseArt(horse, large).replace(`viewBox="${horseFullViewBox}"`, `viewBox="${horseHeadViewBox}"`);
}

export function horseArt(horse, large = false) {
  const coat = horse.palette.colors['Coat Top'];
  // Cosmic artwork overrides stay independent of saved/generated eye traits.
  const eye = cosmicArtworkEye(horse) || horse.eye.colors[0];
  const uid = `h${horse.id.replace(/[^a-z0-9-]/gi, '')}${large ? 'l' : ''}`;
  return String(html`<svg xmlns="http://www.w3.org/2000/svg" class="horse-art" viewBox="${horseFullViewBox}" role="img" aria-label="Horse illustration facing right">
  ${horseArtBackground(coat, uid)}
  ${horseModel(horse, eye, uid, providedArtwork)}
  ${horseArtAccents(coat)}
  </svg>`);
}
