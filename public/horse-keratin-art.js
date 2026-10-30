import { html } from './ui.js';

const shape = (d, c) =>
  html`<path d="${d}" fill="${c}" stroke="#24241E" stroke-opacity=".25" stroke-width="1.5" stroke-linejoin="round"/>`;
const line = (d, c, w = 6) =>
  html`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export function keratinArt({ family, text, seed }, c, accent) {
  const small = /small|tiny|nub|teeny/.test(text),
    long = /long|tall|large|narwhal/.test(text);
  const length = small ? 30 : long ? 100 : 68;
  if (family === 'fangs') {
    const tusk = /tusk|orc/.test(text),
      saber = /saber|long/.test(text);
    return html`${[0, 1].map(i => shape(tusk ? `M${205 + i * 20} 268Q${183 + i * 20} 280 ${188 + i * 20} 248Q${196 + i * 20} 272 ${213 + i * 20} 266Z` : `M${200 + i * 20} 267Q${203 + i * 20} ${saber ? 315 : 291} ${210 + i * 20} ${saber ? 322 : 296}L${214 + i * 20} 266Z`, c))}`;
  }
  if (family === 'antlers') {
    const moose = /moos/.test(text),
      branches = /double|reindeer|four|bifurcat/.test(text) ? 5 : 3;
    return html`${[0, 1].map(
      side =>
        html`<g transform="translate(${side * 24} ${side * 7})">${moose ? shape('M274 180L246 147 212 119 217 92 232 112 238 81 249 105 260 74 269 108 278 98 278 135Z', c) : line(`M273 180Q239 140 251 ${180 - length - 32}`, c, small ? 4 : 7)}${Array.from(
          { length: branches },
          (_, i) => {
            const y = 147 - i * 16,
              x = 245 + (i % 2) * 5;
            return line(`M${x} ${y}l${i % 2 ? 24 : -25} -17l${i % 2 ? 5 : -4} -17`, c, 4);
          }
        )}</g>`
    )}`;
  }
  if (family === 'curled-horns') {
    if (/kudu|spiral/.test(text))
      return html`${line('M270 182C224 146 300 140 250 107S287 73 260 51', c, 9)}${line('M288 181C242 147 316 140 272 109', c, 6)}`;
    if (/ibex|goat/.test(text)) return shape('M267 182Q307 126 303 84Q334 142 286 190Z', c);
    return html`${line('M273 183C209 191 205 122 249 119S290 173 253 169Q234 166 239 145', c, small ? 8 : 14)}${line('M290 180Q322 140 300 121', c, 8)}`;
  }
  if (family === 'crown') {
    if (/helm/.test(text))
      return html`${shape('M249 189Q238 144 280 138Q316 141 313 185L288 201 291 170 271 165 268 194Z', c)}${line('M280 139V115', c, 5)}`;
    const height = /tiara|delicate/.test(text) ? 15 : /tall|queen/.test(text) ? 46 : 30;
    return html`${shape(`M260 175L251 ${170 - height} 273 159 285 ${153 - height} 296 160 319 ${171 - height} 312 182Z`, c)}${[267, 285, 303].map(x => shape(`M${x} 163l4 5-4 5-4-5Z`, accent))}`;
  }
  if (family === 'antennae')
    return html`${line('M274 180Q233 138 247 100M292 180Q334 141 323 102', c, 3)}${[247, 323].map(x => shape(`M${x} 103q-14-18 0-22q14 4 0 22Z`, accent))}`;
  if (family === 'pole')
    return /key/.test(text)
      ? html`${line('M530 320H585', c, 6)}${line('M575 320V339M584 320V334', c, 5)}<circle cx="517" cy="320" r="14" fill="none" stroke="${c}" stroke-width="5"/>`
      : html`${line('M515 120V520', c, 7)}${shape('M515 112l-11 25 11-6 11 6Z', accent)}`;
  if (family === 'crest')
    return shape(
      /nose/.test(text) ? 'M216 242Q191 209 211 197L235 228Z' : 'M268 183Q238 125 275 111Q308 116 315 169L296 184Z',
      c
    );
  const nose = /rhino|nose/.test(text),
    rootX = nose ? 220 : 263,
    rootY = nose ? 239 : 184;
  const curved = /curv|scythe|hook|revers|crook/.test(text),
    broken = /broken|shatter|splinter/.test(text);
  const horn = shape(
    broken
      ? `M${rootX - 7} ${rootY}L${rootX - 22} ${rootY - 42}l9 5 1-14 12 6 15 40Z`
      : curved
        ? `M${rootX - 7} ${rootY}Q${rootX - 61} ${rootY - length} ${rootX + 9} ${rootY - length}Q${rootX - 24} ${rootY - length + 20} ${rootX + 10} ${rootY - 4}Z`
        : `M${rootX - 8} ${rootY}Q${rootX - 27} ${rootY - 31} ${rootX - 45} ${rootY - length}Q${rootX - 9} ${rootY - 39} ${rootX + 10} ${rootY - 5}Z`,
    c
  );
  const count = /triple|trike/.test(text) ? 3 : /horns|double/.test(text) ? 2 : 1;
  return html`${Array.from({ length: count }, (_, i) => html`<g transform="translate(${i * 23} ${i * 3})">${horn}${/twist|narwhal|serrat|candy|crack/.test(text) ? line(`M${rootX - 23} ${rootY - 40}l15-4m-10 15l15-4`, accent, 2) : ''}</g>`)}${/flame|fire|candle/.test(text) ? shape(`M${rootX - 44} ${rootY - length + 5}q-18-15 0-33q18 20 0 33Z`, accent) : ''}`;
}
