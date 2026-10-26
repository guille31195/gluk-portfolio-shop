import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { allowedOrderActions } from './sanity/order-actions';
import { ordersSchemaTypes, schemaTypes } from './sanity/schemaTypes';
import { ordersStructure, structure } from './sanity/structure';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb';

export default defineConfig([
  {
    name: 'default',
    title: 'Gluk Portfolio & Shop',
    basePath: '/production',
    projectId,
    dataset: process.env.PUBLIC_SANITY_DATASET || 'production',
    plugins: [structureTool({ structure })],
    schema: {
      types: schemaTypes,
    },
  },
  {
    name: 'orders',
    title: 'Gluk Orders',
    basePath: '/orders',
    projectId,
    dataset: 'orders',
    plugins: [structureTool({ structure: ordersStructure })],
    schema: {
      types: ordersSchemaTypes,
      templates: () => [],
    },
    document: {
      actions: allowedOrderActions,
      newDocumentOptions: () => [],
    },
  },
]);
