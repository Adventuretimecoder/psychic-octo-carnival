/** Heirs, ranks, trials, mastery, bloodline awakening, ability unlocks, succession. */
import { ABILITY_BY_ID, BLOODLINE_BY_ID, FORM_BY_ID, FORMS, FUSIONS, HOUSE_BY_ID, HOUSES, RANKS, REGIONS, SECRET_BY_ID } from '../data';
import type { Gene, GameState, Heir } from '../state';
import type { AbilityDef, AbilityParams, BloodlineId, BloodType, Element, FormDef, FormId, HouseId, PrimaryStat } from '../types';
import { PRIMARY_STATS } from '../types';
import { activeFusions, awakenDormant, expressedGenes, inherit } from './genetics';
import { makeRng, type Rng, pick, uid } from './rng';

// ───────────────────────── Names ─────────────────────────
const GIVEN = ['Aurelian', 'Isolde', 'Corvin', 'Seraphine', 'Lucan', 'Morwenna', 'Valerian', 'Ysolde', 'Caspian', 'Lenore', 'Dorian', 'Ophelia', 'Emeric', 'Viveka', 'Thorne', 'Rosalind', 'Alaric', 'Celestine', 'Lysander', 'Mirabel', 'Sebastien', 'Annick', 'Raphael', 'Odile', 'Silas', 'Evangeline', 'Ambrose', 'Cordelia', 'Hadrian', 'Ilse', 'Benedikt', 'Severine', 'Matthias', 'Liesel', 'Casimir', 'Noemi', 'Fenwick', 'Tamsin', 'Oberon', 'Wilhelmina'];
export const randomName = (rng: Rng) => pick(rng, GIVEN);

const baseAttributes = (): Record<PrimaryStat, number> => Object.fromEntries(PRIMARY_STATS.map((p) => [p, 5])) as Record<PrimaryStat, number>;

/** Attribute leanings from bloodlines so each heir feels different. */
const BLOOD_ATTR: Partial<Record<BloodlineId, PrimaryStat[]>> = {
  primordial: ['aff', 'mag'], void: ['mag', 'agi'], dragon: ['str', 'end'], moon: ['agi', 'mag'], grave: ['wil', 'int'], royal: ['cha', 'aff'],
  storm: ['agi', 'mag'], frost: ['end', 'wil'], dream: ['int', 'per'], abyssal: ['str', 'mag'], celestial: ['wil', 'rgn'], beast: ['str', 'agi'],
  shadow: ['agi', 'per'], weaver: ['aff', 'int'], time: ['int', 'agi'], soul: ['wil', 'mag'], venom: ['int', 'agi'], life: ['rgn', 'end'],
  mirror: ['cha', 'per'], star: ['mag', 'per'],
};

export function makeHeir(rng: Rng, opts: { name: string; generation: number; night: number; parents: [string, string]; genome: Gene[]; mutations?: string[]; instability?: number; maternalHouse?: HouseId; inheritedMastery?: Heir['mastery'] }): Heir {
  const attributes = baseAttributes();
  for (const g of expressedGenes(opts.genome)) for (const a of BLOOD_ATTR[g.bloodline] ?? []) attributes[a] += 1 + Math.floor(g.potency / 40);
  for (let i = 0; i < 4; i++) attributes[pick(rng, PRIMARY_STATS)] += 1;
  const heir: Heir = {
    id: uid(rng), name: opts.name, generation: opts.generation, bornNight: opts.night, parents: opts.parents, maternalHouse: opts.maternalHouse,
    genome: opts.genome, mutations: opts.mutations ?? [], instability: opts.instability ?? 0,
    rank: 1, xp: 0, attributes, attributePoints: 0, skillPoints: 1,
    learned: ['blood-manipulation', 'blood-drain'], equipped: ['blood-manipulation', 'blood-drain', null, null], form: 'true',
    mastery: { ...(opts.inheritedMastery ?? {}) }, stages: {}, bloodConsumed: {}, purity: 10, corruption: 0,
    vitae: 3, alive: true, titles: [], equipment: {}, belt: ['potion-crimson', null], deeds: [], trialsPassed: [1],
  };
  refreshStages(heir, null);
  const sig = houseSignature(heir, opts.maternalHouse);
  if (sig && !heir.learned.includes(sig)) heir.learned.push(sig), (heir.equipped[2] = sig);
  return heir;
}

