import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid'
import React, { useState, useMemo } from 'react'

import { courseDriver } from '@/components/data/~mock-courses'
import { pastRegistrationDriver, type PastRegistration } from '@/components/data/~mock-register'
import { sessionDriver, type Session } from '@/components/data/~mock-session'
import { tutorRegistrationDriver } from '@/components/data/~mock-tutor-register'
import { Trash } from '@/components/icons'
import useLockBodyScroll from '@/hooks/use-lock-body-scroll'
import { useJsonData } from '@/services/use-json-data'

import { MatchingPopup } from './popup'

// --- BIẾN ĐỔI SVG THÀNH COMPONENT (Tái sử dụng từ index.tsx) ---

// SVG cho nút Assign (User + plus)
const UserPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M1 14C1 14 0 14 0 13C0 12 1 9 6 9C11 9 12 12 12 13C12 14 11 14 11 14H1Z" fill="#3D4863" />
    <path d="M6 8C6.79565 8 7.55871 7.68393 8.12132 7.12132C8.68393 6.55871 9 5.79565 9 5C9 4.20435 8.68393 3.44129 8.12132 2.87868C7.55871 2.31607 6.79565 2 6 2C5.20435 2 4.44129 2.31607 3.87868 2.87868C3.31607 3.44129 3 4.20435 3 5C3 5.79565 3.31607 6.55871 3.87868 7.12132C4.44129 7.68393 5.20435 8 6 8Z" fill="#3D4863" />
    <path fillRule="evenodd" clipRule="evenodd" d="M13.5 5C13.6326 5 13.7598 5.05268 13.8536 5.14645C13.9473 5.24021 14 5.36739 14 5.5V7H15.5C15.6326 7 15.7598 7.05268 15.8536 7.14645C15.9473 7.24021 16 7.36739 16 7.5C16 7.63261 15.9473 7.75979 15.8536 7.85355C15.7598 7.94732 15.6326 8 15.5 8H14V9.5C14 9.63261 13.9473 9.75979 13.8536 9.85355C13.7598 9.94732 13.6326 10 13.5 10C13.3674 10 13.2402 9.94732 13.1464 9.85355C13.0527 9.75979 13 9.63261 13 9.5V8H11.5C11.3674 8 11.2402 7.94732 11.1464 7.85355C11.0527 7.75979 11 7.63261 11 7.5C11 7.36739 11.0527 7.24021 11.1464 7.14645C11.2402 7.05268 11.3674 7 11.5 7H13V5.5C13 5.36739 13.0527 5.24021 13.1464 5.14645C13.2402 5.05268 13.3674 5 13.5 5Z" fill="#3D4863" />
  </svg>
);

// --- Định nghĩa Type (Tái sử dụng từ index.tsx) ---
type UnifiedRegistration = {
  id: string;
  courseCode: string;
  name: string;
  language: string;
  type: string;
  role: 'Student' | 'Tutor';
  location: string;
  request: string;
  status: 'Pending' | 'Approved' | 'Declined';
};

// Cấu hình phân trang
const ITEMS_PER_PAGE_TOP = 3;
const ITEMS_PER_PAGE_BOTTOM = 5;

