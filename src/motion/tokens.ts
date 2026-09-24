// The Gluk motion vocabulary. Every animation reads its timing from here so
// the whole site speaks with one voice — tune the site's feel in this file.
export const DURATION = {
  quick: 0.6,
  base: 0.9,
  slow: 1.4,
} as const;

// Slow, confident ease-out. CSS equivalent: cubic-bezier(0.16, 1, 0.3, 1).
export const EASE = 'expo.out';

export const REVEAL_DISTANCE = 24; // px of upward drift on reveal
export const STAGGER = 0.08; // seconds between items in a revealed group
export const INTRO_STAGGER = 0.12; // seconds between page-intro elements
export const REVEAL_START = 'top 85%'; // ScrollTrigger start for reveals

// Cursor trailing: quicker and softer than reveals so it feels attached to the pointer.
export const CURSOR_TRAIL = { duration: 0.35, ease: 'power3.out' } as const;

// Home hero opening (spec §10): the list rises word by word, ~1.5 s in total.
export const HERO_INTRO = { delay: 0.1, stagger: 0.15 } as const;
export const HERO_DRIFT = 12; // % the hero list drifts up while scrolling away

// Home hero "decoding" words: each letter resolves from a faint code glyph,
// fading and un-blurring into place left to right; at rest one letter stays in
// code (T1NTA) and now and then a letter softly crossfades to a glyph and back.
export const HERO_DECODE = {
  word: 1.4, // s for one word to resolve, first letter to last
  letter: 0.7, // s for a single letter's fade-in
  blur: 10, // px of blur a letter resolves from
  glyphOpacity: 0.35, // how faint an unresolved glyph is
  ease: 'power2.out',
  flickerEvery: 5, // s between resting flickers
  flicker: 0.6, // s for a flicker: letter to glyph and back
  redecode: 1, // s for a hover re-decode
} as const;

// Home backdrop moods: hovering a hero word (or, without hover, scrolling the
// hero) eases the field toward that word's mood. Index = hero word; cycles.
export const HERO_MOOD = {
  duration: 1.5,
  ease: 'power2.inOut',
  moods: [
    { name: 'warm', warm: 0.55, cool: 0, shade: 0, scale: 1.08, x: 2 }, // ÓLEO: orange swells
    { name: 'ink', warm: 0, cool: 0, shade: 0.5, scale: 1.04, x: 0 }, // TINTA: darkens to ink
    { name: 'cool', warm: 0, cool: 0.55, shade: 0, scale: 1.08, x: -2 }, // CÓDIGO: blue expands
  ],
} as const;
