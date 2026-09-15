import bgBlue from '@/assets/bg-dashboard-blue.png';
import bgGreen from '@/assets/bg-dashboard-green.png';
import bgRed from '@/assets/bg-dashboard-red.png';
import { backendDriver } from '@/services/backend-driver';
import { createBackendDataDriver } from '@/services/json-data-driver';
import type { CourseDetail } from '@/types/course-content';


export type Course = {
  id: string;
  code: string;
  title: string;
  instructor: string;
  stats: {
    documents: number;
    links: number;
    assignments: number;
  };
  bgImage: string;
  numberTotalSessions?: number;
  students: Array<{ name: string; email: string; numberOfSubmissions?: number ; numberOfJoinedSessions?: number; averageScore?: number }>;
  sessionsOrganized: number;
};

export const mockCourses: Course[] = [
  {
    id: '1',
    code: '79748_CO2013_003183_CLC',
    title: 'Computer Network',
    instructor: 'Nguyễn Lê Duy Lai',
    stats: { documents: 3, links: 2, assignments: 0 },
    bgImage: bgBlue,
    numberTotalSessions: 12,
    students: [
      { name: 'Nguyễn Văn A', email: 'nguyenvana@student.hcmut.edu.vn', numberOfSubmissions: 5, numberOfJoinedSessions: 10, averageScore: 85 },
      { name: 'Trần Thị B', email: 'tranthib@student.hcmut.edu.vn', numberOfSubmissions: 3, numberOfJoinedSessions: 8, averageScore: 90 },
      { name: 'Lê Minh C', email: 'leminhc@student.hcmut.edu.vn', numberOfSubmissions: 4, numberOfJoinedSessions: 9, averageScore: 88 },
    ],
    sessionsOrganized: 12,
  },
  {
    id: '2',
    code: '79748_CO2013_003184_CLC',
    title: 'Database System',
    instructor: 'Nguyễn Thị Ái Thảo',
    stats: { documents: 5, links: 1, assignments: 1 },
    bgImage: bgRed,
    numberTotalSessions: 15,
    students: [
      { name: 'Phạm Văn D', email: 'phamvand@student.hcmut.edu.vn', numberOfSubmissions: 6, numberOfJoinedSessions: 14, averageScore: 92 },
      { name: 'Hoàng Thị E', email: 'hoangthie@student.hcmut.edu.vn', numberOfSubmissions: 5, numberOfJoinedSessions: 13, averageScore: 87 },
    ],
    sessionsOrganized: 15,
  },
  {
    id: '3',
    code: '79748_CO2013_003185_CLC',
    title: 'Operating System',
    instructor: 'Ngô Thị Vân',
    stats: { documents: 2, links: 3, assignments: 2 },
    bgImage: bgGreen,
    numberTotalSessions: 10,
    students: [
      { name: 'Võ Văn F', email: 'vovanf@student.hcmut.edu.vn' , numberOfSubmissions: 4, numberOfJoinedSessions: 9, averageScore: 80 },
      { name: 'Đặng Thị G', email: 'dangthig@student.hcmut.edu.vn', numberOfSubmissions: 3, numberOfJoinedSessions: 8, averageScore: 75 },
      { name: 'Bùi Minh H', email: 'buiminhh@student.hcmut.edu.vn', numberOfSubmissions: 5, numberOfJoinedSessions: 10, averageScore: 95 },
      { name: 'Trịnh Văn I', email: 'trinhvani@student.hcmut.edu.vn', numberOfSubmissions: 2, numberOfJoinedSessions: 7, averageScore: 70 },
    ],
    sessionsOrganized: 10,
  },
  {
    id: '4',
    code: '79748_CO2013_003186_CLC',
    title: 'Principles of Programming Language',
    instructor: 'Nguyễn Hứa Phùng',
    stats: { documents: 4, links: 2, assignments: 1 },
    bgImage: bgBlue,
    numberTotalSessions: 18,
    students: [
      { name: 'Lý Thị K', email: 'lythik@student.hcmut.edu.vn', numberOfSubmissions: 7, numberOfJoinedSessions: 16, averageScore: 89 },
      { name: 'Phan Văn L', email: 'phanvanl@student.hcmut.edu.vn', numberOfSubmissions: 6, numberOfJoinedSessions: 15, averageScore: 84 },
      { name: 'Mai Thị M', email: 'maithim@student.hcmut.edu.vn', numberOfSubmissions: 8, numberOfJoinedSessions: 18, averageScore: 91 },
    ],
    sessionsOrganized: 18,
  },
  {
    id: '5',
    code: '79748_CO2013_003187_CLC',
    title: 'Algorithms',
    instructor: 'Nguyễn Hứa Phùng',
    stats: { documents: 6, links: 0, assignments: 3 },
    bgImage: bgRed,
    numberTotalSessions: 14,
    students: [
      { name: 'Ngô Văn N', email: 'ngovann@student.hcmut.edu.vn', numberOfSubmissions: 9, numberOfJoinedSessions: 14, averageScore: 93 },
      { name: 'Đỗ Thị O', email: 'dothio@student.hcmut.edu.vn', numberOfSubmissions: 7, numberOfJoinedSessions: 12, averageScore: 85 },
    ],
    sessionsOrganized: 14,
  },
  {
    id: '6',
    code: '79748_CO2013_003188_CLC',
    title: 'Data Structures',
    instructor: 'Ngô Thị F',
    stats: { documents: 4, links: 2, assignments: 1 },
    bgImage: bgGreen,
    numberTotalSessions: 16,
    students: [
      { name: 'Trương Văn P', email: 'truongvanp@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Lâm Thị Q', email: 'lamthiq@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Dương Văn R', email: 'duongvanr@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
    ],
    sessionsOrganized: 16,
  },
  {
    id: '7',
    code: '79748_CO2013_003189_CLC',
    title: 'Software Engineering',
    instructor: 'Trần Trương Tuấn Phát',
    stats: { documents: 5, links: 2, assignments: 2 },
    bgImage: bgBlue,
    numberTotalSessions: 20,
    students: [
      { name: 'Cao Văn S', email: 'caovans@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Hồ Thị T', email: 'hothit@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
    ],
    sessionsOrganized: 20,
  },
  {
    id: '8',
    code: '79748_CO2013_003190_CLC',
    title: 'Computer Graphics',
    instructor: 'Đặng Thị H',
    stats: { documents: 3, links: 1, assignments: 0 },
    bgImage: bgRed,
    numberTotalSessions: 8,
    students: [{ name: 'Đinh Văn U', email: 'dinhvanu@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 }],
    sessionsOrganized: 8,
  },
  {
    id: '9',
    code: '79748_CO2013_003191_CLC',
    title: 'Artificial Intelligence',
    instructor: 'Võ Văn I',
    stats: { documents: 7, links: 3, assignments: 4 },
    bgImage: bgGreen,
    numberTotalSessions: 22,
    students: [
      { name: 'Tạ Văn V', email: 'tavanv@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Ông Thị W', email: 'ongthiw@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Lưu Văn X', email: 'luuvanx@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
    ],
    sessionsOrganized: 22,
  },
  {
    id: '10',
    code: '79748_CO2013_003192_CLC',
    title: 'Operating Systems II',
    instructor: 'Trịnh Thị K',
    stats: { documents: 2, links: 0, assignments: 1 },
    bgImage: bgBlue,
    numberTotalSessions: 11,
    students: [
      { name: 'Vũ Văn Y', email: 'vuvany@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Quách Thị Z', email: 'quachthiz@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
    ],
    sessionsOrganized: 11,
  },
  {
    id: '11',
    code: '79748_CO2013_003193_CLC',
    title: 'Networks II',
    instructor: 'Phan Văn L',
    stats: { documents: 3, links: 2, assignments: 1 },
    bgImage: bgRed,
    numberTotalSessions: 13,
    students: [
      { name: 'Kiều Văn AA', email: 'kieuvana@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Từ Thị BB', email: 'tuthibb@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
    ],
    sessionsOrganized: 13,
  },
  {
    id: '12',
    code: '79748_CO2013_003194_CLC',
    title: 'Database II',
    instructor: 'Lý Thị M',
    stats: { documents: 4, links: 2, assignments: 2 },
    bgImage: bgGreen,
    numberTotalSessions: 17,
    students: [
      { name: 'Lương Văn CC', email: 'luongvancc@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Nghiêm Thị DD', email: 'nghiemthidd@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
      { name: 'Ứng Văn EE', email: 'ungvanee@student.hcmut.edu.vn', numberOfSubmissions: 0, numberOfJoinedSessions: 0, averageScore: 0 },
    ],
    sessionsOrganized: 17,
  },
];

/** Backend-backed course catalogue driver. The local list is only the first paint fallback. */
export const courseDriver = createBackendDataDriver(mockCourses, {
  list: async () => (await backendDriver.getCourses({ viewerRole: 'coordinator' })).data.items,
});
export type DataCourses = CourseDetail;

export const dataCourses: DataCourses[] = [
  {
    id: '4',
    code: '79748_CO2013_003186_CLC',
    title: 'Principles of Programming Language',
    instructor: 'Nguyễn Hứa Phùng',
    content: [
      {
        id: 'i1',
        type: 'introduction',
        title: 'Giới thiệu khóa học',
        data: {
          text: 'Đây là khóa học Principles of Programming Language. Khóa học cung cấp kiến thức nền tảng và thực hành về lĩnh vực này.',
        },
      },
      {
        id: 'm1',
        type: 'material',
        title: 'Material',
        data: {
          document: {
            id: 'a1',
            title: '01_Ch1 Introduction_2025',
            description:
              'Thiết kế bài tập về nhà chương 1: Giới thiệu về ngôn ngữ lập trình',
            dueDate: '2024-09-15',
            source: '01_Ch1_Introduction_2025.pdf',
          },
        },
      },
      {
        id: 'v1',
        type: 'movie',
        title: 'Video 1',
        data: {
          video: {
            id: 'm1',
            title: 'Giới thiệu về ngôn ngữ lập trình',
            description:
              'Video giới thiệu các khái niệm cơ bản về ngôn ngữ lập trình.',
            url: 'https://www.youtube.com/watch?v=Kcp48dcm4QA',
          },
        },
      },
      {
        id: 'n1',
        type: 'note',
        title: 'Ghi chú bài tập lớn 1',
        data: {
          assignment: {
            id: 'd1',
            title: 'Bài tập về nhà 1: Cài đặt ngôn ngữ lập trình đơn giản',
            description:
              'In MiniGo, an identifier is the name used to identify variables, constants, types, functions, or other user-defined elements within a program. Identifiers must adhere to the following rules:\n\tComposition: An identifier must start with a letter(A- Z or a - z) or an underscore().Subsequent characters can include letters, digits(0 - 9), or underscores.\n\tCase Sensitivity: Identifiers are case-sensitive, meaning myVariable and MyVariable are treated as distinct identifiers.\n\tLength: There is no explicit limit on the length of an identifier, but it is recommended to use concise yet descriptive names for clarity.\n\tKeywords Restriction: Identifiers cannot be the same as any reserved keyword in MiniGo.',
            dueDate: '2024-10-01',
            source: 'assignment1.pdf',
          },
        },
      },
      {
        id: 'l1',
        type: 'reference',
        title: 'Tài liệu tham khảo',
        data: {
          link: {
            id: 'l1',
            title: 'Giới thiệu về ngôn ngữ lập trình',
            url: 'https://example.com/intro-to-programming-languages',
          },
        },
      },
      {
        id: 's1',
        type: 'submission',
        title: 'Bài nộp 1',
        data: {
          status: 'submitted',
          submittedFile: {
            name: 'MiniGo_Specifications.pdf',
            submittedAt: '20:00 12/10/2024',
          },
          dueDate: '20:00 10/10/2024',
          canEdit: false,
          maxFiles: 1,
          allowedTypes: ['pdf', 'doc', 'docx'],
        },
      },
      {
        id: 's2',
        type: 'submission',
        title: 'Bài nộp 2',
        data: {
          status: 'graded',
          submittedFile: {
            name: 'group07_report 02.pdf',
            submittedAt: '18:30 12/10/2024',
          },
          dueDate: '20:00 10/10/2024',
          grade: 2.5,
          maxGrade: 10,
          feedback: 'Lorem ipsum',
          canEdit: false,
          maxFiles: 2,
          allowedTypes: ['pdf', 'docx'],
        },
      },
      {
        id: 's3',
        type: 'submission',
        title: 'Bài nộp 3',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ipsum magna, rutrum tempus urna quis,',
        data: {
          status: 'not-submitted',
          dueDate: '20:00 15/11/2024',
          canEdit: true,
          maxFiles: 3,
          allowedTypes: ['pdf', 'docx', 'zip'],
        },
      },
      {
        id: 'l3',
        type: 'reference',
        title: 'Tài liệu tham khảo 2',
        data: {
          link: {
            id: 'l3',
            title: 'Các cấu trúc dữ liệu cơ bản',
            url: 'https://example.com/basic-data-structures',
          },
        },
      },
    ],
  },
];

/** Course-content driver used by the detail/submission screens. */
export const courseDetailDriver = createBackendDataDriver(dataCourses, {
  list: async () => {
    const records = await Promise.all(
      dataCourses.map(async (course) => (await backendDriver.getCourseDetail(course.id)).data.detail),
    );
    return records;
  },
});
// Mock: số lượng bài đã nộp theo khóa học và submission
// key: courseId -> key: submission key (tên hoặc id) -> số bài đã nộp
export const mockSubmissionSubmittedCounts: Record<
  string,
  Record<string, number>
> = {
  '4': {
    // 'Submission 1' trong dataCourses cho course id 4
    submission1: 1,
  },
};

export const mockSubmissionEntries: Record<
  string,
  Record<
    string,
    Array<{ name: string; email: string; submittedAt: string; score?: number }>
  >
> = {
  '4': {
    's1': [
      {
        name: 'Nguyễn Trần Văn AAA',
        email: 'nguyentranvanaaa123456789@gmail.com',
        submittedAt: '19:00 10/10/2024',
        score: 7.5,
      },
      {
        name: 'Nguyễn Trần Văn AAA',
        email: 'nguyentranvanaaa123456789@gmail.com',
        submittedAt: '19:00 11/10/2024',
        score: 5,
      },
      {
        name: 'Nguyễn Trần Văn AAA',
        email: 'nguyentranvanaaa123456789@gmail.com',
        submittedAt: '19:00 12/10/2024',
        score: 2.5,
      },
    ],
    's2': [
      {
        name: 'Nguyễn Trần Văn BBB',
        email: 'nguyentranvanbbb@example.com',
        submittedAt: '18:30 10/10/2024',
        score: 5,
      },
      {
        name: 'Lê Thị C',
        email: 'le.ti.c@example.com',
        submittedAt: '19:15 10/10/2024',
        score: 6,
      },
    ],
    // Submission 3 - pending / not graded
    's3': [
      {
        name: 'Phạm Văn D',
        email: 'phamvand@example.com',
        submittedAt: '19:00 15/11/2024',
      },
    ],
  },
};
