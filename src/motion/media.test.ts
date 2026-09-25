import { describe, it, expect } from 'vitest';
import {
  FINE_POINTER_QUERY,
  REDUCED_MOTION_QUERY,
  prefersReducedMotion,
  shouldEnableCursor,
  type MatchMedia,
} from './media';

function fakeMatchMedia(matching: string[]): MatchMedia {
  return (query) => ({ matches: matching.includes(query) });
}

describe('prefersReducedMotion', () => {
  it('is true only when the reduced-motion query matches', () => {
    expect(prefersReducedMotion(fakeMatchMedia([REDUCED_MOTION_QUERY]))).toBe(true);
    expect(prefersReducedMotion(fakeMatchMedia([]))).toBe(false);
  });
});

describe('shouldEnableCursor', () => {
  it('enables on a fine, hover-capable pointer with motion allowed', () => {
    expect(shouldEnableCursor(fakeMatchMedia([FINE_POINTER_QUERY]))).toBe(true);
  });

  it('disables on touch devices', () => {
    expect(shouldEnableCursor(fakeMatchMedia([]))).toBe(false);
  });

  it('disables when the user prefers reduced motion, even with a mouse', () => {
    expect(shouldEnableCursor(fakeMatchMedia([FINE_POINTER_QUERY, REDUCED_MOTION_QUERY]))).toBe(false);
  });
});
