/**
 * The strategic layer: nights passing, house AI, court actions, the Night Council
 * and decrees, marriage, territories & buildings, economy, banking, auctions, world events.
 */
import { WORLD_EVENTS } from '../data/lore';
import { BLOODLINE_BY_ID, BOSS_BY_ID, HOUSE_BY_ID, HOUSES, ITEM_BY_ID, MATERIAL_BY_ID, REGION_BY_ID, REGIONS } from '../data';
import type { Gene, GameState } from '../state';
import type { BloodType, HouseId, Modifier } from '../types';
import { compatibility } from './genetics';
import { itemValue, rollEquipment } from './loot';
import { randomName } from './progression';
import { makeRng, pick, type Rng, weighted } from './rng';
import { computeStats } from './stats';
import { EVENT_BY_ID } from './worldHooks';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rngFor = (s: GameState, salt: number) => makeRng((s.seed ^ (s.night * 2654435761)) + salt);
const log = (s: GameState, msg: string) => { s.chronicle.unshift(`Night ${s.night}: ${msg}`); if (s.chronicle.length > 60) s.chronicle.length = 60; };

// ───────────────────────── Dynasty power ─────────────────────────
export function dynastyPower(s: GameState): number {
  const st = computeStats(s);
  const owned = Object.values(s.regions).filter((r) => r.owner === 'player').length;
  const allies = Object.values(s.houses).filter((h) => h.alliance).length;
  return Math.round(s.dynasty.prestige / 8 + st.influence * 2 + owned * 7 + allies * 5 + s.heir.rank * 2);
}

export const maxCourtActions = (s: GameState) => 3 + (s.heir.rank >= 6 ? 1 : 0) + (s.heir.path === 'court' ? 1 : 0);

// ───────────────────────── Court actions ─────────────────────────
export interface CourtResult { ok: boolean; msg: string }

const spend = (s: GameState): boolean => { if (s.courtActions <= 0) return false; s.courtActions--; return true; };

export const giftCost = (s: GameState, h: HouseId) => Math.round(80 * (1 + s.houses[h].power / 50));

export function gift(s: GameState, h: HouseId): CourtResult {
  const cost = giftCost(s, h);
  if (s.gold < cost) return { ok: false, msg: 'Your treasury cannot bear the gift.' };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  s.gold -= cost;
  const cha = computeStats(s).cha;
  const gain = Math.round(6 + cha * 0.4 + (HOUSE_BY_ID[h].temperament === 'mercenary' ? 4 : 0) - (HOUSE_BY_ID[h].temperament === 'proud' ? 2 : 0));
  s.houses[h].standing = clamp(s.houses[h].standing + gain, -100, 100);
  return { ok: true, msg: `${HOUSE_BY_ID[h].name} accepts your gift. (+${gain} standing)` };
}

export function petition(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (hs.standing < 20) return { ok: false, msg: `${HOUSE_BY_ID[h].name} will not hear your petition (needs 20 standing).` };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  const rng = rngFor(s, h.length * 31);
  hs.standing -= 6;
  const roll = rng();
  if (roll < 0.4) { const g = Math.round(60 + hs.power * 4); s.gold += g; return { ok: true, msg: `They grant a stipend of ${g} crowns.` }; }
  if (roll < 0.75) {
    const bl = HOUSE_BY_ID[h].bloodlines[0];
    const t: BloodType = bl === 'royal' ? 'royal' : hs.power > 60 ? 'noble' : 'magical';
    s.vials[t] = (s.vials[t] ?? 0) + 2;
    return { ok: true, msg: `They send two vials of ${t} blood from their cellars.` };
  }
  s.dynasty.prestige += 4;
  return { ok: true, msg: 'They speak well of you in Council. (+4 prestige)' };
}

export function espionage(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (hs.secretKnown) return { ok: false, msg: 'You already hold their secret.' };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  const st = computeStats(s);
  const p = (s.npcs.spymaster ?? 0) >= 40 ? 1 : clamp(0.35 + st.stealth * 0.4 + st.per * 0.015 + st.int * 0.01 - hs.power / 300, 0.1, 0.9);
  if (rngFor(s, h.length * 77)() < p) {
    hs.secretKnown = true;
    s.counters['secrets-political'] = (s.counters['secrets-political'] ?? 0) + 1;
    return { ok: true, msg: `Your agents return with ${HOUSE_BY_ID[h].name}'s secret: “${HOUSE_BY_ID[h].secret}”` };
  }
  hs.standing = clamp(hs.standing - 15, -100, 100);
  return { ok: false, msg: `Your agents were caught. ${HOUSE_BY_ID[h].name} is incensed. (-15 standing)` };
}

