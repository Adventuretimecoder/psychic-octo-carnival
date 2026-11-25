import { useState } from 'react';
import { BLOODLINE_BY_ID, ITEM_BY_ID, ITEMS, MATERIAL_BY_ID, MATERIALS } from '../../game/data';
import type { BloodType, RecipeDef } from '../../game/types';
import { AFFIXES, itemName, RARITY_COLOR } from '../../game/systems/loot';
import { canCraft, craft, craftGold, DISTILL, distill, experiment, haveInput, inputName, knownRecipes, researchable, study, studyCost } from '../../game/systems/crafting';
import { bank, bidAuction, buyPrice, LOAN_RATE, maxLoan, sellPrice, trade, VIAL_PRICE } from '../../game/systems/world';
import { expressedGenes } from '../../game/systems/genetics';
import { Btn, Empty, Icon, ItemCard, Panel, Tabs } from '../components';
import { useGame } from '../store';

type Sub = 'craft' | 'experiment' | 'blood' | 'market' | 'bank' | 'auction';
const STATIONS: Array<{ id: RecipeDef['station']; name: string; icon: string }> = [
  { id: 'alchemy', name: 'Alchemy', icon: 'bubbling-flask' }, { id: 'forge', name: 'Forge', icon: 'anvil' }, { id: 'enchant', name: 'Enchanting', icon: 'magic-swirl' },
  { id: 'runes', name: 'Runes', icon: 'rune-stone' }, { id: 'restoration', name: 'Restoration', icon: 'crowned-skull' }, { id: 'bloodlab', name: 'Blood Lab', icon: 'chalice-drops' },
];

export function Alchemy() {
  const { s } = useGame();
  const [sub, setSub] = useState<Sub>('craft');
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-mist"><span>Research: <b className="text-purple-200">{s.research}</b></span><span>Materials: <b className="text-parch">{Object.values(s.materials).reduce((a, b) => a + Math.max(0, b), 0)}</b></span><span>Vials: <b className="text-ember">{Object.values(s.vials).reduce((a, b) => a + Math.max(0, b ?? 0), 0)}</b></span></div>
      <Tabs<Sub> value={sub} onChange={setSub} tabs={[
        { id: 'craft', label: 'Crafting', icon: 'anvil' }, { id: 'experiment', label: 'Experiment', icon: 'fizzing-flask' }, { id: 'blood', label: 'Blood Alchemy', icon: 'chalice-drops' },
        { id: 'market', label: 'Night Market', icon: 'shop' }, { id: 'bank', label: 'Bank', icon: 'bank' }, { id: 'auction', label: 'Auction', icon: 'gavel' },
      ]} />
      {sub === 'craft' && <Crafting />}
      {sub === 'experiment' && <Experiment />}
      {sub === 'blood' && <BloodAlchemy />}
      {sub === 'market' && <Market />}
      {sub === 'bank' && <Bank />}
      {sub === 'auction' && <Auction />}
    </div>
  );
}

function Crafting() {
  const { s, act } = useGame();
  const [station, setStation] = useState<RecipeDef['station']>('alchemy');
  const [target, setTarget] = useState<string>('');
  const [bl, setBl] = useState<string>('');
  const list = knownRecipes(s).filter((r) => r.station === station);
  const items = [...Object.values(s.heir.equipment).filter(Boolean), ...s.inventory] as NonNullable<(typeof s.inventory)[number]>[];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">{STATIONS.map((x) => <button key={x.id} onClick={() => setStation(x.id)} className={`flex items-center gap-1 rounded border px-2 py-1 text-xs ${station === x.id ? 'border-ember bg-blood/40' : 'border-gold/15 text-mist'}`}><Icon name={x.icon} size={14} />{x.name}</button>)}</div>
      {(station === 'enchant' || station === 'runes') && (
        <select className="w-full text-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">— Choose the item to enchant —</option>
          {items.map((i) => <option key={i.uid} value={i.uid}>{itemName(i)} [{i.affixes.length}/3]</option>)}
        </select>
      )}
      {station === 'bloodlab' && (
        <select className="w-full text-sm" value={bl} onChange={(e) => setBl(e.target.value)}>
          <option value="">— Strengthen which bloodline? (default: strongest) —</option>
          {s.heir.genome.map((g) => <option key={g.bloodline} value={g.bloodline}>{BLOODLINE_BY_ID[g.bloodline].name} ({Math.round(g.potency)})</option>)}
        </select>
      )}
      {list.map((r) => {
        const err = canCraft(s, r);
        const out = r.output.item ? ITEM_BY_ID[r.output.item] : null;
        return (
          <div key={r.id} className="ornate !p-3">
            <div className="flex items-center gap-2">
              {out ? <Icon name={out.icon} size={30} color={RARITY_COLOR[out.rarity]} /> : <Icon name="magic-swirl" size={30} color="#c8a0ff" />}
              <div className="min-w-0 flex-1"><div className="font-display text-sm text-parch">{r.name}{r.hidden && <span className="ml-1 text-purple-300">✦</span>}</div><div className="text-xs text-mist">{r.description}</div></div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {r.inputs.map((i) => <span key={i.id} className={`chip ${haveInput(s, i.id) >= i.count ? 'text-emerald-300' : 'text-red-300'}`}>{i.count}× {inputName(i.id)} ({haveInput(s, i.id)})</span>)}
              {r.gold > 0 && <span className={`chip ${s.gold >= craftGold(s, r) ? 'text-amber-200' : 'text-red-300'}`}>{craftGold(s, r)}♛</span>}
              {r.output.affix && <span className="chip text-purple-200">→ {AFFIXES[r.output.affix]?.name ?? r.output.affix}</span>}
              {r.output.potency && <span className="chip text-ember">→ +{r.output.potency} potency</span>}
              {r.output.purity && <span className="chip text-sky-200">→ +{r.output.purity} purity</span>}
            </div>
            <Btn small variant="primary" className="mt-2" disabled={!!err} title={err ?? ''} onClick={() => act((g) => craft(g, r.id, { target, bloodline: (bl || undefined) as never }))}>Craft</Btn>
          </div>
        );
      })}
      {!list.length && <Empty>No known recipes at this station.</Empty>}
      {researchable(s).length > 0 && (
        <Panel title="Forbidden Studies" icon="secret-book">
          <p className="mb-2 text-xs text-mist">Spend research to decode hidden recipes. Research grows each night, from libraries, dismantling and failed experiments.</p>
          {researchable(s).map((r) => <div key={r.id} className="flex items-center gap-2 border-b border-gold/10 py-1.5 text-sm"><span className="flex-1 text-mist">Sealed {r.station} formula</span><Btn small disabled={s.research < studyCost(s, r.id)} onClick={() => act((g) => study(g, r.id))}>Study ({studyCost(s, r.id)})</Btn></div>)}
        </Panel>
      )}
    </div>
  );
}

