// Mix toward white or black within the configured limit; preserve the base hue.
export function varyPalette(palette, rng, percent = 25) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    throw new Error('Color variation must be between 0 and 100%.');
  const strength = percent / 100;
  const result = structuredClone(palette);
  const tone = (rng() - 0.5) * strength * 1.2;
  result.colors = Object.fromEntries(
    Object.entries(palette.colors).map(([region, hex]) => {
      const shift = Math.max(-strength, Math.min(strength, tone + (rng() - 0.5) * strength * 0.8));
      const channels = hex
        .slice(1)
        .match(/../g)
        .map(part => parseInt(part, 16));
      const varied = channels.map(channel => Math.round(channel + (shift >= 0 ? 255 - channel : channel) * shift));
      return [
        region,
        '#' +
          varied
            .map(channel => channel.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
      ];
    })
  );
  result.colorVariation = { baseColors: structuredClone(palette.colors) };
  return result;
}
