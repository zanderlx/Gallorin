import { emojiNames } from './emoji-names.js';
import { escapeHTML as e, icon } from './ui.js';
const groups = {
  Faces:
    '😀 happy smile|😃 cheerful|😁 grin|😂 laugh joy|🥰 affection love|😍 heart eyes|😎 cool|🤓 clever nerd|🧐 curious|🤔 thinking|😴 sleepy lazy|😠 angry grumpy|😰 anxious|😈 mischievous devil|👽 alien|👻 ghost|🤖 robot|💀 skull|🤡 clown|🧟 zombie|👼 angel|🥳 party|😇 innocent|🤩 amazed|🥺 pleading',
  Animals:
    '🐴 horse|🦄 unicorn|🐎 racing horse|🐶 dog|🐱 cat|🦁 lion chimera|🐯 tiger|🐺 wolf|🦊 fox|🐻 bear|🐼 panda|🐭 mouse dwarf|🐰 rabbit jump|🦘 kangaroo springy|🦣 mammoth giant|🐉 dragon|🦎 reptile|🐍 snake serpent|🦋 butterfly|🐝 bee|🐞 ladybug|🕷️ spider|🦅 eagle|🦉 owl|🐦 bird|🦚 peacock|🦢 swan|🐧 penguin|🦇 bat|🐙 octopus|🦈 shark|🐬 dolphin|🐳 whale|🦌 deer|🐐 goat|🦊 cunning',
  Nature:
    '🌸 sakura blossom|🌹 rose|🥀 wilted rose infection|🌻 sunflower|🌷 tulip|🌼 daisy|🍀 luck clover|🌱 fertile seedling|🌿 herb plant|🍄 mushroom|🌲 evergreen tree|🌳 tree|🍁 maple leaf|🍂 fallen leaf|🌵 cactus|🪨 rock geode|💎 crystal diamond|❄️ frost snowflake|🔥 fire flame|💧 water dilute|🫧 bubbles|🌊 wave ocean|⚡ lightning energy|🌈 rainbow tie dye|🌪️ tornado wind|☁️ cloud|☀️ solar sun|🌙 lunar moon|🌌 astral galaxy|⭐ star|🌠 shooting star|☄️ comet|🪐 planet|🌎 earth|🕳️ void hole|🌋 volcano|🏔️ mountain',
  'Magic & Objects':
    '🔮 arcane magic|🪄 wand spell|🧬 mutation dna|🧠 intelligence brain|🫁 lungs breath|💪 strength muscle|🦴 bone x ray|🪽 wing double jump|💞 close bond hearts|❤️ heart love|💖 sparkling heart|🔋 stamina battery|🏆 trophy|🥇 gold medal|🪙 gilded gold coin|💡 glow light|🕯️ haunting candle|🃏 jester joker|🎭 harlequin masks|🎨 palette color|🖌️ artisan brush|🧵 lace thread|🏺 porcelain vase|🧭 north star compass|🪞 perfect twins mirror|👯 twins|🎄 festive tree|🎃 pumpkin halloween|🎁 gift|🎀 ribbon|🧸 plush teddy|🎪 carnival|🛡️ shield|⚔️ swords|🗡️ blade|🔱 trident|🪶 feather|🧿 evil eye|⚙️ gear|🔗 chain|🗝️ key|🔒 locked|👑 crown|📜 scroll|📚 knowledge books|🔬 science|🧪 potion|⏳ time|🎯 target|🎲 random dice|🩰 nimble ballet|🏃 limber runner|🕊️ arisen dove|✨ sparkle'
};