// === Component Tab Kết Quả ===
export function ResultTab() {
  const courses = useJsonData(courseDriver);
  const studentRegistrations = useJsonData(pastRegistrationDriver);
  const tutorRegistrations = useJsonData(tutorRegistrationDriver);
  const sessions = useJsonData(sessionDriver);

  // --- State cho Phần Trên (Matched) ---
  const [topCurrentPage, setTopCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // --- State cho Phần Dưới (Unmatched) ---
  const [bottomCurrentPage, setBottomCurrentPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchSubject, setSearchSubject] = useState('');

  // --- State cho Popup (Dùng cho phần dưới) ---
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<UnifiedRegistration | null>(null);
  useLockBodyScroll(isAssignPopupOpen);

  // --- Data cho Phần Trên (Matched Sessions) ---
  const matchedData = useMemo(() => {
    // 1. Nhóm các session theo courseId
    const sessionsByCourse = sessions.reduce((acc, session) => {
      const courseId = session.courseId;
      if (!acc[courseId]) {
        acc[courseId] = [];
      }
      acc[courseId].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    // 2. Map với thông tin từ mockCourses để lấy tên và mã môn học
    return Object.keys(sessionsByCourse).map(courseId => {
      const course = courses.find(c => c.id === courseId);
      const sessions = sessionsByCourse[courseId];
      return {
        courseId: courseId,
        // Tách lấy mã CO2013 từ '79748_CO2013_003183_CLC'
        courseCode: course?.code.split('_')[1] ?? 'N/A',
        courseTitle: course?.title ?? 'Unknown Course',
        sessions: sessions, // Các lớp/buổi học thuộc môn này
      };
    });
  }, [courses, sessions]);

  // 3. Phân trang cho phần trên
  const topTotalPages = Math.ceil(matchedData.length / ITEMS_PER_PAGE_TOP);
  const paginatedTopData = useMemo(() => {
    const start = (topCurrentPage - 1) * ITEMS_PER_PAGE_TOP;
    const end = start + ITEMS_PER_PAGE_TOP;
    return matchedData.slice(start, end);
  }, [matchedData, topCurrentPage]);

  // --- Data cho Phần Dưới (Unmatched Registrations) ---
  // 1. Gộp và chuẩn hóa dữ liệu (Tái sử dụng logic từ index.tsx)
  const allUnmatchedRequests = useMemo((): UnifiedRegistration[] => {
    // Xử lý Student Registrations
    const studentRequests: UnifiedRegistration[] = studentRegistrations.map(r => ({
      id: r.id,
      courseCode: r.subjects?.[0]?.name?.split('(')?.[1]?.replace(')', '') ?? 'N/A',
      name: r.Name,
      language: r.languages?.[0]?.name ?? 'N/A',
      type: r.sessionTypes?.[0]?.name ?? 'N/A',
      role: 'Student',
      location: r.locations?.[0]?.name ?? 'hybrid',
      request: r.specialRequest,
      status: r.status,
    }));

    // Xử lý Tutor Registrations
    const tutorRequests: UnifiedRegistration[] = tutorRegistrations.map(r => ({
      id: r.id,
      courseCode: r.subjects?.[0]?.name?.split('(')?.[1]?.replace(')', '') ?? 'N/A',
      name: r.Name,
      language: r.languages?.[0]?.name ?? 'N/A',
      type: r.sessionTypes?.[0]?.name ?? 'N/A',
      role: 'Tutor',
      location: r.locations?.[0]?.name ?? 'N/A',
      request: r.specialRequest,
      status: r.status,
    }));

    // 3. Gộp lại VÀ LỌC LẤY 'Pending'
    return [...studentRequests, ...tutorRequests]
      .filter(req => req.status === 'Pending');

  }, [studentRegistrations, tutorRegistrations]);

  // 2. Lọc dữ liệu dựa trên state search
  const filteredBottomRequests = useMemo(() => {
    return allUnmatchedRequests
      .filter(req =>
        req.name.toLowerCase().includes(searchName.toLowerCase())
      )
      .filter(req =>
        req.courseCode.toLowerCase().includes(searchSubject.toLowerCase())
      );
  }, [allUnmatchedRequests, searchName, searchSubject]);

  // 3. Phân trang cho phần dưới
  const bottomTotalPages = Math.ceil(filteredBottomRequests.length / ITEMS_PER_PAGE_BOTTOM);
  const paginatedBottomRequests = useMemo(() => {
    const start = (bottomCurrentPage - 1) * ITEMS_PER_PAGE_BOTTOM;
    const end = start + ITEMS_PER_PAGE_BOTTOM;
    return filteredBottomRequests.slice(start, end);
  }, [filteredBottomRequests, bottomCurrentPage]);

  // --- Handlers ---

  // Handler cho Phần Trên
  const toggleRow = (courseId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  // Handlers cho Phần Dưới (Tái sử dụng logic từ index.tsx)
  const handleOpenAssignPopup = (registration: UnifiedRegistration) => {
    setSelectedRegistration(registration);
    setIsAssignPopupOpen(true);
  };

  const getAvailablePeople = (): { people: PastRegistration[]; label: string } => {
    if (!selectedRegistration) return { people: [], label: '' };
    const courseCode = selectedRegistration.courseCode;

    if (selectedRegistration.role === 'Student') {
      const matchingTutors = tutorRegistrations
        .filter(tutor => tutor.subjects.some(subject => subject?.name?.includes(courseCode)));
      return { people: matchingTutors, label: 'Tutor' };
    } else {
      const matchingStudents = studentRegistrations
        .filter(student => (student.subjects?.[0]?.name?.split('(')?.[1]?.replace(')', '') ?? '') === courseCode);
      return { people: matchingStudents, label: 'Student' };
    }
  };

  const availableMatches = getAvailablePeople();

  const handleMatchTutor = (tutorId: string) => {
    if (!selectedRegistration) return;
    // (Logic xử lý match - có thể copy từ index.tsx)
    console.log('Assigned:', tutorId, 'to:', selectedRegistration.id);
    alert('Đã phân công thành công! (Mockup)');
    setIsAssignPopupOpen(false);
    setSelectedRegistration(null);
    // Ở đây bạn có thể muốn cập nhật lại state `allUnmatchedRequests` để xóa item vừa match
  };

  const handleClosePopup = () => {
    setIsAssignPopupOpen(false);
    setSelectedRegistration(null);
  };

  return (
    <div className="space-y-8 py-6">

      {/* === 1. PHẦN TRÊN (LỚP ĐÃ MATCH) === */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800 text-white">
              <tr>
                <Th>STT</Th>
                <Th>Mã môn học</Th>
                <Th>Tên môn học</Th>
                <Th>
                  <span className="sr-only">Expand</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedTopData.map((courseGroup, index) => (
                <React.Fragment key={courseGroup.courseId}>
                  {/* Hàng chính của môn học */}
                  <tr className="hover:bg-gray-50">
                    <Td className="px-6">{(topCurrentPage - 1) * ITEMS_PER_PAGE_TOP + index + 1}</Td>
                    <Td className="max-w-24 truncate">{courseGroup.courseCode}</Td>
                    <Td className="max-w-[40ch] truncate">{courseGroup.courseTitle}</Td>
                    <Td>
                      <button
                        onClick={() => toggleRow(courseGroup.courseId)}
                        className="p-2 text-gray-500 hover:text-blue-600"
                      >
                        {expandedRows.has(courseGroup.courseId) ?
                          <ChevronUpIcon className="size-5" /> :
                          <ChevronDownIcon className="size-5" />
                        }
                      </button>
                    </Td>
                  </tr>

                  {/* Hàng nội dung mở rộng (chi tiết các lớp) */}
                  {expandedRows.has(courseGroup.courseId) && (
                    <tr>
                      <td colSpan={4} className="bg-gray-50 p-4 shadow-inner">
                        <div className="space-y-4">
                          {courseGroup.sessions.map(session => (
                            <SessionDetailsRow key={session.id} session={session} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Phân trang cho phần trên */}
        <Pagination
          currentPage={topCurrentPage}
          totalPages={topTotalPages}
          onPageChange={setTopCurrentPage}
        />
      </div>

      {/* === 2. PHẦN DƯỚI (LƯỢT ĐĂNG KÝ CHƯA MATCH) === */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-800">LƯỢT ĐĂNG KÝ CHƯA MATCH</h2>

        {/* Thanh Filter/Search */}
        <div className="mb-4 flex items-center gap-4">
          {/* Search Tên */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="size-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Nhập tên học sinh để tìm kiếm..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full rounded-lg border-gray-300 py-2 pl-10 shadow-sm"
            />
          </div>
          {/* Search Mã môn học */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="size-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Nhập mã môn học..."
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="w-full rounded-lg border-gray-300 py-2 pl-10 shadow-sm"
            />
          </div>
          {/* (Bạn có thể thêm 2 dropdown "Toàn bộ", "Mới nhất" ở đây nếu cần) */}
        </div>

        {/* Bảng dữ liệu chưa match */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <Th>Mã môn học</Th>
                  <Th>Họ tên</Th>
                  <Th>Ngôn ngữ</Th>
                  <Th>Hình thức</Th>
                  <Th>Role</Th>
                  <Th>Địa điểm</Th>
                  <Th>Yêu cầu đặc biệt</Th>
                  <Th>Trạng thái</Th>
                  <Th>
                    <span className="sr-only">Assign</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedBottomRequests.map((req) => (
                  <tr key={req.id}>
                    <Td className="max-w-24 truncate">{req.courseCode}</Td>
                    <Td className="max-w-xs truncate">
                      <a  
                        href={`/profile/${req.id}` as string}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {req.name}
                      </a>

                    </Td>
                    <Td className="px-2">{req.language}</Td>
                    <Td className="px-2">{req.type}</Td>
                    <Td className="px-2">{req.role}</Td>
                    <Td className="max-w-32 truncate">{req.location}</Td>
                    <Td className="max-w-48">
                      <span className="block w-full truncate" title={req.request}>
                        {req.request}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={req.status} />
                    </Td>
                    <Td>
                      <button
                        onClick={() => handleOpenAssignPopup(req)}
                        className="rounded-lg border border-gray-600 p-2 text-gray-500 hover:text-blue-600"
                      >
                        <UserPlusIcon className="size-5" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang cho phần dưới */}
          <Pagination
            currentPage={bottomCurrentPage}
            totalPages={bottomTotalPages}
            onPageChange={setBottomCurrentPage}
          />
        </div>
        <div className='flex justify-end'>
          {/*  nút xác nhận: chờ 5 giây và quay trở lại /dashboard */}
          <button
            onClick={() => {
              // xác nhận tạo lớp
              alert('Xác nhận tạo lớp thành công...');
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            }}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Xác nhận tạo lớp
          </button>
        </div>
      </div>

      {/* === 3. POPUP (Dùng cho phần dưới) === */}
      {isAssignPopupOpen && selectedRegistration && (
        <>
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
            onClick={handleClosePopup}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <MatchingPopup
                onClose={handleClosePopup}
                onMatch={handleMatchTutor}
                availablePeople={availableMatches.people}
                tabLabel={availableMatches.label}
              />
            </div>
          </div>
        </>
      )}

    </div>
  )
}

// --- Component Chi Tiết Session (Cho phần trên) ---
function SessionDetailsRow({ session }: { session: Session }) {
  // Lấy tên viết tắt (VD: John Doe -> J. Doe)
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length === 1) return name;
    return `${parts[0][0]}. ${parts[parts.length - 1]}`;
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4">
      {/* Hàng thông tin chi tiết */}
      <div className="mb-4 grid grid-cols-6 gap-4 text-sm">
        <div>
          <div className="font-medium text-gray-500">Mã lớp</div>
          <div className="truncate font-semibold text-gray-900" title={session.title}>{session.title}</div>
        </div>
        <div>
          <div className="font-medium text-gray-500">Giảng viên</div>
          <div className="font-semibold text-gray-900">{session.instructor}</div>
        </div>
        <div>
          <div className="font-medium text-gray-500">Sĩ số</div>
          <div className="font-semibold text-gray-900">{session.members.length}</div>
        </div>
        <div>
          <div className="font-medium text-gray-500">Ngôn ngữ</div>
          <div className="font-semibold italic text-gray-400">{'N/A'}</div> {/* Dữ liệu này không có trong mockSessions */}
        </div>
        <div>
          <div className="font-medium text-gray-500">Hình thức</div>
          <div className="font-semibold capitalize text-gray-900">{session.method}</div>
        </div>
        <div className="flex flex-col items-end">
          <div className="font-medium text-gray-500">Giải tán lớp</div>
          <button
            type="button"
            aria-label="Giải tán lớp"
            title="Giải tán lớp"
            className="mt-1 rounded p-1 text-red-500 hover:text-red-700"
            onClick={() => alert('Giải tán lớp')}
          >
            <Trash className="size-5" />
          </button>
        </div>
      </div>

      {/* Hàng avatar học sinh */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {session.members.map(member => (
          <div key={member.id} className="flex w-16 flex-col items-center text-center" title={member.name}>
            <UserCircleIcon className="size-10 text-gray-400" />
            <span className="w-full truncate text-xs text-gray-700">
              {getInitials(member.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// --- Component Helper (Tái sử dụng từ index.tsx) ---

// Helper: Header Bảng
const Th = ({ children }: { children: React.ReactNode }) => (
  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
    {children}
  </th>
);

// Helper: Ô Bảng
const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`truncate px-6 py-4 text-sm text-gray-700 ${className ?? ''}`}>
    {children}
  </td>
);

// Helper: Trạng thái
const StatusBadge = ({ status }: { status: 'Pending' | 'Approved' | 'Declined' }) => {
  const statusMap = {
    Pending: { text: 'Đang xử lý', class: 'bg-yellow-100 text-yellow-800' },
    Approved: { text: 'Hoàn thành', class: 'bg-green-100 text-green-800' },
    Declined: { text: 'Từ chối', class: 'bg-red-100 text-red-800' },
  };
  const { text, class: className } = statusMap[status];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
};

// Helper: Phân trang
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={currentPage === 1 ? 'pagination-btn-disabled' : 'pagination-btn'}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={currentPage === totalPages ? 'pagination-btn-disabled' : 'pagination-btn'}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <div>
          <nav className="isolate inline-flex space-x-2 rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={currentPage === 1 ? 'pagination-btn-disabled' : 'pagination-btn'}
            >
              <span className="sr-only">First</span>
              <ChevronDoubleLeftIcon className="size-5" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={currentPage === 1 ? 'pagination-btn-disabled' : 'pagination-btn'}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="size-5" />
            </button>

            {/* Page Numbers */}
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={page === currentPage ? 'page-number-active' : 'page-number'}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={currentPage === totalPages ? 'pagination-btn-disabled' : 'pagination-btn'}
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="size-5" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={currentPage === totalPages ? 'pagination-btn-disabled' : 'pagination-btn'}
            >
              <span className="sr-only">Last</span>
              <ChevronDoubleRightIcon className="size-5" />
            </button>
          </nav>
        </div>
      </div>
    </nav>
  );
}
