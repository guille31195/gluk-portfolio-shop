// Runs each page's motion on Astro's page-load and tears it all down before
// the next page swaps in, so motion code never manages its own cleanup.
// Pure (no GSAP, no DOM globals) so it can be unit-tested; see runtime.ts
// for the browser wiring.

export interface MotionEnv {
  reduced: boolean;
}

export type MotionSetup = (env: MotionEnv) => void;

export interface MotionScope {
  revert(): void;
}

export interface LifecycleDeps {
  events: Pick<EventTarget, 'addEventListener'>;
  getPageKey: () => string | null;
  createScope: (setup: MotionSetup) => MotionScope;
  onError?: (error: unknown) => void;
}

export interface MotionLifecycle {
  registerGlobal(setup: MotionSetup): void;
  registerPage(key: string, setup: MotionSetup): void;
}

export const PAGE_LOAD_EVENT = 'astro:page-load';
export const BEFORE_SWAP_EVENT = 'astro:before-swap';

export function createLifecycle(deps: LifecycleDeps): MotionLifecycle {
  const globals: MotionSetup[] = [];
  const pages = new Map<string, MotionSetup>();
  let scopes: MotionScope[] = [];
  let loaded = false;
  const onError = deps.onError ?? ((error) => console.error('[motion]', error));

  function run(setup: MotionSetup): void {
    try {
      scopes.push(deps.createScope(setup));
    } catch (error) {
      onError(error);
    }
  }

  function teardown(): void {
    for (const scope of scopes) {
      try {
        scope.revert();
      } catch (error) {
        onError(error);
      }
    }
    scopes = [];
  }

  function start(): void {
    teardown();
    loaded = true;
    for (const setup of globals) run(setup);
    const key = deps.getPageKey();
    const page = key ? pages.get(key) : undefined;
    if (page) run(page);
  }

  deps.events.addEventListener(PAGE_LOAD_EVENT, start);
  deps.events.addEventListener(BEFORE_SWAP_EVENT, () => {
    teardown();
    loaded = false;
  });

  return {
    registerGlobal(setup) {
      globals.push(setup);
      if (loaded) run(setup);
    },
    registerPage(key, setup) {
      if (pages.has(key)) return;
      pages.set(key, setup);
      // Page scripts can execute after the first page-load has already fired.
      if (loaded && deps.getPageKey() === key) run(setup);
    },
  };
}
