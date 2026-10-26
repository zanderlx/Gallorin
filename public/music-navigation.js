export async function revealPlayingSong(id) {
  if (!id) return false;
  if (location.hash !== '#dev/music') location.hash = 'dev/music';
  const deadline = performance.now() + 4000;
  let last,
    stableAt = 0;
  while (performance.now() < deadline) {
    const row = [...document.querySelectorAll('.music-library-table [data-music-track]')].find(
      row => row.dataset.musicTrack === id
    );
    if (row !== last) {
      last = row;
      stableAt = performance.now();
    }
    if (row && performance.now() - stableAt >= 140) {
      row.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
      row.tabIndex = -1;
      row.focus({ preventScroll: true });
      row.classList.add('music-song-target');
      setTimeout(() => row.classList.remove('music-song-target'), 1600);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return false;
}
