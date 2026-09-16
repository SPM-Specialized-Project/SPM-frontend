import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { Fragment } from 'react';

import { Pagination, SessionDetailsRow, TableCell, TableHeader } from './result-ui';
import type { MatchedCourseGroup } from './result-types';

export function MatchedSessionsPanel({
  data,
  currentPage,
  totalPages,
  expandedRows,
  onToggle,
  onPageChange,
}: {
  data: MatchedCourseGroup[];
  currentPage: number;
  totalPages: number;
  expandedRows: Set<string>;
  onToggle: (courseId: string) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white">
            <tr>
              <TableHeader>STT</TableHeader>
              <TableHeader>Mã môn học</TableHeader>
              <TableHeader>Tên môn học</TableHeader>
              <TableHeader><span className="sr-only">Expand</span></TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((courseGroup, index) => {
              const isExpanded = expandedRows.has(courseGroup.courseId);
              return (
                <Fragment key={courseGroup.courseId}>
                  <tr className="hover:bg-gray-50">
                    <TableCell className="px-6">{(currentPage - 1) * 3 + index + 1}</TableCell>
                    <TableCell className="max-w-24 truncate">{courseGroup.courseCode}</TableCell>
                    <TableCell className="max-w-[40ch] truncate">{courseGroup.courseTitle}</TableCell>
                    <TableCell>
                      <button onClick={() => onToggle(courseGroup.courseId)} className="p-2 text-gray-500 hover:text-blue-600">
                        {isExpanded ? <ChevronUpIcon className="size-5" /> : <ChevronDownIcon className="size-5" />}
                      </button>
                    </TableCell>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={4} className="bg-gray-50 p-4 shadow-inner">
                        <div className="space-y-4">
                          {courseGroup.sessions.map((session) => <SessionDetailsRow key={session.id} session={session} />)}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
