const darkPresets = {
  'pastel-peach': [
    '#261b17',
    '#35251e',
    '#2e201a',
    '#2a1d18',
    '#76533f',
    '#f1c4a3',
    '#d5ac8d',
    '#fff0e4',
    '#d9bcaa',
    '#87492e',
    '#b9d9b7'
  ],
  'pastel-lemon': [
    '#242117',
    '#312c1d',
    '#292619',
    '#272318',
    '#726441',
    '#e8d59b',
    '#cebd87',
    '#faf5e4',
    '#d1c7a9',
    '#75601e',
    '#bbd9af'
  ],
  'pastel-aqua': [
    '#142526',
    '#1d3335',
    '#192c2e',
    '#17292b',
    '#426e70',
    '#a5dedc',
    '#91c9c9',
    '#e6f8f5',
    '#adcecd',
    '#28686b',
    '#b6d9ba'
  ],
  'pastel-slate': [
    '#1d202b',
    '#282d3b',
    '#222735',
    '#202431',
    '#56617a',
    '#c5cde8',
    '#adb8d5',
    '#eef0fa',
    '#bdc5d9',
    '#505c83',
    '#b7d8c1'
  ],
  'pastel-rose': [
    '#211a20',
    '#30232d',
    '#281f27',
    '#241b23',
    '#69505f',
    '#efb9d1',
    '#d9a3bd',
    '#fae9f1',
    '#d2b8c6',
    '#8a4965',
    '#b6d9bc'
  ],
  'pastel-lavender': [
    '#1c1927',
    '#292336',
    '#231e30',
    '#201b2e',
    '#5b4d73',
    '#d6b9f4',
    '#bba7d5',
    '#f1eafa',
    '#c5b9d7',
    '#74518d',
    '#b6d9bd'
  ],
  'pastel-mint': [
    '#17231f',
    '#22332b',
    '#1d2c25',
    '#1a2822',
    '#496c59',
    '#b2dfc5',
    '#a1c8b2',
    '#eaf6ee',
    '#b6cfc0',
    '#3c705b',
    '#b5deaf'
  ],
  'pastel-sky': [
    '#191f2b',
    '#232e3e',
    '#1e2736',
    '#1c2533',
    '#4d6180',
    '#b7d4f8',
    '#a2bedf',
    '#eaf1fc',
    '#bacbdf',
    '#4d6591',
    '#b5d8bd'
  ]
};
const keys = [
  'bg',
  'panel',
  'panel-deep',
  'sidebar',
  'border',
  'gold',
  'gold-soft',
  'text',
  'muted',
  'burgundy',
  'green'
];
const mix = (hex, target, ratio) =>
  '#' +
  hex
    .slice(1)
    .match(/../g)
    .map((v, i) =>
      Math.round(parseInt(v, 16) * (1 - ratio) + parseInt(target.slice(1).match(/../g)[i], 16) * ratio)
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
export function colorsForMode(theme, mode = 'dark') {
  if (mode === 'dark' && theme.id === 'default') return { ...theme.colors };
  const explicit = mode === 'dark' ? theme.darkColors : theme.lightColors;
  if (explicit) return { ...explicit };
  if (theme.scheme === mode) return { ...theme.colors };
  if (mode === 'dark' && darkPresets[theme.id])
    return Object.fromEntries(keys.map((key, i) => [key, darkPresets[theme.id][i]]));
  const c = theme.colors;
  if (mode === 'dark')
    return {
      bg: mix(c.bg, '#101018', 0.9),
      panel: mix(c.panel, '#191923', 0.85),
      'panel-deep': mix(c['panel-deep'], '#111119', 0.88),
      sidebar: mix(c.sidebar, '#111119', 0.9),
      border: mix(c.border, '#222232', 0.6),
      gold: mix(c.gold, '#ffffff', 0.65),
      'gold-soft': mix(c['gold-soft'], '#ffffff', 0.6),
      text: '#f2edf6',
      muted: '#c9bfd3',
      burgundy: c.burgundy,
      green: '#b7d9bf'
    };
  return {
    bg: mix(c.bg, '#ffffff', 0.94),
    panel: mix(c.panel, '#ffffff', 0.97),
    'panel-deep': mix(c['panel-deep'], '#ffffff', 0.88),
    sidebar: mix(c.sidebar, '#ffffff', 0.86),
    border: mix(c.border, '#ffffff', 0.6),
    gold: mix(c.gold, '#151522', 0.65),
    'gold-soft': mix(c['gold-soft'], '#151522', 0.6),
    text: '#302a39',
    muted: '#655b70',
    burgundy: c.burgundy,
    green: '#365d43'
  };
}
