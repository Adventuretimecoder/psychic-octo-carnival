/** Procedural dungeon floors: rooms, corridors, secret rooms behind cracked walls, sunlight shafts, props. */
import type { Biome } from '../types';
import { chance, makeRng, pick, randInt, type Rng } from '../systems/rng';

export const TILE = 32;
export const T_WALL = 0, T_FLOOR = 1, T_CRACKED = 2;

export interface Room { x: number; y: number; w: number; h: number; kind: 'start' | 'normal' | 'treasure' | 'shrine' | 'exit' | 'boss' | 'secret'; cleared: boolean; activated: boolean; id: number }
export type PropKind = 'torch' | 'candles' | 'bones' | 'urn' | 'coffin' | 'chest' | 'font' | 'tome' | 'pillar' | 'banner' | 'statue' | 'crystal' | 'roots' | 'portal';
export interface Prop { kind: PropKind; x: number; y: number; hp?: number; used?: boolean; secret?: string; room: number }
export interface SunShaft { x: number; y: number; r: number; phase: number }

export interface Floor {
  w: number; h: number; tiles: Uint8Array; rooms: Room[]; props: Prop[]; sun: SunShaft[];
  start: { x: number; y: number }; exit: { x: number; y: number }; bossRoom?: Room; seed: number;
}

export interface FloorSpec { seed: number; biome: Biome; floor: number; isBoss: boolean; secretIds: string[] }

const SUNNY: Biome[] = ['cathedral', 'ruins', 'forest', 'castle', 'library'];

