# Astro Scaffold & Brand Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working, brand-styled, statically-routed Astro site with placeholder content for every planned page — no CMS, animation, or checkout yet — so the site skeleton is real, buildable, and browsable end to end.

**Architecture:** Astro project at the repo root (existing `docs/`, `data/`, `scripts/`, `reports/` untouched), React integration installed but unused until a later plan needs interactivity, brand tokens (color/type) centralized in one CSS file sourced from `docs/brand-kit/`, and a local placeholder data module shaped exactly like the future Sanity `artwork` schema so the CMS plan can swap it in without changing any page component's interface.

**Tech Stack:** Astro 5, `@astrojs/react`, TypeScript (strict), Vitest (for pure logic utilities only — no framework needed for static markup per the spec).

**Spec:** `docs/superpowers/specs/2026-09-16-site-scaffold-design.md`

## Global Constraints

- Brand colors (from `docs/brand-kit/README.md`): Blue `#0C89D5`, Deep Blue `#011458`, Black `#1E1619`, Orange `#C34F05`.
- Typography: Archivo (display/headings, 800 weight) and Karla (body) — both Google Fonts.
- Public artist name is "GLUK" (site copy, nav, page titles) — "Guillermo Carrasquero" only in formal/bio contexts.
- Routes to scaffold (placeholder content only in this plan): `/`, `/portfolio`, `/portfolio/[medium]`, `/artwork/[slug]`, `/about`, `/tattoo`, `/journal`, `/journal/[slug]`, `/contact`.
- No separate "Shop" section — prints are surfaced on the artwork detail page (per spec).
- This plan does NOT wire up Sanity, GSAP animation, or the Stripe Checkout function — those are separate follow-up plans. Placeholder data must match the spec's `artwork` schema shape so later plans can swap the data source without touching page components.

---

## File Structure

```
package.json               — deps: astro, @astrojs/react, react, react-dom, gsap; devDeps: typescript, vitest
astro.config.mjs           — Astro config with React integration
tsconfig.json              — strict TS config
.gitignore                 — add dist/, .astro/
src/
  styles/
    theme.css              — brand CSS custom properties + font-face imports
  layouts/
    BaseLayout.astro        — shared <head>, Nav, Footer, slot for page content
  components/
    Nav.astro               — top nav linking all routes
    Footer.astro             — simple footer
  data/
    placeholder-artworks.ts — Artwork/Medium/PrintOption types + demo data
    placeholder-artworks.test.ts — Vitest tests for getArtworksByMedium
    format-price.ts         — formatPrice(cents) -> "$45.00"
    format-price.test.ts    — Vitest tests for formatPrice
    placeholder-journal.ts  — JournalPost type + demo data
  pages/
    index.astro
    about.astro
    tattoo.astro
    contact.astro
    portfolio/
      index.astro
      [medium].astro
    artwork/
      [slug].astro
    journal/
      index.astro
      [slug].astro
public/
  favicon.png               — copied from docs/brand-kit/logo/favicon.png
  placeholder-artwork.svg   — simple placeholder graphic for artwork cards
netlify.toml                — build command + publish dir
```

---

### Task 1: Initialize the Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro` (temporary placeholder, replaced in Task 4)
- Modify: `.gitignore`

**Interfaces:**
- Produces: a working `npm run build` / `npm run dev` / `npm run check` / `npm run test` script surface every later task relies on.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gluk-portfolio-shop",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.1.0",
    "@astrojs/react": "^4.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "gsap": "^3.12.5"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create a temporary placeholder `src/pages/index.astro`**

```astro
---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Gluk</title>
  </head>
  <body>
    <h1>Gluk Portfolio &amp; Shop</h1>
  </body>
</html>
```

- [ ] **Step 5: Add build artifacts to `.gitignore`**

Append to the existing `.gitignore`:
```
dist/
.astro/
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: completes with no errors, creates `package-lock.json` and `node_modules/` (already gitignored).

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: exits 0, creates `dist/index.html` containing the text `Gluk Portfolio & Shop`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/pages/index.astro .gitignore
git commit -m "Initialize Astro project with React integration"
```

---

### Task 2: Brand theme tokens

**Files:**
- Create: `src/styles/theme.css`

**Interfaces:**
- Produces: CSS custom properties `--color-blue`, `--color-deep-blue`, `--color-black`, `--color-orange`, `--font-display`, `--font-body`, consumed by every layout/component from Task 3 onward.

- [ ] **Step 1: Write a check that the token file doesn't exist yet**

Run: `grep -c "0C89D5" src/styles/theme.css`
Expected: FAIL — `src/styles/theme.css: No such file or directory`

