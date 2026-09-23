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

  function teardown(): void {
    for (const scope of scopes) scope.revert();
    scopes = [];
  }

  function start(): void {
    teardown();
    loaded = true;
    for (const setup of globals) scopes.push(deps.createScope(setup));
    const key = deps.getPageKey();
    const page = key ? pages.get(key) : undefined;
    if (page) scopes.push(deps.createScope(page));
  }

  deps.events.addEventListener(PAGE_LOAD_EVENT, start);
  deps.events.addEventListener(BEFORE_SWAP_EVENT, () => {
    teardown();
    loaded = false;
  });

  return {
    registerGlobal(setup) {
      globals.push(setup);
      if (loaded) scopes.push(deps.createScope(setup));
    },
    registerPage(key, setup) {
      if (pages.has(key)) return;
      pages.set(key, setup);
      // Page scripts can execute after the first page-load has already fired.
      if (loaded && deps.getPageKey() === key) scopes.push(deps.createScope(setup));
    },
  };
}
