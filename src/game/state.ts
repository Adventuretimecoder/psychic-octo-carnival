/** Persistent game state — everything that is saved. */
import type { BloodlineId, BloodType, FormId, HouseId, ItemSlot, Modifier, PrimaryStat, Rarity } from './types';

export interface Gene {
  bloodline: BloodlineId;
  /** 0..100 — how strongly the gene expresses. */
  potency: number;
  /** dominant: expressed; recessive: expressed only at high potency; dormant: sleeps until awakened. */
  expression: 'dominant' | 'recessive' | 'dormant';
}

export interface ItemInstance {
  uid: string;
  templateId: string;
  rarity: Rarity;
  /** Upgrade level +0..+10 (forge). */
  level: number;
  /** Rolled affix ids (see systems/loot.ts AFFIXES). */
  affixes: string[];
  /** Extra rolled modifiers. */
  mods: Modifier[];
  /** Quality roll 0.85..1.15 applied to base stats. */
  quality: number;
}

export type EquipSlot = 'weapon' | 'armor' | 'cloak' | 'ring1' | 'ring2' | 'amulet' | 'relic';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'cloak', 'ring1', 'ring2', 'amulet', 'relic'];
export const slotCategory = (s: EquipSlot): ItemSlot => (s === 'ring1' || s === 'ring2' ? 'ring' : s);

export interface Heir {
  id: string;
  name: string;
  generation: number;
  bornNight: number;
  parents: [string, string];
  /** House of the non-dynasty parent (if born of a marriage). */
  maternalHouse?: HouseId;
  genome: Gene[];
  mutations: string[];
  instability: number; // 0..100 from incompatible genes
  rank: number;
  xp: number;
  attributes: Record<PrimaryStat, number>;
  attributePoints: number;
  skillPoints: number;
  learned: string[]; // ability ids learned
  equipped: Array<string | null>; // 4 ability slots
  form: FormId; // chosen transformation for the form button
  mastery: Record<string, { level: number; xp: number }>;
  stages: Partial<Record<BloodlineId, number>>;
  bloodConsumed: Partial<Record<BloodType, number>>;
  purity: number; // 0..100
  corruption: number; // 0..100
  path?: string;
  vitae: number; // lives remaining (3); 0 → true death
  alive: boolean;
  titles: string[];
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  belt: Array<string | null>; // 2 consumable ids
  deeds: string[];
  trialsPassed: number[]; // ranks whose trials are done
  spouse?: { name: string; house: HouseId; genome: Gene[] };
}

export interface HeirRecord {
  id: string;
  name: string;
  generation: number;
  rank: number;
  bloodlines: BloodlineId[];
  fate: string;
  nights: [number, number];
  deeds: string[];
  parents: [string, string];
  maternalHouse?: HouseId;
}

export interface HouseState {
  standing: number; // -100..100 toward the player
  power: number; // 0..100
  alliance: boolean;
  married: boolean; // a marriage tie to the player
  secretKnown: boolean;
  exiled: boolean;
  warWith: HouseId[];
  favorUsed: number; // per-night cooldown marker (night number)
}

export interface RegionState {
  owner: HouseId | 'player' | null;
  population: number;
  defense: number;
  unrest: number; // 0..100
  buildings: string[];
  cleared: number; // highest floor cleared
  bossDefeated: boolean;
}

export interface ActiveEvent { id: string; nightsLeft: number; region?: string }

export interface QuestProgress { id: string; progress: number[]; done: boolean; startedNight: number }

export interface Dynasty {
  name: string;
  motto: string;
  colors: [string, string];
  crest: string;
  patron: HouseId; // house the founder swore to
  foundedNight: number;
  prestige: number;
  history: string[];
}

export interface RunState {
  region: string;
  floor: number;
  seed: number;
  hp: number;
  blood: number;
  gold: number;
  materials: Record<string, number>;
  items: ItemInstance[];
  consumables: Record<string, number>;
  kills: number;
  feeds: number;
  xp: number;
  log: string[];
}

export interface GameState {
  version: number;
  seed: number;
  night: number;
  dynasty: Dynasty;
  heir: Heir;
  /** Candidates for succession (generated from heir + spouse). */
  progeny: Heir[];
  lineage: HeirRecord[];
  gold: number;
  inventory: ItemInstance[];
  materials: Record<string, number>;
  vials: Partial<Record<BloodType, number>>;
  consumables: Record<string, number>;
  knownRecipes: string[];
  research: number;
  secrets: string[];
  codex: string[];
  bestiary: Record<string, number>;
  quests: QuestProgress[];
  completedQuests: string[];
  flags: string[];
  counters: Record<string, number>;
  achievements: string[];
  houses: Record<HouseId, HouseState>;
  regions: Record<string, RegionState>;
  council: { seats: Array<HouseId | 'player'>; decrees: string[]; regent: HouseId; throne: 'sleeping' | 'regent' | 'player' | HouseId };
  events: ActiveEvent[];
  market: Record<string, number>; // price multipliers by commodity id
  npcs: Record<string, number>; // relation -100..100
  heardLines: string[];
  chronicle: string[]; // recent world log
  auction: Array<{ item: ItemInstance; reserve: number; bid: number; house: HouseId }>;
  bank: { deposit: number; loan: number; loanNight: number };
  courtActions: number; // remaining this night
  lastDecreeNight: number;
  /** Unbanked loot of the hunt in progress. */
  run: RunState | null;
  settings: { sfx: number; music: number; shake: boolean; autoAim: boolean; damageNumbers: boolean };
}
