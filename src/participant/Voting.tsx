import { useState } from 'react';
import type { Participant, ParticipantView } from '../../shared/types.ts';
import { joinNames } from '../lib/format.ts';
import { sendParticipant, type ParticipantSocket } from '../lib/socket.ts';

function photoOf(p: Participant): string {
  return p.aiUrl ?? p.originalUrl;
}

function PersonButton({
  person,
  selected,
  disabled,
  note,
  onClick,
}: {
  person: Participant;
  selected: boolean;
  disabled?: boolean;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`p-person${selected ? ' selected' : ''}${person.aiUrl ? ' ai' : ''}`}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
    >
      <img src={photoOf(person)} alt="" />
      <span className="p-person-name">{person.name}</span>
      {note && <span className="p-person-note">{note}</span>}
    </button>
  );
}

/** Én nominasjon per steg, deretter oppsummering og innsending. */
export function NominationWizard({
  view,
  me,
  socket,
  onDone,
}: {
  view: ParticipantView;
  me: Participant;
  socket: ParticipantSocket;
  onDone: () => void;
}) {
  const [choices, setChoices] = useState<Record<number, number>>(view.myNominations);
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = view.participants.filter((p) => p.id !== me.id);
  const shown = filter.trim()
    ? candidates.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : candidates;
  const summary = step >= view.categories.length;
  const category = view.categories[step];

  const choose = (categoryId: number, personId: number) => {
    setChoices((prev) => ({ ...prev, [categoryId]: personId }));
    // Litt pause så man ser valget før neste steg. Dobbelttrykk skal ikke hoppe over en nominasjon.
    const from = step;
    setTimeout(() => {
      setFilter('');
      setStep((s) => (s === from ? s + 1 : s));
    }, 250);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await sendParticipant(socket, 'nominations:submit', choices);
    setBusy(false);
    if (result.ok) onDone();
    else setError(result.error);
  };

  if (summary) {
    const nameOf = (id: number | undefined) => view.participants.find((p) => p.id === id)?.name ?? '–';
    const complete = view.categories.every((c) => choices[c.id] !== undefined);
    return (
      <div className="p-card">
        <h1 className="p-title">Dine nominasjoner</h1>
        <ul className="p-summary">
          {view.categories.map((c, i) => (
            <li key={c.id}>
              <button type="button" onClick={() => setStep(i)}>
                <span className="p-summary-category">{c.title}</span>
                <span className="p-summary-name">{nameOf(choices[c.id])}</span>
              </button>
            </li>
          ))}
        </ul>
        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
        <button className="p-btn p-btn-primary" disabled={busy || !complete} onClick={submit}>
          {busy ? 'Sender …' : 'Send inn'}
        </button>
        <p className="p-text p-small">Trykk på en nominasjon for å endre.</p>
      </div>
    );
  }

  return (
    <div className="p-card">
      <p className="p-kicker">
        Nominasjon {step + 1} av {view.categories.length}
      </p>
      <h1 className="p-title">{category.title}</h1>
      <p className="p-text">Hvem fortjener denne?</p>
      {candidates.length > 9 && (
        <input className="p-search" placeholder="Søk etter navn" value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}
      <div className="p-people">
        {shown.map((p) => (
          <PersonButton key={p.id} person={p} selected={choices[category.id] === p.id} onClick={() => choose(category.id, p.id)} />
        ))}
      </div>
      <div className="p-row">
        <button className="p-btn p-btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Tilbake
        </button>
        <button className="p-btn p-btn-secondary" disabled={choices[category.id] === undefined} onClick={() => setStep(step + 1)}>
          Neste
        </button>
      </div>
    </div>
  );
}

/** Stem på en av finalistene i nominasjonen som vises på storskjermen. */
export function FinalVote({ view, me, socket }: { view: ParticipantView; me: Participant | null; socket: ParticipantSocket }) {
  const [error, setError] = useState<string | null>(null);
  const current = view.current!;

  if (current.step === 'revealed') {
    const winners = current.finalists.filter((p) => current.winnerIds?.includes(p.id));
    const iWon = me !== null && winners.some((p) => p.id === me.id);
    return (
      <div className="p-card p-center">
        <p className="p-kicker">{current.title}</p>
        <h1 className="p-title">{iWon ? 'Gratulerer – du vant! 🏆' : `Vinneren er ${joinNames(winners.map((w) => w.name))}!`}</h1>
        <p className="p-text">Følg med på storskjermen for neste nominasjon.</p>
      </div>
    );
  }

  const vote = async (nomineeId: number) => {
    setError(null);
    const result = await sendParticipant(socket, 'final:vote', current.categoryId, nomineeId);
    if (!result.ok) setError(result.error);
  };

  const votedFor = current.finalists.find((p) => p.id === current.myVote);

  return (
    <div className="p-card">
      <p className="p-kicker">Finale</p>
      <h1 className="p-title">{current.title}</h1>
      {!me ? (
        <p className="p-text">Bare registrerte deltakere kan stemme – men følg med på storskjermen!</p>
      ) : (
        <>
          <p className="p-text">{votedFor ? `Du stemte på ${votedFor.name}. Du kan endre til vinneren vises.` : 'Hvem skal vinne?'}</p>
          <div className="p-people p-people-finalists">
            {current.finalists.map((p) => (
              <PersonButton
                key={p.id}
                person={p}
                selected={current.myVote === p.id}
                disabled={p.id === me.id}
                note={p.id === me.id ? 'Det er deg!' : undefined}
                onClick={() => vote(p.id)}
              />
            ))}
          </div>
          {error && (
            <p className="p-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