export function blackmail(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (!hs.secretKnown) return { ok: false, msg: 'You have no leverage.' };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  const g = Math.round(150 + hs.power * 8);
  s.gold += g; hs.standing = clamp(hs.standing - 20, -100, 100); hs.secretKnown = false;
  return { ok: true, msg: `${HOUSE_BY_ID[h].name} pays ${g} crowns for your silence — and will not forget it.` };
}

export function denounce(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (!hs.secretKnown) return { ok: false, msg: 'You need proof — learn their secret first.' };
  if (!s.council.seats.includes('player')) return { ok: false, msg: 'Only a Council member may denounce a house.' };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  hs.power = clamp(hs.power - 18, 0, 100); hs.standing = clamp(hs.standing - 45, -100, 100); hs.secretKnown = false;
  for (const r of HOUSE_BY_ID[h].rivals) if (s.houses[r]) s.houses[r].standing = clamp(s.houses[r].standing + 10, -100, 100);
  s.dynasty.prestige += 8;
  log(s, `${s.dynasty.name} denounces ${HOUSE_BY_ID[h].name} before the Council.`);
  if (hs.power < 15 && !hs.exiled) { hs.exiled = true; log(s, `${HOUSE_BY_ID[h].name} is exiled from Vel'Sanguis.`); }
  return { ok: true, msg: `${HOUSE_BY_ID[h].name} is shamed before the Council. Their rivals smile at you.` };
}

export function proposeAlliance(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (hs.alliance) return { ok: false, msg: 'You are already allied.' };
  if (hs.standing < 50) return { ok: false, msg: 'They do not trust you enough (needs 50 standing).' };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  hs.alliance = true;
  for (const r of HOUSE_BY_ID[h].rivals) if (s.houses[r]) s.houses[r].standing = clamp(s.houses[r].standing - 12, -100, 100);
  s.counters['alliances'] = Object.values(s.houses).filter((x) => x.alliance).length;
  log(s, `${s.dynasty.name} and ${HOUSE_BY_ID[h].name} swear alliance.`);
  return { ok: true, msg: `Alliance sworn with ${HOUSE_BY_ID[h].name}. Their rivals take note.` };
}

export function breakAlliance(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (!hs.alliance) return { ok: false, msg: 'There is no alliance.' };
  hs.alliance = false; hs.standing = clamp(hs.standing - 40, -100, 100);
  log(s, `${s.dynasty.name} betrays its alliance with ${HOUSE_BY_ID[h].name}.`);
  return { ok: true, msg: 'The alliance is broken. Betrayal has a long memory.' };
}

// ───────────────────────── Marriage ─────────────────────────
export function spouseCandidate(s: GameState, h: HouseId): { name: string; house: HouseId; genome: Gene[] } {
  const rng = makeRng(s.seed + h.length * 997 + s.heir.generation * 13);
  const house = HOUSE_BY_ID[h];
  const genome: Gene[] = house.bloodlines.map((b, i) => ({ bloodline: b, potency: Math.round(38 + rng() * 32 - i * 6), expression: (i === 0 || rng() < 0.5 ? 'dominant' : 'recessive') as Gene['expression'] }));
  if (rng() < 0.35) {
    const extra = pick(rng, ['beast', 'shadow', 'grave', 'venom', 'life', 'moon', 'storm', 'frost', 'dream', 'weaver'] as const);
    if (!genome.some((g) => g.bloodline === extra)) genome.push({ bloodline: extra, potency: Math.round(15 + rng() * 25), expression: rng() < 0.5 ? 'recessive' : 'dormant' });
  }
  return { name: `${randomName(rng)} ${house.name.replace('House ', '')}`, house: h, genome };
}

export const dowry = (s: GameState, h: HouseId) => Math.round(150 + s.houses[h].power * 6);

export function proposeMarriage(s: GameState, h: HouseId): CourtResult {
  const hs = s.houses[h];
  if (s.heir.spouse) return { ok: false, msg: `${s.heir.name} is already wed.` };
  if (s.heir.rank < 3) return { ok: false, msg: 'Only a Blood Initiate (rank 3) may be offered in marriage.' };
  if (hs.standing < 35) return { ok: false, msg: `${HOUSE_BY_ID[h].name} will not consider the match (needs 35 standing).` };
  const d = dowry(s, h);
  if (s.gold < d) return { ok: false, msg: `The dowry is ${d} crowns.` };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  s.gold -= d;
  s.heir.spouse = spouseCandidate(s, h);
  hs.married = true; hs.standing = clamp(hs.standing + 15, -100, 100);
  s.counters['marriages'] = (s.counters['marriages'] ?? 0) + 1;
  log(s, `${s.heir.name} weds ${s.heir.spouse.name} of ${HOUSE_BY_ID[h].name}.`);
  return { ok: true, msg: `${s.heir.name} weds ${s.heir.spouse.name}. Their heirs will carry ${HOUSE_BY_ID[h].name}'s blood.` };
}

