import type { CourseContent } from '@/types/course-content';

import type { SectionRendererProps } from './section-renderer-types';

type NoteItem = Extract<CourseContent, { type: 'note' }>;
type NoteAssignmentProps = Pick<SectionRendererProps<NoteItem>, 'item' | 'changing' | 'onUpdateData'>;

export function NoteAssignment({ item, changing, onUpdateData }: NoteAssignmentProps) {
  const assignment = item.data.assignment;
  const getAssignmentValue = () => assignment || { id: 'assign-' + Date.now() };

  if (!changing) {
    return assignment ? (
      <div>
        <h3 className="mb-2 font-semibold text-gray-800">{assignment.title}</h3>
        <p className="mb-2 text-sm text-gray-600">{assignment.description}</p>
        <p className="text-xs text-gray-500">Hạn nộp: {assignment.dueDate}</p>
      </div>
    ) : (
      <p className="text-gray-500">Chưa có bài tập nào.</p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề bài tập</span>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          value={assignment?.title || ''}
          onChange={(event) =>
            onUpdateData('assignment', { ...getAssignmentValue(), title: event.target.value })
          }
          placeholder="Nhập tiêu đề bài tập"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Mô tả bài tập</span>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          rows={5}
          value={assignment?.description || ''}
          onChange={(event) =>
            onUpdateData('assignment', {
              ...getAssignmentValue(),
              description: event.target.value,
            })
          }
          placeholder="Nhập mô tả chi tiết về bài tập"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">
          Tên file đính kèm (nếu có)
        </span>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Chọn file</span>
          <input
            name="assignment-file"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onUpdateData('assignment', { ...getAssignmentValue(), source: file.name });
            }}
          />
        </label>
      </div>
    </div>
  );
}
