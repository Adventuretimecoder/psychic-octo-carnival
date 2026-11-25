/**
 * Bloodlines — supernatural inheritance, independent of political family.
 * Each bloodline evolves through 5 stages; heirs carry genes (see systems/genetics.ts).
 */
import type { BloodlineDef, BloodlineId, BloodType, Element, FusionDef, Modifier, MutationDef, Rarity } from '../types';

export const STAGE_NAMES = ['Latent', 'Stirring', 'Awakened', 'Ascendant', 'Apotheosis'] as const;

const scale = (mods: Modifier[], k: number): Modifier[] =>
  mods.map((m) => ({ stat: m.stat, add: m.add !== undefined ? +(m.add * k).toFixed(3) : undefined, mul: m.mul !== undefined ? +(m.mul * k).toFixed(3) : undefined }));

interface Spec {
  id: BloodlineId; name: string; epithet: string; rarity: Rarity; element: Element; color: string; icon: string;
  description: string; lore: string; dominance: number; mutationWeight: number;
  /** Ability unlocked at Stirring (a shared catalog ability fitting the theme). */
  stirring: string;
  /** Unlocked at Ascendant: a form id, or another ability. */
  ascendant: string;
  theme: Modifier[]; weakness: { text: string; mods: Modifier[] }; incompatible: BloodlineId[];
  hidden: { abilityId: string; condition: string }; resonance: BloodType[];
}

function bloodline(s: Spec): BloodlineDef {
  const res = s.resonance[0];
  return {
    id: s.id, name: s.name, epithet: s.epithet, rarity: s.rarity, element: s.element, color: s.color, icon: s.icon,
    description: s.description, lore: s.lore, dominance: s.dominance, mutationWeight: s.mutationWeight,
    stages: [
      { name: STAGE_NAMES[0], requires: {}, mods: [], unlocks: [] },
      { name: STAGE_NAMES[1], requires: { potency: 20 }, mods: scale(s.theme, 1), unlocks: [s.stirring] },
      { name: STAGE_NAMES[2], requires: { potency: 40, rank: 3, bloodConsumed: { [res]: 6 } }, mods: scale(s.theme, 2), unlocks: [`bl-${s.id}-rare`] },
      { name: STAGE_NAMES[3], requires: { potency: 65, rank: 5, quest: `bq-${s.id}` }, mods: scale(s.theme, 3.2), unlocks: [s.ascendant] },
      { name: STAGE_NAMES[4], requires: { potency: 90, rank: 8, purity: 70, bloodConsumed: { [res]: 25 } }, mods: scale(s.theme, 5), unlocks: [`bl-${s.id}-leg`] },
    ],
    weakness: s.weakness, incompatible: s.incompatible, hidden: s.hidden, resonance: s.resonance,
  };
}

