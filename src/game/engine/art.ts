/** Procedural art: biome palettes, pre-rendered floor/walls, props, and animated characters. */
import type { Biome, CreatureDef } from '../types';
import { makeRng } from '../systems/rng';
import { type Floor, type Prop, T_CRACKED, T_FLOOR, T_WALL, TILE } from './dungeon';

export interface Palette {
  floor: string; floor2: string; grout: string; wallTop: string; wallFace: string; wallFace2: string; ambient: string;
  darkness: number; fog: string; particle: 'dust' | 'ember' | 'snow' | 'spore' | 'mote' | 'ash' | 'rain' | 'star'; torch: string;
}

export const PALETTES: Record<Biome, Palette> = {
  forest: { floor: '#1c2419', floor2: '#232d1f', grout: '#121810', wallTop: '#0c110b', wallFace: '#2b3324', wallFace2: '#1f261a', ambient: '#3a5a3a', darkness: 0.86, fog: 'rgba(90,130,100,0.05)', particle: 'spore', torch: '#ffb35a' },
  crypt: { floor: '#1f1d22', floor2: '#26232a', grout: '#121014', wallTop: '#0b0a0d', wallFace: '#35303b', wallFace2: '#27232c', ambient: '#4a4060', darkness: 0.88, fog: 'rgba(120,110,150,0.05)', particle: 'dust', torch: '#ffa04a' },
  catacomb: { floor: '#24201b', floor2: '#2c2721', grout: '#14110e', wallTop: '#0d0b09', wallFace: '#3d352c', wallFace2: '#2d271f', ambient: '#5a4a30', darkness: 0.9, fog: 'rgba(160,140,100,0.04)', particle: 'dust', torch: '#ffa040' },
  castle: { floor: '#231a1c', floor2: '#2b2023', grout: '#140e10', wallTop: '#0d0809', wallFace: '#3e2a2e', wallFace2: '#2e1f22', ambient: '#6a2030', darkness: 0.84, fog: 'rgba(160,40,60,0.04)', particle: 'dust', torch: '#ff9a40' },
  ash: { floor: '#262019', floor2: '#2e261d', grout: '#151109', wallTop: '#0f0b07', wallFace: '#45332a', wallFace2: '#33251d', ambient: '#a04018', darkness: 0.8, fog: 'rgba(200,80,30,0.05)', particle: 'ember', torch: '#ff7020' },
  frost: { floor: '#1a2229', floor2: '#202a33', grout: '#0f151a', wallTop: '#0a0e12', wallFace: '#2e3c48', wallFace2: '#222d37', ambient: '#4080b0', darkness: 0.8, fog: 'rgba(160,210,255,0.06)', particle: 'snow', torch: '#9fd8ff' },
  cathedral: { floor: '#24221e', floor2: '#2d2a24', grout: '#141210', wallTop: '#0d0c0a', wallFace: '#433d33', wallFace2: '#332e26', ambient: '#c0a060', darkness: 0.78, fog: 'rgba(255,230,160,0.04)', particle: 'mote', torch: '#ffd070' },
  swamp: { floor: '#1a1f19', floor2: '#1f261d', grout: '#0e120d', wallTop: '#090c08', wallFace: '#2a3322', wallFace2: '#1f2619', ambient: '#406030', darkness: 0.88, fog: 'rgba(110,160,90,0.07)', particle: 'spore', torch: '#c0ff80' },
  abyss: { floor: '#160f1c', floor2: '#1c1424', grout: '#0b070f', wallTop: '#060409', wallFace: '#2a1a38', wallFace2: '#1e1229', ambient: '#6020a0', darkness: 0.9, fog: 'rgba(120,40,200,0.06)', particle: 'mote', torch: '#c060ff' },
  library: { floor: '#221c17', floor2: '#2a221b', grout: '#130f0c', wallTop: '#0c0907', wallFace: '#3d2e22', wallFace2: '#2e2219', ambient: '#a07040', darkness: 0.84, fog: 'rgba(200,160,100,0.04)', particle: 'dust', torch: '#ffc060' },
  ruins: { floor: '#201e1f', floor2: '#272426', grout: '#121112', wallTop: '#0b0a0b', wallFace: '#393437', wallFace2: '#2a2629', ambient: '#806070', darkness: 0.82, fog: 'rgba(200,160,180,0.04)', particle: 'ash', torch: '#ff9a50' },
  astral: { floor: '#15142a', floor2: '#1b1a33', grout: '#0c0b18', wallTop: '#07060f', wallFace: '#2a2850', wallFace2: '#1f1d3c', ambient: '#6060e0', darkness: 0.84, fog: 'rgba(140,140,255,0.05)', particle: 'star', torch: '#b0a0ff' },
};

