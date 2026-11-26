import { useEffect, useRef, useState } from 'react';

import { codePulseApi } from '@/services/codepulse-api';

export function useLiveDraftPublisher({
  workspaceId,
  sourceCode,
  enabled,
}: {
  workspaceId?: string;
  sourceCode: string;
  enabled: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const sourceRef = useRef(sourceCode);
  sourceRef.current = sourceCode;

  useEffect(() => {
    if (!workspaceId || !enabled) {
      setSharing(false);
      return;
    }
    setSharing(false);
    const id = workspaceId;
    const publisherId = globalThis.crypto?.randomUUID?.() ?? `publisher-${Date.now()}`;
    let active = true;
    let busy = false;
    let firstPublish = true;
    let lastSent: string | undefined;
    let lastHeartbeatAt = 0;
    let nextAttemptAt = 0;
    const sync = async () => {
      if (busy || !active || Date.now() < nextAttemptAt) return;
      busy = true;
      try {
        const source = sourceRef.current;
        if (source !== lastSent) {
          await codePulseApi.publishLiveDraft(id, publisherId, source, firstPublish);
          firstPublish = false;
          lastSent = source;
          lastHeartbeatAt = Date.now();
          if (active) setSharing(true);
        } else if (Date.now() - lastHeartbeatAt >= 5_000) {
          const response = await codePulseApi.heartbeatLiveDraft(id, publisherId);
          if (!response.data.connected) lastSent = undefined;
          lastHeartbeatAt = Date.now();
          if (active) setSharing(response.data.connected);
        }
      } catch {
        lastSent = undefined;
        nextAttemptAt = Date.now() + 10_000;
        if (active) setSharing(false);
      } finally {
        busy = false;
      }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 2_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      void codePulseApi.leaveLiveDraft(id, publisherId).catch(() => undefined);
    };
  }, [workspaceId, enabled]);

  return sharing;
}
