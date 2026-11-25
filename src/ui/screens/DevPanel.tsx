/**
 * Developer panel: every system, editable. Opened from the wrench button
 * (Haven top bar, or inside a hunt). All edits autosave like normal play.
 */
import { useMemo, useRef, useState } from 'react';
import { ACHIEVEMENTS } from '../../game/data/achievements';
import { WORLD_EVENTS } from '../../game/data/lore';
import { NPCS } from '../../game/data/npcs';
import { ABILITIES, ABILITY_BY_ID, BLOODLINE_BY_ID, BLOODLINES, BOSS_BY_ID, BOSSES, CREATURES, FORMS, HOUSE_BY_ID, HOUSES, ITEMS, MUTATIONS, PATHS, RANKS, REGION_BY_ID, REGIONS, STAGE_NAMES } from '../../game/data';
import type { Hunt } from '../../game/engine/hunt';
import { DEFAULT_DEV, type DevFlags, type Gene } from '../../game/state';
import * as D from '../../game/systems/dev';
import { isExpressed } from '../../game/systems/genetics';
import { AFFIXES, itemName, RARITY_COLOR } from '../../game/systems/loot';
import { masteryLevel } from '../../game/systems/progression';
import { ALL_QUESTS } from '../../game/systems/quests';
import { startRun } from '../../game/systems/run';
import { exportCode, importCode, migrate } from '../../game/systems/save';
import { computeStats } from '../../game/systems/stats';
import { DECREES } from '../../game/systems/world';
import type { BloodlineId, HouseId, PrimaryStat, Rarity } from '../../game/types';
import { PRIMARY_STATS, RARITIES } from '../../game/types';
import { Btn, Icon, Modal, statLabel } from '../components';
import { useGame } from '../store';

type Tab = 'cheats' | 'heir' | 'powers' | 'blood' | 'items' | 'world' | 'houses' | 'quests' | 'lore' | 'dynasty' | 'hunt' | 'console' | 'save';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'cheats', label: 'Cheats', icon: 'magic-swirl' }, { id: 'hunt', label: 'Hunt', icon: 'fangs' }, { id: 'heir', label: 'Heir', icon: 'vampire-dracula' },
  { id: 'powers', label: 'Powers', icon: 'spell-book' }, { id: 'blood', label: 'Blood', icon: 'dna1' }, { id: 'items', label: 'Items', icon: 'locked-chest' },
  { id: 'world', label: 'World', icon: 'treasure-map' }, { id: 'houses', label: 'Houses', icon: 'crown' }, { id: 'quests', label: 'Quests', icon: 'scroll-quill' },
  { id: 'lore', label: 'Lore', icon: 'black-book' }, { id: 'dynasty', label: 'Dynasty', icon: 'family-tree' }, { id: 'console', label: 'Console', icon: 'quill-ink' },
  { id: 'save', label: 'Save', icon: 'bookshelf' },
];

