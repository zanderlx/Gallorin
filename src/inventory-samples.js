export function withInventorySamples(state, rng = Math.random) {
  const next = structuredClone(state);
  if (next.inventorySamplesGranted) return next;
  next.inventory ??= [];
  const samples = [
    { id: 'lasso', name: 'Lassos', type: 'gear', count: 5 },
    ...[
      ['apple', 'Apples'],
      ['carrot', 'Carrots'],
      ['flower', 'Flowers'],
      ['berry', 'Berries'],
      ['peach', 'Peaches']
    ].map(([id, name]) => ({ id, name, type: 'food', count: 1 + Math.floor(rng() * 25) }))
  ];
  for (const sample of samples) {
    const existing = next.inventory.find(item => item?.id === sample.id && item.type === sample.type);
    if (existing) existing.count += sample.count;
    else next.inventory.push(sample);
  }
  next.inventorySamplesGranted = true;
  return next;
}
