import type { Phase } from '../../shared/types.ts';

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const PHASE_LABELS: Record<Phase, string> = {
  lobby: 'Lobby',
  game: 'Spill',
  roundResults: 'Runderesultater',
  standings: 'Sammenlagt',
};
