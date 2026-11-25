/** Shared UI primitives in the gothic style. */
import { type ReactNode, useEffect } from 'react';
import { ICON_PATHS } from '../assets/icons.generated';
import { ITEM_BY_ID } from '../game/data';
import type { ItemInstance } from '../game/state';
import { itemModifiers, itemName, RARITY_COLOR, weaponDamage } from '../game/systems/loot';
import type { Modifier, Rarity } from '../game/types';
import { audio } from '../game/engine/audio';

export function Icon({ name, size = 22, color = 'currentColor', className = '', title }: { name?: string; size?: number; color?: string; className?: string; title?: string }) {
  const d = name ? ICON_PATHS[name] : undefined;
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden={!title} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {d ? <path d={d} fill={color} /> : <circle cx="256" cy="256" r="180" fill={color} opacity="0.5" />}
    </svg>
  );
}

export function Panel({ children, className = '', title, icon, right }: { children: ReactNode; className?: string; title?: ReactNode; icon?: string; right?: ReactNode }) {
  return (
    <section className={`ornate p-4 fade-in ${className}`}>
      {title && (
        <header className="mb-3 flex items-center gap-2">
          {icon && <Icon name={icon} size={20} color="#d4a84a" />}
          <h2 className="font-display text-[0.95rem] tracking-wider text-gold uppercase">{title}</h2>
          <div className="ml-auto">{right}</div>
        </header>
      )}
      {children}
    </section>
  );
}

export function Btn({ children, onClick, disabled, variant = 'default', className = '', title, small }: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'default' | 'primary' | 'ghost'; className?: string; title?: string; small?: boolean }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={() => { audio.init(); audio.play('ui'); onClick?.(); }}
      className={`btn ${variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : ''} ${small ? '!px-2.5 !py-1 text-xs' : 'text-sm'} ${className}`}
    >
      {children}
    </button>
  );
}

