import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef, Fragment, useMemo } from 'react';

import { courseDriver, type Course, type DataCourses } from '@/components/data/~mock-courses';
import { Play as PlayIcon } from '@/components/icons';
import { Paper as PaperIcon } from '@/components/icons';
import ArrowLeft from '@/components/icons/arrow-left';
import BookIcon from '@/components/icons/book';
import CalendarIcon from '@/components/icons/calendar';
import DescriptionIcon from '@/components/icons/description';
import LinkIcon from '@/components/icons/link';
import StudyLayout from '@/components/study-layout';
import { BackendDriverError, backendDriver } from '@/services/backend-driver';
import type { CourseContent, CourseContentType } from '@/types/course-content';
import filePDF from 'public/group07_report 02.pdf';

import { CheckCircleIcon, FolderIcon } from './components/course-icons';
import pdfIcon from './components/pdfIcon.png';


export const Route = createFileRoute('/_private/course/$id/')({
  beforeLoad: async () => {
    document.title = 'Chi tiết khóa học - Tutor Support System';
  },
  component: CourseDetailsComponent,
});

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

function CourseDetailsComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | undefined>(() => courseDriver.getById(id));
  const [courseDetail, setCourseDetail] = useState<DataCourses | undefined>();
  const [isCourseLoading, setIsCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [changedFile, setchangedFile] = useState<File | null>(null);

  useEffect(() => {
    let disposed = false;

    setIsCourseLoading(true);
    setCourseError(null);

    backendDriver
      .getCourseDetail(id)
      .then(({ data }) => {
        if (disposed) return;
        setCourse(data.course);
        setCourseDetail(data.detail);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setCourseDetail(undefined);
        setCourseError(
          error instanceof BackendDriverError
            ? error.message
            : 'Không thể tải dữ liệu khóa học.',
        );
      })
      .finally(() => {
        if (!disposed) setIsCourseLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [id]);

  const previewUrl = useMemo(() => {
    return file ? URL.createObjectURL(file) : '';
  }, [file]);

  const changedPreviewUrl = useMemo(() => {
    return changedFile ? URL.createObjectURL(changedFile) : '';
  }, [changedFile]);

  //TODO: PHẢI SET CHANGING LẠI LÀ FALSE KHÔNG LÀ NGAY CẢ SINH VIÊN CŨNG THẤY
  const [changing, setChanging] = useState(false);

  // Refs for scroll spy - now using string keys from content types
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const contentContainerRef = useRef<HTMLDivElement>(null);

  const SubmissionIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
      width="12"
      height="15"
      viewBox="0 0 12 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.33333 10.8333H8.33333V5.83333H11.6667L5.83333 0L0 5.83333H3.33333V10.8333ZM0 12.5H11.6667V14.1667H0V12.5Z"
        fill="currentColor"
        fillOpacity="0.87"
      />
    </svg>
  );

  const NoteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16.667 1.6665H3.33366C2.41699 1.6665 1.67533 2.4165 1.67533 3.33317L1.66699 18.3332L5.00033 14.9998H16.667C17.5837 14.9998 18.3337 14.2498 18.3337 13.3332V3.33317C18.3337 2.4165 17.5837 1.6665 16.667 1.6665ZM6.66699 11.6665H5.00033V9.99984H6.66699V11.6665ZM6.66699 9.1665H5.00033V7.49984H6.66699V9.1665ZM6.66699 6.6665H5.00033V4.99984H6.66699V6.6665ZM12.5003 11.6665H8.33366V9.99984H12.5003V11.6665ZM15.0003 9.1665H8.33366V7.49984H15.0003V9.1665ZM15.0003 6.6665H8.33366V4.99984H15.0003V6.6665Z"
        fill="currentColor"
      />
    </svg>
  );

  const CreateMaterialIcon: React.FC<{ className?: string }> = ({
    className,
  }) => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className ?? ''} transition-colors duration-150`}
    >
      <path
        d="M13.3333 0H1.66667C0.741667 0 0 0.75 0 1.66667V13.3333C0 14.25 0.741667 15 1.66667 15H13.3333C14.25 15 15 14.25 15 13.3333V1.66667C15 0.75 14.25 0 13.3333 0ZM11.6667 8.33333H8.33333V11.6667H6.66667V8.33333H3.33333V6.66667H6.66667V3.33333H8.33333V6.66667H11.6667V8.33333Z"
        fill="currentColor"
      />
    </svg>
  );

  const ReferenceBookIcon: React.FC<{ className?: string }> = ({
    className,
  }) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M15.0007 1.6665H5.00065C4.08398 1.6665 3.33398 2.4165 3.33398 3.33317V16.6665C3.33398 17.5832 4.08398 18.3332 5.00065 18.3332H15.0007C15.9173 18.3332 16.6673 17.5832 16.6673 16.6665V3.33317C16.6673 2.4165 15.9173 1.6665 15.0007 1.6665ZM5.00065 3.33317H9.16732V9.99984L7.08398 8.74984L5.00065 9.99984V3.33317Z"
        fill="#3D4863"
        fillOpacity="0.87"
      />
    </svg>
  );

  const typeToIconMap: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    introduction: BookIcon,
    material: PaperIcon,
    movie: PlayIcon,
    note: NoteIcon,
    reference: LinkIcon,
    submission: SubmissionIcon,
    bookReference: ReferenceBookIcon,
  };

  // Small list used for the type picker (label + id). Icons are resolved via `typeToIconMap`.
  const categoryTypes: Array<{ id: string; label: string }> = [
    { id: 'material', label: 'Tài liệu' },
    { id: 'movie', label: 'Bản ghi hình' },
    { id: 'reference', label: 'Đường dẫn' },
    { id: 'note', label: 'Ghi chú' },
    { id: 'bookReference', label: 'Sách tham khảo' },
    { id: 'submission', label: 'Nộp bài' },
    { id: 'introduction', label: 'Giới thiệu' },
  ];

  const rawUserStore = localStorage.getItem('userStore');
  const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
  const State = userStore?.state ?? null;
  const userLocalStore = State.user ?? null;
  // Set initial active tab when courseDetail loads
  useEffect(() => {
    if (
      courseDetail?.content &&
      courseDetail.content.length > 0 &&
      !activeTab
    ) {
      setActiveTab(`${courseDetail.content[0].type}-0`);
    }
  }, [courseDetail, activeTab]);

  // Scroll spy effect
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container || !courseDetail?.content) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 100; // offset for better UX

      // Find which section is currently visible based on content array
      for (let i = courseDetail.content.length - 1; i >= 0; i--) {
        const sectionKey = `${courseDetail.content[i].type}-${i}`;
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

  // Scroll to section when clicking sidebar item
  const scrollToSection = (sectionKey: string) => {
    const section = sectionRefs.current[sectionKey];
    if (section && contentContainerRef.current) {
      contentContainerRef.current.scrollTo({
        top: section.offsetTop - 20,
        behavior: 'smooth',
      });
    }
  };

  // Render content for each section
  // helper: convert youtube url -> embed url
  const toEmbed = (url?: string) => {
    if (!url) return '';
    try {
      const u = new URL(url);
      // youtube watch?v= or youtu.be short link
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : url;
      }
      if (u.hostname === 'youtu.be') {
        const id = u.pathname.slice(1);
        return `https://www.youtube.com/embed/${id}`;
      }
      return url;
    } catch {
      return url ?? '';
    }
  };

  // Map PDFs placed in `src/data/` to URLs (Vite)
  // If your PDF files are in `frontend/src/data/`, this will resolve them to URLs at build time.
  const pdfModules = import.meta.glob('../../../data/*', {
    query: '?url',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const getAssetUrl = (filename?: string) => {
    if (!filename) return '';
    const found = Object.entries(pdfModules).find(([k]) =>
      k.endsWith(filename),
    );
    const val: unknown = found ? found[1] : `@/src/data/${filename}`;

    // Normalize possible module shapes to a string URL.
    if (val == null) return '';
    if (typeof val === 'string') return val;
    // Vite may return modules or Response-like objects in some configs — handle common cases.
    if (typeof val === 'object') {
      // Common ESM default export
      if ('default' in val && typeof val.default === 'string')
        return val.default;
      // If it's a Response object, use its url
      if (typeof (val as Response).url === 'string')
        return (val as Response).url;
      // If it has a 'url' property
      if ('url' in val && typeof val.url === 'string') return val.url;
      // Fallback to string coercion
      try {
        return String(val);
      } catch {
        return '';
      }
    }
    return String(val);
  };

  const renderSectionContent = (item: CourseContent, index: number) => {
    const Icon = typeToIconMap[item.type] || BookIcon;

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

    switch (item.type) {
      case 'introduction':
        return (
          <>
            {userLocalStore?.isManager ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                      <Icon className="size-6 text-gray-700" />
                    </div>
                    <input
                      aria-label="Tên danh mục"
                      type="text"
                      className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                      value={item.title}
                      onChange={(e) =>
                        handleUpdateItem('title', e.target.value)
                      }
                    />
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Icon className="size-5 text-gray-600" />
                      </div>
                      <Listbox
                        value={item.type}
                        onChange={(v) => handleUpdateItem('type', v)}
                      >
                        <div className="relative w-64">
                          <Listbox.Button className="relative w-full cursor-pointer appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <span className="flex items-center">
                              {/* current icon */}
                              {(() => {
                                // const ct = categoryTypes.find((c) => c.id === item.type);
                                const IconComp =
                                  typeToIconMap[item.type] || BookIcon;
                                return IconComp ? (
                                  <IconComp
                                    className="size-5 shrink-0 text-gray-500"
                                    aria-hidden="true"
                                  />
                                ) : null;
                              })()}
                              <span className="ml-2 block truncate">
                                {categoryTypes.find((c) => c.id === item.type)
                                  ?.label || 'Chọn loại danh mục'}
                              </span>
                            </span>
                            {/* <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <svg
                                className="size-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </span> */}
                          </Listbox.Button>

                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                              {categoryTypes.map((type) => {
                                const OptionIcon =
                                  typeToIconMap[type.id] || BookIcon;
                                return (
                                  <Listbox.Option
                                    key={type.id}
                                    value={type.id}
                                    className={({ active }) =>
                                      `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`
                                    }
                                  >
                                    {({ selected }) => (
                                      <span
                                        className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                      >
                                        <OptionIcon
                                          className="size-5 shrink-0 text-gray-500"
                                          aria-hidden="true"
                                        />
                                        <span className="ml-2 block truncate">
                                          {type.label}
                                        </span>
                                      </span>
                                    )}
                                  </Listbox.Option>
                                );
                              })}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg
                          className="size-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteItem}
                    className="text-red-600 hover:text-red-800"
                    title="Xóa danh mục"
                  >
                    <svg
                      className="size-5"
                      width="14"
                      height="18"
                      viewBox="0 0 14 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                        fill="#EA4335"
                      />
                    </svg>
                  </button>
                </div>
                <textarea
                  className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                  rows={3}
                  value={item.data.text || ''}
                  onChange={(e) => handleUpdateData('text', e.target.value)}
                  placeholder="Nhập nội dung..."
                />
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <Icon className="size-6 text-gray-700" />
                  <h2 className="text-2xl font-bold text-gray-800">
                    {item.title}
                  </h2>
                </div>
                <p className="text-gray-600">{item.data.text}</p>
              </>
            )}
          </>
        );
      case 'material':
        return (
          <>
            {userLocalStore?.isManager ? (
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                    <Icon className="size-6 text-[#0329E9]" />
                  </div>
                  <input
                    type="text"
                    aria-label="Tên danh mục"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                    value={item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    placeholder="Tên danh mục"
                  />
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Icon className="size-5 text-gray-600" />
                    </div>
                    <Listbox
                      value={item.type}
                      onChange={(v) => handleUpdateItem('type', v)}
                    >
                      <div className="relative w-64">
                        <Listbox.Button className="relative w-full cursor-default appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <span className="flex items-center">
                            {(() => {
                              const IconComp =
                                typeToIconMap[item.type] || BookIcon;
                              return IconComp ? (
                                <IconComp
                                  className="size-5 text-gray-500"
                                  aria-hidden="true"
                                />
                              ) : null;
                            })()}
                            <span className="ml-2 block truncate">
                              {categoryTypes.find((c) => c.id === item.type)
                                ?.label || 'Chọn loại danh mục'}
                            </span>
                          </span>
                          {/* <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="size-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span> */}
                        </Listbox.Button>

                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {categoryTypes.map((type) => {
                              const OptionIcon =
                                typeToIconMap[type.id] || BookIcon;
                              return (
                                <Listbox.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`
                                  }
                                >
                                  {({ selected }) => (
                                    <span
                                      className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                    >
                                      <OptionIcon
                                        className="size-5 text-gray-500"
                                        aria-hidden="true"
                                      />
                                      <span className="ml-2 block truncate">
                                        {type.label}
                                      </span>
                                    </span>
                                  )}
                                </Listbox.Option>
                              );
                            })}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="size-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDeleteItem}
                  className="text-red-600 hover:text-red-800"
                  title="Xóa danh mục"
                >
                  <svg
                    className="size-5"
                    width="14"
                    height="18"
                    viewBox="0 0 14 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="size-6 text-[#0329E9]" />
                  <h2 className="text-2xl font-bold text-gray-800">
                    {item.title}
                  </h2>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {changing ? (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tiêu đề tài liệu
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={item.data.document?.title || ''}
                      onChange={(e) =>
                        handleUpdateData('document', {
                          ...(item.data.document || {
                            id: `doc-${Date.now()}`,
                          }),
                          title: e.target.value,
                        })
                      }
                      placeholder="Nhập tiêu đề tài liệu"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Mô tả
                    </label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      rows={3}
                      value={item.data.document?.description || ''}
                      onChange={(e) =>
                        handleUpdateData('document', {
                          ...(item.data.document || {
                            id: `doc-${Date.now()}`,
                          }),
                          description: e.target.value,
                        })
                      }
                      placeholder="Nhập mô tả chi tiết về tài liệu"
                    />
                  </div>

                  {/* <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Hạn nộp
                    </label>
                    <input
                      aria-label="Due date"
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={item.data.document?.dueDate || ''}
                      onChange={(e) =>
                        handleUpdateData('document', {
                          ...(item.data.document || {
                            id: `doc-${Date.now()}`,
                          }),
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </div> */}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tên file nguồn
                       <input
                          name="fileUpload"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files;
                            if (file && file[0]) {
                              setFile(file[0]);
                            }
                          }}
                        />

                        <p className="mb-4 text-gray-500">Chưa có tài liệu học tập</p>
                        <div className="inline-block rounded-lg bg-[#0329E9] px-6 py-2 font-medium text-white transition hover:cursor-pointer hover:bg-blue-700">
                          + Thêm tài liệu học tập
                        </div>
                    </label>
                    
                  </div>

                  {item.data.document?.source && (
                    <div className="rounded border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs text-blue-700">
                        <strong>Preview:</strong> File sẽ được tải từ:{' '}
                        {getAssetUrl(item.data.document.source)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {item.data.document ? (
                    <div key={item.data.document.id} className="space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h3 className="mb-1 font-semibold text-gray-800">
                            {item.data.document.title}
                          </h3>
                          <p className="mb-2 text-sm text-gray-600">
                            {item.data.document.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            File: {item.data.document.source}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <a
                            href={getAssetUrl(item.data.document.source)}
                            download
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0329E9] px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                              className="shrink-0"
                            >
                              <path
                                d="M15.8337 7.5H12.5003V2.5H7.50033V7.5H4.16699L10.0003 13.3333L15.8337 7.5ZM4.16699 15V16.6667H15.8337V15H4.16699Z"
                                fill="white"
                              />
                            </svg>
                            <span>Tải tài liệu</span>
                          </a>
                        </div>
                      </div>

                      {/* Inline PDF viewer - falls back to link if browser can't render */}
                      <div className="overflow-hidden rounded-md border">
                        <iframe
                          src={filePDF}
                          title={item.data.document.title}
                          width="100%"
                          height="600px"
                          className="h-[600px] w-full bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có tài liệu nào.</p>
                  )}
                </>
              )}
            </div>
          </>
        );
      case 'movie': {
        return (
          <>
            {userLocalStore?.isManager ? (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                    <Icon className="size-6 text-gray-700" />
                  </div>
                  <input
                    type="text"
                    aria-label="Tên danh mục"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                    value={item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    placeholder="Tên danh mục"
                  />
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Icon className="size-5 text-gray-600" />
                    </div>
                    <Listbox
                      value={item.type}
                      onChange={(v) => handleUpdateItem('type', v)}
                    >
                      <div className="relative w-64">
                        <Listbox.Button className="relative w-full cursor-default appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <span className="flex items-center">
                            {(() => {
                              const IconComp =
                                typeToIconMap[item.type] || BookIcon;
                              return IconComp ? (
                                <IconComp
                                  className="size-5 text-gray-500"
                                  aria-hidden="true"
                                />
                              ) : null;
                            })()}
                            <span className="ml-2 block truncate">
                              {categoryTypes.find((c) => c.id === item.type)
                                ?.label || 'Chọn loại danh mục'}
                            </span>
                          </span>
                          {/* <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="size-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span> */}
                        </Listbox.Button>

                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {categoryTypes.map((type) => {
                              const OptionIcon =
                                typeToIconMap[type.id] || BookIcon;
                              return (
                                <Listbox.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`
                                  }
                                >
                                  {({ selected }) => (
                                    <span
                                      className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                    >
                                      <OptionIcon
                                        className="size-5 text-gray-500"
                                        aria-hidden="true"
                                      />
                                      <span className="ml-2 block truncate">
                                        {type.label}
                                      </span>
                                    </span>
                                  )}
                                </Listbox.Option>
                              );
                            })}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="size-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDeleteItem}
                  className="text-red-600 hover:text-red-800"
                  title="Xóa danh mục"
                >
                  <svg
                    className="size-5"
                    width="14"
                    height="18"
                    viewBox="0 0 14 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3">
                <Icon className="size-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-800">
                  {item.title}
                </h2>
              </div>
            )}
            {changing ? (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tiêu đề video
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={item.data.video?.title || ''}
                    onChange={(e) =>
                      handleUpdateData('video', {
                        ...(item.data.video || { id: `vid-${Date.now()}` }),
                        title: e.target.value,
                      })
                    }
                    placeholder="Nhập tiêu đề video"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Mô tả video
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    rows={3}
                    value={item.data.video?.description || ''}
                    onChange={(e) =>
                      handleUpdateData('video', {
                        ...(item.data.video || { id: `vid-${Date.now()}` }),
                        description: e.target.value,
                      })
                    }
                    placeholder="Nhập mô tả chi tiết về video"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    URL video (YouTube)
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={item.data.video?.url || ''}
                    onChange={(e) =>
                      handleUpdateData('video', {
                        ...(item.data.video || { id: `vid-${Date.now()}` }),
                        url: e.target.value,
                      })
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                {item.data.video?.url && (
                  <div className="rounded border border-blue-200 bg-blue-50 p-3">
                    <p className="mb-2 text-xs font-medium text-blue-700">
                      Preview:
                    </p>
                    <div className="aspect-video w-full overflow-hidden rounded-md border border-blue-300">
                      <iframe
                        src={toEmbed(item.data.video.url)}
                        title="Preview"
                        className="size-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {item.data.video ? (
                  <div className="mb-6">
                    <h3 className="mb-2 font-semibold text-gray-800">
                      {item.data.video.title}
                    </h3>
                    <p className="mb-3 text-sm text-gray-600">
                      {item.data.video.description}
                    </p>
                    <div className="aspect-video w-full overflow-hidden rounded-md border">
                      <iframe
                        src={toEmbed(item.data.video.url)}
                        title={item.data.video.title}
                        className="size-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Chưa có video bài giảng nào.</p>
                )}
              </>
            )}
          </>
        );
      }
      case 'note':
        return (
          <>
            {userLocalStore?.isManager ? (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                    <Icon className="size-6 text-gray-700" />
                  </div>
                  <input
                    type="text"
                    aria-label="Tên danh mục"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                    value={item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    placeholder="Tên danh mục"
                  />
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Icon className="size-5 text-gray-600" />
                    </div>
                    <Listbox
                      value={item.type}
                      onChange={(v) => handleUpdateItem('type', v)}
                    >
                      <div className="relative w-64">
                        <Listbox.Button className="relative w-full cursor-default appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <span className="flex items-center">
                            {(() => {
                              const IconComp =
                                typeToIconMap[item.type] || BookIcon;
                              return IconComp ? (
                                <IconComp
                                  className="size-5 text-gray-500"
                                  aria-hidden="true"
                                />
                              ) : null;
                            })()}
                            <span className="ml-2 block truncate">
                              {categoryTypes.find((c) => c.id === item.type)
                                ?.label || 'Chọn loại danh mục'}
                            </span>
                          </span>
                          {/* <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="size-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span> */}
                        </Listbox.Button>

                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {categoryTypes.map((type) => {
                              const OptionIcon =
                                typeToIconMap[type.id] || BookIcon;
                              return (
                                <Listbox.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`
                                  }
                                >
                                  {({ selected }) => (
                                    <span
                                      className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                    >
                                      <OptionIcon
                                        className="size-5 text-gray-500"
                                        aria-hidden="true"
                                      />
                                      <span className="ml-2 block truncate">
                                        {type.label}
                                      </span>
                                    </span>
                                  )}
                                </Listbox.Option>
                              );
                            })}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="size-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDeleteItem}
                  className="text-red-600 hover:text-red-800"
                  title="Xóa danh mục"
                >
                  <svg
                    className="size-5"
                    width="14"
                    height="18"
                    viewBox="0 0 14 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3">
                <Icon className="size-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-800">
                  {item.title}
                </h2>
              </div>
            )}
            <div className="space-y-4">
              {changing ? (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tiêu đề bài tập
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={item.data.assignment?.title || ''}
                      onChange={(e) =>
                        handleUpdateData('assignment', {
                          ...(item.data.assignment || {
                            id: `assign-${Date.now()}`,
                          }),
                          title: e.target.value,
                        })
                      }
                      placeholder="Nhập tiêu đề bài tập"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Mô tả bài tập
                    </label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      rows={5}
                      value={item.data.assignment?.description || ''}
                      onChange={(e) =>
                        handleUpdateData('assignment', {
                          ...(item.data.assignment || {
                            id: `assign-${Date.now()}`,
                          }),
                          description: e.target.value,
                        })
                      }
                      placeholder="Nhập mô tả chi tiết về bài tập"
                    />
                  </div>

                  {/* <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Hạn nộp
                    </label>
                    <input
                      aria-label="assignment"
                      type="date"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={item.data.assignment?.dueDate || ''}
                      onChange={(e) =>
                        handleUpdateData('assignment', {
                          ...(item.data.assignment || {
                            id: `assign-${Date.now()}`,
                          }),
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </div> */}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tên file đính kèm (nếu có)
                    </label>
                    <div className="flex gap-2">
         
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Chọn file</span>
                        <input
                          name="assignment-file"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files;
                            if (file && file[0]) {
                              // Update source với tên file đã chọn
                              handleUpdateData('assignment', {
                                ...(item.data.assignment || {
                                  id: `assign-${Date.now()}`,
                                }),
                                source: file[0].name,
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {item.data.assignment ? (
                    <div className="">
                      <h3 className="mb-2 font-semibold text-gray-800">
                        {item.data.assignment.title}
                      </h3>
                      <p className="mb-2 text-sm text-gray-600">
                        {item.data.assignment.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Hạn nộp: {item.data.assignment.dueDate}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có bài tập nào.</p>
                  )}
                </>
              )}
            </div>
          </>
        );
      case 'reference':
        return (
          <>
            {userLocalStore?.isManager ? (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                    <Icon className="size-6 text-gray-700" />
                  </div>
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                    value={item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    placeholder="Tên danh mục"
                  />
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Icon className="size-5 text-gray-600" />
                    </div>
                    <Listbox
                      value={item.type}
                      onChange={(v) => handleUpdateItem('type', v)}
                    >
                      <div className="relative w-64">
                        <Listbox.Button className="relative w-full cursor-default appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <span className="flex items-center">
                            {(() => {
                              const IconComp =
                                typeToIconMap[item.type] || BookIcon;
                              return IconComp ? (
                                <IconComp
                                  className="size-5 text-gray-500"
                                  aria-hidden="true"
                                />
                              ) : null;
                            })()}
                            <span className="ml-2 block truncate">
                              {categoryTypes.find((c) => c.id === item.type)
                                ?.label || 'Chọn loại danh mục'}
                            </span>
                          </span>
                          {/* <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="size-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span> */}
                        </Listbox.Button>

                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {categoryTypes.map((type) => {
                              const OptionIcon =
                                typeToIconMap[type.id] || BookIcon;
                              return (
                                <Listbox.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`
                                  }
                                >
                                  {({ selected }) => (
                                    <span
                                      className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                    >
                                      <OptionIcon
                                        className="size-5 text-gray-500"
                                        aria-hidden="true"
                                      />
                                      <span className="ml-2 block truncate">
                                        {type.label}
                                      </span>
                                    </span>
                                  )}
                                </Listbox.Option>
                              );
                            })}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="size-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDeleteItem}
                  className="text-red-600 hover:text-red-800"
                  title="Xóa danh mục"
                >
                  <svg
                    className="size-5"
                    width="14"
                    height="18"
                    viewBox="0 0 14 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3">
                <Icon className="size-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-800">
                  {item.title}
                </h2>
              </div>
            )}
            <div className="space-y-3">
              {changing ? (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tiêu đề tài liệu tham khảo
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={item.data.link?.title || ''}
                      onChange={(e) =>
                        handleUpdateData('link', {
                          ...(item.data.link || { id: `link-${Date.now()}` }),
                          title: e.target.value,
                        })
                      }
                      placeholder="Nhập tiêu đề tài liệu tham khảo"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      URL tham khảo
                    </label>
                    <input
                      type="url"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={item.data.link?.url || ''}
                      onChange={(e) =>
                        handleUpdateData('link', {
                          ...(item.data.link || { id: `link-${Date.now()}` }),
                          url: e.target.value,
                        })
                      }
                      placeholder="https://example.com"
                    />
                  </div>

                  {item.data.link?.url && (
                    <div className="rounded border border-blue-200 bg-blue-50 p-3">
                      <p className="mb-1 text-xs font-medium text-blue-700">
                        Preview link:
                      </p>
                      <a
                        href={item.data.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#0329E9] hover:underline"
                      >
                        <LinkIcon className="size-4" />
                        {item.data.link.title || item.data.link.url}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {item.data.link ? (
                    <a
                      href={item.data.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg p-4 transition hover:bg-blue-50"
                    >
                      <LinkIcon className="size-5 text-[#0329E9]" />
                      <span className="font-medium text-[#0329E9]">
                        {item.data.link.title}
                      </span>
                    </a>
                  ) : (
                    <p className="text-gray-500">
                      Chưa có đường dẫn tham khảo nào.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        );
      case 'submission':
        return (
          <>
            <div className="mb-6 flex items-center justify-between">
              {userLocalStore?.isManager ? (
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                    <Icon className="size-6 text-gray-700" />
                  </div>
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                    value={item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    placeholder="Tên danh mục"
                  />
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Icon className="size-5 text-gray-600" />
                    </div>
                    <Listbox
                      value={item.type}
                      onChange={(v) => handleUpdateItem('type', v)}
                    >
                      <div className="relative w-64">
                        <Listbox.Button className="relative w-full cursor-default appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <span className="flex items-center">
                            {(() => {
                              const IconComp =
                                typeToIconMap[item.type] || BookIcon;
                              return IconComp ? (
                                <IconComp
                                  className="size-5 text-gray-500"
                                  aria-hidden="true"
                                />
                              ) : null;
                            })()}
                            <span className="ml-2 block truncate">
                              {categoryTypes.find((c) => c.id === item.type)
                                ?.label || 'Chọn loại danh mục'}
                            </span>
                          </span>
                          {/* <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="size-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </span> */}
                        </Listbox.Button>

                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {categoryTypes.map((type) => {
                              const OptionIcon =
                                typeToIconMap[type.id] || BookIcon;
                              return (
                                <Listbox.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                                      active
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'text-gray-900'
                                    }`
                                  }
                                >
                                  {({ selected }) => (
                                    <span
                                      className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                    >
                                      <OptionIcon
                                        className="size-5 text-gray-500"
                                        aria-hidden="true"
                                      />
                                      <span className="ml-2 block truncate">
                                        {type.label}
                                      </span>
                                    </span>
                                  )}
                                </Listbox.Option>
                              );
                            })}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="size-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteItem}
                    className="ml-3 text-red-600 hover:text-red-800"
                    title="Xóa danh mục"
                  >
                    <svg
                      className="size-5"
                      width="14"
                      height="18"
                      viewBox="0 0 14 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                        fill="#EA4335"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className="size-6 text-gray-700" />
                    <h2 className="mb-4 text-2xl font-bold text-gray-800">
                      {item.title}
                    </h2>
                  </div>
                  {item.data.status === 'graded' && (
                    <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-2">
                      <span className="font-medium text-green-700">
                        Điểm: {item.data.grade}
                      </span>
                    </div>
                  )}

                  {item.data.status === 'submitted' && (
                    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 px-4 py-2">
                      <span className="font-medium text-yellow-700">
                        Chưa chấm điểm
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {userLocalStore?.isManager ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                {/* Grid 2 cột */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                  {/* Cột bên trái */}
                  <div className="space-y-2">
                    {/* Hạn chót */}
                    <div className="flex flex-col gap-y-2">
                      <div className="flex flex-row space-x-3">
                        {' '}
                        <CalendarIcon className="mr-2 size-5 text-gray-500" />
                        Hạn chót
                      </div>
                      <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                        <input
                          aria-label="datetime-local"
                          type="datetime-local" // Dùng datetime-local để có cả ngày và giờ
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                          value={item.data.dueDate || ''} // Giả sử bạn lưu vào item.data.dueDate
                          onChange={(e) =>
                            handleUpdateData('dueDate', e.target.value)
                          }
                        />
                      </label>
                    </div>

                    {/* Các đuôi tệp cho phép */}
                    <div className=" -mt-4">
                      <div className="mb-2 flex items-center text-sm font-medium text-gray-700">
                        <CheckCircleIcon className="mr-2 size-5 text-gray-500" />
                        Các đuôi tệp cho phép
                      </div>
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        placeholder="pdf, zip"
                        value={item.data.allowedExtensions || ''} // Tạo trường mới
                        onChange={(e) => {
                          const v = e.target.value;
                          // store raw string and derived array of types
                          handleUpdateData('allowedExtensions', v);
                          const arr = v
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          handleUpdateData('allowedTypes', arr);
                        }}
                      />
                    </div>
                  </div>

                  {/* Cột bên phải */}
                  <div className="space-y-6">
                    {/* Kích thước file tối đa */}
                    <div>
                      <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                        <FolderIcon className="mr-2 size-5 text-gray-500" />
                        Kích thước file tối đa
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                          placeholder="500"
                          value={item.data.maxFileSize ?? ''} // numeric
                          onChange={(e) => {
                            const v = e.target.value;
                            handleUpdateData(
                              'maxFileSize',
                              v === '' ? null : Number(v),
                            );
                          }}
                        />
                        <select
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                          value={item.data.maxFileSizeUnit || 'MB'} // Tạo trường mới
                          onChange={(e) =>
                            handleUpdateData('maxFileSizeUnit', e.target.value)
                          }
                          aria-label="Đơn vị kích thước file"
                        >
                          <option>MB</option>
                          <option>KB</option>
                          <option>GB</option>
                        </select>
                      </div>
                    </div>

                    {/* Số file tối đa */}
                    <div>
                      <label className="mb-2 flex items-center text-sm font-medium text-gray-700">
                        <FolderIcon className="mr-2 size-5 text-gray-500" />
                        Số file tối đa
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        placeholder="1"
                        value={
                          item.data.maxFiles ?? item.data.maxFileCount ?? ''
                        } // canonical: maxFiles
                        onChange={(e) =>
                          handleUpdateData(
                            'maxFiles',
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Các nút bấm ở dưới */}
                <p className="mt-4">Mô tả</p>
                <input
                  aria-label="description"
                  className=" mt-2 h-12 w-full rounded-md border border-gray-500 pl-2 text-left focus:outline-none"
                  type="text"
                />
                <div className="mt-8 flex justify-end gap-3">
                  {/* <button className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700">
                    Xóa bài nộp
                  </button> */}
                  <Link
                    to={
                      ('/course/' +
                        id +
                        '/' +
                        (item?.id || '')
                          .replace(/\s+/g, '')
                          .replace(/[^a-zA-Z0-9]/g, '')
                          .toLowerCase()) as any
                    }
                    className="rounded-lg bg-[#0329E9] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Xem bài nộp
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {item.data.status === 'submitted' &&
                  item.data.submittedFile && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex size-10 items-center justify-center rounded bg-red-50">
                          <img
                            // src="./components/pdfIcon.png"
                            src={pdfIcon}
                            alt="PDF file icon"
                            className="size-6 text-red-600"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {item.data.submittedFile.name}
                          </p>
                          <p className="text-sm text-red-600">
                            Submitted at {item.data.submittedFile.submittedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="size-4" />
                          <span>
                            Hạn chót:{' '}
                            <span className="font-semibold text-red-600">
                              {item.data.dueDate}
                            </span>
                          </span>

                          {item.data.submittedFile?.submittedAt &&
                            item.data.dueDate &&
                            new Date(
                              item.data.submittedFile.submittedAt,
                            ).getTime() >
                              new Date(item.data.dueDate).getTime() && (
                              <span className="ml-4 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                Nộp trễ
                              </span>
                            )}
                        </div>
                        {changedFile ? (
                          <div className="w-full flex-1 overflow-hidden rounded-md border">
                            <iframe
                              src={changedPreviewUrl}
                              title={'Bài nộp'}
                              width="100%"
                              height="600px"
                              className="h-[600px] w-full bg-white"
                            />
                          </div>
                        ) : (
                          <label className="relative cursor-pointer self-end text-center">
                            <input
                              name="image"
                              type="file"
                              accept="pdf/*"
                              className="absolute inset-0 size-full cursor-pointer opacity-0"
                              onChange={(e) => {
                                const file = e.target.files;
                                if (file && file[0]) {
                                  setchangedFile(file[0]);
                                }
                              }}
                            />
                            <button className="cursor-pointer rounded-lg bg-[#0329E9] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                              Chỉnh sửa bài nộp
                            </button>
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                {item.data.status === 'graded' && item.data.submittedFile && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                          <div className="flex size-10 items-center justify-center rounded bg-red-50">
                            <img
                              src={pdfIcon}
                              alt="PDF file icon"
                              className="size-6 text-red-600"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {item.data.submittedFile.name}
                            </p>
                            <p className="text-sm text-red-600">
                              Submitted at {item.data.submittedFile.submittedAt}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {item.data.feedback && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-1 text-sm font-semibold text-gray-700">
                          Nhận xét từ giảng viên:
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.data.feedback}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarIcon className="size-4" />
                        <span>
                          Hạn chót:{' '}
                          <span className="font-semibold text-red-600">
                            {item.data.dueDate}
                          </span>
                        </span>
                        {item.data.submittedFile?.submittedAt &&
                          item.data.dueDate &&
                          new Date(
                            item.data.submittedFile.submittedAt,
                          ).getTime() >
                            new Date(item.data.dueDate).getTime() && (
                            <span className="ml-4 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              Nộp trễ
                            </span>
                          )}
                      </div>
                      {/* <button className="rounded-lg bg-[#0329E9] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                        Chỉnh sửa bài nộp
                      </button> */}
                    </div>
                  </div>
                )}

                {item.data.status === 'not-submitted' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DescriptionIcon className="size-4" />
                      <span>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        Donec ipsum magna, rutrum tempus urna quis
                      </span>
                    </div>
                    {file ? (
                      <div className="overflow-hidden rounded-md border">
                        <iframe
                          src={previewUrl}
                          title={'Bài nộp'}
                          width="100%"
                          height="600px"
                          className="h-[600px] w-full bg-white"
                        />
                      </div>
                    ) : (
                      <label className="block cursor-pointer rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <input
                          name="image"
                          type="file"
                          accept="pdf/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files;
                            if (file && file[0]) {
                              setFile(file[0]);
                            }
                          }}
                        />

                        <p className="mb-4 text-gray-500">Chưa có bài nộp</p>
                        <div className="inline-block rounded-lg bg-[#0329E9] px-6 py-2 font-medium text-white transition hover:bg-blue-700">
                          + Thêm bài nộp
                        </div>
                      </label>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarIcon className="size-4" />
                      <span>Hạn chót: {item.data.dueDate}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        );
      case 'bookReference':
        return (
          <>
            {userLocalStore?.isManager ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
                    <Icon className="size-6 text-gray-700" />
                  </div>
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none"
                    value={item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    placeholder="Tên danh mục"
                  />
                  <div className="relative">
                    {/* <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Icon className="size-5 text-gray-600" />
                    </div> */}
                    <Listbox
                      value={item.type}
                      onChange={(v) => handleUpdateItem('type', v)}
                    >
                      <div className="relative w-64">
                        <Listbox.Button className="relative w-full cursor-default appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left text-sm font-medium focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                          <span className="flex items-center">
                            {(() => {
                              const IconComp =
                                typeToIconMap[item.type] || BookIcon;
                              return IconComp ? (
                                <IconComp className="mr-2 size-5 text-gray-600" />
                              ) : null;
                            })()}
                            {item.type}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            {/* <ChevronUpDownIcon
                              className="size-5 text-gray-600"
                              aria-hidden="true"
                            /> */}
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md bg-white py-0.5 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {categoryTypes.map((type) => {
                              const OptionIcon = 
                                typeToIconMap[type.id] || BookIcon;
                              return (
                                <Listbox.Option
                                  key={type.id}
                                  value={type.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                                      active
                                        ? 'bg-blue-100 text-blue-900'
                                        : 'text-gray-900'
                                    }`
                                  }
                                >
                                  {({ selected }) => (
                                    <span
                                      className={`flex items-center ${selected ? 'font-medium' : 'font-normal'}`}
                                    >
                                      <OptionIcon
                                        className="size-5 text-gray-500"
                                        aria-hidden="true"
                                      />
                                      <span className="ml-2 block truncate">
                                        {type.label}
                                      </span>
                                    </span>
                                  )}
                                </Listbox.Option>
                              );
                            }
                            )}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronUpDownIcon
                        className="size-4 text-gray-600"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteItem}
                    className="ml-3 text-red-600 hover:text-red-800"
                    title="Xóa danh mục"
                  >
                    <svg
                      className="size-5"
                      width="14"
                      height="18"
                      viewBox="0 0 14 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z"
                        fill="#EA4335"
                      />
                    </svg>
                  </button>
                </div>

                {/* Form thêm sách tham khảo */}
                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="space-y-3">
                    {item.data?.books?.map((book, bookIndex) => (
                      <div key={bookIndex} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                            value={book.name || ''}
                            onChange={(e) => {
                              const books = [...(item.data?.books || [])];
                              books[bookIndex] = { ...books[bookIndex], name: e.target.value };
                              handleUpdateData('books', books);
                            }}
                            placeholder="Tên sách tham khảo"
                          />
                          <input
                            type="url"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            value={book.url || ''}
                            onChange={(e) => {
                              const books = [...(item.data?.books || [])];
                              books[bookIndex] = { ...books[bookIndex], url: e.target.value };
                              handleUpdateData('books', books);
                            }}
                            placeholder="https://..."
                          />
                        </div>
                        <button
                          onClick={() => {
                            const books = (item.data?.books || []).filter((_, i) => i !== bookIndex);
                            handleUpdateData('books', books);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Xóa sách"
                        >
                          <svg className="size-5" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 16C1 17.1 1.9 18 3 18H11C12.1 18 13 17.1 13 16V4H1V16ZM14 1H10.5L9.5 0H4.5L3.5 1H0V3H14V1Z" fill="#EA4335" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const books = [...(item.data?.books || []), { name: '', url: '' }];
                      handleUpdateData('books', books);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <CreateMaterialIcon className="size-4" />
                    <span>Thêm sách tham khảo</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-4 text-2xl font-bold text-gray-800">
                  {item.title}
                </h2>
                {item.data?.books && item.data.books.length > 0 && (
                  <div className="space-y-3">
                    {item.data.books.map((book, bookIndex) => (
                      <div key={bookIndex} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                        <ReferenceBookIcon className="size-8 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{book.name}</h3>
                          {book.url && (
                            <a
                              href={book.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {book.url}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };

  if (isCourseLoading && !courseDetail) {
    return (
      <StudyLayout>
        <div className="flex min-h-64 items-center justify-center text-gray-600">
          Đang tải dữ liệu khóa học...
        </div>
      </StudyLayout>
    );
  }

  if (courseError || !course) {
    return (
      <StudyLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h1 className="mb-4 text-3xl font-bold text-gray-800">
            {courseError ?? 'Không tìm thấy khóa học'}
          </h1>
          <p className="mb-8 text-gray-600">
            Khóa học với ID "{id}" không tồn tại.
          </p>
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="rounded-lg bg-[#0329E9] px-6 py-3 text-white transition hover:bg-blue-700"
          >
            Quay lại Dashboard
          </button>
        </div>
      </StudyLayout>
    );
  }

  if (userLocalStore?.isCoordinator) {
    return (
      <StudyLayout>
        <div>
          {/* Back button */}
          <button
            onClick={() => navigate({ to: '/statistical' })}
            className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
          >
            <ArrowLeft className="size-5" />
            <span className="font-medium">Quay lại</span>
          </button>

          {/* Course header with background */}
          <div
            className="relative mb-8 rounded-lg p-8 text-white shadow-lg"
            style={{
              backgroundImage: `url(${course.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '250px',
            }}
          >
            <div className="relative z-10">
              <p className="mb-2 text-sm font-medium text-gray-200">
                {course.code}
              </p>
              <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-gray-100">
                Giảng viên: {course.instructor}
              </p>

              {/* Button "tổng quan" + "Đánh giá" */}
              <div className="mt-6 flex gap-4">
                <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
                  Tổng quan
                </button>
                <button
                  onClick={() => {
                    navigate({ to: `/course/${id}/rating` });
                  }}
                  className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                >
                  Đánh giá
                </button>
              </div>
            </div>
          </div>

          {/* Course statistics */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-[#0329E9]">
                {course.stats.documents}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Tài liệu học tập
              </div>
            </div>
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-green-600">
                {course.stats.links}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Đường dẫn tham khảo
              </div>
            </div>
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-orange-600">
                {course.stats.assignments}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Bài tập được giao
              </div>
            </div>
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <div className="mb-2 text-3xl font-bold text-purple-600">
                {course.sessionsOrganized}
              </div>
              <div className="text-sm font-medium text-gray-600">
                Buổi học đã tổ chức
              </div>
            </div>
          </div>

          {/* Course content sections */}
          <div className="space-y-6">
            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Thông tin khóa học
              </h2>
              <div className="space-y-3 text-gray-600">
                <p>
                  <span className="font-semibold">Mã khóa học:</span>{' '}
                  {course.code}
                </p>
                <p>
                  <span className="font-semibold">Tên khóa học:</span>{' '}
                  {course.title}
                </p>
                <p>
                  <span className="font-semibold">Giảng viên:</span>{' '}
                  {course.instructor}
                </p>
              </div>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Mô tả khóa học
              </h2>
              <p className="text-gray-600">
                Đây là khóa học {course.title}. Khóa học cung cấp kiến thức nền
                tảng và thực hành về lĩnh vực này. Sinh viên sẽ được học tập qua
                các tài liệu, bài giảng và bài tập thực hành.
              </p>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Tài liệu học tập
              </h2>
              <div className="text-gray-600">
                <p className="mb-2">
                  Có{' '}
                  <span className="font-semibold">
                    {course.stats.documents}
                  </span>{' '}
                  tài liệu có sẵn trong khóa học này.
                </p>
                <p className="text-sm text-gray-500">
                  Tài liệu sẽ được cập nhật trong các phiên bản tương lai.
                </p>
              </div>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}
            >
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Danh sách học viên
              </h2>
              <div className="text-gray-600">
                <p className="mb-4">
                  Tổng số học viên:{' '}
                  <span className="font-semibold">
                    {course.students.length}
                  </span>
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          STT
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Họ và tên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Email
                        </th>
                        <th>
                          Số bài nộp
                        </th>
                        <th>
                          Số buổi tham gia
                        </th>
                        <th>
                          Điểm trung bình
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {course.students.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            <Link to={`/profile/$id` as string} className="text-sm font-medium text-gray-800">
                              {student.name}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {student.email}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-900">
                            {student.numberOfSubmissions ?? 0} / {course.stats.assignments}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-900">
                            {student.numberOfJoinedSessions ?? 0} / {course.numberTotalSessions ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-900">
                            {student.averageScore ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StudyLayout>
    );
  }

  // Nếu có data chi tiết, hiển thị layout với sidebar tabs
  if (courseDetail) {
    return (
      <StudyLayout>
        <div className="font-['Archivo']">
          {/* Back button */}
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
          >
            <ArrowLeft className="size-5" />
            <span className="font-medium">Quay lại</span>
          </button>

          {/* Course header */}
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
              <p className="mb-2 text-sm font-medium text-gray-200">
                {course.code}
              </p>
              <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
              <p className="text-lg text-gray-100">
                Giảng viên: {course.instructor}
              </p>

              {/* Button "tổng quan" + "Đánh giá" */}
              <div className="mt-6 flex gap-4">
                <button className="rounded-lg bg-[#0329E9] px-4 py-2 font-medium backdrop-blur-sm transition hover:bg-[#0329E9]/80">
                  Tổng quan
                </button>
                {changing && (
                  <>
                    <Link
                      to={'/course/$id/submissions' as any}
                      className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                    >
                      Bài nộp
                    </Link>
                    <Link
                      to={'/course/$id/stastical' as any}
                      className="font-baloo rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                    >
                      Xem thống kê
                    </Link>
                  </>
                )}
                {!changing && (
                  <button
                    onClick={() => {
                      navigate({ to: `/course/${id}/rating` });
                    }}
                    className="rounded-lg bg-white px-4 py-2 font-medium text-[#0329E9] backdrop-blur-sm transition hover:bg-white/80"
                  >
                    Đánh giá
                  </button>
                )}
              </div>
            </div>

            {userLocalStore && userLocalStore.isManager && (
              <div className="absolute bottom-4 right-4">
                <label
                  htmlFor="editing-toggle"
                  className="flex cursor-pointer items-center gap-2 text-white"
                >
                  <input
                    id="editing-toggle"
                    type="checkbox"
                    checked={changing}
                    onChange={() => setChanging(!changing)}
                    aria-label="Chỉnh sửa chế độ"
                    title="Bật/tắt chế độ chỉnh sửa"
                    className="size-4"
                  />
                  <span className="ml-1">Chỉnh sửa</span>
                </label>
              </div>
            )}
          </div>

          {/* Layout with sidebar + content */}
          <div className="flex items-start gap-6">
            {/* Sidebar timeline */}
            <div className="w-64 shrink-0">
              <div className="sticky top-6 h-full py-4">
                <div className="relative h-full pl-6">
                  {/* Vertical line - extends full height */}
                  <div className="absolute inset-y-0 left-[13px] w-0.5 bg-gray-300" />

                  {/* Timeline items - dynamically from content */}
                  {courseDetail.content.map((item, index) => {
                    const Icon = typeToIconMap[item.type] || BookIcon;
                    const sectionKey = `${item.type}-${index}`;
                    const isActive = activeTab === sectionKey;
                    const isFirst = index === 0;

                    return (
                      <button
                        key={sectionKey}
                        onClick={() => scrollToSection(sectionKey)}
                        className={`relative ${isFirst ? 'mt-2' : 'mt-8'} flex w-full items-center gap-3 pl-3 text-left transition-colors`}
                      >
                        <div
                          className={`absolute -left-6 flex size-7 items-center justify-center rounded-full border-2 bg-white transition ${
                            isActive ? 'border-[#0329E9]' : 'border-gray-300'
                          }`}
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

            {/* Main content area with scroll */}
            <div className="flex-1">
              {changing && (
                <div className="mb-4 mt-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[#3D4863] bg-white p-6">
                  <button
                    className="font-baloo rounded-lg px-6 py-3 font-medium text-black shadow-sm transition hover:bg-blue-700 hover:text-white"
                    onClick={() => {
                      // Tạo danh mục mới ngay lập tức
                      const defaultType = 'material';

                      // Tạo dữ liệu mặc định đầy đủ theo từng loại
                      const getDefaultData = (type: CourseContentType): CourseContent => {
                        switch (type) {
                          case 'introduction':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'introduction',
                              title: 'Giới thiệu mới',
                              data: {
                                text: 'Nội dung giới thiệu...',
                              },
                            };
                          case 'material':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'material',
                              title: 'Tài liệu mới',
                              data: {},
                            };
                          case 'movie':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'movie',
                              title: 'Video mới',
                              data: {},
                            };
                          case 'note':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'note',
                              title: 'Ghi chú mới',
                              data: {},
                            };
                          case 'reference':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'reference',
                              title: 'Tham khảo mới',
                              data: {},
                            };
                          case 'submission':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'submission',
                              title: 'Bài nộp mới',
                              data: {
                                status: 'not-submitted',
                                dueDate: new Date().toISOString().split('T')[0],
                                canEdit: true,
                              },
                            };
                          case 'bookReference':
                            return {
                              id: `content-${Date.now()}`,
                              type: 'bookReference',
                              title: 'Sách tham khảo mới',
                              data: { books: [] },
                            };
                          default:
                            return {
                              id: `content-${Date.now()}`,
                              type: 'material',
                              title: 'Danh mục mới',
                              data: {},
                            };
                        }
                      };

                      const newCategoryData = getDefaultData(defaultType);

                      // Thêm vào courseDetail content ngay
                      if (courseDetail) {
                        setCourseDetail({
                          ...courseDetail,
                          content: [
                            ...(courseDetail.content || []),
                            newCategoryData,
                          ],
                        });
                      }

                      // Scroll đến section mới
                      const newIndex = courseDetail?.content?.length || 0;
                      const newSectionKey = `${newCategoryData.type}-${newIndex}`;
                      setActiveTab(newSectionKey);

                      setTimeout(() => {
                        scrollToSection(newSectionKey);
                      }, 100);
                    }}
                  >
                    <div>
                      <CreateMaterialIcon className="mr-2 inline-block " /> Thêm tài liệu
                    </div>
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
                      ref={(el) => {
                        sectionRefs.current[sectionKey] = el;
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
      </StudyLayout>
    );
  }

  return (
    <StudyLayout>
      <Link to="/dashboard" className="hover:font-bold">
        NOTHING FOUND COMBACK LATER
      </Link>
    </StudyLayout>
  );
}
