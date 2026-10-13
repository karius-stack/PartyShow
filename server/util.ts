import { ShowError } from './errors.ts';

export const MAX_NAME_LENGTH = 40;

export function cleanName(name: unknown, what: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) throw new ShowError(`${what} kan ikke være tomt`);
  if (trimmed.length > MAX_NAME_LENGTH) throw new ShowError(`${what} kan være maks ${MAX_NAME_LENGTH} tegn`);
  return trimmed;
}

/** Ny id-rekkefølge der elementet er flyttet ett hakk opp eller ned. */
export function move<T extends { id: number }>(items: T[], id: number, direction: -1 | 1): number[] {
  const ids = items.map((item) => item.id);
  const from = ids.indexOf(id);
  if (from === -1) throw new ShowError('Fant ikke elementet');
  const to = from + direction;
  if (to < 0 || to >= ids.length) return ids;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
