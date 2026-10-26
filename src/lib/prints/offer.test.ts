import { describe, expect, it } from 'vitest';
import { printOffers } from './offer';

const both = { dimensions: '120 × 150 cm', printPriceLarge: 180, printPriceSmall: 90 };

describe('printOffers', () => {
  it('offers both formats with labelled sizes and prices in cents', () => {
    expect(printOffers(both)).toEqual([
      { format: 'large', size: { widthCm: 80, heightCm: 100 }, sizeLabel: '80 × 100 cm', priceCents: 18000 },
      { format: 'small', size: { widthCm: 40, heightCm: 50 }, sizeLabel: '40 × 50 cm', priceCents: 9000 },
    ]);
  });

  it('offers only the priced format', () => {
    const offers = printOffers({ ...both, printPriceSmall: null });
    expect(offers.map((o) => o.format)).toEqual(['large']);
  });

  it('offers nothing when dimensions do not parse', () => {
    expect(printOffers({ ...both, dimensions: 'variable' })).toEqual([]);
    expect(printOffers({ ...both, dimensions: null })).toEqual([]);
  });

  it('offers nothing for zero dimensions', () => {
    expect(printOffers({ ...both, dimensions: '0 x 0 cm' })).toEqual([]);
    expect(printOffers({ ...both, dimensions: '0 x 50 cm' })).toEqual([]);
  });

  it('offers nothing when no prices are set', () => {
    expect(printOffers({ dimensions: '120 × 150 cm', printPriceLarge: null, printPriceSmall: null })).toEqual([]);
  });

  it('ignores prices below 1 or not finite', () => {
    expect(printOffers({ ...both, printPriceLarge: 0, printPriceSmall: Number.NaN })).toEqual([]);
    expect(printOffers({ ...both, printPriceLarge: 0.5, printPriceSmall: Infinity })).toEqual([]);
  });
});
