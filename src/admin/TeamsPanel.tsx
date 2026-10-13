import { useEffect, useState, type FormEvent } from 'react';
import type { Team } from '../../shared/types.ts';
import { useAdmin, useGameshow } from './context.ts';

function TeamRow({ team, isFirst, isLast }: { team: Team; isFirst: boolean; isLast: boolean }) {
  const { send } = useAdmin();
  const [name, setName] = useState(team.name);
  useEffect(() => setName(team.name), [team.name]);

  const commitName = () => {
    if (name.trim() && name.trim() !== team.name) void send('team:rename', team.id, name);
    else setName(team.name);
  };

  return (
    <li className="admin-list-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Lagnavn"
      />
      <button className="btn btn-small" disabled={isFirst} onClick={() => send('team:move', team.id, -1)} aria-label="Flytt opp">
        ↑
      </button>
      <button className="btn btn-small" disabled={isLast} onClick={() => send('team:move', team.id, 1)} aria-label="Flytt ned">
        ↓
      </button>
      <button
        className="btn btn-small btn-danger"
        onClick={() => {
          if (confirm(`Fjerne laget «${team.name}»? Poengene til laget slettes også.`)) void send('team:remove', team.id);
        }}
      >
        Fjern
      </button>
    </li>
  );
}

export function TeamsPanel() {
  const { state, send } = useGameshow();
  const [name, setName] = useState('');

  const addTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (await send('team:add', name)) setName('');
  };

  return (
    <div className="admin-card">
      <h3>Registrer lag</h3>
      <form className="admin-row" onSubmit={addTeam}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lagnavn" maxLength={40} autoFocus />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Legg til
        </button>
      </form>
      <p className="admin-hint">Lag dukker opp på storskjermen så snart de legges til.</p>
      <ul className="admin-list">
        {state.teams.map((team, i) => (
          <TeamRow key={team.id} team={team} isFirst={i === 0} isLast={i === state.teams.length - 1} />
        ))}
      </ul>
    </div>
  );
}
