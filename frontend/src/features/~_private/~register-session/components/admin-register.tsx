import React, { useState } from 'react';

import { courseCreationRequestDriver, type CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';
import { mockLanguages, mockLocations } from '@/components/data/~mock-register';
import { useJsonData } from '@/services/use-json-data';

type DropdownOption = {
  id: string;
  name: string;
};

const sessionTypeOptions = [
  { id: 'online', name: 'Học trực tiếp' },
  { id: 'hybrid', name: 'Học trực tiếp kết hợp trực tuyến' },
];

function AdminRegister() {
  const requests = useJsonData(courseCreationRequestDriver);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CourseCreationRequest>>({});

  // Bắt đầu chỉnh sửa
  const handleEdit = (request: CourseCreationRequest) => {
    setEditingId(request.id);
    setEditForm({ ...request });
  };

  // Lưu thay đổi
  const handleSave = () => {
    if (!editingId) return;
    
    courseCreationRequestDriver.update(editingId, {
      ...editForm,
      updatedAt: new Date().toISOString(),
    });
    
    setEditingId(null);
    setEditForm({});
  };

  // Hủy chỉnh sửa
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Cập nhật field
  const updateField = (field: keyof CourseCreationRequest, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Toggle dropdown options
  const toggleOption = (field: 'languages' | 'sessionTypes' | 'locations', option: DropdownOption) => {
    const currentOptions = (editForm[field] as DropdownOption[]) || [];
    const exists = currentOptions.some(opt => opt.id === option.id);
    
    updateField(
      field,
      exists
        ? currentOptions.filter(opt => opt.id !== option.id)
        : [...currentOptions, option]
    );
  };

  // Thêm time slot
  const addTimeSlot = () => {
    const currentSlots = editForm.timeSlots || [];
    updateField('timeSlots', [
      ...currentSlots,
      { id: `slot-${Date.now()}`, date: '', time: '' },
    ]);
  };

  // Xóa time slot
  const removeTimeSlot = (slotId: string) => {
    const currentSlots = editForm.timeSlots || [];
    updateField('timeSlots', currentSlots.filter(slot => slot.id !== slotId));
  };

  // Update time slot
  const updateTimeSlot = (slotId: string, field: 'date' | 'time', value: string) => {
    const currentSlots = editForm.timeSlots || [];
    updateField(
      'timeSlots',
      currentSlots.map(slot =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    );
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Quản lý yêu cầu tạo khóa học</h1>

      <div className="space-y-4">
        {requests.map(request => (
          <div key={request.id} className="rounded-lg border bg-white p-4 shadow-custom-yellow">
            {editingId === request.id ? (
              // Form chỉnh sửa
              <div className="space-y-4">
                {/* Course Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Tên khóa học</label>
                  <input
                    aria-label='tên khóa học'
                    type="text"
                    value={editForm.courseName || ''}
                    onChange={e => updateField('courseName', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                {/* Course Code */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Mã khóa học</label>
                  <input
                    aria-label='mã khóa học'
                    type="text"
                    value={editForm.courseCode || ''}
                    onChange={e => updateField('courseCode', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                {/* Coordinator Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Tên điều phối viên</label>
                  <input
                    aria-label='tên điều phối viên'
                    type="text"
                    value={editForm.coordinatorName || ''}
                    onChange={e => updateField('coordinatorName', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                {/* Coordinator Email */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Email điều phối viên</label>
                  <input
                    aria-label='email điều phối viên'
                    type="email"
                    value={editForm.coordinatorEmail || ''}
                    onChange={e => updateField('coordinatorEmail', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>

                {/* Languages */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Ngôn ngữ giảng dạy</label>
                  <div className="flex flex-wrap gap-2">
                    {mockLanguages?.map(lang => {
                      if (!lang || !lang.id) return null;
                      const isSelected = (editForm.languages || []).some(l => l?.id === lang.id);
                      return (
                        <button
                          key={lang.id}
                          onClick={() => toggleOption('languages', lang)}
                          className={`rounded border px-3 py-1 ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-white'
                          }`}
                        >
                          {lang.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session Types */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Hình thức học</label>
                  <div className="flex flex-wrap gap-2">
                    {sessionTypeOptions?.map(type => {
                      if (!type || !type.id) return null;
                      const isSelected = (editForm.sessionTypes || []).some(t => t?.id === type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleOption('sessionTypes', type)}
                          className={`rounded border px-3 py-1 ${
                            isSelected ? 'bg-green-500 text-white' : 'bg-white'
                          }`}
                        >
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Địa điểm</label>
                  <div className="flex flex-wrap gap-2">
                    {mockLocations?.map(loc => {
                      if (!loc || !loc.id) return null;
                      const isSelected = (editForm.locations || []).some(l => l?.id === loc.id);
                      return (
                        <button
                          key={loc.id}
                          onClick={() => toggleOption('locations', loc)}
                          className={`rounded border px-3 py-1 ${
                            isSelected ? 'bg-purple-500 text-white' : 'bg-white'
                          }`}
                        >
                          {loc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Meet Link */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Link họp (tùy chọn)</label>
                  <input
                    type="url"
                    value={editForm.meetLink || ''}
                    onChange={e => updateField('meetLink', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                {/* Time Slots */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Khung giờ học</label>
                  <div className="space-y-2">
                    {(editForm.timeSlots || []).map(slot => (
                      <div key={slot.id} className="flex items-center gap-2">
                        <input
                          aria-label="ngày học"
                          type="date"
                          value={slot.date}
                          onChange={e => updateTimeSlot(slot.id, 'date', e.target.value)}
                          className="rounded border px-3 py-2"
                        />
                        <input
                          aria-label="giờ học"
                          type="time"
                          value={slot.time}
                          onChange={e => updateTimeSlot(slot.id, 'time', e.target.value)}
                          className="rounded border px-3 py-2"
                        />
                        <button
                          onClick={() => removeTimeSlot(slot.id)}
                          className="rounded bg-red-500 px-3 py-2 text-white"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addTimeSlot}
                      className="rounded bg-blue-500 px-3 py-2 text-white"
                    >
                      + Thêm khung giờ
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Mô tả</label>
                  <textarea
                    aria-label="mô tả"
                    value={editForm.description || ''}
                    onChange={e => updateField('description', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    rows={3}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Trạng thái</label>
                  <select
                    aria-label="trạng thái"
                    value={editForm.status || 'Pending'}
                    onChange={e => updateField('status', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Reasons */}
                <div>
                  <label className="mb-1 block text-sm font-medium">Lý do</label>
                  <textarea
                    aria-label="lý do"
                    value={editForm.reasons || ''}
                    onChange={e => updateField('reasons', e.target.value)}
                    className="w-full rounded border px-3 py-2"
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={handleCancel}
                    className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{request.courseName}</h3>
                    <p className="text-sm text-gray-600">Mã: {request.courseCode}</p>
                  </div>
                  <span
                    className={`rounded px-3 py-1 text-sm ${
                      request.status === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Điều phối viên:</span> {request.coordinatorName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {request.coordinatorEmail}
                  </div>
                  <div>
                    <span className="font-medium">Ngôn ngữ:</span>
                    {request.languages?.filter(l => l?.name).map(l => l.name).join(', ') || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Hình thức:</span>
                    {request.sessionTypes?.filter(s => s?.name).map(s => s.name).join(', ') || 'N/A'}
                  </div>
                </div>

                <p className="mb-3 text-sm text-gray-700">{request.description}</p>

                {request.timeSlots && request.timeSlots.length > 0 && (
                  <div className="mb-3 text-sm">
                    <span className="font-medium">Khung giờ:</span>
                    <ul className="list-inside list-disc">
                      {request.timeSlots.map(slot => (
                        <li key={slot.id}>
                          {slot.date} - {slot.time}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mb-3 text-sm text-gray-600">
                  <span className="font-medium">Lý do:</span> {request.reasons}
                </div>

                <button
                  onClick={() => handleEdit(request)}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminRegister;
