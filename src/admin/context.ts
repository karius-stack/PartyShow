import { createContext, useContext } from 'react';
import type { AdminCommand, CommandArgs, ShowState } from '../../shared/types.ts';

export interface AdminContextValue {
  state: ShowState;
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
