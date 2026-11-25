/**
 * The ability catalog. Every ability runs on one engine behaviour (`kind`) and
 * evolves through tiers as its mastery grows. Some mutate per bloodline.
 */
import type { AbilityDef, AbilityKind, AbilityParams, AbilitySchool, AbilityUnlock, AbilityVariant, Element, PrimaryStat } from '../types';

type T = [name: string, mastery: number, params: Partial<AbilityParams>, note: string];

function ab(
  id: string, name: string, school: AbilitySchool, element: Element, kind: AbilityKind, icon: string, color: string,
  description: string, params: AbilityParams, tiers: T[], unlock: AbilityUnlock, stat: PrimaryStat,
  extra: { variants?: AbilityVariant[]; hidden?: boolean; legendary?: boolean; perPoint?: number; masteryDamage?: number } = {},
): AbilityDef {
  return {
    id, name, school, element, kind, icon, color, description, params,
    tiers: [[name, 1, {}, 'The base form.'] as T, ...tiers].map(([n, m, p, note]) => ({ name: n, mastery: m, params: p, note })),
    unlock,
    scaling: { stat, perPoint: extra.perPoint ?? 0.03, masteryDamage: extra.masteryDamage ?? 0.07 },
    variants: extra.variants, hidden: extra.hidden, legendary: extra.legendary,
  };
}

const start: AbilityUnlock = { type: 'start' };
const sp = (points: number, ...requires: string[]): AbilityUnlock => ({ type: 'skillpoints', points, requires });
const rank = (r: number): AbilityUnlock => ({ type: 'rank', rank: r });
const bl = (bloodline: AbilityVariant['bloodline'], stage: number): AbilityUnlock => ({ type: 'bloodline', bloodline, stage });
const disc = (secret: string): AbilityUnlock => ({ type: 'discovery', secret });
const fus = (fusion: string): AbilityUnlock => ({ type: 'fusion', fusion });
const v = (bloodline: AbilityVariant['bloodline'], name: string, element: Element, params: Partial<AbilityParams>, note: string): AbilityVariant =>
  ({ bloodline, name, element, params, note });

// ═════════════════════════════ BLOOD MAGIC ═════════════════════════════
const BLOOD: AbilityDef[] = [
  ab('blood-manipulation', 'Blood Control', 'blood', 'blood', 'projectile', 'droplets', '#d01c3a',
    'Shape your own blood into a hurled lance. The signature art of all vampires, and the one with the longest road.',
    { damage: 16, cost: 6, cooldown: 1.2, speed: 520, count: 1, pierce: 0, range: 420 },
    [
      ['Blood Whips', 2, { count: 2, spread: 0.22, damage: 15 }, 'Twin lashes of blood.'],
      ['Crimson Spears', 4, { count: 3, spread: 0.18, damage: 18, pierce: 1, speed: 600 }, 'Hardened spears that pierce.'],
      ['Blood Constructs', 6, { count: 4, spread: 0.16, damage: 20, pierce: 2, homing: 0.25 }, 'The spears seek their targets.'],
      ['Blood Domain', 8, { count: 5, spread: 0.15, damage: 24, pierce: 2, homing: 0.35, status: [{ id: 'bleed', chance: 0.35, duration: 3, power: 5 }] }, 'Your blood remembers its prey.'],
      ['Crimson Sovereignty', 10, { count: 7, spread: 0.13, damage: 28, pierce: 3, homing: 0.45, status: [{ id: 'bleed', chance: 0.6, duration: 4, power: 7 }] }, 'Blood obeys you as a subject obeys a king.'],
    ], start, 'aff',
    { variants: [
      v('frost', 'Rime Spears', 'frost', { status: [{ id: 'chill', chance: 0.6, duration: 2 }] }, 'Frozen blood.'),
      v('dragon', 'Cinder Spears', 'fire', { status: [{ id: 'burn', chance: 0.4, duration: 3, power: 5 }] }, 'Your blood ignites in flight.'),
      v('shadow', 'Umbral Spears', 'shadow', { pierce: 3 }, 'Spears of dark blood pass through flesh.'),
      v('storm', 'Thunderblood Spears', 'storm', { speed: 800, status: [{ id: 'shock', chance: 0.4, duration: 3 }] }, 'Blood that crackles.'),
      v('void', 'Hollow Spears', 'void', { homing: 0.6 }, 'They arrive before they are thrown.'),
      v('grave', 'Marrow Spears', 'death', { status: [{ id: 'weaken', chance: 0.4, duration: 3 }] }, 'Blood thick with grave-cold.'),
      v('venom', 'Viper Spears', 'venom', { status: [{ id: 'poison', chance: 0.7, duration: 4, power: 4 }] }, 'Toxic blood.'),
      v('celestial', 'Sanctified Spears', 'holy', { damage: 4 }, 'Blood that burns the unholy — painfully.'),
    ] }),
  ab('blood-drain', 'Blood Drain', 'blood', 'blood', 'drain', 'heart-drop', '#ff3355',
    'Tethers of blood latch onto nearby foes, pulling their life into you.',
    { damage: 14, cost: 0, cooldown: 8, range: 220, count: 1, duration: 2.5, lifesteal: 0.6 },
    [
      ['Sanguine Tethers', 4, { count: 2, damage: 16 }, 'Two tethers.'],
      ['Exsanguination', 8, { count: 4, damage: 20, lifesteal: 0.8, range: 260 }, 'You drink a room dry.'],
    ], start, 'aff', { variants: [v('life', 'Vital Communion', 'blood', { lifesteal: 1.2 }, 'Life flows to you as water downhill.')] }),
  ab('blood-barrier', 'Blood Barrier', 'blood', 'blood', 'shield', 'bordered-shield', '#b3122e',
    'Harden a sheath of blood around you that absorbs damage.',
    { cost: 14, cooldown: 14, absorb: 40, duration: 6 },
    [
      ['Crimson Aegis', 4, { absorb: 65 }, 'A thicker barrier.'],
      ['Heartwall', 8, { absorb: 100, duration: 8, mods: [{ stat: 'armor', add: 20 }] }, 'Your heart becomes a fortress.'],
    ], sp(1), 'end'),
  ab('crimson-chains', 'Crimson Chains', 'blood', 'blood', 'chain', 'crossed-chains', '#9e1030',
    'Chains of blood leap between enemies and bind them in place.',
    { damage: 14, cost: 12, cooldown: 9, count: 3, range: 230, status: [{ id: 'stun', chance: 0.5, duration: 1 }] },
    [
      ['Iron-Blood Chains', 4, { count: 5, damage: 16 }, 'Longer chains.'],
      ['Sovereign\'s Fetters', 8, { count: 7, damage: 22, status: [{ id: 'stun', chance: 0.8, duration: 1.4 }, { id: 'bleed', chance: 0.5, duration: 3, power: 5 }] }, 'None move without leave.'],
    ], sp(1, 'blood-manipulation'), 'aff'),
  ab('blood-armor', 'Blood Armor', 'blood', 'blood', 'buff', 'chest-armor', '#7d0d22',
    'Crust your skin in clotted blood plate.',
    { cost: 15, cooldown: 18, duration: 8, mods: [{ stat: 'armor', add: 35 }, { stat: 'statusResist', add: 0.2 }] },
    [
      ['Clotted Plate', 4, { mods: [{ stat: 'armor', add: 55 }, { stat: 'statusResist', add: 0.3 }] }, 'Thicker plate.'],
      ['Sanguine Carapace', 8, { duration: 12, mods: [{ stat: 'armor', add: 80 }, { stat: 'statusResist', add: 0.4 }, { stat: 'lifesteal', add: 0.05 }] }, 'The armor feeds you.'],
    ], sp(1, 'blood-barrier'), 'end'),
  ab('blood-puppetry', 'Blood Puppetry', 'blood', 'blood', 'nova', 'puppet', '#e0405a',
    'Seize the blood of those around you. The weak-willed turn and fight for you.',
    { damage: 12, cost: 22, cooldown: 18, radius: 140, status: [{ id: 'charm', chance: 0.35, duration: 5 }] },
    [
      ['Marionette Court', 5, { radius: 170, status: [{ id: 'charm', chance: 0.5, duration: 6 }] }, 'More strings.'],
      ['Puppet Sovereign', 9, { radius: 200, damage: 20, status: [{ id: 'charm', chance: 0.7, duration: 8 }] }, 'Armies dance.'],
    ], rank(6), 'cha'),
  ab('blood-domain', 'Blood Domain', 'blood', 'blood', 'zone', 'blood', '#ff1f3d',
    'Flood the ground with your blood. Within it, enemies bleed and you drink.',
    { damage: 14, cost: 30, cooldown: 22, radius: 170, duration: 6, tick: 0.5, range: 0, lifesteal: 0.25, status: [{ id: 'bleed', chance: 0.4, duration: 3, power: 6 }] },
    [
      ['Crimson Tide', 5, { radius: 200, damage: 18 }, 'The tide widens.'],
      ['Crimson Sovereignty', 9, { radius: 250, damage: 24, duration: 8, lifesteal: 0.4 }, 'The ground itself is your vassal.'],
    ], rank(8), 'aff', { legendary: true }),
];

