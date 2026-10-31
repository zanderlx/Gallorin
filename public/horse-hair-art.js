import { horseArtLayers } from './horse-art-layers.js';
import { html } from './ui.js';
import { hairDepthArt } from './horse-art-depth.js';

const shape = (d, color) =>
  html`<path d="${d}" fill="${color}" stroke="#172019" stroke-width="1.4" stroke-opacity=".25" stroke-linejoin="round"/>`;
const stroke = (d, color, width = 1.5) =>
  html`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity=".32" stroke-linecap="round"/>`;
const sample = (seed, salt) => (Math.imul(seed ^ salt, 1597334677) >>> 0) / 4294967296;
const n = value => Math.round(value * 100) / 100;

// Texture and length are independent: a short curly/furry tail stays short.
export function hairDesign(recipe) {
  const { text, seed, category } = recipe;
  const short = /\b(short|chopped|chop|cut|roached|stub|moose|deer|bison)\b/.test(text);
  const long = /\b(long|lengthy|flowing|full)\b/.test(text);
  const sparse = /\b(sparse|thin|wispy|whispy|half|partial|quarter)\b/.test(text);
  const texture = /braid|plait|pinwheel/.test(text)
    ? 'braid'
    : /fur|furry|fuzzy|fluff|floof|bushy|shaggy|poofy|thick|wolf|fox|fennec|squirrel/.test(text)
      ? 'fur'
      : /curly|curls|curl/.test(text)
        ? 'curly'
        : /wavy|wave|winding|espiral|swept/.test(text)
          ? 'wavy'
          : recipe.family;
  return {
    texture,
    short,
    sparse,
    tufted: category === 'Tail' && /\b(tip|tuft|tufted|bison|deer|okapi|lion)\b/.test(text),
    raised: /upturn|upward/.test(text),
    length: n(
      (category === 'Tail' ? (short ? 55 : long ? 285 : 215) : short ? 32 : long ? 115 : 74) *
        (0.87 + sample(seed, 11) * 0.26)
    ),
    width: n(
      (sparse ? 12 : /thick|voluminous|puff|full|bushy|fur/.test(text) ? 54 : 40) * (0.8 + sample(seed, 29) * 0.4)
    ),
    bend: n(18 + sample(seed, 73) * 38),
    strands: 4 + Math.floor(sample(seed, 131) * 5),
    tip: n(6 + sample(seed, 157) * 20)
  };
}

