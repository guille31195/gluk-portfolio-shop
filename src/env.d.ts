/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface Window {
  // Set by src/motion/runtime.ts; read by the inline js-motion guard in BaseLayout.
  __glukMotionReady?: boolean;
}
