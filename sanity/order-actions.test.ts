import { describe, expect, it } from 'vitest';
import type { DocumentActionComponent } from 'sanity';
import { allowedOrderActions } from './order-actions';

const action = (name: string) => Object.assign((() => null) as unknown as DocumentActionComponent, { action: name });

describe('allowedOrderActions', () => {
  it('blocks delete, duplicate, unpublish and history restore on orders and counters', () => {
    const prev = ['publish', 'delete', 'duplicate', 'unpublish', 'restore', 'discardChanges'].map(action);
    expect(allowedOrderActions(prev).map((a) => a.action)).toEqual(['publish', 'discardChanges']);
  });
});
