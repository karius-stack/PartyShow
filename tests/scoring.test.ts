import { describe, expect, it } from 'vitest';
import { nextGame, rankTeams, roundResults, standings, timerRemainingMs } from '../shared/scoring.ts';
import type { Game, ScoreMap, Team } from '../shared/types.ts';

const teams: Team[] = [
  { id: 1, name: 'Spøkelsene', sortOrder: 0 },
  { id: 2, name: 'Heksene', sortOrder: 1 },
  { id: 3, name: 'Vampyrene', sortOrder: 2 },
];

const game = (id: number, sortOrder: number): Game => ({
  id,
  title: `Spill ${id}`,
  description: '',
  timerSeconds: null,
  mediaUrl: null,
  mediaType: null,
  sortOrder,
});

describe('rankTeams', () => {
  it('gir delt plassering ved likt antall poeng', () => {
    const points: Record<number, number> = { 1: 5, 2: 10, 3: 5 };
    const ranked = rankTeams(teams, (id) => points[id]);
    expect(ranked.map((r) => [r.team.id, r.rank])).toEqual([
      [2, 1],
      [1, 2],
      [3, 2],
    ]);
  });

  it('bruker lagrekkefølge som tiebreak og hopper over plasser etter delt plass', () => {
    const ranked = rankTeams([...teams, { id: 4, name: 'Zombiene', sortOrder: 3 }], (id) => (id === 4 ? 1 : 3));
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 1, 4]);
    expect(ranked.map((r) => r.team.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('roundResults', () => {
  it('teller manglende poeng som 0', () => {
    const scores: ScoreMap = { 10: { 3: 7 } };
    const results = roundResults(teams, scores, 10);
    expect(results[0]).toMatchObject({ team: { id: 3 }, points: 7, rank: 1 });
    expect(results[1].points).toBe(0);
  });
});

describe('standings', () => {
  const scores: ScoreMap = {
    10: { 1: 10, 2: 5, 3: 0 },
    20: { 1: 0, 2: 3, 3: 20 },
  };

  it('regner forrige og ny plassering', () => {
    const rows = standings(teams, scores, [10, 20]);
    expect(rows.map((r) => r.team.id)).toEqual([3, 1, 2]);
    expect(rows[0]).toMatchObject({ total: 20, rank: 1, prevTotal: 0, prevRank: 3, roundPoints: 20, rankChange: 2 });
    expect(rows[1]).toMatchObject({ total: 10, rank: 2, prevRank: 1, rankChange: -1 });
    expect(rows[2]).toMatchObject({ total: 8, rank: 3, prevRank: 2, rankChange: -1 });
  });

  it('har ingen endring etter første spill sammenlignet med alle på 0', () => {
    const rows = standings(teams, scores, [10]);
    expect(rows.map((r) => r.prevRank)).toEqual([1, 1, 1]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('ignorerer spill som ikke er avslørt', () => {
    const rows = standings(teams, scores, []);
    expect(rows.every((r) => r.total === 0 && r.roundPoints === 0)).toBe(true);
  });
});

describe('nextGame', () => {
  const games = [game(30, 2), game(10, 0), game(20, 1)];

  it('velger første spill i rekkefølge fra lobby', () => {
    expect(nextGame({ phase: 'lobby', currentGameId: null, revealedGameIds: [] }, games)?.id).toBe(10);
  });

  it('hopper over avslørte spill og aktivt spill', () => {
    expect(nextGame({ phase: 'standings', currentGameId: 10, revealedGameIds: [10] }, games)?.id).toBe(20);
    expect(nextGame({ phase: 'game', currentGameId: 20, revealedGameIds: [10] }, games)?.id).toBe(30);
  });

  it('returnerer null når alle spill er ferdige', () => {
    expect(nextGame({ phase: 'standings', currentGameId: 30, revealedGameIds: [10, 20, 30] }, games)).toBeNull();
  });
});

describe('timerRemainingMs', () => {
  it('teller ned når timeren går og stopper på 0', () => {
    expect(timerRemainingMs({ durationMs: 60_000, endsAt: 10_000, remainingMs: 60_000 }, 4_000)).toBe(6_000);
    expect(timerRemainingMs({ durationMs: 60_000, endsAt: 10_000, remainingMs: 60_000 }, 12_000)).toBe(0);
  });

  it('står stille når pauset', () => {
    expect(timerRemainingMs({ durationMs: 60_000, endsAt: null, remainingMs: 42_000 }, 99_000)).toBe(42_000);
  });
});