// ═════════════════════════════ SHADOW ═════════════════════════════
const SHADOW: AbilityDef[] = [
  ab('shadow-step', 'Shadow Step', 'shadow', 'shadow', 'blink', 'sprint', '#6a4cff',
    'Step into a shadow and out of another, striking foes where you land.',
    { damage: 18, cost: 8, cooldown: 6, range: 230, radius: 70, invulnerable: true },
    [
      ['Umbral Stride', 4, { range: 290, damage: 24, radius: 90 }, 'Further, harder.'],
      ['Night\'s Door', 8, { range: 350, damage: 32, radius: 120, status: [{ id: 'fear', chance: 0.4, duration: 2 }] }, 'Foes recoil at your arrival.'],
    ], sp(1), 'agi', { variants: [v('void', 'Rift Stride', 'void', { range: 420 }, 'You step through space itself.')] }),
  ab('shadow-clones', 'Shadow Clones', 'shadow', 'shadow', 'summon', 'shadow-follower', '#4a3a8a',
    'Peel your shadow from the floor. It fights as you do.',
    { damage: 10, cost: 18, cooldown: 15, count: 2, duration: 8, minion: 'shade' },
    [
      ['Umbral Kin', 4, { count: 3, damage: 13 }, 'More shadows.'],
      ['Court of Shades', 8, { count: 5, damage: 17, duration: 11 }, 'A whole court of darkness.'],
    ], sp(2, 'shadow-step'), 'agi'),
  ab('shadow-binding', 'Shadow Binding', 'shadow', 'shadow', 'zone', 'grasping-claws', '#3a2a6a',
    'Shadows rise from the ground and hold everything within.',
    { damage: 8, cost: 14, cooldown: 12, radius: 110, duration: 3.5, tick: 0.5, range: 300, status: [{ id: 'freeze', chance: 0.35, duration: 1.2 }] },
    [
      ['Grasping Dark', 4, { radius: 140, damage: 11 }, 'More hands.'],
      ['Night Dominion', 8, { radius: 180, damage: 15, status: [{ id: 'freeze', chance: 0.6, duration: 1.5 }, { id: 'curse', chance: 0.4, duration: 4 }] }, 'The dark owns them.'],
    ], sp(1, 'shadow-step'), 'mag'),
  ab('darkness-veil', 'Darkness Veil', 'shadow', 'shadow', 'buff', 'hood', '#2a2050',
    'Wrap yourself in darkness. Enemies lose sight of you; your first strikes land harder.',
    { cost: 12, cooldown: 16, duration: 6, mods: [{ stat: 'stealth', add: 0.6 }, { stat: 'critChance', add: 0.15 }, { stat: 'moveSpeed', mul: 0.15 }] },
    [
      ['Veil of Night', 5, { duration: 8, mods: [{ stat: 'stealth', add: 0.75 }, { stat: 'critChance', add: 0.25 }, { stat: 'moveSpeed', mul: 0.2 }] }, 'A deeper veil.'],
      ['Moonless', 9, { duration: 10, mods: [{ stat: 'stealth', add: 0.9 }, { stat: 'critChance', add: 0.35 }, { stat: 'critMult', add: 0.5 }, { stat: 'moveSpeed', mul: 0.25 }] }, 'You are the absence of light.'],
    ], sp(1), 'agi'),
  ab('night-dominion', 'Umbral Burst', 'shadow', 'shadow', 'nova', 'dark-squad', '#5530c0',
    'Detonate the shadows around you.',
    { damage: 26, cost: 16, cooldown: 9, radius: 120, knockback: 120 },
    [
      ['Eclipse Burst', 4, { radius: 150, damage: 32 }, 'A wider eclipse.'],
      ['Shadow Realm', 8, { radius: 190, damage: 42, status: [{ id: 'fear', chance: 0.5, duration: 2.5 }] }, 'For an instant, all is the Shadow Realm.'],
    ], sp(2, 'shadow-binding'), 'mag'),
];

// ═════════════════════════════ NECROMANCY ═════════════════════════════
const NECRO: AbilityDef[] = [
  ab('spirit-summoning', 'Spirit Summoning', 'necromancy', 'death', 'summon', 'ghost-ally', '#8fd6c8',
    'Call a restless spirit to fight at your side.',
    { damage: 10, cost: 16, cooldown: 12, count: 2, duration: 10, minion: 'spirit' },
    [
      ['Spectral Choir', 4, { count: 3, damage: 13 }, 'More voices.'],
      ['Host of the Unquiet', 8, { count: 5, damage: 17, duration: 14 }, 'The dead march for you.'],
    ], sp(1), 'wil'),
  ab('grave-servants', 'Grave Servants', 'necromancy', 'death', 'summon', 'raise-skeleton', '#c8c0a0',
    'Raise skeletal servants from the earth.',
    { damage: 12, cost: 20, cooldown: 16, count: 3, duration: 12, minion: 'skeleton' },
    [
      ['Bone Legion', 5, { count: 4, damage: 15 }, 'A legion.'],
      ['Undead Command', 9, { count: 6, damage: 20, duration: 16 }, 'Graves empty at your word.'],
    ], sp(2, 'spirit-summoning'), 'wil'),
  ab('soul-binding', 'Soul Binding', 'necromancy', 'death', 'chain', 'soul-vessel', '#9de0e6',
    'Bind the souls of several foes together. Pain shared is pain doubled.',
    { damage: 16, cost: 12, cooldown: 8, count: 3, range: 240, status: [{ id: 'weaken', chance: 0.6, duration: 4 }] },
    [
      ['Soulchain', 4, { count: 5, damage: 19 }, 'A longer chain.'],
      ['Soul Shackles', 8, { count: 7, damage: 24, status: [{ id: 'weaken', chance: 1, duration: 5 }, { id: 'curse', chance: 0.4, duration: 4 }] }, 'Their souls answer to you.'],
    ], sp(1, 'spirit-summoning'), 'wil'),
  ab('spectral-guardians', 'Spectral Guardians', 'necromancy', 'death', 'orbit', 'spectre', '#a0f0e0',
    'Spirits circle you, striking anything that comes close.',
    { damage: 12, cost: 14, cooldown: 12, count: 3, radius: 72, duration: 8 },
    [
      ['Wailing Ring', 4, { count: 4, damage: 15 }, 'Another guardian.'],
      ['Wardens of the Veil', 8, { count: 6, damage: 20, radius: 90, duration: 11 }, 'A storm of spirits.'],
    ], sp(1, 'spirit-summoning'), 'wil'),
  ab('deathly-domain', 'Deathly Domain', 'necromancy', 'death', 'zone', 'death-zone', '#5fbfa0',
    'Curse the ground. The living wither within it.',
    { damage: 10, cost: 22, cooldown: 18, radius: 150, duration: 7, tick: 0.5, range: 0, status: [{ id: 'curse', chance: 0.5, duration: 4 }, { id: 'weaken', chance: 0.4, duration: 3 }] },
    [
      ['Gravefield', 5, { radius: 180, damage: 14 }, 'Wider rot.'],
      ['Kingdom of the Dead', 9, { radius: 230, damage: 20, duration: 9 }, 'Here, death is the only law.'],
    ], rank(7), 'wil', { legendary: true }),
];

