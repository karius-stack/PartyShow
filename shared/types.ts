// Datamodell og socket-eventer som deles mellom server og klient.

/** Modusene admin kan vise på storskjermen. `null` betyr logo-siden. */
export type ModeId = 'gameshow' | 'awards';

// --- Gameshow ---

export type GameshowPhase = 'lobby' | 'game' | 'roundResults' | 'standings';

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

export interface GameshowState {
  phase: GameshowPhase;
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

// --- Kåring ---

/** registration → nominating → ceremony (én nominasjon om gangen) → finished */
export type AwardsPhase = 'registration' | 'nominating' | 'ceremony' | 'finished';

/** I seremonien: finalistene vises og det stemmes, deretter avsløres vinneren. */
export type CeremonyStep = 'voting' | 'revealed';

export type ImageStatus = 'pending' | 'ready' | 'failed';

export interface Participant {
  id: number;
  name: string;
  /** Bildet deltakeren tok selv. */
  originalUrl: string;
  /** Utklipp av personen med gjennomsiktig bakgrunn, når det er klart. */
  aiUrl: string | null;
  imageStatus: ImageStatus;
}

export interface AwardCategory {
  id: number;
  title: string;
  sortOrder: number;
  /** Topp 3 (flere ved likhet). Fryses når nominasjonen åpnes i seremonien. */
  finalistIds: number[] | null;
  /** Fryses når vinneren avsløres. Flere ved delt seier. */
  winnerIds: number[] | null;
}

/** categoryId -> participantId -> antall stemmer */
export type VoteCounts = Record<number, Record<number, number>>;

export interface AwardsState {
  phase: AwardsPhase;
  participants: Participant[];
  categories: AwardCategory[];
  currentCategoryId: number | null;
  step: CeremonyStep | null;
  /** Deltakere som har nominert i alle nominasjonene. */
  nominatedIds: number[];
  /** Deltakere som har stemt i finalen for aktiv nominasjon. */
  finalVoterIds: number[];
  /** Kun til admin – tomt på storskjermen. */
  nominationCounts: VoteCounts;
  /** Kun til admin – tomt på storskjermen. */
  finalCounts: VoteCounts;
}

// --- Felles ---

export interface ShowInfo {
  id: number;
  name: string;
  themeId: string;
}

/** Alt storskjermen og kontrollpanelet trenger. Hver modus beholder sin egen tilstand. */
export interface AppState {
  show: ShowInfo;
  activeMode: ModeId | null;
  gameshow: GameshowState;
  awards: AwardsState;
}

/** Det en deltaker ser på mobilen (/join). Personlig per enhet. */
export interface ParticipantView {
  show: ShowInfo;
  phase: AwardsPhase;
  registrationOpen: boolean;
  me: Participant | null;
  participants: Participant[];
  categories: { id: number; title: string }[];
  /** categoryId -> participantId */
  myNominations: Record<number, number>;
  /** Aktiv nominasjon i seremonien. */
  current: {
    categoryId: number;
    title: string;
    step: CeremonyStep;
    finalists: Participant[];
    myVote: number | null;
    winnerIds: number[] | null;
  } | null;
}

export type AckResult = { ok: true } | { ok: false; error: string };
export type Ack = (result: AckResult) => void;

export interface ServerToClientEvents {
  state: (state: AppState) => void;
}

export interface ScreenClientEvents {
  'clock:ping': (ack: (serverNow: number) => void) => void;
}

export interface AdminClientEvents extends ScreenClientEvents {
  'mode:set': (mode: ModeId | null, ack: Ack) => void;
  'show:update': (input: { name: string; themeId: string }, ack: Ack) => void;

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
  'show:goTo': (phase: GameshowPhase, gameId: number | null, ack: Ack) => void;
  'show:reset': (options: { removeTeams: boolean }, ack: Ack) => void;

  'score:set': (gameId: number, teamId: number, points: number | null, ack: Ack) => void;

  'timer:start': (ack: Ack) => void;
  'timer:pause': (ack: Ack) => void;
  'timer:reset': (ack: Ack) => void;

  'participant:rename': (id: number, name: string, ack: Ack) => void;
  'participant:remove': (id: number, ack: Ack) => void;
  'participant:regenerateImage': (id: number, ack: Ack) => void;
  'participant:regenerateAllImages': (ack: Ack) => void;

  'category:create': (title: string, ack: Ack) => void;
  'category:rename': (id: number, title: string, ack: Ack) => void;
  'category:delete': (id: number, ack: Ack) => void;
  'category:move': (id: number, direction: -1 | 1, ack: Ack) => void;

  'awards:startNominating': (ack: Ack) => void;
  'awards:startCeremony': (ack: Ack) => void;
  'awards:openCategory': (id: number, ack: Ack) => void;
  'awards:revealWinner': (ack: Ack) => void;
  /** Sletter finalestemmene i aktiv nominasjon slik at det kan stemmes på nytt. */
  'awards:restartVoting': (ack: Ack) => void;
  'awards:finish': (ack: Ack) => void;
  /** Tilbake til registrering eller nominering. Nullstiller seremonien. */
  'awards:goBack': (phase: 'registration' | 'nominating', ack: Ack) => void;
  'awards:reset': (options: { removeParticipants: boolean; removeCategories: boolean }, ack: Ack) => void;
}

export type AdminCommand = Exclude<keyof AdminClientEvents, 'clock:ping'>;

/** Argumentene til en admin-kommando, uten ack-callbacken. */
export type CommandArgs<E extends AdminCommand> = Parameters<AdminClientEvents[E]> extends [...infer A, Ack] ? A : never;

export interface ParticipantServerEvents {
  'participant:state': (view: ParticipantView) => void;
}

export interface ParticipantClientEvents {
  'nominations:submit': (nominations: Record<number, number>, ack: Ack) => void;
  'final:vote': (categoryId: number, nomineeId: number, ack: Ack) => void;
}
