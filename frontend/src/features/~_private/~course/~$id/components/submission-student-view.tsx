import CalendarIcon from '@/components/icons/calendar';
import DescriptionIcon from '@/components/icons/description';
import type { CourseContent } from '@/types/course-content';

import pdfIcon from './pdfIcon.png';
import type { SectionRendererProps } from './section-renderer-types';

type SubmissionItem = Extract<CourseContent, { type: 'submission' }>;
type SubmissionStudentProps = Pick<SectionRendererProps<SubmissionItem>, 'item' | 'file' | 'setFile' | 'changedFile' | 'setchangedFile' | 'previewUrl' | 'changedPreviewUrl'>;

export function SubmissionStudentView({ item, file, setFile, changedFile, setchangedFile, previewUrl, changedPreviewUrl }: SubmissionStudentProps) {
  return (
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
  );
}

