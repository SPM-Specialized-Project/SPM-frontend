import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.BACKEND_PORT ?? 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIRECTORY = path.join(__dirname, 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIRECTORY, 'submissions.json');
const SESSIONS_FILE = path.join(DATA_DIRECTORY, 'sessions.json');
const REGISTRATIONS_FILE = path.join(DATA_DIRECTORY, 'registrations.json');
const COURSE_REQUESTS_FILE = path.join(DATA_DIRECTORY, 'course-requests.json');

const USERS = [
  { email: 'student@gmail.com', password: 'student123', role: 'student' },
  { email: 'tutor@gmail.com', password: 'tutor123', role: 'tutor' },
  { email: 'coordinator@gmail.com', password: 'coordinator123', role: 'coordinator' },
  { email: 'chairman@gmail.com', password: 'chairman123', role: 'chairman' },
];

const COURSE_2 = {
  id: '2',
  code: '79748_CO2013_003184_CLC',
  title: 'Database System',
  instructor: 'Nguyễn Thị Ái Thảo',
  stats: { documents: 5, links: 1, assignments: 1 },
  numberTotalSessions: 15,
  students: [
    { name: 'Phạm Văn D', email: 'phamvand@student.hcmut.edu.vn', numberOfSubmissions: 6, numberOfJoinedSessions: 14, averageScore: 92 },
    { name: 'Hoàng Thị E', email: 'hoangthie@student.hcmut.edu.vn', numberOfSubmissions: 5, numberOfJoinedSessions: 13, averageScore: 87 },
  ],
  sessionsOrganized: 15,
};

