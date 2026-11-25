/**
 * The Hunt — real-time action layer. One instance runs one dungeon floor.
 * Canvas-rendered with dynamic lighting, particles, hitstop & screen shake,
 * touch controls (virtual stick + buttons) and keyboard/mouse.
 */
import { ICON_PATHS } from '../../assets/icons.generated';
import { ABILITY_BY_ID, BOSS_BY_ID, CREATURE_BY_ID, FORM_BY_ID, ITEM_BY_ID, REGION_BY_ID } from '../data';
import type { GameState } from '../state';
import { itemEffects, makeInstance, rollEquipment, rollMaterial, RARITY_COLOR, weaponDamage } from '../systems/loot';
import { formAvailable, masteryLevel, resolveAbility } from '../systems/progression';
import { chance, makeRng, pick, type Rng } from '../systems/rng';
import { armorReduction, computeStats, type Stats } from '../systems/stats';
import { huntModifiers } from '../systems/worldHooks';
import type { AbilityDef, AbilityParams, BloodType, BossDef, BossPattern, CreatureDef, Element, FormId, Modifier, RegionDef, StatusApply, StatusId, WeaponType } from '../types';
import { drawActor, drawProp, hexA, PALETTES, type Palette, renderFloor } from './art';
import { audio } from './audio';
import { type Floor, generateFloor, hasLOS, isSolid, type Prop, type Room, roomAt, T_CRACKED, T_FLOOR, TILE } from './dungeon';

// ───────────────────────── Events to the meta-game ─────────────────────────
export type HuntEvent =
  | { type: 'kill'; creature: string; family: string; elite: boolean; xp: number; tags: string[] }
  | { type: 'feed'; blood: BloodType }
  | { type: 'item'; item: ReturnType<typeof makeInstance> }
  | { type: 'material'; id: string; count: number }
  | { type: 'gold'; amount: number }
  | { type: 'consumable'; id: string }
  | { type: 'secret'; id: string }
  | { type: 'mastery'; ability: string; amount: number }
  | { type: 'consumeBelt'; id: string }
  | { type: 'floorComplete'; hp: number; blood: number }
  | { type: 'boss'; boss: string; perfect: boolean; xp: number }
  | { type: 'death'; cause: string }
  | { type: 'transform'; form: FormId }
  | { type: 'frenzy' }
  | { type: 'combo'; n: number }
  | { type: 'pause' };

export interface HuntConfig {
  state: GameState;
  regionId: string;
  floor: number; // 1-based
  seed: number;
  carry: { hp: number; blood: number } | null;
  onEvent: (e: HuntEvent) => void;
}

// ───────────────────────── Entities ─────────────────────────
interface StatusInst { t: number; power: number }
interface Ent { id: number; x: number; y: number; vx: number; vy: number; r: number; hp: number; maxHp: number; facing: number; t: number; flash: number; status: Partial<Record<StatusId, StatusInst>>; dead: boolean }

interface Enemy extends Ent {
  def: CreatureDef | BossDef; boss: boolean; behavior: CreatureDef['behavior'] | 'boss'; dmg: number; speed: number; armor: number;
  ai: 'idle' | 'move' | 'windup' | 'charge' | 'recover' | 'feeding' | 'blink' | 'spawn'; timer: number; cd: number; aware: boolean; room: number;
  elite: boolean; tx: number; ty: number; phase: number; patternCd: number; patternIdx: number; summoned: number; alpha: number; tele?: Telegraph; charmT: number;
  spawnedBy?: number; clone?: boolean; xp: number;
}
interface Ally extends Ent { kind: string; dmg: number; life: number; cd: number; color: string; accent: string; shape: 'minion' | 'beast' | 'flyer' | 'wisp' | 'humanoid' | 'player' }
interface Proj { x: number; y: number; vx: number; vy: number; r: number; dmg: number; element: Element; team: 'p' | 'e'; pierce: number; life: number; color: string; homing: number; status?: StatusApply[]; hit: Set<number>; ability?: string; lifesteal?: number; trail: number; knock?: number; kind: 'bolt' | 'orb' | 'arrow' | 'spear' }
interface Zone { x: number; y: number; r: number; dmg: number; tick: number; timer: number; life: number; element: Element; team: 'p' | 'e'; status?: StatusApply[]; color: string; pull: number; lifesteal?: number; follow?: boolean; ability?: string; maxLife: number }
interface Telegraph { kind: 'circle' | 'line' | 'safe'; x: number; y: number; r: number; a: number; len: number; t: number; max: number; dmg: number; element: Element; owner: number; done?: boolean; safes?: Array<{ x: number; y: number; r: number }>; sun?: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: 'spark' | 'blood' | 'smoke' | 'text' | 'ring' | 'glow' | 'bolt' | 'slash'; text?: string; a?: number; a2?: number; x2?: number; y2?: number; grav?: number }
interface Pickup { x: number; y: number; vx: number; vy: number; kind: 'gold' | 'item' | 'material' | 'consumable'; amount: number; id?: string; item?: ReturnType<typeof makeInstance>; t: number; color: string }
interface Orbit { count: number; r: number; dmg: number; life: number; color: string; element: Element; ang: number; hitCd: Map<number, number>; ability: string; status?: StatusApply[] }
interface Tether { target: number; dmg: number; life: number; lifesteal: number; color: string; ability: string }
interface Buff { id: string; mods: Modifier[]; t: number; color: string; name: string }
interface Light { x: number; y: number; r: number; color: string; i: number }

interface Button { id: string; x: number; y: number; r: number; label: string; icon?: string; key: string }

const WEAPONS: Record<WeaponType | 'none', { range: number; arc: number; speed: number; mult: number; ranged?: 'arrow' | 'orb'; knock: number; combo: number }> = {
  none: { range: 52, arc: 1.7, speed: 0.34, mult: 1, knock: 70, combo: 3 },
  claws: { range: 56, arc: 1.7, speed: 0.3, mult: 1, knock: 70, combo: 3 },
  dagger: { range: 50, arc: 1.3, speed: 0.24, mult: 0.85, knock: 40, combo: 4 },
  sword: { range: 66, arc: 1.9, speed: 0.4, mult: 1.15, knock: 110, combo: 3 },
  greatsword: { range: 82, arc: 2.4, speed: 0.66, mult: 1.7, knock: 220, combo: 2 },
  scythe: { range: 86, arc: 2.8, speed: 0.62, mult: 1.45, knock: 140, combo: 2 },
  whip: { range: 124, arc: 0.6, speed: 0.48, mult: 1.1, knock: 60, combo: 2 },
  crossbow: { range: 520, arc: 0, speed: 0.48, mult: 1.1, ranged: 'arrow', knock: 60, combo: 1 },
  staff: { range: 440, arc: 0, speed: 0.52, mult: 1.2, ranged: 'orb', knock: 50, combo: 1 },
};

const ELEMENT_COLOR: Record<Element, string> = {
  physical: '#e8e0d0', blood: '#ff2a45', shadow: '#8a6cff', fire: '#ff8a2a', frost: '#9fe4ff', storm: '#b4d4ff', holy: '#fff0a0', death: '#7affd6', void: '#b070ff', venom: '#90ff50', mind: '#ff90ff', star: '#d8c8ff',
};
const BLOOD_QUALITY: Record<BloodType, number> = { common: 1, beast: 0.95, noble: 1.3, magical: 1.2, ancient: 1.6, royal: 1.8, corrupted: 1.1, primordial: 2.5, holy: 0.8, spectral: 1 };
const RESONANCE: Record<BloodType, { name: string; mods: Modifier[] }> = {
  common: { name: 'Warm Blood', mods: [{ stat: 'hpRegen', add: 3 }] },
  beast: { name: 'Beast Resonance', mods: [{ stat: 'moveSpeed', mul: 0.15 }, { stat: 'attackSpeed', mul: 0.15 }] },
  noble: { name: 'Noble Resonance', mods: [{ stat: 'bloodDmg', mul: 0.2 }] },
  magical: { name: 'Arcane Resonance', mods: [{ stat: 'spellDmg', mul: 0.18 }, { stat: 'cooldownRate', mul: 0.15 }] },
  ancient: { name: 'Ancient Resonance', mods: [{ stat: 'physDmg', mul: 0.2 }, { stat: 'spellDmg', mul: 0.2 }, { stat: 'bloodDmg', mul: 0.2 }] },
  royal: { name: 'Royal Resonance', mods: [{ stat: 'lifesteal', add: 0.06 }, { stat: 'bloodDmg', mul: 0.15 }] },
  corrupted: { name: 'Corrupt Resonance', mods: [{ stat: 'physDmg', mul: 0.25 }, { stat: 'spellDmg', mul: 0.25 }, { stat: 'hpRegen', mul: -0.5 }] },
  primordial: { name: 'Primordial Resonance', mods: [{ stat: 'physDmg', mul: 0.3 }, { stat: 'spellDmg', mul: 0.3 }, { stat: 'bloodDmg', mul: 0.3 }, { stat: 'moveSpeed', mul: 0.15 }] },
  holy: { name: 'Sanctified Blood', mods: [{ stat: 'sunResist', add: 0.4 }] },
  spectral: { name: 'Spectral Resonance', mods: [{ stat: 'stealth', add: 0.4 }, { stat: 'critChance', add: 0.1 }] },
};

const STATUS_COLOR: Partial<Record<StatusId, string>> = { bleed: '#ff2040', burn: '#ff8a2a', chill: '#9fe4ff', freeze: '#d8f6ff', shock: '#b4d4ff', fear: '#c080ff', charm: '#ff80c0', poison: '#90ff50', curse: '#a030c0', stun: '#ffe080', weaken: '#808080' };

let NEXT_ID = 1;
const iconCache = new Map<string, Path2D>();
function iconPath(name?: string): Path2D | null {
  if (!name) return null;
  let p = iconCache.get(name);
  if (!p) { const d = ICON_PATHS[name]; if (!d) return null; p = new Path2D(d); iconCache.set(name, p); }
  return p;
}

export class Hunt {
  private cv: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private lg: CanvasRenderingContext2D;
  private floorCv!: HTMLCanvasElement;
  private fg!: CanvasRenderingContext2D;
  private cfg: HuntConfig;
  private region: RegionDef;
  private pal: Palette;
  private floor: Floor;
  private rng: Rng;
  private level: number;
  private mods: ReturnType<typeof huntModifiers>;
  private isBoss: boolean;
  private running = false;
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private hitstop = 0;
  private shake = 0;
  private dpr = 1;
  private W = 0; // css px
  private H = 0;
  private zoom = 1;
  private camX = 0;
  private camY = 0;
  private touch: boolean;

  // Player
  private p = { x: 0, y: 0, r: 12, hp: 100, blood: 60, facing: 0, moving: false, dashT: 0, dashCd: 0, dashDir: 0, dashSpeed: 0, iframes: 0, attackCd: 0, combo: 0, comboT: 0, flash: 0, t: 0, form: null as FormId | null, formT: 0, formCd: 0, feeding: null as null | { id: number; t: number }, shield: 0, shieldT: 0, starveT: 0, frenzy: false, secondWind: false, bloodShieldCd: 0, sunT: 0, dashHits: new Set<number>(), dashDmg: 0, dashAbility: '' as string, dashStatus: undefined as StatusApply[] | undefined, dashKnock: 0, dmgTaken: 0 };
  private stats!: Stats;
  private statsDirty = true;
  private buffs: Buff[] = [];
  private abilities: Array<{ def: AbilityDef; name: string; params: AbilityParams; element: Element; cd: number } | null> = [];
  private effects = new Set<string>();
  private weapon: (typeof WEAPONS)['none'];
  private weaponType: WeaponType | 'none';
  private weaponDmg: number;
  private weaponElement: Element;

  private enemies: Enemy[] = [];
  private allies: Ally[] = [];
  private projs: Proj[] = [];
  private zones: Zone[] = [];
  private teles: Telegraph[] = [];
  private parts: Particle[] = [];
  private pickups: Pickup[] = [];
  private orbits: Orbit[] = [];
  private tethers: Tether[] = [];
  private messages: Array<{ text: string; t: number; color: string; big?: boolean }> = [];
  private lootFeed: Array<{ text: string; t: number; color: string }> = [];
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private bossEnt: Enemy | null = null;
  private bossIntro = 0;
  private finished = false;
  private deathT = 0;
  private visited = new Set<number>();
  private sunHinted = false;
  private feedHinted = false;
  private masteryAcc: Record<string, number> = {};

