import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';

import { courseDriver } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { useJsonData } from '@/services/use-json-data';

import { CoordinatorCourseView } from '../components/coordinator-course-view';

export const Route = createFileRoute('/_private/course/$id/stastical/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id: courseId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const courses = useJsonData(courseDriver);
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
        id={courseId}
        onBack={() => navigate({ to: `/course/${courseId}` as any })}
        onRate={() => navigate({ to: `/course/${courseId}/rating` as any })}
      />
    </StudyLayout>
  );
}
