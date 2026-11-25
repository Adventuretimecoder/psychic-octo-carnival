import { describe, expect, it } from 'vitest';
import { ABILITY_BY_ID, BLOODLINES, BOSS_BY_ID, CREATURE_BY_ID, HOUSES, ITEM_BY_ID, MATERIAL_BY_ID, QUESTS, RECIPES, REGIONS, SECRETS } from '../src/game/data';
import { ACHIEVEMENTS } from '../src/game/data/achievements';
import { CODEX, TIMELINE, WORLD_EVENTS } from '../src/game/data/lore';
import { BOSS_IDS, HOUSE_IDS, MATERIAL_IDS, REGION_IDS } from '../src/game/data/registry';
import type { Gene } from '../src/game/state';
import { craft, experiment } from '../src/game/systems/crafting';
import { activeFusions, compatibility, incompatiblePairs, inherit, isExpressed } from '../src/game/systems/genetics';
import { makeInstance } from '../src/game/systems/loot';
import { gainMastery, gainXp, generateProgeny, newGame, recordFeed, refreshStages, resolveAbility, succeed, trialMet } from '../src/game/systems/progression';
import { acceptQuest, availableQuests, completeQuest, questEvent } from '../src/game/systems/quests';
import { makeRng } from '../src/game/systems/rng';
import { applyHuntEvent, bankRun, failRun, startRun } from '../src/game/systems/run';
import { exportCode, importCode } from '../src/game/systems/save';
import { computeStats } from '../src/game/systems/stats';
import { advanceNight, claimRegion, gift, proposeAlliance, proposeMarriage, trade, buyPrice, sellPrice } from '../src/game/systems/world';

const game = () => newGame({ dynastyName: 'Test', motto: 'm', colors: ['#000000', '#ffffff'], crest: 'bat', patron: 'veyrath', founderName: 'Ada', bloodline: 'shadow', seed: 42 });

describe('content integrity', () => {
  it('has the required scale', () => {
    expect(HOUSES).toHaveLength(20);
    expect(BLOODLINES).toHaveLength(20);
    expect(REGIONS).toHaveLength(12);
    expect(Object.keys(BOSS_BY_ID)).toHaveLength(12);
    expect(TIMELINE.length).toBeGreaterThanOrEqual(40);
    expect(CODEX.length).toBeGreaterThanOrEqual(45);
    expect(WORLD_EVENTS).toHaveLength(12);
  });
  it('every cross-reference resolves', () => {
    for (const h of HOUSE_IDS) expect(HOUSES.find((x) => x.id === h)).toBeTruthy();
    for (const r of REGIONS) {
      expect(BOSS_BY_ID[r.boss]).toBeTruthy();
      expect(CREATURE_BY_ID[r.miniboss]).toBeTruthy();
      for (const e of r.enemies) expect(CREATURE_BY_ID[e]).toBeTruthy();
      for (const a of r.adjacent) expect(REGION_IDS).toContain(a);
      for (const s of r.secrets) expect(SECRETS.find((x) => x.id === s)).toBeTruthy();
    }
    for (const b of BOSS_IDS) expect(ITEM_BY_ID[`relic-${b}`]).toBeTruthy();
    for (const m of MATERIAL_IDS) expect(MATERIAL_BY_ID[m]).toBeTruthy();
    for (const b of BLOODLINES) for (const st of b.stages) for (const u of st.unlocks) if (!u.startsWith('form:')) expect(ABILITY_BY_ID[u], u).toBeTruthy();
    for (const s of SECRETS) if (s.grants?.ability) expect(ABILITY_BY_ID[s.grants.ability], s.grants.ability).toBeTruthy();
    for (const r of RECIPES) if (r.output.item) expect(ITEM_BY_ID[r.output.item], r.output.item).toBeTruthy();
    for (const q of QUESTS) for (const n of q.next ?? []) expect(QUESTS.find((x) => x.id === n), n).toBeTruthy();
    for (const b of BLOODLINES) expect(QUESTS.find((q) => q.id === `bq-${b.id}`), b.id).toBeTruthy();
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
  });
});

