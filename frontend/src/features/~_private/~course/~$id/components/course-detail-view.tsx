import { Link } from '@tanstack/react-router';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { Course, DataCourses } from '@/components/data/~mock-courses';
import ArrowLeft from '@/components/icons/arrow-left';
import BookIcon from '@/components/icons/book';
import type { CourseContent, CourseContentType } from '@/types/course-content';

import { typeToIconMap } from './course-constants';
import { CreateMaterialIcon } from './course-icons';

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
      setActiveTab(`${courseDetail.content[0].type}-0`);
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

        const sectionKey = `${item.type}-${index}`;
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
    const newCategoryData = createDefaultContent('material');
    const newIndex = courseDetail.content.length;
    setActiveTab(`${newCategoryData.type}-${newIndex}`);
    // Keep the state update synchronous with the previous route behavior.
    const nextDetail = {
      ...courseDetail,
      content: [...courseDetail.content, newCategoryData],
    };
    // The renderer owns the detail setter; dispatching the update through the
    // callback keeps this view independent from the route's data source.
    setCourseDetail(nextDetail);
    setTimeout(() => scrollToSection(`${newCategoryData.type}-${newIndex}`), 100);
  };

  return (
    <div className="font-['Archivo']">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
      >
        <ArrowLeft className="size-5" />
        <span className="font-medium">Quay lại</span>
      </button>

      <div
        className="relative rounded-lg p-8 text-white shadow-lg"
        style={{
          backgroundImage: `url(${course.bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '250px',
        }}
      >
        <div className="relative z-10">
          <p className="mb-2 text-sm font-medium text-gray-200">{course.code}</p>
          <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
          <p className="text-lg text-gray-100">Giảng viên: {course.instructor}</p>
          <div className="mt-6 flex gap-4">
            <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
              Tổng quan
            </button>
            {changing && (
              <>
                <Link
                  to={`/course/${id}/submissions` as any}
                  className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Bài nộp
                </Link>
                <Link
                  to={`/course/${id}/stastical` as any}
                  className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Xem thống kê
                </Link>
              </>
            )}
            {!changing && (
              <button
                onClick={onRate}
                className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
              >
                Đánh giá
              </button>
            )}
          </div>
        </div>

        {isManager && (
          <div className="absolute bottom-4 right-4">
            <label
              htmlFor="editing-toggle"
              className="flex cursor-pointer items-center gap-2 text-white"
            >
              <input
                id="editing-toggle"
                type="checkbox"
                checked={changing}
                onChange={() => setChanging((value) => !value)}
                aria-label="Chỉnh sửa chế độ"
                title="Bật/tắt chế độ chỉnh sửa"
                className="size-4"
              />
              <span className="ml-1">Chỉnh sửa</span>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-start gap-6">
        <div className="w-64 shrink-0">
          <div className="sticky top-6 h-full py-4">
            <div className="relative h-full pl-6">
              <div className="absolute inset-y-0 left-[13px] w-0.5 bg-gray-300" />
              {courseDetail.content.map((item, index) => {
                const Icon = typeToIconMap[item.type] || BookIcon;
                const sectionKey = `${item.type}-${index}`;
                const isActive = activeTab === sectionKey;
                return (
                  <button
                    key={sectionKey}
                    onClick={() => scrollToSection(sectionKey)}
                    className={`relative ${index === 0 ? 'mt-2' : 'mt-8'} flex w-full items-center gap-3 pl-3 text-left transition-colors`}
                  >
                    <div
                      className={`absolute -left-6 flex size-7 items-center justify-center rounded-full border-2 bg-white transition ${isActive ? 'border-[#0329E9]' : 'border-gray-300'}`}
                    >
                      <div
                        className={`size-2 rounded-full transition ${isActive ? 'bg-[#0329E9]' : 'bg-transparent'}`}
                      />
                    </div>
                    <Icon
                      className={`size-5 transition-colors ${isActive ? 'text-[#0329E9]' : 'text-gray-600'}`}
                    />
                    <span
                      className={`font-medium transition-colors ${isActive ? 'text-[#0329E9]' : 'text-gray-700'}`}
                    >
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {changing && (
            <div className="mb-4 mt-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[#3D4863] bg-white p-6">
              <button
                className="font-baloo rounded-lg px-6 py-3 font-medium text-black shadow-sm transition hover:bg-blue-700 hover:text-white"
                onClick={addMaterial}
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
              const sectionKey = `${item.type}-${index}`;
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
      </div>
    </div>
  );
}

function createDefaultContent(type: CourseContentType): CourseContent {
  const id = `content-${Date.now()}`;
  switch (type) {
    case 'introduction':
      return { id, type, title: 'Giới thiệu mới', data: { text: 'Nội dung giới thiệu...' } };
    case 'material':
      return { id, type, title: 'Tài liệu mới', data: {} };
    case 'movie':
      return { id, type, title: 'Video mới', data: {} };
    case 'note':
      return { id, type, title: 'Ghi chú mới', data: {} };
    case 'reference':
      return { id, type, title: 'Tham khảo mới', data: {} };
    case 'submission':
      return {
        id,
        type,
        title: 'Bài nộp mới',
        data: { status: 'not-submitted', dueDate: new Date().toISOString().split('T')[0], canEdit: true },
      };
    case 'bookReference':
      return { id, type, title: 'Sách tham khảo mới', data: { books: [] } };
  }
}
