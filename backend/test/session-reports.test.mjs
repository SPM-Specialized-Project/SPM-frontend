import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const testDataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-session-reports-'));
process.env.BACKEND_DATA_DIRECTORY = testDataDirectory;
await mkdir(testDataDirectory, { recursive: true });

const writeFixture = (filename, records) => writeFile(
  path.join(testDataDirectory, filename),
  JSON.stringify(records),
  'utf8',
);

await Promise.all([
  writeFixture('codepulse-classrooms.json', [
    { id: 'class-1', courseId: '13', name: 'Algorithms' },
    { id: 'class-2', courseId: '14', name: 'Other class' },
  ]),
  writeFixture('codepulse-labs.json', [
    {
      id: 'lab-1', classroomId: 'class-1', name: 'Algorithms lab',
      startAt: '2026-11-01T10:00:00.000Z', endAt: '2026-11-01T11:00:00.000Z',
      assignments: [{ assignmentId: 'problem-1', title: 'Problem One' }],
    },
    {
      id: 'lab-2', classroomId: 'class-2', name: 'Other lab',
      startAt: '2026-11-01T10:00:00.000Z', endAt: '2026-11-01T11:00:00.000Z',
      assignments: [{ assignmentId: 'problem-1', title: 'Problem One' }],
    },
  ]),
  writeFixture('sessions.json', [
    {
      id: 's-1', title: 'Legacy class session', courseTitle: 'Computer Network',
      members: [{ id: 'one', present: true }, { id: 'two', present: false }],
      studentNames: ['One', 'Two'],
    },
  ]),
  writeFixture('codepulse-memberships.json', [
    { id: 'member-one', classroomId: 'class-1', studentId: 'one', studentEmail: 'one@example.test', status: 'ACTIVE' },
    { id: 'member-two', classroomId: 'class-1', studentId: 'two', studentEmail: 'two@example.test', status: 'ACTIVE' },
    { id: 'member-other', classroomId: 'class-2', studentId: 'other', studentEmail: 'other@example.test', status: 'ACTIVE' },
    { id: 'member-revoked', classroomId: 'class-1', studentId: 'old', studentEmail: 'old@example.test', status: 'REVOKED' },
  ]),
  writeFixture('codepulse-assignments.json', [
    { id: 'problem-1', classroomId: 'class-1', title: 'Problem One' },
  ]),
  writeFixture('codepulse-workspaces.json', [
    { id: 'workspace-one', classroomId: 'class-1', labId: 'lab-1', assignmentId: 'problem-1', ownerEmail: 'one@example.test' },
    { id: 'workspace-other-lab', classroomId: 'class-2', labId: 'lab-2', assignmentId: 'problem-1', ownerEmail: 'other@example.test' },
    { id: 'workspace-unscoped', classroomId: 'class-1', assignmentId: 'problem-1', ownerEmail: 'two@example.test' },
  ]),
  writeFixture('codepulse-activities.json', [
    { id: 'activity-in', labId: 'lab-1', classroomId: 'class-1', ownerEmail: 'one@example.test', occurredAt: '2026-11-01T10:30:00.000Z' },
    { id: 'activity-out', labId: 'lab-1', classroomId: 'class-1', ownerEmail: 'two@example.test', occurredAt: '2026-11-01T11:30:00.000Z' },
    { id: 'activity-other', labId: 'lab-2', classroomId: 'class-2', ownerEmail: 'other@example.test', occurredAt: '2026-11-01T10:30:00.000Z' },
  ]),
  writeFixture('codepulse-submissions.json', [
    { id: 'submission-pass', labId: 'lab-1', classroomId: 'class-1', workspaceId: 'workspace-one', assignmentId: 'problem-1', ownerEmail: 'one@example.test', passedCount: 2, totalCount: 2 },
    { id: 'submission-partial', labId: 'lab-1', classroomId: 'class-1', workspaceId: 'workspace-one', assignmentId: 'problem-1', ownerEmail: 'one@example.test', passedCount: 1, totalCount: 2 },
    { id: 'submission-other', labId: 'lab-2', classroomId: 'class-2', workspaceId: 'workspace-other-lab', assignmentId: 'problem-1', ownerEmail: 'other@example.test', passedCount: 2, totalCount: 2 },
  ]),
]);

const { generateSessionReport } = await import('../session-reports.mjs');

test.after(async () => {
  await rm(testDataDirectory, { recursive: true, force: true });
});

test('Lab report uses only the selected classroom, roster, activity, and graded submissions', async () => {
  const report = await generateSessionReport('lab-1');

  assert.ok(report);
  assert.equal(report.totalRegistered, 2, 'Only active members of this lab classroom are included');
  assert.deepEqual(report.participation, {
    inLabActive: 1,
    outsideLabActive: 1,
    rate: 50,
    displayRate: '50.0%',
  });
  assert.equal(report.problems.length, 1);
  assert.equal(report.problems[0].submissionsCount, 2);
  assert.equal(report.problems[0].passedCount, 1);
  assert.equal(report.problems[0].completionRate, 50);
  assert.equal(report.problems[0].averageScore, 7.5);
  assert.equal(report.scoreDistribution.averageScore, 7.5);
  assert.equal(report.scoreDistribution.buckets[1].count, 1);
  assert.equal(report.scoreDistribution.buckets[3].count, 1);
});

test('Legacy session report uses recorded attendance and does not invent grades', async () => {
  const report = await generateSessionReport('s-1');

  assert.ok(report);
  assert.equal(report.totalRegistered, 2);
  assert.equal(report.participation.inLabActive, 1);
  assert.equal(report.participation.outsideLabActive, 0);
  assert.equal(report.participation.rate, 50);
  assert.deepEqual(report.problems, []);
  assert.equal(report.scoreDistribution.averageScore, null);
  assert.equal(report.scoreDistribution.displayAverageScore, 'N/A');
});

test('Unknown session ID has no fallback report', async () => {
  assert.equal(await generateSessionReport('does-not-exist'), null);
});

test('Empty session safely reports N=0 and N/A values', async () => {
  const report = await generateSessionReport('empty-session-test');

  assert.equal(report.totalRegistered, 0);
  assert.equal(report.participation.rate, null);
  assert.equal(report.participation.displayRate, 'N/A');
  assert.equal(report.scoreDistribution.averageScore, null);
  assert.equal(report.scoreDistribution.displayAverageScore, 'N/A');
  assert.equal(report.denominatorWarning, true);
  assert.equal(JSON.stringify(report).includes('NaN'), false);
  assert.equal(JSON.stringify(report).includes('Infinity'), false);
});
