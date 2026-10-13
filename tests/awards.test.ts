import { describe, expect, it } from 'vitest';
import { completedVoters, countVotes, pickFinalists, pickWinners, type Vote } from '../shared/awards.ts';

describe('countVotes', () => {
  it('teller stemmer per nominasjon og person', () => {
    const votes: Vote[] = [
      { categoryId: 1, voterId: 10, nomineeId: 20 },
      { categoryId: 1, voterId: 11, nomineeId: 20 },
      { categoryId: 2, voterId: 10, nomineeId: 21 },
    ];
    expect(countVotes(votes)).toEqual({ 1: { 20: 2 }, 2: { 21: 1 } });
  });
});

describe('pickFinalists', () => {
  it('velger topp 3 sortert etter stemmer', () => {
    expect(pickFinalists({ 1: 2, 2: 5, 3: 1, 4: 3 })).toEqual([2, 4, 1]);
  });

  it('tar med alle som er like med 3. plass', () => {
    expect(pickFinalists({ 1: 4, 2: 3, 3: 2, 4: 2, 5: 1 })).toEqual([1, 2, 3, 4]);
    expect(pickFinalists({ 1: 2, 2: 2, 3: 2, 4: 2 })).toEqual([1, 2, 3, 4]);
  });

  it('tar ikke med personer uten stemmer', () => {
    expect(pickFinalists({ 1: 1, 2: 0 })).toEqual([1]);
    expect(pickFinalists({})).toEqual([]);
  });
});

describe('pickWinners', () => {
  it('velger finalisten med flest stemmer', () => {
    expect(pickWinners({ 1: 3, 2: 1 }, [1, 2, 3])).toEqual([1]);
  });

  it('gir delt seier ved likhet', () => {
    expect(pickWinners({ 1: 2, 2: 2, 3: 1 }, [1, 2, 3])).toEqual([1, 2]);
  });

  it('ignorerer stemmer på personer som ikke er finalister', () => {
    expect(pickWinners({ 1: 1, 9: 5 }, [1, 2])).toEqual([1]);
  });

  it('gir delt seier mellom alle når ingen har stemt', () => {
    expect(pickWinners({}, [1, 2])).toEqual([1, 2]);
  });
});

describe('completedVoters', () => {
  const votes: Vote[] = [
    { categoryId: 1, voterId: 10, nomineeId: 20 },
    { categoryId: 2, voterId: 10, nomineeId: 21 },
    { categoryId: 1, voterId: 11, nomineeId: 20 },
  ];

  it('regner bare med de som har stemt i alle nominasjonene', () => {
    expect(completedVoters(votes, [1, 2])).toEqual([10]);
    expect(completedVoters(votes, [1])).toEqual([10, 11]);
  });

  it('gir ingen ferdige når det ikke finnes nominasjoner', () => {
    expect(completedVoters(votes, [])).toEqual([]);
  });
});
