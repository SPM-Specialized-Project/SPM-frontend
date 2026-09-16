import { useState } from 'react';

import { courseCreationRequestDriver, type CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import { useJsonData } from '@/services/use-json-data';

import { AdminRequestCard } from './admin-request-card';

type DropdownOption = { id: string; name: string };

export function AdminRegister() {
  const requests = useJsonData(courseCreationRequestDriver);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CourseCreationRequest>>({});

  const updateField = (field: keyof CourseCreationRequest, value: unknown) => {
    setEditForm((previous) => ({ ...previous, [field]: value }));
  };
  const toggleOption = (field: 'languages' | 'sessionTypes' | 'locations', option: DropdownOption) => {
    const currentOptions = (editForm[field] as DropdownOption[] | undefined) ?? [];
    updateField(field, currentOptions.some((item) => item.id === option.id)
      ? currentOptions.filter((item) => item.id !== option.id)
      : [...currentOptions, option]);
  };
  const addTimeSlot = () => {
    updateField('timeSlots', [...(editForm.timeSlots ?? []), { id: `slot-${Date.now()}`, date: '', time: '' }]);
  };
  const removeTimeSlot = (slotId: string) => {
    updateField('timeSlots', (editForm.timeSlots ?? []).filter((slot) => slot.id !== slotId));
  };
  const updateTimeSlot = (slotId: string, field: 'date' | 'time', value: string) => {
    updateField('timeSlots', (editForm.timeSlots ?? []).map((slot) => slot.id === slotId ? { ...slot, [field]: value } : slot));
  };
  const handleEdit = (request: CourseCreationRequest) => {
    setEditingId(request.id);
    setEditForm({ ...request });
  };
  const handleSave = () => {
    if (!editingId) return;
    courseCreationRequestDriver.update(editingId, { ...editForm, updatedAt: new Date().toISOString() });
    setEditingId(null);
    setEditForm({});
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Quản lý yêu cầu tạo khóa học</h1>
      <div className="space-y-4">
        {requests.map((request) => (
          <AdminRequestCard
            key={request.id}
            request={request}
            editing={editingId === request.id}
            editForm={editForm}
            onUpdateField={updateField}
            onToggleOption={toggleOption}
            onAddTimeSlot={addTimeSlot}
            onRemoveTimeSlot={removeTimeSlot}
            onUpdateTimeSlot={updateTimeSlot}
            onSave={handleSave}
            onCancel={handleCancel}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </div>
  );
}

export default AdminRegister;
