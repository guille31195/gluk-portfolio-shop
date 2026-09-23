import { describe, it, expect, beforeEach } from 'vitest';
import {
  BEFORE_SWAP_EVENT,
  PAGE_LOAD_EVENT,
  createLifecycle,
  type MotionScope,
  type MotionSetup,
} from './lifecycle';

interface FakeScope extends MotionScope {
  label: string;
  reverted: number;
}

let events: EventTarget;
let pageKey: string | null;
let scopes: FakeScope[];
let runs: string[];
let errors: unknown[];

function createScope(setup: MotionSetup): FakeScope {
  const before = runs.length;
  setup({ reduced: false });
  const scope: FakeScope = {
    label: runs.slice(before).join(','),
    reverted: 0,
    revert() {
      this.reverted += 1;
    },
  };
  scopes.push(scope);
  return scope;
}

function createScopeWithThrowingRevert(setup: MotionSetup): FakeScope {
  const before = runs.length;
  setup({ reduced: false });
  const scope: FakeScope = {
    label: runs.slice(before).join(','),
    reverted: 0,
    revert() {
      this.reverted += 1;
      throw new Error('revert failed');
    },
  };
  scopes.push(scope);
  return scope;
}

function setup(name: string): MotionSetup {
  return () => {
    runs.push(name);
  };
}

function throwingSetup(message: string): MotionSetup {
  return () => {
    throw new Error(message);
  };
}

function lifecycle(customCreateScope?: typeof createScope) {
  return createLifecycle({
    events,
    getPageKey: () => pageKey,
    createScope: customCreateScope || createScope,
    onError: (error) => errors.push(error),
  });
}

const pageLoad = () => events.dispatchEvent(new Event(PAGE_LOAD_EVENT));
const beforeSwap = () => events.dispatchEvent(new Event(BEFORE_SWAP_EVENT));

beforeEach(() => {
  events = new EventTarget();
  pageKey = null;
  scopes = [];
  runs = [];
  errors = [];
});

describe('createLifecycle', () => {
  it('runs global setups on page load', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    pageLoad();
    expect(runs).toEqual(['reveal']);
  });

  it('runs a page setup only on its own page, after globals', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    motion.registerPage('home', setup('hero'));

    pageKey = 'about';
    pageLoad();
    expect(runs).toEqual(['reveal']);

    beforeSwap();
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['reveal', 'reveal', 'hero']);
  });

  it('reverts every scope exactly once before the next page swaps in', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    motion.registerPage('home', setup('hero'));
    pageKey = 'home';
    pageLoad();

    beforeSwap();
    expect(scopes.map((s) => s.reverted)).toEqual([1, 1]);

    beforeSwap(); // a second swap event must not revert again
    expect(scopes.map((s) => s.reverted)).toEqual([1, 1]);
  });

  it('reverts the previous page if page-load fires again without a swap', () => {
    const motion = lifecycle();
    motion.registerGlobal(setup('reveal'));
    pageLoad();
    pageLoad();
    expect(scopes.map((s) => s.reverted)).toEqual([1, 0]);
  });

  it('runs a page registered after page-load immediately when it is the current page', () => {
    const motion = lifecycle();
    pageKey = 'home';
    pageLoad();
    motion.registerPage('home', setup('hero'));
    expect(runs).toEqual(['hero']);

    beforeSwap();
    expect(scopes[0].reverted).toBe(1);
  });

  it('does not run a late-registered page on a different page, but runs it on a later visit', () => {
    const motion = lifecycle();
    pageKey = 'about';
    pageLoad();
    motion.registerPage('home', setup('hero'));
    expect(runs).toEqual([]);

    beforeSwap();
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['hero']);
  });

  it('does not run anything registered between a swap and the next page-load', () => {
    const motion = lifecycle();
    pageKey = 'home';
    pageLoad();
    beforeSwap();
    motion.registerGlobal(setup('late-global'));
    motion.registerPage('home', setup('late-page'));
    expect(runs).toEqual([]);
  });

  it('ignores a second registration for the same page key', () => {
    const motion = lifecycle();
    motion.registerPage('home', setup('hero'));
    motion.registerPage('home', setup('hero-duplicate'));
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['hero']);
  });

  it('keeps running later setups when one throws', () => {
    const motion = lifecycle();
    motion.registerGlobal(throwingSetup('setup failed'));
    motion.registerGlobal(setup('reveal'));
    motion.registerPage('home', setup('hero'));
    pageKey = 'home';
    pageLoad();
    expect(runs).toEqual(['reveal', 'hero']);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('setup failed');
  });

  it('reverts every scope even if one revert throws', () => {
    // Use a custom createScope that makes the first scope's revert throw
    let callCount = 0;
    const customCreateScope = (setup: MotionSetup): FakeScope => {
      const scope =
        callCount === 0
          ? createScopeWithThrowingRevert(setup)
          : createScope(setup);
      callCount += 1;
      return scope;
    };
    const motion = lifecycle(customCreateScope);
    motion.registerGlobal(setup('reveal'));
    motion.registerPage('home', setup('hero'));
    pageKey = 'home';
    pageLoad();

    // Both scopes should be reverted, even though the first throws
    beforeSwap();
    expect(scopes[0].reverted).toBe(1);
    expect(scopes[1].reverted).toBe(1);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('revert failed');

    // Scopes should be cleared, so a second page load must not try to revert the old scopes
    pageLoad();
    expect(scopes[0].reverted).toBe(1); // still 1, not 2
    expect(scopes[1].reverted).toBe(1); // still 1, not 2
  });

  it('runs a global registered after page-load immediately', () => {
    const motion = lifecycle();
    pageLoad();
    motion.registerGlobal(setup('late-global'));
    expect(runs).toEqual(['late-global']);

    beforeSwap();
    expect(scopes[0].reverted).toBe(1);
  });
});
