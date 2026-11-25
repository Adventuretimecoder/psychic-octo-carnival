import { useState } from 'react';
import { BLOODLINE_BY_ID, HOUSES } from '../../game/data';
import { FOUNDER_BLOODLINES, newGame } from '../../game/systems/progression';
import { availableQuests, acceptQuest } from '../../game/systems/quests';
import type { BloodlineId, HouseId } from '../../game/types';
import { Btn, Icon, Mods, Panel } from '../components';
import { useStore } from '../store';

const CRESTS = ['bat', 'crowned-skull', 'rose', 'raven', 'wolf-head', 'evil-moon', 'chalice-drops', 'castle', 'fangs', 'dripping-sword', 'tower-flag', 'snake', 'spider-web', 'candle-skull', 'heart-tower', 'dragon-head'];
const COLORS: Array<[string, string]> = [['#a3162e', '#d4a84a'], ['#4a1a6a', '#c0c0d0'], ['#0f3a2a', '#d4a84a'], ['#1a2a4a', '#b0d0ff'], ['#3a1a10', '#ff8a3a'], ['#2a2a2a', '#e0e0e0'], ['#5a0a3a', '#ffb0d0'], ['#2a1a0a', '#c8a060']];
const NAMES = ['Ravencourt', 'Morrowind', 'Blackmoor', 'Duskhallow', 'Vael', 'Corvain', 'Thornemere', 'Ashgrave', 'Nightingale', 'Valcrest'];
const MOTTOS = ['From ash, a crown.', 'We were last; we will be first.', 'Blood remembers.', 'Night is patient.', 'What is taken is kept.'];

