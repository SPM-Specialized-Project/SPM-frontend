// Live drafts are intentionally process-local and never written to workspace storage.
const PRESENCE_TIMEOUT_MS = 12_000;

export function createLiveDrafts() {
  const drafts = new Map();
  const listeners = new Map();
  const revisions = new Map();

  const emit = (workspaceId, event) => {
    for (const listener of listeners.get(workspaceId) ?? []) listener(event);
  };

  const end = (workspaceId, reason = 'ended') => {
    if (!drafts.has(workspaceId)) return;
    drafts.delete(workspaceId);
    emit(workspaceId, reason === 'disconnected'
      ? { type: 'disconnected' }
      : { type: 'ended', reason });
  };

  const current = (workspaceId) => {
    const draft = drafts.get(workspaceId);
    if (draft && Date.now() - draft.lastSeenAt > PRESENCE_TIMEOUT_MS) {
      end(workspaceId, 'disconnected');
      return null;
    }
    return draft ?? null;
  };

  return {
    current,
    publish(workspaceId, publisherId, sourceCode, claim = false) {
      const previous = current(workspaceId);
      if (previous && previous.publisherId !== publisherId && !claim) return null;
      const now = Date.now();
      const draft = {
        workspaceId,
        publisherId,
        sourceCode,
        revision: (revisions.get(workspaceId) ?? 0) + 1,
        updatedAt: new Date(now).toISOString(),
        lastSeenAt: now,
      };
      revisions.set(workspaceId, draft.revision);
      drafts.set(workspaceId, draft);
      emit(workspaceId, { type: 'draft', draft });
      return draft;
    },
    heartbeat(workspaceId, publisherId) {
      const draft = current(workspaceId);
      if (!draft || draft.publisherId !== publisherId) return false;
      draft.lastSeenAt = Date.now();
      return true;
    },
    leave(workspaceId, publisherId) {
      if (current(workspaceId)?.publisherId === publisherId) end(workspaceId, 'disconnected');
    },
    end,
    endLab(labId) {
      for (const [workspaceId, draft] of drafts) {
        if (draft.labId === labId) end(workspaceId, 'lab-ended');
      }
    },
    endStudent(classroomId, studentEmail) {
      for (const [workspaceId, draft] of drafts) {
        if (draft.classroomId === classroomId && draft.studentEmail === studentEmail) end(workspaceId, 'forbidden');
      }
    },
    tagLab(workspaceId, labId) {
      const draft = drafts.get(workspaceId);
      if (draft) draft.labId = labId;
    },
    tagOwner(workspaceId, classroomId, studentEmail) {
      const draft = drafts.get(workspaceId);
      if (draft) Object.assign(draft, { classroomId, studentEmail });
    },
    subscribe(workspaceId, listener) {
      const group = listeners.get(workspaceId) ?? new Set();
      group.add(listener);
      listeners.set(workspaceId, group);
      return () => {
        group.delete(listener);
        if (group.size === 0) listeners.delete(workspaceId);
      };
    },
  };
}
