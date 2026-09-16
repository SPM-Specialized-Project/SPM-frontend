import { UserCircleIcon } from "@heroicons/react/24/solid";

export type AttendanceState = {
  [memberId: string]: 'present' | 'absent';
};

interface AttendanceProps {
  members: ReadonlyArray<{ id: string; name: string }>
  attendance: AttendanceState
  onAttendanceChange: (memberId: string, status: 'present' | 'absent') => void
}
export function AttendanceSection({ members, attendance, onAttendanceChange }: AttendanceProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Điểm danh</h2>
      <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col items-center text-center">
            <UserCircleIcon className="size-10 text-gray-400" />
            <span className="mt-1 text-xs text-gray-700">{member.name}</span>
            <div className="mt-2 space-y-1">
              <label className="flex cursor-pointer items-center text-sm">
                <input
                  type="radio"
                  name={`attendance-${member.id}`}
                  value="present"
                  checked={attendance[member.id] === 'present'}
                  onChange={() => onAttendanceChange(member.id, 'present')}
                  className="size-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1.5">Có mặt</span>
              </label>
              <label className="flex cursor-pointer items-center text-sm">
                <input
                  type="radio"
                  name={`attendance-${member.id}`}
                  value="absent"
                  checked={attendance[member.id] === 'absent'}
                  onChange={() => onAttendanceChange(member.id, 'absent')}
                  className="size-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-1.5">Vắng mặt</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Section 3: Nút bấm (Xóa, Hủy, Lưu)
 */
