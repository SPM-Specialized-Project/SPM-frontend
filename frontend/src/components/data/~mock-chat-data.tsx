import React from 'react';

// Một SVG chung cho "Tòa nhà" (Phòng đào tạo)
const BuildingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-6"
  >
    <path
      fillRule='evenodd'
      d="M18 13.5V4.5L13.5 0L9 4.5V7.5H0V28.5H27V13.5H18ZM6 25.5H3V22.5H6V25.5ZM6 19.5H3V16.5H6V19.5ZM6 13.5H3V10.5H6V13.5ZM15 25.5H12V22.5H15V25.5ZM15 19.5H12V16.5H15V19.5ZM15 13.5H12V10.5H15V13.5ZM15 7.5H12V4.5H15V7.5ZM24 25.5H21V22.5H24V25.5ZM24 19.5H21V16.5H24V19.5Z"
      clipRule='evenodd'
    />
  </svg>

);

// Một SVG chung cho "Mũ tốt nghiệp" (Các khóa học)
const AcademicIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 36 36"
    fill="none"
    className="size-6"
  >
    <path d="M18 25.8757C17.8042 25.8757 17.6117 25.8245 17.4417 25.7273L7.59375 20.0988C7.50818 20.0494 7.4111 20.0234 7.31229 20.0234C7.21348 20.0235 7.11643 20.0495 7.03089 20.099C6.94536 20.1485 6.87436 20.2196 6.82505 20.3052C6.77574 20.3909 6.74985 20.488 6.75 20.5868V25.8757C6.74983 26.0765 6.80341 26.2736 6.90516 26.4467C7.00692 26.6198 7.15315 26.7625 7.32867 26.8601L17.4537 32.4851C17.6208 32.5779 17.8088 32.6266 18 32.6266C18.1912 32.6266 18.3792 32.5779 18.5463 32.4851L28.6713 26.8601C28.8469 26.7625 28.9931 26.6198 29.0948 26.4467C29.1966 26.2736 29.2502 26.0765 29.25 25.8757V20.5868C29.2501 20.488 29.2243 20.3909 29.1749 20.3052C29.1256 20.2196 29.0546 20.1485 28.9691 20.099C28.8836 20.0495 28.7865 20.0235 28.6877 20.0234C28.5889 20.0234 28.4918 20.0494 28.4062 20.0988L18.5583 25.7273C18.3883 25.8245 18.1958 25.8757 18 25.8757Z" fill="#3D4863" />
    <path d="M34.8697 13.3945C34.8697 13.3945 34.8697 13.3888 34.8697 13.3867C34.8515 13.2084 34.791 13.037 34.6931 12.8868C34.5953 12.7366 34.463 12.612 34.3072 12.5233L18.5572 3.5233C18.3872 3.42612 18.1947 3.375 17.9989 3.375C17.8031 3.375 17.6106 3.42612 17.4406 3.5233L1.69063 12.5233C1.5185 12.6217 1.37544 12.7639 1.27593 12.9354C1.17643 13.1069 1.12402 13.3017 1.12402 13.4999C1.12402 13.6982 1.17643 13.893 1.27593 14.0645C1.37544 14.236 1.5185 14.3782 1.69063 14.4766L17.4406 23.4766C17.6106 23.5738 17.8031 23.6249 17.9989 23.6249C18.1947 23.6249 18.3872 23.5738 18.5572 23.4766L32.4144 15.5587C32.4358 15.5463 32.4601 15.5398 32.4848 15.5398C32.5096 15.5399 32.5339 15.5464 32.5553 15.5588C32.5766 15.5712 32.5944 15.5891 32.6067 15.6105C32.619 15.632 32.6254 15.6563 32.6253 15.681V25.8433C32.6253 26.4487 33.0908 26.9683 33.6962 26.9985C33.8483 27.0059 34.0003 26.9822 34.143 26.9291C34.2857 26.8759 34.4162 26.7943 34.5264 26.6893C34.6367 26.5842 34.7244 26.4579 34.7844 26.3179C34.8444 26.1779 34.8753 26.0272 34.8753 25.8749V13.4999C34.8752 13.4647 34.8734 13.4295 34.8697 13.3945Z" fill="#3D4863" />
  </svg>
);

// Icon Group Chat
const GroupIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-6"
  >
    <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
  </svg>
);

export type GroupMember = {
  id: number;
  name: string;
};

