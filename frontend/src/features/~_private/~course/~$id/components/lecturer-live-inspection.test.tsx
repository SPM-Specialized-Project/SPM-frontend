// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  // eslint-disable-next-line testing-library/no-manual-cleanup -- Vitest globals are disabled.
  cleanup, render, screen, waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { codePulseApi, type CodePulseLiveDraftEvent } from '@/services/codepulse-api';

import { LecturerLiveInspection } from './lecturer-live-inspection';

vi.mock('@/services/codepulse-api', () => ({
  codePulseApi: {
    listLiveWorkspaces: vi.fn(),
    getWorkspaceSnapshots: vi.fn(),
    subscribeLiveDraft: vi.fn(),
  },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('shows only the newest live revision, then falls back to a saved snapshot', async () => {
  let onEvent: ((event: CodePulseLiveDraftEvent) => void) | undefined;
  vi.mocked(codePulseApi.listLiveWorkspaces).mockResolvedValue({
    status: 200,
    data: { live: true, items: [{
      workspaceId: 'workspace-1', studentEmail: 'student@example.test',
      studentName: 'Student A', problemTitle: 'Queue', connected: true,
    }] },
  });
  vi.mocked(codePulseApi.getWorkspaceSnapshots).mockResolvedValue({
    status: 200,
    data: { items: [{
      id: 'snapshot-1', workspaceId: 'workspace-1', classroomId: 'class-1',
      studentEmail: 'student@example.test', sourceCode: 'saved code',
      hash: 'hash', revision: 1, trigger: 'SAVE', createdAt: '2026-11-20T10:00:00.000Z',
    }] },
  });
  vi.mocked(codePulseApi.subscribeLiveDraft).mockImplementation((_id, callback) => { onEvent = callback; });
  render(<LecturerLiveInspection classroomId="class-1" labId="lab-1" live />);
  await waitFor(() => expect(onEvent).toBeDefined());
  onEvent?.({ type: 'draft', draft: { sourceCode: 'new code', revision: 3, updatedAt: '2026-11-20T10:01:00.000Z' } });
  onEvent?.({ type: 'draft', draft: { sourceCode: 'old code', revision: 2, updatedAt: '2026-11-20T10:00:30.000Z' } });
  await waitFor(() => expect(screen.getByLabelText('Mã chỉ đọc')).toHaveTextContent('new code'));
  expect(screen.getByLabelText('Mã chỉ đọc')).not.toHaveTextContent('old code');
  onEvent?.({ type: 'ended', reason: 'lab-ended' });
  await waitFor(() => expect(screen.getByLabelText('Mã chỉ đọc')).toHaveTextContent('saved code'));
  expect(screen.queryByRole('button', { name: /run|submit/i })).not.toBeInTheDocument();
});
