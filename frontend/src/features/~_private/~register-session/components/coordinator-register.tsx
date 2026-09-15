import {
  ChevronDownIcon,
  PlusIcon // [MỚI] Icon cho nút "Thêm"
} from '@heroicons/react/24/solid';
import { useNavigate } from '@tanstack/react-router';
import React, { useState, useRef, useEffect } from 'react';

import { courseCreationRequestDriver, type CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';
import { useJsonData } from '@/services/use-json-data';

// --- BIẾN ĐỔI SVG THÀNH COMPONENT ---
// (Tái sử dụng các SVG bạn đã cung cấp)

// SVG cho icon đầu mỗi danh mục
const SectionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M15.8333 2.5H4.16667C3.24167 2.5 2.5 3.25 2.5 4.16667V15.8333C2.5 16.75 3.24167 17.5 4.16667 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V4.16667C17.5 3.25 16.75 2.5 15.8333 2.5ZM14.1667 10.8333H10.8333V14.1667H9.16667V10.8333H5.83333V9.16667H9.16667V5.83333H10.8333V9.16667H14.1667V10.8333Z" fill="#3D4863" />
  </svg>
);

// SVG cho Ngôn ngữ
const LanguageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2849_lang)"><path d="M4 5H11" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 3V5C9 9.418 6.761 13 4 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 9C4.997 11.144 7.952 12.908 11.7 13" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 20L16 11L20 20" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.0984 18H12.8984" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2849_lang"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// [SỬA] SVG cho Loại hình (dùng SVG Địa điểm, khớp với hình ảnh mới)
const SessionTypeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_type)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_type"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho Địa điểm
const LocationIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1075_2875_loc)"><path d="M4 21V14" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 10V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 21V12" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 8V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21V16" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12V3" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 14H7" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 8H15" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 16H23" stroke="#A3ACC2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    <defs><clipPath id="clip0_1075_2875_loc"><rect width="24" height="24" fill="white" /></clipPath></defs>
  </svg>
);

// SVG cho nút Hẹn giờ (màu trắng)
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13.9987 25.6663C20.442 25.6663 25.6654 20.443 25.6654 13.9997C25.6654 7.55635 20.442 2.33301 13.9987 2.33301C7.55538 2.33301 2.33203 7.55635 2.33203 13.9997C2.33203 20.443 7.55538 25.6663 13.9987 25.6663Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 7V14L18.6667 16.3333" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// SVG cho nút History (màu trắng)
const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M14 23.3333C19.155 23.3333 23.3333 19.155 23.3333 14C23.3333 8.845 19.155 4.66667 14 4.66667C8.845 4.66667 4.66667 8.845 4.66667 14C4.66667 19.155 8.845 23.3333 14 23.3333Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 9.33334V14H18.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.33333 14H4.66667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 7L8.86667 8.86667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);



// --- Định nghĩa kiểu dữ liệu ---
interface DropdownOption {
  id: string;
  name: string;
}

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

      {/* Modal Lịch sử môn học đã tạo */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-700 p-6 text-white">
              <h2 className="text-2xl font-bold">Lịch sử môn học đã tạo</h2>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-lg p-2 hover:bg-white/20"
              >
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
              {courseCreationRequests.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <HistoryIcon className="mx-auto mb-4 size-16 opacity-20" />
                  <p className="text-lg">Chưa có môn học nào được tạo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courseCreationRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-custom-yellow transition hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {request.courseName}
                          </h3>
                          <p className="text-sm text-gray-500">Mã: {request.courseCode}</p>
                        </div>
                         {/* <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${request.status === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {request.status === 'Approved' ? 'Đã duyệt' : request.status === 'Rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                        </span> */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa môn học "${request.courseName}"?`)) {
                              if (courseCreationRequestDriver.remove(request.id)) {
                                // Force re-render by closing and reopening modal
                                setIsHistoryModalOpen(false);
                                setTimeout(() => setIsHistoryModalOpen(true), 0);
                              }
                            }
                          }}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                          title="Xóa môn học"
                        >
                          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      {/* <div className="mb-4 flex items-center text-sm text-gray-600">
                        <span className="ml-4 border p-2 text-sm italic text-gray-600">"{request.reasons}"</span>
                      </div> */}

                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="line-clamp-2">{request.description}</p>

                        <div className="flex flex-wrap gap-4 pt-2">
                          {request.languages.length > 0 && (
                            <div className="flex items-center gap-2">
                              <LanguageIcon className="size-4" />
                              <span>{request.languages.map(l => l.name).join(', ')}</span>
                            </div>
                          )}

                          {request.sessionTypes.length > 0 && (
                            <div className="flex items-center gap-2">
                              <SessionTypeIcon className="size-4" />
                              <span>{request.sessionTypes.map(t => t.name).join(', ')}</span>
                            </div>
                          )}

                          {/* {request.timeSlots && request.timeSlots.length > 0 && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="size-4" />
                              <span>{request.timeSlots.length} khung giờ</span>
                            </div>
                          )} */}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                          <span>Tạo bởi: {request.coordinatorName}</span>
                          <span>
                            {new Date(request.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Hẹn giờ */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold text-gray-800">Thêm lịch dạy</h2>

            <div className="space-y-4">
              {/* Date picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Chọn ngày</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="Chọn ngày dạy"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Time picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Chọn giờ</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  placeholder="Chọn giờ dạy"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Display added time slots */}
              {addedTimeSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Các khung giờ đã thêm:</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {addedTimeSlots.map(slot => (
                      <div key={slot.id} className="flex items-center justify-between rounded bg-blue-50 px-3 py-2 text-sm">
                        <span>{slot.date} - {slot.time}</span>
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
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedDate && selectedTime) {
                    const newSlot = {
                      id: `slot-${Date.now()}`,
                      date: selectedDate,
                      time: selectedTime
                    };
                    setAddedTimeSlots([...addedTimeSlots, newSlot]);
                    setSelectedDate('');
                    setSelectedTime('');
                  }
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
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

// --- CÁC COMPONENT FORM HELPER ---

// Helper: FormSection
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}
function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
        <SectionIcon />
        {title}
      </label>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Helper: FormInput (Dùng cho Môn học)
// interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//   icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
// }
// function FormInput({ icon, ...props }: FormInputProps) {
//   return (
//     <div className="relative">
//       <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
//         {React.cloneElement(icon, { className: "h-5 w-5 text-gray-400" })}
//       </div>
//       <input
//         type="text"
//         className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
//         {...props}
//       />
//     </div>
//   );
// }

// Helper: FormTextArea
function FormTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
      {...props}
    />
  );
}

// Helper: FormDropdown (Dropdown tùy chỉnh)
interface FormDropdownProps {
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  options: DropdownOption[];
  selected: DropdownOption;
  onSelect: (option: DropdownOption) => void;
}
function FormDropdown({ icon, options, selected, onSelect }: FormDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="relative w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-12 pr-10 text-left text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {React.cloneElement(icon, { className: "h-5 w-5 text-gray-400" })}
        </span>
        <span className="block truncate">{selected.name}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <ChevronDownIcon className={`size-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-1">
            {options.map((option) => (
              <li
                key={option.id}
                className={`cursor-pointer px-4 py-2 text-gray-900 ${option.id === selected.id
                  ? 'bg-blue-700 text-white'
                  : 'hover:bg-blue-50'
                  }`}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                {option.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// [MỚI] Helper: Nút "Thêm"
function AddButton({ title, onClick }: { title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 p-1 text-sm font-medium text-blue-700 hover:text-blue-800"
    >
      <PlusIcon className="size-4" />
      {title}
    </button>
  );
}
