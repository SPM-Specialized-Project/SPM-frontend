import type { Conversation, GroupMember } from '@/components/data/~mock-chat-data';

import {
  BackIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
} from './chat-icons';

type ManageGroupViewProps = {
  selectedConversation: Conversation;
  allStudents: GroupMember[];
  isEditingName: boolean;
  editedGroupName: string;
  onGroupNameChange: (value: string) => void;
  onBackToChat: () => void;
  onClose?: () => void;
  onStartEditingName: (editing: boolean) => void;
  onUpdateGroupName: () => void;
  onRemoveMember: (memberId: number) => void;
  onAddMember: (member: GroupMember) => void;
  onDeleteGroup: () => void;
};

export function ManageGroupView({
  selectedConversation,
  allStudents,
  isEditingName,
  editedGroupName,
  onGroupNameChange,
  onBackToChat,
  onClose,
  onStartEditingName,
  onUpdateGroupName,
  onRemoveMember,
  onAddMember,
  onDeleteGroup,
}: ManageGroupViewProps) {
  return (
        <div className="flex flex-1 flex-col">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onBackToChat}
                className="text-gray-600 hover:text-gray-800"
              >
                <BackIcon />
              </button>
              <h3 className="font-semibold text-gray-800">Quản lý nhóm</h3>
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
            {/* Group name edit */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên nhóm
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={isEditingName ? editedGroupName : selectedConversation.title}
                  onChange={(e) => onGroupNameChange(e.target.value)}
                  disabled={!isEditingName}
                  aria-label="Tên nhóm"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                {!isEditingName ? (
                  <button
                    onClick={() => onStartEditingName(true)}
                    className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
                  >
                    <EditIcon />
                  </button>
                ) : (
                  <button
                    onClick={onUpdateGroupName}
                    className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                  >
                    <CheckIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Current members */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Thành viên hiện tại ({selectedConversation.members?.length || 0})
              </p>
              <div className="space-y-2">
                {selectedConversation.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {member.name}
                    </span>
                    <button
                      onClick={() => onRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Xóa thành viên"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add new members */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Thêm thành viên
              </p>
              <div className="space-y-2">
                {allStudents
                  .filter(s => !selectedConversation.members?.some(m => m.id === s.id))
                  .map((student) => (
                    <div
                      key={student.id}
                      onClick={() => onAddMember(student)}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {student.name}
                      </span>
                      <span className="text-sm text-gray-500">Thêm</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Delete group button */}
            <button
              onClick={onDeleteGroup}
              className="w-full rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
            >
              Xóa nhóm
            </button>
          </div>
        </div>
  );
}
