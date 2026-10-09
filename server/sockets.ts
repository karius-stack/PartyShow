import type { Namespace, Server, Socket } from 'socket.io';
import type {
  Ack,
  AdminClientEvents,
  AdminCommand,
  CommandArgs,
  ScreenClientEvents,
  ServerToClientEvents,
} from '../shared/types.ts';
import { ShowError, type ShowController } from './show.ts';

export function isValidPin(pin: unknown): boolean {
  const expected = process.env.ADMIN_PIN;
  return !expected || pin === expected;
}

type AdminSocket = Socket<AdminClientEvents, ServerToClientEvents>;

/** Kobler en admin-kommando til kontrolleren og svarer med ok/feil via ack. */
function command<E extends AdminCommand>(socket: AdminSocket, event: E, run: (...args: CommandArgs<E>) => void) {
  socket.on(event, ((...args: unknown[]) => {
    const ack = args.pop();
    const reply: Ack = typeof ack === 'function' ? (ack as Ack) : () => {};
    try {
      (run as (...a: unknown[]) => void)(...args);
      reply({ ok: true });
    } catch (error) {
      if (!(error instanceof ShowError)) console.error(`Feil i ${event}:`, error);
      reply({ ok: false, error: error instanceof Error ? error.message : 'Ukjent feil' });
    }
  }) as never);
}

export function registerSockets(io: Server, show: ShowController) {
  const screen = io.of('/') as unknown as Namespace<ScreenClientEvents, ServerToClientEvents>;
  const admin = io.of('/admin') as unknown as Namespace<AdminClientEvents, ServerToClientEvents>;

  admin.use((socket, next) => {
    if (isValidPin(socket.handshake.auth?.pin)) next();
    else next(new Error('Feil PIN-kode'));
  });

  show.onChange(() => {
    screen.emit('state', show.publicState());
    admin.emit('state', show.adminState());
  });

  screen.on('connection', (socket) => {
    socket.on('clock:ping', (ack) => ack(Date.now()));
    socket.emit('state', show.publicState());
  });

  admin.on('connection', (socket) => {
    socket.on('clock:ping', (ack) => ack(Date.now()));
    socket.emit('state', show.adminState());

    command(socket, 'team:add', (name) => show.addTeam(name));
    command(socket, 'team:rename', (id, name) => show.renameTeam(id, name));
    command(socket, 'team:remove', (id) => show.removeTeam(id));
    command(socket, 'team:move', (id, direction) => show.moveTeam(id, direction));

    command(socket, 'game:create', (input) => show.createGame(input));
    command(socket, 'game:update', (id, input) => show.updateGame(id, input));
    command(socket, 'game:delete', (id) => show.deleteGame(id));
    command(socket, 'game:move', (id, direction) => show.moveGame(id, direction));

    command(socket, 'show:startNextGame', () => show.startNextGame());
    command(socket, 'show:showRoundResults', () => show.showRoundResults());
    command(socket, 'show:showStandings', () => show.showStandings());
    command(socket, 'show:goTo', (phase, gameId) => show.goTo(phase, gameId));
    command(socket, 'show:reset', (options) => show.reset(options));
    command(socket, 'show:update', (input) => show.updateShow(input));

    command(socket, 'score:set', (gameId, teamId, points) => show.setScore(gameId, teamId, points));

    command(socket, 'timer:start', () => show.startTimer());
    command(socket, 'timer:pause', () => show.pauseTimer());
    command(socket, 'timer:reset', () => show.resetTimer());
  });
}
