/**
 * Developer tools: direct state manipulation for every system, plus a text
 * console that drives the same functions. Everything here is a plain mutation
 * of GameState, so the UI can call it through the store's `act`.
 */
import { ACHIEVEMENTS } from '../data/achievements';
import { CODEX, WORLD_EVENTS } from '../data/lore';
import { NPCS } from '../data/npcs';
import { ABILITIES, ABILITY_BY_ID, BLOODLINE_BY_ID, BLOODLINES, BOSS_BY_ID, BOSSES, CREATURES, FORMS, HOUSE_BY_ID, HOUSES, ITEM_BY_ID, ITEMS, MATERIALS, MUTATION_BY_ID, PATHS, RANKS, RECIPES, REGION_BY_ID, REGIONS, SECRETS } from '../data';
import { DEFAULT_DEV, type DevFlags, type Gene, type GameState } from '../state';
import type { BloodlineId, BloodType, HouseId, PrimaryStat, Rarity } from '../types';
import { PRIMARY_STATS, RARITIES } from '../types';
import { expressedGenes, inherit, isExpressed } from './genetics';
import { AFFIXES, makeInstance, rollEquipment } from './loot';
import { discoverSecret, generateProgeny, masteryNeeded, refreshStages } from './progression';
import { acceptQuest, ALL_QUESTS, completeQuest, objectiveTarget, QUEST_MAP, refreshQuestProgress } from './quests';
import { makeRng, uid } from './rng';
import { spouseCandidate, advanceNight, updateCouncil, DECREES } from './world';

export const dev = (s: GameState): DevFlags => (s.dev ??= { ...DEFAULT_DEV });
export const devOn = (s: GameState) => !!s.dev?.enabled;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rng = () => makeRng(Math.floor(Math.random() * 1e9));
export const BLOOD_TYPES: BloodType[] = ['common', 'noble', 'beast', 'magical', 'ancient', 'royal', 'corrupted', 'primordial', 'holy', 'spectral'];

// ───────────────────────── Heir ─────────────────────────
export function setRank(s: GameState, r: number) {
  r = clamp(Math.round(r), 1, RANKS.length);
  const h = s.heir;
  const old = h.rank;
  for (const def of RANKS) if (def.rank > old && def.rank <= r) { h.skillPoints += def.skillPoints; h.attributePoints += def.attributePoints; if (!h.titles.includes(def.title)) h.titles.push(def.title); }
  h.rank = r;
  h.xp = Math.max(h.xp, RANKS[r - 1].xp);
  h.trialsPassed = RANKS.filter((x) => x.rank <= r).map((x) => x.rank);
  s.counters['rank-max'] = Math.max(s.counters['rank-max'] ?? 0, r);
  return [`Rank set to ${RANKS[r - 1].name}.`, ...refreshStages(h, s)];
}
export const setXp = (s: GameState, xp: number) => { s.heir.xp = Math.max(0, Math.round(xp)); return `XP set to ${s.heir.xp}.`; };
export const setAttr = (s: GameState, k: PrimaryStat, v: number) => { s.heir.attributes[k] = clamp(Math.round(v), 0, 999); return `${k} = ${s.heir.attributes[k]}.`; };
export const setAllAttrs = (s: GameState, v: number) => { for (const p of PRIMARY_STATS) s.heir.attributes[p] = clamp(Math.round(v), 0, 999); return `All attributes = ${v}.`; };
export const addPoints = (s: GameState, attr: number, skill: number) => { s.heir.attributePoints += attr; s.heir.skillPoints += skill; return `+${attr} attribute, +${skill} skill points.`; };
export const setVitae = (s: GameState, v: number) => { s.heir.vitae = clamp(Math.round(v), 0, 99); s.heir.alive = s.heir.vitae > 0; return `Vitae = ${s.heir.vitae}.`; };
export const setPurity = (s: GameState, p: number, c: number) => { s.heir.purity = clamp(p, 0, 100); s.heir.corruption = clamp(c, 0, 100); return [`Purity ${s.heir.purity}, corruption ${s.heir.corruption}.`, ...refreshStages(s.heir, s)]; };
export const setPath = (s: GameState, id: string | undefined) => { s.heir.path = id || undefined; return id ? `Path: ${PATHS.find((p) => p.id === id)?.name}.` : 'Path cleared.'; };
export const renameHeir = (s: GameState, name: string) => { s.heir.name = name.trim() || s.heir.name; return `The heir is now ${s.heir.name}.`; };
export const addTitle = (s: GameState, t: string) => { if (t && !s.heir.titles.includes(t)) s.heir.titles.push(t); return `Title “${t}” granted.`; };

