import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from '@tanstack/react-router';

import type { Course } from '@/components/data/~mock-courses';
import type { Session } from '@/components/data/~mock-session';
import StudyLayout from '@/components/study-layout';

import {
  AttendanceSection,
  BasicInfoSection,
  FormActions,
} from './schedule-detail-components';
import type { AttendanceState } from './schedule-detail-components';

type ManagerSessionViewProps = {
  id: string;
  session: Session | undefined;
  courses: ReadonlyArray<Pick<Course, 'id' | 'title'>>;
  title: string;
  courseId: string;
  sessionType: 'offline' | 'online';
  startLocal: string;
  endLocal: string;
  link: string;
  locationVal: string;
  tutorNote: string;
  membersList: ReadonlyArray<{ id: string; name: string }>;
  attendance: AttendanceState;
  onTitleChange: (value: string) => void;
  onCourseIdChange: (value: string) => void;
  onSessionTypeChange: (value: 'offline' | 'online') => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onTutorNoteChange: (value: string) => void;
  onAttendanceChange: (memberId: string, status: 'present' | 'absent') => void;
  onSaveTutorNote: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function ManagerSessionView({
  id,
  session,
  courses,
  title,
  courseId,
  sessionType,
  startLocal,
  endLocal,
  link,
  locationVal,
  tutorNote,
  membersList,
  attendance,
  onTitleChange,
  onCourseIdChange,
  onSessionTypeChange,
  onStartChange,
  onEndChange,
  onLinkChange,
  onLocationChange,
  onTutorNoteChange,
  onAttendanceChange,
  onSaveTutorNote,
  onSave,
  onDelete,
}: ManagerSessionViewProps) {
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
                onTitleChange={onTitleChange}
                onCourseIdChange={onCourseIdChange}
                onSessionTypeChange={onSessionTypeChange}
                onStartChange={onStartChange}
                onEndChange={onEndChange}
                onLinkChange={onLinkChange}
                onLocationChange={onLocationChange}
                courses={courses}
              />
              {/* Tutor note panel appears only after session end */}
              {session && new Date(session.end).getTime() < Date.now() && (
                <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
                  <h2 className="mb-4 text-xl font-semibold text-gray-800">Ghi chú cho tutor</h2>
                  <textarea
                    value={tutorNote}
                    onChange={(e) => onTutorNoteChange(e.target.value)}
                    // rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-custom-yellow focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Viết ghi chú, tóm tắt buổi học, link tài liệu, thông tin cần lưu ý..."
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={onSaveTutorNote}
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
                onAttendanceChange={onAttendanceChange}
              />

              {/* Section: Nút bấm */}
              <FormActions onSave={onSave} onDelete={onDelete} />

            </div>
          </form>
        </main>
      </div>
    </StudyLayout>
  )
}
