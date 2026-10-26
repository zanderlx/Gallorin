import { escapeHTML as e, number } from './ui.js';

export function saleQuoteBreakdown(quote) {
  const rows = [
    ['Base Price', number(quote.basePrice)],
    [`Traits (${quote.traitCount} × ${number(quote.modifiers.traitBonus)})`, `+${number(quote.traitBonus)}`],
    [
      `Mutations (${quote.mutationCount} × ${number(quote.modifiers.mutationBonus)})`,
      `+${number(quote.mutationBonus)}`
    ],
    [
      `Skill Levels (${quote.skillLevels} × ${number(quote.modifiers.skillLevelBonus)})`,
      `+${number(quote.skillLevelBonus)}`
    ],
    [
      `Wing Levels (${quote.wingLevels} × ${number(quote.modifiers.wingLevelBonus)})`,
      `+${number(quote.wingLevelBonus)}`
    ]
  ];
  if (quote.special) rows.push([`${quote.special} Multiplier`, `×${number(quote.multiplier)}`]);
  return `<dl class="sale-quote-breakdown">${rows.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`;
}
