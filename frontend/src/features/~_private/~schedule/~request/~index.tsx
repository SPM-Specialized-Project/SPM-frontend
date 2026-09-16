import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';

import { courseDriver } from '@/components/data/~mock-courses';
import { getAllNames } from '@/components/data/~mock-names';
import { saveSession, type SessionMember } from '@/components/data/~mock-session';
import StudyLayout from '@/components/study-layout';
import { useJsonData } from '@/services/use-json-data';

import {
  BasicInfoSection,
  FormActions,
  StudentSelectionSection,
} from './components/session-request-form';

export const Route = createFileRoute('/_private/schedule/request/')({
  beforeLoad: async () => {
    document.title = 'Tạo buổi học mới -  Tutor Support System';
    if (localStorage.getItem('role') !== 'tutor') {
      throw new Response('Redirect', {
        status: 302,
        headers: { Location: '/schedule' },
      });
    }
  },
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    courseId: (search.courseId as string) || '',
    title: (search.title as string) || '',
    desc: (search.desc as string) || '',
    requestType: (search.requestType as string) || '',
  }),
});

function RouteComponent() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/_private/schedule/request/' });
  const courses = useJsonData(courseDriver);
  const allNames = getAllNames();

  const [title, setTitle] = useState(searchParams.title || '');
  const [courseId, setCourseId] = useState(searchParams.courseId || '');
  const [method, setMethod] = useState<'offline' | 'online'>('offline');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (searchParams.courseId) setCourseId(searchParams.courseId);
    if (searchParams.title) setTitle(searchParams.title);
  }, [searchParams]);

  const toggleMember = (memberId: number) => {
    setSelectedMembers((previous) => {
      const next = new Set(previous);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return void toast.error('Vui lòng nhập chủ đề buổi học');
    if (!courseId) return void toast.error('Vui lòng chọn khóa học');
    if (!startDate || !endDate) return void toast.error('Vui lòng chọn thời gian học');
    if (selectedMembers.size === 0) return void toast.error('Vui lòng chọn ít nhất một học sinh');

    const members: SessionMember[] = allNames
      .filter((member) => selectedMembers.has(member.id))
      .map((member) => ({ id: member.id, name: member.name, present: false }));
    const course = courses.find((item) => item.id === courseId);

    saveSession({
      id: `s-${Date.now().toString(36)}`,
      courseId,
      title,
      courseTitle: course?.title ?? 'Unknown Course',
      instructor: course?.instructor ?? 'TBD',
      method,
      link: method === 'online' ? 'https://meet.example.com/new-session' : undefined,
      location: method === 'offline' ? 'Phòng học TBA' : undefined,
      start: new Date(startDate).toISOString(),
      end: new Date(endDate).toISOString(),
      members,
      status: 'scheduled' as const,
      requestType: 'new' as const,
      createdAt: new Date().toISOString(),
    });
    toast.success('Tạo buổi học thành công!');
    navigate({ to: '/schedule' });
  };

  return (
    <StudyLayout>
      <div className="min-h-screen bg-gray-50">
        <Link to="/schedule" className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700">
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>
        <main className="p-4 md:p-8">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Tạo buổi học mới</h1>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-8">
              <BasicInfoSection
                title={title}
                setTitle={setTitle}
                courseId={courseId}
                setCourseId={setCourseId}
                method={method}
                setMethod={setMethod}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                courses={courses}
              />
              <StudentSelectionSection allNames={allNames} selectedMembers={selectedMembers} toggleMember={toggleMember} />
              <FormActions />
            </div>
          </form>
        </main>
      </div>
    </StudyLayout>
  );
}
