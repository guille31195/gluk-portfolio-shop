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

function setup(name: string): MotionSetup {
  return () => {
    runs.push(name);
  };
}

function lifecycle() {
  return createLifecycle({ events, getPageKey: () => pageKey, createScope });
}

const pageLoad = () => events.dispatchEvent(new Event(PAGE_LOAD_EVENT));
const beforeSwap = () => events.dispatchEvent(new Event(BEFORE_SWAP_EVENT));

beforeEach(() => {
  events = new EventTarget();
  pageKey = null;
  scopes = [];
  runs = [];
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
});