const houseSignature = (_h: Heir, house?: HouseId) => (house ? `house-${house}` : undefined);

export interface NewGameOptions {
  dynastyName: string; motto: string; colors: [string, string]; crest: string; patron: HouseId;
  founderName: string; bloodline: BloodlineId; seed?: number;
}

/** Bloodlines a founder may choose from (the common and uncommon lines). */
export const FOUNDER_BLOODLINES: BloodlineId[] = ['beast', 'shadow', 'grave', 'venom', 'life', 'moon', 'frost', 'storm', 'dream', 'weaver'];

export function newGame(o: NewGameOptions): GameState {
  const seed = o.seed ?? Math.floor(Math.random() * 1e9);
  const rng = makeRng(seed);
  const patron = HOUSE_BY_ID[o.patron];
  const genome: Gene[] = [{ bloodline: o.bloodline, potency: 32, expression: 'dominant' }];
  // The founder's sire passed down a trace of the patron house's blood.
  const pb = patron.bloodlines[0];
  if (pb !== o.bloodline) genome.push({ bloodline: pb, potency: 18, expression: 'recessive' });
  const heir = makeHeir(rng, { name: o.founderName, generation: 1, night: 1, parents: ['an unnamed Elder', 'the Warm'], genome, maternalHouse: o.patron });

  const state: GameState = {
    version: 1, seed, night: 1,
    dynasty: { name: o.dynastyName, motto: o.motto, colors: o.colors, crest: o.crest, patron: o.patron, foundedNight: 1, prestige: 0, history: [`Night 1: House ${o.dynastyName} is founded at Blackmoor Haven under the patronage of ${patron.name}.`] },
    heir, progeny: [], lineage: [], gold: 150, inventory: [], materials: {}, vials: { common: 2 }, consumables: { 'potion-crimson': 3, 'potion-vitae': 1 },
    knownRecipes: [], research: 0, secrets: [], codex: [], bestiary: {}, quests: [], completedQuests: [], flags: [], counters: {}, achievements: [],
    houses: {}, regions: {}, council: { seats: [], decrees: [], regent: 'veyrath', throne: 'regent' }, events: [], market: {}, npcs: {}, heardLines: [], chronicle: [],
    auction: [], bank: { deposit: 0, loan: 0, loanNight: 0 }, courtActions: 3, lastDecreeNight: -10, run: null,
    settings: { sfx: 0.7, music: 0.5, shake: true, autoAim: true, damageNumbers: true },
  };
  for (const h of HOUSES) {
    state.houses[h.id] = { standing: h.id === o.patron ? 25 : h.rivals.includes(o.patron) ? -15 : h.alliances.includes(o.patron) ? 8 : 0, power: h.influence, alliance: false, married: false, secretKnown: false, exiled: false, warWith: [], favorUsed: 0 };
  }
  for (const r of REGIONS) {
    const owner = HOUSES.find((h) => h.territory.includes(r.id))?.id ?? null;
    state.regions[r.id] = { owner, population: r.population, defense: r.defense, unrest: 10, buildings: [], cleared: 0, bossDefeated: false };
  }
  state.council.seats = [...HOUSES].sort((a, b) => b.influence - a.influence).slice(0, 7).map((h) => h.id);
  for (const n of ['seneschal', 'alchemist', 'spymaster', 'ancestor', 'huntmaster', 'confessor']) state.npcs[n] = n === 'seneschal' ? 20 : 0;
  return state;
}

