import { ArrowLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline' // Thêm import
import { UserCircleIcon, ClockIcon } from '@heroicons/react/24/solid'
import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react' // Thêm useEffect
import { toast } from 'react-toastify'

import { sessionDriver, updateSession } from '@/components/data/~mock-session'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

import { DeclinePopup } from './components/decline-popup'


export const Route = createFileRoute('/_private/schedule/history/$id/')({
  beforeLoad: async () => {
    document.title = 'Chi tiết buổi học -  Tutor Support System';
  },
  component: RouteComponent,
})

function RouteComponent() {
  // === Lấy Role (isManager) ===
  const [isManager, setIsManager] = useState<boolean | null>(null); // null = đang tải

  useEffect(() => {
    // Đọc localStorage an toàn phía client
    // let managerStatus = false;
    // try {
    //   const rawUserStore = localStorage.getItem('userStore');
    //   const userStore = rawUserStore ? JSON.parse(rawUserStore) : null;
    //   managerStatus = userStore?.state?.user?.isManager ?? false;
    // } catch (e) {
    //   console.error("Failed to parse userStore from localStorage", e);
    // }
    // setIsManager(managerStatus);
    //random isManager for demo
    try{
      const role = localStorage.getItem('role');
      setIsManager(role === 'tutor' ? true : false);
    } catch (e) {
      console.error("Failed to read role from localStorage", e);
      setIsManager(false);
    }
  }, []); // Chạy 1 lần khi component mount

  // === Hooks và Data ===
  const { id } = useParams({ from: Route.id });
  const [declinePopup, setDeclinePopup] = useState(false);
  const navigate = useNavigate()
  const sessions = useJsonData(sessionDriver)

  const current = id ? sessions.find((item) => item.id === id) : undefined

  // === Handlers (chỉ dùng cho Manager) ===
  const handleDeclineOpen = () => setDeclinePopup(true)
  const handleDeclineClose = () => setDeclinePopup(false)
  const handleDeclineSubmit = (reason: string) => {
    if (current) updateSession(current.id, { status: 'cancelled', declineReason: reason })
    setDeclinePopup(false)
    toast.success('Đã từ chối: ' + reason)
    navigate({ to: '/schedule/history' })
  }
  const handleAcceptSubmit = () => {
    if (current) updateSession(current.id, { status: 'completed' })
    setDeclinePopup(false)
    navigate({ to: '/schedule/history' })
    if (current?.requestType !== 'absent') {
      // nếu không phải là yêu cầu xin nghỉ thì tạo một buổi học mới ở /schedule/request
      navigate({
        to: '/schedule/request', search: (old: any) => ({
          ...old,
          courseId: current?.courseId,
          title: current?.title,
          desc: current?.desc,
          requestType: current?.requestType,
        })
      })
    }
  }

  // === Trạng thái Loading / Not Found ===
  if (!current || isManager === null) {
    return (
      <StudyLayout>
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 md:p-10">
          <div className="rounded-md bg-white p-8 shadow">
            {!current ? "Không tìm thấy buổi học." : "Đang tải..."}
          </div>
        </div>
      </StudyLayout>
    )
  }

  // === RENDER CÓ ĐIỀU KIỆN ===

  // --- 1. GIAO DIỆN MANAGER ---
  if (isManager) {
    return (
      <StudyLayout>
        <div className="flex items-center justify-center bg-gray-100 p-4 md:p-10">
          <div className=" overflow-hidden rounded-lg bg-white p-4 shadow-xl">
            <Link
              to="/schedule/history"
              params={{ id, name } as any}
              className="mb-6 mt-3 flex items-center gap-2 text-sm font-medium text-[#3D4863] transition hover:text-blue-700"
            >
              <ArrowLeftIcon className="size-5" />
              <span>Quay lại</span>
            </Link>

            {/* Phần Header thông tin User */}
            <div className="p-6 md:p-8">
              <div className="flex items-center">
                <UserCircleIcon className="size-16 text-gray-400" />
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {current.studentNames?.[0] ?? current.members?.[0]?.name ?? 'Chưa có tên sinh viên'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {current.members?.[0]?.name ?? current.studentNames?.[0] ?? '—'}
                  </p>
                  <div className="mt-1 flex items-center text-sm text-gray-600">
                    <ClockIcon className="mr-1.5 size-4 text-gray-500" />
                    <span>{current.createdAt?.toLocaleString() ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phần thông tin Khóa học */}
            <div className="px-6 pb-6 md:px-8">
              <h2 className="text-lg font-semibold text-gray-800">
                {current.title ?? 'Khóa học không xác định'}
              </h2>
            </div>

            {/* Box thông báo chi tiết */}
            <div className="px-6 pb-8 md:px-8">
              <div className="rounded-r-lg p-6 shadow-custom-yellow">
                {current.desc}
              </div>
            </div>

            {/* Phần Nút bấm (Actions) */}
            <div className="flex justify-end gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={handleDeclineOpen}
                type="button"
                className="rounded-md bg-red-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Từ chối
              </button>
              <button
                onClick={handleAcceptSubmit}
                type="button"
                className="rounded-md bg-green-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Chấp nhận
              </button>
            </div>

          </div>
        </div>
        {declinePopup && (
          <DeclinePopup onClose={handleDeclineClose} onSubmit={handleDeclineSubmit} />
        )}
      </StudyLayout>
    )
  }

  // --- 2. GIAO DIỆN STUDENT (Bị từ chối) ---
  return (
    <StudyLayout>
      <div className=" p-4 md:p-8">
        <Link
          to="/schedule/history"
          className="mb-6 flex items-center gap-2 text-sm font-medium text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-5" />
          <span>Quay lại</span>
        </Link>
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Yêu cầu buổi học mới
        </h1>

        <div className="relative overflow-hidden rounded-lg bg-white shadow-md">
          {/* Sóng trang trí */}
          <BannerWave />

          {/* Nội dung form */}
          <div className="relative space-y-6 p-6 md:p-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Thông tin cơ bản
              </h2>
              {/* Badge Trạng thái (dựa trên current.status) */}
              {current.status === 'cancelled' ? (
                <span className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white">Declined</span>
              ) : current.status === 'completed' ? (
                <span className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white">Accepted</span>
              ) : (
                <span className="rounded-md bg-yellow-500 px-3 py-1 text-sm font-medium text-white">Pending</span>
              )}
            </div>

            {/* Grid 2 cột cho form */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
              {/* Cột trái */}
              <div className="space-y-6">
                <FormSelect
                  label="Khóa học (*):"
                  id="course"
                  value={current.courseId ?? ""} // Dữ liệu từ session
                  disabled
                >
                  {/* Chỉ hiển thị khóa học đã chọn vì không thể thay đổi */}
                  <option value={current.courseId ?? ""}>
                    {current.title ?? "Không có thông tin khóa học"}
                  </option>
                </FormSelect>

                <FormTextarea
                  label="Mô tả (*):"
                  id="description"
                  value={current.desc ?? "Lorem ipsum"} // Dữ liệu từ session
                  rows={10}
                  disabled
                />
              </div>

              {/* Cột phải */}
              {current.status === 'cancelled' && (<div className="space-y-6">
                <FormTextarea
                  label="Lý do từ chối:"
                  id="declineReason"
                  labelClassName="text-red-600 font-semibold" // Label màu đỏ
                  value={current.declineReason ?? "Lorem ipsum"} // Giả sử session có
                  rows={10}
                  disabled
                />
              </div>)}
            </div>
          </div>
        </div>
      </div>
    </StudyLayout>
  )
}


// === COMPONENT SÓNG SVG ===
function BannerWave() {
  return (
    <svg
      // Điều chỉnh class cho vừa với card
      className="absolute right-0 top-0 h-32 w-2/3"
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

// === COMPONENT HELPER ===

/**
 * Component Select (cho giao diện Student)
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
          // Thêm style cho trạng thái disabled
          className="w-full cursor-not-allowed appearance-none rounded-md border border-gray-300 bg-gray-100 px-3 py-2 pr-10 text-gray-500 shadow-sm"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
      </div>
    </div>
  );
}

/**
 * Component Textarea (cho giao diện Student)
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  labelClassName?: string; // Prop tùy chọn để style label
}

function FormTextarea({ label, id, labelClassName = "text-gray-700", ...props }: FormTextareaProps) {
  return (
    <div>
      <label htmlFor={id} className={`mb-2 block text-sm font-medium ${labelClassName}`}>
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        // Thêm style cho trạng thái disabled
        className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 shadow-sm"
      />
    </div>
  );
}
