import { UserCircleIcon } from "@heroicons/react/24/solid";

interface StudentSelectionSectionProps {
  allNames: Array<{ id: number; name: string; present: boolean }>
  selectedMembers: Set<number>
  toggleMember: (id: number) => void
}

export function StudentSelectionSection({
  allNames,
  selectedMembers,
  toggleMember,
}: StudentSelectionSectionProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">
          Chọn học sinh tham gia
        </h2>
        <span className="text-sm text-gray-600">
          Đã chọn: {selectedMembers.size}/{allNames.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {allNames.map((member) => {
          const isSelected = selectedMembers.has(member.id)
          return (
            <div
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="relative shrink-0">
                <UserCircleIcon
                  className={`size-8 transition-colors ${
                    isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'
                  }`}
                />
                {isSelected && (
                  <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-blue-600">
                    <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                {member.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Section 3: Nút bấm (Hủy, Tạo)
 */