- [ ] **Step 2: Create `src/styles/theme.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@800&family=Karla:wght@400;700&display=swap');

:root {
  --color-blue: #0C89D5;
  --color-deep-blue: #011458;
  --color-black: #1E1619;
  --color-orange: #C34F05;

  --font-display: 'Archivo', sans-serif;
  --font-body: 'Karla', sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #fff;
  color: var(--color-black);
  font-family: var(--font-body);
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 800;
  margin: 0 0 0.5em;
}

a {
  color: var(--color-blue);
}
```

- [ ] **Step 3: Verify the tokens are present**

Run: `grep -c "0C89D5" src/styles/theme.css`
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css
git commit -m "Add brand theme tokens (colors, Archivo/Karla typography)"
```

---

### Task 3: Base layout, nav, and footer

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`
- Modify: `src/pages/index.astro` (use the new layout instead of raw HTML)

**Interfaces:**
- Consumes: `src/styles/theme.css` (Task 2)
- Produces: `BaseLayout.astro` accepting a `title: string` prop and a default slot, used by every page in Tasks 4-8.

- [ ] **Step 1: Create `src/components/Nav.astro`**

```astro
---
const links = [
  { href: '/', label: 'Home' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/about', label: 'About' },
  { href: '/tattoo', label: 'Tattoo' },
  { href: '/journal', label: 'Journal' },
  { href: '/contact', label: 'Contact' },
];
---
<nav class="site-nav">
  <a class="brand" href="/">GLUK</a>
  <ul>
    {links.map((link) => (
      <li><a href={link.href}>{link.label}</a></li>
    ))}
  </ul>
</nav>

<style>
  .site-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
  }
  .brand {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.25rem;
    text-decoration: none;
    color: var(--color-black);
  }
  .site-nav ul {
    display: flex;
    gap: 1.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .site-nav a {
    text-decoration: none;
    color: var(--color-black);
  }
  .site-nav a:hover {
    color: var(--color-blue);
  }
</style>
```

- [ ] **Step 2: Create `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <p>&copy; {year} GLUK. All rights reserved.</p>
</footer>

<style>
  .site-footer {
    padding: 2rem;
    text-align: center;
    color: var(--color-black);
    font-size: 0.875rem;
  }
</style>
```

- [ ] **Step 3: Create `src/layouts/BaseLayout.astro`**

```astro
---
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import '../styles/theme.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.png" />
    <title>{title} — GLUK</title>
  </head>
  <body>
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 4: Update `src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <h1>Gluk Portfolio &amp; Shop</h1>
</BaseLayout>
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: exits 0, `dist/index.html` contains both `GLUK` (nav brand) and `Gluk Portfolio &amp; Shop` (or its rendered form).

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Nav.astro src/components/Footer.astro src/pages/index.astro
git commit -m "Add BaseLayout, Nav, and Footer components"
```

---

### Task 4: Home page content

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `BaseLayout` (Task 3)

- [ ] **Step 1: Replace the placeholder Home page with real hero content**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <section class="hero">
    <h1>GLUK</h1>
    <p class="tagline">Precise, streetwise images about Caribbean identity, memory and power.</p>
  </section>
</BaseLayout>

<style>
  .hero {
    padding: 6rem 2rem;
    text-align: center;
  }
  .hero h1 {
    font-size: 4rem;
  }
  .tagline {
    font-family: var(--font-body);
    font-size: 1.25rem;
    max-width: 40ch;
    margin: 0 auto;
  }
</style>
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: exits 0, `dist/index.html` contains `Caribbean identity`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "Add Home page hero content"
```

---

### Task 5: About, Tattoo, and Contact pages

**Files:**
- Create: `src/pages/about.astro`, `src/pages/tattoo.astro`, `src/pages/contact.astro`

**Interfaces:**
- Consumes: `BaseLayout` (Task 3)

- [ ] **Step 1: Create `src/pages/about.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="About">
  <section class="page">
    <h1>About GLUK</h1>
    <p>
      GLUK (Guillermo Carrasquero) is a plastic artist working across oil
      painting, tattoo art, sculpture, and mixed media, exploring Caribbean
      identity, memory, and power.
    </p>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/tattoo.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Tattoo">
  <section class="page">
    <h1>Tattoo</h1>
    <p>
      Studio info, booking process, and flash — details coming soon.
    </p>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
</style>
```

