import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { Course, DataCourses } from '@/components/data/~mock-courses';
import type { CourseContent } from '@/types/course-content';

import { CourseContentNavigation } from './course-content-navigation';
import { CourseContentPanel } from './course-content-panel';
import { CourseDetailHeader } from './course-detail-header';

type CourseDetailViewProps = {
  course: Course;
  courseDetail: DataCourses;
  setCourseDetail: Dispatch<SetStateAction<DataCourses | undefined>>;
  id: string;
  changing: boolean;
  setChanging: Dispatch<SetStateAction<boolean>>;
  isManager: boolean;
  onBack: () => void;
  onRate: () => void;
  renderSectionContent: (item: CourseContent, index: number) => ReactNode;
};

export function CourseDetailView({
  course,
  courseDetail,
  setCourseDetail,
  id,
  changing,
  setChanging,
  isManager,
  onBack,
  onRate,
  renderSectionContent,
}: CourseDetailViewProps) {
  const [activeTab, setActiveTab] = useState('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (courseDetail.content.length > 0 && !activeTab) {
      setActiveTab(courseDetail.content[0].type + '-0');
    }
  }, [courseDetail, activeTab]);

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 100;
      for (let index = courseDetail.content.length - 1; index >= 0; index -= 1) {
        const item = courseDetail.content[index];
        if (!item) continue;

        const sectionKey = item.type + '-' + index;
        const section = sectionRefs.current[sectionKey];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveTab(sectionKey);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [courseDetail]);

  const scrollToSection = (sectionKey: string) => {
    const section = sectionRefs.current[sectionKey];
    if (!section || !contentContainerRef.current) return;

    contentContainerRef.current.scrollTo({
      top: section.offsetTop - 20,
      behavior: 'smooth',
    });
  };

  const addMaterial = () => {
    const newContent: CourseContent = {
      id: 'content-' + Date.now(),
      type: 'material',
      title: 'Tài liệu mới',
      data: {},
    };
    const newIndex = courseDetail.content.length;
    setActiveTab(newContent.type + '-' + newIndex);
    setCourseDetail({
      ...courseDetail,
      content: [...courseDetail.content, newContent],
    });
    setTimeout(() => scrollToSection(newContent.type + '-' + newIndex), 100);
  };

  return (
    <div className="font-['Archivo']">
      <CourseDetailHeader
        course={course}
        id={id}
        changing={changing}
        isManager={isManager}
        onBack={onBack}
        onRate={onRate}
        onToggleChanging={() => setChanging((value) => !value)}
      />

      <div className="flex items-start gap-6">
        <CourseContentNavigation
          content={courseDetail.content}
          activeTab={activeTab}
          onSelect={scrollToSection}
        />
        <CourseContentPanel
          courseDetail={courseDetail}
          changing={changing}
          contentContainerRef={contentContainerRef}
          sectionRefs={sectionRefs}
          onAddMaterial={addMaterial}
          renderSectionContent={renderSectionContent}
        />
      </div>
    </div>
  );
}
