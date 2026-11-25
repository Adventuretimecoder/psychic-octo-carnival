/** Crafting stations, enchanting, upgrades, blood alchemy, research & discovery by experimentation. */
import { BLOODLINE_BY_ID, ITEM_BY_ID, MATERIAL_BY_ID, RECIPE_BY_ID, RECIPES } from '../data';
import type { GameState, ItemInstance } from '../state';
import type { BloodlineId, BloodType, RecipeDef } from '../types';
import { AFFIXES, dismantle, makeInstance, upgradeChance, upgradeCost } from './loot';
import { refreshStages } from './progression';
import { makeRng } from './rng';
import { computeStats } from './stats';
import { questEvent } from './quests';

export interface CraftResult { ok: boolean; msg: string }

export const recipeKnown = (s: GameState, r: RecipeDef) => !r.hidden || s.knownRecipes.includes(r.id);
export const knownRecipes = (s: GameState) => RECIPES.filter((r) => recipeKnown(s, r));
export const researchable = (s: GameState) => RECIPES.filter((r) => r.hidden && !s.knownRecipes.includes(r.id) && r.research);

export const craftGold = (s: GameState, r: RecipeDef) => Math.round(r.gold * ((s.npcs.alchemist ?? 0) >= 40 ? 0.8 : 1));

export function haveInput(s: GameState, id: string): number {
  if (id.startsWith('blood:')) return s.vials[id.slice(6) as BloodType] ?? 0;
  return (s.materials[id] ?? 0) + (s.consumables[id] ?? 0);
}

export function canCraft(s: GameState, r: RecipeDef): string | null {
  if (!recipeKnown(s, r)) return 'Unknown recipe.';
  for (const inp of r.inputs) if (haveInput(s, inp.id) < inp.count) return `Missing ${inputName(inp.id)}.`;
  if (s.gold < craftGold(s, r)) return 'Not enough crowns.';
  return null;
}

export const inputName = (id: string) => (id.startsWith('blood:') ? `${id.slice(6)} blood vial` : MATERIAL_BY_ID[id]?.name ?? ITEM_BY_ID[id]?.name ?? id);

function consume(s: GameState, r: RecipeDef) {
  for (const inp of r.inputs) {
    if (inp.id.startsWith('blood:')) { const t = inp.id.slice(6) as BloodType; s.vials[t] = (s.vials[t] ?? 0) - inp.count; continue; }
    let left = inp.count;
    const m = Math.min(left, s.materials[inp.id] ?? 0); s.materials[inp.id] = (s.materials[inp.id] ?? 0) - m; left -= m;
    if (left) s.consumables[inp.id] = (s.consumables[inp.id] ?? 0) - left;
  }
  s.gold -= craftGold(s, r);
}

/** Craft a recipe. `target` = item uid for enchant/runes; `bloodline` for potency recipes. */
export function craft(s: GameState, id: string, opts: { target?: string; bloodline?: BloodlineId } = {}): CraftResult {
  const r = RECIPE_BY_ID[id];
  const err = canCraft(s, r);
  if (err) return { ok: false, msg: err };
  const rng = makeRng(s.seed + s.night * 31 + (s.counters['crafts'] ?? 0));
  const out = r.output;
  if (out.affix) {
    const item = findItem(s, opts.target);
    if (!item) return { ok: false, msg: 'Choose an item to enchant.' };
    consume(s, r);
    if (item.affixes.includes(out.affix)) return { ok: true, msg: 'The enchantment was already there; the materials are spent.' };
    if (item.affixes.length >= 3) item.affixes.shift();
    item.affixes.push(out.affix);
    done(s, id);
    return { ok: true, msg: `${AFFIXES[out.affix]?.name ?? out.affix} bound to ${ITEM_BY_ID[item.templateId].name}.` };
  }
  if (out.potency) {
    const gene = opts.bloodline ? s.heir.genome.find((g) => g.bloodline === opts.bloodline) : [...s.heir.genome].sort((a, b) => b.potency - a.potency)[0];
    if (!gene) return { ok: false, msg: 'Choose a bloodline to strengthen.' };
    consume(s, r);
    gene.potency = Math.min(100, gene.potency + out.potency);
    const log = refreshStages(s.heir, s);
    done(s, id);
    return { ok: true, msg: [`${BLOODLINE_BY_ID[gene.bloodline].name} potency +${out.potency}.`, ...log].join(' ') };
  }
  if (out.purity) {
    consume(s, r);
    s.heir.purity = Math.min(100, s.heir.purity + out.purity);
    s.heir.corruption = Math.max(0, s.heir.corruption - out.purity / 2);
    done(s, id);
    return { ok: true, msg: `Blood purity +${out.purity}.` };
  }
  if (out.item) {
    const t = ITEM_BY_ID[out.item];
    if (!t) return { ok: false, msg: 'The recipe produces nothing known.' };
    consume(s, r);
    const n = out.count ?? 1;
    if (t.category === 'consumable') s.consumables[out.item] = (s.consumables[out.item] ?? 0) + n;
    else for (let k = 0; k < n; k++) s.inventory.push(makeInstance(out.item, rng));
    done(s, id);
    return { ok: true, msg: `Crafted ${n > 1 ? `${n}× ` : ''}${t.name}.` };
  }
  return { ok: false, msg: 'Nothing happens.' };
}

