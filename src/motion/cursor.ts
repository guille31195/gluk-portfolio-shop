// Custom cursor: a small dot that trails the mouse and becomes a thin
// "View" ring over [data-cursor="view"]. The element is persisted across
// navigations (transition:persist), so this mounts once and is never torn
// down — it deliberately lives outside the page lifecycle.
import { gsap } from 'gsap';
import { DURATION, CURSOR_TRAIL } from './tokens';

const ACTIVE_CLASS = 'has-custom-cursor';
const VIEW_CLASS = 'is-view';
const VIEW_SELECTOR = '[data-cursor="view"]';

export function mountCursor(el: HTMLElement): void {
  const root = document.documentElement;
  let visible = false;
  let viewing = false;

  const setViewing = (next: boolean) => {
    if (next === viewing) return;
    viewing = next;
    el.classList.toggle(VIEW_CLASS, next);
  };

  root.classList.add(ACTIVE_CLASS);
  // ClientRouter replaces <html> attributes on every navigation, and the
  // element under the pointer is gone, so reset both after each swap.
  document.addEventListener('astro:after-swap', () => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    setViewing(false);
  });

  const xTo = gsap.quickTo(el, 'x', { ...CURSOR_TRAIL });
  const yTo = gsap.quickTo(el, 'y', { ...CURSOR_TRAIL });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      if (!visible) {
        visible = true;
        gsap.set(el, { x: event.clientX, y: event.clientY });
        gsap.to(el, { autoAlpha: 1, duration: DURATION.quick });
      }
      xTo(event.clientX);
      yTo(event.clientY);
      setViewing(event.target instanceof Element && event.target.closest(VIEW_SELECTOR) !== null);
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () => {
    visible = false;
    gsap.to(el, { autoAlpha: 0, duration: DURATION.quick });
  });
}
