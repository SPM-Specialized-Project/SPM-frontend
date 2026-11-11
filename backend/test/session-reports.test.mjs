import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateSessionReport } from '../session-reports.mjs';

test('Session Report - participation metrics, problem completions and score distribution', async () => {
  const report = await generateSessionReport('lab-1790744799755');

  assert.ok(report, 'Report should be generated');
  assert.equal(report.sessionId, 'lab-1790744799755');
  assert.ok(typeof report.totalRegistered === 'number');
  assert.ok(report.participation);
  assert.ok(Array.isArray(report.problems));
  assert.ok(report.scoreDistribution);
  assert.equal(report.scoreDistribution.buckets.length, 4);
});

test('Session Report - AC-14e / AC-238 denominator validation for empty session (N=0)', async () => {
  const emptyReport = await generateSessionReport('empty-session-test');

  assert.ok(emptyReport, 'Empty session report must be safely generated');
  assert.equal(emptyReport.totalRegistered, 0, 'Total registered should be 0');

  // Must safely return null and display N/A without NaN or 500 error
  assert.equal(emptyReport.participation.rate, null, 'Rate must be null when N=0');
  assert.equal(emptyReport.participation.displayRate, 'N/A', 'Display rate must be N/A');
  assert.equal(emptyReport.scoreDistribution.averageScore, null, 'Average score must be null');
  assert.equal(emptyReport.scoreDistribution.displayAverageScore, 'N/A', 'Display average score must be N/A');
  assert.equal(emptyReport.denominatorWarning, true, 'Denominator warning flag must be true');

  // Verify no NaN values in JSON serialization
  const serialized = JSON.stringify(emptyReport);
  assert.ok(!serialized.includes('NaN'), 'JSON output must never contain NaN');
  assert.ok(!serialized.includes('Infinity'), 'JSON output must never contain Infinity');
});
