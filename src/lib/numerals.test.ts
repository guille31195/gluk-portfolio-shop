import { describe, it, expect } from 'vitest';
import { pad2, toRoman } from './numerals';

describe('toRoman', () => {
  it('converts the numbers the site uses', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 14, 39].map(toRoman)).toEqual(['I', 'II', 'III', 'IV', 'V', 'IX', 'X', 'XIV', 'XXXIX']);
  });

  it('returns an empty string for non-positive or non-integer input', () => {
    expect(toRoman(0)).toBe('');
    expect(toRoman(-2)).toBe('');
    expect(toRoman(1.5)).toBe('');
  });
});

describe('pad2', () => {
  it('pads to two digits and leaves larger numbers alone', () => {
    expect(pad2(4)).toBe('04');
    expect(pad2(13)).toBe('13');
    expect(pad2(120)).toBe('120');
  });
});
