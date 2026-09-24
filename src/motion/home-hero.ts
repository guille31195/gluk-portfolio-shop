// Home opening (spec §10): numerals and footnote fade in, the words rise from
// behind a mask one after another, the rupture rule draws across the middle
// word, and the outlined last word wipes in. Scrolling away drifts the list up
// slightly slower than the page. Reduced motion: fades only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from './lifecycle';
import { DURATION, EASE, HERO_DRIFT, HERO_INTRO } from './tokens';

gsap.registerPlugin(ScrollTrigger);

export function setupHomeHero({ reduced }: MotionEnv): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const intro = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-intro]'));
  const words = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-word]'));
  const outline = hero.querySelector<HTMLElement>('[data-hero-outline]');
  const rule = hero.querySelector<HTMLElement>('[data-hero-rule]');
  const list = hero.querySelector<HTMLElement>('[data-hero-list]');

  const tl = gsap.timeline({ defaults: { ease: EASE } });
  if (reduced) {
    tl.fromTo([...intro, ...words], { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: HERO_INTRO.stagger });
    if (rule) tl.fromTo(rule, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base }, 0);
    return;
  }

  tl.fromTo(intro, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: 0.08 }, 0);
  tl.fromTo(
    words,
    { autoAlpha: 1, yPercent: 110 },
    { yPercent: 0, duration: DURATION.base, stagger: HERO_INTRO.stagger },
    HERO_INTRO.delay
  );
  if (rule) {
    tl.fromTo(
      rule,
      { autoAlpha: 1, scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, duration: DURATION.base },
      HERO_INTRO.delay + HERO_INTRO.stagger
    );
  }
  if (outline) {
    tl.fromTo(
      outline,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION.base },
      HERO_INTRO.delay + HERO_INTRO.stagger * 2
    );
  }
  if (list) {
    gsap.to(list, {
      yPercent: -HERO_DRIFT,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}
