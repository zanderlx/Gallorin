export const ages = ['Adult', 'Elder', 'Foal'];
export const sizes = {
  Mammoth: 125,
  Draft: 120,
  Giant: 115,
  Huge: 110,
  Big: 105,
  Normal: 100,
  Little: 95,
  Small: 90,
  Tiny: 85,
  Teeny: 80,
  Teacup: 75
};
export const horseRecords = state => [...state.horses, ...state.sold, ...Object.values(state.encounters).flat()];
export const origins = state =>
  [
    ...new Set([
      'Wild',
      ...horseRecords(state)
        .map(h => h.origin)
        .filter(Boolean)
    ])
  ].sort((a, b) => a.localeCompare(b));
export function validateHorseName(name) {
  if (typeof name !== 'string' || name.trim().length > 60) throw new Error('Names must be 60 characters or fewer.');
  return name.trim();
}
export function horseFieldOptions(field, catalog, state) {
  if (field === 'gender')
    return [
      { value: 'Male', label: '♂ Male' },
      { value: 'Female', label: '♀ Female' }
    ];
  const options =
    field === 'age' ? ages : field === 'size' ? Object.keys(sizes) : field === 'origin' ? origins(state) : null;
  return options
    ? options
        .map(name => ({ value: name, label: name }))
        .sort((a, b) => (field === 'size' ? sizes[a.value] - sizes[b.value] : a.label.localeCompare(b.label)))
    : ['personality', 'eye'].includes(field)
      ? catalog[field === 'eye' ? 'eyes' : 'personalities']
          .map(item => ({ value: item.id, label: item.name }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : [];
}
export function updateHorseField(horse, field, value, catalog, state) {
  if (field === 'birthday') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid birthday.');
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value ||
      value > new Date().toISOString().slice(0, 10) ||
      value < '0001-01-01'
    )
      throw new Error('Birthday must be a real date, no later than today.');
    horse.birthday = value;
    if (horse.caughtAt) horse.caughtAt = new Date(`${value}T12:00:00`).toISOString();
    return;
  }
  if (!horseFieldOptions(field, catalog, state).some(option => option.value === value))
    throw new Error('Choose an available option.');
  if (field === 'personality' || field === 'eye')
    horse[field] = structuredClone(catalog[field === 'eye' ? 'eyes' : 'personalities'].find(item => item.id === value));
  else {
    horse[field] = value;
    if (field === 'size') horse.sizePercent = sizes[value];
  }
}
