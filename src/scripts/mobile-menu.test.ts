// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Mirrors the BaseLayout + Nav structure the menu script binds to.
const PAGE = `
  <header class="site-nav">
    <a class="brand" href="/">GLUK</a>
    <nav class="nav-desktop"><a href="/portfolio">Work</a></nav>
    <button type="button" aria-expanded="false" data-menu-toggle hidden><span data-menu-label>Menu</span></button>
    <div data-mobile-menu hidden><a href="/portfolio">Work</a></div>
  </header>
  <main><a href="/x">Content</a></main>
  <footer><a href="/y">Footer</a></footer>
`;

const BACKGROUND = ['main', 'footer', '.brand', '.nav-desktop'];
const toggle = () => document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
const inertFlags = () => BACKGROUND.map((sel) => document.querySelector(sel)!.hasAttribute('inert'));

beforeAll(async () => {
  await import('./mobile-menu');
});

beforeEach(() => {
  document.dispatchEvent(new Event('astro:before-swap'));
  document.body.innerHTML = PAGE;
  document.dispatchEvent(new Event('astro:page-load'));
});

describe('mobile menu', () => {
  it('makes everything behind the open menu inert', () => {
    toggle().click();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(inertFlags()).toEqual([true, true, true, true]);
  });

  it('keeps the toggle and the menu itself interactive', () => {
    toggle().click();
    expect(toggle().hasAttribute('inert')).toBe(false);
    expect(document.querySelector('[data-mobile-menu]')!.hasAttribute('inert')).toBe(false);
    expect(document.querySelector('.site-nav')!.hasAttribute('inert')).toBe(false);
  });

  it('restores the page when closed with the toggle', () => {
    toggle().click();
    toggle().click();
    expect(inertFlags()).toEqual([false, false, false, false]);
  });

  it('restores the page and returns focus when closed with Escape', () => {
    toggle().click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(inertFlags()).toEqual([false, false, false, false]);
    expect(document.activeElement).toBe(toggle());
  });

  it('restores the page when navigating away with the menu open', () => {
    toggle().click();
    document.dispatchEvent(new Event('astro:before-swap'));
    expect(inertFlags()).toEqual([false, false, false, false]);
  });
});
