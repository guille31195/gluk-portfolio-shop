import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { ordersSchemaTypes, schemaTypes } from './sanity/schemaTypes';
import { ordersStructure, structure } from './sanity/structure';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || '48jkcmcb';

// Orders are created by the checkout functions; Studio never creates, copies or deletes them.
const BLOCKED_ORDER_ACTIONS = new Set(['delete', 'duplicate', 'unpublish']);

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
      actions: (prev) => prev.filter((action) => !BLOCKED_ORDER_ACTIONS.has(action.action ?? '')),
      newDocumentOptions: () => [],
    },
  },
]);
