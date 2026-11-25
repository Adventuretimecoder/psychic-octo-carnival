import { useEffect, useRef, useState } from 'react';
import { audio } from '../../game/engine/audio';
import { deleteSlot, importCode, lastSlot, load, slots } from '../../game/systems/save';
import { Btn, Icon, Modal } from '../components';
import { useStore } from '../store';

/** Animated title: a blood moon over a gothic skyline, bats crossing, embers rising. */
function TitleBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext('2d')!;
    let raf = 0;
    const bats = Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: 0.15 + Math.random() * 0.35, s: 0.5 + Math.random(), p: i }));
    const draw = (now: number) => {
      const t = now / 1000;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#12060a'); sky.addColorStop(0.55, '#2a0812'); sky.addColorStop(1, '#070304');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // Stars
      for (let i = 0; i < 90; i++) { const x = (i * 127.1) % W, y = ((i * 311.7) % (H * 0.6)); g.fillStyle = `rgba(255,230,230,${0.2 + 0.3 * Math.sin(t * 1.3 + i)})`; g.fillRect(x, y, 1.2, 1.2); }
      // Blood moon
      const mx = W * 0.68, my = H * 0.27, mr = Math.min(W, H) * 0.16;
      const halo = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.2);
      halo.addColorStop(0, 'rgba(220,30,50,0.35)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = halo; g.fillRect(0, 0, W, H);
      const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      moon.addColorStop(0, '#ff8a70'); moon.addColorStop(0.6, '#c0182c'); moon.addColorStop(1, '#5a0612');
      g.fillStyle = moon; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
      g.fillStyle = 'rgba(80,0,10,0.35)'; for (const [dx, dy, r] of [[-0.3, -0.1, 0.18], [0.25, 0.2, 0.12], [0.05, -0.4, 0.09], [-0.1, 0.35, 0.1]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, 7); g.fill(); }
      // Clouds drifting across
      for (let i = 0; i < 4; i++) { const cx = ((t * (8 + i * 3) + i * 300) % (W + 400)) - 200, cy = H * (0.22 + i * 0.07); g.fillStyle = 'rgba(20,4,8,0.55)'; g.beginPath(); g.ellipse(cx, cy, 180, 18, 0, 0, 7); g.fill(); }
      // Skyline: spires and a castle
      g.fillStyle = '#050203';
      const base = H * 0.72;
      g.beginPath(); g.moveTo(0, H); g.lineTo(0, base);
      const spires = [[0.05, 0.1], [0.12, 0.05], [0.18, 0.16], [0.26, 0.08], [0.33, 0.24], [0.37, 0.12], [0.45, 0.06], [0.52, 0.3], [0.56, 0.18], [0.6, 0.34], [0.64, 0.2], [0.72, 0.1], [0.8, 0.22], [0.86, 0.07], [0.93, 0.14], [1, 0.05]];
      for (const [fx, h] of spires) { const x = fx * W, top = base - h * H * 0.55; g.lineTo(x - 14, base - h * H * 0.3); g.lineTo(x - 8, base - h * H * 0.3); g.lineTo(x, top); g.lineTo(x + 8, base - h * H * 0.3); g.lineTo(x + 14, base - h * H * 0.3); }
      g.lineTo(W, base); g.lineTo(W, H); g.closePath(); g.fill();
      // Lit windows
      for (let i = 0; i < 24; i++) { const x = ((i * 97.3) % 1) * W + (i * 41) % W, y = base - 10 - ((i * 53) % 90); g.fillStyle = `rgba(255,${150 + (i % 4) * 20},80,${0.4 + 0.3 * Math.sin(t * 2 + i)})`; g.fillRect(x % W, y, 3, 5); }
      // Bats
      for (const b of bats) {
        b.x += 0.0006 * b.s * 16; if (b.x > 1.1) { b.x = -0.1; b.y = 0.12 + Math.random() * 0.35; }
        const x = b.x * W, y = b.y * H + Math.sin(t * 2 + b.p) * 12, f = Math.sin(t * 18 + b.p) * 6 * b.s;
        g.fillStyle = '#0a0204'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 9 * b.s, y - f); g.lineTo(x - 4 * b.s, y + 2); g.lineTo(x, y + 3); g.lineTo(x + 4 * b.s, y + 2); g.lineTo(x + 9 * b.s, y - f); g.closePath(); g.fill();
      }
      // Rising embers
      for (let i = 0; i < 40; i++) { const x = ((i * 71.3 + t * 12 * (1 + (i % 3))) % W), y = H - ((t * 25 * (1 + (i % 4)) + i * 47) % (H * 0.8)); g.fillStyle = `rgba(255,${60 + (i % 5) * 25},60,${0.5 * Math.sin(t + i) + 0.4})`; g.fillRect(x, y, 2, 2); }
      // Fog
      const fog = g.createLinearGradient(0, H * 0.65, 0, H); fog.addColorStop(0, 'rgba(60,10,20,0)'); fog.addColorStop(1, 'rgba(60,10,20,0.45)');
      g.fillStyle = fog; g.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export function Title() {
  const { setGame, go, toast, ask } = useStore();
  const [list, setList] = useState(slots());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState(false);
  const last = lastSlot();
  const cont = list[last] ?? list.find(Boolean);

  const start = (slot: number) => { const g = load(slot); if (g) { audio.init(); setGame(g, slot); go(g.heir.alive ? 'haven' : 'succession'); } };
  const freeSlot = () => { const i = list.findIndex((x) => !x); return i < 0 ? -1 : i; };

  return (
    <div className="relative h-full overflow-hidden">
      <TitleBackdrop />
      <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-14 text-center sm:justify-center sm:pb-0">
        <div className="fade-in mb-auto pt-[12vh] sm:mb-10 sm:pt-0">
          <p className="font-fell text-sm tracking-[0.35em] text-mist uppercase">Eryndor · 1847 After the Sundering</p>
          <h1 className="title-glow mt-3 font-display text-5xl font-bold tracking-[0.12em] text-parch sm:text-7xl">SANGUINIS</h1>
          <div className="rule mx-auto my-3 w-64" />
          <p className="gold-text font-display text-lg tracking-[0.3em] sm:text-xl">THE AGE OF BLOOD</p>
        </div>
        <div className="fade-in flex w-full max-w-xs flex-col gap-2.5" style={{ animationDelay: '0.3s' }}>
          {cont && <Btn variant="primary" onClick={() => start(cont.slot)}>Continue — House {cont.name}</Btn>}
          <Btn variant={cont ? 'default' : 'primary'} onClick={() => { audio.init(); const f = freeSlot(); if (f < 0) { toast('All three dynasty slots are taken. Delete one first.', 'bad'); setLoading(true); return; } localStorage.setItem('sanguinis-new-slot', String(f)); go('create'); }}>Found a Dynasty</Btn>
          {list.some(Boolean) && <Btn onClick={() => setLoading(true)}>Chronicles</Btn>}
          <div className="flex gap-2">
            <Btn variant="ghost" className="flex-1" onClick={() => setImporting(true)}>Import</Btn>
            <Btn variant="ghost" className="flex-1" onClick={() => setCredits(true)}>Credits</Btn>
          </div>
        </div>
      </div>
      {loading && (
        <Modal title="Chronicles of the Houses" onClose={() => setLoading(false)}>
          <div className="space-y-2">
            {list.map((x, i) => (
              <div key={i} className="flex items-center gap-3 rounded border border-gold/20 bg-black/40 p-3">
                <Icon name="tied-scroll" size={28} color="#d4a84a" />
                <div className="flex-1 text-left">
                  {x ? <><div className="font-display text-parch">House {x.name}</div><div className="text-xs text-mist">{x.heir} · Gen {x.generation} · Rank {x.rank} · Night {x.night}</div></> : <div className="italic text-mist">Empty slot</div>}
                </div>
                {x && <Btn small onClick={() => start(i)}>Load</Btn>}
                {x && <Btn small variant="ghost" onClick={() => { ask(`Erase House ${x.name} forever?`, () => { { deleteSlot(i); setList(slots()); } }); }}>✕</Btn>}
              </div>
            ))}
          </div>
        </Modal>
      )}
      {importing && (
        <Modal title="Import a Dynasty" onClose={() => setImporting(false)}>
          <p className="mb-2 text-sm text-mist">Paste a save code exported from another device.</p>
          <textarea className="h-32 w-full font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SANG1:…" />
          <Btn variant="primary" className="mt-3 w-full" onClick={() => {
            const g = importCode(code);
            if (!g) { toast('That code is not a valid chronicle.', 'bad'); return; }
            const f = freeSlot() < 0 ? 0 : freeSlot();
            setGame(g, f); setImporting(false); go(g.heir.alive ? 'haven' : 'succession');
          }}>Import</Btn>
        </Modal>
      )}
      {credits && (
        <Modal title="Credits" onClose={() => setCredits(false)}>
          <div className="space-y-2 text-sm text-mist">
            <p><span className="text-parch">Sanguinis — The Age of Blood</span> is an original game. All world, lore and characters are original.</p>
            <p>Icons: <span className="text-parch">game-icons.net</span> by Lorc, Delapouite and contributors — licensed CC BY 3.0.</p>
            <p>Fonts: Cinzel, Cormorant Garamond and IM Fell English — SIL Open Font License.</p>
            <p>All art and sound are procedurally generated in the browser.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
