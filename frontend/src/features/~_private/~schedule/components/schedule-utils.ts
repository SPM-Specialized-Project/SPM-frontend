export function getWeekLabels(reference = new Date()) {
  const daysToMonday = (reference.getDay() + 6) % 7;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - daysToMonday);
  const weekdayNames = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return { weekday: weekdayNames[index], date: `${day}/${month}/${date.getFullYear()}` };
  });
}

export function generateHalfHourSlots(start = 7, end = 22) {
  const slots: string[] = [];
  for (let hour = start; hour <= end; hour += 1) {
    const label = String(hour).padStart(2, '0');
    slots.push(`${label}:00`);
    if (hour !== end) slots.push(`${label}:30`);
  }
  return slots;
}

export const TIME_SLOTS_DISPLAY = generateHalfHourSlots(7, 22);

export function toHHMM(iso: string) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function dayIndexFromISO(iso: string) {
  return (new Date(iso).getDay() + 6) % 7;
}

export type CalendarItemData = {
  id: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  title: string;
  desc: string;
  isManager?: boolean;
};