// ───────────────────────── Abilities ─────────────────────────
export function learn(s: GameState, id: string) {
  if (!ABILITY_BY_ID[id]) return `No ability “${id}”.`;
  if (!s.heir.learned.includes(id)) s.heir.learned.push(id);
  const empty = s.heir.equipped.indexOf(null);
  if (empty >= 0 && !s.heir.equipped.includes(id)) s.heir.equipped[empty] = id;
  return `Learned ${ABILITY_BY_ID[id].name}.`;
}
export function learnAll(s: GameState) {
  const all = [...ABILITIES.map((a) => a.id), ...HOUSES.map((h) => h.signature.id)];
  for (const id of all) if (!s.heir.learned.includes(id)) s.heir.learned.push(id);
  return `Learned all ${all.length} abilities.`;
}
export const forget = (s: GameState, id: string) => { s.heir.learned = s.heir.learned.filter((x) => x !== id); s.heir.equipped = s.heir.equipped.map((x) => (x === id ? null : x)); return 'Forgotten.'; };
export function setMastery(s: GameState, id: string, lvl: number) {
  lvl = clamp(Math.round(lvl), 1, 10);
  s.heir.mastery[id] = { level: lvl, xp: 0 };
  return `${ABILITY_BY_ID[id]?.name ?? id} mastery ${lvl}.`;
}
export function maxMasteryAll(s: GameState, lvl = 10) { for (const id of s.heir.learned) s.heir.mastery[id] = { level: lvl, xp: 0 }; return `All known abilities at mastery ${lvl}.`; }
export const equip = (s: GameState, slot: number, id: string | null) => { s.heir.equipped[clamp(slot, 0, 3)] = id; return id ? `${ABILITY_BY_ID[id]?.name} → slot ${slot + 1}.` : 'Slot cleared.'; };
export const masteryXpNeeded = masteryNeeded;

// ───────────────────────── Bloodlines ─────────────────────────
export function setGene(s: GameState, bl: BloodlineId, potency: number, expression: Gene['expression'] = 'dominant') {
  if (!BLOODLINE_BY_ID[bl]) return `No bloodline “${bl}”.`;
  const g = s.heir.genome.find((x) => x.bloodline === bl);
  if (g) { g.potency = clamp(potency, 0, 100); g.expression = expression; } else s.heir.genome.push({ bloodline: bl, potency: clamp(potency, 0, 100), expression });
  return [`${BLOODLINE_BY_ID[bl].name}: ${potency} (${expression}).`, ...refreshStages(s.heir, s)];
}
export const removeGene = (s: GameState, bl: BloodlineId) => { s.heir.genome = s.heir.genome.filter((g) => g.bloodline !== bl); delete s.heir.stages[bl]; return 'Gene removed.'; };
/** Force a stage regardless of requirements, unlocking everything up to it. */
export function setStage(s: GameState, bl: BloodlineId, stage: number) {
  stage = clamp(Math.round(stage), 0, 4);
  const def = BLOODLINE_BY_ID[bl];
  let g = s.heir.genome.find((x) => x.bloodline === bl);
  if (!g) { g = { bloodline: bl, potency: 50, expression: 'dominant' }; s.heir.genome.push(g); }
  if (!isExpressed(g)) g.expression = 'dominant';
  s.heir.stages[bl] = stage;
  for (let i = 1; i <= stage; i++) for (const u of def.stages[i].unlocks) if (!u.startsWith('form:') && ABILITY_BY_ID[u] && !s.heir.learned.includes(u)) s.heir.learned.push(u);
  return [`${def.name} → ${def.stages[stage].name}.`, ...refreshStages(s.heir, s)];
}
export function maxBloodlines(s: GameState) {
  for (const g of expressedGenes(s.heir.genome)) { g.potency = 100; setStage(s, g.bloodline, 4); }
  s.heir.purity = 100;
  return [`Every expressed bloodline at Apotheosis.`, ...refreshStages(s.heir, s)];
}
export function allBloodlines(s: GameState) {
  s.heir.genome = BLOODLINES.map((b) => ({ bloodline: b.id, potency: 100, expression: 'dominant' as const }));
  for (const b of BLOODLINES) setStage(s, b.id, 4);
  return ['All 20 bloodlines at Apotheosis — including every fusion.', ...refreshStages(s.heir, s)];
}
export const addMutation = (s: GameState, id: string) => { if (MUTATION_BY_ID[id] && !s.heir.mutations.includes(id)) s.heir.mutations.push(id); return `Mutation: ${MUTATION_BY_ID[id]?.name ?? id}.`; };
export const removeMutation = (s: GameState, id: string) => { s.heir.mutations = s.heir.mutations.filter((m) => m !== id); return 'Mutation removed.'; };
export function feedBlood(s: GameState, t: BloodType, n: number) { s.heir.bloodConsumed[t] = (s.heir.bloodConsumed[t] ?? 0) + n; return [`Recorded ${n} ${t} feeds.`, ...refreshStages(s.heir, s)]; }

