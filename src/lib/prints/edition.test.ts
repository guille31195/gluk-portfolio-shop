import { describe, expect, it } from 'vitest';
import {
  EDITION_SIZE,
  counterId,
  finalizeEdition,
  releaseReservation,
  remaining,
  reserveEdition,
  type EditionCounter,
} from './edition';
import { createFakeStore } from './edition.fake';

const ID = counterId('la-espera', 'large');
const NOW = new Date('2026-10-26T12:00:00Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const order = (id: string) => (editionNumber: number) => ({ _id: id, _type: 'printOrder', editionNumber });

function counter(sold: number, reservations: EditionCounter['reservations'] = []): EditionCounter {
  return { id: ID, rev: 'r0', sold, reservations };
}

describe('counterId', () => {
  it('combines slug and format', () => {
    expect(counterId('la-espera', 'small')).toBe('edition-la-espera-small');
  });
});

describe('remaining', () => {
  it('subtracts sold and live reservations', () => {
    const c = counter(10, [{ reservationId: 'a', expiresAt: minutes(5).toISOString() }]);
    expect(remaining(c, NOW)).toBe(39);
  });

  it('ignores expired reservations', () => {
    const c = counter(10, [
      { reservationId: 'a', expiresAt: minutes(-1).toISOString() },
      { reservationId: 'b', expiresAt: NOW.toISOString() },
    ]);
    expect(remaining(c, NOW)).toBe(40);
  });

  it('never goes below zero', () => {
    const c = counter(50, [{ reservationId: 'a', expiresAt: minutes(5).toISOString() }]);
    expect(remaining(c, NOW)).toBe(0);
  });
});

describe('reserveEdition', () => {
  it('adds a reservation that expires in 30 minutes', async () => {
    const store = createFakeStore();
    expect(await reserveEdition(store, ID, 'a', NOW)).toBe('reserved');
    const c = await store.load(ID);
    expect(c.reservations).toEqual([{ reservationId: 'a', expiresAt: minutes(30).toISOString() }]);
  });

  it('is sold out when sold plus live reservations reach the edition size', async () => {
    const store = createFakeStore([counter(49, [{ reservationId: 'a', expiresAt: minutes(10).toISOString() }])]);
    expect(await reserveEdition(store, ID, 'b', NOW)).toBe('sold-out');
  });

  it('lets an expired reservation free capacity and drops it', async () => {
    const store = createFakeStore([counter(49, [{ reservationId: 'a', expiresAt: minutes(-1).toISOString() }])]);
    expect(await reserveEdition(store, ID, 'b', NOW)).toBe('reserved');
    const c = await store.load(ID);
    expect(c.reservations.map((r) => r.reservationId)).toEqual(['b']);
  });

  it('never oversells under 60 concurrent reservations', async () => {
    const store = createFakeStore();
    const results = await Promise.all(
      Array.from({ length: 60 }, (_, i) => reserveEdition(store, ID, `r${i}`, NOW)),
    );
    expect(results.filter((r) => r === 'reserved')).toHaveLength(EDITION_SIZE);
    expect(results.filter((r) => r === 'sold-out')).toHaveLength(10);
    expect((await store.load(ID)).reservations).toHaveLength(EDITION_SIZE);
  });
});

describe('releaseReservation', () => {
  it('removes the reservation and frees capacity', async () => {
    const store = createFakeStore();
    await reserveEdition(store, ID, 'a', NOW);
    await releaseReservation(store, ID, 'a');
    const c = await store.load(ID);
    expect(c.reservations).toEqual([]);
    expect(remaining(c, NOW)).toBe(EDITION_SIZE);
  });
});

describe('finalizeEdition', () => {
  it('issues numbers 1, 2, 3 in order and removes the reservation', async () => {
    const store = createFakeStore();
    for (const id of ['a', 'b', 'c']) await reserveEdition(store, ID, id, NOW);

    expect(await finalizeEdition(store, ID, 'a', NOW, order('order-a'))).toEqual({ status: 'issued', editionNumber: 1 });
    expect(await finalizeEdition(store, ID, 'b', NOW, order('order-b'))).toEqual({ status: 'issued', editionNumber: 2 });
    expect(await finalizeEdition(store, ID, 'c', NOW, order('order-c'))).toEqual({ status: 'issued', editionNumber: 3 });

    const c = await store.load(ID);
    expect(c.sold).toBe(3);
    expect(c.reservations).toEqual([]);
    expect(store.created.get('order-b')).toEqual({ _id: 'order-b', _type: 'printOrder', editionNumber: 2 });
  });

  it('returns already-processed for a repeated order id and counts it once', async () => {
    const store = createFakeStore();
    await reserveEdition(store, ID, 'a', NOW);
    await finalizeEdition(store, ID, 'a', NOW, order('order-a'));

    expect(await finalizeEdition(store, ID, 'a', NOW, order('order-a'))).toEqual({ status: 'already-processed' });
    expect((await store.load(ID)).sold).toBe(1);
    expect(store.created.size).toBe(1);
  });

  it('is sold out at 50 sold and creates no order', async () => {
    const store = createFakeStore([counter(50)]);
    expect(await finalizeEdition(store, ID, 'a', NOW, order('order-a'))).toEqual({ status: 'sold-out' });
    expect((await store.load(ID)).sold).toBe(50);
    expect(store.created.size).toBe(0);
  });

  it('honours a late payment whose reservation already expired', async () => {
    const store = createFakeStore();
    await reserveEdition(store, ID, 'a', NOW);
    const late = minutes(45);
    expect(await finalizeEdition(store, ID, 'a', late, order('order-a'))).toEqual({ status: 'issued', editionNumber: 1 });
    expect((await store.load(ID)).reservations).toEqual([]);
  });

  it('never reuses a number after a release', async () => {
    const store = createFakeStore();
    for (const id of ['a', 'b', 'c']) await reserveEdition(store, ID, id, NOW);
    await finalizeEdition(store, ID, 'a', NOW, order('order-a'));
    await releaseReservation(store, ID, 'b');

    expect(await finalizeEdition(store, ID, 'c', NOW, order('order-c'))).toEqual({ status: 'issued', editionNumber: 2 });
  });

  it('gives concurrent orders distinct consecutive numbers', async () => {
    const store = createFakeStore();
    const ids = Array.from({ length: 10 }, (_, i) => `r${i}`);
    for (const id of ids) await reserveEdition(store, ID, id, NOW);

    const results = await Promise.all(ids.map((id) => finalizeEdition(store, ID, id, NOW, order(`order-${id}`))));
    const numbers = results.map((r) => (r.status === 'issued' ? r.editionNumber : 0)).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect((await store.load(ID)).sold).toBe(10);
  });
});
