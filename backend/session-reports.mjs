import { readFile } from 'node:fs/promises';
import {
  CLASSROOMS_FILE,
  LABS_FILE,
  SESSIONS_FILE,
  MEMBERSHIPS_FILE,
  ASSIGNMENTS_FILE,
  CODEPULSE_SUBMISSIONS_FILE,
  CODEPULSE_ACTIVITIES_FILE,
  WORKSPACES_FILE,
} from './config.mjs';

async function readJsonSafe(filePath, defaultValue = []) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const isActiveStudent = (membership) => membership.status === 'ACTIVE'
  && (!membership.role || String(membership.role).toLowerCase() === 'student');

export async function generateSessionReport(sessionId) {
  const [classrooms, labs, sessions, memberships, assignments, submissions, activities, workspaces] = await Promise.all([
    readJsonSafe(CLASSROOMS_FILE),
    readJsonSafe(LABS_FILE),
    readJsonSafe(SESSIONS_FILE),
    readJsonSafe(MEMBERSHIPS_FILE),
    readJsonSafe(ASSIGNMENTS_FILE),
    readJsonSafe(CODEPULSE_SUBMISSIONS_FILE),
    readJsonSafe(CODEPULSE_ACTIVITIES_FILE),
    readJsonSafe(WORKSPACES_FILE),
  ]);

  if (sessionId === 'empty-session-test') {
    return buildEmptyReport(sessionId, 'Empty Test Session (N=0)');
  }

  const lab = labs.find((item) => item.id === sessionId);
  if (lab) {
    return buildReportForLab({
      lab,
      classrooms,
      memberships,
      assignments,
      submissions,
      activities,
      workspaces,
    });
  }

  const session = sessions.find((item) => item.id === sessionId);
  if (session) return buildReportForSession(session);

  return null;
}

function buildScoreDistribution(scores) {
  const ranges = [
    { label: '[0 - 5.0)', matches: (score) => score < 5 },
    { label: '[5.0 - 7.0)', matches: (score) => score >= 5 && score < 7 },
    { label: '[7.0 - 8.5)', matches: (score) => score >= 7 && score < 8.5 },
    { label: '[8.5 - 10.0]', matches: (score) => score >= 8.5 && score <= 10 },
  ];
  const count = scores.length;
  const averageScore = count
    ? Number((scores.reduce((sum, score) => sum + score, 0) / count).toFixed(1))
    : null;

  return {
    buckets: ranges.map(({ label, matches }) => {
      const bucketCount = scores.filter(matches).length;
      return {
        label,
        count: bucketCount,
        percentage: count ? Number(((bucketCount / count) * 100).toFixed(1)) : null,
      };
    }),
    averageScore,
    displayAverageScore: averageScore === null ? 'N/A' : `${averageScore}/10`,
  };
}

function buildEmptyReport(sessionId, title) {
  return {
    sessionId,
    title,
    classroomName: 'None',
    totalRegistered: 0,
    participation: {
      inLabActive: 0,
      outsideLabActive: 0,
      rate: null,
      displayRate: 'N/A',
    },
    problems: [],
    scoreDistribution: buildScoreDistribution([]),
    denominatorWarning: true,
    generatedAt: new Date().toISOString(),
  };
}

