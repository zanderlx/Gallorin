import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emojiChoices, filterEmojiChoices } from '../public/emoji-picker.js';
import { mutationEmoji } from '../public/mutations-manager.js';
import { createDefinitionDocument, readDefinitionDocument } from '../public/definition-transfer.js';
test('emoji picker has broad searchable choices with category filters', () => {
  assert.ok(emojiChoices.length >= 304);
  assert.ok(filterEmojiChoices('peppermint').some(entry => entry.emoji === '🍭'));
  assert.ok(filterEmojiChoices('leg', 'Body Parts').some(entry => entry.emoji === '🦵'));
  assert.ok(filterEmojiChoices('arm', 'Body Parts').some(entry => entry.emoji === '💪'));
  assert.ok(filterEmojiChoices('lungs').some(entry => entry.emoji === '🫁'));
  assert.ok(filterEmojiChoices('jump', 'Animals').some(entry => entry.emoji === '🐰'));
  assert.equal(filterEmojiChoices('not-a-real-emoji-name').length, 0);
  assert.ok(filterEmojiChoices('', 'Nature').every(entry => entry.category === 'Nature'));
});
test('chosen mutation emojis override defaults and round-trip through imports', () => {
  const value = {
    name: 'Solar',
    type: 'Standard',
    description: 'Test',
    weight: 1,
    thresholds: {},
    sizeShift: 0,
    emoji: '🐴'
  };
  assert.equal(mutationEmoji(value), '🐴');
  const document = createDefinitionDocument('mutations', value);
  assert.equal(readDefinitionDocument('mutations', document, { mutations: [] }).emoji, '🐴');
  assert.equal(mutationEmoji({ ...value, name: 'Other mutation' }), '🐴');
});
test('the shared picker retains every previous Personality emoji option', async () => {
  const { personalityEmojis, personalityForm } = await import('../public/personalities-manager.js');
  for (const emoji of personalityEmojis)
    assert.ok(
      emojiChoices.some(choice => choice.emoji === emoji),
      emoji
    );
  const form = personalityForm({ name: 'Curious', emoji: '🧐' });
  assert.match(form, /data-action="choose-personality-emoji"/);
  assert.match(form, /type="hidden" name="emoji" value="🧐"/);
  assert.doesNotMatch(form, /<select name="emoji"/);
});

test('picker tooltips use official Unicode names while search retains friendly keywords', () => {
  assert.equal(emojiChoices.find(choice => choice.emoji === '😀').name, 'grinning face');
  assert.equal(emojiChoices.find(choice => choice.emoji === '💪').name, 'flexed biceps');
  assert.ok(emojiChoices.every(choice => typeof choice.name === 'string' && choice.name.length > 0));
  assert.ok(filterEmojiChoices('strength').some(choice => choice.emoji === '💪'));
});