export const marriagePreview = (s: GameState, h: HouseId) => compatibility(s.heir.genome, spouseCandidate(s, h).genome);

// ───────────────────────── Council & decrees ─────────────────────────
export interface DecreeDef { id: string; name: string; description: string; votes: number; mods?: Modifier[]; requires?: (s: GameState) => string | null }
export const DECREES: DecreeDef[] = [
  { id: 'edict-of-tithes', name: 'Edict of Tithes', description: 'Raise the Tithe on your domains: +25% territory income; unrest grows faster.', votes: 4 },
  { id: 'open-archives', name: 'Opening of the Archives', description: 'The Sunken Archive opens to the Council: +25% research and mastery.', votes: 4, mods: [{ stat: 'research', mul: 0.25 }] },
  { id: 'blood-rationing', name: 'Blood Rationing', description: 'Rations across the night-realm: hunger -20% for your heirs, but every house resents you (-5 standing).', votes: 4, mods: [{ stat: 'hungerRate', mul: -0.2 }] },
  { id: 'pale-truce', name: 'The Pale Truce', description: 'A secret truce with the Dawn: +30% sun resistance. If discovered, it is treason.', votes: 5, mods: [{ stat: 'sunResist', add: 0.3 }] },
  { id: 'hunt-of-ashes', name: 'Call the Hunt of Ashes', description: 'Declare the weakest hostile house outlaw: its power is broken and its lands may be claimed freely.', votes: 4 },
  { id: 'crown-the-heir', name: 'Acclamation of the Sovereign', description: 'Ask the Council to acclaim your heir Sovereign of the Crimson Throne.', votes: 5, requires: (s) => (s.heir.rank < 9 ? 'Your heir must be a Vampire Sovereign (rank 9).' : !(s.counters['boss:gilded-regent'] > 0) ? 'The Gilded Regent still holds the Throne.' : null) },
];

export function updateCouncil(s: GameState): string[] {
  const out: string[] = [];
  const power = dynastyPower(s);
  const ranked = HOUSES.filter((h) => !s.houses[h.id].exiled).map((h) => ({ id: h.id as HouseId | 'player', p: s.houses[h.id].power }));
  ranked.push({ id: 'player', p: power });
  ranked.sort((a, b) => b.p - a.p);
  const seats = ranked.slice(0, 7).map((r) => r.id);
  const had = s.council.seats.includes('player');
  s.council.seats = seats;
  if (!had && seats.includes('player')) { out.push('House ' + s.dynasty.name + ' is granted a seat on the Night Council!'); s.counters['council-seat'] = 1; log(s, `${s.dynasty.name} takes a seat on the Night Council.`); }
  if (had && !seats.includes('player')) out.push('Your dynasty has lost its seat on the Night Council.');
  return out;
}

export function voteSupport(s: GameState, decree: DecreeDef): { yes: HouseId[]; no: HouseId[] } {
  const yes: HouseId[] = [], no: HouseId[] = [];
  for (const seat of s.council.seats) {
    if (seat === 'player') continue;
    const h = s.houses[seat];
    const bias = decree.id === 'blood-rationing' ? -15 : decree.id === 'crown-the-heir' ? -25 : decree.id === 'pale-truce' && HOUSE_BY_ID[seat].temperament === 'zealous' ? -30 : 0;
    if (h.alliance || h.married || h.standing + bias >= 25) yes.push(seat); else no.push(seat);
  }
  return { yes, no };
}

