export function lockedCosmicLabel(horse) {
  const names = ['Solar', 'Lunar', 'Heavenly', 'Void', 'Astral'];
  return (
    names.find(name => name.toLowerCase() === String(horse.specialSpawn || '').toLowerCase()) ||
    names.find(name =>
      (horse.mutations || []).some(
        m => name.toLowerCase() === String(typeof m === 'string' ? m : m?.name).toLowerCase()
      )
    ) ||
    ''
  );
}