// ═════════════════════════════ ELEMENTAL ═════════════════════════════
const ELEMENTAL: AbilityDef[] = [
  ab('flame-lash', 'Flame Lash', 'elemental', 'fire', 'cone', 'flame', '#ff7a1a',
    'A whip of fire cracks across the space before you.',
    { damage: 22, cost: 10, cooldown: 5, range: 150, radius: 1.1, status: [{ id: 'burn', chance: 0.5, duration: 3, power: 5 }] },
    [
      ['Searing Arc', 4, { range: 180, damage: 28 }, 'Hotter and longer.'],
      ['Pyre Crescent', 8, { range: 220, radius: 1.5, damage: 38, status: [{ id: 'burn', chance: 1, duration: 4, power: 8 }] }, 'A crescent of pyre-fire.'],
    ], sp(1), 'mag', { variants: [v('dragon', 'Drakefire Breath', 'fire', { range: 240, damage: 8 }, 'You breathe it now.')] }),
  ab('frost-lance', 'Frost Lance', 'elemental', 'frost', 'projectile', 'ice-bolt', '#9fe0ff',
    'A lance of ice that pierces and chills.',
    { damage: 20, cost: 9, cooldown: 3, speed: 560, pierce: 3, range: 450, status: [{ id: 'chill', chance: 1, duration: 2.5 }] },
    [
      ['Rime Lance', 4, { damage: 26, pierce: 5 }, 'Through everything.'],
      ['Glacier Spear', 8, { damage: 34, count: 3, spread: 0.2, status: [{ id: 'chill', chance: 1, duration: 3 }, { id: 'freeze', chance: 0.3, duration: 1.2 }] }, 'Three spears of glacier.'],
    ], sp(1), 'mag'),
  ab('storm-call', 'Storm Call', 'elemental', 'storm', 'chain', 'lightning-branches', '#a0c8ff',
    'Lightning arcs between your enemies.',
    { damage: 20, cost: 11, cooldown: 5, count: 4, range: 230, status: [{ id: 'shock', chance: 0.4, duration: 3 }] },
    [
      ['Thunderhead', 4, { count: 6, damage: 24 }, 'More arcs.'],
      ['Tempest', 8, { count: 9, damage: 30, status: [{ id: 'shock', chance: 0.8, duration: 3 }, { id: 'stun', chance: 0.25, duration: 0.7 }] }, 'The storm is yours.'],
    ], sp(1), 'mag'),
  ab('gale-step', 'Gale Step', 'elemental', 'storm', 'dash', 'wind-slap', '#c0e8ff',
    'Become wind for an instant, cutting through foes in your path.',
    { damage: 16, cost: 6, cooldown: 4, range: 220, knockback: 160, invulnerable: true },
    [
      ['Cyclone Dash', 4, { range: 270, damage: 22 }, 'Further.'],
      ['Skyrender', 8, { range: 330, damage: 30, status: [{ id: 'stun', chance: 0.3, duration: 0.8 }] }, 'The wind tears.'],
    ], sp(1), 'agi'),
  ab('earthen-spike', 'Earthen Spike', 'elemental', 'physical', 'zone', 'spikes-full', '#a08060',
    'Spikes of stone erupt beneath your target.',
    { damage: 30, cost: 12, cooldown: 7, radius: 80, duration: 0.6, tick: 0.3, range: 320, status: [{ id: 'stun', chance: 0.4, duration: 1 }] },
    [
      ['Stone Thicket', 4, { radius: 110, damage: 36 }, 'A thicket of stone.'],
      ['Mountain\'s Teeth', 8, { radius: 150, damage: 48, status: [{ id: 'stun', chance: 0.7, duration: 1.3 }] }, 'The earth bites.'],
    ], sp(1), 'str'),
  ab('tide-surge', 'Tide Surge', 'elemental', 'frost', 'cone', 'wave-crest', '#4ab0e0',
    'A crashing wave of black water hurls foes away.',
    { damage: 18, cost: 10, cooldown: 6, range: 170, radius: 1.3, knockback: 260, status: [{ id: 'chill', chance: 0.5, duration: 2 }] },
    [
      ['Undertow', 4, { range: 200, damage: 24 }, 'A heavier wave.'],
      ['Drowning Deep', 8, { range: 240, radius: 1.6, damage: 32, knockback: 340 }, 'The sea answers.'],
    ], sp(1, 'frost-lance'), 'mag'),
];

// ═════════════════════════════ MENTAL ═════════════════════════════
const MENTAL: AbilityDef[] = [
  ab('mind-spike', 'Mind Spike', 'mental', 'mind', 'projectile', 'brain-freeze', '#e080ff',
    'A needle of pure will that stuns the thoughts of its target.',
    { damage: 18, cost: 8, cooldown: 3, speed: 640, range: 450, homing: 0.5, status: [{ id: 'stun', chance: 0.25, duration: 0.8 }] },
    [
      ['Thought Needle', 4, { count: 2, spread: 0.2, damage: 21 }, 'Two needles.'],
      ['Mind Reading', 8, { count: 3, damage: 26, status: [{ id: 'stun', chance: 0.4, duration: 1 }, { id: 'weaken', chance: 0.5, duration: 3 }] }, 'You know where they will flee.'],
    ], sp(1), 'int'),
  ab('phantasm', 'Phantasm', 'mental', 'mind', 'summon', 'duality-mask', '#c0a0ff',
    'Illusory doubles of yourself distract and harry your foes.',
    { damage: 8, cost: 14, cooldown: 14, count: 2, duration: 7, minion: 'mirror' },
    [
      ['Hall of Illusions', 4, { count: 3, damage: 10 }, 'More doubles.'],
      ['Masque of Selves', 8, { count: 5, damage: 14, duration: 10 }, 'Which one is real?'],
    ], sp(1, 'mind-spike'), 'int'),
  ab('dread-howl', 'Fear Induction', 'mental', 'mind', 'nova', 'terror', '#9060c0',
    'Let them see what you are. Those nearby flee in terror.',
    { damage: 10, cost: 12, cooldown: 12, radius: 160, status: [{ id: 'fear', chance: 0.7, duration: 3 }] },
    [
      ['Night Terror', 4, { radius: 200, status: [{ id: 'fear', chance: 0.85, duration: 3.5 }] }, 'Deeper fear.'],
      ['Visage of the Progenitor', 8, { radius: 250, damage: 20, status: [{ id: 'fear', chance: 1, duration: 4 }, { id: 'weaken', chance: 0.6, duration: 4 }] }, 'They glimpse the First Night.'],
    ], sp(1), 'cha'),
  ab('mental-bulwark', 'Mental Barrier', 'mental', 'mind', 'shield', 'brain', '#d0b0ff',
    'A barrier of will that absorbs harm and steadies the mind.',
    { cost: 10, cooldown: 14, absorb: 35, duration: 6, mods: [{ stat: 'statusResist', add: 0.4 }] },
    [
      ['Iron Will', 4, { absorb: 55 }, 'Stronger.'],
      ['Unbreakable Mind', 8, { absorb: 85, mods: [{ stat: 'statusResist', add: 0.7 }] }, 'Nothing reaches you.'],
    ], sp(1, 'mind-spike'), 'wil'),
  ab('dreamwalk', 'Dreamwalking', 'mental', 'mind', 'blink', 'dream-catcher', '#b090f0',
    'Slip through the dreams of the sleeping world and wake elsewhere.',
    { damage: 14, cost: 10, cooldown: 7, range: 280, radius: 90, invulnerable: true, status: [{ id: 'stun', chance: 0.4, duration: 1 }] },
    [['Lucid Passage', 5, { range: 340, damage: 20 }, 'You choose where you wake.'], ['Waking Nightmare', 9, { range: 400, damage: 30, radius: 130, status: [{ id: 'stun', chance: 0.7, duration: 1.2 }, { id: 'fear', chance: 0.4, duration: 2 }] }, 'They wake screaming.']],
    sp(2, 'phantasm'), 'int'),
  ab('memory-theft', 'Memory Alteration', 'mental', 'mind', 'cone', 'brainstorm', '#f0a0ff',
    'Tear the last few moments from their minds. They forget what they were doing — and what they were.',
    { damage: 16, cost: 12, cooldown: 8, range: 160, radius: 1.0, status: [{ id: 'weaken', chance: 0.8, duration: 4 }, { id: 'stun', chance: 0.3, duration: 1 }] },
    [['Erasure', 5, { range: 200, damage: 22 }, 'More is lost.'], ['Unwriting', 9, { range: 240, radius: 1.4, damage: 30, status: [{ id: 'weaken', chance: 1, duration: 5 }, { id: 'charm', chance: 0.3, duration: 4 }] }, 'They forget whose side they are on.']],
    sp(2, 'dread-howl'), 'int'),
];

