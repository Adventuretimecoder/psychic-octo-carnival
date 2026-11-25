import { useState } from 'react';
import { ACHIEVEMENTS } from '../../game/data/achievements';
import { CODEX, TIMELINE } from '../../game/data/lore';
import { BOSSES, CREATURES, HOUSE_BY_ID, MATERIAL_BY_ID } from '../../game/data';
import { RARITY_COLOR } from '../../game/systems/loot';
import { acceptQuest, availableQuests, objectiveTarget, QUEST_MAP } from '../../game/systems/quests';
import type { CodexEntry } from '../../game/types';
import { Btn, Empty, Icon, Modal, Panel, Tabs } from '../components';
import { useGame } from '../store';

type Sub = 'journal' | 'codex' | 'bestiary' | 'timeline' | 'feats';

export function Lore() {
  const [sub, setSub] = useState<Sub>('journal');
  return (
    <div>
      <Tabs<Sub> value={sub} onChange={setSub} tabs={[{ id: 'journal', label: 'Journal', icon: 'scroll-quill' }, { id: 'codex', label: 'Codex', icon: 'black-book' }, { id: 'bestiary', label: 'Bestiary', icon: 'wolf-head' }, { id: 'timeline', label: 'Timeline', icon: 'hourglass' }, { id: 'feats', label: 'Feats', icon: 'laurel-crown' }]} />
      {sub === 'journal' && <Journal />}
      {sub === 'codex' && <Codex />}
      {sub === 'bestiary' && <Bestiary />}
      {sub === 'timeline' && <Timeline />}
      {sub === 'feats' && <Feats />}
    </div>
  );
}

const CAT_COLOR: Record<string, string> = { main: '#ff3a55', house: '#d4a84a', bloodline: '#ff8090', political: '#c8a0ff', exploration: '#80d0ff', dungeon: '#ffa060', legendary: '#ffd040', hidden: '#b080ff', personal: '#80ffb0', repeatable: '#a89c90' };
const giverName = (g: string) => HOUSE_BY_ID[g]?.name ?? g.replace(/^\w/, (c) => c.toUpperCase());

