import { Link } from '@tanstack/react-router';

import type { UnifiedRegistration } from './result-types';
import { Pagination, StatusBadge, TableCell, TableHeader } from './result-ui';

export function DataRequestTable({
  requests,
  totalResults,
  currentPage,
  totalPages,
  onPageChange,
  onApproveTutor,
  reviewingTutorId,
}: {
  requests: UnifiedRegistration[];
  totalResults: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onApproveTutor: (request: UnifiedRegistration) => void;
  reviewingTutorId: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white">
            <tr>
              <TableHeader>Mã môn học</TableHeader><TableHeader>Họ tên</TableHeader><TableHeader>Ngôn ngữ</TableHeader>
              <TableHeader>Hình thức</TableHeader><TableHeader>Role</TableHeader><TableHeader>Địa điểm</TableHeader>
              <TableHeader>Yêu cầu đặc biệt</TableHeader><TableHeader>Trạng thái</TableHeader><TableHeader>Thao tác</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {requests.map((request) => (
              <tr key={request.id}>
                <TableCell>{request.courseCode}</TableCell>
                <TableCell><Link to={`/profile/${request.id}` as string} className="font-medium text-blue-600 hover:underline">{request.name}</Link></TableCell>
                <TableCell>{request.language}</TableCell><TableCell>{request.type}</TableCell><TableCell>{request.role}</TableCell>
                <TableCell>{request.location}</TableCell>
                <TableCell><span className="block w-32 truncate" title={request.request}>{request.request.substring(0, 20)}...</span></TableCell>
                <TableCell><StatusBadge status={request.status} /></TableCell>
                <TableCell>
                  {request.role === 'Tutor' && request.status.toLowerCase() === 'pending' && (
                    <button
                      type="button"
                      disabled={Boolean(reviewingTutorId)}
                      onClick={() => onApproveTutor(request)}
                      className="rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {reviewingTutorId === request.id ? 'Đang lưu…' : 'Duyệt tutor'}
                    </button>
                  )}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-600">
        <div>{totalResults} kết quả — trang {totalPages === 0 ? 0 : currentPage}/{Math.max(totalPages, 1)}</div>
        {totalPages <= 1 ? <span className="text-xs italic text-gray-400">Không có trang để chuyển</span> : null}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
