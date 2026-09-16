import { Link } from '@tanstack/react-router';

import CalendarIcon from '@/components/icons/calendar';
import { CheckCircleIcon, FolderIcon } from './course-icons';
import type { SectionRendererProps } from './section-renderer-types';
import type { CourseContent } from '@/types/course-content';

type SubmissionItem = Extract<CourseContent, { type: 'submission' }>;
type SubmissionManagerProps = Pick<SectionRendererProps<SubmissionItem>, 'item' | 'onUpdateData'> & { id: string };

export function SubmissionManagerView({ item, onUpdateData, id }: SubmissionManagerProps) {
  return (
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
                          onUpdateData('dueDate', e.target.value)
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
                        onUpdateData('allowedExtensions', v);
                        const arr = v
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        onUpdateData('allowedTypes', arr);
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
                          onUpdateData(
                            'maxFileSize',
                            v === '' ? null : Number(v),
                          );
                        }}
                      />
                      <select
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        value={item.data.maxFileSizeUnit || 'MB'} // Tạo trường mới
                        onChange={(e) =>
                          onUpdateData('maxFileSizeUnit', e.target.value)
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
                        onUpdateData(
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
  );
}

