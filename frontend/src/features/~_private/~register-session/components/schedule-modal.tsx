import type { Dispatch, SetStateAction } from 'react';

type TimeSlot = {
  id: string;
  date: string;
  time: string;
};

type ScheduleModalProps = {
  selectedDate: string;
  selectedTime: string;
  addedTimeSlots: TimeSlot[];
  setSelectedDate: Dispatch<SetStateAction<string>>;
  setSelectedTime: Dispatch<SetStateAction<string>>;
  setAddedTimeSlots: Dispatch<SetStateAction<TimeSlot[]>>;
  onClose: () => void;
};

export function ScheduleModal({
  selectedDate,
  selectedTime,
  addedTimeSlots,
  setSelectedDate,
  setSelectedTime,
  setAddedTimeSlots,
  onClose,
}: ScheduleModalProps) {
  return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50" onClick={() => onClose()}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold text-gray-800">Thêm lịch dạy</h2>

            <div className="space-y-4">
              {/* Date picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Chọn ngày</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="Chọn ngày dạy"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Time picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Chọn giờ</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  placeholder="Chọn giờ dạy"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Display added time slots */}
              {addedTimeSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Các khung giờ đã thêm:</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {addedTimeSlots.map(slot => (
                      <div key={slot.id} className="flex items-center justify-between rounded bg-blue-50 px-3 py-2 text-sm">
                        <span>{slot.date} - {slot.time}</span>
                        <button
                          type="button"
                          onClick={() => setAddedTimeSlots(addedTimeSlots.filter(s => s.id !== slot.id))}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedDate && selectedTime) {
                    const newSlot = {
                      id: `slot-${Date.now()}`,
                      date: selectedDate,
                      time: selectedTime
                    };
                    setAddedTimeSlots([...addedTimeSlots, newSlot]);
                    setSelectedDate('');
                    setSelectedTime('');
                  }
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
  );
}
