import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { courseDriver } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { useJsonData } from '@/services/use-json-data';
import storage from '@/utils/storage';

import { CoordinatorRatingView } from './components/coordinator-rating-view';
import { StudentRatingView } from './components/student-rating-view';
import { TutorRatingView } from './components/tutor-rating-view';
import type { RatingItem, RatingUserStore } from './components/rating-types';

export type { RatingItem } from './components/rating-types';
export { StarRating } from './components/star-rating';

export const Route = createFileRoute('/_private/course/$id/rating/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const courses = useJsonData(courseDriver);
  const course = useMemo(
    () => courses.find((item) => item.id === id) ?? courses[0],
    [courses, id],
  );
  const [comment, setComment] = useState('');
  const userStore = storage.getItem('userStore') as RatingUserStore | null;
  const navigate = useNavigate();
  const user = userStore?.state?.user;

  const [ratings, setRatings] = useState<RatingItem[]>(() => {
    const saved = localStorage.getItem(`course-ratings-${id}`);
    if (saved) return JSON.parse(saved) as RatingItem[];

    return Array.from({ length: 11 }, (_, index) => ({
      id: `rating-${index + 1}`,
      title:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec ipsum magna, rutrum tempus urna quis, cursus porttitor neque. Aliquam commodo enim sit.',
      rating: 3,
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

  if (!course) return null;

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

  if (user?.isTutor) {
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
