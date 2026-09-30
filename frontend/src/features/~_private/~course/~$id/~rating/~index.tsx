import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { courseStore } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { useDataStore } from '@/services/use-data-store';
import storage from '@/utils/storage';

import { CoordinatorRatingView } from './components/coordinator-rating-view';
import { RATING_CRITERIA } from './components/rating-data';
import type { RatingItem, RatingUserStore } from './components/rating-types';
import { StudentRatingView } from './components/student-rating-view';
import { TutorRatingView } from './components/tutor-rating-view';

export type { RatingItem } from './components/rating-types';
export { StarRating } from './components/star-rating';

export const Route = createFileRoute('/_private/course/$id/rating/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const courses = useDataStore(courseStore);
  const course = useMemo(
    () => courses.find((item) => item.id === id),
    [courses, id],
  );
  const [comment, setComment] = useState('');
  const userStore = storage.getItem('userStore') as RatingUserStore | null;
  const navigate = useNavigate();
  const user = userStore?.state?.user;

  const [ratings, setRatings] = useState<RatingItem[]>(() => {
    const saved = localStorage.getItem(`course-ratings-${id}`);
    if (saved) return JSON.parse(saved) as RatingItem[];

    return RATING_CRITERIA.map((criterion) => ({
      ...criterion,
      rating: 0,
    }));
  });

  useEffect(() => {
    localStorage.setItem(`course-ratings-${id}`, JSON.stringify(ratings));
  }, [ratings, id]);

  const handleRate = (itemId: string, rating: number) => {
    setRatings((previous) =>
      previous.map((item) =>
        item.id === itemId ? { ...item, rating } : item,
      ),
    );
  };

  const handleConfirm = () => {
    alert('Đã lưu đánh giá');
    setTimeout(() => window.location.assign(`/course/${id}`), 500);
  };

  if (!course) {
    return (
      <StudyLayout>
        <div className="p-8 text-center text-gray-500">
          Khóa học không tồn tại hoặc tài khoản không còn membership ACTIVE.
        </div>
      </StudyLayout>
    );
  }

  if (user?.isStudent) {
    return (
      <StudyLayout>
        <StudentRatingView
          course={course}
          id={id}
          ratings={ratings}
          comment={comment}
          setComment={setComment}
          onRate={handleRate}
          onConfirm={handleConfirm}
        />
      </StudyLayout>
    );
  }

  if (user?.isLecturer) {
    return (
      <StudyLayout>
        <TutorRatingView
          course={course}
          id={id}
          comment={comment}
          setComment={setComment}
          onConfirm={handleConfirm}
        />
      </StudyLayout>
    );
  }

  if (user?.isCoordinator) {
    return (
      <StudyLayout>
        <CoordinatorRatingView
          course={course}
          id={id}
          onViewRating={(ratingPath) => navigate({ to: ratingPath as any })}
        />
      </StudyLayout>
    );
  }

  return null;
}
