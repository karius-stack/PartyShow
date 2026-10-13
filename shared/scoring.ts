import type { Game, ScoreMap, GameshowState, Team, TimerState } from './types.ts';

export interface RankedTeam {
  team: Team;
  points: number;
  /** Delt plassering ved likt antall poeng (1, 1, 3 …). */
  rank: number;
}

export interface StandingRow {
  team: Team;
  total: number;
  rank: number;
  prevTotal: number;
  prevRank: number;
  /** Poeng fra sist avslørte spill. */
  roundPoints: number;
  /** Positivt tall = laget har klatret så mange plasser. */
  rankChange: number;
}

/** Sorterer lag etter poeng (synkende), med lagrekkefølge som stabil tiebreak. */
export function rankTeams(teams: Team[], pointsFor: (teamId: number) => number): RankedTeam[] {
  const sorted = teams
    .map((team) => ({ team, points: pointsFor(team.id) }))
    .sort((a, b) => b.points - a.points || a.team.sortOrder - b.team.sortOrder);

  let rank = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry.points !== sorted[index - 1].points) rank = index + 1;
    return { ...entry, rank };
  });
}

export function pointsInGame(scores: ScoreMap, gameId: number, teamId: number): number {
  return scores[gameId]?.[teamId] ?? 0;
}

export function totalPoints(scores: ScoreMap, gameIds: number[], teamId: number): number {
  return gameIds.reduce((sum, gameId) => sum + pointsInGame(scores, gameId, teamId), 0);
}

export function roundResults(teams: Team[], scores: ScoreMap, gameId: number): RankedTeam[] {
  return rankTeams(teams, (teamId) => pointsInGame(scores, gameId, teamId));
}

/**
 * Sammenlagt etter alle avslørte spill, sammenlignet med stillingen før
 * det sist avslørte spillet. Returneres sortert etter ny plassering.
 */
export function standings(teams: Team[], scores: ScoreMap, revealedGameIds: number[]): StandingRow[] {
  const prevGameIds = revealedGameIds.slice(0, -1);
  const lastGameId = revealedGameIds.at(-1);

  const prev = rankTeams(teams, (teamId) => totalPoints(scores, prevGameIds, teamId));
  const prevById = new Map(prev.map((r) => [r.team.id, r]));
  const current = rankTeams(teams, (teamId) => totalPoints(scores, revealedGameIds, teamId));

  return current.map(({ team, points, rank }) => {
    const before = prevById.get(team.id)!;
    return {
      team,
      total: points,
      rank,
      prevTotal: before.points,
      prevRank: before.rank,
      roundPoints: lastGameId === undefined ? 0 : pointsInGame(scores, lastGameId, team.id),
      rankChange: before.rank - rank,
    };
  });
}

/** Spillet som står for tur: første spill (i rekkefølge) som ikke er avslørt eller aktivt nå. */
export function nextGame(state: Pick<GameshowState, 'phase' | 'currentGameId' | 'revealedGameIds'>, games: Game[]): Game | null {
  const sorted = [...games].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    sorted.find(
      (g) => !state.revealedGameIds.includes(g.id) && !(state.phase === 'game' && g.id === state.currentGameId),
    ) ?? null
  );
}

export function timerRemainingMs(timer: TimerState, serverNow: number): number {
  if (timer.endsAt === null) return timer.remainingMs;
  return Math.max(0, timer.endsAt - serverNow);
}
