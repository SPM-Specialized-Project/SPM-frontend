import type { Notification } from './notification-types';

const initialNotifications: Notification[] = [
  { id: '1', title: 'Bài nộp mới', message: 'Bạn có một bài nộp mới trong khóa học Kỹ thuật phần mềm', timestamp: new Date(Date.now() - 1000 * 60 * 5), isRead: false, type: 'info' },
  { id: '2', title: 'Điểm mới', message: 'Bài nộp "Bài tập tuần 3" đã được chấm điểm: 9.5/10', timestamp: new Date(Date.now() - 1000 * 60 * 30), isRead: false, type: 'success' },
  { id: '3', title: 'Thông báo quan trọng', message: 'Lịch học tuần sau sẽ thay đổi. Vui lòng kiểm tra lại thời khóa biểu.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), isRead: true, type: 'warning' },
  { id: '4', title: 'Tài liệu mới', message: 'Giảng viên đã đăng tài liệu mới cho bài giảng "Design Patterns"', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), isRead: true, type: 'info' },
];

const titles = ['Bài giảng mới', 'Nhắc nhở deadline', 'Cập nhật khóa học', 'Thảo luận mới', 'Phản hồi bài tập', 'Thông báo hệ thống', 'Tin nhắn mới', 'Lịch hẹn sắp tới'];
const messages = ['Giảng viên đã đăng bài giảng mới cho tuần này', 'Còn 2 ngày để nộp bài tập lớn', 'Khóa học đã được cập nhật nội dung mới', 'Có thảo luận mới trong diễn đàn', 'Giảng viên đã phản hồi bài tập của bạn', 'Hệ thống sẽ bảo trì vào cuối tuần', 'Bạn có tin nhắn mới từ giảng viên', 'Lịch hẹn tư vấn sẽ diễn ra vào ngày mai'];
const types: Notification['type'][] = ['info', 'success', 'warning', 'error'];

const generatedNotifications = Array.from({ length: 20 }, (_, index): Notification => ({
  id: String(initialNotifications.length + 1 + index),
  title: titles[index % titles.length],
  message: messages[index % messages.length],
  timestamp: new Date(Date.now() - 1000 * 60 * 60 * (6 + index)),
  isRead: Math.random() > 0.3,
  type: types[index % types.length],
}));

let notificationsStore: Notification[] = [...initialNotifications, ...generatedNotifications];
const subscribers = new Set<(items: Notification[]) => void>();

export const getNotificationsStore = () => notificationsStore;
export const subscribeNotifications = (callback: (items: Notification[]) => void) => {
  subscribers.add(callback);
  callback(notificationsStore);
  return () => subscribers.delete(callback);
};
export const updateNotificationsStore = (next: Notification[]) => {
  notificationsStore = next;
  subscribers.forEach((callback) => callback(notificationsStore));
};
