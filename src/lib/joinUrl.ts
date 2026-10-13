import { useEffect, useState } from 'react';

interface ServerInfo {
  publicUrl: string | null;
  lanAddress: string | null;
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Adressen mobilene skal åpne. Storskjermen kjører ofte på `localhost`, som
 * mobilene ikke kan nå – da byttes vertsnavnet ut med maskinens LAN-adresse.
 */
export function buildJoinUrl(info: ServerInfo, location: Pick<Location, 'protocol' | 'hostname' | 'port' | 'host'>): string {
  if (info.publicUrl) return `${info.publicUrl}/join`;
  const host =
    LOCAL_HOSTS.includes(location.hostname) && info.lanAddress
      ? `${info.lanAddress}${location.port ? `:${location.port}` : ''}`
      : location.host;
  return `${location.protocol}//${host}/join`;
}

export function useJoinUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/info')
      .then((res) => res.json() as Promise<ServerInfo>)
      .catch((): ServerInfo => ({ publicUrl: null, lanAddress: null }))
      .then((info) => {
        if (!cancelled) setUrl(buildJoinUrl(info, window.location));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return url;
}
