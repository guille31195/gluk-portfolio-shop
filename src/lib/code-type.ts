// Code-spelling for the home hero's "decoding" words. Pure: no DOM, no GSAP,
// randomness injected so it can be unit-tested.

// Glyphs the words scramble through before they resolve.
export const CODE_GLYPHS = '01{}<>/_;#';

// Only swaps that still read as the letter. The first letter is never
// swapped, so each word stays recognisable at a glance.
const SWAPS: Record<string, string> = { O: '0', I: '1', E: '3', A: '4' };

type Random = () => number;

/** A code glyph to show in place of `replacing` (never the same character). */
export function randomGlyph(random: Random = Math.random, replacing?: string): string {
  const pool = replacing ? CODE_GLYPHS.replace(replacing, '') : CODE_GLYPHS;
  return pool[Math.floor(random() * pool.length)];
}

/** Every spelling of `word` with exactly one letter swapped for its code digit. */
export function codeVariants(word: string): string[] {
  const chars = [...word];
  const variants: string[] = [];
  chars.forEach((ch, i) => {
    const swap = SWAPS[ch];
    if (i === 0 || !swap) return;
    variants.push([...chars.slice(0, i), swap, ...chars.slice(i + 1)].join(''));
  });
  return variants;
}

/** The resting spelling for this visit: one curated variant, or the word itself. */
export function pickVariant(word: string, random: Random = Math.random): string {
  const variants = codeVariants(word);
  return variants.length > 0 ? variants[Math.floor(random() * variants.length)] : word;
}

/** Indexes that may flicker: every character after the first, except spaces. */
export function flickerSlots(text: string): number[] {
  return [...text].flatMap((ch, i) => (i > 0 && ch !== ' ' ? [i] : []));
}
