import type { MutableRefObject, ReactNode } from 'react';

import type { DataCourses } from '@/components/data/~mock-courses';
import type { CourseContent } from '@/types/course-content';

import { CreateMaterialIcon } from './course-icons';

type CourseContentPanelProps = {
  courseDetail: DataCourses;
  changing: boolean;
  contentContainerRef: MutableRefObject<HTMLDivElement | null>;
  sectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onAddMaterial: () => void;
  renderSectionContent: (item: CourseContent, index: number) => ReactNode;
};

export function CourseContentPanel({
  courseDetail,
  changing,
  contentContainerRef,
  sectionRefs,
  onAddMaterial,
  renderSectionContent,
}: CourseContentPanelProps) {
  return (
    <div className="flex-1">
      {changing && (
        <div className="mb-4 mt-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[#3D4863] bg-white p-6">
          <button
            className="font-baloo rounded-lg px-6 py-3 font-medium text-black shadow-sm transition hover:bg-blue-700 hover:text-white"
            onClick={onAddMaterial}
          >
            <CreateMaterialIcon className="mr-2 inline-block" />
            Thêm tài liệu
          </button>
        </div>
      )}

      <div
        ref={contentContainerRef}
        className="mt-10 max-h-[calc(100vh-220px)] overflow-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        {courseDetail.content.map((item, index) => {
          const sectionKey = item.type + '-' + index;
          return (
            <div
              key={sectionKey}
              ref={(element) => {
                sectionRefs.current[sectionKey] = element;
              }}
              className="mb-12 rounded-lg border border-gray-200 p-4"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              {renderSectionContent(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
