import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AckResult,
  AdminClientEvents,
  AdminCommand,
  CommandArgs,
  ScreenClientEvents,
  ServerToClientEvents,
  ShowState,
} from '../../shared/types.ts';
import { syncClock } from './serverClock.ts';

export type ScreenSocket = Socket<ServerToClientEvents, ScreenClientEvents>;
export type AdminSocket = Socket<ServerToClientEvents, AdminClientEvents>;

export function createScreenSocket(): ScreenSocket {
  return io('/', { forceNew: true });
}

export function createAdminSocket(pin: string): AdminSocket {
  return io('/admin', { forceNew: true, auth: { pin } });
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

/** Holder seg oppdatert på showtilstanden fra serveren og synker klokken ved hver tilkobling. */
export function useShowConnection(socket: ScreenSocket | AdminSocket | null) {
  const [state, setState] = useState<ShowState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!socket) return;
    setStatus('connecting');
    // Begge sockettypene deler 'state' og 'clock:ping'.
    const s = socket as ScreenSocket;
    const onConnect = () => {
      setStatus('connected');
      void syncClock(s);
    };
    const onDisconnect = () => setStatus('disconnected');
    const onError = (error: Error) => setStatus(error.message === 'Feil PIN-kode' ? 'unauthorized' : 'disconnected');

    s.on('state', setState);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onError);
    if (s.connected) onConnect();
    return () => {
      s.off('state', setState);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onError);
    };
  }, [socket]);

  return { state, status };
}

export async function sendCommand<E extends AdminCommand>(
  socket: AdminSocket,
  event: E,
  ...args: CommandArgs<E>
): Promise<AckResult> {
  try {
    const untyped = socket as unknown as Socket;
    return (await untyped.timeout(5000).emitWithAck(event, ...args)) as AckResult;
  } catch {
    return { ok: false, error: 'Ingen kontakt med serveren' };
  }
}