export const sourceHairPaths = Object.fromEntries(
  ['Mane', 'Tail'].map(category => {
    const layer = horseArtLayers.find(layer => layer.name === category.toLowerCase());
    return [
      category,
      [...layer.markup.split('<defs>')[1].matchAll(/<path id="[^"]+" d="([^"]+)"/g)].map(match => match[1])
    ];
  })
);

export function tailAttachmentWeight(x, y) {
  // Preserve every source control point at the rump; blend changes farther out.
  const distance = Math.hypot(x - 737, y - 260);
  const t = Math.max(0, Math.min(1, (distance - 43) / 100));
  return t * t * (3 - 2 * t);
}

export function horseHairArt(recipe, color, accent, prefix = 'trait') {
  if (recipe.family === 'bare') return html``;
  const design = hairDesign(recipe),
    tail = recipe.category === 'Tail',
    seed = recipe.seed;
  const standard = /^standard (mane|tail)$/i.test(recipe.name);
  const stretch = standard
    ? 1
    : design.short
      ? tail
        ? 0.38
        : 0.35
      : /long|full/.test(recipe.text)
        ? 1.05
        : 0.78 + sample(seed, 11) * 0.22;
  const breadth = standard ? 1 : design.sparse ? 0.58 : 0.88 + sample(seed, 29) * 0.22;
  const paths = sourceHairPaths[recipe.category].map((source, pathIndex) => {
    if (standard) return source;
    if (tail && design.short) {
      // Keep the original dock and first curve, then cut a hanging lock rather
      // than vertically crushing the source's broad, swept upper silhouette.
      const end = n(310 + design.length);
      const outer = n(793 + sample(seed, 29) * 13);
      const tips =
        design.texture === 'fur'
          ? `L${outer - 5} ${end - 12}L${outer - 9} ${end + 3}L${outer - 14} ${end - 8}`
          : design.texture === 'curly'
            ? `Q${outer + 7} ${end + 5} ${outer - 8} ${end + 6}Q${outer - 20} ${end} ${outer - 10} ${end - 9}`
            : `Q${outer - 4} ${end + 2} ${outer - 12} ${end + 5}`;
      return `M721.5 237C712 249 715 259.5 717 265.5C724.734 268.183 729.5 270 737 273.5C765 285 774 309 ${outer - 15} ${end - 18}${tips}Q${outer + 12} ${end - 30} ${outer} 300C780 275 759 252 739 244Q730 238 721.5 237Z`;
    }
    let pair = [];
    return source
      .replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, value => {
        pair.push(Number(value));
        if (pair.length === 1) return '__X__';
        const [x, y] = pair;
        pair = [];
        if (tail && tailAttachmentWeight(x, y) === 0) return `${x},${y}`;
        let px = x,
          py = y;
        if (!standard && !(recipe.category === 'Mane' && pathIndex === 0)) {
          const t = tail ? Math.max(0, (y - 250) / 322) : Math.max(0, (x - 290) / 190);
          if (tail) {
            const weight = tailAttachmentWeight(x, y);
            // Thin the hair around its own outward sweep, never toward the rump.
            const center = 800 + Math.max(0, y - 320) * 0.16;
            const targetX = design.short ? 737 + (x - 737) * 0.52 : center + (x - center) * breadth;
            const targetY = design.short
              ? 260 + Math.max(-12, y - 260) * stretch
              : design.raised && y > 265
                ? 250 - (y - 250) * 0.42
                : y < 250
                  ? y
                  : 250 + (y - 250) * stretch;
            px = x + (targetX - x) * weight;
            py = y + (targetY - y) * weight;
          } else {
            const seam = 160 + (x - 290) * 0.78;
            py = y < seam ? y : seam + (y - seam) * stretch;
            px = x + (x - 290) * (breadth - 1) * 0.12;
          }
          const wave =
            design.texture === 'wavy' ? Math.sin(t * 8) * 7 : design.texture === 'curly' ? Math.sin(t * 16) * 10 : 0;
          const weight = tail ? tailAttachmentWeight(x, y) : 1;
          px += wave * weight;
          if (design.texture === 'fur') px += Math.sin(t * 35) * 3 * weight;
        }
        return `${n(px)},${n(py)}`;
      })
      .replaceAll(/__X__\s*/g, '');
  });
  const clip = `${prefix}-source-hair-${recipe.category}-${seed}`;
  const painted = paths.map(d => shape(d, color));
  const joinX = n(design.short ? 737 + (820 - 737) * 0.52 : 810 + 10 * breadth);
  const joinY = n(design.raised ? 250 - (380 - 250) * 0.42 : 250 + (380 - 250) * stretch);
  // A tapered filled root joins the source silhouette to its reshaped body,
  // including raised tails whose curved lobes can otherwise leave a hairline gap.
  const attachment =
    tail && !standard && !design.short
      ? html`<g data-tail-attachment="fixed"><path d="M730 258Q754 253 ${joinX} ${joinY - 8}L${joinX + 8} ${joinY + 7}Q754 270 735 275Z" fill="${color}"/></g>`
      : '';
  const detail = Array.from({ length: design.strands }, (_, i) => {
    const t = (i + 1) / (design.strands + 1),
      x = tail ? 735 + t * 95 * breadth : 310 + t * 125,
      y = tail ? 260 + t * 250 * stretch : 176 + t * 110;
    if (design.texture === 'braid') return stroke(`M${n(x - 15)} ${n(y - 9)}q22 9 0 20q-22 9 0 20`, accent, 2);
    if (design.texture === 'curly') return stroke(`M${n(x)} ${n(y)}c-18-15 19-25 15-6s-21 20-16 4`, accent, 1.6);
    return stroke(
      `M${n(x)} ${n(y)}q${n(8 + sample(seed, i + 47) * 13)} 15 3 ${n(25 + sample(seed, i + 61) * 20)}`,
      accent,
      1.2
    );
  });
  return html`<g data-hair-source="original-svg" data-hair-texture="${design.texture}" data-hair-length="${design.short ? 'short' : 'long'}"><defs><clipPath id="${clip}">${paths.map(d => shape(d, '#FFFFFF'))}</clipPath></defs>${attachment}${painted}${hairDepthArt(paths, `${prefix}-${recipe.category}-${seed}`)}<g clip-path="url(#${clip})">${standard ? '' : detail}</g></g>`;
}
