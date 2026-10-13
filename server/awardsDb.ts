import type { Vote } from '../shared/awards.ts';
import type { AwardCategory, AwardsPhase, CeremonyStep, ImageStatus, Participant } from '../shared/types.ts';
import { db, type Row } from './db.ts';

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY,
    show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,
    original_url TEXT NOT NULL,
    ai_url TEXT,
    image_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (show_id, device_id)
  );

  CREATE TABLE IF NOT EXISTS award_categories (
    id INTEGER PRIMARY KEY,
    show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    finalist_ids TEXT,
    winner_ids TEXT
  );

  CREATE TABLE IF NOT EXISTS nomination_votes (
    category_id INTEGER NOT NULL REFERENCES award_categories(id) ON DELETE CASCADE,
    voter_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    nominee_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, voter_id)
  );

  CREATE TABLE IF NOT EXISTS final_votes (
    category_id INTEGER NOT NULL REFERENCES award_categories(id) ON DELETE CASCADE,
    voter_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    nominee_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, voter_id)
  );

  CREATE TABLE IF NOT EXISTS awards_state (
    show_id INTEGER PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
    phase TEXT NOT NULL DEFAULT 'registration',
    current_category_id INTEGER REFERENCES award_categories(id) ON DELETE SET NULL,
    step TEXT
  );
