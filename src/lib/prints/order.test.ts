import { describe, expect, it } from 'vitest';
import { newToken, orderId, signKey, toCollectorView, verifyKey, type Order } from './order';

const SECRET = 'test-secret';

const ORDER: Order = {
  _id: 'order-cs_test_123',
  _type: 'order',
  token: 'tok_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
  status: 'paid',
  artworkSlug: 'la-espera',
  artworkTitle: 'La Espera',
  year: 2024,
  medium: 'Oil on canvas',
  format: 'large',
  widthCm: 80,
  heightCm: 100,
  editionNumber: 12,
  editionSize: 50,
  priceCents: 45000,
  shippingCents: 6000,
  region: 'EU_UK',
  stripeSessionId: 'cs_test_123',
  customer: {
    name: 'Ana Collector',
    email: 'ana.collector@example.test',
    phone: '+34 600 111 222',
    address: {
      line1: '17 Calle Streetname',
      line2: 'Piso 3B',
      city: 'Madrid',
      state: 'Madrid',
      postalCode: '28013',
      country: 'ES',
    },
  },
  createdAt: '2026-10-26T12:00:00.000Z',
  shippedAt: null,
  carrier: null,
  trackingNumber: null,
  trackingUrl: null,
};

describe('orderId', () => {
  it('prefixes the Stripe session id', () => {
    expect(orderId('cs_test_123')).toBe('order-cs_test_123');
  });
});

describe('newToken', () => {
  it('is base64url with at least 43 characters', () => {
    const token = newToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('is unique across 1000 calls', () => {
    const tokens = new Set(Array.from({ length: 1000 }, newToken));
    expect(tokens.size).toBe(1000);
  });
});

describe('toCollectorView', () => {
  it('leaves out street, postal code, phone and email', () => {
    const json = JSON.stringify(toCollectorView(ORDER));
    for (const secret of ['17 Calle Streetname', 'Piso 3B', '28013', '+34 600 111 222', 'ana.collector@example.test']) {
      expect(json).not.toContain(secret);
    }
  });

  it('keeps city and country and the order facts', () => {
    const view = toCollectorView(ORDER);
    expect(view).toMatchObject({ city: 'Madrid', country: 'ES', editionNumber: 12, editionSize: 50, status: 'paid' });
  });
});

describe('signKey / verifyKey', () => {
  const key = signKey(ORDER._id, SECRET);

  it('accepts the right key', () => {
    expect(verifyKey(ORDER._id, key, SECRET)).toBe(true);
  });

  it('rejects a tampered id', () => {
    expect(verifyKey('order-cs_test_124', key, SECRET)).toBe(false);
  });

  it('rejects a tampered or truncated key', () => {
    const flipped = (key[0] === 'A' ? 'B' : 'A') + key.slice(1);
    expect(verifyKey(ORDER._id, flipped, SECRET)).toBe(false);
    expect(verifyKey(ORDER._id, key.slice(0, -1), SECRET)).toBe(false);
    expect(verifyKey(ORDER._id, '', SECRET)).toBe(false);
  });

  it('rejects a key signed with another secret', () => {
    expect(verifyKey(ORDER._id, signKey(ORDER._id, 'other'), SECRET)).toBe(false);
  });
});
