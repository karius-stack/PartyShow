/** Skalerer resultatlisten ned når det er mange lag, så alt får plass. */
export function listFontSize(rows: number): string {
  return `${Math.min(1, 7 / Math.max(rows, 1))}em`;
}
