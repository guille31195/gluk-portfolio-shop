import type { SanityClient } from '@sanity/client';
import type { EditionCounter, EditionStore, Reservation } from '../../src/lib/prints/edition';

type CounterDoc = { _id: string; _rev: string; sold: number; reservations?: (Reservation & { _key: string })[] };
type MutationErrorItem = { error?: { type?: string } };

// Content Lake answers both a failed ifRevisionID and a duplicate create with HTTP 409;
// only the item type (or message) tells them apart.
function isDuplicateId(err: { message?: unknown; responseBody?: unknown; details?: unknown }): boolean {
  const items = (err.details as { items?: MutationErrorItem[] } | undefined)?.items ?? [];
  if (items.some((item) => item.error?.type === 'documentAlreadyExistsError')) return true;
  if (typeof err.responseBody === 'string' && err.responseBody.includes('documentAlreadyExistsError')) return true;
  return typeof err.message === 'string' && /Document by ID .* already exists/.test(err.message);
}

function toCounter(doc: CounterDoc): EditionCounter {
  const reservations = (doc.reservations ?? []).map(({ reservationId, expiresAt }) => ({ reservationId, expiresAt }));
  return { id: doc._id, rev: doc._rev, sold: doc.sold, reservations };
}

export function createSanityEditionStore(client: SanityClient): EditionStore {
  return {
    async load(id) {
      let doc = await client.getDocument<CounterDoc>(id);
      if (!doc) {
        await client.createIfNotExists({ _id: id, _type: 'printEdition', sold: 0, reservations: [] });
        doc = await client.getDocument<CounterDoc>(id);
      }
      if (!doc) throw new Error(`Edition ${id}: counter could not be created`);
      return toCounter(doc);
    },

    async save(next, ifRev, create) {
      const reservations = next.reservations.map((r) => ({ _key: r.reservationId, ...r }));
      const tx = client.transaction().patch(next.id, { ifRevisionID: ifRev, set: { sold: next.sold, reservations } });
      if (create) tx.create({ _type: 'order', ...create });
      try {
        await tx.commit();
        return 'ok';
      } catch (err) {
        const e = err as { statusCode?: unknown };
        if (e?.statusCode !== 409) throw err;
        return isDuplicateId(err as object) ? 'exists' : 'conflict';
      }
    },

    async exists(id) {
      return (await client.getDocument(id)) != null;
    },
  };
}
