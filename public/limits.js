// Size limits shared by the server, validators, and the messages players see.
export const limits = {
  actionBodyBytes: 1024 * 1024,
  musicJsonBytes: 64 * 1024,
  trackBytes: 50 * 1024 * 1024,
  horseFileBytes: 512 * 1024
};

/** Formats a byte limit for messages, e.g. 52428800 → "50 MB", 524288 → "512 KB". */
export const formatLimit = bytes => (bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MB` : `${bytes / 1024} KB`);
