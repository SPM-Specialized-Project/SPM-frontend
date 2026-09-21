import { useMemo, useState } from 'react';

import { mockLanguages, mockLocations, pastRegistrationStore, type PastRegistration } from '@/components/data/~mock-register';
import { tutorRegistrationStore } from '@/components/data/~mock-tutor-register';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';
import { useDataStore } from '@/services/use-data-store';

import { DataFilters } from './data-filters';
import { DataRequestTable } from './data-request-table';
import { AssignPopupOverlay, FilterPopupOverlay } from './data-tab-popups';
import { type FilterState } from './filter-popup';
import type { UnifiedRegistration } from './result-types';

const ITEMS_PER_PAGE = 10;

export function DataTab() {
  const studentRegistrations = useDataStore(pastRegistrationStore);
  const tutorRegistrations = useDataStore(tutorRegistrationStore);
  const [searchName, setSearchName] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<UnifiedRegistration | null>(null);
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ locations: {}, language: '', role: '', sessionType: '' });
  useLockBodyScroll(isAssignPopupOpen || isFilterPopupOpen);

  const allRequests = useMemo<UnifiedRegistration[]>(() => {
    const toRequest = (registration: PastRegistration, role: UnifiedRegistration['role']): UnifiedRegistration => ({
      id: registration.id,
      courseCode: registration.subjects?.[0]?.name.split('(')[1]?.replace(')', '') ?? 'N/A',
      name: registration.Name,
      language: registration.languages?.[0]?.name ?? 'N/A',
      type: registration.sessionTypes?.[0]?.name ?? 'N/A',
      role,
      location: registration.locations?.[0]?.name ?? 'N/A',
      request: registration.specialRequest,
      status: registration.status,
    });
    return [
      ...studentRegistrations.map((registration) => toRequest(registration, 'Student')),
      ...tutorRegistrations.map((registration) => toRequest(registration, 'Tutor')),
    ];
  }, [studentRegistrations, tutorRegistrations]);

  const filteredRequests = useMemo(() => allRequests.filter((request) => {
    const selectedLocations = Object.entries(filters.locations).filter(([, selected]) => selected).map(([id]) => id);
    if (selectedLocations.length > 0 && !selectedLocations.some((locationId) => {
      const location = mockLocations.find((item) => item.id === locationId);
      return location && request.location === location.name;
    })) return false;

    if (filters.language) {
      const language = mockLanguages.find((item) => item.id === filters.language);
      if (language && request.language !== language.name) return false;
    }
    if (filters.role) {
      const roleMap: Record<string, string> = { student: 'Student', tutor: 'Tutor' };
      if (request.role !== roleMap[filters.role]) return false;
    }
    if (filters.sessionType) {
      const typeMap: Record<string, string> = { offline: 'Offline', online: 'Online' };
      if (request.type !== typeMap[filters.sessionType]) return false;
    }
    return true;
  }).filter((request) => request.name.toLowerCase().includes(searchName.toLowerCase()))
    .filter((request) => request.courseCode.toLowerCase().includes(searchSubject.toLowerCase())),
  [allRequests, filters, searchName, searchSubject]);

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const availableMatches = useMemo(() => {
    if (!selectedRegistration) return { people: [] as PastRegistration[], label: '' };
    const courseCode = selectedRegistration.courseCode;
    if (selectedRegistration.role === 'Student') {
      return {
        people: tutorRegistrations.filter((tutor) => tutor.subjects?.some((subject) => subject?.name?.includes(courseCode))),
        label: 'Tutor',
      };
    }
    return {
      people: studentRegistrations.filter((student) => (student.subjects?.[0]?.name.split('(')?.[1]?.replace(')', '') ?? '') === courseCode),
      label: 'Student',
    };
  }, [selectedRegistration, studentRegistrations, tutorRegistrations]);

  const openAssignPopup = (registration: UnifiedRegistration) => {
    setSelectedRegistration(registration);
    setIsAssignPopupOpen(true);
  };
  const closeAssignPopup = () => {
    setSelectedRegistration(null);
    setIsAssignPopupOpen(false);
  };
  const handleMatch = (personId: string) => {
    if (!selectedRegistration) return;
    const store = selectedRegistration.role === 'Student' ? pastRegistrationStore : tutorRegistrationStore;
    store.update(selectedRegistration.id, { status: 'Approved' });
    console.log('Assigned person id:', personId, 'for registration:', selectedRegistration.id);
    alert('Đã phân công thành công!');
    closeAssignPopup();
  };
  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setIsFilterPopupOpen(false);
  };
  const hasActiveFilters = Object.values(filters.locations || {}).some(Boolean)
    || Boolean(filters.language) || Boolean(filters.role) || Boolean(filters.sessionType);

  return (
    <div>
      <DataFilters
        searchName={searchName}
        searchSubject={searchSubject}
        onSearchNameChange={setSearchName}
        onSearchSubjectChange={setSearchSubject}
        onOpenFilter={() => setIsFilterPopupOpen(true)}
      />
      <DataRequestTable
        requests={paginatedRequests}
        totalResults={filteredRequests.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onAssign={openAssignPopup}
      />
      <AssignPopupOverlay
        selectedRegistration={isAssignPopupOpen ? selectedRegistration : null}
        availablePeople={availableMatches.people}
        label={availableMatches.label}
        onClose={closeAssignPopup}
        onMatch={handleMatch}
      />
      <FilterPopupOverlay
        open={isFilterPopupOpen}
        initialState={hasActiveFilters ? filters : undefined}
        onClose={() => setIsFilterPopupOpen(false)}
        onApply={applyFilters}
      />
    </div>
  );
}
