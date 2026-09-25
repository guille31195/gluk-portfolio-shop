export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const NO_MOTION_PREFERENCE_QUERY = '(prefers-reduced-motion: no-preference)';
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export type MatchMedia = (query: string) => { matches: boolean };

export function prefersReducedMotion(matchMedia: MatchMedia): boolean {
  return matchMedia(REDUCED_MOTION_QUERY).matches;
}

// The custom cursor is a desktop flourish: mouse/trackpad only, and never for
// visitors who asked for less motion.
export function shouldEnableCursor(matchMedia: MatchMedia): boolean {
  return matchMedia(FINE_POINTER_QUERY).matches && !prefersReducedMotion(matchMedia);
}
