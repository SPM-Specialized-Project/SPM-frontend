import { backendDriver, getCurrentViewerContext } from '@/services/backend-driver';
import { createBackendDataDriver } from '@/services/json-data-driver';

import { mockCourses } from './~mock-courses';
import { NAMES_POOL } from './~mock-names';

export const mockLanguages = [
  { id: 'vi', name: 'Tiếng Việt' },
  { id: 'en', name: 'English' },
  { id: 'cn', name: '简体中文' },
  { id: 'th', name: 'ภาษาไทย' },
];

/**
 * Danh sách địa điểm (phường) cho dropdown
 */
export const mockLocations = [
  { id: 'p1', name: 'Phường 1' },
  { id: 'p2', name: 'Phường 2' },
  { id: 'p3', name: 'Phường 3' },
  { id: 'p4', name: 'Phường 4' },
];
// --- Định nghĩa Type ---

// Kiểu dữ liệu cho các tùy chọn dropdown
export type DropdownOption = {
  id: string;
  name: string;
};

// Kiểu dữ liệu cho một đơn đăng ký của GIA SƯ
export type PastRegistration = {
  id: string;
  ownerRole?: 'student' | 'tutor' | 'coordinator' | 'chairman';
  ownerEmail?: string;
  Name: string;
  Email: string;
  subjects: DropdownOption[]; // Danh sách các môn học (từ mockCourses)
  languages: DropdownOption[]; // Danh sách ngôn ngữ
  sessionTypes: DropdownOption[]; // 'hybrid' | 'online'
  locations: DropdownOption[]; // Danh sách địa điểm
  meetLink?: string; // Optional meet link for hybrid sessions
  specialRequest: string;
  declineReason?: string;
  status: 'Pending' | 'Approved' | 'Declined';
  createdAt: string; // ISO date string
};

// --- Helpers ---

// Tạo email giả từ tên
const createFakeEmail = (name: string): string => {
  const noDiacritics = name
    .toLowerCase()
    .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const emailPrefix = noDiacritics.replace(/\s+/g, '.');
  return `${emailPrefix}@gmail.com`;
};

// Chuyển đổi courses thành định dạng dropdown
const courseOptions = mockCourses.map(c => ({
  id: c.id,
  name: `${c.title} (${c.code})`
}));

// Tùy chọn loại hình
const sessionTypeOptions = [
  { id: 'offline', name: 'Học trực tiếp' },
  { id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' },
];

// --- Dữ liệu Mock ---

export const mockPastRegistrations: PastRegistration[] = [
  {
    id: 'reg-1',
    Name: NAMES_POOL[0].name,
    Email: createFakeEmail(NAMES_POOL[0].name),
    subjects: [courseOptions[2]],
    languages: [mockLanguages[0]],
    sessionTypes: [sessionTypeOptions[1]],
    locations: [mockLocations[0]],
    specialRequest: 'Em muốn học sâu về phần quản lý bộ nhớ và virtual memory. Em chỉ rảnh vào cuối tuần.',
    status: 'Approved',
    createdAt: '2025-11-01T10:00:00Z',
  },
  {
    id: 'reg-2',
    Name: NAMES_POOL[1].name,
    Email: createFakeEmail(NAMES_POOL[1].name),
    subjects: [courseOptions[0]],
    languages: [mockLanguages[1]],
    sessionTypes: [sessionTypeOptions[0]],
    locations: [mockLocations[2]],
    specialRequest: 'I need help with subnetting and routing protocols. My availability is flexible.',
    status: 'Pending',
    createdAt: '2025-11-05T14:30:00Z',
  },
  {
    id: 'reg-3',
    Name: NAMES_POOL[2].name,
    Email: createFakeEmail(NAMES_POOL[2].name),
    subjects: [courseOptions[4]],
    languages: [mockLanguages[0]],
    sessionTypes: [sessionTypeOptions[1]],
    locations: [mockLocations[1]],
    specialRequest: 'Em bị mất gốc thuật toán. Em cần học lại từ đầu, đặc biệt là Big O và các thuật toán sắp xếp.',
    status: 'Declined',
    declineReason: 'Yêu cầu của bạn quá rộng. Chương trình tutor chỉ hỗ trợ giải đáp thắc mắc hoặc ôn tập cho các chủ đề cụ thể, không phải dạy lại từ đầu. Vui lòng đăng ký lại với yêu cầu cụ thể hơn.',
    createdAt: '2025-11-02T09:15:00Z',
  }
  ,
  {
    id: 'reg-4',
    Name: 'Student',
    Email: createFakeEmail(NAMES_POOL[3].name),
    subjects: [courseOptions[1]],
    languages: [mockLanguages[1]],
    sessionTypes: [sessionTypeOptions[1]],
    locations: [],
    // hybrid registration; omit explicit location so code can default to hybrid when needed
    specialRequest: 'Muốn luyện kỹ năng giải đề và chấm bài mẫu trước kỳ thi cuối khoá.',
    status: 'Pending',
    createdAt: '2025-11-11T12:00:00Z',
  }
];

/** Backend driver replacing direct writes to mockPastRegistrations. */
export const pastRegistrationDriver = createBackendDataDriver(
  mockPastRegistrations,
  {
    list: async () => (await backendDriver.getRegistrations({ ...getCurrentViewerContext(), registrationType: 'student' })).data.items,
    create: async (record) => (await backendDriver.createRegistration({
      ...getCurrentViewerContext(),
      registrationType: 'student',
      item: { ...record, ownerRole: 'student', ownerEmail: record.Email },
    })).data.item,
    update: async (id, patch) => (await backendDriver.updateRegistration({
      ...getCurrentViewerContext(),
      registrationType: 'student',
      registrationId: id,
      patch,
    })).data.item,
    remove: async (id) => (await backendDriver.deleteRegistration(id, getCurrentViewerContext())).data.deleted,
  },
);

// --- Helpers to create new registrations ---
/**
 * Create and store a new PastTutorRegistration.
 * If Name/email are not provided, a random name from NAMES_POOL is used
 * and an email generated.
 */
export function createPastRegistration(input: Partial<PastRegistration> & {
  course: DropdownOption;
  language: DropdownOption;
  sessionType: DropdownOption;
  location?: DropdownOption;
  specialRequest: string;
}): PastRegistration {
  const name = input.Name ?? NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)].name;
  const email = input.Email ?? createFakeEmail(name);
  const id = `reg-${Date.now()}`;
  const record: PastRegistration = {
    id,
    Name: name,
    Email: email,
    subjects: [input.course],
    languages: [input.language],
    sessionTypes: [input.sessionType],
    locations: [input.location ?? { id: 'hybrid', name: 'hybrid' }],
    specialRequest: input.specialRequest,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  return pastRegistrationDriver.create(record);
}

export function deletePastRegistration(id: string): boolean {
  return pastRegistrationDriver.remove(id);
}
