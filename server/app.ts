import type { AppState, ModeId, ParticipantView } from '../shared/types.ts';
import { AwardsController } from './awards.ts';
import * as db from './db.ts';
import { ShowError } from './errors.ts';
import { GameshowController } from './gameshow.ts';
import { cleanName } from './util.ts';

const MODES: (ModeId | null)[] = [null, 'gameshow', 'awards'];

/**
 * Samler modusene. Hver modus har egen tilstand i databasen, så man kan bytte
 * hva storskjermen viser uten å miste progresjon. Aktiv modus lagres også.
 */
export class AppController {
  readonly showId = db.getOrCreateActiveShow().id;
  readonly gameshow = new GameshowController(this.showId);
  readonly awards = new AwardsController(this.showId);
  private listeners = new Set<() => void>();

  constructor() {
    this.gameshow.onChange(() => this.changed());
    this.awards.onChange(() => this.changed());
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
  }

  private changed() {
    for (const listener of this.listeners) listener();
  }

  adminState(): AppState {
    return {
      show: db.getOrCreateActiveShow(),
      activeMode: db.getActiveMode(this.showId),
      gameshow: this.gameshow.adminState(),
      awards: this.awards.adminState(),
    };
  }

  publicState(): AppState {
    return {
      show: db.getOrCreateActiveShow(),
      activeMode: db.getActiveMode(this.showId),
      gameshow: this.gameshow.publicState(),
      awards: this.awards.publicState(),
    };
  }

  participantView(deviceId: string): ParticipantView {
    return { show: db.getOrCreateActiveShow(), ...this.awards.participantView(deviceId) };
  }

  setMode(mode: ModeId | null) {
    if (!MODES.includes(mode)) throw new ShowError('Ukjent modus');
    db.setActiveMode(this.showId, mode);
    this.changed();
  }

  updateShow(input: { name: string; themeId: string }) {
    db.updateShow(this.showId, cleanName(input.name, 'Shownavn'), cleanName(input.themeId, 'Tema'));
    this.changed();
  }
}
