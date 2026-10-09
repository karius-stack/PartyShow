import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AdminCommand, CommandArgs } from '../../shared/types.ts';
import { PHASE_LABELS } from '../lib/format.ts';
import { createAdminSocket, sendCommand, useShowConnection, type AdminSocket } from '../lib/socket.ts';
import { AdminContext, type AdminContextValue } from './context.ts';
import { GamesEditor } from './GamesEditor.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { ShowControl } from './ShowControl.tsx';
import { TeamsPanel } from './TeamsPanel.tsx';

const PIN_KEY = 'partyshow-admin-pin';

const TABS = [
  { id: 'show', label: 'Kjør show', Component: ShowControl },
  { id: 'teams', label: 'Lag', Component: TeamsPanel },
  { id: 'games', label: 'Spill', Component: GamesEditor },
  { id: 'settings', label: 'Innstillinger', Component: SettingsPanel },
] as const;

function readStoredPin(): string {
  try {
    return sessionStorage.getItem(PIN_KEY) ?? '';
  } catch {
    return '';
  }
}

function PinForm({ wrongPin, onSubmit }: { wrongPin: boolean; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(pin.trim());
  };
  return (
    <form className="admin-pin" onSubmit={submit}>
      <h1>PartyShow – kontrollpanel</h1>
      <label>
        PIN-kode
        <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
      </label>
      {wrongPin && <p className="admin-error-text">Feil PIN-kode</p>}
      <button type="submit" className="btn btn-primary">
        Logg inn
      </button>
    </form>
  );
}

export function AdminRoot() {
  // `attempt` gjør at samme PIN kan prøves på nytt.
  const [auth, setAuth] = useState(() => ({ pin: readStoredPin(), attempt: 0 }));
  const [socket, setSocket] = useState<AdminSocket | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('show');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = createAdminSocket(auth.pin);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [auth]);

  const { state, status } = useShowConnection(socket);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(id);
  }, [error]);

  const send = useCallback(
    async <E extends AdminCommand>(event: E, ...args: CommandArgs<E>) => {
      if (!socket) return false;
      const result = await sendCommand(socket, event, ...args);
      if (!result.ok) setError(result.error);
      return result.ok;
    },
    [socket],
  );

  const context = useMemo<AdminContextValue | null>(
    () => (state ? { state, pin: auth.pin, send, showError: setError } : null),
    [state, auth.pin, send],
  );

  if (status === 'unauthorized') {
    return (
      <PinForm
        wrongPin={auth.pin !== ''}
        onSubmit={(pin) => {
          try {
            sessionStorage.setItem(PIN_KEY, pin);
          } catch {
            // Ikke kritisk – PIN må da tastes på nytt ved omlasting.
          }
          setAuth((prev) => ({ pin, attempt: prev.attempt + 1 }));
        }}
      />
    );
  }

  if (!context) return <p className="admin-loading">Kobler til server …</p>;

  const Active = TABS.find((t) => t.id === tab)!.Component;

  return (
    <AdminContext.Provider value={context}>
      <div className="admin">
        <header className="admin-header">
          <strong>{context.state.show.name}</strong>
          <span className="admin-phase">Storskjerm: {PHASE_LABELS[context.state.phase]}</span>
          <span className={`admin-status admin-status-${status}`}>{status === 'connected' ? 'Tilkoblet' : 'Frakoblet'}</span>
        </header>
        <nav className="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        {error && (
          <div className="admin-error" role="alert" onClick={() => setError(null)}>
            {error}
          </div>
        )}
        <section className="admin-content">
          <Active />
        </section>
      </div>
    </AdminContext.Provider>
  );
}
