import { Link } from '@tanstack/react-router';

import type { Course } from '@/components/data/~mock-courses';
import ArrowLeft from '@/components/icons/arrow-left';

import { CourseHeaderTabs, type CourseHeaderActiveTab } from './course-header-tabs';

type CourseDetailHeaderProps = {
  course: Course;
  id: string;
  changing: boolean;
  isManager: boolean;
  showManagerTabs: boolean;
  showTermsTab: boolean;
  activeView: 'overview' | 'terms';
  onBack: () => void;
  onRate: () => void;
  onSelectView: (view: 'overview' | 'terms') => void;
  onToggleChanging: () => void;
};

export function CourseDetailHeader({
  course,
  id,
  changing,
  isManager,
  showManagerTabs,
  showTermsTab,
  activeView,
  onBack,
  onRate,
  onSelectView,
  onToggleChanging,
}: CourseDetailHeaderProps) {
  return (
    <CoursePageHeader
      course={course}
      id={id}
      active={activeView === 'terms' ? 'terms' : 'overview'}
      showTermsTab={showTermsTab}
      showManagerTabs={showManagerTabs}
      backAction={onBack}
      onOverview={() => onSelectView('overview')}
      onRating={onRate}
      onTerms={() => onSelectView('terms')}
      showEditToggle={isManager || (showTermsTab && showManagerTabs)}
      changing={changing}
      onToggleChanging={onToggleChanging}
    />
  );
}

type CoursePageHeaderProps = {
  course: Course;
  id: string;
  active: CourseHeaderActiveTab;
  showTermsTab?: boolean;
  showManagerTabs?: boolean;
  backAction?: () => void;
  backHref?: string;
  onOverview?: () => void;
  onRating?: () => void;
  onTerms?: () => void;
  showEditToggle?: boolean;
  changing?: boolean;
  onToggleChanging?: () => void;
};

export function CoursePageHeader({
  course,
  id,
  active,
  showTermsTab = false,
  showManagerTabs = false,
  backAction,
  backHref,
  onOverview,
  onRating,
  onTerms,
  showEditToggle = false,
  changing = false,
  onToggleChanging,
}: CoursePageHeaderProps) {
  const compactCodePulseHeader = id === '13' || course.code === 'DSA-LAB';

  return (
    <>
      {backAction ? (
        <button
          type="button"
          onClick={backAction}
          className={`${compactCodePulseHeader ? 'mb-3' : 'mb-6'} flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30`}
        >
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </button>
      ) : backHref ? (
        <Link
          to={backHref as any}
          className={`${compactCodePulseHeader ? 'mb-3' : 'mb-6'} flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30`}
        >
          <ArrowLeft className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>
      ) : null}

      <div
        className={compactCodePulseHeader
          ? 'border-y border-slate-200 bg-white p-4 sm:px-6'
          : 'relative w-full overflow-hidden rounded-lg p-4 pb-16 text-white shadow-lg sm:p-8'}
        style={compactCodePulseHeader ? undefined : {
          backgroundImage: 'url(' + course.bgImage + ')',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '250px',
        }}
      >
        <div className={compactCodePulseHeader ? 'flex flex-wrap items-end justify-between gap-4' : 'relative z-10'}>
          <div>
            <p className={compactCodePulseHeader ? 'text-xs font-medium text-slate-500' : 'mb-2 text-sm font-medium text-gray-200'}>{course.code}</p>
            <h1 className={compactCodePulseHeader ? 'mt-1 text-xl font-semibold tracking-tight text-slate-950' : 'mb-3 text-2xl font-bold sm:text-4xl'}>{course.title}</h1>
            <p className={compactCodePulseHeader ? 'mt-1 text-sm text-slate-600' : 'text-lg text-gray-100'}>Giảng viên: {course.instructor}</p>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <CourseHeaderTabs
              id={id}
              active={active}
              compact={compactCodePulseHeader}
              showTermsTab={showTermsTab}
              showManagerTabs={showManagerTabs}
              onOverview={onOverview}
              onRating={onRating}
              onTerms={onTerms}
            />
          </div>
        </div>

        {showEditToggle && (
          <div className={compactCodePulseHeader ? 'mt-3 flex justify-end' : 'absolute bottom-4 right-4'}>
            <label
              htmlFor="editing-toggle"
              className={`flex cursor-pointer items-center gap-2 text-sm ${compactCodePulseHeader ? 'text-slate-600' : 'text-white'}`}
            >
              <input
                id="editing-toggle"
                type="checkbox"
              checked={changing}
              onChange={onToggleChanging}
                aria-label="Chỉnh sửa chế độ"
                title="Bật/tắt chế độ chỉnh sửa"
                className="size-4"
              />
              <span className="ml-1">Chỉnh sửa</span>
            </label>
          </div>
        )}
      </div>
    </>
  );
}
