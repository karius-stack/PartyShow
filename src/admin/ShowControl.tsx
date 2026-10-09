import { useEffect, useRef, useState } from 'react';
import { nextGame, timerRemainingMs } from '../../shared/scoring.ts';
import type { Phase, TimerState } from '../../shared/types.ts';
import { formatTime, PHASE_LABELS } from '../lib/format.ts';
import { useServerNow } from '../lib/serverClock.ts';
import { useAdmin } from './context.ts';
import { ScorePanel } from './ScorePanel.tsx';

function TimerControl({ timer }: { timer: TimerState }) {
  const { send } = useAdmin();
  const running = timer.endsAt !== null;
  const now = useServerNow(running, 250);

  return (
    <div className="admin-card">
      <h3>Timer</h3>
      <div className="timer-control">
        <span className="timer-control-value">{formatTime(timerRemainingMs(timer, now))}</span>
        {running ? (
          <button className="btn" onClick={() => send('timer:pause')}>
            Pause
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => send('timer:start')}>
            Start
          </button>
        )}
        <button className="btn" onClick={() => send('timer:reset')}>
          Nullstill
        </button>
      </div>
    </div>
  );
}

/** Viser storskjermen nedskalert fra 1920×1080 til kortets bredde. */
function ScreenPreview() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      el.style.setProperty('--preview-scale', String(entry.contentRect.width / 1920));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="preview" ref={ref}>
      <iframe src="/" title="Storskjerm" tabIndex={-1} />
    </div>
  );
}

function ManualOverride() {
  const { state, send } = useAdmin();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [chosenGameId, setGameId] = useState<number | null>(null);
  // Faller tilbake på første spill hvis valget mangler eller er slettet.
  const gameId = state.games.some((g) => g.id === chosenGameId) ? chosenGameId : (state.games[0]?.id ?? null);
  const needsGame = phase === 'game' || phase === 'roundResults';

  return (
    <details className="admin-card">
      <summary>Manuell styring</summary>
      <p className="admin-hint">Bruk dette for å rette feil – f.eks. hoppe tilbake til et spill eller vise et tidligere resultat.</p>
      <div className="admin-row">
        <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
          {(Object.keys(PHASE_LABELS) as Phase[]).map((p) => (
            <option key={p} value={p}>
              {PHASE_LABELS[p]}
            </option>
          ))}
        </select>
        {needsGame && (
          <select value={gameId ?? ''} onChange={(e) => setGameId(e.target.value ? Number(e.target.value) : null)}>
            {state.games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
        <button className="btn" onClick={() => send('show:goTo', phase, needsGame ? gameId : null)}>
          Vis på storskjerm
        </button>
      </div>
    </details>
  );
}

export function ShowControl() {
  const { state, send } = useAdmin();
  const current = state.games.find((g) => g.id === state.currentGameId) ?? null;
  const upcoming = nextGame(state, state.games);
  const inGame = state.phase === 'game';

  return (
    <div className="show-control">
      <div className="admin-card">
        <h3>Nå på storskjermen</h3>
        <p className="admin-now">
          {PHASE_LABELS[state.phase]}
          {current && state.phase !== 'lobby' && state.phase !== 'standings' && <> – {current.title}</>}
        </p>
        <div className="admin-row">
          <button
            className="btn btn-primary"
            disabled={inGame || !upcoming}
            onClick={() => send('show:startNextGame')}
            title={inGame ? 'Vis runderesultater først' : undefined}
          >
            {upcoming ? `Start neste spill: ${upcoming.title}` : 'Ingen flere spill'}
          </button>
          <button className="btn" disabled={!inGame} onClick={() => send('show:showRoundResults')}>
            Vis runderesultater
          </button>
          <button
            className="btn"
            disabled={state.revealedGameIds.length === 0 || state.phase === 'standings'}
            onClick={() => send('show:showStandings')}
          >
            Vis sammenlagt
          </button>
          <button className="btn" disabled={state.phase === 'lobby'} onClick={() => send('show:goTo', 'lobby', null)}>
            Til lobby
          </button>
        </div>
        {state.phase === 'lobby' && state.teams.length === 0 && <p className="admin-hint">Ingen lag er registrert ennå.</p>}
        {state.games.length === 0 && <p className="admin-hint">Ingen spill er lagt inn ennå – se fanen «Spill».</p>}
      </div>

      {inGame && state.timer && <TimerControl timer={state.timer} />}

      <ScorePanel />

      <div className="admin-card">
        <h3>Forhåndsvisning</h3>
        <ScreenPreview />
      </div>

      <ManualOverride />
    </div>
  );
}
