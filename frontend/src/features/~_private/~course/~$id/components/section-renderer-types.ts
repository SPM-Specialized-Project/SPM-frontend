import type { Dispatch, SetStateAction } from 'react';

import type { DataCourses } from '@/components/data/~mock-courses';
import type { CourseContent } from '@/types/course-content';

export type LocalCourseUser = {
  isManager?: boolean;
  isCoordinator?: boolean;
} | null;

export type UpdateContentItem = (field: 'title' | 'type', value: string) => void;
export type UpdateContentData = (field: string, value: unknown) => void;

export type SectionRendererProps<T extends CourseContent = CourseContent> = {
  id: string;
  item: T;
  changing: boolean;
  courseDetail: DataCourses | undefined;
  setCourseDetail: Dispatch<SetStateAction<DataCourses | undefined>>;
  userLocalStore: LocalCourseUser;
  onUpdateItem: UpdateContentItem;
  onUpdateData: UpdateContentData;
  onDelete: () => void;
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  changedFile: File | null;
  setchangedFile: Dispatch<SetStateAction<File | null>>;
  previewUrl: string;
  changedPreviewUrl: string;
  toEmbed: (url?: string) => string;
  getAssetUrl: (filename?: string) => string;
};
