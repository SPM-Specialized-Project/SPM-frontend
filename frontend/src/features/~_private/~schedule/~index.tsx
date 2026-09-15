import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { sessionDriver } from '@/components/data/~mock-session'
import StudyLayout from '@/components/study-layout'
import { useJsonData } from '@/services/use-json-data'

import { ScheduleDetailPopup } from './components/schedule-detail-popup'

export const Route = createFileRoute('/_private/schedule/')({
  beforeLoad: async () => {
    document.title = 'Schedule -  Tutor Support System';
  },
  component: RouteComponent,
})

// --- DỮ LIỆU GIẢ (MOCK DATA) ---

// Build labels for the current week (Monday..Sunday).
// Each label contains the weekday name and the date for the current week so
// the header shows "weekday" on the first line and the actual date (dd/mm/yyyy)
// on the second line — both rendered inside the same header cell.
function getWeekLabels(reference = new Date()) {
  // Find Monday of the week that contains `reference` (Mon = index 0)
  const jsDay = reference.getDay(); // 0 = Sun, 1 = Mon, ...
  // Calculate days to subtract to get Monday
  const daysToMonday = (jsDay + 6) % 7; // 0 if Mon, 1 if Tue, ..., 6 if Sun
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - daysToMonday);

  const weekdayNames = [
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
    'Chủ nhật',
  ];

  const labels = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return {
      weekday: weekdayNames[i],
      date: `${dd}/${mm}/${yyyy}`,
    };
  });

  return labels;
}

// Calendar week labels are computed per-component so they can change when user navigates weeks.

// Các mốc thời gian hiển thị (mỗi 30 phút). We render labels for every half-hour
// so each grid row represents 30 minutes.
function generateHalfHourSlots(start = 7, end = 22) {
  const slots: string[] = [];
  for (let h = start; h <= end; h++) {
    const hh = String(h).padStart(2, '0');
    slots.push(`${hh}:00`);
    if (h !== end) slots.push(`${hh}:30`);
  }
  return slots;
}

const TIME_SLOTS_DISPLAY = generateHalfHourSlots(7, 22);

