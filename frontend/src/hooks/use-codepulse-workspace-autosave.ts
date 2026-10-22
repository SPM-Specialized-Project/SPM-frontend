import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/services/api-client';
import {
  codePulseApi,
  type CodePulseWorkspace,
} from '@/services/codepulse-api';

export type WorkspaceAutosaveStatus =
  | 'saved'
  | 'dirty'
  | 'saving'
  | 'offline';

const isOnline = () =>
  typeof navigator === 'undefined' || navigator.onLine;

export function useCodePulseWorkspaceAutosave({
  workspace,
  sourceCode,
  enabled,
  onSaved,
}: {
  workspace?: CodePulseWorkspace;
  sourceCode: string;
  enabled: boolean;
  onSaved: (workspace: CodePulseWorkspace) => void;
}) {
  const [status, setStatus] = useState<WorkspaceAutosaveStatus>('saved');
  const [error, setError] = useState<string>();
  const workspaceRef = useRef<CodePulseWorkspace | undefined>(undefined);
  const sourceCodeRef = useRef(sourceCode);
  const savedSourceCodeRef = useRef('');
  const revisionRef = useRef(0);
  const enabledRef = useRef(enabled);
  const onSavedRef = useRef(onSaved);
  const pendingSaveRef = useRef<Promise<CodePulseWorkspace | undefined> | undefined>(
    undefined,
  );

  sourceCodeRef.current = sourceCode;
  enabledRef.current = enabled;
  onSavedRef.current = onSaved;

  const saveNow = useCallback(async () => {
    while (true) {
      const currentWorkspace = workspaceRef.current;
      if (!currentWorkspace || !enabledRef.current) return undefined;
      if (!isOnline()) {
        setStatus('offline');
        return undefined;
      }
      if (pendingSaveRef.current) {
        const pendingResult = await pendingSaveRef.current;
        if (!pendingResult) return undefined;
        if (sourceCodeRef.current === savedSourceCodeRef.current) {
          return pendingResult;
        }
        continue;
      }

      const codeToSave = sourceCodeRef.current;
      if (codeToSave === savedSourceCodeRef.current) {
        setStatus('saved');
        setError(undefined);
        return currentWorkspace;
      }

      setStatus('saving');
      const pendingSave = codePulseApi
        .updateWorkspace(
          currentWorkspace.id,
          codeToSave,
          revisionRef.current,
        )
        .then((response) => {
          const savedWorkspace = response.data.item;
          workspaceRef.current = savedWorkspace;
          revisionRef.current = savedWorkspace.revision;
          savedSourceCodeRef.current = codeToSave;
          setError(undefined);
          onSavedRef.current(savedWorkspace);
          setStatus(
            sourceCodeRef.current === codeToSave ? 'saved' : 'dirty',
          );
          return savedWorkspace;
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not save workspace code.',
          );
          const connectionFailure =
            reason instanceof ApiError &&
            reason.code === 'API_ERROR' &&
            reason.status === 500;
          setStatus(isOnline() && !connectionFailure ? 'dirty' : 'offline');
          return undefined;
        })
        .finally(() => {
          pendingSaveRef.current = undefined;
        });
      pendingSaveRef.current = pendingSave;

      const savedWorkspace = await pendingSave;
      if (!savedWorkspace) return undefined;
      if (sourceCodeRef.current === savedSourceCodeRef.current) {
        return savedWorkspace;
      }
    }
  }, []);

  useEffect(() => {
    if (!workspace) {
      workspaceRef.current = undefined;
      revisionRef.current = 0;
      savedSourceCodeRef.current = '';
      return;
    }

    if (workspaceRef.current?.id !== workspace.id) {
      workspaceRef.current = workspace;
      revisionRef.current = workspace.revision;
      savedSourceCodeRef.current = workspace.sourceCode;
      setError(undefined);
      setStatus(isOnline() ? 'saved' : 'offline');
      return;
    }

    workspaceRef.current = workspace;
    revisionRef.current = Math.max(revisionRef.current, workspace.revision);
  }, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    if (sourceCode === savedSourceCodeRef.current) {
      if (isOnline()) {
        setStatus('saved');
        setError(undefined);
      } else {
        setStatus('offline');
      }
      return;
    }

    setStatus(isOnline() ? 'dirty' : 'offline');
    if (!enabled || !isOnline()) return;

    const timer = window.setTimeout(() => {
      void saveNow();
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [enabled, saveNow, sourceCode, workspace]);

  useEffect(() => {
    if (status !== 'offline' || !enabled || !workspace || !isOnline()) return;
    const timer = window.setTimeout(() => {
      void saveNow();
    }, 5_000);
    return () => window.clearTimeout(timer);
  }, [enabled, saveNow, status, workspace]);

  useEffect(() => {
    const onOffline = () => setStatus('offline');
    const onOnline = () => {
      if (sourceCodeRef.current === savedSourceCodeRef.current) {
        setStatus('saved');
        return;
      }
      setStatus('dirty');
      void saveNow();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [saveNow]);

  return { status, error, saveNow };
}
