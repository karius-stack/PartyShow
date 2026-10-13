import type { ModeId } from '../../shared/types.ts';
import { MODE_LABELS } from '../lib/format.ts';
import { useAdmin } from './context.ts';

/** Minner admin på at modusen kan forberedes uten at storskjermen viser den. */
export function ModeInactiveNotice({ mode }: { mode: ModeId }) {
  const { app, send } = useAdmin();
  if (app.activeMode === mode) return null;
  return (
    <div className="admin-notice">
      <span>{MODE_LABELS[mode]} vises ikke på storskjermen nå – du kan forberede alt her uten at publikum ser det.</span>
      <button className="btn btn-primary" onClick={() => send('mode:set', mode)}>
        Vis {MODE_LABELS[mode]}
      </button>
    </div>
  );
}
