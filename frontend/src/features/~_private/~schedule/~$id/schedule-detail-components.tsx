import {
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { Link } from '@tanstack/react-router';
import React from 'react';

export type AttendanceState = {
  [memberId: string]: 'present' | 'absent'
};

// --- CÁC SECTION CỦA TRANG ---

/**
 * Section 1: Thông tin cơ bản
 */
interface BasicInfoProps {
  courses: ReadonlyArray<{ id: string; title: string }>
  title: string
  courseId: string
  courseTitle: string
  sessionType: 'offline' | 'online'
  startLocal: string
  endLocal: string
  onTitleChange: (v: string) => void
  onCourseIdChange: (v: string) => void
  onSessionTypeChange: (v: 'offline' | 'online') => void
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  link: string
  locationVal: string
  onLinkChange: (v: string) => void
  onLocationChange: (v: string) => void
}

export function BasicInfoSection({
  courses,
  title,
  courseId,
  sessionType,
  startLocal,
  endLocal,
  link,
  locationVal,
  onTitleChange,
  onCourseIdChange,
  onSessionTypeChange,
  onStartChange,
  onEndChange,
  onLinkChange,
  onLocationChange,
}: BasicInfoProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-white shadow-md">
      {/* Sóng trang trí */}
      <BannerWave />

      {/* Nội dung form (đè lên trên sóng) */}
      <div className="relative space-y-6 p-6 md:p-8">
        {/* Header card */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Thông tin cơ bản</h2>
        </div>

        {/* Các trường input */}
        {/* Controlled inputs are passed down via DOM IDs and form state in parent; here we render uncontrolled placeholders to keep markup simple. */}
        <FormInput
          label="Chủ đề buổi học (*):"
          id="topic"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />

        <FormSelect
          label="Khóa học (*):"
          id="course"
          value={courseId}
          onChange={(e) => onCourseIdChange(e.target.value)}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} - {c.title}
            </option>
          ))}
        </FormSelect>

        {/* Radio buttons */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Loại hình (*):</label>
          <div className="flex items-center gap-6">
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="sessionType"
                value="offline"
                checked={sessionType === 'offline'}
                onChange={() => onSessionTypeChange('offline')}
                className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="session-type-offline"
              />
              <span className="ml-2 text-sm text-gray-800">offline</span>
            </label>
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="sessionType"
                value="online"
                checked={sessionType === 'online'}
                onChange={() => onSessionTypeChange('online')}
                className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="session-type-online"
              />
              <span className="ml-2 text-sm text-gray-800">online</span>
            </label>

          </div>
        </div>

        {/* Time Range */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Thời gian học (*):</label>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="w-full">
              <input
                id="start"
                name="start"
                aria-label="start"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => onStartChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <span className="hidden font-bold text-gray-500 sm:block">−</span>
            <div className="w-full">
              <input
                id="end"
                name="end"
                aria-label="end"
                type="datetime-local"
                value={endLocal}
                onChange={(e) => onEndChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Conditional: link or location depending on sessionType */}
        {sessionType === 'online' ? (
          <div>
            <FormInput
              label="Link buổi học (Meet):"
              id="link"
              value={link}
              onChange={(e) => onLinkChange(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <FormInput
              label="Địa điểm:"
              id="location"
              value={locationVal}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder='Phòng học, địa chỉ cụ thể...'
            >
            </FormInput>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Section 2: Điểm danh
 */
interface AttendanceProps {
  members: ReadonlyArray<{ id: string; name: string }>
  attendance: AttendanceState
  onAttendanceChange: (memberId: string, status: 'present' | 'absent') => void
}
export function AttendanceSection({ members, attendance, onAttendanceChange }: AttendanceProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Điểm danh</h2>
      <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col items-center text-center">
            <UserCircleIcon className="size-10 text-gray-400" />
            <span className="mt-1 text-xs text-gray-700">{member.name}</span>
            <div className="mt-2 space-y-1">
              <label className="flex cursor-pointer items-center text-sm">
                <input
                  type="radio"
                  name={`attendance-${member.id}`}
                  value="present"
                  checked={attendance[member.id] === 'present'}
                  onChange={() => onAttendanceChange(member.id, 'present')}
                  className="size-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1.5">Có mặt</span>
              </label>
              <label className="flex cursor-pointer items-center text-sm">
                <input
                  type="radio"
                  name={`attendance-${member.id}`}
                  value="absent"
                  checked={attendance[member.id] === 'absent'}
                  onChange={() => onAttendanceChange(member.id, 'absent')}
                  className="size-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1.5">Vắng mặt</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Section 3: Nút bấm (Xóa, Hủy, Lưu)
 */
export function FormActions({ onSave, onDelete }: { onSave?: () => void; onDelete?: () => void }) {
  return (
    <div className="mt-4 flex justify-between gap-4">
      {onDelete && (
        <button
          onClick={onDelete}
          type="button"
          className="rounded-md bg-red-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Xóa buổi học
        </button>
      )}
      <div className="ml-auto flex gap-4">
        <Link
          to="/schedule"
          className="rounded-md border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        >
          Hủy bỏ
        </Link>
        <button
          onClick={onSave}
          type="button"
          className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Lưu
        </button>
      </div>
    </div>
  )
}

// --- COMPONENT SÓNG SVG (TỪ BẠN) ---
export function BannerWave() {
  return (
    <svg className="absolute right-0 top-0 h-32 w-2/3" viewBox="0 0 960 227" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <mask id="mask0_1144_864" maskUnits="userSpaceOnUse" x="0" y="0" width="960" height="227">
        <rect x="960" y="227" width="960" height="227" rx="8" transform="rotate(180 960 227)" fill="#1E40AF" />
      </mask>
      <g mask="url(#mask0_1144_864)">
        <g filter="url(#filter0_i_1144_864)">
          <path d="M960 204.301V0.000778198H80C80 0.000778198 410 9.6149 520 102.151C630 194.687 960 204.301 960 204.301Z" fill="#D97706" />
        </g>
        <g filter="url(#filter1_i_1144_864)">
          <path d="M960 204.301V0.000762939H320C320 0.000762939 560 9.6149 640 102.151C720 194.687 960 204.301 960 204.301Z" fill="#1E40AF" />
        </g>
      </g>
      <defs>
        <filter id="filter0_i_1144_864" x="80" y="0" width="880" height="208.301" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_1144_864" />
        </filter>
        <filter id="filter1_i_1144_864" x="320" y="0" width="640" height="208.301" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_1144_864" />
        </filter>
      </defs>
    </svg>
  )
}


// --- COMPONENT HELPER ---
/**
 * Component Input có nhãn
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
}

function FormInput({ label, id, ...props }: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input type="text" id={id} {...props} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
    </div>
  )
}

/**
 * Component Input có icon (dùng cho Date/Time)
 */
// function FormInputWithIcon(props: React.InputHTMLAttributes<HTMLInputElement>) {
//   return (
//     <div className="relative w-full">
//       <input type="text" {...props} className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
//       <CalendarDaysIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
//     </div>
//   )
// }

/**
 * Component Select có nhãn
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  id: string
}

function FormSelect({ label, id, children, ...props }: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <select id={id} {...props} className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-blue-500">
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
      </div>
    </div>
  )
}
