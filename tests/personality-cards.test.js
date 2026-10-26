import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalityCard, togglePersonalities } from '../public/personalities-manager.js';
function fixture() {
  const cards = Array.from({ length: 3 }, (_, index) => {
    const body = { hidden: true };
    const attributes = { 'aria-expanded': 'false' };
    const toggle = {
      dataset: { action: 'toggle-personality', name: `Name ${index}` },
      setAttribute: (key, value) => (attributes[key] = value),
      getAttribute: key => attributes[key]
    };
    const card = { querySelector: selector => (selector === '.personality-card-body' ? body : toggle) };
    toggle.closest = () => card;
    return { card, body, toggle };
  });
  const control = { dataset: { action: 'toggle-all-personalities' }, setAttribute() {}, textContent: 'Show All' };
  const root = { querySelectorAll: () => cards.map(value => value.card), querySelector: () => control };
  return { cards, control, root };
}
test('personality cards start collapsed with accessible controls and bottom editing', () => {
  const html = personalityCard({ id: 'calm', name: 'Calm', description: 'Calm description' });
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /id="personality-body-calm" hidden/);
  assert.match(html, /personality-card-actions/);
  assert.match(html, /Calm description/);
  assert.doesNotMatch(html, /personality-description-heading/);
});
test('individual personality toggles and Show All / Hide All handle mixed states', () => {
  const { cards, control, root } = fixture();
  togglePersonalities(root, cards[0].toggle);
  assert.equal(cards[0].body.hidden, false);
  assert.equal(cards[1].body.hidden, true);
  assert.equal(control.textContent, 'Show All');
  togglePersonalities(root, control);
  assert.ok(cards.every(card => !card.body.hidden));
  assert.equal(control.textContent, 'Hide All');
  togglePersonalities(root, cards[1].toggle);
  assert.equal(cards[1].body.hidden, true);
  assert.equal(control.textContent, 'Show All');
  togglePersonalities(root, control);
  togglePersonalities(root, control);
  assert.ok(cards.every(card => card.body.hidden));
  assert.equal(control.textContent, 'Show All');
});
