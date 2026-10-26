import { createChangelog } from '../public/changelog-ui.js';
export function bindChangelog() {
  const open = createChangelog({
    loadSource: () => window.desktopMenu.changelog(),
    getVersion: () => window.desktopMenu.version()
  });
  document.querySelector('#open-changelog').addEventListener('click', open);
}
