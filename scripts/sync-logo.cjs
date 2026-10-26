// public/assets/crest.svg is the editable master; generated copies stay in sync.
const fs = require('node:fs');
const path = require('node:path');
function brandLogo(id = 'sidebar', size = 43, className = 'brand-logo') {
  if (!/^[a-z0-9-]+$/i.test(id) || !/^[a-z0-9-]+$/i.test(className) || !Number.isFinite(size) || size <= 0)
    throw Error('Invalid logo options.');
  return master
    .replace(/id="([^"]+)"/g, (_, key) => 'id="' + id + '-' + key + '"')
    .replace(/url\(#([^)]+)\)/g, (_, key) => 'url(#' + id + '-' + key + ')')
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, (_, attr, key) => attr + '="#' + id + '-' + key + '"')
    .replace(/#D2B477/gi, 'var(--gold,#D2B477)')
    .replace(/#826935/gi, 'var(--gold-soft,#826935)')
    .replace(/#211D1A/gi, 'var(--panel-deep,#211D1A)')
    .replace(/#423A34/gi, 'var(--border,#423A34)')
    .replace(/width="200" height="200"/, 'width="' + size + '" height="' + size + '"')
    .replace('<svg ', '<svg class="' + className + '" aria-hidden="true" ');
}
function syncLogo() {
  const root = path.resolve(__dirname, '..');
  const svg = fs.readFileSync(path.join(root, 'public/assets/crest.svg'), 'utf8').trim();
  if (!svg.startsWith('<svg ') || !svg.includes('viewBox='))
    throw Error('The master logo needs an SVG root and viewBox.');
  if (/<(script|foreignObject|image|iframe|object|embed|text)\b|\son[a-z]+\s*=|(?:href)\s*=\s*["'](?!#)/i.test(svg))
    throw Error('Use self-contained vector paths without scripts, external links, or unoutlined text.');
  fs.writeFileSync(path.join(root, 'desktop/assets/logo.svg'), svg + '\n');
  fs.writeFileSync(
    path.join(root, 'public/brand-logo.js'),
    '// Generated from public/assets/crest.svg by scripts/sync-logo.cjs.\nconst master=' +
      JSON.stringify(svg) +
      ';\nexport ' +
      brandLogo.toString() +
      '\n'
  );
  const banner = path.join(root, 'docs/assets/gallorin-banner.svg');
  let text = fs.readFileSync(banner, 'utf8');
  const nested = svg
    .replace('<svg ', '<svg x="76" y="74" ')
    .replace('width="200" height="200"', 'width="180" height="180"');
  const replacement = '<!-- gallorin-logo:start -->' + nested + '<!-- gallorin-logo:end -->';
  text = text.includes('<!-- gallorin-logo:start -->')
    ? text.replace(/<!-- gallorin-logo:start -->[\s\S]*?<!-- gallorin-logo:end -->/, () => replacement)
    : text.replace(/<g transform="translate\(76 75\) scale\(2\.1\)">[\s\S]*?<\/g>/, () => replacement);
  fs.writeFileSync(banner, text);
  return svg;
}
module.exports = { syncLogo };
if (require.main === module) syncLogo();
