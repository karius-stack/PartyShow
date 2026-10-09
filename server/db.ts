import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Game, GameInput, MediaType, Phase, ScoreMap, ShowInfo, Team, TimerState } from '../shared/types.ts';

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(import.meta.dirname, '..', 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'partyshow.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS shows (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    timer_seconds INTEGER,
    media_url TEXT,
    media_type TEXT
  );

  CREATE TABLE IF NOT EXISTS scores (
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    PRIMARY KEY (game_id, team_id)
  );

  CREATE TABLE IF NOT EXISTS show_state (
    show_id INTEGER PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
    phase TEXT NOT NULL DEFAULT 'lobby',
    current_game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
    revealed_game_ids TEXT NOT NULL DEFAULT '[]',
    timer TEXT
  );
`);

export interface StoredState {
  phase: Phase;
  currentGameId: number | null;
  revealedGameIds: number[];
  timer: TimerState | null;
}

type Row = Record<string, unknown>;

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// --- Show ---

export function getOrCreateActiveShow(): ShowInfo {
  const row = db.prepare('SELECT id, name, theme_id FROM shows ORDER BY id LIMIT 1').get() as Row | undefined;
  if (row) return { id: Number(row.id), name: String(row.name), themeId: String(row.theme_id) };

  const result = db.prepare('INSERT INTO shows (name, theme_id) VALUES (?, ?)').run('Halloween 2026', 'halloween');
  const id = Number(result.lastInsertRowid);
  db.prepare('INSERT INTO show_state (show_id) VALUES (?)').run(id);
  return { id, name: 'Halloween 2026', themeId: 'halloween' };
}

export function updateShow(showId: number, name: string, themeId: string) {
  db.prepare('UPDATE shows SET name = ?, theme_id = ? WHERE id = ?').run(name, themeId, showId);
}

// --- Tilstand ---

export function getState(showId: number): StoredState {
  const row = db.prepare('SELECT * FROM show_state WHERE show_id = ?').get(showId) as Row | undefined;
  if (!row) {
    db.prepare('INSERT INTO show_state (show_id) VALUES (?)').run(showId);
    return { phase: 'lobby', currentGameId: null, revealedGameIds: [], timer: null };
  }
  return {
    phase: row.phase as Phase,
    currentGameId: row.current_game_id === null ? null : Number(row.current_game_id),
    revealedGameIds: JSON.parse(String(row.revealed_game_ids)) as number[],
    timer: row.timer === null ? null : (JSON.parse(String(row.timer)) as TimerState),
  };
}

export function saveState(showId: number, state: StoredState) {
  db.prepare(
    'UPDATE show_state SET phase = ?, current_game_id = ?, revealed_game_ids = ?, timer = ? WHERE show_id = ?',
  ).run(
    state.phase,
    state.currentGameId,
    JSON.stringify(state.revealedGameIds),
    state.timer === null ? null : JSON.stringify(state.timer),
    showId,
  );
}

// --- Lag ---

export function listTeams(showId: number): Team[] {
  const rows = db.prepare('SELECT id, name, sort_order FROM teams WHERE show_id = ? ORDER BY sort_order, id').all(showId) as Row[];
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), sortOrder: Number(r.sort_order) }));
}

export function addTeam(showId: number, name: string) {
  const { next } = db.prepare('SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM teams WHERE show_id = ?').get(showId) as {
    next: number;
  };
  db.prepare('INSERT INTO teams (show_id, name, sort_order) VALUES (?, ?, ?)').run(showId, name, next);
}

export function renameTeam(showId: number, id: number, name: string) {
  return db.prepare('UPDATE teams SET name = ? WHERE id = ? AND show_id = ?').run(name, id, showId).changes > 0;
}

export function removeTeam(showId: number, id: number) {
  return db.prepare('DELETE FROM teams WHERE id = ? AND show_id = ?').run(id, showId).changes > 0;
}

export function removeAllTeams(showId: number) {
  db.prepare('DELETE FROM teams WHERE show_id = ?').run(showId);
}

// --- Spill ---

function toGame(r: Row): Game {
  return {
    id: Number(r.id),
    title: String(r.title),
    description: String(r.description),
    timerSeconds: r.timer_seconds === null ? null : Number(r.timer_seconds),
    mediaUrl: r.media_url === null ? null : String(r.media_url),
    mediaType: r.media_type === null ? null : (r.media_type as MediaType),
    sortOrder: Number(r.sort_order),
  };
}

export function listGames(showId: number): Game[] {
  const rows = db.prepare('SELECT * FROM games WHERE show_id = ? ORDER BY sort_order, id').all(showId) as Row[];
  return rows.map(toGame);
}

export function createGame(showId: number, input: GameInput) {
  const { next } = db.prepare('SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM games WHERE show_id = ?').get(showId) as {
    next: number;
  };
  db.prepare(
    `INSERT INTO games (show_id, sort_order, title, description, timer_seconds, media_url, media_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(showId, next, input.title, input.description, input.timerSeconds, input.mediaUrl, input.mediaType);
}

export function updateGame(showId: number, id: number, input: GameInput) {
  return (
    db
      .prepare(
        `UPDATE games SET title = ?, description = ?, timer_seconds = ?, media_url = ?, media_type = ?
         WHERE id = ? AND show_id = ?`,
      )
      .run(input.title, input.description, input.timerSeconds, input.mediaUrl, input.mediaType, id, showId).changes > 0
  );
}

export function deleteGame(showId: number, id: number) {
  return db.prepare('DELETE FROM games WHERE id = ? AND show_id = ?').run(id, showId).changes > 0;
}

/** Skriver ny rekkefølge (0, 1, 2 …) for tabellen basert på id-listen. */
export function setSortOrder(table: 'teams' | 'games', ids: number[]) {
  const stmt = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  ids.forEach((id, index) => stmt.run(index, id));
}

// --- Poeng ---

export function listScores(showId: number): ScoreMap {
  const rows = db
    .prepare('SELECT s.game_id, s.team_id, s.points FROM scores s JOIN games g ON g.id = s.game_id WHERE g.show_id = ?')
    .all(showId) as Row[];
  const map: ScoreMap = {};
  for (const r of rows) {
    const gameId = Number(r.game_id);
    (map[gameId] ??= {})[Number(r.team_id)] = Number(r.points);
  }
  return map;
}

export function setScore(gameId: number, teamId: number, points: number | null) {
  if (points === null) {
    db.prepare('DELETE FROM scores WHERE game_id = ? AND team_id = ?').run(gameId, teamId);
  } else {
    db.prepare(
      'INSERT INTO scores (game_id, team_id, points) VALUES (?, ?, ?) ON CONFLICT (game_id, team_id) DO UPDATE SET points = excluded.points',
    ).run(gameId, teamId, points);
  }
}

export function clearScores(showId: number) {
  db.prepare('DELETE FROM scores WHERE game_id IN (SELECT id FROM games WHERE show_id = ?)').run(showId);
}