/** Render static floor + walls once into an offscreen canvas. Blood decals are painted onto it later. */
export function renderFloor(f: Floor, biome: Biome): HTMLCanvasElement {
  const pal = PALETTES[biome];
  const cv = document.createElement('canvas');
  cv.width = f.w * TILE;
  cv.height = f.h * TILE;
  const g = cv.getContext('2d')!;
  const rng = makeRng(f.seed ^ 0x5bd1e995);
  g.fillStyle = pal.wallTop;
  g.fillRect(0, 0, cv.width, cv.height);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= f.w || y >= f.h ? T_WALL : f.tiles[y * f.w + x]);
  const organic = biome === 'forest' || biome === 'swamp';

  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const t = at(x, y);
      const px = x * TILE, py = y * TILE;
      if (t === T_FLOOR) {
        g.fillStyle = pal.floor;
        g.fillRect(px, py, TILE, TILE);
        g.globalAlpha = 0.35 + rng() * 0.5; g.fillStyle = pal.floor2; g.fillRect(px, py, TILE, TILE); g.globalAlpha = 1;
        if (organic) {
          for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(${rng() < 0.5 ? '60,90,50' : '20,25,18'},${0.15 + rng() * 0.25})`; g.beginPath(); g.ellipse(px + rng() * TILE, py + rng() * TILE, 2 + rng() * 6, 1 + rng() * 4, rng() * 3, 0, 7); g.fill(); }
        } else {
          // Flagstones: offset slabs with grout lines
          g.strokeStyle = pal.grout; g.lineWidth = 1.5;
          const half = (y % 2) * (TILE / 2);
          g.strokeRect(px + 0.5 - half % TILE, py + 0.5, TILE, TILE / 2);
          g.beginPath(); g.moveTo(px, py + TILE / 2); g.lineTo(px + TILE, py + TILE / 2); g.stroke();
          for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(255,255,255,${rng() * 0.025})`; g.fillRect(px + rng() * TILE, py + rng() * TILE, 2 + rng() * 6, 1 + rng() * 3); }
          if (rng() < 0.06) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.moveTo(px + rng() * TILE, py + rng() * TILE); g.lineTo(px + rng() * TILE, py + rng() * TILE); g.stroke(); }
        }
        // Ambient occlusion near walls
        const shade = (dx: number, dy: number, gx: number, gy: number, gw: number, gh: number) => {
          if (at(x + dx, y + dy) !== T_FLOOR) { const gr = g.createLinearGradient(px + gx, py + gy, px + gx + gw, py + gy + gh); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px, py, TILE, TILE); }
        };
        shade(0, -1, 0, 0, 0, 14); shade(-1, 0, 0, 0, 10, 0); shade(1, 0, TILE, 0, -10, 0);
      } else if (at(x, y + 1) === T_FLOOR) {
        // Wall face (front of a wall, seen from above at an angle)
        const crack = t === T_CRACKED;
        g.fillStyle = pal.wallFace; g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = pal.wallFace2; g.lineWidth = 2;
        for (let row = 0; row < 3; row++) {
          const ry = py + 4 + row * 9;
          g.beginPath(); g.moveTo(px, ry); g.lineTo(px + TILE, ry); g.stroke();
          const off = (row + x) % 2 ? 0 : TILE / 2;
          g.beginPath(); g.moveTo(px + off, ry); g.lineTo(px + off, ry + 9); g.stroke();
        }
        const gr = g.createLinearGradient(0, py, 0, py + TILE); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
        g.fillStyle = gr; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(px, py, TILE, 2);
        if (crack) {
          g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 2; g.beginPath();
          g.moveTo(px + 6, py + 2); g.lineTo(px + 14, py + 12); g.lineTo(px + 10, py + 20); g.lineTo(px + 18, py + 30);
          g.moveTo(px + 14, py + 12); g.lineTo(px + 24, py + 16); g.stroke();
          g.strokeStyle = 'rgba(200,180,255,0.18)'; g.lineWidth = 1; g.stroke();
        }
      } else {
        g.fillStyle = pal.wallTop; g.fillRect(px, py, TILE, TILE);
        if (at(x, y - 1) === T_FLOOR || at(x - 1, y) === T_FLOOR || at(x + 1, y) === T_FLOOR) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(px, py, TILE, TILE); }
      }
    }
  return cv;
}