// ───────────────────────── Ranks & XP ─────────────────────────
export const rankDef = (r: number) => RANKS[Math.min(RANKS.length, Math.max(1, r)) - 1];
export const nextRank = (heir: Heir) => (heir.rank < RANKS.length ? RANKS[heir.rank] : undefined);

export function trialMet(state: GameState, rank: number): boolean {
  const def = rankDef(rank);
  const c = def.trialCheck;
  if (!c) return true;
  if (c.boss && !(state.counters[`boss:${c.boss}`] > 0)) return false;
  if (c.floor && !c.depthRegion && !((state.counters['floors'] ?? 0) >= 1 && Math.max(0, ...Object.values(state.regions).map((r) => r.cleared)) >= c.floor)) return false;
  if (c.depthRegion && (state.regions[c.depthRegion]?.cleared ?? 0) < (c.floor ?? 1)) return false;
  if (c.purity && state.heir.purity < c.purity) return false;
  if (c.ownRegions && Object.values(state.regions).filter((r) => r.owner === 'player').length < c.ownRegions) return false;
  return true;
}

/** Add XP and rank up while possible. Returns log lines. */
export function gainXp(state: GameState, amount: number): string[] {
  const heir = state.heir;
  heir.xp += Math.round(amount);
  const log: string[] = [];
  for (;;) {
    const nr = nextRank(heir);
    if (!nr || heir.xp < nr.xp) break;
    if (!trialMet(state, nr.rank)) {
      if (!state.flags.includes(`trial-hint-${nr.rank}`)) state.flags.push(`trial-hint-${nr.rank}`), log.push(`You stand at the threshold of ${nr.name}. Trial: ${nr.trial}`);
      break;
    }
    heir.rank = nr.rank;
    heir.skillPoints += nr.skillPoints;
    heir.attributePoints += nr.attributePoints;
    heir.trialsPassed.push(nr.rank);
    heir.titles.push(nr.title);
    state.counters['rank-max'] = Math.max(state.counters['rank-max'] ?? 0, nr.rank);
    log.push(`${heir.name} ascends to ${nr.name}! (+${nr.skillPoints} skill, +${nr.attributePoints} attribute points)`);
    for (const f of FORMS) if (formAvailable(heir, f) && f.requirement.type !== 'start' && heir.rank === nr.rank) log.push(`New form available: ${f.name}.`);
  }
  log.push(...refreshStages(heir, state));
  return log;
}

// ───────────────────────── Bloodline stages ─────────────────────────
/** Advance bloodline stages whose requirements are met. */
export function refreshStages(heir: Heir, state: GameState | null): string[] {
  const log: string[] = [...awakenDormant(heir.genome)];
  for (const g of expressedGenes(heir.genome)) {
    const def = BLOODLINE_BY_ID[g.bloodline];
    let stage = heir.stages[g.bloodline] ?? 0;
    while (stage < 4) {
      const req = def.stages[stage + 1].requires;
      if (req.potency && g.potency < req.potency) break;
      if (req.rank && heir.rank < req.rank) break;
      if (req.purity && heir.purity < req.purity) break;
      if (req.quest && !state?.completedQuests.includes(req.quest)) break;
      if (req.bloodConsumed && Object.entries(req.bloodConsumed).some(([t, n]) => (heir.bloodConsumed[t as BloodType] ?? 0) < (n ?? 0))) break;
      stage++;
      heir.stages[g.bloodline] = stage;
      if (state) {
        state.counters['awakenings'] = (state.counters['awakenings'] ?? 0) + 1;
        log.push(`${def.name} reaches ${def.stages[stage].name}!`);
        for (const u of def.stages[stage].unlocks) {
          if (u.startsWith('form:')) log.push(`Form unlocked: ${FORM_BY_ID[u.slice(5) as FormId]?.name}.`);
          else if (ABILITY_BY_ID[u] && !heir.learned.includes(u)) heir.learned.push(u), log.push(`Ability awakened: ${ABILITY_BY_ID[u].name}.`);
        }
      }
    }
    // Hidden ability: Ascendant + 10 resonant feeds.
    if (stage >= 3 && state) {
      const res = def.resonance.reduce((s, t) => s + (heir.bloodConsumed[t] ?? 0), 0);
      const hid = def.hidden.abilityId;
      if (res >= 10 && ABILITY_BY_ID[hid] && !heir.learned.includes(hid)) heir.learned.push(hid), log.push(`A hidden power stirs in your ${def.name}: ${ABILITY_BY_ID[hid].name}!`);
    }
  }
  if (state) {
    for (const f of activeFusions(heir.genome, heir.stages))
      if (!heir.learned.includes(f.abilityId)) {
        heir.learned.push(f.abilityId);
        state.counters['fusions'] = (state.counters['fusions'] ?? 0) + 1;
        log.push(`Bloodline fusion! ${f.name}: ${ABILITY_BY_ID[f.abilityId].name} unlocked.`);
      }
  }
  return log;
}

