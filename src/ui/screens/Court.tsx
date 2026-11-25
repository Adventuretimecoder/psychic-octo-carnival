import { useState } from 'react';
import { BLOODLINE_BY_ID, HOUSE_BY_ID, HOUSES, REGION_BY_ID } from '../../game/data';
import type { HouseId } from '../../game/types';
import {
  BUILDINGS, MAX_BUILDINGS, DECREES, blackmail, breakAlliance, build, buildCost, denounce, dowry, dynastyPower, espionage, gift, giftCost,
  marriagePreview, maxCourtActions, petition, proposeAlliance, proposeDecree, proposeMarriage, regionIncome, spouseCandidate, voteSupport,
} from '../../game/systems/world';
import { Btn, Icon, Mods, Panel, Tabs } from '../components';
import { useGame } from '../store';

type Sub = 'houses' | 'council' | 'domains';

export function Court() {
  const { s } = useGame();
  const [sub, setSub] = useState<Sub>('houses');
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-mist">Court actions tonight: <span className="font-display text-ember">{s.courtActions}/{maxCourtActions(s)}</span></span>
        <span className="text-mist">Dynasty power: <span className="font-display text-gold">{dynastyPower(s)}</span></span>
      </div>
      <Tabs<Sub> value={sub} onChange={setSub} tabs={[{ id: 'houses', label: 'Houses', icon: 'crown' }, { id: 'council', label: 'Council', icon: 'throne-king' }, { id: 'domains', label: 'Domains', icon: 'castle' }]} />
      {sub === 'houses' && <Houses />}
      {sub === 'council' && <Council />}
      {sub === 'domains' && <Domains />}
    </div>
  );
}

const standingLabel = (v: number) => (v >= 75 ? 'Devoted' : v >= 50 ? 'Friendly' : v >= 20 ? 'Cordial' : v > -20 ? 'Neutral' : v > -50 ? 'Hostile' : 'Bloodfeud');
const standingColor = (v: number) => (v >= 50 ? '#6ee7b7' : v >= 20 ? '#a7f3d0' : v > -20 ? '#d6cfc4' : v > -50 ? '#fca5a5' : '#ef4444');

function Houses() {
  const { s } = useGame();
  const [open, setOpen] = useState<HouseId | null>(null);
  const sorted = [...HOUSES].sort((a, b) => s.houses[b.id].power - s.houses[a.id].power);
  return (
    <div className="space-y-2">
      {sorted.map((h) => {
        const hs = s.houses[h.id];
        return (
          <div key={h.id} className="ornate !p-0">
            <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(open === h.id ? null : h.id)}>
              <div className="grid h-11 w-10 shrink-0 place-items-center rounded-b-[45%] rounded-t-sm border" style={{ background: `linear-gradient(160deg, ${h.colors[0]}, #0b0709)`, borderColor: h.colors[1] }}><Icon name={h.crest} size={24} color={h.colors[1]} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5"><span className="truncate font-display text-sm text-parch">{h.name}</span>{hs.alliance && <span className="chip text-emerald-300">ally</span>}{hs.married && <span className="chip text-pink-300">kin</span>}{hs.exiled && <span className="chip text-red-400">exiled</span>}{s.council.seats.includes(h.id) && <Icon name="throne-king" size={12} color="#d4a84a" />}</div>
                <div className="truncate text-xs text-mist">{h.title}</div>
              </div>
              <div className="text-right text-xs">
                <div style={{ color: standingColor(hs.standing) }}>{standingLabel(hs.standing)} {Math.round(hs.standing)}</div>
                <div className="text-mist">Power {Math.round(hs.power)}</div>
              </div>
            </button>
            {open === h.id && <HouseDetail id={h.id} />}
          </div>
        );
      })}
    </div>
  );
}

