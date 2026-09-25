import { describe, it, expect } from 'vitest';
import { sizedImage, imageSrcset, imageAspect } from './image-url';

const CDN = 'https://cdn.sanity.io/images/48jkcmcb/production/';
const ORIGINAL = `${CDN}abc-4453x7707.jpg`;

describe('sizedImage', () => {
  it('asks the Sanity CDN for a resized, auto-format image', () => {
    expect(sizedImage(ORIGINAL, 800)).toBe(`${ORIGINAL}?w=800&auto=format&q=80`);
  });

  it('replaces sizing params already on the URL instead of duplicating them', () => {
    expect(sizedImage(`${ORIGINAL}?w=2000&auto=format&q=80`, 800)).toBe(`${ORIGINAL}?w=800&auto=format&q=80`);
  });

  it('leaves non-Sanity URLs (local placeholders) untouched', () => {
    expect(sizedImage('/placeholder-artwork.svg', 800)).toBe('/placeholder-artwork.svg');
  });

  it('returns an empty string for a missing image', () => {
    expect(sizedImage('', 800)).toBe('');
  });
});

describe('imageSrcset', () => {
  it('lists one resized URL per width with its w descriptor', () => {
    expect(imageSrcset(ORIGINAL, [400, 800])).toBe(
      `${ORIGINAL}?w=400&auto=format&q=80 400w, ${ORIGINAL}?w=800&auto=format&q=80 800w`
    );
  });

  it('returns undefined for non-Sanity URLs so no srcset attribute is rendered', () => {
    expect(imageSrcset('/placeholder-artwork.svg', [400, 800])).toBeUndefined();
  });
});

describe('imageAspect', () => {
  it('reads width / height from the Sanity asset filename', () => {
    expect(imageAspect(`${CDN}abc123-5000x6250.jpg`)).toBe(0.8);
    expect(imageAspect(`${CDN}abc123-3160x2010.jpg?w=800&auto=format`)).toBeCloseTo(1.572, 3);
  });

  it('returns null when the URL carries no dimensions', () => {
    expect(imageAspect('/placeholder/artwork.jpg')).toBeNull();
    expect(imageAspect('')).toBeNull();
  });
});