export type Conversation = {
  id: string;
  title: string;
  description: string;
  icon: () => React.ReactElement;
  isGroup?: boolean;
  members?: GroupMember[];
  createdBy?: string;
};

export const mockConversations: Conversation[] = [
  {
    id: 'pdt',
    title: 'Phòng đào tạo',
    description: 'Các vấn đề liên quan đến đăng ký học phần, lịch thi...',
    icon: BuildingIcon,
  },
  {
    id: 'os',
    title: 'Operating System Course',
    description: 'Thắc mắc về môn học Hệ điều hành.',
    icon: AcademicIcon,
  },
  {
    id: 'ppl',
    title: 'Principle Programming Language...',
    description: 'Thắc mắc về môn học Nguyên lý ngôn ngữ lập trình.',
    icon: AcademicIcon,
  },
  {
    id: 'db',
    title: 'Database System Course',
    description: 'Thắc mắc về môn học Hệ cơ sở dữ liệu.',
    icon: AcademicIcon,
  },
  {
    id: 'cn',
    title: 'Computer Network Course',
    description: 'Thắc mắc về môn học Mạng máy tính.',
    icon: AcademicIcon,
  },
  {
    id: 'intern',
    title: 'Internship',
    description: 'Các câu hỏi về chương trình thực tập.',
    icon: AcademicIcon,
  },
  {
    id: 'calc1',
    title: 'Calculus 1',
    description: 'Thắc mắc về môn học Giải tích 1.',
    icon: AcademicIcon,
  },
  {
    id: 'group-1',
    title: 'Nhóm học tập Toán Tin',
    description: '5 thành viên',
    icon: GroupIcon,
    isGroup: true,
    members: [
      { id: 1, name: 'Nguyễn Văn A' },
      { id: 2, name: 'Trần Thị B' },
      { id: 3, name: 'Lê Văn C' },
      { id: 4, name: 'Phạm Thị D' },
      { id: 5, name: 'Hoàng Văn E' },
    ],
      createdBy: 'lecturer',
  }
];

export type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
};

// chat data cho group-1
export const chatDataGroup1: Message[] = [
  {
    id: 'msg-1',
    sender: 'Nguyễn Văn A',
    text: 'Chào mọi người, chúng ta có buổi học nhóm vào thứ 7 này không?',
    timestamp: new Date('2025-11-01T10:00:00Z'),
  },
  {
    id: 'msg-2',
    sender: 'Trần Thị B',
    text: 'Mình nghĩ là có, nhưng chưa chắc chắn lắm. Ai biết thì xác nhận giúp nhé!',
    timestamp: new Date('2025-11-01T10:05:00Z'),
  }
];

// Helper functions for group chat management
const groupChats: Conversation[] = [];

export function createGroupChat(title: string, memberIds: number[], allStudents: GroupMember[]): Conversation {
  const members = allStudents.filter(s => memberIds.includes(s.id));
  const newGroup: Conversation = {
    id: `group-${Date.now()}`,
    title,
    description: `${members.length} thành viên`,
    icon: GroupIcon,
    isGroup: true,
    members,
    createdBy: 'lecturer',
  };
  groupChats.push(newGroup);
  return newGroup;
}

export function getGroupChats(): Conversation[] {
  return groupChats;
}

export function updateGroupName(groupId: string, newName: string): boolean {
  const group = groupChats.find(g => g.id === groupId);
  if (group) {
    group.title = newName;
    return true;
  }
  return false;
}

export function addMemberToGroup(groupId: string, member: GroupMember): boolean {
  const group = groupChats.find(g => g.id === groupId);
  if (group && group.members) {
    if (!group.members.find(m => m.id === member.id)) {
      group.members.push(member);
      group.description = `${group.members.length} thành viên`;
      return true;
    }
  }
  return false;
}

export function removeMemberFromGroup(groupId: string, memberId: number): boolean {
  const group = groupChats.find(g => g.id === groupId);
  if (group && group.members) {
    const index = group.members.findIndex(m => m.id === memberId);
    if (index > -1) {
      group.members.splice(index, 1);
      group.description = `${group.members.length} thành viên`;
      return true;
    }
  }
  return false;
}

export function deleteGroupChat(groupId: string): boolean {
  const index = groupChats.findIndex(g => g.id === groupId);
  if (index > -1) {
    groupChats.splice(index, 1);
    return true;
  }
  return false;
}
