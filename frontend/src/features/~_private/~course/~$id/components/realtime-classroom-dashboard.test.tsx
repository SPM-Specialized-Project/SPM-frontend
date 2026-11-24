// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  // eslint-disable-next-line testing-library/no-manual-cleanup -- Vitest manual cleanup
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  codePulseApi,
  type CodePulseRealtimeDashboardResponse,
} from '@/services/codepulse-api';

import { RealtimeClassroomDashboard } from './realtime-classroom-dashboard';

vi.mock('@/services/codepulse-api', () => ({
  codePulseApi: {
    getRealtimeDashboard: vi.fn(),
  },
}));

const mockDashboardData: CodePulseRealtimeDashboardResponse = {
  classroom: {
    id: 'class-1',
    courseId: '13',
    termId: 'term-2026-1',
    term: {
      id: 'term-2026-1',
      name: 'Học kỳ 1 2026-2027',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2027-01-15T00:00:00Z',
      resetDate: '2027-01-20T00:00:00Z',
      status: 'ACTIVE',
    },
    name: 'DSA Lab 101',
    description: 'Data Structures and Algorithms Lab',
    status: 'ACTIVE',
    lecturerEmail: 'lecturer@gmail.com',
  },
  students: [
    {
      studentId: 'SV001',
      studentName: 'Nguyễn Văn An',
      studentEmail: 'an.nguyen@student.hcmut.edu.vn',
      avatar: null,
      status: 'ACTIVE',
      activeProblem: {
        assignmentId: 'assign-1',
        title: 'Binary Search Tree Traversal',
        labId: 'lab-1',
        labTitle: 'Lab 01: Trees & Graphs',
      },
      milestone: 'SUBMITTED',
      testProgress: {
        passedCount: 5,
        totalCount: 5,
        passRatio: 1.0,
        lastExecutedAt: '2026-11-25T00:00:00Z',
      },
      activeAlert: null,
      aiStatus: 'NO_ISSUES',
      lastActivityAt: '2026-11-25T00:00:00Z',
      idleMinutes: 2,
      isStale: false,
      practiceMode: 'IN_LAB',
    },
    {
      studentId: 'SV002',
      studentName: 'Trần Thị Bình',
      studentEmail: 'binh.tran@student.hcmut.edu.vn',
      avatar: null,
      status: 'ACTIVE',
      activeProblem: {
        assignmentId: 'assign-2',
        title: 'AVL Tree Balancing',
        labId: 'lab-1',
        labTitle: 'Lab 01: Trees & Graphs',
      },
      milestone: 'RUNNING',
      testProgress: {
        passedCount: 2,
        totalCount: 5,
        passRatio: 0.4,
        lastExecutedAt: '2026-11-25T00:05:00Z',
      },
      activeAlert: {
        id: 'alert-1',
        ruleType: 'CONSECUTIVE_FAILURES',
        severity: 'CRITICAL',
        message: 'Chạy thử thất bại 5 lần liên tiếp',
        createdAt: '2026-11-25T00:05:00Z',
        consecutiveFailures: 5,
      },
      aiStatus: 'ACTIVE_ALERT',
      lastActivityAt: '2026-11-25T00:05:00Z',
      idleMinutes: 1,
      isStale: false,
      practiceMode: 'IN_LAB',
    },
    {
      studentId: 'SV003',
      studentName: 'Lê Hoàng Cúc',
      studentEmail: 'cuc.le@student.hcmut.edu.vn',
      avatar: null,
      status: 'ACTIVE',
      activeProblem: null,
      milestone: 'NOT_STARTED',
      testProgress: {
        passedCount: 0,
        totalCount: 0,
        passRatio: 0,
        lastExecutedAt: null,
      },
      activeAlert: null,
      aiStatus: 'UNEVALUATED',
      lastActivityAt: '2026-11-24T23:30:00Z',
      idleMinutes: 35,
      isStale: true,
      practiceMode: 'OUTSIDE',
    },
  ],
  summary: {
    totalStudents: 3,
    activeCount: 2,
    staleCount: 1,
    alertCount: 1,
    submittedCount: 1,
    lastRefreshedAt: '2026-11-25T00:06:00Z',
  },
};

describe('RealtimeClassroomDashboard (UI-04)', () => {
  beforeEach(() => {
    vi.mocked(codePulseApi.getRealtimeDashboard).mockResolvedValue({
      status: 200,
      data: mockDashboardData,
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders classroom overview, KPIs, and all students (AC-197a)', async () => {
    render(<RealtimeClassroomDashboard classroomId="class-1" />);

    expect(screen.getByText('Đang tải Realtime Classroom Dashboard...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Realtime Classroom Dashboard (UI-04)')).toBeInTheDocument();
    });

    expect(screen.getByText('DSA Lab 101')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.getByText('Lê Hoàng Cúc')).toBeInTheDocument();
    expect(screen.getByText('Binary Search Tree Traversal')).toBeInTheDocument();
  });

  it('filters students by search text and status (AC-197b)', async () => {
    render(<RealtimeClassroomDashboard classroomId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, email, MSSV/i);
    fireEvent.change(searchInput, { target: { value: 'Bình' } });

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
    expect(screen.queryByText('Lê Hoàng Cúc')).not.toBeInTheDocument();

    // Reset search, test status filter
    fireEvent.change(searchInput, { target: { value: '' } });
    const alertFilterButton = screen.getByRole('button', { name: /Cần hỗ trợ \(Alert\)/i });
    fireEvent.click(alertFilterButton);

    expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
  });

  it('displays stale indicator for inactive students (AC-197c / AC-09d)', async () => {
    render(<RealtimeClassroomDashboard classroomId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Cúc')).toBeInTheDocument();
    });

    expect(screen.getByText('Mất kết nối / Idle')).toBeInTheDocument();
    expect(screen.getByText('35 phút trước')).toBeInTheDocument();
  });

  it('renders test pass ratio and milestone badges (AC-198a)', async () => {
    render(<RealtimeClassroomDashboard classroomId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('5/5 Passed')).toBeInTheDocument();
      expect(screen.getByText('2/5 Passed')).toBeInTheDocument();
      expect(screen.getByText('Đã nộp bài')).toBeInTheDocument();
      expect(screen.getByText('Đang chạy test')).toBeInTheDocument();
      expect(screen.getByText('Chưa bắt đầu')).toBeInTheDocument();
    });
  });

  it('differentiates distinct AI evaluation states transparently (AC-198b / AC-09e)', async () => {
    render(<RealtimeClassroomDashboard classroomId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Không có lỗi')).toBeInTheDocument();
      expect(screen.getByText('Cảnh báo khó khăn')).toBeInTheDocument();
      expect(screen.getByText('Chưa đánh giá')).toBeInTheDocument();
    });
  });
});
