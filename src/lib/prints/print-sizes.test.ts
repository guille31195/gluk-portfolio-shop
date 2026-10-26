import { describe, expect, it } from 'vitest';
import { parseDimensions, printSizes, sizeLabel } from './print-sizes';

describe('parseDimensions', () => {
  it('reads width and height in cm', () => {
    expect(parseDimensions('120 × 150 cm')).toEqual({ widthCm: 120, heightCm: 150 });
  });

  it('accepts x, X and comma decimals', () => {
    expect(parseDimensions('120 x 150 cm')).toEqual({ widthCm: 120, heightCm: 150 });
    expect(parseDimensions('120 X 150 cm')).toEqual({ widthCm: 120, heightCm: 150 });
    expect(parseDimensions('70,5 × 90 cm')).toEqual({ widthCm: 70.5, heightCm: 90 });
  });

  it('returns null when there are no usable dimensions', () => {
    expect(parseDimensions(null)).toBeNull();
    expect(parseDimensions('')).toBeNull();
    expect(parseDimensions('variable')).toBeNull();
  });
});

describe('printSizes', () => {
  it('halves a square work', () => {
    expect(printSizes(70, 70)).toEqual({
      large: { widthCm: 70, heightCm: 70 },
      small: { widthCm: 35, heightCm: 35 },
    });
  });

  it('caps the long side at 100 cm and keeps the ratio', () => {
    expect(printSizes(235, 90)).toEqual({
      large: { widthCm: 100, heightCm: 38.3 },
      small: { widthCm: 50, heightCm: 19.1 },
    });
    expect(printSizes(105, 60).large).toEqual({ widthCm: 100, heightCm: 57.1 });
    expect(printSizes(100, 100).large).toEqual({ widthCm: 100, heightCm: 100 });
  });

  it('keeps portrait orientation', () => {
    expect(printSizes(120, 150)).toEqual({
      large: { widthCm: 80, heightCm: 100 },
      small: { widthCm: 40, heightCm: 50 },
    });
    expect(printSizes(50, 60).small).toEqual({ widthCm: 25, heightCm: 30 });
  });

  it('preserves the ratio within rounding for every seeded size', () => {
    const seeded = [[100, 100], [105, 60], [120, 150], [140, 90], [235, 90], [50, 60], [70, 70], [70, 90]];
    for (const [w, h] of seeded) {
      const ratio = Math.min(w, h) / Math.max(w, h);
      const sizes = printSizes(w, h);
      for (const size of Object.values(sizes)) {
        const long = Math.max(size.widthCm, size.heightCm);
        const short = Math.min(size.widthCm, size.heightCm);
        expect(Math.abs(short - long * ratio)).toBeLessThanOrEqual(0.1);
      }
      expect(Math.max(sizes.large.widthCm, sizes.large.heightCm)).toBeLessThanOrEqual(100);
    }
  });
});

describe('sizeLabel', () => {
  it('drops a trailing .0', () => {
    expect(sizeLabel({ widthCm: 100, heightCm: 38.3 })).toBe('100 × 38.3 cm');
    expect(sizeLabel({ widthCm: 70, heightCm: 70 })).toBe('70 × 70 cm');
  });
});
