/**
 * Canonical ID registry. Content authored in separate files cross-references
 * these IDs; tests/registry.test.ts verifies every reference resolves.
 */

export const HOUSE_IDS = [
  'veyrath', // The Crimson Sovereigns — royal, blood domination
  'noctharis', // The Veilborn — shadow, illusions
  'dravenmoor', // The Iron Blood — strength, durability
  'aurelith', // The Moonlit — lunar magic, transformation
  'mortavane', // The Graveborn — necromancy
  'seraphel', // The Scarlet Scholars — blood alchemy
  'velmora', // The Whispering Court — mental magic
  'kharvoss', // The Ashen — fire & ash
  'thalassar', // The Tidebound — sea, storms, drowned trade
  'sylvaine', // The Thornwild — beasts, forests, regeneration
  'ormund', // The Gilded Ledger — wealth, banking, royal blood by purchase
  'isenreth', // The Rimeborn — frost
  'halcyra', // The Dawnforsaken — fallen celestial line
  'zerevan', // The Venom Rose — poisons, assassins
  'valdrek', // The Stormcallers — lightning, war
  'eshkarra', // The Starwatchers — astrology, star magic
  'nyxaris', // The Voidwalkers — spatial distortion
  'grimvald', // The Hollow Crowns — souls, spirits, oaths
  'castellane', // The Mirror Court — reflections, duplicity
  'vesperine', // The Dusk Keepers — lost time-keepers, nearly extinct
] as const;

export const REGION_IDS = [
  'hollow-wood', // L1 forest
  'ossuary-deep', // L2 catacomb
  'mirewater', // L3 swamp
  'crimson-capital', // L3 castle (political heart, Vel'Sanguis)
  'ashen-reach', // L4 ash
  'frostmere', // L5 frost
  'sunken-archive', // L6 library
  'moonfell', // L6 ruins (moonlit)
  'cathedral-dawn', // L7 cathedral (the Order of the Dawn's fortress)
  'shattered-throne', // L8 ruins
  'starfall-spire', // L9 astral
  'the-maw', // L10 abyss
] as const;

/** One boss per region, in the same order as REGION_IDS. */
export const BOSS_IDS = [
  'mother-of-wolves',
  'hollow-king',
  'drowned-bishop',
  'gilded-regent',
  'ashen-empress',
  'rime-queen',
  'devourer-of-names',
  'pale-huntress',
  'crimson-saint',
  'first-betrayer',
  'star-eater',
  'forgotten-progenitor',
] as const;

export const MATERIAL_IDS = [
  'grave-dust',
  'bone-shard',
  'wolf-pelt',
  'beast-fang',
  'ectoplasm',
  'wraith-silk',
  'iron-ore',
  'silver-ingot',
  'ash-ember',
  'frost-shard',
  'storm-glass',
  'saint-relic',
  'swamp-root',
  'nightshade',
  'venom-gland',
  'moonpetal',
  'star-iron',
  'void-pearl',
  'dream-moth-wing',
  'soul-gem',
  'ancient-parchment',
  'cursed-sigil',
  'demon-horn',
  'dragon-scale',
  'cinder-heart',
  'spider-silk',
  'raven-feather',
  'blood-ruby',
  'primordial-ichor',
  'mirror-shard',
  'sand-of-hours',
  'gold-leaf',
  'obsidian',
] as const;

/** On-item special effects the engine implements (src/game/systems/itemEffects.ts). */
export const ITEM_EFFECTS = {
  'lifesteal-burst': 'Killing an enemy heals 6% of max HP.',
  'bleed-on-hit': 'Hits have a 25% chance to cause Bleed.',
  'burn-on-hit': 'Hits have a 25% chance to Burn.',
  'chill-on-hit': 'Hits have a 30% chance to Chill.',
  'shock-on-hit': 'Hits have a 20% chance to Shock.',
  'poison-on-hit': 'Hits apply a stack of Poison.',
  'curse-on-hit': 'Hits have a 15% chance to Curse.',
  thorns: 'Melee attackers take 30% of the damage they deal.',
  'blood-shield-on-low': 'Falling below 30% HP grants a blood shield (once per 30s).',
  'extra-projectile': 'Projectile abilities fire one additional projectile.',
  'dash-nova': 'Dashing releases a blood nova at your destination.',
  'kill-blood': 'Kills restore 3 blood.',
  'crit-bleed': 'Critical hits always cause Bleed.',
  'sun-ward': 'Sunlight damage is reduced by 60%.',
  'second-wind': 'Once per floor, lethal damage leaves you at 30% HP instead.',
  'feeding-frenzy': 'Feeding grants +30% attack speed for 6s.',
  'shadow-step-dash': 'Dashing makes you unseen for 1.5s.',
  'summon-bats-on-hit': 'Hits have a 8% chance to summon a blood bat.',
  'cooldown-on-kill': 'Kills reduce ability cooldowns by 0.5s.',
  'gold-magnet': 'Crowns are drawn to you from afar and +20% crowns.',
} as const;
export type ItemEffectId = keyof typeof ITEM_EFFECTS;

/** Tags usable in 'kill' quest objectives: any creature family, element, or these. */
export const CREATURE_TAGS = [
  'beast', 'undead', 'spirit', 'demon', 'construct', 'human', 'vampire', 'fey', 'dragon', 'aberration', 'celestial', 'werebeast',
  'hunter', 'zealot', 'wolf', 'bat', 'ghoul', 'wraith', 'knight', 'golem', 'cultist', 'corrupted', 'elite',
] as const;

/** Haven NPCs (dialogue + relationships). */
export const NPC_IDS = ['seneschal', 'alchemist', 'spymaster', 'ancestor', 'huntmaster', 'confessor'] as const;
