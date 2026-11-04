import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import { createFileRoute, Link } from '@tanstack/react-router'
import React, { useEffect, useState, useRef } from 'react'

import StudyLayout from '@/components/study-layout'

import { DataTab } from './components/data-tab'
import IsMatching from './components/is-matching'
import { ResultTab } from './components/result-tab'

// --- BIẾN ĐỔI SVG THÀNH COMPONENT ---

// SVG helpers removed — icons used inside DataTab now

// --- Định nghĩa Type --- (moved into DataTab)
export const Route = createFileRoute('/_private/overview/')({
  beforeLoad: async () => {
    document.title = 'Overview - Code Pulse';
    if (!localStorage.getItem('userStore')) {
      window.location.assign('/login');
    };
    const rawUserStore = localStorage.getItem('userStore');
    const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
    const State = userStore?.state ?? null;
    const userLocalStore = State.user ?? null;
    if (!userLocalStore || !userLocalStore.isCoordinator) {
      window.location.assign('/dashboard');
    }
  },
  component: RouteComponent,
})



function RouteComponent() {
  const [activeTab, setActiveTab] = useState<'data' | 'results'>('data')
  const [isMatching, setIsMatching] = useState(false)
  const prevTitle = useRef<string>(typeof document !== 'undefined' ? document.title : '');

  useEffect(() => {
    // save original title on mount
    prevTitle.current = typeof document !== 'undefined' ? document.title : '';
    return () => {
      // restore when unmounting
      if (typeof document !== 'undefined') document.title = prevTitle.current;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMatching) {
      document.title = 'Đang khớp — Vui lòng chờ';
      return;
    }

    if (activeTab === 'data') {
      document.title = 'Đăng ký — Dữ liệu';
    } else if (activeTab === 'results') {
      document.title = 'Đăng ký — Kết quả';
    }
  }, [activeTab, isMatching]);

  function AIMatching() {
    //change isMatching to true and wait 5 seconds and then change isMatching to false and  activetab to result
    setIsMatching(true);
    setActiveTab('results');
    setTimeout(() => {
      setIsMatching(false);
    }, 5000);
  }

  function handleMatching() {
    AIMatching();
  }

  return (
    <StudyLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">

        <header className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600">
            <ArrowLeftIcon className="size-5" />
            Quay lại
          </Link>

          <div className="flex items-center gap-2 rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => setActiveTab('data')}
              className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}
            >
              Dữ liệu
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${activeTab === 'results' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}
            >
              Kết quả
            </button>
          </div>

          <button
            onClick={() => handleMatching()}
            className="rounded-lg border border-blue-600 bg-white px-5 py-2.5 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white"
          >
            Gợi ý AI
          </button>
        </header>

        {activeTab === 'data' ? (
          <DataTab />
        ) : isMatching ? (
          <IsMatching />
        ) : (
          <ResultTab />
        )}

      </div>
    </StudyLayout>
  )
}