export function generateFloor(spec: FloorSpec): Floor {
  const rng = makeRng(spec.seed);
  const w = spec.isBoss ? 48 : 64, h = spec.isBoss ? 40 : 48;
  const tiles = new Uint8Array(w * h);
  const rooms: Room[] = [];
  const carve = (x: number, y: number) => { if (x > 0 && y > 0 && x < w - 1 && y < h - 1) tiles[y * w + x] = T_FLOOR; };
  const carveRect = (r: { x: number; y: number; w: number; h: number }) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y); };

  if (spec.isBoss) {
    const start: Room = { x: 20, y: 31, w: 8, h: 6, kind: 'start', cleared: true, activated: true, id: 0 };
    const arena: Room = { x: 7, y: 4, w: 34, h: 22, kind: 'boss', cleared: false, activated: false, id: 1 };
    rooms.push(start, arena);
    carveRect(start); carveRect(arena);
    for (let y = 26; y < 31; y++) for (let x = 22; x < 26; x++) carve(x, y);
    // Rounded arena corners
    for (const [cx, cy] of [[arena.x, arena.y], [arena.x + arena.w - 1, arena.y], [arena.x, arena.y + arena.h - 1], [arena.x + arena.w - 1, arena.y + arena.h - 1]])
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) { const x = cx + dx, y = cy + dy; if (x <= arena.x + 1 || x >= arena.x + arena.w - 2) if (y <= arena.y + 1 || y >= arena.y + arena.h - 2) tiles[y * w + x] = T_WALL; }
  } else {
    let attempts = 0;
    const target = randInt(rng, 9, 12);
    while (rooms.length < target && attempts++ < 400) {
      const rw = randInt(rng, 7, 14), rh = randInt(rng, 6, 11);
      const r: Room = { x: randInt(rng, 2, w - rw - 3), y: randInt(rng, 2, h - rh - 3), w: rw, h: rh, kind: 'normal', cleared: false, activated: false, id: rooms.length };
      if (rooms.some((o) => r.x < o.x + o.w + 3 && r.x + r.w + 3 > o.x && r.y < o.y + o.h + 3 && r.y + r.h + 3 > o.y)) continue;
      rooms.push(r);
    }
    for (const r of rooms) carveRect(r);
    // Minimum spanning tree over room centres, plus a couple of loops.
    const c = rooms.map((r) => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) }));
    const inTree = new Set([0]);
    const edges: Array<[number, number]> = [];
    while (inTree.size < rooms.length) {
      let best: [number, number] | null = null, bd = Infinity;
      for (const i of inTree) for (let j = 0; j < rooms.length; j++) if (!inTree.has(j)) { const d = Math.abs(c[i].x - c[j].x) + Math.abs(c[i].y - c[j].y); if (d < bd) bd = d, best = [i, j]; }
      inTree.add(best![1]);
      edges.push(best!);
    }
    for (let k = 0; k < 2; k++) { const i = randInt(rng, 0, rooms.length - 1), j = randInt(rng, 0, rooms.length - 1); if (i !== j) edges.push([i, j]); }
    for (const [i, j] of edges) corridor(c[i], c[j], rng, carve);
    rooms[0].kind = 'start'; rooms[0].cleared = true; rooms[0].activated = true;
    // Exit: farthest room from start (by straight distance — corridors are near-direct).
    let far = 1, fd = -1;
    for (let i = 1; i < rooms.length; i++) { const d = Math.hypot(c[i].x - c[0].x, c[i].y - c[0].y); if (d > fd) fd = d, far = i; }
    rooms[far].kind = 'exit';
    const others = rooms.filter((r) => r.kind === 'normal');
    if (others.length > 2) pick(rng, others).kind = 'treasure';
    const rest = rooms.filter((r) => r.kind === 'normal');
    if (rest.length > 2 && chance(rng, 0.7)) pick(rng, rest).kind = 'shrine';
  }

  const props: Prop[] = [];
  const sun: SunShaft[] = [];
  const tileAt = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? T_WALL : tiles[y * w + x]);

  // Secret room behind a cracked wall.
  if (!spec.isBoss && spec.secretIds.length) {
    for (let tries = 0; tries < 60; tries++) {
      const host = pick(rng, rooms.filter((r) => r.kind !== 'start'));
      const side = randInt(rng, 0, 3);
      const sw = 5, sh = 5;
      let sx = 0, sy = 0, wx = 0, wy = 0;
      if (side === 0) { sx = host.x + randInt(rng, 0, Math.max(0, host.w - sw)); sy = host.y - sh - 1; wx = sx + 2; wy = host.y - 1; }
      if (side === 1) { sx = host.x + randInt(rng, 0, Math.max(0, host.w - sw)); sy = host.y + host.h + 1; wx = sx + 2; wy = host.y + host.h; }
      if (side === 2) { sx = host.x - sw - 1; sy = host.y + randInt(rng, 0, Math.max(0, host.h - sh)); wx = host.x - 1; wy = sy + 2; }
      if (side === 3) { sx = host.x + host.w + 1; sy = host.y + randInt(rng, 0, Math.max(0, host.h - sh)); wx = host.x + host.w; wy = sy + 2; }
      if (sx < 2 || sy < 2 || sx + sw > w - 2 || sy + sh > h - 2) continue;
      let clear = true;
      for (let y = sy - 1; y <= sy + sh; y++) for (let x = sx - 1; x <= sx + sw; x++) if (tileAt(x, y) !== T_WALL) clear = false;
      if (!clear) continue;
      const room: Room = { x: sx, y: sy, w: sw, h: sh, kind: 'secret', cleared: true, activated: true, id: rooms.length };
      rooms.push(room);
      carveRect(room);
      tiles[wy * w + wx] = T_CRACKED;
      props.push({ kind: 'tome', x: (sx + 2.5) * TILE, y: (sy + 2) * TILE, secret: spec.secretIds[0], room: room.id });
      props.push({ kind: 'chest', x: (sx + 2.5) * TILE, y: (sy + 3.6) * TILE, room: room.id });
      props.push({ kind: 'candles', x: (sx + 1) * TILE, y: (sy + 1) * TILE, room: room.id });
      props.push({ kind: 'candles', x: (sx + 4) * TILE, y: (sy + 1) * TILE, room: room.id });
      break;
    }
  }

  // Props, torches, sunlight.
  for (const r of rooms) {
    if (r.kind === 'secret') continue;
    const cx = (r.x + r.w / 2) * TILE, cy = (r.y + r.h / 2) * TILE;
    // Torches on the top wall
    for (let x = r.x + 1; x < r.x + r.w - 1; x += randInt(rng, 3, 5)) if (tileAt(x, r.y - 1) === T_WALL) props.push({ kind: 'torch', x: (x + 0.5) * TILE, y: (r.y - 0.2) * TILE, room: r.id });
    if (r.kind === 'treasure') props.push({ kind: 'chest', x: cx, y: cy, room: r.id });
    if (r.kind === 'shrine') props.push({ kind: 'font', x: cx, y: cy, room: r.id });
    if (r.kind === 'exit' && !spec.isBoss) props.push({ kind: 'portal', x: cx, y: cy, room: r.id });
    if (r.kind === 'normal' || r.kind === 'exit' || r.kind === 'treasure') {
      const n = randInt(rng, 2, 5);
      for (let i = 0; i < n; i++) {
        const px = (r.x + 1 + rng() * (r.w - 2)) * TILE, py = (r.y + 1 + rng() * (r.h - 2)) * TILE;
        if (Math.hypot(px - cx, py - cy) < 48) continue;
        const kind = pick(rng, decorFor(spec.biome));
        props.push({ kind, x: px, y: py, room: r.id, hp: kind === 'urn' || kind === 'coffin' ? 1 : undefined });
      }
      if (r.w >= 11 && r.h >= 8 && chance(rng, 0.45)) {
        for (const [fx, fy] of [[0.28, 0.3], [0.72, 0.3], [0.28, 0.7], [0.72, 0.7]]) props.push({ kind: 'pillar', x: (r.x + r.w * fx) * TILE, y: (r.y + r.h * fy) * TILE, room: r.id });
      }
      if (SUNNY.includes(spec.biome) && r.kind !== 'exit' && chance(rng, 0.35)) {
        const k = randInt(rng, 1, 2);
        for (let i = 0; i < k; i++) sun.push({ x: (r.x + 2 + rng() * (r.w - 4)) * TILE, y: (r.y + 2 + rng() * (r.h - 4)) * TILE, r: 34 + rng() * 26, phase: rng() * 6.28 });
      }
    }
    if (r.kind === 'boss') {
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; props.push({ kind: 'pillar', x: cx + Math.cos(a) * r.w * TILE * 0.36, y: cy + Math.sin(a) * r.h * TILE * 0.34, room: r.id }); }
      for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) props.push({ kind: 'torch', x: (x + 0.5) * TILE, y: (r.y - 0.2) * TILE, room: r.id });
    }
  }
  const s = rooms[0];
  const exitRoom = rooms.find((r) => r.kind === 'exit' || r.kind === 'boss')!;
  return {
    w, h, tiles, rooms, props, sun, seed: spec.seed,
    start: { x: (s.x + s.w / 2) * TILE, y: (s.y + s.h / 2) * TILE },
    exit: { x: (exitRoom.x + exitRoom.w / 2) * TILE, y: (exitRoom.y + exitRoom.h / 2) * TILE },
    bossRoom: rooms.find((r) => r.kind === 'boss'),
  };
}