/** Feeding raises potency of resonant genes and tracks consumption. */
export function recordFeed(state: GameState, blood: BloodType, n = 1): string[] {
  const heir = state.heir;
  heir.bloodConsumed[blood] = (heir.bloodConsumed[blood] ?? 0) + n;
  state.counters['feeds'] = (state.counters['feeds'] ?? 0) + n;
  state.counters[`feed:${blood}`] = (state.counters[`feed:${blood}`] ?? 0) + n;
  for (const g of heir.genome) {
    const def = BLOODLINE_BY_ID[g.bloodline];
    if (def.resonance.includes(blood)) g.potency = Math.min(100, g.potency + 0.6 * n);
  }
  const PURITY: Partial<Record<BloodType, number>> = { noble: 0.4, royal: 0.8, ancient: 0.6, primordial: 1.5, holy: 0.3, corrupted: -1.2 };
  heir.purity = Math.max(0, Math.min(100, heir.purity + (PURITY[blood] ?? 0.05) * n));
  if (blood === 'corrupted') heir.corruption = Math.min(100, heir.corruption + 0.8 * n);
  return [];
}

// ───────────────────────── Abilities ─────────────────────────
export interface AbilityStatus { def: AbilityDef; learned: boolean; available: boolean; reason: string; cost: number }

export function abilityStatus(state: GameState, def: AbilityDef): AbilityStatus {
  const heir = state.heir;
  const learned = heir.learned.includes(def.id);
  const u = def.unlock;
  let available = false, reason = '', cost = 0;
  switch (u.type) {
    case 'start': available = true; reason = 'Innate'; break;
    case 'rank': available = heir.rank >= u.rank; reason = `Requires rank ${u.rank} (${rankDef(u.rank).name})`; cost = 1; break;
    case 'skillpoints': {
      const reqOk = (u.requires ?? []).every((r) => heir.learned.includes(r));
      available = reqOk; cost = u.points;
      reason = `${u.points} skill point${u.points > 1 ? 's' : ''}${u.requires?.length ? ` · after ${u.requires.map((r) => ABILITY_BY_ID[r]?.name).join(', ')}` : ''}`;
      break;
    }
    case 'bloodline': available = (heir.stages[u.bloodline] ?? 0) >= u.stage; reason = `${BLOODLINE_BY_ID[u.bloodline].name} at ${BLOODLINE_BY_ID[u.bloodline].stages[u.stage].name}`; break;
    case 'house': available = (heir.maternalHouse ?? state.dynasty.patron) === u.house; reason = `Heirs of ${HOUSE_BY_ID[u.house]?.name}`; break;
    case 'fusion': available = activeFusions(heir.genome, heir.stages).some((f) => f.id === u.fusion); reason = `Fusion: ${FUSIONS.find((f) => f.id === u.fusion)?.name}`; break;
    case 'discovery': available = state.secrets.includes(u.secret); reason = available ? 'Discovered' : 'Hidden — must be discovered in the world'; break;
  }
  return { def, learned, available, reason, cost };
}

