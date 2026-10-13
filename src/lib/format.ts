import type { AwardsPhase, GameshowPhase, ModeId } from '../../shared/types.ts';

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** «A», «A og B», «A, B og C». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} og ${names.at(-1)}`;
}

export const MODE_LABELS: Record<ModeId, string> = {
  gameshow: 'Gameshow',
  awards: 'Kåring',
};

export const PHASE_LABELS: Record<GameshowPhase, string> = {
  lobby: 'Lobby',
  game: 'Spill',
  roundResults: 'Runderesultater',
  standings: 'Sammenlagt',
};

export const AWARDS_PHASE_LABELS: Record<AwardsPhase, string> = {
  registration: 'Registrering',
  nominating: 'Nominering',
  ceremony: 'Kåring',
  finished: 'Alle vinnerne',
};