// ═════════════════════════════ PHYSICAL ═════════════════════════════
const PHYSICAL: AbilityDef[] = [
  ab('savage-rend', 'Savage Rend', 'physical', 'physical', 'cone', 'claw-slashes', '#ff5050',
    'A brutal sweeping strike with superhuman strength.',
    { damage: 30, cost: 8, cooldown: 4, range: 110, radius: 1.6, knockback: 140, status: [{ id: 'bleed', chance: 0.4, duration: 3, power: 5 }] },
    [['Ravage', 4, { damage: 38, range: 130 }, 'Harder.'], ['Butcher\'s Crescent', 8, { damage: 52, range: 150, radius: 2.0, status: [{ id: 'bleed', chance: 0.8, duration: 4, power: 8 }] }, 'Nothing survives the crescent.']],
    sp(1), 'str', { variants: [v('beast', 'Feral Rend', 'physical', { damage: 8, status: [{ id: 'bleed', chance: 1, duration: 4, power: 7 }] }, 'Claws, not hands.')] }),
  ab('predator-pounce', 'Predator\'s Pounce', 'physical', 'physical', 'dash', 'sprint', '#ff8060',
    'Leap onto your prey with blurring speed.',
    { damage: 24, cost: 6, cooldown: 5, range: 240, knockback: 100, invulnerable: true, status: [{ id: 'stun', chance: 0.4, duration: 0.8 }] },
    [['Bloodhound Leap', 4, { damage: 30, range: 280 }, 'Further.'], ['Apex Strike', 8, { damage: 42, range: 330, status: [{ id: 'stun', chance: 0.8, duration: 1 }] }, 'The apex predator strikes once.']],
    sp(1), 'agi'),
  ab('iron-hide', 'Superhuman Endurance', 'physical', 'physical', 'buff', 'muscle-up', '#c08040',
    'Steel your undead flesh.',
    { cost: 12, cooldown: 18, duration: 8, mods: [{ stat: 'armor', add: 30 }, { stat: 'physDmg', mul: 0.2 }, { stat: 'hpRegen', add: 3 }] },
    [['Regeneration', 5, { mods: [{ stat: 'armor', add: 40 }, { stat: 'physDmg', mul: 0.3 }, { stat: 'hpRegen', add: 6 }] }, 'Wounds close as they open.'], ['Undying Vigor', 9, { duration: 12, mods: [{ stat: 'armor', add: 60 }, { stat: 'physDmg', mul: 0.4 }, { stat: 'hpRegen', add: 10 }] }, 'You will not fall.']],
    sp(1), 'end'),
  ab('combat-instinct', 'Combat Instinct', 'physical', 'physical', 'buff', 'bullseye', '#ffb060',
    'Enhanced senses slow the world. Every opening is visible.',
    { cost: 10, cooldown: 16, duration: 7, mods: [{ stat: 'critChance', add: 0.2 }, { stat: 'attackSpeed', mul: 0.25 }, { stat: 'moveSpeed', mul: 0.15 }] },
    [['Night Vision', 5, { mods: [{ stat: 'critChance', add: 0.3 }, { stat: 'attackSpeed', mul: 0.35 }, { stat: 'moveSpeed', mul: 0.2 }] }, 'Darkness hides nothing.'], ['Hunter\'s Trance', 9, { duration: 10, mods: [{ stat: 'critChance', add: 0.4 }, { stat: 'critMult', add: 0.6 }, { stat: 'attackSpeed', mul: 0.5 }, { stat: 'moveSpeed', mul: 0.25 }] }, 'Time itself seems to wait for you.']],
    sp(2, 'predator-pounce'), 'per'),
];

// ═════════════════════════════ FORBIDDEN ═════════════════════════════
const FORBIDDEN: AbilityDef[] = [
  ab('soul-rend', 'Soul Manipulation', 'forbidden', 'death', 'projectile', 'soul', '#60ffd0',
    'Tear a sliver of soul from a foe and hurl it back through its kin.',
    { damage: 30, cost: 16, cooldown: 6, speed: 480, pierce: 6, range: 500, lifesteal: 0.2 },
    [['Soulflay', 5, { damage: 38 }, 'Deeper.'], ['Soul Harvest', 9, { damage: 50, count: 3, spread: 0.25, lifesteal: 0.3 }, 'Reap them.']],
    rank(5), 'wil'),
  ab('rift-tear', 'Dimensional Distortion', 'forbidden', 'void', 'zone', 'vortex', '#8040ff',
    'Tear a rift that drags enemies inward and grinds them.',
    { damage: 12, cost: 20, cooldown: 14, radius: 140, duration: 4, tick: 0.35, range: 320, knockback: -90 },
    [['Hungering Rift', 5, { radius: 170, damage: 15 }, 'It pulls harder.'], ['Singularity', 9, { radius: 210, damage: 22, duration: 5, knockback: -140 }, 'Nothing escapes.']],
    rank(5), 'mag'),
  ab('hex-of-unmaking', 'Curse Creation', 'forbidden', 'void', 'nova', 'cursed-star', '#a030c0',
    'Pronounce a curse. Everything nearby takes more damage from every source.',
    { damage: 8, cost: 14, cooldown: 12, radius: 180, status: [{ id: 'curse', chance: 1, duration: 6 }] },
    [['Hex of Ruin', 5, { radius: 220, status: [{ id: 'curse', chance: 1, duration: 8 }, { id: 'weaken', chance: 0.5, duration: 5 }] }, 'Ruin follows.'], ['Malediction', 9, { radius: 280, damage: 20, status: [{ id: 'curse', chance: 1, duration: 10 }, { id: 'weaken', chance: 1, duration: 6 }] }, 'An unmaking curse.']],
    rank(4), 'int'),
  ab('bloodline-suppression', 'Bloodline Suppression', 'forbidden', 'blood', 'nova', 'bleeding-wound', '#c00020',
    'Silence the blood in every vein around you. Vampires and beasts are stunned; all are weakened.',
    { damage: 18, cost: 20, cooldown: 16, radius: 160, status: [{ id: 'stun', chance: 0.6, duration: 1.5 }, { id: 'weaken', chance: 1, duration: 5 }] },
    [['Stilled Hearts', 6, { radius: 200, damage: 24 }, 'More hearts stilled.'], ['Blood Silence', 10, { radius: 240, damage: 34, status: [{ id: 'stun', chance: 1, duration: 2 }, { id: 'weaken', chance: 1, duration: 6 }] }, 'Absolute silence.']],
    rank(7), 'aff'),
  ab('time-fracture', 'Temporal Distortion', 'forbidden', 'void', 'zone', 'empty-hourglass', '#e0c080',
    'Fracture time in an area. Enemies within crawl through each second.',
    { damage: 8, cost: 22, cooldown: 18, radius: 160, duration: 5, tick: 0.5, range: 320, status: [{ id: 'chill', chance: 1, duration: 1.2 }, { id: 'freeze', chance: 0.2, duration: 1 }] },
    [['Fractured Hour', 6, { radius: 190, damage: 12 }, 'Wider.'], ['Stopped Clock', 10, { radius: 240, damage: 18, duration: 7, status: [{ id: 'freeze', chance: 0.6, duration: 1.5 }] }, 'Time halts.']],
    rank(9), 'int', { legendary: true }),
  ab('reality-distortion', 'Reality Distortion', 'forbidden', 'void', 'orbit', 'orbital', '#c080ff',
    'Fragments of broken reality orbit you, unmaking what they touch.',
    { damage: 22, cost: 24, cooldown: 16, count: 4, radius: 90, duration: 8 },
    [['Fractured World', 6, { count: 6, damage: 26 }, 'More fragments.'], ['Unmade Sky', 10, { count: 8, damage: 34, radius: 110, duration: 11 }, 'Reality bends around you.']],
    rank(10), 'mag', { legendary: true }),
];

