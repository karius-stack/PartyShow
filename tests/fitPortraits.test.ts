import { describe, expect, it } from 'vitest';
import { fitPortraitWidth } from '../src/screen/awards/fitPortraits.ts';

describe('fitPortraitWidth', () => {
  it('bruker maksbredden når det er god plass', () => {
    expect(fitPortraitWidth(3, 1500, 700, 260)).toBe(260);
  });

  it('krymper portrettene når mange skal få plass', () => {
    const w = fitPortraitWidth(40, 1500, 650, 260);
    expect(w).toBeLessThan(260);
    const cols = Math.floor((1500 + w * 0.18) / (w * 1.18));
    expect(Math.ceil(40 / cols) * (w * 1.8 + w * 0.18) - w * 0.18).toBeLessThanOrEqual(650);
  });
});
