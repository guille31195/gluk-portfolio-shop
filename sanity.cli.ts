import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb',
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
  },
  studioHost: 'gluk-studio',
  deployment: {
    appId: 'olma86rfi2kh7w785hml0nzy',
  },
});
