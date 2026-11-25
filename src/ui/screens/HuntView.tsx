import { useEffect, useRef, useState } from 'react';
import { BOSS_BY_ID, ITEM_BY_ID, REGION_BY_ID } from '../../game/data';
import { audio } from '../../game/engine/audio';
import { Hunt, type HuntEvent } from '../../game/engine/hunt';
import { RARITY_COLOR } from '../../game/systems/loot';
import { generateProgeny } from '../../game/systems/progression';
import { applyHuntEvent, bankRun, descend, failRun, floorComplete } from '../../game/systems/run';
import { save } from '../../game/systems/save';
import { Btn, Icon, Modal } from '../components';
import { useGame } from '../store';

type Overlay = null | { kind: 'floor'; last: boolean } | { kind: 'pause' } | { kind: 'death'; cause: string };

export function HuntView() {
  const { s, act, go, toast, slot } = useGame();
  const ref = useRef<HTMLCanvasElement>(null);
  const hunt = useRef<Hunt | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [floorKey, setFloorKey] = useState(0);
  const run = s.run;

  useEffect(() => {
    if (!run || !ref.current) return;
    const onEvent = (e: HuntEvent) => {
      if (e.type === 'pause') { hunt.current?.setPaused(true); setOverlay({ kind: 'pause' }); return; }
      if (e.type === 'floorComplete') {
        const r = floorComplete(s, e.hp, e.blood);
        save(s, slot);
        hunt.current?.setPaused(true);
        setOverlay({ kind: 'floor', last: r.last });
        return;
      }
      if (e.type === 'death') { hunt.current?.setPaused(true); setOverlay({ kind: 'death', cause: e.cause }); return; }
      const msgs = applyHuntEvent(s, e);
      const important = msgs.filter((m) => /ascend|evolves|awaken|fusion|achievement|hidden|threshold|unlocked|secret|recovered|codex/i.test(m));
      if (important.length) toast(important);
    };
    const h = new Hunt(ref.current, { state: s, regionId: run.region, floor: run.floor, seed: run.seed, carry: run.hp > 0 ? { hp: run.hp, blood: run.blood } : null, onEvent });
    hunt.current = h;
    h.start();
    return () => { h.stop(); hunt.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorKey]);

  if (!run) return null;
  const region = REGION_BY_ID[run.region];

  const leave = () => {
    hunt.current?.stop();
    audio.startMusic('haven');
    act((st) => bankRun(st));
    go('haven');
  };
  const deeper = () => { act((st) => descend(st)); setOverlay(null); setFloorKey((k) => k + 1); };
  const fall = (cause: string) => {
    hunt.current?.stop();
    let dead = false;
    act((st) => { const r = failRun(st, cause); dead = r.trueDeath; if (dead) st.progeny = generateProgeny(st); return r.log; });
    go(dead ? 'succession' : 'haven');
  };
  const nextIsBoss = run.floor + 1 >= region.floors;

  return (
    <div className="fixed inset-0 bg-black">
      <canvas ref={ref} className="h-full w-full touch-none select-none" />
      {overlay?.kind === 'pause' && (
        <Modal title="The Hunt Pauses" onClose={() => { setOverlay(null); hunt.current?.setPaused(false); }}>
          <RunSummary />
          <div className="mt-4 flex flex-col gap-2">
            <Btn variant="primary" onClick={() => { setOverlay(null); hunt.current?.setPaused(false); }}>Resume</Btn>
            <Btn onClick={() => { if (confirm('Flee to the Haven? You keep what you carry, but this floor is abandoned.')) leave(); }}>Flee to the Haven</Btn>
          </div>
          <Controls />
        </Modal>
      )}
      {overlay?.kind === 'floor' && (
        <Modal title={overlay.last ? `${region.name} is Cleansed` : `Depth ${run.floor} Cleared`}>
          <RunSummary />
          <p className="mt-3 text-sm text-mist">{overlay.last ? 'The lair is silent. Carry your spoils home.' : nextIsBoss ? `Below waits the lair of ${BOSS_BY_ID[region.boss]?.name}. Your wounds carry over.` : 'The way down is open. Your wounds and hunger carry over.'}</p>
          <div className="mt-4 flex flex-col gap-2">
            {!overlay.last && <Btn variant="primary" onClick={deeper}>{nextIsBoss ? 'Descend to the Lair' : `Descend to Depth ${run.floor + 1}`}</Btn>}
            <Btn variant={overlay.last ? 'primary' : 'default'} onClick={leave}>Return to Blackmoor Haven</Btn>
          </div>
        </Modal>
      )}
      {overlay?.kind === 'death' && (
        <Modal title="Darkness Takes You">
          <p className="text-mist">{s.heir.name} has fallen to {overlay.cause}.</p>
          <p className="mt-2 text-sm text-mist">{s.heir.vitae > 1 ? `Your servants will drag the body home. Half your unbanked crowns and materials, and all unbanked items, are lost. ${s.heir.name} will wake from torpor with ${s.heir.vitae - 1} vitae remaining.` : `${s.heir.name} has no vitae left. This is the True Death.`}</p>
          <Btn variant="primary" className="mt-4 w-full" onClick={() => fall(overlay.cause)}>{s.heir.vitae > 1 ? 'Sink into torpor' : 'Face the True Death'}</Btn>
        </Modal>
      )}
    </div>
  );
}

function RunSummary() {
  const { s } = useGame();
  const r = s.run!;
  const mats = Object.entries(r.materials);
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[['Crowns', r.gold, 'two-coins'], ['Slain', r.kills, 'skull-crossed-bones'], ['Fed', r.feeds, 'fangs'], ['Items', r.items.length, 'swap-bag']].map(([l, v, i]) => (
          <div key={l as string} className="rounded border border-gold/15 bg-black/40 p-2"><Icon name={i as string} size={18} color="#d4a84a" className="mx-auto" /><div className="font-display text-parch">{v}</div><div className="text-[0.65rem] text-mist">{l}</div></div>
        ))}
      </div>
      {r.items.length > 0 && <div className="flex flex-wrap gap-1">{r.items.map((it) => <span key={it.uid} className="chip" style={{ color: RARITY_COLOR[it.rarity] }}>{ITEM_BY_ID[it.templateId].name}</span>)}</div>}
      {mats.length > 0 && <div className="text-xs text-mist">{mats.map(([k, v]) => `${v}× ${k.replace(/-/g, ' ')}`).join(' · ')}</div>}
    </div>
  );
}

function Controls() {
  return (
    <details className="mt-4 text-xs text-mist">
      <summary className="cursor-pointer font-display text-gold">Controls</summary>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <span>Touch: left thumb</span><span>Move (virtual stick)</span>
        <span>Big button</span><span>Attack (hold; auto-aims)</span>
        <span>Ring of 4</span><span>Abilities (cost blood)</span>
        <span>Fangs</span><span>Feed on a weakened foe</span>
        <span>Form button</span><span>Transform</span>
        <span>Keyboard</span><span>WASD · click · Space · Q E R F · V · T · 1 2</span>
      </div>
      <p className="mt-2">Hunger drains blood over time. At zero blood you starve, then frenzy. Feed on foes below a quarter health (they show a blood drop). Avoid pools of sunlight.</p>
    </details>
  );
}
