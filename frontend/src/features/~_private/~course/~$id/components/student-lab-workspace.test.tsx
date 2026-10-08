// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  // eslint-disable-next-line testing-library/no-manual-cleanup -- Vitest globals are disabled, so automatic cleanup is not registered.
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  codePulseApi,
  type CodePulseLab,
  type CodePulseLabAssignment,
} from '@/services/codepulse-api';

import { StudentLabWorkspace } from './student-lab-workspace';

vi.mock('@/services/codepulse-api', () => ({
  codePulseApi: { getWorkspace: vi.fn(), updateWorkspace: vi.fn() },
}));

const assignment: CodePulseLabAssignment = {
  id: 'lab-assignment-queue',
  assignmentId: 'queue',
  assignmentVersionId: 'queue-v1',
  version: 1,
  title: 'Queue implementation',
  order: 1,
  mandatory: true,
  openAt: '2026-10-08T09:16:00.000Z',
  closeAt: '2026-10-08T14:16:00.000Z',
  practiceStartAt: '2026-10-08T09:16:00.000Z',
  practiceEndAt: '2026-10-08T14:16:00.000Z',
  practiceWindowStatus: 'OPEN',
  practiceWindowVersion: 0,
  practiceAccess: 'CLOSED',
  practiceAccessReason: 'NOT_OPEN_YET',
  workspaceId: 'workspace-queue',
};
const lab: CodePulseLab = {
  id: 'lab-queue',
  classroomId: 'class-1',
  name: 'Queue',
  description: '',
  startAt: assignment.openAt,
  endAt: assignment.closeAt,
  status: 'LIVE',
  stateVersion: 1,
  createdBy: 'lecturer@gmail.com',
  createdAt: assignment.openAt,
  updatedAt: assignment.openAt,
  assignments: [assignment],
};
const item = {
  id: assignment.workspaceId!,
  classroomId: lab.classroomId,
  ownerEmail: 'student@gmail.com',
  sourceCode: '# Implement the queue here',
  executionResult: null,
  problem: {
    id: assignment.assignmentVersionId,
    title: assignment.title,
    description: '',
    version: 1,
    language: 'PYTHON',
    hints: [],
  },
};

describe('student practice access', () => {
  let practiceWindow: CodePulseLabAssignment;

  beforeEach(() => {
    vi.useFakeTimers();
    // A wrong browser clock must not override server access.
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    practiceWindow = { ...assignment };
    vi.mocked(codePulseApi.getWorkspace).mockImplementation(async () => ({
      status: 200,
      data: { item, practiceWindow },
    }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  async function mountWorkspace() {
    render(<StudentLabWorkspace labs={[lab]} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  it('opens a mounted workspace when server access changes despite stale LAB props and client time', async () => {
    await mountWorkspace();
    expect(
      screen.getByRole('textbox', { name: 'Source code' }),
    ).toHaveAttribute('readonly');
    expect(screen.getByText(/Practice chưa mở. Giờ mở:/)).toBeInTheDocument();
    expect(screen.queryByText(/Outside-Lab/)).not.toBeInTheDocument();

    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
      activityContext: 'IN_LAB',
      serverTime: '2026-10-08T09:20:00.000Z',
    };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(
      screen.getByRole('textbox', { name: 'Source code' }),
    ).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Lưu code' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.getByText('In-Lab · Đang mở')).toBeInTheDocument();
  });

  it('keeps unsaved code when lecturer closes and reopens practice', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    await mountWorkspace();
    fireEvent.change(screen.getByRole('textbox', { name: 'Source code' }), {
      target: { value: 'print("my unsaved queue")' },
    });
    practiceWindow = {
      ...assignment,
      practiceWindowStatus: 'CLOSED',
      practiceAccessReason: 'MANUALLY_CLOSED',
    };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(
      screen.getByRole('textbox', { name: 'Source code' }),
    ).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Source code' })).toHaveValue(
      'print("my unsaved queue")',
    );
    expect(screen.getByRole('button', { name: 'Lưu code' })).toBeDisabled();
    expect(screen.getByText(/Giảng viên đã đóng practice/)).toBeInTheDocument();

    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(
      screen.getByRole('textbox', { name: 'Source code' }),
    ).not.toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Source code' })).toHaveValue(
      'print("my unsaved queue")',
    );
  });

  it('locks again when access cannot be verified and recovers on the next poll', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    await mountWorkspace();
    vi.mocked(codePulseApi.getWorkspace).mockRejectedValueOnce(
      new Error('FORBIDDEN'),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(
      screen.getByRole('textbox', { name: 'Source code' }),
    ).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(
      screen.getByRole('textbox', { name: 'Source code' }),
    ).not.toHaveAttribute('readonly');
  });
});
