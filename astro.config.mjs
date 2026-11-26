import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import sanity from '@sanity/astro';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  ''
);

export default defineConfig({
  site: 'https://glukart.com',
  vite: {
    // Dev only: the print block reads live stock, which `astro dev` does not serve.
    // Read-only; checkout is deliberately not proxied.
    server: { proxy: { '/api/stock': { target: 'https://glukart.com', changeOrigin: true } } },
  },
  integrations: [
    react(),
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
      dataset: PUBLIC_SANITY_DATASET || 'production',
      useCdn: false,
      apiVersion: '2026-09-16',
    }),
  ],
});
