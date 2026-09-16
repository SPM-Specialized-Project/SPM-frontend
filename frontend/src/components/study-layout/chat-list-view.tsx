import type { Conversation } from '@/components/data/~mock-chat-data';

import {
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from './chat-icons';

type ChatListViewProps = {
  conversations: Conversation[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateGroup: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onClose?: () => void;
  isTutor: boolean;
};

export function ChatListView({
  conversations,
  searchTerm,
  onSearchChange,
  onCreateGroup,
  onSelectConversation,
  onClose,
  isTutor,
}: ChatListViewProps) {
  return (
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Thanh tìm kiếm */}
          <div className="border-b border-gray-200 p-4">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm kiếm..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
              {/* Create group button for tutors */}
              {isTutor && (
                <button
                  onClick={onCreateGroup}
                  className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                  aria-label="Tạo nhóm mới"
                >
                  <PlusIcon />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Đóng chat"
                className="inline-flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-red-50 hover:text-red-600"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Danh sách */}
          <div className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-200">
              {conversations.map((conv) => {
                const IconComponent = conv.icon;
                return (
                  <li
                    key={conv.id}
                    onClick={() => onSelectConversation(conv)}
                    className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      <IconComponent />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="truncate font-semibold text-gray-800">
                        {conv.title}
                        {conv.isGroup && <span className="ml-2 text-xs text-gray-500">(Nhóm)</span>}
                      </h4>
                      <p className="truncate text-sm text-gray-500">
                        {conv.description}
                      </p>
                    </div>
                    <ChevronRightIcon />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
  );
}
