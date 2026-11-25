/**
 * Bloodline inheritance: dominant/recessive/dormant genes, hybrid vigor,
 * incompatibility instability, and mutations (new traits or new bloodlines).
 */
import { BLOODLINE_BY_ID, BLOODLINES, FUSIONS, MUTATIONS } from '../data/bloodlines';
import type { Gene } from '../state';
import type { BloodlineId, FusionDef, Rarity } from '../types';
import { chance, type Rng, weighted } from './rng';

export const MAX_GENES = 5;
const RARITY_WEIGHT: Record<Rarity, number> = { common: 10, uncommon: 6, rare: 3, epic: 1.4, legendary: 0.5, mythical: 0.2, divine: 0.1, primordial: 0.08 };

export function isExpressed(g: Gene): boolean {
  return g.expression === 'dominant' || (g.expression === 'recessive' && g.potency >= 70);
}

export function expressedGenes(genome: Gene[]): Gene[] {
  return genome.filter(isExpressed);
}

export interface InheritResult {
  genome: Gene[];
  mutations: string[];
  instability: number;
  events: string[]; // human-readable notes about what happened
}

/** Chance a parent passes a gene on. */
function passChance(g: Gene): number {
  const dom = BLOODLINE_BY_ID[g.bloodline].dominance;
  const base = g.expression === 'dominant' ? 0.8 : g.expression === 'recessive' ? 0.6 : 0.4;
  return Math.min(0.97, base + (dom - 0.5) * 0.3 + g.potency / 500);
}

export function incompatiblePairs(genome: Gene[]): Array<[BloodlineId, BloodlineId]> {
  const ex = expressedGenes(genome);
  const out: Array<[BloodlineId, BloodlineId]> = [];
  for (let i = 0; i < ex.length; i++)
    for (let j = i + 1; j < ex.length; j++) {
      const a = BLOODLINE_BY_ID[ex[i].bloodline];
      if (a.incompatible.includes(ex[j].bloodline) || BLOODLINE_BY_ID[ex[j].bloodline].incompatible.includes(a.id)) out.push([ex[i].bloodline, ex[j].bloodline]);
    }
  return out;
}

/**
 * Combine two parents' genomes into a child's.
 * @param mutationBonus extra mutation chance (blood moons, rituals, alchemy).
 */
