import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';

export type DropdownOption = { id: string; name: string };
export type AdminRequestEditorProps = {
  editForm: Partial<CourseCreationRequest>;
  onUpdateField: (field: keyof CourseCreationRequest, value: unknown) => void;
  onToggleOption: (field: 'languages' | 'sessionTypes' | 'locations', option: DropdownOption) => void;
  onAddTimeSlot: () => void;
  onRemoveTimeSlot: (slotId: string) => void;
  onUpdateTimeSlot: (slotId: string, field: 'date' | 'time', value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};
export type AdminRequestCardProps = AdminRequestEditorProps & {
  request: CourseCreationRequest;
  editing: boolean;
  onEdit: (request: CourseCreationRequest) => void;
};