export function learnAbility(state: GameState, id: string): string | null {
  const st = abilityStatus(state, ABILITY_BY_ID[id]);
  if (st.learned) return 'Already known.';
  if (!st.available) return st.reason;
  if (state.heir.skillPoints < st.cost) return 'Not enough skill points.';
  state.heir.skillPoints -= st.cost;
  state.heir.learned.push(id);
  const empty = state.heir.equipped.indexOf(null);
  if (empty >= 0) state.heir.equipped[empty] = id;
  return null;
}

export const masteryLevel = (heir: Heir, id: string) => heir.mastery[id]?.level ?? 1;
export const masteryNeeded = (level: number) => Math.round(14 * level ** 1.6);

export function gainMastery(heir: Heir, id: string, amount: number, research = 1): string | null {
  const m = (heir.mastery[id] ??= { level: 1, xp: 0 });
  if (m.level >= 10) return null;
  m.xp += amount * research;
  let msg: string | null = null;
  while (m.level < 10 && m.xp >= masteryNeeded(m.level)) {
    m.xp -= masteryNeeded(m.level);
    m.level++;
    const def = ABILITY_BY_ID[id];
    const tier = def?.tiers.find((t) => t.mastery === m.level);
    msg = tier && tier.mastery > 1 ? `${def.name} evolves into ${tier.name}!` : `${def?.name} mastery ${m.level}.`;
  }
  return msg;
}

/** Resolve an ability's current form for this heir: evolved tier + bloodline variant. */
export function resolveAbility(def: AbilityDef, heir: Heir): { name: string; params: AbilityParams; element: Element; tier: number; variant?: string } {
  const lvl = masteryLevel(heir, def.id);
  let params: AbilityParams = { ...def.params };
  let name = def.name;
  let tier = 0;
  def.tiers.forEach((t, i) => {
    if (lvl >= t.mastery) {
      params = { ...params, ...t.params };
      name = t.name;
      tier = i;
    }
  });
  let element = def.element;
  let variant: string | undefined;
  const ex = expressedGenes(heir.genome).sort((a, b) => b.potency - a.potency);
  for (const g of ex) {
    const v = def.variants?.find((vv) => vv.bloodline === g.bloodline);
    if (v && (heir.stages[g.bloodline] ?? 0) >= 1) {
      params = { ...params, ...v.params, damage: (params.damage ?? 0) + (v.params.damage ?? 0), status: [...(params.status ?? []), ...(v.params.status ?? [])] };
      element = v.element;
      variant = v.name;
      if (tier === 0) name = v.name;
      break;
    }
  }
  return { name, params, element, tier, variant };
}

// ───────────────────────── Forms ─────────────────────────
export function formAvailable(heir: Heir, f: FormDef, devAll = false): boolean {
  if (devAll) return true;
  const check = (r: FormDef['requirement']): boolean => {
    switch (r.type) {
      case 'start': return true;
      case 'rank': return heir.rank >= r.rank;
      case 'bloodline': return (heir.stages[r.bloodline] ?? 0) >= r.stage;
      case 'any': return r.of.some((x) => check(x));
    }
  };
  return check(f.requirement);
}

