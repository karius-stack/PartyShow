import { useState, type FormEvent } from 'react';
import { themes } from '../themes/index.ts';
import { useAdmin } from './context.ts';

export function SettingsPanel() {
  const { state, send } = useAdmin();
  const [name, setName] = useState(state.show.name);
  const [themeId, setThemeId] = useState(state.show.themeId);

  const save = (e: FormEvent) => {
    e.preventDefault();
    void send('show:update', { name, themeId });
  };

  return (
    <>
      <form className="admin-card game-form" onSubmit={save}>
        <h3>Show</h3>
        <label>
          Navn (vises i lobbyen)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </label>
        <label>
          Tema
          <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-row">
          <button type="submit" className="btn btn-primary">
            Lagre
          </button>
        </div>
      </form>

      <div className="admin-card">
        <h3>Nullstill</h3>
        <p className="admin-hint">Spillene beholdes alltid. Nullstilling kan ikke angres.</p>
        <div className="admin-row">
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Slette alle poeng og starte showet på nytt fra lobbyen? Lagene beholdes.')) {
                void send('show:reset', { removeTeams: false });
              }
            }}
          >
            Nullstill poeng og fremdrift
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Slette alle lag og poeng og starte på nytt?')) void send('show:reset', { removeTeams: true });
            }}
          >
            Nullstill alt inkludert lag
          </button>
        </div>
      </div>
    </>
  );
}
