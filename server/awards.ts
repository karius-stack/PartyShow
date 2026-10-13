import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { completedVoters, countVotes, pickFinalists, pickWinners } from '../shared/awards.ts';
import type { AwardCategory, AwardsState, Participant, ParticipantView } from '../shared/types.ts';
import * as adb from './awardsDb.ts';
import { setSortOrder, transaction, UPLOAD_DIR } from './db.ts';
import { ShowError } from './errors.ts';
import { ImageQueue, imageAiEnabled, stylizePortrait } from './imageAi.ts';
import { cleanName, move } from './util.ts';

const MAX_CATEGORY_LENGTH = 60;

export function isValidDeviceId(deviceId: unknown): deviceId is string {
  return typeof deviceId === 'string' && /^[\w-]{8,100}$/.test(deviceId);
}

function cleanTitle(title: unknown): string {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) throw new ShowError('Nominasjonen må ha et navn');
  if (trimmed.length > MAX_CATEGORY_LENGTH) throw new ShowError(`Navnet kan være maks ${MAX_CATEGORY_LENGTH} tegn`);
  return trimmed;
}

function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Kåringsmodusen: deltakere registrerer seg fra mobilen, nominerer hverandre,
 * og stemmer fram vinneren blant finalistene i hver nominasjon.
 */
export class AwardsController {
  private listeners = new Set<() => void>();
  private images = new ImageQueue((id) => this.processImage(id));

  constructor(readonly showId: number) {
    // Bilder som var under behandling da serveren stoppet, prøves på nytt.
    for (const p of adb.listParticipants(showId)) {
      if (p.imageStatus === 'pending') this.queueImage(p.id);
    }
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
  }

  private changed() {
    for (const listener of this.listeners) listener();
  }

  private findParticipant(id: number): Participant {
    const participant = adb.listParticipants(this.showId).find((p) => p.id === id);
    if (!participant) throw new ShowError('Fant ikke deltakeren');
    return participant;
  }

  private findCategory(id: number): AwardCategory {
    const category = adb.listCategories(this.showId).find((c) => c.id === id);
    if (!category) throw new ShowError('Fant ikke nominasjonen');
    return category;
  }

  private requireMe(deviceId: string): Participant {
    const me = adb.findParticipantByDevice(this.showId, deviceId);
    if (!me) throw new ShowError('Du er ikke registrert');
    return me;
  }

  // --- Visning ---

  adminState(): AwardsState {
    const state = adb.getAwardsState(this.showId);
    const categories = adb.listCategories(this.showId);
    const nominations = adb.listVotes(this.showId, 'nomination_votes');
    const finals = adb.listVotes(this.showId, 'final_votes');
    return {
      ...state,
      participants: adb.listParticipants(this.showId),
      categories,
      nominatedIds: completedVoters(nominations, categories.map((c) => c.id)),
      finalVoterIds: finals.filter((v) => v.categoryId === state.currentCategoryId).map((v) => v.voterId),
      nominationCounts: countVotes(nominations),
      finalCounts: countVotes(finals),
    };
  }

  /** Storskjermen får ikke se stemmetall – bare fremdrift, finalister og vinnere. */
  publicState(): AwardsState {
    return { ...this.adminState(), nominationCounts: {}, finalCounts: {} };
  }

  participantView(deviceId: string): Omit<ParticipantView, 'show'> {
    const state = adb.getAwardsState(this.showId);
    const participants = adb.listParticipants(this.showId);
    const categories = adb.listCategories(this.showId);
    const me = adb.findParticipantByDevice(this.showId, deviceId);

    const myNominations: Record<number, number> = {};
    if (me) {
      for (const vote of adb.listVotes(this.showId, 'nomination_votes')) {
        if (vote.voterId === me.id) myNominations[vote.categoryId] = vote.nomineeId;
      }
    }

    let current: ParticipantView['current'] = null;
    const category = categories.find((c) => c.id === state.currentCategoryId);
    if (state.phase === 'ceremony' && category && state.step) {
      const myVote = me
        ? (adb.listVotes(this.showId, 'final_votes').find((v) => v.categoryId === category.id && v.voterId === me.id)
            ?.nomineeId ?? null)
        : null;
      current = {
        categoryId: category.id,
        title: category.title,
        step: state.step,
        finalists: (category.finalistIds ?? [])
          .map((id) => participants.find((p) => p.id === id))
          .filter((p): p is Participant => p !== undefined),
        myVote,
        winnerIds: state.step === 'revealed' ? category.winnerIds : null,
      };
    }

    return {
      phase: state.phase,
      registrationOpen: state.phase === 'registration',
      me,
      participants,
      categories: categories.map((c) => ({ id: c.id, title: c.title })),
      myNominations,
      current,
    };
  }

  // --- Deltakere ---

