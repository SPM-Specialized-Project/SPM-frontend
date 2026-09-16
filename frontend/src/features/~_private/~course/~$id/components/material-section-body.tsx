import type { CourseContent } from '@/types/course-content';
import filePDF from 'public/group07_report 02.pdf';
import type { SectionRendererProps } from './section-renderer-types';

type MaterialItem = Extract<CourseContent, { type: 'material' }>;
type MaterialBodyProps = Pick<SectionRendererProps<MaterialItem>, 'item' | 'changing' | 'onUpdateData' | 'setFile' | 'getAssetUrl'>;

export function MaterialSectionBody({ item, changing, onUpdateData, setFile, getAssetUrl }: MaterialBodyProps) {
  return (
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
  );
}