// ═════════════════════════════ BLOODLINE ABILITIES ═════════════════════════════
// Rare (stage 2) and Legendary (stage 4) per bloodline.
const BLOODLINE: AbilityDef[] = [
  ab('bl-primordial-rare', 'First Blood', 'blood', 'blood', 'nova', 'blood', '#ff0030', 'The blood of the first king erupts from you, and every vessel nearby answers.', { damage: 36, cost: 20, cooldown: 10, radius: 160, lifesteal: 0.3, status: [{ id: 'bleed', chance: 0.8, duration: 4, power: 8 }] }, [['Grail Surge', 6, { damage: 48, radius: 200 }, 'The Grail overflows.']], bl('primordial', 2), 'aff'),
  ab('bl-primordial-leg', 'Wound of the Red Star', 'forbidden', 'star', 'zone', 'evil-moon', '#ff2040', 'You open a small Wound in the sky. The Red Star\'s light pours down.', { damage: 30, cost: 40, cooldown: 30, radius: 220, duration: 6, tick: 0.4, range: 0, lifesteal: 0.3 }, [['Sanguis Descends', 8, { damage: 42, radius: 260 }, 'The star itself.']], bl('primordial', 4), 'aff', { legendary: true }),
  ab('bl-void-rare', 'Hollow Gaze', 'forbidden', 'void', 'projectile', 'eye-target', '#7a4cff', 'Nhal\'s gaze: a bolt of nothing that erases what it touches.', { damage: 34, cost: 14, cooldown: 5, speed: 700, pierce: 8, range: 520 }, [['Eyes of the Hollow', 6, { count: 3, spread: 0.2, damage: 40 }, 'Three gazes.']], bl('void', 2), 'mag'),
  ab('bl-void-leg', 'Collapse', 'forbidden', 'void', 'zone', 'black-hole-bolas', '#5020c0', 'Space folds inward around a point, crushing everything into it.', { damage: 24, cost: 36, cooldown: 26, radius: 220, duration: 4, tick: 0.3, range: 300, knockback: -200 }, [['Event Horizon', 8, { damage: 34, radius: 260 }, 'No escape.']], bl('void', 4), 'mag', { legendary: true }),
  ab('bl-dragon-rare', 'Drake\'s Breath', 'elemental', 'fire', 'cone', 'dragon-breath', '#ff6020', 'Breathe draconic fire in a roaring cone.', { damage: 34, cost: 16, cooldown: 7, range: 220, radius: 1.3, status: [{ id: 'burn', chance: 1, duration: 4, power: 8 }] }, [['Wyrmfire', 6, { damage: 46, range: 260 }, 'Hotter than forge-fire.']], bl('dragon', 2), 'str'),
  ab('bl-dragon-leg', 'Wings of Vorr', 'physical', 'fire', 'dash', 'dragon-head', '#ff4000', 'Draconic wings unfurl; you crash down in a blast of fire.', { damage: 60, cost: 30, cooldown: 18, range: 360, knockback: 300, invulnerable: true, status: [{ id: 'burn', chance: 1, duration: 5, power: 10 }] }, [['Cataclysm Dive', 8, { damage: 85 }, 'The earth breaks.']], bl('dragon', 4), 'str', { legendary: true }),
  ab('bl-moon-rare', 'Silver Crescent', 'elemental', 'frost', 'projectile', 'moon-claws', '#d0e0ff', 'Hurl a spinning crescent of moonlight.', { damage: 26, cost: 12, cooldown: 4, speed: 480, pierce: 5, range: 420, count: 2, spread: 0.3 }, [['Twin Moons', 6, { count: 4, damage: 30 }, 'All the moons.']], bl('moon', 2), 'mag'),
  ab('bl-moon-leg', 'Ishara\'s Eclipse', 'elemental', 'frost', 'nova', 'moon-orbit', '#b0c0ff', 'The moon darkens. Your foes freeze in its shadow; you are renewed.', { damage: 40, cost: 34, cooldown: 24, radius: 260, lifesteal: 0.4, status: [{ id: 'freeze', chance: 0.6, duration: 2 }] }, [['Silver Veil Falls', 8, { damage: 56, radius: 300 }, 'Ishara\'s own eclipse.']], bl('moon', 4), 'mag', { legendary: true }),
  ab('bl-grave-rare', 'Ghoul Pack', 'necromancy', 'death', 'summon', 'shambling-zombie', '#90a070', 'Raise hungry ghouls from fresh corpses.', { damage: 14, cost: 18, cooldown: 14, count: 3, duration: 12, minion: 'ghoul' }, [['Charnel Pack', 6, { count: 5, damage: 18 }, 'A ravening pack.']], bl('grave', 2), 'wil'),
  ab('bl-grave-leg', 'Morwen\'s Lullaby', 'necromancy', 'death', 'nova', 'grave-flowers', '#a0f0c0', 'The Pale Mother\'s song. The living fall asleep; some never wake.', { damage: 50, cost: 34, cooldown: 26, radius: 240, status: [{ id: 'stun', chance: 0.8, duration: 2.5 }, { id: 'curse', chance: 1, duration: 6 }] }, [['Cradle of Graves', 8, { damage: 70 }, 'Sleep forever.']], bl('grave', 4), 'wil', { legendary: true }),
  ab('bl-royal-rare', 'Crimson Decree', 'blood', 'blood', 'nova', 'crown', '#ff3040', 'A royal command. Blood obeys, and kneels.', { damage: 24, cost: 18, cooldown: 12, radius: 180, status: [{ id: 'stun', chance: 0.7, duration: 1.5 }, { id: 'charm', chance: 0.25, duration: 5 }] }, [['Edict of Kneeling', 6, { radius: 220, status: [{ id: 'stun', chance: 1, duration: 2 }, { id: 'charm', chance: 0.4, duration: 6 }] }, 'All kneel.']], bl('royal', 2), 'cha'),
  ab('bl-royal-leg', 'Caedrith\'s Court', 'blood', 'blood', 'summon', 'throne-king', '#d4a84a', 'Summon the bound knights of the First King\'s court.', { damage: 26, cost: 40, cooldown: 30, count: 4, duration: 15, minion: 'golem' }, [['The Eternal Court', 8, { count: 6, damage: 34 }, 'An army of blood-knights.']], bl('royal', 4), 'cha', { legendary: true }),
  ab('bl-storm-rare', 'Thunderclap', 'elemental', 'storm', 'nova', 'lightning-dome', '#a0d0ff', 'A deafening thunderclap stuns everything near.', { damage: 28, cost: 14, cooldown: 8, radius: 150, knockback: 180, status: [{ id: 'stun', chance: 0.6, duration: 1 }, { id: 'shock', chance: 0.6, duration: 3 }] }, [['Heaven\'s Drum', 6, { radius: 190, damage: 36 }, 'Louder.']], bl('storm', 2), 'mag'),
  ab('bl-storm-leg', 'Eye of the Storm', 'elemental', 'storm', 'orbit', 'lightning-helix', '#80c0ff', 'You become the eye of a hurricane. Lightning orbits and lashes out.', { damage: 26, cost: 34, cooldown: 22, count: 6, radius: 110, duration: 10 }, [['Living Tempest', 8, { count: 9, damage: 34, radius: 130 }, 'You are the storm.']], bl('storm', 4), 'mag', { legendary: true }),
  ab('bl-frost-rare', 'Frozen Tomb', 'elemental', 'frost', 'zone', 'frozen-block', '#bff0ff', 'Encase an area in killing frost.', { damage: 14, cost: 16, cooldown: 11, radius: 130, duration: 4, tick: 0.5, range: 320, status: [{ id: 'freeze', chance: 0.5, duration: 1.5 }] }, [['Permafrost', 6, { radius: 170, damage: 20 }, 'It never thaws.']], bl('frost', 2), 'mag'),
  ab('bl-frost-leg', 'Absolute Zero', 'elemental', 'frost', 'nova', 'snowflake-2', '#e0ffff', 'All heat leaves the world around you.', { damage: 55, cost: 36, cooldown: 26, radius: 260, status: [{ id: 'freeze', chance: 1, duration: 2.5 }] }, [['The Long Winter', 8, { damage: 75, radius: 300 }, 'Eternal winter.']], bl('frost', 4), 'mag', { legendary: true }),
  ab('bl-dream-rare', 'Sleepwalkers', 'mental', 'mind', 'nova', 'sleepy', '#c0a0ff', 'Lull foes into a walking dream where they fight each other.', { damage: 10, cost: 16, cooldown: 14, radius: 170, status: [{ id: 'charm', chance: 0.5, duration: 5 }, { id: 'stun', chance: 0.3, duration: 1 }] }, [['Shared Dream', 6, { radius: 210, status: [{ id: 'charm', chance: 0.7, duration: 6 }] }, 'One dream for all.']], bl('dream', 2), 'int'),
  ab('bl-dream-leg', 'Nightmare Sovereign', 'mental', 'mind', 'summon', 'evil-eyes', '#8040c0', 'Your nightmares step into the waking world.', { damage: 24, cost: 36, cooldown: 26, count: 4, duration: 12, minion: 'shade' }, [['The Dreaming Dark', 8, { count: 6, damage: 32 }, 'The dark dreams of you.']], bl('dream', 4), 'int', { legendary: true }),
  ab('bl-abyssal-rare', 'Abyssal Maw', 'forbidden', 'void', 'cone', 'shark-jaws', '#600080', 'A mouth opens where there should be none.', { damage: 36, cost: 14, cooldown: 7, range: 160, radius: 1.2, lifesteal: 0.4, status: [{ id: 'curse', chance: 0.6, duration: 4 }] }, [['Endless Hunger', 6, { damage: 48, range: 200 }, 'It is never full.']], bl('abyssal', 2), 'aff'),
  ab('bl-abyssal-leg', 'Corruption Tide', 'forbidden', 'void', 'zone', 'poison-gas', '#4a0060', 'Unleash the corruption in your veins upon the world.', { damage: 26, cost: 32, cooldown: 24, radius: 230, duration: 7, tick: 0.4, range: 0, lifesteal: 0.2, status: [{ id: 'curse', chance: 1, duration: 4 }, { id: 'poison', chance: 0.6, duration: 4, power: 8 }] }, [['The Maw Opens', 8, { damage: 36, radius: 280 }, 'The abyss looks out.']], bl('abyssal', 4), 'aff', { legendary: true }),
  ab('bl-celestial-rare', 'Radiant Lance', 'forbidden', 'holy', 'projectile', 'sun-spear', '#fff0a0', 'A lance of remembered sunlight. It burns you to hold it.', { damage: 40, cost: 18, cooldown: 6, speed: 760, pierce: 10, range: 600 }, [['Seliene\'s Spear', 6, { damage: 54, count: 2, spread: 0.12 }, 'Her spear.']], bl('celestial', 2), 'wil'),
  ab('bl-celestial-leg', 'Fallen Halo', 'forbidden', 'holy', 'orbit', 'angel-outfit', '#ffe080', 'A halo of white fire circles you.', { damage: 30, cost: 36, cooldown: 24, count: 8, radius: 100, duration: 10, status: [{ id: 'burn', chance: 0.5, duration: 3, power: 8 }] }, [['Choir Ascendant', 8, { damage: 40, radius: 120 }, 'Light unending.']], bl('celestial', 4), 'wil', { legendary: true }),
  ab('bl-beast-rare', 'Pack Call', 'physical', 'physical', 'summon', 'wolf-howl', '#c0a070', 'Call wolves out of the night.', { damage: 14, cost: 16, cooldown: 14, count: 3, duration: 12, minion: 'wolf' }, [['Great Pack', 6, { count: 5, damage: 18 }, 'A great pack.']], bl('beast', 2), 'str'),
  ab('bl-beast-leg', 'Primal Fury', 'physical', 'physical', 'buff', 'beast-eye', '#ff8040', 'The beast takes over completely.', { cost: 30, cooldown: 26, duration: 12, mods: [{ stat: 'physDmg', mul: 0.6 }, { stat: 'attackSpeed', mul: 0.5 }, { stat: 'moveSpeed', mul: 0.3 }, { stat: 'lifesteal', add: 0.12 }] }, [['Vorr Unbroken', 8, { duration: 16, mods: [{ stat: 'physDmg', mul: 0.9 }, { stat: 'attackSpeed', mul: 0.7 }, { stat: 'moveSpeed', mul: 0.35 }, { stat: 'lifesteal', add: 0.18 }] }, 'The first beast.']], bl('beast', 4), 'str', { legendary: true }),
  ab('bl-shadow-rare', 'Shadow Daggers', 'shadow', 'shadow', 'projectile', 'thrown-daggers', '#7050d0', 'A fan of shadow daggers.', { damage: 16, cost: 10, cooldown: 3, speed: 620, count: 5, spread: 0.18, range: 380, status: [{ id: 'bleed', chance: 0.3, duration: 3, power: 4 }] }, [['Night\'s Fan', 6, { count: 8, damage: 19 }, 'A storm of blades.']], bl('shadow', 2), 'agi'),
  ab('bl-shadow-leg', 'Total Eclipse', 'shadow', 'shadow', 'zone', 'eclipse', '#3010a0', 'Swallow the room in absolute darkness. You see; they don\'t.', { damage: 18, cost: 34, cooldown: 26, radius: 280, duration: 8, tick: 0.5, range: 0, status: [{ id: 'fear', chance: 0.4, duration: 2 }, { id: 'curse', chance: 0.6, duration: 3 }] }, [['Endless Night', 8, { damage: 26, radius: 320 }, 'Night without end.']], bl('shadow', 4), 'agi', { legendary: true }),
  ab('bl-weaver-rare', 'Blood Loom', 'blood', 'blood', 'orbit', 'spinning-wheel', '#ff4060', 'Threads of blood spin around you, cutting.', { damage: 16, cost: 14, cooldown: 11, count: 5, radius: 85, duration: 8, status: [{ id: 'bleed', chance: 0.5, duration: 3, power: 5 }] }, [['Crimson Tapestry', 6, { count: 8, damage: 20 }, 'A full tapestry.']], bl('weaver', 2), 'aff'),
  ab('bl-weaver-leg', 'Hemomantic Construct', 'blood', 'blood', 'summon', 'golem-head', '#c00030', 'Weave a towering golem of living blood.', { damage: 40, cost: 40, cooldown: 30, count: 1, duration: 18, minion: 'golem' }, [['Colossus of Veins', 8, { count: 2, damage: 52 }, 'Two colossi.']], bl('weaver', 4), 'aff', { legendary: true }),
  ab('bl-time-rare', 'Rewind', 'forbidden', 'void', 'buff', 'backward-time', '#e0c080', 'Turn back your own wounds a few heartbeats.', { cost: 20, cooldown: 20, duration: 3, mods: [{ stat: 'hpRegen', add: 30 }, { stat: 'cooldownRate', mul: 1.0 }] }, [['Second Chance', 6, { duration: 4, mods: [{ stat: 'hpRegen', add: 45 }, { stat: 'cooldownRate', mul: 1.5 }] }, 'Again.']], bl('time', 2), 'int'),
  ab('bl-time-leg', 'The Stopped Hour', 'forbidden', 'void', 'nova', 'stopwatch', '#ffd090', 'Stop time for everything but yourself.', { damage: 20, cost: 44, cooldown: 34, radius: 900, status: [{ id: 'freeze', chance: 1, duration: 3.5 }] }, [['Not Yet', 8, { damage: 30, status: [{ id: 'freeze', chance: 1, duration: 5 }] }, 'The hour waits for you.']], bl('time', 4), 'int', { legendary: true }),
  ab('bl-soul-rare', 'Soul Siphon', 'necromancy', 'death', 'drain', 'soul-vessel', '#80ffe0', 'Draw out souls themselves.', { damage: 18, cost: 0, cooldown: 9, count: 3, range: 240, duration: 2.5, lifesteal: 0.4 }, [['Soul Feast', 6, { count: 5, damage: 22 }, 'A feast of souls.']], bl('soul', 2), 'wil'),
  ab('bl-soul-leg', 'Lantern of Souls', 'necromancy', 'death', 'orbit', 'lantern-flame', '#a0ffe0', 'The souls you have taken circle you as burning lights.', { damage: 26, cost: 32, cooldown: 22, count: 7, radius: 100, duration: 12 }, [['Thousand Lights', 8, { count: 10, damage: 32 }, 'Every soul you ever took.']], bl('soul', 4), 'wil', { legendary: true }),
  ab('bl-venom-rare', 'Viper Spit', 'elemental', 'venom', 'projectile', 'snake-bite', '#80ff40', 'Spit a gobbet of venom that splashes and eats armor.', { damage: 14, cost: 8, cooldown: 2.5, speed: 500, count: 3, spread: 0.25, range: 360, status: [{ id: 'poison', chance: 1, duration: 5, power: 5 }] }, [['Basilisk Spit', 6, { count: 5, damage: 18 }, 'More venom.']], bl('venom', 2), 'int'),
  ab('bl-venom-leg', 'Plaguebloom', 'elemental', 'venom', 'zone', 'poison-cloud', '#60c020', 'A vast blossom of poison opens.', { damage: 16, cost: 32, cooldown: 24, radius: 240, duration: 8, tick: 0.4, range: 300, status: [{ id: 'poison', chance: 1, duration: 5, power: 9 }, { id: 'weaken', chance: 0.6, duration: 4 }] }, [['Garden of Ends', 8, { damage: 22, radius: 280 }, 'Every garden ends.']], bl('venom', 4), 'int', { legendary: true }),
  ab('bl-life-rare', 'Vital Bloom', 'blood', 'blood', 'buff', 'heart-plus', '#ff8090', 'Your blood overflows with life.', { cost: 16, cooldown: 16, duration: 8, mods: [{ stat: 'hpRegen', add: 10 }, { stat: 'lifesteal', add: 0.1 }] }, [['Wellspring', 6, { duration: 10, mods: [{ stat: 'hpRegen', add: 16 }, { stat: 'lifesteal', add: 0.15 }] }, 'An endless spring.']], bl('life', 2), 'rgn'),
  ab('bl-life-leg', 'Undying Heart', 'blood', 'blood', 'shield', 'heart-tower', '#ff5070', 'A shield of pure vitality that heals as it breaks.', { cost: 34, cooldown: 26, absorb: 180, duration: 10, mods: [{ stat: 'hpRegen', add: 12 }] }, [['Heart Eternal', 8, { absorb: 260, mods: [{ stat: 'hpRegen', add: 20 }] }, 'It does not stop beating.']], bl('life', 4), 'rgn', { legendary: true }),
  ab('bl-mirror-rare', 'Reflection', 'mental', 'mind', 'shield', 'mirror-mirror', '#e0e8ff', 'A mirror-skin that turns harm back on its source.', { cost: 14, cooldown: 12, absorb: 50, duration: 5, mods: [{ stat: 'armor', add: 20 }] }, [['Glass Court', 6, { absorb: 80 }, 'More mirrors.']], bl('mirror', 2), 'cha'),
  ab('bl-mirror-leg', 'Thousand Selves', 'mental', 'mind', 'summon', 'shinto-shrine-mirror', '#c0d0ff', 'Every reflection of you steps out at once.', { damage: 20, cost: 38, cooldown: 28, count: 6, duration: 12, minion: 'mirror' }, [['Who Was Many', 8, { count: 9, damage: 26 }, 'There is no original.']], bl('mirror', 4), 'cha', { legendary: true }),
  ab('bl-star-rare', 'Starfall', 'forbidden', 'star', 'zone', 'falling-star', '#c9b8ff', 'Call down a cluster of falling stars.', { damage: 22, cost: 18, cooldown: 9, radius: 120, duration: 2, tick: 0.3, range: 360, status: [{ id: 'burn', chance: 0.4, duration: 3, power: 6 }] }, [['Meteor Shower', 6, { damage: 28, radius: 150 }, 'Heavier stars.']], bl('star', 2), 'mag'),
  ab('bl-star-leg', 'Constellation', 'forbidden', 'star', 'orbit', 'star-formation', '#e0d0ff', 'A constellation forms around you, every star a blade.', { damage: 32, cost: 38, cooldown: 26, count: 7, radius: 120, duration: 12 }, [['The Sky Entire', 8, { count: 10, damage: 40 }, 'All the stars of Eryndor.']], bl('star', 4), 'mag', { legendary: true }),
];