/** Run many inheritance rolls and summarize the outcomes. */
export function simulateInheritance(a: Gene[], b: Gene[], trials = 500, mutationBonus = 0) {
  const count: Record<string, { present: number; expressed: number; potency: number }> = {};
  let mutations = 0, unstable = 0;
  const r = makeRng(12345);
  for (let i = 0; i < trials; i++) {
    const res = inherit(a, b, r, mutationBonus);
    if (res.mutations.length) mutations++;
    if (res.instability > 0) unstable++;
    for (const g of res.genome) {
      const c = (count[g.bloodline] ??= { present: 0, expressed: 0, potency: 0 });
      c.present++; if (isExpressed(g)) c.expressed++; c.potency += g.potency;
    }
  }
  return {
    rows: Object.entries(count).map(([bl, c]) => ({ bloodline: bl as BloodlineId, present: c.present / trials, expressed: c.expressed / trials, potency: c.potency / c.present })).sort((x, y) => y.present - x.present),
    mutationRate: mutations / trials, instabilityRate: unstable / trials,
  };
}

// ───────────────────────── Items & resources ─────────────────────────
export function spawnItem(s: GameState, id: string, level = 0, affixes?: string[]) {
  const t = ITEM_BY_ID[id];
  if (!t) return `No item “${id}”.`;
  if (t.category === 'consumable') { s.consumables[id] = (s.consumables[id] ?? 0) + 1; return `+1 ${t.name}.`; }
  if (t.category === 'material') { s.materials[id] = (s.materials[id] ?? 0) + 1; return `+1 ${t.name}.`; }
  const inst = makeInstance(id, rng(), affixes);
  inst.level = clamp(level, 0, 10);
  s.inventory.push(inst);
  return `Spawned ${t.name}${level ? ` +${level}` : ''}.`;
}
export function spawnRandom(s: GameState, n: number, minRarity: Rarity = 'rare', level = 10) {
  const r = rng();
  for (let i = 0; i < n; i++) s.inventory.push(rollEquipment(r, level, 3, minRarity));
  return `Spawned ${n} random ${minRarity}+ items.`;
}
export function spawnByRarity(s: GameState, rarity: Rarity) {
  const list = ITEMS.filter((i) => i.rarity === rarity && !['consumable', 'material'].includes(i.category));
  for (const t of list) s.inventory.push(makeInstance(t.id, rng()));
  return `Spawned all ${list.length} ${rarity} items.`;
}
export function perfectItem(s: GameState, uidStr: string) {
  const it = s.inventory.find((i) => i.uid === uidStr) ?? Object.values(s.heir.equipment).find((i) => i?.uid === uidStr);
  if (!it) return 'No such item.';
  it.level = 10; it.quality = 1.25;
  return 'Item perfected: +10, maximum quality.';
}
export function addAffix(s: GameState, uidStr: string, affix: string) {
  const it = s.inventory.find((i) => i.uid === uidStr) ?? Object.values(s.heir.equipment).find((i) => i?.uid === uidStr);
  if (!it || !AFFIXES[affix]) return 'No such item or affix.';
  if (!it.affixes.includes(affix)) it.affixes.push(affix);
  return `${AFFIXES[affix].name} added.`;
}
export const giveMaterials = (s: GameState, n: number) => { for (const m of MATERIALS) s.materials[m.id] = (s.materials[m.id] ?? 0) + n; return `+${n} of every material.`; };
export const giveVials = (s: GameState, n: number) => { for (const t of BLOOD_TYPES) s.vials[t] = (s.vials[t] ?? 0) + n; return `+${n} vials of every blood type.`; };
export const giveConsumables = (s: GameState, n: number) => { for (const i of ITEMS.filter((x) => x.category === 'consumable')) s.consumables[i.id] = (s.consumables[i.id] ?? 0) + n; return `+${n} of every consumable.`; };
export const clearInventory = (s: GameState) => { s.inventory = []; return 'Vault emptied.'; };
export const giveRelics = (s: GameState) => { for (const b of BOSSES) s.inventory.push(makeInstance(`relic-${b.id}`, rng())); for (const h of HOUSES) s.inventory.push(makeInstance(h.uniqueItem.id, rng())); return 'Every boss relic and house heirloom added to the vault.'; };
export const setGold = (s: GameState, n: number) => { s.gold = Math.max(0, Math.round(n)); return `Crowns: ${s.gold}.`; };
export const setPrestige = (s: GameState, n: number) => { s.dynasty.prestige = Math.max(0, Math.round(n)); return `Prestige: ${s.dynasty.prestige}.`; };
export const setResearch = (s: GameState, n: number) => { s.research = Math.max(0, Math.round(n)); return `Research: ${s.research}.`; };
export const learnAllRecipes = (s: GameState) => { for (const r of RECIPES) if (!s.knownRecipes.includes(r.id)) s.knownRecipes.push(r.id); return `All ${RECIPES.length} recipes known.`; };
export const resetMarket = (s: GameState) => { s.market = {}; return 'Market prices reset.'; };
export const clearDebt = (s: GameState) => { s.bank.loan = 0; return 'Debts forgiven.'; };

