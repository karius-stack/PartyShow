import { nextGame, timerRemainingMs } from '../shared/scoring.ts';
import type { Game, GameInput, GameshowPhase, GameshowState, ScoreMap, TimerState } from '../shared/types.ts';
import * as db from './db.ts';
import { ShowError } from './errors.ts';
import { cleanName, move } from './util.ts';

const PHASES: GameshowPhase[] = ['lobby', 'game', 'roundResults', 'standings'];

function cleanGameInput(input: GameInput): GameInput {
  const timerSeconds = input.timerSeconds === null || input.timerSeconds === undefined ? null : Number(input.timerSeconds);
  if (timerSeconds !== null && (!Number.isInteger(timerSeconds) || timerSeconds < 1 || timerSeconds > 3600)) {
    throw new ShowError('Timer må være mellom 1 og 3600 sekunder');
  }
  const mediaUrl = typeof input.mediaUrl === 'string' && input.mediaUrl.trim() ? input.mediaUrl.trim() : null;
  const mediaType = mediaUrl && (input.mediaType === 'image' || input.mediaType === 'video') ? input.mediaType : null;
  if (mediaUrl && !mediaType) throw new ShowError('Ukjent medietype');
  return {
    title: cleanName(input.title, 'Tittel'),
    description: typeof input.description === 'string' ? input.description.trim() : '',
    timerSeconds,
    mediaUrl,
    mediaType,
  };
}

function freshTimer(game: Game): TimerState | null {
  if (game.timerSeconds === null) return null;
  const durationMs = game.timerSeconds * 1000;
  return { durationMs, endsAt: null, remainingMs: durationMs };
}

function pausedTimer(timer: TimerState | null): TimerState | null {
  if (!timer || timer.endsAt === null) return timer;
  return { ...timer, endsAt: null, remainingMs: timerRemainingMs(timer, Date.now()) };
}

/**
 * Gameshow-modusen: lag, spill, poeng og timer. All tilstand ligger i SQLite;
 * kontrolleren leser og skriver derfra ved hver kommando, så en omstart av
 * serveren fortsetter der man slapp.
 */
export class GameshowController {
  private listeners = new Set<() => void>();

  constructor(readonly showId: number) {}

  onChange(listener: () => void) {
    this.listeners.add(listener);
  }

  private changed() {
    for (const listener of this.listeners) listener();
  }

  private findGame(id: number): Game {
    const game = db.listGames(this.showId).find((g) => g.id === id);
    if (!game) throw new ShowError('Fant ikke spillet');
    return game;
  }

  private mutateState(fn: (state: db.StoredState) => db.StoredState) {
    db.saveState(this.showId, fn(db.getState(this.showId)));
  }

  // --- Visning ---

  adminState(): GameshowState {
    const games = db.listGames(this.showId);
    return {
      ...db.getState(this.showId),
      teams: db.listTeams(this.showId),
      games,
      scores: db.listScores(this.showId),
      gameCount: games.length,
    };
  }

  /** Som adminState, men uten kommende spill og uten poeng som ikke er avslørt. */
  publicState(): GameshowState {
    const state = this.adminState();
    const visible = new Set(state.revealedGameIds);
    if (state.currentGameId !== null) visible.add(state.currentGameId);

    const scores: ScoreMap = {};
    for (const gameId of state.revealedGameIds) {
      if (state.scores[gameId]) scores[gameId] = state.scores[gameId];
    }
    return { ...state, games: state.games.filter((g) => visible.has(g.id)), scores };
  }

  // --- Nullstilling ---

  reset(options: { removeTeams: boolean }) {
    db.transaction(() => {
      db.clearScores(this.showId);
      if (options.removeTeams) db.removeAllTeams(this.showId);
      db.saveState(this.showId, { phase: 'lobby', currentGameId: null, revealedGameIds: [], timer: null });
    });
    this.changed();
  }

  // --- Lag ---

  addTeam(name: string) {
    db.addTeam(this.showId, cleanName(name, 'Lagnavn'));
    this.changed();
  }

  renameTeam(id: number, name: string) {
    if (!db.renameTeam(this.showId, id, cleanName(name, 'Lagnavn'))) throw new ShowError('Fant ikke laget');
    this.changed();
  }

  removeTeam(id: number) {
    if (!db.removeTeam(this.showId, id)) throw new ShowError('Fant ikke laget');
    this.changed();
  }

  moveTeam(id: number, direction: -1 | 1) {
    db.setSortOrder('teams', move(db.listTeams(this.showId), id, direction));
    this.changed();
  }

  // --- Spill ---

  createGame(input: GameInput) {
    db.createGame(this.showId, cleanGameInput(input));
    this.changed();
  }

  updateGame(id: number, input: GameInput) {
    const clean = cleanGameInput(input);
    db.transaction(() => {
      if (!db.updateGame(this.showId, id, clean)) throw new ShowError('Fant ikke spillet');
      // Endret timer på aktivt spill tar effekt med en gang hvis timeren ikke går.
      const state = db.getState(this.showId);
      if (state.phase === 'game' && state.currentGameId === id && state.timer?.endsAt == null) {
        db.saveState(this.showId, { ...state, timer: freshTimer(this.findGame(id)) });
      }
    });
    this.changed();
  }