// ───────────────────────── Succession ─────────────────────────
/** Heirs of the Rite of Commingling: heir + spouse → 3 candidates. Without a spouse, a lesser Embrace. */
export function generateProgeny(state: GameState, rng: Rng = makeRng(state.seed + state.night * 7919)): Heir[] {
  const heir = state.heir;
  const spouse = heir.spouse;
  const partner: Gene[] = spouse?.genome ?? [];
  const bonus = state.events.some((e) => e.id === 'blood-moon') ? 0.1 : 0;
  const inheritedMastery: Heir['mastery'] = {};
  const share = 0.3 + ((state.npcs.ancestor ?? 0) >= 40 ? 0.1 : 0);
  for (const [id, m] of Object.entries(heir.mastery)) {
    const total = Math.floor(m.level * share);
    if (total >= 2) inheritedMastery[id] = { level: total, xp: 0 };
  }
  const out: Heir[] = [];
  for (let i = 0; i < 3; i++) {
    const res = inherit(heir.genome, partner, rng, bonus + (spouse ? 0 : 0.05));
    const child = makeHeir(rng, {
      name: randomName(rng), generation: heir.generation + 1, night: state.night,
      parents: [heir.name, spouse?.name ?? 'a mortal vessel'], genome: res.genome.length ? res.genome : [{ bloodline: 'beast', potency: 15, expression: 'dominant' }],
      mutations: res.mutations, instability: res.instability, maternalHouse: spouse?.house ?? heir.maternalHouse, inheritedMastery,
    });
    child.deeds = res.events;
    if (!spouse) for (const p of PRIMARY_STATS) child.attributes[p] = Math.max(3, child.attributes[p] - 1);
    out.push(child);
  }
  return out;
}

/** End the current heir's line of play and crown a successor. */
export function succeed(state: GameState, childIndex: number, fate: string): string[] {
  const old = state.heir;
  const child = state.progeny[childIndex];
  if (!child) return ['No heir to succeed.'];
  state.lineage.push({
    id: old.id, name: old.name, generation: old.generation, rank: old.rank, bloodlines: expressedGenes(old.genome).map((g) => g.bloodline),
    fate, nights: [old.bornNight, state.night], deeds: old.deeds.slice(-6), parents: old.parents, maternalHouse: old.maternalHouse,
  });
  // Ancestral echoes: equipment passes down; one ancestral trait per 3 generations of high rank.
  child.equipment = old.equipment;
  child.belt = old.belt;
  state.heir = child;
  state.progeny = [];
  state.counters['heirs'] = (state.counters['heirs'] ?? 0) + 1;
  state.dynasty.prestige += old.rank * 3;
  const log = [`${child.name} of the ${ordinal(child.generation)} generation takes up the mantle of House ${state.dynasty.name}.`];
  state.dynasty.history.push(`Night ${state.night}: ${old.name} — ${fate}. ${child.name} succeeds.`);
  return log;
}

export const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

export function discoverSecret(state: GameState, id: string): string[] {
  if (state.secrets.includes(id)) return [];
  const s = SECRET_BY_ID[id];
  if (!s) return [];
  state.secrets.push(id);
  state.counters['secrets'] = (state.counters['secrets'] ?? 0) + 1;
  const log = [`Secret found: ${s.name}.`];
  const g = s.grants;
  if (g?.ability && ABILITY_BY_ID[g.ability]) {
    if (!state.heir.learned.includes(g.ability)) state.heir.learned.push(g.ability);
    log.push(`Hidden ability learned: ${ABILITY_BY_ID[g.ability].name}!`);
  }
  if (g?.recipe && !state.knownRecipes.includes(g.recipe)) state.knownRecipes.push(g.recipe), state.counters['discoveries'] = (state.counters['discoveries'] ?? 0) + 1, log.push('A forgotten recipe is recovered.');
  if (g?.item) state.consumables[g.item] = (state.consumables[g.item] ?? 0) + 1, log.push('You find a hidden cache.');
  if (g?.potency) {
    const gene = state.heir.genome.find((x) => x.bloodline === g.potency!.bloodline);
    if (gene) gene.potency = Math.min(100, gene.potency + g.potency.amount);
    else state.heir.genome.push({ bloodline: g.potency.bloodline, potency: g.potency.amount, expression: 'dormant' });
    log.push(`A bloodline sanctuary: your ${BLOODLINE_BY_ID[g.potency.bloodline].name} grows stronger.`);
    log.push(...refreshStages(state.heir, state));
  }
  if (g?.quest) state.flags.push(`unlock:${g.quest}`), log.push('A hidden quest awaits in your journal.');
  return log;
}