export function DevPanel({ onClose, hunt }: { onClose: () => void; hunt?: Hunt | null }) {
  const [tab, setTab] = useState<Tab>(hunt ? 'hunt' : 'cheats');
  return (
    <Modal title={<span className="flex items-center gap-2"><Icon name="cog" size={18} color="#80c0ff" /> Developer Tools</span>} onClose={() => { hunt?.devRefresh(); onClose(); }} wide>
      <div className="-mx-1 mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1 rounded border px-2 py-1 font-display text-[0.65rem] tracking-wide ${tab === t.id ? 'border-sky-300/70 bg-sky-900/40 text-sky-100' : 'border-gold/15 text-mist'}`}>
            <Icon name={t.icon} size={12} />{t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[50vh] text-sm">
        {tab === 'cheats' && <Cheats />}
        {tab === 'hunt' && <HuntTools hunt={hunt} onClose={onClose} />}
        {tab === 'heir' && <HeirTools />}
        {tab === 'powers' && <PowerTools />}
        {tab === 'blood' && <BloodTools />}
        {tab === 'items' && <ItemTools />}
        {tab === 'world' && <WorldTools />}
        {tab === 'houses' && <HouseTools />}
        {tab === 'quests' && <QuestTools />}
        {tab === 'lore' && <LoreTools />}
        {tab === 'dynasty' && <DynastyTools />}
        {tab === 'console' && <Console />}
        {tab === 'save' && <SaveTools />}
      </div>
      {hunt && <p className="mt-3 text-[0.7rem] text-mist">Changes to the heir apply to the hunt in progress when you close this panel.</p>}
    </Modal>
  );
}

// ───────────────────────── small inputs ─────────────────────────
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mt-4 mb-1.5 font-display text-xs tracking-wider text-sky-200 uppercase first:mt-0">{children}</h3>;
const Row = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
function Num({ value, onSet, min, max, step = 1, w = 'w-20', label }: { value: number; onSet: (v: number) => void; min?: number; max?: number; step?: number; w?: string; label?: string }) {
  const [v, setV] = useState(String(value));
  const [focus, setFocus] = useState(false);
  return (
    <label className="flex items-center gap-1 text-xs text-mist">{label}
      <input className={`${w} !px-1.5 !py-1 text-sm`} type="number" min={min} max={max} step={step} value={focus ? v : String(+value.toFixed(2))}
        onFocus={() => { setFocus(true); setV(String(+value.toFixed(2))); }} onChange={(e) => setV(e.target.value)}
        onBlur={() => { setFocus(false); if (v !== '' && !Number.isNaN(Number(v))) onSet(Number(v)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </label>
  );
}
function Search<T extends { id: string; name?: string }>({ list, onPick, placeholder, render }: { list: T[]; onPick: (t: T) => void; placeholder: string; render?: (t: T) => React.ReactNode }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => (q.length < 1 ? list.slice(0, 40) : list.filter((x) => x.id.includes(q.toLowerCase()) || (x.name ?? '').toLowerCase().includes(q.toLowerCase())).slice(0, 60)), [q, list]);
  return (
    <div>
      <input className="mb-1.5 w-full text-sm" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-64 space-y-0.5 overflow-y-auto rounded border border-gold/10 bg-black/30 p-1">
        {hits.map((x) => <button key={x.id} onClick={() => onPick(x)} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-sky-900/30">{render ? render(x) : <><span className="text-parch">{x.name ?? x.id}</span> <span className="text-mist/60">{x.id}</span></>}</button>)}
        {!hits.length && <div className="p-2 text-xs italic text-mist">No matches.</div>}
      </div>
    </div>
  );
}

// ───────────────────────── Cheats ─────────────────────────
const TOGGLE_INFO: Array<[keyof DevFlags, string, string]> = [
  ['god', 'God mode', 'Take no damage from anything.'], ['infBlood', 'Infinite blood', 'Abilities and forms are free; no hunger.'],
  ['noCooldowns', 'No cooldowns', 'Abilities, dash and forms recharge instantly.'], ['oneHit', 'One-hit kills', 'Every hit kills, bosses included.'],
  ['noHunger', 'No hunger', 'Blood does not drain over time.'], ['noSun', 'Sun immunity', 'Sunlight cannot burn you.'],
  ['noclip', 'Noclip', 'Walk through walls.'], ['invisible', 'Invisible', 'Enemies never notice you.'],
  ['revealMap', 'Reveal map', 'Minimap shows every room.'], ['hitboxes', 'Hitboxes & AI', 'Draw collision circles, AI states and room bounds.'],
  ['fps', 'Performance stats', 'FPS, foe and particle counts.'], ['allForms', 'All transformations', 'Every form unlocked regardless of rank or blood.'],
  ['freeCrafting', 'Free crafting', 'Recipes ignore materials and crowns.'], ['freeCourt', 'Unlimited court actions', 'Court actions are never spent.'],
];
const SLIDERS: Array<[keyof DevFlags, string, number, number, number]> = [
  ['timeScale', 'Game speed', 0.1, 3, 0.05], ['dmgMul', 'Damage dealt ×', 0.1, 50, 0.1], ['speedMul', 'Move speed ×', 0.25, 4, 0.05], ['xpMul', 'XP gain ×', 0.1, 50, 0.1], ['lootMul', 'Gear drop rate ×', 0.1, 50, 0.1],
];

function Cheats() {
  const { s, act } = useGame();
  const d = s.dev ?? DEFAULT_DEV;
  const set = (k: keyof DevFlags, v: boolean | number) => act((g) => { (D.dev(g)[k] as boolean | number) = v; });
  return (
    <div>
      <H>Toggles</H>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {TOGGLE_INFO.map(([k, l, desc]) => (
          <label key={k} className={`flex cursor-pointer items-start gap-2 rounded border p-2 ${d[k] ? 'border-sky-300/60 bg-sky-900/20' : 'border-gold/10'}`}>
            <input type="checkbox" checked={!!d[k]} onChange={(e) => set(k, e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span><span className="text-parch">{l}</span><span className="block text-[0.7rem] text-mist">{desc}</span></span>
          </label>
        ))}
      </div>
      <H>Multipliers</H>
      {SLIDERS.map(([k, l, lo, hi, st]) => (
        <label key={k} className="mb-1 flex items-center gap-2 text-xs"><span className="w-32 text-mist">{l}</span>
          <input type="range" min={lo} max={hi} step={st} value={d[k] as number} onChange={(e) => set(k, Number(e.target.value))} className="flex-1 !p-0" />
          <span className="w-12 text-right font-display text-parch">{(d[k] as number).toFixed(2)}</span>
        </label>
      ))}
      <H>Presets</H>
      <Row>
        <Btn small onClick={() => act((g) => { Object.assign(D.dev(g), { god: true, infBlood: true, noCooldowns: true, noSun: true }); return 'Invincible preset on.'; })}>Invincible</Btn>
        <Btn small onClick={() => act((g) => { Object.assign(D.dev(g), { oneHit: true, dmgMul: 10 }); return 'Overkill preset on.'; })}>Overkill</Btn>
        <Btn small onClick={() => act((g) => { Object.assign(D.dev(g), { revealMap: true, noclip: true, invisible: true, speedMul: 2.5 }); return 'Explorer preset on.'; })}>Explorer</Btn>
        <Btn small onClick={() => act((g) => { Object.assign(D.dev(g), { xpMul: 10, lootMul: 10 }); return 'Fast progression on.'; })}>Fast progression</Btn>
        <Btn small variant="ghost" onClick={() => act((g) => { g.dev = { ...DEFAULT_DEV, enabled: true }; return 'All cheats off.'; })}>All off</Btn>
      </Row>
      <H>Big buttons</H>
      <Row>
        <Btn small variant="primary" onClick={() => act((g) => D.unlockEverything(g))}>Unlock everything</Btn>
        <Btn small onClick={() => act((g) => [D.setGold(g, 999999), D.setPrestige(g, 9999), D.setResearch(g, 9999)])}>Max wealth</Btn>
        <Btn small onClick={() => act((g) => D.setRank(g, 11))}>Rank 11</Btn>
        <Btn small onClick={() => act((g) => [D.learnAll(g), D.maxMasteryAll(g)])}>All abilities, mastered</Btn>
        <Btn small onClick={() => act((g) => D.allBloodlines(g))}>All bloodlines</Btn>
      </Row>
    </div>
  );
}

// ───────────────────────── Hunt ─────────────────────────
function HuntTools({ hunt, onClose }: { hunt?: Hunt | null; onClose: () => void }) {
  const { s, act, go } = useGame();
  const [region, setRegion] = useState(REGIONS[0].id);
  const [floor, setFloor] = useState(1);
  const [count, setCount] = useState(3);
  const [elite, setElite] = useState(false);
  const [rar, setRar] = useState<Rarity>('legendary');
  const [, force] = useState(0);
  if (!hunt) {
    const r = REGION_BY_ID[region];
    return (
      <div>
        <H>Launch a hunt anywhere</H>
        <Row>
          <select value={region} onChange={(e) => { setRegion(e.target.value); setFloor(1); }} className="text-sm">{REGIONS.map((x) => <option key={x.id} value={x.id}>{x.name} (L{x.level})</option>)}</select>
          <select value={floor} onChange={(e) => setFloor(Number(e.target.value))} className="text-sm">{Array.from({ length: r.floors }, (_, i) => <option key={i} value={i + 1}>{i + 1 === r.floors ? `Floor ${i + 1} — boss lair` : `Floor ${i + 1}`}</option>)}</select>
          <Btn small variant="primary" onClick={() => { act((g) => { startRun(g, region); g.run!.floor = floor; }); onClose(); go('hunt'); }}>Start</Btn>
        </Row>
        <p className="mt-2 text-xs text-mist">Open this tab during a hunt (wrench button, top left) for live tools: spawn creatures and bosses, teleport, kill all, loot rain, skip floors.</p>
      </div>
    );
  }
  const info = hunt.devInfo();
  return (
    <div>
      <div className="mb-2 grid grid-cols-3 gap-1 text-center text-[0.7rem] sm:grid-cols-6">
        {Object.entries(info).map(([k, v]) => <div key={k} className="rounded bg-black/40 p-1"><div className="text-mist">{k}</div><div className="truncate font-display text-parch">{String(v ?? '—')}</div></div>)}
      </div>
      <Btn small variant="ghost" onClick={() => force((n) => n + 1)}>Refresh info</Btn>
      <H>Player</H>
      <Row>
        <Btn small onClick={() => hunt.devHeal()}>Heal & refill blood</Btn>
        <Btn small onClick={() => { hunt.devRefresh(); }}>Reload heir (abilities, gear, stats)</Btn>
      </Row>
      <H>Teleport</H>
      <Row>{(['start', 'enemy', 'secret', 'exit', 'boss'] as const).map((w) => <Btn key={w} small onClick={() => { hunt.devTeleport(w); onClose(); }}>{w === 'enemy' ? 'Next unexplored room' : w}</Btn>)}</Row>
      <H>Enemies</H>
      <Row>
        <Num value={count} onSet={setCount} min={1} max={30} w="w-14" label="Count" />
        <label className="flex items-center gap-1 text-xs text-mist"><input type="checkbox" checked={elite} onChange={(e) => setElite(e.target.checked)} /> elite</label>
        <Btn small variant="ghost" onClick={() => hunt.devKillAll()}>Kill all</Btn>
      </Row>
      <div className="mt-1.5"><Search list={CREATURES} placeholder="Spawn creature…" onPick={(c) => { hunt.devSpawn(c.id, count, elite); onClose(); }} render={(c) => <><span style={{ color: RARITY_COLOR[c.rarity] }}>{c.name}</span> <span className="text-mist/70">{c.behavior} · {c.family}</span></>} /></div>
      <H>Bosses</H>
      <Row>{BOSSES.map((b) => <Btn key={b.id} small onClick={() => { hunt.devSpawnBoss(b.id); onClose(); }}>{b.name.split(',')[0]}</Btn>)}</Row>
      <H>Loot</H>
      <Row>
        <select value={rar} onChange={(e) => setRar(e.target.value as Rarity)} className="text-sm">{RARITIES.slice(0, 6).map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <Btn small onClick={() => hunt.devLoot(5, rar as 'legendary')}>Rain 5 items</Btn>
        <Btn small onClick={() => hunt.devGold(2000)}>Rain 2000 crowns</Btn>
      </Row>
      <H>Floor</H>
      <Row><Btn small variant="primary" onClick={() => { hunt.devFinishFloor(); onClose(); }}>Complete this floor</Btn></Row>
      <p className="mt-2 text-xs text-mist">Run: {s.run ? `${REGION_BY_ID[s.run.region].name}, floor ${s.run.floor}` : '—'}</p>
    </div>
  );
}

// ───────────────────────── Heir ─────────────────────────
function HeirTools() {
  const { s, act } = useGame();
  const h = s.heir;
  const st = computeStats(s);
  const [name, setName] = useState(h.name);
  const [title, setTitle] = useState('');
  return (
    <div>
      <H>Identity</H>
      <Row><input className="text-sm" value={name} onChange={(e) => setName(e.target.value)} /><Btn small onClick={() => act((g) => D.renameHeir(g, name))}>Rename</Btn>
        <input className="text-sm" placeholder="Custom title" value={title} onChange={(e) => setTitle(e.target.value)} /><Btn small onClick={() => act((g) => D.addTitle(g, title))}>Grant title</Btn></Row>
      <H>Rank & experience</H>
      <Row>
        <select value={h.rank} onChange={(e) => act((g) => D.setRank(g, Number(e.target.value)))} className="text-sm">{RANKS.map((r) => <option key={r.rank} value={r.rank}>{r.rank}. {r.name}</option>)}</select>
        <Num value={h.xp} onSet={(v) => act((g) => D.setXp(g, v))} w="w-24" label="XP" />
        <Num value={h.attributePoints} onSet={(v) => act((g) => { g.heir.attributePoints = Math.max(0, v); })} w="w-16" label="Attr pts" />
        <Num value={h.skillPoints} onSet={(v) => act((g) => { g.heir.skillPoints = Math.max(0, v); })} w="w-16" label="Skill pts" />
      </Row>
      <H>Attributes (base → effective)</H>
      <div className="grid gap-1 sm:grid-cols-2">
        {PRIMARY_STATS.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="w-28 text-xs text-mist">{statLabel(p)}</span>
            <input type="range" min={0} max={120} value={h.attributes[p]} onChange={(e) => act((g) => D.setAttr(g, p as PrimaryStat, Number(e.target.value)))} className="flex-1 !p-0" />
            <span className="w-14 text-right font-display text-xs text-parch">{h.attributes[p]} → {st[p]}</span>
          </div>
        ))}
      </div>
      <Row><Btn small onClick={() => act((g) => D.setAllAttrs(g, 5))}>All 5</Btn><Btn small onClick={() => act((g) => D.setAllAttrs(g, 30))}>All 30</Btn><Btn small onClick={() => act((g) => D.setAllAttrs(g, 100))}>All 100</Btn></Row>
      <H>Vitality</H>
      <Row>
        <Num value={h.vitae} onSet={(v) => act((g) => D.setVitae(g, v))} w="w-14" label="Vitae" />
        <Num value={h.purity} onSet={(v) => act((g) => D.setPurity(g, v, g.heir.corruption))} w="w-16" label="Purity" />
        <Num value={h.corruption} onSet={(v) => act((g) => D.setPurity(g, g.heir.purity, v))} w="w-16" label="Corruption" />
      </Row>
      <H>Path</H>
      <Row>
        <select value={h.path ?? ''} onChange={(e) => act((g) => D.setPath(g, e.target.value))} className="text-sm"><option value="">— none —</option>{PATHS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </Row>
      <H>Derived stats</H>
      <div className="grid grid-cols-2 gap-x-4 text-xs sm:grid-cols-3">
        {(['maxHp', 'maxBlood', 'hpRegen', 'physDmg', 'spellDmg', 'bloodDmg', 'attackSpeed', 'moveSpeed', 'critChance', 'critMult', 'armor', 'lifesteal', 'cooldownRate', 'stealth', 'sunResist', 'influence', 'research', 'lootLuck'] as const).map((k) => (
          <div key={k} className="flex justify-between border-b border-gold/5 py-0.5"><span className="text-mist">{statLabel(k)}</span><span className="text-parch">{+st[k].toFixed(2)}</span></div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Powers ─────────────────────────
function PowerTools() {
  const { s, act } = useGame();
  const h = s.heir;
  const [lvl, setLvl] = useState(10);
  const all = useMemo(() => [...ABILITIES, ...HOUSES.map((x) => x.signature)], []);
  return (
    <div>
      <Row>
        <Btn small variant="primary" onClick={() => act((g) => D.learnAll(g))}>Learn all {all.length}</Btn>
        <Num value={lvl} onSet={setLvl} min={1} max={10} w="w-14" label="Mastery" />
        <Btn small onClick={() => act((g) => D.maxMasteryAll(g, lvl))}>Set all known to {lvl}</Btn>
        <Btn small variant="ghost" onClick={() => act((g) => { g.heir.learned = ['blood-manipulation', 'blood-drain']; g.heir.equipped = ['blood-manipulation', 'blood-drain', null, null]; g.heir.mastery = {}; return 'Abilities reset.'; })}>Reset</Btn>
      </Row>
      <H>Equipped slots</H>
      <Row>{h.equipped.map((id, i) => <select key={i} value={id ?? ''} onChange={(e) => act((g) => D.equip(g, i, e.target.value || null))} className="max-w-[10rem] text-xs"><option value="">— {['Q', 'E', 'R', 'F'][i]} empty —</option>{h.learned.map((l) => <option key={l} value={l}>{ABILITY_BY_ID[l]?.name ?? l}</option>)}</select>)}</Row>
      <H>Every ability ({h.learned.length} known)</H>
      <Search list={all} placeholder="Find ability…" onPick={(a) => act((g) => (g.heir.learned.includes(a.id) ? D.setMastery(g, a.id, Math.min(10, masteryLevel(g.heir, a.id) + 1)) : D.learn(g, a.id)))}
        render={(a) => { const known = h.learned.includes(a.id); return <span className="flex items-center gap-2"><Icon name={a.icon} size={14} color={a.color} /><span className={known ? 'text-parch' : 'text-mist'}>{a.name}</span><span className="text-mist/60">{a.school} · {a.kind}</span><span className="ml-auto text-sky-200">{known ? `M${masteryLevel(h, a.id)} (+1)` : 'learn'}</span></span>; }} />
      <H>Transformations</H>
      <Row>
        {FORMS.map((f) => <Btn key={f.id} small variant={h.form === f.id ? 'primary' : 'default'} onClick={() => act((g) => { g.heir.form = f.id; D.dev(g).allForms = true; return `Form: ${f.name} (all forms unlocked).`; })}>{f.name}</Btn>)}
      </Row>
    </div>
  );
}

// ───────────────────────── Blood ─────────────────────────
function BloodTools() {
  const { s, act } = useGame();
  const h = s.heir;
  const [house, setHouse] = useState<HouseId>('veyrath');
  const [sim, setSim] = useState<ReturnType<typeof D.simulateInheritance> | null>(null);
  const [bonus, setBonus] = useState(0);
  return (
    <div>
      <H>Genome</H>
      <div className="space-y-1.5">
        {h.genome.map((g) => {
          const b = BLOODLINE_BY_ID[g.bloodline];
          return (
            <div key={g.bloodline} className="rounded border border-gold/10 p-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Icon name={b.icon} size={14} color={b.color} /><span style={{ color: b.color }} className="w-28 truncate text-xs">{b.name}</span>
                <input type="range" min={0} max={100} value={g.potency} onChange={(e) => act((x) => D.setGene(x, g.bloodline, Number(e.target.value), g.expression))} className="w-28 !p-0" />
                <span className="w-7 text-xs text-parch">{Math.round(g.potency)}</span>
                <select value={g.expression} onChange={(e) => act((x) => D.setGene(x, g.bloodline, g.potency, e.target.value as Gene['expression']))} className="!py-0.5 text-xs">{['dominant', 'recessive', 'dormant'].map((v) => <option key={v}>{v}</option>)}</select>
                <select value={h.stages[g.bloodline] ?? 0} onChange={(e) => act((x) => D.setStage(x, g.bloodline, Number(e.target.value)))} className="!py-0.5 text-xs">{STAGE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
                <span className={`text-[0.65rem] ${isExpressed(g) ? 'text-emerald-300' : 'text-mist'}`}>{isExpressed(g) ? 'expressed' : 'silent'}</span>
                <button className="ml-auto text-xs text-red-300" onClick={() => act((x) => D.removeGene(x, g.bloodline))}>remove</button>
              </div>
            </div>
          );
        })}
      </div>
      <Row>
        <select defaultValue="" onChange={(e) => { if (e.target.value) act((x) => D.setGene(x, e.target.value as BloodlineId, 60, 'dominant')); e.target.value = ''; }} className="mt-1.5 text-sm">
          <option value="">+ Add bloodline…</option>{BLOODLINES.filter((b) => !h.genome.some((g) => g.bloodline === b.id)).map((b) => <option key={b.id} value={b.id}>{b.name} ({b.rarity})</option>)}
        </select>
        <Btn small onClick={() => act((g) => D.maxBloodlines(g))}>Max expressed lines</Btn>
        <Btn small variant="primary" onClick={() => act((g) => D.allBloodlines(g))}>All 20 at Apotheosis</Btn>
      </Row>
      <H>Mutations</H>
      <Row>{MUTATIONS.map((m) => { const has = h.mutations.includes(m.id); return <button key={m.id} onClick={() => act((g) => (has ? D.removeMutation(g, m.id) : D.addMutation(g, m.id)))} className={`chip ${has ? (m.nature === 'bane' ? 'text-red-300' : 'text-emerald-300') : 'text-mist/50'}`}>{has ? '✓ ' : ''}{m.name}</button>; })}</Row>
      <H>Feeding records</H>
      <Row>{D.BLOOD_TYPES.map((t) => <Btn key={t} small onClick={() => act((g) => D.feedBlood(g, t, 10))}>+10 {t} ({h.bloodConsumed[t] ?? 0})</Btn>)}</Row>
      <H>Inheritance simulator</H>
      <p className="mb-1 text-xs text-mist">Roll 500 children of the current heir and a spouse from a house, and see what they would inherit.</p>
      <Row>
        <select value={house} onChange={(e) => setHouse(e.target.value)} className="text-sm">{HOUSES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <Num value={bonus} onSet={setBonus} step={0.05} min={0} max={1} w="w-16" label="Mutation bonus" />
        <Btn small onClick={() => { const sp = HOUSE_BY_ID[house].bloodlines.map((b, i) => ({ bloodline: b, potency: 55 - i * 5, expression: 'dominant' as const })); setSim(D.simulateInheritance(h.genome, sp, 500, bonus)); }}>Simulate</Btn>
      </Row>
      {sim && (
        <div className="mt-2 text-xs">
          <div className="mb-1 text-mist">Mutation in {Math.round(sim.mutationRate * 100)}% of children · instability in {Math.round(sim.instabilityRate * 100)}%</div>
          <table className="w-full"><thead><tr className="text-left text-mist"><th>Bloodline</th><th>Inherited</th><th>Expressed</th><th>Avg potency</th></tr></thead>
            <tbody>{sim.rows.map((r) => <tr key={r.bloodline}><td style={{ color: BLOODLINE_BY_ID[r.bloodline].color }}>{BLOODLINE_BY_ID[r.bloodline].name}</td><td>{Math.round(r.present * 100)}%</td><td>{Math.round(r.expressed * 100)}%</td><td>{Math.round(r.potency)}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Items ─────────────────────────
function ItemTools() {
  const { s, act } = useGame();
  const [lvl, setLvl] = useState(0);
  const [rar, setRar] = useState<Rarity>('legendary');
  const [n, setN] = useState(10);
  const [aff, setAff] = useState('vampiric');
  const gear = [...Object.values(s.heir.equipment).filter(Boolean), ...s.inventory] as NonNullable<(typeof s.inventory)[number]>[];
  return (
    <div>
      <H>Spawn any item</H>
      <Row><Num value={lvl} onSet={setLvl} min={0} max={10} w="w-14" label="Upgrade +" /></Row>
      <div className="mt-1.5"><Search list={ITEMS} placeholder="Search 100+ items…" onPick={(t) => act((g) => D.spawnItem(g, t.id, lvl))} render={(t) => <><span style={{ color: RARITY_COLOR[t.rarity] }}>{t.name}</span> <span className="text-mist/70">{t.rarity} {t.weaponType ?? t.category}</span></>} /></div>
      <H>Bulk</H>
      <Row>
        <select value={rar} onChange={(e) => setRar(e.target.value as Rarity)} className="text-sm">{RARITIES.map((r) => <option key={r}>{r}</option>)}</select>
        <Num value={n} onSet={setN} min={1} max={100} w="w-14" label="×" />
        <Btn small onClick={() => act((g) => D.spawnRandom(g, n, rar, 10))}>Random {rar}+ gear</Btn>
        <Btn small onClick={() => act((g) => D.spawnByRarity(g, rar))}>Every {rar} item</Btn>
      </Row>
      <Row>
        <Btn small onClick={() => act((g) => D.giveRelics(g))}>All relics & heirlooms</Btn>
        <Btn small onClick={() => act((g) => D.giveMaterials(g, 50))}>+50 every material</Btn>
        <Btn small onClick={() => act((g) => D.giveVials(g, 20))}>+20 every blood vial</Btn>
        <Btn small onClick={() => act((g) => D.giveConsumables(g, 10))}>+10 every potion</Btn>
        <Btn small variant="ghost" onClick={() => act((g) => D.clearInventory(g))}>Empty vault</Btn>
      </Row>
      <H>Modify gear</H>
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {gear.map((it) => (
          <div key={it.uid} className="flex flex-wrap items-center gap-1.5 rounded border border-gold/10 p-1.5 text-xs">
            <span className="flex-1 truncate" style={{ color: RARITY_COLOR[it.rarity] }}>{itemName(it)}</span>
            <button className="chip text-sky-200" onClick={() => act((g) => D.perfectItem(g, it.uid))}>perfect</button>
            <button className="chip text-sky-200" onClick={() => act((g) => D.addAffix(g, it.uid, aff))}>+{AFFIXES[aff]?.name}</button>
          </div>
        ))}
      </div>
      <Row><span className="text-xs text-mist">Affix to add:</span><select value={aff} onChange={(e) => setAff(e.target.value)} className="text-xs">{Object.values(AFFIXES).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Row>
      <H>Treasury</H>
      <Row>
        <Num value={s.gold} onSet={(v) => act((g) => D.setGold(g, v))} w="w-28" label="Crowns" />
        <Num value={s.dynasty.prestige} onSet={(v) => act((g) => D.setPrestige(g, v))} w="w-20" label="Prestige" />
        <Num value={s.research} onSet={(v) => act((g) => D.setResearch(g, v))} w="w-20" label="Research" />
      </Row>
      <Row>
        <Btn small onClick={() => act((g) => D.learnAllRecipes(g))}>Learn all recipes</Btn>
        <Btn small onClick={() => act((g) => D.resetMarket(g))}>Reset market</Btn>
        <Btn small onClick={() => act((g) => D.clearDebt(g))}>Forgive debts</Btn>
      </Row>
    </div>
  );
}

// ───────────────────────── World ─────────────────────────
function WorldTools() {
  const { s, act } = useGame();
  const [skip, setSkip] = useState(5);
  const [evRegion, setEvRegion] = useState(REGIONS[0].id);
  return (
    <div>
      <H>Time</H>
      <Row>
        <Num value={s.night} onSet={(v) => act((g) => D.setNight(g, v))} w="w-20" label="Night" />
        <Num value={skip} onSet={setSkip} min={1} max={100} w="w-14" label="Skip" />
        <Btn small onClick={() => act((g) => D.skipNights(g, skip))}>Advance {skip} nights</Btn>
      </Row>
      <H>World events</H>
      <Row><span className="text-xs text-mist">Region for regional events:</span><select value={evRegion} onChange={(e) => setEvRegion(e.target.value)} className="text-xs">{REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><Btn small variant="ghost" onClick={() => act((g) => D.clearEvents(g))}>End all</Btn></Row>
      <div className="mt-1 flex flex-wrap gap-1">{WORLD_EVENTS.map((e) => { const on = s.events.some((x) => x.id === e.id); return <button key={e.id} onClick={() => act((g) => (on ? ((g.events = g.events.filter((x) => x.id !== e.id)), `${e.name} ended.`) : D.triggerEvent(g, e.id, evRegion)))} className={`chip ${on ? 'text-ember' : 'text-mist'}`} title={e.description}>{on ? '● ' : ''}{e.name}</button>; })}</div>
      <H>Regions</H>
      <Row><Btn small onClick={() => act((g) => D.defeatAllBosses(g))}>Slay every lord</Btn><Btn small onClick={() => act((g) => D.claimAll(g))}>Claim all regions</Btn></Row>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-xs"><thead><tr className="text-left text-mist"><th>Region</th><th>Owner</th><th>Lord</th><th>Pop.</th><th>Def.</th><th /></tr></thead>
          <tbody>{REGIONS.map((r) => { const rs = s.regions[r.id]; return (
            <tr key={r.id} className="border-t border-gold/5">
              <td className="py-1 pr-1">{r.name}</td>
              <td><select value={rs.owner ?? ''} onChange={(e) => act((g) => D.setOwner(g, r.id, (e.target.value || null) as HouseId | 'player' | null))} className="!py-0.5 text-xs"><option value="">unclaimed</option><option value="player">YOU</option>{HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name.replace('House ', '')}</option>)}</select></td>
              <td><button className={`chip ${rs.bossDefeated ? 'text-emerald-300' : 'text-ember'}`} onClick={() => act((g) => (rs.bossDefeated ? ((g.regions[r.id].bossDefeated = false), 'Lord restored.') : D.defeatBoss(g, r.id)))}>{rs.bossDefeated ? 'slain' : BOSS_BY_ID[r.boss]?.name.split(',')[0]}</button></td>
              <td><Num value={rs.population} onSet={(v) => act((g) => D.setRegionStat(g, r.id, 'population', v))} w="w-20" /></td>
              <td><Num value={rs.defense} onSet={(v) => act((g) => D.setRegionStat(g, r.id, 'defense', v))} w="w-14" /></td>
              <td><button className="chip text-sky-200" onClick={() => act((g) => D.buildAll(g, r.id))}>build all</button></td>
            </tr>); })}</tbody></table>
      </div>
      <H>Council</H>
      <Row>
        <Btn small onClick={() => act((g) => D.forceCouncilSeat(g, !g.council.seats.includes('player')))}>{s.council.seats.includes('player') ? 'Leave Council' : 'Take a Council seat'}</Btn>
        <Num value={s.courtActions} onSet={(v) => act((g) => D.setCourtActions(g, v))} w="w-14" label="Court actions" />
      </Row>
      <div className="mt-1 flex flex-wrap gap-1">{DECREES.map((d) => { const on = s.council.decrees.includes(d.id) || (d.id === 'crown-the-heir' && s.council.throne === 'player'); return <button key={d.id} onClick={() => act((g) => (on ? (d.id === 'crown-the-heir' ? ((g.council.throne = 'regent'), 'Throne returned to the Regent.') : D.repealDecree(g, d.id)) : D.passDecree(g, d.id)))} className={`chip ${on ? 'text-emerald-300' : 'text-mist'}`}>{on ? '✓ ' : ''}{d.name}</button>; })}</div>
    </div>
  );
}

function HouseTools() {
  const { s, act } = useGame();
  return (
    <div>
      <Row>
        <Btn small onClick={() => act((g) => D.setStanding(g, 'all', 100))}>All devoted</Btn>
        <Btn small onClick={() => act((g) => D.setStanding(g, 'all', -100))}>All bloodfeud</Btn>
        <Btn small onClick={() => act((g) => D.allyAll(g))}>Ally everyone</Btn>
        <Btn small onClick={() => act((g) => D.revealSecret(g, 'all'))}>Reveal all secrets</Btn>
      </Row>
      <div className="mt-2 space-y-1">
        {HOUSES.map((h) => { const hs = s.houses[h.id]; return (
          <div key={h.id} className="flex flex-wrap items-center gap-1.5 rounded border border-gold/10 p-1.5 text-xs">
            <Icon name={h.crest} size={14} color={h.colors[1]} /><span className="w-24 truncate text-parch">{h.name.replace('House ', '')}</span>
            <label className="flex items-center gap-1 text-mist">std<input type="range" min={-100} max={100} value={hs.standing} onChange={(e) => act((g) => D.setStanding(g, h.id, Number(e.target.value)))} className="w-20 !p-0" /><span className="w-7 text-parch">{Math.round(hs.standing)}</span></label>
            <label className="flex items-center gap-1 text-mist">pow<input type="range" min={0} max={100} value={hs.power} onChange={(e) => act((g) => D.setPower(g, h.id, Number(e.target.value)))} className="w-16 !p-0" /><span className="w-6 text-parch">{Math.round(hs.power)}</span></label>
            <button className={`chip ${hs.alliance ? 'text-emerald-300' : 'text-mist/60'}`} onClick={() => act((g) => D.toggleAlliance(g, h.id))}>ally</button>
            <button className={`chip ${hs.exiled ? 'text-red-300' : 'text-mist/60'}`} onClick={() => act((g) => D.toggleExile(g, h.id))}>exile</button>
            <button className={`chip ${hs.secretKnown ? 'text-purple-200' : 'text-mist/60'}`} onClick={() => act((g) => D.revealSecret(g, h.id))}>secret</button>
            <button className="chip text-pink-200" onClick={() => act((g) => D.marryInstant(g, h.id))}>marry</button>
          </div>); })}
      </div>
    </div>
  );
}

// ───────────────────────── Quests ─────────────────────────
function QuestTools() {
  const { s, act } = useGame();
  const [flag, setFlag] = useState('');
  return (
    <div>
      <Row>
        <Btn small onClick={() => act((g) => D.acceptEverything(g))}>Accept every quest</Btn>
        <Btn small variant="primary" onClick={() => act((g) => D.completeAllActive(g))}>Complete all active ({s.quests.length})</Btn>
        <Btn small variant="ghost" onClick={() => act((g) => D.resetQuests(g))}>Wipe quest log</Btn>
      </Row>
      <H>Any quest (tap: accept, or complete if active)</H>
      <Search list={ALL_QUESTS} placeholder={`Search ${ALL_QUESTS.length} quests…`} onPick={(q) => act((g) => (g.quests.some((p) => p.id === q.id) ? D.forceComplete(g, q.id) : D.forceAccept(g, q.id)))}
        render={(q) => { const active = s.quests.some((p) => p.id === q.id), done = s.completedQuests.includes(q.id); return <span className="flex gap-2"><span className={done ? 'text-emerald-300' : active ? 'text-ember' : 'text-parch'}>{q.name}</span><span className="text-mist/60">{q.category} · {q.id}</span><span className="ml-auto text-sky-200">{active ? 'complete' : done ? 'redo' : 'accept'}</span></span>; }} />
      <H>Story flags ({s.flags.length})</H>
      <Row><input className="text-sm" placeholder="flag name, e.g. spared-saint" value={flag} onChange={(e) => setFlag(e.target.value)} /><Btn small onClick={() => act((g) => D.addFlag(g, flag))}>Set</Btn></Row>
      <div className="mt-1 flex flex-wrap gap-1">{s.flags.filter((f) => !f.startsWith('cooldown:')).map((f) => <button key={f} onClick={() => act((g) => D.removeFlag(g, f))} className="chip text-mist" title="Click to clear">{f} ✕</button>)}</div>
    </div>
  );
}

// ───────────────────────── Lore & counters ─────────────────────────
function LoreTools() {
  const { s, act } = useGame();
  const [k, setK] = useState('kills');
  const [v, setV] = useState(100);
  const keys = [...new Set([...Object.keys(s.counters), ...ACHIEVEMENTS.map((a) => a.counter)])].sort();
  return (
    <div>
      <Row>
        <Btn small onClick={() => act((g) => D.unlockCodex(g))}>Unseal codex</Btn>
        <Btn small onClick={() => act((g) => D.unlockSecrets(g))}>Discover every secret</Btn>
        <Btn small onClick={() => act((g) => D.fullBestiary(g))}>Complete bestiary</Btn>
        <Btn small onClick={() => act((g) => D.unlockAchievements(g))}>Grant all achievements</Btn>
        <Btn small variant="ghost" onClick={() => act((g) => D.resetAchievements(g))}>Reset achievements</Btn>
      </Row>
      <H>Stat counters (drive achievements & trials)</H>
      <Row>
        <select value={k} onChange={(e) => setK(e.target.value)} className="max-w-[14rem] text-xs">{keys.map((x) => <option key={x}>{x}</option>)}</select>
        <Num value={v} onSet={setV} w="w-20" />
        <Btn small onClick={() => act((g) => D.setCounter(g, k, v))}>Set</Btn>
      </Row>
      <div className="mt-2 grid max-h-56 grid-cols-2 gap-x-3 overflow-y-auto text-xs sm:grid-cols-3">
        {Object.entries(s.counters).sort().map(([key, val]) => <div key={key} className="flex justify-between border-b border-gold/5 py-0.5"><span className="truncate text-mist">{key}</span><span className="text-parch">{val}</span></div>)}
      </div>
    </div>
  );
}

// ───────────────────────── Dynasty & NPCs ─────────────────────────
function DynastyTools() {
  const { s, act, go } = useGame();
  const [name, setName] = useState(s.dynasty.name);
  const [motto, setMotto] = useState(s.dynasty.motto);
  return (
    <div>
      <H>House</H>
      <Row>
        <input className="text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="flex-1 text-sm" value={motto} onChange={(e) => setMotto(e.target.value)} />
        <Btn small onClick={() => act((g) => D.renameDynasty(g, name, motto))}>Save</Btn>
      </Row>
      <Row>
        <label className="text-xs text-mist">Patron <select value={s.dynasty.patron} onChange={(e) => act((g) => D.setPatron(g, e.target.value))} className="text-xs">{HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <label className="text-xs text-mist">Heir's heritage <select value={s.heir.maternalHouse ?? s.dynasty.patron} onChange={(e) => act((g) => D.setMaternalHouse(g, e.target.value))} className="text-xs">{HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
      </Row>
      <H>Marriage & succession</H>
      <p className="mb-1 text-xs text-mist">{s.heir.spouse ? `Wed to ${s.heir.spouse.name}.` : 'Unwed.'} Use Houses → marry to wed instantly.</p>
      <Row>
        <Btn small variant="ghost" onClick={() => act((g) => D.divorce(g))}>Dissolve marriage</Btn>
        <Btn small onClick={() => { act((g) => D.rollProgeny(g)); go('succession'); }}>Roll heirs & open succession</Btn>
        <Btn small variant="ghost" onClick={() => { act((g) => D.killHeir(g)); go('succession'); }}>Inflict True Death</Btn>
      </Row>
      <H>Household regard</H>
      <Row><Btn small onClick={() => act((g) => D.setRelation(g, 'all', 100))}>All devoted</Btn><Btn small variant="ghost" onClick={() => act((g) => D.resetDialogue(g))}>Reset dialogue</Btn></Row>
      <div className="mt-1 space-y-1">
        {NPCS.map((n) => (
          <label key={n.id} className="flex items-center gap-2 text-xs"><span className="w-36 truncate text-parch">{n.name}</span>
            <input type="range" min={-100} max={100} value={s.npcs[n.id] ?? 0} onChange={(e) => act((g) => D.setRelation(g, n.id, Number(e.target.value)))} className="flex-1 !p-0" />
            <span className="w-8 text-right">{Math.round(s.npcs[n.id] ?? 0)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Console ─────────────────────────
function Console() {
  const { act } = useGame();
  const [line, setLine] = useState('');
  const [out, setOut] = useState<string[]>(['Sanguinis developer console. Type help for commands.']);
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const run = () => {
    const l = line.trim();
    if (!l) return;
    let res: string[] = [];
    act((g) => { res = D.runCommand(g, l); });
    setOut((o) => [...o, `> ${l}`, ...res].slice(-300));
    setHist((h) => [l, ...h].slice(0, 50)); setHi(-1); setLine('');
    setTimeout(() => box.current?.scrollTo(0, 1e9), 0);
  };
  return (
    <div>
      <div ref={box} className="h-72 overflow-y-auto rounded border border-sky-300/20 bg-black/70 p-2 font-mono text-[0.72rem] leading-relaxed text-sky-100">
        {out.map((l, i) => <div key={i} className={l.startsWith('>') ? 'text-gold' : ''}>{l}</div>)}
      </div>
      <div className="mt-2 flex gap-1.5">
        <input className="flex-1 font-mono text-sm" value={line} placeholder="e.g. rank 11 · learn all · gene void 90 · item starforged · boss all" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run();
            if (e.key === 'ArrowUp') { const n = Math.min(hist.length - 1, hi + 1); if (hist[n]) { setHi(n); setLine(hist[n]); } }
            if (e.key === 'ArrowDown') { const n = hi - 1; setHi(n); setLine(n >= 0 ? hist[n] : ''); }
          }} />
        <Btn small variant="primary" onClick={run}>Run</Btn>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">{['help', 'unlockall', 'gold 100000', 'rank 11', 'learn all', 'allblood', 'loot 10 legendary', 'boss all', 'feats', 'toggle god'].map((c) => <button key={c} onClick={() => setLine(c)} className="chip font-mono text-mist">{c}</button>)}</div>
    </div>
  );
}

// ───────────────────────── Save ─────────────────────────
function SaveTools() {
  const { s, setGame, slot, toast, act } = useGame();
  const [json, setJson] = useState('');
  return (
    <div>
      <H>Raw state editor</H>
      <p className="mb-1 text-xs text-mist">Load the full save as JSON, edit anything, then apply. Invalid JSON is rejected.</p>
      <Row>
        <Btn small onClick={() => setJson(JSON.stringify(s, null, 1))}>Load JSON</Btn>
        <Btn small variant="primary" disabled={!json} onClick={() => { try { const g = migrate(JSON.parse(json)); if (!g.heir || !g.dynasty) throw new Error('missing heir or dynasty'); setGame(g, slot); toast('State applied.', 'good'); } catch (e) { toast(`Invalid state: ${(e as Error).message}`, 'bad'); } }}>Apply</Btn>
      </Row>
      {json && <textarea className="mt-2 h-72 w-full font-mono text-[0.65rem]" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />}
      <H>Codes</H>
      <Row>
        <Btn small onClick={() => { const c = exportCode(s); setJson(c); navigator.clipboard?.writeText(c).then(() => toast('Save code copied.', 'good'), () => {}); }}>Export code</Btn>
        <Btn small disabled={!json.startsWith('SANG1:')} onClick={() => { const g = importCode(json); if (g) { setGame(g, slot); toast('Imported.', 'good'); } else toast('Invalid code.', 'bad'); }}>Import code from box</Btn>
      </Row>
      <H>Developer mode</H>
      <Row><Btn small variant="ghost" onClick={() => act((g) => { g.dev = { ...DEFAULT_DEV }; return 'Developer mode disabled. Re-enable it in Settings.'; })}>Turn developer mode off</Btn></Row>
    </div>
  );
}
