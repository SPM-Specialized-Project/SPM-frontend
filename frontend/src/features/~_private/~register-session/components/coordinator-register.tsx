import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { courseCreationRequestDriver, type CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';
import { useJsonData } from '@/services/use-json-data';

import {
  AddButton,
  FormDropdown,
  FormSection,
  FormTextArea,
  type DropdownOption,
} from './coordinator-form-controls';
import {
  ClockIcon,
  HistoryIcon,
  LanguageIcon,
  LocationIcon,
  SessionTypeIcon,
} from './coordinator-icons';
import { CourseCreationHistoryModal } from './course-creation-history-modal';
import { ScheduleModal } from './schedule-modal';

// --- BIẾN ĐỔI SVG THÀNH COMPONENT ---
// (Tái sử dụng các SVG bạn đã cung cấp)

// SVG cho icon đầu mỗi danh mục
// --- Định nghĩa kiểu dữ liệu ---
const sessionTypeOptions: DropdownOption[] = [
  { id: 'online', name: 'Học trực tiếp' },
  { id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' },
];

// === COMPONENT CHÍNH ===

export function CoordinatorRegister() {
  const courseCreationRequests = useJsonData(courseCreationRequestDriver);

  // State cho form - Coordinator tạo môn học mới
  const [courseName, setCourseName] = useState(''); // Tên môn học
  const [courseCode, setCourseCode] = useState(''); // Mã môn học
  const [language, setLanguage] = useState(mockLanguages[0]);
  const [sessionType, setSessionType] = useState(sessionTypeOptions[0]);
  const [location, setLocation] = useState(mockLocations[0]); // Mặc định Phường 1
  const [description, setDescription] = useState(''); // Mô tả môn học

  const navigate = useNavigate();

  // Local arrays for items the coordinator adds
  const [addedLanguages, setAddedLanguages] = useState<DropdownOption[]>([]);
  const [addedSessionTypes, setAddedSessionTypes] = useState<DropdownOption[]>([]);
  const [addedLocations, setAddedLocations] = useState<DropdownOption[]>([]);
  const [meetLink, setMeetLink] = useState<string>("");

  // State cho modal hẹn giờ
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [addedTimeSlots, setAddedTimeSlots] = useState<Array<{ id: string; date: string; time: string }>>([]);

  // State cho modal xem history
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Lock body scroll while any modal is open
  useLockBodyScroll(!!(isScheduleModalOpen || isHistoryModalOpen));

  // Helpers for adding/removing items (avoid duplicates)
  const addIfNotExists = (list: DropdownOption[], setter: (v: DropdownOption[]) => void, item: DropdownOption) => {
    if (!list.find(l => l.id === item.id && l.name === item.name)) {
      setter([item, ...list]);
    }
  };

  const removeItem = (list: DropdownOption[], setter: (v: DropdownOption[]) => void, id: string) => {
    setter(list.filter(i => i.id !== id));
  };

  return (

    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="relative h-40 bg-blue-800 p-6 text-white">

        <div className="relative z-10 flex items-center justify-between">
          <h1 className="mt-4 text-3xl font-bold">
            Create New Course - Coordinator
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-white transition hover:bg-white/30"
            >
              <HistoryIcon className="size-6" />
              <span className="font-medium">Lịch sử</span>
            </button>
            {/* <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-white transition hover:bg-white/30"
            >
              <ClockIcon className="size-6" />
              <span className="font-medium">Thêm lịch học</span>
            </button> */}
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
      {/* Form Content */}
      <main className="p-6">
        <form
          className="relative rounded-lg bg-white shadow-lg"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Container cho các trường */}
          <div className="space-y-8 p-8">

            {/* Tên môn học */}
            <FormSection title="Tên môn học">
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Nhập tên môn học..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
              />
            </FormSection>

            {/* Mã môn học */}
            <FormSection title="Mã môn học">
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="Ví dụ: CS401, IT302..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
              />
            </FormSection>

            {/* [SỬA] Ngôn ngữ (Dropdown + Nút Thêm) */}
            <FormSection title="Ngôn ngữ">
              <FormDropdown
                icon={<LanguageIcon className="size-5" />}
                options={mockLanguages}
                selected={language}
                onSelect={setLanguage}
              />
              <AddButton title="Thêm ngôn ngữ" onClick={() => addIfNotExists(addedLanguages, setAddedLanguages, language)} />

              {addedLanguages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {addedLanguages.map(l => (
                    <span key={l.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {l.name}
                      <button type="button" onClick={() => removeItem(addedLanguages, setAddedLanguages, l.id)} className="text-gray-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </FormSection>

            {/* [SỬA] Loại hình (Dropdown + Nút Thêm, icon mới) */}
            <FormSection title="Loại hình">
              <FormDropdown
                icon={<SessionTypeIcon className="size-5" />}
                options={sessionTypeOptions}
                selected={sessionType}
                onSelect={setSessionType}
              />
              <AddButton title="Thêm loại hình" onClick={() => addIfNotExists(addedSessionTypes, setAddedSessionTypes, sessionType)} />

              {addedSessionTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {addedSessionTypes.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {t.name}
                      <button type="button" onClick={() => removeItem(addedSessionTypes, setAddedSessionTypes, t.id)} className="text-gray-500">✕</button>
                    </span>
                  ))}
                </div>
              )}
            </FormSection>

            {/* [SỬA] Địa điểm (Chỉ hiện khi đã thêm "Học trực tiếp") */}
            {addedSessionTypes.some(t => t.id === 'online') && (
              <FormSection title="Địa điểm">
                <FormDropdown
                  icon={<LocationIcon className="size-5" />}
                  options={mockLocations}
                  selected={location}
                  onSelect={setLocation}
                />
                <div className="mt-2">
                  <AddButton title="Thêm địa điểm" onClick={() => addIfNotExists(addedLocations, setAddedLocations, location)} />
                  {addedLocations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {addedLocations.map(l => (
                        <span key={l.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
                          {l.name}
                          <button type="button" onClick={() => removeItem(addedLocations, setAddedLocations, l.id)} className="text-gray-500">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            {/* Link meet cho các loại hình hybrid (Chỉ hiện khi đã thêm "Học trực tiếp kết hợp trực tuyến") */}
            {addedSessionTypes.some(t => t.id === 'hybrid') && (
              <FormSection title="Link buổi học trực tuyến">
                <input
                  type="text"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder="https://meet.example.com/abc-123"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
                />
              </FormSection>
            )}

            {/* Mô tả môn học */}
            <FormSection title="Mô tả môn học">
              <FormTextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả chi tiết về môn học, nội dung, mục tiêu..."
                rows={8}
              />
            </FormSection>

            {/* Hiển thị các khung giờ đã hẹn */}
            {addedTimeSlots.length > 0 && (
              <FormSection title="Lịch dạy đã thêm">
                <div className="space-y-2">
                  {addedTimeSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-blue-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClockIcon className="size-5" />
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(slot.date).toLocaleDateString('vi-VN')} - {slot.time}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddedTimeSlots(addedTimeSlots.filter(s => s.id !== slot.id))}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </FormSection>
            )}
          </div>

          {/* Footer Nút bấm (Giữ nguyên) */}
          <div className="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-6">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
              onClick={() => {
                // Validate required fields
                if (!courseName.trim() || !courseCode.trim()) {
                  alert('Vui lòng nhập tên môn học và mã môn học');
                  return;
                }

                // Get coordinator name from localStorage if available
                let coordinatorName = 'Anonymous Coordinator';
                try {
                  const rawUserStore = localStorage.getItem('userStore');
                  const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
                  const State = userStore?.state ?? null;
                  const userLocalStore = State?.user ?? null;
                  coordinatorName = userLocalStore?.firstName ?? coordinatorName;
                } catch {
                  // ignore
                }

                const coordinatorEmail = coordinatorName.toLowerCase().replace(/\s+/g, '.') + '@coordinator.example.com';

                const newRequest: CourseCreationRequest = {
                  id: `course-req-${Date.now()}`,
                  coordinatorName,
                  coordinatorEmail,
                  courseName: courseName.trim(),
                  courseCode: courseCode.trim().toUpperCase(),
                  languages: addedLanguages.length ? addedLanguages : [],
                  sessionTypes: addedSessionTypes.length ? addedSessionTypes : [],
                  locations: addedLocations.length ? addedLocations : [],
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
              }}
            >
              Tạo môn học
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