function done(s: GameState, id: string) {
  s.counters['crafts'] = (s.counters['crafts'] ?? 0) + 1;
  questEvent(s, { type: 'craft', recipe: id });
}

const findItem = (s: GameState, uid?: string): ItemInstance | undefined => s.inventory.find((i) => i.uid === uid) ?? Object.values(s.heir.equipment).find((i) => i?.uid === uid);

/** Spend research to learn a hidden recipe. */
export function study(s: GameState, id: string): CraftResult {
  const r = RECIPE_BY_ID[id];
  if (!r?.research) return { ok: false, msg: 'Nothing to study.' };
  const need = Math.round(r.research / computeStats(s).research);
  if (s.research < need) return { ok: false, msg: `Requires ${need} research.` };
  s.research -= need;
  s.knownRecipes.push(id);
  s.counters['discoveries'] = (s.counters['discoveries'] ?? 0) + 1;
  return { ok: true, msg: `Your scholars decode ${r.name}.` };
}
export const studyCost = (s: GameState, id: string) => Math.round((RECIPE_BY_ID[id].research ?? 0) / computeStats(s).research);

/**
 * Experimentation: combine 2–3 materials. If their essences match a hidden
 * recipe's ingredient essences, it is discovered. Otherwise, research is gained.
 */
export function experiment(s: GameState, mats: string[]): CraftResult {
  if (mats.length < 2) return { ok: false, msg: 'Combine at least two materials.' };
  for (const m of mats) if ((s.materials[m] ?? 0) < 1) return { ok: false, msg: `You have no ${inputName(m)}.` };
  for (const m of mats) s.materials[m]! -= 1;
  const ess = new Set(mats.flatMap((m) => MATERIAL_BY_ID[m]?.essence ?? []));
  const hidden = RECIPES.filter((r) => r.hidden && !s.knownRecipes.includes(r.id));
  let best: RecipeDef | null = null, bestScore = 0;
  for (const r of hidden) {
    const re = new Set(r.inputs.filter((i) => !i.id.startsWith('blood:')).flatMap((i) => MATERIAL_BY_ID[i.id]?.essence ?? []));
    const direct = r.inputs.filter((i) => mats.includes(i.id)).length;
    let overlap = 0;
    for (const e of ess) if (re.has(e)) overlap++;
    const score = direct * 2 + overlap;
    if (score > bestScore) bestScore = score, best = r;
  }
  if (best && bestScore >= 4) {
    s.knownRecipes.push(best.id);
    s.counters['discoveries'] = (s.counters['discoveries'] ?? 0) + 1;
    return { ok: true, msg: `Discovery! The reaction reveals: ${best.name}.` };
  }
  const gain = Math.round((3 + ess.size * 2) * computeStats(s).research);
  s.research += gain;
  return { ok: true, msg: `The mixture fizzles${bestScore >= 2 ? ' — but something almost happened' : ''}. (+${gain} research)` };
}