// ───────────────────────── Props ─────────────────────────
export function drawProp(g: CanvasRenderingContext2D, p: Prop, t: number, pal: Palette) {
  const { x, y } = p;
  g.save();
  g.translate(x, y);
  switch (p.kind) {
    case 'torch': {
      g.fillStyle = '#2a1d14'; g.fillRect(-2, 0, 4, 12);
      const fl = Math.sin(t * 13 + x) * 1.5;
      g.fillStyle = pal.torch; g.beginPath(); g.ellipse(0, -3 + fl * 0.3, 4, 7 + fl, 0, 0, 7); g.fill();
      g.fillStyle = '#fff4c0'; g.beginPath(); g.ellipse(0, -1, 2, 3.5, 0, 0, 7); g.fill();
      break;
    }
    case 'candles':
      for (const [dx, h] of [[-6, 10], [0, 14], [6, 8]]) {
        g.fillStyle = '#d8cfb8'; g.fillRect(dx - 2, -h, 4, h);
        g.fillStyle = '#ffcc66'; g.beginPath(); g.ellipse(dx, -h - 3 + Math.sin(t * 9 + dx) * 0.6, 2, 3.5, 0, 0, 7); g.fill();
      }
      break;
    case 'bones':
      g.strokeStyle = '#bfb6a0'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-9, 3); g.lineTo(7, -2); g.moveTo(-4, -5); g.lineTo(5, 6); g.stroke();
      g.fillStyle = '#cfc6b0'; g.beginPath(); g.arc(9, 4, 5, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(7, 3, 2, 2); g.fillRect(10, 3, 2, 2);
      break;
    case 'urn':
      if ((p.hp ?? 0) <= 0) { g.fillStyle = '#5a4030'; g.fillRect(-8, 4, 6, 3); g.fillRect(2, 2, 7, 4); break; }
      g.fillStyle = '#6b4a35'; g.beginPath(); g.ellipse(0, 0, 9, 11, 0, 0, 7); g.fill();
      g.fillStyle = '#8a6448'; g.fillRect(-5, -13, 10, 4); g.strokeStyle = '#3a281c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -2); g.lineTo(8, -2); g.stroke();
      break;
    case 'coffin':
      if ((p.hp ?? 0) <= 0) { g.fillStyle = '#2a1a14'; g.fillRect(-12, -6, 24, 12); break; }
      g.fillStyle = '#3a2418'; g.beginPath(); g.moveTo(-8, -18); g.lineTo(8, -18); g.lineTo(12, -6); g.lineTo(7, 18); g.lineTo(-7, 18); g.lineTo(-12, -6); g.closePath(); g.fill();
      g.strokeStyle = '#8a6a40'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(0, 6); g.moveTo(-5, -5); g.lineTo(5, -5); g.stroke();
      break;
    case 'chest':
      g.fillStyle = p.used ? '#3a2a1a' : '#5a3a1e'; g.fillRect(-13, -9, 26, 18);
      g.fillStyle = p.used ? '#2a1d12' : '#7a5228'; g.fillRect(-13, -13, 26, 7);
      g.fillStyle = '#d4a84a'; g.fillRect(-13, -6, 26, 2); g.fillRect(-2, -7, 4, 6);
      if (!p.used) { g.fillStyle = `rgba(255,210,120,${0.25 + Math.sin(t * 3) * 0.15})`; g.beginPath(); g.arc(0, -4, 20, 0, 7); g.fill(); }
      break;
    case 'font': {
      g.fillStyle = '#3a3036'; g.beginPath(); g.ellipse(0, 6, 18, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#2a2026'; g.fillRect(-6, -6, 12, 14);
      g.fillStyle = '#4a3e46'; g.beginPath(); g.ellipse(0, -8, 16, 7, 0, 0, 7); g.fill();
      g.fillStyle = p.used ? '#3a1018' : '#c4102a'; g.beginPath(); g.ellipse(0, -8, 12, 5, 0, 0, 7); g.fill();
      if (!p.used) { g.fillStyle = 'rgba(255,80,100,0.5)'; g.beginPath(); g.ellipse(-3, -9, 4, 1.5, 0, 0, 7); g.fill(); }
      break;
    }
    case 'tome': {
      g.fillStyle = '#2a2230'; g.fillRect(-8, -2, 16, 14);
      const glow = p.used ? 0 : 0.4 + Math.sin(t * 2.5) * 0.2;
      g.fillStyle = `rgba(200,170,255,${glow})`; g.beginPath(); g.arc(0, -8, 16, 0, 7); g.fill();
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.moveTo(-11, -6); g.lineTo(0, -3); g.lineTo(11, -6); g.lineTo(11, -14); g.lineTo(0, -11); g.lineTo(-11, -14); g.closePath(); g.fill();
      g.strokeStyle = '#6a5a8a'; g.beginPath(); g.moveTo(0, -3); g.lineTo(0, -11); g.stroke();
      break;
    }
    case 'pillar':
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(2, 10, 15, 7, 0, 0, 7); g.fill();
      g.fillStyle = pal.wallFace; g.fillRect(-11, -34, 22, 44);
      g.fillStyle = pal.wallFace2; g.fillRect(-11, -34, 5, 44); g.fillRect(6, -34, 5, 44);
      g.fillStyle = pal.wallTop; g.fillRect(-13, -38, 26, 6); g.fillRect(-13, 6, 26, 5);
      break;
    case 'banner':
      g.fillStyle = '#2a1a14'; g.fillRect(-1, -30, 2, 32);
      g.fillStyle = '#6a0f20'; g.beginPath(); g.moveTo(-9, -28); g.lineTo(9, -28); g.lineTo(9, -6 + Math.sin(t * 2 + x) * 1.5); g.lineTo(0, -10); g.lineTo(-9, -6); g.closePath(); g.fill();
      g.fillStyle = '#d4a84a'; g.beginPath(); g.arc(0, -19, 3, 0, 7); g.fill();
      break;
    case 'statue':
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 8, 13, 5, 0, 0, 7); g.fill();
      g.fillStyle = '#4a4648'; g.fillRect(-10, 0, 20, 8);
      g.fillStyle = '#5c5759'; g.beginPath(); g.moveTo(-7, 0); g.lineTo(-5, -22); g.lineTo(5, -22); g.lineTo(7, 0); g.fill();
      g.beginPath(); g.arc(0, -26, 5, 0, 7); g.fill();
      g.fillStyle = '#3a3638'; g.beginPath(); g.moveTo(-5, -22); g.lineTo(-14, -30); g.lineTo(-6, -16); g.fill(); g.beginPath(); g.moveTo(5, -22); g.lineTo(14, -30); g.lineTo(6, -16); g.fill();
      break;
    case 'crystal': {
      const c = pal.torch;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 6, 12, 5, 0, 0, 7); g.fill();
      g.fillStyle = c; g.globalAlpha = 0.85;
      for (const [dx, h, wd] of [[-5, 16, 5], [2, 24, 6], [8, 12, 4]]) { g.beginPath(); g.moveTo(dx - wd, 4); g.lineTo(dx, -h); g.lineTo(dx + wd, 4); g.fill(); }
      g.globalAlpha = 1;
      break;
    }
    case 'roots':
      g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(i * 1.7 + x) * 10, Math.sin(i * 2.1) * 8, Math.cos(i * 1.7 + x) * 18, Math.sin(i * 1.3 + y) * 12); g.stroke(); }
      break;
    case 'portal': {
      const r = 26;
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = `rgba(255,40,70,${0.6 - i * 0.15})`; g.lineWidth = 4 - i;
        g.beginPath(); g.ellipse(0, 0, r - i * 6 + Math.sin(t * 3 + i) * 2, (r - i * 6) * 0.55, 0, t * (i % 2 ? 1 : -1), t * (i % 2 ? 1 : -1) + 5.5); g.stroke();
      }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(255,60,90,0.55)'); gr.addColorStop(1, 'rgba(80,0,20,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r, r * 0.55, 0, 0, 7); g.fill();
      break;
    }
  }
  g.restore();
}