Object.assign(groups, {
  'Food & Plants':
    '🍎 red apple|🍏 green apple|🍐 pear|🍊 orange citrus|🍋 lemon|🍌 banana|🍉 watermelon|🍇 grapes|🍓 strawberry|🫐 blueberry|🍈 melon|🍒 cherry|🍑 peach|🥭 mango|🍍 pineapple|🥥 coconut|🥝 kiwi|🍅 tomato|🍆 eggplant|🥑 avocado|🥦 broccoli|🥬 lettuce greens|🥒 cucumber|🌶️ pepper spicy|🫑 bell pepper|🌽 corn|🥕 carrot|🫒 olive|🧄 garlic|🧅 onion|🥔 potato|🍠 sweet potato|🥐 croissant|🥨 pretzel|🍞 bread|🥖 baguette|🧀 cheese|🥚 egg|🍳 breakfast|🥞 pancakes|🧇 waffle|🥓 bacon|🍔 burger|🍟 fries|🍕 pizza|🌮 taco|🌯 burrito|🍜 noodles|🍣 sushi|🍤 shrimp|🍦 ice cream|🍧 shaved ice|🍨 dessert|🍩 donut|🍪 cookie gingerbread|🎂 birthday cake|🍰 cake|🧁 cupcake|🥧 pie|🍫 chocolate|🍬 candy|🍭 lollipop peppermint|🍮 pudding|🍯 honey|☕ coffee|🍵 tea|🧃 juice|🧋 bubble tea',
  'Places & Transport':
    '🏰 castle kingdom|🏯 japanese castle|🏛️ temple|⛩️ shrine|🕌 mosque|⛪ church|🏠 home|🏡 garden house|🏚️ abandoned house|🏘️ village|🏙️ city|🌃 night city|🌆 sunset city|🌇 dusk|🌉 bridge night|🌁 foggy|🏝️ island|🏖️ beach|🏜️ desert|🏕️ camping|⛺ tent|🗻 mountain peak|🧊 ice cube|🌅 sunrise sea|🌄 sunrise mountain|🌑 new moon|🌒 waxing crescent|🌓 first quarter|🌔 waxing gibbous|🌕 full moon|🌖 waning gibbous|🌗 last quarter|🌘 waning crescent|🌞 sun face|🌝 moon face|🌛 moon crescent face|🌜 moon face left|🌚 dark moon|🌡️ temperature|☂️ umbrella|☔ rain|⛈️ thunderstorm|🌨️ snow|🌤️ partly sunny|🌥️ cloudy|🌦️ sun rain|🚀 rocket|🛸 flying saucer|🛰️ satellite|🛶 canoe|⛵ sailboat|🚢 ship|⚓ anchor|🧳 journey luggage|🗺️ map|🚂 steam train|🚗 car|🚲 bicycle|🛷 sled|🎡 ferris wheel|🎢 roller coaster|🎠 carousel horse',
  'Symbols & Shapes':
    '🌀 spiral|💫 dizzy magic|💥 impact explosion|💨 speed dash|💤 sleep|💢 anger|💦 droplets|💔 broken heart|🖤 black heart|🤍 white heart|🤎 brown heart|💙 blue heart|💚 green heart|💛 yellow heart|💜 purple heart|🧡 orange heart|💕 two hearts|💓 beating heart|💗 growing heart|💘 cupid heart|💝 heart gift|☮️ peace|☯️ yin yang|♾️ infinity|⚜️ fleur de lis|🔰 beginner shield|🔆 brightness|🔅 dim light|⚠️ warning|☢️ radioactive|☣️ biohazard|♻️ recycle|⚕️ healing|⚛️ atom|✡️ star of david|🔯 six pointed star|✝️ cross|☪️ crescent star|🕎 menorah|🛐 worship|♈ aries|♉ taurus|♊ gemini twins|♋ cancer|♌ leo|♍ virgo|♎ libra|♏ scorpio|♐ sagittarius|♑ capricorn|♒ aquarius|♓ pisces|🔴 red circle|🟠 orange circle|🟡 yellow circle|🟢 green circle|🔵 blue circle|🟣 purple circle|⚫ black circle|⚪ white circle|🔶 orange diamond|🔷 blue diamond|🔺 triangle|🔸 small diamond|🔹 small blue diamond|🔘 ring|🔳 square|🔲 black square'
});

groups['Body Parts'] =
  '💪 arm biceps muscle strength|🦾 mechanical arm prosthetic|🦵 leg limb|🦿 mechanical leg prosthetic|🦶 foot feet hoof|🖐️ hand fingers|✋ raised hand palm|🤚 back hand|👋 waving hand|👌 okay fingers|🤏 pinching hand|✌️ victory fingers|🤞 crossed fingers luck|🤟 love gesture|🤘 horns hand|🤙 call hand|👈 left pointing finger|👉 right pointing finger|👆 up pointing finger|👇 down pointing finger|☝️ index finger|👍 thumb up|👎 thumb down|✊ fist|👊 punch fist|🤛 left fist|🤜 right fist|👏 clap hands|🙌 raised hands|👐 open hands|🤲 palms together|🤝 handshake bond|🙏 folded hands|💅 nails polish|🦻 hearing aid ear|👂 ear hearing|👃 nose smell|👀 eyes sight|👁️ eye vision|👅 tongue|👄 lips mouth|🫦 biting lip|🦷 tooth teeth|🦴 bone skeleton|🧠 brain intelligence|🫀 anatomical heart|🫁 lungs breath|🩸 blood|🧬 dna genetics';
