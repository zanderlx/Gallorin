import { html } from './ui.js';

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

export function horseHairArt(recipe, color, accent) {
  if (recipe.family === 'bare') return html``;
  const design = hairDesign(recipe),
    { length, width, bend, strands, texture, sparse, tip } = design;
  const { category, seed, text, family } = recipe;
  const tail = category === 'Tail';
  // A centerline anchors every variant at the same anatomical root.
  const point = t =>
    tail
      ? [
          n(727 + Math.sin(t * Math.PI * 0.85) * bend + t * 18),
          n(253 + (design.raised ? -Math.sin(t * Math.PI) * length * 0.5 + t * length * 0.2 : t * length))
        ]
      : [n(295 + t * 141), n(171 + t * 112)];
  const points = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12,
      [x, y] = point(t);
    const wave =
      texture === 'wavy' || texture === 'curly'
        ? Math.sin(t * Math.PI * (texture === 'curly' ? 5 : 2)) * width * 0.35
        : 0;
    const fringe = texture === 'fur' ? (i % 2 ? 1.25 : 0.72) : 1;
    const taper = /blunt|chop|cut/.test(text) ? 0.9 : Math.max(0.05, 1 - t * 0.92);
    const depth = (tail ? width : length) * (design.tufted && t < 0.65 ? 0.14 : taper) * fringe;
    return [n(x + wave), n(y), n(tail ? x + wave + depth : x + depth * 0.65), n(tail ? y : y + depth)];
  });
  const edge = (rows, xIndex, yIndex) =>
    rows
      .map((p, i) => {
        const next = rows[Math.min(i + 1, rows.length - 1)];
        return `Q${p[xIndex]} ${p[yIndex]} ${n((p[xIndex] + next[xIndex]) / 2)} ${n((p[yIndex] + next[yIndex]) / 2)}`;
      })
      .join(' ');
  const maneDepth = n(length * 0.55),
    fringe = texture === 'fur' ? `L431 ${n(268 + maneDepth)} 414 ${n(248 + maneDepth)} 409 ${n(266 + maneDepth)}` : '';
  const silhouette = tail
    ? `M${points[0][0]} ${points[0][1]}Q730 235 ${points[0][2]} ${points[0][3]}${edge(points, 2, 3)}L${points.at(-1)[0]} ${points.at(-1)[1]}${edge(points.slice().reverse(), 0, 1)}Z`
    : `M280 174Q300 ${n(146 - width * 0.2)} 325 158C${n(345 + tip)} 161 374 ${n(202 - maneDepth * 0.2)} 400 220Q440 230 ${n(445 + width * 0.3)} ${n(275 + maneDepth * 0.4)}${fringe}Q420 ${n(266 + maneDepth * 0.5)} 396 255Q365 ${n(234 + maneDepth * 0.3)} 345 208Q314 ${n(197 + maneDepth * 0.2)} 285 216Z`;
  let art = html`${shape(silhouette, color)}${Array.from({ length: strands }, (_, i) => {
    const a = point(0.1),
      b = point(0.4 + sample(seed, i + 61) * 0.3),
      end = point(0.7 + sample(seed, i + 211) * 0.25);
    const offset = n(((i + 1) / (strands + 1)) * width * 0.7);
    return stroke(
      tail
        ? `M${a[0] + offset} ${a[1]}Q${b[0] + offset} ${b[1]} ${end[0] + offset * 0.3} ${end[1]}`
        : `M${a[0]} ${a[1] + offset}Q${b[0] + offset} ${b[1] + offset} ${end[0] + tip} ${end[1] + offset}`,
      accent
    );
  })}`;
  if (texture === 'braid') {
    const count = /button/.test(text) ? 6 : /pinwheel/.test(text) ? 10 : 12;
    art = html`${stroke(`M${point(0).join(' ')}L${point(1).join(' ')}`, color, 7)}${Array.from(
      { length: count },
      (_, i) => {
        const [x, y] = point(i / (count - 1)),
          w = n(width * (/sleek/.test(text) ? 0.32 : 0.48)),
          h = n(9 + sample(seed, i + 47) * 6);
        return shape(
          `M${x} ${y}C${x - w} ${y - h} ${x - w} ${y + h} ${x + 2} ${y + h}C${x + w} ${y + h * 2} ${x + w} ${y - h} ${x} ${y}Z`,
          color
        );
      }
    )}${stroke(`M${point(0.12).join(' ')}L${point(0.92).join(' ')}`, accent, 1)}`;
  }
  if (texture === 'curly')
    art = html`${art}${Array.from({ length: design.short ? 3 : 5 }, (_, i) => {
      const [x, y] = point(0.2 + i * 0.15),
        r = n(width * (0.2 + sample(seed, i + 331) * 0.2));
      return stroke(
        `M${x + r} ${y}C${x + r * 2} ${y - r * 2} ${x - r * 2} ${y - r * 2} ${x - r} ${y + r}Q${x + r} ${y + r * 2} ${x + r * 0.4} ${y}`,
        accent,
        2
      );
    })}`;
  const decorations = {
    flame: 'flames',
    crystal: 'plates',
    spines: 'spikes',
    botanical: /leaf|cact|lettuce|cabbage/.test(text) ? 'leaves' : 'flowers',
    feather: 'feathers',
    bone: 'bones'
  }[family];
  // Specialized materials retain their own silhouettes instead of default braid-like beads.
  if (decorations)
    art = html`${art}${Array.from({ length: sparse ? 3 : 6 }, (_, i) => {
      const [x, y] = point(i / 6),
        s = n(10 + sample(seed, i + 401) * 14);
      const d =
        decorations === 'flames'
          ? `M${x} ${y}Q${x - s} ${y - 9} ${x + 4} ${y - s * 2}Q${x + s * 2} ${y - 5} ${x + s} ${y + 18}Z`
          : decorations === 'plates'
            ? `M${x} ${y}L${x + s} ${y - s} ${x + s * 1.3} ${y + 10} ${x + 5} ${y + 23}Z`
            : decorations === 'spikes'
              ? `M${x} ${y}L${x + s} ${y - s * 1.5} ${x + s} ${y + 15}Z`
              : decorations === 'feathers'
                ? `M${x} ${y}Q${x + s * 2} ${y - 5} ${x + s} ${y + 40}Q${x - 5} ${y + 18} ${x} ${y}Z`
                : decorations === 'bones'
                  ? `M${x} ${y}l${s} 15m-9-14l-5 8m9 5l-5 8`
                  : decorations === 'leaves'
                    ? `M${x} ${y}Q${x + s * 2} ${y - s} ${x + s} ${y + 22}Q${x - 8} ${y + 12} ${x} ${y}Z`
                    : `M${x} ${y}q-${s} -${s} 0 -${s}q${s} -${s} ${s} 0q${s} ${s} 0 ${s}q-${s} ${s} -${s} 0Z`;
      return decorations === 'bones' ? stroke(d, accent, 5) : shape(d, color);
    })}`;
  if (/three tails/.test(text))
    return html`${art}<g transform="rotate(-14 727 253)">${art}</g><g transform="rotate(14 727 253)">${art}</g>`;
  return html`<g data-hair-texture="${texture}" data-hair-length="${design.short ? 'short' : 'long'}">${art}</g>`;
}
