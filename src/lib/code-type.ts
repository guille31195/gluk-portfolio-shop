// Code-spelling for the home hero's "decoding" words. Pure: no DOM, no GSAP,
// randomness injected so it can be unit-tested.

// Glyphs the words scramble through before they resolve.
export const CODE_GLYPHS = '01{}<>/_;#';

// Only swaps that still read as the letter. The first letter is never
// swapped, so each word stays recognisable at a glance.
const SWAPS: Record<string, string> = { O: '0', I: '1', E: '3', A: '4' };

type Random = () => number;

const glyph = (random: Random) => CODE_GLYPHS[Math.floor(random() * CODE_GLYPHS.length)];

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

/** `target` with its first `revealed` characters shown and the rest as code glyphs. */
export function scrambleFrame(target: string, revealed: number, random: Random = Math.random): string {
  return [...target].map((ch, i) => (i < revealed || ch === ' ' ? ch : glyph(random))).join('');
}

/** `text` with one character (never the first, never a space) swapped for a glyph. */
export function flickerFrame(text: string, random: Random = Math.random): string {
  const chars = [...text];
  const slots = chars.flatMap((ch, i) => (i > 0 && ch !== ' ' ? [i] : []));
  if (slots.length === 0) return text;
  chars[slots[Math.floor(random() * slots.length)]] = glyph(random);
  return chars.join('');
}
