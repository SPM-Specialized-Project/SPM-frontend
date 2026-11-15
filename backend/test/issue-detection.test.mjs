import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { APPROVED_PROBLEM_TYPES, createIssueDetectionService } from '../issue-detection.mjs';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function createStore(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'spm-issue-detection-'));
  t.after(async () => rm(directory, { recursive: true, force: true }));
  return path.join(directory, 'issue-detection.json');
}

function triggerInput(snapshotId, options = {}) {
  const sourceCode = options.sourceCode ?? 'while (true) {}';
  return {
    workspace: {
      id: 'workspace-1',
      classroomId: 'class-1',
      assignmentId: 'problem-1',
      ownerEmail: 'student@example.test',
    },
    snapshot: { id: snapshotId, hash: `hash-${snapshotId}`, revision: 1 },
    assignmentVersion: {
      id: 'problem-1-v1',
      assignmentId: 'problem-1',
      version: 1,
      title: 'Loop practice',
      description: 'Practice loop termination.',
    },
    milestone: 'RUN',
    executionId: `execution-${snapshotId}`,
    execution: {
      id: `execution-${snapshotId}`,
      state: 'FINISHED',
      status: 'COMPLETED_WITH_FAILURES',
      results: [{ testCaseId: 'case-1', status: 'TIME_LIMIT_EXCEEDED', passed: false }],
    },
    eventId: options.eventId,
    eventSequence: options.eventSequence,
    sourceCode,
  };
}

function evidenceEvaluator(sequenceLog = []) {
  return async (input) => {
    sequenceLog.push(input.eventSequence);
    return {
      findings: [{
        problemTypeId: 'INFINITE_RECURSION',
        rationale: 'The loop does not reach a terminating condition.',
        evidence: [{
          kind: 'CODE',
          snapshotId: input.snapshot.id,
          lineStart: 1,
          lineEnd: 1,
          excerpt: input.snapshot.sourceCode,
        }],
      }],
    };
  };
}

async function waitForTerminal(service, count) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const items = await service.listAssessments('class-1');
    if (items.length === count && items.every((item) => ['EVALUATED', 'INSUFFICIENT_EVIDENCE', 'FAILED'].includes(item.state))) return items;
    await wait(5);
  }
  const items = await service.listAssessments('class-1');
  throw new Error(`Expected ${count} terminal assessments: ${JSON.stringify(items.map(({ id, state, eventSequence, resultCode }) => ({ id, state, eventSequence, resultCode })))}`);
}

test('SCRUM-75: sequences concurrent events, deduplicates retries, and appends evidence to one active case', async (t) => {
  const file = await createStore(t);
  const evaluationOrder = [];
  const emittedEvents = [];
  const service = createIssueDetectionService({
    file,
    evaluate: evidenceEvaluator(evaluationOrder),
    resolveSnapshot: async (id) => ({
      id,
      sourceCode: 'while (true) {}',
      hash: `hash-${id}`,
      revision: 1,
    }),
  });
  const unsubscribe = service.subscribe((event) => emittedEvents.push(event.type));
  t.after(unsubscribe);
  await Promise.all([service.initialize(), service.initialize()]);

  const inputs = [
    triggerInput('snapshot-1', { eventId: 'save-1' }),
    triggerInput('snapshot-2', { eventId: 'run-2' }),
    triggerInput('snapshot-3', { eventId: 'submit-3' }),
  ];
  const accepted = await Promise.all(inputs.map((input, index) => service.trigger({
    ...input,
    milestone: ['SAVE', 'RUN', 'SUBMIT'][index],
  })));

  assert.deepEqual(accepted.map((item) => item.eventSequence).sort((left, right) => left - right), [1, 2, 3]);
  const retry = await service.trigger({ ...inputs[1], eventSequence: accepted[1].eventSequence });
  assert.equal(retry.id, accepted[1].id);

  const assessments = await waitForTerminal(service, 3);
  assert.deepEqual(evaluationOrder, [1, 2, 3]);
  const issueCases = await service.listIssueCases('class-1');
  assert.equal(assessments.length, 3);
  assert.equal(issueCases.length, 1);
  assert.equal(issueCases[0].status, 'ACTIVE');
  assert.equal(issueCases[0].evidence.length, 3);
  assert.ok(emittedEvents.includes('assessment'));
  assert.ok(emittedEvents.includes('issue-cases'));
});

