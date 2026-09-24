// Home backdrop moods: eases the fixed brand field toward a hero word's mood
// (warm glow, ink shade, cool glow) by scaling/shifting the field layer and
// fading the glow/shade layers of Backdrop.astro. Transforms and opacity only,
// so the browser composites it without repainting the page.
import { gsap } from 'gsap';
import { HERO_MOOD } from './tokens';

export interface HomeBackdrop {
  /** Ease toward word `index`'s mood, centring the glow on `focus`. */
  toMood(index: number, focus: HTMLElement): void;
  /** Ease back to the still field. */
  rest(): void;
  /** Without hover: blend through the moods as `trigger` scrolls away. */
  scrub(trigger: HTMLElement): void;
  /** Stop everything and drop inline styles (page teardown). */
  cleanup(): void;
}

const moodAt = (index: number) => HERO_MOOD.moods[index % HERO_MOOD.moods.length];

export function createHomeBackdrop(): HomeBackdrop | null {
  const root = document.querySelector<HTMLElement>('[data-backdrop]');
  const field = root?.querySelector<HTMLElement>('[data-backdrop-field]');
  const warm = root?.querySelector<HTMLElement>('[data-backdrop-warm]');
  const cool = root?.querySelector<HTMLElement>('[data-backdrop-cool]');
  const shade = root?.querySelector<HTMLElement>('[data-backdrop-shade]');
  if (!field || !warm || !cool || !shade) return null;
  const layers = [field, warm, cool, shade];
  const ease = { duration: HERO_MOOD.duration, ease: HERO_MOOD.ease, overwrite: 'auto' as const };

  function apply(mood: { warm: number; cool: number; shade: number; scale: number; x: number }): void {
    gsap.to(field!, { scale: mood.scale, xPercent: mood.x, ...ease });
    gsap.to(warm!, { opacity: mood.warm, ...ease });
    gsap.to(cool!, { opacity: mood.cool, ...ease });
    gsap.to(shade!, { opacity: mood.shade, ...ease });
  }

  return {
    toMood(index, focus) {
      const r = focus.getBoundingClientRect();
      const at = {
        '--glow-x': `${((r.left + r.width / 2) / window.innerWidth) * 100}%`,
        '--glow-y': `${((r.top + r.height / 2) / window.innerHeight) * 100}%`,
      };
      gsap.to([warm, cool], { ...at, ...ease });
      apply(moodAt(index));
    },
    rest() {
      apply({ warm: 0, cool: 0, shade: 0, scale: 1, x: 0 });
    },
    scrub(trigger) {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: true },
      });
      HERO_MOOD.moods.forEach((mood) => {
        tl.to(field, { scale: mood.scale, xPercent: mood.x })
          .to(warm, { opacity: mood.warm }, '<')
          .to(cool, { opacity: mood.cool }, '<')
          .to(shade, { opacity: mood.shade }, '<');
      });
    },
    cleanup() {
      gsap.killTweensOf(layers);
      gsap.set(layers, { clearProps: 'all' });
    },
  };
}
