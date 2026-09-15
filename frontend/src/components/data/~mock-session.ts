import { backendDriver, getCurrentViewerContext } from '@/services/backend-driver';
import { createBackendDataDriver } from '@/services/json-data-driver';

import { mockCourses } from './~mock-courses';
import { getRandomMembers } from './~mock-names';

export type SessionMember = { id: number; name: string; present: boolean };

export type Session = {
  id: string;
  ownerRole?: 'student' | 'tutor' | 'coordinator' | 'chairman';
  ownerEmail?: string;
  instructorEmail?: string;
  courseId: string;
  courseTitle: string;
  title: string;
  desc?: string;
  tutorNote?: string; // link to tutor's notes
  instructor: string;
  method: 'offline' | 'online';
  link?: string;
  location?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  members: SessionMember[];
  studentNames?: string[];
  declineReason?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  requestType?: 'makeup' | 'new' | 'absent';
  createdAt: string;
};

export function getSessionMember (sessionId: string, memberId: number): SessionMember | undefined {
  const session = sessionDriver.getById(sessionId);
  return session?.members.find(m => m.id === memberId);
}

// A few deterministic-ish helper values to vary sessions
const now = new Date('2025-12-01T08:00:00.000Z');
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60_000);
const toISO = (d: Date) => d.toISOString();

// Return a random status for a session. Weighted so most are scheduled.
function randomStatus(): Session['status'] {
  const r = Math.random()
  if (r < 0.6) return 'scheduled'
  if (r < 0.9) return 'completed'
  return 'cancelled'
}

// When a session is cancelled, provide a short 1-2 line reason for the decline.
function randomDeclineReason(): string {
  const reasons = [
    'Giảng viên bận đột xuất. Buổi học bị huỷ.',
    'Phòng học được sử dụng cho sự kiện khác. Buổi học tạm hoãn.',
    'Số lượng học viên không đủ, buổi học được dời.',
    'Vấn đề kỹ thuật với hệ thống trực tuyến, buổi học hoãn lại.'
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}

// Build some sample sessions using courses and names
export const mockSessions: Session[] = [
  {
    id: 's-1',
    courseId: mockCourses[0].id,
    courseTitle: mockCourses[0].title,
    tutorNote: 'https://docs.example.com/tutor-notes/session-1',
    title: `${mockCourses[0].title} - Buổi 1`,
    desc: 'Orient and setup. Giới thiệu syllabus và môi trường học tập.',
    instructor: mockCourses[0].instructor,
    method: 'online',
    link: 'https://meet.example.com/abc-123',
    start: toISO(new Date('2025-12-17T09:00:00')),
    end: toISO(new Date('2025-12-17T10:00:00')),
    members: getRandomMembers(8),
    requestType: 'new',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -10)),
  },
  {
    id: 's-2',
    courseId: mockCourses[1].id,
    courseTitle: mockCourses[1].title,
    title: `${mockCourses[1].title} - Lab`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-2',
    desc: 'Bài lab: Thiết kế schema và queries cơ bản',
    instructor: mockCourses[1].instructor,
    method: 'offline',
    location: 'Phòng A-101',
    start: toISO(new Date('2025-12-17T13:00:00')),
    end: toISO(new Date('2025-12-17T15:00:00')),
    members: getRandomMembers(6),
    requestType: 'makeup',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -8)),
  },
  {
    id: 's-3',
    courseId: mockCourses[2].id,
    courseTitle: mockCourses[2].title,
    title: `${mockCourses[2].title} - Tổng hợp`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-3',
    desc: 'Tổng hợp chương 1-3 và Q&A',
    instructor: mockCourses[2].instructor,
    method: 'online',
    link: 'https://meet.example.com/xyz-789',
    start: toISO(new Date('2025-12-18T10:00:00')),
    end: toISO(new Date('2025-12-18T11:30:00')),
    members: getRandomMembers(10),
    requestType: 'new',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -7)),
  },
  {
    id: 's-4',
    courseId: mockCourses[3].id,
    courseTitle: mockCourses[3].title,
    title: `${mockCourses[3].title} - Bài tập về nhà`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-4',
    desc: 'Nộp bài tập về nhà và chấm điểm sơ bộ',
    instructor: mockCourses[3].instructor,
    method: 'online',
    link: 'https://meet.example.com/homework-1',
    start: toISO(new Date('2025-12-20T14:00:00')),
    end: toISO(new Date('2025-12-20T15:00:00')),
    members: getRandomMembers(8),
    requestType: 'new',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -5)),
  },
  {
    id: 's-5',
    courseId: mockCourses[4].id,
    courseTitle: mockCourses[4].title,
    title: `${mockCourses[4].title} - Kiểm tra giữa kỳ`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-5',
    desc: 'Midterm test; phòng thi được phân bổ',
    instructor: mockCourses[4].instructor,
    method: 'online',
    location: 'Hội trường 2',
    start: toISO(new Date('2025-12-22T08:00:00')),
    end: toISO(new Date('2025-12-22T10:00:00')),
    members: getRandomMembers(12),
    requestType: 'makeup',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -3)),
  },
  // Additional sessions requested for days 11 and 13
  {
    id: 's-7',
    courseId: mockCourses[5].id,
    courseTitle: mockCourses[5].title,
    tutorNote: 'https://docs.example.com/tutor-notes/session-7',
    title: `${mockCourses[5].title} - Buổi bổ sung`,
    desc: 'Buổi bổ sung: ôn tập và giải đáp',
    instructor: mockCourses[5].instructor,
    method: 'online',
    link: 'https://meet.example.com/s7',
    start: toISO(new Date('2025-11-11T09:00:00')),
    end: toISO(new Date('2025-11-11T11:00:00')),
    members: getRandomMembers(8),
    requestType: 'makeup',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -6)),
  },
  {
    id: 's-8',
    courseId: mockCourses[6].id,
    courseTitle: mockCourses[6].title,
    title: `${mockCourses[6].title} - Lab mở rộng`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-8',
    desc: 'Lab mở rộng dành cho các nhóm muốn ôn tập thêm',
    instructor: mockCourses[6].instructor,
    method: 'online',
    location: 'Phòng Lab B',
    start: toISO(new Date('2025-12-11T14:00:00')),
    end: toISO(new Date('2025-12-11T16:00:00')),
    members: getRandomMembers(6),
    requestType: 'new',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -5)),
  },
  {
    id: 's-9',
    courseId: mockCourses[7].id,
    courseTitle: mockCourses[7].title,
    title: `${mockCourses[7].title} - Hợp nhất nội dung`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-9',
    desc: 'Tổng hợp nội dung chính dành cho buổi học',
    instructor: mockCourses[7].instructor,
    method: 'online',
    link: 'https://meet.example.com/s9',
    start: toISO(new Date('2025-12-13T10:00:00')),
    end: toISO(new Date('2025-12-13T12:00:00')),
    members: getRandomMembers(10),
    requestType: 'new',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -4)),
  },
  // Completed session example
  {
    id: 's-6',
    courseId: mockCourses[0].id,
    courseTitle: mockCourses[0].title,
    title: `${mockCourses[0].title} - Buổi thử nghiệm`,
    tutorNote: 'https://docs.example.com/tutor-notes/session-6',
    desc: 'Buổi thử nghiệm đã hoàn tất',
    instructor: mockCourses[0].instructor,
    method: 'online',
    link: 'https://meet.example.com/done-1',
    start: toISO(new Date('2025-11-20T09:00:00')),
    end: toISO(new Date('2025-11-20T10:00:00')),
    members: getRandomMembers(7),
    requestType: 'makeup',
    ...(() => {
      const s = randomStatus()
      return { status: s, declineReason: s === 'cancelled' ? randomDeclineReason() : undefined }
    })(),
    createdAt: toISO(addDays(now, -40)),
  },
];

