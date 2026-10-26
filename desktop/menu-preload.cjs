const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gallorinMusic', {
  state: () => ipcRenderer.invoke('music-state'),
  command: value => ipcRenderer.invoke('music-command', value)
});
contextBridge.exposeInMainWorld('desktopMenu', {
  exit: () => ipcRenderer.send('menu-exit'),
  version: () => ipcRenderer.invoke('desktop-version'),
  changelog: () => ipcRenderer.invoke('desktop-changelog'),
  audio: () => ipcRenderer.invoke('audio-state'),
  setAudio: value => ipcRenderer.invoke('audio-set', value),
  musicSettings: () => ipcRenderer.invoke('music-settings'),
  setCrossfade: value => ipcRenderer.invoke('music-fade', value)
});
ipcRenderer.on('desktop-pause', () => {
  const songDialog = document.querySelector('.music-song-dialog[open],.music-delete-dialog[open]');
  if (songDialog) {
    songDialog.close();
    return;
  }
  if (document.querySelector('.music-options-menu')) {
    document.dispatchEvent(new Event('gallorin-close-song-menu'));
    return;
  }
  if (document.querySelector('.music-editing')) {
    document.dispatchEvent(new Event('gallorin-finish-song-edit'));
    return;
  }
  const changelog = document.querySelector('#changelog-dialog');
  if (changelog?.open) {
    changelog.close();
    return;
  }
  const audioDialog = document.querySelector('#desktop-audio');
  if (audioDialog?.open) {
    audioDialog.close();
    return;
  }
  let modal = document.querySelector('#desktop-pause');
  if (modal?.open) {
    modal.close();
    return;
  }
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'desktop-pause';
    modal.setAttribute('aria-label', 'Gallorin menu');
    modal.tabIndex = -1;
    Object.assign(modal.style, {
      background: '#28231f',
      color: '#eee5d6',
      border: '1px solid #a58a5d',
      borderRadius: '12px',
      padding: '32px',
      width: 'min(380px,90vw)',
      boxShadow: '0 24px 90px #0009'
    });
    const style = document.createElement('style');
    style.textContent =
      '#desktop-pause::backdrop{background:#100e0bbb;backdrop-filter:blur(5px)}#desktop-pause h2{text-align:center;color:var(--gold,#d2b477);font:30px Georgia,serif;margin:0 0 26px}#desktop-pause .pause-actions{display:grid;gap:12px}#desktop-pause button{padding:12px 20px;border:1px solid #675744;border-radius:5px;background:#211d1a;color:#eee5d6;font:16px "Segoe UI",sans-serif;cursor:pointer;transition:filter .18s ease}#desktop-pause button:hover:not(:disabled){filter:brightness(.85)}#desktop-pause button:focus,#desktop-pause:focus{outline:none}';
    modal.append(style);
    const branding = document.createElement('div');
    branding.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;margin-bottom:26px';
    const logo = document.createElement('span');
    logo.style.cssText = 'display:block;width:72px;height:72px';
    ipcRenderer
      .invoke('desktop-logo')
      .then(markup => {
        // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
        logo.innerHTML = markup;
      })
      .catch(() => {});
    const title = document.createElement('h2');
    title.textContent = 'GALLORIN';
    title.style.cssText = 'margin:0;letter-spacing:4px;font-size:27px;padding-left:4px';
    branding.append(logo, title);
    modal.append(branding);
    const actions = document.createElement('div');
    actions.className = 'pause-actions';
    for (const [label, action] of [
      ['Back To Game', () => modal.close()],
      ['Settings', () => showAudioSettings()],
      [
        'Main Menu',
        async () => {
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
            await document.body.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 420,
              easing: 'cubic-bezier(0.4,0,0.6,1)',
              fill: 'forwards'
            }).finished;
          ipcRenderer.send('pause-main-menu');
        }
      ],
      ['Exit Game', () => ipcRenderer.send('pause-exit')]
    ]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.onclick = action;
      actions.append(button);
    }
    modal.append(actions);
    document.body.append(modal);
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        const r = modal.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
          modal.close();
      }
    });
  }
  modal.style.background = 'var(--panel,#28231f)';
  modal.style.color = 'var(--text,#eee5d6)';
  modal.style.borderColor = 'var(--gold-soft,#a58a5d)';
  modal.querySelectorAll('button').forEach(button => {
    button.style.background = 'var(--panel-deep,#211d1a)';
    button.style.color = 'var(--text,#eee5d6)';
    button.style.borderColor = 'var(--border,#675744)';
  });
  modal.showModal();
  // Keep opening the menu from automatically highlighting its first action.
  modal.focus({ preventScroll: true });
});

function showAudioSettings() {
  document.dispatchEvent(new Event('gallorin-audio-settings'));
}
window.addEventListener('DOMContentLoaded', async () => {
  if (location.protocol === 'file:') return;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cover = document.createElement('div');
    cover.style.cssText = 'position:fixed;inset:0;background:#1d1b18;z-index:2147483647;pointer-events:none';
    document.documentElement.append(cover);
    const reveal = async () => {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 350));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await cover.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 1100,
        easing: 'cubic-bezier(0.4,0,0.2,1)',
        fill: 'forwards'
      }).finished;
      cover.remove();
    };
    if (document.querySelector('.brand')) void reveal();
    else {
      const observer = new MutationObserver(() => {
        if (document.querySelector('.brand')) {
          observer.disconnect();
          clearTimeout(fallback);
          void reveal();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const fallback = setTimeout(() => {
        observer.disconnect();
        void reveal();
      }, 5000);
    }
  }
  // The full-width game player owns in-game playback controls.
});
