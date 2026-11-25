import { BLOODLINE_BY_ID, HOUSE_BY_ID, MUTATION_BY_ID, STAGE_NAMES } from '../../game/data';
import type { Heir } from '../../game/state';
import { isExpressed } from '../../game/systems/genetics';
import { generateProgeny, succeed } from '../../game/systems/progression';
import { PRIMARY_STATS } from '../../game/types';
import { Btn, Icon, Panel } from '../components';
import { useGame } from '../store';

export function GenomeView({ heir, compact }: { heir: Heir; compact?: boolean }) {
  return (
    <div className="space-y-1.5">
      {heir.genome.map((g) => {
        const b = BLOODLINE_BY_ID[g.bloodline];
        const ex = isExpressed(g);
        return (
          <div key={g.bloodline} className={`flex items-center gap-2 ${ex ? '' : 'opacity-60'}`}>
            <Icon name={b.icon} size={18} color={b.color} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span style={{ color: b.color }} className="font-display">{b.name}</span>
                <span className="chip text-mist capitalize">{g.expression}</span>
                {!compact && <span className="text-xs text-mist">{STAGE_NAMES[heir.stages[g.bloodline] ?? 0]}</span>}
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-black/60"><div className="h-full" style={{ width: `${g.potency}%`, background: b.color }} /></div>
            </div>
            <span className="w-8 text-right font-display text-xs text-parch">{Math.round(g.potency)}</span>
          </div>
        );
      })}
      {heir.mutations.map((m) => <div key={m} className="flex items-center gap-2 text-sm"><Icon name={MUTATION_BY_ID[m].icon} size={16} color={MUTATION_BY_ID[m].nature === 'bane' ? '#f87171' : MUTATION_BY_ID[m].nature === 'mixed' ? '#fbbf24' : '#6ee7b7'} /><span>{MUTATION_BY_ID[m].name}</span><span className="text-xs text-mist">— {MUTATION_BY_ID[m].description}</span></div>)}
    </div>
  );
}

export function Succession() {
  const { s, act, go } = useGame();
  if (!s.progeny.length) s.progeny = generateProgeny(s);
  const old = s.heir;
  return (
    <div className="bg-haven h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="title-glow text-center font-display text-2xl tracking-widest text-parch">The Line Continues</h1>
        <p className="mx-auto mt-2 max-w-xl text-center font-fell text-mist">{old.name} is gone. {old.spouse ? `Through the Rite of Commingling with ${old.spouse.name}, three heirs have woken.` : 'With no spouse, only a lesser Embrace was possible: weaker vessels, single-blooded.'} Choose who carries House {s.dynasty.name} forward.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {s.progeny.map((h, i) => (
            <Panel key={h.id} title={h.name} icon="vampire-dracula">
              <div className="text-xs text-mist">Child of {h.parents.join(' & ')}{h.maternalHouse && ` · ${HOUSE_BY_ID[h.maternalHouse].name}`}</div>
              {h.instability > 0 && <div className="mt-1 text-xs text-red-300">Genetic instability {h.instability}</div>}
              <div className="rule my-2" />
              <GenomeView heir={h} compact />
              <div className="rule my-2" />
              <div className="grid grid-cols-5 gap-1 text-center text-[0.65rem]">
                {PRIMARY_STATS.map((p) => <div key={p} className="rounded bg-black/40 py-0.5"><div className="text-mist uppercase">{p}</div><div className="font-display text-parch">{h.attributes[p]}</div></div>)}
              </div>
              {h.deeds.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-amber-200/80">{h.deeds.map((d, k) => <li key={k}>✦ {d}</li>)}</ul>}
              {Object.keys(h.mastery).length > 0 && <div className="mt-1 text-xs text-mist">Ancestral memory: {Object.keys(h.mastery).length} abilities partly mastered</div>}
              <Btn variant="primary" className="mt-3 w-full" onClick={() => { act((st) => succeed(st, i, old.alive ? 'entered the Long Sleep' : 'met the True Death')); go('haven'); }}>Choose {h.name}</Btn>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
