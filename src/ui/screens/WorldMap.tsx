import { useState } from 'react';
import { BOSS_BY_ID, CREATURE_BY_ID, HOUSE_BY_ID, REGION_BY_ID, REGIONS } from '../../game/data';
import { audio } from '../../game/engine/audio';
import { startRun } from '../../game/systems/run';
import { EVENT_BY_ID } from '../../game/systems/worldHooks';
import { claimCost, claimRegion } from '../../game/systems/world';
import { Btn, Icon, Mods, Panel } from '../components';
import { useGame } from '../store';

const BIOME_ICON: Record<string, string> = { forest: 'pine-tree', crypt: 'tombstone', catacomb: 'skull-crossed-bones', castle: 'castle', ash: 'volcano', frost: 'snowflake-2', cathedral: 'church', swamp: 'swamp', abyss: 'portal', library: 'book-pile', ruins: 'castle-ruins', astral: 'star-swirl' };

export function WorldMap() {
  const { s, act, go } = useGame();
  const [sel, setSel] = useState<string>(REGIONS.find((r) => !s.regions[r.id].bossDefeated)?.id ?? 'hollow-wood');
  const r = REGION_BY_ID[sel];
  const rs = s.regions[sel];
  const boss = BOSS_BY_ID[r.boss];
  const ownerName = rs.owner === 'player' ? `House ${s.dynasty.name}` : rs.owner ? HOUSE_BY_ID[rs.owner].name : sel === 'cathedral-dawn' ? 'The Order of the Dawn' : 'Unclaimed';
  const danger = r.level - s.heir.rank;
  const events = s.events.filter((e) => !e.region || e.region === sel).map((e) => EVENT_BY_ID[e.id]).filter(Boolean);
  const claim = rs.bossDefeated && rs.owner !== 'player' ? claimCost(s, sel) : null;

  return (
    <div className="space-y-3">
      <Panel title="Eryndor" icon="treasure-map" className="!p-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded" style={{ background: 'radial-gradient(ellipse at 50% 45%, #2a1a14 0%, #160d0b 60%, #0a0605 100%)' }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <defs><filter id="rough"><feTurbulence baseFrequency="0.9" numOctaves="2" /><feDisplacementMap in="SourceGraphic" scale="0.6" /></filter></defs>
            {REGIONS.flatMap((a) => a.adjacent.filter((b) => a.id < b).map((b) => {
              const B = REGION_BY_ID[b];
              return B && <line key={a.id + b} x1={a.pos[0]} y1={a.pos[1]} x2={B.pos[0]} y2={B.pos[1]} stroke="#6a4a30" strokeWidth="0.35" strokeDasharray="1.2 0.8" opacity="0.8" />;
            }))}
          </svg>
          {/* Parchment texture & compass */}
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'repeating-radial-gradient(circle at 30% 40%, transparent 0 8px, rgba(0,0,0,0.15) 9px 10px)' }} />
          <Icon name="compass" size={40} color="#6a4a30" className="absolute right-2 bottom-2 opacity-60" />
          {REGIONS.map((x) => {
            const xs = s.regions[x.id];
            const owned = xs.owner === 'player';
            const ev = s.events.some((e) => e.region === x.id);
            return (
              <button key={x.id} onClick={() => { audio.play('ui'); setSel(x.id); }} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x.pos[0]}%`, top: `${x.pos[1]}%` }}>
                <div className={`mx-auto grid h-9 w-9 place-items-center rounded-full border-2 transition ${sel === x.id ? 'scale-125 border-ember bg-blood shadow-[0_0_18px_rgba(255,40,70,0.7)]' : owned ? 'border-gold bg-[#3a2a10]' : xs.bossDefeated ? 'border-gold/50 bg-black/70' : 'border-mist/40 bg-black/70'} ${ev ? 'pulse-red' : ''}`}>
                  <Icon name={BIOME_ICON[x.biome]} size={20} color={owned ? '#f0d080' : '#e8dcc8'} />
                </div>
                <div className="mt-0.5 hidden font-display text-[0.55rem] leading-tight whitespace-nowrap text-parch/90 [text-shadow:0_1px_2px_#000] sm:block">{x.name}</div>
                <div className="font-display text-[0.5rem] text-gold/80">L{x.level}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={r.name} icon={BIOME_ICON[r.biome]} right={<span className={`chip ${danger > 2 ? 'text-red-400' : danger > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>Level {r.level}</span>}>
        <p className="font-fell text-parch/90">{r.description}</p>
        <p className="mt-2 text-sm text-mist">{r.lore}</p>
        <div className="rule my-3" />
        <div className="grid grid-cols-2 gap-x-4 text-sm">
          <div><span className="text-mist">Dungeon:</span> <span className="text-parch">{r.dungeon.name}</span></div>
          <div><span className="text-mist">Depth:</span> {rs.cleared}/{r.floors} floors</div>
          <div><span className="text-mist">Held by:</span> <span className={rs.owner === 'player' ? 'text-gold' : ''}>{ownerName}</span></div>
          <div><span className="text-mist">Lord:</span> <span className={rs.bossDefeated ? 'line-through opacity-60' : 'text-ember'}>{boss?.name}</span></div>
          <div><span className="text-mist">Population:</span> {rs.population.toLocaleString()}</div>
          <div><span className="text-mist">Defense:</span> {rs.defense}</div>
        </div>
        <p className="mt-2 text-xs italic text-mist">{r.dungeon.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {r.enemies.map((id) => { const c = CREATURE_BY_ID[id]; const known = s.bestiary[id]; return c && <span key={id} className="chip text-mist">{known ? c.name : '???'}</span>; })}
        </div>
        <div className="mt-2 text-xs"><span className="text-gold">Domain bonus — {r.bonus.name}:</span> <Mods mods={r.bonus.mods} className="inline !text-xs" /></div>
        {events.map((e) => <div key={e.id} className="mt-2 rounded border border-ember/40 bg-blood/30 p-2 text-xs"><b className="text-ember">{e.name}:</b> {e.description}</div>)}
        {danger > 2 && <p className="mt-2 text-sm text-red-300">This place is far beyond your heir's strength.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="primary" className="pulse-red flex-1" onClick={() => { audio.init(); act((st) => { startRun(st, sel); }); go('hunt'); }}>Begin the Hunt</Btn>
          {claim && <Btn onClick={() => act((st) => claimRegion(st, sel))}>{claim.peaceful ? 'Claim' : `Seize (${Math.round(claim.chance * 100)}%)`} · {claim.gold}♛</Btn>}
        </div>
        {!rs.bossDefeated && <p className="mt-2 text-xs text-mist">Slay {boss?.name} to be able to claim this domain.</p>}
      </Panel>
    </div>
  );
}
