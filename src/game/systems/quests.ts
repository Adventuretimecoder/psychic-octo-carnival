/** Quest availability, progress tracking, completion, branching choices; achievements & titles. */
import { ACHIEVEMENTS } from '../data/achievements';
import { BLOODLINE_BY_ID, CREATURE_BY_ID, HOUSE_BY_ID, HOUSES, ITEM_BY_ID, QUESTS } from '../data';
import type { GameState, QuestProgress } from '../state';
import type { QuestChoice, QuestDef, QuestObjective, QuestReward } from '../types';
import { expressedGenes } from './genetics';
import { makeInstance } from './loot';
import { gainXp, refreshStages } from './progression';
import { makeRng } from './rng';

/** House questlines become regular quests (giver = house). */
export const HOUSE_QUESTS: QuestDef[] = HOUSES.map((h) => ({
  id: `house-${h.id}`, name: h.quest.name, category: 'house', giver: h.id, summary: h.quest.summary, objectives: h.quest.steps, reward: { ...h.quest.reward, items: [...(h.quest.reward.items ?? []), h.uniqueItem.id] },
}));
export const ALL_QUESTS: QuestDef[] = [...QUESTS, ...HOUSE_QUESTS];
export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(ALL_QUESTS.map((q) => [q.id, q]));

export function questAvailable(state: GameState, q: QuestDef): boolean {
  if (state.quests.some((p) => p.id === q.id)) return false;
  if (state.completedQuests.includes(q.id) && q.category !== 'repeatable') return false;
  if (q.category === 'repeatable' && state.flags.includes(`cooldown:${q.id}:${state.night}`)) return false;
  const r = q.requires;
  if (r?.quests?.some((id) => !state.completedQuests.includes(id))) return false;
  if (r?.flags?.some((f) => !state.flags.includes(f))) return false;
  if (r?.notFlags?.some((f) => state.flags.includes(f))) return false;
  if (r?.rank && state.heir.rank < r.rank) return false;
  if (q.category === 'hidden') {
    const first = q.objectives[0];
    const woke = state.flags.includes(`unlock:${q.id}`) || (first?.type === 'secret' && state.secrets.includes(first.secret));
    if (!woke) return false;
  }
  if (q.category === 'bloodline') {
    const bl = q.id.replace(/^bq-/, '');
    const g = expressedGenes(state.heir.genome).find((x) => x.bloodline === bl);
    if (!g || (state.heir.stages[g.bloodline] ?? 0) < 2) return false;
  }
  if (q.category === 'house') {
    const h = state.houses[q.giver];
    if (!h || h.standing < 10) return false;
  }
  if (q.category === 'legendary' && state.heir.rank < 6 && !r?.rank) return false;
  return true;
}

export const availableQuests = (state: GameState) => ALL_QUESTS.filter((q) => questAvailable(state, q));

export function acceptQuest(state: GameState, id: string) {
  const q = QUEST_MAP[id];
  if (!q || !questAvailable(state, q)) return;
  state.quests.push({ id, progress: q.objectives.map(() => 0), done: false, startedNight: state.night });
  refreshQuestProgress(state);
}

/** Objective target value. */
export function objectiveTarget(o: QuestObjective): number {
  switch (o.type) {
    case 'kill': case 'feed': case 'collect': return o.count;
    case 'standing': return o.value;
    case 'rank': return o.rank;
    case 'gold': return o.amount;
    case 'night': return o.nights;
    case 'depth': return o.floor;
    default: return 1;
  }
}

export type GameEvent =
  | { type: 'kill'; tags: string[]; creature: string }
  | { type: 'boss'; boss: string }
  | { type: 'feed'; blood: string }
  | { type: 'depth'; region: string; floor: number }
  | { type: 'craft'; recipe: string };