function HouseDetail({ id }: { id: HouseId }) {
  const { s, act } = useGame();
  const h = HOUSE_BY_ID[id];
  const hs = s.houses[id];
  const sp = spouseCandidate(s, id);
  const comp = marriagePreview(s, id);
  return (
    <div className="border-t border-gold/15 p-3 text-sm">
      <p className="font-fell italic text-gold">“{h.motto}”</p>
      <p className="mt-1 text-mist">{h.history}</p>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div><span className="text-gold">Specialty:</span> {h.specialty}</div>
        <div><span className="text-gold">Temperament:</span> <span className="capitalize">{h.temperament}</span></div>
        <div><span className="text-gold">Founded:</span> {h.founded < 0 ? `${-h.founded} B.S.` : `${h.founded} A.S.`} by {h.founder}</div>
        <div><span className="text-gold">Bloodlines:</span> {h.bloodlines.map((b) => <span key={b} style={{ color: BLOODLINE_BY_ID[b].color }}>{BLOODLINE_BY_ID[b].name} </span>)}</div>
        <div><span className="text-gold">Allies:</span> {h.alliances.map((a) => HOUSE_BY_ID[a]?.name.replace('House ', '')).join(', ') || '—'}</div>
        <div><span className="text-gold">Rivals:</span> {h.rivals.map((a) => HOUSE_BY_ID[a]?.name.replace('House ', '')).join(', ') || '—'}</div>
        <div><span className="text-gold">Lands:</span> {Object.entries(s.regions).filter(([, r]) => r.owner === id).map(([rid]) => REGION_BY_ID[rid].name).join(', ') || 'Estates in Vel\'Sanguis'}</div>
        <div><span className="text-gold">Hierarchy:</span> {h.hierarchy.join(' › ')}</div>
      </div>
      <details className="mt-2 text-xs text-mist"><summary className="cursor-pointer text-gold">Traditions, legends & rites</summary>
        <ul className="mt-1 list-disc pl-4">{h.traditions.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <div className="mt-1">{h.legends.map((l) => <div key={l.name}><b className="text-parch">{l.name}:</b> {l.deed}</div>)}</div>
        <div className="mt-1"><b className="text-parch">{h.ritual.name}:</b> {h.ritual.description}</div>
        <div className="mt-1"><b className="text-parch">Signature — {h.signature.name}:</b> {h.signature.description}</div>
        <div className="mt-1"><b className="text-parch">{h.passive.name}</b><Mods mods={h.passive.mods} className="!text-xs" /></div>
      </details>
      {hs.secretKnown && <div className="mt-2 rounded border border-purple-400/40 bg-purple-900/20 p-2 text-xs text-purple-200"><b>Their secret:</b> {h.secret}</div>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Btn small onClick={() => act((g) => gift(g, id))}>Gift ({giftCost(s, id)}♛)</Btn>
        <Btn small onClick={() => act((g) => petition(g, id))}>Petition</Btn>
        <Btn small onClick={() => act((g) => espionage(g, id))} disabled={hs.secretKnown}>Espionage</Btn>
        {hs.secretKnown && <Btn small onClick={() => act((g) => blackmail(g, id))}>Blackmail</Btn>}
        {hs.secretKnown && <Btn small onClick={() => act((g) => denounce(g, id))}>Denounce</Btn>}
        {!hs.alliance ? <Btn small onClick={() => act((g) => proposeAlliance(g, id))}>Propose alliance</Btn> : <Btn small variant="ghost" onClick={() => { if (confirm('Betray this alliance?')) act((g) => breakAlliance(g, id)); }}>Break alliance</Btn>}
      </div>
      {!s.heir.spouse && (
        <div className="mt-3 rounded border border-pink-300/20 bg-black/30 p-2.5">
          <div className="font-display text-xs text-pink-200">Marriage — {sp.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">{sp.genome.map((g) => <span key={g.bloodline} className="chip" style={{ color: BLOODLINE_BY_ID[g.bloodline].color }}>{BLOODLINE_BY_ID[g.bloodline].name} {g.potency} ({g.expression})</span>)}</div>
          <div className="mt-1 text-xs text-mist">Compatibility {comp.score}/100{comp.fusions.length > 0 && <span className="text-emerald-300"> · possible fusions: {comp.fusions.join(', ')}</span>}{comp.conflicts.length > 0 && <span className="text-red-300"> · conflicts: {comp.conflicts.join(', ')}</span>}</div>
          <div className="mt-1 text-xs text-mist">Heirs would inherit {h.name}'s passive, weakness and signature power.</div>
          <Btn small className="mt-2" onClick={() => act((g) => proposeMarriage(g, id))}>Propose marriage (dowry {dowry(s, id)}♛)</Btn>
        </div>
      )}
    </div>
  );
}

function Council() {
  const { s, act } = useGame();
  const seated = s.council.seats.includes('player');
  const throne = s.council.throne === 'player' ? `${s.heir.name} of House ${s.dynasty.name}` : s.counters['boss:gilded-regent'] ? 'Empty — the Regent is fallen' : 'The Gilded Regent (in the Sovereign\'s name)';
  return (
    <div className="space-y-3">
      <Panel title="The Crimson Throne" icon="throne-king">
        <div className="text-sm"><span className="text-mist">Sovereign:</span> <span className="font-display text-parch">Aurek Veyrath III — in torpor</span></div>
        <div className="text-sm"><span className="text-mist">Seat of power:</span> <span className="font-display text-gold">{throne}</span></div>
      </Panel>
      <Panel title="The Night Council of Seven Seats" icon="round-table">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {s.council.seats.map((seat, i) => seat === 'player' ? (
            <div key={i} className="rounded border border-ember/50 bg-blood/30 p-2 text-center"><Icon name={s.dynasty.crest} size={22} color={s.dynasty.colors[1]} className="mx-auto" /><div className="font-display text-xs text-parch">House {s.dynasty.name}</div></div>
          ) : (
            <div key={i} className="rounded border border-gold/15 bg-black/30 p-2 text-center"><Icon name={HOUSE_BY_ID[seat].crest} size={22} color={HOUSE_BY_ID[seat].colors[1]} className="mx-auto" /><div className="truncate font-display text-xs text-parch">{HOUSE_BY_ID[seat].name.replace('House ', '')}</div><div className="text-[0.6rem] text-mist">{Math.round(s.houses[seat].standing)} standing</div></div>
          ))}
        </div>
        {!seated && <p className="mt-2 text-sm text-mist">Your dynasty's power ({dynastyPower(s)}) must exceed the weakest seated house ({Math.round(Math.min(...s.council.seats.filter((x) => x !== 'player').map((x) => s.houses[x as HouseId].power)))}) to gain a seat. Prestige, influence, domains and alliances all count. Seats are reckoned each night.</p>}
      </Panel>
      <Panel title="Decrees" icon="scroll-unfurled">
        <div className="space-y-2">
          {DECREES.map((d) => {
            const passed = s.council.decrees.includes(d.id);
            const v = voteSupport(s, d);
            return (
              <div key={d.id} className={`rounded border p-2.5 ${passed ? 'border-emerald-400/40' : 'border-gold/15'}`}>
                <div className="flex items-center gap-2"><span className="font-display text-sm text-parch">{d.name}</span>{passed && <span className="chip text-emerald-300">law</span>}<span className="ml-auto text-xs text-mist">needs {d.votes}/7</span></div>
                <p className="text-xs text-mist">{d.description}</p>
                {seated && !passed && <div className="mt-1 flex items-center gap-2"><span className="text-xs text-mist">Likely votes: {v.yes.length + 1}</span><Btn small onClick={() => act((g) => proposeDecree(g, d.id))}>Propose</Btn></div>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Domains() {
  const { s, act } = useGame();
  const owned = Object.entries(s.regions).filter(([, r]) => r.owner === 'player');
  return (
    <div className="space-y-3">
      {!owned.length && <Panel title="No Domains Yet" icon="castle"><p className="text-sm text-mist">Defeat the lord of a region, then claim or seize it from the Hunt map. Domains pay tithes in crowns and blood each night, grant passive bonuses, and can be built upon. Hostile houses may raid them.</p></Panel>}
      {owned.map(([rid, rs]) => {
        const r = REGION_BY_ID[rid];
        const inc = regionIncome(s, rid);
        return (
          <Panel key={rid} title={r.name} icon="castle" right={<span className="chip text-gold">L{r.level}</span>}>
            <div className="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-4">
              <div><span className="text-mist">Population</span><div className="font-display">{rs.population.toLocaleString()}</div></div>
              <div><span className="text-mist">Defense</span><div className="font-display">{rs.defense}</div></div>
              <div><span className="text-mist">Unrest</span><div className={`font-display ${rs.unrest > 60 ? 'text-red-400' : ''}`}>{Math.round(rs.unrest)}</div></div>
              <div><span className="text-mist">Income</span><div className="font-display text-amber-200">{inc.gold}♛ {inc.vials ? `· ${inc.vials} vials` : ''}</div></div>
            </div>
            <div className="mt-2 text-xs"><span className="text-gold">{r.bonus.name}:</span> <Mods mods={r.bonus.mods} className="inline !text-xs" /></div>
            <div className="mt-2 text-xs text-mist">Resources: {r.resources.join(', ')}</div>
            <div className="mt-3 font-display text-xs text-gold">Works ({rs.buildings.length}/{MAX_BUILDINGS})</div>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
              {BUILDINGS.map((b) => {
                const built = rs.buildings.includes(b.id);
                return (
                  <div key={b.id} className={`rounded border p-2 text-xs ${built ? 'border-emerald-400/40' : 'border-gold/10'}`}>
                    <div className="flex items-center"><span className="font-display text-parch">{b.name}</span>{!built && rs.buildings.length < MAX_BUILDINGS && <Btn small className="ml-auto" onClick={() => act((g) => build(g, rid, b.id))}>{buildCost(rid, b.id)}♛</Btn>}{built && <span className="ml-auto text-emerald-300">built</span>}</div>
                    <div className="text-mist">{b.description}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
