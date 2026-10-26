import { describe, expect, it, vi } from 'vitest';
import type { SanityClient } from '@sanity/client';
import { handleOrder, sanityOrderReader, ORDER_QUERY, type OrderReader } from '../functions/order';
import type { Order } from '../../src/lib/prints/order';

const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

const ORDER: Order = {
  _id: 'order-cs_test_123',
  _type: 'order',
  token: TOKEN,
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

const SHIPPED: Order = {
  ...ORDER,
  status: 'shipped',
  shippedAt: '2026-10-28T09:00:00.000Z',
  carrier: 'DHL Express',
  trackingNumber: '0000000000',
  trackingUrl: 'https://tracking.example.test/0000000000',
};

function reader(order: Order | null = ORDER) {
  return vi.fn<OrderReader>(async (token) => (order && token === order.token ? order : null));
}

describe('handleOrder', () => {
  it('returns the collector view without private fields', async () => {
    const reply = await handleOrder(TOKEN, reader());
    expect(reply.status).toBe(200);
    const text = JSON.stringify(reply.body);
    for (const secret of ['Calle Streetname', 'Piso 3B', '28013', '+34 600', 'ana.collector@', TOKEN, 'cs_test_123', 'order-cs_']) {
      expect(text).not.toContain(secret);
    }
    expect(reply.body).toMatchObject({ artworkTitle: 'La Espera', editionNumber: 12, name: 'Ana Collector', city: 'Madrid', country: 'ES' });
  });

  it('exposes carrier and tracking URL once shipped', async () => {
    const reply = await handleOrder(TOKEN, reader(SHIPPED));
    expect(reply.body).toMatchObject({ status: 'shipped', carrier: 'DHL Express', trackingUrl: 'https://tracking.example.test/0000000000' });
  });

  it('answers 404 with no data for an unknown token', async () => {
    expect(await handleOrder('x'.repeat(43), reader())).toEqual({ status: 404, body: { error: 'not-found' } });
  });

  it('answers 404 for a void order', async () => {
    expect(await handleOrder(TOKEN, reader({ ...ORDER, status: 'void' }))).toEqual({ status: 404, body: { error: 'not-found' } });
  });

  it.each([null, '', '../x', 'short', `${'a'.repeat(42)}!`, `${'a'.repeat(43)} `])('rejects malformed token %j without a query', async (token) => {
    const read = reader();
    expect(await handleOrder(token, read)).toEqual({ status: 400, body: { error: 'invalid' } });
    expect(read).not.toHaveBeenCalled();
  });
});

describe('sanityOrderReader', () => {
  it('passes the token as a GROQ parameter', async () => {
    const fetch = vi.fn(async () => ORDER);
    const read = sanityOrderReader({ fetch } as unknown as SanityClient);
    expect(await read(TOKEN)).toBe(ORDER);
    expect(fetch).toHaveBeenCalledWith(ORDER_QUERY, { token: TOKEN });
    expect(ORDER_QUERY).toBe('*[_type=="order" && token==$token][0]');
  });
});

describe('order handler', () => {
  it('answers 405 to other methods and sets no-store and noindex headers', async () => {
    const { default: handler } = await import('../functions/order');
    const res = await handler(new Request('https://glukart.test/api/order?o=x', { method: 'POST' }));
    expect(res.status).toBe(405);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('answers 400 for a malformed token with the same headers', async () => {
    const { default: handler } = await import('../functions/order');
    const res = await handler(new Request('https://glukart.test/api/order?o=../x'));
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });
});
