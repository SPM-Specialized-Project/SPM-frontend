export type JsonEntity = {
  id: string;
};

export type JsonDataDriver<T extends JsonEntity> = {
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

const cloneJson = <T>(value: T): T => structuredClone(value);

/**
 * A small in-memory JSON driver used as the boundary between UI and mock data.
 * It deliberately exposes CRUD-like operations so the seed can later be
 * replaced by HTTP calls without changing every component.
 */
export function createJsonDataDriver<T extends JsonEntity>(
  seed: readonly T[],
): JsonDataDriver<T> {
  const initial = cloneJson([...seed]);
  let snapshot = cloneJson(initial);
  const listeners = new Set<() => void>();

  const publish = () => {
    listeners.forEach((listener) => listener());
  };

  const replace = (next: T[]) => {
    snapshot = cloneJson(next);
    publish();
  };

  return {
    getSnapshot: () => snapshot,

    list: () => cloneJson(snapshot),

    replaceAll: (records) => {
      replace([...records]);
    },

    getById: (id) => {
      const record = snapshot.find((item) => item.id === id);
      return record ? cloneJson(record) : undefined;
    },

    create: (record) => {
      const next = cloneJson(record);
      replace([...snapshot, next]);
      return cloneJson(next);
    },

    update: (id, patch) => {
      const current = snapshot.find((item) => item.id === id);
      if (!current) return undefined;

      const updated = { ...current, ...cloneJson(patch) } as T;
      replace(snapshot.map((item) => (item.id === id ? updated : item)));
      return cloneJson(updated);
    },

    upsert: (record) => {
      const next = cloneJson(record);
      const exists = snapshot.some((item) => item.id === next.id);
      replace(
        exists
          ? snapshot.map((item) => (item.id === next.id ? next : item))
          : [...snapshot, next],
      );
      return cloneJson(next);
    },

    remove: (id) => {
      const next = snapshot.filter((item) => item.id !== id);
      if (next.length === snapshot.length) return false;
      replace(next);
      return true;
    },

    reset: () => {
      replace(initial);
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type BackendDataDriverConfig<T extends JsonEntity> = {
  list: () => Promise<readonly T[]>;
  create?: (record: T) => Promise<T>;
  update?: (id: string, patch: Partial<T>) => Promise<T | undefined>;
  remove?: (id: string) => Promise<boolean>;
};

/**
 * Keeps the old synchronous driver contract for existing screens while
 * refreshing and persisting records through the HTTP backend in the background.
 * The UI stays responsive, but a reload gets the durable JSON data again.
 */
export function createBackendDataDriver<T extends JsonEntity>(
  seed: readonly T[],
  config: BackendDataDriverConfig<T>,
): JsonDataDriver<T> & { refresh: () => Promise<void> } {
  const local = createJsonDataDriver(seed);

  const run = (task: Promise<T | undefined> | Promise<boolean> | undefined) => {
    void task?.then((remote) => {
      if (typeof remote === 'object' && remote !== null && 'id' in remote) {
        local.upsert(remote as T);
      }
    }).catch((error: unknown) => {
      console.error('Backend data driver request failed.', error);
    });
  };

  return {
    ...local,
    refresh: async () => {
      const records = await config.list();
      local.replaceAll(records);
    },
    create: (record) => {
      const created = local.create(record);
      if (config.create) run(config.create(created));
      return created;
    },
    update: (id, patch) => {
      const updated = local.update(id, patch);
      if (updated && config.update) run(config.update(id, patch));
      return updated;
    },
    remove: (id) => {
      const removed = local.remove(id);
      if (removed && config.remove) run(config.remove(id));
      return removed;
    },
  };
}
