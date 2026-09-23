import { describe, it, expect } from 'vitest';
import { focalPoint, mapHomePage, PORTRAIT_WIDTHS, type RawHomePage, type RawPortrait } from './home-page';

interface FakeRawArt {
  slug: string;
}

const deps = {
  portraitUrl: (_portrait: RawPortrait, width: number) => `https://cdn.test/portrait.jpg?w=${width}`,
  mapArtwork: (raw: FakeRawArt) => ({ slug: raw.slug.toUpperCase() }),
};

const portrait: RawPortrait = {
  asset: { _ref: 'image-abc-4240x2832-jpg', _type: 'reference' },
  hotspot: { x: 0.5, y: 0.42 },
};

function doc(overrides: Partial<RawHomePage<FakeRawArt>> = {}): RawHomePage<FakeRawArt> {
  return {
    portrait,
    portraitAlt: 'Gluk, silhouetted between two studio lights',
    featuredWorks: [{ slug: 'a' }, { slug: 'b' }],
    ...overrides,
  };
}

describe('mapHomePage', () => {
  it('returns an empty home page when the document does not exist', () => {
    expect(mapHomePage(null, deps)).toEqual({ portrait: null, featuredWorks: [] });
  });

  it('maps a complete document', () => {
    const result = mapHomePage(doc(), deps);
    expect(result.portrait).toEqual({
      src: 'https://cdn.test/portrait.jpg?w=1600',
      srcset: PORTRAIT_WIDTHS.map((w) => `https://cdn.test/portrait.jpg?w=${w} ${w}w`).join(', '),
      alt: 'Gluk, silhouetted between two studio lights',
      focalPoint: '50% 42%',
    });
    expect(result.featuredWorks).toEqual([{ slug: 'A' }, { slug: 'B' }]);
  });

  it('omits the portrait when none is set, keeping featured works', () => {
    const result = mapHomePage(doc({ portrait: null }), deps);
    expect(result.portrait).toBeNull();
    expect(result.featuredWorks).toHaveLength(2);
  });

  it('omits the portrait when the image has no asset', () => {
    const result = mapHomePage(doc({ portrait: { asset: null } }), deps);
    expect(result.portrait).toBeNull();
  });

  it('falls back to "GLUK" alt text when alt is missing or blank', () => {
    expect(mapHomePage(doc({ portraitAlt: null }), deps).portrait?.alt).toBe('GLUK');
    expect(mapHomePage(doc({ portraitAlt: '   ' }), deps).portrait?.alt).toBe('GLUK');
  });

  it('treats a null featured list as empty', () => {
    expect(mapHomePage(doc({ featuredWorks: null }), deps).featuredWorks).toEqual([]);
  });

  it('drops dangling references (deleted artworks) and keeps order', () => {
    const result = mapHomePage(doc({ featuredWorks: [{ slug: 'c' }, null, { slug: 'a' }] }), deps);
    expect(result.featuredWorks).toEqual([{ slug: 'C' }, { slug: 'A' }]);
  });
});

describe('focalPoint', () => {
  it('centers when there is no hotspot', () => {
    expect(focalPoint(null)).toBe('50% 50%');
    expect(focalPoint(undefined)).toBe('50% 50%');
  });

  it('converts a hotspot to a CSS object-position', () => {
    expect(focalPoint({ x: 0.25, y: 0.333 })).toBe('25% 33.3%');
  });
});