export const BLOODLINES: BloodlineDef[] = [
  bloodline({
    id: 'primordial', name: 'Primordial Blood', epithet: 'Blood of the Grail', rarity: 'primordial', element: 'blood', color: '#ff0030', icon: 'chalice-drops',
    description: 'Undiluted descent from the Seven who drank from the Grail of Ur. Every power answers it, a little.',
    lore: 'Covenant law forbids revealing it. Most who carry it never know — it sleeps beneath lesser blood for generations, then wakes all at once, usually at the worst possible moment.',
    dominance: 0.95, mutationWeight: 0.15, stirring: 'blood-drain', ascendant: 'form:primordial',
    theme: [{ stat: 'aff', add: 2 }, { stat: 'maxBlood', mul: 0.06 }, { stat: 'physDmg', mul: 0.03 }, { stat: 'spellDmg', mul: 0.03 }],
    weakness: { text: 'The Red Star\'s curse burns brightest in you: sunlight is crueler.', mods: [{ stat: 'sunResist', add: -0.3 }] },
    incompatible: [], hidden: { abilityId: 'secret-name-unwritten', condition: 'Ascend the Primordial Blood and read the Unwritten Page.' }, resonance: ['primordial', 'ancient'],
  }),
  bloodline({
    id: 'void', name: 'Voidblood', epithet: 'The Hollow Inheritance', rarity: 'rare', element: 'void', color: '#7a4cff', icon: 'portal',
    description: 'Nhal\'s gift: blood that remembers the spaces between places.',
    lore: 'Voidblooded children sometimes vanish from their cradles and are found in locked rooms. The Nyxaris call this "walking early".',
    dominance: 0.5, mutationWeight: 0.6, stirring: 'shadow-step', ascendant: 'form:mist',
    theme: [{ stat: 'cooldownRate', mul: 0.04 }, { stat: 'res_void', add: 0.06 }, { stat: 'mag', add: 1 }],
    weakness: { text: 'Poorly anchored to the world: holy power unthreads you.', mods: [{ stat: 'res_holy', add: -0.2 }] },
    incompatible: ['celestial'], hidden: { abilityId: 'fu-dream-void', condition: 'Ascend Voidblood and feed on 10 spectral vessels.' }, resonance: ['magical', 'spectral'],
  }),
  bloodline({
    id: 'dragon', name: 'Dragonblood', epithet: 'Vorr\'s Fire', rarity: 'rare', element: 'fire', color: '#ff6020', icon: 'dragon-head',
    description: 'Vorr drank a dragon dry after the Grail. His line runs hot, strong, and proud.',
    lore: 'Dragonblooded vampires are warm to the touch — the only vampires who are. Kharvoss claims the purest line; Dravenmoor the strongest.',
    dominance: 0.7, mutationWeight: 0.5, stirring: 'flame-lash', ascendant: 'form:ember',
    theme: [{ stat: 'str', add: 2 }, { stat: 'res_fire', add: 0.08 }, { stat: 'maxHp', mul: 0.04 }],
    weakness: { text: 'Hot blood: you hunger faster.', mods: [{ stat: 'hungerRate', mul: 0.2 }] },
    incompatible: ['frost'], hidden: { abilityId: 'secret-cinder-crown', condition: 'Ascend Dragonblood and find the Ash Tablet.' }, resonance: ['beast', 'ancient'],
  }),
  bloodline({
    id: 'moon', name: 'Moonblood', epithet: 'The Silver Veil', rarity: 'uncommon', element: 'frost', color: '#c8d8ff', icon: 'moon',
    description: 'Ishara\'s blood waxes and wanes. Under a full moon it is the strongest blood in Eryndor.',
    lore: 'Moonblooded vampires and the Wolfkin share an ancestor, and both deny it.',
    dominance: 0.55, mutationWeight: 1.0, stirring: 'frost-lance', ascendant: 'form:wolf',
    theme: [{ stat: 'mag', add: 1 }, { stat: 'agi', add: 1 }, { stat: 'res_frost', add: 0.05 }, { stat: 'hpRegen', add: 0.4 }],
    weakness: { text: 'Silver bites deep.', mods: [{ stat: 'res_holy', add: -0.12 }, { stat: 'armor', add: -4 }] },
    incompatible: [], hidden: { abilityId: 'secret-moonfang', condition: 'Ascend Moonblood and swear the Wolf Oath.' }, resonance: ['beast', 'magical'],
  }),
  bloodline({
    id: 'grave', name: 'Graveblood', epithet: 'The Pale Mother\'s Line', rarity: 'common', element: 'death', color: '#90b0a0', icon: 'tombstone',
    description: 'Blood that speaks to the dead, and that the dead answer.',
    lore: 'Morwen buried her own children so that they would wake. Graveblooded heirs dream of earth.',
    dominance: 0.6, mutationWeight: 1.4, stirring: 'spirit-summoning', ascendant: 'form:wraith',
    theme: [{ stat: 'wil', add: 2 }, { stat: 'res_death', add: 0.06 }, { stat: 'res_venom', add: 0.04 }],
    weakness: { text: 'Cold and slow-blooded.', mods: [{ stat: 'moveSpeed', mul: -0.04 }] },
    incompatible: ['celestial', 'life'], hidden: { abilityId: 'secret-choir-of-bones', condition: 'Ascend Graveblood and hear the Ossuary Hymn.' }, resonance: ['spectral', 'corrupted'],
  }),
  bloodline({
    id: 'royal', name: 'Royal Blood', epithet: 'The Crowned Vein', rarity: 'rare', element: 'blood', color: '#d4a84a', icon: 'crown',
    description: 'Caedrith\'s authority, diluted through six royal centuries. Blood that commands blood.',
    lore: 'Royal blood can be bought — Ormund proved it — but it cannot be faked. It knows its own.',
    dominance: 0.8, mutationWeight: 0.4, stirring: 'crimson-chains', ascendant: 'form:monarch',
    theme: [{ stat: 'cha', add: 2 }, { stat: 'influence', add: 1 }, { stat: 'bloodDmg', mul: 0.04 }],
    weakness: { text: 'Pride of the crown: it takes more to sate you.', mods: [{ stat: 'hungerRate', mul: 0.12 }] },
    incompatible: ['abyssal'], hidden: { abilityId: 'secret-crimson-requiem', condition: 'Ascend Royal Blood and recover the Requiem Score.' }, resonance: ['royal', 'noble'],
  }),
  bloodline({
    id: 'storm', name: 'Stormblood', epithet: 'Thunder in the Veins', rarity: 'uncommon', element: 'storm', color: '#8fb8ff', icon: 'lightning-storm',
    description: 'Blood that crackles. Quick, loud, impossible to calm.',
    lore: 'Stormblood first appeared in heirs Embraced during lightning storms; now it breeds true.',
    dominance: 0.5, mutationWeight: 1.0, stirring: 'storm-call', ascendant: 'gale-step',
    theme: [{ stat: 'agi', add: 2 }, { stat: 'attackSpeed', mul: 0.03 }, { stat: 'res_storm', add: 0.06 }],
    weakness: { text: 'You cannot be still: stealth suffers.', mods: [{ stat: 'stealth', add: -0.08 }] },
    incompatible: [], hidden: { abilityId: 'fu-tempest-dragon', condition: 'Ascend Stormblood and slay the Ashen Empress.' }, resonance: ['magical', 'beast'],
  }),
  bloodline({
    id: 'frost', name: 'Frostblood', epithet: 'The Long Cold', rarity: 'uncommon', element: 'frost', color: '#bff0ff', icon: 'snowflake-2',
    description: 'Blood that keeps, and preserves, and does not forgive.',
    lore: 'Frostblooded vampires hunger least of all their kind. Isenreth say it is because they have learned to wait.',
    dominance: 0.55, mutationWeight: 1.0, stirring: 'frost-lance', ascendant: 'secret-glacial-heart',
    theme: [{ stat: 'end', add: 2 }, { stat: 'res_frost', add: 0.08 }, { stat: 'hungerRate', mul: -0.05 }],
    weakness: { text: 'Fire undoes you.', mods: [{ stat: 'res_fire', add: -0.2 }] },
    incompatible: ['dragon'], hidden: { abilityId: 'secret-glacial-heart', condition: 'Ascend Frostblood, or find the Frozen Heart.' }, resonance: ['ancient', 'common'],
  }),
  bloodline({
    id: 'dream', name: 'Dreamblood', epithet: 'The Sleepers\' Gift', rarity: 'uncommon', element: 'mind', color: '#c0a0ff', icon: 'dream-catcher',
    description: 'Blood that walks in sleep — yours and others\'.',
    lore: 'The Dreamblooded never truly sleep in torpor; they wander. Some come back with knowledge they should not have.',
    dominance: 0.4, mutationWeight: 1.0, stirring: 'mind-spike', ascendant: 'dreamwalk',
    theme: [{ stat: 'int', add: 2 }, { stat: 'res_mind', add: 0.06 }, { stat: 'research', mul: 0.04 }],
    weakness: { text: 'Half-present: you bruise easily.', mods: [{ stat: 'maxHp', mul: -0.04 }] },
    incompatible: [], hidden: { abilityId: 'fu-dream-void', condition: 'Ascend Dreamblood and walk the Maw.' }, resonance: ['magical', 'noble'],
  }),
  bloodline({
    id: 'abyssal', name: 'Abyssal Blood', epithet: 'The Maw\'s Inheritance', rarity: 'epic', element: 'void', color: '#6a0090', icon: 'daemon-skull',
    description: 'Something from the Maw got into a line, long ago. It gives everything, and takes more.',
    lore: 'Abyssal blood is illegal under three Covenant articles. Its carriers are hunted by both the Dawn and the Council — and both keep a few, quietly.',
    dominance: 0.65, mutationWeight: 0.3, stirring: 'hex-of-unmaking', ascendant: 'form:ancient',
    theme: [{ stat: 'physDmg', mul: 0.05 }, { stat: 'spellDmg', mul: 0.05 }, { stat: 'lifesteal', add: 0.01 }],
    weakness: { text: 'Corruption: your blood rots, and holy power is agony.', mods: [{ stat: 'res_holy', add: -0.3 }, { stat: 'cha', add: -3 }] },
    incompatible: ['celestial', 'royal', 'life'], hidden: { abilityId: 'secret-name-unwritten', condition: 'Ascend Abyssal Blood and read the Unwritten Page.' }, resonance: ['corrupted', 'primordial'],
  }),
  bloodline({
    id: 'celestial', name: 'Celestial Blood', epithet: 'Seliene\'s Burden', rarity: 'epic', element: 'holy', color: '#fff0a0', icon: 'angel-wings',
    description: 'Radiant blood. It should not exist in a vampire, and it hurts.',
    lore: 'The Dawnforsaken carry it. So, whisper the Halcyra, did Saint Aldric — which is why the Crimson Saint never burned.',
    dominance: 0.45, mutationWeight: 0.3, stirring: 'blood-barrier', ascendant: 'fu-radiant-blood',
    theme: [{ stat: 'sunResist', add: 0.08 }, { stat: 'res_holy', add: 0.08 }, { stat: 'wil', add: 1 }],
    weakness: { text: 'Divided nature: your blood reserves are smaller.', mods: [{ stat: 'maxBlood', mul: -0.08 }] },
    incompatible: ['abyssal', 'grave', 'void'], hidden: { abilityId: 'fu-radiant-blood', condition: 'Ascend Celestial Blood and spare the Crimson Saint.' }, resonance: ['holy', 'royal'],
  }),
  bloodline({
    id: 'beast', name: 'Beastblood', epithet: 'Vorr\'s Hunger', rarity: 'common', element: 'physical', color: '#c0a070', icon: 'wolf-head',
    description: 'The animal in the vampire, given its head.',
    lore: 'Common in the south and the forest houses. Old nobles sneer at it — and keep Beastblooded bodyguards.',
    dominance: 0.7, mutationWeight: 1.6, stirring: 'savage-rend', ascendant: 'form:wolf',
    theme: [{ stat: 'str', add: 1 }, { stat: 'agi', add: 1 }, { stat: 'moveSpeed', mul: 0.02 }, { stat: 'feedPower', mul: 0.05 }],
    weakness: { text: 'The hunger is closer to the surface.', mods: [{ stat: 'hungerRate', mul: 0.15 }, { stat: 'cha', add: -1 }] },
    incompatible: [], hidden: { abilityId: 'secret-moonfang', condition: 'Ascend Beastblood and swear the Wolf Oath.' }, resonance: ['beast', 'common'],
  }),
  bloodline({
    id: 'shadow', name: 'Shadowblood', epithet: 'The Veilborn Line', rarity: 'common', element: 'shadow', color: '#6a4cff', icon: 'hood',
    description: 'Blood that dims lamps when it passes.',
    lore: 'The most common noble bloodline after Beastblood. Assassins, spies and courtiers all prize it.',
    dominance: 0.6, mutationWeight: 1.6, stirring: 'darkness-veil', ascendant: 'form:shadow',
    theme: [{ stat: 'stealth', add: 0.05 }, { stat: 'critChance', add: 0.015 }, { stat: 'res_shadow', add: 0.06 }],
    weakness: { text: 'Light finds you.', mods: [{ stat: 'sunResist', add: -0.1 }] },
    incompatible: [], hidden: { abilityId: 'secret-umbral-eclipse', condition: 'Ascend Shadowblood, or find the Eclipse Mural.' }, resonance: ['noble', 'spectral'],
  }),
  bloodline({
    id: 'weaver', name: 'Bloodweaver', epithet: 'The Hemomantic Art', rarity: 'uncommon', element: 'blood', color: '#ff4060', icon: 'spinning-wheel',
    description: 'Blood that wants to be shaped — threads, blades, constructs.',
    lore: 'Seraphel cultivated it in laboratories; Veyrath bred it in its royal line. Both claim to have invented it.',
    dominance: 0.5, mutationWeight: 1.0, stirring: 'blood-armor', ascendant: 'blood-puppetry',
    theme: [{ stat: 'bloodDmg', mul: 0.05 }, { stat: 'costMult', mul: -0.03 }, { stat: 'aff', add: 1 }],
    weakness: { text: 'Your blood is always half-spent.', mods: [{ stat: 'maxHp', mul: -0.04 }] },
    incompatible: [], hidden: { abilityId: 'fu-shadow-hemomancy', condition: 'Ascend Bloodweaver while carrying Shadowblood.' }, resonance: ['noble', 'magical'],
  }),
  bloodline({
    id: 'time', name: 'Timeblood', epithet: 'The Keeper\'s Hours', rarity: 'legendary', element: 'void', color: '#e0c080', icon: 'hourglass',
    description: 'Blood that runs at its own pace. Nearly extinct.',
    lore: 'Only the Vesperine carry it openly, and there are fewer than a dozen. Rumour says it began with the Unwritten Seventh.',
    dominance: 0.2, mutationWeight: 0.12, stirring: 'time-fracture', ascendant: 'bl-time-rare',
    theme: [{ stat: 'cooldownRate', mul: 0.06 }, { stat: 'moveSpeed', mul: 0.02 }, { stat: 'int', add: 1 }],
    weakness: { text: 'Borrowed time: you age, a little, every night.', mods: [{ stat: 'maxHp', mul: -0.06 }] },
    incompatible: ['mirror'], hidden: { abilityId: 'secret-name-unwritten', condition: 'Ascend Timeblood and read the Unwritten Page.' }, resonance: ['ancient', 'primordial'],
  }),
  bloodline({
    id: 'soul', name: 'Soulblood', epithet: 'The Oathkeepers\' Vein', rarity: 'rare', element: 'death', color: '#80ffe0', icon: 'soul-vessel',
    description: 'Blood that can hold souls the way a cup holds wine.',
    lore: 'Grimvald keep oathbreakers in theirs. Mortavane keep their ancestors. Neither likes to discuss the weight.',
    dominance: 0.45, mutationWeight: 0.6, stirring: 'soul-binding', ascendant: 'form:wraith',
    theme: [{ stat: 'wil', add: 2 }, { stat: 'statusResist', add: 0.04 }, { stat: 'res_death', add: 0.05 }],
    weakness: { text: 'Crowded veins: you heal slowly.', mods: [{ stat: 'hpRegen', mul: -0.1 }] },
    incompatible: [], hidden: { abilityId: 'fu-soul-necromancy', condition: 'Ascend Soulblood while carrying Graveblood.' }, resonance: ['spectral', 'holy'],
  }),
  bloodline({
    id: 'venom', name: 'Venomblood', epithet: 'The Garden\'s Gift', rarity: 'common', element: 'venom', color: '#80ff40', icon: 'poison-bottle',
    description: 'Toxic blood. Your bite kills the Warm, and other vampires think twice.',
    lore: 'The Zerevan built their house on it. It is said a Venomblooded vampire\'s tears can kill a horse.',
    dominance: 0.55, mutationWeight: 1.4, stirring: 'flame-lash', ascendant: 'bl-venom-rare',
    theme: [{ stat: 'statusPower', mul: 0.06 }, { stat: 'res_venom', add: 0.1 }, { stat: 'int', add: 1 }],
    weakness: { text: 'Tainted blood: feeding yields less.', mods: [{ stat: 'feedPower', mul: -0.06 }] },
    incompatible: [], hidden: { abilityId: 'fu-venom-life', condition: 'Ascend Venomblood while carrying Lifeblood.' }, resonance: ['magical', 'corrupted'],
  }),
  bloodline({
    id: 'life', name: 'Lifeblood', epithet: 'The Briar Spring', rarity: 'common', element: 'blood', color: '#ff8090', icon: 'heart-plus',
    description: 'Blood that mends, and mends others.',
    lore: 'Lifeblood is the closest a vampire comes to warmth. Sylvaine and Dravenmoor heirs recover from wounds that should end them.',
    dominance: 0.55, mutationWeight: 1.4, stirring: 'blood-drain', ascendant: 'iron-hide',
    theme: [{ stat: 'rgn', add: 2 }, { stat: 'hpRegen', add: 0.6 }, { stat: 'maxHp', mul: 0.03 }],
    weakness: { text: 'Softness: your strikes land lighter.', mods: [{ stat: 'physDmg', mul: -0.04 }] },
    incompatible: ['grave', 'abyssal'], hidden: { abilityId: 'fu-venom-life', condition: 'Ascend Lifeblood while carrying Venomblood.' }, resonance: ['common', 'holy'],
  }),
  bloodline({
    id: 'mirror', name: 'Mirrorblood', epithet: 'Who Was Two', rarity: 'legendary', element: 'mind', color: '#e0e8ff', icon: 'mirror-mirror',
    description: 'Your reflection moves on its own. Sometimes it moves first.',
    lore: 'Castellane hold the only known line. Scholars suspect it, like Timeblood, descends from the Unwritten.',
    dominance: 0.25, mutationWeight: 0.15, stirring: 'phantasm', ascendant: 'bl-mirror-rare',
    theme: [{ stat: 'critChance', add: 0.02 }, { stat: 'stealth', add: 0.03 }, { stat: 'cha', add: 1 }],
    weakness: { text: 'A divided self: mind magic breaks you.', mods: [{ stat: 'res_mind', add: -0.2 }] },
    incompatible: ['time'], hidden: { abilityId: 'fu-mirror-shadow', condition: 'Ascend Mirrorblood while carrying Shadowblood.' }, resonance: ['noble', 'spectral'],
  }),
  bloodline({
    id: 'star', name: 'Starblood', epithet: 'Fallen Light', rarity: 'epic', element: 'star', color: '#c9b8ff', icon: 'star-swirl',
    description: 'Blood with a little of the sky in it — some say a little of the Red Star.',
    lore: 'Starblood appears in heirs born under Blood Moons. As the Red Star returns, it is appearing more often.',
    dominance: 0.4, mutationWeight: 0.35, stirring: 'mind-spike', ascendant: 'bl-star-rare',
    theme: [{ stat: 'spellDmg', mul: 0.05 }, { stat: 'critChance', add: 0.015 }, { stat: 'mag', add: 1 }],
    weakness: { text: 'Fragile light.', mods: [{ stat: 'armor', add: -5 }] },
    incompatible: [], hidden: { abilityId: 'secret-falling-sky', condition: 'Ascend Starblood, or find the Starchart.' }, resonance: ['magical', 'primordial'],
  }),
];

