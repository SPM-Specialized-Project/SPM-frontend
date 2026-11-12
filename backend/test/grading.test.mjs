import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGradingQueue,
  evaluateSubmission,
  GradingInfrastructureError,
  lecturerJudgmentView,
  studentJudgmentView,
} from '../grading.mjs';
import { toSubmissionView } from '../domain/backend-data.mjs';

const imageId = async () => `sha256:${'a'.repeat(64)}`;
const success = (stdout) => ({
  status: 'SUCCESS',
  stdout,
  stderr: '',
  runtimeMs: 5,
  memoryUsageKb: 1024,
  outputTruncated: false,
  exitCode: 0,
});
const batch = (results) => ({ status: 'SUCCESS', results });

const version = (testCases) => ({
  id: 'assignment-v2',
  assignmentId: 'assignment',
  runtime: 'PYTHON',
  cpuTimeLimitMs: 1_000,
  memoryLimitMb: 128,
  comparator: { normalizeLineEndings: true, trimTrailingNewline: true },
  testCases,
});

const submission = {
  kind: 'CODE_SUBMISSION',
  id: 'submission-1',
  assignmentId: 'assignment',
  assignmentVersionId: 'assignment-v2',
  sourceCode: 'immutable source',
  status: 'PENDING',
  gradingAttempts: [],
};

test('SCRUM-74 scoring supports full, partial and valid zero scores', async () => {
  const tests = Array.from({ length: 5 }, (_, index) => ({
    id: `test-${index + 1}`,
    input: String(index + 1),
    expectedOutput: `expected-${index + 1}`,
    hidden: index >= 3,
    weight: 20,
  }));
  const grade = (passedInputs) => evaluateSubmission({
    submission,
    assignmentVersion: version(tests),
    judgmentId: `judgment-${passedInputs.size}`,
    imageId,
    runner: async ({ tests: batchTests }) => batch(batchTests.map(({ input }) => success(
      passedInputs.has(input) ? `expected-${input}\n` : 'wrong\n',
    ))),
  });

  const partial = await grade(new Set(['1', '2', '3']));
  assert.equal(partial.score, 60);
  assert.equal(partial.earnedWeight, 60);
  assert.equal(partial.verdict, 'WRONG_ANSWER');
  assert.equal(partial.testResults.length, 5);

  const zero = await grade(new Set());
  assert.equal(zero.score, 0);
  assert.equal(zero.status, undefined);
  assert.equal(zero.verdict, 'WRONG_ANSWER');

  const full = await grade(new Set(['1', '2', '3', '4', '5']));
  assert.equal(full.score, 100);
  assert.equal(full.verdict, 'ACCEPTED');
});

test('SCRUM-74 compile error is deterministic and prevents unnecessary test execution', async () => {
  let runs = 0;
  const result = await evaluateSubmission({
    submission,
    assignmentVersion: version([
      { id: 'first', input: 'one', expectedOutput: 'one', weight: 1 },
      { id: 'second', input: 'two', expectedOutput: 'two', weight: 1 },
    ]),
    judgmentId: 'judgment-compile',
    imageId,
    runner: async () => {
      runs += 1;
      return { ...success(''), status: 'COMPILE_ERROR', stderr: 'syntax error', exitCode: 1 };
    },
  });
  assert.equal(runs, 1);
  assert.equal(result.verdict, 'COMPILE_ERROR');
  assert.equal(result.score, 0);
  assert.equal(result.testResults.length, 1);
  assert.equal(result.failedCount, 2);
  assert.equal(result.totalCount, 2);
});

