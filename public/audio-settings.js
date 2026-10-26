import { audioPreferences } from './audio-preferences.js';
export function createAudioSettings({
  id = 'desktop-audio',
  getState,
  saveState,
  getMusic,
  saveFade,
  notify = () => {}
}) {
  const initial = audioPreferences();
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'audio-settings-dialog';
  dialog.setAttribute('aria-labelledby', id + '-title');
  dialog.innerHTML =
    '<header><h2 id="' +
    id +
    '-title">Audio Settings</h2><button type="button" class="audio-settings-close" aria-label="Close audio settings">×</button></header><div class="audio-settings-rows"><label><span>Music</span><input id="' +
    (id === 'audio-settings' ? 'volume' : 'game-music-volume') +
    '" data-audio-pref="volume" type="range" min="0" max="100" value="' +
    initial.volume +
    '" aria-label="Music"><output data-value="volume">' +
    initial.volume +
    '%</output></label><label><span>Sound Effects</span><input data-audio-pref="soundEffectsVolume" type="range" min="0" max="100" value="' +
    initial.soundEffectsVolume +
    '" aria-label="Sound Effects"><output data-value="soundEffectsVolume">' +
    initial.soundEffectsVolume +
    '%</output></label><label><span>Crossfade</span><input data-audio-fade type="range" min="0" max="10" step="1" value="2" aria-label="Crossfade seconds"><output data-fade-value>2 seconds</output></label></div><p class="audio-settings-error" role="status"></p>';
  document.body.append(dialog);
  let state = initial,
    fade = 2,
    revision = 0;
  const error = message => {
    dialog.querySelector('.audio-settings-error').textContent = message;
    notify(message, true);
  };
  const showFade = value => {
    dialog.querySelector('[data-fade-value]').textContent = value + (value === 1 ? ' second' : ' seconds');
    dialog
      .querySelector('[data-audio-fade]')
      .setAttribute('aria-valuetext', value + (value === 1 ? ' second' : ' seconds'));
  };
  const display = () => {
    for (const key of ['volume', 'soundEffectsVolume']) {
      dialog.querySelector('[data-audio-pref="' + key + '"]').value = state[key];
      dialog.querySelector('[data-value="' + key + '"]').textContent = state[key] + '%';
    }
    dialog.querySelector('[data-audio-fade]').value = fade;
    showFade(fade);
  };
  dialog.querySelector('.audio-settings-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
        dialog.close();
    }
  });
  dialog.querySelectorAll('[data-audio-pref]').forEach(input =>
    input.addEventListener('input', async () => {
      const key = input.dataset.audioPref,
        token = ++revision;
      state = { ...state, [key]: Number(input.value) };
      dialog.querySelector('[data-value="' + key + '"]').textContent = input.value + '%';
      try {
        const saved = await saveState(state);
        if (token === revision) state = audioPreferences(saved, state);
      } catch (e) {
        error(e.message);
      }
    })
  );
  dialog.querySelector('[data-audio-fade]').addEventListener('input', event => showFade(Number(event.target.value)));
  dialog.querySelector('[data-audio-fade]').addEventListener('change', async event => {
    const input = event.target,
      value = input.value.trim() === '' ? NaN : Number(input.value);
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      input.value = fade;
      showFade(fade);
      error('Crossfade must be between 0 and 10 seconds.');
      return;
    }
    if (value === fade) return;
    input.disabled = true;
    try {
      await saveFade(value);
      fade = value;
      dialog.querySelector('.audio-settings-error').textContent = '';
    } catch (e) {
      input.value = fade;
      showFade(fade);
      error(e.message);
    } finally {
      input.disabled = false;
    }
  });
  return {
    dialog,
    async open() {
      try {
        const [saved, music] = await Promise.all([getState(), getMusic()]);
        state = audioPreferences(saved);
        fade = Math.max(0, Math.min(10, Math.round(music.fadeSeconds)));
        if (fade !== music.fadeSeconds) await saveFade(fade);
        display();
        dialog.querySelector('.audio-settings-error').textContent = '';
        if (!dialog.open) dialog.showModal();
      } catch (e) {
        notify(e.message, true);
      }
    }
  };
}
