import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const { createIssueDetectionService } = await import(pathToFileURL(join(root, 'backend', 'issue-detection.mjs')));
const directory = await mkdtemp(join(tmpdir(), 'spm-ollama-smoke-'));
const sourceCode = 'int factorial(int n) {\n  return n * factorial(n - 1);\n}';
const snapshot = { id: 'smoke-snapshot', hash: 'smoke-hash', revision: 1 };
const execution = {
  id: 'smoke-run',
  state: 'FINISHED',
  status: 'COMPLETED_WITH_FAILURES',
  results: [{ testCaseId: 'smoke-test', status: 'TIME_LIMIT_EXCEEDED', passed: false }],
};
try {
  const service = createIssueDetectionService({
    file: join(directory, 'assessment.json'),
    resolveSnapshot: async () => ({ ...snapshot, sourceCode }),
    resolveExecution: async () => execution,
  });
  const started = Date.now();
  await service.trigger({
    workspace: { id: 'smoke-workspace', classroomId: 'smoke-class', assignmentId: 'smoke-assignment', ownerEmail: 'student@example.test' },
    snapshot,
    assignmentVersion: {
      id: 'smoke-v1',
      assignmentId: 'smoke-assignment',
      version: 1,
      title: 'Recursive factorial',
      description: 'Return n factorial. Recursion must stop at zero.',
    },
    milestone: 'RUN',
    executionId: execution.id,
    execution,
    sourceCode,
  });

  let assessment;
  while (Date.now() - started < 150_000) {
    [assessment] = await service.listAssessments('smoke-class');
    if (['EVALUATED', 'INSUFFICIENT_EVIDENCE', 'FAILED'].includes(assessment?.state)) break;
    await delay(500);
  }
  const { state, provider, model, resultCode } = assessment || {};
  console.log(JSON.stringify({ state, provider, model, resultCode, elapsedSeconds: (Date.now() - started) / 1000 }));
  assert.ok(['EVALUATED', 'INSUFFICIENT_EVIDENCE'].includes(state), 'CodePulse did not complete inference');
  assert.equal(provider, 'ollama');
  assert.equal(model, 'qwen3:4b');
} finally {
  await rm(directory, { recursive: true, force: true });
}
