import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

import type { UnifiedRegistration } from './result-types';
import { Pagination, StatusBadge, TableCell, TableHeader } from './result-ui';

export function UnmatchedRequestsPanel({
  requests,
  searchName,
  searchSubject,
  onSearchNameChange,
  onSearchSubjectChange,
  currentPage,
  totalPages,
  onPageChange,
}: {
  requests: UnifiedRegistration[];
  searchName: string;
  searchSubject: string;
  onSearchNameChange: (value: string) => void;
  onSearchSubjectChange: (value: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-800">LƯỢT ĐĂNG KÝ CHƯA MATCH</h2>
      <div className="mb-4 flex items-center gap-4">
        <SearchField value={searchName} onChange={onSearchNameChange} placeholder="Nhập tên học sinh để tìm kiếm..." />
        <SearchField value={searchSubject} onChange={onSearchSubjectChange} placeholder="Nhập mã môn học..." />
      </div>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800 text-white">
              <tr>
                <TableHeader>Mã môn học</TableHeader><TableHeader>Họ tên</TableHeader><TableHeader>Ngôn ngữ</TableHeader>
                <TableHeader>Hình thức</TableHeader><TableHeader>Role</TableHeader><TableHeader>Địa điểm</TableHeader>
              <TableHeader>Yêu cầu đặc biệt</TableHeader><TableHeader>Trạng thái</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {requests.map((request) => (
                <tr key={request.id}>
                  <TableCell className="max-w-24 truncate">{request.courseCode}</TableCell>
                  <TableCell className="max-w-xs truncate"><a href={`/profile/${request.id}`} className="font-medium text-blue-600 hover:underline">{request.name}</a></TableCell>
                  <TableCell className="px-2">{request.language}</TableCell><TableCell className="px-2">{request.type}</TableCell>
                  <TableCell className="px-2">{request.role}</TableCell><TableCell className="max-w-32 truncate">{request.location}</TableCell>
                  <TableCell className="max-w-48"><span className="block w-full truncate" title={request.request}>{request.request}</span></TableCell>
                  <TableCell><StatusBadge status={request.status} /></TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="size-5 text-gray-400" /></div>
      <input type="text" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border-gray-300 py-2 pl-10 shadow-sm" />
    </div>
  );
}
