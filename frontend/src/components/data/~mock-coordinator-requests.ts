import { backendDriver, getCurrentViewerContext } from '@/services/backend-driver';
import { createBackendDataDriver } from '@/services/json-data-driver';

import { mockLanguages, mockLocations } from './~mock-register';

// --- Định nghĩa Type ---

// Kiểu dữ liệu cho các tùy chọn dropdown
type DropdownOption = {
  id: string;
  name: string;
};

// Kiểu dữ liệu cho một yêu cầu tạo môn học của COORDINATOR
export type CourseCreationRequest = {
  id: string;
  ownerRole?: 'student' | 'tutor' | 'coordinator' | 'chairman';
  ownerEmail?: string;
  coordinatorName: string;
  coordinatorEmail: string;
  courseName: string; // Tên môn học mới
  courseCode: string; // Mã môn học (auto-generated hoặc nhập tay)
  languages: DropdownOption[]; // Danh sách ngôn ngữ giảng dạy
  sessionTypes: DropdownOption[]; // 'hybrid' | 'online'
  locations: DropdownOption[]; // Danh sách địa điểm
  meetLink?: string; // Optional meet link for hybrid sessions
  timeSlots?: Array<{id: string; date: string; time: string}>; // Khung giờ dạy đã thêm
  description: string; // Mô tả môn học
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string; // ISO date string
  reasons: string; // Lý do phê duyệt hoặc từ chối
  updatedAt?: string; // ISO date string
};

// Tùy chọn loại hình
const sessionTypeOptions = [
  { id: 'online', name: 'Học trực tiếp' },
  { id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' },
];

// --- Dữ liệu Mock ---

export const mockCourseCreationRequests: CourseCreationRequest[] = [
  {
    id: 'course-req-1',
    coordinatorName: 'Nguyễn Văn An',
    coordinatorEmail: 'nguyen.van.an@coordinator.example.com',
    courseName: 'Advanced Machine Learning',
    courseCode: 'CS401',
    languages: [mockLanguages[0], mockLanguages[1]], // Vietnamese, English
    sessionTypes: [sessionTypeOptions[0], sessionTypeOptions[1]], 
    locations: [mockLocations[0], mockLocations[1]], // Phường 1, Phường 2
    timeSlots: [
      { id: 'slot-1', date: '2025-11-15', time: '08:00' },
      { id: 'slot-2', date: '2025-11-17', time: '10:00' },
    ],
    description: 'Khóa học chuyên sâu về Machine Learning, tập trung vào Deep Learning, Neural Networks và ứng dụng thực tế.',
    status: 'Approved',
    reasons: 'Nội dung khóa học rất phù hợp với xu hướng công nghệ hiện nay và có tiềm năng ứng dụng cao trong thực tế.',
    createdAt: '2025-11-01T09:00:00Z',
    updatedAt: '2025-11-03T14:30:00Z',
  },
  {
    id: 'course-req-2',
    coordinatorName: 'Trần Thị Bình',
    coordinatorEmail: 'tran.thi.binh@coordinator.example.com',
    courseName: 'Cloud Computing Fundamentals',
    courseCode: 'CS350',
    languages: [mockLanguages[0]], // Vietnamese
    sessionTypes: [sessionTypeOptions[1]], 
    locations: [],
    meetLink: 'https://meet.google.com/abc-xyz-123',
    timeSlots: [
      { id: 'slot-3', date: '2025-11-20', time: '14:00' },
      { id: 'slot-4', date: '2025-11-22', time: '14:00' },
    ],
    description: 'Giới thiệu về điện toán đám mây, các dịch vụ AWS, Azure, Google Cloud và triển khai ứng dụng trên cloud.',
    status: 'Pending',
    reasons: 'Chờ phê duyệt từ ban giám hiệu.',
    createdAt: '2025-11-10T11:20:00Z',
  },
  {
    id: 'course-req-3',
    coordinatorName: 'Lê Minh Cường',
    coordinatorEmail: 'le.minh.cuong@coordinator.example.com',
    courseName: 'Blockchain & Cryptocurrency',
    courseCode: 'CS425',
    languages: [mockLanguages[1]], // English
    sessionTypes: [sessionTypeOptions[0]], // Chỉ online
    locations: [mockLocations[2], mockLocations[3], mockLocations[4]], // P3, P4, P5
    timeSlots: [
      { id: 'slot-5', date: '2025-11-18', time: '09:00' },
      { id: 'slot-6', date: '2025-11-19', time: '09:00' },
      { id: 'slot-7', date: '2025-11-21', time: '13:00' },
    ],
    description: 'Khóa học về công nghệ Blockchain, smart contracts, DeFi và các ứng dụng cryptocurrency.',
    status: 'Approved',
    reasons: 'Nội dung khóa học rất phù hợp với xu hướng công nghệ hiện nay và có tiềm năng ứng dụng cao trong thực tế.',
    createdAt: '2025-11-05T16:05:00Z',
    updatedAt: '2025-11-07T10:15:00Z',
  },
  {
    id: 'course-req-4',
    coordinatorName: 'Phạm Thu Hà',
    coordinatorEmail: 'pham.thu.ha@coordinator.example.com',
    courseName: 'Mobile App Development with React Native',
    courseCode: 'CS380',
    languages: [mockLanguages[0], mockLanguages[1]], // Vietnamese, English
    sessionTypes: [sessionTypeOptions[1]], // hybrid
    locations: [],
    meetLink: 'https://zoom.us/j/123456789',
    timeSlots: [
      { id: 'slot-8', date: '2025-11-25', time: '18:00' },
      { id: 'slot-9', date: '2025-11-27', time: '18:00' },
    ],
    description: 'Học xây dựng ứng dụng mobile đa nền tảng với React Native, từ cơ bản đến nâng cao.',
    status: 'Rejected',
    reasons: 'Nội dung khóa học chưa phù hợp với định hướng chương trình đào tạo hiện tại.',
    createdAt: '2025-11-08T13:45:00Z',
    updatedAt: '2025-11-09T09:20:00Z',
  },
];

/** Backend driver for course creation requests. */
export const courseCreationRequestDriver = createBackendDataDriver(
  mockCourseCreationRequests,
  {
    list: async () => (await backendDriver.getCourseCreationRequests(getCurrentViewerContext())).data.items,
    create: async (record) => (await backendDriver.createCourseCreationRequest({
      ...getCurrentViewerContext(),
      item: { ...record, ownerRole: 'coordinator', ownerEmail: record.coordinatorEmail },
    })).data.item,
    update: async (id, patch) => (await backendDriver.updateCourseCreationRequest({
      ...getCurrentViewerContext(),
      requestId: id,
      patch,
    })).data.item,
    remove: async (id) => (await backendDriver.deleteCourseCreationRequest(id, getCurrentViewerContext())).data.deleted,
  },
);
