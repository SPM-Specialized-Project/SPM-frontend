// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  codePulseApi,
  type CodePulseAssessment,
  type CodePulseInspection,
  type CodePulseIssueCase,
} from '@/services/codepulse-api';

import { IssueCasesPanel } from './issue-cases-panel';

vi.mock('@/services/codepulse-api', () => ({
  codePulseApi: {
    listIssueCases: vi.fn(),
    listAssessments: vi.fn(),
    updateIssueCase: vi.fn(),
    getIssueCase: vi.fn(),
    getStudentTimeline: vi.fn(),
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

  it('opens read-only code and scoped event details, then requires a reason to dismiss', async () => {
    const snapshot = {
      id: 'snapshot-alert', revision: 1, assignmentVersionId: 'version-1',
      createdAt: '2026-11-07T10:00:00.000Z', sourceCode: 'return broken();',
    };
    const item: CodePulseInspection = {
      issue: issueCase, studentEmail: issueCase.studentEmail,
      problem: { id: 'assignment-1', title: 'Sample list', versionId: 'version-1', version: 1 },
      alertSnapshot: snapshot, currentCode: { ...snapshot, id: 'workspace-1', revision: 2, sourceCode: 'return fixed();' },
      timeline: [
        { id: 'submission-1', kind: 'SUBMIT', createdAt: snapshot.createdAt, snapshot: null, executionId: null, submissionId: 'submission-1', status: 'GRADED' },
        { id: snapshot.id, kind: 'RUN', createdAt: snapshot.createdAt, snapshot, executionId: 'run-1', submissionId: null, status: 'COMPILE_ERROR' },
      ],
      selectedEvent: {
        id: snapshot.id, snapshot, eventCode: null, executionId: 'run-1', submissionId: null,
        compilerTrace: 'Compiler error on line 1', submissionVerdict: null, runTests: [], submissionTests: [],
      },
      hintHistory: [],
    };
    vi.mocked(codePulseApi.getIssueCase).mockImplementation(async (_id, eventId) => ({
      status: 200,
      data: { item: eventId === 'submission-1' ? {
        ...item,
        selectedEvent: { id: eventId, snapshot: null, eventCode: null, executionId: null, submissionId: eventId,
          compilerTrace: null, submissionVerdict: 'WRONG_ANSWER', runTests: [], submissionTests: [] },
      } : item },
    }));
    vi.mocked(codePulseApi.updateIssueCase).mockResolvedValue({
      status: 200, data: { item: { id: issueCase.id, status: 'DISMISSED', updatedAt: snapshot.createdAt } },
    });
    render(<IssueCasesPanel classroomId="class-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect case' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Case detail' }));
    expect(await dialog.findByText('return broken();')).toBeInTheDocument();
    expect(dialog.getByText('return fixed();')).toBeInTheDocument();
    expect(dialog.getByText('Compiler error on line 1')).toBeInTheDocument();
    expect(dialog.queryByRole('textbox')).not.toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: /^(Run code|Submit code)$/ })).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: /Submit.*GRADED/ }));
    expect(await dialog.findByText(/Submission submission-1 · WRONG_ANSWER/)).toBeInTheDocument();
    expect(dialog.queryByText('Compiler error on line 1')).not.toBeInTheDocument();
    expect(dialog.getByText('return broken();')).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Dismiss case' }));
    expect(dialog.getByRole('button', { name: 'Confirm dismissal' })).toBeDisabled();
    fireEvent.change(dialog.getByRole('textbox', { name: 'Dismissal reason' }), { target: { value: '  False positive  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm dismissal' }));
    await waitFor(() => expect(codePulseApi.updateIssueCase).toHaveBeenCalledWith('issue-1', 'DISMISSED', 'False positive'));
  });
});