test('student DTO exposes public feedback and only an aggregate hidden summary', async () => {
  const graded = await evaluateSubmission({
    submission,
    assignmentVersion: version([
      { id: 'public', input: 'public-input', expectedOutput: 'public-output', hidden: false, weight: 2 },
      { id: 'hidden', input: 'SECRET_INPUT_74', expectedOutput: 'SECRET_OUTPUT_74', hidden: true, weight: 3 },
    ]),
    judgmentId: 'judgment-security',
    imageId,
    runner: async ({ tests: batchTests }) => batch(batchTests.map(({ input }) =>
      success(input === 'public-input' ? 'public-output' : 'SECRET_OUTPUT_74'))),
  });
  const judgment = {
    id: 'judgment-security',
    submissionId: submission.id,
    assignmentVersionId: submission.assignmentVersionId,
    attempt: 1,
    status: 'COMPLETED',
    createdAt: '2026-11-08T00:00:00.000Z',
    startedAt: '2026-11-08T00:00:00.000Z',
    completedAt: '2026-11-08T00:00:01.000Z',
    ...graded,
  };
  const studentPayload = JSON.stringify(studentJudgmentView(judgment));
  assert.match(studentPayload, /public-input/);
  assert.equal(studentPayload.includes('SECRET_INPUT_74'), false);
  assert.equal(studentPayload.includes('SECRET_OUTPUT_74'), false);
  assert.deepEqual(studentJudgmentView(judgment).hiddenTests, {
    passedCount: 1,
    totalCount: 1,
    earnedWeight: 3,
    maxWeight: 3,
  });
  assert.match(JSON.stringify(lecturerJudgmentView(judgment)), /SECRET_INPUT_74/);
});

test('generic course submission serialization also removes the server-only grading snapshot', () => {
  const view = toSubmissionView({
    ...submission,
    gradingSnapshot: {
      testCases: [{
        hidden: true,
        input: 'GENERIC_ROUTE_HIDDEN_INPUT_74',
        expectedOutput: 'GENERIC_ROUTE_HIDDEN_OUTPUT_74',
      }],
    },
  }, {
    id: 'assignment',
    title: 'Assignment',
    data: { dueDate: null },
  }, 'student');
  const serialized = JSON.stringify(view);
  assert.equal('gradingSnapshot' in view, false);
  assert.equal(serialized.includes('GENERIC_ROUTE_HIDDEN_INPUT_74'), false);
  assert.equal(serialized.includes('GENERIC_ROUTE_HIDDEN_OUTPUT_74'), false);
});

const memoryStore = (initial = []) => {
  let records = structuredClone(initial);
  return {
    read: async () => structuredClone(records),
    mutate: async (callback) => {
      const value = await callback(records);
      return structuredClone(value);
    },
    value: () => structuredClone(records),
  };
};

test('grading retries infrastructure only, preserves history and deduplicates delivery', async () => {
  const jobs = memoryStore();
  const judgments = memoryStore();
  const submissions = memoryStore([submission]);
  let evaluations = 0;
  const queue = createGradingQueue({
    readJobs: jobs.read,
    mutateJobs: jobs.mutate,
    readJudgments: judgments.read,
    mutateJudgments: judgments.mutate,
    readSubmissions: submissions.read,
    mutateSubmissions: submissions.mutate,
    loadAssignmentVersion: async (record) => {
      // A newer v3 exists, but the immutable Submission must keep v2.
      assert.equal(record.assignmentVersionId, 'assignment-v2');
      return version([{ id: 'pinned-v2', input: 'v2', expectedOutput: 'ok', weight: 1 }]);
    },
    evaluator: async (input) => {
      evaluations += 1;
      if (evaluations === 1) throw new GradingInfrastructureError('temporary worker outage');
      return evaluateSubmission({ ...input, imageId, runner: async () => batch([success('ok')]) });
    },
    concurrency: 0,
    maxAttempts: 2,
  });

  const job = await queue.enqueue(submission.id);
  assert.equal(job.assignmentVersionId, submission.assignmentVersionId);
  await queue.process(job.id);
  assert.equal(submissions.value()[0].status, 'PENDING');
  assert.equal(judgments.value()[0].status, 'INTERNAL_ERROR');
  assert.equal(judgments.value()[0].score, null);

  await queue.process(job.id);
  assert.equal(submissions.value().length, 1);
  assert.equal(submissions.value()[0].status, 'COMPLETED');
  assert.equal(submissions.value()[0].gradingAttempts.length, 2);
  assert.equal(judgments.value().length, 2);
  assert.equal(judgments.value()[1].score, 100);

  await queue.process(job.id);
  assert.equal(evaluations, 2);
  assert.equal(judgments.value().length, 2);
  assert.equal(submissions.value()[0].gradingAttempts.length, 2);

  // Simulate a lost queue acknowledgement after the completed Judgment was durable.
  await jobs.mutate((records) => { records[0].state = 'QUEUED'; });
  await queue.process(job.id);
  assert.equal(evaluations, 2);
  assert.equal(judgments.value().length, 2);
});