test('SCRUM-75: holds sequence gaps and processes them in order when the missing event arrives', async (t) => {
  const file = await createStore(t);
  const evaluationOrder = [];
  const service = createIssueDetectionService({
    file,
    evaluate: async (input) => {
      evaluationOrder.push(input.eventSequence);
      return { findings: [] };
    },
    resolveSnapshot: async (id) => ({ id, sourceCode: 'print(1)', hash: id, revision: 1 }),
  });

  const later = await service.trigger(triggerInput('snapshot-2', { eventId: 'event-2', eventSequence: 2 }));
  await wait(30);
  const held = (await service.listAssessments('class-1')).find((item) => item.id === later.id);
  assert.equal(held.state, 'PENDING');
  assert.equal(held.resultCode, 'EVENT_SEQUENCE_GAP');
  assert.equal(held.missingEventSequence, 1);
  assert.deepEqual(evaluationOrder, []);

  await service.trigger(triggerInput('snapshot-1', { eventId: 'event-1', eventSequence: 1 }));
  const assessments = await waitForTerminal(service, 2);
  assert.deepEqual(evaluationOrder, [1, 2]);
  assert.ok(assessments.every((item) => item.state === 'INSUFFICIENT_EVIDENCE'));
});

test('SCRUM-75: recovers evaluating assessments after a service restart', async (t) => {
  const file = await createStore(t);
  const now = new Date().toISOString();
  await writeFile(file, `${JSON.stringify({
    assessments: [{
      id: 'assessment-restart',
      eventId: 'event-restart',
      eventSequence: 1,
      classroomId: 'class-1',
      workspaceId: 'workspace-1',
      studentEmail: 'student@example.test',
      assignmentId: 'problem-1',
      assignmentVersionId: 'problem-1-v1',
      snapshotId: 'snapshot-restart',
      executionId: null,
      submissionId: null,
      milestone: 'SAVE',
      state: 'EVALUATING',
      inputCoverage: { snapshot: true, problemVersion: true, executionContext: false },
      createdAt: now,
      updatedAt: now,
      analysisInput: {
        eventId: 'event-restart',
        eventSequence: 1,
        milestone: 'SAVE',
        problem: { id: 'problem-1', versionId: 'problem-1-v1', title: 'Loop practice' },
        problemTypes: APPROVED_PROBLEM_TYPES,
      },
    }],
    issueCases: [],
    caseEvidence: [],
    problemTypes: APPROVED_PROBLEM_TYPES,
    caseTests: [],
  }, null, 2)}\n`, 'utf8');

  let evaluations = 0;
  const service = createIssueDetectionService({
    file,
    evaluate: async () => { evaluations += 1; return { findings: [] }; },
    resolveSnapshot: async (id) => ({ id, sourceCode: 'print(1)', hash: id, revision: 1 }),
  });
  await service.initialize();
  const items = await waitForTerminal(service, 1);
  assert.equal(items[0].state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(evaluations, 1);
});

test('SCRUM-75: separates runner failures, provider errors, and unverifiable findings', async (t) => {
  const file = await createStore(t);
  const service = createIssueDetectionService({
    file,
    evaluate: async (input) => {
      if (input.snapshot.id === 'snapshot-provider-error') {
        throw Object.assign(new Error('Provider unavailable.'), { code: 'AI_PROVIDER_UNAVAILABLE' });
      }
      return {
        findings: [
          {
            problemTypeId: 'UNAPPROVED_TYPE',
            rationale: 'This finding uses a category outside the approved taxonomy.',
            evidence: [{ kind: 'CODE', snapshotId: input.snapshot.id, lineStart: 1, lineEnd: 1, excerpt: 'while (true) {}' }],
          },
          {
            problemTypeId: 'BOUNDARY_FAILURE',
            rationale: 'This finding cites code that is not present in the stored snapshot.',
            evidence: [{ kind: 'CODE', snapshotId: input.snapshot.id, lineStart: 1, lineEnd: 1, excerpt: 'invented code' }],
          },
        ],
      };
    },
    resolveSnapshot: async (id) => ({ id, sourceCode: 'while (true) {}', hash: id, revision: 1 }),
  });

  const runnerFailure = triggerInput('snapshot-runner-error');
  runnerFailure.execution.status = 'INTERNAL_ERROR';
  runnerFailure.execution.results = [{ testCaseId: 'case-1', status: 'INTERNAL_ERROR', passed: false }];
  await service.trigger(runnerFailure);
  await service.trigger(triggerInput('snapshot-provider-error'));
  await service.trigger(triggerInput('snapshot-unverifiable'));

  const items = await waitForTerminal(service, 3);
  const bySnapshot = new Map(items.map((item) => [item.snapshotId, item]));
  assert.equal(bySnapshot.get('snapshot-runner-error')?.state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(bySnapshot.get('snapshot-runner-error')?.resultCode, 'RUNNER_INFRASTRUCTURE_ERROR');
  assert.equal(bySnapshot.get('snapshot-provider-error')?.state, 'FAILED');
  assert.equal(bySnapshot.get('snapshot-provider-error')?.resultCode, 'AI_PROVIDER_UNAVAILABLE');
  assert.equal(bySnapshot.get('snapshot-unverifiable')?.state, 'INSUFFICIENT_EVIDENCE');
  assert.equal(bySnapshot.get('snapshot-unverifiable')?.resultCode, 'NO_VERIFIABLE_TAXONOMY_MATCH');
  assert.deepEqual(await service.listIssueCases('class-1'), []);
});

test('SCRUM-75: constrains Ollama output to approved assessment findings and evidence', async (t) => {
  const file = await createStore(t);
  const envKeys = [
    'CODEPULSE_AI_PROVIDER',
    'CODEPULSE_AI_ENDPOINT',
    'CODEPULSE_OLLAMA_ENDPOINT',
    'CODEPULSE_OLLAMA_MODEL',
    'CODEPULSE_AI_MODEL',
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  let requestBody;

  process.env.CODEPULSE_AI_PROVIDER = 'ollama';
  process.env.CODEPULSE_OLLAMA_MODEL = 'test-model';
  delete process.env.CODEPULSE_AI_ENDPOINT;
  delete process.env.CODEPULSE_OLLAMA_ENDPOINT;
  delete process.env.CODEPULSE_AI_MODEL;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      message: {
        content: JSON.stringify({
          findings: [{
            problemTypeId: 'INFINITE_RECURSION',
            rationale: 'The recursive execution never reaches a terminating base case.',
            evidence: [{
              kind: 'CODE',
              snapshotId: 'snapshot-ollama-schema',
              lineStart: 1,
              lineEnd: 1,
              excerpt: 'while (true) {}',
            }],
          }],
        }),
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  });

  const service = createIssueDetectionService({
    file,
    resolveSnapshot: async (id) => ({ id, sourceCode: 'while (true) {}', hash: id, revision: 1 }),
  });
  await service.initialize();
  await service.trigger(triggerInput('snapshot-ollama-schema'));

  const [assessment] = await waitForTerminal(service, 1);
  const schema = requestBody.format;
  assert.equal(assessment.state, 'EVALUATED');
  assert.equal(assessment.provider, 'ollama');
  assert.equal(assessment.model, 'test-model');
  assert.equal(schema.type, 'object');
  assert.deepEqual(schema.required, ['findings']);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    schema.properties.findings.items.properties.problemTypeId.enum,
    APPROVED_PROBLEM_TYPES.map((problemType) => problemType.id),
  );
  assert.equal(
    schema.properties.findings.items.properties.evidence.items.anyOf[0].properties.snapshotId.const,
    'snapshot-ollama-schema',
  );
});