// ═════════════════════════════ HIDDEN (discovered in the world) ═════════════════════════════
const HIDDEN: AbilityDef[] = [
  ab('secret-crimson-requiem', 'Crimson Requiem', 'blood', 'blood', 'nova', 'musical-notes', '#ff2050', 'A dirge written in blood by a mad Veyrath composer. Played, it bursts every vein in earshot.', { damage: 60, cost: 30, cooldown: 22, radius: 260, status: [{ id: 'bleed', chance: 1, duration: 5, power: 10 }] }, [['Requiem Eternal', 6, { damage: 80 }, 'The final movement.']], disc('sec-requiem-score'), 'aff', { hidden: true, legendary: true }),
  ab('secret-umbral-eclipse', 'Umbral Eclipse', 'shadow', 'shadow', 'orbit', 'eclipse-flare', '#5030c0', 'Learned from a mural that moves when no one looks: black suns that orbit and devour.', { damage: 30, cost: 26, cooldown: 18, count: 3, radius: 120, duration: 10, status: [{ id: 'curse', chance: 0.5, duration: 3 }] }, [['Three Black Suns', 6, { damage: 40, count: 4 }, 'A fourth sun rises.']], disc('sec-eclipse-mural'), 'mag', { hidden: true }),
  ab('secret-moonfang', 'Moonfang', 'physical', 'frost', 'dash', 'moon-claws', '#d0e0ff', 'The Wolfkin\'s oath-strike, taught only to those they trust.', { damage: 45, cost: 14, cooldown: 7, range: 300, invulnerable: true, status: [{ id: 'bleed', chance: 1, duration: 4, power: 8 }] }, [['Silver Fang', 6, { damage: 60 }, 'The oath fulfilled.']], disc('sec-wolf-oath'), 'agi', { hidden: true }),
  ab('secret-choir-of-bones', 'Choir of Bones', 'necromancy', 'death', 'summon', 'skeleton', '#e0d8b0', 'A hymn that raises an entire ossuary to sing — and kill.', { damage: 16, cost: 30, cooldown: 24, count: 8, duration: 12, minion: 'skeleton' }, [['Grand Ossuary', 6, { count: 12, damage: 20 }, 'Every bone sings.']], disc('sec-ossuary-hymn'), 'wil', { hidden: true }),
  ab('secret-cinder-crown', 'Cinder Crown', 'elemental', 'fire', 'orbit', 'flaming-trident', '#ff8030', 'A crown of burning ash once worn by an Empress.', { damage: 28, cost: 24, cooldown: 18, count: 5, radius: 95, duration: 10, status: [{ id: 'burn', chance: 0.8, duration: 4, power: 8 }] }, [['Ashen Diadem', 6, { damage: 38, count: 7 }, 'The Empress\'s full crown.']], disc('sec-ash-tablet'), 'mag', { hidden: true }),
  ab('secret-glacial-heart', 'Glacial Heart', 'elemental', 'frost', 'shield', 'frozen-orb', '#d0ffff', 'A heart frozen a thousand years. Wear its cold as armor.', { cost: 20, cooldown: 18, absorb: 120, duration: 8, mods: [{ stat: 'res_fire', add: 0.3 }, { stat: 'armor', add: 30 }] }, [['Heart of Winter', 6, { absorb: 180 }, 'Colder still.']], disc('sec-frozen-heart'), 'end', { hidden: true }),
  ab('secret-falling-sky', 'The Falling Sky', 'forbidden', 'star', 'zone', 'meteor-impact', '#e0c0ff', 'A star-chart that, read aloud, drags the sky down.', { damage: 70, cost: 40, cooldown: 28, radius: 200, duration: 1, tick: 0.5, range: 360, status: [{ id: 'stun', chance: 1, duration: 1.5 }] }, [['Heaven\'s Collapse', 6, { damage: 95, radius: 240 }, 'The whole sky.']], disc('sec-starchart'), 'mag', { hidden: true, legendary: true }),
  ab('secret-name-unwritten', 'The Name Unwritten', 'forbidden', 'void', 'nova', 'scroll-unfurled', '#ffffff', 'Speak the erased name of the Seventh. What hears it ceases to have been.', { damage: 120, cost: 50, cooldown: 45, radius: 300, status: [{ id: 'stun', chance: 1, duration: 2 }, { id: 'curse', chance: 1, duration: 8 }] }, [['Unwriting', 6, { damage: 160 }, 'It was never there.']], disc('sec-unwritten-page'), 'int', { hidden: true, legendary: true }),
];

