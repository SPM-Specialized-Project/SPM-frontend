import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid'
import { Link } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'

// --- Import Mock Data ---
import {
  mockLocations,
  mockLanguages,
  pastRegistrationDriver,
} from '@/components/data/~mock-register'
import {
  tutorRegistrationDriver,
} from '@/components/data/~mock-tutor-register'
import useLockBodyScroll from '@/hooks/use-lock-body-scroll'
import { useJsonData } from '@/services/use-json-data'

import { FilterPopup, type FilterState } from './filter-popup'
import { MatchingPopup } from './popup'

// Reusable helpers moved here so DataTab is self-contained
const Th = ({ children }: { children: React.ReactNode }) => (
  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
    {children}
  </th>
);

const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
    {children}
  </td>
);

const StatusBadge = ({ status }: { status: 'Pending' | 'Approved' | 'Declined' }) => {
  const statusMap = {
    Pending: { text: 'Đang xử lý', class: 'bg-yellow-100 text-yellow-800' },
    Approved: { text: 'Hoàn thành', class: 'bg-green-100 text-green-800' },
    Declined: { text: 'Từ chối', class: 'bg-red-100 text-red-800' },
  } as const;
  const { text, class: className } = statusMap[status];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
};

// SVG cho nút Filter
const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6.66512 13.3333C6.66507 13.4572 6.69953 13.5787 6.76465 13.6841C6.82977 13.7895 6.92297 13.8746 7.03379 13.93L8.36712 14.5967C8.46879 14.6475 8.58175 14.6714 8.69529 14.6663C8.80882 14.6612 8.91916 14.6271 9.01581 14.5673C9.11247 14.5075 9.19224 14.424 9.24754 14.3247C9.30284 14.2254 9.33184 14.1137 9.33179 14V9.33333C9.33194 9.00292 9.45477 8.68433 9.67646 8.43933L14.4918 3.11333C14.5781 3.01771 14.6349 2.89912 14.6552 2.77192C14.6755 2.64472 14.6586 2.51435 14.6064 2.39658C14.5542 2.27881 14.469 2.17868 14.3611 2.1083C14.2532 2.03792 14.1273 2.0003 13.9985 2H1.99846C1.86953 2.00005 1.74338 2.03748 1.63529 2.10776C1.5272 2.17804 1.44181 2.27815 1.38946 2.39598C1.33711 2.5138 1.32005 2.64427 1.34034 2.77159C1.36063 2.89892 1.41741 3.01762 1.50379 3.11333L6.32046 8.43933C6.54215 8.68433 6.66497 9.00292 6.66512 9.33333V13.3333Z" stroke="#3D4863" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


// Fixed: User + (avatar with plus) icon converted to React component with proper attribute names
const UserPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M1 14C1 14 0 14 0 13C0 12 1 9 6 9C11 9 12 12 12 13C12 14 11 14 11 14H1Z" fill="#3D4863" />
    <path d="M6 8C6.79565 8 7.55871 7.68393 8.12132 7.12132C8.68393 6.55871 9 5.79565 9 5C9 4.20435 8.68393 3.44129 8.12132 2.87868C7.55871 2.31607 6.79565 2 6 2C5.20435 2 4.44129 2.31607 3.87868 2.87868C3.31607 3.44129 3 4.20435 3 5C3 5.79565 3.31607 6.55871 3.87868 7.12132C4.44129 7.68393 5.20435 8 6 8Z" fill="#3D4863" />
    <path fillRule="evenodd" clipRule="evenodd" d="M13.5 5C13.6326 5 13.7598 5.05268 13.8536 5.14645C13.9473 5.24021 14 5.36739 14 5.5V7H15.5C15.6326 7 15.7598 7.05268 15.8536 7.14645C15.9473 7.24021 16 7.36739 16 7.5C16 7.63261 15.9473 7.75979 15.8536 7.85355C15.7598 7.94732 15.6326 8 15.5 8H14V9.5C14 9.63261 13.9473 9.75979 13.8536 9.85355C13.7598 9.94732 13.6326 10 13.5 10C13.3674 10 13.2402 9.94732 13.1464 9.85355C13.0527 9.75979 13 9.63261 13 9.5V8H11.5C11.3674 8 11.2402 7.94732 11.1464 7.85355C11.0527 7.75979 11 7.63261 11 7.5C11 7.36739 11.0527 7.24021 11.1464 7.14645C11.2402 7.05268 11.3674 7 11.5 7H13V5.5C13 5.36739 13.0527 5.24021 13.1464 5.14645C13.2402 5.05268 13.3674 5 13.5 5Z" fill="#3D4863" />
  </svg>
);

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

