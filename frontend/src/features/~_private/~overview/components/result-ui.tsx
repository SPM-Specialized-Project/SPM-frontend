import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';
import type { ReactNode, SVGProps } from 'react';

import type { Session } from '@/components/data/~mock-session';
import { Trash } from '@/components/icons';

export function UserPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1 14C1 14 0 14 0 13C0 12 1 9 6 9C11 9 12 12 12 13C12 14 11 14 11 14H1Z" fill="#3D4863" />
      <path d="M6 8C6.79565 8 7.55871 7.68393 8.12132 7.12132C8.68393 6.55871 9 5.79565 9 5C9 4.20435 8.68393 3.44129 8.12132 2.87868C7.55871 2.31607 6.79565 2 6 2C5.20435 2 4.44129 2.31607 3.87868 2.87868C3.31607 3.44129 3 4.20435 3 5C3 5.79565 3.31607 6.55871 3.87868 7.12132C3.44129 7.68393 4.20435 8 6 8Z" fill="#3D4863" />
      <path fillRule="evenodd" clipRule="evenodd" d="M13.5 5C13.6326 5 13.7598 5.05268 13.8536 5.14645C13.9473 5.24021 14 5.36739 14 5.5V7H15.5C15.6326 7 15.7598 7.05268 15.8536 7.14645C15.9473 7.24021 16 7.36739 16 7.5C16 7.63261 15.9473 7.75979 15.8536 7.85355C15.7598 7.94732 15.6326 8 15.5 8H14V9.5C14 9.63261 13.9473 9.75979 13.8536 9.85355C13.7598 9.94732 13.6326 9.94732 13.5 9.85355C13.0527 9.94732 13 9.63261 13 9.5V8H11.5C11.3674 8 11.2402 7.94732 11.1464 7.85355C11.0527 7.75979 11 7.63261 11 7.5C11 7.36739 11.0527 7.24021 11.1464 7.14645C11.2402 7.05268 11 7 11.5 7H13V5.5C13 5.36739 13.0527 5.24021 13.1464 5.14645C13.2402 5.05268 13.3674 5 13.5 5Z" fill="#3D4863" />
    </svg>
  );
}

export function SessionDetailsRow({ session }: { session: Session }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4">
      <div className="mb-4 grid grid-cols-6 gap-4 text-sm">
        <SessionField label="Mã lớp" value={session.title} truncate />
        <SessionField label="Giảng viên" value={session.instructor} />
        <SessionField label="Sĩ số" value={String(session.members.length)} />
        <SessionField label="Ngôn ngữ" value="N/A" muted italic />
        <SessionField label="Hình thức" value={session.method} capitalize />
        <div className="flex flex-col items-end">
          <div className="font-medium text-gray-500">Giải tán lớp</div>
          <button
            type="button"
            aria-label="Giải tán lớp"
            title="Giải tán lớp"
            className="mt-1 rounded p-1 text-red-500 hover:text-red-700"
            onClick={() => alert('Giải tán lớp')}
          >
            <Trash className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {session.members.map((member) => (
          <div key={member.id} className="flex w-16 flex-col items-center text-center" title={member.name}>
            <UserCircleIcon className="size-10 text-gray-400" />
            <span className="w-full truncate text-xs text-gray-700">{getInitials(member.name)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionField({
  label,
  value,
  truncate = false,
  muted = false,
  italic = false,
  capitalize = false,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  muted?: boolean;
  italic?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <div className="font-medium text-gray-500">{label}</div>
      <div
        className={`font-semibold ${truncate ? 'truncate' : ''} ${muted ? 'text-gray-400' : 'text-gray-900'} ${italic ? 'italic' : ''} ${capitalize ? 'capitalize' : ''}`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.split(' ');
  return parts.length === 1 ? name : `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
      {children}
    </th>
  );
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`truncate px-6 py-4 text-sm text-gray-700 ${className ?? ''}`}>{children}</td>;
}

export function StatusBadge({ status }: { status: 'Pending' | 'Approved' | 'Declined' }) {
  const statusMap = {
    Pending: { text: 'Đang xử lý', className: 'bg-yellow-100 text-yellow-800' },
    Approved: { text: 'Hoàn thành', className: 'bg-green-100 text-green-800' },
    Declined: { text: 'Từ chối', className: 'bg-red-100 text-red-800' },
  };
  const currentStatus = statusMap[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentStatus.className}`}>{currentStatus.text}</span>;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const buttonClass = (disabled: boolean) => (disabled ? 'pagination-btn-disabled' : 'pagination-btn');

  return (
    <nav className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={buttonClass(currentPage === 1)}>
          <ChevronLeftIcon className="size-5" />
        </button>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={buttonClass(currentPage === totalPages)}>
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <nav className="isolate inline-flex space-x-2 rounded-md shadow-sm" aria-label="Pagination">
          <PageButton onClick={() => onPageChange(1)} disabled={currentPage === 1}><ChevronDoubleLeftIcon className="size-5" /></PageButton>
          <PageButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="size-5" /></PageButton>
          {pageNumbers.map((page) => (
            <button key={page} onClick={() => onPageChange(page)} className={page === currentPage ? 'page-number-active' : 'page-number'}>{page}</button>
          ))}
          <PageButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRightIcon className="size-5" /></PageButton>
          <PageButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}><ChevronDoubleRightIcon className="size-5" /></PageButton>
        </nav>
      </div>
    </nav>
  );
}

function PageButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={disabled ? 'pagination-btn-disabled' : 'pagination-btn'}>
      {children}
    </button>
  );
}
