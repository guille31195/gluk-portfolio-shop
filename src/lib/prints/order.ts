import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { EDITION_SIZE } from './edition';
import type { Format } from './print-sizes';
import type { RegionId } from './shipping';

export type OrderStatus = 'paid' | 'shipped' | 'void';

export type Order = {
  _id: string;
  _type: 'order';
  token: string;
  status: OrderStatus;
  artworkSlug: string;
  artworkTitle: string;
  year: number | null;
  medium: string;
  format: Format;
  widthCm: number;
  heightCm: number;
  editionNumber: number;
  editionSize: typeof EDITION_SIZE;
  priceCents: number;
  shippingCents: number;
  region: RegionId;
  stripeSessionId: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    address: {
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      postalCode: string;
      country: string;
    };
  };
  createdAt: string;
  shippedAt: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  // Set once Guillermo's sale email has gone out; a redelivered event resends while null.
  ownerNotifiedAt: string | null;
};

// What the collector page may show: no street, postal code, phone or email.
export type CollectorView = Pick<
  Order,
  | 'status'
  | 'artworkSlug'
  | 'artworkTitle'
  | 'year'
  | 'medium'
  | 'format'
  | 'widthCm'
  | 'heightCm'
  | 'editionNumber'
  | 'editionSize'
  | 'priceCents'
  | 'shippingCents'
  | 'region'
  | 'createdAt'
  | 'shippedAt'
  | 'carrier'
  | 'trackingNumber'
  | 'trackingUrl'
> & { name: string; city: string; country: string };

export function orderId(sessionId: string): string {
  return `order-${sessionId}`;
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function toCollectorView(o: Order): CollectorView {
  return {
    status: o.status,
    artworkSlug: o.artworkSlug,
    artworkTitle: o.artworkTitle,
    year: o.year,
    medium: o.medium,
    format: o.format,
    widthCm: o.widthCm,
    heightCm: o.heightCm,
    editionNumber: o.editionNumber,
    editionSize: o.editionSize,
    priceCents: o.priceCents,
    shippingCents: o.shippingCents,
    region: o.region,
    createdAt: o.createdAt,
    shippedAt: o.shippedAt,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    name: o.customer.name,
    city: o.customer.address.city,
    country: o.customer.address.country,
  };
}

export function signKey(id: string, secret: string): string {
  return createHmac('sha256', secret).update(id).digest('base64url');
}

export function verifyKey(id: string, key: string | null | undefined, secret: string): boolean {
  if (typeof key !== 'string') return false;
  const expected = Buffer.from(signKey(id, secret));
  const given = Buffer.from(key);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
