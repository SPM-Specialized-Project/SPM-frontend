import { Link } from '@tanstack/react-router';

import type { GroupMember } from '@/components/data/~mock-chat-data';

import {
  BackIcon,
  CheckIcon,
  TrashIcon,
} from './chat-icons';

type CreateGroupViewProps = {
  groupName: string;
  selectedOrder: number[];
  selectedMembers: Set<number>;
  allStudents: GroupMember[];
  onGroupNameChange: (value: string) => void;
  onBackToList: () => void;
  onClose?: () => void;
  onToggleMember: (memberId: number) => void;
  onDragStartSelectedItem: (event: React.DragEvent, memberId: number) => void;
  onDropSelectedItem: (event: React.DragEvent, targetIndex: number) => void;
  onRemoveSelectedMember: (memberId: number) => void;
  onDropToSelected: (event: React.DragEvent) => void;
  onDragStartStudent: (event: React.DragEvent, memberId: number) => void;
  onDragEndStudent: () => void;
  onCreateGroup: () => void;
};

export function CreateGroupView({
  groupName,
  selectedOrder,
  selectedMembers,
  allStudents,
  onGroupNameChange,
  onBackToList,
  onClose,
  onToggleMember,
  onDragStartSelectedItem,
  onDropSelectedItem,
  onRemoveSelectedMember,
  onDropToSelected,
  onDragStartStudent,
  onDragEndStudent,
  onCreateGroup,
}: CreateGroupViewProps) {
  return (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onBackToList}
                className="text-gray-600 hover:text-gray-800"
              >
                <BackIcon />
              </button>
              <h3 className="font-semibold text-gray-800">Tạo nhóm mới</h3>
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="text-gray-600 hover:text-red-600"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Group name input */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên nhóm
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => onGroupNameChange(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Member selection */}
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Chọn thành viên ({selectedOrder.length}/{allStudents.length})
              </p>

              {/* Selected members (draggable, ordered) */}
              <div className="mb-3">
                <div className="mb-2 text-sm font-medium text-gray-700">Thành viên đã chọn</div>
                <div className="rounded-lg border border-gray-200 p-2">
                  <div className="flex max-h-28 flex-col gap-2 overflow-auto pr-2">
                    {selectedOrder.map((id, idx) => {
                      const member = allStudents.find((s) => s.id === id);
                      if (!member) return null;
                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={(e) => onDragStartSelectedItem(e, id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => onDropSelectedItem(e, idx)}
                          className="cursor-move rounded-lg bg-white p-3"
                        >
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/profile/${member.id}` as string}
                            className="text-sm font-medium text-gray-800">

                              {member.name}
                            </Link>
                            <button
                              onClick={() => onRemoveSelectedMember(id)}
                              aria-label={`Xóa ${member.name}`}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropToSelected}
                className="overflow-auto rounded-lg border border-gray-200 p-2"
                style={{ maxHeight: '30vh', paddingRight: '0.5rem' }}
              >
                {allStudents.map((student) => {
                  const isSelected = selectedMembers.has(student.id);
                  return (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={(e) => onDragStartStudent(e, student.id)}
                      onDragEnd={onDragEndStudent}
                      onClick={() => onToggleMember(student.id)}
                      className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {student.name}
                        </span>
                        {isSelected && (
                          <div className="text-blue-600">
                            <CheckIcon />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={onCreateGroup}
              disabled={!groupName.trim() || selectedMembers.size === 0}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Tạo nhóm
            </button>
          </div>
        </div>
  );
}