const COURSE_CATALOG = {
  '1': {
    id: '1', code: '79748_CO2013_003183_CLC', title: 'Computer Network',
    instructor: 'Nguyễn Lê Duy Lai', stats: { documents: 3, links: 2, assignments: 0 },
    numberTotalSessions: 12, sessionsOrganized: 12,
    students: [
      { name: 'Nguyễn Văn A', email: 'nguyenvana@student.hcmut.edu.vn', numberOfSubmissions: 5, numberOfJoinedSessions: 10, averageScore: 85 },
      { name: 'Trần Thị B', email: 'tranthib@student.hcmut.edu.vn', numberOfSubmissions: 3, numberOfJoinedSessions: 8, averageScore: 90 },
      { name: 'Lê Minh C', email: 'leminhc@student.hcmut.edu.vn', numberOfSubmissions: 4, numberOfJoinedSessions: 9, averageScore: 88 },
    ],
  },
  '2': COURSE_2,
  '3': {
    id: '3', code: '79748_CO2013_003185_CLC', title: 'Operating System',
    instructor: 'Ngô Thị Vân', stats: { documents: 2, links: 3, assignments: 2 },
    numberTotalSessions: 10, sessionsOrganized: 10,
    students: [
      { name: 'Võ Văn F', email: 'vovanf@student.hcmut.edu.vn', numberOfSubmissions: 4, numberOfJoinedSessions: 9, averageScore: 80 },
      { name: 'Đặng Thị G', email: 'dangthig@student.hcmut.edu.vn', numberOfSubmissions: 3, numberOfJoinedSessions: 8, averageScore: 75 },
      { name: 'Bùi Minh H', email: 'buiminhh@student.hcmut.edu.vn', numberOfSubmissions: 5, numberOfJoinedSessions: 10, averageScore: 95 },
    ],
  },
  '4': {
    id: '4', code: '79748_CO2013_003186_CLC', title: 'Principles of Programming Language',
    instructor: 'Nguyễn Hứa Phùng', stats: { documents: 4, links: 2, assignments: 1 },
    numberTotalSessions: 18, sessionsOrganized: 18,
    students: [
      { name: 'Lý Thị K', email: 'lythik@student.hcmut.edu.vn', numberOfSubmissions: 7, numberOfJoinedSessions: 16, averageScore: 89 },
      { name: 'Phan Văn L', email: 'phanvanl@student.hcmut.edu.vn', numberOfSubmissions: 6, numberOfJoinedSessions: 15, averageScore: 84 },
    ],
  },
  '5': {
    id: '5', code: '79748_CO2013_003187_CLC', title: 'Algorithms',
    instructor: 'Nguyễn Hứa Phùng', stats: { documents: 6, links: 0, assignments: 3 },
    numberTotalSessions: 14, sessionsOrganized: 14,
    students: [
      { name: 'Ngô Văn N', email: 'ngovann@student.hcmut.edu.vn', numberOfSubmissions: 9, numberOfJoinedSessions: 14, averageScore: 93 },
      { name: 'Đỗ Thị O', email: 'dothio@student.hcmut.edu.vn', numberOfSubmissions: 7, numberOfJoinedSessions: 12, averageScore: 85 },
    ],
  },
  '6': {
    id: '6', code: '79748_CO2013_003188_CLC', title: 'Data Structures',
    instructor: 'Ngô Thị F', stats: { documents: 4, links: 2, assignments: 1 },
    numberTotalSessions: 16, sessionsOrganized: 16,
    students: [
      { name: 'Trương Văn P', email: 'truongvanp@student.hcmut.edu.vn' },
      { name: 'Lâm Thị Q', email: 'lamthiq@student.hcmut.edu.vn' },
    ],
  },
  '7': {
    id: '7', code: '79748_CO2013_003189_CLC', title: 'Software Engineering',
    instructor: 'Trần Trương Tuấn Phát', stats: { documents: 5, links: 2, assignments: 2 },
    numberTotalSessions: 20, sessionsOrganized: 20,
    students: [
      { name: 'Cao Văn S', email: 'caovans@student.hcmut.edu.vn' },
      { name: 'Hồ Thị T', email: 'hothit@student.hcmut.edu.vn' },
    ],
  },
  '8': {
    id: '8', code: '79748_CO2013_003190_CLC', title: 'Computer Graphics',
    instructor: 'Đặng Thị H', stats: { documents: 3, links: 1, assignments: 0 },
    numberTotalSessions: 8, sessionsOrganized: 8,
    students: [{ name: 'Đinh Văn U', email: 'dinhvanu@student.hcmut.edu.vn' }],
  },
  '9': {
    id: '9', code: '79748_CO2013_003191_CLC', title: 'Artificial Intelligence',
    instructor: 'Võ Văn I', stats: { documents: 7, links: 3, assignments: 4 },
    numberTotalSessions: 22, sessionsOrganized: 22,
    students: [
      { name: 'Tạ Văn V', email: 'tavanv@student.hcmut.edu.vn' },
      { name: 'Ông Thị W', email: 'ongthiw@student.hcmut.edu.vn' },
    ],
  },
  '10': {
    id: '10', code: '79748_CO2013_003192_CLC', title: 'Operating Systems II',
    instructor: 'Trịnh Thị K', stats: { documents: 2, links: 0, assignments: 1 },
    numberTotalSessions: 11, sessionsOrganized: 11,
    students: [
      { name: 'Vũ Văn Y', email: 'vuvany@student.hcmut.edu.vn' },
      { name: 'Quách Thị Z', email: 'quachthiz@student.hcmut.edu.vn' },
    ],
  },
  '11': {
    id: '11', code: '79748_CO2013_003193_CLC', title: 'Networks II',
    instructor: 'Phan Văn L', stats: { documents: 3, links: 2, assignments: 1 },
    numberTotalSessions: 13, sessionsOrganized: 13,
    students: [
      { name: 'Kiều Văn AA', email: 'kieuvana@student.hcmut.edu.vn' },
      { name: 'Từ Thị BB', email: 'tuthibb@student.hcmut.edu.vn' },
    ],
  },
  '12': {
    id: '12', code: '79748_CO2013_003194_CLC', title: 'Database II',
    instructor: 'Lý Thị M', stats: { documents: 4, links: 2, assignments: 2 },
    numberTotalSessions: 17, sessionsOrganized: 17,
    students: [
      { name: 'Lương Văn CC', email: 'luongvancc@student.hcmut.edu.vn' },
      { name: 'Nghiêm Thị DD', email: 'nghiemthidd@student.hcmut.edu.vn' },
    ],
  },
};

