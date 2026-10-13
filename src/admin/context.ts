import { createContext, useContext } from 'react';
import type { AdminCommand, AppState, AwardsState, CommandArgs, GameshowState } from '../../shared/types.ts';

export interface AdminContextValue {
  app: AppState;
  pin: string;
  /** Sender en kommando til serveren. Feil vises automatisk; returnerer om det gikk bra. */
  send: <E extends AdminCommand>(event: E, ...args: CommandArgs<E>) => Promise<boolean>;
  showError: (message: string) => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin må brukes inne i AdminContext');
  return value;
}

/** For gameshow-fanene: `state` er gameshow-tilstanden. */
export function useGameshow(): AdminContextValue & { state: GameshowState } {
  const value = useAdmin();
  return { ...value, state: value.app.gameshow };
}

/** For kåringsfanene: `state` er kåringstilstanden. */
export function useAwards(): AdminContextValue & { state: AwardsState } {
  const value = useAdmin();
  return { ...value, state: value.app.awards };
}
