import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  BACKUPS_FILE,
  BACKUPS_DIRECTORY,
  DATA_DIRECTORY,
  CLASSROOMS_FILE,
  TERMS_FILE,
  ASSIGNMENTS_FILE,
  WORKSPACES_FILE,
  CODEPULSE_SUBMISSIONS_FILE,
  ALERTS_FILE,
} from './config.mjs';
import { recordAuditLog } from './admin-operations.mjs';

let backupsQueue = Promise.resolve();

async function readJsonSafe(filePath, defaultValue = []) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function getBackups() {
  return readJsonSafe(BACKUPS_FILE, []);
}

export async function createSemesterBackup({ actorEmail, termId = 'term-2026-1' } = {}) {
  await mkdir(BACKUPS_DIRECTORY, { recursive: true });

  const [classrooms, terms, assignments, workspaces, submissions, alerts] = await Promise.all([
    readJsonSafe(CLASSROOMS_FILE, []),
    readJsonSafe(TERMS_FILE, []),
    readJsonSafe(ASSIGNMENTS_FILE, []),
    readJsonSafe(WORKSPACES_FILE, []),
    readJsonSafe(CODEPULSE_SUBMISSIONS_FILE, []),
    readJsonSafe(ALERTS_FILE, []),
  ]);

  if (!terms.some((term) => term.id === termId)) {
    throw Object.assign(new Error('TERM_NOT_FOUND'), { status: 404, code: 'TERM_NOT_FOUND' });
  }

  const termClassrooms = classrooms.filter((classroom) => classroom.termId === termId);
  const classroomIds = new Set(termClassrooms.map((classroom) => classroom.id));
  const termAssignments = assignments.filter((assignment) =>
    assignment.termId ? assignment.termId === termId : classroomIds.has(assignment.classroomId));
  const assignmentIds = new Set(termAssignments.map((assignment) => assignment.id));
  const termWorkspaces = workspaces.filter((workspace) =>
    workspace.termId ? workspace.termId === termId : classroomIds.has(workspace.classroomId));
  const workspaceIds = new Set(termWorkspaces.map((workspace) => workspace.id));
  const belongsToTerm = (record) => record.termId
    ? record.termId === termId
    : classroomIds.has(record.classroomId)
      || assignmentIds.has(record.assignmentId)
      || workspaceIds.has(record.workspaceId);
  const termSubmissions = submissions.filter(belongsToTerm);
  const termAlerts = alerts.filter(belongsToTerm);

  const backupData = {
    metadata: {
      version: '1.0.0',
      termId,
      createdAt: new Date().toISOString(),
      creator: actorEmail || 'admin@gmail.com',
    },
    tables: {
      terms: terms.filter((term) => term.id === termId),
      classrooms: termClassrooms,
      assignments: termAssignments,
      workspaces: termWorkspaces,
      submissions: termSubmissions,
      alerts: termAlerts,
    },
  };

  const backupString = JSON.stringify(backupData, null, 2);
  const hash = createHash('sha256').update(backupString, 'utf8').digest('hex');
  const backupId = `backup-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const filename = `${backupId}.json`;
  const filePath = path.join(BACKUPS_DIRECTORY, filename);

  await writeFile(filePath, backupString, 'utf8');
  const fileStat = await stat(filePath);

  const backupRecord = {
    id: backupId,
    filename,
    termId,
    createdAt: backupData.metadata.createdAt,
    sizeBytes: fileStat.size,
    sha256Hash: hash,
    status: 'VERIFIED',
    recordCounts: {
      classrooms: termClassrooms.length,
      assignments: termAssignments.length,
      workspaces: termWorkspaces.length,
      submissions: termSubmissions.length,
      alerts: termAlerts.length,
    },
  };

  const promise = backupsQueue.then(async () => {
    const list = await readJsonSafe(BACKUPS_FILE, []);
    list.unshift(backupRecord);
    await writeFile(BACKUPS_FILE, JSON.stringify(list, null, 2), 'utf8');
    return backupRecord;
  });

  backupsQueue = promise.catch(() => {});
  const saved = await promise;

  await recordAuditLog({
    actor: actorEmail || 'admin@gmail.com',
    action: 'CREATE_SEMESTER_BACKUP',
    target: `Backup:${backupId}`,
    requestId: `req-backup-${Date.now()}`,
    result: 'SUCCESS',
    details: `Tạo backup thành công: ${filename} (SHA-256: ${hash.slice(0, 12)}...)`,
  });

  return saved;
}

export async function verifyBackupDisasterRecovery(backupId, actorEmail = 'admin@gmail.com') {
  const backups = await getBackups();
  const backup = backups.find((b) => b.id === backupId);
  if (!backup) {
    throw new Error('BACKUP_NOT_FOUND');
  }

  const startTime = Date.now();
  const filePath = path.join(BACKUPS_DIRECTORY, backup.filename);

  let verifiedChecksum = false;
  let recomputedHash = '';
  let jsonValid = false;
  let referentialIntegrity = false;
  const checks = [];
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
    recomputedHash = createHash('sha256').update(raw, 'utf8').digest('hex');
    verifiedChecksum = recomputedHash === backup.sha256Hash;
  } catch {
    checks.push('Không thể đọc tệp backup: tệp không tồn tại hoặc không truy cập được.');
  }

  if (raw !== undefined) {
    checks.push(verifiedChecksum
      ? 'Mã băm SHA-256 khớp với bản ghi lưu trữ.'
      : 'Mã băm SHA-256 không khớp với bản ghi lưu trữ.');
    let data;
    try {
      data = JSON.parse(raw);
      const requiredTables = ['terms', 'classrooms', 'assignments', 'workspaces', 'submissions', 'alerts'];
      jsonValid = Boolean(data && typeof data === 'object' && data.metadata && data.tables
        && requiredTables.every((table) => Array.isArray(data.tables[table])));
      if (!jsonValid) throw new Error('INVALID_BACKUP_SHAPE');
      checks.push('Cấu trúc JSON của backup hợp lệ.');
    } catch {
      checks.push('Tệp backup không phải JSON hợp lệ hoặc thiếu bảng dữ liệu bắt buộc.');
    }

    if (jsonValid) {
      const { classrooms, assignments, workspaces } = data.tables;
      const classroomIds = new Set(classrooms.map((classroom) => classroom.id));
      const assignmentMap = new Map(assignments.map((assignment) => [assignment.id, assignment]));
      const brokenAssignments = assignments.filter((assignment) =>
        assignment.classroomId && !classroomIds.has(assignment.classroomId));
      const brokenWorkspaces = workspaces.filter((workspace) =>
        (workspace.classroomId && !classroomIds.has(workspace.classroomId))
        || (workspace.assignmentId && !assignmentMap.has(workspace.assignmentId))
        || (workspace.assignmentId && workspace.classroomId
          && assignmentMap.has(workspace.assignmentId)
          && assignmentMap.get(workspace.assignmentId).classroomId
          && assignmentMap.get(workspace.assignmentId).classroomId !== workspace.classroomId));
      referentialIntegrity = brokenAssignments.length === 0 && brokenWorkspaces.length === 0;
      if (referentialIntegrity) {
        checks.push('Tham chiếu classroom và assignment của assignments/workspaces hợp lệ.');
      } else {
        checks.push(`Tham chiếu không hợp lệ: ${brokenAssignments.length} assignment và ${brokenWorkspaces.length} workspace.`);
      }
    }
  }

  const durationMs = Date.now() - startTime;

  const result = {
    backupId,
    filename: backup.filename,
    verified: verifiedChecksum && jsonValid && referentialIntegrity,
    checksumMatch: verifiedChecksum,
    jsonValid,
    sha256Hash: backup.sha256Hash,
    recomputedHash,
    referentialIntegrity,
    checkedAt: new Date().toISOString(),
    durationMs,
    checks,
    message: verifiedChecksum && jsonValid && referentialIntegrity
      ? 'Diễn tập phục hồi thảm họa (Disaster Recovery Drill) thành công! Bản backup an toàn và sẵn sàng phục hồi.'
      : 'Cảnh báo: Bản backup có sai lệch hoặc vi phạm toàn vẹn dữ liệu.',
  };

  await recordAuditLog({
    actor: actorEmail,
    action: 'DISASTER_RECOVERY_DRILL',
    target: `Backup:${backupId}`,
    requestId: `req-drill-${Date.now()}`,
    result: result.verified ? 'SUCCESS' : 'FAILED',
    details: `Kiểm thử DR hoàn tất: checksumMatch=${verifiedChecksum}, referentialIntegrity=${referentialIntegrity}`,
  });

  return result;
}
