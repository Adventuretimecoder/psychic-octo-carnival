/** A hunt run: multi-floor expedition. Applies engine events to the persistent state. */
import { BOSS_BY_ID, CREATURE_BY_ID, ITEM_BY_ID, REGION_BY_ID } from '../data';
import { CODEX } from '../data/lore';
import type { HuntEvent } from '../engine/hunt';
import type { GameState } from '../state';
import { discoverSecret, gainMastery, gainXp, recordFeed } from './progression';
import { checkAchievements, questEvent, refreshQuestProgress } from './quests';
import { computeStats } from './stats';
import { advanceNight } from './world';

export function startRun(s: GameState, region: string): void {
  s.run = { region, floor: 1, seed: (s.seed ^ (s.night * 7919)) + Math.floor(Math.random() * 1e6), hp: -1, blood: -1, gold: 0, materials: {}, items: [], consumables: {}, kills: 0, feeds: 0, xp: 0, log: [] };
  s.counters['hunts'] = (s.counters['hunts'] ?? 0) + 1;
}

/** Apply one engine event. Returns messages worth surfacing (level-ups etc.). */
export function applyHuntEvent(s: GameState, e: HuntEvent): string[] {
  const run = s.run;
  const out: string[] = [];
  switch (e.type) {
    case 'kill': {
      s.counters['kills'] = (s.counters['kills'] ?? 0) + 1;
      s.counters[`kills:${e.family}`] = (s.counters[`kills:${e.family}`] ?? 0) + 1;
      if (!s.bestiary[e.creature]) out.push(`Bestiary: ${CREATURE_BY_ID[e.creature]?.name} recorded.`);
      s.bestiary[e.creature] = (s.bestiary[e.creature] ?? 0) + 1;
      if (run) { run.kills++; run.xp += e.xp; }
      out.push(...gainXp(s, e.xp));
      questEvent(s, { type: 'kill', tags: e.tags, creature: e.creature });
      break;
    }
    case 'feed':
      recordFeed(s, e.blood);
      if (run) run.feeds++;
      if (Math.random() < 0.3) s.vials[e.blood] = (s.vials[e.blood] ?? 0) + 1;
      questEvent(s, { type: 'feed', blood: e.blood });
      break;
    case 'gold': if (run) run.gold += e.amount; break;
    case 'material': if (run) run.materials[e.id] = (run.materials[e.id] ?? 0) + e.count; break;
    case 'consumable': if (run) run.consumables[e.id] = (run.consumables[e.id] ?? 0) + 1; break;
    case 'item': if (run) run.items.push(e.item); break;
    case 'consumeBelt': s.consumables[e.id] = Math.max(0, (s.consumables[e.id] ?? 0) - 1); break;
    case 'secret': out.push(...discoverSecret(s, e.id)); for (const c of CODEX) if (c.unlockedBy === e.id && !s.codex.includes(c.id)) s.codex.push(c.id), out.push(`Codex: ${c.title}`); break;
    case 'mastery': {
      const msg = gainMastery(s.heir, e.ability, e.amount, computeStats(s).research);
      if (msg) out.push(msg);
      break;
    }
    case 'boss': {
      s.counters['bosses'] = (s.counters['bosses'] ?? 0) + 1;
      s.counters[`boss:${e.boss}`] = (s.counters[`boss:${e.boss}`] ?? 0) + 1;
      if (e.perfect) s.counters['perfect-boss'] = (s.counters['perfect-boss'] ?? 0) + 1;
      if (run) { const rs = s.regions[run.region]; rs.bossDefeated = true; rs.cleared = Math.max(rs.cleared, REGION_BY_ID[run.region].floors); }
      s.heir.deeds.push(`Slew ${BOSS_BY_ID[e.boss]?.name}`);
      s.dynasty.prestige += 10 + REGION_BY_ID[run?.region ?? 'hollow-wood'].level * 3;
      for (const c of CODEX) if (c.unlockedBy === `boss:${e.boss}` && !s.codex.includes(c.id)) s.codex.push(c.id), out.push(`Codex unlocked: ${c.title}`);
      out.push(...gainXp(s, e.xp));
      questEvent(s, { type: 'boss', boss: e.boss });
      break;
    }
    case 'transform': s.counters['transforms'] = (s.counters['transforms'] ?? 0) + 1; break;
    case 'frenzy': s.counters['frenzies'] = (s.counters['frenzies'] ?? 0) + 1; break;
    case 'combo': s.counters['max-combo'] = Math.max(s.counters['max-combo'] ?? 0, e.n); break;
  }
  out.push(...checkAchievements(s));
  return out;
}

