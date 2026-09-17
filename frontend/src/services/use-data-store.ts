import { useEffect, useSyncExternalStore } from 'react';

import type { DataEntity, DataStore } from './data-store';

export function useDataStore<T extends DataEntity>(
  store: DataStore<T> & { refresh?: () => Promise<void> },
): readonly T[] {
  useEffect(() => {
    void store.refresh?.().catch((error: unknown) => {
      console.error('Unable to refresh data store.', error);
    });
  }, [store]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
