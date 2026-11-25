import { useState } from 'react';
import { NPCS, type NpcDef } from '../../game/data/npcs';
import { ITEM_BY_ID, MATERIAL_BY_ID, RANKS } from '../../game/data';
import { audio } from '../../game/engine/audio';
import type { GameState } from '../../game/state';
import { nextRank, rankDef, trialMet } from '../../game/systems/progression';
import { QUEST_MAP, chooseOption, completeQuest, refreshQuestProgress } from '../../game/systems/quests';
import { computeStats } from '../../game/systems/stats';
import { EVENT_BY_ID } from '../../game/systems/worldHooks';
import { advanceNight } from '../../game/systems/world';
import type { QuestDef } from '../../game/types';
import { Bar, Btn, Icon, Modal, Panel } from '../components';
import { useGame } from '../store';
import { Alchemy } from './Alchemy';
import { Court } from './Court';
import { HeirScreen } from './Heir';
import { Lore } from './Lore';
import { Settings } from './Settings';
import { WorldMap } from './WorldMap';

type Tab = 'haven' | 'heir' | 'hunt' | 'court' | 'lore';

export function Haven() {
  const { s } = useGame();
  const [tab, setTab] = useState<Tab>('haven');
  const [settings, setSettings] = useState(false);
  const readyQuests = s.quests.filter((q) => q.done).length;
  const nav: Array<{ id: Tab; label: string; icon: string; badge?: number }> = [
    { id: 'haven', label: 'Haven', icon: 'castle', badge: readyQuests },
    { id: 'heir', label: 'Heir', icon: 'vampire-dracula', badge: s.heir.skillPoints + s.heir.attributePoints },
    { id: 'hunt', label: 'Hunt', icon: 'fangs' },
    { id: 'court', label: 'Court', icon: 'crown', badge: s.courtActions },
    { id: 'lore', label: 'Lore', icon: 'black-book' },
  ];
  return (
    <div className="bg-haven flex h-full flex-col">
      <TopBar onSettings={() => setSettings(true)} />
      <main className="flex-1 overflow-y-auto px-3 pt-3 pb-24">
        <div className="mx-auto max-w-3xl">
          {tab === 'haven' && <Overview go={setTab} />}
          {tab === 'heir' && <HeirScreen />}
          {tab === 'hunt' && <WorldMap />}
          {tab === 'court' && <Court />}
          {tab === 'lore' && <Lore />}
        </div>
      </main>
      <nav className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-gold/25 bg-[#0d0709]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end justify-around px-1 pt-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => { audio.init(); audio.play('ui'); setTab(n.id); }} className={`relative flex flex-1 flex-col items-center py-1 font-display text-[0.62rem] tracking-wider ${tab === n.id ? 'text-ember' : 'text-mist'}`}>
              {n.id === 'hunt' ? (
                <div className={`-mt-6 mb-0.5 grid h-14 w-14 place-items-center rounded-full border-2 ${tab === 'hunt' ? 'border-gold bg-crimson' : 'border-gold/60 bg-blood'} pulse-red`}><Icon name={n.icon} size={30} color="#fff1e0" /></div>
              ) : <Icon name={n.icon} size={24} color={tab === n.id ? '#ff3a55' : '#a89c90'} />}
              {n.label}
              {!!n.badge && <span className="absolute top-0 right-[22%] rounded-full bg-ember px-1.5 text-[0.55rem] text-white">{n.badge}</span>}
            </button>
          ))}
        </div>
      </nav>
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}

function Crest({ s, size = 34 }: { s: GameState; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-b-[45%] rounded-t-sm border" style={{ width: size, height: size * 1.15, background: `linear-gradient(160deg, ${s.dynasty.colors[0]}, #0b0709)`, borderColor: s.dynasty.colors[1] }}>
      <Icon name={s.dynasty.crest} size={size * 0.62} color={s.dynasty.colors[1]} />
    </div>
  );
}

function TopBar({ onSettings }: { onSettings: () => void }) {
  const { s } = useGame();
  return (
    <header className="safe-t sticky top-0 z-30 border-b border-gold/20 bg-[#0d0709]/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-3 py-2">
        <Crest s={s} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm tracking-wider text-parch">House {s.dynasty.name}</div>
          <div className="truncate text-xs text-mist">Night {s.night} · {s.heir.name}, {rankDef(s.heir.rank).name}</div>
        </div>
        <div className="flex items-center gap-1 font-display text-sm text-amber-200"><Icon name="two-coins" size={16} color="#ffd050" />{s.gold.toLocaleString()}</div>
        <div className="flex items-center gap-1 font-display text-sm text-purple-200"><Icon name="laurel-crown" size={16} color="#c8a0ff" />{s.dynasty.prestige}</div>
        <button onClick={onSettings} aria-label="Settings" className="p-1 text-mist hover:text-parch"><Icon name="cog" size={20} /></button>
      </div>
      {s.events.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-ember/20 bg-blood/30 px-3 py-1 text-xs">
          {s.events.map((e) => { const d = EVENT_BY_ID[e.id]; return d && <span key={e.id} className="flex shrink-0 items-center gap-1" style={{ color: d.color }}><Icon name={d.icon} size={14} color={d.color} />{d.name} ({e.nightsLeft}n)</span>; })}
        </div>
      )}
    </header>
  );
}

