import { FormSection } from './tutor-register-form';

export type AvailabilityWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const days = [
  { id: 1, label: 'Thứ 2' },
  { id: 2, label: 'Thứ 3' },
  { id: 3, label: 'Thứ 4' },
  { id: 4, label: 'Thứ 5' },
  { id: 5, label: 'Thứ 6' },
  { id: 6, label: 'Thứ 7' },
  { id: 0, label: 'Chủ nhật' },
];

export function MatchingAvailabilityFields({
  windows,
  onChange,
  title = 'Thời gian rảnh đã xác nhận',
}: {
  windows: AvailabilityWindow[];
  onChange: (windows: AvailabilityWindow[]) => void;
  title?: string;
}) {
  const selectedDays = new Set(windows.map((window) => window.dayOfWeek));
  const startTime = windows[0]?.startTime ?? '08:00';
  const endTime = windows[0]?.endTime ?? '10:00';

  const commit = (nextDays: Set<number>, nextStart: string, nextEnd: string) => {
    onChange([...nextDays].sort().map((dayOfWeek) => ({ dayOfWeek, startTime: nextStart, endTime: nextEnd })));
  };

  return (
    <FormSection title={title}>
      <p className="mb-3 text-sm text-gray-600">
        Chỉ chọn khung giờ đã xác nhận. Bỏ trống nghĩa là chưa có dữ liệu lịch; hệ thống không tự suy ra giờ rảnh.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {days.map((day) => (
          <label key={day.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedDays.has(day.id)}
              onChange={(event) => {
                const next = new Set(selectedDays);
                if (event.target.checked) next.add(day.id);
                else next.delete(day.id);
                commit(next, startTime, endTime);
              }}
            />
            {day.label}
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Từ
          <input
            type="time"
            value={startTime}
            onChange={(event) => commit(selectedDays, event.target.value, endTime)}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          Đến
          <input
            type="time"
            value={endTime}
            onChange={(event) => commit(selectedDays, startTime, event.target.value)}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
      </div>
      {windows.length > 0 && startTime >= endTime && (
        <p role="alert" className="mt-2 text-sm text-red-700">Giờ kết thúc phải sau giờ bắt đầu.</p>
      )}
    </FormSection>
  );
}
