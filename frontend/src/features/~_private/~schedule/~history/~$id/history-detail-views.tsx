import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ClockIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { Link } from '@tanstack/react-router';

import type { Session } from '@/components/data/~mock-session';

import { FormSelect, FormTextarea } from './history-form-controls';

export function ManagerHistoryView({ session, onDecline, onAccept }: { session: Session; onDecline: () => void; onAccept: () => void }) {
  return (
    <div className="flex items-center justify-center bg-gray-100 p-4 md:p-10">
      <div className="overflow-hidden rounded-lg bg-white p-4 shadow-xl">
        <Link to="/schedule/history" className="mb-6 mt-3 flex items-center gap-2 text-sm font-medium text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeftIcon className="size-5" /><span>Quay lại</span>
        </Link>
        <div className="p-6 md:p-8">
          <div className="flex items-center">
            <UserCircleIcon className="size-16 text-gray-400" />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{session.studentNames?.[0] ?? session.members?.[0]?.name ?? 'Chưa có tên sinh viên'}</h1>
              <p className="text-sm text-gray-600">{session.members?.[0]?.name ?? session.studentNames?.[0] ?? '—'}</p>
              <div className="mt-1 flex items-center text-sm text-gray-600"><ClockIcon className="mr-1.5 size-4 text-gray-500" /><span>{session.createdAt?.toLocaleString() ?? '—'}</span></div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 md:px-8"><h2 className="text-lg font-semibold text-gray-800">{session.title ?? 'Khóa học không xác định'}</h2></div>
        <div className="px-6 pb-8 md:px-8"><div className="rounded-r-lg p-6 shadow-custom-yellow">{session.desc}</div></div>
        <div className="flex justify-end gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onDecline} type="button" className="rounded-md bg-red-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-red-700">Từ chối</button>
          <button onClick={onAccept} type="button" className="rounded-md bg-green-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-green-700">Chấp nhận</button>
        </div>
      </div>
    </div>
  );
}

export function StudentHistoryView({ session }: { session: Session }) {
  return (
    <div className="p-4 md:p-8">
      <Link to="/schedule/history" className="mb-6 flex items-center gap-2 text-sm font-medium text-[#3D4863] transition hover:text-blue-700"><ArrowLeftIcon className="size-5" /><span>Quay lại</span></Link>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Yêu cầu buổi học mới</h1>
      <div className="relative overflow-hidden rounded-lg bg-white shadow-md">
        <BannerWave />
        <div className="relative space-y-6 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Thông tin cơ bản</h2>
            <StatusBadge status={session.status} />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">
            <div className="space-y-6">
              <FormSelect label="Khóa học (*):" id="course" value={session.courseId ?? ''} disabled>
                <option value={session.courseId ?? ''}>{session.title ?? 'Không có thông tin khóa học'}</option>
              </FormSelect>
              <FormTextarea label="Mô tả (*):" id="description" value={session.desc ?? 'Lorem ipsum'} rows={10} disabled />
            </div>
            {session.status === 'cancelled' && <div className="space-y-6"><FormTextarea label="Lý do từ chối:" id="declineReason" labelClassName="text-red-600 font-semibold" value={session.declineReason ?? 'Lorem ipsum'} rows={10} disabled /></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const config = status === 'cancelled'
    ? { className: 'bg-red-600', text: 'Declined' }
    : status === 'completed'
      ? { className: 'bg-green-600', text: 'Accepted' }
      : { className: 'bg-yellow-500', text: 'Pending' };
  return <span className={`rounded-md px-3 py-1 text-sm font-medium text-white ${config.className}`}>{config.text}</span>;
}

function BannerWave() {
  return (
    <svg className="absolute right-0 top-0 h-32 w-2/3" viewBox="0 0 960 227" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <mask id="history-wave-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="960" height="227"><rect x="960" y="227" width="960" height="227" rx="8" transform="rotate(180 960 227)" fill="#1E40AF" /></mask>
      <g mask="url(#history-wave-mask)"><path d="M960 204.301V0.000778198H80C80 0.000778198 410 9.6149 520 102.151C630 194.687 960 204.301 960 204.301Z" fill="#D97706" /><path d="M960 204.301V0.000762939H320C320 0.000762939 560 9.6149 640 102.151C720 194.687 960 204.301 960 204.301Z" fill="#1E40AF" /></g>
    </svg>
  );
}
