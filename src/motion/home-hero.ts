// Home opening: the portrait settles from a slight zoom while "GLUK" and the
// tagline fade up; scrolling away scrubs the photo into a gentle zoom-and-fade
// with the title drifting up faster (parallax). Reduced motion: text fades only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from './lifecycle';
import { DURATION, EASE, HERO_INTRO, REVEAL_DISTANCE } from './tokens';

gsap.registerPlugin(ScrollTrigger);

export function setupHomeHero({ reduced }: MotionEnv): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const media = hero.querySelector<HTMLElement>('[data-hero-media]');
  const image = hero.querySelector<HTMLElement>('[data-hero-image]');
  const text = hero.querySelector<HTMLElement>('[data-hero-text]');
  const intro = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-intro]'));

  const opening = gsap.timeline({ defaults: { ease: EASE } });
  // The portrait is the LCP element: never hide it, only settle its scale.
  if (image && !reduced) {
    opening.fromTo(image, { scale: 1.08 }, { scale: 1, duration: DURATION.slow }, 0);
  }
  if (intro.length > 0) {
    opening.fromTo(
      intro,
      { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE },
      { autoAlpha: 1, y: 0, duration: DURATION.slow, stagger: HERO_INTRO.stagger },
      HERO_INTRO.delay
    );
  }

  if (reduced || !media || !text) return;
  gsap
    .timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    })
    .to(media, { scale: 1.12, autoAlpha: 0, ease: 'none' }, 0)
    .to(text, { yPercent: -60, autoAlpha: 0, ease: 'none' }, 0);
}
