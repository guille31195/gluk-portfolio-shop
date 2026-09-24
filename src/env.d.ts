/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface Window {
  // Set by src/motion/runtime.ts; read by the inline js-motion guard in BaseLayout.
  __glukMotionReady?: boolean;
  // Set by the inline js-motion guard in BaseLayout so it runs once per full page load.
  __glukMotionGuard?: boolean;
}

interface ImportMetaEnv {
  readonly PUBLIC_LIVE_WEATHER?: 'on' | 'off';
}