- [ ] **Step 3: Create `src/pages/contact.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Contact">
  <section class="page">
    <h1>Contact</h1>
    <form name="contact" method="POST" data-netlify="true">
      <input type="hidden" name="form-name" value="contact" />
      <label>
        Name
        <input type="text" name="name" required />
      </label>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <label>
        Message
        <textarea name="message" required></textarea>
      </label>
      <button type="submit">Send</button>
    </form>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-family: var(--font-body);
  }
  button {
    align-self: flex-start;
    padding: 0.75rem 1.5rem;
    background: var(--color-blue);
    color: #fff;
    border: none;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: exits 0, `dist/about/index.html`, `dist/tattoo/index.html`, `dist/contact/index.html` all exist. Confirm with: `ls dist/about dist/tattoo dist/contact`

- [ ] **Step 5: Commit**

```bash
git add src/pages/about.astro src/pages/tattoo.astro src/pages/contact.astro
git commit -m "Add About, Tattoo, and Contact pages"
```

---

### Task 6: Placeholder artwork data, medium filter utility, and Portfolio pages

**Files:**
- Create: `src/data/placeholder-artworks.ts`, `src/data/placeholder-artworks.test.ts`, `public/placeholder-artwork.svg`, `src/pages/portfolio/index.astro`, `src/pages/portfolio/[medium].astro`

**Interfaces:**
- Produces: `Medium` type (`'oil-painting' | 'tattoo' | 'sculpture' | 'mixed-media'`), `PrintOption` interface (`{ size: string; price: number; stripePriceId: string }`), `Artwork` interface (`{ slug, title, medium, year, dimensions, description, image, availableAsOriginal, printOptions }`), `getArtworksByMedium(artworks: Artwork[], medium: Medium): Artwork[]`, and the exported `artworks: Artwork[]` demo array. Task 7 and any later Sanity-integration plan must match this exact shape.

- [ ] **Step 1: Create the placeholder artwork graphic**

```bash
cat > public/placeholder-artwork.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="#1E1619"/>
  <text x="300" y="400" fill="#0C89D5" font-family="sans-serif" font-size="24" text-anchor="middle">GLUK — image coming soon</text>
</svg>
EOF
```

- [ ] **Step 2: Write the failing test for `getArtworksByMedium`**

Create `src/data/placeholder-artworks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { artworks, getArtworksByMedium } from './placeholder-artworks';