// Build calendar items from mock sessions
// session.start / session.end are ISO datetimes — convert to day index (Mon=0..Sun=6) and HH:mm
function toHHMM(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function dayIndexFromISO(iso: string) {
  const d = new Date(iso)
  // JS: 0 = Sun, 1 = Mon, ... We want 0 = Mon, ..., 6 = Sun
  const jsDay = d.getDay()
  return (jsDay + 6) % 7
}

// --- COMPONENT CHÍNH CỦA TRANG ---

function RouteComponent() {
  const sessions = useJsonData(sessionDriver);
  // Reference date (any date within the currently visible week). We start at today.
  const [referenceDate, setReferenceDate] = useState(new Date());
  // Compute week labels for the header based on the referenceDate
  const weekLabels = getWeekLabels(referenceDate);

  // Determine the Monday (start) of the current week and the exclusive end (next Monday)
  const daysToMonday = (referenceDate.getDay() + 6) % 7;
  const weekStart = new Date(referenceDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(referenceDate.getDate() - daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [role, setRole] = useState<'student' | 'tutor'>(localStorage.getItem('role') === 'tutor' ? 'tutor' : 'student');


  // const rawUserStore = localStorage.getItem('userStore');
  // const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
  // const State = userStore?.state ?? null;
  // const userLocalStore = State?.user ?? null;

  const goToPreviousWeek = () => setReferenceDate((d) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() - 7);
    return nd;
  });
  const goToNextWeek = () => setReferenceDate((d) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() + 7);
    return nd;
  });



  // Filter and map sessions to calendar items, only showing those within the currently visible week
  // and within visible hours (07:00-22:00). Computed inside component so it re-runs on state change.
  const calendarItems = sessions
    .filter((s) => {
      const startDate = new Date(s.start);
      // Keep only sessions starting within [weekStart, weekEnd)
      if (startDate < weekStart || startDate >= weekEnd) return false;
      const startHour = startDate.getHours();
      const endHour = new Date(s.end).getHours();
      // Only show sessions that start between 07:00-21:59 or end between 07:01-22:00
      return (startHour >= 7 && startHour < 22) || (endHour > 7 && endHour <= 22);
    })
    .map((s) => ({
      id: s.id,
      dayIndex: dayIndexFromISO(s.start),
      startTime: toHHMM(s.start),
      endTime: toHHMM(s.end),
      title: s.title,
      desc: s.desc ?? '',
      isManager: role === 'tutor',
    }));

  return (
    <StudyLayout>
      <div className="flex flex-1 flex-col">

        {/* 1. Header "Quay lại" */}
        <Link
          to="/dashboard"
          className="mb-6 flex items-center gap-2 text-[#3D4863] transition hover:text-blue-700"
        >
          <ArrowLeftIcon className="size-5" />
          <span className="font-medium">Quay lại</span>
        </Link>


        {/* 2. Banner Tiêu đề với Sóng */}
        <div className="relative bg-white pb-12 pt-6">
          <div className=" px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-gray-900">
              Calendar - Tutor System
            </h1>
          </div>
          {/* Component sóng trang trí */}
          <BannerWave />
        </div>

        {/* 3. Nội dung chính của Lịch */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="relative rounded-lg bg-white pb-4">

            {/* 3.1. Header của Lịch (Thời khóa biểu + Controls) */}
            <ScheduleHeader onPrevWeek={goToPreviousWeek} onNextWeek={goToNextWeek} />

            {/* 3.2. Grid Lịch */}
          <CalendarGrid key={role} items={calendarItems} weekLabels={weekLabels} role={role} />
          </div>

          {/* 4. Nút "Yêu cầu buổi học" và liên kết Lịch sử */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <button
                onClick={() => {
                  const newRole = role === 'student' ? 'tutor' : 'student';
                  localStorage.setItem('role', newRole);
                  setRole(newRole);
                }}
                className="rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-800 hover:bg-gray-300"
              >
                Đổi role: {role === 'student' ? 'Student' : 'Tutor'}
              </button>
            </div>
            {/* { userLocalStore.isTutor && ( */}
            <div className="flex items-center gap-4">
              {role === 'tutor' && (
                <Link
                  to="/schedule/request"
                  search={{ courseId: '', title: '', desc: '', requestType: '' }}
                  className="rounded-md bg-blue-800 px-5 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Tạo buổi học
                </Link>
              )}

              <Link
                to="/schedule/history"
                className="rounded-md bg-blue-800 px-5 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Yêu cầu buổi học
              </Link>

            </div>

          </div>
        </main>
      </div>
    </StudyLayout>
  )
}

// --- CÁC COMPONENT CON ---

/**
 * Component sóng trang trí (Blue & Yellow)
 */
function BannerWave() {
  return (
    <svg
      className="absolute right-0 top-0 h-full w-[960px]"
      viewBox="0 0 960 227"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <mask id="mask0_1144_864" maskUnits="userSpaceOnUse" x="0" y="0" width="960" height="227">
        <rect x="960" y="227" width="960" height="227" rx="8" transform="rotate(180 960 227)" fill="#1E40AF" />
      </mask>
      <g mask="url(#mask0_1144_864)">
        <g filter="url(#filter0_i_1144_864)">
          <path d="M960 204.301V0.000778198H80C80 0.000778198 410 9.6149 520 102.151C630 194.687 960 204.301 960 204.301Z" fill="#D97706" />
        </g>
        <g filter="url(#filter1_i_1144_864)">
          <path d="M960 204.301V0.000762939H320C320 0.000762939 560 9.6149 640 102.151C720 194.687 960 204.301 960 204.301Z" fill="#1E40AF" />
        </g>
      </g>
      <defs>
        <filter id="filter0_i_1144_864" x="80" y="0" width="880" height="208.301" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_1144_864" />
        </filter>
        <filter id="filter1_i_1144_864" x="320" y="0" width="640" height="208.301" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_1144_864" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Header của Lịch (Thời khóa biểu, Filter, Pagination)
 */
function ScheduleHeader({ onPrevWeek, onNextWeek }: { onPrevWeek: () => void; onNextWeek: () => void }) {
  // onPrevWeek / onNextWeek are provided by the parent to navigate calendar weeks
  onPrevWeek = onPrevWeek ?? (() => { });
  onNextWeek = onNextWeek ?? (() => { });

  return (
    <div className="flex flex-col items-center justify-between border-gray-200 p-4 md:flex-row">
      <h2 className="text-xl font-semibold text-gray-800">Thời khóa biểu</h2>
      <div className="mt-4 flex items-center gap-4 md:mt-0">
        <div>
          <div className="flex items-center gap-2">
            <svg
              className="inline-block w-40"
              viewBox="0 0 180 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <mask id="mask0_1144_1246" maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
                <rect width="40" height="40" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_1144_1246)">
                <rect x="12.8945" y="5.82031" width="30" height="10" transform="rotate(45 12.8945 5.82031)" fill="#F59E0B" />
                <rect x="34.1055" y="12.8906" width="30" height="10" transform="rotate(135 34.1055 12.8906)" fill="#F59E0B" />
              </g>
              <path d="M67.998 4C76.8346 4 83.998 11.1634 83.998 20C83.998 28.8366 76.8346 36 67.998 36C59.1615 36 51.998 28.8366 51.998 20C51.998 11.1634 59.1615 4 67.998 4ZM67.999 13C64.133 13 60.999 16.134 60.999 20C60.9991 23.8659 64.1331 27 67.999 27C71.8648 26.9998 74.9989 23.8658 74.999 20C74.999 16.1341 71.8649 13.0002 67.999 13Z" fill="#1E40AF" />
              <mask id="mask1_1144_1246" maskUnits="userSpaceOnUse" x="96" y="0" width="40" height="40">
                <rect x="96" width="40" height="40" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask1_1144_1246)">
                <rect x="108.894" y="5.82031" width="30" height="10" transform="rotate(45 108.894 5.82031)" fill="#F59E0B" />
                <rect x="130.104" y="12.8906" width="30" height="10" transform="rotate(135 130.104 12.8906)" fill="#F59E0B" />
              </g>
              <path d="M164.002 4C172.839 4 180.002 11.1634 180.002 20C180.002 28.8366 172.839 36 164.002 36C155.165 36 148.002 28.8366 148.002 20C148.002 11.1634 155.165 4 164.002 4ZM164.003 13C160.137 13 157.003 16.134 157.003 20C157.003 23.8659 160.137 27 164.003 27C167.869 26.9998 171.003 23.8658 171.003 20C171.003 16.1341 167.869 13.0002 164.003 13Z" fill="#1E40AF" />
            </svg>
          </div>
          <div className="flex items-center justify-end">
            <button aria-label='Chuyển tuần trước' onClick={onPrevWeek} className="rounded-md border border-black bg-white p-1 text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600">
              <ChevronLeftIcon className="size-5" />
            </button>
            <button aria-label='Chuyển tuần sau' onClick={onNextWeek} className="ml-2 rounded-md border border-black bg-white p-1 text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600">
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * Grid Lịch chính (Giờ, Ngày, Các ô, và Item)
 */
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

function CalendarGrid({ items, weekLabels, role }: CalendarGridProps) {
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
