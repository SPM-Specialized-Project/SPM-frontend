import { mockLanguages, mockLocations } from '@/components/data/~mock-register';

import {
  AddButton,
  FormDropdown,
  FormSection,
  FormTextArea,
  type DropdownOption,
} from './tutor-register-form';
import { LanguageIcon, LocationIcon, SessionTypeIcon, SubjectIcon } from './tutor-register-icons';

export const tutorSessionTypeOptions: DropdownOption[] = [
  { id: 'online', name: 'Học trực tuyến' },
  { id: 'hybrid', name: 'Học trực tuyến và trực tiếp' },
];

type TutorRegisterFieldsProps = {
  courseOptions: DropdownOption[];
  courseSelected: DropdownOption;
  language: DropdownOption;
  sessionType: DropdownOption;
  location: DropdownOption;
  specialRequest: string;
  meetLink: string;
  achievements: string;
  addedSubjects: DropdownOption[];
  addedLanguages: DropdownOption[];
  addedSessionTypes: DropdownOption[];
  addedLocations: DropdownOption[];
  onCourseSelect: (option: DropdownOption) => void;
  onLanguageSelect: (option: DropdownOption) => void;
  onSessionTypeSelect: (option: DropdownOption) => void;
  onLocationSelect: (option: DropdownOption) => void;
  onSpecialRequestChange: (value: string) => void;
  onMeetLinkChange: (value: string) => void;
  onAchievementsChange: (value: string) => void;
  onAddSubject: () => void;
  onAddLanguage: () => void;
  onAddSessionType: () => void;
  onAddLocation: () => void;
  onRemoveSubject: (id: string) => void;
  onRemoveLanguage: (id: string) => void;
  onRemoveSessionType: (id: string) => void;
  onRemoveLocation: (id: string) => void;
};

function OptionChips({
  options,
  onRemove,
}: {
  options: DropdownOption[];
  onRemove: (id: string) => void;
}) {
  if (options.length === 0) return null;

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

export function TutorRegisterFields({
  courseOptions,
  courseSelected,
  language,
  sessionType,
  location,
  specialRequest,
  meetLink,
  achievements,
  addedSubjects,
  addedLanguages,
  addedSessionTypes,
  addedLocations,
  onCourseSelect,
  onLanguageSelect,
  onSessionTypeSelect,
  onLocationSelect,
  onSpecialRequestChange,
  onMeetLinkChange,
  onAchievementsChange,
  onAddSubject,
  onAddLanguage,
  onAddSessionType,
  onAddLocation,
  onRemoveSubject,
  onRemoveLanguage,
  onRemoveSessionType,
  onRemoveLocation,
}: TutorRegisterFieldsProps) {
  return (
    <div className="space-y-8 p-8">
      <FormSection title="Môn học giảng viên muốn dạy">
        <FormDropdown
          icon={<SubjectIcon className="size-5" />}
          options={courseOptions}
          selected={courseSelected}
          onSelect={onCourseSelect}
        />
        <AddButton title="Thêm môn học" onClick={onAddSubject} />
        <OptionChips options={addedSubjects} onRemove={onRemoveSubject} />
      </FormSection>

      <FormSection title="Ngôn ngữ">
        <FormDropdown
          icon={<LanguageIcon className="size-5" />}
          options={mockLanguages}
          selected={language}
          onSelect={onLanguageSelect}
        />
        <AddButton title="Thêm ngôn ngữ" onClick={onAddLanguage} />
        <OptionChips options={addedLanguages} onRemove={onRemoveLanguage} />
      </FormSection>

      <FormSection title="Loại hình">
        <FormDropdown
          icon={<SessionTypeIcon className="size-5" />}
          options={tutorSessionTypeOptions}
          selected={sessionType}
          onSelect={onSessionTypeSelect}
        />
        <AddButton title="Thêm loại hình" onClick={onAddSessionType} />
        <OptionChips options={addedSessionTypes} onRemove={onRemoveSessionType} />
      </FormSection>

      {addedSessionTypes.some((option) => option.id === 'hybrid') && (
        <FormSection title="Địa điểm">
          <FormDropdown
            icon={<LocationIcon className="size-5" />}
            options={mockLocations}
            selected={location}
            onSelect={onLocationSelect}
          />
          <div className="mt-2">
            <AddButton title="Thêm địa điểm" onClick={onAddLocation} />
            <OptionChips options={addedLocations} onRemove={onRemoveLocation} />
          </div>
        </FormSection>
      )}

      <FormSection title="Link buổi học">
        <input
          type="text"
          value={meetLink}
          onChange={(event) => onMeetLinkChange(event.target.value)}
          placeholder="https://meet.example.com/abc-123"
          className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 shadow-custom-yellow focus:border-blue-500 focus:ring-blue-500"
        />
      </FormSection>

      <FormSection title="Yêu cầu đặc biệt">
        <FormTextArea
          value={specialRequest}
          onChange={(event) => onSpecialRequestChange(event.target.value)}
          rows={8}
        />
      </FormSection>

      <div className="text-sm text-gray-500">
        <FormSection title="Thành tựu">
          <FormTextArea
            value={achievements}
            onChange={(event) => onAchievementsChange(event.target.value)}
            rows={8}
            placeholder="Nhập thành tựu của bạn ở đây..."
          />
        </FormSection>
      </div>
    </div>
  );
}
