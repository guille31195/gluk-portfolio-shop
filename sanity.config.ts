import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';
import { structure } from './sanity/structure';

export default defineConfig({
  name: 'default',
  title: 'Gluk Portfolio & Shop',
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
  dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
  },
});
