/**
 * SANGUINIS — core data schemas.
 * Every content file in src/game/data conforms to these types; the engine and
 * systems read them. Keep these stable: content is authored against them.
 */

// ───────────────────────── Attributes & modifiers ─────────────────────────

/** The ten primary attributes. */
export type PrimaryStat =
  | 'str' // Strength — physical damage
  | 'agi' // Agility — attack speed, move speed, crit
  | 'int' // Intelligence — research, mastery gain, cooldowns
  | 'end' // Endurance — max HP, armor
  | 'wil' // Willpower — status resistance, max blood, curse resistance
  | 'per' // Perception — crit chance, secret detection, loot luck
  | 'aff' // Blood Affinity — blood gained from feeding, blood ability power
  | 'mag' // Magical Power — spell damage
  | 'rgn' // Regeneration — HP regen, healing received
  | 'cha'; // Charisma — political influence, prices

export const PRIMARY_STATS: PrimaryStat[] = ['str', 'agi', 'int', 'end', 'wil', 'per', 'aff', 'mag', 'rgn', 'cha'];

/** Secondary stats, derived from primaries + bloodlines + gear + effects. */
export type DerivedStat =
  | 'maxHp'
  | 'maxBlood'
  | 'hpRegen' // HP per second
  | 'physDmg' // multiplier, 1 = base
  | 'spellDmg' // multiplier
  | 'bloodDmg' // multiplier for blood-element abilities
  | 'attackSpeed' // multiplier
  | 'moveSpeed' // multiplier
  | 'critChance' // 0..1
  | 'critMult' // e.g. 1.5
  | 'armor' // flat; reduction = armor/(armor+100)
  | 'lifesteal' // fraction of damage dealt returned as HP
  | 'cooldownRate' // multiplier on cooldown recovery speed
  | 'costMult' // multiplier on blood costs
  | 'hungerRate' // multiplier on passive hunger drain
  | 'feedPower' // multiplier on blood gained when feeding
  | 'stealth' // 0..1, enemies notice you later
  | 'statusPower' // multiplier on status durations you apply
  | 'statusResist' // 0..1
  | 'influence' // flat political influence per night
  | 'research' // multiplier on crafting discovery / mastery
  | 'goldFind' // multiplier
  | 'lootLuck' // multiplier on rarity rolls
  | 'sunResist' // 0..1 reduction of sunlight damage
  | ResistStat;

export type Element =
  | 'physical'
  | 'blood'
  | 'shadow'
  | 'fire'
  | 'frost'
  | 'storm'
  | 'holy'
  | 'death'
  | 'void'
  | 'venom'
  | 'mind'
  | 'star';

export type ResistStat = `res_${Element}`;

export type StatKey = PrimaryStat | DerivedStat;

/** A stat change. `add` is applied before `mul` (mul: 0.1 means +10%). */
export interface Modifier {
  stat: StatKey;
  add?: number;
  mul?: number;
}

// ───────────────────────── Status effects ─────────────────────────

export type StatusId =
  | 'bleed' // DoT, physical/blood
  | 'burn' // DoT, fire
  | 'chill' // slow 40%
  | 'freeze' // rooted
  | 'shock' // next hit arcs to a neighbour
  | 'fear' // flees from player
  | 'charm' // fights for the player
  | 'poison' // DoT, stacks
  | 'curse' // takes +25% damage
  | 'stun' // cannot act
  | 'weaken'; // deals -30% damage

export interface StatusApply {
  id: StatusId;
  /** chance 0..1 */
  chance: number;
  /** seconds */
  duration: number;
  /** DoT damage per second where applicable */
  power?: number;
}

// ───────────────────────── Abilities ─────────────────────────

export type AbilitySchool = 'blood' | 'shadow' | 'necromancy' | 'elemental' | 'mental' | 'physical' | 'forbidden';

/** Engine behaviours. Every ability uses exactly one kind. */
export type AbilityKind =
  | 'projectile' // fires `count` bolts toward the aim direction
  | 'nova' // burst around the caster
  | 'cone' // arc in front of the caster
  | 'dash' // fast movement in aim direction, damaging along the path
  | 'blink' // teleport toward aim up to `range`, burst on arrival
  | 'zone' // lingering ground area at the target point
  | 'chain' // arcs between up to `count` enemies
  | 'summon' // spawns allied minions
  | 'shield' // damage absorption barrier
  | 'buff' // timed self modifiers
  | 'drain' // tether(s) to nearest enemies, steals HP and blood
  | 'orbit' // orbs circling the caster
  | 'transform'; // enter a form (see FormDef)