describe('getArtworksByMedium', () => {
  it('returns only artworks matching the given medium', () => {
    const result = getArtworksByMedium(artworks, 'sculpture');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((a) => a.medium === 'sculpture')).toBe(true);
  });

  it('returns an empty array when no artworks match', () => {
    const result = getArtworksByMedium([], 'oil-painting');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm run test`
Expected: FAIL — `Cannot find module './placeholder-artworks'`

- [ ] **Step 4: Create `src/data/placeholder-artworks.ts`**

```ts
export type Medium = 'oil-painting' | 'tattoo' | 'sculpture' | 'mixed-media';

export interface PrintOption {
  size: string;
  price: number; // cents, USD
  stripePriceId: string;
}

export interface Artwork {
  slug: string;
  title: string;
  medium: Medium;
  year: number;
  dimensions: string;
  description: string;
  image: string;
  availableAsOriginal: boolean;
  printOptions: PrintOption[];
}

export const artworks: Artwork[] = [
  {
    slug: 'placeholder-oil-1',
    title: 'Placeholder Oil Painting',
    medium: 'oil-painting',
    year: 2026,
    dimensions: '60 x 90 cm, oil on canvas',
    description: 'Placeholder description — real artwork content pending.',
    image: '/placeholder-artwork.svg',
    availableAsOriginal: true,
    printOptions: [
      { size: '12x18 in', price: 4500, stripePriceId: 'price_placeholder_1' },
    ],
  },
  {
    slug: 'placeholder-tattoo-1',
    title: 'Placeholder Tattoo Flash',
    medium: 'tattoo',
    year: 2026,
    dimensions: 'N/A',
    description: 'Placeholder description — real artwork content pending.',
    image: '/placeholder-artwork.svg',
    availableAsOriginal: false,
    printOptions: [],
  },
  {
    slug: 'placeholder-sculpture-1',
    title: 'Placeholder Sculpture',
    medium: 'sculpture',
    year: 2026,
    dimensions: '40 x 20 x 20 cm, mixed materials',
    description: 'Placeholder description — real artwork content pending.',
    image: '/placeholder-artwork.svg',
    availableAsOriginal: true,
    printOptions: [],
  },
  {
    slug: 'placeholder-mixed-1',
    title: 'Placeholder Mixed Media Piece',
    medium: 'mixed-media',
    year: 2026,
    dimensions: '50 x 70 cm',
    description: 'Placeholder description — real artwork content pending.',
    image: '/placeholder-artwork.svg',
    availableAsOriginal: true,
    printOptions: [
      { size: '8x10 in', price: 3000, stripePriceId: 'price_placeholder_2' },
    ],
  },
];

export function getArtworksByMedium(list: Artwork[], medium: Medium): Artwork[] {
  return list.filter((artwork) => artwork.medium === medium);
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npm run test`
Expected: PASS — 2 passed

- [ ] **Step 6: Create `src/pages/portfolio/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { artworks } from '../../data/placeholder-artworks';

const mediums = ['oil-painting', 'tattoo', 'sculpture', 'mixed-media'] as const;
---
<BaseLayout title="Portfolio">
  <section class="page">
    <h1>Portfolio</h1>
    <nav class="medium-filter">
      {mediums.map((medium) => (
        <a href={`/portfolio/${medium}`}>{medium.replace('-', ' ')}</a>
      ))}
    </nav>
    <div class="grid">
      {artworks.map((artwork) => (
        <a class="card" href={`/artwork/${artwork.slug}`}>
          <img src={artwork.image} alt={artwork.title} />
          <p>{artwork.title}</p>
        </a>
      ))}
    </div>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
  }
  .medium-filter {
    display: flex;
    gap: 1rem;
    margin: 1rem 0 2rem;
    text-transform: capitalize;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
  .card {
    text-decoration: none;
    color: var(--color-black);
  }
  .card img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
</style>
```

- [ ] **Step 7: Create `src/pages/portfolio/[medium].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { artworks, getArtworksByMedium, type Medium } from '../../data/placeholder-artworks';

export function getStaticPaths() {
  const mediums: Medium[] = ['oil-painting', 'tattoo', 'sculpture', 'mixed-media'];
  return mediums.map((medium) => ({ params: { medium } }));
}

const { medium } = Astro.params as { medium: Medium };
const filtered = getArtworksByMedium(artworks, medium);
---
<BaseLayout title={`Portfolio — ${medium}`}>
  <section class="page">
    <h1>{medium.replace('-', ' ')}</h1>
    <div class="grid">
      {filtered.map((artwork) => (
        <a class="card" href={`/artwork/${artwork.slug}`}>
          <img src={artwork.image} alt={artwork.title} />
          <p>{artwork.title}</p>
        </a>
      ))}
    </div>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    text-transform: capitalize;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.5rem;
  }
  .card {
    text-decoration: none;
    color: var(--color-black);
  }
  .card img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
</style>
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: exits 0. Confirm all four medium pages were statically generated: `ls dist/portfolio/oil-painting dist/portfolio/tattoo dist/portfolio/sculpture dist/portfolio/mixed-media`

- [ ] **Step 9: Commit**

```bash
git add src/data/placeholder-artworks.ts src/data/placeholder-artworks.test.ts public/placeholder-artwork.svg src/pages/portfolio
git commit -m "Add placeholder artwork data and Portfolio pages"
```

---

### Task 7: Price formatting utility and Artwork detail page

**Files:**
- Create: `src/data/format-price.ts`, `src/data/format-price.test.ts`, `src/pages/artwork/[slug].astro`

**Interfaces:**
- Consumes: `Artwork`, `artworks` from `src/data/placeholder-artworks.ts` (Task 6)
- Produces: `formatPrice(cents: number): string`, used by the Artwork detail page and reused by the future Stripe Checkout plan.

- [ ] **Step 1: Write the failing test for `formatPrice`**

Create `src/data/format-price.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './format-price';

describe('formatPrice', () => {
  it('formats whole-dollar cents as USD currency', () => {
    expect(formatPrice(4500)).toBe('$45.00');
  });

  it('formats cents with a fractional dollar amount', () => {
    expect(formatPrice(3099)).toBe('$30.99');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test`
Expected: FAIL — `Cannot find module './format-price'`

- [ ] **Step 3: Create `src/data/format-price.ts`**

```ts
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test`
Expected: PASS — 4 passed (2 from Task 6, 2 new)

- [ ] **Step 5: Create `src/pages/artwork/[slug].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { artworks } from '../../data/placeholder-artworks';
import { formatPrice } from '../../data/format-price';

export function getStaticPaths() {
  return artworks.map((artwork) => ({
    params: { slug: artwork.slug },
    props: { artwork },
  }));
}

const { artwork } = Astro.props;
---
<BaseLayout title={artwork.title}>
  <section class="detail">
    <img src={artwork.image} alt={artwork.title} />
    <div class="info">
      <h1>{artwork.title}</h1>
      <p class="meta">{artwork.year} — {artwork.dimensions}</p>
      <p>{artwork.description}</p>

      {artwork.availableAsOriginal && (
        <a class="button" href="/contact">Inquire about the original</a>
      )}

      {artwork.printOptions.length > 0 && (
        <div class="prints">
          <h2>Available prints</h2>
          <ul>
            {artwork.printOptions.map((option) => (
              <li>
                {option.size} — {formatPrice(option.price)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </section>
</BaseLayout>

<style>
  .detail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 3rem 2rem;
  }
  .detail img {
    width: 100%;
  }
  .meta {
    color: var(--color-deep-blue);
  }
  .button {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-blue);
    color: #fff;
    text-decoration: none;
  }
  .prints ul {
    list-style: none;
    padding: 0;
  }
</style>
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: exits 0. Confirm all four demo artwork pages generated: `ls dist/artwork/placeholder-oil-1 dist/artwork/placeholder-tattoo-1 dist/artwork/placeholder-sculpture-1 dist/artwork/placeholder-mixed-1`

- [ ] **Step 7: Commit**

```bash
git add src/data/format-price.ts src/data/format-price.test.ts src/pages/artwork
git commit -m "Add price formatting utility and Artwork detail page"
```

---

### Task 8: Journal pages, Netlify config, and final verification

**Files:**
- Create: `src/data/placeholder-journal.ts`, `src/pages/journal/index.astro`, `src/pages/journal/[slug].astro`, `netlify.toml`
- Modify: copy `docs/brand-kit/logo/favicon.png` to `public/favicon.png`

**Interfaces:**
- Produces: `JournalPost` interface (`{ slug, title, date, coverImage, body }`) and `journalPosts: JournalPost[]`, for the future Sanity `journalPost` schema to match.

- [ ] **Step 1: Copy the favicon into `public/`**

```bash
cp docs/brand-kit/logo/favicon.png public/favicon.png
```

- [ ] **Step 2: Create `src/data/placeholder-journal.ts`**

```ts
export interface JournalPost {
  slug: string;
  title: string;
  date: string; // ISO 8601
  coverImage: string;
  body: string;
}

export const journalPosts: JournalPost[] = [
  {
    slug: 'placeholder-post-1',
    title: 'Placeholder Journal Post',
    date: '2026-09-16',
    coverImage: '/placeholder-artwork.svg',
    body: 'Placeholder journal content — real posts pending.',
  },
];
```

- [ ] **Step 3: Create `src/pages/journal/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { journalPosts } from '../../data/placeholder-journal';
---
<BaseLayout title="Journal">
  <section class="page">
    <h1>Journal</h1>
    <ul>
      {journalPosts.map((post) => (
        <li>
          <a href={`/journal/${post.slug}`}>{post.title}</a>
          <span> — {post.date}</span>
        </li>
      ))}
    </ul>
  </section>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
  li {
    margin-bottom: 0.75rem;
  }
</style>
```

- [ ] **Step 4: Create `src/pages/journal/[slug].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { journalPosts } from '../../data/placeholder-journal';

export function getStaticPaths() {
  return journalPosts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
---
<BaseLayout title={post.title}>
  <article class="page">
    <h1>{post.title}</h1>
    <p class="meta">{post.date}</p>
    <img src={post.coverImage} alt={post.title} />
    <p>{post.body}</p>
  </article>
</BaseLayout>

<style>
  .page {
    padding: 3rem 2rem;
    max-width: 60ch;
    margin: 0 auto;
  }
  .meta {
    color: var(--color-deep-blue);
  }
  img {
    width: 100%;
  }
</style>
```

- [ ] **Step 5: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

- [ ] **Step 6: Full verification pass**

Run: `npm run check`
Expected: exits 0, no type errors.

Run: `npm run test`
Expected: PASS — 4 passed.

Run: `npm run build`
Expected: exits 0. Confirm every route exists:
```bash
ls dist/index.html dist/about/index.html dist/tattoo/index.html dist/contact/index.html \
   dist/portfolio/index.html dist/journal/index.html dist/journal/placeholder-post-1/index.html
```

- [ ] **Step 7: Commit**

```bash
git add src/data/placeholder-journal.ts src/pages/journal netlify.toml public/favicon.png
git commit -m "Add Journal pages, Netlify config, and favicon"
```

---

## Out of Scope (handled by later plans)

- Sanity CMS integration — will replace `src/data/placeholder-artworks.ts` and `src/data/placeholder-journal.ts` with live data behind the same interfaces.
- GSAP/ScrollTrigger animation layer.
- Stripe Checkout Netlify function and wiring the "Buy print" flow to it.
- Actually connecting this repo to a Netlify site/deployment (requires your Netlify account — a manual step once this plan is done).
- Real artwork photography (canonical photo source still undecided — separate next action).
