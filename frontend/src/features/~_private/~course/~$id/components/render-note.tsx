import type { CourseContent } from '@/types/course-content';

import { NoteAssignment } from './note-assignment';
import { NoteSectionHeader } from './note-section-header';
import type { SectionRendererProps } from './section-renderer-types';

export function NoteContent(
  props: SectionRendererProps<Extract<CourseContent, { type: 'note' }>>,
) {
  return (
    <>
      <NoteSectionHeader {...props} />
      <div className="space-y-4">
        <NoteAssignment {...props} />
      </div>
    </>
  );
}
