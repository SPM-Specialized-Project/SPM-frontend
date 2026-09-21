import { CalendarDaysIcon, ArrowLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { UserCircleIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/solid'
import { createFileRoute, Link } from '@tanstack/react-router'
import React, { useMemo, useState } from 'react'

import { sessionStore } from '@/components/data/~mock-session'
import StudyLayout from '@/components/study-layout'
import { useDataStore } from '@/services/use-data-store'

export const Route = createFileRoute('/_private/schedule/history/')({
  beforeLoad: async () => {
    document.title = 'Lịch sử buổi học -  Tutor Support System';
  },
  component: RouteComponent,
})

function formatPretty(dt?: string) {
  if (!dt) return ''
  const d = new Date(dt)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const dd = d.getDate()
  const MM = d.getMonth() + 1
  const yyyy = d.getFullYear()
  return `${hh}:${mm} ${dd}/${MM}/${yyyy}`
}

function RouteComponent() {
  const all = useDataStore(sessionStore)
  const [qTitle, setQTitle] = useState('')
  const [qCode, setQCode] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 4

  const [role, setRole] = useState<'student' | 'tutor'>('student');

  // const rawUserStore = localStorage.getItem('userStore');
  // const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
  // const State = userStore?.state ?? null;
  // const userLocalStore = State.user ?? null;

  const filtered = useMemo(() => {
    const t = qTitle.trim().toLowerCase()
    const c = qCode.trim().toLowerCase()
    return all.filter((s) => {
      if (t && !s.title.toLowerCase().includes(t)) return false
      if (c) {
        if (!s.courseId.toLowerCase().includes(c) && !s.instructor.toLowerCase().includes(c)) return false
      }
      return true
    })
  }, [all, qTitle, qCode])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)


  const handleXemChiTiet = async (role: string, id: string) => {
    // lưu localstorage role
    localStorage.setItem('role', role);
    setRole(role as 'student' | 'tutor');
    // chuyển trang
    window.location.href = `/schedule/history/${id}`;
  }
    
  return (
    <StudyLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <Link
          to="/schedule"
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-800">Yêu cầu buổi học mới</h1>
        <div className='mb-6 flex flex-col gap-y-4'>
          <span className="text-gray-600">Xem như: </span>
          <div>
            <button
              onClick={() => setRole('student')}
              className={`mr-4 rounded-md px-4 py-2 text-sm font-medium ${role === 'student' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-800 shadow-sm hover:bg-blue-50'}`}
            >
              Yêu cầu của tôi
            </button>
            <button
              onClick={() => setRole('tutor')}
              className={`rounded-md px-4 py-2 text-sm font-medium ${role === 'tutor' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-800 shadow-sm hover:bg-blue-50'}`}
            >
              Yêu cầu từ sinh viên
            </button>
          </div>
        </div>
        {/* Filters */}
        {role === 'tutor' ? (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <input
                placeholder="Nhập tên môn để tìm kiếm ..."
                value={qTitle}
                onChange={(e) => { setQTitle(e.target.value); setPage(1) }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                placeholder="Nhập mã môn để tìm kiếm ..."
                value={qCode}
                onChange={(e) => { setQCode(e.target.value); setPage(1) }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center">
              <select aria-label="Sort by" className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 shadow-sm focus:border-blue-500 focus:outline-none">
                <option value="newest">Cũ nhất</option>
                <option value="oldest">Mới nhất</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-6 top-4 size-5 text-gray-400" />
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between gap-4 sm:flex-row">
            <div className="flex-1">
              <input
                placeholder="Nhập mã môn để tìm kiếm ..."
                value={qCode}
                onChange={(e) => { setQCode(e.target.value); setPage(1) }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {/* nút tạo yêu cầu mới link to /new */}
            <div className="flex items-center justify-end">
              <Link
                to={"/schedule/request/new/" as string}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Tạo yêu cầu mới
              </Link>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-6">
          {pageItems.map((s) => {

            // Map session.status to a badge
            const statusBadge = (() => {
              if (s.status === 'completed') {
                return (
                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">Đã chấp nhận</span>
                )
              }
              if (s.status === 'scheduled') {
                return (
                  <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">Đang chờ duyệt</span>
                )
              }
              // cancelled
              return (
                <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600">Bị từ chối</span>
              )
            })()

            // Display requestType badge if present
            const typeBadge = s.requestType ? (
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${s.requestType === 'makeup'
                  ? 'bg-orange-100 text-orange-800'
                  : s.requestType === 'absent'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                {s.requestType === 'makeup' ? 'Buổi bù' : s.requestType === 'absent' ? 'Xin nghỉ' : 'Buổi học mới'}
              </span>
            ) : null

            return (
              <div key={s.id} className="relative flex items-center gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex size-12 items-center justify-center rounded-full bg-gray-100">
                  <UserCircleIcon className="size-7 text-gray-400" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-semibold text-gray-800">{s.title}</div>
                      <div className="text-sm text-gray-500">{s.courseId}</div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {typeBadge}
                        {statusBadge}
                      </div>
                      <button
                       onClick={() => handleXemChiTiet(role, s.id)} className="rounded-md bg-blue-600 px-4 py-1 text-sm font-medium text-white hover:bg-blue-700">
                      
                      Xem chi tiết
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
                    <CalendarDaysIcon className="size-4 text-gray-400" />
                    <span>{formatPretty(s.start)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
              disabled={page === 1}
              aria-label="Trang đầu"
              title="Trang đầu"
            ><ChevronDoubleLeftIcon className="size-4" /></button>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
              disabled={page === 1}
              aria-label="Trang trước"
              title="Trang trước"
            ><ChevronLeftIcon className="size-4" /></button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`size-8 rounded-full transition-colors ${page === i + 1
                  ? 'bg-[#0329E9] font-semibold text-white shadow'
                  : 'bg-white text-gray-800 shadow-sm hover:bg-blue-50'
                  }`}
                aria-label={`Trang ${i + 1}`}
                title={`Trang ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
              disabled={page === totalPages}
              aria-label="Trang sau"
              title="Trang sau"
            ><ChevronRightIcon className="size-4" /></button>

            <button
              onClick={() => setPage(totalPages)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm"
              disabled={page === totalPages}
              aria-label="Trang cuối"
              title="Trang cuối"
            ><ChevronDoubleRightIcon className="size-4" /></button>
          </div>
        </div>
      </div>
    </StudyLayout>
  )
}
