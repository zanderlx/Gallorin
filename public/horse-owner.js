export function originalHorseOwner(horse) {
  return horse.originalOwner?.name || 'Unknown';
}

export function horseOwner(horse) {
  return horse.owner || originalHorseOwner(horse);
}
