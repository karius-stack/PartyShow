import { useEffect, useState, type KeyboardEvent } from 'react';
import { useAdmin } from './context.ts';

function ScoreInput({ value, onCommit }: { value: number | undefined; onCommit: (points: number | null) => void }) {
  const [text, setText] = useState(value?.toString() ?? '');
  const [focused, setFocused] = useState(false);

  // Hold feltet synkront med serveren når man ikke skriver i det.
  useEffect(() => {
    if (!focused) setText(value?.toString() ?? '');
  }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const trimmed = text.trim().replace(',', '.');
    const points = trimmed === '' ? null : Number(trimmed);
    if (points !== null && !Number.isFinite(points)) {
      setText(value?.toString() ?? '');
      return;
    }
    if (points !== (value ?? null)) onCommit(points);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  return (
    <div className="score-input">
      <button className="btn btn-small" onClick={() => onCommit((value ?? 0) - 1)} aria-label="Trekk fra ett poeng">
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder="0"
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <button className="btn btn-small" onClick={() => onCommit((value ?? 0) + 1)} aria-label="Legg til ett poeng">
        +
      </button>
    </div>
  );
}

export function ScorePanel() {
  const { state, send } = useAdmin();
  const [gameId, setGameId] = useState<number | null>(state.currentGameId ?? state.games[0]?.id ?? null);

  // Følg aktivt spill når showet går videre.
  useEffect(() => {
    if (state.currentGameId !== null) setGameId(state.currentGameId);
  }, [state.currentGameId]);

  const game = state.games.find((g) => g.id === gameId) ?? state.games[0];
  if (!game) return null;

  const revealed = state.revealedGameIds.includes(game.id);
  const scores = state.scores[game.id] ?? {};

  return (
    <div className="admin-card">
      <h3>Poeng</h3>
      <div className="admin-row">
        <select value={game.id} onChange={(e) => setGameId(Number(e.target.value))}>
          {state.games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
              {g.id === state.currentGameId ? ' (aktivt)' : ''}
            </option>
          ))}
        </select>
        <span className={`badge${revealed ? ' badge-on' : ''}`}>{revealed ? 'Vist på storskjerm' : 'Skjult for publikum'}</span>
      </div>
      {state.teams.length === 0 ? (
        <p className="admin-hint">Ingen lag registrert.</p>
      ) : (
        <table className="score-table">
          <tbody>
            {state.teams.map((team) => (
              <tr key={team.id}>
                <td>{team.name}</td>
                <td>
                  <ScoreInput value={scores[team.id]} onCommit={(points) => send('score:set', game.id, team.id, points)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
