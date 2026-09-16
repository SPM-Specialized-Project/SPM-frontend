import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

export function ScheduleHeader({ onPrevWeek, onNextWeek }: { onPrevWeek: () => void; onNextWeek: () => void }) {
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
