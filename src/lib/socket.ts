import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AckResult,
  AdminClientEvents,
  AdminCommand,
  AppState,
  CommandArgs,
  ParticipantClientEvents,
  ParticipantServerEvents,
  ParticipantView,
  ScreenClientEvents,
  ServerToClientEvents,
} from '../../shared/types.ts';
import { syncClock } from './serverClock.ts';

export type ScreenSocket = Socket<ServerToClientEvents, ScreenClientEvents>;
export type AdminSocket = Socket<ServerToClientEvents, AdminClientEvents>;
export type ParticipantSocket = Socket<ParticipantServerEvents, ParticipantClientEvents>;

export function createScreenSocket(): ScreenSocket {
  return io('/', { forceNew: true });
}

export function createAdminSocket(pin: string): AdminSocket {
  return io('/admin', { forceNew: true, auth: { pin } });
}

export function createParticipantSocket(deviceId: string): ParticipantSocket {
  return io('/participant', { forceNew: true, auth: { deviceId } });
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

/** Holder seg oppdatert på showtilstanden fra serveren og synker klokken ved hver tilkobling. */
export function useShowConnection(socket: ScreenSocket | AdminSocket | null) {
  const [state, setState] = useState<AppState | null>(null);
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

/** Mobilens personlige visning av kåringen. */
export function useParticipantConnection(socket: ParticipantSocket | null) {
  const [view, setView] = useState<ParticipantView | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('participant:state', setView);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off('participant:state', setView);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
    };
  }, [socket]);

  return { view, connected };
}

async function emitWithAck(socket: Socket, event: string, args: unknown[]): Promise<AckResult> {
  try {
    return (await socket.timeout(8000).emitWithAck(event, ...args)) as AckResult;
  } catch {
    return { ok: false, error: 'Ingen kontakt med serveren' };
  }
}

export function sendCommand<E extends AdminCommand>(socket: AdminSocket, event: E, ...args: CommandArgs<E>): Promise<AckResult> {
  return emitWithAck(socket as unknown as Socket, event, args);
}

export function sendParticipant<E extends keyof ParticipantClientEvents>(
  socket: ParticipantSocket,
  event: E,
  ...args: Parameters<ParticipantClientEvents[E]> extends [...infer A, unknown] ? A : never
): Promise<AckResult> {
  return emitWithAck(socket as unknown as Socket, event, args);
}
