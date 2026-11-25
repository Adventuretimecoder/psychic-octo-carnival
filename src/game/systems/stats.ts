/**
 * Stat computation: primary attributes + every modifier source → derived stats.
 * Sources: base attributes, rank, path, bloodline stages, fusions, mutations,
 * maternal-house passive & weakness, equipment (incl. affixes and sets),
 * owned-territory bonuses, world events, NPC perks, and transient effects.
 */
import { BLOODLINE_BY_ID, FORM_BY_ID, HOUSE_BY_ID, MUTATION_BY_ID, PATH_BY_ID, RANKS, REGION_BY_ID } from '../data';
import type { GameState, Heir } from '../state';
import type { DerivedStat, Element, Modifier, PrimaryStat, StatKey } from '../types';
import { PRIMARY_STATS } from '../types';
import { activeFusions, expressedGenes } from './genetics';
import { itemModifiers, setBonusMods } from './loot';
import { WORLD_EVENT_MODS } from './worldHooks';

export const ELEMENTS: Element[] = ['physical', 'blood', 'shadow', 'fire', 'frost', 'storm', 'holy', 'death', 'void', 'venom', 'mind', 'star'];

export type Stats = Record<PrimaryStat, number> & Record<DerivedStat, number>;

export interface ModSource { label: string; mods: Modifier[] }

/** Every passive modifier source affecting the heir, labelled for the UI breakdown. */
export function modSources(state: GameState, heir: Heir = state.heir): ModSource[] {
  const out: ModSource[] = [];
  for (const r of RANKS) if (r.rank <= heir.rank && r.mods.length) out.push({ label: `Rank: ${r.name}`, mods: r.mods });
  if (heir.path) {
    const p = PATH_BY_ID[heir.path];
    const k = Math.max(1, heir.rank - 3);
    out.push({ label: p.name, mods: p.perRank.map((m) => ({ stat: m.stat, add: m.add && m.add * k, mul: m.mul && m.mul * k })) });
    if (heir.rank >= 8) out.push({ label: p.capstone.name, mods: p.capstone.mods });
  }
  for (const g of expressedGenes(heir.genome)) {
    const stage = heir.stages[g.bloodline] ?? 0;
    const def = BLOODLINE_BY_ID[g.bloodline];
    const potencyK = 0.5 + g.potency / 100;
    if (stage > 0) out.push({ label: `${def.name} (${def.stages[stage].name})`, mods: def.stages[stage].mods.map((m) => ({ stat: m.stat, add: m.add && m.add * potencyK, mul: m.mul && m.mul * potencyK })) });
    out.push({ label: `${def.name} weakness`, mods: def.weakness.mods });
  }
  for (const f of activeFusions(heir.genome, heir.stages)) out.push({ label: `Fusion: ${f.name}`, mods: f.mods });
  for (const id of heir.mutations) out.push({ label: `Mutation: ${MUTATION_BY_ID[id].name}`, mods: MUTATION_BY_ID[id].mods });
  const house = HOUSE_BY_ID[heir.maternalHouse ?? state.dynasty.patron];
  if (house) {
    out.push({ label: `${house.name}: ${house.passive.name}`, mods: house.passive.mods });
    out.push({ label: `${house.name}: ${house.weakness.name}`, mods: house.weakness.mods });
  }
  for (const [slot, inst] of Object.entries(heir.equipment)) if (inst) out.push({ label: `Equipped (${slot})`, mods: itemModifiers(inst) });
  for (const s of setBonusMods(heir)) out.push(s);
  for (const [rid, r] of Object.entries(state.regions)) if (r.owner === 'player') out.push({ label: `Domain: ${REGION_BY_ID[rid].bonus.name}`, mods: REGION_BY_ID[rid].bonus.mods });
  for (const e of WORLD_EVENT_MODS(state)) out.push(e);
  if (heir.corruption > 0) out.push({ label: 'Corruption', mods: [{ stat: 'res_holy', add: -heir.corruption / 250 }, { stat: 'bloodDmg', mul: heir.corruption / 400 }] });
  if (heir.purity > 0) out.push({ label: 'Blood purity', mods: [{ stat: 'maxBlood', mul: heir.purity / 400 }, { stat: 'feedPower', mul: heir.purity / 300 }] });
  if ((state.npcs.huntmaster ?? 0) >= 40) out.push({ label: 'Huntmaster\'s training', mods: [{ stat: 'physDmg', mul: 0.1 }, { stat: 'spellDmg', mul: 0.1 }] });
  if ((state.npcs.confessor ?? 0) >= 40) out.push({ label: 'Confessor\'s blessing', mods: [{ stat: 'sunResist', add: 0.25 }] });
  return out;
}

