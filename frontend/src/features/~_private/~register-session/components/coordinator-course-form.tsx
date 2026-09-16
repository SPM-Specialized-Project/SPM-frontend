import {
  AddButton,
  FormDropdown,
  FormSection,
  FormTextArea,
  type DropdownOption,
} from './coordinator-form-controls';
import { ClockIcon, LanguageIcon, LocationIcon, SessionTypeIcon } from './coordinator-icons';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';

const sessionTypeOptions: DropdownOption[] = [
  { id: 'online', name: 'Học trực tiếp' },
  { id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' },
];

export type CoordinatorTimeSlot = {
  id: string;
  date: string;
  time: string;
};

type CoordinatorCourseFormProps = {
  courseName: string;
  courseCode: string;
  language: DropdownOption;
  sessionType: DropdownOption;
  location: DropdownOption;
  description: string;
  addedLanguages: DropdownOption[];
  addedSessionTypes: DropdownOption[];
  addedLocations: DropdownOption[];
  meetLink: string;
  addedTimeSlots: CoordinatorTimeSlot[];
  onCourseNameChange: (value: string) => void;
  onCourseCodeChange: (value: string) => void;
  onLanguageChange: (value: DropdownOption) => void;
  onSessionTypeChange: (value: DropdownOption) => void;
  onLocationChange: (value: DropdownOption) => void;
  onDescriptionChange: (value: string) => void;
  onMeetLinkChange: (value: string) => void;
  onAddLanguage: () => void;
  onRemoveLanguage: (id: string) => void;
  onAddSessionType: () => void;
  onRemoveSessionType: (id: string) => void;
  onAddLocation: () => void;
  onRemoveLocation: (id: string) => void;
  onRemoveTimeSlot: (id: string) => void;
  onSubmit: () => void;
};

function AddedOptions({
  options,
  onRemove,
}: {
  options: DropdownOption[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => (
        <span
          key={option.id}
          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm"
        >
          {option.name}
          <button type="button" onClick={() => onRemove(option.id)} className="text-gray-500">
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}

export function CoordinatorCourseForm({
  courseName,
  courseCode,
  language,
  sessionType,
  location,
  description,
  addedLanguages,
  addedSessionTypes,
  addedLocations,
  meetLink,
  addedTimeSlots,
  onCourseNameChange,
  onCourseCodeChange,
  onLanguageChange,
  onSessionTypeChange,
  onLocationChange,
  onDescriptionChange,
  onMeetLinkChange,
  onAddLanguage,
  onRemoveLanguage,
  onAddSessionType,
  onRemoveSessionType,
  onAddLocation,
  onRemoveLocation,
  onRemoveTimeSlot,
  onSubmit,
}: CoordinatorCourseFormProps) {
  return (
    <main className="p-6">
      <form className="relative rounded-lg bg-white shadow-lg" onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
        <div className="space-y-8 p-8">
          <FormSection title="Tên môn học">
            <input
              type="text"
              value={courseName}
              onChange={(event) => onCourseNameChange(event.target.value)}
              placeholder="Nhập tên môn học..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
            />
          </FormSection>

          <FormSection title="Mã môn học">
            <input
              type="text"
              value={courseCode}
              onChange={(event) => onCourseCodeChange(event.target.value)}
              placeholder="Ví dụ: CS401, IT302..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
            />
          </FormSection>

          <FormSection title="Ngôn ngữ">
            <FormDropdown
              icon={<LanguageIcon className="size-5" />}
              options={mockLanguages}
              selected={language}
              onSelect={onLanguageChange}
            />
            <AddButton title="Thêm ngôn ngữ" onClick={onAddLanguage} />
            {addedLanguages.length > 0 && (
              <AddedOptions options={addedLanguages} onRemove={onRemoveLanguage} />
            )}
          </FormSection>

          <FormSection title="Loại hình">
            <FormDropdown
              icon={<SessionTypeIcon className="size-5" />}
              options={sessionTypeOptions}
              selected={sessionType}
              onSelect={onSessionTypeChange}
            />
            <AddButton title="Thêm loại hình" onClick={onAddSessionType} />
            {addedSessionTypes.length > 0 && (
              <AddedOptions options={addedSessionTypes} onRemove={onRemoveSessionType} />
            )}
          </FormSection>

          {addedSessionTypes.some((option) => option.id === 'online') && (
            <FormSection title="Địa điểm">
              <FormDropdown
                icon={<LocationIcon className="size-5" />}
                options={mockLocations}
                selected={location}
                onSelect={onLocationChange}
              />
              <div className="mt-2">
                <AddButton title="Thêm địa điểm" onClick={onAddLocation} />
                {addedLocations.length > 0 && (
                  <AddedOptions options={addedLocations} onRemove={onRemoveLocation} />
                )}
              </div>
            </FormSection>
          )}

          {addedSessionTypes.some((option) => option.id === 'hybrid') && (
            <FormSection title="Link buổi học trực tuyến">
              <input
                type="text"
                value={meetLink}
                onChange={(event) => onMeetLinkChange(event.target.value)}
                placeholder="https://meet.example.com/abc-123"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
              />
            </FormSection>
          )}

          <FormSection title="Mô tả môn học">
            <FormTextArea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Nhập mô tả chi tiết về môn học, nội dung, mục tiêu..."
              rows={8}
            />
          </FormSection>

          {addedTimeSlots.length > 0 && (
            <FormSection title="Lịch dạy đã thêm">
              <div className="space-y-2">
                {addedTimeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-blue-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <ClockIcon className="size-5" />
                      <span className="text-sm font-medium text-gray-800">
                        {new Date(slot.date).toLocaleDateString('vi-VN')} - {slot.time}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTimeSlot(slot.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
        </div>

        <div className="flex justify-end gap-4 rounded-b-lg border-t border-gray-200 bg-gray-50 p-6">
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800"
          >
            Tạo môn học
          </button>
        </div>
      </form>
    </main>
  );
}