export function Create() {
  const { setGame, go } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(NAMES[Math.floor(Math.random() * NAMES.length)]);
  const [motto, setMotto] = useState(MOTTOS[Math.floor(Math.random() * MOTTOS.length)]);
  const [founder, setFounder] = useState('Isolde');
  const [crest, setCrest] = useState(CRESTS[0]);
  const [colors, setColors] = useState<[string, string]>(COLORS[0]);
  const [patron, setPatron] = useState<HouseId>('veyrath');
  const [bloodline, setBloodline] = useState<BloodlineId>('shadow');

  const begin = () => {
    const slot = Number(localStorage.getItem('sanguinis-new-slot') ?? 0);
    const g = newGame({ dynastyName: name.trim() || 'Nameless', motto, colors, crest, patron, founderName: founder.trim() || 'Isolde', bloodline });
    for (const q of availableQuests(g).filter((q) => q.category === 'main')) acceptQuest(g, q.id);
    setGame(g, slot);
    go('haven');
  };

  const Crest = ({ size = 72 }: { size?: number }) => (
    <div className="relative grid place-items-center rounded-b-[45%] rounded-t-md border-2 shadow-lg" style={{ width: size, height: size * 1.15, background: `linear-gradient(160deg, ${colors[0]}, #0b0709)`, borderColor: colors[1] }}>
      <Icon name={crest} size={size * 0.62} color={colors[1]} />
    </div>
  );

  return (
    <div className="bg-haven h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="title-glow text-center font-display text-2xl tracking-[0.15em] text-parch">Found Your Dynasty</h1>
        <div className="mx-auto my-3 flex max-w-xs justify-between">
          {['Name', 'Heraldry', 'Patron', 'Blood', 'Oath'].map((l, i) => (
            <div key={l} className={`text-center font-display text-[0.65rem] tracking-wider ${i === step ? 'text-ember' : i < step ? 'text-gold' : 'text-mist/50'}`}>
              <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${i <= step ? 'bg-ember' : 'bg-mist/30'}`} />{l}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Panel title="The Name of Your House" icon="tied-scroll">
            <p className="mb-3 text-mist">The Night Council has granted a ruined keep — Blackmoor Haven — to a new and minor dynasty. Yours.</p>
            <label className="mb-1 block font-display text-xs text-gold">House</label>
            <input className="mb-3 w-full" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
            <label className="mb-1 block font-display text-xs text-gold">Motto</label>
            <input className="mb-3 w-full" value={motto} maxLength={60} onChange={(e) => setMotto(e.target.value)} />
            <label className="mb-1 block font-display text-xs text-gold">Founder</label>
            <input className="w-full" value={founder} maxLength={18} onChange={(e) => setFounder(e.target.value)} />
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Crest and Colours" icon="checked-shield">
            <div className="mb-4 flex items-center gap-4">
              <Crest />
              <div><div className="font-display text-xl text-parch">House {name}</div><div className="font-fell italic text-mist">“{motto}”</div></div>
            </div>
            <div className="mb-2 font-display text-xs text-gold">Crest</div>
            <div className="mb-4 grid grid-cols-8 gap-1.5">
              {CRESTS.map((c) => (
                <button key={c} onClick={() => setCrest(c)} className={`grid aspect-square place-items-center rounded border ${crest === c ? 'border-ember bg-blood/50' : 'border-gold/20 bg-black/40'}`}><Icon name={c} size={26} color={colors[1]} /></button>
              ))}
            </div>
            <div className="mb-2 font-display text-xs text-gold">Colours</div>
            <div className="grid grid-cols-8 gap-1.5">
              {COLORS.map((c, i) => (
                <button key={i} onClick={() => setColors(c)} className={`aspect-square rounded border-2 ${colors === c ? 'border-white' : 'border-transparent'}`} style={{ background: `linear-gradient(135deg, ${c[0]} 55%, ${c[1]} 55%)` }} aria-label={`Colours ${i + 1}`} />
              ))}
            </div>
          </Panel>
        )}

        {step === 2 && (
          <Panel title="Swear to a Patron House" icon="crown">
            <p className="mb-3 text-sm text-mist">Your founder was sired within a great house. The patron's passive, weakness and signature power pass to your founder, and its friends and rivals become yours.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {HOUSES.map((h) => (
                <button key={h.id} onClick={() => setPatron(h.id)} className={`rounded border p-2.5 text-left transition ${patron === h.id ? 'border-ember bg-blood/40' : 'border-gold/15 bg-black/30 hover:border-gold/40'}`}>
                  <div className="flex items-center gap-2">
                    <Icon name={h.crest} size={26} color={h.colors[1]} />
                    <div><div className="font-display text-sm text-parch">{h.name}</div><div className="text-xs text-mist">{h.title}</div></div>
                  </div>
                  {patron === h.id && (
                    <div className="mt-2 text-xs">
                      <p className="mb-1 italic text-mist">{h.specialty}. “{h.motto}”</p>
                      <div className="text-gold">Signature: {h.signature.name}</div>
                      <div className="text-mist">{h.signature.description}</div>
                      <div className="mt-1 text-gold">{h.passive.name}</div><Mods mods={h.passive.mods} className="!text-xs" />
                      <div className="mt-1 text-red-300/80">{h.weakness.name}</div><Mods mods={h.weakness.mods} className="!text-xs" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {step === 3 && (
          <Panel title="The Founder's Blood" icon="droplets">
            <p className="mb-3 text-sm text-mist">Every bloodline evolves through five stages, and your heirs will inherit it, mixed with the blood of whoever they marry. Rarer lines (Voidblood, Starblood, Primordial…) cannot be chosen; they must be bred, discovered or mutated.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FOUNDER_BLOODLINES.map((id) => {
                const b = BLOODLINE_BY_ID[id];
                return (
                  <button key={id} onClick={() => setBloodline(id)} className={`rounded border p-2.5 text-left ${bloodline === id ? 'border-ember bg-blood/40' : 'border-gold/15 bg-black/30'}`}>
                    <div className="flex items-center gap-2"><Icon name={b.icon} size={24} color={b.color} /><span className="font-display text-sm" style={{ color: b.color }}>{b.name}</span><span className="ml-auto chip text-mist capitalize">{b.rarity}</span></div>
                    <p className="mt-1 text-xs text-mist">{b.description}</p>
                    {bloodline === id && <div className="mt-1 text-xs text-red-300/80">Weakness: {b.weakness.text}</div>}
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {step === 4 && (
          <Panel title="The Oath of the Night" icon="chalice-drops">
            <div className="mb-4 flex justify-center"><Crest size={90} /></div>
            <div className="space-y-3 font-fell text-[1.05rem] leading-relaxed text-parch/90">
              <p>Eighteen hundred and forty-seven years after the Sundering, the Sovereign of the Crimson Throne sleeps a sleep that will not end, and a <em>Gilded Regent</em> rules in his name.</p>
              <p>The Red Star returns. Blood Moons come more often now. The old houses whisper the Augury of Ash: <em>“the heir of no house shall wake the Firstborn, and the Throne shall drink of new blood or drown in old.”</em></p>
              <p>{founder} of House {name}, sworn to {HOUSES.find((h) => h.id === patron)?.name}, carrying the {BLOODLINE_BY_ID[bloodline].name}, rides through the ruined gate of Blackmoor Haven.</p>
              <p className="text-center font-display text-gold not-italic">“{motto}”</p>
            </div>
          </Panel>
        )}

        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={() => (step === 0 ? go('title') : setStep(step - 1))}>Back</Btn>
          <div className="flex-1" />
          {step < 4 ? <Btn variant="primary" onClick={() => setStep(step + 1)}>Continue</Btn> : <Btn variant="primary" className="pulse-red" onClick={begin}>Enter Blackmoor Haven</Btn>}
        </div>
      </div>
    </div>
  );
}
