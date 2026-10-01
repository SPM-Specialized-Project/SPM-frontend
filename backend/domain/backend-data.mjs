import { COURSE_CATALOG, COURSE_OWNERSHIPS, PROVISIONED_STUDENT_ACCOUNTS } from '../data/seeds.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeAssignmentKey = (value) =>
  String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const createGenericCourse = (courseId) => ({
  id: courseId,
  code: `BACKEND_COURSE_${courseId}`,
  title: `Backend demo course ${courseId}`,
  instructor: 'Backend Driver',
  stats: { documents: 1, links: 1, assignments: 1 },
  numberTotalSessions: 0,
  students: [
    { name: `Sinh viên ${courseId}-1`, email: `student-${courseId}-1@student.hcmut.edu.vn` },
    { name: `Sinh viên ${courseId}-2`, email: `student-${courseId}-2@student.hcmut.edu.vn` },
  ],
  sessionsOrganized: 0,
});

const getCourse = (courseId) => {
  const course = COURSE_CATALOG[courseId] ?? createGenericCourse(courseId);
  const ownership = COURSE_OWNERSHIPS[courseId];
  return clone(ownership ? { ...course, ...ownership } : course);
};

const getCourseDetail = (course, viewerRole = 'student', viewerEmail) => {
  const role = normalizeRole(viewerRole);
  const canonicalOwnerRole = course.ownerRole === 'tutor' ? 'lecturer' : course.ownerRole;

  return ({
  id: course.id,
  code: course.code,
  title: course.title,
  instructor: course.instructor,
  content: [
    {
      id: `${course.id}-introduction`,
      type: 'introduction',
      title: 'Giới thiệu khóa học',
      data: { text: `Đây là khóa học ${course.title}, được trả về từ backend server.` },
    },
    {
      id: `${course.id}-material`,
      type: 'material',
      title: 'Tài liệu học tập',
      data: {
        document: {
          id: `${course.id}-document`,
          title: `Tài liệu nhập môn ${course.title}`,
          description: 'Tài liệu mock được trả về từ backend.',
          dueDate: '',
          source: 'group07_report 02.pdf',
        },
      },
    },
    {
      id: `${course.id}-reference`,
      type: 'reference',
      title: 'Tài liệu tham khảo',
      data: {
        link: {
          id: `${course.id}-reference-link`,
          title: `Tài liệu tham khảo về ${course.title}`,
          url: 'https://example.com/course-reference',
        },
      },
    },
    {
      id: `${course.id}-submission`,
      type: 'submission',
      title: 'Bài tập đầu tiên',
      data: {
        status: 'not-submitted',
        dueDate: '',
        canEdit: true,
        maxFiles: 1,
        allowedTypes: ['pdf', 'docx'],
      },
    },
  ],
    permissions: getResourcePermissions({
    viewerRole: role,
    ownerRole: canonicalOwnerRole,
    ownerEmail: course.ownerEmail,
    viewerEmail,
    resourceType: 'course',
  }),
  meta: {
    source: 'node-backend',
    updatedAt: new Date().toISOString(),
    viewerRole: role,
    ownerRole: course.ownerRole,
    ownerEmail: course.ownerEmail,
    ownershipLocked: course.ownershipLocked === true,
  },
  });
};

const getAssignment = (detail, requestedId) => {
  const submissions = detail.content.filter((item) => item.type === 'submission');
  if (!requestedId) return submissions;

  const normalizedId = normalizeAssignmentKey(requestedId);
  return submissions.filter(
    (item) => normalizeAssignmentKey(item.id) === normalizedId,
  );
};

const getPermissions = (viewerRole, status) => {
  const role = normalizeRole(viewerRole);

  return ({
  canView: true,
  canSubmit: role === 'student',
  canEdit: role === 'lecturer' || status !== 'graded',
  canReview: role === 'lecturer',
  });
};

const normalizeRole = (value) => {
  const rawRole = String(value ?? '').trim().toLowerCase();
  const canonicalRole = rawRole === 'tutor' ? 'lecturer' : rawRole;
  return ['student', 'coordinator', 'chairman', 'lecturer', 'admin'].includes(canonicalRole)
    ? canonicalRole
    : 'student';
};

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

const isManager = (role) => role === 'coordinator' || role === 'chairman';

const getMembershipPermissions = ({ viewerRole, viewerEmail, membership }) => {
  const role = normalizeRole(viewerRole);
  const canManage = role === 'lecturer';
  const canViewOwn = role === 'student' && normalizeEmail(viewerEmail) === normalizeEmail(membership?.studentEmail);

  return {
    canView: canManage || isManager(role) || canViewOwn,
    canEdit: canManage,
    canDelete: canManage,
    canCreate: canManage,
  };
};

const toMembershipView = (membership, viewerRole, viewerEmail) => ({
  ...clone(membership),
  permissions: getMembershipPermissions({ viewerRole, viewerEmail, membership }),
  meta: {
    source: 'node-backend',
    updatedAt: membership.updatedAt ?? membership.createdAt ?? new Date().toISOString(),
    viewerRole: normalizeRole(viewerRole),
  },
});

const findProvisionedStudent = (email) => {
  const normalizedEmail = normalizeEmail(email);
  return PROVISIONED_STUDENT_ACCOUNTS.find(
    (account) => normalizeEmail(account.email) === normalizedEmail,
  );
};

const hasActiveMembership = (memberships, classroomId, studentEmail) => memberships.some(
  (membership) =>
    membership.classroomId === classroomId &&
    normalizeEmail(membership.studentEmail) === normalizeEmail(studentEmail) &&
    membership.status === 'ACTIVE',
);

