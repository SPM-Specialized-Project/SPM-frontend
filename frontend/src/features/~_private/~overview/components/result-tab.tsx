import { useMemo, useState } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import { pastRegistrationStore, type PastRegistration } from '@/components/data/~mock-register';
import { sessionStore, type Session } from '@/components/data/~mock-session';
import { tutorRegistrationStore } from '@/components/data/~mock-tutor-register';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';
import { useDataStore } from '@/services/use-data-store';

import { MatchedSessionsPanel } from './matched-sessions-panel';
import { MatchingPopupOverlay } from './matching-popup-overlay';
import type { MatchedCourseGroup, UnifiedRegistration } from './result-types';
import { UnmatchedRequestsPanel } from './unmatched-requests-panel';

const ITEMS_PER_PAGE_TOP = 3;
const ITEMS_PER_PAGE_BOTTOM = 5;

export function ResultTab() {
  const courses = useDataStore(courseStore);
  const studentRegistrations = useDataStore(pastRegistrationStore);
  const tutorRegistrations = useDataStore(tutorRegistrationStore);
  const sessions = useDataStore(sessionStore);

  const [topCurrentPage, setTopCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [bottomCurrentPage, setBottomCurrentPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<UnifiedRegistration | null>(null);
  useLockBodyScroll(isAssignPopupOpen);

  const matchedData = useMemo<MatchedCourseGroup[]>(() => {
    const sessionsByCourse = sessions.reduce<Record<string, Session[]>>((groups, session) => {
      groups[session.courseId] ??= [];
      groups[session.courseId].push(session);
      return groups;
    }, {});

    return Object.entries(sessionsByCourse).map(([courseId, courseSessions]) => {
      const course = courses.find((item) => item.id === courseId);
      return {
        courseId,
        courseCode: course?.code.split('_')[1] ?? 'N/A',
        courseTitle: course?.title ?? 'Unknown Course',
        sessions: courseSessions,
      };
    });
  }, [courses, sessions]);

  const paginatedTopData = useMemo(() => {
    const start = (topCurrentPage - 1) * ITEMS_PER_PAGE_TOP;
    return matchedData.slice(start, start + ITEMS_PER_PAGE_TOP);
  }, [matchedData, topCurrentPage]);

  const allUnmatchedRequests = useMemo<UnifiedRegistration[]>(() => {
    const toRegistration = (
      registration: PastRegistration,
      role: UnifiedRegistration['role'],
    ): UnifiedRegistration => ({
      id: registration.id,
      courseCode: registration.subjects?.[0]?.name?.split('(')?.[1]?.replace(')', '') ?? 'N/A',
      name: registration.Name,
      language: registration.languages?.[0]?.name ?? 'N/A',
      type: registration.sessionTypes?.[0]?.name ?? 'N/A',
      role,
      location: registration.locations?.[0]?.name ?? 'N/A',
      request: registration.specialRequest,
      status: registration.status,
    });

    return [
      ...studentRegistrations.map((registration) => toRegistration(registration, 'Student')),
      ...tutorRegistrations.map((registration) => toRegistration(registration, 'Tutor')),
    ].filter((registration) => registration.status === 'Pending');
  }, [studentRegistrations, tutorRegistrations]);

  const filteredBottomRequests = useMemo(
    () => allUnmatchedRequests
      .filter((request) => request.name.toLowerCase().includes(searchName.toLowerCase()))
      .filter((request) => request.courseCode.toLowerCase().includes(searchSubject.toLowerCase())),
    [allUnmatchedRequests, searchName, searchSubject],
  );
  const paginatedBottomRequests = useMemo(() => {
    const start = (bottomCurrentPage - 1) * ITEMS_PER_PAGE_BOTTOM;
    return filteredBottomRequests.slice(start, start + ITEMS_PER_PAGE_BOTTOM);
  }, [filteredBottomRequests, bottomCurrentPage]);

  const toggleRow = (courseId: string) => {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const openAssignPopup = (registration: UnifiedRegistration) => {
    setSelectedRegistration(registration);
    setIsAssignPopupOpen(true);
  };

  const closePopup = () => {
    setIsAssignPopupOpen(false);
    setSelectedRegistration(null);
  };

  const availableMatches = useMemo(() => {
    if (!selectedRegistration) return { people: [] as PastRegistration[], label: '' };
    const courseCode = selectedRegistration.courseCode;
    if (selectedRegistration.role === 'Student') {
      return {
        people: tutorRegistrations.filter((tutor) => tutor.subjects.some((subject) => subject?.name?.includes(courseCode))),
        label: 'Tutor',
      };
    }
    return {
      people: studentRegistrations.filter((student) =>
        (student.subjects?.[0]?.name?.split('(')?.[1]?.replace(')', '') ?? '') === courseCode,
      ),
      label: 'Student',
    };
  }, [selectedRegistration, studentRegistrations, tutorRegistrations]);

  const handleMatch = (personId: string) => {
    if (!selectedRegistration) return;
    console.log('Assigned:', personId, 'to:', selectedRegistration.id);
    alert('Đã phân công thành công! (Mockup)');
    closePopup();
  };

  return (
    <div className="space-y-8 py-6">
      <MatchedSessionsPanel
        data={paginatedTopData}
        currentPage={topCurrentPage}
        totalPages={Math.ceil(matchedData.length / ITEMS_PER_PAGE_TOP)}
        expandedRows={expandedRows}
        onToggle={toggleRow}
        onPageChange={setTopCurrentPage}
      />
      <UnmatchedRequestsPanel
        requests={paginatedBottomRequests}
        searchName={searchName}
        searchSubject={searchSubject}
        onSearchNameChange={setSearchName}
        onSearchSubjectChange={setSearchSubject}
        currentPage={bottomCurrentPage}
        totalPages={Math.ceil(filteredBottomRequests.length / ITEMS_PER_PAGE_BOTTOM)}
        onPageChange={setBottomCurrentPage}
        onAssign={openAssignPopup}
        onConfirm={() => {
          alert('Xác nhận tạo lớp thành công...');
          setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
        }}
      />
      {isAssignPopupOpen && (
        <MatchingPopupOverlay
          selectedRegistration={selectedRegistration}
          availablePeople={availableMatches.people}
          label={availableMatches.label}
          onClose={closePopup}
          onMatch={handleMatch}
        />
      )}
    </div>
  );
}