// Main DataTab component: contains search, filter, table, pagination, and popups
export function DataTab() {
  const studentRegistrations = useJsonData(pastRegistrationDriver);
  const tutorRegistrations = useJsonData(tutorRegistrationDriver);

  // Copied constants from overview context
  const ITEMS_PER_PAGE = 10;

  // State
  const [searchName, setSearchName] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Assign popup state
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);

  // Filter popup state
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ locations: {}, language: '', role: '', sessionType: '' });

  // Lock body scroll when any popup is open
  useLockBodyScroll(isAssignPopupOpen || isFilterPopupOpen);

  // Build unified requests
  const allRequests = useMemo(() => {
    const studentRequests = studentRegistrations.map(r => ({
      id: r.id,
      courseCode: r.subjects?.[0]?.name.split('(')[1]?.replace(')', '') ?? 'N/A',
      name: r.Name,
      language: r.languages?.[0]?.name ?? 'N/A',
      type: r.sessionTypes?.[0]?.name ?? 'N/A',
      role: 'Student' as const,
      location: r.locations?.[0]?.name ?? 'N/A',
      request: r.specialRequest,
      status: r.status,
    }));

    const tutorRequests = tutorRegistrations.map(r => ({
      id: r.id,
      courseCode: r.subjects?.[0]?.name?.split('(')?.[1]?.replace(')', '') ?? 'N/A',
      name: r.Name,
      language: r.languages?.[0]?.name ?? 'N/A',
      type: r.sessionTypes?.[0]?.name ?? 'N/A',
      role: 'Tutor' as const,
      location: r.locations?.[0]?.name ?? 'N/A',
      request: r.specialRequest,
      status: r.status,
    }));

    return [...studentRequests, ...tutorRequests];
  }, [studentRegistrations, tutorRegistrations]);

  const filteredRequests = useMemo(() => {
    return allRequests
      .filter(req => {
        const selectedLocations = Object.entries(filters.locations).filter(([, isSelected]) => isSelected).map(([id]) => id);
        if (selectedLocations.length > 0) {
          const reqLocationMatches = selectedLocations.some(locId => {
            const matchingLocation = mockLocations.find(loc => loc.id === locId);
            return matchingLocation && req.location === matchingLocation.name;
          });
          if (!reqLocationMatches) return false;
        }

        if (filters.language) {
          const matchingLanguage = mockLanguages.find(lang => lang.id === filters.language);
          if (matchingLanguage && req.language !== matchingLanguage.name) return false;
        }

        if (filters.role) {
          const roleMap: Record<string, string> = { student: 'Student', tutor: 'Tutor' };
          if (req.role !== roleMap[filters.role]) return false;
        }

        if (filters.sessionType) {
          const sessionTypeMap: Record<string, string> = { offline: 'Offline', online: 'Online' };
          if (req.type !== sessionTypeMap[filters.sessionType]) return false;
        }

        return true;
      })
      .filter(req => req.name.toLowerCase().includes(searchName.toLowerCase()))
      .filter(req => req.courseCode.toLowerCase().includes(searchSubject.toLowerCase()));
  }, [allRequests, filters, searchName, searchSubject]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  // Assign popup handlers
  const handleOpenAssignPopup = (registration: any) => {
    setSelectedRegistration(registration);
    setIsAssignPopupOpen(true);
  };

  const getAvailablePeople = () => {
    if (!selectedRegistration) return { people: [], label: '' };
    const courseCode = selectedRegistration.courseCode;
    if (selectedRegistration.role === 'Student') {
      const matchingTutors = tutorRegistrations.filter(tutor => tutor.subjects?.some(s => s?.name?.includes(courseCode)));
      return { people: matchingTutors, label: 'Tutor' };
    }
    const matchingStudents = studentRegistrations.filter(s => (s.subjects?.[0]?.name.split('(')?.[1]?.replace(')', '') ?? '') === courseCode);
    return { people: matchingStudents, label: 'Student' };
  };

  const availableMatches = getAvailablePeople();

  const handleMatchTutor = (tutorId: string) => {
    if (!selectedRegistration) return;
    if (selectedRegistration.role === 'Student') {
      pastRegistrationDriver.update(selectedRegistration.id, { status: 'Approved' });
    } else {
      tutorRegistrationDriver.update(selectedRegistration.id, { status: 'Approved' });
    }
    // Keep tutorId referenced to satisfy linter and for debugging
    console.log('Assigned person id:', tutorId, 'for registration:', selectedRegistration.id);
    alert('Đã phân công thành công!');
    setIsAssignPopupOpen(false);
    setSelectedRegistration(null);
  };

  const handleClosePopup = () => { setIsAssignPopupOpen(false); setSelectedRegistration(null); };

  const handleOpenFilterPopup = () => setIsFilterPopupOpen(true);
  const handleCloseFilterPopup = () => setIsFilterPopupOpen(false);
  const handleApplyFilters = (newFilters: FilterState) => { setFilters(newFilters); setCurrentPage(1); };

  // Whether parent currently has any applied filters (used to pass back into popup when needed)
  const hasActiveFilters = useMemo(() => {
    const selectedLocations = Object.values(filters.locations || {}).filter(Boolean).length > 0;
    return selectedLocations || Boolean(filters.language) || Boolean(filters.role) || Boolean(filters.sessionType);
  }, [filters]);

  return (
    <div>
      {/* 2. Thanh Filter/Search */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="size-5 text-gray-400" />
          </div>
          <input type="text" placeholder="Nhập tên để tìm kiếm..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full rounded-lg border-gray-300 py-2 pl-10 shadow-sm" />
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="size-5 text-gray-400" />
          </div>
          <input type="text" placeholder="Nhập mã môn học..." value={searchSubject} onChange={e => setSearchSubject(e.target.value)} className="w-full rounded-lg border-gray-300 py-2 pl-10 shadow-sm" />
        </div>

        <button onClick={handleOpenFilterPopup} className="shrink-0 rounded-lg border border-gray-300 bg-white p-2.5 shadow-sm hover:bg-gray-50">
          <FilterIcon className="size-5 text-gray-600" />
        </button>
      </div>

      {/* 3. Bảng dữ liệu */}
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
                <Th><span className="sr-only">Assign</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedRequests.map(req => (
                <tr key={req.id}>
                  <Td>{req.courseCode}</Td>
                  <Td>
                    <Link
                      to={`/profile/${req.id}` as string}
                      className="font-medium text-blue-600 hover:underline"
                    >

                      {req.name}
                    </Link>

                  </Td>
                  <Td>{req.language}</Td>
                  <Td>{req.type}</Td>
                  <Td>{req.role}</Td>
                  <Td>{req.location}</Td>
                  <Td><span className="block w-32 truncate" title={req.request}>{req.request.substring(0, 20)}...</span></Td>
                  <Td><StatusBadge status={req.status} /></Td>
                  <Td>
                    <button onClick={() => handleOpenAssignPopup(req)} className="rounded-lg border border-gray-600 p-2 text-gray-500 hover:text-blue-600">
                      <UserPlusIcon className="size-5 text-gray-600" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-600">
          <div>
            {filteredRequests.length} kết quả — trang {totalPages === 0 ? 0 : currentPage}/{Math.max(totalPages, 1)}
          </div>
          <div>
            {totalPages <= 1 ? <span className="text-xs italic text-gray-400">Không có trang để chuyển</span> : null}
          </div>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Assign popup */}
      {isAssignPopupOpen && selectedRegistration && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50" onClick={handleClosePopup}>
          <div onClick={e => e.stopPropagation()}>
            <MatchingPopup onClose={handleClosePopup} onMatch={handleMatchTutor} availablePeople={availableMatches.people} tabLabel={availableMatches.label} />
          </div>
        </div>
      )}

      {/* Filter popup */}
      {isFilterPopupOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50" onClick={handleCloseFilterPopup}>
          <div onClick={e => e.stopPropagation()}>
            <FilterPopup onClose={handleCloseFilterPopup} onApply={handleApplyFilters} initialState={hasActiveFilters ? filters : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}
