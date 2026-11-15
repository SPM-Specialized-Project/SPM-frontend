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
  waitForExecution,
  type CodePulseLab,
  type CodePulseLabAssignment,
} from '@/services/codepulse-api';

import { StudentLabWorkspace } from './student-lab-workspace';

vi.mock('@/services/codepulse-api', () => ({
  codePulseApi: {
    getWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    executeWorkspace: vi.fn(),
    listExecutions: vi.fn(),
    listWorkspaceSubmissions: vi.fn(),
    submitWorkspace: vi.fn(),
  },
  waitForExecution: vi.fn(),
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
  revision: 0,
  executionResult: null,
  problem: {
    id: assignment.assignmentVersionId,
    assignmentId: assignment.assignmentId,
    assignmentVersionId: assignment.assignmentVersionId,
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
    vi.mocked(codePulseApi.listExecutions).mockResolvedValue({
      status: 200,
      data: { items: [] },
    });
    vi.mocked(codePulseApi.listWorkspaceSubmissions).mockResolvedValue({
      status: 200,
      data: { items: [] },
    });
    vi.mocked(codePulseApi.getWorkspace).mockImplementation(async () => ({
      status: 200,
      data: { item, practiceWindow },
    }));
    vi.mocked(codePulseApi.updateWorkspace).mockImplementation(
      async (_workspaceId, sourceCode, baseRevision) => ({
        status: 200,
        data: {
          item: {
            ...item,
            sourceCode,
            revision: baseRevision + 1,
          },
        },
      }),
    );
  });

  it('autosaves after one second of inactivity using the current revision', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    await mountWorkspace();

    fireEvent.change(screen.getByRole('textbox', { name: 'Source code' }), {
      target: { value: 'print("autosaved queue")' },
    });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(codePulseApi.updateWorkspace).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(codePulseApi.updateWorkspace).toHaveBeenCalledWith(
      item.id,
      'print("autosaved queue")',
      0,
    );
    expect(screen.getByText('Saved')).toBeInTheDocument();
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

  it('runs the unsaved source snapshot with custom stdin and renders system errors separately', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    await mountWorkspace();
    fireEvent.change(screen.getByRole('textbox', { name: 'Source code' }), {
      target: { value: 'print(input())' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Run mode' }), {
      target: { value: 'STDIN' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Custom input (stdin)' }),
      { target: { value: 'hello custom' } },
    );
    const execution = {
      id: 'execution-fixture',
      state: 'FINISHED' as const,
      status: 'INTERNAL_ERROR' as const,
      mode: 'STDIN' as const,
      stdout: 'partial stdout',
      stderr: 'worker unavailable',
      exitCode: null,
      sourceCode: 'print(input())',
      sourceHash: 'hash',
      runtime: 'PYTHON' as const,
      assignmentId: 'queue',
      assignmentVersionId: 'queue-v1',
      ownerEmail: item.ownerEmail,
      runtimeMs: 0,
      executedAt: '2026-10-21T00:00:00Z',
      limits: {
        cpuTimeLimitMs: 1000,
        memoryLimitMb: 128,
        wallTimeLimitMs: 2250,
      },
    };
    vi.mocked(codePulseApi.executeWorkspace).mockResolvedValue({
      status: 202,
      data: { item: execution },
    });
    vi.mocked(waitForExecution).mockResolvedValue(execution);
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(codePulseApi.updateWorkspace).toHaveBeenCalledWith(
      item.id,
      'print(input())',
      0,
    );
    expect(codePulseApi.executeWorkspace).toHaveBeenCalledWith(
      item.id,
      'print(input())',
      {
        mode: 'STDIN',
        stdin: 'hello custom',
        baseRevision: 1,
      },
    );
    expect(
      screen.getByText('Internal Error · Lỗi hệ thống'),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'stdout' })).toHaveTextContent(
      'partial stdout',
    );
    expect(screen.getByRole('region', { name: 'stderr' })).toHaveTextContent(
      'worker unavailable',
    );
    expect(screen.getByRole('textbox', { name: 'Source code' })).toHaveValue(
      'print(input())',
    );
  });

  it('inspects an old run without changing the unsaved active editor', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    const execution = {
      id: 'execution-old',
      state: 'FINISHED' as const,
      status: 'SUCCESS' as const,
      mode: 'STDIN' as const,
      stdout: 'old output',
      stderr: '',
      exitCode: 0,
      sourceCode: 'print("old output")',
      sourceHash: 'hash',
      runtime: 'PYTHON' as const,
      assignmentId: 'queue',
      assignmentVersionId: 'queue-v1',
      ownerEmail: item.ownerEmail,
      runtimeMs: 25,
      memoryUsageKb: 8192,
      executedAt: '2026-10-21T00:00:00Z',
      limits: {
        cpuTimeLimitMs: 1000,
        memoryLimitMb: 128,
        wallTimeLimitMs: 2250,
      },
    };
    vi.mocked(codePulseApi.listExecutions).mockResolvedValue({
      status: 200,
      data: { items: [execution] },
    });
    await mountWorkspace();
    fireEvent.change(screen.getByRole('textbox', { name: 'Source code' }), {
      target: { value: 'unsaved edge case' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Execution History' }));
    fireEvent.click(screen.getByRole('button', { name: /execution-old/ }));
    expect(screen.getByRole('textbox', { name: 'Code snapshot' })).toHaveValue(
      execution.sourceCode,
    );
    expect(
      screen.getByRole('textbox', { name: 'Code snapshot' }),
    ).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Source code' })).toHaveValue(
      'unsaved edge case',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Console' }));
    expect(screen.getByRole('textbox', { name: 'Source code' })).toHaveValue(
      'unsaved edge case',
    );
    expect(codePulseApi.updateWorkspace).not.toHaveBeenCalled();
  });

  it('polls grading and renders partial score with public and hidden-safe feedback', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    vi.mocked(codePulseApi.listWorkspaceSubmissions).mockResolvedValue({
      status: 200,
      data: {
        items: [
          {
            id: 'submission-graded',
            workspaceId: item.id,
            classroomId: lab.classroomId,
            labId: lab.id,
            labAssignmentId: assignment.id,
            assignmentId: assignment.assignmentId,
            assignmentVersionId: assignment.assignmentVersionId,
            assignmentVersion: {
              id: assignment.assignmentVersionId,
              assignmentId: assignment.assignmentId,
              version: 1,
              title: assignment.title,
              language: 'PYTHON',
            },
            student: {
              id: 'student',
              membershipId: 'membership',
              name: 'Student',
              email: 'student@gmail.com',
            },
            sourceCode: 'print(input())',
            acceptedAt: '2026-11-08T00:00:00.000Z',
            status: 'COMPLETED',
            gradingAttempts: [],
            judgment: {
              id: 'judgment-1',
              submissionId: 'submission-graded',
              attempt: 1,
              status: 'COMPLETED',
              verdict: 'WRONG_ANSWER',
              earnedWeight: 3,
              maxWeight: 5,
              score: 60,
              passedCount: 3,
              failedCount: 2,
              totalCount: 5,
              assignmentVersionId: assignment.assignmentVersionId,
              createdAt: '2026-11-08T00:00:00.000Z',
              startedAt: '2026-11-08T00:00:00.000Z',
              completedAt: '2026-11-08T00:00:01.000Z',
              publicTests: [
                {
                  testCaseId: 'public-1',
                  verdict: 'PASSED',
                  passed: true,
                  weight: 1,
                  earnedWeight: 1,
                  input: 'visible input',
                  expectedOutput: 'visible output',
                  actualOutput: 'visible output',
                  stderr: '',
                  runtimeMs: 10,
                  memoryUsageKb: 1024,
                  outputTruncated: false,
                },
              ],
              hiddenTests: {
                passedCount: 2,
                totalCount: 4,
                earnedWeight: 2,
                maxWeight: 4,
              },
            },
          },
        ],
      },
    });
    await mountWorkspace();
    expect(
      screen.getByRole('region', { name: 'Grading result' }),
    ).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText(/Hidden tests: 2\/4 passed/)).toBeInTheDocument();
    expect(screen.getByText(/Test 1: PASSED/)).toBeInTheDocument();
    const terminalPollCount = vi.mocked(codePulseApi.listWorkspaceSubmissions)
      .mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(codePulseApi.listWorkspaceSubmissions).toHaveBeenCalledTimes(
      terminalPollCount,
    );
  });

  it('renders infrastructure failure without fabricating a zero score', async () => {
    practiceWindow = {
      ...assignment,
      practiceAccess: 'OPEN',
      practiceAccessReason: null,
    };
    vi.mocked(codePulseApi.listWorkspaceSubmissions).mockResolvedValue({
      status: 200,
      data: {
        items: [
          {
            id: 'submission-internal-error',
            workspaceId: item.id,
            classroomId: lab.classroomId,
            labId: lab.id,
            labAssignmentId: assignment.id,
            assignmentId: assignment.assignmentId,
            assignmentVersionId: assignment.assignmentVersionId,
            assignmentVersion: {
              id: assignment.assignmentVersionId,
              assignmentId: assignment.assignmentId,
              version: 1,
              title: assignment.title,
              language: 'PYTHON',
            },
            student: {
              id: 'student',
              membershipId: 'membership',
              name: 'Student',
              email: 'student@gmail.com',
            },
            sourceCode: 'print(input())',
            acceptedAt: '2026-11-08T00:00:00.000Z',
            status: 'INTERNAL_ERROR',
            gradingAttempts: [],
            judgment: {
              id: 'judgment-internal',
              submissionId: 'submission-internal-error',
              attempt: 3,
              status: 'INTERNAL_ERROR',
              verdict: 'INTERNAL_ERROR',
              earnedWeight: null,
              maxWeight: null,
              score: null,
              passedCount: 0,
              failedCount: 0,
              totalCount: 0,
              assignmentVersionId: assignment.assignmentVersionId,
              createdAt: '2026-11-08T00:00:00.000Z',
              startedAt: '2026-11-08T00:00:00.000Z',
              completedAt: '2026-11-08T00:00:01.000Z',
              publicTests: [],
              hiddenTests: {
                passedCount: 0,
                totalCount: 0,
                earnedWeight: 0,
                maxWeight: 0,
              },
            },
          },
        ],
      },
    });
    await mountWorkspace();
    expect(screen.getByText('Internal Error')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có điểm hợp lệ/)).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});