export type MinionType = 'bat' | 'ghoul' | 'spirit' | 'shade' | 'golem' | 'wolf' | 'skeleton' | 'mirror';

export interface AbilityParams {
  damage?: number; // base damage per hit
  cost?: number; // blood cost
  cooldown?: number; // seconds
  range?: number; // px (world units; a tile is 32)
  radius?: number; // px
  count?: number; // projectiles / chain jumps / minions / orbs / tethers
  speed?: number; // projectile speed px/s
  spread?: number; // radians between projectiles
  pierce?: number; // enemies passed through
  duration?: number; // seconds for zones, buffs, shields, summons, orbits
  tick?: number; // seconds between zone ticks
  absorb?: number; // shield amount
  lifesteal?: number; // fraction of damage healed
  knockback?: number; // px impulse
  homing?: number; // 0..1 turn rate
  status?: StatusApply[];
  mods?: Modifier[]; // buff modifiers
  minion?: MinionType;
  form?: FormId;
  invulnerable?: boolean; // dash/blink grants i-frames
}

export interface AbilityTier {
  /** Name of the evolved ability at this tier, e.g. "Crimson Spears". */
  name: string;
  /** Mastery level required (1..10). Tier 0 always starts at 1. */
  mastery: number;
  /** Param overrides merged over the base params. */
  params: Partial<AbilityParams>;
  note: string;
}

/** A bloodline-specific evolution: if the heir carries `bloodline` expressed, the ability mutates. */
export interface AbilityVariant {
  bloodline: BloodlineId;
  name: string;
  element: Element;
  params: Partial<AbilityParams>;
  note: string;
}

export type AbilityUnlock =
  | { type: 'start' }
  | { type: 'rank'; rank: number }
  | { type: 'bloodline'; bloodline: BloodlineId; stage: number }
  | { type: 'house'; house: HouseId }
  | { type: 'fusion'; fusion: string }
  | { type: 'discovery'; secret: string } // hidden — found in the world, never bought
  | { type: 'skillpoints'; points: number; requires?: string[] };

export interface AbilityDef {
  id: string;
  name: string;
  school: AbilitySchool;
  element: Element;
  kind: AbilityKind;
  icon: string; // game-icons name
  color: string; // hex, VFX tint
  description: string;
  params: AbilityParams;
  /** Evolution chain (tier 0 = base). */
  tiers: AbilityTier[];
  variants?: AbilityVariant[];
  unlock: AbilityUnlock;
  /** Per mastery level: multiplier added to damage (e.g. 0.08 = +8%/level). */
  scaling: { stat: PrimaryStat; perPoint: number; masteryDamage: number };
  hidden?: boolean;
  legendary?: boolean;
}

// ───────────────────────── Forms (transformations) ─────────────────────────

export type FormId =
  | 'human'
  | 'true'
  | 'predator'
  | 'shadow'
  | 'mist'
  | 'bat'
  | 'monarch'
  | 'ancient'
  | 'primordial'
  | 'wolf'
  | 'wraith'
  | 'ember';

export interface FormDef {
  id: FormId;
  name: string;
  icon: string;
  color: string;
  description: string;
  /** Blood drained per second while in form. */
  upkeep: number;
  duration: number; // max seconds, 0 = until toggled off
  cooldown: number;
  mods: Modifier[];
  /** Gameplay flags the engine honours. */
  flags: Array<'noAttack' | 'phasing' | 'flying' | 'unseen' | 'aura' | 'bigger' | 'drainAura' | 'burnAura'>;
  drawback: string;
  requirement:
    | { type: 'start' }
    | { type: 'rank'; rank: number }
    | { type: 'bloodline'; bloodline: BloodlineId; stage: number }
    | { type: 'any'; of: Array<{ type: 'rank'; rank: number } | { type: 'bloodline'; bloodline: BloodlineId; stage: number }> };
}

// ───────────────────────── Bloodlines ─────────────────────────

export type BloodlineId =
  | 'primordial'
  | 'void'
  | 'dragon'
  | 'moon'
  | 'grave'
  | 'royal'
  | 'storm'
  | 'frost'
  | 'dream'
  | 'abyssal'
  | 'celestial'
  | 'beast'
  | 'shadow'
  | 'weaver'
  | 'time'
  | 'soul'
  | 'venom'
  | 'life'
  | 'mirror'
  | 'star';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'divine' | 'primordial';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical', 'divine', 'primordial'];

