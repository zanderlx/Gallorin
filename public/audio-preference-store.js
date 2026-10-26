import { audioPreferences } from './audio-preferences.js';
// Keep rapid UI changes optimistic and ordered; stale polling cannot overwrite them.
export function createAudioPreferenceStore({ initial, save, onChange = () => {} }) {
  let state = audioPreferences(initial),
    pending = 0,
    revision = 0,
    queue = Promise.resolve();
  const publish = () => {
    onChange({ ...state });
    return { ...state };
  };
  return {
    get: () => ({ ...state }),
    version: () => revision,
    sync(value, version = revision) {
      if (!pending && version === revision) {
        state = audioPreferences(value, state);
        publish();
      }
      return { ...state };
    },
    set(value) {
      state = audioPreferences(value, state);
      revision++;
      const snapshot = publish();
      pending++;
      const job = queue.then(() => save(snapshot, { ...value }));
      queue = job.catch(() => {});
      return job.finally(() => {
        pending--;
      });
    },
    flush: () => queue
  };
}
