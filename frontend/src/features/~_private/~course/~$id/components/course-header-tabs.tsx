import { Link } from '@tanstack/react-router';

export type CourseHeaderTab = 'overview' | 'roster' | 'rating';
export type CourseHeaderActiveTab = CourseHeaderTab | 'terms' | 'submissions' | 'statistical';

type CourseHeaderTabsProps = {
  id: string;
  active: CourseHeaderActiveTab;
  compact?: boolean;
  showTermsTab?: boolean;
  showManagerTabs?: boolean;
  onOverview?: () => void;
  onRating?: () => void;
  onTerms?: () => void;
};

const tabClass = (selected: boolean, compact: boolean) => compact
  ? `border-b-2 px-2 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-600/30 ${selected ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'}`
  : selected
    ? 'rounded-lg bg-[#0329E9] px-4 py-2 font-medium text-white transition'
    : 'rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80';

export function CourseHeaderTabs({
  id,
  active,
  compact = false,
  showTermsTab = false,
  showManagerTabs = false,
  onOverview,
  onRating,
  onTerms,
}: CourseHeaderTabsProps) {
  return (
    <>
      {onOverview ? (
        <button type="button" onClick={onOverview} className={tabClass(active === 'overview', compact)}>
          Tổng quan
        </button>
      ) : (
        <Link to={`/course/${id}` as any} className={tabClass(active === 'overview', compact)}>
          Tổng quan
        </Link>
      )}
      <Link to={`/course/${id}/roster` as any} className={tabClass(active === 'roster', compact)}>
        Danh sách lớp
      </Link>
      {onRating ? (
        <button type="button" onClick={onRating} className={tabClass(active === 'rating', compact)}>
          Đánh giá
        </button>
      ) : (
        <Link to={`/course/${id}/rating` as any} className={tabClass(active === 'rating', compact)}>
          Đánh giá
        </Link>
      )}
      {showTermsTab ? (
        onTerms ? (
          <button type="button" onClick={onTerms} className={tabClass(active === 'terms', compact)}>
            Terms and classrooms
          </button>
        ) : (
          <Link to={`/course/${id}#terms` as any} className={tabClass(active === 'terms', compact)}>
            Terms and classrooms
          </Link>
        )
      ) : null}
      {showManagerTabs ? (
        <>
          <Link to={`/course/${id}/submissions` as any} className={tabClass(active === 'submissions', compact)}>
            Bài nộp
          </Link>
          <Link to={`/course/${id}/stastical` as any} className={tabClass(active === 'statistical', compact)}>
            Xem thống kê
          </Link>
        </>
      ) : null}
    </>
  );
}

export function getCourseHeaderVisibility(courseId: string, viewerRole: string) {
  return {
    showTermsTab: courseId === '13' && ['admin', 'lecturer', 'tutor', 'student'].includes(viewerRole),
    showManagerTabs: viewerRole !== 'student',
  };
}
