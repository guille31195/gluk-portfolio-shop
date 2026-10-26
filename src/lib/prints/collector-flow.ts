import { formatPrice } from '../../data/format-price';
import type { CollectorView } from './order';
import { sizeLabel } from './print-sizes';
import { REGION_NAMES } from './shipping';

export type OrderResponse = { status: number; body: unknown };
export type FlowState =
  | { kind: 'confirming' }
  | { kind: 'order'; order: CollectorView }
  | { kind: 'not-found' }
  | { kind: 'error' };

export type FlowDeps = {
  fetchOrder: (token: string) => Promise<OrderResponse>;
  wait: (ms: number) => Promise<void>;
  now: () => number;
  onConfirming: () => void;
  signal?: AbortSignal;
};

export const POLL_MS = 3000;
export const GIVE_UP_MS = 60_000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,}$/;

// The webhook may not have created the order yet, so 404 means "still
// confirming" until the 60 s window closes. Null when aborted.
export async function resolveOrder(token: string | null, deps: FlowDeps): Promise<FlowState | null> {
  if (!token || !TOKEN_PATTERN.test(token)) return { kind: 'not-found' };
  const started = deps.now();
  let announced = false;
  for (;;) {
    let res: OrderResponse;
    try {
      res = await deps.fetchOrder(token);
    } catch {
      return deps.signal?.aborted ? null : { kind: 'error' };
    }
    if (deps.signal?.aborted) return null;
    if (res.status === 200) return { kind: 'order', order: res.body as CollectorView };
    if (res.status === 400) return { kind: 'not-found' };
    if (res.status !== 404) return { kind: 'error' };
    if (deps.now() - started >= GIVE_UP_MS) return { kind: 'not-found' };
    if (!announced) {
      announced = true;
      deps.onConfirming();
    }
    await deps.wait(POLL_MS);
    if (deps.signal?.aborted) return null;
  }
}

export type OrderDescription = {
  date: string;
  edition: string;
  title: string;
  format: string;
  status: 'Paid' | 'Shipped';
  price: string;
  shipping: string;
  shipTo: string;
  collector: string;
  tracking: { number: string; url: string | null } | null;
  shippedOn: string | null;
};

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames('en', { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const safeUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

export function describeOrder(o: CollectorView): OrderDescription {
  const shipped = o.status === 'shipped';
  const carrier = o.carrier || 'DHL Express';
  return {
    date: longDate(o.createdAt),
    edition: `${o.editionNumber} / ${o.editionSize}`,
    title: o.artworkTitle,
    format: `${o.format === 'large' ? 'Large' : 'Small'} · ${sizeLabel(o)}`,
    status: shipped ? 'Shipped' : 'Paid',
    price: `${formatPrice(o.priceCents)} USD`,
    shipping: `${carrier} · ${formatPrice(o.shippingCents)} · ${REGION_NAMES[o.region]}`,
    shipTo: `${o.city}, ${countryName(o.country)}`,
    collector: o.name,
    tracking: shipped && o.trackingNumber ? { number: o.trackingNumber, url: safeUrl(o.trackingUrl) } : null,
    shippedOn: shipped && o.shippedAt ? longDate(o.shippedAt) : null,
  };
}
