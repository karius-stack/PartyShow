import { describe, expect, it } from 'vitest';
import { joinNames } from '../src/lib/format.ts';

describe('joinNames', () => {
  it('slår sammen navn med komma og «og»', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['Heksene'])).toBe('Heksene');
    expect(joinNames(['Heksene', 'Vampyrene'])).toBe('Heksene og Vampyrene');
    expect(joinNames(['Heksene', 'Vampyrene', 'Zombiene'])).toBe('Heksene, Vampyrene og Zombiene');
  });
});
