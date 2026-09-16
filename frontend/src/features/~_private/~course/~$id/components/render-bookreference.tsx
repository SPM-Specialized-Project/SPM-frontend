import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

import BookIcon from '@/components/icons/book';
import type { CourseContent } from '@/types/course-content';

import { categoryTypes, typeToIconMap } from './course-constants';
import { CreateMaterialIcon, ReferenceBookIcon } from './course-icons';
import type { SectionRendererProps } from './section-renderer-types';

export function BookReferenceContent({
  item, userLocalStore, onUpdateItem, onUpdateData, onDelete,
}: SectionRendererProps<Extract<CourseContent, { type: 'bookReference' }>>) {
  const Icon = typeToIconMap[item.type] || BookIcon;

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
                  onChange={(e) => onUpdateItem('title', e.target.value)}
                  placeholder="Tên danh mục"
                />
                <div className="relative">
                  {/* <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icon className="size-5 text-gray-600" />
                  </div> */}
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
                            onUpdateData('books', books);
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
                            onUpdateData('books', books);
                          }}
                          placeholder="https://..."
                        />
                      </div>
                      <button
                        onClick={() => {
                          const books = (item.data?.books || []).filter((_, i) => i !== bookIndex);
                          onUpdateData('books', books);
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
                    onUpdateData('books', books);
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
                      <ReferenceBookIcon className="size-8 shrink-0" />
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
}
