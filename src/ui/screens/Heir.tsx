import { useState } from 'react';
import { ABILITIES, ABILITY_BY_ID, BLOODLINE_BY_ID, FORMS, FUSIONS, HOUSE_BY_ID, ITEM_BY_ID, PATHS, RANKS, STAGE_NAMES } from '../../game/data';
import { EQUIP_SLOTS, type EquipSlot, slotCategory } from '../../game/state';
import { activeFusions, expressedGenes } from '../../game/systems/genetics';
import { itemValue, tpl, upgradeChance, upgradeCost } from '../../game/systems/loot';
import { abilityStatus, formAvailable, learnAbility, masteryLevel, masteryNeeded, resolveAbility } from '../../game/systems/progression';
import { breakDown, upgrade } from '../../game/systems/crafting';
import { computeStats, modSources } from '../../game/systems/stats';
import { sellItem } from '../../game/systems/world';
import type { AbilityDef, AbilitySchool, PrimaryStat } from '../../game/types';
import { PRIMARY_STATS } from '../../game/types';
import { Btn, Empty, Icon, ItemCard, Mods, Panel, Stat, statLabel, Tabs } from '../components';
import { useGame } from '../store';
import { GenomeView } from './Succession';

type Sub = 'self' | 'blood' | 'powers' | 'armory' | 'lineage';

export function HeirScreen() {
  const { s } = useGame();
  const [sub, setSub] = useState<Sub>('self');
  return (
    <div>
      <Tabs<Sub> value={sub} onChange={setSub} tabs={[
        { id: 'self', label: 'Attributes', icon: 'muscle-up', badge: s.heir.attributePoints },
        { id: 'blood', label: 'Bloodline', icon: 'droplets' },
        { id: 'powers', label: 'Powers', icon: 'spell-book', badge: s.heir.skillPoints },
        { id: 'armory', label: 'Armory', icon: 'chest-armor' },
        { id: 'lineage', label: 'Lineage', icon: 'family-tree' },
      ]} />
      {sub === 'self' && <Attributes />}
      {sub === 'blood' && <Bloodline />}
      {sub === 'powers' && <Powers />}
      {sub === 'armory' && <Armory />}
      {sub === 'lineage' && <Lineage />}
    </div>
  );
}

const ATTR_DESC: Record<PrimaryStat, string> = {
  str: 'Physical damage', agi: 'Attack & move speed, crit', int: 'Cooldowns, research, status power', end: 'Health and armor', wil: 'Blood pool, status resistance',
  per: 'Crit chance, loot luck, crowns', aff: 'Blood pool, blood damage, feeding', mag: 'Spell damage', rgn: 'Health regeneration', cha: 'Influence, prices, persuasion',
};
const ATTR_CAP = (rank: number) => 20 + rank * 6;

