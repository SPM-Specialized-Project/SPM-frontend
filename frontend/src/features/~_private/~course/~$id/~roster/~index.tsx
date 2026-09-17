import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { courseStore } from '@/components/data/~mock-courses';
import StudyLayout from '@/components/study-layout';
import { ApiError, api } from '@/services/api-client';
import type {
  Membership,
  ProvisionedStudent,
} from '@/services/api-types';
import { getCurrentViewerContext } from '@/services/viewer-context';
import type { ResourcePermissions } from '@/types/backend';

export const Route = createFileRoute('/_private/course/$id/roster/')({
  beforeLoad: async () => {
    document.title = 'Danh sách lớp - Tutor Support System';
  },
  component: ClassroomRosterPage,
});

function getStudentInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function ClassroomRosterPage() {
  const { id } = Route.useParams();
  const course = courseStore.getById(id);
  const viewerContext = useMemo(() => getCurrentViewerContext(), []);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [availableStudents, setAvailableStudents] = useState<ProvisionedStudent[]>([]);
  const [permissions, setPermissions] = useState<ResourcePermissions>();
  const [studentEmail, setStudentEmail] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.getMemberships(id, viewerContext);
      setMemberships(data.items);
      setAvailableStudents(data.availableStudents ?? []);
      setPermissions(data.permissions);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể tải danh sách lớp.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, viewerContext]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const selectedStudent = useMemo(
    () => availableStudents.find((student) => student.email === studentEmail) ?? null,
    [availableStudents, studentEmail],
  );

  const selectedMembership = useMemo(
    () =>
      selectedStudent
        ? memberships.find(
            (membership) =>
              membership.studentEmail.toLowerCase() === selectedStudent.email.toLowerCase(),
          )
        : undefined,
    [memberships, selectedStudent],
  );

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return availableStudents;

    return availableStudents.filter((student) =>
      `${student.name} ${student.email}`.toLowerCase().includes(query),
    );
  }, [availableStudents, studentQuery]);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentEmail.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await api.addMembership({
        ...viewerContext,
        classroomId: id,
        studentEmail: studentEmail.trim(),
      });
      toast.success(
        data.reactivated
          ? 'Đã kích hoạt lại membership cho student.'
          : data.created
            ? 'Đã thêm student vào roster.'
            : 'Student đã có trong roster.',
      );
      setStudentEmail('');
      setStudentQuery('');
      await loadRoster();
    } catch (requestError: unknown) {
      toast.error(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể thêm student vào roster.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (membership: Membership) => {
    if (!window.confirm(`Revoke membership của ${membership.studentName}?`)) return;

    setRevokingId(membership.id);
    try {
      await api.revokeMembership({
        ...viewerContext,
        classroomId: id,
        membershipId: membership.id,
      });
      toast.success('Đã revoke membership. Dữ liệu lịch sử được giữ nguyên.');
      await loadRoster();
    } catch (requestError: unknown) {
      toast.error(
        requestError instanceof ApiError
          ? requestError.message
          : 'Không thể revoke membership.',
      );
    } finally {
      setRevokingId(null);
    }
  };

  const title = course?.title ?? `Classroom ${id}`;
  const canManage = Boolean(permissions?.canCreate) && viewerContext.viewerRole === 'tutor';

  return (
    <StudyLayout>
      <div className="mx-auto w-full max-w-6xl font-['Archivo']">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to={'/course/' + id as any}
              className="mb-3 inline-flex text-sm font-medium text-[#3D4863] hover:text-blue-700"
            >
              ← Quay lại classroom
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Danh sách lớp</h1>
            <p className="mt-1 text-gray-600">{title}</p>
          </div>
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {memberships.filter((membership) => membership.status === 'ACTIVE').length} active member
          </div>
        </div>

        {canManage && (
          <form
            onSubmit={handleAdd}
            className="mb-6 rounded-lg border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Thêm student vào roster</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Chọn tài khoản đã provision. Student đã revoke sẽ được kích hoạt lại thay vì tạo record mới.
                </p>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {availableStudents.length} tài khoản student đã provision
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <Combobox
                  value={selectedStudent}
                  onChange={(student: ProvisionedStudent | null) => {
                    setStudentEmail(student?.email ?? '');
                    setStudentQuery('');
                  }}
                >
                  {({ open }) => (
                    <div className="w-full sm:w-[340px]">
                      <Combobox.Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Student account
                      </Combobox.Label>
                      <div className="relative">
                        <Combobox.Input
                          displayValue={(student: ProvisionedStudent | null) => student?.name ?? ''}
                          onChange={(event) => {
                            const query = event.target.value;
                            setStudentQuery(query);
                            if (!selectedStudent || query !== selectedStudent.name) {
                              setStudentEmail('');
                            }
                          }}
                          placeholder="Tìm theo tên hoặc email..."
                          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          aria-label="Student account"
                        />
                        <MagnifyingGlassIcon
                          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <Combobox.Button className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition hover:text-slate-700">
                          <ChevronDownIcon
                            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                        </Combobox.Button>
                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Combobox.Options className="absolute right-0 z-30 mt-1.5 max-h-80 w-[min(380px,calc(100vw-2rem))] overflow-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 focus:outline-none">
                            {filteredStudents.length === 0 ? (
                              <div className="px-3 py-6 text-center text-sm text-slate-500">
                                Không tìm thấy student phù hợp
                              </div>
                            ) : (
                              filteredStudents.map((student) => {
                                const membership = memberships.find(
                                  (item) => item.studentEmail.toLowerCase() === student.email.toLowerCase(),
                                );
                                const status = membership?.status ?? 'NOT_ENROLLED';

                                return (
                                  <Combobox.Option
                                    key={student.id}
                                    value={student}
                                    className={({ active, selected }) =>
                                      `flex min-h-16 cursor-pointer items-center gap-3 rounded-md border-l-2 px-3 py-2 ${
                                        selected
                                          ? 'border-blue-600 bg-blue-50/70'
                                          : active
                                            ? 'border-transparent bg-slate-50'
                                            : 'border-transparent'
                                      }`
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                          {getStudentInitials(student.name)}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-sm font-semibold text-slate-900">
                                            {student.name}
                                          </span>
                                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                                            {student.email}
                                          </span>
                                        </span>
                                        <span
                                          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium ${
                                            status === 'ACTIVE'
                                              ? 'text-emerald-700'
                                              : status === 'REVOKED'
                                                ? 'text-amber-700'
                                                : 'text-slate-500'
                                          }`}
                                        >
                                          {status === 'ACTIVE'
                                            ? 'Đã thêm'
                                            : status === 'REVOKED'
                                              ? 'Đã revoke'
                                              : 'Chưa thêm'}
                                          {status === 'ACTIVE' && (
                                            <CheckIcon className="size-3.5" aria-hidden="true" />
                                          )}
                                        </span>
                                        {selected && status !== 'ACTIVE' && (
                                          <CheckIcon className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
                                        )}
                                      </>
                                    )}
                                  </Combobox.Option>
                                );
                              })
                            )}
                          </Combobox.Options>
                        </Transition>
                      </div>
                    </div>
                  )}
                </Combobox>
                <button
                  type="submit"
                  disabled={submitting || !studentEmail}
                  className="h-11 rounded-lg bg-[#0329E9] px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : selectedMembership?.status === 'REVOKED'
                      ? 'Kích hoạt lại'
                      : selectedMembership?.status === 'ACTIVE'
                        ? 'Đã thêm'
                        : 'Thêm vào roster'}
                </button>
              </div>
            </div>
          </form>
        )}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
        ) : loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Đang tải roster...
          </div>
        ) : memberships.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Tài khoản này chưa có membership trong classroom.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Enrolled at</th>
                    {canManage && <th className="px-5 py-3 text-right font-semibold">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {memberships.map((membership) => (
                    <tr key={membership.id} className="align-middle">
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                        {membership.studentName}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {membership.studentEmail}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            membership.status === 'ACTIVE'
                              ? 'rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700'
                              : 'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600'
                          }
                        >
                          {membership.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {new Date(membership.enrolledAt).toLocaleDateString('vi-VN')}
                      </td>
                      {canManage && (
                        <td className="px-5 py-4 text-right">
                          {membership.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => void handleRevoke(membership)}
                              disabled={revokingId === membership.id}
                              className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              {revokingId === membership.id ? 'Đang revoke...' : 'Revoke'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Dùng form để kích hoạt lại</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StudyLayout>
  );
}