export type BloodType = 'common' | 'noble' | 'beast' | 'magical' | 'ancient' | 'royal' | 'corrupted' | 'primordial' | 'holy' | 'spectral';

export interface BloodlineStage {
  /** 0 Dormant/Latent → 1 Stirring → 2 Awakened → 3 Ascendant → 4 Apotheosis */
  name: string;
  /** Requirements to reach this stage. */
  requires: {
    potency?: number; // gene potency 0..100
    rank?: number;
    bloodConsumed?: Partial<Record<BloodType, number>>; // feeding counts while this heir lives
    quest?: string;
    purity?: number; // 0..100
  };
  mods: Modifier[];
  unlocks: string[]; // ability ids / form ids (prefixed "form:")
}

export interface BloodlineDef {
  id: BloodlineId;
  name: string;
  epithet: string;
  rarity: Rarity;
  element: Element;
  color: string;
  icon: string;
  description: string;
  lore: string;
  /** 0..1 — how strongly this gene expresses over others when inherited. */
  dominance: number;
  /** Base chance per inheritance roll to arise spontaneously via mutation. */
  mutationWeight: number;
  stages: BloodlineStage[]; // exactly 5, index = stage
  weakness: { text: string; mods: Modifier[] };
  incompatible: BloodlineId[];
  hidden: { abilityId: string; condition: string };
  /** Which blood types resonate (feeding them grants double awakening progress). */
  resonance: BloodType[];
}

export interface FusionDef {
  id: string;
  name: string;
  a: BloodlineId;
  b: BloodlineId;
  /** Both genes must be expressed at least at this stage. */
  minStage: number;
  description: string;
  abilityId: string;
  mods: Modifier[];
}

/** A random mutation that can appear in an heir's genome. */
export interface MutationDef {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  mods: Modifier[];
  /** Positive, negative, or mixed — negative ones come from instability. */
  nature: 'boon' | 'bane' | 'mixed';
  icon: string;
}

// ───────────────────────── Noble houses ─────────────────────────

export type HouseId = string;

export interface HouseDef {
  id: HouseId; // kebab-case, e.g. "veyrath"
  name: string; // "House Veyrath"
  title: string; // "The Crimson Sovereigns"
  crest: string; // game-icons name
  colors: [string, string]; // primary, secondary hex
  motto: string;
  founder: string;
  founded: number; // year (Age of Night reckoning, see lore timeline; negative = before the Sundering)
  history: string; // 3-5 sentences
  traditions: string[];
  hierarchy: string[]; // ranks within the house, highest first
  bloodlines: BloodlineId[]; // 1-2 associated bloodlines (spouses from this house carry these genes)
  specialty: string;
  signature: AbilityDef; // the house signature ability
  passive: { name: string; mods: Modifier[] };
  weakness: { name: string; mods: Modifier[] };
  influence: number; // starting political power 1..100
  territory: string[]; // region ids from data/regions.ts
  alliances: HouseId[];
  rivals: HouseId[];
  secret: string; // revealed by espionage
  legends: Array<{ name: string; deed: string }>;
  ritual: { name: string; description: string };
  /** A short house questline — 3 steps. */
  quest: { name: string; summary: string; steps: QuestObjective[]; reward: QuestReward };
  uniqueItem: ItemTemplate;
  temperament: 'honorable' | 'scheming' | 'zealous' | 'proud' | 'reclusive' | 'ambitious' | 'mercenary';
}

// ───────────────────────── Items ─────────────────────────

export type ItemSlot = 'weapon' | 'armor' | 'cloak' | 'ring' | 'amulet' | 'relic';
export type ItemCategory = ItemSlot | 'consumable' | 'material' | 'artifact';

export type WeaponType = 'claws' | 'sword' | 'scythe' | 'dagger' | 'crossbow' | 'staff' | 'whip' | 'greatsword';

export interface ItemTemplate {
  id: string;
  name: string;
  category: ItemCategory;
  weaponType?: WeaponType;
  icon: string;
  rarity: Rarity;
  description: string;
  /** Base modifiers before rarity scaling and affixes. */
  mods: Modifier[];
  /** For weapons: base damage and element. */
  damage?: number;
  element?: Element;
  /** Special effect, implemented by id in systems/itemEffects.ts. */
  effect?: string;
  value: number; // base crowns
  /** For consumables: what using it does. */
  use?: { heal?: number; blood?: number; buff?: Modifier[]; duration?: number; cleanse?: boolean; purity?: number };
  setId?: string;
  minLevel?: number;
}

