export const horseTraitLimits = {
  Mane: 1,
  Tail: 1,
  Pattern: 4,
  Paint: 2,
  Cosmetic: 4,
  Keratin: 1,
  Ears: 1,
  Whiskers: 1
};
export const horseColorRegions = [
  'Coat Top',
  'Coat Bottom',
  'Hair',
  'Hoof',
  'Nose',
  'Sock',
  'Keratin',
  'Paint',
  'Pattern'
];
export const horseUpdateFields = [
  { key: 'species', label: 'Species', group: 'Identity', modes: ['keep', 'set', 'reroll'] },
  { key: 'name', label: 'Name', group: 'Identity', modes: ['keep', 'set'], type: 'text' },
  { key: 'gender', label: 'Gender', group: 'Identity', modes: ['keep', 'set', 'reroll'] },
  { key: 'age', label: 'Life Stage (legacy)', group: 'Identity', modes: ['keep', 'set'] },
  { key: 'birthday', label: 'Acquisition Date / Birthday', group: 'Identity', modes: ['keep', 'set'], type: 'date' },
  { key: 'daysOwned', label: 'Age in Days', group: 'Identity', modes: ['keep', 'set'], type: 'number' },
  { key: 'origin', label: 'Origin', group: 'Identity', modes: ['keep', 'set'], type: 'text' },
  { key: 'size', label: 'Size', group: 'Identity', modes: ['keep', 'set', 'reroll'] },
  { key: 'personality', label: 'Personality', group: 'Personality & Notes', modes: ['keep', 'set', 'reroll'] },
  {
    key: 'description',
    label: 'Description',
    group: 'Personality & Notes',
    modes: ['keep', 'set', 'refresh'],
    type: 'text'
  },
  { key: 'notes', label: 'Notes', group: 'Personality & Notes', modes: ['keep', 'set', 'clear'], type: 'text' },
  { key: 'favorite', label: 'Favorite', group: 'Identity', modes: ['keep', 'set'] },
  { key: 'palette', label: 'Palette', group: 'Appearance', modes: ['keep', 'set', 'reroll'] },
  { key: 'eye', label: 'Eye Color', group: 'Appearance', modes: ['keep', 'set', 'reroll'] },
  ...horseColorRegions.map(name => ({
    key: 'color:' + name,
    label: name,
    group: 'Palette Colors',
    modes: ['keep', 'set'],
    type: 'color'
  })),
  ...Object.keys(horseTraitLimits).map(name => ({
    key: 'trait:' + name,
    label: name,
    group: 'Species Traits',
    modes: ['keep', 'set', 'reroll', 'clear']
  })),
  { key: 'mutations', label: 'All Unlocked Mutations', group: 'Mutations', modes: ['keep', 'reroll'] },
  ...[0, 1, 2, 3].map(index => ({
    key: 'mutation:' + index,
    label: 'Mutation Slot ' + (index + 1),
    group: 'Mutations',
    modes: ['keep', 'set', 'reroll', 'clear']
  })),
  ...['agility', 'strength', 'jump', 'bond', 'wing'].map(name => ({
    key: 'skill:' + name,
    label: name[0].toUpperCase() + name.slice(1),
    group: 'Skills',
    modes: ['keep', 'set', 'reset'],
    type: 'skill'
  }))
];
