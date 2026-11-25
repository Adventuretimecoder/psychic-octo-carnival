/** The eleven ranks of vampiric evolution, plus specialization paths. */
import type { Modifier, RankDef } from '../types';

export const RANKS: RankDef[] = [
  { rank: 1, name: 'Newly Turned', xp: 0, trial: 'Survive your first night.', mods: [], privileges: ['May hunt the Hollow Wood.'], skillPoints: 1, attributePoints: 0, title: 'the Newly Turned', visual: 'Pale skin, faint red eyes.' },
  { rank: 2, name: 'Fledgling', xp: 120, trial: 'Reach the second floor of any dungeon.', trialCheck: { floor: 2 }, mods: [{ stat: 'maxHp', add: 10 }], privileges: ['Bat Form.', 'May petition a house.'], skillPoints: 1, attributePoints: 3, title: 'Fledgling', visual: 'Fangs lengthen.' },
  { rank: 3, name: 'Blood Initiate', xp: 400, trial: 'Slay the Mother of Wolves.', trialCheck: { boss: 'mother-of-wolves' }, mods: [{ stat: 'maxBlood', add: 15 }], privileges: ['Predatory Form.', 'Bloodlines may Awaken.', 'May propose marriage.'], skillPoints: 2, attributePoints: 3, title: 'Initiate of the Blood', visual: 'Eyes burn crimson in darkness.' },
  { rank: 4, name: 'Nightstalker', xp: 950, trial: 'Slay the Hollow King.', trialCheck: { boss: 'hollow-king' }, mods: [{ stat: 'moveSpeed', mul: 0.05 }, { stat: 'critChance', add: 0.03 }], privileges: ['Choose a Path.', 'Mist Form.', 'Curse Creation.'], skillPoints: 2, attributePoints: 4, title: 'Nightstalker', visual: 'Shadows cling to your cloak.' },
  { rank: 5, name: 'Blood Adept', xp: 2000, trial: 'Reach blood purity 30.', trialCheck: { purity: 30 }, mods: [{ stat: 'bloodDmg', mul: 0.1 }, { stat: 'maxHp', add: 20 }], privileges: ['Shadow Form.', 'Bloodlines may Ascend.', 'Forbidden arts.'], skillPoints: 2, attributePoints: 4, title: 'Adept of the Crimson Art', visual: 'Your veins glow faintly when you feed.' },
  { rank: 6, name: 'Elder Vampire', xp: 3800, trial: 'Hold two territories.', trialCheck: { ownRegions: 2 }, mods: [{ stat: 'influence', add: 2 }, { stat: 'armor', add: 10 }], privileges: ['Blood Puppetry.', 'May sit the Night Council.'], skillPoints: 3, attributePoints: 5, title: 'Elder', visual: 'Your presence chills the room.' },
  { rank: 7, name: 'Ancient Vampire', xp: 6500, trial: 'Slay the Crimson Saint.', trialCheck: { boss: 'crimson-saint' }, mods: [{ stat: 'sunResist', add: 0.15 }, { stat: 'maxHp', add: 30 }], privileges: ['Deathly Domain.', 'Bloodline Suppression.'], skillPoints: 3, attributePoints: 5, title: 'the Ancient', visual: 'Your skin takes on the sheen of marble.' },
  { rank: 8, name: 'Blood Lord', xp: 10500, trial: 'Reach the fourth floor of the Shattered Throne.', trialCheck: { depthRegion: 'shattered-throne', floor: 4 }, mods: [{ stat: 'bloodDmg', mul: 0.15 }, { stat: 'lifesteal', add: 0.03 }], privileges: ['Blood Monarch Form.', 'Blood Domain.', 'Bloodlines may reach Apotheosis.'], skillPoints: 3, attributePoints: 6, title: 'Blood Lord', visual: 'A crown of blood forms when you rage.' },
  { rank: 9, name: 'Vampire Sovereign', xp: 16000, trial: 'Slay the First Betrayer.', trialCheck: { boss: 'first-betrayer' }, mods: [{ stat: 'influence', add: 4 }, { stat: 'spellDmg', mul: 0.15 }, { stat: 'physDmg', mul: 0.15 }], privileges: ['Ancient Form.', 'Temporal Distortion.', 'May claim the Throne.'], skillPoints: 4, attributePoints: 6, title: 'Sovereign of the Night', visual: 'Bats gather wherever you stand.' },
  { rank: 10, name: 'Progenitor', xp: 24000, trial: 'Slay the Star-Eater and reach purity 80.', trialCheck: { boss: 'star-eater', purity: 80 }, mods: [{ stat: 'maxHp', mul: 0.15 }, { stat: 'maxBlood', mul: 0.15 }, { stat: 'cooldownRate', mul: 0.1 }], privileges: ['Reality Distortion.', 'Your blood founds lines.'], skillPoints: 4, attributePoints: 8, title: 'Progenitor', visual: 'The Red Star is reflected in your eyes.' },
  { rank: 11, name: 'Primordial', xp: 36000, trial: 'Slay the Forgotten Progenitor.', trialCheck: { boss: 'forgotten-progenitor' }, mods: [{ stat: 'physDmg', mul: 0.25 }, { stat: 'spellDmg', mul: 0.25 }, { stat: 'bloodDmg', mul: 0.25 }], privileges: ['Primordial Form.', 'You are what the Seven were.'], skillPoints: 5, attributePoints: 10, title: 'the Primordial', visual: 'Reality bleeds where you walk.' },
];

