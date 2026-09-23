// Browser wiring for the motion lifecycle. Bundled module scripts run once
// per session under Astro's ClientRouter, so this is a true singleton.
import { gsap } from 'gsap';
import { createLifecycle, type MotionScope, type MotionSetup } from './lifecycle';
import { NO_MOTION_PREFERENCE_QUERY, REDUCED_MOTION_QUERY } from './media';

// gsap.matchMedia() records every tween/ScrollTrigger created in `setup` and
// reverts them together; it also re-runs setup if the reduced-motion
// preference changes while the page is open.
function createScope(setup: MotionSetup): MotionScope {
  const mm = gsap.matchMedia();
  mm.add(
    { reduced: REDUCED_MOTION_QUERY, full: NO_MOTION_PREFERENCE_QUERY },
    (context) => {
      setup({ reduced: Boolean(context.conditions?.reduced) });
    }
  );
  return mm;
}

export const motion = createLifecycle({
  events: document,
  getPageKey: () =>
    document.querySelector<HTMLElement>('[data-motion-page]')?.dataset.motionPage ?? null,
  createScope,
});

// Tells the inline guard in BaseLayout that motion is live (see theme.css).
window.__glukMotionReady = true;