export function computeStats(state: GameState, extra: Modifier[] = [], heir: Heir = state.heir, form?: string): Stats {
  const sources = modSources(state, heir).flatMap((s) => s.mods).concat(extra);
  if (form && form !== 'human' && FORM_BY_ID[form as keyof typeof FORM_BY_ID]) sources.push(...FORM_BY_ID[form as keyof typeof FORM_BY_ID].mods);
  else if (form === 'human') sources.push(...FORM_BY_ID.human.mods);

  const add: Partial<Record<StatKey, number>> = {};
  const mul: Partial<Record<StatKey, number>> = {};
  for (const m of sources) {
    if (m.add) add[m.stat] = (add[m.stat] ?? 0) + m.add;
    if (m.mul) mul[m.stat] = (mul[m.stat] ?? 0) + m.mul;
  }
  const s = {} as Stats;
  for (const p of PRIMARY_STATS) s[p] = Math.max(0, Math.round(((heir.attributes[p] ?? 0) + (add[p] ?? 0)) * (1 + (mul[p] ?? 0))));

  const base: Record<DerivedStat, number> = {
    maxHp: 80 + s.end * 8 + heir.rank * 10,
    maxBlood: 60 + s.wil * 3 + s.aff * 3,
    hpRegen: s.rgn * 0.25,
    physDmg: 1 + s.str * 0.03,
    spellDmg: 1 + s.mag * 0.03,
    bloodDmg: 1 + s.aff * 0.025,
    attackSpeed: 1 + s.agi * 0.015,
    moveSpeed: 1 + s.agi * 0.006,
    critChance: 0.05 + s.per * 0.006 + s.agi * 0.002,
    critMult: 1.5,
    armor: s.end * 1.5,
    lifesteal: 0,
    cooldownRate: 1 + s.int * 0.01,
    costMult: 1,
    hungerRate: 1,
    feedPower: 1 + s.aff * 0.02,
    stealth: 0,
    statusPower: 1 + s.int * 0.01,
    statusResist: s.wil * 0.01,
    influence: s.cha * 0.3,
    research: 1 + s.int * 0.03,
    goldFind: 1 + s.per * 0.01,
    lootLuck: 1 + s.per * 0.015,
    sunResist: 0,
    ...(Object.fromEntries(ELEMENTS.map((e) => [`res_${e}`, 0])) as Record<`res_${Element}`, number>),
  };
  for (const k of Object.keys(base) as DerivedStat[]) s[k] = (base[k] + (add[k] ?? 0)) * (1 + (mul[k] ?? 0));

  s.critChance = clamp(s.critChance, 0, 0.9);
  s.stealth = clamp(s.stealth, 0, 0.95);
  s.statusResist = clamp(s.statusResist, 0, 0.8);
  s.sunResist = clamp(s.sunResist, -1, 0.9);
  s.costMult = Math.max(0.3, s.costMult);
  s.hungerRate = Math.max(0.1, s.hungerRate);
  s.moveSpeed = Math.max(0.4, s.moveSpeed);
  s.maxHp = Math.max(20, Math.round(s.maxHp));
  s.maxBlood = Math.max(20, Math.round(s.maxBlood));
  for (const e of ELEMENTS) s[`res_${e}`] = clamp(s[`res_${e}`], -1, 0.8);
  return s;
}

/** Damage reduction from armor. */
export const armorReduction = (armor: number) => (armor <= 0 ? armor / 200 : armor / (armor + 100));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