const INITIAL_SUBMISSIONS = [
  {
    id: '2-2-submission-1',
    courseId: '2',
    assignmentId: '2-submission',
    student: {
      id: '2-student-1',
      memberId: 1,
      name: 'Phạm Văn D',
      email: 'phamvand@student.hcmut.edu.vn',
    },
    status: 'graded',
    score: 8.5,
    feedback: 'Bài làm đạt yêu cầu trong backend driver.',
    submittedAt: '2025-01-10T09:00:00.000Z',
    fileUrl: '/group07_report 02.pdf',
  },
  {
    id: '2-2-submission-2',
    courseId: '2',
    assignmentId: '2-submission',
    student: {
      id: '2-student-2',
      memberId: 2,
      name: 'Hoàng Thị E',
      email: 'hoangthie@student.hcmut.edu.vn',
    },
    status: 'submitted',
    score: null,
    feedback: '',
    submittedAt: '2025-01-10T09:15:00.000Z',
    fileUrl: '/group07_report 02.pdf',
  },
];

const INITIAL_SESSIONS = [
  {
    id: 's-1',
    ownerRole: 'tutor',
    ownerEmail: 'tutor@gmail.com',
    courseId: '1',
    courseTitle: 'Computer Network',
    title: 'Computer Network - Buổi 1',
    desc: 'Giới thiệu syllabus và môi trường học tập.',
    tutorNote: 'https://docs.example.com/tutor-notes/session-1',
    instructor: 'Nguyễn Lê Duy Lai',
    instructorEmail: 'nguyen.le.duy.lai@tutor.example.com',
    method: 'online',
    link: 'https://meet.example.com/abc-123',
    start: '2025-12-17T09:00:00.000Z',
    end: '2025-12-17T10:00:00.000Z',
    members: [
      { id: 1, name: 'Nguyễn Văn A', present: true },
      { id: 2, name: 'Trần Thị B', present: false },
    ],
    studentNames: ['Nguyễn Văn A', 'Trần Thị B'],
    requestType: 'new',
    status: 'scheduled',
    createdAt: '2025-12-01T08:00:00.000Z',
  },
  {
    id: 's-2',
    ownerRole: 'tutor',
    ownerEmail: 'tutor@gmail.com',
    courseId: '2',
    courseTitle: 'Database System',
    title: 'Database System - Lab',
    desc: 'Thiết kế schema và queries cơ bản.',
    tutorNote: 'https://docs.example.com/tutor-notes/session-2',
    instructor: 'Nguyễn Thị Ái Thảo',
    instructorEmail: 'nguyen.thi.ai.thao@tutor.example.com',
    method: 'offline',
    location: 'Phòng A-101',
    start: '2025-12-17T13:00:00.000Z',
    end: '2025-12-17T15:00:00.000Z',
    members: [
      { id: 1, name: 'Phạm Văn D', present: true },
      { id: 2, name: 'Hoàng Thị E', present: true },
    ],
    studentNames: ['Phạm Văn D', 'Hoàng Thị E'],
    requestType: 'makeup',
    status: 'scheduled',
    createdAt: '2025-12-01T08:00:00.000Z',
  },
  {
    id: 's-3',
    ownerRole: 'tutor',
    ownerEmail: 'tutor@gmail.com',
    courseId: '2',
    courseTitle: 'Database System',
    title: 'Database System - Tổng hợp',
    desc: 'Tổng hợp chương 1-3 và Q&A.',
    tutorNote: 'https://docs.example.com/tutor-notes/session-3',
    instructor: 'Nguyễn Thị Ái Thảo',
    instructorEmail: 'nguyen.thi.ai.thao@tutor.example.com',
    method: 'online',
    link: 'https://meet.example.com/xyz-789',
    start: '2025-12-18T10:00:00.000Z',
    end: '2025-12-18T11:30:00.000Z',
    members: [
      { id: 1, name: 'Phạm Văn D', present: false },
      { id: 2, name: 'Hoàng Thị E', present: false },
    ],
    studentNames: ['Phạm Văn D', 'Hoàng Thị E'],
    requestType: 'new',
    status: 'scheduled',
    createdAt: '2025-12-01T08:00:00.000Z',
  },
];

