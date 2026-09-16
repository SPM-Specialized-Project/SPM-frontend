import type { Dispatch, SetStateAction } from 'react';

import type { DataCourses } from '@/components/data/~mock-courses';
import type { CourseContent, CourseContentType } from '@/types/course-content';

import { BookReferenceContent } from './render-bookreference';
import { IntroductionContent } from './render-introduction';
import { MaterialContent } from './render-material';
import { MovieContent } from './render-movie';
import { NoteContent } from './render-note';
import { ReferenceContent } from './render-reference';
import { SubmissionContent } from './render-submission';
import type { LocalCourseUser } from './section-renderer-types';

type CourseContentRendererProps = {
  id: string;
  item: CourseContent;
  index: number;
  changing: boolean;
  courseDetail: DataCourses | undefined;
  setCourseDetail: Dispatch<SetStateAction<DataCourses | undefined>>;
  userLocalStore: LocalCourseUser;
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  changedFile: File | null;
  setchangedFile: Dispatch<SetStateAction<File | null>>;
  previewUrl: string;
  changedPreviewUrl: string;
  toEmbed: (url?: string) => string;
  getAssetUrl: (filename?: string) => string;
};

function isCourseContentType(value: string): value is CourseContentType {
  return [
    'introduction',
    'material',
    'movie',
    'note',
    'reference',
    'submission',
    'bookReference',
  ].includes(value);
}

export function CourseContentRenderer({
  id,
  item,
  index,
  changing,
  courseDetail,
  setCourseDetail,
  userLocalStore,
  file,
  setFile,
  changedFile,
  setchangedFile,
  previewUrl,
  changedPreviewUrl,
  toEmbed,
  getAssetUrl,
}: CourseContentRendererProps) {
  // Handler to update item
  const handleUpdateItem = (field: 'title' | 'type', value: string) => {
    if (courseDetail) {
      const updatedContent = [...courseDetail.content];
      const current = updatedContent[index];
      if (!current) return;

      if (field === 'title') {
        updatedContent[index] = { ...current, title: value };
      } else if (isCourseContentType(value)) {
        updatedContent[index] = { ...current, type: value } as CourseContent;
      }

      setCourseDetail({ ...courseDetail, content: updatedContent });
    }
  };

  // Handler to delete item
  const handleDeleteItem = () => {
    if (
      courseDetail &&
      window.confirm('Bạn có chắc muốn xóa danh mục này?')
    ) {
      const updatedContent = courseDetail.content?.filter(
        (_, i) => i !== index,
      );
      setCourseDetail({ ...courseDetail, content: updatedContent });
    }
  };

  // Handler to update nested data
  const handleUpdateData = (dataField: string, value: unknown) => {
    if (courseDetail) {
      const updatedContent = [...courseDetail.content];
      const prev = updatedContent[index];
      if (!prev) return;

      const newData = {
        ...(prev.data as Record<string, unknown>),
        [dataField]: value,
      };

      // Special handling for submission status changes
      if (prev?.type === 'submission' && dataField === 'status') {
        // When changing to submitted/graded, ensure submittedFile exists
        if (
          (value === 'submitted' || value === 'graded') &&
          !newData.submittedFile
        ) {
          newData.submittedFile = { name: '', submittedAt: '' };
        }
        // When changing to graded, ensure grade/feedback exist
        if (value === 'graded') {
          if (!('grade' in newData)) newData.grade = null;
          if (!('maxGrade' in newData)) newData.maxGrade = null;
          if (!('feedback' in newData)) newData.feedback = null;
        }
        // When changing to not-submitted, remove unnecessary fields
        if (value === 'not-submitted') {
          delete newData.submittedFile;
          delete newData.grade;
          delete newData.maxGrade;
          delete newData.feedback;
        }
      }

      updatedContent[index] = {
        ...prev,
        data: newData,
      } as CourseContent;
      setCourseDetail({ ...courseDetail, content: updatedContent });
    }
  };

  const baseProps = {
    id,
    changing,
    courseDetail,
    setCourseDetail,
    userLocalStore,
    file,
    setFile,
    changedFile,
    setchangedFile,
    previewUrl,
    changedPreviewUrl,
    toEmbed,
    getAssetUrl,
  };

  switch (item.type) {
    case 'introduction':
      return (
        <IntroductionContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    case 'material':
      return (
        <MaterialContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    case 'movie':
      return (
        <MovieContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    case 'note':
      return (
        <NoteContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    case 'reference':
      return (
        <ReferenceContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    case 'submission':
      return (
        <SubmissionContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    case 'bookReference':
      return (
        <BookReferenceContent
          {...baseProps}
          item={item}
          onUpdateItem={handleUpdateItem}
          onUpdateData={handleUpdateData}
          onDelete={handleDeleteItem}
        />
      );
    default:
      return null;
  }
}
