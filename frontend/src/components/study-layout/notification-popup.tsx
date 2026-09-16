import { useState } from 'react';

import useLockBodyScroll from '@/hooks/use-lock-body-scroll';

import { BellIcon, CheckIcon, SettingsIcon } from './notification-icons';
import { NotificationList } from './notification-list';
import { getNotificationsStore, updateNotificationsStore } from './notification-store';
import type { Notification } from './notification-types';

export { getNotificationsStore, subscribeNotifications } from './notification-store';

type NotificationPopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

const NotificationPopup = ({ isOpen, onClose }: NotificationPopupProps) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => getNotificationsStore());
  const [showSettings, setShowSettings] = useState(false);
  useLockBodyScroll(isOpen);

  const updateReadState = (updater: (notification: Notification) => Notification) => {
    setNotifications((previous) => {
      const next = previous.map(updater);
      updateNotificationsStore(next);
      return next;
    });
  };

  const markAsRead = (notification: Notification) => {
    updateReadState((current) => current.id === notification.id ? { ...current, isRead: true } : current);
    if (notification.link) window.location.href = notification.link;
  };
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[97] bg-black/20" onClick={onClose} />
      <div className="fixed right-4 top-24 z-[99] flex h-[calc(100vh-120px)] w-[400px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <BellIcon /><h2 className="text-lg font-bold text-gray-800">Thông báo</h2>
            {unreadCount > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{unreadCount}</span>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && <button onClick={() => updateReadState((notification) => ({ ...notification, isRead: true }))} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[#0329E9] transition hover:bg-blue-50" title="Đánh dấu tất cả là đã đọc"><CheckIcon /></button>}
            <button onClick={() => setShowSettings((value) => !value)} className="flex items-center justify-center rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100" title="Cài đặt thông báo"><SettingsIcon /></button>
          </div>
        </div>
        {showSettings && <NotificationSettings />}
        <div className="flex-1 overflow-y-auto"><NotificationList notifications={notifications} onRead={markAsRead} /></div>
      </div>
    </>
  );
};

function NotificationSettings() {
  const labels = ['Thông báo bài nộp', 'Thông báo điểm số', 'Thông báo tài liệu', 'Thông báo hệ thống'];
  return <div className="border-b border-gray-200 bg-gray-50 p-4"><h3 className="mb-3 text-sm font-semibold text-gray-800">Cài đặt thông báo</h3><div className="space-y-2">{labels.map((label) => <label key={label} className="flex items-center justify-between"><span className="text-sm text-gray-700">{label}</span><input type="checkbox" className="size-4 rounded border-gray-300" defaultChecked /></label>)}</div></div>;
}

export default NotificationPopup;
