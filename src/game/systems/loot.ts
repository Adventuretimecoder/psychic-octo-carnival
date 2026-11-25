/** Item instances, affixes, sets, rarity rolls, upgrade & dismantle. */
import { ITEM_BY_ID, ITEMS, MATERIALS } from '../data';
import type { ItemEffectId } from '../data/registry';
import type { EquipSlot, Heir, ItemInstance } from '../state';
import type { ItemTemplate, Modifier, Rarity } from '../types';
import { RARITIES } from '../types';
import type { ModSource } from './stats';
import { pick, type Rng, uid, weighted } from './rng';

export interface AffixDef { id: string; name: string; prefix: boolean; mods: Modifier[]; effect?: ItemEffectId }

export const AFFIXES: Record<string, AffixDef> = {
  keen: { id: 'keen', name: 'Keen', prefix: true, mods: [{ stat: 'critChance', add: 0.05 }] },
  vampiric: { id: 'vampiric', name: 'Vampiric', prefix: true, mods: [{ stat: 'lifesteal', add: 0.04 }] },
  swift: { id: 'swift', name: 'Swift', prefix: true, mods: [{ stat: 'attackSpeed', mul: 0.08 }] },
  warded: { id: 'warded', name: 'Warded', prefix: true, mods: [{ stat: 'armor', add: 12 }] },
  sanguine: { id: 'sanguine', name: 'Sanguine', prefix: true, mods: [{ stat: 'bloodDmg', mul: 0.12 }] },
  umbral: { id: 'umbral', name: 'Umbral', prefix: true, mods: [{ stat: 'stealth', add: 0.1 }] },
  ember: { id: 'ember', name: 'of Embers', prefix: false, mods: [{ stat: 'res_fire', add: 0.1 }], effect: 'burn-on-hit' },
  rime: { id: 'rime', name: 'of Rime', prefix: false, mods: [{ stat: 'res_frost', add: 0.1 }], effect: 'chill-on-hit' },
  tempest: { id: 'tempest', name: 'of the Tempest', prefix: false, mods: [{ stat: 'res_storm', add: 0.1 }], effect: 'shock-on-hit' },
  'blessed-bane': { id: 'blessed-bane', name: 'of Blessed Bane', prefix: false, mods: [{ stat: 'res_holy', add: 0.15 }, { stat: 'sunResist', add: 0.1 }] },
  'rune-might': { id: 'rune-might', name: 'of Might', prefix: false, mods: [{ stat: 'str', add: 4 }, { stat: 'physDmg', mul: 0.06 }] },
  'rune-haste': { id: 'rune-haste', name: 'of Haste', prefix: false, mods: [{ stat: 'cooldownRate', mul: 0.08 }, { stat: 'moveSpeed', mul: 0.04 }] },
  'rune-ward': { id: 'rune-ward', name: 'of Warding', prefix: false, mods: [{ stat: 'maxHp', add: 30 }, { stat: 'statusResist', add: 0.08 }] },
  'rune-hunger': { id: 'rune-hunger', name: 'of Hunger', prefix: false, mods: [{ stat: 'feedPower', mul: 0.15 }, { stat: 'maxBlood', add: 15 }] },
  // Random-only affixes
  brutal: { id: 'brutal', name: 'Brutal', prefix: true, mods: [{ stat: 'physDmg', mul: 0.1 }] },
  arcane: { id: 'arcane', name: 'Arcane', prefix: true, mods: [{ stat: 'spellDmg', mul: 0.1 }] },
  ancient: { id: 'ancient', name: 'Ancient', prefix: true, mods: [{ stat: 'maxHp', mul: 0.06 }, { stat: 'maxBlood', mul: 0.06 }] },
  'of-the-bat': { id: 'of-the-bat', name: 'of the Bat', prefix: false, mods: [{ stat: 'moveSpeed', mul: 0.06 }], effect: 'summon-bats-on-hit' },
  'of-ruin': { id: 'of-ruin', name: 'of Ruin', prefix: false, mods: [{ stat: 'critMult', add: 0.25 }], effect: 'crit-bleed' },
  'of-feasting': { id: 'of-feasting', name: 'of Feasting', prefix: false, mods: [{ stat: 'feedPower', mul: 0.12 }], effect: 'kill-blood' },
};
const RANDOM_AFFIXES = Object.keys(AFFIXES).filter((k) => !k.startsWith('rune-') && k !== 'blessed-bane');

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8b0a4', uncommon: '#6fbf73', rare: '#5aa0ff', epic: '#b366ff', legendary: '#ffa31a', mythical: '#ff4d6d', divine: '#fff2a8', primordial: '#ff1f3d',
};
const AFFIX_COUNT: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 1, epic: 2, legendary: 2, mythical: 3, divine: 3, primordial: 3 };
export const RARITY_INDEX = (r: Rarity) => RARITIES.indexOf(r);

