import type { VoteCounts } from './types.ts';

export interface Vote {
  categoryId: number;
  voterId: number;
  nomineeId: number;
}

/** Hvor mange som går videre til finalen (flere ved likhet på siste plass). */
export const FINALIST_PLACES = 3;

export function countVotes(votes: Vote[]): VoteCounts {
  const counts: VoteCounts = {};
  for (const { categoryId, nomineeId } of votes) {
    const forCategory = (counts[categoryId] ??= {});
    forCategory[nomineeId] = (forCategory[nomineeId] ?? 0) + 1;
  }
  return counts;
}

/**
 * De med flest nominasjoner, sortert synkende. Alle som har like mange
 * stemmer som siste finaleplass blir med. Ingen stemmer = ikke nominert.
 */
export function pickFinalists(counts: Record<number, number>, places = FINALIST_PLACES): number[] {
  const sorted = Object.entries(counts)
    .map(([id, votes]) => ({ id: Number(id), votes }))
    .filter((entry) => entry.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.id - b.id);
  if (sorted.length <= places) return sorted.map((entry) => entry.id);
  const cutoff = sorted[places - 1].votes;
  return sorted.filter((entry) => entry.votes >= cutoff).map((entry) => entry.id);
}

/** Finalisten(e) med flest stemmer. Delt seier ved likhet – også når ingen har stemt. */
export function pickWinners(counts: Record<number, number>, finalistIds: number[]): number[] {
  const best = Math.max(0, ...finalistIds.map((id) => counts[id] ?? 0));
  return finalistIds.filter((id) => (counts[id] ?? 0) === best);
}

/** Deltakere som har stemt i alle de oppgitte nominasjonene. */
export function completedVoters(votes: Vote[], categoryIds: number[]): number[] {
  if (categoryIds.length === 0) return [];
  const wanted = new Set(categoryIds);
  const byVoter = new Map<number, Set<number>>();
  for (const vote of votes) {
    if (!wanted.has(vote.categoryId)) continue;
    let set = byVoter.get(vote.voterId);
    if (!set) byVoter.set(vote.voterId, (set = new Set()));
    set.add(vote.categoryId);
  }
  return [...byVoter].filter(([, set]) => set.size === wanted.size).map(([voterId]) => voterId);
}
