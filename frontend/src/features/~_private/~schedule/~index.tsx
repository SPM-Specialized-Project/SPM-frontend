import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { sessionDriver } from '@/components/data/~mock-session';
import StudyLayout from '@/components/study-layout';
import { useJsonData } from '@/services/use-json-data';

import { CalendarGrid } from './components/calendar-grid';
import { ScheduleHeader } from './components/schedule-header';
import { BannerWave } from './components/schedule-banner';
import { dayIndexFromISO, getWeekLabels, toHHMM, type CalendarItemData } from './components/schedule-utils';

export const Route = createFileRoute('/_private/schedule/')({
  beforeLoad: async () => {
    document.title = 'Schedule -  Tutor Support System';
  },
  component: RouteComponent,
});

function RouteComponent() {
  const sessions = useJsonData(sessionDriver);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [role, setRole] = useState<'student' | 'tutor'>(
    localStorage.getItem('role') === 'tutor' ? 'tutor' : 'student',
  );

  const weekLabels = getWeekLabels(referenceDate);
  const daysToMonday = (referenceDate.getDay() + 6) % 7;
  const weekStart = new Date(referenceDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(referenceDate.getDate() - daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const calendarItems: CalendarItemData[] = sessions
    .filter((session) => {
      const startDate = new Date(session.start);
      if (startDate < weekStart || startDate >= weekEnd) return false;
      const startHour = startDate.getHours();
      const endHour = new Date(session.end).getHours();
      return (startHour >= 7 && startHour < 22) || (endHour > 7 && endHour <= 22);
    })
    .map((session) => ({
      id: session.id,
      dayIndex: dayIndexFromISO(session.start),
      startTime: toHHMM(session.start),
      endTime: toHHMM(session.end),
      title: session.title,
      desc: session.desc ?? '',
      isManager: role === 'tutor',
    }));

  const moveWeek = (offset: number) => {
    setReferenceDate((date) => {
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + offset * 7);
      return nextDate;
    });
  };

  const toggleRole = () => {
    const nextRole = role === 'student' ? 'tutor' : 'student';
    localStorage.setItem('role', nextRole);
    setRole(nextRole);
  };

  return (
    <StudyLayout>
      <div className="flex flex-1 flex-col">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>

        <div className="relative bg-white pb-12 pt-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-gray-900">Calendar - Tutor System</h1>
          </div>
          <BannerWave />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="relative rounded-lg bg-white pb-4">
            <ScheduleHeader onPrevWeek={() => moveWeek(-1)} onNextWeek={() => moveWeek(1)} />
            <CalendarGrid items={calendarItems} weekLabels={weekLabels} role={role} />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button onClick={toggleRole} className="rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-800 hover:bg-gray-300">
              Đổi role: {role === 'student' ? 'Student' : 'Tutor'}
            </button>
            <div className="flex items-center gap-4">
              {role === 'tutor' && (
                <Link
                  to="/schedule/request"
                  search={{ courseId: '', title: '', desc: '', requestType: '' }}
                  className="rounded-md bg-blue-800 px-5 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Tạo buổi học
                </Link>
              )}
              <Link
                to="/schedule/history"
                className="rounded-md bg-blue-800 px-5 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Yêu cầu buổi học
              </Link>
            </div>
          </div>
        </main>
      </div>
    </StudyLayout>
  );
}
