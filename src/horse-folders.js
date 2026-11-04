import { folderHorseIds } from '../public/horse-folder-order.js';

// One atomic save moves membership and order together.
export function moveHorseInFolders(state, payload) {
  const { id, fromFolder, toFolder, targetId, placement = 'before' } = payload;
  const horse = state.horses.find(h => h.id === id);
  if (!horse) throw new Error('Horse not found in your stable.');
  const folders = state.horseFolders || [];
  const validFolder = id => ['favorites', 'unfiled'].includes(id) || folders.some(folder => folder.id === id);
  if (!validFolder(fromFolder) || !validFolder(toFolder)) throw new Error('Folder not found.');
  if (!folderHorseIds(state, fromFolder).includes(id)) throw new Error('This horse is no longer in its source folder.');
  const destination = folderHorseIds(state, toFolder);
  if (targetId != null && !destination.includes(targetId)) throw new Error('The drop position is no longer available.');
  if (!['before', 'after'].includes(placement)) throw new Error('Choose a valid drop position.');
  if (fromFolder === toFolder && targetId === id) return;
  const writeOrder = (folderId, ids) => {
    const folder = folders.find(folder => folder.id === folderId);
    if (folder) folder.horseIds = ids;
    else (state.horseFolderOrder ??= {})[folderId] = ids;
  };
  if (fromFolder !== toFolder) {
    writeOrder(
      fromFolder,
      folderHorseIds(state, fromFolder).filter(horseId => horseId !== id)
    );
    if (fromFolder === 'favorites') horse.favorite = false;
    if (toFolder === 'favorites') horse.favorite = true;
    if (toFolder === 'unfiled') {
      horse.favorite = false;
      for (const folder of folders) folder.horseIds = folder.horseIds.filter(horseId => horseId !== id);
    }
  }
  if (targetId === id) {
    writeOrder(toFolder, destination);
    return;
  }
  const ordered = destination.filter(horseId => horseId !== id);
  const index = targetId == null ? ordered.length : ordered.indexOf(targetId) + (placement === 'after' ? 1 : 0);
  ordered.splice(index, 0, id);
  writeOrder(toFolder, ordered);
}
