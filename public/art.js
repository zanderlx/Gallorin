// Original, deliberately stylized placeholder artwork. Species anatomy is not simulated.
export function horseHeadArt(horse, large = false) {
  return horseArt(horse, large).replace('viewBox="0 0 460 310"', 'viewBox="240 25 135 145"');
}
export function horseArt(horse, large = false) {
  const palette = horse.palette.colors;
  const coat = palette['Coat Top'];
  const bottom = palette['Coat Bottom'];
  const hair = palette.Hair;
  const eye = horse.eye.colors[0];
  const uid = `h${horse.id.replaceAll('-', '')}${large ? 'l' : ''}`;
  const horn = horse.species === 'Unicorn';
  return `<svg class="horse-art" viewBox="0 0 460 310" role="img" aria-label="Decorative horse illustration; placeholder artwork">
  <defs>
    <radialGradient id="${uid}bg"><stop stop-color="${coat}" stop-opacity=".22"/><stop offset="1" stop-color="#181d1b"/></radialGradient>
    <linearGradient id="${uid}coat" x1=".2" x2=".8" y2="1"><stop stop-color="${coat}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <linearGradient id="${uid}mane" x2="1" y2="1"><stop stop-color="${hair}"/><stop offset="1" stop-color="#282128"/></linearGradient>
  </defs>
  <rect width="460" height="310" fill="#1a211f"/><rect width="460" height="310" fill="url(#${uid}bg)"/>
  <circle cx="245" cy="135" r="98" fill="none" stroke="${coat}" stroke-opacity=".12"/>
  <circle cx="245" cy="135" r="110" fill="none" stroke="${coat}" stroke-opacity=".08"/>
  <path d="M0 250Q130 214 230 248t230-2v64H0Z" fill="#131b17" opacity=".55"/>
  <g stroke="${coat}" stroke-opacity=".14" fill="none"><path d="m30 275 10-110 7 110m-9-75-17-22m19 38 23-25m341 84-6-140m2 55 21-25m-20-3-13-24M75 290l3-57m302 57 9-61"/><path d="m34 160 6-10 7 10m345-25 6-10 6 10"/></g>
  <ellipse cx="234" cy="275" rx="120" ry="12" fill="#0b1210" opacity=".6"/>
  <g transform="translate(16 1)">
  <path d="M161 153c-49-13-62 38-79 57-12 13-19 14-32 12 22 21 58 10 73-9 11-15 9-35 38-35Z" fill="url(#${uid}mane)"/>
  <path d="m158 185 15 20-17 35 4 30-13 3-7-37 12-33-13-24m89 5 23 15 14 66-13 5-20-55-27-25" fill="${bottom}" stroke="#211d19" stroke-opacity=".22" stroke-width="2"/>
  <path d="M140 153c16-19 65-12 87-10 22 1 31-11 37-35l13-39 30 3c-15 33 5 56-4 87-5 18-18 33-40 39-24 5-48-6-66-1-9 14-15 26-24 40l-5 30-12 1-1-35 14-41c-33-4-41-24-29-39Z" fill="url(#${uid}coat)" stroke="#221c18" stroke-opacity=".3" stroke-width="1.5"/>
  <path d="M267 168q19 11 12 33l-3 31 14 30-11 6-19-30 1-28-10-22" fill="url(#${uid}coat)" stroke="#221c18" stroke-opacity=".22" stroke-width="1.5"/>
  <path d="m156 265 12-1 1 8-15 1zm122-3 12-3 6 10-16 2zm-26 2 12-3 3 10-14 1zm-106 2 13-2 4 8-15 2z" fill="${palette.Hoof}"/>
  <path d="M268 120c-10 1-15 9-19 23 0-32 11-52 27-69 6-11 14-15 26-11 18 7 23 23 19 41-7-5-12-12-13-22-12 6-8 24-17 32-7 6-18 7-23 6Z" fill="url(#${uid}mane)"/>
  <path d="m287 70-5-26c7 2 14 13 15 22l9-21 5 30c10 10 11 18 8 28l13 16c2 8-6 15-14 11l-25-18-14-16Z" fill="url(#${uid}coat)" stroke="#211a19" stroke-opacity=".25" stroke-width="1.5"/>
  <path d="m287 50 4 15m16-12-3 14" fill="none" stroke="${bottom}" stroke-width="3"/>
  <path d="m319 110 13 9c3 6-3 14-10 12l-10-6Z" fill="${palette.Nose}" opacity=".55"/>
  <path d="M298 87q6-3 10 2" stroke="#2e2720" fill="none" stroke-width="2"/><ellipse cx="303" cy="90" rx="3" ry="2.5" fill="${eye}"/><circle cx="304" cy="89" r="1" fill="#fff"/><path d="m325 120 2 1" stroke="#352a22" stroke-width="3" stroke-linecap="round"/>
  <path d="M150 157q16-10 39-5m37 6q27-2 39-25m-101 50q9 7 17 3" stroke="${coat}" stroke-opacity=".5" fill="none" stroke-width="3" stroke-linecap="round"/>
  <path d="M274 83q-11 27-13 39m17-24-8 28m-115 32c-28-1-24 39-49 55" fill="none" stroke="${coat}" stroke-opacity=".25" stroke-width="2"/>
  ${horn ? `<path d="m314 82 24-39-15 47Z" fill="${palette.Keratin}"/><path d="m323 68 6 4m-10 3 7 5" stroke="${hair}" stroke-width="1.5"/>` : ''}
  </g>
  <g fill="${coat}" opacity=".6"><path d="m101 91 2-6 2 6 6 2-6 2-2 6-2-6-6-2Zm260 62 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z"/><circle cx="155" cy="88" r="1.4"/><circle cx="347" cy="225" r="1.5"/><circle cx="109" cy="166" r="1"/><circle cx="239" cy="51" r="1.5"/></g>
  </svg>`;
}
