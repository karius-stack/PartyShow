import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { AppState, AwardsState, GameshowState, ShowInfo } from '../../shared/types.ts';
import { createScreenSocket, useShowConnection, type ScreenSocket } from '../lib/socket.ts';
import { getTheme } from '../themes/index.ts';
import type { Theme } from '../themes/types.ts';
import { CeremonyView } from './awards/CeremonyView.tsx';
import { FinishedView } from './awards/FinishedView.tsx';
import { NominatingView } from './awards/NominatingView.tsx';
import { RegistrationView } from './awards/RegistrationView.tsx';
import './awards/awards.css';
import { GameView } from './GameView.tsx';
import { LandingView } from './LandingView.tsx';
import { LobbyView } from './LobbyView.tsx';
import { RoundResultsView } from './RoundResultsView.tsx';
import { StandingsView } from './StandingsView.tsx';
import './screen.css';

export interface ViewProps {
  state: GameshowState;
  show: ShowInfo;
  theme: Theme;
}

export interface AwardsViewProps {
  state: AwardsState;
  show: ShowInfo;
  theme: Theme;
}

function GameshowView(props: ViewProps) {
  switch (props.state.phase) {
    case 'lobby':
      return <LobbyView {...props} />;
    case 'game':
      return <GameView {...props} />;
    case 'roundResults':
      return <RoundResultsView {...props} />;
    case 'standings':
      return <StandingsView {...props} />;
  }
}

function AwardsView(props: AwardsViewProps) {
  switch (props.state.phase) {
    case 'registration':
      return <RegistrationView {...props} />;
    case 'nominating':
      return <NominatingView {...props} />;
    case 'ceremony':
      return <CeremonyView {...props} />;
    case 'finished':
      return <FinishedView {...props} />;
  }
}

function CurrentView({ state, theme }: { state: AppState; theme: Theme }) {
  switch (state.activeMode) {
    case null:
      return <LandingView showName={state.show.name} />;
    case 'gameshow':
      return <GameshowView state={state.gameshow} show={state.show} theme={theme} />;
    case 'awards':
      return <AwardsView state={state.awards} show={state.show} theme={theme} />;
  }
}

/** Ny nøkkel ved modusbytte, faseskifte eller nytt spill/ny nominasjon gir animert overgang. */
function viewKey(state: AppState | null): string {
  if (!state) return 'loading';
  switch (state.activeMode) {
    case null:
      return 'landing';
    case 'gameshow': {
      const { phase, currentGameId } = state.gameshow;
      return `gameshow-${phase}-${phase === 'lobby' || phase === 'standings' ? '' : currentGameId}`;
    }
    case 'awards': {
      const { phase, currentCategoryId } = state.awards;
      return `awards-${phase}-${phase === 'ceremony' ? currentCategoryId : ''}`;
    }
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

  return (
    <div className={`screen theme-${theme.id}`} style={theme.vars}>
      {theme.Background && <theme.Background />}
      <AnimatePresence mode="wait">
        {state && (
          <motion.main
            key={viewKey(state)}
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
