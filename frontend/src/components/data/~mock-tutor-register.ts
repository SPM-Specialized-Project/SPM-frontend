import { api } from '@/services/api-client';
import { createRemoteDataStore } from '@/services/data-store';
import { getCurrentViewerContext } from '@/services/viewer-context';

import { mockCourses } from './~mock-courses';
import { mockLanguages, mockLocations , PastRegistration} from './~mock-register';



// --- Helpers ---
// Lấy tên các giảng viên từ mockCourses để làm gia sư
const Names = [
  ...new Set(mockCourses.map(c => c.instructor)),
].slice(0, 3); // Lấy 3 giảng viên đầu tiên

// Tạo email giả
const createFakeEmail = (name: string): string => {
  const noDiacritics = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const emailPrefix = noDiacritics.replace(/\s+/g, '.');
  return `${emailPrefix}@tutor.example.com`;
};

// Chuyển đổi courses thành định dạng dropdown
const courseOptions = mockCourses.map(c => ({ 
  id: c.id, 
  name: `${c.title} (${c.code})` 
}));

// Tùy chọn loại hình
const sessionTypeOptions = [
  { id: 'online', name: 'Học trực tiếp' },
  { id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' },
];

// --- Dữ liệu Mock ---

export const mockTutorRegistrations: PastRegistration[] = [
  {
    id: 'tutor-reg-1',
    Name: Names[0], // Nguyễn Lê Duy Lai
    Email: createFakeEmail(Names[0]),
    subjects: [courseOptions[0], courseOptions[10]], // Computer Network, Networks II
    languages: [mockLanguages[0], mockLanguages[1]], // Vietnamese, English
    sessionTypes: [sessionTypeOptions[0], sessionTypeOptions[1]], // Cả hai
    locations: [mockLocations[0], mockLocations[11]], // Phường 1, Phường 2
    specialRequest: 'Tôi có kinh nghiệm dạy chuyên sâu về TCP/IP và định tuyến. Có thể dạy cả hybrid và online.',
    status: 'Approved',
    createdAt: '2025-10-28T09:00:00Z',
  },
  {
    id: 'tutor-reg-2',
    Name: Names[1], // Nguyễn Thị Ái Thảo
    Email: createFakeEmail(Names[1]),
    subjects: [courseOptions[1], courseOptions[11]], // Database System, Database II
    languages: [mockLanguages[0]], // Vietnamese
    sessionTypes: [sessionTypeOptions[1]], // Chỉ hybrid
    locations: [mockLocations[2]], // Phường 3
    specialRequest: 'Chuyên dạy về SQL, tối ưu hóa truy vấn và NoSQL. Chỉ nhận dạy hybrid vào buổi tối.',
    status: 'Pending',
    createdAt: '2025-11-10T11:20:00Z',
  },
  {
    id: 'tutor-reg-3',
    Name: Names[2], // Ngô Thị Vân
    Email: createFakeEmail(Names[2]),
    subjects: [courseOptions[2]], // Operating System
    languages: [mockLanguages[1], mockLanguages[0]], // English
    sessionTypes: [sessionTypeOptions[0], sessionTypeOptions[1]], // Chỉ online
    locations: [mockLocations[0], mockLocations[2], mockLocations[3]], // P1, P3, P4
    specialRequest: 'Kinh nghiệm dạy OS, tập trung vào process scheduling và memory management. Chỉ dạy online.',
    status: 'Approved',
    createdAt: '2025-11-05T16:05:00Z',
  },
];

/** API-backed store for tutor registrations. */
export const tutorRegistrationStore = createRemoteDataStore(
  mockTutorRegistrations,
  {
    list: async () => (await api.getRegistrations({ ...getCurrentViewerContext(), registrationType: 'tutor' })).data.items,
    create: async (record) => (await api.createRegistration({
      ...getCurrentViewerContext(),
      registrationType: 'tutor',
      item: { ...record, ownerRole: 'tutor', ownerEmail: record.Email },
    })).data.item,
    update: async (id, patch) => (await api.updateRegistration({
      ...getCurrentViewerContext(),
      registrationType: 'tutor',
      registrationId: id,
      patch,
    })).data.item,
    remove: async (id) => (await api.deleteRegistration(id, getCurrentViewerContext())).data.deleted,
  },
);

export function deleteTutorRegistration(id: string): boolean {
  return tutorRegistrationStore.remove(id);
}