/** Event-driven objectives (kills, feeds, bosses, depth, crafting). */
export function questEvent(state: GameState, ev: GameEvent) {
  for (const qp of state.quests) {
    const q = QUEST_MAP[qp.id];
    if (!q) continue;
    q.objectives.forEach((o, i) => {
      if (o.type === 'kill' && ev.type === 'kill' && (ev.tags.includes(o.tag) || ev.creature === o.tag)) qp.progress[i]++;
      if (o.type === 'boss' && ev.type === 'boss' && ev.boss === o.boss) qp.progress[i] = 1;
      if (o.type === 'feed' && ev.type === 'feed' && (o.blood === 'any' || o.blood === ev.blood)) qp.progress[i]++;
      if (o.type === 'depth' && ev.type === 'depth' && ev.region === o.region) qp.progress[i] = Math.max(qp.progress[i], ev.floor);
      if (o.type === 'craft' && ev.type === 'craft' && ev.recipe === o.recipe) qp.progress[i] = 1;
    });
  }
  refreshQuestProgress(state);
}

/** State-driven objectives are re-read from the world. */
export function refreshQuestProgress(state: GameState) {
  for (const qp of state.quests) {
    const q = QUEST_MAP[qp.id];
    if (!q) continue;
    q.objectives.forEach((o, i) => {
      switch (o.type) {
        case 'collect': qp.progress[i] = (state.materials[o.item] ?? 0) + (state.consumables[o.item] ?? 0) + state.inventory.filter((x) => x.templateId === o.item).length; break;
        case 'standing': qp.progress[i] = Math.max(0, state.houses[o.house]?.standing ?? 0); break;
        case 'rank': qp.progress[i] = state.heir.rank; break;
        case 'own': qp.progress[i] = state.regions[o.region]?.owner === 'player' ? 1 : 0; break;
        case 'secret': qp.progress[i] = state.secrets.includes(o.secret) ? 1 : 0; break;
        case 'gold': qp.progress[i] = Math.min(state.gold, o.amount); break;
        case 'night': qp.progress[i] = state.night - qp.startedNight; break;
        case 'boss': if (q.category !== 'repeatable' && (state.counters[`boss:${o.boss}`] ?? 0) > 0) qp.progress[i] = 1; break;
        case 'depth': qp.progress[i] = Math.max(qp.progress[i], (state.regions[o.region]?.cleared ?? 0)); break;
      }
    });
    qp.done = q.objectives.every((o, i) => qp.progress[i] >= objectiveTarget(o));
  }
}

export interface CompletionResult { log: string[]; choice?: QuestDef['choice'] }

export function completeQuest(state: GameState, id: string): CompletionResult {
  const qp = state.quests.find((p) => p.id === id);
  const q = QUEST_MAP[id];
  if (!qp || !q || !qp.done) return { log: [] };
  // Pay costs
  for (const o of q.objectives) {
    if (o.type === 'gold') state.gold -= o.amount;
    if (o.type === 'collect') take(state, o.item, o.count);
  }
  state.quests = state.quests.filter((p) => p.id !== id);
  if (!state.completedQuests.includes(id)) state.completedQuests.push(id);
  if (q.category === 'repeatable') state.flags.push(`cooldown:${id}:${state.night}`);
  state.counters['quests'] = (state.counters['quests'] ?? 0) + 1;
  const log = [`Quest complete: ${q.name}.`, ...applyReward(state, q.reward)];
  log.push(...refreshStages(state.heir, state));
  for (const n of q.next ?? []) if (QUEST_MAP[n] && questAvailable(state, QUEST_MAP[n])) log.push(`New quest: ${QUEST_MAP[n].name}.`);
  return { log, choice: q.choice };
}

export function chooseOption(state: GameState, opt: QuestChoice): string[] {
  const log = [opt.outcome, ...applyReward(state, opt.effects)];
  if (opt.effects.flag) state.flags.push(opt.effects.flag);
  if (opt.effects.corruption) state.heir.corruption = Math.max(0, Math.min(100, state.heir.corruption + opt.effects.corruption));
  if (opt.effects.purity) state.heir.purity = Math.max(0, Math.min(100, state.heir.purity + opt.effects.purity));
  return log;
}

