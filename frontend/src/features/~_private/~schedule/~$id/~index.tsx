import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { courseStore } from '@/components/data/~mock-courses'
import { getAllNames } from '@/components/data/~mock-names'
import { deleteSession, sessionStore, type Session, updateSession } from '@/components/data/~mock-session'
import { useDataStore } from '@/services/use-data-store'

import { ManagerSessionView } from './manager-session-view'
import type { AttendanceState } from './schedule-detail-components'
import { StudentSessionView } from './student-session-view'

export const Route = createFileRoute('/_private/schedule/$id/')({
  beforeLoad: async () => {
    document.title = 'Chi tiết buổi học -  Tutor Support System';
  },
  component: RouteComponent,
})

// === DỮ LIỆU GIẢ ===
// Dữ liệu giả cho 11 thành viên (dùng khi session không có members)

// === COMPONENT CHÍNH CỦA TRANG ===
function RouteComponent() {
  // Lấy ID từ URL
  const { id } = useParams({ from: Route.id })
  const navigate = useNavigate()
  const sessions = useDataStore(sessionStore)
  const courses = useDataStore(courseStore)

  // load session from the API-backed store
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
      <StudentSessionView
        id={id}
        session={session}
        membersList={membersList}
      />
    );
  }

  return (
    <ManagerSessionView
      id={id}
      session={session}
      courses={courses}
      title={title}
      courseId={courseId}
      sessionType={sessionType}
      startLocal={startLocal}
      endLocal={endLocal}
      link={link}
      locationVal={locationVal}
      tutorNote={tutorNote}
      membersList={membersList}
      attendance={attendance}
      onTitleChange={setTitle}
      onCourseIdChange={setCourseId}
      onSessionTypeChange={setSessionType}
      onStartChange={setStartLocal}
      onEndChange={setEndLocal}
      onLinkChange={setLink}
      onLocationChange={setLocationVal}
      onTutorNoteChange={setTutorNote}
      onAttendanceChange={handleAttendanceChange}
      onSaveTutorNote={handleSaveTutorNote}
      onSave={handleSaved}
      onDelete={handleDelete}
    />
  );
}