export function proposeDecree(s: GameState, id: string): CourtResult {
  const d = DECREES.find((x) => x.id === id)!;
  if (!s.council.seats.includes('player')) return { ok: false, msg: 'You do not sit on the Council.' };
  if (s.council.decrees.includes(id)) return { ok: false, msg: 'That decree is already law.' };
  if (s.night - s.lastDecreeNight < 3) return { ok: false, msg: 'The Council will hear you again in a few nights.' };
  const req = d.requires?.(s);
  if (req) return { ok: false, msg: req };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  s.lastDecreeNight = s.night;
  const { yes } = voteSupport(s, d);
  const votes = yes.length + 1;
  if (votes < d.votes) {
    for (const h of s.council.seats) if (h !== 'player' && !yes.includes(h)) s.houses[h].standing = clamp(s.houses[h].standing - 3, -100, 100);
    return { ok: false, msg: `The decree fails, ${votes} votes to ${7 - votes}.` };
  }
  s.counters['decrees'] = (s.counters['decrees'] ?? 0) + 1;
  log(s, `The Council passes ${d.name}.`);
  if (id === 'blood-rationing') for (const h of Object.values(s.houses)) h.standing = clamp(h.standing - 5, -100, 100);
  if (id === 'hunt-of-ashes') {
    const target = HOUSES.filter((h) => s.houses[h.id].standing < 0 && !s.houses[h.id].exiled).sort((a, b) => s.houses[a.id].power - s.houses[b.id].power)[0];
    if (target) { s.houses[target.id].power = clamp(s.houses[target.id].power - 30, 0, 100); s.houses[target.id].exiled = true; log(s, `The Hunt of Ashes is called upon ${target.name}.`); return { ok: true, msg: `The Hunt of Ashes is called upon ${target.name}. Its lands are forfeit.` }; }
    return { ok: true, msg: 'No house is worthy of the Hunt.' };
  }
  if (id === 'crown-the-heir') {
    s.council.throne = 'player'; s.dynasty.prestige += 200; s.counters['crowned'] = 1;
    log(s, `${s.heir.name} of House ${s.dynasty.name} is acclaimed Sovereign of the Crimson Throne!`);
    return { ok: true, msg: `${s.heir.name} is acclaimed Sovereign of the Crimson Throne! The Age of Blood has a new master.` };
  }
  s.council.decrees.push(id);
  return { ok: true, msg: `${d.name} passes, ${votes} to ${7 - votes}.` };
}

export const decreeMods = (s: GameState): Modifier[] => s.council.decrees.flatMap((id) => DECREES.find((d) => d.id === id)?.mods ?? []);

// ───────────────────────── Territory ─────────────────────────
export interface BuildingDef { id: string; name: string; cost: number; description: string }
export const BUILDINGS: BuildingDef[] = [
  { id: 'blood-cellar', name: 'Blood Cellar', cost: 400, description: 'Stores tithed blood: +2 vials per night and stored vials never spoil.' },
  { id: 'watchtower', name: 'Watchtower', cost: 300, description: '+25 defense against raids and rebellions.' },
  { id: 'shrine', name: 'Ancestral Shrine', cost: 500, description: 'Your heir gains +0.5 purity each night.' },
  { id: 'library', name: 'Night Library', cost: 450, description: '+6 research per night.' },
  { id: 'forge', name: 'Bloodforge', cost: 500, description: 'Produces materials from the region\'s resources each night.' },
  { id: 'market', name: 'Night Market', cost: 350, description: '+40% gold income from this domain and better prices.' },
];
export const MAX_BUILDINGS = 3;

export function claimCost(s: GameState, rid: string): { gold: number; contested: HouseId | null; chance: number; peaceful: boolean } {
  const r = REGION_BY_ID[rid], rs = s.regions[rid];
  const owner = rs.owner && rs.owner !== 'player' ? rs.owner : null;
  const gold = Math.round(250 * r.level);
  if (!owner) return { gold, contested: null, chance: 1, peaceful: true };
  const hs = s.houses[owner];
  if (hs.exiled) return { gold, contested: owner, chance: 1, peaceful: true };
  if (hs.standing >= 60) return { gold: gold * 3, contested: owner, chance: 1, peaceful: true };
  const allies = HOUSES.filter((h) => s.houses[h.id].alliance).reduce((a, h) => a + s.houses[h.id].power * 0.4, 0);
  const chance = clamp((dynastyPower(s) + allies) / (hs.power * (1 + rs.defense / 100) + 1), 0.05, 0.95);
  return { gold: gold * 2, contested: owner, chance, peaceful: false };
}

