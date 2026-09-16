import type { Conversation, Message } from '@/components/data/~mock-chat-data';

import {
  BackIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
} from './chat-icons';

type ChatConversationViewProps = {
  selectedConversation: Conversation | null;
  messages: Message[];
  searchTerm: string;
  inputValue: string;
  isTutor: boolean;
  onSearchChange: (value: string) => void;
  onInputChange: (value: string) => void;
  onBackToList: () => void;
  onOpenSettings: () => void;
  onSendMessage: (event: React.FormEvent) => void;
  onClose?: () => void;
};

export function ChatConversationView({
  selectedConversation,
  messages,
  searchTerm,
  inputValue,
  isTutor,
  onSearchChange,
  onInputChange,
  onBackToList,
  onOpenSettings,
  onSendMessage,
  onClose,
}: ChatConversationViewProps) {
  return (
    <>
        <div className="border-b border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToList}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Quay lại"
            >
              <BackIcon />
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
            </div>
            {/* Settings button for group chats */}
            {isTutor && selectedConversation?.isGroup && (
              <button
                onClick={onOpenSettings}
                className="text-gray-600 hover:text-gray-800"
                aria-label="Cài đặt nhóm"
              >
                <SettingsIcon />
              </button>
            )}
            {/* Close button inline with search */}
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
        <>
          {/* Messages */}
          {selectedConversation && (
            <div className="border-b border-gray-200 p-3">
              <h4 className="truncate font-semibold text-gray-800">
                {selectedConversation.title}
                {selectedConversation.isGroup && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({selectedConversation.members?.length || 0} thành viên)
                  </span>
                )}
              </h4>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${message.sender === 'user'
                      ? 'bg-[#0329E9] text-white'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <span className={`mt-1 block text-xs ${message.sender === 'user' ? 'text-right' : 'text-left'} opacity-70`}>
                      {message.sender}
                    </span>
                    <span className="mt-1 block text-right text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={onSendMessage}
            className="border-t border-gray-200 p-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#0329E9] px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!inputValue.trim()}
                aria-label="Gửi tin nhắn"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </>
    </>
  );
}