export function Bar({ value, max, color = '#b0102a', label, height = 8 }: { value: number; max: number; color?: string; label?: ReactNode; height?: number }) {
  const k = Math.max(0, Math.min(1, value / (max || 1)));
  return (
    <div>
      {label && <div className="mb-0.5 flex justify-between text-xs text-mist">{label}</div>}
      <div className="overflow-hidden rounded-sm bg-black/60 ring-1 ring-gold/15" style={{ height }}>
        <div className="h-full transition-all duration-500" style={{ width: `${k * 100}%`, background: `linear-gradient(90deg, ${color}aa, ${color})` }} />
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ id: T; label: string; icon?: string; badge?: number }>; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => { audio.play('ui'); onChange(t.id); }}
          className={`relative flex shrink-0 items-center gap-1.5 rounded border px-3 py-1.5 font-display text-xs tracking-wider transition ${value === t.id ? 'border-gold/70 bg-blood/60 text-parch' : 'border-gold/15 bg-black/30 text-mist hover:text-parch'}`}
        >
          {t.icon && <Icon name={t.icon} size={14} />}
          {t.label}
          {!!t.badge && <span className="ml-1 rounded-full bg-ember px-1.5 text-[0.6rem] text-white">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ children, onClose, title, wide }: { children: ReactNode; onClose?: () => void; title?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className={`ornate fade-in max-h-[88vh] w-full overflow-y-auto p-5 ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="mb-3 font-display text-lg tracking-wider text-gold">{title}</h2>}
        {children}
        {onClose && <button className="absolute top-3 right-3 text-mist hover:text-parch" onClick={onClose} aria-label="Close">✕</button>}
      </div>
    </div>
  );
}

export const Rare = ({ r, children }: { r: Rarity; children: ReactNode }) => <span style={{ color: RARITY_COLOR[r] }}>{children}</span>;

const STAT_LABEL: Record<string, string> = {
  str: 'Strength', agi: 'Agility', int: 'Intelligence', end: 'Endurance', wil: 'Willpower', per: 'Perception', aff: 'Blood Affinity', mag: 'Magical Power', rgn: 'Regeneration', cha: 'Charisma',
  maxHp: 'Max HP', maxBlood: 'Max Blood', hpRegen: 'HP Regen', physDmg: 'Physical Damage', spellDmg: 'Spell Damage', bloodDmg: 'Blood Damage', attackSpeed: 'Attack Speed', moveSpeed: 'Move Speed',
  critChance: 'Crit Chance', critMult: 'Crit Damage', armor: 'Armor', lifesteal: 'Lifesteal', cooldownRate: 'Cooldown Speed', costMult: 'Blood Costs', hungerRate: 'Hunger', feedPower: 'Feeding Power',
  stealth: 'Stealth', statusPower: 'Status Power', statusResist: 'Status Resist', influence: 'Influence', research: 'Research', goldFind: 'Crown Find', lootLuck: 'Loot Luck', sunResist: 'Sun Resistance',
};
export const statLabel = (k: string) => STAT_LABEL[k] ?? (k.startsWith('res_') ? `${k.slice(4)[0].toUpperCase()}${k.slice(5)} Resist` : k);
const PCT = new Set(['critChance', 'lifesteal', 'stealth', 'statusResist', 'sunResist']);

export function modText(m: Modifier): string {
  const parts: string[] = [];
  if (m.add) parts.push(PCT.has(m.stat) || m.stat.startsWith('res_') ? `${m.add > 0 ? '+' : ''}${Math.round(m.add * 100)}%` : `${m.add > 0 ? '+' : ''}${+m.add.toFixed(1)}`);
  if (m.mul) parts.push(`${m.mul > 0 ? '+' : ''}${Math.round(m.mul * 100)}%`);
  return `${parts.join(' ')} ${statLabel(m.stat)}`;
}

export function Mods({ mods, className = '' }: { mods: Modifier[]; className?: string }) {
  return (
    <ul className={`space-y-0.5 text-sm ${className}`}>
      {mods.map((m, i) => {
        const neg = (m.add ?? 0) < 0 || (m.mul ?? 0) < 0;
        const inverted = m.stat === 'hungerRate' || m.stat === 'costMult';
        const bad = inverted ? !neg : neg;
        return <li key={i} className={bad ? 'text-red-300/80' : 'text-emerald-200/85'}>{modText(m)}</li>;
      })}
    </ul>
  );
}

export function ItemCard({ inst, actions, compact }: { inst: ItemInstance; actions?: ReactNode; compact?: boolean }) {
  const t = ITEM_BY_ID[inst.templateId];
  if (!t) return null;
  return (
    <div className="rounded border bg-black/40 p-2.5" style={{ borderColor: RARITY_COLOR[inst.rarity] + '55' }}>
      <div className="flex items-start gap-2.5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded border bg-black/60" style={{ borderColor: RARITY_COLOR[inst.rarity] + '88', boxShadow: `0 0 12px ${RARITY_COLOR[inst.rarity]}33` }}>
          <Icon name={t.icon} size={30} color={RARITY_COLOR[inst.rarity]} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm leading-tight" style={{ color: RARITY_COLOR[inst.rarity] }}>{itemName(inst)}</div>
          <div className="text-xs text-mist capitalize">{inst.rarity} {t.weaponType ?? t.category}{t.category === 'weapon' && ` · ${weaponDamage(inst)} dmg${t.element && t.element !== 'physical' ? ` (${t.element})` : ''}`}</div>
          {!compact && <Mods mods={itemModifiers(inst)} className="mt-1 !text-xs" />}
          {!compact && t.effect && <div className="mt-1 text-xs text-amber-200/90">✦ {effectText(t.effect)}</div>}
          {!compact && <p className="mt-1 text-xs italic text-mist/80">{t.description}</p>}
        </div>
      </div>
      {actions && <div className="mt-2 flex flex-wrap gap-1.5">{actions}</div>}
    </div>
  );
}

import { ITEM_EFFECTS } from '../game/data/registry';
export const effectText = (e: string) => (ITEM_EFFECTS as Record<string, string>)[e] ?? e;

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-gold/10 py-1 text-sm">
      <span className="text-mist">{label}</span>
      <span className="font-display text-parch">{value}{sub && <span className="ml-1 text-xs text-mist">{sub}</span>}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center italic text-mist/70">{children}</p>;
}