describe('inheritance', () => {
  it('two recessive copies express in the child', () => {
    const a: Gene[] = [{ bloodline: 'mirror', potency: 50, expression: 'recessive' }];
    const b: Gene[] = [{ bloodline: 'mirror', potency: 50, expression: 'recessive' }];
    let expressed = 0;
    for (let i = 0; i < 200; i++) { const r = inherit(a, b, makeRng(i)); const g = r.genome.find((x) => x.bloodline === 'mirror'); if (g && g.expression === 'dominant') expressed++; }
    expect(expressed).toBeGreaterThan(40);
  });
  it('incompatible bloodlines produce instability', () => {
    const a: Gene[] = [{ bloodline: 'celestial', potency: 80, expression: 'dominant' }];
    const b: Gene[] = [{ bloodline: 'abyssal', potency: 80, expression: 'dominant' }];
    expect(incompatiblePairs([...a, ...b])).toHaveLength(1);
    const unstable = Array.from({ length: 100 }, (_, i) => inherit(a, b, makeRng(i))).filter((r) => r.instability > 0);
    expect(unstable.length).toBeGreaterThan(20);
    expect(compatibility(a, b).score).toBeLessThan(50);
  });
  it('mutations can create bloodlines absent from both parents', () => {
    const a: Gene[] = [{ bloodline: 'beast', potency: 40, expression: 'dominant' }];
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) for (const g of inherit(a, a, makeRng(i), 0.5).genome) seen.add(g.bloodline);
    expect(seen.size).toBeGreaterThan(5);
  });
  it('fusions activate when both lines are awakened', () => {
    const genome: Gene[] = [{ bloodline: 'shadow', potency: 60, expression: 'dominant' }, { bloodline: 'weaver', potency: 60, expression: 'dominant' }];
    expect(activeFusions(genome, { shadow: 2, weaver: 2 }).map((f) => f.id)).toContain('fusion-shadow-hemomancy');
    expect(activeFusions(genome, { shadow: 1, weaver: 2 })).toHaveLength(0);
  });
  it('succession produces heirs carrying the spouse house blood', () => {
    const s = game();
    s.heir.rank = 3; s.gold = 5000; s.houses.isenreth.standing = 60;
    expect(proposeMarriage(s, 'isenreth').ok).toBe(true);
    const kids = generateProgeny(s);
    expect(kids).toHaveLength(3);
    expect(kids.some((k) => k.genome.some((g) => g.bloodline === 'frost'))).toBe(true);
    s.progeny = kids;
    succeed(s, 0, 'test');
    expect(s.heir.generation).toBe(2);
    expect(s.heir.maternalHouse).toBe('isenreth');
    expect(s.lineage).toHaveLength(1);
  });
});

describe('progression', () => {
  it('rank trials gate advancement', () => {
    const s = game();
    gainXp(s, 500);
    expect(s.heir.rank).toBe(1); // rank 2 requires reaching a second floor
    s.regions['hollow-wood'].cleared = 2; s.counters['floors'] = 2;
    gainXp(s, 1);
    expect(s.heir.rank).toBe(2); // rank 3 requires slaying the Mother of Wolves
    expect(trialMet(s, 3)).toBe(false);
    s.counters['boss:mother-of-wolves'] = 1;
    gainXp(s, 1);
    expect(s.heir.rank).toBe(3);
  });
  it('mastery evolves abilities into new tiers', () => {
    const s = game();
    const def = ABILITY_BY_ID['blood-manipulation'];
    // The founder carries Shadowblood (Stirring), so the lance mutates into its shadow variant.
    expect(resolveAbility(def, s.heir).name).toBe('Umbral Spears');
    expect(resolveAbility(def, s.heir).tier).toBe(0);
    for (let i = 0; i < 400; i++) gainMastery(s.heir, def.id, 1);
    expect(resolveAbility(def, s.heir).tier).toBeGreaterThanOrEqual(2);
  });
  it('feeding raises resonant potency and awakens bloodline stages', () => {
    const s = game();
    const shadow = s.heir.genome.find((g) => g.bloodline === 'shadow')!;
    const before = shadow.potency;
    for (let i = 0; i < 20; i++) recordFeed(s, 'noble');
    expect(shadow.potency).toBeGreaterThan(before);
    s.heir.rank = 3; shadow.potency = 45;
    refreshStages(s.heir, s);
    expect(s.heir.stages.shadow).toBe(2);
  });
  it('derived stats respond to gear', () => {
    const s = game();
    const base = computeStats(s).armor;
    const armor = Object.values(ITEM_BY_ID).find((i) => i.category === 'armor' && i.mods.some((m) => m.stat === 'armor'))!;
    s.heir.equipment.armor = makeInstance(armor.id, makeRng(1));
    expect(computeStats(s).armor).toBeGreaterThan(base);
  });
});