  register(deviceId: unknown, name: unknown, originalUrl: string): number {
    if (!isValidDeviceId(deviceId)) throw new ShowError('Ugyldig enhet – last siden på nytt');
    const { phase } = adb.getAwardsState(this.showId);
    if (phase !== 'registration') throw new ShowError('Registreringen er stengt');
    const cleanedName = cleanName(name, 'Navn');
    if (adb.findParticipantByDevice(this.showId, deviceId)) throw new ShowError('Denne enheten er allerede registrert');

    const id = adb.addParticipant(this.showId, deviceId, cleanedName, originalUrl);
    this.queueImage(id);
    this.changed();
    return id;
  }

  renameParticipant(id: number, name: string) {
    if (!adb.renameParticipant(this.showId, id, cleanName(name, 'Navn'))) throw new ShowError('Fant ikke deltakeren');
    this.changed();
  }

  removeParticipant(id: number) {
    transaction(() => {
      if (!adb.removeParticipant(this.showId, id)) throw new ShowError('Fant ikke deltakeren');
      // Stemmene forsvinner via ON DELETE CASCADE; frosne finalister/vinnere ryddes her.
      for (const category of adb.listCategories(this.showId)) {
        const finalistIds = category.finalistIds?.filter((p) => p !== id) ?? null;
        const winnerIds = category.winnerIds?.filter((p) => p !== id) ?? null;
        if (finalistIds?.length !== category.finalistIds?.length || winnerIds?.length !== category.winnerIds?.length) {
          adb.setCategoryResult(category.id, finalistIds, winnerIds);
        }
      }
    });
    this.changed();
  }

  regenerateImage(id: number) {
    this.findParticipant(id);
    if (!imageAiEnabled()) throw new ShowError('OPENAI_API_KEY er ikke satt på serveren');
    this.queueImage(id);
    this.changed();
  }

  private queueImage(id: number) {
    const participant = this.findParticipant(id);
    if (!imageAiEnabled()) {
      adb.setParticipantImage(id, 'failed', participant.aiUrl);
      return;
    }
    adb.setParticipantImage(id, 'pending', participant.aiUrl);
    this.images.add(id);
  }

  private async processImage(id: number) {
    const participant = adb.listParticipants(this.showId).find((p) => p.id === id);
    if (!participant) return;
    try {
      const fileName = path.basename(participant.originalUrl);
      const result = await stylizePortrait(await readFile(path.join(UPLOAD_DIR, fileName)), fileName);
      const aiName = `${randomUUID()}.png`;
      await writeFile(path.join(UPLOAD_DIR, aiName), result);
      adb.setParticipantImage(id, 'ready', `/uploads/${aiName}`);
    } catch (error) {
      console.error(`AI-bilde feilet for «${participant.name}»:`, error);
      // Et tidligere vellykket AI-bilde beholdes.
      adb.setParticipantImage(id, 'failed', participant.aiUrl);
    }
    this.changed();
  }

  // --- Nominasjoner ---

  createCategory(title: string) {
    adb.createCategory(this.showId, cleanTitle(title));
    this.changed();
  }

  renameCategory(id: number, title: string) {
    if (!adb.renameCategory(this.showId, id, cleanTitle(title))) throw new ShowError('Fant ikke nominasjonen');
    this.changed();
  }

  deleteCategory(id: number) {
    transaction(() => {
      const state = adb.getAwardsState(this.showId);
      if (!adb.deleteCategory(this.showId, id)) throw new ShowError('Fant ikke nominasjonen');
      if (state.currentCategoryId === id) adb.saveAwardsState(this.showId, { ...state, currentCategoryId: null, step: null });
    });
    this.changed();
  }

  moveCategory(id: number, direction: -1 | 1) {
    setSortOrder('award_categories', move(adb.listCategories(this.showId), id, direction));
    this.changed();
  }

  // --- Flyt ---

  startNominating() {
    const state = adb.getAwardsState(this.showId);
    if (state.phase !== 'registration') throw new ShowError('Nomineringen er allerede startet');
    if (adb.listCategories(this.showId).length === 0) throw new ShowError('Opprett minst én nominasjon først');
    if (adb.listParticipants(this.showId).length < 2) throw new ShowError('Det må være minst to deltakere');
    adb.saveAwardsState(this.showId, { phase: 'nominating', currentCategoryId: null, step: null });
    this.changed();
  }

  startCeremony() {
    const state = adb.getAwardsState(this.showId);
    if (state.phase !== 'nominating') throw new ShowError('Start nomineringen først');
    adb.saveAwardsState(this.showId, { phase: 'ceremony', currentCategoryId: null, step: null });
    this.changed();
  }

