import { bindTextButtonSounds } from '../public/button-sounds.js';
import { effectForEvent } from '../public/music-effects.js';
import { bindChangelog } from './changelog.js';
import { createAudioSettings } from '../public/audio-settings.js';
bindTextButtonSounds(document, async () => {
  const library = await window.desktopMenu.musicSettings();
  const track = library && effectForEvent(library, 'effect/button-click');
  const origin = new URLSearchParams(location.search).get('game');
  if (track && origin)
    await window.gallorinMusic.command({
      type: 'effect',
      eventId: 'effect/button-click',
      track: { ...track, url: origin + '/api/music/media/' + track.id }
    });
});
const mute = document.querySelector('#mute');
let preferences = await window.desktopMenu.audio();
function display() {
  mute.textContent = preferences.muted ? '♫ Music Off' : '♫ Music On';
  mute.title = preferences.muted ? 'Unmute music' : 'Mute music';
}
display();
mute.onclick = async () => {
  preferences = await window.desktopMenu.setAudio({ ...preferences, muted: !preferences.muted });
  display();
};
const settings = createAudioSettings({
  id: 'audio-settings',
  getState: () => window.desktopMenu.audio(),
  saveState: async value => {
    preferences = await window.desktopMenu.setAudio(value);
    display();
    return preferences;
  },
  getMusic: () => window.desktopMenu.musicSettings(),
  saveFade: value => window.desktopMenu.setCrossfade(value)
});
document.querySelector('#settings').onclick = () => settings.open();

document.querySelector('#play').onclick = async () => {
  document.querySelector('#play').disabled = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced)
    await document.body.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 420,
      easing: 'cubic-bezier(0.4,0,0.6,1)',
      fill: 'forwards'
    }).finished;
  location.href = new URLSearchParams(location.search).get('game');
};
document.querySelector('#exit').onclick = () => window.desktopMenu.exit();
bindChangelog();
window.desktopMenu.version().then(version => {
  if (version) document.querySelector('#version').textContent = 'Gallorin v' + version;
});

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const cover = document.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;background:#1d1b18;z-index:2147483647;pointer-events:none';
  document.documentElement.append(cover);
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 350));
  await cover.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 1100,
    easing: 'cubic-bezier(0.4,0,0.2,1)',
    fill: 'forwards'
  }).finished;
  cover.remove();
}
