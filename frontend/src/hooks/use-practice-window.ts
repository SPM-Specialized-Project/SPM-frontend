import { useEffect, useState } from 'react';

import {
  codePulseApi,
  type CodePulseLabAssignment,
} from '@/services/codepulse-api';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

function closedWindowMessage(window: CodePulseLabAssignment) {
  switch (window.practiceAccessReason) {
    case 'NOT_OPEN_YET':
      return `Practice chưa mở. Giờ mở: ${formatTime(window.openAt)}. Trạng thái LAB không tự mở practice của bài.`;
    case 'MANUALLY_CLOSED':
      return 'Giảng viên đã đóng practice của bài này.';
    case 'EXPIRED':
      return `Practice đã hết hạn lúc ${formatTime(window.closeAt)}.`;
    case 'TERM_INACTIVE':
      return 'Học kỳ không còn hiệu lực cho practice.';
    case 'CLASSROOM_ARCHIVED':
      return 'Classroom đã được lưu trữ.';
    default:
      return 'Practice hiện chưa được phép truy cập.';
  }
}

export function usePracticeWindow(workspaceId?: string) {
  const [snapshot, setSnapshot] = useState<{
    workspaceId: string;
    window?: CodePulseLabAssignment;
  }>();
  const [failedWorkspaceId, setFailedWorkspaceId] = useState<string>();

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await codePulseApi.getWorkspace(workspaceId);
        if (!active) return;
        setSnapshot({ workspaceId, window: response.data.practiceWindow });
        setFailedWorkspaceId(undefined);
      } catch {
        if (!active) return;
        setSnapshot(undefined);
        setFailedWorkspaceId(workspaceId);
      } finally {
        pending = false;
      }
    };
    const onFocus = () => void refresh();
    void refresh();
    const timer = window.setInterval(onFocus, 5_000);
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [workspaceId]);

  const practiceWindow =
    snapshot?.workspaceId === workspaceId ? snapshot?.window : undefined;
  const practiceOpen = practiceWindow?.practiceAccess === 'OPEN';
  const practiceStatus = practiceOpen
    ? 'Đang mở'
    : practiceWindow?.practiceAccessReason === 'NOT_OPEN_YET'
      ? 'Chưa mở'
      : practiceWindow?.practiceAccessReason === 'MANUALLY_CLOSED'
        ? 'Đã đóng thủ công'
        : practiceWindow?.practiceAccessReason === 'EXPIRED'
          ? 'Đã hết hạn'
          : practiceWindow
            ? 'Đã đóng'
            : 'Đang kiểm tra';
  const practiceMessage = practiceWindow
    ? closedWindowMessage(practiceWindow)
    : workspaceId && failedWorkspaceId === workspaceId
      ? 'Không thể kiểm tra quyền luyện tập. Đang thử lại.'
      : 'Đang kiểm tra quyền luyện tập.';

  return {
    practiceOpen,
    practiceStatus,
    practiceMessage,
    activityContext: practiceWindow?.activityContext,
  };
}
