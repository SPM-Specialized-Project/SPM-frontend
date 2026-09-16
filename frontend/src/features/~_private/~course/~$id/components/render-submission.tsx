import type { CourseContent } from '@/types/course-content';

import { SubmissionHeader } from './submission-header';
import { SubmissionManagerView } from './submission-manager-view';
import { SubmissionStudentView } from './submission-student-view';
import type { SectionRendererProps } from './section-renderer-types';

type SubmissionItem = Extract<CourseContent, { type: 'submission' }>;

export function SubmissionContent(props: SectionRendererProps<SubmissionItem>) {
  const { item, userLocalStore } = props;

  return (
    <>
      <SubmissionHeader
        item={item}
        userLocalStore={userLocalStore}
        onUpdateItem={props.onUpdateItem}
        onDelete={props.onDelete}
      />
      {userLocalStore?.isManager ? (
        <SubmissionManagerView
          id={props.id}
          item={item}
          onUpdateData={props.onUpdateData}
        />
      ) : (
        <SubmissionStudentView
          item={item}
          file={props.file}
          setFile={props.setFile}
          changedFile={props.changedFile}
          setchangedFile={props.setchangedFile}
          previewUrl={props.previewUrl}
          changedPreviewUrl={props.changedPreviewUrl}
        />
      )}
    </>
  );
}
