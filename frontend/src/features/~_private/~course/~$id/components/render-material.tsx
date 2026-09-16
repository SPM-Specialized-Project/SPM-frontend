import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';


import BookIcon from '@/components/icons/book';
import type { CourseContent } from '@/types/course-content';
import filePDF from 'public/group07_report 02.pdf';

import { categoryTypes, typeToIconMap } from './course-constants';
import type { SectionRendererProps } from './section-renderer-types';

export function MaterialContent({
  item, changing, userLocalStore, onUpdateItem, onUpdateData, onDelete, setFile, getAssetUrl,
}: SectionRendererProps<Extract<CourseContent, { type: 'material' }>>) {
  const Icon = typeToIconMap[item.type] || BookIcon;

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
                onClick={onDelete}
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
                      onUpdateData('document', {
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
                      onUpdateData('document', {
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
                      onUpdateData('document', {
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
}
