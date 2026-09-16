import type { CourseCreationRequest } from '@/components/data/~mock-coordinator-requests';

export function AdminRequestView({ request, onEdit }: { request: CourseCreationRequest; onEdit: (request: CourseCreationRequest) => void }) {
  const handleEdit = onEdit;
  return (
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
  );
}