function buildReportForLab({ lab, classrooms, memberships, assignments, submissions, activities, workspaces }) {
  const classroom = classrooms.find((item) => item.id === lab.classroomId);
  const classroomKeys = new Set([lab.classroomId, classroom?.courseId].filter(Boolean).map(String));
  const classMembers = memberships.filter((membership) =>
    classroomKeys.has(String(membership.classroomId)) && isActiveStudent(membership));
  const registeredKeys = new Set(classMembers.map((membership) =>
    normalizeEmail(membership.studentEmail) || String(membership.studentId ?? membership.id)));
  const registeredEmails = new Set(classMembers.map((membership) => normalizeEmail(membership.studentEmail)).filter(Boolean));
  const totalRegistered = registeredKeys.size;

  const labWorkspaces = workspaces.filter((workspace) =>
    workspace.labId === lab.id && workspace.classroomId === lab.classroomId);
  const labWorkspaceIds = new Set(labWorkspaces.map((workspace) => workspace.id));
  const activityMatchesLab = (activity) => activity.labId === lab.id
    || (activity.workspaceId && labWorkspaceIds.has(activity.workspaceId));
  const inLabEmails = new Set();
  const outsideLabEmails = new Set();
  const labStart = Date.parse(lab.startAt ?? '');
  const labEnd = Date.parse(lab.endAt ?? '');

  const addParticipation = (emailValue, context, timestamp) => {
    const email = normalizeEmail(emailValue);
    if (!email || !registeredEmails.has(email)) return;

    let isInLab;
    if (context === 'IN_LAB') isInLab = true;
    else if (context === 'OUTSIDE_LAB') isInLab = false;
    else {
      const time = Date.parse(timestamp ?? '');
      if (!Number.isFinite(time)) return;
      isInLab = (!Number.isFinite(labStart) || time >= labStart)
        && (!Number.isFinite(labEnd) || time <= labEnd);
    }

    (isInLab ? inLabEmails : outsideLabEmails).add(email);
  };

  for (const activity of activities.filter(activityMatchesLab)) {
    addParticipation(
      activity.ownerEmail ?? activity.userEmail ?? activity.studentEmail ?? activity.context?.studentEmail,
      activity.activityContext,
      activity.occurredAt ?? activity.activityAt ?? activity.timestamp,
    );
  }

  for (const workspace of labWorkspaces) {
    addParticipation(workspace.ownerEmail, null, workspace.updatedAt ?? workspace.createdAt);
  }

  const inLabCount = inLabEmails.size;
  const outsideLabCount = outsideLabEmails.size;
  const participationRate = totalRegistered ? (inLabCount / totalRegistered) * 100 : null;
  const displayRate = participationRate === null ? 'N/A' : `${participationRate.toFixed(1)}%`;

  const labAssignments = (lab.assignments ?? []).map((labAssignment) => {
    const assignmentId = labAssignment.assignmentId ?? labAssignment.id;
    const assignment = assignments.find((item) => item.id === assignmentId);
    return {
      id: assignmentId,
      title: labAssignment.title ?? assignment?.title ?? 'Bài thực hành',
    };
  });

  const scores = [];
  const problems = labAssignments.map((problem) => {
    const problemSubmissions = submissions.filter((submission) => {
      if (submission.assignmentId !== problem.id) return false;
      return submission.labId === lab.id
        || (submission.workspaceId && labWorkspaceIds.has(submission.workspaceId))
        || (!submission.labId && submission.classroomId === lab.classroomId);
    });
    const scoreFor = (submission) => {
      const explicitScore = Number(submission.score);
      if (Number.isFinite(explicitScore) && explicitScore >= 0 && explicitScore <= 10) return explicitScore;
      const total = Number(submission.totalCount ?? submission.results?.length ?? 0);
      const passed = Number(submission.passedCount ?? submission.results?.filter((result) => result.passed).length ?? 0);
      return total > 0 ? (passed / total) * 10 : null;
    };
    const submissionScores = problemSubmissions.map(scoreFor).filter(Number.isFinite);
    const passedSubmissions = problemSubmissions.filter((submission) => {
      const score = scoreFor(submission);
      return score === 10;
    });
    const passedStudents = new Set(passedSubmissions.map((submission) =>
      normalizeEmail(submission.ownerEmail ?? submission.studentEmail) || submission.id));
    const completionRate = totalRegistered ? (passedStudents.size / totalRegistered) * 100 : null;
    const averageScore = submissionScores.length
      ? Number((submissionScores.reduce((sum, score) => sum + score, 0) / submissionScores.length).toFixed(1))
      : null;

    scores.push(...submissionScores);
    return {
      problemId: problem.id,
      title: problem.title,
      submissionsCount: problemSubmissions.length,
      passedCount: passedSubmissions.length,
      completionRate: completionRate === null ? null : Number(completionRate.toFixed(1)),
      displayCompletionRate: completionRate === null ? 'N/A' : `${completionRate.toFixed(1)}%`,
      averageScore,
    };
  });

  return {
    sessionId: lab.id,
    title: lab.name || 'Buổi thực hành DSA',
    classroomName: classroom?.name || 'Lớp thực hành',
    totalRegistered,
    participation: {
      inLabActive: inLabCount,
      outsideLabActive: outsideLabCount,
      rate: participationRate === null ? null : Number(participationRate.toFixed(1)),
      displayRate,
    },
    problems,
    scoreDistribution: buildScoreDistribution(scores),
    denominatorWarning: totalRegistered === 0,
    generatedAt: new Date().toISOString(),
  };
}

function buildReportForSession(session) {
  const members = Array.isArray(session.members) ? session.members : [];
  const totalRegistered = members.length || session.studentNames?.length || 0;
  const inLabCount = members.filter((member) => member.present === true).length;
  const participationRate = totalRegistered ? (inLabCount / totalRegistered) * 100 : null;

  return {
    sessionId: session.id,
    title: session.title || session.courseTitle || 'Buổi thực hành',
    classroomName: session.courseTitle || 'Lớp môn học',
    totalRegistered,
    participation: {
      inLabActive: inLabCount,
      outsideLabActive: 0,
      rate: participationRate === null ? null : Number(participationRate.toFixed(1)),
      displayRate: participationRate === null ? 'N/A' : `${participationRate.toFixed(1)}%`,
    },
    problems: [],
    scoreDistribution: buildScoreDistribution([]),
    denominatorWarning: totalRegistered === 0,
    generatedAt: new Date().toISOString(),
  };
}
