import { COURSE_CATALOG } from '../data/seeds.mjs';

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

const getCourse = (courseId) => clone(COURSE_CATALOG[courseId] ?? createGenericCourse(courseId));

const getCourseDetail = (course, viewerRole = 'student') => ({
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
  permissions: getResourcePermissions({ viewerRole, resourceType: 'course' }),
  meta: {
    source: 'local-backend',
    updatedAt: new Date().toISOString(),
    viewerRole: normalizeRole(viewerRole),
  },
});

const getAssignment = (detail, requestedId) => {
  const submissions = detail.content.filter((item) => item.type === 'submission');
  if (!requestedId) return submissions;

  const normalizedId = normalizeAssignmentKey(requestedId);
  return submissions.filter(
    (item) => normalizeAssignmentKey(item.id) === normalizedId,
  );
};

const getPermissions = (viewerRole, status) => ({
  canView: true,
  canSubmit: viewerRole === 'student',
  canEdit: viewerRole === 'tutor' || status !== 'graded',
  canReview: viewerRole === 'tutor',
});

const normalizeRole = (value) =>
  ['student', 'tutor', 'coordinator', 'chairman'].includes(value) ? value : 'student';

const isManager = (role) => role === 'coordinator' || role === 'chairman';

const getResourcePermissions = ({
  viewerRole,
  ownerRole,
  ownerEmail,
  viewerEmail,
  resourceType = 'generic',
}) => {
  const role = normalizeRole(viewerRole);
  const isOwner = Boolean(
    (viewerEmail && ownerEmail && viewerEmail === ownerEmail) ||
      (!viewerEmail && ownerRole && role === ownerRole),
  );
  const canView = isManager(role) || resourceType === 'course' || resourceType === 'session'
    ? true
    : isOwner;
  const canEdit = isManager(role) || (
    resourceType === 'session'
      ? role === 'tutor' && isOwner
      : isOwner
  );

  return {
    canView,
    canEdit,
    canDelete: canEdit,
    canCreate: isManager(role) || (
      resourceType === 'registration' && (role === 'student' || role === 'tutor')
    ) || (resourceType === 'session' && role === 'tutor'),
  };
};

const toResource = (record, viewerRole, viewerEmail, resourceType = 'generic') => ({
  ...clone(record),
  permissions: getResourcePermissions({
    viewerRole,
    ownerRole: record.ownerRole,
    ownerEmail: record.ownerEmail,
    viewerEmail,
    resourceType,
  }),
  meta: {
    source: 'local-backend',
    updatedAt: record.updatedAt ?? record.createdAt ?? new Date().toISOString(),
    viewerRole: normalizeRole(viewerRole),
    ownerRole: record.ownerRole,
    ownerEmail: record.ownerEmail,
  },
});

const toListResponse = (items, viewerRole, viewerEmail, resourceType = 'generic') => {
  const visibleItems = items.filter((item) => getResourcePermissions({
    viewerRole,
    ownerRole: item.ownerRole,
    ownerEmail: item.ownerEmail,
    viewerEmail,
    resourceType,
  }).canView);

  return {
    items: visibleItems.map((item) => toResource(item, viewerRole, viewerEmail, resourceType)),
    viewerRole: normalizeRole(viewerRole),
    permissions: {
      canView: true,
      canEdit: isManager(viewerRole),
      canDelete: isManager(viewerRole),
      canCreate: isManager(viewerRole) || viewerRole === 'student' || viewerRole === 'tutor',
    },
    meta: {
      source: 'local-backend',
      updatedAt: new Date().toISOString(),
      total: visibleItems.length,
    },
  };
};

const toSubmissionView = (record, assignment, viewerRole) => ({
  ...record,
  assignment: {
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.data.dueDate,
  },
  permissions: getPermissions(viewerRole, record.status),
});

const createCourseSubmissionRecords = (course, assignmentId) =>
  course.students.map((student, index) => {
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
      feedback: isGraded ? 'Bài làm đạt yêu cầu trong backend driver.' : '',
      submittedAt,
      fileUrl: '/group07_report 02.pdf',
    };
  });

const createUser = (seedUser) => ({
  _id: seedUser.email,
  googleId: '',
  appleId: null,
  email: seedUser.email,
  firstName: seedUser.role.charAt(0).toUpperCase() + seedUser.role.slice(1),
  lastName: 'User',
  picture: null,
  dateOfBirth: null,
  phone: null,
  isManager: ['tutor', 'coordinator', 'chairman'].includes(seedUser.role),
  isStudent: seedUser.role === 'student',
  isTutor: seedUser.role === 'tutor',
  isCoordinator: seedUser.role === 'coordinator',
  statisticalPermission: ['coordinator', 'chairman'].includes(seedUser.role),
  isChairman: seedUser.role === 'chairman',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  address: '',
  highSchool: null,
});

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
};
