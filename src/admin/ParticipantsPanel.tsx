import { useEffect, useState } from 'react';
import type { Participant } from '../../shared/types.ts';
import { useJoinUrl } from '../lib/joinUrl.ts';
import { useAwards } from './context.ts';

const IMAGE_STATUS: Record<Participant['imageStatus'], string> = {
  pending: 'Lager AI-bilde …',
  ready: 'AI-bilde klart',
  failed: 'Bruker originalbildet',
};

function ParticipantRow({ participant, done }: { participant: Participant; done: boolean }) {
  const { send } = useAwards();
  const [name, setName] = useState(participant.name);
  useEffect(() => setName(participant.name), [participant.name]);

  const commitName = () => {
    if (name.trim() && name.trim() !== participant.name) void send('participant:rename', participant.id, name);
    else setName(participant.name);
  };

  return (
    <li className="admin-list-row">
      <a href={participant.aiUrl ?? participant.originalUrl} target="_blank" rel="noreferrer">
        <img
          className={`avatar-thumb${participant.aiUrl ? ' ai' : ''}`}
          src={participant.aiUrl ?? participant.originalUrl}
          alt={`Bilde av ${participant.name}`}
        />
      </a>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Navn"
        maxLength={40}
      />
      <span className={`badge${participant.imageStatus === 'ready' ? ' badge-on' : ''}`}>{IMAGE_STATUS[participant.imageStatus]}</span>
      {done && <span className="badge badge-on">Har nominert</span>}
      <button
        className="btn btn-small"
        disabled={participant.imageStatus === 'pending'}
        onClick={() => send('participant:regenerateImage', participant.id)}
      >
        Nytt AI-bilde
      </button>
      <button
        className="btn btn-small btn-danger"
        onClick={() => {
          if (confirm(`Slette «${participant.name}»? Stemmene til og fra personen slettes også.`)) {
            void send('participant:remove', participant.id);
          }
        }}
      >
        Slett
      </button>
    </li>
  );
}

export function ParticipantsPanel() {
  const { state } = useAwards();
  const joinUrl = useJoinUrl();
  const done = new Set(state.nominatedIds);
  const open = state.phase === 'registration';

  return (
    <div className="admin-card">
      <h3>Deltakere ({state.participants.length})</h3>
      <p className="admin-hint">
        {open ? (
          <>
            Registreringen er åpen på <a href={joinUrl ?? '/join'}>{joinUrl ?? '/join'}</a> (QR-koden vises på
            storskjermen). Én registrering per mobil.
          </>
        ) : (
          'Registreringen stengte da nomineringen startet.'
        )}
      </p>
      {state.participants.length === 0 ? (
        <p className="admin-hint">Ingen har registrert seg ennå.</p>
      ) : (
        <ul className="admin-list">
          {state.participants.map((p) => (
            <ParticipantRow key={p.id} participant={p} done={done.has(p.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}