export const SETS: Record<string, { name: string; two: Modifier[]; four: Modifier[] }> = {
  'set-nightwarden': { name: 'Nightwarden\'s Vigil', two: [{ stat: 'armor', add: 20 }, { stat: 'stealth', add: 0.1 }], four: [{ stat: 'physDmg', mul: 0.2 }, { stat: 'sunResist', add: 0.25 }] },
  'set-scarlet-court': { name: 'Regalia of the Scarlet Court', two: [{ stat: 'cha', add: 5 }, { stat: 'bloodDmg', mul: 0.1 }], four: [{ stat: 'influence', add: 2 }, { stat: 'lifesteal', add: 0.06 }, { stat: 'bloodDmg', mul: 0.15 }] },
};

export const tpl = (inst: ItemInstance): ItemTemplate => ITEM_BY_ID[inst.templateId];

export function itemName(inst: ItemInstance): string {
  const t = tpl(inst);
  const pre = inst.affixes.map((a) => AFFIXES[a]).find((a) => a?.prefix);
  const suf = inst.affixes.map((a) => AFFIXES[a]).find((a) => a && !a.prefix);
  return `${pre ? pre.name + ' ' : ''}${t.name}${suf ? ' ' + suf.name : ''}${inst.level ? ` +${inst.level}` : ''}`;
}

/** All modifiers an equipped instance grants. */
export function itemModifiers(inst: ItemInstance): Modifier[] {
  const t = tpl(inst);
  if (!t) return [];
  const k = inst.quality * (1 + inst.level * 0.08);
  const base = t.mods.map((m) => ({ stat: m.stat, add: m.add !== undefined ? m.add * k : undefined, mul: m.mul !== undefined ? m.mul * k : undefined }));
  return [...base, ...inst.mods, ...inst.affixes.flatMap((a) => AFFIXES[a]?.mods ?? [])];
}

export function weaponDamage(inst?: ItemInstance): number {
  if (!inst) return 7; // bare claws
  const t = tpl(inst);
  return Math.round((t.damage ?? 8) * inst.quality * (1 + inst.level * 0.1) * 10) / 10;
}

export function itemEffects(heir: Heir): Set<ItemEffectId> {
  const out = new Set<ItemEffectId>();
  for (const inst of Object.values(heir.equipment)) {
    if (!inst) continue;
    const e = tpl(inst)?.effect as ItemEffectId | undefined;
    if (e) out.add(e);
    for (const a of inst.affixes) if (AFFIXES[a]?.effect) out.add(AFFIXES[a].effect!);
  }
  return out;
}

export function setBonusMods(heir: Heir): ModSource[] {
  const counts: Record<string, number> = {};
  for (const inst of Object.values(heir.equipment)) {
    const s = inst && tpl(inst)?.setId;
    if (s) counts[s] = (counts[s] ?? 0) + 1;
  }
  const out: ModSource[] = [];
  for (const [id, n] of Object.entries(counts)) {
    const set = SETS[id];
    if (!set) continue;
    if (n >= 2) out.push({ label: `${set.name} (2)`, mods: set.two });
    if (n >= 4) out.push({ label: `${set.name} (4)`, mods: set.four });
  }
  return out;
}

export function makeInstance(templateId: string, rng: Rng, affixes?: string[]): ItemInstance {
  const t = ITEM_BY_ID[templateId];
  const n = AFFIX_COUNT[t.rarity] ?? 0;
  const aff = affixes ?? pickAffixes(rng, n);
  return { uid: uid(rng), templateId, rarity: t.rarity, level: 0, affixes: aff, mods: [], quality: +(0.88 + rng() * 0.24).toFixed(2) };
}

