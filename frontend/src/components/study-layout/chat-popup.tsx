import { useState } from 'react';

import {
  mockConversations,
  Conversation,
  createGroupChat,
  getGroupChats,
  updateGroupName,
  addMemberToGroup,
  removeMemberFromGroup,
  deleteGroupChat,
  GroupMember,
  chatDataGroup1,
  Message,
} from '@/components/data/~mock-chat-data';
import { getAllNames } from '@/components/data/~mock-names';

import { ChatConversationView } from './chat-conversation-view';
import { CreateGroupView } from './chat-create-group-view';
import { ChatListView } from './chat-list-view';
import { ManageGroupView } from './chat-manage-group-view';

// --- Component Chính ---

type ChatPopupProps = {
  isOpen: boolean;
  onClose?: () => void; // Make onClose optional for backward compatibility
};

const ChatPopup = ({ isOpen, onClose }: ChatPopupProps) => {
  const [view, setView] = useState<'list' | 'chat' | 'create-group' | 'manage-group'>('list');
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Group chat states
  const [groupName, setGroupName] = useState('');
  // keep a Set for quick membership checks and an array for ordered/drag list
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [allStudents, setAllStudents] = useState<GroupMember[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  // draggingId removed (not needed) to avoid unused-state lint warnings

  // Get user info
  const isTutor = true;

  // Load students and conversations
  useState(() => {
    const names = getAllNames();
    setAllStudents(names.map(n => ({ id: n.id, name: n.name })));
    setAllConversations([...mockConversations, ...getGroupChats()]);
  });

  const filteredConversations = allConversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMember = (memberId: number) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
      // Append to ordered list when newly selected
      setSelectedOrder((prev) => [...prev, memberId]);
    }
    setSelectedMembers(newSelected);
  };

  // Drag handlers for available student items
  const onDragStartStudent = (e: React.DragEvent, memberId: number) => {
    e.dataTransfer.setData('text/plain', String(memberId));
  };

  const onDragEndStudent = () => {
    /* noop */
  };

  // Drop handler for selected-area: accept dropped student and add to selected if not present
  const onDropToSelected = (e: React.DragEvent) => {
    e.preventDefault();
    const idStr = e.dataTransfer.getData('text/plain');
    const id = idStr ? Number(idStr) : null;
    if (id === null || Number.isNaN(id)) return;
    if (!selectedMembers.has(id)) {
      const newSelected = new Set(selectedMembers);
      newSelected.add(id);
      setSelectedMembers(newSelected);
      setSelectedOrder((prev) => [...prev, id]);
    }
    /* noop */
  };

  // (onDragOver calls are handled inline where needed)

  // Reorder inside selected list
  const onDragStartSelectedItem = (e: React.DragEvent, memberId: number) => {
    e.dataTransfer.setData('text/selected-id', String(memberId));
  };

  const onDropSelectedItem = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const idStr = e.dataTransfer.getData('text/selected-id');
    const dragId = idStr ? Number(idStr) : null;
    if (dragId === null || Number.isNaN(dragId)) return;
    const fromIndex = selectedOrder.indexOf(dragId);
    if (fromIndex === -1) return;
    const newOrder = selectedOrder.slice();
    newOrder.splice(fromIndex, 1);
    newOrder.splice(targetIndex, 0, dragId);
    setSelectedOrder(newOrder);
    /* noop */
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedOrder.length === 0) return;

    const memberIds = Array.from(selectedOrder);
    createGroupChat(groupName, memberIds, allStudents);
    setAllConversations([...mockConversations, ...getGroupChats()]);

    // Reset and go back
    setGroupName('');
    setSelectedMembers(new Set());
    setSelectedOrder([]);
    setView('list');
  };

  const handleStartCreateGroup = () => {
    setGroupName('');
    setSelectedMembers(new Set());
    setView('create-group');
  };

  const handleOpenGroupSettings = () => {
    if (selectedConversation?.isGroup) {
      setEditedGroupName(selectedConversation.title);
      setView('manage-group');
    }
  };

  const handleUpdateGroupName = () => {
    if (selectedConversation && editedGroupName.trim()) {
      updateGroupName(selectedConversation.id, editedGroupName);
      setSelectedConversation({
        ...selectedConversation,
        title: editedGroupName
      });
      setAllConversations([...mockConversations, ...getGroupChats()]);
      setIsEditingName(false);
    }
  };

  const handleAddMember = (member: GroupMember) => {
    if (selectedConversation) {
      addMemberToGroup(selectedConversation.id, member);
      setSelectedConversation({
        ...selectedConversation,
        members: [...(selectedConversation.members || []), member],
        description: `${(selectedConversation.members?.length || 0) + 1} thành viên`
      });
      setAllConversations([...mockConversations, ...getGroupChats()]);
    }
  };

  const handleRemoveMember = (memberId: number) => {
    if (selectedConversation) {
      removeMemberFromGroup(selectedConversation.id, memberId);
      const updatedMembers = selectedConversation.members?.filter(m => m.id !== memberId) || [];
      setSelectedConversation({
        ...selectedConversation,
        members: updatedMembers,
        description: `${updatedMembers.length} thành viên`
      });
      setAllConversations([...mockConversations, ...getGroupChats()]);
    }
  };

  // keep selectedOrder in sync if user removes a member while editing create-group
  const handleRemoveSelectedById = (memberId: number) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
      setSelectedMembers(newSelected);
    }
    setSelectedOrder((prev) => prev.filter((id) => id !== memberId));
  };

  const handleDeleteGroup = () => {
    if (selectedConversation && confirm('Bạn có chắc muốn xóa nhóm này?')) {
      deleteGroupChat(selectedConversation.id);
      setAllConversations([...mockConversations, ...getGroupChats()]);
      setView('list');
      setSelectedConversation(null);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setView('chat');
    if (conv.isGroup) {
      if (conv.id === 'group-1') {
        setMessages(chatDataGroup1);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([
        {
          id: '1',
          sender: 'bot',
          text: `Xin chào! Tôi có thể giúp gì cho bạn về "${conv.title}"?`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedConversation(null);
    setMessages([]);
    setSearchTerm('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Cảm ơn bạn đã gửi tin nhắn. Chúng tôi sẽ phản hồi sớm nhất có thể!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-[98px] z-40 flex h-[calc(100vh-6rem)] w-[380px] flex-col overflow-hidden rounded-l-lg bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.25)]">
      {view === 'chat' && (
        <ChatConversationView
          selectedConversation={selectedConversation}
          messages={messages}
          searchTerm={searchTerm}
          inputValue={inputValue}
          isTutor={isTutor}
          onSearchChange={setSearchTerm}
          onInputChange={setInputValue}
          onBackToList={handleBackToList}
          onOpenSettings={handleOpenGroupSettings}
          onSendMessage={handleSendMessage}
          onClose={onClose}
        />
      )}

      {view === 'list' && (
        <ChatListView
          conversations={filteredConversations}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onCreateGroup={handleStartCreateGroup}
          onSelectConversation={handleSelectConversation}
          onClose={onClose}
          isTutor={isTutor}
        />
      )}

      {view === 'create-group' && (
        <CreateGroupView
          groupName={groupName}
          selectedOrder={selectedOrder}
          selectedMembers={selectedMembers}
          allStudents={allStudents}
          onGroupNameChange={setGroupName}
          onBackToList={() => setView('list')}
          onClose={onClose}
          onToggleMember={toggleMember}
          onDragStartSelectedItem={onDragStartSelectedItem}
          onDropSelectedItem={onDropSelectedItem}
          onRemoveSelectedMember={handleRemoveSelectedById}
          onDropToSelected={onDropToSelected}
          onDragStartStudent={onDragStartStudent}
          onDragEndStudent={onDragEndStudent}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {view === 'manage-group' && selectedConversation && (
        <ManageGroupView
          selectedConversation={selectedConversation}
          allStudents={allStudents}
          isEditingName={isEditingName}
          editedGroupName={editedGroupName}
          onGroupNameChange={setEditedGroupName}
          onBackToChat={() => setView('chat')}
          onClose={onClose}
          onStartEditingName={setIsEditingName}
          onUpdateGroupName={handleUpdateGroupName}
          onRemoveMember={handleRemoveMember}
          onAddMember={handleAddMember}
          onDeleteGroup={handleDeleteGroup}
        />
      )}

    </div>
  );
};

export default ChatPopup;
