import type { ComponentType, CSSProperties } from 'react';
import type { Team } from '../../shared/types.ts';

export interface TeamAvatarProps {
  team: Team;
  /** Lagets plass i registreringsrekkefølgen – brukes til variasjon mellom avatarer. */
  index: number;
}

export interface Theme {
  id: string;
  name: string;
  /** Figuren som representerer et lag på storskjermen. */
  TeamAvatar: ComponentType<TeamAvatarProps>;
  /** Valgfri animert bakgrunn bak alle visninger. */
  Background?: ComponentType;
  /** CSS-variabler (--bg, --fg, --accent, --muted, --font …) som settes på storskjermen. */
  vars: CSSProperties & Record<`--${string}`, string>;
}
