import React from 'react';

import BookIcon from '@/components/icons/book';
import type {
  CourseContent,
  CourseContentType,
  CourseDetail,
} from '@/types/course-content';

import { typeToIconMap } from './course-constants';
import { IntroductionSection } from './introduction-section';
import { MaterialSection } from './material-section';
import { MovieSection } from './movie-section';
import { NoteSection } from './note-section';
import { ReferenceSection } from './reference-section';
import { SubmissionSection } from './submission-section';

interface ContentSectionProps {
  item: CourseContent;
  index: number;
  changing: boolean;
  courseDetail: CourseDetail | undefined;
  setCourseDetail: (detail: CourseDetail) => void;
  toEmbed: (url?: string) => string;
  getAssetUrl: (filename?: string) => string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  item,
  index,
  changing,
  courseDetail,
  setCourseDetail,
  toEmbed,
  getAssetUrl,
}) => {
  const Icon = typeToIconMap[item.type] || BookIcon;

  // Handler to update item field
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
    if (courseDetail && window.confirm('Bạn có chắc muốn xóa danh mục này?')) {
      const updatedContent = courseDetail.content?.filter((_, i) => i !== index);
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
        if ((value === 'submitted' || value === 'graded') && !newData.submittedFile) {
          newData.submittedFile = { name: '', submittedAt: '' };
        }
        if (value === 'graded') {
          if (!('grade' in newData)) newData.grade = null;
          if (!('maxGrade' in newData)) newData.maxGrade = null;
          if (!('feedback' in newData)) newData.feedback = null;
        }
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

  switch (item.type) {
    case 'introduction':
      return (
        <IntroductionSection
          Icon={Icon}
          changing={changing}
          onDelete={handleDeleteItem}
          onTextChange={(text) => handleUpdateData('text', text)}
          onTitleChange={(title) => handleUpdateItem('title', title)}
          onTypeChange={(type) => handleUpdateItem('type', type)}
          text={item.data.text}
          title={item.title}
          type={item.type}
        />
      );

    case 'material':
      return (
        <MaterialSection
          Icon={Icon}
          changing={changing}
          document={item.data.document}
          getAssetUrl={getAssetUrl}
          onDelete={handleDeleteItem}
          onDocumentChange={(doc) => handleUpdateData('document', doc)}
          onTitleChange={(title) => handleUpdateItem('title', title)}
          onTypeChange={(type) => handleUpdateItem('type', type)}
          title={item.title}
          type={item.type}
        />
      );

    case 'movie':
      return (
        <MovieSection
          Icon={Icon}
          changing={changing}
          onDelete={handleDeleteItem}
          onTitleChange={(title) => handleUpdateItem('title', title)}
          onTypeChange={(type) => handleUpdateItem('type', type)}
          onVideoChange={(video) => handleUpdateData('video', video)}
          title={item.title}
          toEmbed={toEmbed}
          type={item.type}
          video={item.data.video}
        />
      );

    case 'note':
      return (
        <NoteSection
          Icon={Icon}
          assignment={item.data.assignment}
          changing={changing}
          onAssignmentChange={(assignment) => handleUpdateData('assignment', assignment)}
          onDelete={handleDeleteItem}
          onTitleChange={(title) => handleUpdateItem('title', title)}
          onTypeChange={(type) => handleUpdateItem('type', type)}
          title={item.title}
          type={item.type}
        />
      );

    case 'reference':
      return (
        <ReferenceSection
          Icon={Icon}
          changing={changing}
          link={item.data.link}
          onDelete={handleDeleteItem}
          onLinkChange={(link) => handleUpdateData('link', link)}
          onTitleChange={(title) => handleUpdateItem('title', title)}
          onTypeChange={(type) => handleUpdateItem('type', type)}
          title={item.title}
          type={item.type}
        />
      );

    case 'submission':
      return (
        <SubmissionSection
          Icon={Icon}
          changing={changing}
          data={item.data}
          onDataChange={handleUpdateData}
          onDelete={handleDeleteItem}
          onTitleChange={(title) => handleUpdateItem('title', title)}
          onTypeChange={(type) => handleUpdateItem('type', type)}
          title={item.title}
          type={item.type}
        />
      );

    default:
      return null;
  }
};
