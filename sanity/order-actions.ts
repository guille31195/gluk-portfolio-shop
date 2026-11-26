import type { DocumentActionComponent } from 'sanity';

// Orders and edition counters are written by the checkout functions; Studio never
// creates, copies, deletes or rolls them back to an earlier revision.
const BLOCKED_ORDER_ACTIONS = new Set(['delete', 'duplicate', 'unpublish', 'restore']);

export const allowedOrderActions = (prev: DocumentActionComponent[]) =>
  prev.filter((action) => !BLOCKED_ORDER_ACTIONS.has(action.action ?? ''));