/** Distil lesser blood into finer blood. */
export const DISTILL: Array<{ from: BloodType; n: number; to: BloodType; extra?: string; gold: number }> = [
  { from: 'common', n: 4, to: 'noble', gold: 20 },
  { from: 'beast', n: 3, to: 'magical', extra: 'nightshade', gold: 30 },
  { from: 'noble', n: 3, to: 'ancient', extra: 'blood-ruby', gold: 80 },
  { from: 'ancient', n: 3, to: 'royal', extra: 'gold-leaf', gold: 160 },
  { from: 'corrupted', n: 2, to: 'common', extra: 'saint-relic', gold: 20 },
];
export function distill(s: GameState, i: number): CraftResult {
  const d = DISTILL[i];
  if ((s.vials[d.from] ?? 0) < d.n) return { ok: false, msg: `Need ${d.n} ${d.from} vials.` };
  if (d.extra && (s.materials[d.extra] ?? 0) < 1) return { ok: false, msg: `Need ${inputName(d.extra)}.` };
  if (s.gold < d.gold) return { ok: false, msg: 'Not enough crowns.' };
  s.vials[d.from]! -= d.n; if (d.extra) s.materials[d.extra]! -= 1; s.gold -= d.gold;
  s.vials[d.to] = (s.vials[d.to] ?? 0) + 1;
  s.counters['crafts'] = (s.counters['crafts'] ?? 0) + 1;
  return { ok: true, msg: `Distilled one vial of ${d.to} blood.` };
}

/** Drink a stored vial: feeding without hunting — advances bloodline resonance a little. */
export function drinkVial(s: GameState, t: BloodType): CraftResult {
  if ((s.vials[t] ?? 0) < 1) return { ok: false, msg: 'No such vial.' };
  s.vials[t]! -= 1;
  s.heir.bloodConsumed[t] = (s.heir.bloodConsumed[t] ?? 0) + 1;
  for (const g of s.heir.genome) if (BLOODLINE_BY_ID[g.bloodline].resonance.includes(t)) g.potency = Math.min(100, g.potency + 1);
  if (t === 'corrupted') s.heir.corruption = Math.min(100, s.heir.corruption + 2);
  const log = refreshStages(s.heir, s);
  return { ok: true, msg: [`You drink the ${t} blood.`, ...log].join(' ') };
}

export function upgrade(s: GameState, uid: string): CraftResult {
  const item = findItem(s, uid);
  if (!item) return { ok: false, msg: 'No such item.' };
  if (item.level >= 10) return { ok: false, msg: 'It cannot be improved further.' };
  const c = upgradeCost(item);
  if (s.gold < c.gold) return { ok: false, msg: `Requires ${c.gold} crowns.` };
  if ((s.materials[c.material] ?? 0) < c.count) return { ok: false, msg: `Requires ${c.count}× ${inputName(c.material)}.` };
  s.gold -= c.gold; s.materials[c.material]! -= c.count;
  const rng = makeRng(s.seed + s.night + item.level * 7 + (s.counters['crafts'] ?? 0));
  if (rng() > upgradeChance(item)) return { ok: false, msg: 'The forge-blood rejects the metal. The upgrade fails.' };
  item.level++;
  s.counters['crafts'] = (s.counters['crafts'] ?? 0) + 1;
  return { ok: true, msg: `${ITEM_BY_ID[item.templateId].name} is now +${item.level}.` };
}

export function breakDown(s: GameState, uid: string): CraftResult {
  const i = s.inventory.findIndex((x) => x.uid === uid);
  if (i < 0) return { ok: false, msg: 'No such item.' };
  const inst = s.inventory[i];
  const out = dismantle(inst, makeRng(s.seed + s.night));
  s.inventory.splice(i, 1);
  for (const m of out) s.materials[m.id] = (s.materials[m.id] ?? 0) + m.count;
  s.research += 2;
  return { ok: true, msg: `Dismantled into ${out.map((m) => `${m.count}× ${inputName(m.id)}`).join(', ')}.` };
}