// ───────────────────────── World ─────────────────────────
export const setNight = (s: GameState, n: number) => { s.night = Math.max(1, Math.round(n)); return `Night ${s.night}.`; };
export function skipNights(s: GameState, n: number) { const out: string[] = []; for (let i = 0; i < clamp(n, 1, 100); i++) out.push(...advanceNight(s)); return [`${n} nights pass.`, ...out.slice(-6)]; }
export function triggerEvent(s: GameState, id: string, region?: string, nights?: number) {
  const ev = WORLD_EVENTS.find((e) => e.id === id);
  if (!ev) return `No event “${id}”.`;
  s.events = s.events.filter((e) => e.id !== id);
  const reg = ev.effects.region === 'random' ? region || REGIONS[0].id : undefined;
  s.events.push({ id, nightsLeft: nights ?? ev.durationNights, region: reg });
  return `${ev.name} begins${reg ? ` in ${REGION_BY_ID[reg].name}` : ''}.`;
}
export const clearEvents = (s: GameState) => { s.events = []; return 'All world events ended.'; };
export function setOwner(s: GameState, region: string, owner: HouseId | 'player' | null) {
  if (!s.regions[region]) return `No region “${region}”.`;
  s.regions[region].owner = owner;
  s.counters['regions-owned'] = Object.values(s.regions).filter((r) => r.owner === 'player').length;
  return `${REGION_BY_ID[region].name} → ${owner === 'player' ? 'you' : owner ? HOUSE_BY_ID[owner].name : 'unclaimed'}.`;
}
export function defeatBoss(s: GameState, region: string) {
  const r = REGION_BY_ID[region];
  if (!r) return `No region “${region}”.`;
  const rs = s.regions[region];
  rs.bossDefeated = true; rs.cleared = r.floors;
  s.counters[`boss:${r.boss}`] = Math.max(1, s.counters[`boss:${r.boss}`] ?? 0);
  s.counters['bosses'] = BOSSES.filter((b) => (s.counters[`boss:${b.id}`] ?? 0) > 0).length;
  for (const c of CODEX) if (c.unlockedBy === `boss:${r.boss}` && !s.codex.includes(c.id)) s.codex.push(c.id);
  refreshQuestProgress(s);
  return `${BOSS_BY_ID[r.boss].name} marked as slain.`;
}
export const defeatAllBosses = (s: GameState) => { for (const r of REGIONS) defeatBoss(s, r.id); return 'Every lord of Eryndor marked as slain.'; };
export const claimAll = (s: GameState) => { for (const r of REGIONS) { s.regions[r.id].owner = 'player'; s.regions[r.id].bossDefeated = true; } s.counters['regions-owned'] = REGIONS.length; return 'All twelve regions are yours.'; };
export const setRegionStat = (s: GameState, region: string, k: 'population' | 'defense' | 'unrest', v: number) => { s.regions[region][k] = Math.max(0, Math.round(v)); return `${REGION_BY_ID[region].name} ${k} = ${v}.`; };
export const buildAll = (s: GameState, region: string) => { s.regions[region].buildings = ['blood-cellar', 'watchtower', 'shrine', 'library', 'forge', 'market']; return 'Every work built (ignoring the limit).'; };

export function setStanding(s: GameState, h: HouseId | 'all', v: number) {
  const ids = h === 'all' ? HOUSES.map((x) => x.id) : [h];
  for (const id of ids) if (s.houses[id]) s.houses[id].standing = clamp(v, -100, 100);
  return `Standing ${v} with ${h === 'all' ? 'every house' : HOUSE_BY_ID[h]?.name}.`;
}
export const setPower = (s: GameState, h: HouseId, v: number) => { s.houses[h].power = clamp(v, 0, 100); updateCouncil(s); return `${HOUSE_BY_ID[h].name} power ${v}.`; };
export const revealSecret = (s: GameState, h: HouseId | 'all') => { for (const id of h === 'all' ? HOUSES.map((x) => x.id) : [h]) s.houses[id].secretKnown = true; return 'Secrets revealed.'; };
export const toggleAlliance = (s: GameState, h: HouseId) => { s.houses[h].alliance = !s.houses[h].alliance; return `${HOUSE_BY_ID[h].name}: ${s.houses[h].alliance ? 'allied' : 'no alliance'}.`; };
export const toggleExile = (s: GameState, h: HouseId) => { s.houses[h].exiled = !s.houses[h].exiled; updateCouncil(s); return `${HOUSE_BY_ID[h].name}: ${s.houses[h].exiled ? 'exiled' : 'restored'}.`; };
export const allyAll = (s: GameState) => { for (const h of HOUSES) { s.houses[h.id].alliance = true; s.houses[h.id].standing = 100; } return 'Every house is your sworn ally.'; };
export function forceCouncilSeat(s: GameState, on: boolean) {
  const seats = s.council.seats.filter((x) => x !== 'player');
  s.council.seats = on ? [...seats.slice(0, 6), 'player'] : seats;
  if (on) s.counters['council-seat'] = 1;
  return on ? 'You sit on the Night Council.' : 'Council seat removed.';
}
export function passDecree(s: GameState, id: string) {
  if (id === 'crown-the-heir') { s.council.throne = 'player'; s.counters['crowned'] = 1; return `${s.heir.name} is acclaimed Sovereign.`; }
  if (!DECREES.find((d) => d.id === id)) return `No decree “${id}”.`;
  if (!s.council.decrees.includes(id)) s.council.decrees.push(id);
  return `${DECREES.find((d) => d.id === id)?.name} is law.`;
}
export const repealDecree = (s: GameState, id: string) => { s.council.decrees = s.council.decrees.filter((d) => d !== id); return 'Decree repealed.'; };
export const setCourtActions = (s: GameState, n: number) => { s.courtActions = Math.max(0, n); return `${n} court actions.`; };