// ───────────────────────── Characters ─────────────────────────
export interface DrawActor {
  x: number; y: number; r: number; facing: number; moving: boolean; t: number; flash: number;
  color: string; accent: string; shape: CreatureDef['look']['shape'] | 'player' | 'minion'; alpha?: number; tint?: string; scale?: number;
}

export function drawShadow(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.fillStyle = 'rgba(0,0,0,0.42)';
  g.beginPath(); g.ellipse(x, y + r * 0.75, r * 0.95, r * 0.38, 0, 0, 7); g.fill();
}

export function drawActor(g: CanvasRenderingContext2D, a: DrawActor) {
  const s = a.scale ?? 1;
  const r = a.r * s;
  g.save();
  g.globalAlpha = a.alpha ?? 1;
  drawShadow(g, a.x, a.y, r);
  g.translate(a.x, a.y);
  const bob = a.moving ? Math.sin(a.t * 14) * r * 0.06 : Math.sin(a.t * 2.5) * r * 0.03;
  const dir = Math.cos(a.facing) >= 0 ? 1 : -1;
  const body = a.flash > 0 ? '#ffffff' : a.color;
  const acc = a.flash > 0 ? '#ffffff' : a.accent;
  switch (a.shape) {
    case 'player': drawVampire(g, r, bob, dir, a, body, acc); break;
    case 'humanoid': case 'minion': drawHumanoid(g, r, bob, dir, a, body, acc, false); break;
    case 'knight': drawHumanoid(g, r, bob, dir, a, body, acc, true); break;
    case 'beast': drawBeast(g, r, bob, dir, a, body, acc); break;
    case 'blob': {
      const sq = 1 + Math.sin(a.t * 6) * 0.08;
      g.fillStyle = body; g.beginPath(); g.ellipse(0, -r * 0.4, r * sq, r * 0.85 / sq, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.75, r * 0.3, r * 0.18, -0.4, 0, 7); g.fill();
      eyes(g, r * 0.25 * dir, -r * 0.55, r * 0.14, acc); break;
    }
    case 'flyer': {
      const flap = Math.sin(a.t * 22) * 0.9;
      g.translate(0, -r * 0.9 + Math.sin(a.t * 5) * 3);
      g.fillStyle = body;
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * r * 1.6, -r * 0.5 * flap - r * 0.2); g.lineTo(sd * r * 1.2, r * 0.25); g.lineTo(sd * r * 0.7, -r * 0.05); g.lineTo(sd * r * 0.4, r * 0.3); g.closePath(); g.fill(); }
      g.beginPath(); g.ellipse(0, 0, r * 0.45, r * 0.55, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-r * 0.35, -r * 0.4); g.lineTo(-r * 0.2, -r * 0.8); g.lineTo(-r * 0.05, -r * 0.45); g.moveTo(r * 0.35, -r * 0.4); g.lineTo(r * 0.2, -r * 0.8); g.lineTo(r * 0.05, -r * 0.45); g.fill();
      eyes(g, 0, -r * 0.15, r * 0.12, acc); break;
    }
    case 'wisp': {
      const gr = g.createRadialGradient(0, -r, 0, 0, -r, r * 1.6);
      gr.addColorStop(0, acc); gr.addColorStop(0.35, body); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, -r + Math.sin(a.t * 4) * 3, r * 1.6, 0, 7); g.fill();
      g.fillStyle = body; g.globalAlpha *= 0.7;
      g.beginPath(); g.moveTo(-r * 0.6, -r); for (let i = 0; i <= 6; i++) g.lineTo(-r * 0.6 + (i / 6) * r * 1.2, -r * 0.1 + Math.sin(a.t * 8 + i) * r * 0.25 + (i % 2) * r * 0.3); g.lineTo(r * 0.6, -r); g.closePath(); g.fill();
      g.globalAlpha /= 0.7;
      eyes(g, 0, -r * 1.05, r * 0.16, '#000'); break;
    }
    case 'spider': {
      g.strokeStyle = body; g.lineWidth = Math.max(2, r * 0.12); g.lineCap = 'round';
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
        const ph = Math.sin(a.t * 16 + i * 1.3 + (sd > 0 ? 1.5 : 0)) * (a.moving ? 0.3 : 0.05);
        const ang = (-0.9 + i * 0.6 + ph) * sd;
        g.beginPath(); g.moveTo(0, -r * 0.4); g.quadraticCurveTo(Math.cos(ang) * r * 1.1 * sd, -r * 0.9 + Math.sin(ang) * r * 0.4, Math.cos(ang) * r * 1.5 * sd, -r * 0.1 + Math.sin(ang) * r * 0.9); g.stroke();
      }
      g.fillStyle = body; g.beginPath(); g.ellipse(-dir * r * 0.35, -r * 0.45, r * 0.65, r * 0.55, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(dir * r * 0.35, -r * 0.45, r * 0.35, r * 0.32, 0, 0, 7); g.fill();
      g.fillStyle = acc; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(dir * r * (0.45 + (i % 2) * 0.12), -r * (0.55 - Math.floor(i / 2) * 0.12), r * 0.06, 0, 7); g.fill(); }
      break;
    }
    case 'serpent': {
      for (let i = 6; i >= 0; i--) {
        const sx = -dir * i * r * 0.32, sy = -r * 0.4 + Math.sin(a.t * 7 - i * 0.8) * r * 0.25;
        g.fillStyle = i % 2 ? body : acc; g.beginPath(); g.arc(sx, sy, r * (0.55 - i * 0.05), 0, 7); g.fill();
      }
      eyes(g, dir * r * 0.15, -r * 0.55, r * 0.1, '#ff0'); break;
    }
  }
  g.restore();
}