function Journal() {
  const { s, act } = useGame();
  const avail = availableQuests(s);
  return (
    <div className="space-y-3">
      <Panel title="Active Quests" icon="scroll-quill">
        {!s.quests.length && <Empty>No quests in hand. Accept one below.</Empty>}
        <div className="space-y-2">
          {s.quests.map((qp) => {
            const q = QUEST_MAP[qp.id];
            if (!q) return null;
            return (
              <div key={qp.id} className={`rounded border p-2.5 ${qp.done ? 'border-emerald-400/50 bg-emerald-900/10' : 'border-gold/15 bg-black/30'}`}>
                <div className="flex items-center gap-2"><span className="chip capitalize" style={{ color: CAT_COLOR[q.category] }}>{q.category}</span><span className="font-display text-sm text-parch">{q.name}</span>{qp.done && <span className="ml-auto text-xs text-emerald-300">Ready — claim in the Haven</span>}</div>
                <p className="mt-1 text-xs text-mist">{q.summary}</p>
                <ul className="mt-1 space-y-0.5">{q.objectives.map((o, i) => <li key={i} className={`text-xs ${qp.progress[i] >= objectiveTarget(o) ? 'text-emerald-300 line-through' : 'text-parch/90'}`}>◆ {o.text} <span className="text-mist">({Math.min(qp.progress[i], objectiveTarget(o))}/{objectiveTarget(o)})</span></li>)}</ul>
                {q.choice && <div className="mt-1 text-[0.7rem] text-purple-200">A choice awaits at its end.</div>}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Offered" icon="tied-scroll">
        {!avail.length && <Empty>No one seeks your help tonight.</Empty>}
        <div className="space-y-2">
          {avail.map((q) => (
            <div key={q.id} className="rounded border border-gold/15 bg-black/30 p-2.5">
              <div className="flex items-center gap-2"><span className="chip capitalize" style={{ color: CAT_COLOR[q.category] }}>{q.category}</span><span className="font-display text-sm text-parch">{q.name}</span></div>
              <div className="text-[0.7rem] text-mist">From {giverName(q.giver)}</div>
              <p className="mt-1 text-xs text-mist">{q.summary}</p>
              <div className="mt-1 text-xs text-amber-200/80">Reward: {[q.reward.gold && `${q.reward.gold}♛`, q.reward.xp && `${q.reward.xp} xp`, q.reward.prestige && `${q.reward.prestige} prestige`, q.reward.title && `title “${q.reward.title}”`, ...(q.reward.materials ?? []).map((m) => `${m.count}× ${MATERIAL_BY_ID[m.id]?.name}`)].filter(Boolean).join(', ')}</div>
              <Btn small className="mt-2" onClick={() => act((g) => { acceptQuest(g, q.id); return `Quest accepted: ${q.name}.`; })}>Accept</Btn>
            </div>
          ))}
        </div>
      </Panel>
      <p className="text-center text-xs text-mist">{s.completedQuests.length} quests completed.</p>
    </div>
  );
}

function Codex() {
  const { s } = useGame();
  const [open, setOpen] = useState<CodexEntry | null>(null);
  const [cat, setCat] = useState<string>('all');
  const known = (c: CodexEntry) => !c.unlockedBy || s.codex.includes(c.id) || s.secrets.includes(c.unlockedBy) || (c.unlockedBy.startsWith('boss:') && (s.counters[c.unlockedBy] ?? 0) > 0);
  const cats = ['all', ...new Set(CODEX.map((c) => c.category))];
  const list = CODEX.filter((c) => cat === 'all' || c.category === cat);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`chip capitalize ${cat === c ? 'text-ember' : 'text-mist'}`}>{c}</button>)}</div>
      <p className="mb-2 text-xs text-mist">{CODEX.filter(known).length} of {CODEX.length} entries known. Sealed entries open as you uncover secrets and slay the ancient.</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {list.map((c) => known(c) ? (
          <button key={c.id} onClick={() => setOpen(c)} className="rounded border border-gold/15 bg-black/30 p-2.5 text-left hover:border-gold/50"><div className="text-[0.65rem] text-gold uppercase">{c.category}</div><div className="font-display text-sm text-parch">{c.title}</div></button>
        ) : (
          <div key={c.id} className="rounded border border-gold/5 bg-black/20 p-2.5 text-mist/50"><div className="text-[0.65rem] uppercase">{c.category}</div><div className="font-display text-sm">Sealed</div></div>
        ))}
      </div>
      {open && <Modal title={open.title} onClose={() => setOpen(null)}><div className="space-y-3 font-fell text-[1.05rem] leading-relaxed text-parch/90">{open.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div></Modal>}
    </div>
  );
}

function Bestiary() {
  const { s } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const seen = CREATURES.filter((c) => s.bestiary[c.id]);
  const c = open ? CREATURES.find((x) => x.id === open) : null;
  return (
    <div className="space-y-3">
      <p className="text-xs text-mist">{seen.length} of {CREATURES.length} creatures recorded. Slay a creature to record it.</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {CREATURES.map((x) => s.bestiary[x.id] ? (
          <button key={x.id} onClick={() => setOpen(x.id)} className="rounded border border-gold/15 bg-black/30 p-2 text-left"><div className="truncate font-display text-xs" style={{ color: RARITY_COLOR[x.rarity] }}>{x.name}</div><div className="text-[0.65rem] text-mist capitalize">{x.family} · slain {s.bestiary[x.id]}</div></button>
        ) : <div key={x.id} className="rounded border border-gold/5 bg-black/20 p-2 text-[0.7rem] text-mist/40">Unknown</div>)}
      </div>
      <Panel title="Lords of Eryndor" icon="crowned-skull">
        <div className="space-y-2">
          {BOSSES.map((b) => {
            const k = s.counters[`boss:${b.id}`] ?? 0;
            return <div key={b.id} className="border-b border-gold/10 pb-2 text-sm"><div className="flex items-center gap-2"><span className={`font-display ${k ? 'text-parch' : 'text-mist/60'}`}>{k ? b.name : '???'}</span>{b.legendary && <span className="chip text-amber-300">legendary</span>}{k > 0 && <span className="ml-auto text-xs text-emerald-300">slain ×{k}</span>}</div>{k > 0 && <><div className="text-xs text-gold">{b.title}</div><p className="text-xs text-mist">{b.lore}</p></>}</div>;
          })}
        </div>
      </Panel>
      {c && (
        <Modal title={c.name} onClose={() => setOpen(null)}>
          <div className="text-xs capitalize text-gold">{c.family} · {c.behavior} · {c.rarity} · threat {c.difficulty}/5</div>
          <p className="mt-2 text-sm italic text-mist">{c.appearance}</p>
          <p className="mt-2 text-parch/90">{c.lore}</p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            <div><span className="text-mist">Habitat:</span> {c.habitat}</div><div><span className="text-mist">Blood:</span> {c.blood}</div>
            <div><span className="text-emerald-300">Weak to:</span> {c.weak.join(', ') || '—'}</div><div><span className="text-red-300">Resists:</span> {c.resist.join(', ') || '—'}</div>
            <div className="col-span-2"><span className="text-mist">Abilities:</span> {c.abilities.join(', ')}</div>
            <div className="col-span-2"><span className="text-mist">Drops:</span> {c.drops.map((d) => MATERIAL_BY_ID[d.id]?.name).join(', ')}</div>
            {c.special && <div className="col-span-2 text-amber-200">{c.special}</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Timeline() {
  return (
    <Panel title="The Long Night of Eryndor" icon="hourglass">
      <ol className="relative space-y-3 border-l border-gold/30 pl-4">
        {TIMELINE.map((t, i) => (
          <li key={i} className="relative">
            <span className="absolute top-1.5 -left-[1.33rem] h-2.5 w-2.5 rounded-full border border-gold bg-blood" />
            <div className="font-display text-xs text-gold">{t.year < 0 ? `${-t.year} B.S.` : `${t.year} A.S.`} · <span className="text-mist">{t.era}</span></div>
            <div className="font-display text-sm text-parch">{t.title}</div>
            <p className="text-sm text-mist">{t.text}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Feats() {
  const { s } = useGame();
  const cats = [...new Set(ACHIEVEMENTS.map((a) => a.category))];
  return (
    <div className="space-y-3">
      <Panel title="Titles" icon="laurel-crown">
        <div className="flex flex-wrap gap-1.5">{s.heir.titles.length ? s.heir.titles.map((t) => <span key={t} className="chip text-gold">{t}</span>) : <span className="text-sm italic text-mist">No titles yet.</span>}</div>
      </Panel>
      {cats.map((cat) => (
        <Panel key={cat} title={cat} icon="trophy">
          <div className="space-y-1.5">
            {ACHIEVEMENTS.filter((a) => a.category === cat).map((a) => {
              const done = s.achievements.includes(a.id);
              if (a.hidden && !done) return <div key={a.id} className="text-xs italic text-mist/50">A hidden feat…</div>;
              const prog = Math.min(a.target, s.counters[a.counter] ?? 0);
              return (
                <div key={a.id} className={`flex items-center gap-2 text-sm ${done ? '' : 'opacity-75'}`}>
                  <Icon name={done ? 'laurel-crown' : 'circle'} size={16} color={done ? '#ffd040' : '#555'} />
                  <div className="min-w-0 flex-1"><div className={done ? 'text-amber-200' : 'text-parch'}>{a.name}{a.title && <span className="ml-1 text-xs text-gold">· “{a.title}”</span>}</div><div className="text-xs text-mist">{a.description}</div></div>
                  <span className="text-xs text-mist">{done ? '✓' : `${prog}/${a.target}`}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}
