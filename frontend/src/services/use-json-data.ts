import { useEffect, useSyncExternalStore } from 'react';

import type { JsonDataDriver, JsonEntity } from './json-data-driver';

export function useJsonData<T extends JsonEntity>(
  driver: JsonDataDriver<T> & { refresh?: () => Promise<void> },
): readonly T[] {
  useEffect(() => {
    void driver.refresh?.().catch((error: unknown) => {
      console.error('Unable to refresh backend data driver.', error);
    });
  }, [driver]);

  return useSyncExternalStore(
    driver.subscribe,
    driver.getSnapshot,
    driver.getSnapshot,
  );
}
