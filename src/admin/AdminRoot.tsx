import { useCallback, useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react';
import type { AdminCommand, AppState, CommandArgs, ModeId } from '../../shared/types.ts';
import { AWARDS_PHASE_LABELS, MODE_LABELS, PHASE_LABELS } from '../lib/format.ts';
import { createAdminSocket, sendCommand, useShowConnection, type AdminSocket } from '../lib/socket.ts';
import './admin.css';
import { AdminContext, type AdminContextValue } from './context.ts';
import { AwardsControl } from './AwardsControl.tsx';
import { CategoriesEditor } from './CategoriesEditor.tsx';
import { GamesEditor } from './GamesEditor.tsx';
import { ParticipantsPanel } from './ParticipantsPanel.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { ShowControl } from './ShowControl.tsx';
import { TeamsPanel } from './TeamsPanel.tsx';

const PIN_KEY = 'partyshow-admin-pin';
const COLOR_MODE_KEY = 'partyshow-admin-color-mode';

type ColorMode = 'system' | 'light' | 'dark';
const COLOR_MODES: { mode: ColorMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Lys' },
  { mode: 'dark', label: 'Mørk' },
];

/** Lys/mørk-valg for kontrollpanelet. «System» følger operativsystemet. */
function useColorMode() {
  const [mode, setMode] = useState<ColorMode>(() => {
    try {
      const stored = localStorage.getItem(COLOR_MODE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  });

  const cycle = () => {
    const next = COLOR_MODES[(COLOR_MODES.findIndex((m) => m.mode === mode) + 1) % COLOR_MODES.length].mode;
    setMode(next);
    try {
      localStorage.setItem(COLOR_MODE_KEY, next);
    } catch {
      // Valget gjelder da bare til siden lastes på nytt.
    }
  };

  return { mode, label: COLOR_MODES.find((m) => m.mode === mode)!.label, cycle };
}

type TabId = 'show' | 'teams' | 'games' | 'awards' | 'participants' | 'categories' | 'settings';

interface TabGroup {
  /** Modusen fanene hører til, eller null for felles faner. */
  mode: ModeId | null;
  tabs: { id: TabId; label: string; Component: ComponentType }[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    mode: 'gameshow',
    tabs: [
      { id: 'show', label: 'Kjør show', Component: ShowControl },
      { id: 'teams', label: 'Lag', Component: TeamsPanel },
      { id: 'games', label: 'Spill', Component: GamesEditor },
    ],
  },
  {
    mode: 'awards',
    tabs: [
      { id: 'awards', label: 'Kjør kåring', Component: AwardsControl },
      { id: 'participants', label: 'Deltakere', Component: ParticipantsPanel },
      { id: 'categories', label: 'Nominasjoner', Component: CategoriesEditor },
    ],
  },
  { mode: null, tabs: [{ id: 'settings', label: 'Innstillinger', Component: SettingsPanel }] },
];

const TABS = TAB_GROUPS.flatMap((group) => group.tabs);

/** «Kjør»-fanen for hver modus – admin hoppes hit når modusen aktiveres. */
const RUN_TAB: Record<ModeId, TabId> = { gameshow: 'show', awards: 'awards' };

const SCREEN_OPTIONS: { mode: ModeId | null; label: string }[] = [
  { mode: null, label: 'Logo' },
  { mode: 'gameshow', label: MODE_LABELS.gameshow },
  { mode: 'awards', label: MODE_LABELS.awards },
];

function screenLabel(app: AppState): string {
  switch (app.activeMode) {
    case null:
      return 'Logo';
    case 'gameshow':
      return `${MODE_LABELS.gameshow} – ${PHASE_LABELS[app.gameshow.phase]}`;
    case 'awards':
      return `${MODE_LABELS.awards} – ${AWARDS_PHASE_LABELS[app.awards.phase]}`;
  }
}

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
  const [tab, setTab] = useState<TabId>('show');
  const [error, setError] = useState<string | null>(null);
  const colorMode = useColorMode();

  useEffect(() => {
    const s = createAdminSocket(auth.pin);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [auth]);

  const { state, status } = useShowConnection(socket);

  // Hopp til «Kjør»-fanen for modusen som vises – også ved første innlasting.
  const activeMode = state?.activeMode;
  useEffect(() => {
    if (activeMode) setTab(RUN_TAB[activeMode]);
  }, [activeMode]);

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
    () => (state ? { app: state, pin: auth.pin, send, showError: setError } : null),
    [state, auth.pin, send],
  );

  const shell = (content: ReactNode) => (
    <div className="admin-shell" data-theme={colorMode.mode === 'system' ? undefined : colorMode.mode}>
      {content}
    </div>
  );

  if (status === 'unauthorized') {
    return shell(
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
      />,
    );
  }

  if (!context) return shell(<p className="admin-loading">Kobler til server …</p>);

  const Active = TABS.find((t) => t.id === tab)!.Component;

  return shell(
    <AdminContext.Provider value={context}>
      <div className="admin">
        <header className="admin-header">
          <strong>{context.app.show.name}</strong>
          <span className="admin-phase">Storskjerm: {screenLabel(context.app)}</span>
          <span className="admin-header-end">
            <button className="theme-toggle" onClick={colorMode.cycle} title="Bytt mellom system, lys og mørk">
              Tema: {colorMode.label}
            </button>
            <span className={`admin-status admin-status-${status}`}>{status === 'connected' ? 'Tilkoblet' : 'Frakoblet'}</span>
          </span>
        </header>
        <div className="mode-switch" role="group" aria-label="Vis på storskjermen">
          <span className="mode-switch-label">På storskjermen:</span>
          {SCREEN_OPTIONS.map((option) => (
            <button
              key={option.label}
              className={option.mode === context.app.activeMode ? 'active' : ''}
              aria-pressed={option.mode === context.app.activeMode}
              onClick={() => send('mode:set', option.mode)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <nav className="admin-tabs">
          {TAB_GROUPS.map((group) => (
            <div
              key={group.mode ?? 'common'}
              className={`admin-tab-group${group.mode && group.mode === context.app.activeMode ? ' live' : ''}`}
            >
              {group.mode && <span className="admin-tab-group-label">{MODE_LABELS[group.mode]}</span>}
              {group.tabs.map((t) => (
                <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
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
    </AdminContext.Provider>,
  );
}
