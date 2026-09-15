import React, { ComponentType } from 'react';

import { Paper as PaperIcon } from '@/components/icons';
import CalendarIcon from '@/components/icons/calendar';
import type { CourseSubmission } from '@/types/course-content';

import { SectionHeader } from './shared-components';

interface SubmissionSectionProps {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  data: CourseSubmission;
  changing: boolean;
  type: string;
  onTitleChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onDataChange: (field: string, value: unknown) => void;
  onDelete: () => void;
}

export const SubmissionSection: React.FC<SubmissionSectionProps> = ({
  Icon,
  title,
  data,
  changing,
  type,
  onTitleChange,
  onTypeChange,
  onDataChange,
  onDelete,
}) => {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        {changing ? (
          <SectionHeader
            Icon={Icon}
            changing={changing}
            onDelete={onDelete}
            onTitleChange={onTitleChange}
            onTypeChange={onTypeChange}
            title={title}
            type={type}
          />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Icon className="size-6 text-gray-700" />
              <h2 className="mb-4 text-2xl font-bold text-gray-800">{title}</h2>
            </div>
            {data.status === 'graded' && (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-2">
                <span className="font-medium text-green-700">Điểm: {data.grade}</span>
              </div>
            )}

            {data.status === 'submitted' && (
              <div className="flex items-center gap-3 rounded-lg bg-yellow-50 px-4 py-2">
                <span className="font-medium text-yellow-700">Chưa chấm điểm</span>
              </div>
            )}
          </>
        )}
      </div>

      {changing ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Trạng thái bài nộp</label>
            <select
              aria-label="Status"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              onChange={(e) => onDataChange('status', e.target.value)}
              value={data.status || 'not-submitted'}
            >
              <option value="not-submitted">Chưa nộp</option>
              <option value="submitted">Đã nộp</option>
              <option value="graded">Đã chấm điểm</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hạn chót</label>
            <input
              aria-label="Due Date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              onChange={(e) => onDataChange('dueDate', e.target.value)}
              type="date"
              value={data.dueDate || ''}
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                checked={data.canEdit || false}
                className="size-4 rounded"
                onChange={(e) => onDataChange('canEdit', e.target.checked)}
                type="checkbox"
              />
              Cho phép chỉnh sửa
            </label>
          </div>

          {data.status === 'graded' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Điểm số</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  onChange={(e) => onDataChange('grade', e.target.value)}
                  placeholder="Ví dụ: 8.5"
                  step="0.1"
                  type="number"
                  value={data.grade || ''}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nhận xét</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  onChange={(e) => onDataChange('feedback', e.target.value)}
                  placeholder="Nhập nhận xét từ giảng viên"
                  rows={3}
                  value={data.feedback || ''}
                />
              </div>
            </>
          )}

          {(data.status === 'submitted' || data.status === 'graded') && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tên file đã nộp</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  onChange={(e) =>
                    onDataChange('submittedFile', {
                      ...(data.submittedFile || {}),
                      name: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: assignment.pdf"
                  type="text"
                  value={data.submittedFile?.name || ''}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Thời gian nộp</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  onChange={(e) =>
                    onDataChange('submittedFile', {
                      ...(data.submittedFile || {}),
                      submittedAt: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: 20:00 10/10/2024"
                  type="text"
                  value={data.submittedFile?.submittedAt || ''}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {data.status === 'submitted' && data.submittedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex size-10 items-center justify-center rounded bg-red-50">
                  <PaperIcon className="size-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{data.submittedFile.name}</p>
                  <p className="text-sm text-red-600">Submitted at {data.submittedFile.submittedAt}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="size-4" />
                  <span>
                    Hạn chót: <span className="font-semibold text-red-600">{data.dueDate}</span>
                  </span>
                </div>
                <button className="rounded-lg bg-[#0329E9] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                  Chỉnh sửa bài nộp
                </button>
              </div>
            </div>
          )}

          {data.status === 'graded' && data.submittedFile && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex size-10 items-center justify-center rounded bg-red-50">
                      <PaperIcon className="size-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{data.submittedFile.name}</p>
                      <p className="text-sm text-red-600">Submitted at {data.submittedFile.submittedAt}</p>
                    </div>
                  </div>
                </div>
              </div>

              {data.feedback && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-gray-700">Nhận xét từ giảng viên:</p>
                  <p className="text-sm text-gray-600">{data.feedback}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="size-4" />
                  <span>
                    Hạn chót: <span className="font-semibold text-red-600">{data.dueDate}</span>
                  </span>
                </div>
                <button className="rounded-lg bg-[#0329E9] px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                  Chỉnh sửa bài nộp
                </button>
              </div>
            </div>
          )}

          {data.status === 'not-submitted' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="mb-4 text-gray-500">Chưa có bài nộp</p>
                <button className="rounded-lg bg-[#0329E9] px-6 py-2 font-medium text-white transition hover:bg-blue-700">
                  + Thêm bài nộp
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="size-4" />
                <span>Hạn chót: {data.dueDate}</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};