function Attributes() {
  const { s, act, ask } = useGame();
  const st = computeStats(s);
  const h = s.heir;
  const [showSrc, setShowSrc] = useState(false);
  return (
    <div className="space-y-3">
      <Panel title="Primary Attributes" icon="muscle-up" right={h.attributePoints > 0 && <span className="chip text-ember">{h.attributePoints} to assign</span>}>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {PRIMARY_STATS.map((p) => (
            <div key={p} className="flex items-center gap-2 rounded bg-black/30 px-2 py-1.5">
              <div className="min-w-0 flex-1"><div className="font-display text-sm text-parch">{statLabel(p)}</div><div className="text-[0.7rem] text-mist">{ATTR_DESC[p]}</div></div>
              <div className="text-right"><div className="font-display text-lg text-gold">{st[p]}</div><div className="text-[0.6rem] text-mist">base {h.attributes[p]}</div></div>
              <Btn small disabled={h.attributePoints <= 0 || h.attributes[p] >= ATTR_CAP(h.rank)} onClick={() => act((g) => { g.heir.attributes[p]++; g.heir.attributePoints--; })}>+</Btn>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist">Attribute cap at this rank: {ATTR_CAP(h.rank)}. Rank-ups grant attribute points; bloodlines, gear and mutations add on top.</p>
      </Panel>
      <Panel title="Derived Powers" icon="pentacle" right={<Btn small variant="ghost" onClick={() => setShowSrc(!showSrc)}>{showSrc ? 'Hide' : 'Sources'}</Btn>}>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Stat label="Max Health" value={st.maxHp} /><Stat label="Max Blood" value={st.maxBlood} />
          <Stat label="Regeneration" value={`${st.hpRegen.toFixed(1)}/s`} /><Stat label="Armor" value={Math.round(st.armor)} sub={`${Math.round((st.armor / (st.armor + 100)) * 100)}%`} />
          <Stat label="Physical Damage" value={`${Math.round(st.physDmg * 100)}%`} /><Stat label="Spell Damage" value={`${Math.round(st.spellDmg * 100)}%`} />
          <Stat label="Blood Damage" value={`${Math.round(st.bloodDmg * 100)}%`} /><Stat label="Attack Speed" value={`${Math.round(st.attackSpeed * 100)}%`} />
          <Stat label="Critical" value={`${Math.round(st.critChance * 100)}%`} sub={`×${st.critMult.toFixed(2)}`} /><Stat label="Lifesteal" value={`${Math.round(st.lifesteal * 100)}%`} />
          <Stat label="Move Speed" value={`${Math.round(st.moveSpeed * 100)}%`} /><Stat label="Cooldown Speed" value={`${Math.round(st.cooldownRate * 100)}%`} />
          <Stat label="Hunger" value={`${Math.round(st.hungerRate * 100)}%`} /><Stat label="Feeding Power" value={`${Math.round(st.feedPower * 100)}%`} />
          <Stat label="Stealth" value={`${Math.round(st.stealth * 100)}%`} /><Stat label="Sun Resistance" value={`${Math.round(st.sunResist * 100)}%`} />
          <Stat label="Influence" value={st.influence.toFixed(1)} /><Stat label="Research" value={`${Math.round(st.research * 100)}%`} />
          <Stat label="Purity" value={Math.round(h.purity)} /><Stat label="Corruption" value={Math.round(h.corruption)} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1 text-[0.7rem]">
          {(['physical', 'blood', 'shadow', 'fire', 'frost', 'storm', 'holy', 'death', 'void', 'venom', 'mind', 'star'] as const).map((e) => st[`res_${e}`] ? <span key={e} className={`chip ${st[`res_${e}`] > 0 ? 'text-emerald-300' : 'text-red-300'}`}>{e} {Math.round(st[`res_${e}`] * 100)}%</span> : null)}
        </div>
        {showSrc && <div className="mt-3 space-y-2">{modSources(s).map((src, i) => <div key={i} className="rounded bg-black/30 p-2"><div className="font-display text-xs text-gold">{src.label}</div><Mods mods={src.mods} className="!text-xs" /></div>)}</div>}
      </Panel>
      <Panel title="Path of Ascension" icon="stairs-goal">
        {h.path ? (
          <div><div className="font-display text-parch">{PATHS.find((p) => p.id === h.path)?.name}</div><p className="text-sm text-mist">{PATHS.find((p) => p.id === h.path)?.description}</p></div>
        ) : h.rank >= 4 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {PATHS.map((p) => (
              <div key={p.id} className="rounded border border-gold/20 bg-black/30 p-2.5">
                <div className="flex items-center gap-2"><Icon name={p.icon} size={22} color={p.color} /><span className="font-display text-sm text-parch">{p.name}</span></div>
                <p className="mt-1 text-xs text-mist">{p.description}</p>
                <div className="mt-1 text-xs text-gold">Per rank:</div><Mods mods={p.perRank} className="!text-xs" />
                <div className="mt-1 text-xs text-amber-200">{p.capstone.name}: {p.capstone.text}</div>
                <Btn small className="mt-2 w-full" onClick={() => { ask(`Walk the ${p.name}? This choice is permanent for ${h.name}.`, () => { act((g) => { g.heir.path = p.id; return `${g.heir.name} walks the ${p.name}.`; }); }); }}>Choose</Btn>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-mist">At Nightstalker (rank 4), {h.name} may choose a Path: the Crimson Blade, the Sanguine Arcana, the Shrouded Court, or the Wild Hunt.</p>}
      </Panel>
      <Panel title="The Eleven Ranks" icon="stairs">
        <ol className="space-y-1">
          {RANKS.map((r) => (
            <li key={r.rank} className={`rounded px-2 py-1.5 text-sm ${r.rank === h.rank ? 'bg-blood/40 ring-1 ring-ember/50' : r.rank < h.rank ? 'opacity-60' : ''}`}>
              <div className="flex items-baseline gap-2"><span className="w-5 font-display text-gold">{r.rank}</span><span className="font-display text-parch">{r.name}</span><span className="ml-auto text-xs text-mist">{r.xp.toLocaleString()} xp</span></div>
              {r.rank >= h.rank && <div className="ml-7 text-xs text-mist">Trial: {r.trial} · {r.privileges.join(' ')}</div>}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function Bloodline() {
  const { s, act, ask } = useGame();
  const h = s.heir;
  const ex = expressedGenes(h.genome);
  const fus = activeFusions(h.genome, h.stages);
  return (
    <div className="space-y-3">
      <Panel title="Genome" icon="dna1">
        <GenomeView heir={h} />
        <p className="mt-2 text-xs text-mist">Dominant genes express. Recessive genes express only above 70 potency (or when both parents carry them). Dormant genes sleep until raised above 45 potency. Potency rises by feeding on resonant blood, drinking vials, sanctuaries and blood alchemy.</p>
      </Panel>
      {ex.map((g) => {
        const b = BLOODLINE_BY_ID[g.bloodline];
        const stage = h.stages[g.bloodline] ?? 0;
        return (
          <Panel key={g.bloodline} title={`${b.name} — ${b.epithet}`} icon={b.icon} right={<span className="chip capitalize" style={{ color: b.color }}>{b.rarity}</span>}>
            <p className="text-sm text-parch/90">{b.description}</p>
            <p className="mt-1 text-xs italic text-mist">{b.lore}</p>
            <div className="mt-3 flex gap-1">{STAGE_NAMES.map((n, i) => <div key={n} className={`flex-1 rounded py-1 text-center font-display text-[0.6rem] ${i <= stage ? 'text-white' : 'bg-black/40 text-mist/60'}`} style={i <= stage ? { background: b.color + '99' } : {}}>{n}</div>)}</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {b.stages.slice(1).map((stg, i) => {
                const idx = i + 1;
                const r = stg.requires;
                return (
                  <div key={idx} className={`rounded border p-2 text-xs ${idx <= stage ? 'border-emerald-400/30' : idx === stage + 1 ? 'border-ember/40' : 'border-gold/10 opacity-70'}`}>
                    <div className="font-display text-parch">{stg.name}</div>
                    {idx > stage && <div className="text-mist">Needs: {[r.potency && `potency ${r.potency}`, r.rank && `rank ${r.rank}`, r.purity && `purity ${r.purity}`, r.quest && 'its Ascension trial', r.bloodConsumed && Object.entries(r.bloodConsumed).map(([t, n]) => `${h.bloodConsumed[t as keyof typeof h.bloodConsumed] ?? 0}/${n} ${t} feeds`).join(', ')].filter(Boolean).join(' · ')}</div>}
                    <Mods mods={stg.mods} className="!text-xs" />
                    <div className="text-amber-200/90">{stg.unlocks.map((u) => (u.startsWith('form:') ? `Form: ${FORMS.find((f) => f.id === u.slice(5))?.name}` : ABILITY_BY_ID[u]?.name)).filter(Boolean).join(', ')}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs"><span className="text-red-300">Weakness:</span> <span className="text-mist">{b.weakness.text}</span></div>
            <div className="text-xs"><span className="text-gold">Resonant blood:</span> <span className="text-mist">{b.resonance.join(', ')}</span>{b.incompatible.length > 0 && <> · <span className="text-red-300">Clashes with:</span> <span className="text-mist">{b.incompatible.map((x) => BLOODLINE_BY_ID[x].name).join(', ')}</span></>}</div>
            {stage >= 3 && <div className="mt-1 text-xs text-purple-200">Hidden: {b.hidden.condition}</div>}
          </Panel>
        );
      })}
      <Panel title="Bloodline Fusions" icon="dna2">
        <p className="mb-2 text-sm text-mist">When two expressed bloodlines both reach Awakened, some fuse into something new. Breed for them through marriage.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {FUSIONS.map((f) => {
            const on = fus.some((x) => x.id === f.id);
            const known = on || h.genome.some((g) => g.bloodline === f.a) || h.genome.some((g) => g.bloodline === f.b);
            return <div key={f.id} className={`rounded border p-2 text-xs ${on ? 'border-emerald-400/40 bg-emerald-900/10' : 'border-gold/10'}`}><div className="font-display text-parch">{known ? f.name : '???'}</div><div className="text-mist">{known ? `${BLOODLINE_BY_ID[f.a].name} + ${BLOODLINE_BY_ID[f.b].name}` : 'An unknown union'}{on && ' — ACTIVE'}</div></div>;
          })}
        </div>
      </Panel>
      <Panel title="Blood Cellar" icon="chalice-drops">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(s.vials).filter(([, n]) => (n ?? 0) > 0).map(([t, n]) => <Btn key={t} small onClick={() => act((g) => drink(g, t))}>Drink {t} ({n})</Btn>)}
          {!Object.values(s.vials).some((n) => (n ?? 0) > 0) && <p className="text-sm italic text-mist">The cellar is dry. Feeding during hunts sometimes yields vials.</p>}
        </div>
      </Panel>
    </div>
  );
}
import { drinkVial } from '../../game/systems/crafting';
const drink = (g: Parameters<typeof drinkVial>[0], t: string) => drinkVial(g, t as never).msg;

const SCHOOLS: Array<{ id: AbilitySchool | 'bloodline' | 'house'; name: string; icon: string }> = [
  { id: 'blood', name: 'Blood', icon: 'droplets' }, { id: 'shadow', name: 'Shadow', icon: 'hood' }, { id: 'necromancy', name: 'Necromancy', icon: 'raise-skeleton' },
  { id: 'elemental', name: 'Elemental', icon: 'fire' }, { id: 'mental', name: 'Mind', icon: 'brain' }, { id: 'physical', name: 'Body', icon: 'muscle-up' },
  { id: 'forbidden', name: 'Forbidden', icon: 'cursed-star' }, { id: 'bloodline', name: 'Bloodline', icon: 'dna1' }, { id: 'house', name: 'House', icon: 'crown' },
];

function Powers() {
  const { s, act, ask } = useGame();
  const h = s.heir;
  const [school, setSchool] = useState<(typeof SCHOOLS)[number]['id']>('blood');
  const [pick, setPick] = useState<AbilityDef | null>(null);
  const houseAb = ABILITY_BY_ID[`house-${h.maternalHouse ?? s.dynasty.patron}`];
  const list = (school === 'house' ? [houseAb].filter(Boolean) : ABILITIES.filter((a) => (school === 'bloodline' ? a.unlock.type === 'bloodline' || a.unlock.type === 'fusion' : a.school === school && a.unlock.type !== 'bloodline' && a.unlock.type !== 'fusion')))
    .filter((a) => !a.hidden || h.learned.includes(a.id) || s.secrets.includes((a.unlock as { secret?: string }).secret ?? ''));
  return (
    <div className="space-y-3">
      <Panel title="Equipped Powers" icon="spell-book" right={<span className="chip text-ember">{h.skillPoints} skill pts</span>}>
        <div className="grid grid-cols-4 gap-2">
          {h.equipped.map((id, i) => {
            const a = id ? ABILITY_BY_ID[id] : null;
            const r = a ? resolveAbility(a, h) : null;
            return (
              <div key={i} className="rounded border border-gold/25 bg-black/40 p-1.5 text-center">
                <div className="font-display text-[0.6rem] text-gold">{['Q', 'E', 'R', 'F'][i]}</div>
                {a ? <><Icon name={a.icon} size={30} color={a.color} className="mx-auto" /><div className="truncate text-[0.65rem] text-parch">{r!.name}</div><button className="text-[0.6rem] text-mist underline" onClick={() => act((g) => { g.heir.equipped[i] = null; })}>remove</button></> : <div className="py-4 text-xs italic text-mist">empty</div>}
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <div className="mb-1 font-display text-xs text-gold">Transformation</div>
          <div className="flex flex-wrap gap-1.5">
            {FORMS.map((f) => {
              const ok = formAvailable(h, f, !!s.dev?.enabled && s.dev.allForms);
              return <button key={f.id} disabled={!ok} title={f.description} onClick={() => act((g) => { g.heir.form = f.id; })} className={`flex items-center gap-1 rounded border px-2 py-1 text-xs ${h.form === f.id ? 'border-ember bg-blood/50 text-parch' : ok ? 'border-gold/25 text-parch' : 'border-gold/10 text-mist/40'}`}><Icon name={f.icon} size={14} color={ok ? f.color : '#555'} />{f.name}</button>;
            })}
          </div>
          {(() => { const f = FORMS.find((x) => x.id === h.form)!; return <p className="mt-1 text-xs text-mist">{f.description} <span className="text-red-300">{f.drawback}</span> Upkeep {f.upkeep}/s.</p>; })()}
        </div>
      </Panel>
      <Tabs value={school} onChange={setSchool} tabs={SCHOOLS.map((x) => ({ id: x.id, label: x.name, icon: x.icon }))} />
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((a) => {
          const st = abilityStatus(s, a);
          const lvl = masteryLevel(h, a.id);
          const r = resolveAbility(a, h);
          return (
            <button key={a.id} onClick={() => setPick(a)} className={`rounded border p-2.5 text-left ${st.learned ? 'border-gold/40 bg-black/40' : st.available ? 'border-ember/30 bg-black/30' : 'border-gold/10 bg-black/20 opacity-60'}`}>
              <div className="flex items-center gap-2">
                <Icon name={a.icon} size={28} color={st.learned ? a.color : '#777'} />
                <div className="min-w-0 flex-1"><div className="truncate font-display text-sm text-parch">{st.learned ? r.name : a.name}{a.legendary && ' ✦'}</div><div className="text-[0.7rem] text-mist">{st.learned ? `Mastery ${lvl}/10 · ${r.element}` : st.reason}</div></div>
                {h.equipped.includes(a.id) && <span className="chip text-ember">equipped</span>}
              </div>
              {st.learned && <div className="mt-1.5 h-1 overflow-hidden rounded bg-black/60"><div className="h-full bg-gold" style={{ width: `${lvl >= 10 ? 100 : ((h.mastery[a.id]?.xp ?? 0) / masteryNeeded(lvl)) * 100}%` }} /></div>}
            </button>
          );
        })}
        {!list.length && <Empty>No powers of this school are known to your line.</Empty>}
      </div>
      {pick && <AbilityModal a={pick} onClose={() => setPick(null)} />}
    </div>
  );
}

import { Modal } from '../components';
function AbilityModal({ a, onClose }: { a: AbilityDef; onClose: () => void }) {
  const { s, act, ask } = useGame();
  const h = s.heir;
  const st = abilityStatus(s, a);
  const lvl = masteryLevel(h, a.id);
  const r = resolveAbility(a, h);
  const p = r.params;
  return (
    <Modal title={st.learned ? r.name : a.name} onClose={onClose}>
      <div className="flex items-center gap-3"><Icon name={a.icon} size={48} color={a.color} /><div className="text-sm"><div className="capitalize text-gold">{a.school} · {r.element} · {a.kind}</div><div className="text-mist">{st.learned ? `Mastery ${lvl}/10` : st.reason}</div>{r.variant && <div className="text-purple-200">Bloodline variant: {r.variant}</div>}</div></div>
      <p className="mt-3 text-parch/90">{a.description}</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
        {p.damage !== undefined && <div className="rounded bg-black/40 p-1"><div className="text-mist">Damage</div><div className="font-display text-parch">{p.damage}</div></div>}
        <div className="rounded bg-black/40 p-1"><div className="text-mist">Blood</div><div className="font-display text-parch">{p.cost ?? 0}</div></div>
        <div className="rounded bg-black/40 p-1"><div className="text-mist">Cooldown</div><div className="font-display text-parch">{p.cooldown ?? 0}s</div></div>
        {p.count !== undefined && <div className="rounded bg-black/40 p-1"><div className="text-mist">Count</div><div className="font-display text-parch">{p.count}</div></div>}
        {p.radius !== undefined && a.kind !== 'cone' && <div className="rounded bg-black/40 p-1"><div className="text-mist">Radius</div><div className="font-display text-parch">{p.radius}</div></div>}
        {p.duration !== undefined && <div className="rounded bg-black/40 p-1"><div className="text-mist">Duration</div><div className="font-display text-parch">{p.duration}s</div></div>}
      </div>
      {p.status && <div className="mt-2 text-xs text-mist">Inflicts: {p.status.map((x) => `${x.id} (${Math.round(x.chance * 100)}%)`).join(', ')}</div>}
      <div className="mt-1 text-xs text-mist">Scales with {statLabel(a.scaling.stat)} (+{Math.round(a.scaling.perPoint * 100)}%/pt) and mastery (+{Math.round(a.scaling.masteryDamage * 100)}%/level).</div>
      <div className="rule my-3" />
      <div className="font-display text-xs text-gold">Evolution</div>
      <ol className="mt-1 space-y-1">{a.tiers.map((t) => <li key={t.name} className={`text-sm ${lvl >= t.mastery ? 'text-parch' : 'text-mist/60'}`}><span className="font-display">M{t.mastery} · {t.name}</span> — <span className="text-xs">{t.note}</span></li>)}</ol>
      {a.variants && <><div className="mt-2 font-display text-xs text-gold">Bloodline Mutations</div><ul className="mt-1 space-y-0.5 text-xs text-mist">{a.variants.map((v) => <li key={v.bloodline}><span style={{ color: BLOODLINE_BY_ID[v.bloodline].color }}>{BLOODLINE_BY_ID[v.bloodline].name}</span> → {v.name}: {v.note}</li>)}</ul></>}
      <div className="mt-4 flex flex-wrap gap-2">
        {!st.learned && st.available && <Btn variant="primary" disabled={h.skillPoints < st.cost} onClick={() => act((g) => learnAbility(g, a.id) ?? `Learned ${a.name}.`)}>Learn ({st.cost} pt)</Btn>}
        {st.learned && [0, 1, 2, 3].map((i) => <Btn key={i} small onClick={() => act((g) => { const j = g.heir.equipped.indexOf(a.id); if (j >= 0) g.heir.equipped[j] = g.heir.equipped[i]; g.heir.equipped[i] = a.id; })}>Slot {['Q', 'E', 'R', 'F'][i]}</Btn>)}
      </div>
    </Modal>
  );
}

function Armory() {
  const { s, act, ask } = useGame();
  const h = s.heir;
  const [filter, setFilter] = useState<string>('all');
  const equip = (uid: string) => act((g) => {
    const i = g.inventory.findIndex((x) => x.uid === uid);
    const inst = g.inventory[i];
    const cat = tpl(inst).category;
    const slot: EquipSlot = cat === 'ring' ? (!g.heir.equipment.ring1 ? 'ring1' : !g.heir.equipment.ring2 ? 'ring2' : 'ring1') : (cat as EquipSlot);
    const old = g.heir.equipment[slot];
    g.inventory.splice(i, 1);
    if (old) g.inventory.push(old);
    g.heir.equipment[slot] = inst;
  });
  const unequip = (slot: EquipSlot) => act((g) => { const it = g.heir.equipment[slot]; if (it) { g.inventory.push(it); delete g.heir.equipment[slot]; } });
  const inv = s.inventory.filter((i) => filter === 'all' || tpl(i)?.category === filter);
  const consumables = Object.entries(s.consumables).filter(([, n]) => n > 0);
  return (
    <div className="space-y-3">
      <Panel title="Equipped" icon="chest-armor">
        <div className="grid gap-2 sm:grid-cols-2">
          {EQUIP_SLOTS.map((slot) => {
            const it = h.equipment[slot];
            return it ? <ItemCard key={slot} inst={it} compact actions={<><Btn small onClick={() => unequip(slot)}>Unequip</Btn><UpgradeBtn uid={it.uid} /></>} /> : (
              <div key={slot} className="rounded border border-dashed border-gold/15 p-3 text-center text-xs text-mist capitalize">{slotCategory(slot)} — empty</div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Belt" icon="potion-ball">
        <div className="flex flex-wrap gap-2">
          {[0, 1].map((i) => (
            <select key={i} value={h.belt[i] ?? ''} onChange={(e) => act((g) => { g.heir.belt[i] = e.target.value || null; })} className="text-sm">
              <option value="">— Slot {i + 1} —</option>
              {consumables.map(([id, n]) => <option key={id} value={id}>{ITEM_BY_ID[id]?.name} ({n})</option>)}
            </select>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">{consumables.map(([id, n]) => <span key={id} className="chip text-mist">{ITEM_BY_ID[id]?.name} ×{n}</span>)}</div>
      </Panel>
      <Panel title={`Vault (${s.inventory.length})`} icon="locked-chest">
        <div className="mb-2 flex flex-wrap gap-1">{['all', 'weapon', 'armor', 'cloak', 'ring', 'amulet', 'relic', 'artifact'].map((f) => <button key={f} onClick={() => setFilter(f)} className={`chip capitalize ${filter === f ? 'text-ember' : 'text-mist'}`}>{f}</button>)}</div>
        <div className="grid gap-2">
          {inv.map((it) => (
            <ItemCard key={it.uid} inst={it} actions={<>
              {tpl(it).category !== 'artifact' && <Btn small variant="primary" onClick={() => equip(it.uid)}>Equip</Btn>}
              <UpgradeBtn uid={it.uid} />
              <Btn small onClick={() => act((g) => sellItem(g, it.uid))}>Sell {Math.round(itemValue(it) * 0.4)}♛</Btn>
              <Btn small variant="ghost" onClick={() => act((g) => breakDown(g, it.uid))}>Dismantle</Btn>
            </>} />
          ))}
          {!inv.length && <Empty>Your vault is empty. Hunt to fill it.</Empty>}
        </div>
      </Panel>
    </div>
  );
}

function UpgradeBtn({ uid }: { uid: string }) {
  const { s, act, ask } = useGame();
  const it = s.inventory.find((x) => x.uid === uid) ?? Object.values(s.heir.equipment).find((x) => x?.uid === uid);
  if (!it || it.level >= 10) return null;
  const c = upgradeCost(it);
  const ch = upgradeChance(it);
  return <Btn small onClick={() => act((g) => upgrade(g, uid))} title={`${c.gold} crowns + ${c.count}× ${c.material}`}>Forge +{it.level + 1} ({c.gold}♛{ch < 1 ? `, ${Math.round(ch * 100)}%` : ''})</Btn>;
}

function Lineage() {
  const { s } = useGame();
  const all = [...s.lineage.map((l) => ({ ...l, current: false })), { id: s.heir.id, name: s.heir.name, generation: s.heir.generation, rank: s.heir.rank, bloodlines: expressedGenes(s.heir.genome).map((g) => g.bloodline), fate: 'Reigning', nights: [s.heir.bornNight, s.night] as [number, number], deeds: s.heir.deeds, parents: s.heir.parents, maternalHouse: s.heir.maternalHouse, current: true }];
  return (
    <div className="space-y-3">
      <Panel title={`The Line of House ${s.dynasty.name}`} icon="family-tree">
        <p className="mb-3 font-fell italic text-mist">“{s.dynasty.motto}” — sworn to {HOUSE_BY_ID[s.dynasty.patron]?.name}. Prestige {s.dynasty.prestige}.</p>
        <ol className="relative space-y-3 border-l border-gold/30 pl-4">
          {all.map((l) => (
            <li key={l.id} className="relative">
              <span className={`absolute top-1 -left-[1.4rem] h-3 w-3 rounded-full border-2 ${l.current ? 'border-ember bg-blood' : 'border-gold bg-black'}`} />
              <div className="font-display text-parch">{l.name} <span className="text-xs text-mist">· Gen {l.generation} · {RANKS[l.rank - 1]?.name}</span></div>
              <div className="text-xs text-mist">Child of {l.parents.join(' & ')}{l.maternalHouse && ` (${HOUSE_BY_ID[l.maternalHouse]?.name})`} · Nights {l.nights[0]}–{l.nights[1]} · {l.fate}</div>
              <div className="mt-0.5 flex flex-wrap gap-1">{l.bloodlines.map((b) => <span key={b} className="chip" style={{ color: BLOODLINE_BY_ID[b].color }}>{BLOODLINE_BY_ID[b].name}</span>)}</div>
              {l.deeds.length > 0 && <ul className="mt-0.5 text-xs text-amber-200/80">{l.deeds.slice(-4).map((d, i) => <li key={i}>✦ {d}</li>)}</ul>}
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Archives of the Dynasty" icon="bookshelf">
        <ul className="space-y-1 text-sm text-mist">{s.dynasty.history.slice(-12).reverse().map((h, i) => <li key={i}>{h}</li>)}</ul>
      </Panel>
      {s.heir.alive && <EndReign />}
    </div>
  );
}

import { generateProgeny } from '../../game/systems/progression';
function EndReign() {
  const { s, act, go, ask } = useGame();
  return (
    <Panel title="The Long Sleep" icon="coffin">
      <p className="text-sm text-mist">An heir may choose to enter the Long Sleep and pass the mantle on. Their equipment and part of their mastery pass to the next generation. {s.heir.spouse ? `With ${s.heir.spouse.name}, the Rite of Commingling will produce three candidates.` : 'Without a spouse, only a lesser Embrace is possible. Arrange a marriage at Court first.'}</p>
      <Btn className="mt-2" onClick={() => { ask(`Let ${s.heir.name} enter the Long Sleep?`, () => { { act((g) => { g.progeny = generateProgeny(g); }); go('succession'); } }); }}>Enter the Long Sleep</Btn>
    </Panel>
  );
}