// ───────────────────────── Quests ─────────────────────────

export type QuestObjective =
  | { type: 'kill'; tag: string; count: number; text: string } // enemy tag or creature id
  | { type: 'boss'; boss: string; text: string }
  | { type: 'depth'; region: string; floor: number; text: string }
  | { type: 'feed'; blood: BloodType | 'any'; count: number; text: string }
  | { type: 'collect'; item: string; count: number; text: string }
  | { type: 'standing'; house: HouseId; value: number; text: string }
  | { type: 'rank'; rank: number; text: string }
  | { type: 'own'; region: string; text: string }
  | { type: 'craft'; recipe: string; text: string }
  | { type: 'secret'; secret: string; text: string }
  | { type: 'gold'; amount: number; text: string } // pay
  | { type: 'night'; nights: number; text: string }; // wait

export interface QuestReward {
  gold?: number;
  xp?: number;
  standing?: Array<{ house: HouseId; value: number }>;
  items?: string[]; // item template ids
  ability?: string;
  title?: string;
  prestige?: number;
  materials?: Array<{ id: string; count: number }>;
}

export interface QuestChoice {
  text: string;
  /** Outcome text shown after choosing. */
  outcome: string;
  effects: QuestReward & { flag?: string; corruption?: number; purity?: number };
}

export interface QuestDef {
  id: string;
  name: string;
  category: 'main' | 'house' | 'bloodline' | 'personal' | 'political' | 'exploration' | 'dungeon' | 'legendary' | 'hidden' | 'repeatable';
  giver: string;
  summary: string;
  objectives: QuestObjective[];
  reward: QuestReward;
  /** Optional branching decision presented on completion. */
  choice?: { prompt: string; options: QuestChoice[] };
  requires?: { quests?: string[]; flags?: string[]; rank?: number; notFlags?: string[] };
  next?: string[];
}

// ───────────────────────── World ─────────────────────────

export type Biome = 'castle' | 'crypt' | 'forest' | 'catacomb' | 'ash' | 'frost' | 'cathedral' | 'swamp' | 'abyss' | 'library' | 'ruins' | 'astral';

export interface RegionDef {
  id: string;
  name: string;
  biome: Biome;
  description: string;
  lore: string;
  /** x,y on the world map, 0..100. */
  pos: [number, number];
  level: number; // recommended rank-scaled difficulty 1..10
  floors: number; // dungeon depth including boss floor
  dungeon: { name: string; description: string };
  enemies: string[]; // creature ids
  miniboss: string; // creature id
  boss: string; // boss id
  resources: Array<'blood' | 'gold' | 'iron' | 'herbs' | 'relics' | 'souls' | 'silver' | 'ash' | 'ice' | 'starmetal'>;
  population: number;
  defense: number;
  bonus: { name: string; mods: Modifier[] };
  secrets: string[]; // secret ids found here
  adjacent: string[];
}

export type EnemyBehavior =
  | 'chaser' // runs at you, melee
  | 'brute' // slow, heavy telegraphed slam
  | 'charger' // winds up then charges in a line
  | 'archer' // keeps distance, fires projectiles
  | 'caster' // keeps distance, casts zone/novas
  | 'swarm' // fast, weak, erratic
  | 'phantom' // phases through walls, blinks
  | 'summoner' // calls minions
  | 'sentinel' // stationary turret
  | 'stalker'; // invisible until close, ambush

export interface CreatureDef {
  id: string;
  name: string;
  family: 'beast' | 'undead' | 'spirit' | 'demon' | 'construct' | 'human' | 'vampire' | 'fey' | 'dragon' | 'aberration' | 'celestial' | 'werebeast';
  lore: string;
  appearance: string;
  behavior: EnemyBehavior;
  /** Visual description for the procedural renderer. */
  look: { shape: 'humanoid' | 'beast' | 'blob' | 'flyer' | 'wisp' | 'spider' | 'serpent' | 'knight'; color: string; accent: string; size: number /* radius px, 9..30 */ };
  hp: number; // at level 1
  damage: number;
  speed: number; // px/s, 50..220
  armor: number;
  element: Element;
  weak: Element[];
  resist: Element[];
  abilities: string[]; // flavor names of its attacks
  rarity: Rarity;
  habitat: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  drops: Array<{ id: string; chance: number }>; // material/item ids
  blood: BloodType;
  xp: number;
  tags: string[];
  special?: string; // behaviour note
}

