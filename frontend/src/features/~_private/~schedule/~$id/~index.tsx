import {
  ArrowLeftIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { UserCircleIcon } from '@heroicons/react/24/solid'
import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

import { courseDriver } from '@/components/data/~mock-courses'
import { getAllNames } from '@/components/data/~mock-names'
import { sessionDriver, updateSession, deleteSession, Session } from '@/components/data/~mock-session'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

export const Route = createFileRoute('/_private/schedule/$id/')({
  beforeLoad: async () => {
    document.title = 'Chi tiết buổi học -  Tutor Support System';
  },
  component: RouteComponent,
})

// === DỮ LIỆU GIẢ ===
// Dữ liệu giả cho 11 thành viên (dùng khi session không có members)

// Kiểu dữ liệu cho trạng thái điểm danh
type AttendanceState = {
  [memberId: string]: 'present' | 'absent'
}

// === COMPONENT CHÍNH CỦA TRANG ===
function RouteComponent() {
  // Lấy ID từ URL
  const { id } = useParams({ from: Route.id })
  const navigate = useNavigate()
  const sessions = useJsonData(sessionDriver)
  const courses = useJsonData(courseDriver)

  // load session from backend-backed driver
  const session = id ? sessions.find((item) => item.id === id) : undefined
  // Build a shared mock members fallback (synchronized across components)
  const mockMembers = getAllNames().map((m) => ({ id: String(m.id), name: m.name }))

  // build a members list normalized to { id: string; name: string }
  const membersList = session?.members?.map((m) => ({ id: String(m.id), name: m.name })) ?? mockMembers

  // State cho các trường trong form
  const [sessionType, setSessionType] = useState<'offline' | 'online'>('offline')
  const [attendance, setAttendance] = useState<AttendanceState>({})
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [startLocal, setStartLocal] = useState('') // datetime-local value
  const [endLocal, setEndLocal] = useState('')
  const [link, setLink] = useState('')
  const [locationVal, setLocationVal] = useState('')
  const [tutorNote, setTutorNote] = useState('')

  // const rawUserStore = localStorage.getItem('userStore');
  // const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
  // const State = userStore?.state ?? null;
  // const userLocalStore = State?.user ?? null;
  const rawRole = localStorage.getItem('role');
  const isManager = rawRole === 'tutor';
  // Helpers to convert ISO <-> input[type=datetime-local] value
  const toInputLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  const toISOFromLocal = (local?: string) => {
    if (!local) return ''
    // local is like 'YYYY-MM-DDTHH:mm'
    const d = new Date(local)
    return d.toISOString()
  }

  // Initialize attendance and form fields when session or membersList changes
  useEffect(() => {
    const initialState: AttendanceState = {}
    if (session?.members && session.members.length) {
      session.members.forEach((m) => {
        initialState[String(m.id)] = m.present ? 'present' : 'absent'
      })
    } else {
      membersList.forEach((m) => {
        initialState[m.id] = 'present'
      })
    }
    setAttendance(initialState)

    // initialize form fields from session
    setTitle(session?.title ?? '')
    setCourseId(session?.courseId ?? '')
    setSessionType((session?.method ?? 'offline') as 'offline' | 'online')
    setStartLocal(toInputLocal(session?.start))
    setEndLocal(toInputLocal(session?.end))
    setLink(session?.link ?? '')
    setLocationVal(session?.location ?? '')
    setTutorNote((session as Session | undefined)?.tutorNote ?? '')

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session])

  // Handler để cập nhật điểm danh
  const handleAttendanceChange = (
    memberId: string,
    status: 'present' | 'absent'
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [memberId]: status,
    }))
  }

  // Save handler: update session.members.present according to attendance map
  const handleSaved = () => {
    if (!session) {
      toast.error('Không tìm thấy buổi học để lưu')
      return
    }

    // Map existing session members and sync 'present' flag from attendance.
    // If the user hasn't changed a member's attendance, preserve the existing value
    // from the session (m.present). This lets the page respect prior state and
    // also correctly handle when the user marks someone as "vắng mặt".
    const updatedMembers = session.members.map((m) => {
      const key = String(m.id)
      const att = attendance[key]
      const present = att === 'present' ? true : att === 'absent' ? false : (m.present ?? true)
      return { ...m, present }
    })

    // Build patch with updated members and basic fields
    const patch: Partial<typeof session> = {
      members: updatedMembers,
      method: sessionType as Session['method'],
      title: title,
      courseId: courseId,
      start: toISOFromLocal(startLocal),
      end: toISOFromLocal(endLocal),
      // Include link/location depending on selected method
      link: sessionType === 'offline' ? link || undefined : undefined,
      location: sessionType === 'online' ? locationVal || undefined : undefined,
    }

    updateSession(session.id, patch)
    toast.success('Lưu điểm danh thành công')
    // Navigate back to history page
    navigate({ to: '/schedule' })
  }

  const handleDelete = () => {
    if (!session) {
      toast.error('Không tìm thấy buổi học để xóa')
      return
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa buổi học "${session.title}"?`)) {
      const success = deleteSession(session.id)
      if (success) {
        toast.success('Đã xóa buổi học thành công')
        navigate({ to: '/schedule' })
      } else {
        toast.error('Không thể xóa buổi học')
      }
    }
  }

  // Save tutor note after session time
  const handleSaveTutorNote = () => {
    if (!session) {
      toast.error('Không tìm thấy buổi học để lưu ghi chú')
      return
    }
    updateSession(session.id, { tutorNote })
    toast.success('Ghi chú đã được lưu')
  }

  if (!isManager) {
    return (
      <StudyLayout>
        <div className="min-h-screen bg-gray-50">
          <Link
            to="/schedule"
            className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
          >
            <ArrowLeftIcon className="size-5" />
            <span className="font-medium">Quay lại</span>
          </Link>

          <main className="p-4 md:p-8">
            <h1 className="mb-8 text-3xl font-bold text-gray-900">Chi tiết buổi học (ID: {id})</h1>

            <div className="flex flex-col gap-8">
              {/* Read-only view for students */}
              <div className="relative overflow-hidden rounded-lg bg-white shadow-md">
                <BannerWave />

                <div className="relative space-y-6 p-6 md:p-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Thông tin buổi học</h2>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                      Chỉ xem
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-600">Chủ đề:</label>
                      <p className="text-base text-gray-900">{session?.title || 'Chưa có thông tin'}</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-600">Tên môn học</label>
                      <p className="text-base text-gray-900">{session?.courseTitle || 'Chưa có thông tin'}</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-600">Khóa học:</label>
                      <p className="text-base text-gray-900">{session?.courseId || 'Chưa có thông tin'}</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-600">Loại hình:</label>
                      <p className="text-base text-gray-900">{session?.method === 'online' ? 'Online' : 'Offline'}</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-600">Thời gian:</label>
                      <p className="text-base text-gray-900">
                        {session?.start ? new Date(session.start).toLocaleString('vi-VN') : 'Chưa xác định'} - {session?.end ? new Date(session.end).toLocaleString('vi-VN') : 'Chưa xác định'}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-600">Mô tả:</label>
                      <p className="text-base text-gray-900">{session?.desc || 'Không có mô tả'}</p>
                    </div>


                    {session?.method === 'online' && session?.link && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">Link buổi học:</label>
                        <a href={session.link} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 hover:underline">
                          {session.link}
                        </a>
                      </div>
                    )}

                    {session?.method === 'offline' && session?.location && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">Địa điểm:</label>
                        <p className="text-base text-gray-900">{session.location}</p>
                      </div>
                    )}

                    {session?.tutorNote && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-600">Ghi chú của giảng viên:</label>
                        <Link
                          to={session.tutorNote}
                          className="whitespace-pre-wrap text-base text-blue-600 ">{session.tutorNote}</Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Members list - read only */}
              <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
                <h2 className="mb-6 text-xl font-semibold text-gray-800">Danh sách thành viên</h2>
                <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                  {membersList.map((member) => {
                    const memberData = session?.members?.find(m => String(m.id) === member.id)
                    const isPresent = memberData?.present ?? true

                    return (
                      <div key={member.id} className="flex flex-col items-center text-center">
                        <UserCircleIcon className="size-10 text-gray-400" />
                        <span className="mt-1 text-xs text-gray-700">{member.name}</span>
                        <span className={`mt-2 rounded-full px-2 py-1 text-xs font-medium ${isPresent
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {isPresent ? 'Có mặt' : 'Vắng mặt'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </main>
        </div>
      </StudyLayout>
    )
  }

  return (
    <StudyLayout>
      <div className="min-h-screen bg-gray-50">
        <Link
          to="/schedule"
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>

        {/* 2. Nội dung chính */}
        <main className=" p-4 md:p-8">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Chỉnh sửa buổi học (ID: {id})</h1>

          {/* 3. Form */}
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-8">

              {/* Section: Thông tin cơ bản */}
              {/* <BasicInfoSection session={session} sessionType={sessionType} onSessionTypeChange={setSessionType} /> */}
              <BasicInfoSection
                title={title}
                courseId={courseId}
                courseTitle={session?.courseTitle || ''}
                sessionType={sessionType}
                startLocal={startLocal}
                endLocal={endLocal}
                link={link}
                locationVal={locationVal}
                onTitleChange={setTitle}
                onCourseIdChange={setCourseId}
                onSessionTypeChange={setSessionType}
                onStartChange={setStartLocal}
                onEndChange={setEndLocal}
                onLinkChange={setLink}
                onLocationChange={setLocationVal}
                courses={courses}
              />
              {/* Tutor note panel appears only after session end */}
              {session && new Date(session.end).getTime() < Date.now() && (
                <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
                  <h2 className="mb-4 text-xl font-semibold text-gray-800">Ghi chú cho tutor</h2>
                  <textarea
                    value={tutorNote}
                    onChange={(e) => setTutorNote(e.target.value)}
                    // rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Viết ghi chú, tóm tắt buổi học, link tài liệu, thông tin cần lưu ý..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTutorNote}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      Lưu ghi chú
                    </button>
                  </div>
                </div>
              )}
              {/* Section: Điểm danh */}
              <AttendanceSection
                members={membersList}
                attendance={attendance}
                onAttendanceChange={handleAttendanceChange}
              />

              {/* Section: Nút bấm */}
              <FormActions onSave={handleSaved} onDelete={handleDelete} />

            </div>
          </form>
        </main>
      </div>
    </StudyLayout>
  )
}

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

function BasicInfoSection({
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
  members: { id: string; name: string }[]
  attendance: AttendanceState
  onAttendanceChange: (memberId: string, status: 'present' | 'absent') => void
}
function AttendanceSection({ members, attendance, onAttendanceChange }: AttendanceProps) {
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
function FormActions({ onSave, onDelete }: { onSave?: () => void; onDelete?: () => void }) {
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
function BannerWave() {
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
