import { describe, it, expect } from 'vitest';
import { DEFAULT_HERO_FOOTNOTE, DEFAULT_HERO_LIST, mapHomePage } from './home-page';

const artworks = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];

describe('mapHomePage', () => {
  it('uses the defaults when the document does not exist', () => {
    expect(mapHomePage(null, artworks)).toEqual({
      heroList: [...DEFAULT_HERO_LIST],
      heroFootnote: DEFAULT_HERO_FOOTNOTE,
      featuredWorks: [],
    });
  });

  it('keeps the approved defaults (his three media, from BIO.pdf)', () => {
    expect(DEFAULT_HERO_LIST).toEqual(['Óleo', 'Tinta', 'Código']);
    expect(DEFAULT_HERO_FOOTNOTE).toBe('Oil, ink and code, put in friction.');
  });

  it('trims hero words and drops blanks and nulls', () => {
    const result = mapHomePage({ heroList: ['  Uno ', '', null, 'Dos'], heroFootnote: null, featuredSlugs: null }, artworks);
    expect(result.heroList).toEqual(['Uno', 'Dos']);
  });

  it('falls back to the default list when every word is blank', () => {
    expect(mapHomePage({ heroList: ['  '], heroFootnote: '', featuredSlugs: [] }, artworks).heroList).toEqual([
      ...DEFAULT_HERO_LIST,
    ]);
  });

  it('caps the hero list at five words', () => {
    const list = ['1', '2', '3', '4', '5', '6'];
    expect(mapHomePage({ heroList: list, heroFootnote: null, featuredSlugs: null }, artworks).heroList).toHaveLength(5);
  });

  it('uses a trimmed custom footnote', () => {
    expect(mapHomePage({ heroList: null, heroFootnote: '  otra línea ', featuredSlugs: null }, artworks).heroFootnote).toBe(
      'otra línea'
    );
  });

  it('resolves featured slugs to artworks in order, skipping missing and duplicate ones', () => {
    const result = mapHomePage({ heroList: null, heroFootnote: null, featuredSlugs: ['c', null, 'zzz', 'a', 'c'] }, artworks);
    expect(result.featuredWorks).toEqual([{ slug: 'c' }, { slug: 'a' }]);
  });
});