export const BLOODLINE_BY_ID = Object.fromEntries(BLOODLINES.map((b) => [b.id, b])) as Record<BloodlineId, BloodlineDef>;

export const FUSIONS: FusionDef[] = [
  { id: 'fusion-shadow-hemomancy', name: 'Shadow Hemomancy', a: 'shadow', b: 'weaver', minStage: 2, description: 'Darkness and blood-craft entwined.', abilityId: 'fu-shadow-hemomancy', mods: [{ stat: 'bloodDmg', mul: 0.1 }, { stat: 'stealth', add: 0.05 }] },
  { id: 'fusion-tempest-dragon', name: 'Tempest Dragon', a: 'dragon', b: 'storm', minStage: 2, description: 'Storm-fire: the dragon of the sky.', abilityId: 'fu-tempest-dragon', mods: [{ stat: 'res_fire', add: 0.15 }, { stat: 'res_storm', add: 0.15 }, { stat: 'attackSpeed', mul: 0.06 }] },
  { id: 'fusion-soul-necromancy', name: 'Soul Necromancy', a: 'grave', b: 'soul', minStage: 2, description: 'Souls bound back into their bodies.', abilityId: 'fu-soul-necromancy', mods: [{ stat: 'wil', add: 4 }, { stat: 'res_death', add: 0.15 }] },
  { id: 'fusion-lunar-beast', name: 'Lunar Beast', a: 'moon', b: 'beast', minStage: 2, description: 'The silver wolf of legend.', abilityId: 'fu-lunar-beast', mods: [{ stat: 'moveSpeed', mul: 0.06 }, { stat: 'hpRegen', add: 1 }] },
  { id: 'fusion-frozen-hour', name: 'Frozen Hour', a: 'frost', b: 'time', minStage: 2, description: 'Cold enough to stop the clock.', abilityId: 'fu-frozen-hour', mods: [{ stat: 'cooldownRate', mul: 0.08 }, { stat: 'res_frost', add: 0.15 }] },
  { id: 'fusion-dream-void', name: 'Void Dreaming', a: 'dream', b: 'void', minStage: 2, description: 'Dreams that open doors.', abilityId: 'fu-dream-void', mods: [{ stat: 'int', add: 3 }, { stat: 'cooldownRate', mul: 0.05 }] },
  { id: 'fusion-radiant-blood', name: 'Radiant Blood', a: 'royal', b: 'celestial', minStage: 2, description: 'A sovereign\'s light.', abilityId: 'fu-radiant-blood', mods: [{ stat: 'sunResist', add: 0.2 }, { stat: 'cha', add: 3 }] },
  { id: 'fusion-venom-life', name: 'Verdant Plague', a: 'venom', b: 'life', minStage: 2, description: 'Poison and life in a single vein.', abilityId: 'fu-venom-life', mods: [{ stat: 'hpRegen', add: 1.5 }, { stat: 'statusPower', mul: 0.1 }] },
  { id: 'fusion-star-void', name: 'Cosmic Rift', a: 'star', b: 'void', minStage: 2, description: 'The sky torn open.', abilityId: 'fu-star-void', mods: [{ stat: 'spellDmg', mul: 0.1 }] },
  { id: 'fusion-mirror-shadow', name: 'Shade Mirrors', a: 'mirror', b: 'shadow', minStage: 2, description: 'Reflections of darkness.', abilityId: 'fu-mirror-shadow', mods: [{ stat: 'critChance', add: 0.04 }, { stat: 'stealth', add: 0.08 }] },
];