  // Input
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, down: false, active: false };
  private stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0, active: false };
  private held = new Map<number, string>(); // touch id → button id
  private buttons: Button[] = [];
  private paused = false;

  constructor(canvas: HTMLCanvasElement, cfg: HuntConfig) {
    this.cv = canvas;
    this.g = canvas.getContext('2d')!;
    this.light = document.createElement('canvas');
    this.lg = this.light.getContext('2d')!;
    this.cfg = cfg;
    this.region = REGION_BY_ID[cfg.regionId];
    this.pal = PALETTES[this.region.biome];
    this.level = this.region.level;
    this.mods = huntModifiers(cfg.state, cfg.regionId);
    this.isBoss = cfg.floor >= this.region.floors;
    this.rng = makeRng(cfg.seed);
    const undiscovered = this.region.secrets.filter((s) => !cfg.state.secrets.includes(s));
    const secretIds = !this.isBoss && undiscovered.length && (cfg.floor - 1) < undiscovered.length + 1 ? [undiscovered[(cfg.floor - 1) % undiscovered.length]] : [];
    this.floor = generateFloor({ seed: cfg.seed, biome: this.region.biome, floor: cfg.floor, isBoss: this.isBoss, secretIds });
    this.touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const heir = cfg.state.heir;
    const w = heir.equipment.weapon;
    this.weaponType = w ? (ITEM_BY_ID[w.templateId]?.weaponType ?? 'claws') : 'none';
    this.weapon = WEAPONS[this.weaponType];
    this.weaponDmg = weaponDamage(w);
    this.weaponElement = (w && ITEM_BY_ID[w.templateId]?.element) || 'physical';
    this.effects = itemEffects(heir);
    this.recalc();
    this.p.x = this.floor.start.x;
    this.p.y = this.floor.start.y;
    this.p.hp = cfg.carry ? Math.min(cfg.carry.hp, this.stats.maxHp) : this.stats.maxHp;
    this.p.blood = cfg.carry ? Math.min(cfg.carry.blood, this.stats.maxBlood) : this.stats.maxBlood * 0.7;
    this.abilities = heir.equipped.map((id) => {
      const def = id ? ABILITY_BY_ID[id] : undefined;
      if (!def) return null;
      const r = resolveAbility(def, heir);
      return { def, name: r.name, params: r.params, element: r.element, cd: 0 };
    });
    this.camX = this.p.x;
    this.camY = this.p.y;
  }

  // ───────────────────────── Lifecycle ─────────────────────────
  start() {
    this.floorCv = renderFloor(this.floor, this.region.biome);
    this.fg = this.floorCv.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    this.cv.addEventListener('pointerdown', this.onPointerDown);
    this.cv.addEventListener('pointermove', this.onPointerMove);
    this.cv.addEventListener('pointerup', this.onPointerUp);
    this.cv.addEventListener('pointercancel', this.onPointerUp);
    this.cv.addEventListener('contextmenu', this.prevent);
    this.running = true;
    (window as unknown as { __hunt?: Hunt }).__hunt = this; // debug/testing handle
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    audio.startMusic(this.isBoss ? 'boss' : 'hunt');
    this.say(`${this.region.dungeon.name}`, '#e8d8c0', true);
    this.say(this.isBoss ? 'The lair of something old.' : `Depth ${this.cfg.floor} of ${this.region.floors}`, '#a09080');
    if (this.mods.bossOverride && this.isBoss) this.say('Something unnatural has claimed this place…', '#ff6080');
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    this.cv.removeEventListener('pointerdown', this.onPointerDown);
    this.cv.removeEventListener('pointermove', this.onPointerMove);
    this.cv.removeEventListener('pointerup', this.onPointerUp);
    this.cv.removeEventListener('pointercancel', this.onPointerUp);
    this.cv.removeEventListener('contextmenu', this.prevent);
    this.flushMastery();
  }

  setPaused(p: boolean) { this.paused = p; this.keys.clear(); this.mouse.down = false; this.stick.active = false; this.held.clear(); this.lastT = performance.now(); }

  /** Use a belt potion from outside (UI). */
  private prevent = (e: Event) => e.preventDefault();

  private resize = () => {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.cv.clientWidth || window.innerWidth;
    this.H = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.light.width = Math.ceil(this.W / 2);
    this.light.height = Math.ceil(this.H / 2);
    this.zoom = Math.max(0.85, Math.min(1.7, Math.min(this.W, this.H) / 335));
    this.layoutButtons();
  };

  private layoutButtons() {
    const W = this.W, H = this.H;
    const s = Math.max(0.8, Math.min(1.15, Math.min(W, H) / 400));
    const ax = W - 74 * s, ay = H - 104 * s, R = 96 * s;
    const pol = (deg: number, rr = R) => ({ x: ax + Math.cos((deg * Math.PI) / 180) * rr, y: ay - Math.sin((deg * Math.PI) / 180) * rr });
    const ab = (i: number, deg: number): Button => ({ id: `ab${i}`, ...pol(deg), r: 27 * s, label: '', icon: this.abilities[i]?.def.icon, key: ['Q', 'E', 'R', 'F'][i] });
    this.buttons = [
      { id: 'attack', x: ax, y: ay, r: 44 * s, label: '', icon: this.weapon.ranged ? 'crossbow' : 'claw-slashes', key: 'LMB' },
      { id: 'dash', ...pol(202), r: 28 * s, label: '', icon: 'sprint', key: 'SPC' },
      ab(0, 168), ab(1, 138), ab(2, 106), ab(3, 76),
      { id: 'feed', x: W - 46 * s, y: ay - 176 * s, r: 25 * s, label: '', icon: 'fangs', key: 'V' },
      { id: 'form', x: W - 46 * s, y: ay - 236 * s, r: 23 * s, label: '', icon: FORM_BY_ID[this.cfg.state.heir.form]?.icon ?? 'vampire-dracula', key: 'T' },
      { id: 'pot0', x: W - 104 * s, y: ay - 236 * s, r: 19 * s, label: '', icon: this.beltIcon(0), key: '1' },
      { id: 'pot1', x: W - 104 * s, y: ay - 186 * s, r: 19 * s, label: '', icon: this.beltIcon(1), key: '2' },
      { id: 'pause', x: W - 26, y: 26, r: 18, label: '', icon: 'pause-button', key: 'ESC' },
    ];
  }
  private beltIcon(i: number) { const id = this.cfg.state.heir.belt[i]; return id ? ITEM_BY_ID[id]?.icon : undefined; }

  // ───────────────────────── Input ─────────────────────────
  private onKey = (e: KeyboardEvent) => {
    if (this.paused) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === ' ') { this.tryDash(); e.preventDefault(); }
    if (k === 'q') this.cast(0);
    if (k === 'e') this.cast(1);
    if (k === 'r') this.cast(2);
    if (k === 'f') this.cast(3);
    if (k === 'v') this.tryFeed();
    if (k === 't') this.toggleForm();
    if (k === '1') this.usePotion(0);
    if (k === '2') this.usePotion(1);
    if (k === 'escape' || k === 'p') this.cfg.onEvent({ type: 'pause' });
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  private screenPos(e: PointerEvent) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  private onPointerDown = (e: PointerEvent) => {
    audio.init();
    if (this.paused) return;
    const { x, y } = this.screenPos(e);
    if (e.pointerType === 'mouse') {
      const b = this.hitButton(x, y);
      if (b && this.touch) { this.pressButton(b.id); return; }
      if (b && b.id === 'pause') { this.pressButton('pause'); return; }
      this.mouse = { x, y, down: e.button === 0, active: true };
      if (e.button === 2) this.tryDash();
      return;
    }
    this.cv.setPointerCapture?.(e.pointerId);
    const b = this.hitButton(x, y);
    if (b) { this.held.set(e.pointerId, b.id); this.pressButton(b.id); return; }
    if (x < this.W * 0.55 && !this.stick.active) this.stick = { id: e.pointerId, ox: x, oy: y, x, y, active: true };
  };
  private onPointerMove = (e: PointerEvent) => {
    const { x, y } = this.screenPos(e);
    if (e.pointerType === 'mouse') { this.mouse.x = x; this.mouse.y = y; this.mouse.active = true; return; }
    if (this.stick.active && e.pointerId === this.stick.id) {
      this.stick.x = x; this.stick.y = y;
      const dx = x - this.stick.ox, dy = y - this.stick.oy, d = Math.hypot(dx, dy), max = 60;
      if (d > max) { this.stick.ox = x - (dx / d) * max; this.stick.oy = y - (dy / d) * max; }
    }
  };
  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') { if (e.button === 0) this.mouse.down = false; return; }
    if (e.pointerId === this.stick.id) this.stick.active = false;
    this.held.delete(e.pointerId);
  };
  private hitButton(x: number, y: number) { return this.buttons.find((b) => Math.hypot(b.x - x, b.y - y) <= b.r + 10); }
  private pressButton(id: string) {
    if (id === 'dash') this.tryDash();
    else if (id.startsWith('ab')) this.cast(Number(id[2]));
    else if (id === 'feed') this.tryFeed();
    else if (id === 'form') this.toggleForm();
    else if (id === 'pot0') this.usePotion(0);
    else if (id === 'pot1') this.usePotion(1);
    else if (id === 'pause') this.cfg.onEvent({ type: 'pause' });
  }
  private attackHeld() { return this.mouse.down || [...this.held.values()].includes('attack') || this.keys.has('j'); }

  // ───────────────────────── Stats ─────────────────────────
  private recalc() {
    const extra = this.buffs.flatMap((b) => b.mods);
    if (this.p.frenzy) extra.push({ stat: 'physDmg', mul: 0.35 }, { stat: 'spellDmg', mul: 0.35 }, { stat: 'attackSpeed', mul: 0.25 });
    this.stats = computeStats(this.cfg.state, extra, this.cfg.state.heir, this.p.form ?? undefined);
    this.statsDirty = false;
  }
  private addBuff(b: Buff) {
    const ex = this.buffs.find((x) => x.id === b.id);
    if (ex) { ex.t = Math.max(ex.t, b.t); ex.mods = b.mods; } else this.buffs.push(b);
    this.statsDirty = true;
  }

  // ───────────────────────── Main loop ─────────────────────────
  private frame = (now: number) => {
    if (!this.running) return;
    let dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    if (this.paused) dt = 0;
    if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.08; }
    if (dt > 0) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.time += dt;
    if (this.statsDirty) this.recalc();
    const p = this.p, st = this.stats;
    p.t += dt;
    for (const b of this.buffs) b.t -= dt;
    if (this.buffs.some((b) => b.t <= 0)) { this.buffs = this.buffs.filter((b) => b.t > 0); this.statsDirty = true; }

    if (p.hp <= 0) {
      this.deathT += dt;
      if (this.deathT > 1.8 && !this.finished) { this.finished = true; this.flushMastery(); this.cfg.onEvent({ type: 'death', cause: this.lastHitBy }); }
      this.updateParticles(dt);
      return;
    }

    // Movement input
    let mx = 0, my = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    if (this.stick.active) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, d = Math.hypot(dx, dy);
      if (d > 8) { mx = dx / 60; my = dy / 60; }
    }
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    p.moving = ml > 0.1;

    // Timers
    p.attackCd -= dt; p.dashCd -= dt; p.iframes -= dt; p.flash -= dt; p.formCd -= dt; p.bloodShieldCd -= dt; p.comboT -= dt;
    if (p.comboT <= 0) p.combo = 0;
    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo) { if (this.combo > this.maxCombo) this.maxCombo = this.combo; this.combo = 0; }
    for (const a of this.abilities) if (a) a.cd = Math.max(0, a.cd - dt * st.cooldownRate);
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }

    // Form
    if (p.form) {
      const f = FORM_BY_ID[p.form];
      p.formT -= dt;
      p.blood -= f.upkeep * dt;
      if ((f.duration && p.formT <= 0) || p.blood <= 0) this.endForm();
    }

    // Hunger
    const hunger = 0.32 * st.hungerRate;
    p.blood = Math.max(0, p.blood - hunger * dt);
    if (p.blood <= 0.5) {
      p.starveT += dt;
      if (p.starveT > 6 && !p.frenzy) {
        p.frenzy = true; this.statsDirty = true;
        this.say('FRENZY — feed, or burn!', '#ff2040', true);
        audio.play('heartbeat');
        this.cfg.onEvent({ type: 'frenzy' });
      }
    } else { p.starveT = 0; if (p.frenzy && p.blood > 10) { p.frenzy = false; this.statsDirty = true; } }
    if (p.frenzy) { p.hp -= st.maxHp * 0.015 * dt; if (Math.floor(this.time * 1.2) !== Math.floor((this.time - dt) * 1.2)) audio.play('heartbeat'); }
    else if (p.starveT <= 0) p.hp = Math.min(st.maxHp, p.hp + st.hpRegen * dt);
    if (p.hp <= 0) { this.lastHitBy = 'the Hunger'; this.die(); return; }

    // Feeding
    if (p.feeding) {
      const e = this.enemies.find((x) => x.id === p.feeding!.id);
      p.feeding.t -= dt;
      if (!e || e.dead) p.feeding = null;
      else {
        e.ai = 'feeding'; e.vx = e.vy = 0;
        if (Math.random() < 0.7) { const a = Math.random() * 6.28; this.parts.push({ x: e.x + Math.cos(a) * 6, y: e.y - 14, vx: (p.x - e.x) * 2.2, vy: (p.y - 18 - e.y + 14) * 2.2, life: 0.45, max: 0.45, size: 2.5, color: '#d0102a', kind: 'blood' }); }
        if (p.feeding.t <= 0) this.finishFeed(e);
      }
    }

    // Dash / movement
    if (p.dashT > 0) {
      p.dashT -= dt;
      const sp = p.dashSpeed;
      this.moveEnt(p, Math.cos(p.dashDir) * sp * dt, Math.sin(p.dashDir) * sp * dt, false);
      if (Math.random() < 0.8) this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 14, color: this.p.form ? FORM_BY_ID[this.p.form].color : '#5a1020', kind: 'glow' });
      if (p.dashDmg > 0) for (const e of this.enemies) if (!e.dead && !p.dashHits.has(e.id) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 24) {
        p.dashHits.add(e.id);
        this.damageEnemy(e, p.dashDmg, this.abilityElement(p.dashAbility), { ability: p.dashAbility, status: p.dashStatus, knock: p.dashKnock, kx: Math.cos(p.dashDir), ky: Math.sin(p.dashDir) });
      }
      if (p.dashT <= 0 && this.effects.has('dash-nova')) this.novaAt(p.x, p.y, 70, this.weaponDmg * 1.2 * st.bloodDmg, 'blood', '#ff2a45');
    } else if (!p.feeding) {
      const sp = 150 * st.moveSpeed;
      this.moveEnt(p, mx * sp * dt, my * sp * dt, false);
    }

    // Aim & attack
    const target = this.autoTarget(this.weapon.ranged ? 460 : 220);
    if (this.mouse.active && !this.touch && !this.cfg.state.settings.autoAim) p.facing = Math.atan2(this.mouse.y - this.H / 2 - (p.y - this.camY) * 0 , this.mouse.x - this.W / 2);
    if (target && (this.attackHeld() || !p.moving)) p.facing = Math.atan2(target.y - p.y, target.x - p.x);
    else if (this.mouse.active && !this.touch) p.facing = Math.atan2(this.mouse.y - (this.H / 2 + (p.y - this.camY) * this.zoom), this.mouse.x - (this.W / 2 + (p.x - this.camX) * this.zoom));
    else if (p.moving) p.facing = Math.atan2(my, mx);
    if (this.attackHeld() && p.attackCd <= 0 && !p.feeding && p.dashT <= 0) this.attack();

    // Room activation
    const room = roomAt(this.floor, p.x, p.y);
    if (room && !room.activated) this.activateRoom(room);
    if (room) this.visited.add(room.id);

    // Sunlight
    let inSun = false;
    for (const s of this.floor.sun) { const r = s.r * (0.85 + Math.sin(this.time * 0.6 + s.phase) * 0.15); if (Math.hypot(p.x - s.x, p.y - s.y) < r) inSun = true; }
    if (inSun && !(p.form && FORM_BY_ID[p.form].flags.includes('flying') && false)) {
      const mult = (p.form === 'shadow' ? 2 : 1) * (this.effects.has('sun-ward') ? 0.4 : 1) * (1 - st.sunResist);
      if (mult > 0) {
        p.hp -= st.maxHp * 0.11 * mult * dt;
        p.sunT += dt;
        if (Math.random() < 0.5) this.parts.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y - 10 - Math.random() * 16, vx: 0, vy: -40, life: 0.7, max: 0.7, size: 5, color: 'rgba(200,190,170,0.5)', kind: 'smoke' });
        if (!this.sunHinted) { this.sunHinted = true; this.say('Sunlight burns! Stay in the shadows.', '#ffd080'); }
        if (p.hp <= 0) { this.lastHitBy = 'the Sun'; this.die(); return; }
      }
    }

    // Entities
    this.updateEnemies(dt);
    this.updateAllies(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateTelegraphs(dt);
    this.updateOrbits(dt);
    this.updateTethers(dt);
    this.updatePickups(dt);
    this.updateProps();
    this.updateParticles(dt);

    // Camera
    const lead = 34;
    const tx = p.x + Math.cos(p.facing) * lead * (p.moving ? 1 : 0.4), ty = p.y + Math.sin(p.facing) * lead * (p.moving ? 1 : 0.4) - 10;
    this.camX += (tx - this.camX) * Math.min(1, dt * 6);
    this.camY += (ty - this.camY) * Math.min(1, dt * 6);
    this.shake = Math.max(0, this.shake - dt * 30);
    for (const m of this.messages) m.t -= dt;
    this.messages = this.messages.filter((m) => m.t > 0);
    for (const m of this.lootFeed) m.t -= dt;
    this.lootFeed = this.lootFeed.filter((m) => m.t > 0);
    if (this.bossIntro > 0) this.bossIntro -= dt;
  }
  private lastHitBy = 'unknown wounds';

  // Collision with walls & solid props
  private moveEnt(e: { x: number; y: number; r: number }, dx: number, dy: number, phase: boolean) {
    const r = e.r * 0.8;
    const solid = (x: number, y: number) => isSolid(this.floor, x, y);
    const blocked = (x: number, y: number) => !phase && (solid(x - r, y) || solid(x + r, y) || solid(x, y - r) || solid(x, y + r * 0.6) || solid(x - r * 0.7, y - r * 0.7) || solid(x + r * 0.7, y - r * 0.7) || solid(x - r * 0.7, y + r * 0.5) || solid(x + r * 0.7, y + r * 0.5));
    if (!blocked(e.x + dx, e.y)) e.x += dx;
    if (!blocked(e.x, e.y + dy)) e.y += dy;
    if (!phase) for (const pr of this.floor.props) if (pr.kind === 'pillar' || pr.kind === 'statue') {
      const d = Math.hypot(e.x - pr.x, e.y - pr.y), min = e.r + 12;
      if (d < min && d > 0.01) { e.x = pr.x + ((e.x - pr.x) / d) * min; e.y = pr.y + ((e.y - pr.y) / d) * min; }
    }
  }

  private autoTarget(range: number): Enemy | null {
    if (!this.cfg.state.settings.autoAim && !this.touch) return null;
    let best: Enemy | null = null, bd = range;
    for (const e of this.enemies) {
      if (e.dead || e.ai === 'spawn' || e.alpha < 0.3 || e.charmT > 0) continue;
      const d = Math.hypot(e.x - this.p.x, e.y - this.p.y);
      if (d < bd && hasLOS(this.floor, this.p.x, this.p.y - 8, e.x, e.y - 8)) { bd = d; best = e; }
    }
    return best;
  }

  // ───────────────────────── Player actions ─────────────────────────
  private attack() {
    const p = this.p, st = this.stats, w = this.weapon;
    if (p.form && FORM_BY_ID[p.form].flags.includes('noAttack')) return;
    if (p.form === 'human') this.endForm();
    p.attackCd = w.speed / st.attackSpeed;
    p.combo = (p.combo % w.combo) + 1;
    p.comboT = 0.9;
    const finisher = p.combo === w.combo && w.combo > 1;
    const dmg = this.weaponDmg * w.mult * (this.weaponElement === 'blood' ? st.bloodDmg : st.physDmg) * (finisher ? 1.5 : 1);
    if (w.ranged) {
      audio.play('swing');
      const kind = w.ranged;
      this.projs.push({ x: p.x + Math.cos(p.facing) * 14, y: p.y - 12 + Math.sin(p.facing) * 14, vx: Math.cos(p.facing) * (kind === 'arrow' ? 760 : 470), vy: Math.sin(p.facing) * (kind === 'arrow' ? 760 : 470), r: kind === 'arrow' ? 5 : 8, dmg, element: this.weaponElement, team: 'p', pierce: kind === 'arrow' ? 1 : 0, life: 0.8, color: kind === 'arrow' ? '#e0d0b0' : ELEMENT_COLOR[this.weaponElement], homing: kind === 'orb' ? 0.15 : 0, hit: new Set(), trail: 0, kind, knock: w.knock });
      return;
    }
    audio.play('swing');
    const range = w.range * (p.form === 'wolf' || p.form === 'monarch' || p.form === 'ancient' ? 1.2 : 1);
    const arc = w.arc * (finisher ? 1.25 : 1);
    this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.16, max: 0.16, size: range, color: finisher ? '#ff4060' : '#f0e6e0', kind: 'slash', a: p.facing - arc / 2, a2: p.facing + arc / 2 });
    let hitAny = false;
    for (const e of this.enemies) {
      if (e.dead || e.ai === 'spawn' || e.charmT > 0) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      if (d > range + e.r) continue;
      let da = Math.atan2(dy, dx) - p.facing; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > arc / 2 + 0.25) continue;
      hitAny = true;
      this.damageEnemy(e, dmg, this.weaponElement, { knock: w.knock * (finisher ? 1.6 : 1), kx: dx / (d || 1), ky: dy / (d || 1), weapon: true });
    }
    // Break props & cracked walls
    const fx = p.x + Math.cos(p.facing) * range * 0.6, fy = p.y - 6 + Math.sin(p.facing) * range * 0.6;
    for (const pr of this.floor.props) if ((pr.kind === 'urn' || pr.kind === 'coffin') && (pr.hp ?? 0) > 0 && Math.hypot(pr.x - fx, pr.y - fy) < range * 0.7) this.breakProp(pr);
    this.tryBreakWall(fx, fy);
    this.tryBreakWall(p.x + Math.cos(p.facing) * (range * 0.95), p.y + Math.sin(p.facing) * (range * 0.95));
    if (hitAny && finisher) this.shake = Math.max(this.shake, 4);
  }

  private tryBreakWall(x: number, y: number) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.floor.w || ty >= this.floor.h) return;
    if (this.floor.tiles[ty * this.floor.w + tx] !== T_CRACKED) return;
    this.floor.tiles[ty * this.floor.w + tx] = T_FLOOR;
    this.fg.fillStyle = this.pal.floor; this.fg.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    this.fg.fillStyle = 'rgba(0,0,0,0.3)'; this.fg.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    for (let i = 0; i < 24; i++) this.parts.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, life: 0.8, max: 0.8, size: 3 + Math.random() * 3, color: this.pal.wallFace, kind: 'spark', grav: 400 });
    this.shake = 10; audio.play('kill'); audio.play('chest');
    this.say('A hidden passage!', '#c8b0ff', true);
  }

  private tryDash() {
    const p = this.p;
    if (p.dashCd > 0 || p.feeding || p.hp <= 0) return;
    let dir = p.facing;
    if (this.stick.active) { const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy; if (Math.hypot(dx, dy) > 8) dir = Math.atan2(dy, dx); }
    else {
      let mx = 0, my = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1; if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1; if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
      if (mx || my) dir = Math.atan2(my, mx);
    }
    p.dashDir = dir; p.dashT = 0.17; p.dashSpeed = 760; p.iframes = 0.28; p.dashCd = 0.75; p.dashDmg = 0; p.dashHits.clear();
    audio.play('dash');
    if (this.effects.has('shadow-step-dash')) this.addBuff({ id: 'shadowstep', mods: [{ stat: 'stealth', add: 0.8 }], t: 1.5, color: '#6040c0', name: 'Unseen' });
  }

  private tryFeed() {
    const p = this.p;
    if (p.feeding || p.dashT > 0) return;
    const range = p.frenzy ? 150 : 80;
    let best: Enemy | null = null, bd = range;
    for (const e of this.enemies) if (!e.dead && !e.boss && this.feedable(e)) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) bd = d, best = e; }
    if (!best) { audio.play('deny'); if (!this.feedHinted) { this.feedHinted = true; this.say('Weaken a foe below a quarter of its blood to feed.', '#d0a0a0'); } return; }
    if (bd > 40) { const a = Math.atan2(best.y - p.y, best.x - p.x); p.x = best.x - Math.cos(a) * 30; p.y = best.y - Math.sin(a) * 30; }
    p.feeding = { id: best.id, t: 0.85 };
    p.facing = Math.atan2(best.y - p.y, best.x - p.x);
    best.ai = 'feeding';
    audio.play('feed');
  }
  private feedable(e: Enemy) { return !e.boss && e.ai !== 'spawn' && (e.hp <= e.maxHp * 0.28 || ((e.status.stun || e.status.freeze) && e.hp <= e.maxHp * 0.5) || e.charmT > 0); }

  private finishFeed(e: Enemy) {
    const p = this.p, st = this.stats;
    const def = e.def as CreatureDef;
    const blood = (this.mods.bloodBoost && Math.random() < 0.25 ? this.mods.bloodBoost : def.blood) as BloodType;
    const gain = 16 * BLOOD_QUALITY[blood] * st.feedPower * (e.elite ? 1.6 : 1);
    p.blood = Math.min(st.maxBlood, p.blood + gain);
    p.hp = Math.min(st.maxHp, p.hp + st.maxHp * 0.09 * (blood === 'holy' ? 0.5 : 1));
    if (blood === 'holy') { p.hp -= st.maxHp * 0.05; this.say('Holy blood sears your throat.', '#fff0a0'); }
    p.feeding = null;
    const res = RESONANCE[blood];
    this.addBuff({ id: 'resonance', mods: res.mods, t: 20, color: '#ff4060', name: res.name });
    if (this.effects.has('feeding-frenzy')) this.addBuff({ id: 'ff', mods: [{ stat: 'attackSpeed', mul: 0.3 }], t: 6, color: '#ff8060', name: 'Feeding Frenzy' });
    if (p.frenzy) { p.frenzy = false; this.statsDirty = true; this.say('The frenzy ebbs.', '#ff8090'); }
    this.float(p.x, p.y - 44, `+${Math.round(gain)} ${blood} blood`, '#ff4060', 1.2);
    this.say(res.name, '#ff6080');
    this.cfg.onEvent({ type: 'feed', blood });
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28; this.parts.push({ x: p.x, y: p.y - 14, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.6, max: 0.6, size: 3, color: '#ff2040', kind: 'spark' }); }
    this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 70, color: '#ff2040', kind: 'ring' });
    this.killEnemy(e, true);
  }

  private toggleForm() {
    const p = this.p, heir = this.cfg.state.heir;
    if (p.form) { this.endForm(); return; }
    const f = FORM_BY_ID[heir.form];
    if (!f || !formAvailable(heir, f)) { audio.play('deny'); return; }
    if (p.formCd > 0) { audio.play('deny'); return; }
    if (p.blood < 8 && f.upkeep > 0) { audio.play('deny'); this.say('Not enough blood.', '#ff6070'); return; }
    p.form = f.id; p.formT = f.duration || 9999; this.statsDirty = true;
    audio.play('blood'); audio.play('cast');
    this.shake = 6;
    this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 90, color: f.color, kind: 'ring' });
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28; this.parts.push({ x: p.x, y: p.y - 12, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, max: 0.6, size: 4, color: f.color, kind: 'smoke' }); }
    this.say(f.name, f.color, true);
    this.cfg.onEvent({ type: 'transform', form: f.id });
  }
  private endForm() {
    const p = this.p;
    if (!p.form) return;
    const f = FORM_BY_ID[p.form];
    p.formCd = f.cooldown; p.form = null; this.statsDirty = true;
    for (let i = 0; i < 20; i++) { const a = Math.random() * 6.28; this.parts.push({ x: p.x, y: p.y - 12, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.5, max: 0.5, size: 5, color: f.color, kind: 'smoke' }); }
  }

  private usePotion(i: number) {
    const heir = this.cfg.state.heir;
    const id = heir.belt[i];
    if (!id) return;
    const have = this.cfg.state.consumables[id] ?? 0;
    if (have <= 0) { audio.play('deny'); this.say('None left.', '#a08080'); return; }
    const t = ITEM_BY_ID[id];
    if (!t?.use) return;
    this.cfg.onEvent({ type: 'consumeBelt', id });
    const u = t.use, st = this.stats;
    if (u.heal) this.p.hp = Math.min(st.maxHp, this.p.hp + u.heal * (st.maxHp / 140 + 0.4));
    if (u.blood) this.p.blood = Math.min(st.maxBlood, this.p.blood + u.blood);
    if (u.cleanse) { this.p.frenzy = false; this.statsDirty = true; }
    if (u.buff && u.duration) this.addBuff({ id: `pot-${id}`, mods: u.buff, t: Math.min(u.duration, 120), color: '#80ff80', name: t.name });
    audio.play('pickup');
    this.say(t.name, '#a0ffa0');
  }

  // ───────────────────────── Abilities ─────────────────────────
  private abilityElement(id: string): Element { return this.abilities.find((a) => a?.def.id === id)?.element ?? 'physical'; }

  private cast(i: number) {
    const slot = this.abilities[i];
    const p = this.p, st = this.stats;
    if (!slot || p.hp <= 0 || p.feeding) return;
    if (p.form && FORM_BY_ID[p.form].flags.includes('noAttack')) { audio.play('deny'); return; }
    if (slot.cd > 0) { audio.play('deny'); return; }
    const pr = slot.params;
    const cost = (pr.cost ?? 0) * st.costMult * (p.form === 'wolf' && slot.def.school !== 'physical' ? 1.5 : 1);
    if (p.blood < cost) { audio.play('deny'); this.say('Not enough blood!', '#ff4060'); return; }
    if (p.form === 'human') this.endForm();
    p.blood -= cost;
    slot.cd = pr.cooldown ?? 1;
    const def = slot.def, heir = this.cfg.state.heir;
    const lvl = masteryLevel(heir, def.id);
    const elemMult = slot.element === 'blood' ? st.bloodDmg : slot.element === 'physical' ? st.physDmg : st.spellDmg;
    const dmg = (pr.damage ?? 0) * (1 + (st[def.scaling.stat] ?? 0) * def.scaling.perPoint) * (1 + def.scaling.masteryDamage * (lvl - 1)) * elemMult;
    const color = ELEMENT_COLOR[slot.element] ?? def.color;
    const tgt = this.autoTarget(Math.max(260, pr.range ?? 260));
    const aim = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.facing;
    p.facing = aim;
    this.gainMastery(def.id, 1);
    const sfx = slot.element === 'fire' ? 'fire' : slot.element === 'frost' ? 'frost' : slot.element === 'storm' ? 'thunder' : slot.element === 'blood' ? 'blood' : 'cast';
    audio.play(sfx);
    const status = pr.status;
    const ab = def.id;
    switch (def.kind) {
      case 'projectile': {
        const n = (pr.count ?? 1) + (this.effects.has('extra-projectile') ? 1 : 0);
        const spread = pr.spread ?? 0.15;
        for (let k = 0; k < n; k++) {
          const a = aim + (k - (n - 1) / 2) * spread;
          const sp = pr.speed ?? 500;
          this.projs.push({ x: p.x + Math.cos(a) * 14, y: p.y - 14 + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7, dmg, element: slot.element, team: 'p', pierce: pr.pierce ?? 0, life: (pr.range ?? 420) / sp, color, homing: pr.homing ?? 0, status, hit: new Set(), ability: ab, lifesteal: pr.lifesteal, trail: 0, kind: slot.element === 'blood' ? 'spear' : 'bolt', knock: pr.knockback });
        }
        break;
      }
      case 'nova':
        this.novaAt(p.x, p.y, pr.radius ?? 120, dmg, slot.element, color, { status, ability: ab, knock: pr.knockback ?? 80, lifesteal: pr.lifesteal });
        this.shake = Math.max(this.shake, 7);
        break;
      case 'cone': {
        const range = pr.range ?? 150, arc = pr.radius ?? 1.2;
        this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.3, max: 0.3, size: range, color, kind: 'slash', a: aim - arc / 2, a2: aim + arc / 2 });
        for (let k = 0; k < 26; k++) { const a = aim + (Math.random() - 0.5) * arc, sp = range * (2 + Math.random() * 2); this.parts.push({ x: p.x, y: p.y - 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, size: 4 + Math.random() * 5, color, kind: 'glow' }); }
        for (const e of this.enemies) {
          if (e.dead || e.charmT > 0) continue;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
          if (d > range + e.r) continue;
          let da = Math.atan2(dy, dx) - aim; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > arc / 2 + 0.2) continue;
          this.damageEnemy(e, dmg, slot.element, { status, ability: ab, knock: pr.knockback ?? 60, kx: dx / (d || 1), ky: dy / (d || 1), lifesteal: pr.lifesteal });
        }
        this.shake = Math.max(this.shake, 5);
        break;
      }
      case 'dash':
        p.dashDir = aim; p.dashT = Math.min(0.32, (pr.range ?? 220) / 900); p.dashSpeed = (pr.range ?? 220) / p.dashT; p.iframes = p.dashT + 0.1;
        p.dashDmg = dmg; p.dashHits.clear(); p.dashAbility = ab; p.dashStatus = status; p.dashKnock = pr.knockback ?? 100;
        break;
      case 'blink': {
        const range = pr.range ?? 240;
        let tx = tgt ? tgt.x - Math.cos(aim) * 26 : p.x + Math.cos(aim) * range, ty = tgt ? tgt.y - Math.sin(aim) * 26 : p.y + Math.sin(aim) * range;
        const d = Math.hypot(tx - p.x, ty - p.y);
        if (d > range) { tx = p.x + Math.cos(aim) * range; ty = p.y + Math.sin(aim) * range; }
        let steps = 20;
        while (isSolid(this.floor, tx, ty) && steps-- > 0) { tx -= Math.cos(aim) * 12; ty -= Math.sin(aim) * 12; }
        for (let k = 0; k < 24; k++) this.parts.push({ x: p.x, y: p.y - 12, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.5, max: 0.5, size: 6, color, kind: 'smoke' });
        p.x = tx; p.y = ty; p.iframes = 0.35;
        this.novaAt(tx, ty, pr.radius ?? 80, dmg, slot.element, color, { status, ability: ab, knock: 90 });
        break;
      }
      case 'zone': {
        const atSelf = !pr.range;
        const zx = atSelf ? p.x : tgt ? tgt.x : p.x + Math.cos(aim) * Math.min(pr.range ?? 280, 200);
        const zy = atSelf ? p.y : tgt ? tgt.y : p.y + Math.sin(aim) * Math.min(pr.range ?? 280, 200);
        this.zones.push({ x: zx, y: zy, r: pr.radius ?? 110, dmg, tick: pr.tick ?? 0.5, timer: 0, life: pr.duration ?? 4, maxLife: pr.duration ?? 4, element: slot.element, team: 'p', status, color, pull: pr.knockback && pr.knockback < 0 ? -pr.knockback : 0, lifesteal: pr.lifesteal, follow: atSelf, ability: ab });
        break;
      }
      case 'chain': {
        let from = { x: p.x, y: p.y - 14 };
        const hit = new Set<number>();
        const n = pr.count ?? 3;
        for (let k = 0; k < n; k++) {
          let best: Enemy | null = null, bd = pr.range ?? 230;
          for (const e of this.enemies) if (!e.dead && !hit.has(e.id) && e.charmT <= 0 && e.ai !== 'spawn') { const d = Math.hypot(e.x - from.x, e.y - from.y); if (d < bd) bd = d, best = e; }
          if (!best) break;
          hit.add(best.id);
          this.parts.push({ x: from.x, y: from.y, x2: best.x, y2: best.y - 12, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 3, color, kind: 'bolt' });
          this.damageEnemy(best, dmg * (1 - k * 0.06), slot.element, { status, ability: ab, knock: 30 });
          from = { x: best.x, y: best.y - 12 };
        }
        if (!hit.size) { slot.cd = 0.3; p.blood += cost; }
        break;
      }
      case 'summon': {
        const n = pr.count ?? 2;
        this.allies = this.allies.filter((a) => a.kind !== pr.minion || a.life > 0);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          this.spawnAlly(pr.minion ?? 'bat', p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, dmg || 10, pr.duration ?? 10, color);
        }
        break;
      }
      case 'shield': {
        p.shield = Math.max(p.shield, (pr.absorb ?? 40) * (1 + st.mag * 0.02 + st.end * 0.01)); p.shieldT = pr.duration ?? 6;
        if (pr.mods) this.addBuff({ id: ab, mods: pr.mods, t: pr.duration ?? 6, color, name: slot.name });
        audio.play('shield');
        this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 40, color, kind: 'ring' });
        break;
      }
      case 'buff':
        this.addBuff({ id: ab, mods: pr.mods ?? [], t: pr.duration ?? 6, color, name: slot.name });
        this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 60, color, kind: 'ring' });
        for (let k = 0; k < 30; k++) { const a = Math.random() * 6.28; this.parts.push({ x: p.x + Math.cos(a) * 20, y: p.y - 10, vx: 0, vy: -60 - Math.random() * 60, life: 0.8, max: 0.8, size: 3, color, kind: 'spark' }); }
        break;
      case 'drain': {
        const n = pr.count ?? 1;
        const near = this.enemies.filter((e) => !e.dead && e.charmT <= 0 && e.ai !== 'spawn' && Math.hypot(e.x - p.x, e.y - p.y) < (pr.range ?? 220)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, n);
        if (!near.length) { slot.cd = 0.3; p.blood += cost; audio.play('deny'); break; }
        for (const e of near) this.tethers.push({ target: e.id, dmg, life: pr.duration ?? 2.5, lifesteal: pr.lifesteal ?? 0.5, color, ability: ab });
        break;
      }
      case 'orbit':
        this.orbits.push({ count: pr.count ?? 3, r: pr.radius ?? 70, dmg, life: pr.duration ?? 8, color, element: slot.element, ang: 0, hitCd: new Map(), ability: ab, status });
        break;
      case 'transform':
        this.toggleForm();
        break;
    }
  }

  private novaAt(x: number, y: number, r: number, dmg: number, element: Element, color: string, o: { status?: StatusApply[]; ability?: string; knock?: number; lifesteal?: number } = {}) {
    this.parts.push({ x, y: y - 10, vx: 0, vy: 0, life: 0.45, max: 0.45, size: r, color, kind: 'ring' });
    this.parts.push({ x, y: y - 10, vx: 0, vy: 0, life: 0.25, max: 0.25, size: r * 0.9, color, kind: 'glow' });
    for (let k = 0; k < 36; k++) { const a = (k / 36) * 6.28; this.parts.push({ x, y: y - 10, vx: Math.cos(a) * r * 3, vy: Math.sin(a) * r * 3, life: 0.3, max: 0.3, size: 4, color, kind: 'spark' }); }
    for (const e of this.enemies) {
      if (e.dead || e.charmT > 0 || e.ai === 'spawn') continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= r + e.r) this.damageEnemy(e, dmg, element, { status: o.status, ability: o.ability, knock: o.knock ?? 60, kx: (e.x - x) / (d || 1), ky: (e.y - y) / (d || 1), lifesteal: o.lifesteal });
    }
  }

  private spawnAlly(kind: string, x: number, y: number, dmg: number, life: number, color: string) {
    const look: Record<string, Pick<Ally, 'shape' | 'color' | 'accent' | 'r'>> = {
      bat: { shape: 'flyer', color: '#4a1020', accent: '#ff3050', r: 8 }, ghoul: { shape: 'humanoid', color: '#5a6a4a', accent: '#c0ff80', r: 11 },
      spirit: { shape: 'wisp', color: '#5fd8c0', accent: '#e0fff8', r: 9 }, shade: { shape: 'player', color: '#1a1030', accent: '#6040c0', r: 11 },
      golem: { shape: 'humanoid', color: '#8a1020', accent: '#ff5060', r: 18 }, wolf: { shape: 'beast', color: '#6a6a78', accent: '#c0d0ff', r: 12 },
      skeleton: { shape: 'humanoid', color: '#c8c0a8', accent: '#80ffe0', r: 10 }, mirror: { shape: 'player', color: '#8090b0', accent: '#d8e0ff', r: 11 },
    };
    const l = look[kind] ?? look.bat;
    this.allies.push({ id: NEXT_ID++, x, y, vx: 0, vy: 0, r: l.r, hp: 40, maxHp: 40, facing: 0, t: Math.random() * 3, flash: 0, status: {}, dead: false, kind, dmg, life, cd: 0, color: l.color, accent: l.accent, shape: l.shape });
    for (let k = 0; k < 12; k++) this.parts.push({ x, y: y - 8, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.5, max: 0.5, size: 5, color, kind: 'smoke' });
  }

  private gainMastery(id: string, n: number) { this.masteryAcc[id] = (this.masteryAcc[id] ?? 0) + n; }
  private flushMastery() { for (const [ability, amount] of Object.entries(this.masteryAcc)) if (amount) this.cfg.onEvent({ type: 'mastery', ability, amount }); this.masteryAcc = {}; }

  // ───────────────────────── Damage ─────────────────────────
  private damageEnemy(e: Enemy, base: number, element: Element, o: { status?: StatusApply[]; ability?: string; knock?: number; kx?: number; ky?: number; lifesteal?: number; weapon?: boolean; noCrit?: boolean } = {}) {
    if (e.dead) return;
    const st = this.stats;
    const def = e.def;
    let mult = 1;
    if (def.weak.includes(element)) mult *= 1.5;
    if (def.resist.includes(element)) mult *= 0.5;
    if (e.status.curse) mult *= 1.25;
    if (e.elite && element === 'holy') mult *= 1;
    const stealthBonus = !e.aware && st.stealth > 0.2 ? 1.5 : 1;
    const crit = !o.noCrit && Math.random() < st.critChance + (stealthBonus > 1 ? 0.3 : 0);
    let dmg = base * mult * stealthBonus * (crit ? st.critMult : 1) * (1 - armorReduction(e.armor)) * (0.92 + Math.random() * 0.16);
    dmg = Math.max(1, dmg);
    e.hp -= dmg;
    e.flash = 0.1;
    e.aware = true;
    if (e.ai === 'idle') e.ai = 'move';
    const color = crit ? '#ffd040' : mult > 1 ? '#ff9050' : mult < 1 ? '#9090a0' : '#ffffff';
    if (this.cfg.state.settings.damageNumbers) this.float(e.x + (Math.random() - 0.5) * 14, e.y - e.r * 2 - 6, `${Math.round(dmg)}${crit ? '!' : ''}`, color, crit ? 1.35 : 1);
    if (o.knock && !e.boss) { const k = o.knock / Math.max(1, e.r / 12); e.vx += (o.kx ?? 0) * k * 3; e.vy += (o.ky ?? 0) * k * 3; }
    // Blood spray + decal
    const fam = (def as CreatureDef).family;
    const bc = fam === 'undead' || fam === 'construct' ? '#a8a090' : fam === 'spirit' ? '#90ffe8' : fam === 'demon' ? '#ff6020' : fam === 'aberration' ? '#a060ff' : '#b00a20';
    for (let k = 0; k < (crit ? 10 : 5); k++) this.parts.push({ x: e.x, y: e.y - e.r, vx: (o.kx ?? Math.random() - 0.5) * 140 + (Math.random() - 0.5) * 140, vy: (o.ky ?? Math.random() - 0.5) * 140 + (Math.random() - 0.5) * 140 - 60, life: 0.5, max: 0.5, size: 2 + Math.random() * 2.5, color: bc, kind: 'blood', grav: 420 });
    if (Math.random() < 0.35) this.decal(e.x + (Math.random() - 0.5) * 20, e.y + (Math.random() - 0.5) * 12, 3 + Math.random() * 6, bc);
    audio.play(crit ? 'crit' : 'hit', 0.6);
    if (crit) { this.hitstop = Math.max(this.hitstop, 0.045); this.shake = Math.max(this.shake, 3); }
    // Lifesteal
    const ls = st.lifesteal + (o.lifesteal ?? 0);
    if (ls > 0) this.p.hp = Math.min(st.maxHp, this.p.hp + dmg * ls);
    if (o.ability) this.gainMastery(o.ability, 0.25);
    // Statuses
    for (const s of o.status ?? []) if (Math.random() < s.chance) this.applyStatus(e, s.id, s.duration * st.statusPower, s.power ?? 0);
    if (o.weapon || o.ability) this.onHitEffects(e, crit, dmg);
    // Combo
    this.combo++; this.comboT = 2.2;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (e.hp <= 0) this.killEnemy(e, false);
  }

  private onHitEffects(e: Enemy, crit: boolean, dmg: number) {
    const fx = this.effects;
    const roll = (c: number) => Math.random() < c;
    if (fx.has('bleed-on-hit') && roll(0.25)) this.applyStatus(e, 'bleed', 3, 5);
    if (fx.has('burn-on-hit') && roll(0.25)) this.applyStatus(e, 'burn', 3, 6);
    if (fx.has('chill-on-hit') && roll(0.3)) this.applyStatus(e, 'chill', 2.5, 0);
    if (fx.has('shock-on-hit') && roll(0.2)) this.applyStatus(e, 'shock', 3, 0);
    if (fx.has('poison-on-hit')) this.applyStatus(e, 'poison', 4, 3);
    if (fx.has('curse-on-hit') && roll(0.15)) this.applyStatus(e, 'curse', 4, 0);
    if (fx.has('crit-bleed') && crit) this.applyStatus(e, 'bleed', 4, 7);
    if (fx.has('summon-bats-on-hit') && roll(0.08) && this.allies.length < 10) this.spawnAlly('bat', this.p.x, this.p.y, 8, 8, '#ff3050');
    if (e.status.shock && roll(0.5)) {
      const near = this.enemies.find((o) => o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 140);
      if (near) { this.parts.push({ x: e.x, y: e.y - 12, x2: near.x, y2: near.y - 12, vx: 0, vy: 0, life: 0.2, max: 0.2, size: 2, color: '#b4d4ff', kind: 'bolt' }); near.hp -= dmg * 0.4; near.flash = 0.08; if (near.hp <= 0) this.killEnemy(near, false); }
    }
  }

  private applyStatus(e: Ent, id: StatusId, dur: number, power: number) {
    const en = e as Enemy;
    if (en.boss && (id === 'stun' || id === 'freeze' || id === 'charm' || id === 'fear')) dur *= 0.25;
    if (id === 'charm' && en.boss) return;
    const cur = e.status[id];
    if (id === 'poison' && cur) { cur.t = Math.max(cur.t, dur); cur.power = Math.min(cur.power + power, power * 5); return; }
    e.status[id] = { t: Math.max(cur?.t ?? 0, dur), power: Math.max(cur?.power ?? 0, power) };
    if (id === 'charm' && !en.boss) en.charmT = dur;
  }

  private killEnemy(e: Enemy, fed: boolean) {
    if (e.dead) return;
    e.dead = true;
    const st = this.stats;
    this.hitstop = Math.max(this.hitstop, e.boss ? 0.4 : e.elite ? 0.09 : 0.03);
    this.shake = Math.max(this.shake, e.boss ? 22 : e.elite ? 9 : 3);
    audio.play('kill');
    const fam = (e.def as CreatureDef).family ?? 'vampire';
    const bc = fam === 'undead' || fam === 'construct' ? '#a8a090' : fam === 'spirit' ? '#90ffe8' : '#b00a20';
    for (let k = 0; k < 22; k++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 200; this.parts.push({ x: e.x, y: e.y - e.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.7, max: 0.7, size: 2 + Math.random() * 3, color: bc, kind: 'blood', grav: 500 }); }
    this.decal(e.x, e.y + 2, e.r * 0.9, bc);
    for (let k = 0; k < 4; k++) this.decal(e.x + (Math.random() - 0.5) * e.r * 3, e.y + (Math.random() - 0.5) * e.r * 2, 2 + Math.random() * 4, bc);
    if (e.clone || e.spawnedBy !== undefined) { if (e.spawnedBy !== undefined) { const s = this.enemies.find((x) => x.id === e.spawnedBy); if (s) s.summoned--; } if (e.clone) return; }
    if (this.effects.has('lifesteal-burst')) this.p.hp = Math.min(st.maxHp, this.p.hp + st.maxHp * 0.06);
    if (this.effects.has('kill-blood')) this.p.blood = Math.min(st.maxBlood, this.p.blood + 3);
    if (this.effects.has('cooldown-on-kill')) for (const a of this.abilities) if (a) a.cd = Math.max(0, a.cd - 0.5);
    if (e.boss) { this.onBossKilled(e); return; }
    const def = e.def as CreatureDef;
    const xp = def.xp * (1 + (this.level - 1) * 0.35) * (e.elite ? 2.5 : 1) * this.mods.xp;
    this.cfg.onEvent({ type: 'kill', creature: def.id, family: def.family, elite: e.elite, xp, tags: [...def.tags, def.family, ...(e.elite ? ['elite'] : [])] });
    if (!fed) this.dropLoot(e);
    else if (Math.random() < 0.5) this.dropLoot(e);
  }

  private dropLoot(e: Enemy) {
    const st = this.stats, rng = this.rng;
    const def = e.def as CreatureDef;
    if (Math.random() < 0.55 || e.elite) {
      const amt = Math.round((2 + Math.random() * 4) * (1 + this.level * 0.6) * st.goldFind * this.mods.gold * (e.elite ? 4 : 1));
      this.spawnPickup(e.x, e.y, 'gold', amt);
    }
    for (const d of def.drops) if (Math.random() < d.chance * (e.elite ? 1.8 : 1) * Math.min(2, st.lootLuck)) this.spawnPickup(e.x, e.y, 'material', 1, d.id);
    if (Math.random() < (e.elite ? 0.35 : 0.028) * st.lootLuck) this.spawnPickup(e.x, e.y, 'item', 1, undefined, rollEquipment(rng, this.level, st.lootLuck, e.elite ? 'uncommon' : 'common'));
    if (Math.random() < 0.035) this.spawnPickup(e.x, e.y, 'consumable', 1, Math.random() < 0.6 ? 'potion-crimson' : 'potion-vitae');
  }

  private spawnPickup(x: number, y: number, kind: Pickup['kind'], amount: number, id?: string, item?: Pickup['item']) {
    const a = Math.random() * 6.28, sp = 60 + Math.random() * 100;
    const color = kind === 'gold' ? '#ffd050' : kind === 'item' ? RARITY_COLOR[item!.rarity] : kind === 'consumable' ? '#ff6080' : '#b0d0ff';
    this.pickups.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, amount, id, item, t: 0, color });
  }

  private damagePlayer(dmg: number, element: Element, source: string) {
    const p = this.p, st = this.stats;
    if (p.hp <= 0 || p.iframes > 0) return;
    if (p.form === 'mist' && element === 'physical') return;
    let d = dmg * (1 - armorReduction(st.armor)) * (1 - (st[`res_${element}`] ?? 0));
    if (p.form === 'bat') d *= 1.25;
    if (p.form === 'wraith' && element === 'holy') d *= 2;
    if (p.form === 'ember' && element === 'frost') d *= 2;
    if (p.feeding) d *= 0.5;
    if (p.starveT > 0) d *= 1.2;
    d *= 0.9 + Math.random() * 0.2;
    if (p.shield > 0) { const ab = Math.min(p.shield, d); p.shield -= ab; d -= ab; this.parts.push({ x: p.x, y: p.y - 12, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 26, color: '#ff8090', kind: 'ring' }); }
    if (d <= 0) return;
    p.hp -= d;
    p.dmgTaken += d;
    p.flash = 0.12;
    p.iframes = 0.18;
    this.lastHitBy = source;
    this.shake = Math.max(this.shake, Math.min(14, 4 + (d / st.maxHp) * 40));
    audio.play('hurt');
    this.float(p.x, p.y - 40, `-${Math.round(d)}`, '#ff5050', 1.1);
    for (let k = 0; k < 8; k++) this.parts.push({ x: p.x, y: p.y - 12, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200 - 60, life: 0.5, max: 0.5, size: 2.5, color: '#8a0018', kind: 'blood', grav: 400 });
    if (this.effects.has('thorns') && source) for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r + 30) { e.hp -= d * 0.3; e.flash = 0.08; if (e.hp <= 0) this.killEnemy(e, false); }
    if (this.effects.has('blood-shield-on-low') && p.hp < st.maxHp * 0.3 && p.bloodShieldCd <= 0) { p.shield = st.maxHp * 0.25; p.shieldT = 5; p.bloodShieldCd = 30; this.say('Blood Shield!', '#ff4060'); audio.play('shield'); }
    if (p.hp <= 0) {
      if (this.effects.has('second-wind') && !p.secondWind) { p.secondWind = true; p.hp = st.maxHp * 0.3; p.iframes = 1.5; this.say('Second Wind!', '#ffd080', true); audio.play('levelup'); return; }
      this.die();
    }
  }

  private die() {
    const p = this.p;
    p.hp = 0; p.feeding = null;
    this.deathT = 0;
    this.say('TRUE DEATH… or torpor?', '#ff2040', true);
    audio.play('boss');
    this.hitstop = 0.5;
    for (let k = 0; k < 60; k++) { const a = Math.random() * 6.28, sp = Math.random() * 260; this.parts.push({ x: p.x, y: p.y - 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.4, max: 1.4, size: 3 + Math.random() * 4, color: Math.random() < 0.5 ? '#2a0a10' : '#b00a20', kind: 'smoke' }); }
  }

  // ───────────────────────── Rooms & spawning ─────────────────────────
  private activateRoom(room: Room) {
    room.activated = true;
    if (room.kind === 'boss') { this.spawnBoss(room); return; }
    if (room.kind === 'start' || room.kind === 'secret' || room.kind === 'shrine') return;
    const L = this.region;
    const count = Math.min(11, 2 + this.cfg.floor + Math.floor(this.rng() * 3) + (room.kind === 'exit' ? 2 : 0) + Math.floor(this.level / 3));
    const pool = L.enemies.map((id) => CREATURE_BY_ID[id]).filter(Boolean);
    for (let i = 0; i < count; i++) {
      const def = pick(this.rng, pool);
      const pt = this.randomPointIn(room);
      const elite = chance(this.rng, 0.05 + this.cfg.floor * 0.03 + this.level * 0.005);
      this.spawnEnemy(def, pt.x, pt.y, room.id, elite);
      if (def.behavior === 'swarm') for (let k = 0; k < 2; k++) this.spawnEnemy(def, pt.x + (Math.random() - 0.5) * 40, pt.y + (Math.random() - 0.5) * 40, room.id, false);
    }
    if (room.kind === 'exit' && this.cfg.floor === this.region.floors - 1) {
      const mb = CREATURE_BY_ID[L.miniboss];
      if (mb) { const pt = this.randomPointIn(room); this.spawnEnemy(mb, pt.x, pt.y, room.id, false, true); this.say(`${mb.name} guards the way down!`, '#ffa040', true); }
    }
  }

  private randomPointIn(room: Room) {
    for (let k = 0; k < 30; k++) {
      const x = (room.x + 1 + this.rng() * (room.w - 2)) * TILE, y = (room.y + 1 + this.rng() * (room.h - 2)) * TILE;
      if (!isSolid(this.floor, x, y) && Math.hypot(x - this.p.x, y - this.p.y) > 110) return { x, y };
    }
    return { x: (room.x + room.w / 2) * TILE, y: (room.y + room.h / 2) * TILE };
  }

  private spawnEnemy(def: CreatureDef, x: number, y: number, room: number, elite: boolean, mini = false, spawnedBy?: number): Enemy {
    const L = this.level, F = this.cfg.floor;
    const hpMul = (1 + 0.55 * (L - 1)) * (1 + 0.14 * (F - 1)) * this.mods.hp * (elite ? 2 : 1);
    const dmgMul = (1 + 0.27 * (L - 1)) * (1 + 0.07 * (F - 1)) * this.mods.dmg * (elite ? 1.3 : 1);
    const e: Enemy = {
      id: NEXT_ID++, x, y, vx: 0, vy: 0, r: def.look.size * (elite ? 1.2 : 1), hp: def.hp * hpMul, maxHp: def.hp * hpMul, facing: 0, t: Math.random() * 5, flash: 0, status: {}, dead: false,
      def, boss: false, behavior: def.behavior, dmg: def.damage * dmgMul, speed: def.speed * (0.9 + Math.random() * 0.2), armor: def.armor + L * 2,
      ai: 'spawn', timer: 0.6 + Math.random() * 0.4, cd: 1 + Math.random(), aware: false, room, elite: elite || mini, tx: x, ty: y, phase: 0, patternCd: 0, patternIdx: 0, summoned: 0,
      alpha: def.behavior === 'stalker' ? 0.08 : 1, charmT: 0, spawnedBy, xp: def.xp,
    };
    this.enemies.push(e);
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: e.r * 2.2, color: elite ? '#ffb040' : '#8a0020', kind: 'ring' });
    return e;
  }

  private spawnBoss(room: Room) {
    const id = (this.mods.bossOverride && this.isBoss ? this.mods.bossOverride : this.region.boss);
    const def = BOSS_BY_ID[id] ?? BOSS_BY_ID[this.region.boss];
    const L = this.level;
    const cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h * 0.4) * TILE;
    const bossLevel = Math.max(L, (BOSS_BY_ID[id] && id !== this.region.boss) ? L : L);
    const hpMul = (1 + 0.1 * (bossLevel - 1)) * this.mods.hp;
    const e: Enemy = {
      id: NEXT_ID++, x: cx, y: cy, vx: 0, vy: 0, r: def.look.size, hp: def.hp * hpMul, maxHp: def.hp * hpMul, facing: Math.PI / 2, t: 0, flash: 0, status: {}, dead: false,
      def, boss: true, behavior: 'boss', dmg: def.damage * (1 + 0.12 * (bossLevel - 1)) * this.mods.dmg, speed: def.speed, armor: def.armor,
      ai: 'spawn', timer: 2.2, cd: 0, aware: true, room: room.id, elite: true, tx: cx, ty: cy, phase: 0, patternCd: 2.5, patternIdx: 0, summoned: 0, alpha: 1, charmT: 0, xp: def.xp,
    };
    this.enemies.push(e);
    this.bossEnt = e;
    this.bossIntro = 3.2;
    audio.play('boss');
    this.shake = 16;
    this.say(def.name, '#ff3050', true);
    this.say(def.title, '#d8b8a0');
    this.say(`“${def.phases[0].line}”`, '#e0d0c0');
  }

  private onBossKilled(e: Enemy) {
    const def = e.def as BossDef;
    this.bossEnt = null;
    this.say(`${def.name} is destroyed!`, '#ffd040', true);
    audio.play('levelup');
    for (const x of this.enemies) if (!x.dead) { x.dead = true; this.decal(x.x, x.y, x.r, '#3a0010'); }
    const perfect = this.p.dmgTaken < this.stats.maxHp * 0.15;
    this.cfg.onEvent({ type: 'boss', boss: def.id, perfect, xp: def.xp * this.mods.xp });
    for (const d of def.drops) if (Math.random() < d.chance) {
      if (ITEM_BY_ID[d.id]) this.spawnPickup(e.x, e.y, 'item', 1, undefined, makeInstance(d.id, this.rng));
      else this.spawnPickup(e.x, e.y, 'material', 1 + Math.floor(Math.random() * 2), d.id);
    }
    for (let k = 0; k < 2; k++) this.spawnPickup(e.x, e.y, 'item', 1, undefined, rollEquipment(this.rng, this.level + 1, this.stats.lootLuck * 1.5, 'rare'));
    for (let k = 0; k < 6; k++) this.spawnPickup(e.x, e.y, 'gold', Math.round(30 * this.level * this.mods.gold));
    for (let k = 0; k < 3; k++) this.spawnPickup(e.x, e.y, 'material', 1, rollMaterial(this.rng, this.level + 2));
    // Exit portal appears
    this.floor.props.push({ kind: 'portal', x: e.x, y: e.y + 40, room: e.room });
  }

  // ───────────────────────── Enemy AI ─────────────────────────
  private updateEnemies(dt: number) {
    const p = this.p, st = this.stats;
    const awareR = 300 * (1 - st.stealth * 0.8) * (p.form === 'human' ? 0.3 : 1);
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt;
      // Status ticks
      let slow = 1;
      for (const [k, s] of Object.entries(e.status) as Array<[StatusId, StatusInst]>) {
        s.t -= dt;
        if (s.power && (k === 'bleed' || k === 'burn' || k === 'poison')) {
          e.hp -= s.power * dt * (1 + this.level * 0.25);
          if (Math.random() < dt * 6) this.parts.push({ x: e.x + (Math.random() - 0.5) * e.r, y: e.y - e.r, vx: 0, vy: k === 'burn' ? -50 : 20, life: 0.5, max: 0.5, size: 3, color: STATUS_COLOR[k]!, kind: k === 'burn' ? 'glow' : 'spark' });
        }
        if (s.t <= 0) delete e.status[k];
      }
      if (e.hp <= 0) { this.killEnemy(e, false); continue; }
      if (e.status.chill) slow *= 0.55;
      const stopped = !!(e.status.freeze || e.status.stun) || e.ai === 'feeding';
      if (e.charmT > 0) e.charmT -= dt;
      // Knockback decay
      if (Math.abs(e.vx) + Math.abs(e.vy) > 1) { this.moveEnt(e, e.vx * dt, e.vy * dt, e.behavior === 'phantom'); e.vx *= Math.pow(0.002, dt); e.vy *= Math.pow(0.002, dt); }
      if (e.ai === 'spawn') { e.timer -= dt; if (e.timer <= 0) e.ai = e.boss ? 'move' : 'idle'; continue; }
      if (stopped) continue;
      if (e.boss) { this.updateBoss(e, dt); continue; }

      const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
      if (!e.aware && dist < awareR && hasLOS(this.floor, e.x, e.y, p.x, p.y)) { e.aware = true; e.ai = 'move'; }
      if (!e.aware) { e.alpha = e.behavior === 'stalker' ? 0.08 : 1; continue; }
      if (p.hp <= 0) continue;

      // Target selection: charmed enemies fight other enemies; fear flees.
      let tx = p.x, ty = p.y, targetAlly: Ent | null = null;
      if (e.charmT > 0) {
        const foe = this.enemies.find((o) => o !== e && !o.dead && o.charmT <= 0 && Math.hypot(o.x - e.x, o.y - e.y) < 300);
        if (!foe) continue;
        tx = foe.x; ty = foe.y; targetAlly = foe;
      } else {
        const near = this.allies.find((a) => Math.hypot(a.x - e.x, a.y - e.y) < Math.min(dist, 140));
        if (near) { tx = near.x; ty = near.y; targetAlly = near; }
      }
      const tdx = tx - e.x, tdy = ty - e.y, td = Math.hypot(tdx, tdy) || 1;
      e.facing = Math.atan2(tdy, tdx);
      e.cd -= dt;
      const sp = e.speed * slow * (e.elite ? 1.08 : 1);
      if (e.status.fear) { this.moveEnt(e, (-tdx / td) * sp * dt, (-tdy / td) * sp * dt, false); continue; }
      const reach = e.r + 14 + 10;
      const moveTo = (mul = 1) => this.moveEnt(e, (tdx / td) * sp * mul * dt, (tdy / td) * sp * mul * dt, e.behavior === 'phantom');
      const keepAway = (want: number) => { if (td < want - 40) this.moveEnt(e, (-tdx / td) * sp * 0.8 * dt, (-tdy / td) * sp * 0.8 * dt, false); else if (td > want + 40 || !hasLOS(this.floor, e.x, e.y, tx, ty)) moveTo(); else { const s = Math.sin(e.t * 0.8 + e.id) > 0 ? 1 : -1; this.moveEnt(e, (-tdy / td) * sp * 0.5 * s * dt, (tdx / td) * sp * 0.5 * s * dt, false); } };
      const hitTarget = (dmg: number, range: number) => {
        if (targetAlly) { if (Math.hypot(targetAlly.x - e.x, targetAlly.y - e.y) < range + targetAlly.r) { targetAlly.hp -= dmg; targetAlly.flash = 0.1; if ((targetAlly as Enemy).boss === false && targetAlly.hp <= 0) this.killEnemy(targetAlly as Enemy, false); } }
        else if (Math.hypot(p.x - e.x, p.y - e.y) < range + p.r) this.damagePlayer(dmg, e.def.element, e.def.name);
      };

      if (e.behavior === 'stalker') e.alpha = td < 120 || e.ai === 'windup' ? Math.min(1, e.alpha + dt * 4) : Math.max(0.08, e.alpha - dt * 2);

      switch (e.ai) {
        case 'idle': case 'move': {
          switch (e.behavior) {
            case 'chaser': case 'stalker':
              if (td < reach && e.cd <= 0) { e.ai = 'windup'; e.timer = 0.32; } else moveTo();
              break;
            case 'swarm': {
              const wob = Math.sin(e.t * 9 + e.id) * 0.9;
              this.moveEnt(e, ((tdx / td) * Math.cos(wob) - (tdy / td) * Math.sin(wob)) * sp * dt, ((tdy / td) * Math.cos(wob) + (tdx / td) * Math.sin(wob)) * sp * dt, false);
              if (td < reach && e.cd <= 0) { hitTarget(e.dmg, reach); e.cd = 0.8; }
              break;
            }
            case 'brute':
              if (td < reach + 26 && e.cd <= 0) { e.ai = 'windup'; e.timer = 0.75; e.tele = { kind: 'circle', x: e.x + (tdx / td) * 26, y: e.y + (tdy / td) * 26, r: 62, a: 0, len: 0, t: 0, max: 0.75, dmg: e.dmg * 1.6, element: e.def.element, owner: e.id }; this.teles.push(e.tele); }
              else moveTo(0.85);
              break;
            case 'charger':
              if (td < 260 && e.cd <= 0 && hasLOS(this.floor, e.x, e.y, tx, ty)) { e.ai = 'windup'; e.timer = 0.6; e.tx = e.facing; e.tele = { kind: 'line', x: e.x, y: e.y, r: e.r, a: e.facing, len: 300, t: 0, max: 0.6, dmg: 0, element: e.def.element, owner: e.id }; this.teles.push(e.tele); }
              else if (td < reach && e.cd <= 0) { e.ai = 'windup'; e.timer = 0.3; }
              else moveTo();
              break;
            case 'archer':
              keepAway(230);
              if (e.cd <= 0 && td < 420 && hasLOS(this.floor, e.x, e.y, tx, ty)) { e.ai = 'windup'; e.timer = 0.4; }
              break;
            case 'caster':
              keepAway(250);
              if (e.cd <= 0 && td < 420) { e.ai = 'windup'; e.timer = 0.5; const tl: Telegraph = { kind: 'circle', x: tx, y: ty, r: 64, a: 0, len: 0, t: 0, max: 1.0, dmg: e.dmg * 1.4, element: e.def.element, owner: e.id }; this.teles.push(tl); e.cd = 3 + Math.random(); }
              break;
            case 'summoner':
              keepAway(270);
              if (e.cd <= 0 && e.summoned < 5) {
                e.ai = 'windup'; e.timer = 0.8;
              }
              break;
            case 'sentinel':
              if (e.cd <= 0 && td < 460 && hasLOS(this.floor, e.x, e.y, tx, ty)) { e.ai = 'windup'; e.timer = 0.45; }
              break;
            case 'phantom':
              if (td < reach && e.cd <= 0) { e.ai = 'windup'; e.timer = 0.3; }
              else if (e.cd <= -2.5 && td > 120) { e.ai = 'blink'; e.timer = 0.5; }
              else moveTo(0.9);
              break;
          }
          break;
        }
        case 'windup': {
          e.timer -= dt;
          if (e.timer > 0) break;
          e.ai = 'move';
          switch (e.behavior) {
            case 'chaser': case 'stalker': case 'phantom': case 'swarm':
              hitTarget(e.dmg, reach + 6); e.cd = 1.1; audio.play('swing', 0.5);
              this.parts.push({ x: e.x, y: e.y - e.r, vx: 0, vy: 0, life: 0.15, max: 0.15, size: reach, color: '#ff8080', kind: 'slash', a: e.facing - 0.8, a2: e.facing + 0.8 });
              if (e.behavior === 'stalker' && e.alpha < 0.5) { e.alpha = 1; }
              break;
            case 'brute': e.cd = 1.8; e.tele = undefined; break; // damage handled by telegraph
            case 'charger':
              if (e.tele) { e.ai = 'charge'; e.timer = 0.55; e.tele.done = true; e.tele = undefined; }
              else { hitTarget(e.dmg, reach + 6); e.cd = 1; }
              break;
            case 'archer': {
              const a = Math.atan2(ty - e.y, tx - e.x);
              this.enemyShot(e, a, 380, e.dmg, 'arrow');
              e.cd = 1.6 + Math.random() * 0.6;
              break;
            }
            case 'caster': this.parts.push({ x: e.x, y: e.y - e.r * 2, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 30, color: ELEMENT_COLOR[e.def.element], kind: 'ring' }); break;
            case 'summoner': {
              const r = this.region;
              const swarmDef = r.enemies.map((id) => CREATURE_BY_ID[id]).find((d) => d && d.behavior === 'swarm') ?? CREATURE_BY_ID[r.enemies[0]];
              for (let k = 0; k < 2; k++) { const s = this.spawnEnemy(swarmDef, e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, e.room, false, false, e.id); s.aware = true; e.summoned++; }
              e.cd = 6;
              break;
            }
            case 'sentinel': {
              const a = Math.atan2(ty - e.y, tx - e.x);
              for (let k = -1; k <= 1; k++) this.enemyShot(e, a + k * 0.22, 300, e.dmg * 0.8, 'bolt');
              e.cd = 2.1;
              break;
            }
          }
          break;
        }
        case 'charge': {
          e.timer -= dt;
          const a = e.tx;
          this.moveEnt(e, Math.cos(a) * sp * 3.4 * dt, Math.sin(a) * sp * 3.4 * dt, false);
          if (Math.random() < 0.6) this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 8, color: 'rgba(160,140,120,0.4)', kind: 'smoke' });
          if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 4) { this.damagePlayer(e.dmg * 1.4, e.def.element, e.def.name); e.timer = 0; }
          if (e.timer <= 0) { e.ai = 'recover'; e.timer = 0.7; e.cd = 2.2; }
          break;
        }
        case 'recover': e.timer -= dt; if (e.timer <= 0) e.ai = 'move'; break;
        case 'blink': {
          e.timer -= dt;
          e.alpha = Math.max(0, e.timer * 2);
          if (e.timer <= 0) {
            const a = Math.random() * 6.28;
            e.x = p.x + Math.cos(a) * 70; e.y = p.y + Math.sin(a) * 70;
            if (isSolid(this.floor, e.x, e.y)) { e.x = p.x - Math.cos(a) * 60; e.y = p.y - Math.sin(a) * 60; }
            e.alpha = 1; e.ai = 'windup'; e.timer = 0.45; e.cd = 0;
            for (let k = 0; k < 14; k++) this.parts.push({ x: e.x, y: e.y - 10, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.5, max: 0.5, size: 6, color: e.def.look.color, kind: 'smoke' });
          }
          break;
        }
      }
    }
    // Separation
    const alive = this.enemies.filter((e) => !e.dead);
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d < min && d > 0.01) { const push = (min - d) / 2; const bw = a.boss ? 0 : 1, cw = b.boss ? 0 : 1; a.x -= (dx / d) * push * bw; a.y -= (dy / d) * push * bw; b.x += (dx / d) * push * cw; b.y += (dy / d) * push * cw; }
    }
    if (this.enemies.length > 200) this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private enemyShot(e: Enemy, a: number, speed: number, dmg: number, kind: Proj['kind']) {
    this.projs.push({ x: e.x + Math.cos(a) * e.r, y: e.y - e.r + Math.sin(a) * e.r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: kind === 'arrow' ? 4 : 7, dmg, element: e.def.element, team: 'e', pierce: 0, life: 2.4, color: ELEMENT_COLOR[e.def.element], homing: 0, hit: new Set(), trail: 0, kind });
  }

  // ───────────────────────── Boss patterns ─────────────────────────
  private updateBoss(e: Enemy, dt: number) {
    const def = e.def as BossDef, p = this.p;
    // Phase changes
    const frac = e.hp / e.maxHp;
    const next = def.phases.findIndex((ph, i) => i > e.phase && frac <= ph.at);
    if (next > e.phase) {
      e.phase = next;
      const ph = def.phases[next];
      this.say(ph.name, '#ff3050', true);
      this.say(`“${ph.line}”`, '#e0d0c0');
      audio.play('boss'); this.shake = 18; this.hitstop = 0.2;
      this.parts.push({ x: e.x, y: e.y - e.r, vx: 0, vy: 0, life: 0.8, max: 0.8, size: 260, color: def.look.accent, kind: 'ring' });
      e.patternCd = 1.4; e.patternIdx = 0;
      for (const x of this.projs) if (x.team === 'e') x.life = 0;
    }
    const ph = def.phases[e.phase];
    const sp = e.speed * ph.speedMul * (e.status.chill ? 0.6 : 1);
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    e.facing = Math.atan2(dy, dx);
    if (e.ai === 'charge') {
      e.timer -= dt;
      this.moveEnt(e, Math.cos(e.tx) * sp * 4.2 * dt, Math.sin(e.tx) * sp * 4.2 * dt, false);
      if (Math.random() < 0.8) this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 16, color: hexA(def.look.color, 0.4), kind: 'smoke' });
      if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r) this.damagePlayer(e.dmg * 1.5, def.element, def.name);
      if (e.timer <= 0) { e.ai = 'recover'; e.timer = 0.9; this.shake = 8; }
      return;
    }
    if (e.ai === 'recover') { e.timer -= dt; if (e.timer <= 0) e.ai = 'move'; return; }
    if (e.ai === 'blink') {
      e.timer -= dt; e.alpha = Math.max(0, Math.min(1, Math.abs(e.timer - 0.35) * 3));
      if (e.timer <= 0.35 && e.tx !== -1) { const a = Math.random() * 6.28; e.x = p.x + Math.cos(a) * 110; e.y = p.y + Math.sin(a) * 110; let k = 10; while (isSolid(this.floor, e.x, e.y) && k--) { e.x = (e.x + p.x) / 2; e.y = (e.y + p.y) / 2; } e.tx = -1; this.teles.push({ kind: 'circle', x: e.x, y: e.y, r: 120, a: 0, len: 0, t: 0, max: 0.7, dmg: e.dmg * 1.3, element: def.element, owner: e.id }); }
      if (e.timer <= 0) { e.ai = 'move'; e.alpha = 1; }
      return;
    }
    if (e.ai === 'windup') { e.timer -= dt; if (e.timer <= 0) e.ai = 'move'; return; }
    // Default: drift toward the player, keep mid-range
    if (d > 150) this.moveEnt(e, (dx / d) * sp * dt, (dy / d) * sp * dt, false);
    else if (d < 70) this.moveEnt(e, (-dx / d) * sp * 0.5 * dt, (-dy / d) * sp * 0.5 * dt, false);
    if (d < e.r + p.r + 6) this.damagePlayer(e.dmg * 0.6, def.element, def.name);
    e.patternCd -= dt * ph.speedMul;
    if (e.patternCd > 0) return;
    const pat = ph.patterns[e.patternIdx % ph.patterns.length];
    e.patternIdx++;
    e.patternCd = 2.3;
    this.bossPattern(e, pat, def);
  }

  private bossPattern(e: Enemy, pat: BossPattern, def: BossDef) {
    const p = this.p;
    const col = ELEMENT_COLOR[def.element];
    const aim = Math.atan2(p.y - e.y, p.x - e.x);
    const shot = (a: number, speed: number, dmg = e.dmg * 0.7, delay = 0) => {
      const fire = () => { if (!e.dead) this.projs.push({ x: e.x, y: e.y - e.r * 0.6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 8, dmg, element: def.element, team: 'e', pierce: 0, life: 3.5, color: col, homing: 0, hit: new Set(), trail: 0, kind: 'orb' }); };
      if (delay) setTimeout(fire, delay * 1000); else fire();
    };
    switch (pat) {
      case 'ring': { const n = 18 + e.phase * 4; for (let k = 0; k < n; k++) shot((k / n) * Math.PI * 2 + e.t, 190); audio.play('cast'); break; }
      case 'spiral': for (let k = 0; k < 36; k++) for (let arm = 0; arm < 3; arm++) shot(k * 0.28 + (arm * Math.PI * 2) / 3, 170, e.dmg * 0.55, k * 0.05); e.patternCd = 3; break;
      case 'fan': for (let v = 0; v < 3; v++) for (let k = -3; k <= 3; k++) shot(aim + k * 0.16, 260, e.dmg * 0.7, v * 0.35); break;
      case 'charge':
        e.ai = 'windup'; e.timer = 0.75; e.tx = aim;
        this.teles.push({ kind: 'line', x: e.x, y: e.y, r: e.r, a: aim, len: 420, t: 0, max: 0.75, dmg: 0, element: def.element, owner: e.id });
        setTimeout(() => { if (!e.dead) { e.ai = 'charge'; e.timer = 0.6; e.tx = aim; } }, 750);
        break;
      case 'slam': this.teles.push({ kind: 'circle', x: e.x, y: e.y, r: 150, a: 0, len: 0, t: 0, max: 1.0, dmg: e.dmg * 1.7, element: def.element, owner: e.id }); e.ai = 'windup'; e.timer = 1.0; break;
      case 'rain': for (let k = 0; k < 5 + e.phase * 2; k++) { const a = Math.random() * 6.28, r = k === 0 ? 0 : 40 + Math.random() * 140; this.teles.push({ kind: 'circle', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 58, a: 0, len: 0, t: -k * 0.12, max: 1.0, dmg: e.dmg * 1.1, element: def.element, owner: e.id }); } break;
      case 'summon': {
        const pool = this.region.enemies.map((id) => CREATURE_BY_ID[id]).filter(Boolean);
        for (let k = 0; k < 3 + e.phase; k++) { const a = Math.random() * 6.28; const s = this.spawnEnemy(pick(this.rng, pool), e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, e.room, false, false, e.id); s.aware = true; }
        this.say('It calls its servants!', '#ffa080');
        break;
      }
      case 'beam': {
        const base = aim - 0.9;
        for (let k = 0; k < 7; k++) this.teles.push({ kind: 'line', x: e.x, y: e.y, r: 16, a: base + k * 0.3, len: 520, t: -k * 0.15, max: 0.7, dmg: e.dmg * 1.2, element: def.element, owner: e.id });
        e.ai = 'windup'; e.timer = 1.8;
        break;
      }
      case 'teleport': e.ai = 'blink'; e.timer = 0.7; e.tx = 0; break;
      case 'drain': {
        this.say('It drinks your blood!', '#ff3050');
        const t0 = this.time;
        const iv = setInterval(() => {
          if (e.dead || this.time - t0 > 1.6 || this.p.hp <= 0) { clearInterval(iv); return; }
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (p.dashT <= 0) this.moveEnt(p, (dx / d) * 7, (dy / d) * 7, false);
          if (d < 220) { p.blood = Math.max(0, p.blood - 2); e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.002); this.parts.push({ x: p.x, y: p.y - 14, vx: dx * 2, vy: dy * 2, life: 0.4, max: 0.4, size: 3, color: '#d0102a', kind: 'blood' }); }
        }, 50);
        break;
      }
      case 'clones': {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * 6.28 + Math.random();
          const c = this.spawnEnemy({ ...(CREATURE_BY_ID[this.region.enemies[0]] as CreatureDef), id: 'clone', name: `${def.name}'s Echo`, behavior: 'sentinel', look: { ...def.look, size: def.look.size * 0.6 }, hp: 1, damage: def.damage * 0.4, xp: 0, drops: [], element: def.element }, e.x + Math.cos(a) * 160, e.y + Math.sin(a) * 160, e.room, false, false);
          c.clone = true; c.hp = c.maxHp = 1; c.aware = true; c.alpha = 0.7;
        }
        break;
      }
      case 'pillars': {
        const room = this.floor.bossRoom!;
        const safes = Array.from({ length: 3 }, () => { const pt = this.randomPointIn(room); return { x: pt.x, y: pt.y, r: 52 }; });
        this.teles.push({ kind: 'safe', x: e.x, y: e.y, r: 0, a: 0, len: 0, t: 0, max: 2.4, dmg: e.dmg * 2.6, element: def.element, owner: e.id, safes });
        this.say('Find shelter!', '#ffb080', true);
        e.patternCd = 3.6;
        break;
      }
      case 'sunlight': {
        for (let k = 0; k < 4 + e.phase; k++) { const a = Math.random() * 6.28, r = Math.random() * 160; this.teles.push({ kind: 'circle', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 54, a: 0, len: 0, t: -k * 0.2, max: 1.1, dmg: e.dmg * 1.2, element: 'holy', owner: e.id, sun: true }); }
        break;
      }
    }
  }

  private updateTelegraphs(dt: number) {
    const p = this.p;
    for (const t of this.teles) {
      if (t.done) continue;
      t.t += dt;
      if (t.t < t.max) continue;
      t.done = true;
      if (t.dmg <= 0) continue;
      const owner = this.enemies.find((e) => e.id === t.owner);
      if (owner?.dead && owner.boss === false && t.kind !== 'circle') continue;
      const src = owner?.def.name ?? 'a trap';
      let hit = false;
      if (t.kind === 'circle') {
        hit = Math.hypot(p.x - t.x, p.y - t.y) < t.r + p.r * 0.5;
        this.parts.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: t.r, color: t.sun ? '#fff4c0' : ELEMENT_COLOR[t.element], kind: 'ring' });
        for (let k = 0; k < 14; k++) { const a = Math.random() * 6.28; this.parts.push({ x: t.x + Math.cos(a) * t.r * 0.5, y: t.y + Math.sin(a) * t.r * 0.5, vx: Math.cos(a) * 80, vy: -80 - Math.random() * 80, life: 0.5, max: 0.5, size: 4, color: t.sun ? '#fff0b0' : ELEMENT_COLOR[t.element], kind: 'glow' }); }
        this.shake = Math.max(this.shake, 5);
        audio.play('hit', 0.6);
        // Brute slams also hit allies & other enemies
        for (const a of this.allies) if (Math.hypot(a.x - t.x, a.y - t.y) < t.r) a.hp -= t.dmg;
      } else if (t.kind === 'line') {
        const ex = t.x + Math.cos(t.a) * t.len, ey = t.y + Math.sin(t.a) * t.len;
        hit = distToSeg(p.x, p.y, t.x, t.y, ex, ey) < t.r + p.r * 0.6;
        this.parts.push({ x: t.x, y: t.y - 12, x2: ex, y2: ey - 12, vx: 0, vy: 0, life: 0.3, max: 0.3, size: t.r, color: ELEMENT_COLOR[t.element], kind: 'bolt' });
        audio.play('thunder', 0.5);
      } else if (t.kind === 'safe') {
        hit = !t.safes!.some((s) => Math.hypot(p.x - s.x, p.y - s.y) < s.r);
        this.shake = 20; this.hitstop = 0.15; audio.play('boss');
        this.parts.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.6, max: 0.6, size: 700, color: ELEMENT_COLOR[t.element], kind: 'ring' });
      }
      if (hit) {
        if (t.sun) { const sr = this.stats.sunResist; this.damagePlayer(t.dmg * (1 - sr) * (p.form === 'shadow' ? 2 : 1), 'holy', 'the burning Light'); }
        else this.damagePlayer(t.dmg, t.element, src);
      }
    }
    this.teles = this.teles.filter((t) => !t.done || t.t < t.max + 0.05);
  }

  // ───────────────────────── Allies, projectiles, zones ─────────────────────────
  private updateAllies(dt: number) {
    const p = this.p;
    for (const a of this.allies) {
      a.t += dt; a.life -= dt; a.cd -= dt; a.flash -= dt;
      if (a.life <= 0 || a.hp <= 0) { a.dead = true; for (let k = 0; k < 8; k++) this.parts.push({ x: a.x, y: a.y - 8, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.5, max: 0.5, size: 5, color: a.color, kind: 'smoke' }); continue; }
      let best: Enemy | null = null, bd = 320;
      for (const e of this.enemies) if (!e.dead && e.charmT <= 0 && e.ai !== 'spawn') { const d = Math.hypot(e.x - a.x, e.y - a.y); if (d < bd) bd = d, best = e; }
      const sp = a.kind === 'bat' ? 240 : a.kind === 'wolf' ? 210 : a.kind === 'golem' ? 110 : 170;
      if (best) {
        const dx = best.x - a.x, dy = best.y - a.y, d = Math.hypot(dx, dy) || 1;
        a.facing = Math.atan2(dy, dx);
        if (d > best.r + a.r + 4) this.moveEnt(a, (dx / d) * sp * dt, (dy / d) * sp * dt, a.kind === 'spirit' || a.kind === 'bat');
        else if (a.cd <= 0) { this.damageEnemy(best, a.dmg, a.kind === 'spirit' || a.kind === 'skeleton' ? 'death' : a.kind === 'mirror' ? 'mind' : 'blood', { knock: 30, kx: dx / d, ky: dy / d, noCrit: true }); a.cd = a.kind === 'golem' ? 1.2 : 0.8; }
      } else {
        const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (d > 60) this.moveEnt(a, (dx / d) * sp * dt, (dy / d) * sp * dt, true);
      }
    }
    this.allies = this.allies.filter((a) => !a.dead);
  }

  private updateProjectiles(dt: number) {
    const p = this.p;
    for (const pr of this.projs) {
      pr.life -= dt;
      if (pr.homing > 0 && pr.team === 'p') {
        let best: Enemy | null = null, bd = 260;
        for (const e of this.enemies) if (!e.dead && !pr.hit.has(e.id) && e.charmT <= 0) { const d = Math.hypot(e.x - pr.x, e.y - pr.y); if (d < bd) bd = d, best = e; }
        if (best) {
          const sp = Math.hypot(pr.vx, pr.vy), cur = Math.atan2(pr.vy, pr.vx), want = Math.atan2(best.y - best.r - pr.y, best.x - pr.x);
          let da = want - cur; da = Math.atan2(Math.sin(da), Math.cos(da));
          const na = cur + da * Math.min(1, pr.homing * dt * 10);
          pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
        }
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      pr.trail -= dt;
      if (pr.trail <= 0) { pr.trail = 0.016; this.parts.push({ x: pr.x, y: pr.y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: pr.r * (pr.kind === 'arrow' ? 0.5 : 0.9), color: pr.color, kind: 'glow' }); }
      if (isSolid(this.floor, pr.x, pr.y + 12)) {
        if (pr.team === 'p') this.tryBreakWall(pr.x, pr.y + 12);
        pr.life = 0;
        for (let k = 0; k < 6; k++) this.parts.push({ x: pr.x, y: pr.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.3, max: 0.3, size: 2, color: pr.color, kind: 'spark' });
        continue;
      }
      if (pr.team === 'p') {
        for (const e of this.enemies) {
          if (e.dead || pr.hit.has(e.id) || e.charmT > 0 || e.ai === 'spawn') continue;
          if (Math.hypot(e.x - pr.x, e.y - e.r * 0.8 - pr.y) < e.r + pr.r) {
            pr.hit.add(e.id);
            const d = Math.hypot(pr.vx, pr.vy) || 1;
            this.damageEnemy(e, pr.dmg, pr.element, { status: pr.status, ability: pr.ability, knock: pr.knock ?? 40, kx: pr.vx / d, ky: pr.vy / d, lifesteal: pr.lifesteal, weapon: !pr.ability });
            if (pr.pierce-- <= 0) { pr.life = 0; break; }
          }
        }
        for (const prop of this.floor.props) if ((prop.kind === 'urn' || prop.kind === 'coffin') && (prop.hp ?? 0) > 0 && Math.hypot(prop.x - pr.x, prop.y - pr.y) < 16) { this.breakProp(prop); pr.life = 0; }
      } else {
        if (Math.hypot(p.x - pr.x, p.y - 12 - pr.y) < p.r + pr.r - 2) { this.damagePlayer(pr.dmg, pr.element, 'a projectile'); pr.life = 0; }
        for (const a of this.allies) if (Math.hypot(a.x - pr.x, a.y - pr.y) < a.r + pr.r) { a.hp -= pr.dmg; pr.life = 0; }
      }
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  }

  private updateZones(dt: number) {
    for (const z of this.zones) {
      z.life -= dt; z.timer -= dt;
      if (z.follow) { z.x = this.p.x; z.y = this.p.y; }
      if (Math.random() < 0.6) { const a = Math.random() * 6.28, r = Math.random() * z.r; this.parts.push({ x: z.x + Math.cos(a) * r, y: z.y + Math.sin(a) * r, vx: 0, vy: -30 - Math.random() * 40, life: 0.6, max: 0.6, size: 3 + Math.random() * 3, color: z.color, kind: 'glow' }); }
      for (const e of this.enemies) {
        if (e.dead || e.charmT > 0 || e.ai === 'spawn') continue;
        const d = Math.hypot(e.x - z.x, e.y - z.y);
        if (d > z.r + e.r) continue;
        if (z.pull && !e.boss && d > 10) this.moveEnt(e, ((z.x - e.x) / d) * z.pull * dt, ((z.y - e.y) / d) * z.pull * dt, false);
        if (z.timer <= 0) this.damageEnemy(e, z.dmg, z.element, { status: z.status, ability: z.ability, lifesteal: z.lifesteal, noCrit: true });
      }
      if (z.timer <= 0) z.timer = z.tick;
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  private updateOrbits(dt: number) {
    for (const o of this.orbits) {
      o.life -= dt; o.ang += dt * 3.2;
      for (const [id, t] of o.hitCd) o.hitCd.set(id, t - dt);
      for (let k = 0; k < o.count; k++) {
        const a = o.ang + (k / o.count) * Math.PI * 2;
        const ox = this.p.x + Math.cos(a) * o.r, oy = this.p.y - 12 + Math.sin(a) * o.r * 0.8;
        if (Math.random() < 0.4) this.parts.push({ x: ox, y: oy, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 6, color: o.color, kind: 'glow' });
        for (const e of this.enemies) {
          if (e.dead || e.charmT > 0 || e.ai === 'spawn') continue;
          if ((o.hitCd.get(e.id) ?? 0) > 0) continue;
          if (Math.hypot(e.x - ox, e.y - e.r - oy) < e.r + 10) { o.hitCd.set(e.id, 0.45); this.damageEnemy(e, o.dmg, o.element, { status: o.status, ability: o.ability, knock: 50, kx: Math.cos(a), ky: Math.sin(a) }); }
        }
      }
    }
    this.orbits = this.orbits.filter((o) => o.life > 0);
  }

  private updateTethers(dt: number) {
    for (const t of this.tethers) {
      t.life -= dt;
      const e = this.enemies.find((x) => x.id === t.target);
      if (!e || e.dead || Math.hypot(e.x - this.p.x, e.y - this.p.y) > 340) { t.life = 0; continue; }
      if (Math.random() < 0.5) this.parts.push({ x: e.x, y: e.y - e.r, vx: (this.p.x - e.x) * 2.5, vy: (this.p.y - 14 - e.y + e.r) * 2.5, life: 0.4, max: 0.4, size: 3, color: t.color, kind: 'blood' });
      const before = e.hp;
      e.hp -= t.dmg * dt * (1 - armorReduction(e.armor) * 0.5);
      const dealt = before - e.hp;
      this.p.hp = Math.min(this.stats.maxHp, this.p.hp + dealt * t.lifesteal);
      this.p.blood = Math.min(this.stats.maxBlood, this.p.blood + dealt * 0.08);
      e.flash = 0.03; e.aware = true;
      this.gainMastery(t.ability, dt * 0.5);
      if (e.hp <= 0) this.killEnemy(e, false);
    }
    this.tethers = this.tethers.filter((t) => t.life > 0);
  }

  private updatePickups(dt: number) {
    const p = this.p;
    const magnet = this.effects.has('gold-magnet') ? 260 : 110;
    for (const k of this.pickups) {
      k.t += dt;
      k.vx *= Math.pow(0.02, dt); k.vy *= Math.pow(0.02, dt);
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy);
      if (k.t > 0.4 && d < (k.kind === 'gold' ? magnet : 70)) { k.vx += (dx / d) * 1400 * dt; k.vy += (dy / d) * 1400 * dt; }
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (k.t > 0.4 && d < 18) {
        k.t = -999;
        if (k.kind === 'gold') { this.cfg.onEvent({ type: 'gold', amount: k.amount }); audio.play('gold'); this.float(p.x, p.y - 36, `+${k.amount}`, '#ffd050', 0.8); }
        if (k.kind === 'material' && k.id) { this.cfg.onEvent({ type: 'material', id: k.id, count: k.amount }); audio.play('pickup'); this.loot(`${k.amount}× ${k.id.replace(/-/g, ' ')}`, '#b0d0ff'); }
        if (k.kind === 'consumable' && k.id) { this.cfg.onEvent({ type: 'consumable', id: k.id }); audio.play('pickup'); this.loot(ITEM_BY_ID[k.id]?.name ?? k.id, '#ff90a0'); }
        if (k.kind === 'item' && k.item) { this.cfg.onEvent({ type: 'item', item: k.item }); audio.play('chest'); this.loot(ITEM_BY_ID[k.item.templateId].name, RARITY_COLOR[k.item.rarity]); }
      }
    }
    this.pickups = this.pickups.filter((k) => k.t > -900);
  }

  private updateProps() {
    const p = this.p;
    for (const pr of this.floor.props) {
      const d = Math.hypot(pr.x - p.x, pr.y - p.y);
      if (d > 34) continue;
      if (pr.kind === 'chest' && !pr.used) {
        pr.used = true; audio.play('chest'); this.shake = 4;
        this.spawnPickup(pr.x, pr.y, 'item', 1, undefined, rollEquipment(this.rng, this.level, this.stats.lootLuck * 1.3, 'uncommon'));
        for (let k = 0; k < 4; k++) this.spawnPickup(pr.x, pr.y, 'gold', Math.round((8 + this.level * 6) * this.stats.goldFind));
        this.spawnPickup(pr.x, pr.y, 'material', 1, rollMaterial(this.rng, this.level));
        if (Math.random() < 0.5) this.spawnPickup(pr.x, pr.y, 'consumable', 1, pick(this.rng, ['potion-crimson', 'potion-vitae', 'elixir-purity', 'draught-fury']));
      }
      if (pr.kind === 'font' && !pr.used) {
        pr.used = true; audio.play('blood'); audio.play('levelup');
        p.blood = this.stats.maxBlood; p.hp = Math.min(this.stats.maxHp, p.hp + this.stats.maxHp * 0.35);
        this.say('A Blood Font — you drink deep.', '#ff4060', true);
        this.parts.push({ x: pr.x, y: pr.y, vx: 0, vy: 0, life: 0.8, max: 0.8, size: 120, color: '#ff2040', kind: 'ring' });
        this.cfg.onEvent({ type: 'feed', blood: 'ancient' });
      }
      if (pr.kind === 'tome' && !pr.used && pr.secret) {
        pr.used = true; audio.play('portal');
        this.cfg.onEvent({ type: 'secret', id: pr.secret });
        this.say('A secret is revealed…', '#c8b0ff', true);
      }
      if (pr.kind === 'portal' && !this.finished && d < 26 && (!this.isBoss || !this.bossEnt)) {
        this.finished = true; audio.play('portal');
        this.flushMastery();
        this.cfg.onEvent({ type: 'floorComplete', hp: p.hp, blood: p.blood });
      }
    }
  }

  private breakProp(pr: Prop) {
    pr.hp = 0;
    audio.play('hit');
    for (let k = 0; k < 14; k++) this.parts.push({ x: pr.x, y: pr.y - 6, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 200, life: 0.6, max: 0.6, size: 3, color: pr.kind === 'urn' ? '#8a6448' : '#4a3020', kind: 'spark', grav: 500 });
    if (Math.random() < 0.7) this.spawnPickup(pr.x, pr.y, 'gold', Math.round((2 + Math.random() * 5) * (1 + this.level * 0.5)));
    if (Math.random() < 0.15) this.spawnPickup(pr.x, pr.y, 'material', 1, rollMaterial(this.rng, this.level));
    if (pr.kind === 'coffin' && Math.random() < 0.35) {
      const def = CREATURE_BY_ID[this.region.enemies.find((id) => CREATURE_BY_ID[id]?.family === 'undead') ?? this.region.enemies[0]];
      if (def) { const e = this.spawnEnemy(def, pr.x, pr.y + 10, pr.room, false); e.aware = true; this.say('Something stirs in the coffin!', '#c0a0a0'); }
    }
  }

  private updateParticles(dt: number) {
    for (const q of this.parts) {
      q.life -= dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.grav) q.vy += q.grav * dt;
      if (q.kind !== 'text' && q.kind !== 'ring' && q.kind !== 'slash' && q.kind !== 'bolt') { q.vx *= Math.pow(0.05, dt); q.vy *= q.grav ? 1 : Math.pow(0.05, dt); }
      if (q.kind === 'text') q.vy *= Math.pow(0.1, dt);
      if (q.kind === 'blood' && q.grav && q.life < 0.05 && Math.random() < 0.3) this.decal(q.x, q.y, 1.5 + Math.random() * 2, q.color);
    }
    this.parts = this.parts.filter((q) => q.life > 0);
    if (this.parts.length > 1400) this.parts.splice(0, this.parts.length - 1400);
  }

  private decal(x: number, y: number, r: number, color: string) {
    const g = this.fg;
    if (!g) return;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.floor.w || ty >= this.floor.h || this.floor.tiles[ty * this.floor.w + tx] !== T_FLOOR) return;
    g.globalAlpha = 0.55;
    g.fillStyle = color === '#b00a20' ? '#5a0612' : color;
    g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.75, Math.random() * 3, 0, 7); g.fill();
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + (Math.random() - 0.5) * r * 3, y + (Math.random() - 0.5) * r * 1.6, r * 0.25, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }

  // ───────────────────────── Text ─────────────────────────
  private float(x: number, y: number, text: string, color: string, scale = 1) { this.parts.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: -70, life: 0.9, max: 0.9, size: 14 * scale, color, kind: 'text', text }); }
  private say(text: string, color: string, big = false) { this.messages.push({ text, t: big ? 3 : 2.4, color, big }); if (this.messages.length > 5) this.messages.shift(); }
  private loot(text: string, color: string) { this.lootFeed.push({ text, t: 3.5, color }); if (this.lootFeed.length > 5) this.lootFeed.shift(); }

  // ───────────────────────── Rendering ─────────────────────────
  private render() {
    const g = this.g, W = this.W, H = this.H, z = this.zoom, dpr = this.dpr;
    const sx = (Math.random() - 0.5) * this.shake * (this.cfg.state.settings.shake ? 1 : 0), sy = (Math.random() - 0.5) * this.shake * (this.cfg.state.settings.shake ? 1 : 0);
    const camL = this.camX - W / 2 / z, camT = this.camY - H / 2 / z;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#050304';
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(sx, sy);
    g.scale(z, z);
    g.translate(-camL, -camT);

    // Floor
    const vw = W / z, vh = H / z;
    const srcX = Math.max(0, Math.floor(camL)), srcY = Math.max(0, Math.floor(camT));
    const srcW = Math.min(this.floorCv.width - srcX, Math.ceil(vw) + 2), srcH = Math.min(this.floorCv.height - srcY, Math.ceil(vh) + 2);
    if (srcW > 0 && srcH > 0) g.drawImage(this.floorCv, srcX, srcY, srcW, srcH, srcX, srcY, srcW, srcH);

    const t = this.time;
    // Sunlight pools (floor)
    for (const s of this.floor.sun) {
      const r = s.r * (0.85 + Math.sin(t * 0.6 + s.phase) * 0.15);
      const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      gr.addColorStop(0, 'rgba(255,240,200,0.55)'); gr.addColorStop(0.7, 'rgba(255,220,160,0.25)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, r, 0, 7); g.fill();
    }
    // Zones
    for (const zn of this.zones) {
      const a = Math.min(1, zn.life / 0.4) * 0.9;
      const gr = g.createRadialGradient(zn.x, zn.y, zn.r * 0.2, zn.x, zn.y, zn.r);
      gr.addColorStop(0, hexA(zn.color, 0.08 * a)); gr.addColorStop(0.85, hexA(zn.color, 0.28 * a)); gr.addColorStop(1, hexA(zn.color, 0));
      g.fillStyle = gr; g.beginPath(); g.ellipse(zn.x, zn.y, zn.r, zn.r * 0.8, 0, 0, 7); g.fill();
      g.strokeStyle = hexA(zn.color, 0.6 * a); g.lineWidth = 2; g.setLineDash([8, 6]); g.lineDashOffset = -t * 30;
      g.beginPath(); g.ellipse(zn.x, zn.y, zn.r, zn.r * 0.8, 0, 0, 7); g.stroke(); g.setLineDash([]);
    }
    // Telegraphs
    for (const tl of this.teles) {
      if (tl.done || tl.t < 0) continue;
      const k = tl.t / tl.max;
      const col = tl.sun ? '255,230,150' : '255,40,60';
      if (tl.kind === 'circle') {
        g.fillStyle = `rgba(${col},${0.12 + k * 0.12})`; g.beginPath(); g.ellipse(tl.x, tl.y, tl.r, tl.r * 0.8, 0, 0, 7); g.fill();
        g.fillStyle = `rgba(${col},0.3)`; g.beginPath(); g.ellipse(tl.x, tl.y, tl.r * k, tl.r * 0.8 * k, 0, 0, 7); g.fill();
        g.strokeStyle = `rgba(${col},0.8)`; g.lineWidth = 2; g.beginPath(); g.ellipse(tl.x, tl.y, tl.r, tl.r * 0.8, 0, 0, 7); g.stroke();
        if (tl.sun) { g.fillStyle = `rgba(255,240,200,${k * 0.35})`; g.fillRect(tl.x - tl.r * 0.5, tl.y - 400, tl.r, 400); }
      } else if (tl.kind === 'line') {
        g.save(); g.translate(tl.x, tl.y); g.rotate(tl.a);
        g.fillStyle = `rgba(${col},${0.12 + k * 0.2})`; g.fillRect(0, -tl.r, tl.len, tl.r * 2);
        g.fillStyle = `rgba(${col},0.35)`; g.fillRect(0, -tl.r, tl.len * k, tl.r * 2);
        g.restore();
      } else if (tl.kind === 'safe') {
        g.fillStyle = `rgba(255,40,60,${0.08 + k * 0.18})`; g.fillRect(camL, camT, vw, vh);
        for (const s of tl.safes!) { g.fillStyle = 'rgba(120,200,255,0.25)'; g.beginPath(); g.ellipse(s.x, s.y, s.r, s.r * 0.8, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(160,220,255,0.9)'; g.lineWidth = 3; g.stroke(); }
      }
    }

    // Y-sorted drawables
    type D = { y: number; fn: () => void };
    const draws: D[] = [];
    for (const pr of this.floor.props) {
      if (pr.x < camL - 60 || pr.x > camL + vw + 60 || pr.y < camT - 60 || pr.y > camT + vh + 80) continue;
      draws.push({ y: pr.kind === 'torch' ? pr.y - 100 : pr.kind === 'portal' ? pr.y - 30 : pr.y, fn: () => drawProp(g, pr, t, this.pal) });
    }
    for (const k of this.pickups) draws.push({ y: k.y, fn: () => this.drawPickup(k) });
    for (const e of this.enemies) {
      if (e.dead) continue;
      draws.push({ y: e.y, fn: () => this.drawEnemy(e) });
    }
    for (const a of this.allies) draws.push({ y: a.y, fn: () => drawActor(g, { x: a.x, y: a.y, r: a.r, facing: a.facing, moving: true, t: a.t, flash: a.flash, color: a.color, accent: a.accent, shape: a.shape, alpha: Math.min(1, a.life * 2) * 0.9 }) });
    const p = this.p;
    if (p.hp > 0 || this.deathT < 0.3) draws.push({ y: p.y, fn: () => this.drawPlayer() });
    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) d.fn();

    // Tethers
    for (const tt of this.tethers) {
      const e = this.enemies.find((x) => x.id === tt.target);
      if (!e) continue;
      g.strokeStyle = hexA(tt.color, 0.85); g.lineWidth = 3 + Math.sin(t * 20) * 1.2;
      g.beginPath(); g.moveTo(p.x, p.y - 16);
      const mx = (p.x + e.x) / 2 + Math.sin(t * 9) * 12, my = (p.y + e.y) / 2 - 30;
      g.quadraticCurveTo(mx, my, e.x, e.y - e.r); g.stroke();
    }
    // Projectiles
    for (const pr of this.projs) this.drawProj(pr);
    // Particles
    this.drawParticles(false);
    // Orbits
    for (const o of this.orbits) for (let k = 0; k < o.count; k++) {
      const a = o.ang + (k / o.count) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * o.r, oy = p.y - 12 + Math.sin(a) * o.r * 0.8;
      const gr = g.createRadialGradient(ox, oy, 0, ox, oy, 12); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, o.color); gr.addColorStop(1, hexA(o.color, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, 12, 0, 7); g.fill();
    }
    g.restore();

    // Lighting
    this.renderLighting(camL, camT, sx, sy);
    // Additive glows above the darkness (projectiles, fire, text)
    g.save(); g.translate(sx, sy); g.scale(z, z); g.translate(-camL, -camT);
    g.globalCompositeOperation = 'lighter';
    this.drawParticles(true);
    for (const pr of this.projs) { const gr = g.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.r * 3); gr.addColorStop(0, hexA(pr.color.startsWith('#') ? pr.color : '#ffffff', 0.5)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(pr.x, pr.y, pr.r * 3, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    // Floating text
    for (const q of this.parts) if (q.kind === 'text') {
      const a = Math.min(1, q.life / 0.3);
      g.globalAlpha = a; g.font = `700 ${q.size}px Cinzel, serif`; g.textAlign = 'center';
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(q.text!, q.x, q.y); g.fillStyle = q.color; g.fillText(q.text!, q.x, q.y);
      g.globalAlpha = 1;
    }
    g.restore();

    // Low HP / frenzy vignette
    const hpK = p.hp / this.stats.maxHp;
    if (hpK < 0.35 || p.frenzy || p.sunT > 0) {
      const pulse = 0.5 + Math.sin(t * (p.frenzy ? 9 : 5)) * 0.5;
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      gr.addColorStop(0, 'rgba(120,0,10,0)'); gr.addColorStop(1, `rgba(140,0,16,${(p.frenzy ? 0.55 : (0.35 - hpK) * 1.4) * (0.6 + pulse * 0.4)})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      p.sunT = Math.max(0, p.sunT - 0.05);
    }
    this.renderHud();
  }

  private renderLighting(camL: number, camT: number, sx: number, sy: number) {
    const lg = this.lg, LW = this.light.width, LH = this.light.height, z = this.zoom / 2, t = this.time, p = this.p;
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, LW, LH);
    lg.fillStyle = `rgba(4,2,6,${this.pal.darkness})`;
    lg.fillRect(0, 0, LW, LH);
    lg.globalCompositeOperation = 'destination-out';
    const lights: Light[] = [];
    const st = this.stats;
    lights.push({ x: p.x, y: p.y - 10, r: 230 + (st.per ?? 0) * 3 + (p.form ? 30 : 0), color: '', i: 1 });
    for (const pr of this.floor.props) {
      if (pr.kind === 'torch') lights.push({ x: pr.x, y: pr.y + 10, r: 150 + Math.sin(t * 11 + pr.x) * 8, color: '', i: 0.95 });
      else if (pr.kind === 'candles') lights.push({ x: pr.x, y: pr.y, r: 90 + Math.sin(t * 9 + pr.x) * 5, color: '', i: 0.85 });
      else if (pr.kind === 'portal') lights.push({ x: pr.x, y: pr.y, r: 170, color: '', i: 1 });
      else if (pr.kind === 'font' && !pr.used) lights.push({ x: pr.x, y: pr.y, r: 110, color: '', i: 0.9 });
      else if (pr.kind === 'tome' && !pr.used) lights.push({ x: pr.x, y: pr.y, r: 100, color: '', i: 0.9 });
      else if (pr.kind === 'crystal') lights.push({ x: pr.x, y: pr.y, r: 90, color: '', i: 0.7 });
      else if (pr.kind === 'chest' && !pr.used) lights.push({ x: pr.x, y: pr.y, r: 70, color: '', i: 0.6 });
    }
    for (const s of this.floor.sun) lights.push({ x: s.x, y: s.y, r: s.r * 2.2, color: '', i: 1 });
    for (const pr of this.projs) lights.push({ x: pr.x, y: pr.y, r: 60, color: '', i: 0.7 });
    for (const zn of this.zones) lights.push({ x: zn.x, y: zn.y, r: zn.r * 1.3, color: '', i: 0.6 });
    for (const q of this.parts) if (q.kind === 'ring' && q.size > 60) lights.push({ x: q.x, y: q.y, r: q.size * 1.4, color: '', i: q.life / q.max });
    for (const e of this.enemies) if (!e.dead && (e.boss || e.elite)) lights.push({ x: e.x, y: e.y, r: e.r * 4, color: '', i: 0.5 });
    const vw = this.W / this.zoom, vh = this.H / this.zoom;
    for (const l of lights) {
      if (l.x + l.r < camL || l.x - l.r > camL + vw || l.y + l.r < camT || l.y - l.r > camT + vh) continue;
      const x = (l.x - camL) * z, y = (l.y - camT) * z, r = l.r * z;
      const gr = lg.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${l.i})`); gr.addColorStop(0.55, `rgba(0,0,0,${l.i * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.beginPath(); lg.arc(x, y, r, 0, 7); lg.fill();
    }
    const g = this.g;
    g.drawImage(this.light, sx, sy, this.W, this.H);
    // Warm torch & ambient tint
    g.save(); g.translate(sx, sy); g.globalCompositeOperation = 'lighter';
    for (const pr of this.floor.props) if (pr.kind === 'torch' || pr.kind === 'candles') {
      const x = (pr.x - camL) * this.zoom, y = (pr.y - camT) * this.zoom; if (x < -150 || x > this.W + 150 || y < -150 || y > this.H + 150) continue;
      const r = (pr.kind === 'torch' ? 110 : 60) * this.zoom;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(this.pal.torch, 0.16 + Math.sin(t * 13 + pr.x) * 0.02)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
    // Atmospheric particles in screen space
    this.drawAmbient();
    // Vignette
    const vg = g.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, this.W, this.H);
  }

  private drawAmbient() {
    const g = this.g, t = this.time, kind = this.pal.particle;
    g.save();
    const n = 46;
    for (let i = 0; i < n; i++) {
      const seed = i * 97.31;
      let x = ((seed * 13.7 + t * (kind === 'snow' ? 18 : kind === 'ember' ? 10 : 6) * (1 + (i % 3))) % (this.W + 40)) - 20;
      let y = ((seed * 7.3 + t * (kind === 'snow' ? 40 : kind === 'ember' ? -30 : kind === 'ash' ? 22 : 4) * (1 + (i % 4) * 0.3)) % (this.H + 40) + this.H + 40) % (this.H + 40) - 20;
      x += Math.sin(t + i) * 10 - (this.camX * 0.15) % 40; y += -(this.camY * 0.15) % 40;
      const a = 0.25 + 0.25 * Math.sin(t * 2 + i);
      switch (kind) {
        case 'ember': g.fillStyle = `rgba(255,${120 + (i % 5) * 20},40,${a})`; g.fillRect(x, y, 2, 2); break;
        case 'snow': g.fillStyle = `rgba(230,240,255,${a + 0.2})`; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); break;
        case 'spore': g.fillStyle = `rgba(170,230,140,${a * 0.7})`; g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); break;
        case 'ash': g.fillStyle = `rgba(120,110,110,${a})`; g.fillRect(x, y, 2.5, 1.5); break;
        case 'star': g.fillStyle = `rgba(200,190,255,${a + 0.2})`; g.fillRect(x, y, 1.5, 1.5); break;
        case 'mote': g.fillStyle = `rgba(255,230,170,${a * 0.6})`; g.beginPath(); g.arc(x, y, 1.3, 0, 7); g.fill(); break;
        default: g.fillStyle = `rgba(200,190,170,${a * 0.35})`; g.fillRect(x, y, 1.5, 1.5);
      }
    }
    g.fillStyle = this.pal.fog; g.fillRect(0, 0, this.W, this.H);
    g.restore();
  }

  private drawPlayer() {
    const g = this.g, p = this.p, t = this.time;
    const form = p.form ? FORM_BY_ID[p.form] : null;
    const heirColors = this.cfg.state.dynasty.colors;
    let alpha = 1;
    if (form?.flags.includes('unseen') || this.buffs.some((b) => b.id === 'shadowstep')) alpha = 0.45;
    if (p.iframes > 0 && p.dashT <= 0 && Math.floor(t * 20) % 2) alpha *= 0.6;
    // Aura
    if (form || p.frenzy) {
      const c = p.frenzy ? '#ff1030' : form!.color;
      const gr = g.createRadialGradient(p.x, p.y - 12, 4, p.x, p.y - 12, 46);
      gr.addColorStop(0, hexA(c.startsWith('#') ? c : '#ff2040', 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y - 12, 46 + Math.sin(t * 6) * 4, 0, 7); g.fill();
    }
    if (p.shield > 0) { g.strokeStyle = `rgba(255,90,120,${0.5 + Math.sin(t * 8) * 0.2})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(p.x, p.y - 12, 22, 26, 0, 0, 7); g.stroke(); }
    if (p.form === 'bat') {
      for (let k = 0; k < 7; k++) { const a = t * 3 + k * 0.9; drawActor(g, { x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a * 1.3) * 10, r: 6, facing: p.facing, moving: true, t: t + k, flash: p.flash, color: '#3a1020', accent: '#ff3050', shape: 'flyer', alpha }); }
      return;
    }
    if (p.form === 'mist') {
      for (let k = 0; k < 10; k++) { const a = t * 1.5 + k; g.fillStyle = `rgba(190,200,215,${0.18})`; g.beginPath(); g.arc(p.x + Math.cos(a) * 12, p.y - 12 + Math.sin(a * 1.4) * 10, 12 + Math.sin(t * 3 + k) * 3, 0, 7); g.fill(); }
      return;
    }
    if (p.form === 'wolf') { drawActor(g, { x: p.x, y: p.y, r: 15, facing: p.facing, moving: p.moving, t, flash: p.flash, color: '#5a5060', accent: '#ff3050', shape: 'beast', alpha }); return; }
    if (p.form === 'wraith') { drawActor(g, { x: p.x, y: p.y, r: 13, facing: p.facing, moving: p.moving, t, flash: p.flash, color: '#40c0a0', accent: '#e0fff8', shape: 'wisp', alpha: alpha * 0.85 }); return; }
    const scale = form?.flags.includes('bigger') ? 1.3 : 1;
    const accent = form?.id === 'ember' ? '#ff6020' : form?.id === 'shadow' ? '#3a2080' : heirColors[0];
    const body = form?.id === 'shadow' ? '#120a24' : form?.id === 'ancient' ? '#3a1040' : '#1e1218';
    drawActor(g, { x: p.x, y: p.y, r: p.r, facing: p.facing, moving: p.moving, t, flash: p.flash, color: body, accent, shape: 'player', alpha, scale });
    if (p.form === 'monarch' || p.form === 'primordial') {
      g.fillStyle = '#ff2040'; const cy = p.y - p.r * 2.6 * scale;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(p.x + k * 5 - 3, cy); g.lineTo(p.x + k * 5, cy - 8 - (k === 0 ? 4 : 0)); g.lineTo(p.x + k * 5 + 3, cy); g.fill(); }
    }
    if (p.form === 'ember' && Math.random() < 0.6) this.parts.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y - Math.random() * 20, vx: 0, vy: -60, life: 0.5, max: 0.5, size: 4, color: '#ff8030', kind: 'glow' });
    if (form?.flags.includes('drainAura') || form?.flags.includes('burnAura')) {
      if (Math.floor(t * 4) !== Math.floor((t - 0.016) * 4)) for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 90) {
        this.damageEnemy(e, 6 + this.level * 2, form.flags.includes('burnAura') ? 'fire' : 'blood', { noCrit: true, lifesteal: form.flags.includes('drainAura') ? 0.3 : 0 });
        if (form.flags.includes('burnAura')) this.applyStatus(e, 'burn', 2, 5);
      }
    }
  }

  private drawEnemy(e: Enemy) {
    const g = this.g;
    const def = e.def;
    let alpha = e.alpha * (e.ai === 'spawn' ? Math.max(0, 1 - e.timer / 0.8) : 1);
    if (e.charmT > 0) alpha *= 0.85;
    // Elite / boss aura
    if (e.elite || e.boss) {
      const c = e.boss ? def.look.accent : '#ffb040';
      const gr = g.createRadialGradient(e.x, e.y - e.r * 0.6, e.r * 0.3, e.x, e.y - e.r * 0.6, e.r * 2.2);
      gr.addColorStop(0, hexA(c, 0.3 * alpha)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(e.x, e.y - e.r * 0.6, e.r * 2.2, 0, 7); g.fill();
    }
    const moving = e.ai === 'move' || e.ai === 'charge';
    const shake = e.ai === 'windup' ? (Math.random() - 0.5) * 3 : 0;
    drawActor(g, { x: e.x + shake, y: e.y, r: e.r, facing: e.facing, moving, t: e.t, flash: e.flash, color: e.charmT > 0 ? '#c060a0' : def.look.color, accent: def.look.accent, shape: def.look.shape, alpha });
    // Status tint rings
    const sts = Object.keys(e.status) as StatusId[];
    if (sts.length) { g.strokeStyle = hexA(STATUS_COLOR[sts[0]] ?? '#ffffff', 0.7); g.lineWidth = 2; g.beginPath(); g.ellipse(e.x, e.y + e.r * 0.7, e.r, e.r * 0.4, 0, 0, 7); g.stroke(); }
    if (e.status.freeze) { g.fillStyle = 'rgba(200,240,255,0.35)'; g.beginPath(); g.ellipse(e.x, e.y - e.r * 0.6, e.r * 1.1, e.r * 1.4, 0, 0, 7); g.fill(); }
    if (e.status.stun) for (let k = 0; k < 3; k++) { const a = this.time * 5 + k * 2.1; g.fillStyle = '#ffe080'; g.beginPath(); g.arc(e.x + Math.cos(a) * e.r * 0.7, e.y - e.r * 2.1 + Math.sin(a) * 3, 2.2, 0, 7); g.fill(); }
    // Feedable marker
    if (!e.boss && this.feedable(e) && e.ai !== 'feeding') {
      const pulse = 0.6 + Math.sin(this.time * 8) * 0.4;
      g.fillStyle = `rgba(255,30,60,${pulse})`;
      g.beginPath(); g.moveTo(e.x, e.y - e.r * 2.4 - 12); g.quadraticCurveTo(e.x + 7, e.y - e.r * 2.4 - 2, e.x, e.y - e.r * 2.4 + 1); g.quadraticCurveTo(e.x - 7, e.y - e.r * 2.4 - 2, e.x, e.y - e.r * 2.4 - 12); g.fill();
    }
    // HP bar (non-boss)
    if (!e.boss && e.hp < e.maxHp && alpha > 0.4) {
      const w = Math.max(24, e.r * 2), y = e.y + e.r * 0.9 + 6;
      g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 5);
      g.fillStyle = e.elite ? '#ffb040' : '#c01030'; g.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 3);
    }
    if (e.elite && !e.boss && alpha > 0.4) { g.font = '600 9px Cinzel, serif'; g.textAlign = 'center'; g.fillStyle = '#ffc060'; g.fillText(def.name, e.x, e.y + e.r * 0.9 + 18); }
  }

  private drawProj(pr: Proj) {
    const g = this.g;
    const a = Math.atan2(pr.vy, pr.vx);
    g.save(); g.translate(pr.x, pr.y); g.rotate(a);
    if (pr.kind === 'arrow') { g.strokeStyle = '#d8c8a8'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, 0); g.lineTo(6, 0); g.stroke(); g.fillStyle = pr.color; g.beginPath(); g.moveTo(8, 0); g.lineTo(2, -3); g.lineTo(2, 3); g.fill(); }
    else if (pr.kind === 'spear') { g.fillStyle = pr.color; g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -3.5); g.lineTo(-14, 0); g.lineTo(-8, 3.5); g.closePath(); g.fill(); g.fillStyle = '#ffd0d8'; g.fillRect(-4, -1, 14, 2); }
    else { g.fillStyle = pr.color; g.beginPath(); g.arc(0, 0, pr.r, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, pr.r * 0.45, 0, 7); g.fill(); }
    g.restore();
  }

  private drawPickup(k: Pickup) {
    const g = this.g, t = this.time;
    const bob = Math.sin(t * 4 + k.x) * 3;
    if (k.kind === 'gold') { g.fillStyle = '#d4a020'; g.beginPath(); g.ellipse(k.x, k.y + bob, 5, 4, 0, 0, 7); g.fill(); g.fillStyle = '#ffe080'; g.beginPath(); g.ellipse(k.x - 1, k.y - 1 + bob, 2.5, 2, 0, 0, 7); g.fill(); return; }
    if (k.kind === 'item') {
      const gr = g.createLinearGradient(k.x, k.y - 60, k.x, k.y); gr.addColorStop(0, hexA(k.color, 0)); gr.addColorStop(1, hexA(k.color, 0.5));
      g.fillStyle = gr; g.fillRect(k.x - 4, k.y - 60, 8, 60);
    }
    const ip = iconPath(k.kind === 'item' ? ITEM_BY_ID[k.item!.templateId]?.icon : k.kind === 'consumable' ? ITEM_BY_ID[k.id!]?.icon : 'crystal-shine');
    g.save(); g.translate(k.x - 9, k.y - 18 + bob); g.scale(18 / 512, 18 / 512);
    g.fillStyle = k.color; if (ip) g.fill(ip); else { g.beginPath(); g.arc(256, 256, 200, 0, 7); g.fill(); }
    g.restore();
  }

  private drawParticles(additive: boolean) {
    const g = this.g;
    for (const q of this.parts) {
      const k = Math.max(0, q.life / q.max);
      const add = q.kind === 'glow' || q.kind === 'spark' || q.kind === 'bolt';
      if (q.kind === 'text' || add !== additive) continue;
      g.globalAlpha = k;
      switch (q.kind) {
        case 'spark': g.fillStyle = q.color; g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); break;
        case 'blood': g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size, 0, 7); g.fill(); break;
        case 'smoke': g.globalAlpha = k * 0.5; g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size * (1.6 - k * 0.6), 0, 7); g.fill(); break;
        case 'glow': { const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size); gr.addColorStop(0, q.color.startsWith('#') ? hexA(q.color, 0.9) : q.color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.size, 0, 7); g.fill(); break; }
        case 'ring': g.strokeStyle = q.color; g.lineWidth = 3 + k * 4; g.beginPath(); g.ellipse(q.x, q.y, q.size * (1 - k * 0.7), q.size * (1 - k * 0.7) * 0.8, 0, 0, 7); g.stroke(); break;
        case 'slash': {
          const r = q.size;
          g.strokeStyle = q.color; g.lineCap = 'round';
          for (let i = 0; i < 3; i++) { g.lineWidth = (6 - i * 2) * k + 1; g.globalAlpha = k * (1 - i * 0.3); g.beginPath(); g.arc(q.x, q.y, r * (0.6 + i * 0.18), q.a!, q.a2!); g.stroke(); }
          break;
        }
        case 'bolt': {
          g.strokeStyle = q.color; g.lineWidth = q.size + 1; g.beginPath(); g.moveTo(q.x, q.y);
          const segs = 7;
          for (let i = 1; i < segs; i++) { const f = i / segs; g.lineTo(q.x + (q.x2! - q.x) * f + (Math.random() - 0.5) * 18, q.y + (q.y2! - q.y) * f + (Math.random() - 0.5) * 18); }
          g.lineTo(q.x2!, q.y2!); g.stroke(); break;
        }
      }
    }
    g.globalAlpha = 1;
  }

  // ───────────────────────── HUD ─────────────────────────
  private renderHud() {
    const g = this.g, W = this.W, H = this.H, p = this.p, st = this.stats, t = this.time;
    g.save();
    // Bars
    const bx = 14, by = 14, bw = Math.min(230, W * 0.5);
    g.fillStyle = 'rgba(8,4,6,0.75)'; roundRect(g, bx - 6, by - 6, bw + 12, 50, 8); g.fill();
    g.strokeStyle = 'rgba(212,168,74,0.5)'; g.lineWidth = 1; roundRect(g, bx - 6, by - 6, bw + 12, 50, 8); g.stroke();
    const hpK = Math.max(0, p.hp / st.maxHp), blK = Math.max(0, p.blood / st.maxBlood);
    g.fillStyle = '#2a0a10'; g.fillRect(bx, by, bw, 14);
    const hg = g.createLinearGradient(0, by, 0, by + 14); hg.addColorStop(0, '#e0303a'); hg.addColorStop(1, '#801018');
    g.fillStyle = hg; g.fillRect(bx, by, bw * hpK, 14);
    if (p.shield > 0) { g.fillStyle = 'rgba(255,160,180,0.55)'; g.fillRect(bx, by, Math.min(bw, bw * (p.shield / st.maxHp)), 4); }
    g.fillStyle = '#100408'; g.fillRect(bx, by + 20, bw, 10);
    const bg = g.createLinearGradient(bx, 0, bx + bw, 0); bg.addColorStop(0, '#5a0010'); bg.addColorStop(1, p.frenzy ? '#ff2040' : '#b0102a');
    g.fillStyle = bg; g.fillRect(bx, by + 20, bw * blK, 10);
    for (let i = 0; i < 3; i++) { const x = bx + ((t * 30 + i * 70) % (bw * blK || 1)); g.fillStyle = 'rgba(255,120,140,0.35)'; g.fillRect(x, by + 21, 3, 8); }
    g.font = '600 10px Cinzel, serif'; g.textAlign = 'left'; g.fillStyle = '#f0e0d0';
    g.fillText(`${Math.ceil(p.hp)} / ${st.maxHp}`, bx + 4, by + 11);
    g.fillStyle = '#ffd0d8'; g.fillText(p.frenzy ? 'FRENZY' : p.starveT > 0 ? 'STARVING' : `Blood ${Math.floor(p.blood)}`, bx + 4, by + 29);
    // Buff icons
    let ix = bx;
    const buffs = [...this.buffs.map((b) => ({ c: b.color, label: b.name, t: b.t })), ...(p.form ? [{ c: FORM_BY_ID[p.form].color, label: FORM_BY_ID[p.form].name, t: p.formT < 999 ? p.formT : 0 }] : [])];
    g.font = '600 9px Cinzel, serif';
    for (const b of buffs.slice(0, 4)) {
      const label = `${b.label}${b.t ? ` ${Math.ceil(b.t)}s` : ''}`;
      const w = g.measureText(label).width + 10;
      g.fillStyle = 'rgba(8,4,6,0.7)'; roundRect(g, ix, by + 50, w, 15, 4); g.fill();
      g.fillStyle = b.c.startsWith('#') ? b.c : '#ff8090'; g.fillText(label, ix + 5, by + 61);
      ix += w + 4;
    }
    // Region / floor title + minimap
    this.renderMinimap();
    // Boss bar
    const boss = this.bossEnt;
    if (boss && !boss.dead) {
      const def = boss.def as BossDef;
      const w = Math.min(W - 40, 480), x = (W - w) / 2, y = H - (this.touch ? 300 : 60);
      const yy = this.touch ? 86 : y;
      g.fillStyle = 'rgba(8,4,6,0.85)'; roundRect(g, x - 8, yy - 22, w + 16, 40, 6); g.fill();
      g.strokeStyle = 'rgba(212,168,74,0.6)'; roundRect(g, x - 8, yy - 22, w + 16, 40, 6); g.stroke();
      g.font = '700 13px Cinzel, serif'; g.textAlign = 'center'; g.fillStyle = '#f0d8c0';
      g.fillText(`${def.name} — ${def.phases[boss.phase].name}`, W / 2, yy - 7);
      g.fillStyle = '#2a0a10'; g.fillRect(x, yy, w, 10);
      g.fillStyle = '#c01030'; g.fillRect(x, yy, w * Math.max(0, boss.hp / boss.maxHp), 10);
      for (const ph of def.phases.slice(1)) { g.fillStyle = '#d4a84a'; g.fillRect(x + w * ph.at - 1, yy - 2, 2, 14); }
    }
    // Messages
    let my = H * 0.26;
    for (const m of this.messages) {
      const a = Math.min(1, m.t / 0.5);
      g.globalAlpha = a; g.textAlign = 'center';
      g.font = m.big ? '700 22px Cinzel, serif' : 'italic 15px "Cormorant Garamond", serif';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(m.text, W / 2, my); g.fillStyle = m.color; g.fillText(m.text, W / 2, my);
      my += m.big ? 30 : 22;
    }
    g.globalAlpha = 1;
    // Loot feed
    let ly = H * (this.touch ? 0.52 : 0.7);
    g.textAlign = 'left'; g.font = '600 12px Cinzel, serif';
    for (const l of this.lootFeed) { g.globalAlpha = Math.min(1, l.t); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(10, ly - 12, g.measureText(l.text).width + 12, 17); g.fillStyle = l.color; g.fillText(l.text, 16, ly); ly += 20; }
    g.globalAlpha = 1;
    // Combo
    if (this.combo >= 5) {
      g.textAlign = 'right'; g.font = `700 ${18 + Math.min(14, this.combo / 3)}px Cinzel, serif`;
      g.fillStyle = `rgba(255,${200 - Math.min(160, this.combo * 4)},80,${Math.min(1, this.comboT)})`;
      g.fillText(`${this.combo} hits`, W - 14, 150);
    }
    // Controls
    this.renderControls();
    // Death overlay
    if (p.hp <= 0) {
      g.fillStyle = `rgba(20,0,4,${Math.min(0.8, this.deathT * 0.5)})`; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.font = '700 30px Cinzel, serif'; g.fillStyle = '#ff3050'; g.fillText('You have fallen', W / 2, H / 2);
    }
    // Boss intro letterbox
    if (this.bossIntro > 0) {
      const k = Math.min(1, this.bossIntro, 3.2 - this.bossIntro) ;
      g.fillStyle = '#000'; g.fillRect(0, 0, W, 50 * k); g.fillRect(0, H - 50 * k, W, 50 * k);
    }
    g.restore();
  }

  private renderMinimap() {
    const g = this.g, f = this.floor, W = this.W;
    const s = Math.min(2.4, 110 / f.w);
    const mw = f.w * s, mh = f.h * s, x0 = W - mw - 48, y0 = 10;
    g.fillStyle = 'rgba(8,4,6,0.7)'; roundRect(g, x0 - 4, y0 - 4, mw + 8, mh + 8, 6); g.fill();
    for (const r of f.rooms) {
      if (!this.visited.has(r.id) && !r.activated) continue;
      g.fillStyle = r.kind === 'boss' ? 'rgba(200,30,50,0.6)' : r.kind === 'exit' ? 'rgba(220,60,90,0.6)' : r.kind === 'secret' ? 'rgba(180,140,255,0.6)' : 'rgba(200,180,160,0.35)';
      g.fillRect(x0 + r.x * s, y0 + r.y * s, r.w * s, r.h * s);
    }
    g.fillStyle = '#ff3050'; g.beginPath(); g.arc(x0 + (this.p.x / TILE) * s, y0 + (this.p.y / TILE) * s, 2.5, 0, 7); g.fill();
    for (const e of this.enemies) if (!e.dead && e.aware) { g.fillStyle = e.boss ? '#ffb040' : '#c08080'; g.fillRect(x0 + (e.x / TILE) * s - 1, y0 + (e.y / TILE) * s - 1, 2, 2); }
    g.font = '600 9px Cinzel, serif'; g.textAlign = 'right'; g.fillStyle = '#c8b090';
    g.fillText(this.isBoss ? `${this.region.name} · Lair` : `${this.region.name} · ${this.cfg.floor}/${this.region.floors}`, x0 + mw + 4, y0 + mh + 16);
  }

  private renderControls() {
    const g = this.g, p = this.p, t = this.time;
    const showTouch = this.touch;
    if (showTouch && this.stick.active) {
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.strokeStyle = 'rgba(212,168,74,0.35)'; g.lineWidth = 2;
      g.beginPath(); g.arc(this.stick.ox, this.stick.oy, 60, 0, 7); g.fill(); g.stroke();
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, d = Math.hypot(dx, dy), k = Math.min(1, 60 / (d || 1));
      g.fillStyle = 'rgba(200,40,60,0.55)'; g.beginPath(); g.arc(this.stick.ox + dx * k, this.stick.oy + dy * k, 26, 0, 7); g.fill();
    } else if (showTouch) {
      g.fillStyle = 'rgba(255,255,255,0.04)'; g.beginPath(); g.arc(90, this.H - 110, 54, 0, 7); g.fill();
      g.font = 'italic 11px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(220,200,180,0.35)'; g.fillText('move', 90, this.H - 106);
    }
    const nearFeed = this.enemies.some((e) => !e.dead && this.feedable(e) && Math.hypot(e.x - p.x, e.y - p.y) < (p.frenzy ? 150 : 80));
    for (const b of this.buttons) {
      if (!showTouch && b.id !== 'pause') continue;
      let cdK = 0, dim = false, glow = '';
      let ic = b.icon;
      if (b.id.startsWith('ab')) {
        const a = this.abilities[Number(b.id[2])];
        if (!a) { g.strokeStyle = 'rgba(212,168,74,0.15)'; g.lineWidth = 1.5; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke(); continue; }
        cdK = a.cd / Math.max(0.1, a.params.cooldown ?? 1);
        dim = p.blood < (a.params.cost ?? 0) * this.stats.costMult;
        glow = ELEMENT_COLOR[a.element];
        ic = a.def.icon;
      }
      if (b.id === 'dash') cdK = Math.max(0, p.dashCd / 0.75);
      if (b.id === 'feed') { dim = !nearFeed; if (nearFeed) glow = '#ff2040'; }
      if (b.id === 'form') { const f = FORM_BY_ID[this.cfg.state.heir.form]; cdK = p.formCd > 0 ? p.formCd / f.cooldown : 0; glow = p.form ? f.color : ''; ic = f.icon; dim = !formAvailable(this.cfg.state.heir, f); }
      if (b.id.startsWith('pot')) { const id = this.cfg.state.heir.belt[Number(b.id[3])]; if (!id) continue; dim = (this.cfg.state.consumables[id] ?? 0) <= 0; }
      const pressed = [...this.held.values()].includes(b.id);
      g.fillStyle = pressed ? 'rgba(120,20,40,0.75)' : 'rgba(14,8,10,0.62)';
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
      if (glow) { g.shadowColor = glow; g.shadowBlur = b.id === 'feed' ? 12 + Math.sin(t * 8) * 6 : 8; }
      g.strokeStyle = glow || 'rgba(212,168,74,0.55)'; g.lineWidth = b.id === 'attack' ? 2.5 : 1.8;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke();
      g.shadowBlur = 0;
      const ip = iconPath(ic);
      if (ip) { const s = (b.r * 1.15) / 512; g.save(); g.translate(b.x - b.r * 0.575, b.y - b.r * 0.575); g.scale(s, s); g.fillStyle = dim ? 'rgba(200,180,170,0.3)' : '#f0e4d8'; g.fill(ip); g.restore(); }
      if (cdK > 0) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.moveTo(b.x, b.y); g.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdK); g.closePath(); g.fill(); }
      if (b.id.startsWith('pot')) { const id = this.cfg.state.heir.belt[Number(b.id[3])]!; g.font = '700 10px Cinzel, serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(String(this.cfg.state.consumables[id] ?? 0), b.x + b.r * 0.7, b.y + b.r * 0.9); }
    }
    if (!showTouch) {
      g.font = '600 10px Cinzel, serif'; g.textAlign = 'left'; g.fillStyle = 'rgba(220,200,180,0.55)';
      const names = this.abilities.map((a, i) => (a ? `${['Q', 'E', 'R', 'F'][i]} ${a.name}` : '')).filter(Boolean).join('   ');
      g.fillText(`WASD move · Click attack · Space dash · ${names} · V feed · T form · 1/2 potions`, 14, this.H - 14);
      // Desktop ability bar
      const n = 4, size = 40, x0 = this.W / 2 - (n * (size + 8)) / 2, y0 = this.H - 70;
      this.abilities.forEach((a, i) => {
        const x = x0 + i * (size + 8);
        g.fillStyle = 'rgba(14,8,10,0.7)'; roundRect(g, x, y0, size, size, 6); g.fill();
        g.strokeStyle = a ? ELEMENT_COLOR[a.element] : 'rgba(212,168,74,0.2)'; roundRect(g, x, y0, size, size, 6); g.stroke();
        if (!a) return;
        const ip = iconPath(a.def.icon);
        if (ip) { g.save(); g.translate(x + 6, y0 + 6); g.scale(28 / 512, 28 / 512); g.fillStyle = p.blood < (a.params.cost ?? 0) ? '#605050' : '#f0e4d8'; g.fill(ip); g.restore(); }
        const k = a.cd / Math.max(0.1, a.params.cooldown ?? 1);
        if (k > 0) { g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x, y0 + size * (1 - k), size, size * k); }
        g.fillStyle = '#d4a84a'; g.fillText(['Q', 'E', 'R', 'F'][i], x + 3, y0 + 11);
      });
    }
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const k = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
  return Math.hypot(px - (x1 + dx * k), py - (y1 + dy * k));
}