`);

export interface StoredAwardsState {
  phase: AwardsPhase;
  currentCategoryId: number | null;
  step: CeremonyStep | null;
}

function parseIds(value: unknown): number[] | null {
  return value === null || value === undefined ? null : (JSON.parse(String(value)) as number[]);
}

// --- Tilstand ---

export function getAwardsState(showId: number): StoredAwardsState {
  const row = db.prepare('SELECT * FROM awards_state WHERE show_id = ?').get(showId) as Row | undefined;
  if (!row) {
    db.prepare('INSERT INTO awards_state (show_id) VALUES (?)').run(showId);
    return { phase: 'registration', currentCategoryId: null, step: null };
  }
  return {
    phase: row.phase as AwardsPhase,
    currentCategoryId: row.current_category_id === null ? null : Number(row.current_category_id),
    step: row.step === null ? null : (row.step as CeremonyStep),
  };
}

export function saveAwardsState(showId: number, state: StoredAwardsState) {
  db.prepare('UPDATE awards_state SET phase = ?, current_category_id = ?, step = ? WHERE show_id = ?').run(
    state.phase,
    state.currentCategoryId,
    state.step,
    showId,
  );
}

// --- Deltakere ---

function toParticipant(r: Row): Participant {
  return {
    id: Number(r.id),
    name: String(r.name),
    originalUrl: String(r.original_url),
    aiUrl: r.ai_url === null ? null : String(r.ai_url),
    imageStatus: r.image_status as ImageStatus,
  };
}

export function listParticipants(showId: number): Participant[] {
  const rows = db.prepare('SELECT * FROM participants WHERE show_id = ? ORDER BY id').all(showId) as Row[];
  return rows.map(toParticipant);
}

export function findParticipantByDevice(showId: number, deviceId: string): Participant | null {
  const row = db.prepare('SELECT * FROM participants WHERE show_id = ? AND device_id = ?').get(showId, deviceId) as
    | Row
    | undefined;
  return row ? toParticipant(row) : null;
}

export function addParticipant(showId: number, deviceId: string, name: string, originalUrl: string): number {
  const result = db
    .prepare('INSERT INTO participants (show_id, device_id, name, original_url) VALUES (?, ?, ?, ?)')
    .run(showId, deviceId, name, originalUrl);
  return Number(result.lastInsertRowid);
}

export function renameParticipant(showId: number, id: number, name: string) {
  return db.prepare('UPDATE participants SET name = ? WHERE id = ? AND show_id = ?').run(name, id, showId).changes > 0;
}

export function setParticipantImage(id: number, status: ImageStatus, aiUrl: string | null) {
  db.prepare('UPDATE participants SET image_status = ?, ai_url = ? WHERE id = ?').run(status, aiUrl, id);
}

export function removeParticipant(showId: number, id: number) {
  return db.prepare('DELETE FROM participants WHERE id = ? AND show_id = ?').run(id, showId).changes > 0;
}

export function removeAllParticipants(showId: number) {
  db.prepare('DELETE FROM participants WHERE show_id = ?').run(showId);
}

// --- Nominasjoner ---

function toCategory(r: Row): AwardCategory {
  return {
    id: Number(r.id),
    title: String(r.title),
    sortOrder: Number(r.sort_order),
    finalistIds: parseIds(r.finalist_ids),
    winnerIds: parseIds(r.winner_ids),
  };
}

export function listCategories(showId: number): AwardCategory[] {
  const rows = db.prepare('SELECT * FROM award_categories WHERE show_id = ? ORDER BY sort_order, id').all(showId) as Row[];
  return rows.map(toCategory);
}

export function createCategory(showId: number, title: string) {
  const { next } = db
    .prepare('SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM award_categories WHERE show_id = ?')
    .get(showId) as { next: number };
  db.prepare('INSERT INTO award_categories (show_id, title, sort_order) VALUES (?, ?, ?)').run(showId, title, next);
}

export function renameCategory(showId: number, id: number, title: string) {
  return db.prepare('UPDATE award_categories SET title = ? WHERE id = ? AND show_id = ?').run(title, id, showId).changes > 0;
}

export function deleteCategory(showId: number, id: number) {
  return db.prepare('DELETE FROM award_categories WHERE id = ? AND show_id = ?').run(id, showId).changes > 0;
}

export function removeAllCategories(showId: number) {
  db.prepare('DELETE FROM award_categories WHERE show_id = ?').run(showId);
}

export function setCategoryResult(id: number, finalistIds: number[] | null, winnerIds: number[] | null) {
  db.prepare('UPDATE award_categories SET finalist_ids = ?, winner_ids = ? WHERE id = ?').run(
    finalistIds === null ? null : JSON.stringify(finalistIds),
    winnerIds === null ? null : JSON.stringify(winnerIds),
    id,
  );
}

/** Nullstiller finalister og vinnere i alle nominasjonene. */
export function clearCategoryResults(showId: number) {
  db.prepare('UPDATE award_categories SET finalist_ids = NULL, winner_ids = NULL WHERE show_id = ?').run(showId);
}

// --- Stemmer ---

export type VoteTable = 'nomination_votes' | 'final_votes';

export function listVotes(showId: number, table: VoteTable): Vote[] {
  const rows = db
    .prepare(
      `SELECT v.category_id, v.voter_id, v.nominee_id FROM ${table} v
       JOIN award_categories c ON c.id = v.category_id WHERE c.show_id = ?`,
    )
    .all(showId) as Row[];
  return rows.map((r) => ({ categoryId: Number(r.category_id), voterId: Number(r.voter_id), nomineeId: Number(r.nominee_id) }));
}

export function setVote(table: VoteTable, categoryId: number, voterId: number, nomineeId: number) {
  db.prepare(
    `INSERT INTO ${table} (category_id, voter_id, nominee_id) VALUES (?, ?, ?)
     ON CONFLICT (category_id, voter_id) DO UPDATE SET nominee_id = excluded.nominee_id`,
  ).run(categoryId, voterId, nomineeId);
}

export function clearVotes(showId: number, table: VoteTable, categoryId?: number) {
  if (categoryId !== undefined) {
    db.prepare(`DELETE FROM ${table} WHERE category_id = ?`).run(categoryId);
  } else {
    db.prepare(`DELETE FROM ${table} WHERE category_id IN (SELECT id FROM award_categories WHERE show_id = ?)`).run(showId);
  }
}
