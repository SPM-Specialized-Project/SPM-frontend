import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { sessionStore, updateSession } from '@/components/data/~mock-session';
import StudyLayout from '@/components/study-layout';
import { useDataStore } from '@/services/use-data-store';

import { DeclinePopup } from './components/decline-popup';
import { ManagerHistoryView, StudentHistoryView } from './history-detail-views';

export const Route = createFileRoute('/_private/schedule/history/$id/')({
  beforeLoad: async () => {
    document.title = 'Chi tiết buổi học -  Tutor Support System';
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [declinePopup, setDeclinePopup] = useState(false);
  const { id } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const sessions = useDataStore(sessionStore);
  const current = sessions.find((session) => session.id === id);

  useEffect(() => {
    try {
      setIsManager(localStorage.getItem('role') === 'tutor');
    } catch (error) {
      console.error('Failed to read role from localStorage', error);
      setIsManager(false);
    }
  }, []);

  const handleDeclineSubmit = (reason: string) => {
    if (current) updateSession(current.id, { status: 'cancelled', declineReason: reason });
    setDeclinePopup(false);
    toast.success(`Đã từ chối: ${reason}`);
    navigate({ to: '/schedule/history' });
  };

  const handleAccept = () => {
    if (current) updateSession(current.id, { status: 'completed' });
    setDeclinePopup(false);
    navigate({ to: '/schedule/history' });
    if (current?.requestType !== 'absent') {
      navigate({
        to: '/schedule/request',
        search: (old: any) => ({ ...old, courseId: current?.courseId, title: current?.title, desc: current?.desc, requestType: current?.requestType }),
      });
    }
  };

  if (!current || isManager === null) {
    return (
      <StudyLayout>
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 md:p-10">
          <div className="rounded-md bg-white p-8 shadow">{!current ? 'Không tìm thấy buổi học.' : 'Đang tải...'}</div>
        </div>
      </StudyLayout>
    );
  }

  return (
    <StudyLayout>
      {isManager ? (
        <ManagerHistoryView session={current} onDecline={() => setDeclinePopup(true)} onAccept={handleAccept} />
      ) : (
        <StudentHistoryView session={current} />
      )}
      {declinePopup && <DeclinePopup onClose={() => setDeclinePopup(false)} onSubmit={handleDeclineSubmit} />}
    </StudyLayout>
  );
}