function Experiment() {
  const { s, act } = useGame();
  const [sel, setSel] = useState<string[]>([]);
  const have = MATERIALS.filter((m) => (s.materials[m.id] ?? 0) > 0);
  return (
    <Panel title="The Alembic" icon="fizzing-flask">
      <p className="mb-2 text-sm text-mist">Combine two or three materials. Their hidden essences may reveal a forgotten recipe; if not, you learn from the failure. Each experiment consumes one of each.</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {have.map((m) => (
          <button key={m.id} onClick={() => setSel(sel.includes(m.id) ? sel.filter((x) => x !== m.id) : sel.length < 3 ? [...sel, m.id] : sel)} className={`flex items-center gap-1.5 rounded border p-1.5 text-left text-xs ${sel.includes(m.id) ? 'border-ember bg-blood/40' : 'border-gold/15 bg-black/30'}`}>
            <Icon name={m.icon} size={20} color={RARITY_COLOR[m.rarity]} /><span className="min-w-0 flex-1 truncate">{m.name}</span><span className="text-mist">{s.materials[m.id]}</span>
          </button>
        ))}
      </div>
      {!have.length && <Empty>You have no materials. Hunt, break urns and coffins, or buy at the Night Market.</Empty>}
      {sel.length > 0 && <div className="mt-2 text-xs text-mist">Essences: {[...new Set(sel.flatMap((m) => MATERIAL_BY_ID[m].essence))].join(', ')}</div>}
      <Btn variant="primary" className="mt-3 w-full" disabled={sel.length < 2} onClick={() => { act((g) => experiment(g, sel)); setSel([]); }}>Combine</Btn>
    </Panel>
  );
}

