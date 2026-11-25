import { useEffect } from 'react';
import { audio } from '../game/engine/audio';
import { Icon } from './components';
import { Create } from './screens/Create';
import { Haven } from './screens/Haven';
import { HuntView } from './screens/HuntView';
import { Succession } from './screens/Succession';
import { Title } from './screens/Title';
import { StoreProvider, useStore } from './store';

function Screens() {
  const { screen, s, toasts, dismiss } = useStore();
  useEffect(() => {
    if (s) audio.setVolumes(s.settings.sfx, s.settings.music);
    if (screen === 'haven') audio.startMusic('haven');
  }, [screen, s]);
  return (
    <>
      {screen === 'title' && <Title />}
      {screen === 'create' && <Create />}
      {screen === 'haven' && s && <Haven />}
      {screen === 'hunt' && s && <HuntView />}
      {screen === 'succession' && s && <Succession />}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-1.5 px-3">
        {toasts.map((t) => (
          <button key={t.id} onClick={() => dismiss(t.id)} className={`pointer-events-auto fade-in flex max-w-md items-start gap-2 rounded border px-3 py-2 text-left text-sm shadow-xl backdrop-blur ${t.tone === 'epic' ? 'border-amber-300/60 bg-[#2a1a08]/95 text-amber-100' : t.tone === 'bad' ? 'border-red-400/50 bg-[#2a0a10]/95 text-red-100' : t.tone === 'good' ? 'border-emerald-400/40 bg-[#0a1a12]/95 text-emerald-100' : 'border-gold/30 bg-[#140c0f]/95 text-parch'}`}>
            <Icon name={t.tone === 'epic' ? 'sparkles' : t.tone === 'bad' ? 'bleeding-wound' : 'quill-ink'} size={16} className="mt-0.5 shrink-0" />
            <span>{t.text}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function App() {
  return <StoreProvider><Screens /></StoreProvider>;
}
