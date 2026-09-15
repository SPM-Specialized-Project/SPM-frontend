import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { UserCircleIcon } from '@heroicons/react/24/solid'
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

import { courseDriver } from '@/components/data/~mock-courses'
import { getAllNames } from '@/components/data/~mock-names'
import { saveSession, type SessionMember } from '@/components/data/~mock-session'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

export const Route = createFileRoute('/_private/schedule/request/')({
  beforeLoad: async () => {
    // check 'role' in localStorage
    document.title = 'Tạo buổi học mới -  Tutor Support System';
    const role = localStorage.getItem('role') || 'student'
    if (role !== 'tutor') {
      // Redirect to /schedule if not tutor
      throw new Response('Redirect', {
        status: 302,
        headers: { Location: '/schedule' },
      })
    }
  },
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      courseId: (search.courseId as string) || '',
      title: (search.title as string) || '',
      desc: (search.desc as string) || '',
      requestType: (search.requestType as string) || '',
    }
  },
})

// === COMPONENT CHÍNH CỦA TRANG ===
function RouteComponent() {
  const navigate = useNavigate()
  const searchParams = useSearch({ from: '/_private/schedule/request/' })
  const courses = useJsonData(courseDriver)
  
  // Form states
  const [title, setTitle] = useState(searchParams.title || '')
  const [courseId, setCourseId] = useState(searchParams.courseId || '')
  const [method, setMethod] = useState<'offline' | 'online'>('offline')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set())

  // Get all available names
  const allNames = getAllNames()

  // Update form fields when query params are present
  useEffect(() => {
    if (searchParams.courseId) setCourseId(searchParams.courseId)
    if (searchParams.title) setTitle(searchParams.title)
    // Note: desc and requestType from URL are available but not used in this form
    // You can add state for them if needed
  }, [searchParams])

  const toggleMember = (id: number) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      toast.error('Vui lòng nhập chủ đề buổi học')
      return
    }
    if (!courseId) {
      toast.error('Vui lòng chọn khóa học')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Vui lòng chọn thời gian học')
      return
    }
    if (selectedMembers.size === 0) {
      toast.error('Vui lòng chọn ít nhất một học sinh')
      return
    }

    // Create session object
    const members: SessionMember[] = allNames
      .filter((n) => selectedMembers.has(n.id))
      .map((n) => ({
        id: n.id,
        name: n.name,
        present: false, // Default to not present yet
      }))

    const course = courses.find((c) => c.id === courseId)

    const newSession = {
      id: `s-${Date.now().toString(36)}`,
      courseId,
      title,
      courseTitle: course?.title ?? 'Unknown Course',
      instructor: course?.instructor ?? 'TBD',
      method,
      link: method === 'online' ? 'https://meet.example.com/new-session' : undefined,
      location: method === 'offline' ? 'Phòng học TBA' : undefined,
      start: new Date(startDate).toISOString(),
      end: new Date(endDate).toISOString(),
      members,
      status: 'scheduled' as const,
      requestType: 'new' as const,
      createdAt: new Date().toISOString(),
    }

    saveSession(newSession)
    toast.success('Tạo buổi học thành công!')
    navigate({ to: '/schedule' })
  }

  return (
    <StudyLayout>
      <div className="min-h-screen bg-gray-50">
        {/* 1. Header "Quay lại" */}
        <Link
          to="/schedule"
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>

        {/* 2. Nội dung chính */}
        <main className=" p-4 md:p-8">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            Tạo buổi học mới
          </h1>

          {/* 3. Form */}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-8">

              {/* Section: Thông tin cơ bản */}
              <BasicInfoSection
                title={title}
                setTitle={setTitle}
                courseId={courseId}
                setCourseId={setCourseId}
                method={method}
                setMethod={setMethod}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                courses={courses}
              />

              {/* Section: Chọn học sinh */}
              <StudentSelectionSection
                allNames={allNames}
                selectedMembers={selectedMembers}
                toggleMember={toggleMember}
              />

              {/* Section: Nút bấm */}
              <FormActions />

            </div>
          </form>
        </main>
      </div>
    </StudyLayout>
  )
}

// --- CÁC SECTION CỦA TRANG ---

/**
 * Section 1: Thông tin cơ bản (Card có sóng)
 */
interface BasicInfoSectionProps {
  courses: ReadonlyArray<{ id: string; title: string }>
  title: string
  setTitle: (v: string) => void
  courseId: string
  setCourseId: (v: string) => void
  method: 'offline' | 'online'
  setMethod: (v: 'offline' | 'online') => void
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
}

