import { UserCircleIcon } from '@heroicons/react/24/solid';
import { Link } from '@tanstack/react-router';
import React from 'react';

import { sessionStore } from '@/components/data/~mock-session';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';
import { useDataStore } from '@/services/use-data-store';

/**
 * Props cho component ScheduleDetailPopup
 */

const ModificationIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g clipPath="url(#clip0_1248_4115)">
      <path d="M14.7913 5.83151L11.6663 2.70651L3.33301 11.0398V14.1648H6.45801L14.7913 5.83151ZM17.258 3.36484C17.583 3.03984 17.583 2.51484 17.258 2.18984L15.308 0.239844C14.983 -0.0851563 14.458 -0.0851563 14.133 0.239844L12.4997 1.87318L15.6247 4.99818L17.258 3.36484Z" fill="#3D4863" />
      <path d="M0 16.668H20V20.0013H0V16.668Z" fill="#3D4863" />
    </g>
    <defs>
      <clipPath id="clip0_1248_4115">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const PresentIcon = ({ className }: { className?: string }) => (
  <svg width="22" height="23" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <circle cx="10" cy="10" r="10" fill="white" />
    <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM10 3C11.66 3 13 4.34 13 6C13 7.66 11.66 9 10 9C8.34 9 7 7.66 7 6C7 4.34 8.34 3 10 3ZM10 17.2C7.5 17.2 5.29 15.92 4 13.98C4.03 11.99 8 10.9 10 10.9C11.99 10.9 15.97 11.99 16 13.98C14.71 15.92 12.5 17.2 10 17.2Z" fill="#3D4863" />
    <g clipPath="url(#clip0_present)">
      <path d="M22 19C22 20.0609 21.5786 21.0783 20.8284 21.8284C20.0783 22.5786 19.0609 23 18 23C16.9391 23 15.9217 22.5786 15.1716 21.8284C14.4214 21.0783 14 20.0609 14 19C14 17.9391 14.4214 16.9217 15.1716 16.1716C15.9217 15.4214 16.9391 15 18 15C19.0609 15 20.0783 15.4214 20.8284 16.1716C21.5786 16.9217 22 17.9391 22 19ZM20.015 17.485C19.9793 17.4494 19.9368 17.4214 19.89 17.4026C19.8432 17.3838 19.7931 17.3747 19.7427 17.3757C19.6923 17.3767 19.6426 17.3879 19.5966 17.4086C19.5506 17.4293 19.5092 17.459 19.475 17.496L17.7385 19.7085L16.692 18.6615C16.6209 18.5953 16.5269 18.5592 16.4297 18.5609C16.3326 18.5626 16.2399 18.602 16.1712 18.6707C16.1025 18.7394 16.0631 18.8321 16.0614 18.9292C16.0597 19.0264 16.0958 19.1204 16.162 19.1915L17.485 20.515C17.5206 20.5506 17.5631 20.5786 17.6098 20.5974C17.6565 20.6162 17.7065 20.6255 17.7569 20.6245C17.8072 20.6236 17.8569 20.6125 17.9028 20.592C17.9488 20.5715 17.9902 20.5419 18.0245 20.505L20.0205 18.01C20.0885 17.9392 20.1261 17.8446 20.1252 17.7465C20.1243 17.6483 20.0849 17.5544 20.0155 17.485H20.015Z" fill="#34C759" />
    </g>
    <defs>
      <clipPath id="clip0_present">
        <rect width="8" height="8" fill="white" transform="translate(14 15)" />
      </clipPath>
    </defs>
  </svg>
)

