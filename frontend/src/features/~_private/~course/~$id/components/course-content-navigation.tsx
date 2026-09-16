import type { CourseContent } from '@/types/course-content';

import { typeToIconMap } from './course-constants';
import BookIcon from '@/components/icons/book';

type CourseContentNavigationProps = {
  content: CourseContent[];
  activeTab: string;
  onSelect: (sectionKey: string) => void;
};

export function CourseContentNavigation({
  content,
  activeTab,
  onSelect,
}: CourseContentNavigationProps) {
  return (
    <div className="w-64 shrink-0">
      <div className="sticky top-6 h-full py-4">
        <div className="relative h-full pl-6">
          <div className="absolute inset-y-0 left-[13px] w-0.5 bg-gray-300" />
          {content.map((item, index) => {
            const Icon = typeToIconMap[item.type] || BookIcon;
            const sectionKey = item.type + '-' + index;
            const isActive = activeTab === sectionKey;

            return (
              <button
                key={sectionKey}
                onClick={() => onSelect(sectionKey)}
                className={'relative ' + (index === 0 ? 'mt-2' : 'mt-8') + ' flex w-full items-center gap-3 pl-3 text-left transition-colors'}
              >
                <div
                  className={'absolute -left-6 flex size-7 items-center justify-center rounded-full border-2 bg-white transition ' + (isActive ? 'border-[#0329E9]' : 'border-gray-300')}
                >
                  <div
                    className={'size-2 rounded-full transition ' + (isActive ? 'bg-[#0329E9]' : 'bg-transparent')}
                  />
                </div>
                <Icon
                  className={'size-5 transition-colors ' + (isActive ? 'text-[#0329E9]' : 'text-gray-600')}
                />
                <span
                  className={'font-medium transition-colors ' + (isActive ? 'text-[#0329E9]' : 'text-gray-700')}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