const INITIAL_REGISTRATIONS = [
  {
    id: 'reg-1',
    registrationType: 'student',
    ownerRole: 'student',
    ownerEmail: 'student@gmail.com',
    Name: 'Student',
    Email: 'student@gmail.com',
    subjects: [{ id: '3', name: 'Operating System (79748_CO2013_003185_CLC)' }],
    languages: [{ id: 'vi', name: 'Tiếng Việt' }],
    sessionTypes: [{ id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' }],
    locations: [{ id: 'p1', name: 'Phường 1' }],
    specialRequest: 'Muốn học sâu về quản lý bộ nhớ và virtual memory.',
    status: 'Approved',
    createdAt: '2025-11-01T10:00:00.000Z',
  },
  {
    id: 'tutor-reg-1',
    registrationType: 'tutor',
    ownerRole: 'tutor',
    ownerEmail: 'tutor@gmail.com',
    Name: 'Tutor',
    Email: 'tutor@gmail.com',
    subjects: [{ id: '2', name: 'Database System (79748_CO2013_003184_CLC)' }],
    languages: [{ id: 'vi', name: 'Tiếng Việt' }],
    sessionTypes: [{ id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' }],
    locations: [{ id: 'p3', name: 'Phường 3' }],
    specialRequest: 'Chuyên dạy SQL, tối ưu hóa truy vấn và NoSQL.',
    status: 'Pending',
    createdAt: '2025-11-10T11:20:00.000Z',
  },
];

const INITIAL_COURSE_REQUESTS = [
  {
    id: 'course-req-1',
    ownerRole: 'coordinator',
    ownerEmail: 'coordinator@gmail.com',
    coordinatorName: 'Nguyễn Văn An',
    coordinatorEmail: 'coordinator@gmail.com',
    courseName: 'Advanced Machine Learning',
    courseCode: 'CS401',
    languages: [{ id: 'vi', name: 'Tiếng Việt' }, { id: 'en', name: 'English' }],
    sessionTypes: [{ id: 'online', name: 'Học trực tuyến' }],
    locations: [],
    timeSlots: [{ id: 'slot-1', date: '2025-11-15', time: '08:00' }],
    description: 'Khóa học chuyên sâu về Machine Learning và ứng dụng thực tế.',
    status: 'Approved',
    reasons: 'Nội dung phù hợp với chương trình đào tạo.',
    createdAt: '2025-11-01T09:00:00.000Z',
    updatedAt: '2025-11-03T14:30:00.000Z',
  },
  {
    id: 'course-req-2',
    ownerRole: 'coordinator',
    ownerEmail: 'coordinator@gmail.com',
    coordinatorName: 'Trần Thị Bình',
    coordinatorEmail: 'coordinator@gmail.com',
    courseName: 'Cloud Computing Fundamentals',
    courseCode: 'CS350',
    languages: [{ id: 'vi', name: 'Tiếng Việt' }],
    sessionTypes: [{ id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' }],
    locations: [],
    meetLink: 'https://meet.google.com/abc-xyz-123',
    timeSlots: [{ id: 'slot-2', date: '2025-11-20', time: '14:00' }],
    description: 'Giới thiệu về điện toán đám mây và triển khai ứng dụng.',
    status: 'Pending',
    reasons: 'Chờ phê duyệt từ ban giám hiệu.',
    createdAt: '2025-11-10T11:20:00.000Z',
  },
];

let writeQueue = Promise.resolve();

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

const ensureDataDirectory = () => mkdir(DATA_DIRECTORY, { recursive: true });

const collectionConfig = {
  sessions: { file: SESSIONS_FILE, seed: INITIAL_SESSIONS },
  registrations: { file: REGISTRATIONS_FILE, seed: INITIAL_REGISTRATIONS },
  courseRequests: { file: COURSE_REQUESTS_FILE, seed: INITIAL_COURSE_REQUESTS },
};

async function readCollection(name) {
  const config = collectionConfig[name];
  if (!config) throw new Error(`Unknown backend collection: ${name}`);
  await ensureDataDirectory();

  try {
    const raw = await readFile(config.file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : clone(config.seed);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await saveCollection(name, config.seed);
    return clone(config.seed);
  }
}

function saveCollection(name, records) {
  const config = collectionConfig[name];
  if (!config) throw new Error(`Unknown backend collection: ${name}`);
  writeQueue = writeQueue.then(async () => {
    await ensureDataDirectory();
    await writeFile(config.file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  });
  return writeQueue;
}

async function readSubmissions() {
  await ensureDataDirectory();

  try {
    const raw = await readFile(SUBMISSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : clone(INITIAL_SUBMISSIONS);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await saveSubmissions(INITIAL_SUBMISSIONS);
    return clone(INITIAL_SUBMISSIONS);
  }
}

function saveSubmissions(records) {
  writeQueue = writeQueue.then(async () => {
    await ensureDataDirectory();
    await writeFile(SUBMISSIONS_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  });
  return writeQueue;
}

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

const readRequestBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const apiError = (status, code, message) =>
  Object.assign(new Error(message), { status, code });

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
};

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const parts = requestUrl.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'spm-backend-driver' });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
    const body = await readRequestBody(request);
    const user = USERS.find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );

    if (!user) throw apiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng!');

    sendJson(response, 200, {
      accessToken: `local-backend-token-${user.role}-${Date.now()}`,
      user: createUser(user),
      role: user.role,
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/courses') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const items = Array.from({ length: 12 }, (_, index) => getCourse(String(index + 1)));
    sendJson(response, 200, toListResponse(items, viewerRole, requestUrl.searchParams.get('viewerEmail'), 'course'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'detail' && request.method === 'GET') {
    const course = getCourse(parts[2]);
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    sendJson(response, 200, {
      course: toResource(course, viewerRole, requestUrl.searchParams.get('viewerEmail'), 'course'),
      detail: getCourseDetail(course, viewerRole),
    });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'courses' && parts[3] === 'submissions' && request.method === 'GET') {
    const course = getCourse(parts[2]);
    const detail = getCourseDetail(course);
    const assignments = getAssignment(detail, requestUrl.searchParams.get('assignmentId'));

    if (assignments.length === 0) {
      throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy bài tập trong khóa học ${course.id}.`);
    }

    const viewerRole = requestUrl.searchParams.get('viewerRole') === 'tutor' ? 'tutor' : 'student';
    let records = await readSubmissions();
    let changed = false;
    const items = [];

    for (const assignment of assignments) {
      let assignmentRecords = records.filter(
        (record) => record.courseId === course.id && record.assignmentId === assignment.id,
      );

      if (assignmentRecords.length === 0) {
        assignmentRecords = createCourseSubmissionRecords(course, assignment.id);
        records = [...records, ...assignmentRecords];
        changed = true;
      }

      items.push(...assignmentRecords.map((record) => toSubmissionView(record, assignment, viewerRole)));
    }

    if (changed) await saveSubmissions(records);

    if (viewerRole === 'student') {
      const studentId = requestUrl.searchParams.get('studentId');
      const studentEmail = requestUrl.searchParams.get('studentEmail');
      const matched = items.filter(
        (item) =>
          (studentId && item.student.id === studentId) ||
          (studentEmail && item.student.email === studentEmail),
      );
      if (studentId || studentEmail) items.splice(0, items.length, ...(matched.length > 0 ? matched : items.slice(0, 1)));
    }

    sendJson(response, 200, {
      items,
      viewerRole,
      permissions: {
        canView: true,
        canEdit: viewerRole === 'tutor',
        canCreate: viewerRole === 'student',
      },
      meta: {
        source: 'local-backend',
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
    const viewerRole = body.viewerRole === 'tutor' ? 'tutor' : 'student';
    const updated = { ...current };

    if (viewerRole === 'tutor') {
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

    const course = getCourse(updated.courseId);
    const assignment = getAssignment(getCourseDetail(course), updated.assignmentId)[0];
    if (!assignment) throw apiError(404, 'ASSIGNMENT_NOT_FOUND', `Không tìm thấy assignment ${updated.assignmentId}.`);

    sendJson(response, 200, { item: toSubmissionView(updated, assignment, viewerRole) });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && request.method === 'GET') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const viewerEmail = requestUrl.searchParams.get('viewerEmail');
    const courseId = requestUrl.searchParams.get('courseId');
    const records = await readCollection('sessions');
    const items = courseId ? records.filter((record) => record.courseId === courseId) : records;
    sendJson(response, 200, toListResponse(items, viewerRole, viewerEmail, 'session'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    const viewerRole = normalizeRole(body.viewerRole);
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `session-${Date.now()}`,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
      ownerRole: body.item?.ownerRole ?? viewerRole,
      ownerEmail: body.item?.ownerEmail ?? body.viewerEmail ?? undefined,
    };
    const records = await readCollection('sessions');
    records.push(item);
    await saveCollection('sessions', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, body.viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);

    const viewerRole = normalizeRole(body.viewerRole);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa session này.');

    const updated = { ...current, ...clone(body.patch ?? {}), updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('sessions', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, body.viewerEmail, 'session') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('sessions');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'SESSION_NOT_FOUND', `Không tìm thấy session ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole: body.viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa session này.');
    await saveCollection('sessions', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && request.method === 'GET') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const viewerEmail = requestUrl.searchParams.get('viewerEmail');
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
    const viewerRole = normalizeRole(body.viewerRole);
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `registration-${Date.now()}`,
      registrationType: body.registrationType ?? viewerRole,
      ownerRole: body.item?.ownerRole ?? viewerRole,
      ownerEmail: body.item?.ownerEmail ?? body.item?.Email ?? body.viewerEmail ?? undefined,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('registrations');
    records.push(item);
    await saveCollection('registrations', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, body.viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('registrations');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
    const viewerRole = normalizeRole(body.viewerRole);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa registration này.');
    const updated = { ...current, ...clone(body.patch ?? {}), updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('registrations', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, body.viewerEmail, 'registration') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'registrations' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('registrations');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'REGISTRATION_NOT_FOUND', `Không tìm thấy registration ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole: body.viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa registration này.');
    await saveCollection('registrations', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && request.method === 'GET') {
    const viewerRole = normalizeRole(requestUrl.searchParams.get('viewerRole'));
    const viewerEmail = requestUrl.searchParams.get('viewerEmail');
    const records = await readCollection('courseRequests');
    sendJson(response, 200, toListResponse(records, viewerRole, viewerEmail, 'courseRequest'));
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && !parts[2] && request.method === 'POST') {
    const body = await readRequestBody(request);
    const viewerRole = normalizeRole(body.viewerRole);
    const item = {
      ...clone(body.item ?? {}),
      id: body.item?.id ?? `course-request-${Date.now()}`,
      ownerRole: body.item?.ownerRole ?? viewerRole,
      ownerEmail: body.item?.ownerEmail ?? body.item?.coordinatorEmail ?? body.viewerEmail ?? undefined,
      createdAt: body.item?.createdAt ?? new Date().toISOString(),
    };
    const records = await readCollection('courseRequests');
    records.push(item);
    await saveCollection('courseRequests', records);
    sendJson(response, 201, { item: toResource(item, viewerRole, body.viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'PATCH') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const index = records.findIndex((record) => record.id === parts[2]);
    if (index < 0) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const viewerRole = normalizeRole(body.viewerRole);
    const current = records[index];
    const permissions = getResourcePermissions({
      viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canEdit) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa yêu cầu này.');
    const updated = { ...current, ...clone(body.patch ?? {}), updatedAt: new Date().toISOString() };
    records[index] = updated;
    await saveCollection('courseRequests', records);
    sendJson(response, 200, { item: toResource(updated, viewerRole, body.viewerEmail, 'courseRequest') });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'course-requests' && parts[2] && request.method === 'DELETE') {
    const body = await readRequestBody(request);
    const records = await readCollection('courseRequests');
    const current = records.find((record) => record.id === parts[2]);
    if (!current) throw apiError(404, 'COURSE_REQUEST_NOT_FOUND', `Không tìm thấy course request ${parts[2]}.`);
    const permissions = getResourcePermissions({
      viewerRole: body.viewerRole,
      ownerRole: current.ownerRole,
      ownerEmail: current.ownerEmail,
      viewerEmail: body.viewerEmail,
    });
    if (!permissions.canDelete) throw apiError(403, 'FORBIDDEN', 'Bạn không có quyền xóa yêu cầu này.');
    await saveCollection('courseRequests', records.filter((record) => record.id !== parts[2]));
    sendJson(response, 200, { deleted: true });
    return;
  }

  throw apiError(404, 'NOT_FOUND', 'Không tìm thấy API endpoint.');
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    const status = Number(error?.status) || 500;
    sendJson(response, status, {
      code: error?.code ?? 'BACKEND_ERROR',
      message: error?.message ?? 'Backend driver error.',
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SPM backend driver listening at http://localhost:${PORT}`);
  console.log(`Persistent submission data: ${SUBMISSIONS_FILE}`);
});
