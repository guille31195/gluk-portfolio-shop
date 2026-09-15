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

## Where My Notes Live

- **Vault:** `C:/Users/Guillermo/Documents/gluk/`
- **Project brief:** `C:/Users/Guillermo/Documents/gluk/01 PROJECTS/Gluk Portfolio & Shop/Gluk Portfolio & Shop.md`
- **AIAC Journey brief:** `C:/Users/Guillermo/Documents/gluk/01 PROJECTS/AI Acceleration/Guillermo/AI Acceleration Club - Guillermo Journey.md`

Read the project brief before any non-trivial work in this repo. At the end of a
session, log what was accomplished back to the brief's Log table.
