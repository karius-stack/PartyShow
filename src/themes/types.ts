import type { TargetAndTransition, Transition } from 'motion/react';
import type { ComponentType, CSSProperties } from 'react';
import type { Team } from '../../shared/types.ts';

export interface TeamAvatarProps {
  team: Team;
  /** Lagets plass i registreringsrekkefølgen – brukes til variasjon mellom avatarer. */
  index: number;
  /** `large` i lobbyen, `small` i resultatlister. */
  size?: 'large' | 'small';
}

export interface Theme {
  id: string;
  name: string;
  /** Figuren som representerer et lag på storskjermen. */
  TeamAvatar: ComponentType<TeamAvatarProps>;
  /** Valgfri animert bakgrunn bak alle visninger. */
  Background?: ComponentType;
  /** Valgfri feiring bak vinneren når sluttresultatet vises. */
  WinnerCelebration?: ComponentType;
  /** Hvordan et nytt lag kommer inn i lobbyen. */
  teamEntrance: { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition };
  /**
   * CSS-variabler som settes på storskjermen: --bg, --fg, --muted, --accent,
   * --panel, --font-display og --font-body. Storskjermen får også klassen
   * `theme-<id>` slik at temaet kan ha egen CSS.
   */
  vars: CSSProperties & Record<`--${string}`, string>;
}
