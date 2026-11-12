import { createHash, randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';

import { runSandboxBatch, sandboxImageId } from './sandbox.mjs';

export const GRADING_STATUS = Object.freeze({
  PENDING: 'PENDING',
  JUDGING: 'JUDGING',
  COMPLETED: 'COMPLETED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

export const GRADING_VERDICT = Object.freeze({
  ACCEPTED: 'ACCEPTED',
  WRONG_ANSWER: 'WRONG_ANSWER',
  COMPILE_ERROR: 'COMPILE_ERROR',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  OUTPUT_LIMIT_EXCEEDED: 'OUTPUT_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

const STUDENT_VERDICTS = new Set([
  'WRONG_ANSWER',
  'COMPILE_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'OUTPUT_LIMIT_EXCEEDED',
]);

const truncateUtf8 = (value, bytes = 32_000) => {
  const buffer = Buffer.from(String(value ?? ''));
  if (buffer.length <= bytes) return buffer.toString();
  return new StringDecoder('utf8').write(buffer.subarray(0, bytes));
};

const normalizeOutput = (value, comparator = {}) => {
  let output = String(value ?? '');
  if (comparator.normalizeLineEndings !== false) output = output.replace(/\r\n/g, '\n');
  return comparator.trimTrailingNewline === false ? output : output.replace(/\n+$/, '');
};

export class GradingInfrastructureError extends Error {
  constructor(message = 'Grading infrastructure failed.', details = {}) {
    super(message);
    this.name = 'GradingInfrastructureError';
    this.retryable = true;
    this.details = details;
  }
}

export const deriveJudgmentVerdict = (results) => {
  if (results.length > 0 && results.every((result) => result.verdict === 'PASSED')) {
    return GRADING_VERDICT.ACCEPTED;
  }
  const priority = [
    'COMPILE_ERROR',
    'MEMORY_LIMIT_EXCEEDED',
    'TIME_LIMIT_EXCEEDED',
    'OUTPUT_LIMIT_EXCEEDED',
    'RUNTIME_ERROR',
    'WRONG_ANSWER',
  ];
  return priority.find((verdict) => results.some((result) => result.verdict === verdict))
    ?? GRADING_VERDICT.WRONG_ANSWER;
};

export async function evaluateSubmission({
  submission,
  assignmentVersion,
  judgmentId,
  runner = runSandboxBatch,
  imageId = sandboxImageId,
}) {
  const tests = Array.isArray(assignmentVersion.testCases)
    ? assignmentVersion.testCases
    : [];
  if (tests.length === 0) {
    throw new GradingInfrastructureError('Pinned assignment version has no test cases.');
  }
  if (tests.some((testCase) => !Number.isFinite(Number(testCase.weight))
    || Number(testCase.weight) <= 0)) {
    throw new GradingInfrastructureError('Pinned assignment version has invalid test weights.');
  }

  const sandboxImage = await imageId();
  if (!sandboxImage) {
    throw new GradingInfrastructureError('Sandbox image is unavailable.');
  }

  const cpuTimeLimitMs = Math.min(
    Math.max(Number(assignmentVersion.cpuTimeLimitMs) || 1_000, 1),
    10_000,
  );
  const memoryLimitMb = Math.min(
    Math.max(Number(assignmentVersion.memoryLimitMb) || 128, 1),
    1_024,
  );
  let batch;
  try {
    batch = await runner({
      executionId: `grading-${randomUUID()}`,
      sourceCode: submission.sourceCode,
      runtime: assignmentVersion.runtime ?? assignmentVersion.language,
      sandboxImage,
      tests: tests.map((testCase) => ({ input: String(testCase.input ?? '') })),
      cpuTimeLimitMs,
      wallTimeLimitMs: cpuTimeLimitMs * 2 + 250,
      memoryLimitMb,
    });
  } catch (error) {
    throw new GradingInfrastructureError('Grading worker crashed.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (batch?.status === 'INTERNAL_ERROR' || !batch?.status) {
    throw new GradingInfrastructureError('Sandbox returned an infrastructure error.');
  }

  const compileError = batch.status === 'COMPILE_ERROR';
  if (!compileError && (batch.status !== 'SUCCESS' || !Array.isArray(batch.results)
    || batch.results.length !== tests.length)) {
    throw new GradingInfrastructureError('Sandbox returned an invalid grading batch.');
  }

  const rawResults = compileError ? [batch] : batch.results;
  const evaluatedTests = compileError ? tests.slice(0, 1) : tests;
  const testResults = [];

  for (let index = 0; index < evaluatedTests.length; index += 1) {
    const testCase = evaluatedTests[index];
    const result = rawResults[index];
    if (result?.status === 'INTERNAL_ERROR' || !result?.status) {
      throw new GradingInfrastructureError('Sandbox returned an infrastructure error.', {
        testCaseId: testCase.id,
      });
    }

    const passed = result.status === 'SUCCESS'
      && !result.outputTruncated
      && normalizeOutput(result.stdout, assignmentVersion.comparator)
        === normalizeOutput(testCase.expectedOutput, assignmentVersion.comparator);
    const verdict = result.status === 'SUCCESS'
      ? (passed ? 'PASSED' : 'WRONG_ANSWER')
      : result.status;
    if (!passed && verdict !== 'PASSED' && !STUDENT_VERDICTS.has(verdict)) {
      throw new GradingInfrastructureError('Sandbox returned an unsupported verdict.', { verdict });
    }

    testResults.push({
      id: `${judgmentId}-test-${index + 1}`,
      judgmentId,
      testCaseId: testCase.id,
      testCaseIndex: index,
      hidden: Boolean(testCase.hidden),
      weight: Number(testCase.weight),
      earnedWeight: passed ? Number(testCase.weight) : 0,
      verdict,
      passed,
      input: String(testCase.input ?? ''),
      expectedOutput: String(testCase.expectedOutput ?? ''),
      actualOutput: truncateUtf8(result.stdout),
      stderr: truncateUtf8(result.stderr),
      runtimeMs: Number(result.runtimeMs) || 0,
      memoryUsageKb: Number.isFinite(result.memoryUsageKb) ? result.memoryUsageKb : null,
      outputTruncated: Boolean(result.outputTruncated),
      exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
    });
  }

  const maxWeight = tests.reduce((sum, testCase) => sum + Number(testCase.weight), 0);
  const earnedWeight = testResults.reduce((sum, result) => sum + result.earnedWeight, 0);
  const passedCount = testResults.filter((result) => result.passed).length;
  const hiddenTests = tests.filter((testCase) => testCase.hidden);
  return {
    verdict: deriveJudgmentVerdict(testResults),
    earnedWeight,
    maxWeight,
    score: maxWeight > 0 ? Math.round((earnedWeight / maxWeight) * 10_000) / 100 : 0,
    passedCount,
    failedCount: compileError
      ? tests.length
      : testResults.filter((result) => !result.passed).length,
    totalCount: tests.length,
    hiddenSummary: {
      passedCount: testResults.filter((result) => result.hidden && result.passed).length,
      totalCount: hiddenTests.length,
      earnedWeight: testResults
        .filter((result) => result.hidden)
        .reduce((sum, result) => sum + result.earnedWeight, 0),
      maxWeight: hiddenTests.reduce((sum, testCase) => sum + Number(testCase.weight), 0),
    },
    testResults,
  };
}

const hiddenSummary = (results) => {
  const hidden = results.filter((result) => result.hidden);
  return {
    passedCount: hidden.filter((result) => result.passed).length,
    totalCount: hidden.length,
    earnedWeight: hidden.reduce((sum, result) => sum + result.earnedWeight, 0),
    maxWeight: hidden.reduce((sum, result) => sum + result.weight, 0),
  };
};

const publicTestResultView = (result) => ({
  testCaseId: result.testCaseId,
  verdict: result.verdict,
  passed: result.passed,
  weight: result.weight,
  earnedWeight: result.earnedWeight,
  input: result.input,
  expectedOutput: result.expectedOutput,
  actualOutput: result.actualOutput,
  stderr: result.stderr,
  runtimeMs: result.runtimeMs,
  memoryUsageKb: result.memoryUsageKb,
  outputTruncated: result.outputTruncated,
});

const judgmentBaseView = (judgment) => ({
  id: judgment.id,
  submissionId: judgment.submissionId,
  attempt: judgment.attempt,
  status: judgment.status,
  verdict: judgment.verdict,
  earnedWeight: judgment.earnedWeight,
  maxWeight: judgment.maxWeight,
  score: judgment.score,
  passedCount: judgment.passedCount,
  failedCount: judgment.failedCount,
  totalCount: judgment.totalCount,
  assignmentVersionId: judgment.assignmentVersionId,
  createdAt: judgment.createdAt,
  startedAt: judgment.startedAt,
  completedAt: judgment.completedAt,
});

export const studentJudgmentView = (judgment) => ({
  ...judgmentBaseView(judgment),
  publicTests: (judgment.testResults ?? [])
    .filter((result) => !result.hidden)
    .map(publicTestResultView),
  hiddenTests: judgment.hiddenSummary ?? hiddenSummary(judgment.testResults ?? []),
});

export const lecturerJudgmentView = (judgment) => ({
  ...judgmentBaseView(judgment),
  testResults: structuredClone(judgment.testResults ?? []),
  internalError: judgment.internalError ?? null,
});

const sourceHash = (submission) => createHash('sha256')
  .update(String(submission.sourceCode ?? ''))
  .digest('hex');

// Durable JSON ledger plus a bounded in-process worker, matching the existing execution queue.
export function createGradingQueue({
  readJobs,
  mutateJobs,
  readJudgments,
  mutateJudgments,
  readSubmissions,
  mutateSubmissions,
  loadAssignmentVersion,
  evaluator = evaluateSubmission,
  runner = runSandboxBatch,
  imageId = sandboxImageId,
  concurrency = 2,
  maxAttempts = 3,
  retryDelayMs = 25,
}) {
  const pending = [];
  const queued = new Set();
  let active = 0;
  let initialized;

  const updateSubmission = (submissionId, callback) => mutateSubmissions((records) => {
    const submission = records.find((record) => record.kind === 'CODE_SUBMISSION'
      && record.id === submissionId);
    if (!submission) throw new GradingInfrastructureError('Submission no longer exists.');
    return callback(submission);
  });

  const saveJudgment = (judgment) => mutateJudgments((records) => {
    const index = records.findIndex((record) => record.id === judgment.id);
    if (index >= 0) records[index] = structuredClone(judgment);
    else records.push(structuredClone(judgment));
    return judgment;
  });

  const reconcileCompleted = async (job) => {
    if (!job?.currentJudgmentId) return false;
    const judgment = (await readJudgments())
      .find((record) => record.id === job.currentJudgmentId);
    if (judgment?.status !== GRADING_STATUS.COMPLETED) return false;
    await updateSubmission(job.submissionId, (record) => {
      record.status = GRADING_STATUS.COMPLETED;
      record.latestJudgmentId = judgment.id;
      record.gradingAttempts ??= [];
      if (!record.gradingAttempts.some((attempt) => attempt.judgmentId === judgment.id)) {
        record.gradingAttempts.push({
          judgmentId: judgment.id,
          attempt: judgment.attempt,
          status: judgment.status,
          verdict: judgment.verdict,
          completedAt: judgment.completedAt,
        });
      }
    });
    await mutateJobs((records) => {
      const current = records.find((record) => record.id === job.id);
      if (current) Object.assign(current, {
        state: 'COMPLETED',
        currentJudgmentId: judgment.id,
        completedAt: judgment.completedAt,
        updatedAt: judgment.completedAt,
      });
    });
    return true;
  };

  const queueId = (jobId) => {
    if (queued.has(jobId)) return;
    queued.add(jobId);
    pending.push(jobId);
  };

  const schedule = (jobId, delay = 0) => {
    if (delay <= 0) {
      queueId(jobId);
      dispatch();
      return;
    }
    const timer = setTimeout(() => {
      queueId(jobId);
      dispatch();
    }, delay);
    timer.unref?.();
  };

  const recover = async () => {
    const jobs = await readJobs();
    for (const job of jobs) {
      if (job.state !== 'RUNNING') continue;
      if (await reconcileCompleted(job)) continue;
      const now = new Date().toISOString();
      if (job.currentJudgmentId) {
        await mutateJudgments((records) => {
          const judgment = records.find((record) => record.id === job.currentJudgmentId);
          if (judgment && judgment.status === GRADING_STATUS.JUDGING) {
            Object.assign(judgment, {
              status: GRADING_STATUS.INTERNAL_ERROR,
              verdict: GRADING_VERDICT.INTERNAL_ERROR,
              earnedWeight: null,
              maxWeight: null,
              score: null,
              completedAt: now,
              internalError: 'Worker process stopped before grading completed.',
            });
          }
        });
      }
      await mutateJobs((records) => {
        const current = records.find((record) => record.id === job.id);
        if (!current) return;
        current.state = current.attempts < current.maxAttempts ? 'QUEUED' : 'FAILED';
        current.updatedAt = now;
      });
      await updateSubmission(job.submissionId, (submission) => {
        submission.status = job.attempts < job.maxAttempts
          ? GRADING_STATUS.PENDING
          : GRADING_STATUS.INTERNAL_ERROR;
        if (job.currentJudgmentId) {
          submission.latestJudgmentId = job.currentJudgmentId;
          submission.gradingAttempts ??= [];
          if (!submission.gradingAttempts.some((attempt) =>
            attempt.judgmentId === job.currentJudgmentId)) {
            submission.gradingAttempts.push({
              judgmentId: job.currentJudgmentId,
              attempt: job.attempts,
              status: GRADING_STATUS.INTERNAL_ERROR,
              verdict: GRADING_VERDICT.INTERNAL_ERROR,
              completedAt: now,
            });
          }
        }
      });
    }
    for (const job of await readJobs()) {
      if (job.state === 'QUEUED') queueId(job.id);
    }
    dispatch();
  };

  const ready = () => initialized ??= recover();

  const claim = (jobId) => mutateJobs((records) => {
    const job = records.find((record) => record.id === jobId);
    if (!job || job.state !== 'QUEUED') return null;
    job.state = 'RUNNING';
    job.attempts += 1;
    job.currentJudgmentId = `${job.id}-attempt-${job.attempts}`;
    job.updatedAt = new Date().toISOString();
    return structuredClone(job);
  });

  const execute = async (jobId) => {
    const existingJob = (await readJobs()).find((record) => record.id === jobId);
    if (await reconcileCompleted(existingJob)) return;
    const job = await claim(jobId);
    if (!job) return;
    const startedAt = new Date().toISOString();
    const submissions = await readSubmissions();
    const submission = submissions.find((record) => record.kind === 'CODE_SUBMISSION'
      && record.id === job.submissionId);
    const judgment = {
      id: job.currentJudgmentId,
      jobId: job.id,
      submissionId: job.submissionId,
      assignmentVersionId: submission?.assignmentVersionId ?? null,
      sourceHash: submission ? sourceHash(submission) : null,
      attempt: job.attempts,
      status: GRADING_STATUS.JUDGING,
      verdict: null,
      earnedWeight: null,
      maxWeight: null,
      score: null,
      passedCount: 0,
      failedCount: 0,
      totalCount: 0,
      testResults: [],
      createdAt: startedAt,
      startedAt,
      completedAt: null,
      internalError: null,
    };
    await saveJudgment(judgment);
    await updateSubmission(job.submissionId, (record) => {
      record.status = GRADING_STATUS.JUDGING;
      record.latestJudgmentId = judgment.id;
    });

    try {
      if (!submission) throw new GradingInfrastructureError('Submission no longer exists.');
      if (!job.assignmentVersionId) {
        job.assignmentVersionId = submission.assignmentVersionId;
        await mutateJobs((records) => {
          const current = records.find((record) => record.id === job.id);
          if (current) current.assignmentVersionId = submission.assignmentVersionId;
        });
      }
      if (job.assignmentVersionId !== submission.assignmentVersionId) {
        throw new GradingInfrastructureError('Grading job version does not match the immutable submission.');
      }
      const assignmentVersion = await loadAssignmentVersion(submission);
      if (!assignmentVersion || assignmentVersion.id !== submission.assignmentVersionId) {
        throw new GradingInfrastructureError('Pinned assignment version is unavailable.');
      }
      const result = await evaluator({
        submission,
        assignmentVersion,
        judgmentId: judgment.id,
        runner,
        imageId,
      });
      Object.assign(judgment, result, {
        status: GRADING_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
      });
      // Persist the complete Judgment/TestResults before exposing COMPLETED on Submission.
      await saveJudgment(judgment);
      await updateSubmission(job.submissionId, (record) => {
        record.status = GRADING_STATUS.COMPLETED;
        record.latestJudgmentId = judgment.id;
        record.gradingAttempts ??= [];
        if (!record.gradingAttempts.some((attempt) => attempt.judgmentId === judgment.id)) {
          record.gradingAttempts.push({
            judgmentId: judgment.id,
            attempt: judgment.attempt,
            status: judgment.status,
            verdict: judgment.verdict,
            completedAt: judgment.completedAt,
          });
        }
      });
      await mutateJobs((records) => {
        const current = records.find((record) => record.id === job.id);
        if (current) Object.assign(current, {
          state: 'COMPLETED',
          currentJudgmentId: judgment.id,
          completedAt: judgment.completedAt,
          updatedAt: judgment.completedAt,
        });
      });
    } catch (error) {
      const retryable = error?.retryable === true;
      Object.assign(judgment, {
        status: GRADING_STATUS.INTERNAL_ERROR,
        verdict: GRADING_VERDICT.INTERNAL_ERROR,
        earnedWeight: null,
        maxWeight: null,
        score: null,
        completedAt: new Date().toISOString(),
        internalError: error instanceof Error ? error.message : 'Unknown grading infrastructure error.',
      });
      await saveJudgment(judgment);
      const willRetry = retryable && job.attempts < job.maxAttempts;
      await updateSubmission(job.submissionId, (record) => {
        record.status = willRetry ? GRADING_STATUS.PENDING : GRADING_STATUS.INTERNAL_ERROR;
        record.latestJudgmentId = judgment.id;
        record.gradingAttempts ??= [];
        if (!record.gradingAttempts.some((attempt) => attempt.judgmentId === judgment.id)) {
          record.gradingAttempts.push({
            judgmentId: judgment.id,
            attempt: judgment.attempt,
            status: judgment.status,
            verdict: judgment.verdict,
            completedAt: judgment.completedAt,
          });
        }
      });
      await mutateJobs((records) => {
        const current = records.find((record) => record.id === job.id);
        if (current) Object.assign(current, {
          state: willRetry ? 'QUEUED' : 'FAILED',
          updatedAt: judgment.completedAt,
          lastError: judgment.internalError,
        });
      });
      if (willRetry) schedule(job.id, retryDelayMs * job.attempts);
    }
  };

  const recoverUnexpectedFailure = async (jobId, error) => {
    const now = new Date().toISOString();
    const job = (await readJobs()).find((record) => record.id === jobId);
    if (!job || ['COMPLETED', 'FAILED'].includes(job.state)) return;
    const message = error instanceof Error ? error.message : 'Unknown grading worker error.';
    const willRetry = job.attempts < job.maxAttempts;
    if (job.currentJudgmentId) {
      await mutateJudgments((records) => {
        let judgment = records.find((record) => record.id === job.currentJudgmentId);
        if (!judgment) {
          judgment = {
            id: job.currentJudgmentId,
            jobId: job.id,
            submissionId: job.submissionId,
            assignmentVersionId: job.assignmentVersionId ?? null,
            sourceHash: null,
            attempt: job.attempts,
            createdAt: now,
            startedAt: now,
            testResults: [],
            passedCount: 0,
            failedCount: 0,
            totalCount: 0,
          };
          records.push(judgment);
        }
        Object.assign(judgment, {
          status: GRADING_STATUS.INTERNAL_ERROR,
          verdict: GRADING_VERDICT.INTERNAL_ERROR,
          earnedWeight: null,
          maxWeight: null,
          score: null,
          completedAt: now,
          internalError: message,
        });
      });
    }
    await mutateJobs((records) => {
      const current = records.find((record) => record.id === jobId);
      if (!current) return;
      current.state = willRetry ? 'QUEUED' : 'FAILED';
      current.updatedAt = now;
      current.lastError = message;
    });
    await updateSubmission(job.submissionId, (submission) => {
      submission.status = willRetry ? GRADING_STATUS.PENDING : GRADING_STATUS.INTERNAL_ERROR;
      if (!job.currentJudgmentId) return;
      submission.latestJudgmentId = job.currentJudgmentId;
      submission.gradingAttempts ??= [];
      if (!submission.gradingAttempts.some((attempt) =>
        attempt.judgmentId === job.currentJudgmentId)) {
        submission.gradingAttempts.push({
          judgmentId: job.currentJudgmentId,
          attempt: job.attempts,
          status: GRADING_STATUS.INTERNAL_ERROR,
          verdict: GRADING_VERDICT.INTERNAL_ERROR,
          completedAt: now,
        });
      }
    });
    if (willRetry) schedule(jobId, retryDelayMs * Math.max(job.attempts, 1));
  };

  function dispatch() {
    while (active < concurrency && pending.length > 0) {
      const jobId = pending.shift();
      queued.delete(jobId);
      active += 1;
      void execute(jobId)
        .catch(async (error) => {
          try {
            await recoverUnexpectedFailure(jobId, error);
          } catch (recoveryError) {
            // Keep an unexpected persistence failure from terminating the API process.
            console.error('Unable to recover grading job', jobId, recoveryError);
          }
        })
        .finally(() => {
          active -= 1;
          dispatch();
        });
    }
  }

  return {
    async initialize() {
      await ready();
    },
    async enqueue(submissionId) {
      await ready();
      const submission = (await readSubmissions()).find((record) =>
        record.kind === 'CODE_SUBMISSION' && record.id === submissionId);
      if (!submission) throw new GradingInfrastructureError('Submission no longer exists.');
      const job = await mutateJobs((records) => {
        const id = `grading-job-${submissionId}`;
        const existing = records.find((record) => record.id === id);
        if (existing) {
          // Backfill ledgers created before SCRUM-74 persisted the version on jobs.
          existing.assignmentVersionId ??= submission.assignmentVersionId;
          if (existing.assignmentVersionId !== submission.assignmentVersionId) {
            throw new GradingInfrastructureError('Existing grading job has a conflicting assignment version.');
          }
          return structuredClone(existing);
        }
        const now = new Date().toISOString();
        const created = {
          id,
          submissionId,
          assignmentVersionId: submission.assignmentVersionId,
          state: 'QUEUED',
          attempts: 0,
          maxAttempts,
          currentJudgmentId: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          lastError: null,
        };
        records.push(created);
        return structuredClone(created);
      });
      if (job.state === 'QUEUED') schedule(job.id);
      return job;
    },
    async process(jobId) {
      await ready();
      await execute(jobId);
      return (await readJobs()).find((record) => record.id === jobId) ?? null;
    },
    async listJudgments(submissionId) {
      await ready();
      return (await readJudgments())
        .filter((judgment) => judgment.submissionId === submissionId)
        .sort((left, right) => left.attempt - right.attempt);
    },
    async getJudgment(judgmentId) {
      await ready();
      return (await readJudgments()).find((judgment) => judgment.id === judgmentId) ?? null;
    },
    async listJobs() {
      await ready();
      return readJobs();
    },
  };
}
