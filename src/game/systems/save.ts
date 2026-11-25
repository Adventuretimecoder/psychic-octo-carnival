/** Persistence: autosave slots in localStorage, plus export/import codes for backups and device transfer. */
import type { GameState } from '../state';

const KEY = (slot: number) => `sanguinis-save-${slot}`;
export const SLOTS = 3;
export const SAVE_VERSION = 1;

export interface SlotInfo { slot: number; name: string; heir: string; night: number; generation: number; rank: number }

function storage(): Storage | null {
  try { const s = window.localStorage; s.getItem('x'); return s; } catch { return null; }
}

export function save(state: GameState, slot: number): boolean {
  const st = storage();
  if (!st) return false;
  try { st.setItem(KEY(slot), JSON.stringify(state)); st.setItem('sanguinis-last-slot', String(slot)); return true; } catch { return false; }
}

export function load(slot: number): GameState | null {
  const st = storage();
  const raw = st?.getItem(KEY(slot));
  if (!raw) return null;
  try { return migrate(JSON.parse(raw)); } catch { return null; }
}

export function deleteSlot(slot: number) { storage()?.removeItem(KEY(slot)); }
export const lastSlot = () => Number(storage()?.getItem('sanguinis-last-slot') ?? 0);

export function slots(): Array<SlotInfo | null> {
  return Array.from({ length: SLOTS }, (_, i) => {
    const s = load(i);
    return s ? { slot: i, name: s.dynasty.name, heir: s.heir.name, night: s.night, generation: s.heir.generation, rank: s.heir.rank } : null;
  });
}

/** Fill fields added by later versions so old saves keep working. */
export function migrate(s: GameState): GameState {
  s.auction ??= [];
  s.bank ??= { deposit: 0, loan: 0, loanNight: 0 };
  s.courtActions ??= 3;
  s.lastDecreeNight ??= -10;
  s.run ??= null;
  s.heardLines ??= [];
  s.chronicle ??= [];
  s.version = SAVE_VERSION;
  return s;
}

export function exportCode(state: GameState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `SANG1:${btoa(bin)}`;
}

export function importCode(code: string): GameState | null {
  try {
    const body = code.trim().replace(/^SANG1:/, '');
    const bin = atob(body);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const s = JSON.parse(new TextDecoder().decode(bytes)) as GameState;
    if (!s.dynasty || !s.heir) return null;
    return migrate(s);
  } catch { return null; }
}