export const MUTATIONS: MutationDef[] = [
  { id: 'mut-crimson-eyes', name: 'Crimson Eyes', rarity: 'uncommon', nature: 'boon', icon: 'bleeding-eye', description: 'Eyes that see the blood beneath the skin.', mods: [{ stat: 'per', add: 3 }, { stat: 'critChance', add: 0.03 }] },
  { id: 'mut-iron-heart', name: 'Iron Heart', rarity: 'uncommon', nature: 'boon', icon: 'heart-tower', description: 'A heart that beats once a night, and never falters.', mods: [{ stat: 'maxHp', mul: 0.1 }] },
  { id: 'mut-quickened', name: 'Quickened Blood', rarity: 'uncommon', nature: 'boon', icon: 'sprint', description: 'Blood that moves faster than it should.', mods: [{ stat: 'moveSpeed', mul: 0.08 }, { stat: 'attackSpeed', mul: 0.05 }] },
  { id: 'mut-deep-veins', name: 'Deep Veins', rarity: 'uncommon', nature: 'boon', icon: 'droplets', description: 'Veins that hold more than they should.', mods: [{ stat: 'maxBlood', mul: 0.15 }] },
  { id: 'mut-sun-touched', name: 'Sun-Touched', rarity: 'rare', nature: 'boon', icon: 'sunrise', description: 'An ancestor survived the dawn. So, a little, can you.', mods: [{ stat: 'sunResist', add: 0.3 }] },
  { id: 'mut-twin-soul', name: 'Twin Soul', rarity: 'rare', nature: 'mixed', icon: 'duality-mask', description: 'Two souls in one body. They do not always agree.', mods: [{ stat: 'spellDmg', mul: 0.15 }, { stat: 'res_mind', add: -0.15 }] },
  { id: 'mut-feral', name: 'Feral Instinct', rarity: 'uncommon', nature: 'mixed', icon: 'beast-eye', description: 'More beast than noble.', mods: [{ stat: 'physDmg', mul: 0.12 }, { stat: 'cha', add: -3 }] },
  { id: 'mut-ancestral-memory', name: 'Ancestral Memory', rarity: 'rare', nature: 'boon', icon: 'brain', description: 'You remember things your ancestors did.', mods: [{ stat: 'research', mul: 0.2 }, { stat: 'int', add: 2 }] },
  { id: 'mut-hollow-hunger', name: 'Hollow Hunger', rarity: 'common', nature: 'bane', icon: 'shark-jaws', description: 'You are never full.', mods: [{ stat: 'hungerRate', mul: 0.3 }] },
  { id: 'mut-thin-blood', name: 'Thin Blood', rarity: 'common', nature: 'bane', icon: 'drop', description: 'Watery, weak blood.', mods: [{ stat: 'maxBlood', mul: -0.12 }, { stat: 'bloodDmg', mul: -0.08 }] },
  { id: 'mut-brittle', name: 'Brittle Bones', rarity: 'common', nature: 'bane', icon: 'broken-bone', description: 'An unstable Rite left you fragile.', mods: [{ stat: 'armor', add: -10 }, { stat: 'maxHp', mul: -0.06 }] },
  { id: 'mut-blood-fever', name: 'Blood Fever', rarity: 'uncommon', nature: 'mixed', icon: 'fire', description: 'Your blood burns hot and fast.', mods: [{ stat: 'attackSpeed', mul: 0.12 }, { stat: 'hungerRate', mul: 0.15 }] },
  { id: 'mut-silver-tongue', name: 'Silver Tongue', rarity: 'uncommon', nature: 'boon', icon: 'talk', description: 'People want to agree with you.', mods: [{ stat: 'cha', add: 4 }, { stat: 'influence', add: 1 }] },
  { id: 'mut-shadow-twin', name: 'Shadow-Twin', rarity: 'epic', nature: 'boon', icon: 'shadow-follower', description: 'Your shadow fights beside you, sometimes.', mods: [{ stat: 'critChance', add: 0.05 }, { stat: 'stealth', add: 0.1 }] },
  { id: 'mut-red-star', name: 'Mark of the Red Star', rarity: 'legendary', nature: 'boon', icon: 'evil-moon', description: 'Born under the returning star. Its light is in you.', mods: [{ stat: 'aff', add: 4 }, { stat: 'bloodDmg', mul: 0.15 }, { stat: 'lootLuck', mul: 0.2 }] },
  { id: 'mut-unwritten', name: 'Unwritten', rarity: 'mythical', nature: 'mixed', icon: 'scroll-unfurled', description: 'Parts of your history are simply missing. So are parts of you.', mods: [{ stat: 'cooldownRate', mul: 0.15 }, { stat: 'spellDmg', mul: 0.15 }, { stat: 'maxHp', mul: -0.1 }] },
  { id: 'mut-corruption', name: 'Corrupted Vein', rarity: 'uncommon', nature: 'bane', icon: 'poison', description: 'A taint in the line. It spreads.', mods: [{ stat: 'res_holy', add: -0.15 }, { stat: 'hpRegen', mul: -0.15 }] },
  { id: 'mut-unstable', name: 'Genetic Instability', rarity: 'common', nature: 'bane', icon: 'dna1', description: 'Incompatible bloodlines war in your veins.', mods: [{ stat: 'maxHp', mul: -0.08 }, { stat: 'statusResist', add: -0.1 }] },
];

export const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m])) as Record<string, MutationDef>;
