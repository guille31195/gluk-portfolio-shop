import type { Format } from './print-sizes';

export const EDITION_SIZE = 50;
export const RESERVATION_MINUTES = 30;
const MAX_ATTEMPTS = 8;
const BACKOFF_BASE_MS = 20;

export type Reservation = { reservationId: string; expiresAt: string };
export type EditionCounter = { id: string; rev: string; sold: number; reservations: Reservation[] };
type OrderDoc = { _id: string; [k: string]: unknown };

export interface EditionStore {
  load(id: string): Promise<EditionCounter>;
  save(next: EditionCounter, ifRev: string, create?: OrderDoc): Promise<'ok' | 'conflict' | 'exists'>;
  exists(id: string): Promise<boolean>;
}

export type RetryOptions = { maxAttempts?: number; backoffMs?: number };

export type FinalizeResult =
  | { status: 'issued'; editionNumber: number }
  | { status: 'already-processed' }
  | { status: 'sold-out' };

export function counterId(slug: string, format: Format): string {
  return `edition-${slug}-${format}`;
}

const live = (reservations: Reservation[], now: Date) =>
  reservations.filter((r) => new Date(r.expiresAt).getTime() > now.getTime());

export function remaining(c: EditionCounter, now: Date): number {
  return Math.max(0, EDITION_SIZE - c.sold - live(c.reservations, now).length);
}

// Full-jitter exponential backoff so writers that collided don't collide again in lockstep.
async function backoff(attempt: number, baseMs: number) {
  if (baseMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, Math.random() * baseMs * 2 ** (attempt - 1)));
}

// One optimistic read-modify-write. `step` returns the result directly when there is
// nothing to save, or the next counter (plus an optional create) with the result to
// return on success.
type Step<T> = { done: T } | { next: EditionCounter; create?: OrderDoc; result: T; onExists?: T };

async function update<T>(
  store: EditionStore,
  id: string,
  step: (c: EditionCounter) => Step<T>,
  { maxAttempts = MAX_ATTEMPTS, backoffMs = BACKOFF_BASE_MS }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const current = await store.load(id);
    const s = step(current);
    if ('done' in s) return s.done;
    const outcome = await store.save(s.next, current.rev, s.create);
    if (outcome === 'ok') return s.result;
    if (outcome === 'exists' && s.onExists !== undefined) return s.onExists;
    if (outcome === 'exists') throw new Error(`Edition ${id}: unexpected duplicate document`);
    if (attempt < maxAttempts) await backoff(attempt, backoffMs);
  }
  throw new Error(`Edition ${id}: gave up after ${maxAttempts} conflicting writes`);
}

export function reserveEdition(
  store: EditionStore,
  id: string,
  reservationId: string,
  now: Date,
  opts?: RetryOptions,
): Promise<'reserved' | 'sold-out'> {
  return update<'reserved' | 'sold-out'>(
    store,
    id,
    (c) => {
      const reservations = live(c.reservations, now);
      if (c.sold + reservations.length >= EDITION_SIZE) return { done: 'sold-out' };
      const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60_000).toISOString();
      return { next: { ...c, reservations: [...reservations, { reservationId, expiresAt }] }, result: 'reserved' };
    },
    opts,
  );
}

export function releaseReservation(store: EditionStore, id: string, reservationId: string): Promise<void> {
  return update<void>(store, id, (c) => {
    if (!c.reservations.some((r) => r.reservationId === reservationId)) return { done: undefined };
    const reservations = c.reservations.filter((r) => r.reservationId !== reservationId);
    return { next: { ...c, reservations }, result: undefined };
  });
}

// `order` must return the same _id for any edition number: the _id identifies the payment.
export async function finalizeEdition(
  store: EditionStore,
  id: string,
  reservationId: string,
  now: Date,
  order: (editionNumber: number) => OrderDoc,
  opts?: RetryOptions,
): Promise<FinalizeResult> {
  if (await store.exists(order(0)._id)) return { status: 'already-processed' };
  return update<FinalizeResult>(
    store,
    id,
    (c) => {
      if (c.sold >= EDITION_SIZE) return { done: { status: 'sold-out' } };
      const editionNumber = c.sold + 1;
      const reservations = live(c.reservations, now).filter((r) => r.reservationId !== reservationId);
      return {
        next: { ...c, sold: editionNumber, reservations },
        create: order(editionNumber),
        result: { status: 'issued', editionNumber },
        onExists: { status: 'already-processed' },
      };
    },
    opts,
  );
}
