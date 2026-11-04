// Full folder order, before search filters are applied. Older saves fall back to names.
export function folderHorseIds(state, folderId) {
  const folders = state.horseFolders || [];
  const assigned = new Set(folders.flatMap(folder => folder.horseIds));
  const folder = folders.find(folder => folder.id === folderId);
  const members = state.horses.filter(h =>
    folderId === 'favorites'
      ? h.favorite
      : folderId === 'unfiled'
        ? !h.favorite && !assigned.has(h.id)
        : folder?.horseIds.includes(h.id)
  );
  members.sort((a, b) => String(a.name || a.species).localeCompare(String(b.name || b.species)));
  const valid = new Set(members.map(h => h.id));
  return [
    ...new Set([...(folder?.horseIds || state.horseFolderOrder?.[folderId] || []), ...members.map(h => h.id)])
  ].filter(id => valid.has(id));
}
