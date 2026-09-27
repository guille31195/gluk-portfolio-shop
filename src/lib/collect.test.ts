import { describe, expect, it } from 'vitest';
import { backLink, collectable, inquiryHref } from './collect';
import type { Artwork, OriginalStatus, PrintOption } from './artwork-map';

function art(slug: string, originalStatus: OriginalStatus, printOptions: PrintOption[] = []): Artwork {
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
    printOptions,
    series: null,
    seriesPosition: null,
    haloSetting: 'auto',
    halo: false,
  };
}

const print: PrintOption = { size: 'A3', price: 100, stripePriceId: 'price_x', soldOut: false };

describe('collectable', () => {
  it('keeps available and sold originals, in order, so sold pieces stay listed for prints', () => {
    const works = [art('a', 'available'), art('b', 'sold'), art('c', 'notForSale')];
    expect(collectable(works).map((w) => w.slug)).toEqual(['a', 'b']);
  });

  it('keeps a not-for-sale original that has print options', () => {
    expect(collectable([art('c', 'notForSale', [print])]).map((w) => w.slug)).toEqual(['c']);
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
