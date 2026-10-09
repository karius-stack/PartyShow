import { defaultTheme } from './default/index.tsx';
import { halloweenTheme } from './halloween/index.tsx';
import type { Theme } from './types.ts';

export const themes: Theme[] = [halloweenTheme, defaultTheme];

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) ?? defaultTheme;
}
