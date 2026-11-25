/** Game store: the state object is mutated by systems, then the version is bumped to re-render and autosave. */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { GameState } from '../game/state';
import { save } from '../game/systems/save';

export type Screen = 'title' | 'create' | 'haven' | 'hunt' | 'succession';

export interface Toast { id: number; text: string; tone: 'info' | 'good' | 'bad' | 'epic' }

interface Store {
  s: GameState | null;
  slot: number;
  screen: Screen;
  version: number;
  toasts: Toast[];
  setGame: (s: GameState | null, slot?: number) => void;
  go: (sc: Screen) => void;
  /** Run a mutation; returned strings become toasts. */
  act: (fn: (s: GameState) => string | string[] | void | { msg: string; ok: boolean }) => void;
  toast: (text: string | string[], tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
  /** In-game confirmation (the artifact viewer blocks window.confirm). */
  ask: (text: string, onYes: () => void) => void;
  pending: { text: string; onYes: () => void } | null;
  resolve: (yes: boolean) => void;
}

const Ctx = createContext<Store | null>(null);
let TID = 1;

const toneOf = (t: string): Toast['tone'] =>
  /ascend|evolves|awaken|fusion|achievement|unlocked|secret|discovery|acclaimed|wins|legendary|hidden/i.test(t) ? 'epic' : /fail|lost|cannot|not enough|incensed|caught|seizes|riot|true death|torpor|falls/i.test(t) ? 'bad' : 'info';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<GameState | null>(null);
  const [slot, setSlot] = useState(0);
  const [screen, setScreen] = useState<Screen>('title');
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<{ text: string; onYes: () => void } | null>(null);
  const ref = useRef<{ s: GameState | null; slot: number }>({ s: null, slot: 0 });

  const toast = useCallback((text: string | string[], tone?: Toast['tone']) => {
    const arr = (Array.isArray(text) ? text : [text]).filter(Boolean);
    if (!arr.length) return;
    const add = arr.map((t) => ({ id: TID++, text: t, tone: tone ?? toneOf(t) }));
    setToasts((old) => [...old, ...add].slice(-6));
    for (const a of add) setTimeout(() => setToasts((old) => old.filter((x) => x.id !== a.id)), a.tone === 'epic' ? 7000 : 5000);
  }, []);

  const act = useCallback<Store['act']>((fn) => {
    const st = ref.current.s;
    if (!st) return;
    const r = fn(st);
    if (typeof r === 'string') toast(r);
    else if (Array.isArray(r)) toast(r);
    else if (r && typeof r === 'object' && 'msg' in r) toast(r.msg, r.ok ? 'good' : 'bad');
    save(st, ref.current.slot);
    setVersion((v) => v + 1);
  }, [toast]);

  const setGame = useCallback((g: GameState | null, sl = 0) => {
    ref.current = { s: g, slot: sl };
    setS(g); setSlot(sl);
    if (g) save(g, sl);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo<Store>(() => ({
    s, slot, screen, version, toasts, setGame, go: setScreen, act, toast, dismiss: (id) => setToasts((o) => o.filter((x) => x.id !== id)),
    ask: (text, onYes) => setPending({ text, onYes }), pending, resolve: (yes) => { const p = pending; setPending(null); if (yes) p?.onYes(); },
  }), [s, slot, screen, version, toasts, setGame, act, toast, pending]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('no store');
  return c;
}
/** Convenience: the loaded game (screens only render when one exists). */
export function useGame() {
  const st = useStore();
  return { ...st, s: st.s! };
}