function eyes(g: CanvasRenderingContext2D, x: number, y: number, s: number, c: string) {
  g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 6;
  g.beginPath(); g.arc(x - s * 1.3, y, s, 0, 7); g.arc(x + s * 1.3, y, s, 0, 7); g.fill();
  g.shadowBlur = 0;
}

function drawVampire(g: CanvasRenderingContext2D, r: number, bob: number, dir: number, a: DrawActor, body: string, acc: string) {
  const sway = Math.sin(a.t * (a.moving ? 12 : 2)) * (a.moving ? 0.22 : 0.06);
  // Cape — flares behind movement
  g.fillStyle = a.flash > 0 ? '#fff' : '#1a0a10';
  g.beginPath(); g.moveTo(-r * 0.55, -r * 1.45 + bob);
  g.quadraticCurveTo(-r * (1.05 + sway * dir), -r * 0.4, -r * (0.95 + sway * 1.5), r * 0.55);
  for (let i = 0; i <= 4; i++) g.lineTo(-r * 0.95 + (i / 4) * r * 1.9 + Math.sin(a.t * 9 + i) * 1.5, r * (0.45 + (i % 2) * 0.18));
  g.quadraticCurveTo(r * (1.05 - sway * dir), -r * 0.4, r * 0.55, -r * 1.45 + bob); g.fill();
  // Cape lining
  g.fillStyle = a.flash > 0 ? '#fff' : acc;
  g.beginPath(); g.moveTo(-r * 0.3, -r * 1.3 + bob); g.lineTo(-r * 0.55, r * 0.35); g.lineTo(r * 0.55, r * 0.35); g.lineTo(r * 0.3, -r * 1.3 + bob); g.fill();
  // Body (doublet)
  g.fillStyle = body;
  g.beginPath(); g.moveTo(-r * 0.42, -r * 1.25 + bob); g.lineTo(-r * 0.35, r * 0.25); g.lineTo(r * 0.35, r * 0.25); g.lineTo(r * 0.42, -r * 1.25 + bob); g.fill();
  // Legs
  const step = a.moving ? Math.sin(a.t * 14) * r * 0.2 : 0;
  g.fillStyle = '#0d0a0c'; g.fillRect(-r * 0.28 + step * 0.4, r * 0.15, r * 0.22, r * 0.45); g.fillRect(r * 0.06 - step * 0.4, r * 0.15, r * 0.22, r * 0.45);
  // High collar
  g.fillStyle = a.flash > 0 ? '#fff' : '#120508';
  g.beginPath(); g.moveTo(-r * 0.6, -r * 1.2 + bob); g.lineTo(-r * 0.45, -r * 1.95 + bob); g.lineTo(-r * 0.15, -r * 1.35 + bob); g.fill();
  g.beginPath(); g.moveTo(r * 0.6, -r * 1.2 + bob); g.lineTo(r * 0.45, -r * 1.95 + bob); g.lineTo(r * 0.15, -r * 1.35 + bob); g.fill();
  // Head
  g.fillStyle = a.flash > 0 ? '#fff' : '#e8dcd4';
  g.beginPath(); g.ellipse(dir * r * 0.05, -r * 1.6 + bob, r * 0.34, r * 0.4, 0, 0, 7); g.fill();
  // Hair
  g.fillStyle = a.flash > 0 ? '#fff' : '#100808';
  g.beginPath(); g.ellipse(-dir * r * 0.06, -r * 1.82 + bob, r * 0.38, r * 0.24, 0, Math.PI, 0); g.fill();
  g.beginPath(); g.moveTo(-dir * r * 0.4, -r * 1.8 + bob); g.lineTo(-dir * r * 0.36, -r * 1.35 + bob); g.lineTo(-dir * r * 0.1, -r * 1.75 + bob); g.fill();
  // Eyes
  g.fillStyle = '#ff2040'; g.shadowColor = '#ff2040'; g.shadowBlur = 8;
  g.fillRect(dir * r * 0.08, -r * 1.63 + bob, r * 0.11, r * 0.06); g.fillRect(dir * r * 0.26, -r * 1.63 + bob, r * 0.09, r * 0.06);
  g.shadowBlur = 0;
  // Brooch
  g.fillStyle = '#d4a84a'; g.beginPath(); g.arc(0, -r * 1.15 + bob, r * 0.09, 0, 7); g.fill();
}

