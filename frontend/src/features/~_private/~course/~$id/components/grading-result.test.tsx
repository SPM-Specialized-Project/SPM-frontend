// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  // eslint-disable-next-line testing-library/no-manual-cleanup -- Vitest globals are disabled, so automatic cleanup is not registered.
  cleanup,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { CodePulseWorkspaceSubmission } from '@/services/codepulse-api';

import { GradingResult } from './grading-result';

const submission = (
  status: CodePulseWorkspaceSubmission['status'],
): CodePulseWorkspaceSubmission => ({
  id: `submission-${status.toLowerCase()}`,
  workspaceId: 'workspace-1',
  classroomId: 'class-1',
  labId: 'lab-1',
  labAssignmentId: 'lab-assignment-1',
  assignmentId: 'problem-1',
  assignmentVersionId: 'problem-1-v1',
  assignmentVersion: {
    id: 'problem-1-v1',
    assignmentId: 'problem-1',
    version: 1,
    title: 'Problem',
    language: 'PYTHON',
  },
  student: {
    id: 'student-1',
    membershipId: 'membership-1',
    name: 'Student',
    email: 'student@gmail.com',
  },
  sourceCode: 'print(input())',
  acceptedAt: '2026-11-09T00:00:00.000Z',
  status,
  gradingAttempts: [],
  judgment: null,
});

afterEach(cleanup);

describe('SCRUM-74 grading result', () => {
  it.each([
    ['PENDING', 'Pending', /chờ grading worker/],
    ['JUDGING', 'Judging', /public và hidden test cases/],
  ] as const)('renders the %s state accessibly', (status, label, message) => {
    render(<GradingResult submission={submission(status)} />);
    const region = screen.getByRole('region', { name: 'Grading result' });
    expect(region).toHaveTextContent(label);
    expect(region).toHaveTextContent(message);
  });

  it('renders backend-authoritative partial score and hidden aggregate only', () => {
    const item = submission('COMPLETED');
    item.judgment = {
      id: 'judgment-1',
      submissionId: item.id,
      attempt: 1,
      status: 'COMPLETED',
      verdict: 'WRONG_ANSWER',
      earnedWeight: 3,
      maxWeight: 5,
      score: 60,
      passedCount: 3,
      failedCount: 2,
      totalCount: 5,
      assignmentVersionId: item.assignmentVersionId,
      createdAt: item.acceptedAt,
      startedAt: item.acceptedAt,
      completedAt: item.acceptedAt,
      publicTests: [
        {
          testCaseId: 'public-1',
          verdict: 'PASSED',
          passed: true,
          weight: 1,
          earnedWeight: 1,
          input: 'public input',
          expectedOutput: 'public output',
          actualOutput: 'public output',
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
    };

    render(<GradingResult submission={item} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText(/Hidden tests: 2\/4 passed/)).toBeInTheDocument();
    expect(screen.getByText('public input')).toBeInTheDocument();
    expect(screen.queryByText(/hidden input/i)).not.toBeInTheDocument();
  });

  it('never presents an infrastructure error as score zero', () => {
    render(<GradingResult submission={submission('INTERNAL_ERROR')} />);
    expect(screen.getByText('Internal Error')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có điểm hợp lệ/)).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});
