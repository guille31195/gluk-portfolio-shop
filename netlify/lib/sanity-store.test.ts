import { ClientError, type SanityClient } from '@sanity/client';
import { describe, expect, it } from 'vitest';
import { createSanityEditionStore } from './sanity-store';

const ID = 'edition-la-espera-large';
const ORDER = { _id: 'order-cs_test_1', _type: 'order', editionNumber: 3 };

type Doc = { _id: string; [k: string]: unknown };
type Op = { patch: { id: string; ops: Record<string, unknown> } } | { create: Doc };

// Same constructor input the client's requester passes on a non-2xx response.
const httpError = (statusCode: number, error: unknown) =>
  new ClientError({ statusCode, body: { error }, headers: {}, url: 'https://x.api.sanity.io/mutate', method: 'POST' });

const revisionMismatch = () =>
  httpError(409, {
    type: 'mutationError',
    description: `The mutation(s) failed: Document "${ID}" has unexpected revision ID ("r2"), blocking mutation from being applied`,
    items: [{ error: { type: 'conflictingRevisionError', id: ID, description: `Document "${ID}" has unexpected revision ID ("r2")` }, index: 0 }],
  });

const duplicateId = () =>
  httpError(409, {
    type: 'mutationError',
    description: `The mutation(s) failed: Document by ID "${ORDER._id}" already exists`,
    items: [{ error: { type: 'documentAlreadyExistsError', id: ORDER._id, description: `Document by ID "${ORDER._id}" already exists` }, index: 1 }],
  });

function stubClient(docs: Record<string, Doc> = {}, commitError?: Error) {
  const committed: Op[][] = [];
  const created: Doc[] = [];
  const client = {
    async getDocument(id: string) {
      return docs[id];
    },
    async createIfNotExists(doc: Doc) {
      created.push(doc);
      docs[doc._id] ??= { ...doc, _rev: 'r-new' };
      return docs[doc._id];
    },
    transaction() {
      const ops: Op[] = [];
      const tx = {
        patch(id: string, patchOps: Record<string, unknown>) {
          ops.push({ patch: { id, ops: patchOps } });
          return tx;
        },
        create(doc: Doc) {
          ops.push({ create: doc });
          return tx;
        },
        async commit() {
          if (commitError) throw commitError;
          committed.push(ops);
          return { transactionId: 't1', results: [] };
        },
      };
      return tx;
    },
  };
  return { client: client as unknown as SanityClient, committed, created };
}

const counterDoc = (sold: number) => ({
  _id: ID,
  _type: 'printEdition',
  _rev: 'r1',
  sold,
  reservations: [{ _key: 'res-1', reservationId: 'res-1', expiresAt: '2026-10-26T12:30:00.000Z' }],
});

describe('createSanityEditionStore', () => {
  it('loads an existing counter with its revision', async () => {
    const { client, created } = stubClient({ [ID]: counterDoc(4) });
    const counter = await createSanityEditionStore(client).load(ID);
    expect(counter).toEqual({
      id: ID,
      rev: 'r1',
      sold: 4,
      reservations: [{ reservationId: 'res-1', expiresAt: '2026-10-26T12:30:00.000Z' }],
    });
    expect(created).toEqual([]);
  });

  it('creates a missing counter with createIfNotExists', async () => {
    const { client, created } = stubClient();
    const counter = await createSanityEditionStore(client).load(ID);
    expect(created).toEqual([{ _id: ID, _type: 'printEdition', sold: 0, reservations: [] }]);
    expect(counter).toEqual({ id: ID, rev: 'r-new', sold: 0, reservations: [] });
  });

  it('saves the counter and the order in one transaction guarded by ifRevisionID', async () => {
    const { client, committed } = stubClient({ [ID]: counterDoc(4) });
    const next = { id: ID, rev: 'r1', sold: 5, reservations: [{ reservationId: 'res-2', expiresAt: '2026-10-26T13:00:00.000Z' }] };
    expect(await createSanityEditionStore(client).save(next, 'r1', ORDER)).toBe('ok');
    expect(committed).toEqual([
      [
        {
          patch: {
            id: ID,
            ops: {
              ifRevisionID: 'r1',
              set: { sold: 5, reservations: [{ _key: 'res-2', reservationId: 'res-2', expiresAt: '2026-10-26T13:00:00.000Z' }] },
            },
          },
        },
        { create: ORDER },
      ],
    ]);
  });

  it('saves without an order when there is nothing to create', async () => {
    const { client, committed } = stubClient({ [ID]: counterDoc(4) });
    expect(await createSanityEditionStore(client).save({ id: ID, rev: 'r1', sold: 4, reservations: [] }, 'r1')).toBe('ok');
    expect(committed[0]).toHaveLength(1);
  });

  it("maps a 409 revision mismatch to 'conflict'", async () => {
    const { client } = stubClient({ [ID]: counterDoc(4) }, revisionMismatch());
    expect(await createSanityEditionStore(client).save({ id: ID, rev: 'r1', sold: 5, reservations: [] }, 'r1', ORDER)).toBe(
      'conflict',
    );
  });

  it("maps a 409 duplicate _id to 'exists'", async () => {
    const { client } = stubClient({ [ID]: counterDoc(4) }, duplicateId());
    expect(await createSanityEditionStore(client).save({ id: ID, rev: 'r1', sold: 5, reservations: [] }, 'r1', ORDER)).toBe(
      'exists',
    );
  });

  it('rethrows any other error', async () => {
    const serverDown = httpError(503, { description: 'Service unavailable' });
    const { client } = stubClient({ [ID]: counterDoc(4) }, serverDown);
    await expect(
      createSanityEditionStore(client).save({ id: ID, rev: 'r1', sold: 5, reservations: [] }, 'r1', ORDER),
    ).rejects.toBe(serverDown);
  });

  it('reports whether a document exists', async () => {
    const { client } = stubClient({ [ORDER._id]: ORDER });
    const store = createSanityEditionStore(client);
    expect(await store.exists(ORDER._id)).toBe(true);
    expect(await store.exists('order-cs_test_2')).toBe(false);
  });
});
