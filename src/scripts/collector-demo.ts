// Dev-only fixtures for visual checks; only imported behind import.meta.env.DEV.
import type { CollectorView } from '../lib/prints/order';

const PAID: CollectorView = {
  status: 'paid',
  artworkSlug: 'motopirueta-4',
  artworkTitle: 'Motopirueta 4',
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
  name: 'Sample Collector',
  city: 'Madrid',
  country: 'ES',
};

export const DEMO_ORDERS: Record<string, CollectorView> = {
  paid: PAID,
  shipped: {
    ...PAID,
    status: 'shipped',
    shippedAt: '2026-10-28T09:00:00.000Z',
    carrier: 'DHL Express',
    trackingNumber: '0000 000 000',
    trackingUrl: 'https://example.test/track',
  },
};