// ───────────────────────── Quests & flags ─────────────────────────
export function forceAccept(s: GameState, id: string) {
  const q = QUEST_MAP[id];
  if (!q) return `No quest “${id}”.`;
  if (s.quests.some((p) => p.id === id)) return 'Already active.';
  s.completedQuests = s.completedQuests.filter((x) => x !== id);
  s.quests.push({ id, progress: q.objectives.map(() => 0), done: false, startedNight: s.night });
  refreshQuestProgress(s);
  return `Accepted: ${q.name}.`;
}
export function forceComplete(s: GameState, id: string) {
  if (!s.quests.some((p) => p.id === id)) forceAccept(s, id);
  const qp = s.quests.find((p) => p.id === id);
  const q = QUEST_MAP[id];
  if (!qp || !q) return [`No quest “${id}”.`];
  // Satisfy every objective, including the materials and crowns a turn-in consumes.
  for (const o of q.objectives) {
    if (o.type === 'collect') s.materials[o.item] = Math.max(s.materials[o.item] ?? 0, o.count);
    if (o.type === 'gold') s.gold = Math.max(s.gold, o.amount);
  }
  qp.progress = q.objectives.map((o) => objectiveTarget(o));
  qp.done = true;
  return completeQuest(s, id).log;
}
export function completeAllActive(s: GameState) { const out: string[] = []; for (const q of [...s.quests]) out.push(...forceComplete(s, q.id)); return out.length ? out.slice(-8) : ['No active quests.']; }
export function acceptEverything(s: GameState) { let n = 0; for (const q of ALL_QUESTS) if (!s.quests.some((p) => p.id === q.id) && !s.completedQuests.includes(q.id)) { forceAccept(s, q.id); n++; } return `Accepted ${n} quests.`; }
export const resetQuests = (s: GameState) => { s.quests = []; s.completedQuests = []; return 'Quest log wiped.'; };
export const addFlag = (s: GameState, f: string) => { if (f && !s.flags.includes(f)) s.flags.push(f); refreshQuestProgress(s); return `Flag set: ${f}.`; };
export const removeFlag = (s: GameState, f: string) => { s.flags = s.flags.filter((x) => x !== f); return `Flag cleared: ${f}.`; };
export const acceptMain = (s: GameState) => { for (const q of ALL_QUESTS.filter((x) => x.category === 'main')) acceptQuest(s, q.id); return 'Available main quests accepted.'; };

// ───────────────────────── Lore & feats ─────────────────────────
export const unlockCodex = (s: GameState) => { s.codex = CODEX.map((c) => c.id); return `All ${CODEX.length} codex entries unsealed.`; };
export function unlockSecrets(s: GameState) { const out: string[] = []; for (const sec of SECRETS) out.push(...discoverSecret(s, sec.id)); return [`All ${SECRETS.length} secrets discovered.`, ...out.filter((l) => /ability|recipe/i.test(l)).slice(0, 4)]; }
export const fullBestiary = (s: GameState) => { for (const c of CREATURES) s.bestiary[c.id] = Math.max(1, s.bestiary[c.id] ?? 0); return `Bestiary complete (${CREATURES.length}).`; };
export function unlockAchievements(s: GameState) {
  for (const a of ACHIEVEMENTS) if (!s.achievements.includes(a.id)) { s.achievements.push(a.id); if (a.title && !s.heir.titles.includes(a.title)) s.heir.titles.push(a.title); }
  return `All ${ACHIEVEMENTS.length} achievements and their titles granted.`;
}
export const resetAchievements = (s: GameState) => { s.achievements = []; return 'Achievements reset.'; };
export const setCounter = (s: GameState, k: string, v: number) => { s.counters[k] = v; return `${k} = ${v}.`; };

