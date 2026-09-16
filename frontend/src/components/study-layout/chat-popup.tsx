import { ChatConversationView } from './chat-conversation-view';
import { CreateGroupView } from './chat-create-group-view';
import { ChatListView } from './chat-list-view';
import { ManageGroupView } from './chat-manage-group-view';
import { useChatPopupState } from './use-chat-popup';

type ChatPopupProps = {
  isOpen: boolean;
  onClose?: () => void;
};

const ChatPopup = ({ isOpen, onClose }: ChatPopupProps) => {
  const chat = useChatPopupState();

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-[98px] z-40 flex h-[calc(100vh-6rem)] w-[380px] flex-col overflow-hidden rounded-l-lg bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.25)]">
      {chat.view === 'chat' && (
        <ChatConversationView
          selectedConversation={chat.selectedConversation}
          messages={chat.messages}
          searchTerm={chat.searchTerm}
          inputValue={chat.inputValue}
          isTutor={chat.isTutor}
          onSearchChange={chat.setSearchTerm}
          onInputChange={chat.setInputValue}
          onBackToList={chat.handleBackToList}
          onOpenSettings={chat.handleOpenGroupSettings}
          onSendMessage={chat.handleSendMessage}
          onClose={onClose}
        />
      )}

      {chat.view === 'list' && (
        <ChatListView
          conversations={chat.filteredConversations}
          searchTerm={chat.searchTerm}
          onSearchChange={chat.setSearchTerm}
          onCreateGroup={chat.handleStartCreateGroup}
          onSelectConversation={chat.handleSelectConversation}
          onClose={onClose}
          isTutor={chat.isTutor}
        />
      )}

      {chat.view === 'create-group' && (
        <CreateGroupView
          groupName={chat.groupName}
          selectedOrder={chat.selectedOrder}
          selectedMembers={chat.selectedMembers}
          allStudents={chat.allStudents}
          onGroupNameChange={chat.setGroupName}
          onBackToList={() => chat.setView('list')}
          onClose={onClose}
          onToggleMember={chat.toggleMember}
          onDragStartSelectedItem={chat.onDragStartSelectedItem}
          onDropSelectedItem={chat.onDropSelectedItem}
          onRemoveSelectedMember={chat.handleRemoveSelectedById}
          onDropToSelected={chat.onDropToSelected}
          onDragStartStudent={chat.onDragStartStudent}
          onDragEndStudent={chat.onDragEndStudent}
          onCreateGroup={chat.handleCreateGroup}
        />
      )}

      {chat.view === 'manage-group' && chat.selectedConversation && (
        <ManageGroupView
          selectedConversation={chat.selectedConversation}
          allStudents={chat.allStudents}
          isEditingName={chat.isEditingName}
          editedGroupName={chat.editedGroupName}
          onGroupNameChange={chat.setEditedGroupName}
          onBackToChat={() => chat.setView('chat')}
          onClose={onClose}
          onStartEditingName={chat.setIsEditingName}
          onUpdateGroupName={chat.handleUpdateGroupName}
          onRemoveMember={chat.handleRemoveMember}
          onAddMember={chat.handleAddMember}
          onDeleteGroup={chat.handleDeleteGroup}
        />
      )}
    </div>
  );
};

export default ChatPopup;
