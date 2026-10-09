import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Game, GameInput, MediaType } from '../../shared/types.ts';
import { useAdmin } from './context.ts';

const EMPTY_GAME: GameInput = { title: '', description: '', timerSeconds: null, mediaUrl: null, mediaType: null };

async function uploadMedia(file: File, pin: string): Promise<{ url: string; mediaType: MediaType }> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/uploads', { method: 'POST', headers: { 'x-admin-pin': pin }, body });
  const json = (await res.json().catch(() => ({}))) as { url?: string; mediaType?: MediaType; error?: string };
  if (!res.ok || !json.url || !json.mediaType) throw new Error(json.error ?? 'Opplasting feilet');
  return { url: json.url, mediaType: json.mediaType };
}

function GameForm({ initial, onSave, onCancel }: { initial: GameInput; onSave: (input: GameInput) => Promise<boolean>; onCancel: () => void }) {
  const { pin, showError } = useAdmin();
  const [input, setInput] = useState(initial);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof GameInput>(key: K, value: GameInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url, mediaType } = await uploadMedia(file, pin);
      setInput((prev) => ({ ...prev, mediaUrl: url, mediaType }));
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Opplasting feilet');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await onSave(input)) onCancel();
  };

  return (
    <form className="game-form" onSubmit={submit}>
      <label>
        Tittel
        <input value={input.title} onChange={(e) => set('title', e.target.value)} maxLength={40} autoFocus required />
      </label>
      <label>
        Beskrivelse / regler
        <textarea value={input.description} onChange={(e) => set('description', e.target.value)} rows={3} />
      </label>
      <div className="admin-row">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={input.timerSeconds !== null}
            onChange={(e) => set('timerSeconds', e.target.checked ? 60 : null)}
          />
          Timer
        </label>
        {input.timerSeconds !== null && (
          <label className="inline">
            <input
              type="number"
              min={1}
              max={3600}
              value={input.timerSeconds}
              onChange={(e) => set('timerSeconds', Number(e.target.value))}
            />
            sekunder
          </label>
        )}
      </div>
      <div className="admin-row">
        <label className="btn">
          {uploading ? 'Laster opp …' : input.mediaUrl ? 'Bytt bilde/video' : 'Last opp bilde/video'}
          <input type="file" accept="image/*,video/*" hidden onChange={onFile} disabled={uploading} />
        </label>
        {input.mediaUrl && (
          <>
            {input.mediaType === 'video' ? (
              <video className="media-thumb" src={input.mediaUrl} muted />
            ) : (
              <img className="media-thumb" src={input.mediaUrl} alt="" />
            )}
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setInput((prev) => ({ ...prev, mediaUrl: null, mediaType: null }))}
            >
              Fjern media
            </button>
          </>
        )}
      </div>
      <div className="admin-row">
        <button type="submit" className="btn btn-primary" disabled={uploading || !input.title.trim()}>
          Lagre
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Avbryt
        </button>
      </div>
    </form>
  );
}

function gameStatus(game: Game, currentGameId: number | null, revealed: number[]): string | null {
  if (revealed.includes(game.id)) return 'Ferdig';
  if (game.id === currentGameId) return 'Aktivt';
  return null;
}

export function GamesEditor() {
  const { state, send } = useAdmin();
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const toInput = ({ title, description, timerSeconds, mediaUrl, mediaType }: Game): GameInput => ({
    title,
    description,
    timerSeconds,
    mediaUrl,
    mediaType,
  });

  return (
    <div className="admin-card">
      <h3>Spill</h3>
      <ol className="admin-list">
        {state.games.map((game, i) => {
          const status = gameStatus(game, state.currentGameId, state.revealedGameIds);
          return (
            <li key={game.id} className="admin-list-item">
              {editing === game.id ? (
                <GameForm
                  initial={toInput(game)}
                  onSave={(input) => send('game:update', game.id, input)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="admin-list-row">
                  <span className="game-summary">
                    <strong>
                      {i + 1}. {game.title}
                    </strong>
                    {game.timerSeconds !== null && <span className="badge">{game.timerSeconds} s</span>}
                    {game.mediaUrl && <span className="badge">{game.mediaType === 'video' ? 'Video' : 'Bilde'}</span>}
                    {status && <span className="badge badge-on">{status}</span>}
                  </span>
                  <button className="btn btn-small" disabled={i === 0} onClick={() => send('game:move', game.id, -1)} aria-label="Flytt opp">
                    ↑
                  </button>
                  <button
                    className="btn btn-small"
                    disabled={i === state.games.length - 1}
                    onClick={() => send('game:move', game.id, 1)}
                    aria-label="Flytt ned"
                  >
                    ↓
                  </button>
                  <button className="btn btn-small" onClick={() => setEditing(game.id)}>
                    Rediger
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      if (confirm(`Slette «${game.title}»? Poeng registrert i spillet slettes også.`)) void send('game:delete', game.id);
                    }}
                  >
                    Slett
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {editing === 'new' ? (
        <GameForm initial={EMPTY_GAME} onSave={(input) => send('game:create', input)} onCancel={() => setEditing(null)} />
      ) : (
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          Nytt spill
        </button>
      )}
    </div>
  );
}