export function applyReward(state: GameState, r: QuestReward): string[] {
  const log: string[] = [];
  const parts: string[] = [];
  if (r.gold) { state.gold += r.gold; state.counters['gold-earned'] = (state.counters['gold-earned'] ?? 0) + r.gold; parts.push(`${r.gold} crowns`); }
  if (r.prestige) { state.dynasty.prestige += r.prestige; parts.push(`${r.prestige} prestige`); }
  for (const s of r.standing ?? []) if (state.houses[s.house]) { state.houses[s.house].standing = clamp(state.houses[s.house].standing + s.value, -100, 100); parts.push(`${s.value > 0 ? '+' : ''}${s.value} ${HOUSE_BY_ID[s.house]?.name ?? s.house}`); }
  for (const m of r.materials ?? []) { state.materials[m.id] = (state.materials[m.id] ?? 0) + m.count; parts.push(`${m.count}× ${m.id.replace(/-/g, ' ')}`); }
  for (const it of r.items ?? []) {
    const t = ITEM_BY_ID[it];
    if (!t) continue;
    if (t.category === 'consumable') state.consumables[it] = (state.consumables[it] ?? 0) + 1;
    else state.inventory.push(makeInstance(it, makeRng(state.seed + state.night + state.inventory.length)));
    parts.push(t.name);
  }
  if (r.ability && !state.heir.learned.includes(r.ability)) { state.heir.learned.push(r.ability); parts.push('a new ability'); }
  if (r.title && !state.heir.titles.includes(r.title)) { state.heir.titles.push(r.title); parts.push(`the title “${r.title}”`); }
  if (parts.length) log.push(`Rewards: ${parts.join(', ')}.`);
  if (r.xp) log.push(...gainXp(state, r.xp));
  return log;
}

function take(state: GameState, id: string, n: number) {
  let left = n;
  const m = Math.min(left, state.materials[id] ?? 0); state.materials[id] = (state.materials[id] ?? 0) - m; left -= m;
  const c = Math.min(left, state.consumables[id] ?? 0); state.consumables[id] = (state.consumables[id] ?? 0) - c; left -= c;
  while (left > 0) { const i = state.inventory.findIndex((x) => x.templateId === id); if (i < 0) break; state.inventory.splice(i, 1); left--; }
}

// ───────────────────────── Achievements ─────────────────────────
export function checkAchievements(state: GameState): string[] {
  const log: string[] = [];
  state.counters['bestiary'] = Object.keys(state.bestiary).length;
  state.counters['codex'] = state.codex.length;
  state.counters['regions-owned'] = Object.values(state.regions).filter((r) => r.owner === 'player').length;
  state.counters['alliances'] = Object.values(state.houses).filter((h) => h.alliance).length;
  state.counters['legendary-items'] = state.inventory.filter((i) => ['legendary', 'mythical', 'divine', 'primordial'].includes(i.rarity)).length + Object.values(state.heir.equipment).filter((i) => i && ['legendary', 'mythical', 'divine', 'primordial'].includes(i.rarity)).length;
  state.counters['mutations'] = Math.max(state.counters['mutations'] ?? 0, state.heir.mutations.length);
  state.counters['nights'] = state.night;
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    if ((state.counters[a.counter] ?? 0) >= a.target) {
      state.achievements.push(a.id);
      state.dynasty.prestige += a.prestige;
      log.push(`Achievement: ${a.name}${a.title ? ` — title “${a.title}” earned` : ''}.`);
      if (a.title && !state.heir.titles.includes(a.title)) state.heir.titles.push(a.title);
    }
  }
  return log;
}

/** Describe an objective's target in plain words with names resolved. */
export function objectiveLabel(o: QuestObjective): string {
  if (o.text) return o.text;
  if (o.type === 'kill') return `Slay ${o.count} ${CREATURE_BY_ID[o.tag]?.name ?? o.tag}`;
  return o.type;
}
export const bloodlineName = (id: string) => BLOODLINE_BY_ID[id as keyof typeof BLOODLINE_BY_ID]?.name ?? id;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export type { QuestProgress };