export type BossPattern =
  | 'ring' // bullet ring
  | 'spiral' // rotating bullet spiral
  | 'charge' // telegraphed charge
  | 'slam' // big AoE at its feet, telegraphed
  | 'summon' // spawns adds
  | 'rain' // targeted AoE circles around the player
  | 'beam' // sweeping line
  | 'teleport' // blinks next to player
  | 'drain' // pulls the player, drains blood
  | 'clones' // fake copies
  | 'fan' // projectile fan at player
  | 'pillars' // safe zones vs room-wide blast
  | 'sunlight'; // holy light shafts sweep the room

export interface BossDef {
  id: string;
  name: string;
  title: string;
  lore: string;
  look: CreatureDef['look'];
  hp: number;
  damage: number;
  speed: number;
  armor: number;
  element: Element;
  weak: Element[];
  resist: Element[];
  /** Phases trigger at HP fractions (first phase at 1.0). */
  phases: Array<{ at: number; name: string; patterns: BossPattern[]; speedMul: number; line: string }>;
  drops: Array<{ id: string; chance: number }>;
  blood: BloodType;
  xp: number;
  legendary?: boolean;
  achievement: string;
}

export interface SecretDef {
  id: string;
  name: string;
  kind: 'lore' | 'sanctuary' | 'ability' | 'recipe' | 'quest' | 'treasure';
  text: string;
  /** What finding it grants. */
  grants?: { ability?: string; recipe?: string; quest?: string; item?: string; potency?: { bloodline: BloodlineId; amount: number } };
}

export interface CodexEntry {
  id: string;
  title: string;
  category: 'history' | 'myth' | 'faith' | 'law' | 'culture' | 'artifact' | 'prophecy' | 'place' | 'figure' | 'phenomenon';
  body: string; // multi-paragraph, \n\n separated
  unlockedBy?: string; // secret id; undefined = known from the start
}

export interface TimelineEvent {
  year: number;
  era: string;
  title: string;
  text: string;
}

export interface WorldEventDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  lore: string;
  durationNights: number;
  weight: number; // relative chance
  /** Mechanical effects while active. */
  effects: {
    playerMods?: Modifier[];
    enemyHpMul?: number;
    enemyDmgMul?: number;
    bloodTypeBoost?: BloodType; // more of this blood drops
    priceMul?: Partial<Record<string, number>>; // commodity id -> multiplier
    goldMul?: number;
    xpMul?: number;
    region?: 'random'; // effect targets one region
    bossOverride?: string; // boss id appears in the targeted region
    houseEvent?: 'rebellion' | 'coronation' | 'succession' | 'tournament';
    corruptionChance?: number;
  };
}

export interface RecipeDef {
  id: string;
  name: string;
  station: 'alchemy' | 'forge' | 'enchant' | 'runes' | 'restoration' | 'bloodlab';
  inputs: Array<{ id: string; count: number }>; // material ids, or "blood:<type>"
  gold: number;
  output: { item?: string; count?: number; affix?: string; potency?: number; purity?: number };
  /** If true, must be discovered (experimentation / secrets) before it appears. */
  hidden?: boolean;
  research?: number; // research points required to learn
  description: string;
}

export interface MaterialDef {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  description: string;
  value: number;
  /** Alchemical properties used for experimentation discoveries. */
  essence: Array<'vital' | 'umbral' | 'igneous' | 'glacial' | 'tempest' | 'sacred' | 'profane' | 'mineral' | 'arcane' | 'toxic' | 'astral'>;
}

export interface AchievementDef {
  id: string;
  name: string;
  category: 'exploration' | 'combat' | 'bloodline' | 'family' | 'politics' | 'crafting' | 'collection' | 'legendary' | 'progression' | 'hidden';
  description: string;
  /** Counter key + threshold; counters are incremented by the stats tracker. */
  counter: string;
  target: number;
  title?: string; // grants a title
  hidden?: boolean;
  prestige: number;
}

export interface RankDef {
  rank: number; // 1..11
  name: string;
  xp: number; // cumulative xp needed
  trial: string; // advancement challenge description
  trialCheck?: { boss?: string; depthRegion?: string; floor?: number; purity?: number; standing?: number; ownRegions?: number };
  mods: Modifier[];
  privileges: string[];
  skillPoints: number;
  attributePoints: number;
  title: string;
  visual: string;
}