// ───────────────────────── Dynasty ─────────────────────────
export function marryInstant(s: GameState, h: HouseId) {
  s.heir.spouse = spouseCandidate(s, h);
  s.houses[h].married = true;
  s.counters['marriages'] = (s.counters['marriages'] ?? 0) + 1;
  return `${s.heir.name} weds ${s.heir.spouse.name}.`;
}
export const divorce = (s: GameState) => { s.heir.spouse = undefined; return 'The marriage is dissolved.'; };
export function customSpouse(s: GameState, h: HouseId, genome: Gene[]) { s.heir.spouse = { name: `Dev-made spouse of ${HOUSE_BY_ID[h].name}`, house: h, genome }; return 'Spouse with a custom genome arranged.'; }
export const rollProgeny = (s: GameState) => { s.progeny = generateProgeny(s, makeRng(Math.floor(Math.random() * 1e9))); return `${s.progeny.length} heirs rolled. Open succession to choose.`; };
export function killHeir(s: GameState) { s.heir.vitae = 0; s.heir.alive = false; s.progeny = generateProgeny(s); s.counters['true-deaths'] = (s.counters['true-deaths'] ?? 0) + 1; return `${s.heir.name} meets the True Death.`; }
export const renameDynasty = (s: GameState, name: string, motto?: string) => { if (name.trim()) s.dynasty.name = name.trim(); if (motto !== undefined) s.dynasty.motto = motto; return `House ${s.dynasty.name}.`; };
export const setPatron = (s: GameState, h: HouseId) => { s.dynasty.patron = h; if (!s.heir.maternalHouse) s.heir.maternalHouse = h; return `Patron: ${HOUSE_BY_ID[h].name}.`; };
export const setMaternalHouse = (s: GameState, h: HouseId) => { s.heir.maternalHouse = h; if (!s.heir.learned.includes(`house-${h}`)) s.heir.learned.push(`house-${h}`); return `The heir now carries the heritage of ${HOUSE_BY_ID[h].name}.`; };

// ───────────────────────── NPCs ─────────────────────────
export const setRelation = (s: GameState, npc: string | 'all', v: number) => { for (const n of npc === 'all' ? NPCS.map((x) => x.id) : [npc]) s.npcs[n] = clamp(v, -100, 100); return `Regard ${v}.`; };
export const resetDialogue = (s: GameState) => { s.heardLines = []; return 'All NPC lines are fresh again.'; };

// ───────────────────────── Everything ─────────────────────────
export function unlockEverything(s: GameState) {
  setRank(s, 11); setAllAttrs(s, 60); learnAll(s); maxMasteryAll(s); allBloodlines(s); learnAllRecipes(s);
  unlockCodex(s); unlockSecrets(s); fullBestiary(s); defeatAllBosses(s); claimAll(s); allyAll(s); forceCouncilSeat(s, true);
  giveMaterials(s, 99); giveVials(s, 50); giveConsumables(s, 25); giveRelics(s); setGold(s, 999999); setPrestige(s, 9999); setResearch(s, 9999);
  const d = dev(s); d.allForms = true;
  return 'Everything unlocked. The Age of Blood is yours.';
}

// ───────────────────────── Console ─────────────────────────
export interface Command { name: string; args: string; help: string; run: (s: GameState, a: string[]) => string | string[] }
const num = (v: string | undefined, d = 0) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const findId = <T extends { id: string; name?: string }>(list: T[], q: string) => list.find((x) => x.id === q) ?? list.find((x) => x.id.includes(q)) ?? list.find((x) => (x.name ?? '').toLowerCase().includes(q.toLowerCase()));
const TOGGLES: Array<keyof DevFlags> = ['god', 'infBlood', 'noCooldowns', 'oneHit', 'noHunger', 'noSun', 'noclip', 'invisible', 'revealMap', 'hitboxes', 'fps', 'allForms', 'freeCrafting', 'freeCourt'];
const NUMS: Array<keyof DevFlags> = ['timeScale', 'dmgMul', 'speedMul', 'xpMul', 'lootMul'];

