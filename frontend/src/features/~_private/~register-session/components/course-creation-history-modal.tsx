import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';

import {
  HistoryIcon,
  LanguageIcon,
  SessionTypeIcon,
} from './coordinator-icons';

type CourseCreationHistoryModalProps = {
  requests: readonly CourseCreationRequest[];
  onClose: () => void;
  onRefresh: () => void;
  onDeleteRequest: (requestId: string) => boolean;
};

export function CourseCreationHistoryModal({
  requests,
  onClose,
  onRefresh,
  onDeleteRequest,
}: CourseCreationHistoryModalProps) {
  return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4" onClick={() => onClose()}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-700 p-6 text-white">
              <h2 className="text-2xl font-bold">Lịch sử môn học đã tạo</h2>
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-lg p-2 hover:bg-white/20"
              >
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
              {requests.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <HistoryIcon className="mx-auto mb-4 size-16 opacity-20" />
                  <p className="text-lg">Chưa có môn học nào được tạo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-custom-yellow transition hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {request.courseName}
                          </h3>
                          <p className="text-sm text-gray-500">Mã: {request.courseCode}</p>
                        </div>
                         {/* <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${request.status === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {request.status === 'Approved' ? 'Đã duyệt' : request.status === 'Rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                        </span> */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa môn học "${request.courseName}"?`)) {
                              if (onDeleteRequest(request.id)) {
                                // Force re-render by closing and reopening modal
                                onClose();
                                setTimeout(() => onRefresh(), 0);
                              }
                            }
                          }}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                          title="Xóa môn học"
                        >
                          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      {/* <div className="mb-4 flex items-center text-sm text-gray-600">
                        <span className="ml-4 border p-2 text-sm italic text-gray-600">"{request.reasons}"</span>
                      </div> */}

                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="line-clamp-2">{request.description}</p>

                        <div className="flex flex-wrap gap-4 pt-2">
                          {request.languages.length > 0 && (
                            <div className="flex items-center gap-2">
                              <LanguageIcon className="size-4" />
                              <span>{request.languages.map(l => l.name).join(', ')}</span>
                            </div>
                          )}

                          {request.sessionTypes.length > 0 && (
                            <div className="flex items-center gap-2">
                              <SessionTypeIcon className="size-4" />
                              <span>{request.sessionTypes.map(t => t.name).join(', ')}</span>
                            </div>
                          )}

                          {/* {request.timeSlots && request.timeSlots.length > 0 && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="size-4" />
                              <span>{request.timeSlots.length} khung giờ</span>
                            </div>
                          )} */}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                          <span>Tạo bởi: {request.coordinatorName}</span>
                          <span>
                            {new Date(request.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
