import { BellIcon } from './notification-icons';
import type { Notification } from './notification-types';

export function NotificationList({ notifications, onRead }: { notifications: Notification[]; onRead: (notification: Notification) => void }) {
  if (notifications.length === 0) {
    return <div className="flex h-full flex-col items-center justify-center p-8 text-center"><BellIcon /><p className="mt-4 text-gray-500">Bạn không có thông báo nào</p></div>;
  }
  return <div className="divide-y divide-gray-100">{notifications.map((notification) => <NotificationItem key={notification.id} notification={notification} onRead={onRead} />)}</div>;
}

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (notification: Notification) => void }) {
  return (
    <div className={`cursor-pointer p-4 transition hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50/30' : ''}`} onClick={() => onRead(notification)}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{!notification.isRead ? <div className="size-2.5 rounded-full bg-[#0329E9]" /> : <div className="size-2.5" />}</div>
        <div className="flex-1">
          <h3 className={`mb-1 text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{notification.title}</h3>
          <p className="mb-2 text-sm text-gray-600">{notification.message}</p>
          <span className="text-xs text-gray-400">{formatTimestamp(notification.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date) {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
