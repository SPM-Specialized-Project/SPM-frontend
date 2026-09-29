import {
  createFileRoute,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { courseStore, type Course } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { api } from '@/services/api-client';
import { useDataStore } from '@/services/use-data-store';
import { getCurrentViewerContext } from '@/services/viewer-context';

import {
  CoordinatorCourseOverviewContent,
  CoordinatorCourseView,
} from '../components/coordinator-course-view';
import { CoordinatorRatingView } from '../~rating/components/coordinator-rating-view';

export const Route = createFileRoute('/_private/course/$id/stastical/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id: courseId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const courses = useDataStore(courseStore);
  const course = courses.find((item) => item.id === courseId);
  const [activeStatisticalTab, setActiveStatisticalTab] = useState<
    'students' | 'overview'
  >('overview');
  const viewerContext = useMemo(() => getCurrentViewerContext(), []);
  const [submissionStudents, setSubmissionStudents] = useState<
    Course['students']
  >([]);

  useEffect(() => {
    let active = true;
    setSubmissionStudents([]);

    if (
      !course ||
      courseId !== '13' ||
      (viewerContext.viewerRole !== 'tutor' &&
        viewerContext.viewerRole !== 'lecturer')
    ) {
      return () => {
        active = false;
      };
    }

    void api
      .getSubmissions({ courseId, viewerRole: viewerContext.viewerRole })
      .then((response) => {
        if (!active) return;

        const studentMap = new Map<
          string,
          {
            name: string;
            email: string;
            submissions: number;
            totalScore: number;
            graded: number;
          }
        >();

        response.data.items.forEach((submission) => {
          const current = studentMap.get(submission.student.email) ?? {
            name: submission.student.name,
            email: submission.student.email,
            submissions: 0,
            totalScore: 0,
            graded: 0,
          };
          if (submission.submittedAt) current.submissions += 1;
          if (submission.score !== null) {
            current.totalScore += submission.score * 10;
            current.graded += 1;
          }
          studentMap.set(submission.student.email, current);
        });

        setSubmissionStudents(
          course.students.map((student) => {
            const statistics = studentMap.get(student.email);
            return {
              ...student,
              numberOfSubmissions:
                statistics?.submissions ?? student.numberOfSubmissions ?? 0,
              numberOfJoinedSessions: student.numberOfJoinedSessions ?? 0,
              averageScore:
                statistics?.graded && statistics.graded > 0
                  ? Math.round(statistics.totalScore / statistics.graded)
                  : student.averageScore ?? 0,
            };
          }),
        );
      })
      .catch(() => {
        if (active) setSubmissionStudents([]);
      });

    return () => {
      active = false;
    };
  }, [course, courseId, viewerContext.viewerRole]);

  if (!course) {
    return (
      <StudyLayout>
        <p className="p-8 text-gray-600">Không tìm thấy khóa học.</p>
      </StudyLayout>
    );
  }

  const ratingStudents =
    course.id === '13' && submissionStudents.length > 0
      ? submissionStudents
      : undefined;

  return (
    <StudyLayout>
      <CoordinatorCourseView
        course={course}
        onBack={() => navigate({ to: `/course/${courseId}` as any })}
        activeTab="statistical"
        onOverview={() => navigate({ to: `/course/${courseId}` as any })}
        onRate={() => navigate({ to: `/course/${courseId}/rating` as any })}
      >
        <section>
          <div className="mb-6 flex flex-wrap gap-3 border-b border-gray-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveStatisticalTab('overview')}
              className={`rounded-lg px-4 py-2 font-medium transition ${
                activeStatisticalTab === 'overview'
                  ? 'bg-[#0329E9] text-white'
                  : 'text-[#0329E9] hover:bg-blue-50'
              }`}
            >
              Xem tổng quan
            </button>
            <button
              type="button"
              onClick={() => setActiveStatisticalTab('students')}
              className={`rounded-lg px-4 py-2 font-medium transition ${
                activeStatisticalTab === 'students'
                  ? 'bg-[#0329E9] text-white'
                  : 'text-[#0329E9] hover:bg-blue-50'
              }`}
            >
              Đánh giá sinh viên
            </button>
          </div>

          {activeStatisticalTab === 'students' ? (
            <CoordinatorRatingView
              course={course}
              id={courseId}
              showHeader={false}
              students={ratingStudents}
              onViewRating={(ratingPath) => navigate({ to: ratingPath as any })}
            />
          ) : (
            <CoordinatorCourseOverviewContent course={course} />
          )}
        </section>
      </CoordinatorCourseView>
    </StudyLayout>
  );
}
