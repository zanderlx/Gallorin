// Updates never gate startup. Installation is explicit, after the game has saved.
export function configureUpdates({ autoUpdater, packaged, show, shutdown, log }) {
  let busy = false;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
  autoUpdater.on('error', error => log('Updater: ' + error.message));

  return async function check(manual = false) {
    if (!packaged) {
      if (manual) await show({ message: 'Updates are available in the installed desktop app.', type: 'info' });
      return;
    }
    if (busy) return;
    busy = true;
    let downloadRequested = false;
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.isUpdateAvailable && result.updateInfo.tag !== 'gallorin-v' + result.updateInfo.version) {
        log('Ignored update outside the Gallorin release series.');
        if (manual) await show({ type: 'info', message: 'No Gallorin update is available.' });
        return;
      }
      if (!result?.isUpdateAvailable) {
        if (manual) await show({ message: 'Gallorin is up to date.', type: 'info' });
        return;
      }
      const { response } = await show({
        type: 'info',
        message: 'A new version of Gallorin is available.',
        detail: 'Download version ' + result.updateInfo.version + '? Your horses and settings will be retained.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      });
      if (response !== 0) return;
      downloadRequested = true;
      await autoUpdater.downloadUpdate();
      const choice = await show({
        message: 'The update is ready.',
        detail: 'Restart to install it, or continue playing and install later.',
        buttons: ['Restart and Install', 'Later'],
        defaultId: 1,
        cancelId: 1
      });
      if (choice.response === 0) {
        await shutdown();
        autoUpdater.quitAndInstall(false, true);
      }
    } catch (error) {
      log('Update check failed: ' + error.message);
      if (manual || downloadRequested)
        await show({
          type: 'info',
          message: 'Could not check for updates.',
          detail: 'You can keep playing offline. Try again later.'
        });
    } finally {
      busy = false;
    }
  };
}
