export function displayBirthday(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? `${match[2]}-${match[3]}-${match[1]}` : value || 'Unknown';
}
export function localCalendarDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function horseAcquisitionDate(horse) {
  return horse.caughtAt ? localCalendarDate(horse.caughtAt) : null;
}
export function horseDaysOwned(horse, now = new Date()) {
  const start = horseAcquisitionDate(horse);
  const end = localCalendarDate(now);
  if (!start || !end) return null;
  // Compare calendar days so daylight-saving changes do not shift the day count.
  return Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
}
export function horseAgeLabel(horse, now = new Date()) {
  const days = horseDaysOwned(horse, now);
  return days === null ? 'Not caught yet' : `${days} ${days === 1 ? 'day' : 'days'}`;
}
