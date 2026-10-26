import { describe, expect, it } from 'vitest';
import { handleStock } from '../functions/stock';
import type { PrintableArtwork } from '../lib/artworks';
import { counterId } from '../../src/lib/prints/edition';
import { createFakeStore } from '../../src/lib/prints/edition.fake';

const NOW = new Date('2026-10-26T12:00:00.000Z');

const PIECE: PrintableArtwork = {
  slug: 'la-espera',
  title: 'La Espera',
  year: 2024,
  medium: 'Oil on canvas',
  dimensions: '120 x 150 cm',
  printPriceLarge: 450,
  printPriceSmall: null,
};

function deps() {
  const live = new Date(NOW.getTime() + 10 * 60_000).toISOString();
  const expired = new Date(NOW.getTime() - 60_000).toISOString();
  const store = createFakeStore([
    {
      id: counterId('la-espera', 'large'),
      rev: 'r1',
      sold: 3,
      reservations: [
        { reservationId: 'a', expiresAt: live },
        { reservationId: 'b', expiresAt: expired },
      ],
    },
  ]);
  return { readArtwork: async (slug: string) => (slug === PIECE.slug ? PIECE : null), store, now: () => NOW };
}

describe('handleStock', () => {
  it('counts sold and live reservations, null for a format with no offer', async () => {
    expect(await handleStock('la-espera', deps())).toEqual({ status: 200, body: { large: 46, small: null } });
  });

  it('answers null for both formats of an unknown piece', async () => {
    expect(await handleStock('no-such-piece', deps())).toEqual({ status: 200, body: { large: null, small: null } });
  });

  it.each([null, '', 'La-Espera', '../x', 'a b'])('rejects malformed slug %j', async (slug) => {
    expect(await handleStock(slug, deps())).toEqual({ status: 400, body: { error: 'invalid' } });
  });
});
