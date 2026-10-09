import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { ShowState } from '../../shared/types.ts';
import { createScreenSocket, useShowConnection, type ScreenSocket } from '../lib/socket.ts';
import { getTheme } from '../themes/index.ts';
import type { Theme } from '../themes/types.ts';
import { GameView } from './GameView.tsx';
import { LobbyView } from './LobbyView.tsx';
import { RoundResultsView } from './RoundResultsView.tsx';
import { StandingsView } from './StandingsView.tsx';

export interface ViewProps {
  state: ShowState;
  theme: Theme;
}

function CurrentView({ state, theme }: ViewProps) {
  switch (state.phase) {
    case 'lobby':
      return <LobbyView state={state} theme={theme} />;
    case 'game':
      return <GameView state={state} theme={theme} />;
    case 'roundResults':
      return <RoundResultsView state={state} theme={theme} />;
    case 'standings':
      return <StandingsView state={state} theme={theme} />;
  }
}

export function ScreenRoot() {
  const [socket, setSocket] = useState<ScreenSocket | null>(null);
  useEffect(() => {
    const s = createScreenSocket();
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);
  const { state, status } = useShowConnection(socket);

  const theme = getTheme(state?.show.themeId ?? 'default');
  // Ny nøkkel ved faseskifte eller nytt spill gir animert overgang.
  const viewKey = state ? `${state.phase}-${state.phase === 'lobby' || state.phase === 'standings' ? '' : state.currentGameId}` : 'loading';

  return (
    <div className="screen" style={theme.vars}>
      {theme.Background && <theme.Background />}
      <AnimatePresence mode="wait">
        {state && (
          <motion.main
            key={viewKey}
            className="screen-view"
            initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <CurrentView state={state} theme={theme} />
          </motion.main>
        )}
      </AnimatePresence>
      {status !== 'connected' && <div className="screen-offline">Kobler til server …</div>}
    </div>
  );
}