describe('meta systems', () => {
  it('quests track events and grant rewards', () => {
    const s = game();
    for (const q of availableQuests(s).filter((q) => q.category === 'main')) acceptQuest(s, q.id);
    const mq = s.quests.find((q) => q.id === 'mq-01')!;
    expect(mq).toBeTruthy();
    questEvent(s, { type: 'depth', region: 'hollow-wood', floor: 2 });
    for (let i = 0; i < 3; i++) questEvent(s, { type: 'feed', blood: 'beast' });
    expect(s.quests.find((q) => q.id === 'mq-01')!.done).toBe(true);
    const gold = s.gold;
    completeQuest(s, 'mq-01');
    expect(s.gold).toBeGreaterThan(gold);
    expect(s.completedQuests).toContain('mq-01');
  });
  it('a hunt run banks loot or loses it on death', () => {
    const s = game();
    startRun(s, 'hollow-wood');
    applyHuntEvent(s, { type: 'gold', amount: 100 });
    applyHuntEvent(s, { type: 'kill', creature: 'dire-wolf', family: 'beast', elite: false, xp: 10, tags: ['beast', 'wolf'] });
    const g = s.gold;
    bankRun(s);
    expect(s.gold).toBeGreaterThanOrEqual(g + 100);
    expect(s.bestiary['dire-wolf']).toBe(1);
    startRun(s, 'hollow-wood');
    applyHuntEvent(s, { type: 'gold', amount: 100 });
    const g2 = s.gold;
    const r = failRun(s, 'test');
    expect(s.gold).toBeLessThan(g2 + 100);
    expect(r.trueDeath).toBe(false);
    expect(s.heir.vitae).toBe(2);
  });
  it('court actions change standing and alliances need trust', () => {
    const s = game();
    s.gold = 9999;
    const before = s.houses.velmora.standing;
    expect(gift(s, 'velmora').ok).toBe(true);
    expect(s.houses.velmora.standing).toBeGreaterThan(before);
    expect(proposeAlliance(s, 'kharvoss').ok).toBe(false);
  });
  it('regions can only be claimed after their lord falls', () => {
    const s = game();
    s.gold = 99999;
    expect(claimRegion(s, 'the-maw').ok).toBe(false);
    s.regions['the-maw'].bossDefeated = true;
    expect(claimRegion(s, 'the-maw').ok).toBe(true);
    expect(s.regions['the-maw'].owner).toBe('player');
    const g = s.gold;
    advanceNight(s);
    expect(s.gold).toBeGreaterThan(g);
  });
  it('market prices respond to supply', () => {
    const s = game();
    s.materials['bone-shard'] = 30;
    const p0 = sellPrice(s, 'bone-shard');
    trade(s, 'bone-shard', -20);
    expect(sellPrice(s, 'bone-shard')).toBeLessThan(p0);
    expect(buyPrice(s, 'bone-shard')).toBeGreaterThan(sellPrice(s, 'bone-shard'));
  });
  it('crafting consumes inputs and experimentation yields research or discovery', () => {
    const s = game();
    const r = RECIPES.find((x) => !x.hidden && x.output.item && ITEM_BY_ID[x.output.item].category === 'consumable')!;
    for (const i of r.inputs) { if (i.id.startsWith('blood:')) s.vials[i.id.slice(6) as 'common'] = 10; else s.materials[i.id] = 10; }
    s.gold = 9999;
    expect(craft(s, r.id).ok).toBe(true);
    s.materials['grave-dust'] = 3; s.materials['bone-shard'] = 3;
    const res = s.research, known = s.knownRecipes.length;
    experiment(s, ['grave-dust', 'bone-shard']);
    expect(s.research > res || s.knownRecipes.length > known).toBe(true);
  });
  it('saves round-trip through export codes', () => {
    const s = game();
    s.gold = 777;
    const back = importCode(exportCode(s))!;
    expect(back.gold).toBe(777);
    expect(back.heir.name).toBe('Ada');
  });
  it('the founder inherits the patron house signature', () => {
    const s = game();
    expect(s.heir.learned).toContain('house-veyrath');
    expect(s.heir.genome.some(isExpressed)).toBe(true);
  });
});
