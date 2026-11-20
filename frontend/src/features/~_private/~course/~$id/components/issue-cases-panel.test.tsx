// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  codePulseApi,
  type CodePulseAssessment,
  type CodePulseIssueCase,
} from '@/services/codepulse-api';

import { IssueCasesPanel } from './issue-cases-panel';

vi.mock('@/services/codepulse-api', () => ({
  codePulseApi: {
    listIssueCases: vi.fn(),
    listAssessments: vi.fn(),
    updateIssueCase: vi.fn(),
    subscribeIssueUpdates: vi.fn(),
  },
}));

const assessment = (id: string, studentEmail: string, milestone: CodePulseAssessment['milestone'], eventSequence: number): CodePulseAssessment => ({
  id,
  eventId: `event-${id}`,
  eventSequence,
  classroomId: 'class-1',
  workspaceId: `workspace-${studentEmail}`,
  studentEmail,
  assignmentId: 'assignment-1',
  assignmentVersionId: 'version-1',
  snapshotId: `snapshot-${id}`,
  executionId: null,
  submissionId: null,
  milestone,
  state: 'EVALUATED',
  inputCoverage: { snapshot: true, problemVersion: true, executionContext: milestone === 'RUN' },
  findingCount: 0,
  createdAt: `2026-11-07T10:0${eventSequence}:00.000Z`,
  updatedAt: `2026-11-07T10:0${eventSequence}:00.000Z`,
});

const issueCase: CodePulseIssueCase = {
  id: 'issue-1',
  classroomId: 'class-1',
  workspaceId: 'workspace-student@example.test',
  studentEmail: 'student@example.test',
  assignmentId: 'assignment-1',
  assignmentVersionId: 'version-1',
  problemTypeId: 'BOUNDARY_FAILURE',
  problemType: { id: 'BOUNDARY_FAILURE', name: 'Boundary failure', description: 'Fails at a boundary.' },
  episodeNumber: 1,
  status: 'ACTIVE',
  createdAt: '2026-11-07T10:00:00.000Z',
  updatedAt: '2026-11-07T10:01:00.000Z',
  evidence: [],
  relatedTestCaseIds: [],
};

describe('lecturer issue cases panel', () => {
  beforeEach(() => {
    vi.mocked(codePulseApi.listIssueCases).mockResolvedValue({
      status: 200,
      data: { items: [issueCase] },
    });
    vi.mocked(codePulseApi.listAssessments).mockResolvedValue({
      status: 200,
      data: {
        items: [
          assessment('assessment-save', 'student@example.test', 'SAVE', 1),
          assessment('assessment-run', 'quiet-student@example.test', 'RUN', 2),
        ],
      },
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('includes assessed students with no issue case and filters the full assessment history by milestone', async () => {
    render(<IssueCasesPanel classroomId="class-1" />);

    await screen.findByRole('button', { name: 'quiet-student@example.test' });
    expect(screen.getByRole('row', { name: /quiet-student@example\.test.*0 \/ 0/ })).toBeInTheDocument();

    const lifecycleTable = screen.getByRole('table', { name: 'Recent assessment lifecycle' });
    expect(within(lifecycleTable).getByText('#1')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Milestone' }), { target: { value: 'RUN' } });
    await waitFor(() => {
      expect(within(lifecycleTable).getByText('#2')).toBeInTheDocument();
      expect(within(lifecycleTable).queryByText('#1')).not.toBeInTheDocument();
    });
  });
});
