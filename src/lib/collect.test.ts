import { describe, expect, it } from 'vitest';
import { backLink, collectable, inquiryHref, offersPrints } from './collect';
import type { PrintOffer } from './prints/offer';
import type { Artwork, OriginalStatus } from './artwork-map';

function art(slug: string, originalStatus: OriginalStatus, printOffers: PrintOffer[] = []): Artwork {
  return {
    slug,
    title: slug,
    medium: 'oil-painting',
    materials: null,
    year: null,
    dimensions: null,
    description: null,
    images: [],
    originalStatus,
    auctionUrl: null,
    printOffers,
    series: null,
    seriesPosition: null,
    haloSetting: 'auto',
    halo: false,
  };
}

const print: PrintOffer = { format: 'large', size: { widthCm: 80, heightCm: 100 }, sizeLabel: '80 × 100 cm', priceCents: 10000 };

describe('collectable', () => {
  it('keeps available and sold originals, in order, so sold pieces stay listed for prints', () => {
    const works = [art('a', 'available'), art('b', 'sold'), art('c', 'notForSale')];
    expect(collectable(works).map((w) => w.slug)).toEqual(['a', 'b']);
  });

  it('keeps a not-for-sale original that has print offers', () => {
    expect(collectable([art('c', 'notForSale', [print])]).map((w) => w.slug)).toEqual(['c']);
  });
});

describe('offersPrints', () => {
  it('offers prints of oil paintings only', () => {
    expect(offersPrints({ medium: 'oil-painting' })).toBe(true);
    for (const medium of ['mixed-media', 'sculpture', 'installation', 'tattoo'] as const) {
      expect(offersPrints({ medium })).toBe(false);
    }
  });
});

describe('backLink', () => {
  it('returns to Collect when the artwork was opened from Collect', () => {
    expect(backLink('?from=collect')).toEqual({ href: '/collect', label: 'Collect' });
  });

  it('returns to Portfolio otherwise', () => {
    expect(backLink('')).toEqual({ href: '/portfolio', label: 'Portfolio' });
    expect(backLink('?from=elsewhere')).toEqual({ href: '/portfolio', label: 'Portfolio' });
  });
});

describe('inquiryHref', () => {
  it('prefills the contact form with the interest and artwork title', () => {
    expect(inquiryHref('print', 'Violenta I')).toBe('/contact?interest=print&artwork=Violenta%20I');
  });
});
