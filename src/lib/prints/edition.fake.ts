import type { EditionCounter, EditionStore } from './edition';

type Doc = { _id: string; [k: string]: unknown };

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const clone = (c: EditionCounter): EditionCounter => ({ ...c, reservations: c.reservations.map((r) => ({ ...r })) });

// In-memory stand-in for Sanity: revision check on save, `_id` uniqueness for `create`
// in the same atomic step, and a yield on every call so concurrent callers interleave.
export function createFakeStore(initial: EditionCounter[] = []) {
  const counters = new Map(initial.map((c) => [c.id, clone(c)]));
  const created = new Map<string, Doc>();
  let revs = 0;
  const nextRev = () => `rev-${++revs}`;

  const store: EditionStore & { created: Map<string, Doc> } = {
    created,

    async load(id) {
      await tick();
      if (!counters.has(id)) counters.set(id, { id, rev: nextRev(), sold: 0, reservations: [] });
      return clone(counters.get(id)!);
    },

    async save(next, ifRev, create) {
      await tick();
      const current = counters.get(next.id);
      if (!current || current.rev !== ifRev) return 'conflict';
      if (create && created.has(create._id)) return 'exists';
      counters.set(next.id, { ...clone(next), rev: nextRev() });
      if (create) created.set(create._id, { ...create });
      return 'ok';
    },
  };
  return store;
}
