import { networkInterfaces } from 'node:os';

/** Første IPv4-adresse på det lokale nettet, slik at mobiler kan nå serveren via QR-koden. */
export function lanAddress(): string | null {
  const candidates: string[] = [];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) candidates.push(address.address);
    }
  }
  // Foretrekk vanlige hjemmenett framfor virtuelle adaptere (WSL, Docker, VPN).
  return candidates.find((a) => a.startsWith('192.168.')) ?? candidates.find((a) => a.startsWith('10.')) ?? candidates[0] ?? null;
}