export function claimRegion(s: GameState, rid: string): CourtResult {
  const rs = s.regions[rid];
  if (rs.owner === 'player') return { ok: false, msg: 'Already yours.' };
  if (!rs.bossDefeated) return { ok: false, msg: `Defeat ${BOSS_BY_ID[REGION_BY_ID[rid].boss].name} before claiming this domain.` };
  const c = claimCost(s, rid);
  if (s.gold < c.gold) return { ok: false, msg: `Claiming requires ${c.gold} crowns.` };
  if (!spend(s)) return { ok: false, msg: 'No court actions remain tonight.' };
  s.gold -= c.gold;
  const name = REGION_BY_ID[rid].name;
  if (!c.peaceful) {
    const owner = c.contested!;
    s.houses[owner].standing = clamp(s.houses[owner].standing - 35, -100, 100);
    if (rngFor(s, rid.length * 113)() > c.chance) { log(s, `${s.dynasty.name} fails to seize ${name} from ${HOUSE_BY_ID[owner].name}.`); return { ok: false, msg: `Your seizure of ${name} fails. ${HOUSE_BY_ID[owner].name} holds — and remembers.` }; }
    s.houses[owner].power = clamp(s.houses[owner].power - 8, 0, 100);
  } else if (c.contested) s.houses[c.contested].standing = clamp(s.houses[c.contested].standing - 10, -100, 100);
  rs.owner = 'player'; rs.unrest = c.peaceful ? 10 : 35;
  s.counters['regions-owned'] = Object.values(s.regions).filter((x) => x.owner === 'player').length;
  log(s, `${s.dynasty.name} claims ${name}.`);
  return { ok: true, msg: `${name} is now a domain of House ${s.dynasty.name}.` };
}

export function build(s: GameState, rid: string, bid: string): CourtResult {
  const rs = s.regions[rid], b = BUILDINGS.find((x) => x.id === bid)!;
  if (rs.owner !== 'player') return { ok: false, msg: 'Not your domain.' };
  if (rs.buildings.includes(bid)) return { ok: false, msg: 'Already built.' };
  if (rs.buildings.length >= MAX_BUILDINGS) return { ok: false, msg: 'No room for more works here.' };
  const cost = Math.round(b.cost * (1 + REGION_BY_ID[rid].level * 0.15));
  if (s.gold < cost) return { ok: false, msg: `Requires ${cost} crowns.` };
  s.gold -= cost;
  rs.buildings.push(bid);
  if (bid === 'watchtower') rs.defense += 25;
  return { ok: true, msg: `${b.name} raised in ${REGION_BY_ID[rid].name}.` };
}
export const buildCost = (rid: string, bid: string) => Math.round(BUILDINGS.find((x) => x.id === bid)!.cost * (1 + REGION_BY_ID[rid].level * 0.15));

export function regionIncome(s: GameState, rid: string): { gold: number; vials: number; research: number } {
  const rs = s.regions[rid], r = REGION_BY_ID[rid];
  let gold = (rs.population / 180) * (1 + r.level * 0.1) * (1 - rs.unrest / 200);
  if (rs.buildings.includes('market')) gold *= 1.4;
  if (s.council.decrees.includes('edict-of-tithes')) gold *= 1.25;
  if ((s.npcs.seneschal ?? 0) >= 40) gold *= 1.15;
  const vials = (r.resources.includes('blood') ? 1 : 0) + (rs.buildings.includes('blood-cellar') ? 2 : 0);
  const research = rs.buildings.includes('library') ? 6 : 0;
  return { gold: Math.round(gold), vials, research };
}

// ───────────────────────── Economy ─────────────────────────
export const VIAL_PRICE: Record<BloodType, number> = { common: 10, beast: 12, noble: 40, magical: 35, ancient: 90, royal: 150, corrupted: 15, primordial: 600, holy: 30, spectral: 25 };

function eventPriceMul(s: GameState, id: string): number {
  let m = 1;
  for (const e of s.events) m *= EVENT_BY_ID[e.id]?.effects.priceMul?.[id] ?? 1;
  return m;
}
const chaDiscount = (s: GameState) => clamp(computeStats(s).cha * 0.008, 0, 0.25);
const marketBonus = (s: GameState) => (Object.values(s.regions).some((r) => r.owner === 'player' && r.buildings.includes('market')) ? 0.1 : 0);

