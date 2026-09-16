import { Listbox, Transition } from '@headlessui/react';
import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';

import BookIcon from '@/components/icons/book';
import CalendarIcon from '@/components/icons/calendar';
import DescriptionIcon from '@/components/icons/description';
import type { CourseContent } from '@/types/course-content';

import { categoryTypes, typeToIconMap } from './course-constants';
import { CheckCircleIcon, FolderIcon } from './course-icons';
import pdfIcon from './pdfIcon.png';
import type { SectionRendererProps } from './section-renderer-types';

export function SubmissionContent({
  item, userLocalStore, onUpdateItem, onUpdateData, onDelete, id, file, setFile, changedFile, setchangedFile, previewUrl, changedPreviewUrl,
}: SectionRendererProps<Extract<CourseContent, { type: 'submission' }>>) {
  const Icon = typeToIconMap[item.type] || BookIcon;

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
                  onChange={(e) => onUpdateItem('title', e.target.value)}
                  placeholder="Tên danh mục"
                />
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icon className="size-5 text-gray-600" />
                  </div>
                  <Listbox
                    value={item.type}
                    onChange={(v) => onUpdateItem('type', v)}
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
                  onClick={onDelete}
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
}
