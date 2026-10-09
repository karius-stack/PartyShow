// Datamodell og socket-eventer som deles mellom server og klient.

export type Phase = 'lobby' | 'game' | 'roundResults' | 'standings';

export type MediaType = 'image' | 'video';

export interface Team {
  id: number;
  name: string;
  sortOrder: number;
}

export interface Game {
  id: number;
  title: string;
  description: string;
  /** Null betyr at spillet ikke har timer. */
  timerSeconds: number | null;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  sortOrder: number;
}

export type GameInput = Omit<Game, 'id' | 'sortOrder'>;

/** Timeren går når `endsAt` er satt (servertid i ms). Ellers står den på `remainingMs`. */
export interface TimerState {
  durationMs: number;
  endsAt: number | null;
  remainingMs: number;
}

/** gameId -> teamId -> poeng */
export type ScoreMap = Record<number, Record<number, number>>;

export interface ShowInfo {
  id: number;
  name: string;
  themeId: string;
}

export interface ShowState {
  show: ShowInfo;
  phase: Phase;
  currentGameId: number | null;
  /** Spill der runderesultatet er vist, i rekkefølgen de ble avslørt. */
  revealedGameIds: number[];
  teams: Team[];
  /** Til storskjermen sendes bare avslørte spill og det aktive spillet. */
  games: Game[];
  /** Til storskjermen sendes bare poeng for avslørte spill. */
  scores: ScoreMap;
  timer: TimerState | null;
  /** Totalt antall spill i showet (også de som ikke er sendt til storskjermen). */
  gameCount: number;
}

export type AckResult = { ok: true } | { ok: false; error: string };
export type Ack = (result: AckResult) => void;

export interface ServerToClientEvents {
  state: (state: ShowState) => void;
}

export interface ScreenClientEvents {
  'clock:ping': (ack: (serverNow: number) => void) => void;
}

export interface AdminClientEvents extends ScreenClientEvents {
  'team:add': (name: string, ack: Ack) => void;
  'team:rename': (id: number, name: string, ack: Ack) => void;
  'team:remove': (id: number, ack: Ack) => void;
  'team:move': (id: number, direction: -1 | 1, ack: Ack) => void;

  'game:create': (input: GameInput, ack: Ack) => void;
  'game:update': (id: number, input: GameInput, ack: Ack) => void;
  'game:delete': (id: number, ack: Ack) => void;
  'game:move': (id: number, direction: -1 | 1, ack: Ack) => void;

  'show:startNextGame': (ack: Ack) => void;
  'show:showRoundResults': (ack: Ack) => void;
  'show:showStandings': (ack: Ack) => void;
  'show:goTo': (phase: Phase, gameId: number | null, ack: Ack) => void;
  'show:reset': (options: { removeTeams: boolean }, ack: Ack) => void;
  'show:update': (input: { name: string; themeId: string }, ack: Ack) => void;

  'score:set': (gameId: number, teamId: number, points: number | null, ack: Ack) => void;

  'timer:start': (ack: Ack) => void;
  'timer:pause': (ack: Ack) => void;
  'timer:reset': (ack: Ack) => void;
}

export type AdminCommand = Exclude<keyof AdminClientEvents, 'clock:ping'>;

/** Argumentene til en admin-kommando, uten ack-callbacken. */
export type CommandArgs<E extends AdminCommand> = Parameters<AdminClientEvents[E]> extends [...infer A, Ack] ? A : never;