export function basePrice(id: string): number {
  if (id.startsWith('blood:')) return VIAL_PRICE[id.slice(6) as BloodType] ?? 10;
  return MATERIAL_BY_ID[id]?.value ?? ITEM_BY_ID[id]?.value ?? 10;
}
export function buyPrice(s: GameState, id: string): number {
  return Math.max(1, Math.round(basePrice(id) * (s.market[id] ?? 1) * eventPriceMul(s, id) * 1.25 * (1 - chaDiscount(s) - marketBonus(s))));
}
export function sellPrice(s: GameState, id: string): number {
  return Math.max(1, Math.round(basePrice(id) * (s.market[id] ?? 1) * eventPriceMul(s, id) * 0.5 * (1 + chaDiscount(s) + marketBonus(s))));
}
export function trade(s: GameState, id: string, qty: number): CourtResult {
  const isVial = id.startsWith('blood:');
  const key = isVial ? (id.slice(6) as BloodType) : id;
  const isCons = !isVial && ITEM_BY_ID[id]?.category === 'consumable';
  const have = isVial ? s.vials[key as BloodType] ?? 0 : isCons ? s.consumables[id] ?? 0 : s.materials[id] ?? 0;
  if (qty > 0) {
    const cost = buyPrice(s, id) * qty;
    if (s.gold < cost) return { ok: false, msg: 'Not enough crowns.' };
    s.gold -= cost;
    s.market[id] = clamp((s.market[id] ?? 1) + 0.05 * qty, 0.4, 3);
  } else {
    if (have < -qty) return { ok: false, msg: 'You have none to sell.' };
    const gain = sellPrice(s, id) * -qty;
    s.gold += gain;
    s.counters['gold-earned'] = (s.counters['gold-earned'] ?? 0) + gain;
    s.market[id] = clamp((s.market[id] ?? 1) - 0.04 * -qty, 0.4, 3);
  }
  if (isVial) s.vials[key as BloodType] = have + qty;
  else if (isCons) s.consumables[id] = have + qty;
  else s.materials[id] = have + qty;
  return { ok: true, msg: qty > 0 ? 'Purchased.' : 'Sold.' };
}

export function sellItem(s: GameState, uid: string): CourtResult {
  const i = s.inventory.findIndex((x) => x.uid === uid);
  if (i < 0) return { ok: false, msg: 'No such item.' };
  const v = Math.round(itemValue(s.inventory[i]) * 0.4 * (1 + chaDiscount(s)));
  s.inventory.splice(i, 1);
  s.gold += v;
  s.counters['gold-earned'] = (s.counters['gold-earned'] ?? 0) + v;
  return { ok: true, msg: `Sold for ${v} crowns.` };
}

// Banking (the Ormund counting-houses)
export const LOAN_RATE = 0.04, DEPOSIT_RATE = 0.015;
export const maxLoan = (s: GameState) => 400 + s.heir.rank * 300 + Math.round(s.dynasty.prestige * 2);
export function bank(s: GameState, action: 'deposit' | 'withdraw' | 'borrow' | 'repay', amount: number): CourtResult {
  amount = Math.max(0, Math.floor(amount));
  const b = s.bank;
  switch (action) {
    case 'deposit': if (s.gold < amount) return { ok: false, msg: 'Not enough crowns.' }; s.gold -= amount; b.deposit += amount; return { ok: true, msg: `Deposited ${amount}.` };
    case 'withdraw': amount = Math.min(amount, b.deposit); b.deposit -= amount; s.gold += amount; return { ok: true, msg: `Withdrew ${amount}.` };
    case 'borrow': if (b.loan + amount > maxLoan(s)) return { ok: false, msg: `House Ormund will lend at most ${maxLoan(s) - b.loan} more.` }; if (!b.loan) b.loanNight = s.night; b.loan += amount; s.gold += amount; return { ok: true, msg: `Borrowed ${amount} at ${LOAN_RATE * 100}% per night.` };
    case 'repay': amount = Math.min(amount, b.loan, s.gold); b.loan -= amount; s.gold -= amount; return { ok: true, msg: `Repaid ${amount}.` };
  }
}

// Auctions
export function bidAuction(s: GameState, idx: number, bid: number): CourtResult {
  const lot = s.auction[idx];
  if (!lot) return { ok: false, msg: 'No such lot.' };
  if (bid <= lot.bid) return { ok: false, msg: `Bid more than ${lot.bid}.` };
  if (s.gold < bid) return { ok: false, msg: 'Not enough crowns.' };
  lot.bid = bid;
  return { ok: true, msg: `Your bid of ${bid} stands. The auction closes at dusk.` };
}

function refreshAuction(s: GameState, rng: Rng): string[] {
  const out: string[] = [];
  for (const lot of s.auction) {
    if (lot.bid <= 0) continue;
    const rival = lot.reserve * (0.85 + rng() * 0.6);
    if (lot.bid >= rival && s.gold >= lot.bid) { s.gold -= lot.bid; s.inventory.push(lot.item); out.push(`You win the auction for ${ITEM_BY_ID[lot.item.templateId].name} (${lot.bid} crowns).`); }
    else out.push(`${HOUSE_BY_ID[lot.house].name} outbids you for ${ITEM_BY_ID[lot.item.templateId].name}.`);
  }
  const lvl = Math.max(2, s.heir.rank + 1);
  s.auction = Array.from({ length: 3 }, () => {
    const item = rollEquipment(rng, lvl, 2, 'rare');
    return { item, reserve: Math.round(itemValue(item) * 0.9), bid: 0, house: pick(rng, HOUSES).id };
  });
  return out;
}

