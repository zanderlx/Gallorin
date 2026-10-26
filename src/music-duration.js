import { parseBuffer, parseFile } from 'music-metadata';
const seconds = metadata =>
  Number.isFinite(metadata.format.duration) && metadata.format.duration >= 0 ? metadata.format.duration : null;
export async function durationOfFile(file) {
  try {
    return seconds(await parseFile(file, { duration: true, skipCovers: true }));
  } catch {
    return null;
  }
}
export async function durationOfBuffer(bytes) {
  try {
    return seconds(await parseBuffer(bytes, { mimeType: 'audio/mpeg' }, { duration: true, skipCovers: true }));
  } catch {
    return null;
  }
}
