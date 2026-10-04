import { randomUUID } from 'node:crypto';
import { PORT } from './config.mjs';
import {
  COURSE_CATALOG,
  COURSE_OWNERSHIPS,
  DSA_COURSE_ID,
  DSA_MANAGER_EMAILS,
  DSA_ROSTER_CLASSROOM_ID,
  INITIAL_CLASSROOM_OWNERSHIPS,
  INITIAL_SESSIONS,
  PROVISIONED_STUDENT_ACCOUNTS,
  USERS,
} from './data/seeds.mjs';
import {
  clone,
  createCourseSubmissionRecords,
  createUser,
  getAssignment,
  getCourse,
  getCourseDetail,
  getResourcePermissions,
  findProvisionedStudent,
  normalizeRole,
  normalizeEmail,
  toListResponse,
  toMembershipView,
  toResource,
  toSubmissionView,
} from './domain/backend-data.mjs';
import {
  readCollection,
  readSubmissions,
  saveCollection,
  saveSubmissions,
} from './data/storage.mjs';
import { apiError, readRequestBody, sendJson } from './http.mjs';
import { createSession, getSessionUser } from './auth.mjs';
import { getCodePulseClassrooms, getCodePulseSubmissionContext, handleCodePulse } from './codepulse.mjs';
import { evaluateHardConstraints } from './matching/hard-constraints.mjs';
import { createMatchingService, withExtractedProfile } from './matching/service.mjs';

const isMembershipRoute = (parts) =>
  parts[0] === 'api' &&
  (parts[1] === 'classrooms' || parts[1] === 'courses') &&
  parts[2] &&
  parts[3] === 'memberships';

const getClassroomIdFromParts = (parts) => parts[2];

const isAssignedLecturer = (courseId, email) => {
  const ownership = COURSE_OWNERSHIPS[String(courseId)];
  return Boolean(
    ownership?.ownershipLocked === true &&
      normalizeEmail(ownership.ownerEmail) === normalizeEmail(email),
  ) || INITIAL_CLASSROOM_OWNERSHIPS.some(
    (ownership) =>
      ownership.classroomId === courseId &&
      ownership.status === 'ACTIVE' &&
      normalizeEmail(ownership.ownerEmail) === normalizeEmail(email),
  ) || INITIAL_SESSIONS.some(
    (session) =>
      session.courseId === courseId &&
      normalizeEmail(session.ownerEmail) === normalizeEmail(email),
  ) || (String(courseId) === DSA_COURSE_ID && DSA_MANAGER_EMAILS.some(
    (managerEmail) => normalizeEmail(managerEmail) === normalizeEmail(email),
  ));
};

const isActiveRecord = (record) => String(record.status).toUpperCase() === 'ACTIVE';

const matchingService = createMatchingService();
let matchingMutationQueue = Promise.resolve();

