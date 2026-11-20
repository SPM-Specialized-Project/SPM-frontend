import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  BACKUPS_FILE,
  BACKUPS_DIRECTORY,
  DATA_DIRECTORY,
  MEMBERSHIPS_FILE,
  CLASSROOMS_FILE,
  TERMS_FILE,
  ASSIGNMENTS_FILE,
  ASSIGNMENT_VERSIONS_FILE,
  LABS_FILE,
  WORKSPACES_FILE,
  SUBMISSIONS_FILE,
  CODEPULSE_SUBMISSIONS_FILE,
  SNAPSHOTS_FILE,
  EXECUTIONS_FILE,
  JUDGMENTS_FILE,
  ALERTS_FILE,
  CODEPULSE_ACTIVITIES_FILE,
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

  const [
    classrooms,
    terms,
    memberships,
    assignments,
    assignmentVersions,
    labs,
    workspaces,
    rawSubmissions,
    rawCodepulseSubmissions,
    snapshots,
    executions,
    judgments,
    alerts,
    activities,
  ] = await Promise.all([
    readJsonSafe(CLASSROOMS_FILE, []),
    readJsonSafe(TERMS_FILE, []),
    readJsonSafe(MEMBERSHIPS_FILE, []),
    readJsonSafe(ASSIGNMENTS_FILE, []),
    readJsonSafe(ASSIGNMENT_VERSIONS_FILE, []),
    readJsonSafe(LABS_FILE, []),
    readJsonSafe(WORKSPACES_FILE, []),
    readJsonSafe(SUBMISSIONS_FILE, []),
    readJsonSafe(CODEPULSE_SUBMISSIONS_FILE, []),
    readJsonSafe(SNAPSHOTS_FILE, []),
    readJsonSafe(EXECUTIONS_FILE, []),
    readJsonSafe(JUDGMENTS_FILE, []),
    readJsonSafe(ALERTS_FILE, []),
    readJsonSafe(CODEPULSE_ACTIVITIES_FILE, []),
  ]);

  if (!terms.some((term) => term.id === termId)) {
    throw Object.assign(new Error('TERM_NOT_FOUND'), { status: 404, code: 'TERM_NOT_FOUND' });
  }

  const submissionMap = new Map();
  for (const s of [...rawSubmissions, ...rawCodepulseSubmissions]) {
    if (s && s.id) submissionMap.set(s.id, s);
  }
  const allSubmissions = [...submissionMap.values()];

  const termClassrooms = classrooms.filter((classroom) =>
    (classroom.termId ? classroom.termId === termId : true));
  const classroomIds = new Set(termClassrooms.map((classroom) => classroom.id));
  const termMemberships = memberships.filter((membership) =>
    membership.termId === termId || classroomIds.has(membership.classroomId));

  const termAssignments = assignments.filter((assignment) =>
    (assignment.termId ? assignment.termId === termId : (classroomIds.size === 0 || classroomIds.has(assignment.classroomId))));
  const assignmentIds = new Set(termAssignments.map((assignment) => assignment.id));

  const termAssignmentVersions = assignmentVersions.filter((v) =>
    v.termId === termId || assignmentIds.has(v.assignmentId));

  const termLabs = labs.filter((l) =>
    l.termId === termId || classroomIds.has(l.classroomId));

  const termWorkspaces = workspaces.filter((workspace) =>
    (workspace.termId ? workspace.termId === termId : (classroomIds.has(workspace.classroomId) || assignmentIds.has(workspace.assignmentId))));
  const workspaceIds = new Set(termWorkspaces.map((workspace) => workspace.id));

  const belongsToTerm = (record) => (record.termId
    ? record.termId === termId
    : classroomIds.has(record.classroomId)
      || assignmentIds.has(record.assignmentId)
      || workspaceIds.has(record.workspaceId)
      || (!record.termId && !record.classroomId && !record.assignmentId && !record.workspaceId));

  const termSubmissions = rawSubmissions.filter(belongsToTerm);
  const termCodepulseSubmissions = rawCodepulseSubmissions.filter(belongsToTerm);
  const submissionIds = new Set(
    allSubmissions.filter(belongsToTerm).map((submission) => submission.id),
  );

  const termSnapshots = snapshots.filter((s) =>
    s.termId === termId || workspaceIds.has(s.workspaceId));

  const termExecutions = executions.filter((execution) =>
    execution.termId === termId
    || workspaceIds.has(execution.workspaceId)
    || submissionIds.has(execution.submissionId));

  const termJudgments = judgments.filter((j) =>
    j.termId === termId || submissionIds.has(j.submissionId) || workspaceIds.has(j.workspaceId));

  const termAlerts = alerts.filter(belongsToTerm);

  const termActivities = activities.filter(belongsToTerm);

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
      memberships: termMemberships,
      assignments: termAssignments,
      assignmentVersions: termAssignmentVersions,
      labs: termLabs,
      workspaces: termWorkspaces,
      submissions: termSubmissions,
      codepulseSubmissions: termCodepulseSubmissions,
      snapshots: termSnapshots,
      executions: termExecutions,
      judgments: termJudgments,
      alerts: termAlerts,
      activities: termActivities,
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
      memberships: termMemberships.length,
      assignments: termAssignments.length,
      assignmentVersions: termAssignmentVersions.length,
      labs: termLabs.length,
      workspaces: termWorkspaces.length,
      submissions: termSubmissions.length,
      codepulseSubmissions: termCodepulseSubmissions.length,
      snapshots: termSnapshots.length,
      executions: termExecutions.length,
      judgments: termJudgments.length,
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
    throw Object.assign(new Error('BACKUP_NOT_FOUND'), { status: 404, code: 'BACKUP_NOT_FOUND' });
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
  const isVerified = Boolean(raw !== undefined && verifiedChecksum && jsonValid && referentialIntegrity);

  const result = {
    backupId,
    filename: backup.filename,
    verified: isVerified,
    checksumMatch: verifiedChecksum,
    jsonValid,
    sha256Hash: backup.sha256Hash,
    recomputedHash,
    referentialIntegrity,
    checkedAt: new Date().toISOString(),
    durationMs,
    checks,
    message: isVerified
      ? 'Diễn tập phục hồi thảm họa (Disaster Recovery Drill) thành công! Bản backup an toàn và sẵn sàng phục hồi.'
      : 'Diễn tập phục hồi thảm họa thất bại: tệp backup không tồn tại, sai mã băm SHA-256 hoặc vi phạm ràng buộc dữ liệu.',
  };

  // D-03: Persist updated verification status in codepulse-backups.json
  const updatePromise = backupsQueue.then(async () => {
    const list = await readJsonSafe(BACKUPS_FILE, []);
    const target = list.find((item) => item.id === backupId);
    if (target) {
      target.status = isVerified ? 'VERIFIED' : 'FAILED';
      target.lastVerifiedAt = result.checkedAt;
      await writeFile(BACKUPS_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
  });
  backupsQueue = updatePromise.catch(() => {});
  await updatePromise;

  await recordAuditLog({
    actor: actorEmail,
    action: 'DISASTER_RECOVERY_DRILL',
    target: `Backup:${backupId}`,
    requestId: `req-drill-${Date.now()}`,
    result: result.verified ? 'SUCCESS' : 'FAILED',
    details: `Kiểm thử DR hoàn tất: verified=${isVerified}, checksumMatch=${verifiedChecksum}, referentialIntegrity=${referentialIntegrity}`,
  });

  return result;
}

// D-04 (AC-16c): Restore semester backup
export async function restoreSemesterBackup(backupId, actorEmail = 'admin@gmail.com') {
  const backups = await getBackups();
  const backup = backups.find((b) => b.id === backupId);
  if (!backup) {
    throw Object.assign(new Error('BACKUP_NOT_FOUND'), { status: 404, code: 'BACKUP_NOT_FOUND' });
  }

  // Fails closed if verification fails
  const drillResult = await verifyBackupDisasterRecovery(backupId, actorEmail);
  if (!drillResult.verified) {
    throw Object.assign(new Error('BACKUP_INTEGRITY_COMPROMISED'), {
      status: 422,
      code: 'BACKUP_INTEGRITY_COMPROMISED',
      message: 'Không thể khôi phục bản sao lưu vì kiểm tra toàn vẹn thất bại.',
      drillResult,
    });
  }

  const filePath = path.join(BACKUPS_DIRECTORY, backup.filename);
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  const {
    terms = [],
    classrooms = [],
    memberships = [],
    assignments = [],
    assignmentVersions = [],
    labs = [],
    workspaces = [],
    submissions = [],
    codepulseSubmissions = [],
    snapshots = [],
    executions = [],
    judgments = [],
    alerts = [],
    activities = [],
  } = data.tables || {};

  const upsertFile = async (filePath, newRecords) => {
    if (!newRecords || newRecords.length === 0) return;
    const existing = await readJsonSafe(filePath, []);
    const idMap = new Map(existing.map((item) => [item.id, item]));
    for (const rec of newRecords) {
      if (rec && rec.id) idMap.set(rec.id, rec);
    }
    await writeFile(filePath, JSON.stringify([...idMap.values()], null, 2), 'utf8');
  };

  await Promise.all([
    upsertFile(TERMS_FILE, terms),
    upsertFile(CLASSROOMS_FILE, classrooms),
    upsertFile(MEMBERSHIPS_FILE, memberships),
    upsertFile(ASSIGNMENTS_FILE, assignments),
    upsertFile(ASSIGNMENT_VERSIONS_FILE, assignmentVersions),
    upsertFile(LABS_FILE, labs),
    upsertFile(WORKSPACES_FILE, workspaces),
    upsertFile(SUBMISSIONS_FILE, submissions),
    upsertFile(CODEPULSE_SUBMISSIONS_FILE, codepulseSubmissions),
    upsertFile(SNAPSHOTS_FILE, snapshots),
    upsertFile(EXECUTIONS_FILE, executions),
    upsertFile(JUDGMENTS_FILE, judgments),
    upsertFile(ALERTS_FILE, alerts),
    upsertFile(CODEPULSE_ACTIVITIES_FILE, activities),
  ]);

  await recordAuditLog({
    actor: actorEmail,
    action: 'RESTORE_SEMESTER_BACKUP',
    target: `Backup:${backupId}`,
    requestId: `req-restore-${Date.now()}`,
    result: 'SUCCESS',
    details: `Khôi phục thành công học kỳ ${backup.termId}: ${submissions.length} submissions, ${workspaces.length} workspaces, ${classrooms.length} classrooms.`,
  });

  return {
    success: true,
    backupId,
    termId: backup.termId,
    restoredAt: new Date().toISOString(),
    restoredCounts: {
      terms: terms.length,
      classrooms: classrooms.length,
      memberships: memberships.length,
      assignments: assignments.length,
      assignmentVersions: assignmentVersions.length,
      labs: labs.length,
      workspaces: workspaces.length,
      submissions: submissions.length,
      snapshots: snapshots.length,
      executions: executions.length,
      judgments: judgments.length,
      alerts: alerts.length,
    },
  };
}
