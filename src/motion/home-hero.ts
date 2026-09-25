// Home opening (spec §10): numerals and footnote fade in, the words rise from
// behind a mask one after another while each letter resolves from a faint code
// glyph (fading and un-blurring left to right) into the word's resting
// spelling, one letter in code (T1NTA); the rupture rule draws across the
// middle word. At rest a letter now and then crossfades to a glyph and back.
// Hovering a word (fine pointer) softly re-decodes it and eases the backdrop
// into that word's mood; without hover the moods follow the hero's scroll.
// Scrolling away drifts the list up slightly slower than the page.
// Reduced motion: fades only, resting spelling, still backdrop.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flickerSlots, pickVariant, randomGlyph } from '../lib/code-type';
import { createHomeBackdrop } from './home-backdrop';
import type { MotionEnv } from './lifecycle';
import { FINE_POINTER_QUERY } from './media';
import { DURATION, EASE, HERO_DECODE, HERO_DRIFT, HERO_INTRO } from './tokens';

gsap.registerPlugin(ScrollTrigger);

interface DecodeWord {
  el: HTMLElement; // [data-hero-glyphs]
  plain: string;
  resting: string;
  letters: HTMLElement[];
  glyphs: HTMLElement[];
  anim?: gsap.core.Timeline; // the running flicker or re-decode
}

const busy = (w: DecodeWord) => Boolean(w.anim?.isActive());
const blurred = (px: number) => `blur(${px}px)`;

// Splits the word into letter boxes, each holding its resting letter and a
// glyph overlaid on it. Boxes take the letter's width, so nothing reflows.
function splitLetters(w: DecodeWord): void {
  w.el.textContent = '';
  for (const ch of w.resting) {
    const box = document.createElement('span');
    box.className = 'hero-ch';
    const letter = document.createElement('span');
    letter.className = 'hero-ch-letter';
    letter.textContent = ch;
    const glyph = document.createElement('span');
    glyph.className = 'hero-ch-glyph';
    glyph.textContent = ch === ' ' ? '' : randomGlyph();
    box.append(letter, glyph);
    w.el.append(box);
    w.letters.push(letter);
    w.glyphs.push(glyph);
  }
}

// Letters resolve left to right across `span` seconds; each glyph is
// reshuffled once midway through its wait so the code reads as alive.
function resolve(tl: gsap.core.Timeline, w: DecodeWord, at: number, span: number, letterDur: number): void {
  const n = w.letters.length;
  w.letters.forEach((letter, j) => {
    const t = at + (n > 1 ? (span * j) / (n - 1) : 0);
    const glyph = w.glyphs[j];
    if (t - at > 0.3) tl.call(() => void (glyph.textContent &&= randomGlyph(Math.random, glyph.textContent)), [], at + (t - at) / 2);
    tl.to(letter, { autoAlpha: 1, filter: blurred(0), duration: letterDur, ease: HERO_DECODE.ease, clearProps: 'filter' }, t);
    tl.to(glyph, { opacity: 0, duration: letterDur * 0.6, ease: HERO_DECODE.ease }, t);
  });
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
    return { el, plain, resting: pickVariant(plain), letters: [], glyphs: [] };
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

  active.forEach((w) => {
    splitLetters(w);
    gsap.set(w.letters, { autoAlpha: 0, filter: blurred(HERO_DECODE.blur) });
    gsap.set(w.glyphs, { opacity: HERO_DECODE.glyphOpacity });
  });

  tl.fromTo(intro, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, stagger: 0.08 }, 0);
  tl.fromTo(
    words,
    { autoAlpha: 1, yPercent: 110 },
    { yPercent: 0, duration: DURATION.base, stagger: HERO_INTRO.stagger },
    HERO_INTRO.delay
  );
  active.forEach((w, i) =>
    resolve(tl, w, HERO_INTRO.delay + HERO_INTRO.stagger * i, HERO_DECODE.word - HERO_DECODE.letter, HERO_DECODE.letter)
  );
  if (rule) {
    tl.fromTo(
      rule,
      { autoAlpha: 1, scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, duration: DURATION.base },
      HERO_INTRO.delay + HERO_INTRO.stagger
    );
  }

  // Everything below starts after setup, outside GSAP's tracked scope, so the
  // returned cleanup stops it.
  let flickerLoop: number | undefined;
  tl.eventCallback('onComplete', () => {
    flickerLoop = window.setInterval(() => {
      const idle = active.filter((w) => !busy(w));
      if (idle.length === 0) return;
      const w = idle[Math.floor(Math.random() * idle.length)];
      const slots = flickerSlots(w.resting);
      if (slots.length === 0) return;
      const j = slots[Math.floor(Math.random() * slots.length)];
      const glyph = w.glyphs[j];
      glyph.textContent = randomGlyph(Math.random, w.resting[j]);
      const half = HERO_DECODE.flicker / 2;
      w.anim = gsap
        .timeline({ defaults: { duration: half, ease: 'sine.inOut' } })
        .to(w.letters[j], { autoAlpha: 0.1 })
        .to(glyph, { opacity: 0.8 }, '<')
        .to(w.letters[j], { autoAlpha: 1 })
        .to(glyph, { opacity: 0 }, '<');
    }, HERO_DECODE.flickerEvery * 1000);
  });

  const backdrop = createHomeBackdrop();
  const listeners: [HTMLElement, string, () => void][] = [];
  const listen = (el: HTMLElement, type: string, fn: () => void) => {
    el.addEventListener(type, fn);
    listeners.push([el, type, fn]);
  };

  if (window.matchMedia(FINE_POINTER_QUERY).matches) {
    active.forEach((w, i) => {
      listen(w.el, 'pointerenter', () => {
        backdrop?.toMood(i, w.el);
        if (busy(w) || tl.progress() < 1) return;
        w.glyphs.forEach((g, j) => (g.textContent = w.resting[j] === ' ' ? '' : randomGlyph()));
        const dim = HERO_DECODE.redecode * 0.3;
        w.anim = gsap.timeline();
        w.anim.to(w.letters, { autoAlpha: 0.15, filter: blurred(HERO_DECODE.blur / 2), duration: dim, stagger: dim / w.letters.length, ease: 'sine.in' });
        w.anim.to(w.glyphs, { opacity: HERO_DECODE.glyphOpacity, duration: dim, stagger: dim / w.letters.length }, 0);
        resolve(w.anim, w, dim, HERO_DECODE.redecode - dim - HERO_DECODE.letter / 2, HERO_DECODE.letter / 2);
      });
    });
    if (list) listen(list, 'pointerleave', () => backdrop?.rest());
  } else if (backdrop) {
    backdrop.scrub(hero);
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
    active.forEach((w) => w.anim?.kill());
    listeners.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
    backdrop?.cleanup();
    restore();
  };
}
