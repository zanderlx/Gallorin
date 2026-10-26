import { escapeHTML as e, heading } from './ui.js';
export const roadmap = [
  {
    name: 'Horse Editor & Custom Creator',
    status:
      'Horse Updates now provides versioned records and preview-first stable editing/regeneration for identity, appearance, species traits, mutation slots, and skills, with backups and Cosmic locks.',
    needs:
      'Remaining: standalone custom creation, deliberate invalid-combination sandbox overrides, and advanced import rules. Existing horses can receive new species trait definitions through explicit regeneration.'
  },
  {
    name: 'Generator Refinements',
    status:
      'The data-driven Cosmic/Wild pipeline, weighted species, chained mutation slots, duplicate lockout, gender, size, and aesthetic/personality assignment are implemented.',
    needs:
      'Supply exact species/trait artwork and any additional species-specific appearance traits. Future gameplay effects and advanced balancing rules can build on the local JSON configuration.'
  },
  {
    name: 'Mutation Effects & Artwork',
    status: 'Definitions can be edited; effects and exact species artwork are not implemented.',
    needs:
      'Duplicate selection and size shifts are implemented. Specify gameplay stacking, wing eligibility, and whether ordinary Astral differs from the Astral special spawn. Supply desired visual references/assets and base stats for effects such as speed or stamina; decide which belong in this collection game.'
  },
  {
    name: 'Breeding & Family History',
    status: 'Cross-species breeding with 50/50 species inheritance is confirmed.',
    needs:
      'Define eligible parents, costs, cooldown/gestation time, per-region color inheritance, trait and mutation inheritance, special-spawn inheritance, twins, and lineage restrictions. Confirm how parental traits transfer between different species.'
  },
  {
    name: 'Inventory, Gacha & Shop',
    status: 'Item definitions exist; acquisition, equipping, and use do not.',
    needs:
      'Supply the final tack/potion list, equip slots, potion effects, stacking/consumption rules, duplicate rewards, and shop prices. Known gacha rules: 50 gold; 95% tack / 5% potion; tack 60% unthemed / 40% themed; themed rewards 30% event / 70% non-event.'
  },
  {
    name: 'Town Activities & Event Scheduling',
    status: 'Custom zones work; Town activities and scheduling remain planned.',
    needs:
      'Provide costs, rewards, success rules, and progression for Spirit Tame, Plush Machine, Ancient Cave, and Digsite. Set event dates/time zone, availability, and species/palette eligibility.'
  },
  {
    name: 'Save Import, Restore & Reset',
    status: 'Automatic saves, exports, backups, and deletion already work.',
    needs:
      'Choose merge versus replace on import, duplicate-ID handling, which progress can be reset independently, and backup retention. No additional horse probability rules are needed to build these controls.'
  },
  {
    name: 'Collection Tools & Release Polish',
    status: 'Basic collection search, sorting, favorites, profiles, and themes work.',
    needs:
      'Prioritize advanced filters/statistics, bulk actions, and additional artwork. Define final catch behavior, starting gold, capacity, and sandbox overrides. Complete desktop/mobile, keyboard, accessibility, and browser interaction checks; visual QA is still unverified.'
  }
];
export function roadmapPage() {
  return `${heading('VERSION 1 · NEXT CHAPTERS', 'Remaining Features', 'What works now, what remains, and the decisions needed for the next version.')}
  <div class="library-grid">${roadmap.map(item => `<section class="panel"><h2>${e(item.name)}</h2><p>${e(item.status)}</p><h3>Information Needed</h3><p>${e(item.needs)}</p></section>`).join('')}</div>`;
}
