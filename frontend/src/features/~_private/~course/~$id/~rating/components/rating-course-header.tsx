import type { Course } from '@/components/data/~mock-courses';
import { getCurrentViewerContext } from '@/services/viewer-context';

import { CoursePageHeader } from '../../components/course-detail-header';
import { getCourseHeaderVisibility } from '../../components/course-header-tabs';

type RatingCourseHeaderProps = {
  course: Course;
  id: string;
};

export function RatingCourseHeader({
  course,
  id,
}: RatingCourseHeaderProps) {
  const { viewerRole } = getCurrentViewerContext();
  const { showTermsTab, showManagerTabs } = getCourseHeaderVisibility(id, viewerRole);

  return (
    <CoursePageHeader
      course={course}
      id={id}
      active="rating"
      showTermsTab={showTermsTab}
      showManagerTabs={showManagerTabs}
      backHref="/dashboard"
    />
  );
}
