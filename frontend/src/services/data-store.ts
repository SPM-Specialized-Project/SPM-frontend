export type DataEntity = {
  id: string;
};

export type DataStore<T extends DataEntity> = {
  getSnapshot: () => readonly T[];
  list: () => T[];
  replaceAll: (records: readonly T[]) => void;
  getById: (id: string) => T | undefined;
  create: (record: T) => T;
  update: (id: string, patch: Partial<T>) => T | undefined;
  upsert: (record: T) => T;
  remove: (id: string) => boolean;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
};

const clone = <T>(value: T): T => structuredClone(value);

export function createDataStore<T extends DataEntity>(seed: readonly T[]): DataStore<T> {
  const initial = clone([...seed]);
  let snapshot = clone(initial);
  const listeners = new Set<() => void>();

  const publish = () => listeners.forEach((listener) => listener());
  const replace = (next: T[]) => {
    snapshot = clone(next);
    publish();
  };

  return {
    getSnapshot: () => snapshot,
    list: () => clone(snapshot),
    replaceAll: (records) => replace([...records]),
    getById: (id) => {
      const record = snapshot.find((item) => item.id === id);
      return record ? clone(record) : undefined;
    },
    create: (record) => {
      const next = clone(record);
      replace([...snapshot, next]);
      return clone(next);
    },
    update: (id, patch) => {
      const current = snapshot.find((item) => item.id === id);
      if (!current) return undefined;
      const updated = { ...current, ...clone(patch) } as T;
      replace(snapshot.map((item) => (item.id === id ? updated : item)));
      return clone(updated);
    },
    upsert: (record) => {
      const next = clone(record);
      const exists = snapshot.some((item) => item.id === next.id);
      replace(
        exists
          ? snapshot.map((item) => (item.id === next.id ? next : item))
          : [...snapshot, next],
      );
      return clone(next);
    },
    remove: (id) => {
      const next = snapshot.filter((item) => item.id !== id);
      if (next.length === snapshot.length) return false;
      replace(next);
      return true;
    },
    reset: () => replace(initial),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type RemoteDataSource<T extends DataEntity> = {
  list: () => Promise<readonly T[]>;
  create?: (record: T) => Promise<T>;
  update?: (id: string, patch: Partial<T>) => Promise<T | undefined>;
  remove?: (id: string) => Promise<boolean>;
};

export function createRemoteDataStore<T extends DataEntity>(
  seed: readonly T[],
  source: RemoteDataSource<T>,
): DataStore<T> & { refresh: () => Promise<void> } {
  const local = createDataStore(seed);

  const sync = (task: Promise<T | undefined> | Promise<boolean> | undefined) => {
    void task
      ?.then((remote) => {
        if (typeof remote === 'object' && remote !== null && 'id' in remote) {
          local.upsert(remote as T);
        }
      })
      .catch((error: unknown) => {
        console.error('Remote data operation failed.', error);
      });
  };

  return {
    ...local,
    refresh: async () => local.replaceAll(await source.list()),
    create: (record) => {
      const created = local.create(record);
      sync(source.create?.(created));
      return created;
    },
    update: (id, patch) => {
      const updated = local.update(id, patch);
      if (updated) sync(source.update?.(id, patch));
      return updated;
    },
    remove: (id) => {
      const removed = local.remove(id);
      if (removed) sync(source.remove?.(id));
      return removed;
    },
  };
}
