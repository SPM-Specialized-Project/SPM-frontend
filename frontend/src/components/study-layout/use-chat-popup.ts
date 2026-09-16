import { useEffect, useState } from 'react';

import {
  addMemberToGroup,
  chatDataGroup1,
  createGroupChat,
  deleteGroupChat,
  getGroupChats,
  mockConversations,
  removeMemberFromGroup,
  updateGroupName,
  type Conversation,
  type GroupMember,
  type Message,
} from '@/components/data/~mock-chat-data';
import { getAllNames } from '@/components/data/~mock-names';

export type ChatView = 'list' | 'chat' | 'create-group' | 'manage-group';

export function useChatPopupState() {
  const [view, setView] = useState<ChatView>('list');
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [allStudents, setAllStudents] = useState<GroupMember[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');

  const isTutor = true;

  useEffect(() => {
    const names = getAllNames();
    setAllStudents(names.map((name) => ({ id: name.id, name: name.name })));
    setAllConversations([...mockConversations, ...getGroupChats()]);
  }, []);

  const filteredConversations = allConversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleMember = (memberId: number) => {
    setSelectedMembers((previous) => {
      const next = new Set(previous);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
        setSelectedOrder((order) => [...order, memberId]);
      }
      return next;
    });
  };

  const onDragStartStudent = (event: React.DragEvent, memberId: number) => {
    event.dataTransfer.setData('text/plain', String(memberId));
  };

  const onDragEndStudent = () => undefined;

  const onDropToSelected = (event: React.DragEvent) => {
    event.preventDefault();
    const idValue = event.dataTransfer.getData('text/plain');
    const memberId = idValue ? Number(idValue) : null;
    if (memberId === null || Number.isNaN(memberId)) return;

    setSelectedMembers((previous) => {
      if (previous.has(memberId)) return previous;
      const next = new Set(previous);
      next.add(memberId);
      setSelectedOrder((order) => [...order, memberId]);
      return next;
    });
  };

  const onDragStartSelectedItem = (event: React.DragEvent, memberId: number) => {
    event.dataTransfer.setData('text/selected-id', String(memberId));
  };

  const onDropSelectedItem = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    const idValue = event.dataTransfer.getData('text/selected-id');
    const draggedId = idValue ? Number(idValue) : null;
    if (draggedId === null || Number.isNaN(draggedId)) return;

    setSelectedOrder((previous) => {
      const fromIndex = previous.indexOf(draggedId);
      if (fromIndex === -1) return previous;
      const next = previous.slice();
      next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, draggedId);
      return next;
    });
  };

  const refreshConversations = () => {
    setAllConversations([...mockConversations, ...getGroupChats()]);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedOrder.length === 0) return;

    createGroupChat(groupName, selectedOrder, allStudents);
    refreshConversations();
    setGroupName('');
    setSelectedMembers(new Set());
    setSelectedOrder([]);
    setView('list');
  };

  const handleStartCreateGroup = () => {
    setGroupName('');
    setSelectedMembers(new Set());
    setSelectedOrder([]);
    setView('create-group');
  };

  const handleOpenGroupSettings = () => {
    if (!selectedConversation?.isGroup) return;
    setEditedGroupName(selectedConversation.title);
    setView('manage-group');
  };

  const handleUpdateGroupName = () => {
    if (!selectedConversation || !editedGroupName.trim()) return;

    updateGroupName(selectedConversation.id, editedGroupName);
    setSelectedConversation({ ...selectedConversation, title: editedGroupName });
    refreshConversations();
    setIsEditingName(false);
  };

  const handleAddMember = (member: GroupMember) => {
    if (!selectedConversation) return;

    addMemberToGroup(selectedConversation.id, member);
    const members = [...(selectedConversation.members || []), member];
    setSelectedConversation({
      ...selectedConversation,
      members,
      description: members.length + ' thành viên',
    });
    refreshConversations();
  };

  const handleRemoveMember = (memberId: number) => {
    if (!selectedConversation) return;

    removeMemberFromGroup(selectedConversation.id, memberId);
    const members = selectedConversation.members?.filter((member) => member.id !== memberId) || [];
    setSelectedConversation({
      ...selectedConversation,
      members,
      description: members.length + ' thành viên',
    });
    refreshConversations();
  };

  const handleRemoveSelectedById = (memberId: number) => {
    setSelectedMembers((previous) => {
      const next = new Set(previous);
      next.delete(memberId);
      return next;
    });
    setSelectedOrder((previous) => previous.filter((id) => id !== memberId));
  };

  const handleDeleteGroup = () => {
    if (!selectedConversation || !confirm('Bạn có chắc muốn xóa nhóm này?')) return;

    deleteGroupChat(selectedConversation.id);
    refreshConversations();
    setView('list');
    setSelectedConversation(null);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setView('chat');

    if (conversation.isGroup) {
      setMessages(conversation.id === 'group-1' ? chatDataGroup1 : []);
      return;
    }

    setMessages([
      {
        id: '1',
        sender: 'bot',
        text: 'Xin chào! Tôi có thể giúp gì cho bạn về "' + conversation.title + '"?',
        timestamp: new Date(),
      },
    ]);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedConversation(null);
    setMessages([]);
    setSearchTerm('');
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((previous) => [...previous, newMessage]);
    setInputValue('');

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Cảm ơn bạn đã gửi tin nhắn. Chúng tôi sẽ phản hồi sớm nhất có thể!',
        timestamp: new Date(),
      };
      setMessages((previous) => [...previous, botResponse]);
    }, 1000);
  };

  return {
    allStudents,
    filteredConversations,
    groupName,
    inputValue,
    isEditingName,
    isTutor,
    editedGroupName,
    messages,
    searchTerm,
    selectedConversation,
    selectedMembers,
    selectedOrder,
    view,
    handleAddMember,
    handleBackToList,
    handleCreateGroup,
    handleDeleteGroup,
    handleOpenGroupSettings,
    handleRemoveMember,
    handleRemoveSelectedById,
    handleSelectConversation,
    handleSendMessage,
    handleStartCreateGroup,
    handleUpdateGroupName,
    onDragEndStudent,
    onDragStartSelectedItem,
    onDragStartStudent,
    onDropSelectedItem,
    onDropToSelected,
    setEditedGroupName,
    setGroupName,
    setInputValue,
    setIsEditingName,
    setSearchTerm,
    toggleMember,
    setView,
  };
}
