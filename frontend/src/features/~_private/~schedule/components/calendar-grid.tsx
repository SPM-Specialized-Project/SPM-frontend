import { useRef, useState } from "react";

import { ScheduleDetailPopup } from "./schedule-detail-popup";
import { TIME_SLOTS_DISPLAY } from "./schedule-utils";

interface CalendarGridProps {
  items: Array<{
    id: string;
    dayIndex: number;
    startTime: string;
    endTime: string;
    title: string;
    desc: string;
  }>;
  weekLabels: Array<{ weekday: string; date: string }>;
  role: 'student' | 'tutor';
}

export function CalendarGrid({ items, weekLabels, role }: CalendarGridProps) {
  console.log('CalendarGrid rendered with role:', role);
  // Grid được chia thành 30 hàng (30 phút mỗi hàng), từ 07:00 đến 22:00
  const totalRows = (22 - 7) * 2; // = 30 rows (1 row = 30 minutes)

  return (
    <div className="relative overflow-x-auto shadow-custom-yellow">
      <div
        className="grid"
        // Cột 1 cho thời gian, 7 cột cho các ngày
        // 1 hàng = 1 giờ (2rem chiều cao)
        style={{
          gridTemplateColumns: 'auto repeat(7, minmax(140px, 1fr))',
          gridTemplateRows: `auto repeat(${totalRows}, 2rem)`, // 'auto' cho header
          gap: 0, // Đảm bảo không có khoảng cách giữa các ô
        }}
      >
        {/* Ô trống góc trên bên trái */}
        <div className="sticky left-0 z-10 col-start-1 row-start-1 border-b border-r border-gray-200 bg-white"></div>

        {/* Header các ngày trong tuần */}
        {weekLabels.map((d, idx) => (
          <div
            key={d.date + idx}
            className="row-start-1 bg-[#3D4863] p-3 text-center font-semibold text-white"
          >
            <div className="text-sm">{d.weekday}</div>
            <div className="mt-1 text-xs">{d.date}</div>
          </div>
        ))}

        {/* Cột mốc thời gian (bên trái) */}
        {TIME_SLOTS_DISPLAY.map((time, idx) => {
          const [hourStr, minStr] = time.split(':');
          const hour = parseInt(hourStr, 10);
          console.log('hour', hour);
          const minute = parseInt(minStr, 10);
          // Highlight full hours (minute === 0) differently
          const textColor = minute === 0 ? '#F9BA08' : '#0329E9';

          return (
            <div
              key={time}
              className="sticky left-0 z-10 col-start-1 border-r-2 border-black bg-white text-right"
              // Each label occupies one half-hour row; header is row 1 so first slot is row 2
              style={{ gridRow: `${idx + 2} / span 1` }}
            >
              <span
                className="-mt-3.5 inline-block p-2 text-sm font-semibold"
                style={{ color: textColor }}
              >
                {time}
              </span>
            </div>
          );
        })}

        {/* Các ô lưới (background) */}
        {Array.from({ length: totalRows * 7 }).map((_, i) => (
          <div
            key={i}
            className=""
            style={{
              borderLeftWidth: i % 7 === 0 ? '1px' : '0',
              borderTopWidth: Math.floor(i / 7) === 0 ? '1px' : '0',
            }}
          ></div>
        ))}

        {/* Các mục lịch (đè lên trên grid) */}
        {items.map((item) => (
          <CalendarItem key={item.id} item={item} />
        ))}
      </div>

      {/* Đường viền vàng (nằm trên cùng) */}
      {/* <div className="pointer-events-none absolute inset-0 rounded-b-lg border-b-4 border-r-4 shadow-custom-yellow"></div> */}
    </div>
  );
}

/**
 * Component cho một mục lịch (VD: "Operating System")
 */
interface CalendarItemProps {
  item: {
    id: string;
    dayIndex: number; // 0-6
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
    title: string;
    desc: string;
    isManager?: boolean;
  }
}

function CalendarItem({ item }: CalendarItemProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const itemRef = useRef<HTMLDivElement>(null);
  const baseHour = 7; // Lịch bắt đầu lúc 07:00

  // Tính toán vị trí hàng bắt đầu và row span ở độ phân giải 30 phút
  // Grid dùng 1 row = 30 phút, header là row 1, nên slot 07:00 => row 2
  const getRowStart = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const minutesFromStart = (h * 60 + m) - baseHour * 60; // minutes since 07:00
    // Determine half-hour slot index (0-based). We floor so items snap to the
    // nearest earlier half-hour slot (e.g., 07:10 -> 07:00 slot).
    const slotIndex = Math.floor(Math.max(0, minutesFromStart) / 30);
    // +2 because grid row 1 is header, row 2 is the first time slot (07:00)
    return slotIndex + 2;
  };

  // Compute how many half-hour slots the item occupies. Round up so the item
  // has enough space to show its content.
  const getRowSpan = (startTime: string, endTime: string) => {
    const start = new Date(`2025-01-01T${startTime}:00`);
    const end = new Date(`2025-01-01T${endTime}:00`);
    const minutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
    const slots = Math.ceil(minutes / 30);
    return Math.max(1, slots);
  };

  const handleClick = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      // Đặt popup bên phải item, canh giữa theo chiều dọc
      setPopupPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 16, // 16px khoảng cách
      });
    }
    setIsPopupOpen(true);
  };

  const gridColumn = item.dayIndex + 2; // +2 vì cột 1 là Time
  const gridRowStart = getRowStart(item.startTime);
  const gridRowSpan = getRowSpan(item.startTime, item.endTime);

  return (
    <>
      <div
        ref={itemRef}
        className="relative z-10 m-0.5 cursor-pointer overflow-hidden rounded-lg border-2 border-blue-600 bg-blue-50 p-2 transition-all hover:border-blue-700 hover:shadow-lg"
        style={{
          gridColumn: gridColumn,
          gridRow: `${gridRowStart} / span ${gridRowSpan}`,
        }}
        onClick={handleClick}
        title={item.title}
      >
        {/* Center content; allow up to two lines then ellipsize if too long. */}
        <div className="flex size-full flex-col items-center justify-center text-center">
          <div
            className="text-sm font-bold leading-snug text-blue-800"
            style={{
              display: '-webkit-box' as any,
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: 'vertical' as any,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </div>
          <div className="mt-1 text-xs text-blue-700/80">{item.startTime} - {item.endTime}</div>
        </div>
      </div>

      {/* Popup chi tiết */}
      {isPopupOpen && (
        <ScheduleDetailPopup
          onClose={() => setIsPopupOpen(false)}
          position={popupPosition}
          title={item.title}
          desc={item.desc}
          id={item.id}
          isManager={item.isManager}
        />
      )}
    </>
  );
}