export interface PathDef { id: string; name: string; description: string; icon: string; color: string; perRank: Modifier[]; capstone: { name: string; text: string; mods: Modifier[] } }

/** Chosen at Nightstalker (rank 4). Bonuses grow with every rank beyond 4. */
export const PATHS: PathDef[] = [
  { id: 'blade', name: 'Path of the Crimson Blade', icon: 'bloody-sword', color: '#d01c3a', description: 'The warrior\'s road. Steel and claw, blood and bone.',
    perRank: [{ stat: 'physDmg', mul: 0.06 }, { stat: 'armor', add: 5 }, { stat: 'maxHp', mul: 0.03 }],
    capstone: { name: 'Red Tempest', text: 'At rank 8: +25% attack speed.', mods: [{ stat: 'attackSpeed', mul: 0.25 }] } },
  { id: 'arcana', name: 'Path of the Sanguine Arcana', icon: 'book-aura', color: '#8a4cff', description: 'The scholar\'s road. Mastery comes faster; spells strike harder.',
    perRank: [{ stat: 'spellDmg', mul: 0.06 }, { stat: 'research', mul: 0.08 }, { stat: 'cooldownRate', mul: 0.03 }],
    capstone: { name: 'Hemomantic Genius', text: 'At rank 8: blood costs -25%.', mods: [{ stat: 'costMult', mul: -0.25 }] } },
  { id: 'court', name: 'Path of the Shrouded Court', icon: 'domino-mask', color: '#d4a84a', description: 'The courtier\'s road. Influence, wealth, and the knife in the dark.',
    perRank: [{ stat: 'influence', add: 1 }, { stat: 'goldFind', mul: 0.06 }, { stat: 'critChance', add: 0.02 }, { stat: 'stealth', add: 0.04 }],
    capstone: { name: 'Kingmaker', text: 'At rank 8: +3 influence and +20% crit damage.', mods: [{ stat: 'influence', add: 3 }, { stat: 'critMult', add: 0.2 }] } },
  { id: 'hunt', name: 'Path of the Wild Hunt', icon: 'wolf-howl', color: '#a0c060', description: 'The predator\'s road. Forms last longer; feeding is a feast.',
    perRank: [{ stat: 'feedPower', mul: 0.08 }, { stat: 'moveSpeed', mul: 0.02 }, { stat: 'hpRegen', add: 0.5 }],
    capstone: { name: 'Endless Hunt', text: 'At rank 8: form upkeep is halved (blood costs -15%, +15% lifesteal on feeding).', mods: [{ stat: 'costMult', mul: -0.15 }, { stat: 'lifesteal', add: 0.04 }] } },
];