function corridor(a: { x: number; y: number }, b: { x: number; y: number }, rng: Rng, carve: (x: number, y: number) => void) {
  const wide = chance(rng, 0.5) ? 2 : 3;
  const horizFirst = chance(rng, 0.5);
  const hLine = (x1: number, x2: number, y: number) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let k = 0; k < wide; k++) carve(x, y + k - (wide >> 1)); };
  const vLine = (y1: number, y2: number, x: number) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let k = 0; k < wide; k++) carve(x + k - (wide >> 1), y); };
  if (horizFirst) { hLine(a.x, b.x, a.y); vLine(a.y, b.y, b.x); } else { vLine(a.y, b.y, a.x); hLine(a.x, b.x, b.y); }
}

function decorFor(b: Biome): PropKind[] {
  switch (b) {
    case 'forest': return ['roots', 'roots', 'bones', 'urn', 'statue'];
    case 'crypt': case 'catacomb': return ['bones', 'coffin', 'coffin', 'urn', 'candles'];
    case 'cathedral': return ['candles', 'statue', 'banner', 'urn'];
    case 'library': return ['candles', 'urn', 'statue', 'banner'];
    case 'frost': return ['crystal', 'bones', 'statue', 'urn'];
    case 'ash': return ['bones', 'urn', 'statue', 'crystal'];
    case 'swamp': return ['roots', 'bones', 'urn', 'coffin'];
    case 'astral': case 'abyss': return ['crystal', 'crystal', 'statue', 'bones'];
    default: return ['banner', 'urn', 'candles', 'statue', 'coffin'];
  }
}

export const isSolid = (f: Floor, px: number, py: number) => {
  const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return true;
  const t = f.tiles[y * f.w + x];
  return t === T_WALL || t === T_CRACKED;
};

export function roomAt(f: Floor, px: number, py: number): Room | undefined {
  const x = px / TILE, y = py / TILE;
  return f.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

/** Line of sight on the tile grid (for enemy awareness). */
export function hasLOS(f: Floor, x1: number, y1: number, x2: number, y2: number): boolean {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(d / 12);
  for (let i = 1; i < steps; i++) if (isSolid(f, x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps)) return false;
  return true;
}
