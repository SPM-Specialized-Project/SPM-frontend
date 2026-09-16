import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';

import BookIcon from '@/components/icons/book';
import type { CourseContent } from '@/types/course-content';

import { categoryTypes, typeToIconMap } from './course-constants';
import type { SectionRendererProps } from './section-renderer-types';

export function IntroductionContent({
  item, userLocalStore, onUpdateItem, onUpdateData, onDelete,
}: SectionRendererProps<Extract<CourseContent, { type: 'introduction' }>>) {
  const Icon = typeToIconMap[item.type] || BookIcon;

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
                      onUpdateItem('title', e.target.value)
                    }
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
              <textarea
                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
                value={item.data.text || ''}
                onChange={(e) => onUpdateData('text', e.target.value)}
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
}
