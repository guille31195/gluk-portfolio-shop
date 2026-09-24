import { describe, expect, it } from 'vitest';
import { CODE_GLYPHS, codeVariants, flickerFrame, pickVariant, scrambleFrame } from './code-type';

// Deterministic stand-in for Math.random: cycles through the given values.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

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

describe('scrambleFrame', () => {
  it('keeps the revealed prefix and fills the rest with code glyphs', () => {
    const frame = scrambleFrame('TINTA', 2, seq(0, 0.5, 0.99));
    expect(frame.slice(0, 2)).toBe('TI');
    expect(frame).toHaveLength(5);
    for (const ch of frame.slice(2)) expect(CODE_GLYPHS).toContain(ch);
  });

  it('is the target once fully revealed', () => {
    expect(scrambleFrame('CÓD1GO', 6, Math.random)).toBe('CÓD1GO');
    expect(scrambleFrame('CÓD1GO', 99, Math.random)).toBe('CÓD1GO');
  });

  it('preserves spaces so multi-word lines keep their shape', () => {
    expect(scrambleFrame('OBRA VIVA', 0, () => 0)[4]).toBe(' ');
  });
});

describe('flickerFrame', () => {
  it('swaps one character after the first for a glyph', () => {
    const frame = flickerFrame('TINTA', seq(0, 0));
    expect(frame[0]).toBe('T');
    expect(frame).toHaveLength(5);
    const changed = [...frame].filter((ch, i) => ch !== 'TINTA'[i]);
    expect(changed).toHaveLength(1);
    expect(CODE_GLYPHS).toContain(changed[0]);
  });

  it('leaves one-letter words and spaces alone', () => {
    expect(flickerFrame('A', () => 0)).toBe('A');
    const frame = flickerFrame('A B', () => 0.5);
    expect(frame.slice(0, 2)).toBe('A ');
    expect(CODE_GLYPHS).toContain(frame[2]);
  });
});