export function inherit(a: Gene[], b: Gene[], rng: Rng, mutationBonus = 0): InheritResult {
  const events: string[] = [];
  const ids = new Set<BloodlineId>([...a, ...b].map((g) => g.bloodline));
  let genome: Gene[] = [];

  for (const id of ids) {
    const def = BLOODLINE_BY_ID[id];
    const pa = a.find((g) => g.bloodline === id);
    const pb = b.find((g) => g.bloodline === id);
    const fromA = pa && chance(rng, passChance(pa)) ? pa : undefined;
    const fromB = pb && chance(rng, passChance(pb)) ? pb : undefined;
    const passed = [fromA, fromB].filter(Boolean) as Gene[];
    if (!passed.length) continue;

    let potency = passed.reduce((s, g) => s + g.potency, 0) / passed.length;
    potency += (rng() - 0.5) * 24;
    let expression: Gene['expression'];
    if (passed.length === 2) {
      potency += 10; // hybrid vigor: both parents carried it
      // Two recessive copies express; any dominant copy dominates.
      expression = passed.some((g) => g.expression === 'dominant') || passed.every((g) => g.expression === 'recessive') ? 'dominant' : 'recessive';
      if (passed.length === 2 && passed.every((g) => g.expression === 'recessive')) events.push(`Two recessive ${def.name} genes met — the trait expresses.`);
    } else {
      const g = passed[0];
      if (g.expression === 'dominant') expression = chance(rng, 0.35 + def.dominance * 0.6) ? 'dominant' : 'recessive';
      else expression = g.expression;
    }
    genome.push({ bloodline: id, potency: clamp(Math.round(potency), 5, 100), expression });
  }

  // Mutation rolls.
  const mutations: string[] = [];
  let instability = 0;
  const pairs = incompatiblePairs(genome);
  for (const [x, y] of pairs) {
    instability += 30;
    const weaker = genome.find((g) => g.bloodline === (geneOf(genome, x).potency < geneOf(genome, y).potency ? x : y))!;
    weaker.potency = Math.max(5, weaker.potency - 15);
    events.push(`${BLOODLINE_BY_ID[x].name} and ${BLOODLINE_BY_ID[y].name} war in the child's veins.`);
  }
  if (instability > 0 && chance(rng, Math.min(0.9, instability / 60))) mutations.push(chance(rng, 0.5) ? 'mut-unstable' : 'mut-corruption');

  const mutationChance = 0.08 + instability / 200 + mutationBonus;
  if (chance(rng, mutationChance)) {
    const roll = rng();
    if (roll < 0.5) {
      // A new trait. Instability makes banes likelier.
      const pool = MUTATIONS.filter((m) => !mutations.includes(m.id) && m.id !== 'mut-unstable');
      const m = weighted(rng, pool, (m) => RARITY_WEIGHT[m.rarity] * (m.nature === 'bane' ? 0.6 + instability / 40 : 1));
      mutations.push(m.id);
      events.push(`A mutation: ${m.name}.`);
    } else if (roll < 0.8) {
      // A spontaneous new bloodline — the only way to obtain the rarest.
      const pool = BLOODLINES.filter((bl) => !genome.some((g) => g.bloodline === bl.id));
      const bl = weighted(rng, pool, (bl) => bl.mutationWeight);
      genome.push({ bloodline: bl.id, potency: 12 + Math.floor(rng() * 25), expression: chance(rng, 0.4) ? 'dominant' : 'dormant' });
      events.push(`An unexpected bloodline surfaces: ${bl.name}!`);
    } else if (genome.length) {
      const g = genome[Math.floor(rng() * genome.length)];
      g.potency = Math.min(100, g.potency + 20);
      events.push(`A potency surge in the ${BLOODLINE_BY_ID[g.bloodline].name}.`);
    }
  }

  // Keep the strongest genes; weaker ones fall dormant, the weakest are lost.
  genome.sort((x, y) => Number(isExpressed(y)) - Number(isExpressed(x)) || y.potency - x.potency);
  if (genome.length > MAX_GENES) {
    for (const g of genome.slice(MAX_GENES)) events.push(`The ${BLOODLINE_BY_ID[g.bloodline].name} is lost to the line.`);
    genome = genome.slice(0, MAX_GENES);
  }
  return { genome, mutations, instability, events };
}

function geneOf(genome: Gene[], id: BloodlineId) {
  return genome.find((g) => g.bloodline === id)!;
}

/** Fusions whose two bloodlines are expressed at the required stage. */
export function activeFusions(genome: Gene[], stages: Partial<Record<BloodlineId, number>>): FusionDef[] {
  const ex = new Set(expressedGenes(genome).map((g) => g.bloodline));
  return FUSIONS.filter((f) => ex.has(f.a) && ex.has(f.b) && (stages[f.a] ?? 0) >= f.minStage && (stages[f.b] ?? 0) >= f.minStage);
}

/** Awaken a dormant gene once its potency is high enough (sanctuaries, elixirs). */
export function awakenDormant(genome: Gene[]): string[] {
  const out: string[] = [];
  for (const g of genome)
    if (g.expression === 'dormant' && g.potency >= 45) {
      g.expression = 'dominant';
      out.push(`The dormant ${BLOODLINE_BY_ID[g.bloodline].name} awakens!`);
    }
  return out;
}

/** Bloodline compatibility score between two genomes, 0..100 (shown when arranging marriages). */
export function compatibility(a: Gene[], b: Gene[]): { score: number; conflicts: string[]; fusions: string[] } {
  const merged: Gene[] = [...expressedGenes(a), ...expressedGenes(b).filter((g) => !a.some((x) => x.bloodline === g.bloodline))];
  const conflicts = incompatiblePairs(merged).map(([x, y]) => `${BLOODLINE_BY_ID[x].name} ✕ ${BLOODLINE_BY_ID[y].name}`);
  const ids = new Set(merged.map((g) => g.bloodline));
  const fusions = FUSIONS.filter((f) => ids.has(f.a) && ids.has(f.b)).map((f) => f.name);
  const shared = a.filter((g) => b.some((x) => x.bloodline === g.bloodline)).length;
  const score = clamp(60 + shared * 10 + fusions.length * 15 - conflicts.length * 35, 0, 100);
  return { score, conflicts, fusions };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
