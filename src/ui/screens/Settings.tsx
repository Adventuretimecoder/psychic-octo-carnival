import { useState } from 'react';
import { audio } from '../../game/engine/audio';
import { exportCode, save } from '../../game/systems/save';
import { dev } from '../../game/systems/dev';
import { Btn, Modal } from '../components';
import { useGame } from '../store';

export function Settings({ onClose }: { onClose: () => void }) {
  const { s, act, go, setGame, slot, toast } = useGame();
  const [code, setCode] = useState('');
  const set = (k: keyof typeof s.settings, v: number | boolean) => act((g) => { (g.settings as Record<string, number | boolean>)[k] = v; audio.setVolumes(g.settings.sfx, g.settings.music); });
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">Sound effects <input type="range" min={0} max={1} step={0.05} value={s.settings.sfx} onChange={(e) => set('sfx', Number(e.target.value))} className="w-full !p-0" /></label>
        <label className="block">Music <input type="range" min={0} max={1} step={0.05} value={s.settings.music} onChange={(e) => set('music', Number(e.target.value))} className="w-full !p-0" /></label>
        {([['shake', 'Screen shake'], ['autoAim', 'Auto-aim (desktop)'], ['damageNumbers', 'Damage numbers']] as const).map(([k, l]) => (
          <label key={k} className="flex items-center justify-between">{l}<input type="checkbox" checked={s.settings[k]} onChange={(e) => set(k, e.target.checked)} className="h-5 w-5" /></label>
        ))}
        <label className="flex items-center justify-between rounded border border-sky-300/30 bg-sky-900/10 px-2 py-1.5"><span>Developer mode<span className="block text-xs text-mist">Adds a wrench button with tools for every system.</span></span><input type="checkbox" checked={!!s.dev?.enabled} onChange={(e) => act((g) => { dev(g).enabled = e.target.checked; return e.target.checked ? 'Developer mode on. Tap the wrench in the top bar.' : 'Developer mode off.'; })} className="h-5 w-5" /></label>
        <div className="rule" />
        <p className="text-xs text-mist">Your dynasty autosaves in this browser after every action. Export a code to back it up or move it to another device (or the Android app).</p>
        <Btn className="w-full" onClick={() => { const c = exportCode(s); setCode(c); navigator.clipboard?.writeText(c).then(() => toast('Save code copied to clipboard.', 'good'), () => {}); }}>Export save code</Btn>
        {code && <textarea readOnly className="h-24 w-full font-mono text-[0.6rem]" value={code} onFocus={(e) => e.target.select()} />}
        <Btn variant="ghost" className="w-full" onClick={() => { save(s, slot); setGame(null); go('title'); audio.stopMusic(); }}>Save & return to title</Btn>
      </div>
    </Modal>
  );
}