  /** Viser en nominasjon i seremonien. Finalistene beregnes og fryses første gang. */
  openCategory(id: number) {
    transaction(() => {
      const state = adb.getAwardsState(this.showId);
      if (state.phase !== 'ceremony' && state.phase !== 'finished') throw new ShowError('Kåringen er ikke startet');
      const category = this.findCategory(id);
      if (category.winnerIds) {
        adb.saveAwardsState(this.showId, { phase: 'ceremony', currentCategoryId: id, step: 'revealed' });
        return;
      }
      const finalistIds =
        category.finalistIds ?? pickFinalists(countVotes(adb.listVotes(this.showId, 'nomination_votes'))[id] ?? {});
      if (finalistIds.length === 0) throw new ShowError(`Ingen er nominert i «${category.title}»`);
      adb.setCategoryResult(id, finalistIds, null);
      adb.saveAwardsState(this.showId, { phase: 'ceremony', currentCategoryId: id, step: 'voting' });
    });
    this.changed();
  }

  private currentCategory(): AwardCategory {
    const state = adb.getAwardsState(this.showId);
    if (state.phase !== 'ceremony' || state.currentCategoryId === null) throw new ShowError('Ingen nominasjon er åpen');
    return this.findCategory(state.currentCategoryId);
  }

  revealWinner() {
    transaction(() => {
      const category = this.currentCategory();
      if (adb.getAwardsState(this.showId).step !== 'voting') throw new ShowError('Vinneren er allerede vist');
      const finalistIds = category.finalistIds ?? [];
      const counts = countVotes(adb.listVotes(this.showId, 'final_votes'))[category.id] ?? {};
      adb.setCategoryResult(category.id, finalistIds, pickWinners(counts, finalistIds));
      adb.saveAwardsState(this.showId, { phase: 'ceremony', currentCategoryId: category.id, step: 'revealed' });
    });
    this.changed();
  }

  restartVoting() {
    transaction(() => {
      const category = this.currentCategory();
      adb.clearVotes(this.showId, 'final_votes', category.id);
      adb.setCategoryResult(category.id, category.finalistIds, null);
      adb.saveAwardsState(this.showId, { phase: 'ceremony', currentCategoryId: category.id, step: 'voting' });
    });
    this.changed();
  }

  finish() {
    if (adb.getAwardsState(this.showId).phase !== 'ceremony') throw new ShowError('Kåringen er ikke startet');
    adb.saveAwardsState(this.showId, { phase: 'finished', currentCategoryId: null, step: null });
    this.changed();
  }

  /** Tilbake til en tidligere fase. Finalister, vinnere og finalestemmer nullstilles; nominasjonene beholdes. */
  goBack(phase: 'registration' | 'nominating') {
    if (phase !== 'registration' && phase !== 'nominating') throw new ShowError('Ukjent fase');
    transaction(() => {
      adb.clearCategoryResults(this.showId);
      adb.clearVotes(this.showId, 'final_votes');
      adb.saveAwardsState(this.showId, { phase, currentCategoryId: null, step: null });
    });
    this.changed();
  }

  reset(options: { removeParticipants: boolean; removeCategories: boolean }) {
    transaction(() => {
      adb.clearVotes(this.showId, 'nomination_votes');
      adb.clearVotes(this.showId, 'final_votes');
      adb.clearCategoryResults(this.showId);
      if (options.removeParticipants) adb.removeAllParticipants(this.showId);
      if (options.removeCategories) adb.removeAllCategories(this.showId);
      adb.saveAwardsState(this.showId, { phase: 'registration', currentCategoryId: null, step: null });
    });
    this.changed();
  }

  // --- Stemmer fra mobilen ---

  submitNominations(deviceId: string, nominations: unknown) {
    if (adb.getAwardsState(this.showId).phase !== 'nominating') throw new ShowError('Nomineringen er ikke åpen');
    const me = this.requireMe(deviceId);
    if (typeof nominations !== 'object' || nominations === null) throw new ShowError('Ugyldige nominasjoner');
    const participantIds = new Set(adb.listParticipants(this.showId).map((p) => p.id));
    const categories = adb.listCategories(this.showId);
    const chosen = nominations as Record<string, unknown>;

    transaction(() => {
      for (const category of categories) {
        const nomineeId = chosen[category.id];
        if (!isId(nomineeId)) throw new ShowError(`Velg noen i «${category.title}»`);
        if (nomineeId === me.id) throw new ShowError('Du kan ikke nominere deg selv');
        if (!participantIds.has(nomineeId)) throw new ShowError('Fant ikke personen du nominerte – prøv igjen');
        adb.setVote('nomination_votes', category.id, me.id, nomineeId);
      }
    });
    this.changed();
  }

  castFinalVote(deviceId: string, categoryId: unknown, nomineeId: unknown) {
    const category = this.currentCategory();
    if (adb.getAwardsState(this.showId).step !== 'voting') throw new ShowError('Avstemningen er stengt');
    if (categoryId !== category.id) throw new ShowError('Denne avstemningen er over');
    const me = this.requireMe(deviceId);
    if (!isId(nomineeId) || !(category.finalistIds ?? []).includes(nomineeId)) throw new ShowError('Velg en av finalistene');
    if (nomineeId === me.id) throw new ShowError('Du kan ikke stemme på deg selv');
    adb.setVote('final_votes', category.id, me.id, nomineeId);
    this.changed();
  }
}
