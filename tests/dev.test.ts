import { describe, expect, it } from 'vitest';
import { ABILITIES, BLOODLINES, BOSSES, CREATURES, REGIONS, SECRETS } from '../src/game/data';
import { ACHIEVEMENTS } from '../src/game/data/achievements';
import { CODEX } from '../src/game/data/lore';
import * as D from '../src/game/systems/dev';
import { activeFusions } from '../src/game/systems/genetics';
import { newGame } from '../src/game/systems/progression';
import { craft } from '../src/game/systems/crafting';
import { gift } from '../src/game/systems/world';
import { RECIPES } from '../src/game/data';

const game = () => newGame({ dynastyName: 'Dev', motto: 'm', colors: ['#000000', '#ffffff'], crest: 'bat', patron: 'veyrath', founderName: 'Ada', bloodline: 'shadow', seed: 7 });

describe('developer tools', () => {
  it('sets rank, attributes and points', () => {
    const s = game();
    D.setRank(s, 9);
    expect(s.heir.rank).toBe(9);
    expect(s.heir.skillPoints).toBeGreaterThan(10);
    D.setAttr(s, 'str', 77);
    expect(s.heir.attributes.str).toBe(77);
  });
  it('learns and masters every ability', () => {
    const s = game();
    D.learnAll(s);
    expect(s.heir.learned.length).toBeGreaterThanOrEqual(ABILITIES.length);
    D.maxMasteryAll(s);
    expect(Object.values(s.heir.mastery).every((m) => m.level === 10)).toBe(true);
  });
  it('grants all bloodlines with every fusion active', () => {
    const s = game();
    D.allBloodlines(s);
    expect(s.heir.genome).toHaveLength(BLOODLINES.length);
    expect(activeFusions(s.heir.genome, s.heir.stages).length).toBe(10);
  });
  it('forces a bloodline stage and unlocks its abilities', () => {
    const s = game();
    D.setStage(s, 'void', 4);
    expect(s.heir.stages.void).toBe(4);
    expect(s.heir.learned).toContain('bl-void-leg');
  });
  it('spawns items and resources', () => {
    const s = game();
    D.spawnItem(s, 'relic-hollow-king', 5);
    expect(s.inventory.at(-1)?.level).toBe(5);
    D.giveMaterials(s, 3);
    expect(s.materials['primordial-ichor']).toBe(3);
    D.spawnRandom(s, 4, 'legendary');
    expect(s.inventory.filter((i) => ['legendary', 'mythical'].includes(i.rarity)).length).toBeGreaterThanOrEqual(4);
  });
  it('manipulates the world', () => {
    const s = game();
    D.defeatAllBosses(s);
    expect(REGIONS.every((r) => s.regions[r.id].bossDefeated)).toBe(true);
    expect(BOSSES.every((b) => s.counters[`boss:${b.id}`] > 0)).toBe(true);
    D.claimAll(s);
    expect(Object.values(s.regions).every((r) => r.owner === 'player')).toBe(true);
    D.triggerEvent(s, 'blood-moon');
    expect(s.events.some((e) => e.id === 'blood-moon')).toBe(true);
    D.passDecree(s, 'crown-the-heir');
    expect(s.council.throne).toBe('player');
  });
  it('completes quests instantly, paying their costs', () => {
    const s = game();
    const out = D.forceComplete(s, 'mq-03');
    expect(s.completedQuests).toContain('mq-03');
    expect(out.join(' ')).toMatch(/Quest complete/);
  });
  it('unlocks all lore and feats', () => {
    const s = game();
    D.unlockCodex(s); D.unlockSecrets(s); D.fullBestiary(s); D.unlockAchievements(s);
    expect(s.codex).toHaveLength(CODEX.length);
    expect(s.secrets).toHaveLength(SECRETS.length);
    expect(Object.keys(s.bestiary)).toHaveLength(CREATURES.length);
    expect(s.achievements).toHaveLength(ACHIEVEMENTS.length);
  });
  it('free crafting and free court bypass costs', () => {
    const s = game();
    D.dev(s).enabled = true; D.dev(s).freeCrafting = true; D.dev(s).freeCourt = true;
    const r = RECIPES.find((x) => !x.hidden && x.output.item)!;
    expect(craft(s, r.id).ok).toBe(true);
    s.gold = 99999;
    for (let i = 0; i < 6; i++) gift(s, 'velmora');
    expect(s.courtActions).toBe(3);
  });
  it('console commands drive the same tools', () => {
    const s = game();
    expect(D.runCommand(s, 'gold 4242')[0]).toMatch(/4242/);
    expect(s.gold).toBe(4242);
    D.runCommand(s, 'rank 11');
    expect(s.heir.rank).toBe(11);
    D.runCommand(s, 'gene star 90');
    expect(s.heir.genome.find((g) => g.bloodline === 'star')?.potency).toBe(90);
    D.runCommand(s, 'toggle god');
    expect(s.dev?.god).toBe(true);
    D.runCommand(s, 'set timeScale 0.5');
    expect(s.dev?.timeScale).toBe(0.5);
    expect(D.runCommand(s, 'nonsense')[0]).toMatch(/Unknown/);
    expect(D.runCommand(s, 'help').length).toBe(D.COMMANDS.length);
  });
  it('unlock everything leaves a consistent, playable state', () => {
    const s = game();
    D.unlockEverything(s);
    expect(s.heir.rank).toBe(11);
    expect(s.gold).toBe(999999);
    expect(s.dev?.allForms).toBe(true);
  });
  it('inheritance simulator summarizes outcomes', () => {
    const r = D.simulateInheritance([{ bloodline: 'beast', potency: 50, expression: 'dominant' }], [{ bloodline: 'moon', potency: 50, expression: 'dominant' }], 200);
    expect(r.rows.length).toBeGreaterThanOrEqual(2);
    expect(r.rows[0].present).toBeGreaterThan(0.5);
  });
});