const personalityFavorites = [
  ['🙂', 'friendly smile'],
  ['😰', 'anxious'],
  ['🥰', 'affectionate'],
  ['🫂', 'clingy hug'],
  ['🧐', 'curious'],
  ['⚡', 'energetic'],
  ['😠', 'grumpy'],
  ['😴', 'lazy'],
  ['😜', 'playful wink'],
  ['😊', 'warm smile'],
  ['😎', 'cool'],
  ['🤔', 'thoughtful'],
  ['😇', 'innocent'],
  ['🥺', 'pleading'],
  ['😈', 'mischievous'],
  ['🤗', 'hugging'],
  ['🦄', 'unicorn'],
  ['🐴', 'horse'],
  ['🌟', 'glowing star'],
  ['🌸', 'blossom'],
  ['🔥', 'fire'],
  ['💖', 'sparkling heart'],
  ['🍀', 'lucky'],
  ['🌙', 'moon']
];
const registeredEmojis = new Set(
  Object.values(groups).flatMap(list => list.split('|').map(item => item.split(' ')[0]))
);
groups['Personality Favorites'] = personalityFavorites
  .filter(([emoji]) => !registeredEmojis.has(emoji))
  .map(([emoji, name]) => emoji + ' ' + name)
  .join('|');
export const emojiChoices = Object.entries(groups).flatMap(([category, list]) =>
  list.split('|').map(item => {
    const [emoji, ...words] = item.split(' ');
    return { emoji, name: emojiNames[emoji], keywords: words.join(' '), category };
  })
);
export function filterEmojiChoices(query = '', category = '') {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return emojiChoices.filter(
    choice =>
      (!category || choice.category === category) &&
      words.every(word =>
        `${choice.emoji} ${choice.name} ${choice.keywords} ${choice.category}`.toLowerCase().includes(word)
      )
  );
}
let dialog, choose;
export function openEmojiPicker({ value, onSelect }) {
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'emoji-picker-dialog';
    dialog.setAttribute('aria-labelledby', 'emoji-picker-title');
    // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
    dialog.innerHTML = `<div class="dialog-top"><h2 id="emoji-picker-title">Choose Emoji</h2><button type="button" class="icon-button" data-emoji-close aria-label="Close emoji picker">${icon('close')}</button></div><div class="emoji-picker-content"><div class="emoji-picker-filters"><input type="search" placeholder="Search emojis..." aria-label="Search emojis"><select aria-label="Emoji category"><option value="">All Categories</option>${Object.keys(
      groups
    )
      .map(group => `<option>${e(group)}</option>`)
      .join(
        ''
      )}</select></div><div class="emoji-picker-grid"></div><p class="emoji-picker-empty" hidden>No matching emojis.</p><label class="zone-field">Or Paste Any Emoji<input class="emoji-picker-custom" maxlength="32" aria-label="Paste any emoji"></label><button type="button" class="button secondary" data-use-custom-emoji>Use Emoji</button><p class="emoji-picker-error" role="alert"></p></div>`;
    document.body.append(dialog);
    const update = () => {
      const results = filterEmojiChoices(
        dialog.querySelector('[type="search"]').value,
        dialog.querySelector('select').value
      );
      // eslint-disable-next-line no-restricted-syntax -- TODO(html-template): migrate to the escaping html helper
      dialog.querySelector('.emoji-picker-grid').innerHTML = results
        .map(
          choice =>
            `<button type="button" class="emoji-choice" data-emoji-value="${e(choice.emoji)}" aria-label="${e(choice.name)}" title="${e(choice.name)}">${choice.emoji}</button>`
        )
        .join('');
      dialog.querySelector('.emoji-picker-empty').hidden = results.length > 0;
    };
    dialog.addEventListener('input', update);
    dialog.addEventListener('change', update);
    dialog.addEventListener('close', () => {
      choose = null;
    });
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-emoji-close]')) return dialog.close();
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          return dialog.close();
      }
      let emoji = event.target.closest('[data-emoji-value]')?.dataset.emojiValue;
      if (event.target.closest('[data-use-custom-emoji]')) {
        emoji = dialog.querySelector('.emoji-picker-custom').value.trim();
        if (!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(emoji)) {
          dialog.querySelector('.emoji-picker-error').textContent = 'Paste an emoji first.';
          return;
        }
      }
      if (emoji) {
        choose?.(emoji);
        dialog.close();
      }
    });
    dialog.refresh = update;
  }
  choose = onSelect;
  dialog.querySelector('[type="search"]').value = '';
  dialog.querySelector('select').value = '';
  dialog.querySelector('.emoji-picker-custom').value = value || '';
  dialog.querySelector('.emoji-picker-error').textContent = '';
  dialog.refresh();
  dialog.showModal();
  dialog.querySelector('[type="search"]').focus();
}