function withMatchingMutationLock(task) {
  const operation = matchingMutationQueue.then(task);
  matchingMutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

const isCoordinator = (role) => role === 'coordinator' || role === 'chairman';
const registrationStatus = (record) => String(record?.status ?? '').trim().toUpperCase();
const approvedTutor = (record) => registrationStatus(record) === 'APPROVED';
const openStudentRequest = (record) => !['DECLINED', 'CLOSED', 'CANCELLED', 'CANCELED'].includes(registrationStatus(record));

function matchingDecisionView(decision) {
  return {
    id: decision.id,
    recommendationId: decision.recommendationId,
    studentRegistrationId: decision.studentRegistrationId,
    tutorRegistrationId: decision.tutorRegistrationId,
    assignmentId: decision.assignmentId ?? null,
    decision: decision.decision,
    reason: decision.reason,
    decidedAt: decision.decidedAt,
  };
}

const isCodePulseMembershipFor = (membership, classroom) =>
  membership.classroomId === classroom.id ||
  (classroom.courseId === DSA_COURSE_ID && membership.classroomId === DSA_ROSTER_CLASSROOM_ID);

const isMembershipForClassroom = (membership, classroomId) =>
  membership.classroomId === classroomId
  || (String(classroomId) === DSA_COURSE_ID && membership.classroomId === DSA_ROSTER_CLASSROOM_ID);

const getCourseWithCanonicalRoster = async (courseId) => {
  const course = getCourse(courseId);
  if (String(courseId) !== DSA_COURSE_ID) return course;

  const memberships = await readCollection('memberships');
  const activeMemberships = memberships.filter(
    (membership) => membership.classroomId === DSA_ROSTER_CLASSROOM_ID && isActiveRecord(membership),
  );
  const students = activeMemberships.map((membership) => {
    const catalogStudent = course.students.find(
      (student) => normalizeEmail(student.email) === normalizeEmail(membership.studentEmail),
    );
    return {
      ...catalogStudent,
      id: membership.studentId,
      name: membership.studentName,
      email: membership.studentEmail,
    };
  });

  return { ...course, students };
};

const getAssignedCourseIds = async (viewerRole, viewerEmail) => {
  if (['admin', 'coordinator', 'chairman'].includes(viewerRole)) {
    return new Set(Object.keys(COURSE_CATALOG));
  }

  const assignedCourseIds = new Set();
  const normalizedViewerEmail = normalizeEmail(viewerEmail);

  if (viewerRole === 'lecturer') {
    Object.entries(COURSE_OWNERSHIPS)
      .filter(([, ownership]) => ownership.ownershipLocked === true
        && normalizeEmail(ownership.ownerEmail) === normalizedViewerEmail)
      .forEach(([courseId]) => assignedCourseIds.add(String(courseId)));

    const sessions = await readCollection('sessions');
    sessions
      .filter((session) => normalizeEmail(session.ownerEmail) === normalizedViewerEmail)
      .forEach((session) => assignedCourseIds.add(String(session.courseId)));
  }

  const codePulseClassrooms = await getCodePulseClassrooms();
  if (viewerRole === 'lecturer') {
    codePulseClassrooms
      .filter((classroom) => classroom.courseId === DSA_COURSE_ID && (
        DSA_MANAGER_EMAILS.some((managerEmail) => normalizeEmail(managerEmail) === normalizedViewerEmail) ||
        classroom.managerEmails?.some((managerEmail) => normalizeEmail(managerEmail) === normalizedViewerEmail)
      ))
      .forEach((classroom) => assignedCourseIds.add(String(classroom.courseId)));
  }

  if (viewerRole === 'lecturer') {
    codePulseClassrooms
      .filter((classroom) => normalizeEmail(classroom.lecturerEmail) === normalizedViewerEmail)
      .forEach((classroom) => assignedCourseIds.add(String(classroom.courseId)));
  }

  if (viewerRole === 'student') {
    const memberships = await readCollection('memberships');
    memberships
      .filter((membership) => isActiveRecord(membership) && normalizeEmail(membership.studentEmail ?? membership.userEmail) === normalizedViewerEmail)
      .forEach((membership) => {
        const legacyCourseId = String(membership.classroomId);
        if (COURSE_CATALOG[legacyCourseId]) assignedCourseIds.add(legacyCourseId);
        codePulseClassrooms
          .filter((classroom) => classroom.status === 'ACTIVE' && isCodePulseMembershipFor(membership, classroom))
          .forEach((classroom) => assignedCourseIds.add(String(classroom.courseId)));
      });
  }

  return assignedCourseIds;
};

const assertCourseAccess = async (courseId, viewerRole, viewerEmail) => {
  const assignedCourseIds = await getAssignedCourseIds(viewerRole, viewerEmail);
  if (!assignedCourseIds.has(String(courseId))) {
    if (viewerRole === 'student') {
      throw apiError(403, 'MEMBERSHIP_REQUIRED', 'Tài khoản không có membership ACTIVE trong classroom này.');
    }
    throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
  }
};

const ensureClassroomExists = (classroomId) => {
  if (!COURSE_CATALOG[classroomId]) {
    throw apiError(404, 'CLASSROOM_NOT_FOUND', `Không tìm thấy classroom ${classroomId}.`);
  }
};

const assertStudentHasAccess = (memberships, classroomId, viewerRole, viewerEmail) => {
  if (viewerRole !== 'student') return;
  if (!memberships.some((membership) =>
    isMembershipForClassroom(membership, classroomId)
    && normalizeEmail(membership.studentEmail) === normalizeEmail(viewerEmail)
    && isActiveRecord(membership))) {
    throw apiError(
      403,
      'MEMBERSHIP_REQUIRED',
      'Tài khoản không có membership ACTIVE trong classroom này.',
    );
  }
};

const membershipListResponse = (items, classroomId, viewerRole, viewerEmail) => ({
  items: items.map((item) => toMembershipView(item, viewerRole, viewerEmail)),
  classroomId,
  viewerRole,
  permissions: {
    canView: true,
    canEdit: viewerRole === 'lecturer',
    canDelete: viewerRole === 'lecturer',
    canCreate: viewerRole === 'lecturer',
  },
  availableStudents: viewerRole === 'lecturer'
    ? PROVISIONED_STUDENT_ACCOUNTS
    : [],
  meta: {
    source: 'node-backend',
    updatedAt: new Date().toISOString(),
    total: items.length,
  },
});

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const parts = requestUrl.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'spm-backend' });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
    const body = await readRequestBody(request);
    const user = USERS.find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );

    if (!user) throw apiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng!');
    if (user.status !== 'ACTIVE') throw apiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa hoặc không được phép truy cập!');

    sendJson(response, 200, {
      accessToken: createSession(user),
      user: createUser(user),
      role: normalizeRole(user.role),
    });
    return;
  }

  const currentUser = getSessionUser(request, USERS);
  if (!currentUser) throw apiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  if (currentUser.status !== 'ACTIVE') throw apiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa hoặc không được phép truy cập!');
  if (request.method === 'GET' && requestUrl.pathname === '/api/auth/me') {
    sendJson(response, 200, { user: createUser(currentUser), role: normalizeRole(currentUser.role) });
    return;
  }
  const viewerRole = normalizeRole(currentUser.role);
  const effectiveUser = { ...currentUser, role: viewerRole };
  const viewerEmail = currentUser.email;
  if (requestUrl.pathname.startsWith('/api/codepulse/')) {
    await handleCodePulse({ request, response, requestUrl, user: effectiveUser, sendJson, readRequestBody, apiError });
    return;
  }
  const isDsaLabCatalogRoute = requestUrl.pathname === '/api/courses'
    || requestUrl.pathname === `/api/courses/${DSA_COURSE_ID}/detail`;
  const isDsaLabSubmissionRoute = (requestUrl.pathname.startsWith(`/api/courses/${DSA_COURSE_ID}/submissions`)
    || requestUrl.pathname.startsWith('/api/submissions/'));
  if (viewerRole === 'admin'
    && !isDsaLabCatalogRoute
    && !isDsaLabSubmissionRoute) {
    throw apiError(403, 'FORBIDDEN', 'Vai trò này không có quyền truy cập API khóa học.');
  }

  if (parts[0] === 'api' && parts[1] === 'matching') {
    const feedbackRoute = parts[2] === 'feedback';
    const feedbackActor = ['coordinator', 'chairman', 'student', 'lecturer'].includes(viewerRole);
    if (feedbackRoute ? !feedbackActor : !isCoordinator(viewerRole)) {
      throw apiError(403, 'FORBIDDEN', feedbackRoute
        ? 'Vai trò này không được gửi phản hồi matching.'
        : 'Chỉ điều phối viên được sử dụng chức năng ghép tutor.');
    }

    if (request.method === 'POST' && parts[2] === 'recommendations' && !parts[3]) {
      const body = await readRequestBody(request);
      const studentRegistrationId = String(body.studentRegistrationId ?? '').trim();
      if (!studentRegistrationId) throw apiError(400, 'STUDENT_REGISTRATION_REQUIRED', 'Cần chọn đăng ký student.');
      const topK = body.topK === undefined ? 10 : Number(body.topK);
      if (!Number.isInteger(topK) || topK < 1 || topK > 50) {
        throw apiError(400, 'INVALID_TOP_K', 'topK phải là số nguyên từ 1 đến 50.');
      }
      const registrations = await readCollection('registrations');
      const studentRecord = registrations.find((record) => record.id === studentRegistrationId
        && record.registrationType === 'student');
      if (!studentRecord) throw apiError(404, 'STUDENT_REGISTRATION_NOT_FOUND', 'Không tìm thấy đăng ký student.');
      if (!openStudentRequest(studentRecord)) {
        throw apiError(409, 'STUDENT_REQUEST_CLOSED', 'Đăng ký student đã đóng hoặc bị từ chối.');
      }
      if ((await readCollection('matchingAssignments')).some((assignment) => assignment.studentRegistrationId === studentRecord.id
        && assignment.status === 'ACTIVE')) {
        throw apiError(409, 'STUDENT_ALREADY_ASSIGNED', 'Student đã có tutor đang hoạt động.');
      }
      const tutorRegistrations = registrations.filter((record) => record.registrationType === 'tutor');
      const approvedTutors = tutorRegistrations.filter(approvedTutor);
      const recommendation = await matchingService.recommend({
        studentRecord,
        tutorRecords: approvedTutors,
        assignments: await readCollection('matchingAssignments'),
        topK,
        model: body.model,
      });
      const inactiveTutorExclusions = tutorRegistrations
        .filter((record) => !approvedTutor(record))
        .map((record) => ({
          tutorRegistrationId: record.id,
          reasons: [{ constraint: 'registrationStatus', passed: false, reason: 'tutor_not_approved' }],
        }));
      const now = new Date().toISOString();
      const item = {
        id: `match-rec-${randomUUID()}`,
        studentRegistrationId,
        createdAt: now,
        createdBy: viewerEmail,
        status: 'PENDING_COORDINATOR_DECISION',
        matchingSchemaVersion: recommendation.matchingSchemaVersion,
        extractionVersion: recommendation.extractionVersion,
        model: recommendation.model,
        modelVersion: recommendation.modelVersion,
        ranking: recommendation.ranking,
        scoreSemantics: recommendation.scoreSemantics,
        reviewWarnings: recommendation.reviewWarnings,
        candidates: recommendation.candidates,
        excluded: [...recommendation.excluded, ...inactiveTutorExclusions],
        counts: {
          ...recommendation.counts,
          evaluated: tutorRegistrations.length,
          excluded: recommendation.excluded.length + inactiveTutorExclusions.length,
        },
      };
      const records = await readCollection('matchingRecommendations');
      await saveCollection('matchingRecommendations', [...records, item]);
      sendJson(response, 201, { item });
      return;
    }

    if (request.method === 'GET' && parts[2] === 'recommendations' && !parts[3]) {
      const records = await readCollection('matchingRecommendations');
      const studentRegistrationId = requestUrl.searchParams.get('studentRegistrationId');
      const items = records.filter((record) => !studentRegistrationId
        || record.studentRegistrationId === studentRegistrationId);
      sendJson(response, 200, { items, total: items.length });
      return;
    }

    if (request.method === 'GET' && parts[2] === 'assignments' && !parts[3]) {
      const assignments = await readCollection('matchingAssignments');
      const registrations = await readCollection('registrations');
      const studentRegistrationId = requestUrl.searchParams.get('studentRegistrationId');
      const tutorRegistrationId = requestUrl.searchParams.get('tutorRegistrationId');
      const items = assignments
        .filter((record) => !studentRegistrationId || record.studentRegistrationId === studentRegistrationId)
        .filter((record) => !tutorRegistrationId || record.tutorRegistrationId === tutorRegistrationId)
        .map((record) => ({
          id: record.id,
          recommendationId: record.recommendationId,
          decisionId: record.decisionId,
          studentRegistrationId: record.studentRegistrationId,
          tutorRegistrationId: record.tutorRegistrationId,
          status: record.status,
          createdAt: record.createdAt,
          studentName: registrations.find((item) => item.id === record.studentRegistrationId)?.Name ?? null,
          tutorName: registrations.find((item) => item.id === record.tutorRegistrationId)?.Name ?? null,
        }));
      sendJson(response, 200, { items, total: items.length });
      return;
    }

    if (request.method === 'POST' && parts[2] === 'recommendations' && parts[3] && parts[4] === 'decision') {
      const body = await readRequestBody(request);
      const decisionType = String(body.decision ?? '').toUpperCase();
      const reason = String(body.reason ?? '').trim();
      if (!['ACCEPT', 'REJECT'].includes(decisionType)) {
        throw apiError(400, 'INVALID_MATCHING_DECISION', 'decision phải là ACCEPT hoặc REJECT.');
      }
      if (decisionType === 'REJECT' && !reason) {
        throw apiError(400, 'DECISION_REASON_REQUIRED', 'Cần ghi lý do khi từ chối gợi ý.');
      }
      if (reason.length > 1000) throw apiError(400, 'DECISION_REASON_TOO_LONG', 'Lý do tối đa 1000 ký tự.');

      const result = await withMatchingMutationLock(async () => {
        const recommendations = await readCollection('matchingRecommendations');
        const recommendation = recommendations.find((record) => record.id === parts[3]);
        if (!recommendation) throw apiError(404, 'RECOMMENDATION_NOT_FOUND', 'Không tìm thấy gợi ý ghép cặp.');
        if (recommendation.status !== 'PENDING_COORDINATOR_DECISION') {
          throw apiError(409, 'RECOMMENDATION_ALREADY_DECIDED', 'Gợi ý này đã được xử lý.');
        }
        const tutorRegistrationId = String(body.tutorRegistrationId ?? '').trim();
        const candidate = recommendation.candidates.find((item) => item.tutorRegistrationId === tutorRegistrationId);
        if (!candidate) throw apiError(400, 'TUTOR_NOT_IN_RECOMMENDATION', 'Tutor không thuộc danh sách gợi ý này.');

        const registrations = await readCollection('registrations');
        const student = registrations.find((record) => record.id === recommendation.studentRegistrationId
          && record.registrationType === 'student');
        const tutor = registrations.find((record) => record.id === tutorRegistrationId
          && record.registrationType === 'tutor' && approvedTutor(record));
        if (!student || !openStudentRequest(student) || !tutor) {
          throw apiError(409, 'MATCHING_PROFILE_CHANGED', 'Hồ sơ đã thay đổi trạng thái; hãy tạo gợi ý mới.');
        }
        const assignments = await readCollection('matchingAssignments');
        const decisions = await readCollection('matchingDecisions');
        if (decisions.some((item) => item.recommendationId === recommendation.id
          && item.tutorRegistrationId === tutorRegistrationId)) {
          throw apiError(409, 'CANDIDATE_ALREADY_DECIDED', 'Tutor này đã được điều phối viên xem xét.');
        }
        if (decisionType === 'ACCEPT') {
          if (assignments.some((assignment) => assignment.studentRegistrationId === student.id && assignment.status === 'ACTIVE')) {
            throw apiError(409, 'STUDENT_ALREADY_ASSIGNED', 'Student đã có tutor đang hoạt động.');
          }
          const studentProfile = withExtractedProfile(student, 'STUDENT');
          const tutorProfile = withExtractedProfile(tutor, 'TUTOR');
          const activeTutorCount = assignments.filter((assignment) => assignment.tutorRegistrationId === tutor.id
            && assignment.status === 'ACTIVE').length;
          const feasibility = evaluateHardConstraints(studentProfile, tutorProfile, activeTutorCount);
          if (!feasibility.eligible) {
            throw apiError(409, 'MATCH_NO_LONGER_FEASIBLE', 'Các điều kiện bắt buộc không còn thỏa mãn; hãy tạo gợi ý mới.', {
              constraints: Object.fromEntries(Object.entries(feasibility.constraints).map(([key, value]) => [key, value.reason])),
            });
          }
        }

        const decidedAt = new Date().toISOString();
        const assignmentId = decisionType === 'ACCEPT' ? `match-assignment-${randomUUID()}` : null;
        const decision = {
          id: `match-decision-${randomUUID()}`,
          recommendationId: recommendation.id,
          studentRegistrationId: student.id,
          tutorRegistrationId,
          assignmentId,
          decision: decisionType,
          reason: reason || null,
          decidedAt,
          decidedBy: viewerEmail,
        };
        if (decisionType === 'ACCEPT') {
          const assignment = {
            id: assignmentId,
            recommendationId: recommendation.id,
            decisionId: decision.id,
            studentRegistrationId: student.id,
            tutorRegistrationId,
            status: 'ACTIVE',
            createdAt: decidedAt,
            createdBy: viewerEmail,
          };
          await saveCollection('matchingAssignments', [...assignments, assignment]);
        }
        await saveCollection('matchingDecisions', [...decisions, decision]);
        const decidedTutorIds = new Set([
          ...decisions.filter((item) => item.recommendationId === recommendation.id).map((item) => item.tutorRegistrationId),
          tutorRegistrationId,
        ]);
        const decidedTutorRegistrationIds = [...decidedTutorIds];
        const nextStatus = decisionType === 'ACCEPT'
          ? 'ACCEPTED'
          : recommendation.candidates.every((item) => decidedTutorIds.has(item.tutorRegistrationId))
            ? 'REJECTED'
            : 'PENDING_COORDINATOR_DECISION';
        const updatedRecommendations = recommendations.map((record) => record.id === recommendation.id
          ? { ...record, status: nextStatus, lastDecisionId: decision.id, decidedTutorRegistrationIds, updatedAt: decidedAt }
          : record);
        await saveCollection('matchingRecommendations', updatedRecommendations);
        return { decision: matchingDecisionView(decision) };
      });
      sendJson(response, 201, result);
      return;
    }

    if (request.method === 'POST' && parts[2] === 'feedback' && !parts[3]) {
      const body = await readRequestBody(request);
      const assignmentId = String(body.assignmentId ?? '').trim();
      const outcome = String(body.outcome ?? '').toUpperCase();
      const comment = String(body.comment ?? '').trim();
      if (!['SUCCESSFUL', 'PARTIAL', 'UNSUCCESSFUL'].includes(outcome)) {
        throw apiError(400, 'INVALID_FEEDBACK_OUTCOME', 'outcome phải là SUCCESSFUL, PARTIAL hoặc UNSUCCESSFUL.');
      }
      if (comment.length > 2000) throw apiError(400, 'FEEDBACK_TOO_LONG', 'Nhận xét tối đa 2000 ký tự.');
      const assignments = await readCollection('matchingAssignments');
      const assignment = assignments.find((record) => record.id === assignmentId && record.status === 'ACTIVE');
      if (!assignment) throw apiError(404, 'ASSIGNMENT_NOT_FOUND', 'Không tìm thấy phân công đang hoạt động.');
      if (!isCoordinator(viewerRole)) {
        const registrations = await readCollection('registrations');
        const student = registrations.find((record) => record.id === assignment.studentRegistrationId);
        const tutor = registrations.find((record) => record.id === assignment.tutorRegistrationId);
        if (![student?.Email, tutor?.Email].some((email) => normalizeEmail(email) === normalizeEmail(viewerEmail))) {
          throw apiError(403, 'FORBIDDEN', 'Chỉ người tham gia phân công được gửi phản hồi.');
        }
      }
      const item = {
        id: `match-feedback-${randomUUID()}`,
        assignmentId,
        outcome,
        comment: comment || null,
        createdAt: new Date().toISOString(),
        createdByRole: viewerRole,
        createdByEmail: viewerEmail,
      };
      const feedback = await readCollection('matchingFeedback');
      await saveCollection('matchingFeedback', [...feedback, item]);
      sendJson(response, 201, { item: { ...item, createdByEmail: undefined } });
      return;
    }

    throw apiError(404, 'MATCHING_ROUTE_NOT_FOUND', 'Không tìm thấy matching API endpoint.');
  }

  if (isMembershipRoute(parts)) {
    const classroomId = getClassroomIdFromParts(parts);
    ensureClassroomExists(classroomId);
    const membershipId = parts[4];
    if (viewerRole === 'lecturer') {
      if (!isAssignedLecturer(classroomId, viewerEmail)) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công classroom này.');
      }
    }

    if (request.method === 'GET' && !membershipId) {
      const records = await readCollection('memberships');
      if (viewerRole === 'student') {
        assertStudentHasAccess(records, classroomId, viewerRole, viewerEmail);
      }
      const classroomMemberships = records.filter((record) => isMembershipForClassroom(record, classroomId));
      // Students may open the roster as a class directory. Access is still
      // gated by the authenticated student's own ACTIVE membership above;
      // the response must not be reduced to only the current student.
      const visibleMemberships = classroomMemberships;

      sendJson(
        response,
        200,
        membershipListResponse(visibleMemberships, classroomId, viewerRole, viewerEmail),
      );
      return;
    }

    if (request.method === 'POST' && !membershipId) {
      const body = await readRequestBody(request);
      if (viewerRole !== 'lecturer') {
        throw apiError(403, 'FORBIDDEN', 'Chỉ lecturer được quản lý membership của classroom.');
      }

      const studentEmail = normalizeEmail(body.studentEmail ?? body.email);
      const student = findProvisionedStudent(studentEmail);
      if (!student) {
        throw apiError(404, 'STUDENT_NOT_FOUND', 'Không tìm thấy tài khoản student đã được provision.');
      }

      const records = await readCollection('memberships');
      const existing = records.find(
        (record) =>
          isMembershipForClassroom(record, classroomId) &&
          (record.studentId === student.id || normalizeEmail(record.studentEmail) === studentEmail),
      );

      if (existing?.status === 'ACTIVE') {
        sendJson(response, 200, {
          item: toMembershipView(existing, viewerRole, viewerEmail),
          created: false,
          reactivated: false,
        });
        return;
      }

      const now = new Date().toISOString();
      const membershipClassroomId = String(classroomId) === DSA_COURSE_ID
        ? DSA_ROSTER_CLASSROOM_ID
        : classroomId;
      const membership = existing
        ? {
          ...existing,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          status: 'ACTIVE',
          revokedAt: null,
          updatedAt: now,
        }
        : {
          id: `membership-${membershipClassroomId}-${student.id}`,
          classroomId: membershipClassroomId,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          status: 'ACTIVE',
          enrolledAt: now,
          revokedAt: null,
          createdAt: now,
          updatedAt: now,
        };

      const nextRecords = existing
        ? records.map((record) => (record.id === existing.id ? membership : record))
        : [...records, membership];
      await saveCollection('memberships', nextRecords);
      sendJson(response, existing ? 200 : 201, {
        item: toMembershipView(membership, viewerRole, viewerEmail),
        created: !existing,
        reactivated: Boolean(existing),
      });
      return;
    }

    if ((request.method === 'PATCH' || request.method === 'DELETE') && membershipId) {
      const body = await readRequestBody(request);
      if (viewerRole !== 'lecturer') {
        throw apiError(403, 'FORBIDDEN', 'Chỉ lecturer được revoke membership của classroom.');
      }

      const records = await readCollection('memberships');
      const index = records.findIndex(
        (record) => isMembershipForClassroom(record, classroomId) && record.id === membershipId,
      );
      if (index < 0) {
        throw apiError(404, 'MEMBERSHIP_NOT_FOUND', `Không tìm thấy membership ${membershipId}.`);
      }

      const requestedStatus = request.method === 'DELETE' ? 'REVOKED' : body.status ?? 'REVOKED';
      if (!['ACTIVE', 'REVOKED'].includes(requestedStatus)) {
        throw apiError(400, 'INVALID_MEMBERSHIP_STATUS', 'Membership status phải là ACTIVE hoặc REVOKED.');
      }

      const now = new Date().toISOString();
      const updated = {
        ...records[index],
        status: requestedStatus,
        revokedAt: requestedStatus === 'REVOKED' ? now : null,
        updatedAt: now,
      };
      records[index] = updated;
      await saveCollection('memberships', records);
      sendJson(response, 200, {
        item: toMembershipView(updated, viewerRole, viewerEmail),
      });
      return;
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/courses') {
    const assignedCourseIds = await getAssignedCourseIds(viewerRole, viewerEmail);
    const items = await Promise.all(Object.keys(COURSE_CATALOG)
      .filter((courseId) => assignedCourseIds.has(courseId))
      .map((courseId) => getCourseWithCanonicalRoster(courseId)));
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'course'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'detail' && request.method === 'GET') {
    const course = await getCourseWithCanonicalRoster(parts[2]);
    await assertCourseAccess(parts[2], viewerRole, viewerEmail);
    sendJson(response, 200, {
      course: toResource(course, viewerRole, viewerEmail, 'course'),
      detail: getCourseDetail(course, viewerRole, viewerEmail),
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'submissions' && request.method === 'GET') {
    const course = await getCourseWithCanonicalRoster(parts[2]);
    const detail = getCourseDetail(course, viewerRole, viewerEmail);
    const assignments = getAssignment(detail, requestUrl.searchParams.get('assignmentId'));

    if (assignments.length === 0) {
      throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy bài tập trong khóa học ${course.id}.`);
    }

    if (!['student', 'lecturer'].includes(viewerRole)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp.');
    }
    await assertCourseAccess(course.id, viewerRole, viewerEmail);
    let records = await readSubmissions();
    let changed = false;
    const items = [];

    for (const assignment of assignments) {
      const submissionContext = await getCodePulseSubmissionContext(course.id, assignment.id);
      const submissionStudents = course.id === DSA_COURSE_ID && submissionContext.classroom
        ? (await readCollection('memberships'))
          .filter((membership) => isActiveRecord(membership)
            && isCodePulseMembershipFor(membership, submissionContext.classroom))
          .map((membership) => ({
            name: membership.studentName,
            email: membership.studentEmail,
          }))
        : course.students;
      let assignmentRecords = records.filter(
        (record) => record.courseId === course.id && record.assignmentId === assignment.id,
      );

      if (assignmentRecords.length === 0) {
        assignmentRecords = createCourseSubmissionRecords(course, assignment.id, submissionStudents);
        records = [...records, ...assignmentRecords];
        changed = true;
      }

      items.push(...assignmentRecords.map((record) => toSubmissionView(record, assignment, viewerRole, submissionContext)));
    }

    if (changed) await saveSubmissions(records);

    if (viewerRole === 'student') {
      const studentId = requestUrl.searchParams.get('studentId');
      const studentEmail = requestUrl.searchParams.get('studentEmail');
      if (studentEmail && studentEmail !== viewerEmail) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp của người khác.');
      }
      const ownItems = items.filter((item) => item.student.email === viewerEmail);
      if (studentId && ownItems.some((item) => item.student.id !== studentId)) {
        throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xem bài nộp của người khác.');
      }
      items.splice(0, items.length, ...ownItems);
    }

    sendJson(response, 200, {
      items,
      viewerRole,
      permissions: {
        canView: true,
        canEdit: viewerRole === 'lecturer',
        canCreate: viewerRole === 'student',
      },
      meta: {
        source: 'node-backend',
        updatedAt: new Date().toISOString(),
        total: items.length,
      },
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'submissions' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readSubmissions();
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'SUBMISSION_NOT_FOUND', `Không tìm thấy submission ${parts[2]}.`);

    const current = records[index];
    if (!['student', 'lecturer'].includes(viewerRole)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bài nộp.');
    }
    if (viewerRole === 'student' && current.student.email !== viewerEmail) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền sửa bài nộp của người khác.');
    }
    await assertCourseAccess(current.courseId, viewerRole, viewerEmail);
    const updated = { ...current };

    if (viewerRole === 'lecturer') {
      if (body.score !== undefined) updated.score = body.score;
      if (body.feedback !== undefined) updated.feedback = body.feedback;
    } else {
      if (body.submittedAt !== undefined) updated.submittedAt = body.submittedAt;
      if (body.fileUrl !== undefined) updated.fileUrl = body.fileUrl;
    }

    updated.status = updated.submittedAt
      ? updated.score === null ? 'submitted' : 'graded'
      : 'not-submitted';

    records[index] = updated;
    await saveSubmissions(records);

    const course = await getCourseWithCanonicalRoster(updated.courseId);
    const assignment = getAssignment(getCourseDetail(course, viewerRole, viewerEmail), updated.assignmentId)[0];
    if (!assignment) throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy assignment ${updated.assignmentId}.`);

    sendJson(response, 200, {
      item: toSubmissionView(
        updated,
        assignment,
        viewerRole,
        await getCodePulseSubmissionContext(updated.courseId, assignment.id),
      ),
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && request.method === 'GET') {
    const courseId = requestUrl.searchParams.get('courseId');
    const records = await readCollection('sessions');
    let items = courseId ? records.filter((record) => record.courseId === courseId) : records;
    if (viewerRole === 'student') {
      const memberships = await readCollection('memberships');
      if (courseId) {
        assertStudentHasAccess(memberships, courseId, viewerRole, viewerEmail);
      } else {
        const activeClassrooms = new Set(
          memberships
            .filter(
              (membership) =>
                membership.status === 'ACTIVE' &&
                normalizeEmail(membership.studentEmail) === normalizeEmail(viewerEmail),
            )
            .map((membership) => membership.classroomId),
        );
        items = items.filter((record) => activeClassrooms.has(record.courseId));
      }
    } else if (viewerRole === 'lecturer') {
      items = items.filter((record) => record.ownerEmail === viewerEmail);
    }
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'session'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    if (viewerRole !== 'lecturer' && viewerRole !== 'coordinator' && viewerRole !== 'chairman') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo session.');
    }
    if (viewerRole === 'lecturer' && body.item?.courseId && !isAssignedLecturer(body.item.courseId, viewerEmail)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
    }
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `session-${Date.now()}`,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
      ownerRole: viewerRole,
      ownerEmail: viewerEmail,
    };
    const records = await readCollection('sessions');
    records.push(item);
    await saveCollection('sessions', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);

    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa session này.');

    const { id: ignoredId, ownerRole: ignoredRole, ownerEmail: ignoredEmail, ...patch } = clone(body.patch ?? {});
    if (viewerRole === 'lecturer' && patch.courseId && !isAssignedLecturer(patch.courseId, viewerEmail)) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không được phân công khóa học này.');
    }
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('sessions', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa session này.');
    await saveCollection('sessions', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && request.method === 'GET') {
    const registrationType = requestUrl.searchParams.get('registrationType');
    const records = await readCollection('registrations');
    const items = registrationType
      ? records.filter((record) => record.registrationType === registrationType)
      : records;
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'registration'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    const requestedRegistrationRole = normalizeRole(body.registrationType);
    if (viewerRole !== 'coordinator' && viewerRole !== 'chairman' && requestedRegistrationRole !== viewerRole) {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo đăng ký này.');
    }
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `registration-${Date.now()}`,
      registrationType: body.registrationType ?? viewerRole,
      ownerRole: viewerRole,
      ownerEmail: viewerEmail,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('registrations');
    records.push(item);
    await saveCollection('registrations', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const updated = await withMatchingMutationLock(async () => {
      const records = await readCollection('registrations');
      const index = records.findIndex((record) => record.id === parts[2]);
      if (index < 0) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
      const current = records[index];
      const permissions = getResourcePermissions({
        viewerRole,
        ownerRole: current.ownerRole,
        ownerEmail: current.ownerEmail,
        viewerEmail,
      });
      if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa registration này.');
      const { id: ignoredId, ownerRole: ignoredRole, ownerEmail: ignoredEmail, ...patch } = clone(body.patch ?? {});
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      records[index] = next;
      await saveCollection('registrations', records);
      return next;
    });
    sendJson(response, 200, { item: toResource(updated, viewerRole, viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'DELETE') {
    await withMatchingMutationLock(async () => {
      const records = await readCollection('registrations');
      const current = records.find((record) => record.id === parts[2]);
      if (!current) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
      const permissions = getResourcePermissions({
        viewerRole,
        ownerRole: current.ownerRole,
        ownerEmail: current.ownerEmail,
        viewerEmail,
      });
      if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa registration này.');
      if ((await readCollection('matchingAssignments')).some((assignment) => assignment.status === 'ACTIVE'
        && (assignment.studentRegistrationId === current.id || assignment.tutorRegistrationId === current.id))) {
        throw apiError(409, 'REGISTRATION_HAS_ACTIVE_ASSIGNMENT', 'Không thể xóa registration đang có phân công hoạt động.');
      }
      await saveCollection('registrations', records.filter((record) => record.id !== parts[2]));
    });
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && request.method === 'GET') {
    const records = await readCollection('courseRequests');
    sendJson(response, 200, toListResponse(records, viewerRole, viewerEmail, 'courseRequest'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    if (viewerRole !== 'coordinator' && viewerRole !== 'chairman') {
      throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền tạo yêu cầu khóa học.');
    }
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `course-request-${Date.now()}`,
      ownerRole: viewerRole,
      ownerEmail: viewerEmail,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('courseRequests');
    records.push(item);
    await saveCollection('courseRequests', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa yêu cầu này.');
    const { id: ignoredId, ownerRole: ignoredRole, ownerEmail: ignoredEmail, ...patch } = clone(body.patch ?? {});
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('courseRequests', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa yêu cầu này.');
    await saveCollection('courseRequests', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  throw apiError(404, 'NOT_FOUND', 'Không tìm thấy API endpoint.');
}

export { handleRequest };
