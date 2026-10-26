import js from '@eslint/js';
import globals from 'globals';

// HTML must be built through ui.js so interpolated values are escaped.
const htmlMessage = 'Build markup through public/ui.js helpers so interpolated values are escaped.';
const htmlSinks = [
  {
    selector: 'AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]',
    message: htmlMessage
  },
  { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: htmlMessage }
];

export default [
  { ignores: ['node_modules/', 'dist/', 'data/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } }
  },
  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_$' }]
    }
  },
  {
    // Page code, plus smoke helpers whose functions are serialized and run inside the page.
    files: [
      'public/**/*.js',
      'desktop/audio.js',
      'desktop/menu.js',
      'desktop/menu-preload.cjs',
      'desktop/changelog.js',
      'desktop/*-smoke.js',
      'scripts/check-*.cjs'
    ],
    languageOptions: { globals: { ...globals.browser } }
  },
  {
    // brandLogo() is serialized into generated files that define `master`.
    files: ['scripts/sync-logo.cjs'],
    languageOptions: { globals: { master: 'readonly' } }
  },
  {
    files: ['public/**/*.js', 'desktop/**/*.js', 'desktop/**/*.cjs'],
    ignores: ['public/ui.js'],
    rules: { 'no-restricted-syntax': ['error', ...htmlSinks] }
  }
];
