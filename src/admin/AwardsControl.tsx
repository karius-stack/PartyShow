import type { AwardCategory, AwardsPhase, AwardsState, Participant } from '../../shared/types.ts';
import { AWARDS_PHASE_LABELS, joinNames } from '../lib/format.ts';
import { useAwards } from './context.ts';
import { ModeInactiveNotice } from './ModeInactiveNotice.tsx';
import { ScreenPreview } from './ScreenPreview.tsx';

const PHASES: AwardsPhase[] = ['registration', 'nominating', 'ceremony', 'finished'];

function names(state: AwardsState, ids: number[]): string {
  return joinNames(ids.map((id) => state.participants.find((p) => p.id === id)?.name ?? '?'));
}

function Progress({ value, total, label }: { value: number; total: number; label: string }) {
  return (
    <>
      <div className="progress-bar">
        <div style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
      <p className="admin-hint">
        {value} av {total} {label}
      </p>
    </>
  );
}

/** Stemmetall per person, sortert synkende. Skjult bak en «spoiler» siden admin ofte også er gjest. */
function Tally({ counts, candidates, winnerIds }: { counts: Record<number, number>; candidates: Participant[]; winnerIds?: number[] }) {
  const rows = candidates
    .map((p) => ({ participant: p, votes: counts[p.id] ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.participant.name.localeCompare(b.participant.name, 'nb'));
  return (
    <table className="tally">
      <tbody>
        {rows.map(({ participant, votes }) => (
          <tr key={participant.id} className={winnerIds?.includes(participant.id) ? 'is-winner' : undefined}>
            <td>{participant.name}</td>
            <td>{votes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RegistrationStep() {
  const { state, send } = useAwards();
  const ready = state.categories.length > 0 && state.participants.length >= 2;
  return (
    <>
      <p className="admin-now">
        {state.participants.length} deltakere registrert · {state.categories.length} nominasjoner
      </p>
      {state.categories.length === 0 && <p className="admin-hint">Opprett nominasjoner i fanen «Nominasjoner».</p>}
      {state.participants.length < 2 && <p className="admin-hint">Det må være minst to deltakere for å starte nomineringen.</p>}
      <div className="admin-row">
        <button
          className="btn btn-primary"
          disabled={!ready}
          onClick={() => {
            if (confirm(`Starte nomineringen med ${state.participants.length} deltakere? Registreringen stenges, så ingen flere kan bli med.`)) {
              void send('awards:startNominating');
            }
          }}
        >
          Start nominering
        </button>
      </div>
    </>
  );
}

function NominatingStep() {
  const { state, send } = useAwards();
  const done = new Set(state.nominatedIds);
  const missing = state.participants.filter((p) => !done.has(p.id));

  const startCeremony = () => {
    if (missing.length > 0 && !confirm(`${missing.length} har ikke nominert ennå. Starte kåringen likevel?`)) return;
    void send('awards:startCeremony');
  };

  return (
    <>
      <p className="admin-now">Nominering pågår</p>
      <Progress value={state.participants.length - missing.length} total={state.participants.length} label="har nominert" />
      {missing.length > 0 && <p className="admin-hint">Mangler: {joinNames(missing.map((p) => p.name))}</p>}
      <div className="admin-row">
        <button className="btn btn-primary" onClick={startCeremony}>
          Start kåringen
        </button>
      </div>
      <details>
        <summary>Vis nominasjonstall (spoiler)</summary>
        {state.categories.map((c) => (
          <div key={c.id}>
            <h4>{c.title}</h4>
            <Tally
              counts={state.nominationCounts[c.id] ?? {}}
              candidates={state.participants.filter((p) => (state.nominationCounts[c.id]?.[p.id] ?? 0) > 0)}
            />
          </div>
        ))}
      </details>
    </>
  );
}

function nextCategory(state: AwardsState): AwardCategory | null {
  return state.categories.find((c) => c.winnerIds === null && c.id !== state.currentCategoryId) ?? null;
}

function CeremonyStep() {
  const { state, send } = useAwards();
  const current = state.categories.find((c) => c.id === state.currentCategoryId) ?? null;
  const next = nextCategory(state);

  if (!current) {
    return (
      <>
        <p className="admin-now">Kåringen er startet – storskjermen viser oversikten.</p>
        <div className="admin-row">
          {next ? (
            <button className="btn btn-primary" onClick={() => send('awards:openCategory', next.id)}>
              Vis første nominasjon: {next.title}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => send('awards:finish')}>
              Vis alle vinnerne
            </button>
          )}
        </div>
      </>
    );
  }

  const finalists = (current.finalistIds ?? [])
    .map((id) => state.participants.find((p) => p.id === id))
    .filter((p): p is Participant => p !== undefined);
  const voted = state.finalVoterIds.length;
  const voters = state.participants.length;

  const reveal = () => {
    if (voted < voters && !confirm(`${voters - voted} har ikke stemt ennå. Vise vinneren likevel?`)) return;
    void send('awards:revealWinner');
  };

  return (
    <>
      <p className="admin-now">{current.title}</p>
      {state.step === 'voting' ? (
        <>
          <p className="admin-hint">Finalister: {joinNames(finalists.map((p) => p.name))}</p>
          <Progress value={voted} total={voters} label="har stemt" />
          <div className="admin-row">
            <button className="btn btn-primary" onClick={reveal}>
              Vis vinner
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Vinner: <strong>{names(state, current.winnerIds ?? [])}</strong>
          </p>
          <div className="admin-row">
            {next ? (
              <button className="btn btn-primary" onClick={() => send('awards:openCategory', next.id)}>
                Neste nominasjon: {next.title}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => send('awards:finish')}>
                Vis alle vinnerne
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                if (confirm('Slette stemmene i denne nominasjonen og stemme på nytt?')) void send('awards:restartVoting');
              }}
            >
              Stem på nytt
            </button>
          </div>
        </>
      )}
      <details>
        <summary>Vis stemmetall{state.step === 'voting' ? ' (spoiler)' : ''}</summary>
        <Tally counts={state.finalCounts[current.id] ?? {}} candidates={finalists} winnerIds={current.winnerIds ?? undefined} />
      </details>
    </>
  );
}

function FinishedStep() {
  return <p className="admin-now">Storskjermen viser alle vinnerne. Velg en nominasjon under for å vise den igjen.</p>;
}

/** Oversikt over nominasjonene i seremonien, med mulighet til å hoppe til en hvilken som helst. */
function CategoryOverview() {
  const { state, send } = useAwards();
  return (
    <div className="admin-card">
      <h3>Nominasjoner</h3>
      <ul className="admin-list category-list">
        {state.categories.map((c) => (
          <li key={c.id}>
            <span className="category-title">
              {c.title}
              {c.id === state.currentCategoryId && <span className="badge badge-on"> På skjermen</span>}
            </span>
            <span className="admin-hint">{c.winnerIds ? `Vinner: ${names(state, c.winnerIds)}` : 'Ikke vist'}</span>
            <button
              className="btn btn-small"
              disabled={c.id === state.currentCategoryId}
              onClick={() => send('awards:openCategory', c.id)}
            >
              Vis
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManualOverride() {
  const { state, send } = useAwards();
  const goBack = (phase: 'registration' | 'nominating') => {
    const warning =
      state.phase === 'ceremony' || state.phase === 'finished'
        ? ' Finalister, vinnere og finalestemmer nullstilles (nominasjonene beholdes).'
        : '';
    if (confirm(`Gå tilbake til ${phase === 'registration' ? 'registrering' : 'nominering'}?${warning}`)) {
      void send('awards:goBack', phase);
    }
  };
  return (
    <details className="admin-card">
      <summary>Manuell styring</summary>
      <p className="admin-hint">For å rette feil underveis.</p>
      <div className="admin-row">
        <button className="btn" disabled={state.phase === 'registration'} onClick={() => goBack('registration')}>
          Tilbake til registrering
        </button>
        <button className="btn" disabled={state.phase === 'registration' || state.phase === 'nominating'} onClick={() => goBack('nominating')}>
          Tilbake til nominering
        </button>
      </div>
    </details>
  );
}

export function AwardsControl() {
  const { state } = useAwards();
  const phaseIndex = PHASES.indexOf(state.phase);
  const inCeremony = state.phase === 'ceremony' || state.phase === 'finished';

  return (
    <div className="awards-control">
      <ModeInactiveNotice mode="awards" />

      <div className="admin-card">
        <ol className="awards-steps">
          {PHASES.map((phase, i) => (
            <li key={phase} className={i < phaseIndex ? 'done' : i === phaseIndex ? 'current' : undefined}>
              {AWARDS_PHASE_LABELS[phase]}
            </li>
          ))}
        </ol>
        {state.phase === 'registration' && <RegistrationStep />}
        {state.phase === 'nominating' && <NominatingStep />}
        {state.phase === 'ceremony' && <CeremonyStep />}
        {state.phase === 'finished' && <FinishedStep />}
      </div>

      {inCeremony && <CategoryOverview />}

      <div className="admin-card">
        <h3>Forhåndsvisning</h3>
        <ScreenPreview />
      </div>

      <ManualOverride />
    </div>
  );
}
