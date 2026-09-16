import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';

import { courseStore } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { useDataStore } from '@/services/use-data-store';

import { CoordinatorCourseView } from '../components/coordinator-course-view';

export const Route = createFileRoute('/_private/course/$id/stastical/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id: courseId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const courses = useDataStore(courseStore);
  const course = courses.find((item) => item.id === courseId);

  if (!course) {
    return (
      <StudyLayout>
        <p className="p-8 text-gray-600">Không tìm thấy khóa học.</p>
      </StudyLayout>
    );
  }

  return (
    <StudyLayout>
      <CoordinatorCourseView
        course={course}
        onBack={() => navigate({ to: `/course/${courseId}` as any })}
        onRate={() => navigate({ to: `/course/${courseId}/rating` as any })}
      />
    </StudyLayout>
  );
}