/** Called when the player steps through a floor's portal. */
export function floorComplete(s: GameState, hp: number, blood: number): { last: boolean } {
  const run = s.run!;
  run.hp = hp; run.blood = blood;
  const rs = s.regions[run.region];
  rs.cleared = Math.max(rs.cleared, run.floor);
  s.counters['floors'] = (s.counters['floors'] ?? 0) + 1;
  questEvent(s, { type: 'depth', region: run.region, floor: run.floor });
  const last = run.floor >= REGION_BY_ID[run.region].floors;
  return { last };
}

export function descend(s: GameState) { const run = s.run!; run.floor++; run.seed += 104729; }

/** Return to the Haven with everything found. A night passes. */
export function bankRun(s: GameState): string[] {
  const run = s.run!;
  const out: string[] = [];
  s.gold += run.gold;
  s.counters['gold-earned'] = (s.counters['gold-earned'] ?? 0) + run.gold;
  for (const [k, v] of Object.entries(run.materials)) s.materials[k] = (s.materials[k] ?? 0) + v;
  for (const [k, v] of Object.entries(run.consumables)) s.consumables[k] = (s.consumables[k] ?? 0) + v;
  s.inventory.push(...run.items);
  const legendary = run.items.filter((i) => ['legendary', 'mythical', 'divine', 'primordial'].includes(i.rarity));
  if (legendary.length) s.heir.deeds.push(`Recovered ${ITEM_BY_ID[legendary[0].templateId].name}`);
  out.push(`You return to Blackmoor Haven with ${run.gold} crowns, ${run.items.length} items and ${Object.values(run.materials).reduce((a, b) => a + b, 0)} materials.`);
  s.run = null;
  out.push(...advanceNight(s));
  refreshQuestProgress(s);
  out.push(...checkAchievements(s));
  return out;
}

/** The heir falls. Half the unbanked crowns and materials and all unbanked items are lost; a vitae is spent. */
export function failRun(s: GameState, cause: string): { trueDeath: boolean; log: string[] } {
  const run = s.run!;
  const out: string[] = [];
  const keptGold = Math.floor(run.gold / 2);
  s.gold += keptGold;
  for (const [k, v] of Object.entries(run.materials)) s.materials[k] = (s.materials[k] ?? 0) + Math.floor(v / 2);
  s.heir.vitae--;
  if (cause === 'the Sun') s.counters['sun-deaths'] = (s.counters['sun-deaths'] ?? 0) + 1;
  out.push(`${s.heir.name} falls to ${cause}. Your servants drag the body home; ${keptGold} crowns are recovered, the rest is lost.`);
  s.run = null;
  const trueDeath = s.heir.vitae <= 0;
  if (trueDeath) {
    s.heir.alive = false;
    s.counters['true-deaths'] = (s.counters['true-deaths'] ?? 0) + 1;
    out.push(`${s.heir.name} has met the True Death. The line must continue.`);
  } else out.push(`${s.heir.name} sinks into torpor and wakes the next night, weaker in spirit. (${s.heir.vitae} vitae remain)`);
  out.push(...advanceNight(s));
  return { trueDeath, log: out };
}
