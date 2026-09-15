import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { toast } from 'react-toastify'

import { courseDriver } from '@/components/data/~mock-courses'
import { createRequestSession } from '@/components/data/~mock-session'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

export const Route = createFileRoute('/_private/schedule/request/new/')({
  beforeLoad: async () => {
    document.title = 'Tạo buổi học mới -  Tutor Support System';
  },
  component: RouteComponent,
})

// === COMPONENT CHÍNH CỦA TRANG ===
function RouteComponent() {
  const navigate = useNavigate()
  const courses = useJsonData(courseDriver)

  const [courseId, setCourseId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requestType, setRequestType] = useState<'makeup' | 'new' | 'absent'>('new')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) {
      toast.error('Vui lòng chọn khóa học')
      return
    }
    if (!title) {
      toast.error('Vui lòng nhập tiêu đề')
      return
    }

    const saved = createRequestSession({
      courseId,
      title,
      desc: description,
      requestType,
    })

    toast.success('Yêu cầu đã được gửi: ' + saved.id)
    // Điều hướng về trang lịch sử hoặc chi tiết mới
    navigate({ to: '/schedule/history' })
  }

  return (
    <StudyLayout>
      {/* 1. Container nội dung chính */}
      <div className=" p-4 md:p-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Yêu cầu buổi học mới</h1>

        {/* 2. Form */}
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-8">

            {/* Section: Thông tin cơ bản (Card có sóng) */}
            <div className="relative overflow-hidden rounded-lg bg-white shadow-md">

              {/* Sóng trang trí (SỬ DỤNG COMPONENT MỚI CỦA BẠN) */}
              <BannerWave />

              {/* Nội dung form (đè lên trên sóng) */}
              <div className="relative space-y-6 p-6 md:p-8">
                <h2 className="text-xl font-semibold text-gray-800">Thông tin cơ bản</h2>

                <FormSelect label="Khóa học (*):" id="course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">Chọn khóa học</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </FormSelect>

                <div>
                  <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-700">Tiêu đề (*)</label>
                  <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
                </div>

                <FormTextarea label="Mô tả (*):" id="description" placeholder="Mô tả buổi học..." rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />

                {/* Radio buttons for request type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Loại yêu cầu (*):</label>
                  <div className="flex items-center gap-6">
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="radio"
                        name="requestType"
                        value="new"
                        checked={requestType === 'new'}
                        onChange={() => setRequestType('new')}
                        className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-800">Buổi học mới</span>
                    </label>
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="radio"
                        name="requestType"
                        value="makeup"
                        checked={requestType === 'makeup'}
                        onChange={() => setRequestType('makeup')}
                        className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-800">Buổi bù</span>
                    </label>
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="radio"
                        name="requestType"
                        value="absent"
                        checked={requestType === 'absent'}
                        onChange={() => setRequestType('absent')}
                        className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-800">Xin nghỉ</span>
                    </label>
                  </div>
                </div>
              </div>
            </div> {/* Hết card */}

            {/* Section: Nút bấm */}
            <div className="flex justify-end gap-4">
              <button type="button" className="rounded-md border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2" onClick={() => navigate({ to: '/schedule/history' })}>
                Hủy bỏ
              </button>
              <button type="submit" className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Gửi yêu cầu</button>
            </div>

          </div>
        </form>
      </div>
    </StudyLayout>
  )
}

// === COMPONENT SÓNG SVG (TỪ BẠN) ===
function BannerWave() {
  return (
    <svg
      // Đã điều chỉnh className để vừa với card
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
  )
}

// --- COMPONENT HELPER ---

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
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <select id={id} {...props} className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500">
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 size-5 text-gray-400" />
      </div>
    </div>
  )
}

/**
 * Component Textarea có nhãn
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

function FormTextarea({ label, id, ...props }: FormTextareaProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <textarea id={id} {...props} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500" />
    </div>
  )
}

// Helpers - removed toInputLocal as it's no longer needed