export const COMMANDS: Command[] = [
  { name: 'help', args: '[command]', help: 'List commands.', run: () => COMMANDS.map((c) => `${c.name} ${c.args} — ${c.help}`) },
  { name: 'unlockall', args: '', help: 'Unlock absolutely everything.', run: (s) => unlockEverything(s) },
  { name: 'gold', args: '<n>', help: 'Set crowns.', run: (s, a) => setGold(s, num(a[0], 100000)) },
  { name: 'prestige', args: '<n>', help: 'Set prestige.', run: (s, a) => setPrestige(s, num(a[0], 1000)) },
  { name: 'research', args: '<n>', help: 'Set research points.', run: (s, a) => setResearch(s, num(a[0], 1000)) },
  { name: 'rank', args: '<1-11>', help: 'Set rank (bypasses trials).', run: (s, a) => setRank(s, num(a[0], 11)) },
  { name: 'xp', args: '<n>', help: 'Set XP.', run: (s, a) => setXp(s, num(a[0])) },
  { name: 'attr', args: '<stat|all> <n>', help: 'Set an attribute (str agi int end wil per aff mag rgn cha).', run: (s, a) => (a[0] === 'all' ? setAllAttrs(s, num(a[1], 50)) : PRIMARY_STATS.includes(a[0] as PrimaryStat) ? setAttr(s, a[0] as PrimaryStat, num(a[1], 50)) : 'Unknown stat.') },
  { name: 'points', args: '<attr> <skill>', help: 'Add attribute and skill points.', run: (s, a) => addPoints(s, num(a[0], 10), num(a[1], 10)) },
  { name: 'vitae', args: '<n>', help: 'Set remaining lives.', run: (s, a) => setVitae(s, num(a[0], 3)) },
  { name: 'purity', args: '<p> [corruption]', help: 'Set purity and corruption.', run: (s, a) => setPurity(s, num(a[0], 100), num(a[1], 0)) },
  { name: 'learn', args: '<ability|all>', help: 'Learn an ability (id or name fragment).', run: (s, a) => { if (a[0] === 'all') return learnAll(s); const ab = findId([...ABILITIES, ...HOUSES.map((h) => h.signature)], a.join(' ')); return ab ? learn(s, ab.id) : 'No such ability.'; } },
  { name: 'mastery', args: '<ability|all> <1-10>', help: 'Set ability mastery.', run: (s, a) => { const lvl = num(a[a.length - 1], 10); if (a[0] === 'all') return maxMasteryAll(s, lvl); const ab = findId(ABILITIES, a[0]); return ab ? setMastery(s, ab.id, lvl) : 'No such ability.'; } },
  { name: 'gene', args: '<bloodline> <potency> [dominant|recessive|dormant]', help: 'Add or edit a bloodline gene.', run: (s, a) => { const b = findId(BLOODLINES, a[0] ?? ''); return b ? setGene(s, b.id, num(a[1], 80), (a[2] as Gene['expression']) ?? 'dominant') : 'No such bloodline.'; } },
  { name: 'stage', args: '<bloodline|all> <0-4>', help: 'Force a bloodline stage.', run: (s, a) => { if (a[0] === 'all') return maxBloodlines(s); const b = findId(BLOODLINES, a[0] ?? ''); return b ? setStage(s, b.id, num(a[1], 4)) : 'No such bloodline.'; } },
  { name: 'allblood', args: '', help: 'Give all 20 bloodlines at Apotheosis.', run: (s) => allBloodlines(s) },
  { name: 'mutate', args: '<mutation>', help: 'Add a mutation.', run: (s, a) => { const m = Object.values(MUTATION_BY_ID).find((x) => x.id.includes(a[0] ?? '') || x.name.toLowerCase().includes((a[0] ?? '').toLowerCase())); return m ? addMutation(s, m.id) : 'No such mutation.'; } },
  { name: 'item', args: '<item> [level]', help: 'Spawn an item (id or name fragment).', run: (s, a) => { const lvl = num(a[a.length - 1], -1); const q = (lvl >= 0 ? a.slice(0, -1) : a).join(' '); const t = findId(ITEMS, q); return t ? spawnItem(s, t.id, Math.max(0, lvl)) : 'No such item.'; } },
  { name: 'loot', args: '<n> [rarity]', help: 'Spawn random gear.', run: (s, a) => spawnRandom(s, num(a[0], 5), (RARITIES.includes(a[1] as Rarity) ? a[1] : 'rare') as Rarity) },
  { name: 'relics', args: '', help: 'Every boss relic & house heirloom.', run: (s) => giveRelics(s) },
  { name: 'mats', args: '<n>', help: 'Every material ×n.', run: (s, a) => giveMaterials(s, num(a[0], 50)) },
  { name: 'vials', args: '<n>', help: 'Every blood vial ×n.', run: (s, a) => giveVials(s, num(a[0], 20)) },
  { name: 'potions', args: '<n>', help: 'Every consumable ×n.', run: (s, a) => giveConsumables(s, num(a[0], 10)) },
  { name: 'recipes', args: '', help: 'Learn every recipe.', run: (s) => learnAllRecipes(s) },
  { name: 'night', args: '<n>', help: 'Set the night number.', run: (s, a) => setNight(s, num(a[0], 1)) },
  { name: 'skip', args: '<n>', help: 'Advance n nights (income, events, AI).', run: (s, a) => skipNights(s, num(a[0], 1)) },
  { name: 'event', args: '<event> [region]', help: 'Trigger a world event.', run: (s, a) => triggerEvent(s, findId(WORLD_EVENTS, a[0] ?? '')?.id ?? '', a[1]) },
  { name: 'noevents', args: '', help: 'End all world events.', run: (s) => clearEvents(s) },
  { name: 'boss', args: '<region|all>', help: 'Mark a region\'s lord slain.', run: (s, a) => (a[0] === 'all' ? defeatAllBosses(s) : defeatBoss(s, findId(REGIONS, a.join(' '))?.id ?? '')) },
  { name: 'claim', args: '<region|all>', help: 'Take ownership of a region.', run: (s, a) => (a[0] === 'all' ? claimAll(s) : setOwner(s, findId(REGIONS, a.join(' '))?.id ?? '', 'player')) },
  { name: 'standing', args: '<house|all> <n>', help: 'Set standing with a house.', run: (s, a) => setStanding(s, a[0] === 'all' ? 'all' : findId(HOUSES, a[0] ?? '')?.id ?? 'veyrath', num(a[1], 100)) },
  { name: 'ally', args: '<house|all>', help: 'Toggle an alliance.', run: (s, a) => (a[0] === 'all' ? allyAll(s) : toggleAlliance(s, findId(HOUSES, a[0] ?? '')?.id ?? 'veyrath')) },
  { name: 'exile', args: '<house>', help: 'Toggle a house\'s exile.', run: (s, a) => toggleExile(s, findId(HOUSES, a[0] ?? '')?.id ?? 'veyrath') },
  { name: 'secrets', args: '[houses]', help: 'Reveal all world secrets (or house secrets).', run: (s, a) => (a[0] === 'houses' ? revealSecret(s, 'all') : unlockSecrets(s)) },
  { name: 'seat', args: '', help: 'Take a Council seat.', run: (s) => forceCouncilSeat(s, true) },
  { name: 'decree', args: '<decree>', help: 'Pass a decree instantly.', run: (s, a) => passDecree(s, DECREES.find((d) => d.id.includes(a[0] ?? '_'))?.id ?? '') },
  { name: 'marry', args: '<house>', help: 'Instantly wed the heir into a house.', run: (s, a) => marryInstant(s, findId(HOUSES, a[0] ?? '')?.id ?? 'veyrath') },
  { name: 'heirs', args: '', help: 'Roll new succession candidates.', run: (s) => rollProgeny(s) },
  { name: 'die', args: '', help: 'Inflict the True Death on the heir.', run: (s) => killHeir(s) },
  { name: 'quest', args: '<quest>', help: 'Accept any quest, ignoring requirements.', run: (s, a) => forceAccept(s, findId(ALL_QUESTS, a.join(' '))?.id ?? '') },
  { name: 'complete', args: '<quest|all>', help: 'Instantly complete a quest.', run: (s, a) => (a[0] === 'all' ? completeAllActive(s) : forceComplete(s, findId(ALL_QUESTS, a.join(' '))?.id ?? '')) },
  { name: 'flag', args: '<name>', help: 'Set a story flag.', run: (s, a) => addFlag(s, a.join(' ')) },
  { name: 'unflag', args: '<name>', help: 'Clear a story flag.', run: (s, a) => removeFlag(s, a.join(' ')) },
  { name: 'codex', args: '', help: 'Unseal every codex entry.', run: (s) => unlockCodex(s) },
  { name: 'bestiary', args: '', help: 'Complete the bestiary.', run: (s) => fullBestiary(s) },
  { name: 'feats', args: '', help: 'Grant every achievement.', run: (s) => unlockAchievements(s) },
  { name: 'regard', args: '<npc|all> <n>', help: 'Set NPC regard.', run: (s, a) => setRelation(s, a[0] ?? 'all', num(a[1], 100)) },
  { name: 'counter', args: '<key> <n>', help: 'Set a stats counter (achievement tracking).', run: (s, a) => setCounter(s, a[0] ?? 'kills', num(a[1])) },
  { name: 'toggle', args: `<${TOGGLES.join('|')}>`, help: 'Toggle a cheat flag.', run: (s, a) => { const k = TOGGLES.find((t) => t.toLowerCase() === (a[0] ?? '').toLowerCase()); if (!k) return 'Unknown flag.'; const d = dev(s); (d[k] as boolean) = !d[k]; return `${k}: ${d[k] ? 'ON' : 'off'}.`; } },
  { name: 'set', args: `<${NUMS.join('|')}> <n>`, help: 'Set a numeric dev value.', run: (s, a) => { const k = NUMS.find((t) => t.toLowerCase() === (a[0] ?? '').toLowerCase()); if (!k) return 'Unknown value.'; (dev(s)[k] as number) = clamp(num(a[1], 1), 0.05, 1000); return `${k} = ${dev(s)[k]}.`; } },
  { name: 'forms', args: '', help: 'Unlock every transformation.', run: (s) => { dev(s).allForms = true; return `All ${FORMS.length} forms unlocked.`; } },
];

/** Execute one console line. */
export function runCommand(s: GameState, line: string): string[] {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const [name, ...args] = parts;
  const cmd = COMMANDS.find((c) => c.name === name.toLowerCase());
  if (!cmd) return [`Unknown command “${name}”. Type help.`];
  try {
    const r = cmd.run(s, args);
    return Array.isArray(r) ? r : [r];
  } catch (e) {
    return [`Error: ${(e as Error).message}`];
  }
}

export const newId = () => uid();
