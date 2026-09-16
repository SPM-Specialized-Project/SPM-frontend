import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  courseCreationRequestDriver,
  type CourseCreationRequest,
} from '@/components/data/~mock-coordinator-requests';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';
import { useJsonData } from '@/services/use-json-data';

import {
  type DropdownOption,
} from './coordinator-form-controls';
import { HistoryIcon } from './coordinator-icons';
import {
  CoordinatorCourseForm,
  type CoordinatorTimeSlot,
} from './coordinator-course-form';
import { CourseCreationHistoryModal } from './course-creation-history-modal';
import { ScheduleModal } from './schedule-modal';

export function CoordinatorRegister() {
  const courseCreationRequests = useJsonData(courseCreationRequestDriver);
  const navigate = useNavigate();
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [language, setLanguage] = useState(mockLanguages[0]);
  const [sessionType, setSessionType] = useState<DropdownOption>({
    id: 'online',
    name: 'Học trực tiếp',
  });
  const [location, setLocation] = useState(mockLocations[0]);
  const [description, setDescription] = useState('');
  const [addedLanguages, setAddedLanguages] = useState<DropdownOption[]>([]);
  const [addedSessionTypes, setAddedSessionTypes] = useState<DropdownOption[]>([]);
  const [addedLocations, setAddedLocations] = useState<DropdownOption[]>([]);
  const [meetLink, setMeetLink] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [addedTimeSlots, setAddedTimeSlots] = useState<CoordinatorTimeSlot[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useLockBodyScroll(isScheduleModalOpen || isHistoryModalOpen);

  const addIfNotExists = (
    list: DropdownOption[],
    setter: (value: DropdownOption[]) => void,
    item: DropdownOption,
  ) => {
    if (!list.some((option) => option.id === item.id && option.name === item.name)) {
      setter([item, ...list]);
    }
  };

  const removeItem = (
    list: DropdownOption[],
    setter: (value: DropdownOption[]) => void,
    id: string,
  ) => {
    setter(list.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    if (!courseName.trim() || !courseCode.trim()) {
      alert('Vui lòng nhập tên môn học và mã môn học');
      return;
    }

    let coordinatorName = 'Anonymous Coordinator';
    try {
      const rawUserStore = localStorage.getItem('userStore');
      const userStore = rawUserStore ? JSON.parse(rawUserStore) : null;
      coordinatorName = userStore?.state?.user?.firstName ?? coordinatorName;
    } catch {
      // Keep the fallback coordinator name for malformed local storage.
    }

    const newRequest: CourseCreationRequest = {
      id: 'course-req-' + Date.now(),
      coordinatorName,
      coordinatorEmail:
        coordinatorName.toLowerCase().replace(/\s+/g, '.') + '@coordinator.example.com',
      courseName: courseName.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      languages: addedLanguages,
      sessionTypes: addedSessionTypes,
      locations: addedLocations,
      meetLink: meetLink || undefined,
      timeSlots: addedTimeSlots.length ? addedTimeSlots : undefined,
      description: description.trim(),
      status: 'Pending',
      reasons: '',
      createdAt: new Date().toISOString(),
    };

    courseCreationRequestDriver.create(newRequest);
    alert('Yêu cầu tạo môn học đã được gửi!');
    setTimeout(() => navigate({ to: '/registration-history' }), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="relative h-40 bg-blue-800 p-6 text-white">
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="mt-4 text-3xl font-bold">Create New Course - Coordinator</h1>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-white transition hover:bg-white/30"
            >
              <HistoryIcon className="size-6" />
              <span className="font-medium">Lịch sử</span>
            </button>
          </div>
        </div>
      </header>

      {isHistoryModalOpen && (
        <CourseCreationHistoryModal
          requests={courseCreationRequests}
          onClose={() => setIsHistoryModalOpen(false)}
          onRefresh={() => {
            setIsHistoryModalOpen(false);
            setTimeout(() => setIsHistoryModalOpen(true), 0);
          }}
          onDeleteRequest={(requestId) => courseCreationRequestDriver.remove(requestId)}
        />
      )}
      {isScheduleModalOpen && (
        <ScheduleModal
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          addedTimeSlots={addedTimeSlots}
          setSelectedDate={setSelectedDate}
          setSelectedTime={setSelectedTime}
          setAddedTimeSlots={setAddedTimeSlots}
          onClose={() => setIsScheduleModalOpen(false)}
        />
      )}

      <CoordinatorCourseForm
        courseName={courseName}
        courseCode={courseCode}
        language={language}
        sessionType={sessionType}
        location={location}
        description={description}
        addedLanguages={addedLanguages}
        addedSessionTypes={addedSessionTypes}
        addedLocations={addedLocations}
        meetLink={meetLink}
        addedTimeSlots={addedTimeSlots}
        onCourseNameChange={setCourseName}
        onCourseCodeChange={setCourseCode}
        onLanguageChange={setLanguage}
        onSessionTypeChange={setSessionType}
        onLocationChange={setLocation}
        onDescriptionChange={setDescription}
        onMeetLinkChange={setMeetLink}
        onAddLanguage={() => addIfNotExists(addedLanguages, setAddedLanguages, language)}
        onRemoveLanguage={(id) => removeItem(addedLanguages, setAddedLanguages, id)}
        onAddSessionType={() =>
          addIfNotExists(addedSessionTypes, setAddedSessionTypes, sessionType)
        }
        onRemoveSessionType={(id) => removeItem(addedSessionTypes, setAddedSessionTypes, id)}
        onAddLocation={() => addIfNotExists(addedLocations, setAddedLocations, location)}
        onRemoveLocation={(id) => removeItem(addedLocations, setAddedLocations, id)}
        onRemoveTimeSlot={(id) =>
          setAddedTimeSlots((slots) => slots.filter((slot) => slot.id !== id))
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
