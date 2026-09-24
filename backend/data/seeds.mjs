const USERS = [
  { email: 'student@gmail.com', password: 'student123', role: 'student', status: 'ACTIVE' },
  { email: 'student2@gmail.com', password: 'student2123', role: 'student', status: 'ACTIVE' },
  { email: 'tutor@gmail.com', password: 'tutor123', role: 'tutor', status: 'ACTIVE' },
  { email: 'coordinator@gmail.com', password: 'coordinator123', role: 'coordinator', status: 'ACTIVE' },
  { email: 'chairman@gmail.com', password: 'chairman123', role: 'chairman', status: 'ACTIVE' },
  { email: 'lecturer@gmail.com', password: 'lecturer123', role: 'lecturer', status: 'ACTIVE' },
  { email: 'lecturer2@gmail.com', password: 'lecturer2123', role: 'lecturer', status: 'ACTIVE' },
  { email: 'admin@gmail.com', password: 'admin123', role: 'admin', status: 'ACTIVE' },
  { email: 'locked@gmail.com', password: 'locked123', role: 'student', status: 'LOCKED' },
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
  '13': {
    id: '13', code: 'DSA-LAB', title: 'DSA LAB',
    instructor: 'Somebody', stats: { documents: 0, links: 0, assignments: 0 },
    numberTotalSessions: 0, sessionsOrganized: 0,
    students: [],
  },
};

const PROVISIONED_STUDENT_ACCOUNTS = [
  { id: 'student-account-1', name: 'Student User', email: 'student@gmail.com' },
  ...Object.values(COURSE_CATALOG).flatMap((course) =>
    course.students.map((student, index) => ({
      id: `${course.id}-student-${index + 1}`,
      name: student.name,
      email: student.email,
    })),
  ),
];

const createMembershipSeed = (id, classroomId, studentId, createdAt = '2025-11-01T10:00:00.000Z') => {
  const student = PROVISIONED_STUDENT_ACCOUNTS.find((account) => account.id === studentId);
  return {
    id,
    classroomId,
    studentId,
    studentName: student?.name ?? 'Unknown student',
    studentEmail: student?.email ?? '',
    status: 'ACTIVE',
    enrolledAt: createdAt,
    revokedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
};

const createRevokedMembershipSeed = (
  id,
  classroomId,
  studentId,
  createdAt = '2025-11-01T10:00:00.000Z',
  revokedAt = '2026-01-15T10:00:00.000Z',
) => ({
  ...createMembershipSeed(id, classroomId, studentId, createdAt),
  status: 'REVOKED',
  revokedAt,
  updatedAt: revokedAt,
});

const INITIAL_MEMBERSHIPS = [
  createMembershipSeed('membership-1-student-account-1', '1', 'student-account-1'),
  createMembershipSeed('membership-1-student-1', '1', '1-student-1'),
  createMembershipSeed('membership-1-student-2', '1', '1-student-2'),
  createMembershipSeed('membership-2-student-1', '2', '2-student-1'),
  createMembershipSeed('membership-2-student-2', '2', '2-student-2'),
  createMembershipSeed('membership-3-student-1', '3', '3-student-1'),
  createMembershipSeed('membership-3-student-2', '3', '3-student-2'),
  createMembershipSeed('membership-3-student-3', '3', '3-student-3'),
  createMembershipSeed('membership-4-student-1', '4', '4-student-1'),
  createMembershipSeed('membership-4-student-2', '4', '4-student-2'),
  createMembershipSeed('membership-5-student-1', '5', '5-student-1'),
  createMembershipSeed('membership-5-student-2', '5', '5-student-2'),
  createMembershipSeed('membership-6-student-1', '6', '6-student-1'),
  createMembershipSeed('membership-6-student-2', '6', '6-student-2'),
  createRevokedMembershipSeed('membership-6-student-account-1', '6', 'student-account-1'),
  createMembershipSeed('membership-7-student-1', '7', '7-student-1'),
  createMembershipSeed('membership-7-student-2', '7', '7-student-2'),
  createMembershipSeed('membership-8-student-1', '8', '8-student-1'),
  createMembershipSeed('membership-9-student-1', '9', '9-student-1'),
  createRevokedMembershipSeed('membership-9-student-2', '9', '9-student-2'),
  createMembershipSeed('membership-10-student-1', '10', '10-student-1'),
  createMembershipSeed('membership-10-student-2', '10', '10-student-2'),
  createMembershipSeed('membership-11-student-1', '11', '11-student-1'),
  createMembershipSeed('membership-11-student-2', '11', '11-student-2'),
  createMembershipSeed('membership-12-student-1', '12', '12-student-1'),
  createMembershipSeed('membership-12-student-2', '12', '12-student-2'),
];

const createClassroomOwnershipSeed = (
  id,
  classroomId,
  ownerEmail,
  assignedAt = '2025-11-01T09:00:00.000Z',
) => ({
  id,
  classroomId,
  ownerRole: 'tutor',
  ownerEmail,
  status: 'ACTIVE',
  assignedAt,
});

const INITIAL_CLASSROOM_OWNERSHIPS = [
  createClassroomOwnershipSeed('classroom-ownership-1', '1', 'tutor@gmail.com'),
  createClassroomOwnershipSeed('classroom-ownership-2', '2', 'tutor@gmail.com'),
  createClassroomOwnershipSeed('classroom-ownership-3', '3', 'tutor@gmail.com'),
];

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
    feedback: 'Bài làm đạt yêu cầu trong Node.js backend.',
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

export {
  USERS,
  COURSE_CATALOG,
  PROVISIONED_STUDENT_ACCOUNTS,
  INITIAL_MEMBERSHIPS,
  INITIAL_CLASSROOM_OWNERSHIPS,
  INITIAL_SUBMISSIONS,
  INITIAL_SESSIONS,
  INITIAL_REGISTRATIONS,
  INITIAL_COURSE_REQUESTS,
};
