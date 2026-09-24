// Home opening (spec §10): numerals and footnote fade in, the words rise from
// behind a mask one after another while decoding from code glyphs into their
// resting spelling (one letter in code, e.g. T1NTA), and the rupture rule
// draws across the middle word. At rest a letter flickers now and then; on a
// fine pointer, hovering a word re-decodes it. Scrolling away drifts the list
// up slightly slower than the page. Reduced motion: fades only, no scramble.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flickerFrame, pickVariant, scrambleFrame } from '../lib/code-type';
import type { MotionEnv } from './lifecycle';
import { FINE_POINTER_QUERY } from './media';
import { DURATION, EASE, HERO_DECODE, HERO_DRIFT, HERO_INTRO } from './tokens';

gsap.registerPlugin(ScrollTrigger);

interface DecodeWord {
  el: HTMLElement;
  plain: string;
  resting: string;
  tween?: gsap.core.Tween;
}

const decoding = (word: DecodeWord) => Boolean(word.tween?.isActive());

// Resolves `word` from glyphs to its resting spelling, reshuffling every tick.
function decode(word: DecodeWord): gsap.core.Tween {
  const state = { p: 0 };
  let last = -Infinity;
  word.tween = gsap.to(state, {
    p: 1,
    duration: HERO_DECODE.duration,
    ease: 'none',
    onUpdate() {
      const now = this.time();
      if (now - last < HERO_DECODE.tick) return;
      last = now;
      word.el.textContent = scrambleFrame(word.resting, Math.floor(state.p * word.resting.length));
    },
    onComplete() {
      word.el.textContent = word.resting;
    },
  });
  return word.tween;
}

export function setupHomeHero({ reduced }: MotionEnv): (() => void) | void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const intro = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-intro]'));
  const words = gsap.utils.toArray<HTMLElement>(hero.querySelectorAll('[data-hero-word]'));
  const rule = hero.querySelector<HTMLElement>('[data-hero-rule]');
  const list = hero.querySelector<HTMLElement>('[data-hero-list]');

  const decodeWords = words.map((wordEl): DecodeWord | null => {
    const el = wordEl.querySelector<HTMLElement>('[data-hero-glyphs]');
    if (!el) return null;
    // The server-rendered word; kept so a re-run (motion preference change)
    // or teardown starts from the real text, not a code spelling.
    el.dataset.plain ??= el.textContent?.trim() ?? '';
    const plain = el.dataset.plain;
    return { el, plain, resting: pickVariant(plain) };
  });
  const active = decodeWords.filter((w): w is DecodeWord => w !== null);
  const restore = () => active.forEach((w) => (w.el.textContent = w.plain));

  const tl = gsap.timeline({ defaults: { ease: EASE } });
  if (reduced) {
    active.forEach((w) => (w.el.textContent = w.resting));
    tl.fromTo([...intro, ...words], { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: HERO_INTRO.stagger });
    if (rule) tl.fromTo(rule, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base }, 0);
    return restore;
  }

  active.forEach((w) => (w.el.textContent = scrambleFrame(w.resting, 0)));

  tl.fromTo(intro, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: 0.08 }, 0);
  tl.fromTo(
    words,
    { autoAlpha: 1, yPercent: 110 },
    { yPercent: 0, duration: DURATION.base, stagger: HERO_INTRO.stagger },
    HERO_INTRO.delay
  );
  active.forEach((w, i) => tl.add(decode(w), HERO_INTRO.delay + HERO_INTRO.stagger * i));
  if (rule) {
    tl.fromTo(
      rule,
      { autoAlpha: 1, scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, duration: DURATION.base },
      HERO_INTRO.delay + HERO_INTRO.stagger
    );
  }

  // The flicker timers and hover tweens start after setup, outside GSAP's
  // tracked scope, so the returned cleanup stops them.
  let flickerLoop: number | undefined;
  let flickerHold: number | undefined;
  tl.eventCallback('onComplete', () => {
    flickerLoop = window.setInterval(() => {
      const idle = active.filter((w) => !decoding(w));
      if (idle.length === 0) return;
      const w = idle[Math.floor(Math.random() * idle.length)];
      w.el.textContent = flickerFrame(w.resting);
      flickerHold = window.setTimeout(() => {
        if (!decoding(w)) w.el.textContent = w.resting;
      }, HERO_DECODE.flickerHold * 1000);
    }, HERO_DECODE.flickerEvery * 1000);
  });

  const hovers: [HTMLElement, () => void][] = [];
  if (window.matchMedia(FINE_POINTER_QUERY).matches) {
    words.forEach((wordEl, i) => {
      const w = decodeWords[i];
      if (!w) return;
      const onEnter = () => {
        if (!decoding(w) && tl.progress() === 1) decode(w);
      };
      wordEl.addEventListener('pointerenter', onEnter);
      hovers.push([wordEl, onEnter]);
    });
  }

  if (list) {
    gsap.to(list, {
      yPercent: -HERO_DRIFT,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  return () => {
    window.clearInterval(flickerLoop);
    window.clearTimeout(flickerHold);
    active.forEach((w) => w.tween?.kill());
    hovers.forEach(([el, onEnter]) => el.removeEventListener('pointerenter', onEnter));
    restore();
  };
}