// ───────────────────────── Nightfall ─────────────────────────
/** Advance one night: income, events, house AI, markets, auctions, banking. */
export function advanceNight(s: GameState): string[] {
  const out: string[] = [];
  s.night++;
  const rng = rngFor(s, 1);
  s.courtActions = maxCourtActions(s);

  // Territory income & regional events
  let gold = 0, vials = 0, research = 0;
  for (const [rid, rs] of Object.entries(s.regions)) {
    if (rs.owner !== 'player') continue;
    const inc = regionIncome(s, rid);
    gold += inc.gold; vials += inc.vials; research += inc.research;
    if (rs.buildings.includes('shrine')) s.heir.purity = Math.min(100, s.heir.purity + 0.5);
    if (rs.buildings.includes('forge')) { const res = REGION_BY_ID[rid].resources.filter((x) => x !== 'blood' && x !== 'gold'); const mat = res.length ? RES_MATERIAL[pick(rng, res)] : 'iron-ore'; s.materials[mat] = (s.materials[mat] ?? 0) + 1; }
    rs.unrest = clamp(rs.unrest + (s.council.decrees.includes('edict-of-tithes') ? 3 : 0) + (rs.defense < 30 ? 2 : -3), 0, 100);
    rs.population = Math.round(rs.population * (1 + (rs.unrest < 40 ? 0.004 : -0.01)));
    if (rs.unrest > 70 && rng() < 0.25) { rs.population = Math.round(rs.population * 0.9); rs.unrest -= 20; out.push(`Riots in ${REGION_BY_ID[rid].name}! The Warm rise against their tithes.`); }
  }
  if (gold) { s.gold += gold; s.counters['gold-earned'] = (s.counters['gold-earned'] ?? 0) + gold; out.push(`Your domains yield ${gold} crowns.`); }
  if (vials) s.vials.common = (s.vials.common ?? 0) + vials;
  s.research += research + 1;
  // Vials spoil without a cellar
  const cellar = Object.values(s.regions).some((r) => r.owner === 'player' && r.buildings.includes('blood-cellar'));
  if (!cellar) for (const k of Object.keys(s.vials) as BloodType[]) if ((s.vials[k] ?? 0) > 6 && rng() < 0.3) { s.vials[k]! -= 1; }

  // World events tick & new ones
  for (const e of s.events) e.nightsLeft--;
  const ended = s.events.filter((e) => e.nightsLeft <= 0);
  for (const e of ended) out.push(`${EVENT_BY_ID[e.id]?.name} has ended.`);
  s.events = s.events.filter((e) => e.nightsLeft > 0);
  if (s.events.length < 2 && rng() < 0.32) {
    const pool = WORLD_EVENTS.filter((e) => !s.events.some((a) => a.id === e.id) && (e.id !== 'progenitor-awakening' || s.heir.rank >= 6));
    const ev = weighted(rng, pool, (e) => e.weight);
    const region = ev.effects.region === 'random' ? pick(rng, REGIONS.filter((r) => r.level <= Math.max(3, s.heir.rank + 2))).id : undefined;
    s.events.push({ id: ev.id, nightsLeft: ev.durationNights, region });
    out.push(`${ev.name}${region ? ` in ${REGION_BY_ID[region].name}` : ''}: ${ev.description}`);
    log(s, `${ev.name}${region ? ` in ${REGION_BY_ID[region].name}` : ''}.`);
    out.push(...houseEvent(s, ev.effects.houseEvent, rng));
  }

  // House AI
  for (const h of HOUSES) {
    const hs = s.houses[h.id];
    if (hs.exiled) { hs.power = clamp(hs.power + 0.3, 0, 40); continue; }
    hs.power = clamp(hs.power + (rng() - 0.48) * 2.5 + (h.territory.length ? 0.2 : 0), 3, 100);
    if (hs.standing > 0 && !hs.alliance && !hs.married) hs.standing -= 0.3; // favour fades
    // Feuds
    if (rng() < 0.03 && h.rivals.length) {
      const r = pick(rng, h.rivals);
      if (s.houses[r] && !s.houses[r].exiled) {
        const win = rng() < hs.power / (hs.power + s.houses[r].power);
        const [w, l] = win ? [h.id, r] : [r, h.id];
        s.houses[w].power = clamp(s.houses[w].power + 4, 0, 100); s.houses[l].power = clamp(s.houses[l].power - 5, 0, 100);
        out.push(`${HOUSE_BY_ID[w].name} humiliates ${HOUSE_BY_ID[l].name} in a feud.`);
        log(s, `${HOUSE_BY_ID[w].name} wins a feud against ${HOUSE_BY_ID[l].name}.`);
      }
    }
    // Raids on the player's domains
    if (hs.standing < -30 && rng() < 0.06) {
      const target = Object.entries(s.regions).find(([, r]) => r.owner === 'player');
      if (target) {
        const [rid, rs] = target;
        const allyHelp = HOUSES.filter((x) => s.houses[x.id].alliance).reduce((a, x) => a + s.houses[x.id].power * 0.3, 0);
        if (hs.power > rs.defense + allyHelp + dynastyPower(s) * 0.5) {
          rs.owner = h.id; out.push(`${h.name} seizes ${REGION_BY_ID[rid].name} from you!`); log(s, `${h.name} seizes ${REGION_BY_ID[rid].name}.`);
        } else { rs.defense = Math.max(5, rs.defense - 5); out.push(`${h.name} raids ${REGION_BY_ID[rid].name}, but your defenders hold.`); }
      }
    }
    // Houses claim unowned cleared regions occasionally
    if (rng() < 0.01) {
      const free = Object.entries(s.regions).find(([rid, r]) => !r.owner && rid !== 'the-maw' && rid !== 'cathedral-dawn');
      if (free && hs.power > 50) { free[1].owner = h.id; log(s, `${h.name} claims ${REGION_BY_ID[free[0]].name}.`); }
    }
  }

  // Market drift
  for (const k of Object.keys(s.market)) s.market[k] = clamp(s.market[k] + (1 - s.market[k]) * 0.15 + (rng() - 0.5) * 0.08, 0.4, 3);
  for (let i = 0; i < 3; i++) { const m = pick(rng, Object.keys(MATERIAL_BY_ID)); s.market[m] = clamp((s.market[m] ?? 1) + (rng() - 0.5) * 0.3, 0.4, 3); }

  // Banking
  if (s.bank.deposit > 0) { const i = Math.floor(s.bank.deposit * DEPOSIT_RATE); s.bank.deposit += i; }
  if (s.bank.loan > 0) {
    s.bank.loan = Math.ceil(s.bank.loan * (1 + LOAN_RATE));
    if (s.night - s.bank.loanNight > 12 && rng() < 0.3) { s.houses.ormund.standing = clamp(s.houses.ormund.standing - 10, -100, 100); out.push('House Ormund\'s collectors grow impatient. (-10 standing)'); }
  }
  out.push(...refreshAuction(s, rng));
  out.push(...updateCouncil(s));
  return out;
}

