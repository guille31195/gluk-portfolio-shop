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