const AbsentIcon = ({ className }: { className?: string }) => (
  <svg width="22" height="23" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    <circle cx="10" cy="10" r="10" fill="white" />
    <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM10 3C11.66 3 13 4.34 13 6C13 7.66 11.66 9 10 9C8.34 9 7 7.66 7 6C7 4.34 8.34 3 10 3ZM10 17.2C7.5 17.2 5.29 15.92 4 13.98C4.03 11.99 8 10.9 10 10.9C11.99 10.9 15.97 11.99 16 13.98C14.71 15.92 12.5 17.2 10 17.2Z" fill="#3D4863" />
    <g clipPath="url(#clip0_absent)">
      <path d="M18.4717 19.0013L19.4147 18.0586C19.4772 17.9961 19.5123 17.9113 19.5123 17.8228C19.5123 17.7343 19.4772 17.6495 19.4147 17.587C19.3521 17.5244 19.2673 17.4893 19.1788 17.4893C19.0904 17.4893 19.0055 17.5244 18.943 17.587L18.0003 18.53L17.0577 17.587C16.9951 17.5244 16.9103 17.4893 16.8218 17.4893C16.7334 17.4893 16.6485 17.5244 16.586 17.587C16.5234 17.6495 16.4883 17.7343 16.4883 17.8228C16.4883 17.9113 16.5234 17.9961 16.586 18.0586L17.529 19.0013L16.586 19.944C16.5234 20.0065 16.4883 20.0913 16.4883 20.1798C16.4883 20.2683 16.5234 20.3531 16.586 20.4156C16.6485 20.4782 16.7334 20.5133 16.8218 20.5133C16.9103 20.5133 16.9951 20.4782 17.0577 20.4156L18.0003 19.4726L18.943 20.4156C19.0055 20.4782 19.0904 20.5133 19.1788 20.5133C19.2673 20.5133 19.3521 20.4782 19.4147 20.4156C19.4772 20.3531 19.5123 20.2683 19.5123 20.1798C19.5123 20.0913 19.4772 20.0065 19.4147 19.944L18.4717 19.0013ZM18.0003 22.3346C16.1593 22.3346 14.667 20.8423 14.667 19.0013C14.667 17.1603 16.1593 15.668 18.0003 15.668C19.8413 15.668 21.3337 17.1603 21.3337 19.0013C21.3337 20.8423 19.8413 22.3346 18.0003 22.3346Z" fill="#FF383C" />
    </g>
    <defs>
      <clipPath id="clip0_absent">
        <rect width="8" height="8" fill="white" transform="translate(14 15)" />
      </clipPath>
    </defs>
  </svg>
)

interface ScheduleDetailPopupProps {
  onClose: () => void; // Hàm bắt buộc để xử lý việc đóng popup
  position?: { top: number; left: number }; // Vị trí tùy chỉnh cho popup
  title?: string; // Tiêu đề của popup
  desc?: string; // Mô tả của popup
  id?: string; // ID của lịch học
  isManager?: boolean; // Quyền quản lý
}

/**
 * Component Popup hiển thị chi tiết lịch học
 */
