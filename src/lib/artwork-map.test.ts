import { describe, it, expect } from 'vitest';
import { mapArtwork, mediumLabel, type RawArtwork } from './artwork-map';

const urlFor = (image: { asset: { _ref: string } }) => `https://cdn.sanity.io/images/p/d/${image.asset._ref}.jpg`;

function raw(overrides: Partial<RawArtwork> = {}): RawArtwork {
  return {
    slug: 'motopirueta-1',
    title: 'Motopirueta 1',
    medium: 'oil-painting',
    materials: null,
    year: null,
    dimensions: null,
    description: null,
    images: [{ asset: { _ref: 'a1', _type: 'reference' } }],
    originalStatus: null,
    availableAsOriginal: null,
    printOptions: null,
    series: null,
    seriesPosition: null,
    haloSetting: null,
    ...overrides,
  };
}

describe('mapArtwork', () => {
  it('fills safe defaults for every optional field', () => {
    expect(mapArtwork(raw(), urlFor)).toEqual({
      slug: 'motopirueta-1',
      title: 'Motopirueta 1',
      medium: 'oil-painting',
      materials: null,
      year: null,
      dimensions: null,
      description: null,
      images: ['https://cdn.sanity.io/images/p/d/a1.jpg'],
      originalStatus: 'notForSale',
      printOptions: [],
      series: null,
      seriesPosition: null,
      haloSetting: 'auto',
      halo: false,
    });
  });

  it('passes materials, year and dimensions through', () => {
    const result = mapArtwork(raw({ materials: 'Oil on canvas', year: 2024, dimensions: '120 × 100 cm' }), urlFor);
    expect(result.materials).toBe('Oil on canvas');
    expect(result.year).toBe(2024);
    expect(result.dimensions).toBe('120 × 100 cm');
  });

  it('maps the original status, falling back to the legacy checkbox', () => {
    expect(mapArtwork(raw({ originalStatus: 'available' }), urlFor).originalStatus).toBe('available');
    expect(mapArtwork(raw({ originalStatus: 'sold' }), urlFor).originalStatus).toBe('sold');
    expect(mapArtwork(raw({ originalStatus: 'whatever' }), urlFor).originalStatus).toBe('notForSale');
    // Old `availableAsOriginal: true` (set before the status field existed) still means available.
    expect(mapArtwork(raw({ availableAsOriginal: true }), urlFor).originalStatus).toBe('available');
    expect(mapArtwork(raw({ originalStatus: 'sold', availableAsOriginal: true }), urlFor).originalStatus).toBe('sold');
  });

  it('marks print sizes sold out only when flagged', () => {
    const result = mapArtwork(
      raw({
        printOptions: [
          { size: 'A3', price: 9000, stripePriceId: 'p1', soldOut: null },
          { size: 'A2', price: 14000, stripePriceId: 'p2', soldOut: true },
        ],
      }),
      urlFor
    );
    expect(result.printOptions.map((p) => p.soldOut)).toEqual([false, true]);
  });

  it('maps a series with defaults for missing series fields', () => {
    const result = mapArtwork(
      raw({ series: { slug: 'motopirueta', name: 'Motopirueta', order: null, kind: null, halo: null }, seriesPosition: 2 }),
      urlFor
    );
    expect(result.series).toEqual({ slug: 'motopirueta', name: 'Motopirueta', order: 999, kind: 'series', halo: 'auto' });
    expect(result.seriesPosition).toBe(2);
  });

  it('treats a dangling series reference (null name) as standalone', () => {
    const result = mapArtwork(raw({ series: { slug: null, name: null, order: 1, kind: null, halo: null } }), urlFor);
    expect(result.series).toBeNull();
    expect(result.seriesPosition).toBeNull();
  });

  it('keeps an explicit halo setting and ignores unknown ones', () => {
    expect(mapArtwork(raw({ haloSetting: 'always' }), urlFor).haloSetting).toBe('always');
    expect(mapArtwork(raw({ haloSetting: 'sometimes' as never }), urlFor).haloSetting).toBe('auto');
  });

  it('treats a missing images array as empty', () => {
    expect(mapArtwork(raw({ images: null }), urlFor).images).toEqual([]);
  });

  it('drops an image slot with no asset (an upload started and cancelled in Studio)', () => {
    const images = [{ asset: { _ref: 'a1', _type: 'reference' } }, { asset: null }, {}];
    expect(mapArtwork(raw({ images }), urlFor).images).toEqual(['https://cdn.sanity.io/images/p/d/a1.jpg']);
  });
});

describe('mediumLabel', () => {
  it('turns a medium value into a sentence-case label', () => {
    expect(mediumLabel('oil-painting')).toBe('Oil painting');
    expect(mediumLabel('mixed-media')).toBe('Mixed media');
    expect(mediumLabel('tattoo')).toBe('Tattoo');
  });
});
