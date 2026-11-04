import ArrowLeftIcon from '@heroicons/react/24/solid/ArrowLeftIcon';
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react';

import StudyLayout from '@/components/study-layout'

import AdminRegister from './components/admin-register';
import { CoordinatorRegister } from './components/coordinator-register';
import { StudentRegister } from './components/student-register';
import { TutorRegister } from './components/tutor-register';

export const Route = createFileRoute('/_private/register-session/')({
  beforeLoad: async () => {
    document.title = 'Register Tutor Program - Code Pulse';
  },
  component: RouteComponent,
})

function getFormComponent(role: 'lecturer' | 'student') {
  if (role === 'lecturer') {
    return <TutorRegister />;
  }
  return <StudentRegister />;
}

function RouteComponent() {

  useEffect(() => {
    document.title = 'Register Tutor Program - Code Pulse';
  }, []);


  const rawUserStore = localStorage.getItem('userStore');
  const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
  const State = userStore?.state ?? null;
  const userLocalStore = State.user ?? null;

  const [role, setRole] = useState<'lecturer' | 'student'>('student');

  if (!userLocalStore) {
    return <div>Loading...</div>;
  }

  if (userLocalStore.isCoordinator) {
    return (<StudyLayout>
      <CoordinatorRegister />
    </StudyLayout>
    );
  }

  if (userLocalStore.isChairman){
    return (<StudyLayout>
      <AdminRegister />
    </StudyLayout>
    );
  }

  return (
    <StudyLayout>
      {/* Header */}
      <header className="relative h-40 bg-blue-800 p-6 text-white">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm font-medium opacity-90 hover:opacity-100">
          <ArrowLeftIcon className="size-5" />
          Quay lại
        </Link>
        <h1 className="mt-4 text-3xl font-bold">
          Register Tutor Program
        </h1>

        <button className="absolute right-6 top-6 rounded bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
          onClick={() => setRole(role === 'student' ? 'lecturer' : 'student')}
        >
          {role === 'student' ? 'Đăng ký với tư cách học sinh' : 'Đăng ký với tư cách gia sư'}
        </button>
      </header>

      {getFormComponent(role)}
    </StudyLayout>
  )
}
