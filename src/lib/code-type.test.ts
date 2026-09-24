import { describe, expect, it } from 'vitest';
import { CODE_GLYPHS, codeVariants, flickerSlots, pickVariant, randomGlyph } from './code-type';

describe('codeVariants', () => {
  it('swaps exactly one legible letter for its code digit', () => {
    expect(codeVariants('ÓLEO')).toEqual(['ÓL3O', 'ÓLE0']);
    expect(codeVariants('TINTA')).toEqual(['T1NTA', 'TINT4']);
    expect(codeVariants('CÓDIGO')).toEqual(['CÓD1GO', 'CÓDIG0']);
  });

  it('never touches the first letter, so the word stays recognisable', () => {
    expect(codeVariants('ORO')).toEqual(['OR0']);
    expect(codeVariants('A')).toEqual([]);
  });

  it('returns no variants for words without swappable letters', () => {
    expect(codeVariants('SKY')).toEqual([]);
    expect(codeVariants('')).toEqual([]);
  });
});

describe('pickVariant', () => {
  it('picks one of the curated variants', () => {
    expect(pickVariant('TINTA', () => 0)).toBe('T1NTA');
    expect(pickVariant('TINTA', () => 0.99)).toBe('TINT4');
  });

  it('falls back to the plain word when nothing can be swapped', () => {
    expect(pickVariant('SKY', () => 0.5)).toBe('SKY');
  });
});

describe('randomGlyph', () => {
  it('draws from the code glyph set', () => {
    expect(randomGlyph(() => 0)).toBe(CODE_GLYPHS[0]);
    expect(randomGlyph(() => 0.999)).toBe(CODE_GLYPHS[CODE_GLYPHS.length - 1]);
  });

  it('never returns the character it replaces', () => {
    expect(randomGlyph(() => 0, '0')).not.toBe('0');
  });
});

describe('flickerSlots', () => {
  it('lists every character after the first that can flicker', () => {
    expect(flickerSlots('TINTA')).toEqual([1, 2, 3, 4]);
  });

  it('skips spaces and one-letter words', () => {
    expect(flickerSlots('A B')).toEqual([2]);
    expect(flickerSlots('A')).toEqual([]);
  });
});
