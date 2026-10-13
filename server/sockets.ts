import type { Namespace, Server, Socket } from 'socket.io';
import type {
  Ack,
  AdminClientEvents,
  AdminCommand,
  CommandArgs,
  ParticipantClientEvents,
  ParticipantServerEvents,
  ScreenClientEvents,
  ServerToClientEvents,
} from '../shared/types.ts';
import type { AppController } from './app.ts';
import { isValidDeviceId } from './awards.ts';
import { ShowError } from './errors.ts';

export function isValidPin(pin: unknown): boolean {
  const expected = process.env.ADMIN_PIN;
  return !expected || pin === expected;
}

type AdminSocket = Socket<AdminClientEvents, ServerToClientEvents>;
type ParticipantSocket = Socket<ParticipantClientEvents, ParticipantServerEvents, never, { deviceId: string }>;

/** Kjører `run` og svarer med ok/feil via ack. */
function respond(event: string, ack: unknown, run: () => void) {
  const reply: Ack = typeof ack === 'function' ? (ack as Ack) : () => {};
  try {
    run();
    reply({ ok: true });
  } catch (error) {
    if (!(error instanceof ShowError)) console.error(`Feil i ${event}:`, error);
    reply({ ok: false, error: error instanceof Error ? error.message : 'Ukjent feil' });
  }
}

/** Kobler en admin-kommando til kontrolleren og svarer med ok/feil via ack. */
function command<E extends AdminCommand>(socket: AdminSocket, event: E, run: (...args: CommandArgs<E>) => void) {
  socket.on(event, ((...args: unknown[]) => {
    const ack = args.pop();
    respond(event, ack, () => (run as (...a: unknown[]) => void)(...args));
  }) as never);
}

export function registerSockets(io: Server, app: AppController) {
  const screen = io.of('/') as unknown as Namespace<ScreenClientEvents, ServerToClientEvents>;
  const admin = io.of('/admin') as unknown as Namespace<AdminClientEvents, ServerToClientEvents>;
  const participants = io.of('/participant') as unknown as Namespace<
    ParticipantClientEvents,
    ParticipantServerEvents,
    never,
    { deviceId: string }
  >;

  admin.use((socket, next) => {
    if (isValidPin(socket.handshake.auth?.pin)) next();
    else next(new Error('Feil PIN-kode'));
  });

  participants.use((socket, next) => {
    const deviceId: unknown = socket.handshake.auth?.deviceId;
    if (!isValidDeviceId(deviceId)) {
      next(new Error('Ugyldig enhet'));
      return;
    }
    socket.data.deviceId = deviceId;
    next();
  });

  app.onChange(() => {
    screen.emit('state', app.publicState());
    admin.emit('state', app.adminState());
    // Hver mobil får sin egen versjon (hvem er jeg, hva har jeg stemt).
    for (const socket of participants.sockets.values()) {
      socket.emit('participant:state', app.participantView(socket.data.deviceId));
    }
  });

  screen.on('connection', (socket) => {
    socket.on('clock:ping', (ack) => ack(Date.now()));
    socket.emit('state', app.publicState());
  });

  participants.on('connection', (socket: ParticipantSocket) => {
    const { deviceId } = socket.data;
    socket.emit('participant:state', app.participantView(deviceId));
    socket.on('nominations:submit', (nominations, ack) =>
      respond('nominations:submit', ack, () => app.awards.submitNominations(deviceId, nominations)),
    );
    socket.on('final:vote', (categoryId, nomineeId, ack) =>
      respond('final:vote', ack, () => app.awards.castFinalVote(deviceId, categoryId, nomineeId)),
    );
  });

  admin.on('connection', (socket) => {
    const { gameshow, awards } = app;
    socket.on('clock:ping', (ack) => ack(Date.now()));
    socket.emit('state', app.adminState());

    command(socket, 'mode:set', (mode) => app.setMode(mode));
    command(socket, 'show:update', (input) => app.updateShow(input));

    command(socket, 'team:add', (name) => gameshow.addTeam(name));
    command(socket, 'team:rename', (id, name) => gameshow.renameTeam(id, name));
    command(socket, 'team:remove', (id) => gameshow.removeTeam(id));
    command(socket, 'team:move', (id, direction) => gameshow.moveTeam(id, direction));

    command(socket, 'game:create', (input) => gameshow.createGame(input));
    command(socket, 'game:update', (id, input) => gameshow.updateGame(id, input));
    command(socket, 'game:delete', (id) => gameshow.deleteGame(id));
    command(socket, 'game:move', (id, direction) => gameshow.moveGame(id, direction));

    command(socket, 'show:startNextGame', () => gameshow.startNextGame());
    command(socket, 'show:showRoundResults', () => gameshow.showRoundResults());
    command(socket, 'show:showStandings', () => gameshow.showStandings());
    command(socket, 'show:goTo', (phase, gameId) => gameshow.goTo(phase, gameId));
    command(socket, 'show:reset', (options) => gameshow.reset(options));

    command(socket, 'score:set', (gameId, teamId, points) => gameshow.setScore(gameId, teamId, points));

    command(socket, 'timer:start', () => gameshow.startTimer());
    command(socket, 'timer:pause', () => gameshow.pauseTimer());
    command(socket, 'timer:reset', () => gameshow.resetTimer());

    command(socket, 'participant:rename', (id, name) => awards.renameParticipant(id, name));
    command(socket, 'participant:remove', (id) => awards.removeParticipant(id));
    command(socket, 'participant:regenerateImage', (id) => awards.regenerateImage(id));

    command(socket, 'category:create', (title) => awards.createCategory(title));
    command(socket, 'category:rename', (id, title) => awards.renameCategory(id, title));
    command(socket, 'category:delete', (id) => awards.deleteCategory(id));
    command(socket, 'category:move', (id, direction) => awards.moveCategory(id, direction));

    command(socket, 'awards:startNominating', () => awards.startNominating());
    command(socket, 'awards:startCeremony', () => awards.startCeremony());
    command(socket, 'awards:openCategory', (id) => awards.openCategory(id));
    command(socket, 'awards:revealWinner', () => awards.revealWinner());
    command(socket, 'awards:restartVoting', () => awards.restartVoting());
    command(socket, 'awards:finish', () => awards.finish());
    command(socket, 'awards:goBack', (phase) => awards.goBack(phase));
    command(socket, 'awards:reset', (options) => awards.reset(options));
  });
}