test('student failures finalize without infrastructure retry', async () => {
  for (const sandboxStatus of ['SUCCESS', 'COMPILE_ERROR', 'RUNTIME_ERROR',
    'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED']) {
    const jobs = memoryStore();
    const judgments = memoryStore();
    const submissions = memoryStore([{ ...submission, id: `submission-${sandboxStatus}` }]);
    const queue = createGradingQueue({
      readJobs: jobs.read,
      mutateJobs: jobs.mutate,
      readJudgments: judgments.read,
      mutateJudgments: judgments.mutate,
      readSubmissions: submissions.read,
      mutateSubmissions: submissions.mutate,
      loadAssignmentVersion: async () => version([
        { id: 'case', input: 'input', expectedOutput: 'expected', weight: 1 },
      ]),
      evaluator: (input) => evaluateSubmission({
        ...input,
        imageId,
        runner: async () => batch([sandboxStatus === 'SUCCESS'
          ? success('wrong')
          : { ...success(''), status: sandboxStatus, exitCode: 1 }]),
      }),
      concurrency: 0,
    });
    const job = await queue.enqueue(submissions.value()[0].id);
    await queue.process(job.id);
    assert.equal(jobs.value()[0].attempts, 1);
    assert.equal(jobs.value()[0].state, 'COMPLETED');
    assert.equal(judgments.value()[0].status, 'COMPLETED');
  }
});

test('weighted scoring supports unequal weights and backend two-decimal precision', async () => {
  const result = await evaluateSubmission({
    submission,
    assignmentVersion: version([
      { id: 'light', input: '1', expectedOutput: 'yes', weight: 1 },
      { id: 'heavy', input: '2', expectedOutput: 'yes', weight: 2 },
    ]),
    judgmentId: 'judgment-unequal',
    imageId,
    runner: async () => batch([success('yes'), success('no')]),
  });
  assert.equal(result.earnedWeight, 1);
  assert.equal(result.maxWeight, 3);
  assert.equal(result.score, 33.33);
});

test('invalid pinned test weights fail as infrastructure configuration errors', async () => {
  for (const weight of [0, -1, Number.NaN]) {
    await assert.rejects(() => evaluateSubmission({
      submission,
      assignmentVersion: version([{ id: 'invalid', input: '', expectedOutput: '', weight }]),
      judgmentId: `judgment-invalid-${String(weight)}`,
      imageId,
      runner: async () => batch([success('')]),
    }), GradingInfrastructureError);
  }
});

test('one compile covers the attempt and WA, RE, TLE, MLE do not stop later tests', async () => {
  let batchCalls = 0;
  const statuses = [
    success('wrong'),
    { ...success(''), status: 'RUNTIME_ERROR', exitCode: 1 },
    { ...success(''), status: 'TIME_LIMIT_EXCEEDED', exitCode: 1 },
    { ...success(''), status: 'MEMORY_LIMIT_EXCEEDED', exitCode: 1 },
    success('expected-5'),
  ];
  const result = await evaluateSubmission({
    submission,
    assignmentVersion: version(statuses.map((_, index) => ({
      id: `case-${index + 1}`,
      input: String(index + 1),
      expectedOutput: `expected-${index + 1}`,
      weight: 1,
    }))),
    judgmentId: 'judgment-independent',
    imageId,
    runner: async ({ tests: batchTests }) => {
      batchCalls += 1;
      assert.equal(batchTests.length, 5);
      return batch(statuses);
    },
  });
  assert.equal(batchCalls, 1);
  assert.equal(result.testResults.length, 5);
  assert.deepEqual(result.testResults.map((item) => item.verdict), [
    'WRONG_ANSWER',
    'RUNTIME_ERROR',
    'TIME_LIMIT_EXCEEDED',
    'MEMORY_LIMIT_EXCEEDED',
    'PASSED',
  ]);
  assert.equal(result.score, 20);
});

