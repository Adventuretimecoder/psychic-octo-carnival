/** World-event modifiers applied to the heir and to hunts. */
import { WORLD_EVENTS } from '../data/lore';
import type { GameState } from '../state';
import type { Modifier, WorldEventDef } from '../types';
import type { ModSource } from './stats';

export const EVENT_BY_ID: Record<string, WorldEventDef> = Object.fromEntries(WORLD_EVENTS.map((e) => [e.id, e]));

const DECREE_MODS: Record<string, { name: string; mods: Modifier[] }> = {
  'open-archives': { name: 'Opening of the Archives', mods: [{ stat: 'research', mul: 0.25 }] },
  'blood-rationing': { name: 'Blood Rationing', mods: [{ stat: 'hungerRate', mul: -0.2 }] },
  'pale-truce': { name: 'The Pale Truce', mods: [{ stat: 'sunResist', add: 0.3 }] },
};

export function WORLD_EVENT_MODS(state: GameState): ModSource[] {
  const out = state.events.map((a) => EVENT_BY_ID[a.id]).filter((e) => e?.effects.playerMods?.length).map((e) => ({ label: `Event: ${e.name}`, mods: e.effects.playerMods! }));
  for (const d of state.council.decrees) if (DECREE_MODS[d]) out.push({ label: `Decree: ${DECREE_MODS[d].name}`, mods: DECREE_MODS[d].mods });
  if (state.council.throne === 'player') out.push({ label: 'Sovereign of the Crimson Throne', mods: [{ stat: 'influence', add: 10 }, { stat: 'maxHp', mul: 0.1 }] });
  return out;
}

/** Combined effects of active events on a hunt in a region. */
export function huntModifiers(state: GameState, region: string) {
  let hp = 1, dmg = 1, gold = 1, xp = 1, corruption = 0;
  let bloodBoost: string | undefined;
  let bossOverride: string | undefined;
  for (const a of state.events) {
    const e = EVENT_BY_ID[a.id];
    if (!e) continue;
    const fx = e.effects;
    if (fx.region === 'random' && a.region !== region) continue;
    hp *= fx.enemyHpMul ?? 1;
    dmg *= fx.enemyDmgMul ?? 1;
    gold *= fx.goldMul ?? 1;
    xp *= fx.xpMul ?? 1;
    corruption += fx.corruptionChance ?? 0;
    bloodBoost = fx.bloodTypeBoost ?? bloodBoost;
    bossOverride = fx.bossOverride ?? bossOverride;
  }
  return { hp, dmg, gold, xp, corruption, bloodBoost, bossOverride };
}