function Overview({ go }: { go: (t: Tab) => void }) {
  const { s, act } = useGame();
  const [npc, setNpc] = useState<NpcDef | null>(null);
  const [choice, setChoice] = useState<QuestDef['choice'] | null>(null);
  const [sub, setSub] = useState<'hall' | 'alchemy'>('hall');
  const st = computeStats(s);
  const nr = nextRank(s.heir);
  refreshQuestProgress(s);
  const ready = s.quests.filter((q) => q.done);

  if (sub === 'alchemy') return <div><Btn small variant="ghost" className="mb-2" onClick={() => setSub('hall')}>← The Great Hall</Btn><Alchemy /></div>;

  return (
    <div className="space-y-3">
      <Panel title={`${s.heir.name}${s.heir.titles.length ? `, ${s.heir.titles[s.heir.titles.length - 1]}` : ''}`} icon="vampire-dracula" right={<span className="chip text-gold">Gen {s.heir.generation}</span>}>
        <div className="grid grid-cols-2 gap-3">
          <Bar value={st.maxHp} max={st.maxHp} label={<><span>Health</span><span>{st.maxHp}</span></>} />
          <Bar value={st.maxBlood} max={st.maxBlood} color="#7a0a1c" label={<><span>Blood</span><span>{st.maxBlood}</span></>} />
        </div>
        <div className="mt-3">
          <Bar value={s.heir.xp - rankDef(s.heir.rank).xp} max={(nr?.xp ?? s.heir.xp + 1) - rankDef(s.heir.rank).xp} color="#d4a84a" label={<><span>{rankDef(s.heir.rank).name}</span><span>{nr ? `${s.heir.xp} / ${nr.xp} → ${nr.name}` : 'Apex'}</span></>} />
          {nr && s.heir.xp >= nr.xp && !trialMet(s, nr.rank) && <p className="mt-1 text-xs text-amber-300">Trial to ascend: {nr.trial}</p>}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-mist">
          <span>Vitae:</span>{Array.from({ length: 3 }, (_, i) => <Icon key={i} name="heart-drop" size={16} color={i < s.heir.vitae ? '#ff2040' : '#3a2a2e'} />)}
          {s.heir.spouse && <span className="ml-auto">Wed to {s.heir.spouse.name}</span>}
        </div>
      </Panel>

      {ready.length > 0 && (
        <Panel title="Deeds Awaiting Reward" icon="scroll-quill" className="pulse-red">
          {ready.map((qp) => {
            const q = QUEST_MAP[qp.id];
            return (
              <div key={qp.id} className="flex items-center gap-2 border-b border-gold/10 py-2 last:border-0">
                <div className="flex-1"><div className="font-display text-sm text-parch">{q.name}</div><div className="text-xs text-mist capitalize">{q.category} quest</div></div>
                <Btn small variant="primary" onClick={() => act((g) => { const r = completeQuest(g, qp.id); if (r.choice) setChoice(r.choice); audio.play('levelup'); return r.log; })}>Claim</Btn>
              </div>
            );
          })}
        </Panel>
      )}

      <Panel title="The Household" icon="hooded-figure">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {NPCS.map((n) => {
            const rel = s.npcs[n.id] ?? 0;
            const tier = [...n.tiers].reverse().find((t) => rel >= t.min) ?? n.tiers[0];
            const fresh = n.lines.some((l) => !s.heardLines.includes(`${n.id}:${l.id}`) && lineOk(s, l.requires));
            return (
              <button key={n.id} onClick={() => setNpc(n)} className="relative rounded border border-gold/15 bg-black/30 p-2 text-center hover:border-gold/50">
                <Icon name={n.icon} size={30} color={n.color} className="mx-auto" />
                <div className="mt-1 truncate font-display text-[0.65rem] text-parch">{n.name.split(' ')[0]}</div>
                <div className="truncate text-[0.6rem] text-mist">{tier.title}</div>
                {fresh && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-ember" />}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        <Btn onClick={() => setSub('alchemy')} className="flex items-center justify-center gap-2"><Icon name="bubbling-flask" size={18} /> Laboratory & Market</Btn>
        <Btn onClick={() => go('hunt')} variant="primary" className="flex items-center justify-center gap-2"><Icon name="fangs" size={18} /> Go Hunting</Btn>
        <Btn variant="ghost" className="col-span-2" onClick={() => { if (confirm('Rest until the next night? Your domains yield income and the world moves on.')) act((g) => advanceNight(g)); }}>Rest until the next night</Btn>
      </div>

      <Panel title="Chronicle of the Night" icon="tied-scroll">
        {s.chronicle.length ? <ul className="space-y-1 text-sm text-mist">{s.chronicle.slice(0, 8).map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="text-sm italic text-mist">The night is young. Nothing of note has happened… yet.</p>}
      </Panel>

      {npc && <NpcDialog npc={npc} onClose={() => setNpc(null)} />}
      {choice && (
        <Modal title="A Choice Must Be Made">
          <p className="mb-3 font-fell text-parch">{choice.prompt}</p>
          <div className="space-y-2">
            {choice.options.map((o, i) => <Btn key={i} className="w-full text-left" onClick={() => { act((g) => chooseOption(g, o)); setChoice(null); }}>{o.text}</Btn>)}
          </div>
        </Modal>
      )}
    </div>
  );
}

function lineOk(s: GameState, r?: NpcDef['lines'][number]['requires'], npcId?: string) {
  if (!r) return true;
  if (r.flags?.some((f) => !s.flags.includes(f))) return false;
  if (r.quest && !s.completedQuests.includes(r.quest)) return false;
  if (r.rank && s.heir.rank < r.rank) return false;
  if (r.minRelation !== undefined && npcId && (s.npcs[npcId] ?? 0) < r.minRelation) return false;
  return true;
}

function NpcDialog({ npc, onClose }: { npc: NpcDef; onClose: () => void }) {
  const { s, act } = useGame();
  const rel = s.npcs[npc.id] ?? 0;
  const tier = [...npc.tiers].reverse().find((t) => rel >= t.min) ?? npc.tiers[0];
  const [greet] = useState(() => tier.greeting[Math.floor(Math.random() * tier.greeting.length)]);
  const lines = npc.lines.filter((l) => lineOk(s, l.requires, npc.id));
  const fresh = lines.filter((l) => !s.heardLines.includes(`${npc.id}:${l.id}`));
  const [shown, setShown] = useState<string | null>(null);
  const giftable = [...npc.likes, ...Object.keys(s.materials).filter((k) => (s.materials[k] ?? 0) > 0)].filter((v, i, a) => a.indexOf(v) === i).filter((id) => (s.materials[id] ?? 0) + (s.consumables[id] ?? 0) > 0).slice(0, 6);
  return (
    <Modal title={npc.name} onClose={onClose}>
      <div className="flex gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded border border-gold/30 bg-black/50"><Icon name={npc.icon} size={44} color={npc.color} /></div>
        <div className="text-sm"><div className="text-gold">{npc.role}</div><div className="text-mist">{tier.title} · Regard {Math.round(rel)}</div><div className="mt-1 text-xs italic text-mist">{npc.personality}</div></div>
      </div>
      <p className="mt-3 font-fell text-[1.05rem] text-parch">“{shown ?? greet}”</p>
      <div className="mt-3 space-y-1.5">
        {fresh.slice(0, 4).map((l) => (
          <button key={l.id} className="block w-full rounded border border-gold/20 bg-black/30 px-3 py-2 text-left text-sm text-parch hover:border-gold/60" onClick={() => {
            act((g) => { g.heardLines.push(`${npc.id}:${l.id}`); if (l.flag && !g.flags.includes(l.flag)) g.flags.push(l.flag); g.npcs[npc.id] = Math.max(-100, Math.min(100, (g.npcs[npc.id] ?? 0) + (l.relation ?? 2))); });
            setShown(l.text);
          }}>▸ {l.text.length > 70 ? l.text.slice(0, 68) + '…' : l.text}</button>
        ))}
        {!fresh.length && <p className="text-xs italic text-mist">They have nothing new to say tonight.</p>}
      </div>
      <div className="rule my-3" />
      <div className="text-xs text-mist">Likes: {npc.likes.map((l) => MATERIAL_BY_ID[l]?.name ?? ITEM_BY_ID[l]?.name ?? l).join(', ')}</div>
      {giftable.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {giftable.map((id) => (
            <Btn key={id} small onClick={() => act((g) => {
              if ((g.materials[id] ?? 0) > 0) g.materials[id]!--; else g.consumables[id]!--;
              const gain = npc.likes.includes(id) ? 12 : 3;
              g.npcs[npc.id] = Math.min(100, (g.npcs[npc.id] ?? 0) + gain);
              return `${npc.name} ${gain > 5 ? 'is delighted by' : 'accepts'} the gift. (+${gain} regard)`;
            })}>Give {MATERIAL_BY_ID[id]?.name ?? ITEM_BY_ID[id]?.name}</Btn>
          ))}
        </div>
      )}
      <div className={`mt-3 rounded border p-2 text-xs ${rel >= npc.perk.minRelation ? 'border-emerald-400/40 text-emerald-200' : 'border-gold/15 text-mist'}`}><b>{npc.perk.name}</b> ({rel >= npc.perk.minRelation ? 'active' : `at ${npc.perk.minRelation} regard`}): {npc.perk.description}</div>
      <p className="mt-2 text-[0.7rem] text-mist/70">{RANKS.length && npc.backstory}</p>
    </Modal>
  );
}
