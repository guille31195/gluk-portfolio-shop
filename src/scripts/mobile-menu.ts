// Phone menu: the toggle opens a full-screen numbered index (spec §5.1).
// Re-binds on every page load because the nav is re-rendered per page; the
// document-level listener is removed on swap so listeners never pile up.

// Everything the full-screen menu covers. While it is open these are inert, so
// Tab and screen readers stay inside the menu (the toggle stays reachable).
const BACKGROUND = 'body > main, body > footer, .site-nav .brand, .site-nav .nav-desktop';

function initMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu) return;
  // The toggle ships hidden so phones without JS keep the plain link row.
  toggle.hidden = false;
  const listeners = new AbortController();
  const background = document.querySelectorAll<HTMLElement>(BACKGROUND);

  const setOpen = (open: boolean, returnFocus = false) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    background.forEach((el) => el.toggleAttribute('inert', open));
    if (label) label.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    if (open) menu.querySelector<HTMLElement>('a')?.focus();
    else if (returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    },
    { signal: listeners.signal }
  );
  // Leaving the page: reset state and drop the document listener.
  document.addEventListener(
    'astro:before-swap',
    () => {
      setOpen(false);
      listeners.abort();
    },
    { once: true }
  );
}

document.addEventListener('astro:page-load', initMobileMenu);
