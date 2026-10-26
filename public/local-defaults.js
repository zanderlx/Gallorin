// Local values are overrides. Missing/undefined fields inherit defaults;
// explicit false, zero, null and empty arrays remain intentional local values.
export function withLocalDefaults(defaults, local) {
  if (local === undefined) return structuredClone(defaults);
  if (!isRecord(defaults) || !isRecord(local)) return structuredClone(local);
  return Object.fromEntries(
    [...new Set([...Object.keys(defaults), ...Object.keys(local)])].map(key => [
      key,
      withLocalDefaults(defaults[key], local[key])
    ])
  );
}
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
