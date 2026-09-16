import { courseDriver, type Course } from '@/components/data/~mock-courses';

import { backendApi, backendRequest } from './backend-http';
import type {
  BackendListQuery,
  BackendResponse,
  CourseDetailResponse,
  CourseListResponse,
} from './backend-driver-types';

const getCourseWithLocalPresentation = <T extends Course>(serverCourse: T): T => {
  const localCourse = courseDriver.getById(serverCourse.id);
  if (!localCourse) return serverCourse;

  return {
    ...localCourse,
    ...serverCourse,
    stats: { ...localCourse.stats, ...serverCourse.stats },
    students: serverCourse.students?.length ? serverCourse.students : localCourse.students,
    bgImage: localCourse.bgImage,
  } as T;
};

export const courseApi = {
  getCourseDetail(courseId: string): Promise<BackendResponse<CourseDetailResponse>> {
    return backendRequest(async () => {
      const response = await backendApi.get<CourseDetailResponse>(
        '/courses/' + encodeURIComponent(courseId) + '/detail',
      );

      return {
        status: response.status,
        data: {
          ...response.data,
          course: getCourseWithLocalPresentation(response.data.course),
        },
      };
    });
  },

  getCourses(query: BackendListQuery): Promise<BackendResponse<CourseListResponse>> {
    return backendRequest(async () => {
      const response = await backendApi.get<CourseListResponse>('/courses', {
        params: query,
      });

      return {
        status: response.status,
        data: {
          ...response.data,
          items: response.data.items.map((item) => getCourseWithLocalPresentation(item)),
        },
      };
    });
  },
};