export function ScheduleDetailPopup({ onClose, position, title, desc, id, isManager }: ScheduleDetailPopupProps) {
  // Load actual session data from the API-backed store
  const sessions = useDataStore(sessionStore);
  const session = id ? sessions.find((item) => item.id === id) : undefined
  const sessionMembers = session?.members ?? []

  // Format datetime for display
  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const mon = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${hh}:${mm} ${dd}/${mon}/${yyyy}`
  }

  // Ngăn việc click vào nội dung card làm đóng popup
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Tính toán vị trí popup
  const getPopupStyle = (): React.CSSProperties => {
    if (!position) {
      // Mặc định ở giữa màn hình
      return {};
    }

    // Xác định vị trí popup bên phải item, điều chỉnh nếu vượt biên
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 384; // max-w-sm ~ 384px
    const popupHeight = 600; // Ước tính chiều cao popup

    let top = position.top - popupHeight / 2; // Canh giữa theo chiều dọc
    let left = position.left;

    // Nếu popup vượt quá bên phải màn hình, hiển thị bên trái item
    if (left + popupWidth > viewportWidth) {
      left = position.left - popupWidth - 16 - 100; // Hiển thị bên trái với khoảng cách
    }

    // Đảm bảo popup không vượt quá phía trên/dưới
    if (top < 16) top = 16;
    if (top + popupHeight > viewportHeight - 16) {
      top = viewportHeight - popupHeight - 16;
    }

    return {
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    };
  };
  // const rawUserStore = localStorage.getItem('userStore');
  // const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
  // const State = userStore?.state ?? null;
  // const userLocalStore = State.user ?? null;
  // const rawRole = localStorage.getItem('role');
  // const userLocalStore = {
  //   isManager: rawRole === 'tutor'
  // };
  const popupStyle = getPopupStyle();
  const isPositioned = !!position;

  // Lock body scroll while this popup is mounted
  useLockBodyScroll(true);

  return (
    // Lớp phủ (Overlay)
    <div
      className={`fixed inset-0 z-[500000] ${isPositioned ? '' : 'flex items-center justify-center'} p-4`}
      onClick={onClose} // Click vào overlay để đóng
    >
      {/* Container của Popup (Card) */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-lg border border-gray-500 bg-white shadow-custom-yellow"
        style={isPositioned ? popupStyle : undefined}
        onClick={handleCardClick}
      >
        <Link
          // onClick={onClose}
          to={`/schedule/${id}` as string}
          className="absolute right-3 top-3 z-10 text-gray-400 hover:text-gray-600"
          aria-label="Đóng popup"
        >
          {isManager ? (
            <ModificationIcon className="size-6" />
          ) : (

            <span
              className="text-sm font-medium text-blue-600 hover:underline"
            >Chi tiết</span>
          )}
        </Link>

        {/* Phần 1: Thông tin chi tiết (trên) */}
        {/* add right padding so the absolute edit icon doesn't overlap the text */}
        <div className="p-6 pr-14">
          <h2 className="truncate text-lg text-gray-600">{title}</h2>
          <h1 className="truncate text-2xl font-bold text-gray-900">
            {desc}
          </h1>

          <div className="mt-4 space-y-1.5 text-sm">
            <p className="text-gray-800">
              Method: <span className="font-medium text-gray-900">{session?.method ?? 'N/A'}</span>
            </p>
            {session?.link && (
              <p className="text-gray-800">
                Link:{' '}
                <a
                  href={session.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {session.link}
                </a>
              </p>
            )}
            {session?.location && (
              <p className="text-gray-800">
                Location: <span className="font-medium text-gray-900">{session.location}</span>
              </p>
            )}
            <p className="text-gray-800">
              Course Title: <span className="font-medium text-gray-900">{session?.courseTitle ?? 'N/A'}</span>
            </p>
            <p className="text-gray-800">
              Course ID: <span className="font-medium text-gray-900">{session?.courseId ?? 'N/A'}</span>
            </p>
            <p className="text-gray-800">
              Note:{' '}
              <a
                href={session?.tutorNote}
                className="font-medium text-blue-600 underline"
              >
                tại đây
              </a>
            </p>
          </div>

          {session && (
            <p className="mt-4 text-base font-semibold text-blue-700">
              {formatDateTime(session.start)} - {formatDateTime(session.end)}
            </p>
          )}
        </div>

        {/* Đường kẻ ngang */}
        <div className="border-t border-gray-200"></div>

        {/* Phần 2: Thông tin Giảng viên & Thành viên (dưới) */}
        <div className="p-6">
          <div className="mb-5">
            <span className="text-sm text-gray-700">Giảng viên: </span>
            <span className="text-sm font-medium text-gray-900">{session?.instructor ?? 'N/A'}</span>
          </div>

          <div>
            <h3 className="mb-3 text-sm text-gray-700">Thành viên:</h3>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {sessionMembers.map((member) => (
                <div key={member.id} className="flex flex-col items-center text-center">
                  {isManager ? (
                    member.present ? (
                      <PresentIcon className="size-9" />
                    ) : (
                      <AbsentIcon className="size-9" />
                    )
                  ) : (
                    <UserCircleIcon className="size-9 text-gray-400" />
                  )}
                  <span className="mt-1 text-xs text-gray-700">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
