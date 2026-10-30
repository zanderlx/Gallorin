import { keratinArt } from './horse-keratin-art.js';
import { horseHairArt } from './horse-hair-art.js';
import { html, raw } from './ui.js';

export const traitArtCategories = ['Pattern', 'Paint', 'Tail', 'Mane', 'Ears', 'Keratin', 'Whiskers'];
const clean = value => String(value || '').trim();
export function selectedArtTraits(horse, category) {
  const values = horse.traits?.[category] ?? horse.traits?.[`${category}s`] ?? [];
  return [...new Set((Array.isArray(values) ? values : [values]).map(clean))].filter(
    value => value && !/^(none|awaiting species data)$/i.test(value)
  );
}
const hash = text => [...text].reduce((value, c) => (Math.imul(value, 31) + c.charCodeAt(0)) >>> 0, 7);
const path = (d, fill, width = 1.5, opacity = 1) =>
  html`<path d="${d}" fill="${fill}" stroke="#171F1B" stroke-opacity=".28" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (d, color, width = 3, opacity = 1) =>
  html`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x, y, r, color, opacity = 1) =>
  html`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
const group = (x, y, scale, art) => html`<g transform="translate(${x} ${y}) scale(${scale})">${art}</g>`;
const color = (colors, key, fallback) => (/^#[\da-f]{6}$/i.test(colors?.[key] || '') ? colors[key] : fallback);

// Names are the bundled definitions. Optional descriptions can refine custom traits.
// Each recipe is independent of species so a future preview gallery can reuse it.
export function traitArtDefinition(category, name, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  const has = pattern => pattern.test(text);
  let family;
  if (/^(Mane|Tail)$/.test(category)) {
    family = has(/^(bald|hairless)\b/)
      ? 'bare'
      : has(/braid|plait|pinwheel/)
        ? 'braid'
        : has(/bone|skell|skeleton/)
          ? 'bone'
          : has(/flam|fire|phoenix/)
            ? 'flame'
            : has(/crystal|glacier|ice|shard/)
              ? 'crystal'
              : has(/cact|thorn|spine|scale|crocod|stego|raptor/)
                ? 'spines'
                : has(/flower|floral|bloom|petal|leaf|lettuce|cabbage|vine|succulent/)
                  ? 'botanical'
                  : has(/feather|wing|avian/)
                    ? 'feather'
                    : has(/curl|wavy|winding|espiral/)
                      ? 'curls'
                      : has(/short|cut|chop|roached|sparse|moose|deer|bison|tuft/)
                        ? 'short-hair'
                        : 'flowing-hair';
  } else if (category === 'Keratin') {
    family = has(/fang|teeth|tooth|canine|tusk/)
      ? 'fangs'
      : has(/crown|tiara|helm/)
        ? 'crown'
        : has(/pole|sword|key/)
          ? 'pole'
          : has(/antenna/)
            ? 'antennae'
            : has(/antler|branch|elk|reindeer|pronghorn/)
              ? 'antlers'
              : has(/ram|kudu|curl|spiral|donut|croissant|sheep/)
                ? 'curled-horns'
                : has(/crest|cover|skull|wing/)
                  ? 'crest'
                  : 'horns';
  } else if (category === 'Ears' && !has(/front left/)) {
    family = has(/wing|feather|fin|frill|web/) ? 'ear-fans' : has(/droop|flop|fold|tentacle/) ? 'floppy-ears' : 'ears';
  } else if (category === 'Whiskers' && has(/whisker/)) family = 'whiskers';
  else if (has(/halo|aura|neck ring|blackhole/)) family = 'aura';
  else if (has(/front (left|right)/)) family = 'charm';
  else if (has(/wing|feather/) && category === 'Cosmetic') family = 'wings';
  else if (has(/flower|floral|bloom|petal|marigold/)) family = 'flowers';
  else if (has(/heart|love/)) family = 'hearts';
  else if (has(/star|sun|moon|celestial|spark|shimmer|night sky/)) family = 'stars';
  else if (has(/eye|ocular|watch/)) family = 'eyes';
  else if (has(/bone|skull|rib|skeleton/)) family = 'bones';
  else if (has(/web|spinneret/)) family = 'web';
  else if (has(/stitch|seam/)) family = 'stitches';
  else if (has(/scale|scute|plated|armor|armour|plate|crystal|ice sheet|gem|jewel/)) family = 'plates';
  else if (has(/spike|thorn|spine|claw|beak|tooth|tusk/)) family = 'spikes';
  else if (has(/flame|fire|lava/)) family = 'flames';
  else if (has(/leaf|vine|fern|botan|wood|branch|plant|cact|succulent/)) family = 'leaves';
  else if (has(/bow|ribbon|tassel|banner|chain|pearl|collar|cuff|jabot/)) family = 'ribbons';
  else if (category === 'Cosmetic' && has(/fur|fluff|floof|fleece|fuzzy|shaggy|beard|tuft|coat|hair|lash|brow/))
    family = 'fur';
  else if (has(/stripe|band|brindle|zebra|chevron|streak/)) family = 'stripes';
  else if (has(/swirl|curl|whirl|spiral|filigree|arabesque|rosette|marbl|rune|sigil/)) family = 'swirls';
  else if (has(/check|jester|diamond|card/)) family = 'diamonds';
  else if (has(/spot|dapple|freck|speck|fleck|leopard|appaloosa|merle|roan|seed|gravel|pebble|confetti/))
    family = 'spots';
  else if (category === 'Cosmetic') family = 'ornament';
  else family = 'patches';
  const region = has(/front (left|right)/)
    ? 'front-leg'
    : has(/face|head|mask|cheek|jaw|chin|nose|eye|brow|lash|maw|skull|blaze/)
      ? 'head'
      : has(/ankle|hoof|sock|feet|leg|limb|paw/)
        ? 'legs'
        : has(/neck|chest|front|frontal|shoulder/)
          ? 'front'
          : has(/hind|rear|back|thigh/)
            ? 'hind'
            : has(/belly|lower body|undercoat|stomach/)
              ? 'belly'
              : 'body';
  return { category, name: clean(name), family, region, seed: hash(`${category}:${name}:${description}`), text };
}

function motif(family, c, text) {
  switch (family) {
    case 'flowers': {
      const seed = hash(text),
        petals = 5 + (seed % 4);
      const width = 4 + (seed % 719) / 180,
        reach = 14 + ((seed >>> 8) % 887) / 100;
      return html`${Array.from({ length: petals }, (_, i) => html`<g transform="rotate(${(i * 360) / petals})">${path(`M0 0C-${width} -6 -${width} -${reach} 0 -${reach}C${width} -${reach} ${width} -6 0 0Z`, c)}</g>`)}${circle(0, 0, 3, '#FFE8AB')}`;
    }
    case 'hearts':
      return path('M0 14C-28-2-16-23 0-10C16-23 28-2 0 14Z', c);
    case 'stars':
      return /moon/.test(text)
        ? path('M8-16C-22-12-18 23 10 16C-4 11-9-4 8-16Z', c)
        : path('M0-19L5-6 19-5 8 4 12 18 0 10-12 18-8 4-19-5-5-6Z', c);
    case 'eyes':
      return html`${path('M-22 0Q0-23 22 0Q0 23-22 0Z', c)}${circle(0, 0, 7, '#17251D')}${circle(-2, -3, 2, '#FFFFFF')}`;
    case 'bones':
      return html`${line('M-13-13L13 13', c, 7)}${[-1, 1].map(i => html`${circle(i * 12, i * 17, 5, c)}${circle(i * 17, i * 12, 5, c)}`)}`;
    case 'web':
      return html`${[0, 1, 2, 3].map(i => html`<g transform="rotate(${i * 45})">${line('M-24 0H24', c, 1.5)}</g>`)}${line('M0-10L7-7 10 0 7 7 0 10-7 7-10 0-7-7ZM0-22L16-16 22 0 16 16 0 22-16 16-22 0-16-16Z', c, 1.5)}`;
    case 'stitches':
      return line('M-25 0H25M-19-7L-15 7M-7-7L-3 7M5-7L9 7M17-7L21 7', c, 2.5);
    case 'plates':
      return html`${path('M0-22L16-9 12 15 0 23-12 15-16-9Z', c)}${line('M0-22V23M-16-9L0-3 16-9', '#FFFFFF', 1.5, 0.4)}`;
    case 'spikes':
      return path('M-16 13L-8-26 4 0 15-18 19 14Z', c);
    case 'flames':
      return path('M-14 18C-30-5-4-9-6-30C22-14 9-7 17-15C34 12 9 30-14 18Z', c);
    case 'leaves':
      return html`${path('M-15 15Q-30-18 18-22Q23 10-15 15Z', c)}${line('M-15 15L11-14M-5 3L-13-8M3-5L13-2', '#17251D', 1.5, 0.5)}`;
    case 'ribbons':
      return html`${path('M0 0L-22-15-22 14ZM0 0L22-15 22 14ZM-4 3L-12 33 0 25 9 34 4 2Z', c)}${circle(0, 0, 5, c)}`;
    case 'fur':
      return path('M-23-8Q-9-13 0-9L23-3 17 19 10 11 3 25-3 13-12 21-13 8-23 13Z', c);
    case 'stripes':
      return path('M-8-32Q5-14-7 8L-14 31Q6 19 9-4L13-29Z', c);
    case 'swirls':
      return line('M-24 9C-25-25 25-23 23 2S-11 24-11 4S14-8 10 4', c, 4);
    case 'diamonds':
      return path('M0-23L16 0 0 23-16 0Z', c);
    case 'spots':
      return html`${path('M-17-9Q-5-22 10-12T18 8Q6 22-9 13T-17-9Z', c)}${circle(21, -18, 3, c)}`;
    case 'charm': {
      if (/camera|casset|disc|music|guitar/.test(text))
        return html`${path('M-22-15H22V15H-22Z', c)}${circle(0, 0, 10, '#17251D')}${circle(0, 0, 6, c)}`;
      if (/bow/.test(text)) return motif('ribbons', c, text);
      if (/heart/.test(text)) return motif('hearts', c, text);
      if (/star|space/.test(text)) return motif('stars', c, text);
      if (/leaf|nature|lily|strawberry/.test(text)) return motif('leaves', c, text);
      return html`${circle(0, 0, 21, c)}${path('M-12 4Q0-10 12 4L9 13H-9Z', '#17251D')}${circle(-9, -9, 4, '#17251D')}${circle(9, -9, 4, '#17251D')}`;
    }
    default:
      return html`${path('M-25-6Q-13-22 5-15T23 7Q8 26-12 14T-25-6Z', c)}${line('M-12 0Q0-12 12 0', '#FFFFFF', 1, 0.25)}`;
  }
}

function anchors(region, text = '') {
  if (/beard|chin/.test(text)) return [[231, 286]];
  if (/ankle|hoof|sock|feet/.test(text))
    return [
      [411, 604],
      [746, 604]
    ];
  if (/cheek|jaw/.test(text)) return [[254, 234]];
  return {
    head: [[242, 239]],
    front: [
      [350, 297],
      [398, 371]
    ],
    hind: [
      [666, 339],
      [724, 397]
    ],
    belly: [
      [475, 421],
      [579, 429]
    ],
    legs: [
      [411, 534],
      [746, 530]
    ],
    'front-leg': [[408, 540]],
    body: [
      [425, 338],
      [527, 361],
      [630, 352],
      [709, 386]
    ]
  }[region];
}

export function markingPlacements(horse) {
  const used = new Set(),
    placements = new Map();
  const body = [
    [423, 343],
    [515, 345],
    [605, 345],
    [687, 353],
    [451, 397],
    [548, 397],
    [645, 400]
  ];
  const head = [
    [244, 228],
    [229, 246],
    [216, 262],
    [261, 223],
    [241, 257],
    [254, 243]
  ];
  const legs = [
    [409, 521],
    [747, 521],
    [408, 574],
    [744, 574]
  ];
  for (const category of ['Paint', 'Pattern'])
    for (const name of selectedArtTraits(horse, category)) {
      const recipe = traitArtDefinition(category, name),
        { region, text } = recipe;
      const pool = region === 'head' ? head : region === 'legs' || region === 'front-leg' ? legs : body;
      const preferred = pool.slice().sort((a, b) => {
        const desired =
          region === 'hind'
            ? 680
            : region === 'front'
              ? 400
              : region === 'belly'
                ? 550
                : region === 'head' && /nose/.test(text)
                  ? 215
                  : 500;
        return Math.abs(a[0] - desired) - Math.abs(b[0] - desired);
      });
      const point = preferred.find(([x, y]) => !used.has(`${x},${y}`)) || preferred.at(-1);
      used.add(point.join(','));
      placements.set(`${category}:${name}`, {
        x: point[0],
        y: point[1],
        width: region === 'head' ? 11 : pool === legs ? 22 : 70,
        height: region === 'head' ? 12 : pool === legs ? 35 : 38,
        opacity: region === 'head' ? 0.25 : /light|subtle|faded/.test(text) ? 0.27 : 0.43
      });
    }
  return placements;
}

function markings(recipe, c, placement) {
  const { family, seed, text, region } = recipe;
  const spot = placement || {
    x: region === 'head' ? 241 : 520,
    y: region === 'head' ? 242 : 363,
    width: region === 'head' ? 11 : 70,
    height: region === 'head' ? 12 : 38,
    opacity: region === 'head' ? 0.25 : 0.43
  };
  const scatter = /spots|stars|hearts|flowers/.test(family),
    count = scatter ? (/light|sparse/.test(text) ? 3 : 5) : /stripes/.test(family) ? 3 : 1;
  let art;
  if (/blaze|bald face|face splash|skull/.test(text)) art = path('M-2-18Q4-9 1 18L-3 16Q0 0-2-18Z', c, 0);
  else if (/sock|lower leg/.test(text)) art = path('M-9-20Q0-25 9-20L11 23H-11Z', c, 0);
  else
    art = html`${Array.from({ length: count }, (_, i) => {
      const x = count === 1 ? 0 : ((i % 3) - 1) * 18,
        y = count === 1 ? 0 : (Math.floor(i / 3) - 0.5) * 18;
      return group(x, y, count === 1 ? 0.72 : 0.3 + (seed % 13) * 0.008, motif(family, c, text));
    })}`;
  return html`<g data-marking-region="${region}" data-marking-center="${spot.x},${spot.y}" opacity="${spot.opacity}" transform="translate(${spot.x} ${spot.y}) scale(${spot.width / 70} ${spot.height / 38})">${art}</g>`;
}

// Vary contour control points and tips, rather than recoloring or scaling a shared
// symbol. Keep anatomical anchors fixed while changing each name's silhouette.
function individualContours(art, seed) {
  let pointIndex = 0;
  return raw(
    String(art).replace(/\bd="([^"]+)"/g, (_, d) => {
      let coordinate = 0;
      const outline = d.replace(/-?\d*\.?\d+/g, number => {
        const value = Number(number);
        const index = pointIndex++;
        if (coordinate++ < 2 || !value) return number;
        let mixed = seed ^ Math.imul(index + 1, 0x9e3779b9);
        mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85ebca6b);
        mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2b2ae35);
        const fraction = ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
        const change = Math.min(7, Math.abs(value) * 0.18) * (fraction * 2 - 1);
        return String(Math.round((value + change) * 100) / 100);
      });
      return `d="${outline}"`;
    })
  );
}

export function traitArtwork(category, name, { colors = {}, description = '', prefix = 'trait', placement } = {}) {
  if (category === 'Cosmetic') return html``;
  const recipe = traitArtDefinition(category, name, description),
    { family, region, seed, text } = recipe;
  const c = color(
    colors,
    category === 'Mane' || category === 'Tail'
      ? 'Hair'
      : category === 'Pattern'
        ? 'Pattern'
        : category === 'Paint'
          ? 'Paint'
          : category === 'Cosmetic' || category === 'Ears'
            ? 'Coat Top'
            : 'Keratin',
    '#B7A47A'
  );
  const accent = color(colors, 'Paint', '#F4E2BD');
  let art;
  if (category === 'Mane' || category === 'Tail') art = horseHairArt(recipe, c, accent, prefix);
  else if (category === 'Keratin') art = keratinArt(recipe, c, accent);
  else if (family === 'ears' || family === 'floppy-ears' || family === 'ear-fans') {
    const long = /long|jackrabbit|skyreacher|fennec|angora/.test(text) ? 80 : 43;
    art = html`${[0, 1].map(i => group(281 + i * 23, 177 + i * 5, 1, family === 'floppy-ears' ? path(`M-9 0Q-42-54-46 10Q-48 37-29 26L6 0Z`, c) : family === 'ear-fans' ? path('M0 0L-62-22-40-30-55-48-30-36-30-62 8-8Z', c) : path(`M-10 0Q-30-${long} -12-${long}Q10-${long - 10} 9 0Z`, c)))}`;
  } else if (family === 'whiskers')
    art = html`${line(`M208 264Q150 232 ${/short/.test(text) ? 176 : 124} 267M210 270Q152 282 ${/short/.test(text) ? 178 : 131} 304`, c, /thick|furry/.test(text) ? 5 : 2)}${/curl|twist/.test(text) ? line('M126 267C95 250 112 236 124 247M131 304Q102 320 114 329', c, 2) : ''}`;
  else if (family === 'aura')
    art = html`<g opacity=".65">${html`<ellipse cx="${/body/.test(text) ? 520 : /neck/.test(text) ? 335 : 257}" cy="${/body/.test(text) ? 345 : /neck/.test(text) ? 255 : 176}" rx="${/body/.test(text) ? 156 : 66}" ry="${/body/.test(text) ? 100 : 26}" fill="none" stroke="${c}" stroke-width="4"/>`}${group(270, 130, 0.5, motif('stars', accent, text))}</g>`;
  else if (family === 'wings')
    art = html`${group(region === 'legs' ? 409 : 480, region === 'legs' ? 510 : 315, region === 'legs' ? 0.8 : 2.4, path('M0 0Q-7-67 30-102L25-60 49-85 39-39 62-58Q53-5 0 0Z', c))}`;
  else if (category === 'Pattern' || category === 'Paint') art = markings(recipe, c, placement);
  else
    art = html`${anchors(region, text).map(([x, y]) => group(x, y, 0.7 + (seed % 8) * 0.12, motif(family, c, text)))}`;
  let geometry = category === 'Mane' || category === 'Tail' ? art : individualContours(art, seed);
  if (category === 'Whiskers' && region === 'head')
    geometry = html`<g opacity=".45" transform="translate(245 240) scale(.65) translate(-245 -240)">${geometry}</g>`;
  return html`<g data-trait-category="${category}" data-trait="${name}" data-trait-family="${family}" fill="none">${geometry}</g>`;
}

export function horseTraitCategoryArt(horse, category, prefix) {
  const placements = markingPlacements(horse);
  const art = selectedArtTraits(horse, category).map(name =>
    traitArtwork(category, name, {
      colors: horse.palette.colors,
      prefix,
      placement: placements.get(`${category}:${name}`)
    })
  );
  return category === 'Pattern' || category === 'Paint'
    ? html`<g clip-path="url(#${prefix}-trait-coat)">${art}</g>`
    : html`${art}`;
}
