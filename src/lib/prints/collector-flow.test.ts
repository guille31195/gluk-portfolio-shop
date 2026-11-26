import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeOrder, resolveOrder, type FlowState, type OrderResponse } from './collector-flow';
import type { CollectorView } from './order';

const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

const VIEW: CollectorView = {
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
  createdAt: '2026-10-26T12:00:00.000Z',
  shippedAt: null,
  carrier: null,
  trackingNumber: null,
  trackingUrl: null,
  name: 'Ana Collector',
  city: 'Madrid',
  country: 'ES',
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function run(responses: Array<OrderResponse | Error>, token: string | null = TOKEN) {
  const fetchOrder = vi.fn(async () => {
    const next = responses.length > 1 ? responses.shift()! : responses[0];
    if (next instanceof Error) throw next;
    return next;
  });
  const seen: FlowState['kind'][] = [];
  const result = resolveOrder(token, { fetchOrder, wait, now: () => Date.now(), onConfirming: () => seen.push('confirming') });
  return { result, fetchOrder, seen };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('resolveOrder', () => {
  it('shows the order at once on 200', async () => {
    const { result, fetchOrder } = run([{ status: 200, body: VIEW }]);
    expect(await result).toEqual({ kind: 'order', order: VIEW });
    expect(fetchOrder).toHaveBeenCalledTimes(1);
  });

  it('keeps confirming through 404s, then shows the order', async () => {
    const { result, fetchOrder, seen } = run([
      { status: 404, body: null },
      { status: 404, body: null },
      { status: 200, body: VIEW },
    ]);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await result).toEqual({ kind: 'order', order: VIEW });
    expect(fetchOrder).toHaveBeenCalledTimes(3);
    expect(seen).toEqual(['confirming']);
  });

  it('gives up with not-found after 60 s of 404', async () => {
    const { result, fetchOrder } = run([{ status: 404, body: null }]);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(fetchOrder).toHaveBeenCalledTimes(20);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await result).toEqual({ kind: 'not-found' });
    expect(fetchOrder).toHaveBeenCalledTimes(21);
  });

  it('answers not-found at once on 400', async () => {
    const { result, fetchOrder } = run([{ status: 400, body: null }]);
    expect(await result).toEqual({ kind: 'not-found' });
    expect(fetchOrder).toHaveBeenCalledTimes(1);
  });

  it.each([null, '', 'short', '../x'])('answers not-found without a request for token %j', async (token) => {
    const { result, fetchOrder } = run([{ status: 200, body: VIEW }], token);
    expect(await result).toEqual({ kind: 'not-found' });
    expect(fetchOrder).not.toHaveBeenCalled();
  });

  it('answers error on 500 and on a network failure', async () => {
    expect(await run([{ status: 500, body: null }]).result).toEqual({ kind: 'error' });
    expect(await run([new Error('offline')]).result).toEqual({ kind: 'error' });
  });

  it('stops quietly when aborted', async () => {
    const ctl = new AbortController();
    const fetchOrder = vi.fn(async () => ({ status: 404, body: null }));
    const result = resolveOrder(TOKEN, { fetchOrder, wait, now: () => Date.now(), onConfirming: () => {}, signal: ctl.signal });
    await vi.advanceTimersByTimeAsync(3000);
    ctl.abort();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await result).toBeNull();
    expect(fetchOrder).toHaveBeenCalledTimes(2);
  });
});

describe('describeOrder', () => {
  it('describes a paid order', () => {
    expect(describeOrder(VIEW)).toEqual({
      date: '26 October 2026',
      edition: '12 / 50',
      title: 'La Espera',
      format: 'Large · 80 × 100 cm',
      status: 'Paid',
      price: '$450.00 USD',
      shipping: 'DHL Express · $60.00 · Europe & UK',
      shipTo: 'Madrid, Spain',
      collector: 'Ana Collector',
      tracking: null,
      shippedOn: null,
    });
  });

  it('adds carrier, tracking and ship date once shipped', () => {
    const d = describeOrder({
      ...VIEW,
      status: 'shipped',
      shippedAt: '2026-10-28T09:00:00.000Z',
      carrier: 'FedEx',
      trackingNumber: '123',
      trackingUrl: 'https://t.example.test/123',
    });
    expect(d).toMatchObject({
      status: 'Shipped',
      shippedOn: '28 October 2026',
      tracking: { number: '123', url: 'https://t.example.test/123' },
      shipping: 'FedEx · $60.00 · Europe & UK',
    });
  });

  it('keeps only http(s) tracking links', () => {
    const d = describeOrder({ ...VIEW, status: 'shipped', trackingNumber: '1', trackingUrl: 'javascript:alert(1)' });
    expect(d.tracking).toEqual({ number: '1', url: null });
  });
});
