import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { Link } from '@tanstack/react-router';

import type { Session } from '@/components/data/~mock-session';
import StudyLayout from '@/components/study-layout';

import { BannerWave } from './schedule-detail-components';

type StudentSessionViewProps = {
  id: string;
  session: Session | undefined;
  membersList: ReadonlyArray<{ id: string; name: string }>;
};

export function StudentSessionView({
  id,
  session,
  membersList,
}: StudentSessionViewProps) {
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
