import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');

test('US-010.1 Realtime Classroom Dashboard - Permissions, Roster, Milestones & Telemetry', async (t) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'spm-realtime-dashboard-test-'));
  const server = spawn(process.execPath, [serverFile], {
    env: { ...process.env, BACKEND_PORT: '0', BACKEND_DATA_DIRECTORY: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(async () => {
    server.kill();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Server exited unexpectedly: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });

  const api = async (url, token, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: response.status, data };
  };

  const login = async (email, password) => {
    const result = await api('/api/auth/login', null, 'POST', { email, password });
    assert.equal(result.status, 200, `Login failed for ${email}`);
    return result.data.accessToken;
  };

  const studentToken = await login('student@gmail.com', 'student123');
  const lecturerToken = await login('lecturer@gmail.com', 'lecturer123');
  const lecturer2Token = await login('lecturer2@gmail.com', 'lecturer2123');
  const adminToken = await login('admin@gmail.com', 'admin123');

  // TC-01: Student access is strictly forbidden (HTTP 403)
  await t.test('TC-01: Student role receives HTTP 403 Forbidden', async () => {
    const res = await api('/api/codepulse/classrooms/class-1/realtime-dashboard', studentToken);
    assert.equal(res.status, 403, 'Student must be denied with 403 Forbidden');
    assert.equal(res.data.code, 'FORBIDDEN');
  });

  // TC-02: Unassigned lecturer receives HTTP 403 Forbidden
  await t.test('TC-02: Unassigned lecturer receives HTTP 403 Forbidden', async () => {
    const res = await api('/api/codepulse/classrooms/class-1/realtime-dashboard', lecturer2Token);
    assert.equal(res.status, 403, 'Unassigned lecturer must be denied with 403');
    assert.equal(res.data.code, 'FORBIDDEN');
  });

  // TC-03: Non-existent classroom returns HTTP 404 NOT_FOUND
  await t.test('TC-03: Non-existent classroom returns HTTP 404 NOT_FOUND', async () => {
    const res = await api('/api/codepulse/classrooms/class-non-existent/realtime-dashboard', lecturerToken);
    assert.equal(res.status, 404, 'Non-existent classroom must return 404');
    assert.equal(res.data.code, 'NOT_FOUND');
  });

  // TC-04: Assigned lecturer receives 200 OK with full dashboard payload
  await t.test('TC-04: Assigned lecturer receives 200 OK with full roster and summary', async () => {
    const res = await api('/api/codepulse/classrooms/class-1/realtime-dashboard', lecturerToken);
    assert.equal(res.status, 200, 'Assigned lecturer must receive 200 OK');
    assert.ok(res.data.classroom, 'Must contain classroom metadata');
    assert.equal(res.data.classroom.id, 'class-1');
    assert.ok(Array.isArray(res.data.students), 'Must contain students array');
    assert.ok(res.data.students.length > 0, 'Classroom must have enrolled students');
    assert.ok(res.data.summary, 'Must contain summary');
    assert.equal(typeof res.data.summary.totalStudents, 'number');
    assert.equal(typeof res.data.summary.activeCount, 'number');
    assert.equal(typeof res.data.summary.staleCount, 'number');
    assert.equal(typeof res.data.summary.alertCount, 'number');

    // Verify student schema & no sensitive leaks (SCRUM-196)
    const firstStudent = res.data.students[0];
    assert.ok(firstStudent.studentId, 'Must have studentId');
    assert.ok(firstStudent.studentName, 'Must have studentName');
    assert.ok(firstStudent.studentEmail, 'Must have studentEmail');
    assert.ok('milestone' in firstStudent, 'Must have milestone');
    assert.ok('testProgress' in firstStudent, 'Must have testProgress');
    assert.ok('aiStatus' in firstStudent, 'Must have aiStatus');
    assert.ok('isStale' in firstStudent, 'Must have isStale');
    assert.equal(firstStudent.password, undefined, 'Must not leak password');
    assert.equal(firstStudent.token, undefined, 'Must not leak token');
  });

  // TC-05: Admin receives 200 OK
  await t.test('TC-05: Admin receives 200 OK for operational inspection', async () => {
    const res = await api('/api/codepulse/classrooms/class-1/realtime-dashboard', adminToken);
    assert.equal(res.status, 200, 'Admin must receive 200 OK');
    assert.ok(Array.isArray(res.data.students));
  });

  // TC-06: AC-09e AI status categorization & AC-09d stale detection
  await t.test('TC-06: AC-09e AI status and AC-09d stale indicators', async () => {
    const res = await api('/api/codepulse/classrooms/class-1/realtime-dashboard', lecturerToken);
    assert.equal(res.status, 200);

    const validAiStatuses = ['NO_ISSUES', 'UNEVALUATED', 'AI_ERROR', 'ACTIVE_ALERT'];
    for (const student of res.data.students) {
      assert.ok(
        validAiStatuses.includes(student.aiStatus),
        `Student AI status ${student.aiStatus} must be one of ${validAiStatuses.join(', ')}`
      );
      assert.equal(typeof student.isStale, 'boolean', 'isStale must be boolean');
      if (student.activeAlert) {
        assert.equal(student.aiStatus, 'ACTIVE_ALERT', 'Student with active alert must have aiStatus ACTIVE_ALERT');
        assert.ok(student.activeAlert.ruleType, 'Alert must have ruleType');
        assert.ok(student.activeAlert.severity, 'Alert must have severity');
      }
    }
  });

  // TC-07: Audit log verification (SCRUM-196)
  await t.test('TC-07: Dashboard access records audit log entry', async () => {
    const auditLogsPath = path.join(dataDirectory, 'codepulse-audit-logs.json');
    const logsContent = await readFile(auditLogsPath, 'utf8');
    const logs = JSON.parse(logsContent);
    const dashboardEntry = logs.find((l) => l.action === 'CLASSROOM_REALTIME_DASHBOARD_ACCESS');
    assert.ok(dashboardEntry, 'Must have recorded CLASSROOM_REALTIME_DASHBOARD_ACCESS in audit logs');
    assert.equal(dashboardEntry.result, 'SUCCESS');
    assert.ok(dashboardEntry.target.includes('classroom:class-1'));
  });
});