const RES_MATERIAL: Record<string, string> = { iron: 'iron-ore', herbs: 'nightshade', relics: 'ancient-parchment', souls: 'soul-gem', silver: 'silver-ingot', ash: 'ash-ember', ice: 'frost-shard', starmetal: 'star-iron' };

function houseEvent(s: GameState, kind: string | undefined, rng: Rng): string[] {
  if (!kind) return [];
  const live = HOUSES.filter((h) => !s.houses[h.id].exiled);
  switch (kind) {
    case 'rebellion': {
      const h = pick(rng, live.filter((x) => x.id !== 'veyrath'));
      s.houses[h.id].power = clamp(s.houses[h.id].power + 10, 0, 100); s.houses.veyrath.power = clamp(s.houses.veyrath.power - 8, 0, 100);
      log(s, `${h.name} rises against the Regency.`);
      return [`${h.name} rises against the Regency! Their power swells while Veyrath's wanes.`];
    }
    case 'coronation': {
      const top = [...live].sort((a, b) => s.houses[b.id].power - s.houses[a.id].power)[0];
      s.houses[top.id].power = clamp(s.houses[top.id].power + 6, 0, 100);
      return [`${top.name} stages a grand ceremony of investiture. Gifts to them are twice as welcome for now.`];
    }
    case 'tournament': {
      const gain = Math.round(dynastyPower(s) / 3);
      s.dynasty.prestige += gain;
      return [`The Royal Tournament is held in Vel'Sanguis. Your champions win you ${gain} prestige.`];
    }
    case 'succession': return ['A succession dispute shakes a minor house.'];
  }
  return [];
}

export const bloodlineLabel = (id: string) => BLOODLINE_BY_ID[id as keyof typeof BLOODLINE_BY_ID]?.name ?? id;