const getResourcePermissions = ({
  viewerRole,
  ownerRole,
  ownerEmail,
  viewerEmail,
  resourceType = 'generic',
}) => {
  const role = normalizeRole(viewerRole);
  const canonicalOwnerRole = ownerRole === 'tutor' ? 'lecturer' : ownerRole;
  const isOwner = Boolean(
    (viewerEmail && ownerEmail && normalizeEmail(viewerEmail) === normalizeEmail(ownerEmail)) ||
      (!viewerEmail && canonicalOwnerRole && role === canonicalOwnerRole),
  );
  const canView = isManager(role) || resourceType === 'course' ||
    (resourceType === 'session' && role === 'student') || isOwner;
  const canEdit = isManager(role) || (
    resourceType === 'session'
      ? role === 'lecturer' && isOwner
      : isOwner
  );

  return {
    canView,
    canEdit,
    canDelete: canEdit,
    canCreate: isManager(role) || (
      resourceType === 'registration' && (role === 'student' || role === 'lecturer')
    ) || (resourceType === 'session' && role === 'lecturer'),
  };
};

const toResource = (record, viewerRole, viewerEmail, resourceType = 'generic') => {
  const role = normalizeRole(viewerRole);
  const canonicalOwnerRole = record.ownerRole === 'tutor' ? 'lecturer' : record.ownerRole;

  return ({
  ...clone(resourceType === 'course' && role === 'student'
    ? { ...record, students: [], ownerRole: canonicalOwnerRole }
    : resourceType === 'session' && role === 'student'
      ? { ...record, tutorNote: undefined, members: undefined, studentNames: undefined, ownerRole: canonicalOwnerRole }
      : { ...record, ownerRole: canonicalOwnerRole }),
  permissions: getResourcePermissions({
    viewerRole: role,
    ownerRole: canonicalOwnerRole,
    ownerEmail: record.ownerEmail,
    viewerEmail,
    resourceType,
  }),
  meta: {
    source: 'node-backend',
    updatedAt: record.updatedAt ?? record.createdAt ?? new Date().toISOString(),
    viewerRole: role,
    ownerRole: canonicalOwnerRole,
    ownerEmail: record.ownerEmail,
    ownershipLocked: record.ownershipLocked === true,
  },
  });
};

const toListResponse = (items, viewerRole, viewerEmail, resourceType = 'generic') => {
  const role = normalizeRole(viewerRole);
  const visibleItems = items.filter((item) => getResourcePermissions({
    viewerRole: role,
    ownerRole: item.ownerRole,
    ownerEmail: item.ownerEmail,
    viewerEmail,
    resourceType,
  }).canView);

  return {
    items: visibleItems.map((item) => toResource(item, role, viewerEmail, resourceType)),
    viewerRole: role,
    permissions: {
      canView: true,
      canEdit: isManager(role) || visibleItems.some((item) => getResourcePermissions({
        viewerRole: role,
        ownerRole: item.ownerRole,
        ownerEmail: item.ownerEmail,
        viewerEmail,
        resourceType,
      }).canEdit),
      canDelete: isManager(role) || visibleItems.some((item) => getResourcePermissions({
        viewerRole: role,
        ownerRole: item.ownerRole,
        ownerEmail: item.ownerEmail,
        viewerEmail,
        resourceType,
      }).canDelete),
      canCreate: isManager(role) ||
        (resourceType === 'registration' && (role === 'student' || role === 'lecturer')) ||
        (resourceType === 'session' && role === 'lecturer'),
    },
    meta: {
      source: 'node-backend',
      updatedAt: new Date().toISOString(),
      total: visibleItems.length,
    },
  };
};

const toSubmissionView = (record, assignment, viewerRole, context = { term: null, classroom: null }) => ({
  ...record,
  assignment: {
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.data.dueDate,
  },
  term: context.term,
  classroom: context.classroom,
  permissions: getPermissions(viewerRole, record.status),
});

const createCourseSubmissionRecords = (course, assignmentId, students = course.students) =>
  students.map((student, index) => {
    const submittedAt = new Date(Date.UTC(2025, 0, 10, 9, index * 15)).toISOString();
    const isGraded = index === 0;

    return {
      id: `${course.id}-${assignmentId}-${index + 1}`,
      courseId: course.id,
      assignmentId,
      student: {
        id: `${course.id}-student-${index + 1}`,
        memberId: index + 1,
        name: student.name,
        email: student.email,
      },
      status: isGraded ? 'graded' : 'submitted',
      score: isGraded ? 8.5 : null,
      feedback: isGraded ? 'Bài làm đạt yêu cầu trong Node.js backend.' : '',
      submittedAt,
      fileUrl: '/group07_report 02.pdf',
    };
  });

const createUser = (seedUser) => {
  const role = normalizeRole(seedUser.role);

  return ({
  _id: seedUser.email,
  googleId: '',
  appleId: null,
  email: seedUser.email,
  role,
  firstName: role.charAt(0).toUpperCase() + role.slice(1),
  lastName: 'User',
  picture: null,
  dateOfBirth: null,
  phone: null,
  isManager: ['lecturer', 'coordinator', 'chairman'].includes(role),
  isStudent: role === 'student',
  isLecturer: role === 'lecturer',
  isCoordinator: role === 'coordinator',
  statisticalPermission: ['coordinator', 'chairman'].includes(role),
  isChairman: role === 'chairman',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  address: '',
  highSchool: null,
  });
};

export {
  clone,
  normalizeAssignmentKey,
  createGenericCourse,
  getCourse,
  getCourseDetail,
  getAssignment,
  getPermissions,
  normalizeRole,
  isManager,
  getResourcePermissions,
  toResource,
  toListResponse,
  toSubmissionView,
  createCourseSubmissionRecords,
  createUser,
  normalizeEmail,
  getMembershipPermissions,
  toMembershipView,
  findProvisionedStudent,
  hasActiveMembership,
};
