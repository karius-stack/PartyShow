import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ScreenClientEvents, ServerToClientEvents } from '../../shared/types.ts';

// Differansen mellom serverens og denne maskinens klokke, slik at timere er
// synkrone mellom storskjerm og kontrollpanel selv om klokkene går ulikt.
let offsetMs = 0;

export function serverNow(): number {
  return Date.now() + offsetMs;
}

/** Måler klokkeforskjellen noen ganger og bruker målingen med kortest rundetid. */
export async function syncClock(socket: Socket<ServerToClientEvents, ScreenClientEvents>) {
  let best: { rtt: number; offset: number } | null = null;
  for (let i = 0; i < 5; i++) {
    const sent = Date.now();
    try {
      const server = await socket.timeout(2000).emitWithAck('clock:ping');
      const received = Date.now();
      const rtt = received - sent;
      if (!best || rtt < best.rtt) best = { rtt, offset: server - (sent + rtt / 2) };
    } catch {
      return;
    }
  }
  if (best) offsetMs = best.offset;
}

/** Gir servertid som oppdateres hvert `intervalMs` mens `active` er sann. */
export function useServerNow(active: boolean, intervalMs = 100): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(serverNow());
    if (!active) return;
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
