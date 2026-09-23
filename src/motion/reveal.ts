// Site-wide motion, registered as global setups in BaseLayout:
// - setupIntro:  [data-intro] elements rise in, in document order, on load.
// - setupReveal: [data-reveal] elements rise in as they scroll into view.
//     [data-reveal="curtain"] opens its [data-reveal-frame] like a vertical
//     curtain, then fades in its [data-reveal-caption].
//     [data-reveal] items inside a [data-reveal-stagger] container reveal
//     together as a staggered batch.
// Elements are hidden up front by the .js-motion CSS guard (theme.css), so
// every tween is a fromTo with an explicit visible end state.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MotionEnv } from './lifecycle';
import { DURATION, EASE, INTRO_STAGGER, REVEAL_DISTANCE, REVEAL_START, STAGGER } from './tokens';

gsap.registerPlugin(ScrollTrigger);

export function setupIntro({ reduced }: MotionEnv): void {
  const items = gsap.utils.toArray<HTMLElement>('[data-intro]');
  if (items.length === 0) return;
  gsap.fromTo(
    items,
    { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE },
    { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE, stagger: INTRO_STAGGER, delay: 0.15 }
  );
}

export function setupReveal({ reduced }: MotionEnv): void {
  const batched = new Set<HTMLElement>();

  for (const group of gsap.utils.toArray<HTMLElement>('[data-reveal-stagger]')) {
    const items = gsap.utils.toArray<HTMLElement>(group.querySelectorAll('[data-reveal]'));
    if (items.length === 0) continue;
    items.forEach((item) => batched.add(item));
    gsap.set(items, { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE });
    ScrollTrigger.batch(items, {
      start: REVEAL_START,
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE, stagger: STAGGER }),
    });
  }

  for (const el of gsap.utils.toArray<HTMLElement>('[data-reveal]')) {
    if (batched.has(el)) continue;
    if (el.dataset.reveal === 'curtain') curtain(el, reduced);
    else rise(el, reduced);
  }

  refreshWhenImagesLoad();
}

function rise(el: HTMLElement, reduced: boolean): void {
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: reduced ? 0 : REVEAL_DISTANCE },
    {
      autoAlpha: 1,
      y: 0,
      duration: DURATION.base,
      ease: EASE,
      scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
    }
  );
}

function curtain(el: HTMLElement, reduced: boolean): void {
  const frame = el.querySelector<HTMLElement>('[data-reveal-frame]') ?? el;
  const caption = el.querySelector<HTMLElement>('[data-reveal-caption]');
  const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: REVEAL_START, once: true } });

  tl.set(el, { autoAlpha: 1 });
  if (reduced) {
    tl.fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: DURATION.base, ease: EASE });
  } else {
    tl.fromTo(
      frame,
      { clipPath: 'inset(50% 0% 50% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DURATION.slow, ease: EASE }
    );
  }
  if (caption) {
    tl.fromTo(
      caption,
      { autoAlpha: 0, y: reduced ? 0 : 12 },
      { autoAlpha: 1, y: 0, duration: DURATION.quick, ease: EASE },
      '-=0.4'
    );
  }
}

// Images that load after setup shift the layout; re-measure trigger
// positions once they land (debounced, and reverted with the page scope).
function refreshWhenImagesLoad(): void {
  const pending = Array.from(document.images).filter((img) => !img.complete);
  if (pending.length === 0) return;
  let scheduled: gsap.core.Tween | null = null;
  const schedule = () => {
    scheduled?.kill();
    scheduled = gsap.delayedCall(0.15, () => ScrollTrigger.refresh());
  };
  for (const img of pending) img.addEventListener('load', schedule, { once: true });
}