// ═════════════════════════════ FUSION ABILITIES ═════════════════════════════
const FUSION: AbilityDef[] = [
  ab('fu-shadow-hemomancy', 'Shadow Hemomancy', 'forbidden', 'shadow', 'projectile', 'bloody-stash', '#8a1050', 'Blood that has learned the dark: black-red spears that pass through walls of flesh.', { damage: 30, cost: 12, cooldown: 3, speed: 600, count: 4, spread: 0.18, pierce: 6, range: 460, status: [{ id: 'bleed', chance: 0.6, duration: 4, power: 7 }, { id: 'curse', chance: 0.3, duration: 3 }] }, [['Night-Blood Sovereignty', 6, { count: 6, damage: 38 }, 'Dark blood rules.']], fus('fusion-shadow-hemomancy'), 'aff'),
  ab('fu-tempest-dragon', 'Tempest Dragon', 'elemental', 'storm', 'cone', 'dragon-spiral', '#ffd040', 'Breath of storm-fire — lightning and flame in one roar.', { damage: 46, cost: 20, cooldown: 7, range: 260, radius: 1.4, status: [{ id: 'burn', chance: 0.8, duration: 4, power: 8 }, { id: 'shock', chance: 0.8, duration: 3 }] }, [['Skywyrm', 6, { damage: 62, range: 300 }, 'The dragon of the storm.']], fus('fusion-tempest-dragon'), 'mag'),
  ab('fu-soul-necromancy', 'Soul Necromancy', 'necromancy', 'death', 'summon', 'haunting', '#60ffc0', 'Bind souls into their own corpses — revenants loyal beyond death.', { damage: 24, cost: 26, cooldown: 18, count: 4, duration: 16, minion: 'spirit' }, [['Lord of Revenants', 6, { count: 6, damage: 30 }, 'A host bound twice.']], fus('fusion-soul-necromancy'), 'wil'),
  ab('fu-lunar-beast', 'Lunar Beast', 'physical', 'frost', 'buff', 'werewolf', '#c0d0ff', 'Under the moon, the beast in you becomes something else — silver and terrible.', { cost: 24, cooldown: 22, duration: 12, mods: [{ stat: 'physDmg', mul: 0.5 }, { stat: 'moveSpeed', mul: 0.3 }, { stat: 'hpRegen', add: 8 }, { stat: 'res_frost', add: 0.4 }] }, [['Silver Alpha', 6, { duration: 16 }, 'Leader of every pack.']], fus('fusion-lunar-beast'), 'str'),
  ab('fu-frozen-hour', 'Frozen Hour', 'forbidden', 'frost', 'zone', 'frozen-ring', '#c0f0ff', 'Cold so total that time itself freezes.', { damage: 22, cost: 30, cooldown: 20, radius: 200, duration: 5, tick: 0.4, range: 320, status: [{ id: 'freeze', chance: 0.7, duration: 2 }] }, [['Glacial Eternity', 6, { damage: 30, radius: 240 }, 'Forever, frozen.']], fus('fusion-frozen-hour'), 'int'),
  ab('fu-dream-void', 'Void Dreaming', 'forbidden', 'void', 'blink', 'portal', '#a060ff', 'Step into a dream of the void and wake behind your enemy.', { damage: 40, cost: 14, cooldown: 5, range: 380, radius: 120, invulnerable: true, status: [{ id: 'fear', chance: 0.6, duration: 2 }] }, [['Hollow Dream', 6, { damage: 54 }, 'The void dreams of you.']], fus('fusion-dream-void'), 'int'),
  ab('fu-radiant-blood', 'Radiant Blood', 'blood', 'holy', 'nova', 'sun-radiations', '#ffb080', 'Royal blood and celestial fire — the Sovereign\'s light that does not burn its master.', { damage: 50, cost: 26, cooldown: 14, radius: 200, lifesteal: 0.3, status: [{ id: 'burn', chance: 0.6, duration: 4, power: 8 }] }, [['Dawn Sovereign', 6, { damage: 68, radius: 240 }, 'The first sunrise in eighteen centuries.']], fus('fusion-radiant-blood'), 'cha'),
  ab('fu-venom-life', 'Verdant Plague', 'elemental', 'venom', 'drain', 'vine-flower', '#a0ff60', 'Life and poison twined: you drink health as your foes drink death.', { damage: 22, cost: 0, cooldown: 8, count: 4, range: 260, duration: 3, lifesteal: 0.7, status: [{ id: 'poison', chance: 1, duration: 4, power: 6 }] }, [['Garden of Life', 6, { count: 6, damage: 28 }, 'All living things.']], fus('fusion-venom-life'), 'rgn'),
  ab('fu-star-void', 'Cosmic Rift', 'forbidden', 'star', 'zone', 'galaxy', '#a080ff', 'A tear in the sky through which the stars pour.', { damage: 30, cost: 36, cooldown: 22, radius: 220, duration: 5, tick: 0.3, range: 340, knockback: -120 }, [['Galaxy Mouth', 6, { damage: 42, radius: 260 }, 'Galaxies swallow them.']], fus('fusion-star-void'), 'mag'),
  ab('fu-mirror-shadow', 'Shade Mirrors', 'shadow', 'shadow', 'summon', 'mirror-mirror', '#6050a0', 'Your shadow\'s reflections — clones that strike and blind.', { damage: 22, cost: 24, cooldown: 16, count: 5, duration: 12, minion: 'shade' }, [['Endless Hall', 6, { count: 7, damage: 28 }, 'Mirrors in the dark.']], fus('fusion-mirror-shadow'), 'agi'),
];

/** Form-entering abilities (one per transformation). */
const FORMS: AbilityDef[] = [];

export const ABILITIES: AbilityDef[] = [...BLOOD, ...SHADOW, ...NECRO, ...ELEMENTAL, ...MENTAL, ...PHYSICAL, ...FORBIDDEN, ...BLOODLINE, ...HIDDEN, ...FUSION, ...FORMS];

export const ABILITY_BY_ID: Record<string, AbilityDef> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