test('worker restart records the interrupted attempt and safely requeues the same submission', async () => {
  const interruptedAt = '2026-11-09T00:00:00.000Z';
  const jobId = `grading-job-${submission.id}`;
  const judgmentId = `${jobId}-attempt-1`;
  const jobs = memoryStore([{
    id: jobId,
    submissionId: submission.id,
    assignmentVersionId: submission.assignmentVersionId,
    state: 'RUNNING',
    attempts: 1,
    maxAttempts: 2,
    currentJudgmentId: judgmentId,
    updatedAt: interruptedAt,
  }]);
  const judgments = memoryStore([{
    id: judgmentId,
    jobId,
    submissionId: submission.id,
    assignmentVersionId: submission.assignmentVersionId,
    attempt: 1,
    status: 'JUDGING',
    verdict: null,
    score: null,
    createdAt: interruptedAt,
    startedAt: interruptedAt,
    completedAt: null,
    testResults: [],
  }]);
  const submissions = memoryStore([{ ...submission, status: 'JUDGING' }]);
  const queue = createGradingQueue({
    readJobs: jobs.read,
    mutateJobs: jobs.mutate,
    readJudgments: judgments.read,
    mutateJudgments: judgments.mutate,
    readSubmissions: submissions.read,
    mutateSubmissions: submissions.mutate,
    loadAssignmentVersion: async () => version([
      { id: 'pinned', input: 'x', expectedOutput: 'ok', weight: 1 },
    ]),
    evaluator: (input) => evaluateSubmission({
      ...input,
      imageId,
      runner: async () => batch([success('ok')]),
    }),
    concurrency: 0,
  });

  await queue.initialize();
  assert.equal(jobs.value()[0].state, 'QUEUED');
  assert.equal(judgments.value()[0].status, 'INTERNAL_ERROR');
  assert.equal(judgments.value()[0].score, null);
  assert.equal(submissions.value()[0].status, 'PENDING');
  assert.equal(submissions.value()[0].gradingAttempts.length, 1);

  await queue.process(jobId);
  assert.equal(submissions.value()[0].status, 'COMPLETED');
  assert.equal(submissions.value()[0].gradingAttempts.length, 2);
  assert.equal(judgments.value()[1].attempt, 2);
});

test('an unexpected dispatch failure is recovered without terminating the worker', async () => {
  const jobs = memoryStore();
  const judgments = memoryStore();
  const submissions = memoryStore([submission]);
  let failFirstJudgmentWrite = true;
  const queue = createGradingQueue({
    readJobs: jobs.read,
    mutateJobs: jobs.mutate,
    readJudgments: judgments.read,
    mutateJudgments: async (callback) => {
      if (failFirstJudgmentWrite) {
        failFirstJudgmentWrite = false;
        throw new Error('transient persistence failure');
      }
      return judgments.mutate(callback);
    },
    readSubmissions: submissions.read,
    mutateSubmissions: submissions.mutate,
    loadAssignmentVersion: async () => version([
      { id: 'pinned', input: 'x', expectedOutput: 'ok', weight: 1 },
    ]),
    evaluator: (input) => evaluateSubmission({
      ...input,
      imageId,
      runner: async () => batch([success('ok')]),
    }),
    retryDelayMs: 1,
    maxAttempts: 2,
  });

  await queue.enqueue(submission.id);
  for (let poll = 0; poll < 100 && submissions.value()[0].status !== 'COMPLETED'; poll += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(submissions.value()[0].status, 'COMPLETED');
  assert.equal(jobs.value()[0].state, 'COMPLETED');
  assert.equal(jobs.value()[0].attempts, 2);
  assert.equal(judgments.value()[0].status, 'INTERNAL_ERROR');
  assert.equal(judgments.value()[0].score, null);
  assert.equal(judgments.value()[1].score, 100);
});