  deleteGame(id: number) {
    db.transaction(() => {
      const state = db.getState(this.showId);
      if (!db.deleteGame(this.showId, id)) throw new ShowError('Fant ikke spillet');
      const revealedGameIds = state.revealedGameIds.filter((g) => g !== id);
      if (state.currentGameId === id) {
        db.saveState(this.showId, {
          phase: revealedGameIds.length > 0 ? 'standings' : 'lobby',
          currentGameId: null,
          revealedGameIds,
          timer: null,
        });
      } else {
        db.saveState(this.showId, { ...state, revealedGameIds });
      }
    });
    this.changed();
  }

  moveGame(id: number, direction: -1 | 1) {
    db.setSortOrder('games', move(db.listGames(this.showId), id, direction));
    this.changed();
  }

  // --- Flyt ---

  startNextGame() {
    const state = db.getState(this.showId);
    if (state.phase === 'game') throw new ShowError('Vis runderesultater før neste spill');
    const game = nextGame(state, db.listGames(this.showId));
    if (!game) throw new ShowError('Det er ingen flere spill');
    db.saveState(this.showId, { ...state, phase: 'game', currentGameId: game.id, timer: freshTimer(game) });
    this.changed();
  }

  showRoundResults() {
    this.mutateState((state) => {
      if (state.phase !== 'game' || state.currentGameId === null) throw new ShowError('Ingen spill er i gang');
      const revealedGameIds = state.revealedGameIds.includes(state.currentGameId)
        ? state.revealedGameIds
        : [...state.revealedGameIds, state.currentGameId];
      return { ...state, phase: 'roundResults', revealedGameIds, timer: pausedTimer(state.timer) };
    });
    this.changed();
  }

  showStandings() {
    this.mutateState((state) => {
      if (state.revealedGameIds.length === 0) throw new ShowError('Ingen runder er avsluttet ennå');
      return { ...state, phase: 'standings', timer: pausedTimer(state.timer) };
    });
    this.changed();
  }

  /** Manuell overstyring av hva storskjermen viser, for å rette feil underveis. */
  goTo(phase: GameshowPhase, gameId: number | null) {
    if (!PHASES.includes(phase)) throw new ShowError('Ukjent fase');
    this.mutateState((state) => {
      switch (phase) {
        case 'lobby':
          return { ...state, phase, timer: pausedTimer(state.timer) };
        case 'standings':
          if (state.revealedGameIds.length === 0) throw new ShowError('Ingen runder er avsluttet ennå');
          return { ...state, phase, timer: pausedTimer(state.timer) };
        case 'game': {
          if (gameId === null) throw new ShowError('Velg et spill');
          const game = this.findGame(gameId);
          // Spillet spilles på nytt, så resultatet må avsløres igjen.
          const revealedGameIds = state.revealedGameIds.filter((g) => g !== gameId);
          return { ...state, phase, currentGameId: game.id, revealedGameIds, timer: freshTimer(game) };
        }
        case 'roundResults': {
          if (gameId === null) throw new ShowError('Velg et spill');
          const game = this.findGame(gameId);
          const revealedGameIds = state.revealedGameIds.includes(gameId)
            ? state.revealedGameIds
            : [...state.revealedGameIds, gameId];
          const timer = state.currentGameId === gameId ? pausedTimer(state.timer) : null;
          return { ...state, phase, currentGameId: game.id, revealedGameIds, timer };
        }
      }
    });
    this.changed();
  }

  // --- Poeng ---

  setScore(gameId: number, teamId: number, points: number | null) {
    if (points !== null && !Number.isFinite(points)) throw new ShowError('Ugyldig poengsum');
    this.findGame(gameId);
    if (!db.listTeams(this.showId).some((t) => t.id === teamId)) throw new ShowError('Fant ikke laget');
    db.setScore(gameId, teamId, points === null ? null : Math.round(points));
    this.changed();
  }

  // --- Timer ---

  private mutateTimer(fn: (timer: TimerState) => TimerState) {
    this.mutateState((state) => {
      if (state.phase !== 'game' || !state.timer) throw new ShowError('Aktivt spill har ingen timer');
      return { ...state, timer: fn(state.timer) };
    });
    this.changed();
  }

  startTimer() {
    this.mutateTimer((timer) => {
      if (timer.endsAt !== null) return timer;
      const remainingMs = timer.remainingMs > 0 ? timer.remainingMs : timer.durationMs;
      return { ...timer, remainingMs, endsAt: Date.now() + remainingMs };
    });
  }

  pauseTimer() {
    this.mutateTimer((timer) => pausedTimer(timer)!);
  }

  resetTimer() {
    this.mutateTimer((timer) => ({ ...timer, endsAt: null, remainingMs: timer.durationMs }));
  }
}