function BloodAlchemy() {
  const { s, act } = useGame();
  const ex = expressedGenes(s.heir.genome);
  return (
    <div className="space-y-3">
      <Panel title="Distillation" icon="round-bottom-flask">
        <div className="space-y-1.5">
          {DISTILL.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{d.n}× {d.from}{d.extra && ` + ${inputName(d.extra)}`} → 1× <b className="text-ember">{d.to}</b> <span className="text-xs text-mist">({d.gold}♛)</span></span>
              <Btn small onClick={() => act((g) => distill(g, i))}>Distil</Btn>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Your Blood" icon="droplets">
        <div className="text-sm">Purity <b className="text-sky-200">{Math.round(s.heir.purity)}</b> · Corruption <b className="text-purple-300">{Math.round(s.heir.corruption)}</b></div>
        <p className="mt-1 text-xs text-mist">High purity enlarges your blood pool and feeding; it is required for Apotheosis and some rank trials. Royal, ancient and primordial blood purify; corrupted blood taints — but corruption strengthens blood damage.</p>
        <div className="mt-2 text-xs text-mist">Resonant blood for your expressed lines: {ex.map((g) => `${BLOODLINE_BY_ID[g.bloodline].name}: ${BLOODLINE_BY_ID[g.bloodline].resonance.join('/')}`).join(' · ')}</div>
      </Panel>
    </div>
  );
}

function Market() {
  const { s, act } = useGame();
  const [qty, setQty] = useState(1);
  const goods = [
    ...(['common', 'beast', 'noble', 'magical', 'ancient', 'royal', 'holy', 'spectral', 'corrupted'] as BloodType[]).map((t) => ({ id: `blood:${t}`, name: `${t[0].toUpperCase()}${t.slice(1)} blood`, icon: 'drop', color: '#ff3050', have: s.vials[t] ?? 0, base: VIAL_PRICE[t] })),
    ...ITEMS.filter((i) => i.category === 'consumable' && i.rarity !== 'legendary' && i.rarity !== 'mythical').map((i) => ({ id: i.id, name: i.name, icon: i.icon, color: RARITY_COLOR[i.rarity], have: s.consumables[i.id] ?? 0, base: i.value })),
    ...MATERIALS.filter((m) => ['common', 'uncommon', 'rare', 'epic'].includes(m.rarity)).map((m) => ({ id: m.id, name: m.name, icon: m.icon, color: RARITY_COLOR[m.rarity], have: s.materials[m.id] ?? 0, base: m.value })),
  ];
  return (
    <Panel title="The Night Market of Vel'Sanguis" icon="shop" right={<select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="!py-0.5 text-xs">{[1, 5, 10].map((n) => <option key={n} value={n}>×{n}</option>)}</select>}>
      <p className="mb-2 text-xs text-mist">Prices respond to supply: selling floods the market, buying drains it. World events shift prices. Charisma and Night Markets in your domains improve your terms.</p>
      <div className="space-y-1">
        {goods.map((g) => {
          const b = buyPrice(s, g.id), sl = sellPrice(s, g.id);
          const trend = (s.market[g.id] ?? 1);
          return (
            <div key={g.id} className="flex items-center gap-2 border-b border-gold/5 py-1 text-sm">
              <Icon name={g.icon} size={18} color={g.color} />
              <span className="min-w-0 flex-1 truncate">{g.name} <span className="text-xs text-mist">({g.have})</span></span>
              <span className={`text-xs ${trend > 1.1 ? 'text-red-300' : trend < 0.9 ? 'text-emerald-300' : 'text-mist'}`}>{trend > 1.1 ? '▲' : trend < 0.9 ? '▼' : '•'}</span>
              <Btn small onClick={() => act((st) => trade(st, g.id, qty))} disabled={s.gold < b * qty}>Buy {b * qty}</Btn>
              <Btn small variant="ghost" onClick={() => act((st) => trade(st, g.id, -qty))} disabled={g.have < qty}>Sell {sl * qty}</Btn>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Bank() {
  const { s, act } = useGame();
  const [amt, setAmt] = useState(100);
  return (
    <Panel title="The Ormund Counting-House" icon="bank">
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded bg-black/40 p-2"><div className="text-xs text-mist">Purse</div><div className="font-display text-amber-200">{s.gold}</div></div>
        <div className="rounded bg-black/40 p-2"><div className="text-xs text-mist">Vault (+1.5%/night)</div><div className="font-display text-emerald-200">{s.bank.deposit}</div></div>
        <div className="rounded bg-black/40 p-2"><div className="text-xs text-mist">Debt (+{LOAN_RATE * 100}%/night)</div><div className="font-display text-red-300">{s.bank.loan}</div></div>
      </div>
      <p className="mt-2 text-xs text-mist">Crowns in the vault are never lost on death. House Ormund lends up to {maxLoan(s)} crowns; leave debts unpaid too long and Ormund's regard sours.</p>
      <input type="number" className="mt-3 w-full" value={amt} min={1} onChange={(e) => setAmt(Number(e.target.value))} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Btn onClick={() => act((g) => bank(g, 'deposit', amt))}>Deposit</Btn><Btn onClick={() => act((g) => bank(g, 'withdraw', amt))}>Withdraw</Btn>
        <Btn onClick={() => act((g) => bank(g, 'borrow', amt))}>Borrow</Btn><Btn onClick={() => act((g) => bank(g, 'repay', amt))}>Repay</Btn>
      </div>
    </Panel>
  );
}

function Auction() {
  const { s, act } = useGame();
  return (
    <Panel title="The Midnight Auction" icon="gavel">
      <p className="mb-2 text-xs text-mist">Rare pieces from the cellars of the great houses. Bids close when the night ends; rival houses bid too.</p>
      {!s.auction.length && <Empty>The auctioneer has nothing tonight. Lots arrive with the next night.</Empty>}
      <div className="space-y-2">
        {s.auction.map((lot, i) => (
          <ItemCard key={lot.item.uid} inst={lot.item} actions={<>
            <span className="text-xs text-mist">Reserve ~{lot.reserve}♛ · your bid: {lot.bid || '—'}</span>
            {[1, 1.2, 1.5].map((k) => <Btn key={k} small onClick={() => act((g) => bidAuction(g, i, Math.round(Math.max(lot.reserve * k, lot.bid + 10))))}>Bid {Math.round(Math.max(lot.reserve * k, lot.bid + 10))}</Btn>)}
          </>} />
        ))}
      </div>
    </Panel>
  );
}
