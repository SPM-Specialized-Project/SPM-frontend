import { BannerWave } from "./detail-banner";
import { FormInput, FormSelect } from "./detail-form-controls";

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
