import { describe, it, expect } from 'vitest';
import { artworks, getArtworksByMedium } from './placeholder-artworks';

describe('getArtworksByMedium', () => {
  it('returns only artworks matching the given medium', () => {
    const result = getArtworksByMedium(artworks, 'sculpture');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.medium === 'sculpture')).toBe(true);
  });

  it('returns an empty array when no artworks match', () => {
    const result = getArtworksByMedium([], 'oil-painting');
    expect(result).toEqual([]);
  });
});