function drawHumanoid(g: CanvasRenderingContext2D, r: number, bob: number, dir: number, a: DrawActor, body: string, acc: string, armored: boolean) {
  const step = a.moving ? Math.sin(a.t * 12) * r * 0.22 : 0;
  g.fillStyle = darken(body);
  g.fillRect(-r * 0.32 + step * 0.4, r * 0.05, r * 0.26, r * 0.55); g.fillRect(r * 0.06 - step * 0.4, r * 0.05, r * 0.26, r * 0.55);
  g.fillStyle = body;
  g.beginPath(); g.moveTo(-r * 0.55, -r * 1.2 + bob); g.lineTo(-r * 0.45, r * 0.2); g.lineTo(r * 0.45, r * 0.2); g.lineTo(r * 0.55, -r * 1.2 + bob); g.closePath(); g.fill();
  // Arms
  const swing = a.moving ? Math.sin(a.t * 12) * 0.5 : 0;
  g.strokeStyle = body; g.lineWidth = r * 0.24; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.55, -r * 1.05 + bob); g.lineTo(-r * 0.7 - swing * r * 0.2, -r * 0.2); g.stroke();
  g.beginPath(); g.moveTo(r * 0.55, -r * 1.05 + bob); g.lineTo(r * 0.7 + swing * r * 0.2, -r * 0.2); g.stroke();
  // Weapon
  g.strokeStyle = acc; g.lineWidth = Math.max(2, r * 0.12);
  g.beginPath(); g.moveTo(dir * r * 0.72, -r * 0.2); g.lineTo(dir * r * 1.25, -r * 1.25); g.stroke();
  // Head
  if (armored) {
    g.fillStyle = darken(body); g.fillRect(-r * 0.36, -r * 1.95 + bob, r * 0.72, r * 0.75);
    g.fillStyle = acc; g.shadowColor = acc; g.shadowBlur = 8; g.fillRect(-r * 0.26, -r * 1.65 + bob, r * 0.52, r * 0.1); g.shadowBlur = 0;
    g.fillStyle = body; g.beginPath(); g.moveTo(-r * 0.1, -r * 1.95 + bob); g.lineTo(0, -r * 2.35 + bob); g.lineTo(r * 0.1, -r * 1.95 + bob); g.fill();
  } else {
    g.fillStyle = lighten(body); g.beginPath(); g.arc(0, -r * 1.55 + bob, r * 0.36, 0, 7); g.fill();
    g.fillStyle = darken(body); g.beginPath(); g.arc(0, -r * 1.62 + bob, r * 0.4, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    eyes(g, dir * r * 0.1, -r * 1.55 + bob, r * 0.07, acc);
  }
}