// Populate studentNames for convenience so UI can render name lists easily
mockSessions.forEach((s) => {
  s.studentNames = s.members?.map((m) => m.name) ?? []
})

/** Backend driver replacing direct mutations of mockSessions. */
export const sessionDriver = createBackendDataDriver(mockSessions, {
  list: async () => (await backendDriver.getSessions(getCurrentViewerContext())).data.items,
  create: async (record) => (await backendDriver.createSession({
    ...getCurrentViewerContext(),
    item: { ...record, ownerRole: 'tutor', ownerEmail: record.instructorEmail },
  })).data.item,
  update: async (id, patch) => (await backendDriver.updateSession({
    ...getCurrentViewerContext(),
    sessionId: id,
    patch,
  })).data.item,
  remove: async (id) => (await backendDriver.deleteSession(id, getCurrentViewerContext())).data.deleted,
});

export function getMockSessions(count?: number) {
  const sessions = sessionDriver.list();
  if (!count) return sessions;
  return sessions.slice(0, count);
}

export function getSessionById(id: string) {
  return sessionDriver.getById(id);
}

export default mockSessions;

// Update a session by id with a partial patch. Returns the updated session or undefined if not found.
export function updateSession(id: string, patch: Partial<Session>): Session | undefined {
  const current = sessionDriver.getById(id)
  if (!current) return undefined
  const updated: Session = { ...current, ...patch }
  // Ensure studentNames stay in sync when members changed
  if (patch.members) {
    updated.studentNames = patch.members.map((m) => m.name)
  } else {
    updated.studentNames = updated.members?.map((m) => m.name) ?? []
  }
  return sessionDriver.upsert(updated)
}

// Save a full session: if id exists replace, otherwise push new session with generated id
export function saveSession(session: Session): Session {
  const copy = { ...session, studentNames: session.members?.map((m) => m.name) ?? [] }
  return sessionDriver.upsert(copy)
}

/**
 * Create a session from a request form and persist it to mockSessions.
 * This is a convenience for the "request new session" page in dev.
 * Auto-generates start/end times based on current date + 7 days (default 2-hour session).
 */
export function createRequestSession(request: Partial<Session> & { 
  courseId: string; 
  title: string; 
  requestType?: 'makeup' | 'new' | 'absent';
  start?: string; 
  end?: string;
}) {
  // generate a compact id based on timestamp
  const id = `s-${Date.now().toString(36)}`
  
  // Auto-generate reasonable start/end if not provided
  const defaultStart = request.start ?? new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
  const defaultEnd = request.end ?? new Date(new Date(defaultStart).getTime() + 2 * 60 * 60_000).toISOString()
  
  const newSession: Session = {
    id,
    courseId: request.courseId,
    courseTitle: request.courseTitle ?? 'Unknown Course',
    title: request.title,
    desc: request.desc ?? '',
    instructor: request.instructor ?? 'TBD',
    method: request.method ?? 'offline',
    link: request.link,
    location: request.location,
    start: defaultStart,
    end: defaultEnd,
    members: request.members ?? getRandomMembers(8),
    status: request.status ?? 'scheduled',
    requestType: request.requestType,
    createdAt: new Date().toISOString(),
  }

  return saveSession(newSession)
}

/**
 * Delete a session by ID from mockSessions array.
 * Returns true if session was found and deleted, false otherwise.
 */
export function deleteSession(id: string): boolean {
  return sessionDriver.remove(id)
}
