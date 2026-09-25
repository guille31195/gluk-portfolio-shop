# CLAUDE.md — Gluk Portfolio & Shop

## Project

A custom-built portfolio and e-commerce website for the artist Gluk (Guillermo Carrasquero), showcasing oil painting, tattoo art, sculpture, and mixed media work. The site doubles as a portfolio (for viewing and inquiring about original pieces) and a storefront for direct print sales — the priority is generating real sales from prints.

## Key Context

- Existing brand kit already exists (logo, colors, fonts) — all site design must stay coherent with it.
- Platform decision: a custom-built static/hybrid site (Astro or Next.js) with Stripe handling checkout, deployed on Vercel or Netlify. Chosen over Shopify/Etsy to avoid recurring platform fees and keep full control over brand-coherent design.
- Original work and prints are sold through the same site — originals likely via inquiry/direct sale, prints via e-commerce checkout (exact flow TBD).

## Data Sources

| System / File | Data | Format |
|---------------|------|--------|
| Google Photos | Artwork photos (subset) | Images, TBD which are canonical |
| Laptop storage | Artwork photos (subset) | Images, TBD |
| External hard drives | Artwork photos (subset) | Images, TBD |
| Brand kit | Logo, color palette, fonts | TBD (files not yet inventoried) |

## Milestones

1. Decide final tech stack and confirm platform approach (Astro/Next.js + Stripe) — done, pending validation.
2. Inventory and select artwork photos to use as launch content (ties into `data/raw/` pipeline).
3. Build core portfolio pages using brand kit assets.
4. Integrate Stripe checkout for print sales.
5. Deploy and launch v1.

## Rules

- Language: English (comments, variable names, and output).
- Data files → `data/`; scripts → `scripts/`; generated reports → `reports/`; documentation → `docs/`.
- Explain what you're doing and why before writing code.
- Ask before complex tasks — don't assume.
- Maintain strict brand design coherence (colors, fonts, logo usage) across every page and asset generated.
- Brand coherence means the brand book's actual visual language (logo files, color usage, layout system such as "The Rupture"), not just color/font tokens in a CSS file. Every plan that touches UI must name which brand-book elements it applies, and verification of UI work must include a visual comparison against the brand book (screenshots side by side) before calling it done. Never hand Guillermo a "check the site" list that only covers mechanics. (Learned 2026-09-23: scaffold + GSAP plans shipped a generic-looking site with only tokens wired.)
- Design restraint: "avant-garde" means elegance with one deliberate violent gesture — few elements, extreme scale contrast, precise grid placement, generous negative space. Never clutter a layout with tags, stickers, "fig." captions, pull-quotes or decorative labels. Never invent copy, slogans or phrases in Guillermo's voice from nothing. Copy must come from the brand book (mangomartinez.com/gluk), his `BIO.pdf` (`Desktop/GLUCK Branding/DOSSIER'S/BIO.pdf`), or text he provides. Short lines adapted from the BIO are allowed, but offer several options and let him choose before anything ships; mark anything else as a placeholder. (Learned 2026-09-23: a "collage" hero with invented Spanish slogans and tags was rejected as cheesy. 2026-09-24: he asked for BIO-based rewrites and chose the hero ÓLEO / TINTA / CÓDIGO + "Oil, ink and code, put in friction." from a list of options.)

## Where My Notes Live

- **Vault:** `C:/Users/Guillermo/Documents/gluk/`
- **Project brief:** `C:/Users/Guillermo/Documents/gluk/01 PROJECTS/Gluk Portfolio & Shop/Gluk Portfolio & Shop.md`
- **AIAC Journey brief:** `C:/Users/Guillermo/Documents/gluk/01 PROJECTS/AI Acceleration/Guillermo/AI Acceleration Club - Guillermo Journey.md`

Read the project brief before any non-trivial work in this repo. At the end of a
session, log what was accomplished back to the brief's Log table.