function drawBeast(g: CanvasRenderingContext2D, r: number, bob: number, dir: number, a: DrawActor, body: string, acc: string) {
  const gait = a.moving ? Math.sin(a.t * 16) : 0;
  g.fillStyle = darken(body);
  for (const [lx, ph] of [[-0.55, 0], [-0.25, Math.PI], [0.3, Math.PI], [0.6, 0]]) g.fillRect(dir * r * lx - r * 0.08, -r * 0.1, r * 0.18, r * 0.55 + Math.sin(a.t * 16 + ph) * (a.moving ? r * 0.12 : 0));
  g.fillStyle = body;
  g.beginPath(); g.ellipse(0, -r * 0.4 + bob, r * 0.95, r * 0.48, 0, 0, 7); g.fill();
  // Tail
  g.strokeStyle = body; g.lineWidth = r * 0.16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-dir * r * 0.85, -r * 0.5); g.quadraticCurveTo(-dir * r * 1.3, -r * 0.9 + gait * 3, -dir * r * 1.45, -r * 0.55); g.stroke();
  // Head
  g.beginPath(); g.ellipse(dir * r * 0.95, -r * 0.75 + bob, r * 0.42, r * 0.34, dir * 0.2, 0, 7); g.fill();
  g.beginPath(); g.ellipse(dir * r * 1.3, -r * 0.65 + bob, r * 0.25, r * 0.17, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(dir * r * 0.75, -r * 1.0 + bob); g.lineTo(dir * r * 0.82, -r * 1.35 + bob); g.lineTo(dir * r * 1.0, -r * 1.05 + bob); g.fill();
  eyes(g, dir * r * 1.08, -r * 0.82 + bob, r * 0.06, acc);
}

export function darken(hex: string, k = 0.6): string { return shade(hex, k); }
export function lighten(hex: string, k = 1.3): string { return shade(hex, k); }
function shade(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export function hexA(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
