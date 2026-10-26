// Horse schema versions are independent of app releases and JSON transfer format versions.
// Add sequential migrations here when a future record shape changes.
export const horseSchemaVersion = 1;
export const horseGenerationVersion = 1;
export function readHorseVersion(horse) {
  const schemaVersion = horse.schemaVersion ?? 1;
  const revision = horse.revision ?? 1;
  const generationVersion = horse.generationVersion ?? 1;
  for (const [name, value] of Object.entries({ schemaVersion, revision, generationVersion })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid horse ' + name + '.');
  }
  if (schemaVersion > horseSchemaVersion || generationVersion > horseGenerationVersion)
    throw new Error('This horse needs a newer version of Gallorin.');
  const result = { schemaVersion, revision, generationVersion };
  if (horse.updatedAt !== undefined) {
    if (typeof horse.updatedAt !== 'string' || !Number.isFinite(Date.parse(horse.updatedAt)))
      throw new Error('Invalid horse update timestamp.');
    result.updatedAt = horse.updatedAt;
  }
  if (horse.lastRegeneratedAt !== undefined) {
    if (typeof horse.lastRegeneratedAt !== 'string' || !Number.isFinite(Date.parse(horse.lastRegeneratedAt)))
      throw new Error('Invalid horse regeneration timestamp.');
    result.lastRegeneratedAt = horse.lastRegeneratedAt;
  }
  return result;
}
export function migrateHorseVersion(horse) {
  const metadata = readHorseVersion(horse);
  const changed = Object.entries(metadata).some(([key, value]) => horse[key] !== value);
  Object.assign(horse, metadata);
  return changed;
}