function BasicInfoSection({
  courses,
  title,
  setTitle,
  courseId,
  setCourseId,
  method,
  setMethod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: BasicInfoSectionProps) {
  function BannerWave() {
    return (
      <svg
        className="absolute right-0 top-0 w-[960px]"
        viewBox="0 0 960 227"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
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
    );
  }

  // const [sessionType, setSessionType] = useState('offline');

  return (
    <div className="relative overflow-hidden rounded-lg bg-white shadow-md">
      {/* Sóng trang trí */}
      <div className="absolute right-0 top-0 h-32 w-2/3">
        <BannerWave />
      </div>

      {/* Nội dung form (đè lên trên sóng) */}
      <div className="relative space-y-6 p-6 md:p-8">
        {/* Header card */}
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Thông tin cơ bản
          </h2>
          <div className="flex items-center gap-2">
            <svg
              className="inline-block w-40"
              viewBox="0 0 180 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <mask id="mask0_1144_1246" maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
                <rect width="40" height="40" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_1144_1246)">
                <rect x="12.8945" y="5.82031" width="30" height="10" transform="rotate(45 12.8945 5.82031)" fill="#F59E0B" />
                <rect x="34.1055" y="12.8906" width="30" height="10" transform="rotate(135 34.1055 12.8906)" fill="#F59E0B" />
              </g>
              <path d="M67.998 4C76.8346 4 83.998 11.1634 83.998 20C83.998 28.8366 76.8346 36 67.998 36C59.1615 36 51.998 28.8366 51.998 20C51.998 11.1634 59.1615 4 67.998 4ZM67.999 13C64.133 13 60.999 16.134 60.999 20C60.9991 23.8659 64.1331 27 67.999 27C71.8648 26.9998 74.9989 23.8658 74.999 20C74.999 16.1341 71.8649 13.0002 67.999 13Z" fill="#1E40AF" />
              <mask id="mask1_1144_1246" maskUnits="userSpaceOnUse" x="96" y="0" width="40" height="40">
                <rect x="96" width="40" height="40" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask1_1144_1246)">
                <rect x="108.894" y="5.82031" width="30" height="10" transform="rotate(45 108.894 5.82031)" fill="#F59E0B" />
                <rect x="130.104" y="12.8906" width="30" height="10" transform="rotate(135 130.104 12.8906)" fill="#F59E0B" />
              </g>
              <path d="M164.002 4C172.839 4 180.002 11.1634 180.002 20C180.002 28.8366 172.839 36 164.002 36C155.165 36 148.002 28.8366 148.002 20C148.002 11.1634 155.165 4 164.002 4ZM164.003 13C160.137 13 157.003 16.134 157.003 20C157.003 23.8659 160.137 27 164.003 27C167.869 26.9998 171.003 23.8658 171.003 20C171.003 16.1341 167.869 13.0002 164.003 13Z" fill="#1E40AF" />
            </svg>
          </div>
        </div>

        {/* Các trường input */}
        <FormInput
          label="Chủ đề buổi học (*):"
          id="topic"
          placeholder="Nhập chủ đề..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <FormSelect
          label="Khóa học (*):"
          id="course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">Chọn khóa học</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </FormSelect>

        {/* Radio buttons */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Loại hình (*):
          </label>
          <div className="flex items-center gap-6">
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="sessionType"
                value="online"
                checked={method === 'online'}
                onChange={(e) => setMethod(e.target.value as 'online')}
                className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-800">online</span>
            </label>
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="sessionType"
                value="offline"
                checked={method === 'offline'}
                onChange={(e) => setMethod(e.target.value as 'offline')}
                className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-800">offline</span>
            </label>
          </div>
        </div>

        {/* Time Range */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Thời gian học (*):
          </label>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative w-full">
              <input
                aria-label="Chọn giờ bắt đầu"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              <CalendarDaysIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
            </div>
            <span className="hidden font-bold text-gray-500 sm:block">−</span>
            <div className="relative w-full">
              <input
                aria-label="Chọn giờ kết thúc"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
              <CalendarDaysIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

/**
 * Section 2: Chọn học sinh tham gia
 */
interface StudentSelectionSectionProps {
  allNames: Array<{ id: number; name: string; present: boolean }>
  selectedMembers: Set<number>
  toggleMember: (id: number) => void
}

function StudentSelectionSection({
  allNames,
  selectedMembers,
  toggleMember,
}: StudentSelectionSectionProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">
          Chọn học sinh tham gia
        </h2>
        <span className="text-sm text-gray-600">
          Đã chọn: {selectedMembers.size}/{allNames.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {allNames.map((member) => {
          const isSelected = selectedMembers.has(member.id)
          return (
            <div
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="relative shrink-0">
                <UserCircleIcon
                  className={`size-8 transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'
                  }`}
                />
                {isSelected && (
                  <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-blue-600">
                    <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                {member.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Section 3: Nút bấm (Hủy, Tạo)
 */
function FormActions() {
  return (
    <div className="mt-4 flex justify-end gap-4">
      <Link
        to="/schedule"
        className="rounded-md border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
      >
        Hủy bỏ
      </Link>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Tạo buổi học
      </button>
    </div>
  );
}

// --- COMPONENT HELPER ---

/**
 * Component Input có nhãn
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

function FormInput({ label, id, ...props }: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type="text"
        id={id}
        {...props}
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      />
    </div>
  );
}

/**
 * Component Select có nhãn
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
}

function FormSelect({ label, id, children, ...props }: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          {...props}
          className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
      </div>
    </div>
  );
}