function pickAffixes(rng: Rng, n: number): string[] {
  const out: string[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 20) {
    const a = pick(rng, RANDOM_AFFIXES);
    if (out.includes(a)) continue;
    if (out.some((x) => AFFIXES[x].prefix === AFFIXES[a].prefix)) continue; // one prefix, one suffix (3rd may be either)
    out.push(a);
  }
  if (n >= 3) {
    const extra = RANDOM_AFFIXES.find((a) => !out.includes(a) && rng() < 0.2);
    if (extra) out.push(extra);
  }
  return out;
}

const EQUIP_CATS = ['weapon', 'armor', 'cloak', 'ring', 'amulet', 'relic'];

/** Roll a random piece of equipment for a region level. Boss relics and house items never drop randomly. */
export function rollEquipment(rng: Rng, level: number, luck = 1, minRarity: Rarity = 'common'): ItemInstance {
  const weights: Record<Rarity, number> = {
    common: Math.max(4, 60 - level * 5), uncommon: 30, rare: 12 + level * 1.5, epic: (3 + level) * luck, legendary: (0.4 + level * 0.25) * luck,
    mythical: level >= 7 ? 0.15 * luck : 0, divine: 0, primordial: 0,
  };
  const pool = ITEMS.filter((t) => EQUIP_CATS.includes(t.category) && !t.id.startsWith('relic-') && (t.minLevel ?? 1) <= level + 2 && RARITY_INDEX(t.rarity) >= RARITY_INDEX(minRarity));
  const rarity = weighted(rng, RARITIES.filter((r) => pool.some((t) => t.rarity === r)), (r) => weights[r]);
  const t = pick(rng, pool.filter((p) => p.rarity === rarity));
  return makeInstance(t.id, rng);
}

/** Random crafting materials suited to a region's drops. */
export function rollMaterial(rng: Rng, level: number): string {
  const w: Record<Rarity, number> = { common: 30, uncommon: 18, rare: 6 + level, epic: level * 0.8, legendary: level * 0.2, mythical: level * 0.08, divine: 0, primordial: level >= 9 ? 0.05 : 0 };
  return weighted(rng, MATERIALS, (m) => w[m.rarity]).id;
}

export function itemValue(inst: ItemInstance): number {
  const t = tpl(inst);
  return Math.round(t.value * inst.quality * (1 + inst.level * 0.25) * (1 + inst.affixes.length * 0.15));
}

export function upgradeCost(inst: ItemInstance): { gold: number; material: string; count: number } {
  const r = RARITY_INDEX(inst.rarity);
  const material = r >= 4 ? 'blood-ruby' : r >= 2 ? 'silver-ingot' : 'iron-ore';
  return { gold: Math.round(40 * (inst.level + 1) ** 1.6 * (1 + r * 0.5)), material, count: 1 + Math.floor(inst.level / 3) };
}

/** Upgrades can fail above +5 (item is kept, materials are lost). */
export const upgradeChance = (inst: ItemInstance) => (inst.level < 5 ? 1 : Math.max(0.3, 1 - (inst.level - 4) * 0.12));

/** Breaking an item down yields materials and research. */
export function dismantle(inst: ItemInstance, rng: Rng): Array<{ id: string; count: number }> {
  const r = RARITY_INDEX(inst.rarity);
  const out: Array<{ id: string; count: number }> = [{ id: tpl(inst).category === 'weapon' ? 'iron-ore' : 'spider-silk', count: 1 + r }];
  if (r >= 2) out.push({ id: 'silver-ingot', count: r - 1 });
  if (r >= 4) out.push({ id: 'blood-ruby', count: 1 });
  if (inst.affixes.length && rng() < 0.5) out.push({ id: 'cursed-sigil', count: 1 });
  return out;
}

export const slotFor = (inst: ItemInstance, heir: Heir): EquipSlot => {
  const c = tpl(inst).category;
  if (c === 'ring') return heir.equipment.ring1 ? (heir.equipment.ring2 ? 'ring1' : 'ring2') : 'ring1';
  return c as EquipSlot;
};
