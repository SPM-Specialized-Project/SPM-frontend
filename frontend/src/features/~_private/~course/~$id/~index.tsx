import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { courseDriver, type Course, type DataCourses } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { BackendDriverError, backendDriver } from '@/services/backend-driver';
import type { CourseContent } from '@/types/course-content';

import { CoordinatorCourseView } from './components/coordinator-course-view';
import { CourseContentRenderer } from './components/course-content-renderer';
import { CourseDetailView } from './components/course-detail-view';

export const Route = createFileRoute('/_private/course/$id/')({
  beforeLoad: async () => {
    document.title = 'Chi tiết khóa học - Tutor Support System';
  },
  component: CourseDetailsComponent,
});

function CourseDetailsComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | undefined>(() => courseDriver.getById(id));
  const [courseDetail, setCourseDetail] = useState<DataCourses | undefined>();
  const [isCourseLoading, setIsCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [changedFile, setchangedFile] = useState<File | null>(null);
  const [changing, setChanging] = useState(false);

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

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ''),
    [file],
  );
  const changedPreviewUrl = useMemo(
    () => (changedFile ? URL.createObjectURL(changedFile) : ''),
    [changedFile],
  );

  const rawUserStore = localStorage.getItem('userStore');
  const userStore = rawUserStore ? JSON.parse(rawUserStore) : null;
  const userLocalStore = userStore?.state?.user ?? null;

  const toEmbed = (url?: string) => {
    if (!url) return '';
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes('youtube.com')) {
        const videoId = parsedUrl.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
      if (parsedUrl.hostname === 'youtu.be') {
        return `https://www.youtube.com/embed/${parsedUrl.pathname.slice(1)}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const pdfModules = import.meta.glob('../../../data/*', {
    query: '?url',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const getAssetUrl = (filename?: string) => {
    if (!filename) return '';
    const found = Object.entries(pdfModules).find(([key]) => key.endsWith(filename));
    const value: unknown = found ? found[1] : `@/src/data/${filename}`;
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if ('default' in value && typeof value.default === 'string') return value.default;
      if (typeof (value as Response).url === 'string') return (value as Response).url;
      if ('url' in value && typeof value.url === 'string') return value.url;
    }
    return String(value);
  };

  const renderSectionContent = (item: CourseContent, index: number) => (
    <CourseContentRenderer
      id={id}
      item={item}
      index={index}
      changing={changing}
      courseDetail={courseDetail}
      setCourseDetail={setCourseDetail}
      userLocalStore={userLocalStore}
      file={file}
      setFile={setFile}
      changedFile={changedFile}
      setchangedFile={setchangedFile}
      previewUrl={previewUrl}
      changedPreviewUrl={changedPreviewUrl}
      toEmbed={toEmbed}
      getAssetUrl={getAssetUrl}
    />
  );

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
          <p className="mb-8 text-gray-600">Khóa học với ID "{id}" không tồn tại.</p>
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
        <CoordinatorCourseView
          course={course}
          id={id}
          onBack={() => navigate({ to: '/statistical' })}
          onRate={() => navigate({ to: `/course/${id}/rating` })}
        />
      </StudyLayout>
    );
  }

  if (courseDetail) {
    return (
      <StudyLayout>
        <CourseDetailView
          course={course}
          courseDetail={courseDetail}
          setCourseDetail={setCourseDetail}
          id={id}
          changing={changing}
          setChanging={setChanging}
          isManager={Boolean(userLocalStore?.isManager)}
          onBack={() => navigate({ to: '/dashboard' })}
          onRate={() => navigate({ to: `/course/${id}/rating` })}
          renderSectionContent={renderSectionContent}
        />
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
