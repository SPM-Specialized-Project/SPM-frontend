import { useEffect, useMemo, useState } from 'react';

import { pastRegistrationStore } from '@/components/data/~mock-register';
import { tutorRegistrationStore } from '@/components/data/~mock-tutor-register';
import { api } from '@/services/api-client';
import type { MatchingAssignment, MatchingRecommendation } from '@/services/api-types';
import { useDataStore } from '@/services/use-data-store';

const reasonLabels: Record<string, string> = {
  subject_mismatch: 'Không trùng môn học',
  subject_unavailable: 'Thiếu dữ liệu môn học',
  language_mismatch: 'Không trùng ngôn ngữ',
  language_unavailable: 'Thiếu dữ liệu ngôn ngữ',
  mode_mismatch: 'Không trùng hình thức',
  mode_unavailable: 'Thiếu dữ liệu hình thức',
  unknown_session_mode: 'Hình thức chưa được chuẩn hóa',
  onsite_location_unavailable_or_mismatch: 'Thiếu địa điểm trực tiếp chung',
  no_shared_delivery_mode: 'Không có hình thức học chung',
  no_availability_overlap: 'Không trùng khung giờ đã khai báo',
  availability_unverified: 'Chưa xác minh được khung giờ tutor',
  invalid_availability_window: 'Khung giờ không hợp lệ',
  capacity_exhausted: 'Tutor đã đủ sức chứa',
  capacity_not_configured: 'Tutor chưa khai báo sức chứa',
  tutor_not_approved: 'Tutor chưa được duyệt',
};

function formatReason(reason: string): string {
  return reasonLabels[reason] ?? reason.replaceAll('_', ' ');
}

function featureLabel(key: string): string {
  if (key === 'semanticSimilarity') return 'Cosine thô';
  if (key === 'semanticRankingScore') return 'Cosine dùng để xếp hạng';
  if (key === 'topicFit') return 'Trùng chủ đề trích xuất';
  if (key === 'teachingStyleFit') return 'Trùng kiểu dạy được nêu';
  return key;
}

export function MatchingRecommendationsPanel() {
  const students = useDataStore(pastRegistrationStore);
  const tutors = useDataStore(tutorRegistrationStore);
  const [studentRegistrationId, setStudentRegistrationId] = useState('');
  const [model, setModel] = useState<'TFIDF' | 'BGE_M3'>('TFIDF');
  const [recommendation, setRecommendation] = useState<MatchingRecommendation | null>(null);
  const [rejectedTutorIds, setRejectedTutorIds] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busyTutorId, setBusyTutorId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assignments, setAssignments] = useState<MatchingAssignment[]>([]);

  const selectableStudents = useMemo(
    () => students.filter((student) => !['Declined', 'Closed', 'Cancelled', 'Canceled'].includes(student.status)),
    [students],
  );
  const tutorById = useMemo(() => new Map(tutors.map((tutor) => [tutor.id, tutor])), [tutors]);
  const visibleCandidates = recommendation?.candidates.filter((candidate) => !rejectedTutorIds.includes(candidate.tutorRegistrationId)) ?? [];

  useEffect(() => {
    let current = true;
    void api.getMatchingAssignments().then((response) => {
      if (current) setAssignments(response.data.items.filter((item) => item.status === 'ACTIVE'));
    }).catch(() => {
      if (current) setAssignments([]);
    });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!studentRegistrationId) {
      setRecommendation(null);
      setRejectedTutorIds([]);
      return;
    }
    setError('');
    let current = true;
    void api.getMatchingRecommendations(studentRegistrationId).then((response) => {
      if (!current) return;
      const latest = [...response.data.items].sort((left, right) =>
        (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))[0] ?? null;
      setRecommendation(latest);
      setRejectedTutorIds(latest?.decidedTutorRegistrationIds ?? []);
    }).catch((cause) => {
      if (current) setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử gợi ý.');
    });
    return () => { current = false; };
  }, [studentRegistrationId]);

  const generate = async () => {
    if (!studentRegistrationId) {
      setError('Chọn một yêu cầu học trước khi tạo gợi ý.');
      return;
    }
    setIsGenerating(true);
    setError('');
    setNotice('');
    setRejectedTutorIds([]);
    try {
      const response = await api.createMatchingRecommendation({ studentRegistrationId, model, topK: 10 });
      setRecommendation(response.data.item);
      setRejectedTutorIds([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được gợi ý ghép cặp.');
      setRecommendation(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const decide = async (tutorRegistrationId: string, decision: 'ACCEPT' | 'REJECT') => {
    if (!recommendation) return;
    if (decision === 'REJECT' && !rejectionReason.trim()) {
      setError('Nhập lý do khi bỏ qua một tutor để lưu được phản hồi điều phối.');
      return;
    }
    setBusyTutorId(tutorRegistrationId);
    setError('');
    try {
      await api.decideMatchingRecommendation(recommendation.id, {
        tutorRegistrationId,
        decision,
        ...(decision === 'REJECT' ? { reason: rejectionReason.trim() } : {}),
      });
      if (decision === 'ACCEPT') {
        setRecommendation({ ...recommendation, status: 'ACCEPTED' });
        const assignmentResponse = await api.getMatchingAssignments();
        setAssignments(assignmentResponse.data.items.filter((item) => item.status === 'ACTIVE'));
        setNotice('Đã lưu quyết định và tạo phân công.');
      } else {
        setRejectedTutorIds((current) => [...current, tutorRegistrationId]);
        setRejectionReason('');
        setNotice('Đã lưu lý do bỏ qua; có thể xem tutor tiếp theo trong cùng danh sách.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được quyết định.');
    } finally {
      setBusyTutorId('');
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-blue-200 bg-white p-5 shadow-sm" aria-labelledby="matching-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="matching-title" className="text-lg font-semibold text-gray-900">Gợi ý ghép student – tutor</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Backend loại cặp không đủ điều kiện trước khi tính tương đồng. Điểm chỉ dùng để xếp hạng, không phải xác suất; điều phối viên quyết định phân công.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Điều phối viên duyệt</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="text-sm font-medium text-gray-700">
          Yêu cầu học
          <select
            value={studentRegistrationId}
            onChange={(event) => setStudentRegistrationId(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2.5"
          >
            <option value="">Chọn student…</option>
            {selectableStudents.map((student) => (
              <option key={student.id} value={student.id}>{student.Name} · {student.subjects?.[0]?.name ?? 'Chưa có môn'}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Mô hình văn bản
          <select
            value={model}
            onChange={(event) => setModel(event.target.value as 'TFIDF' | 'BGE_M3')}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2.5"
          >
            <option value="TFIDF">TF-IDF + cosine (mặc định)</option>
            <option value="BGE_M3">BGE-M3 + cosine (dịch vụ local)</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={isGenerating}
          className="self-end rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {isGenerating ? 'Đang tính…' : 'Tạo gợi ý'}
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-green-700">{notice}</p>}

      {assignments.length > 0 && (
        <div className="mt-5 rounded-lg bg-green-50 p-3">
          <h3 className="text-sm font-semibold text-green-900">Phân công đang hoạt động ({assignments.length})</h3>
          <ul className="mt-2 space-y-1 text-sm text-green-900">
            {assignments.map((assignment) => (
              <li key={assignment.id}>{assignment.studentName ?? 'Student'} → {assignment.tutorName ?? 'Tutor'} · {new Date(assignment.createdAt).toLocaleDateString('vi-VN')}</li>
            ))}
          </ul>
        </div>
      )}

      {recommendation && (
        <div className="mt-5 border-t border-gray-200 pt-4">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-700">
            <p>
              Mô hình: <strong>{recommendation.modelVersion}</strong> · đủ điều kiện: <strong>{recommendation.counts.eligible}</strong> / {recommendation.counts.evaluated}
            </p>
            <p>{recommendation.status === 'ACCEPTED' ? 'Đã phân công' : recommendation.status === 'REJECTED' ? 'Đã xem hết gợi ý' : 'Chờ điều phối viên quyết định'}</p>
          </div>
          <p className="mt-1 text-xs text-gray-500">Điểm xếp hạng dùng trung bình đều các feature hiện có. Cosine không phải xác suất; thiếu feature thì feature đó được bỏ qua.</p>
          {recommendation.reviewWarnings.length > 0 && (
            <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
              Cần điều phối viên xem lại yêu cầu lịch: chưa có dải giờ cụ thể nên hệ thống không dùng câu lịch tự do làm điều kiện loại.
            </p>
          )}

          {visibleCandidates.length === 0 ? (
            <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
              {recommendation.candidates.length === 0
                ? 'Không có tutor đủ điều kiện. Kiểm tra trạng thái đã duyệt, dữ liệu môn/ngôn ngữ/hình thức, sức chứa và lịch đã xác nhận.'
                : recommendation.status === 'ACCEPTED' ? 'Phân công đã được lưu.' : 'Đã xem hết các tutor được gợi ý.'}
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {visibleCandidates.map((candidate, index) => {
                const tutor = tutorById.get(candidate.tutorRegistrationId);
                const isBusy = busyTutorId === candidate.tutorRegistrationId;
                return (
                  <article key={candidate.tutorRegistrationId} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">#{index + 1} {tutor?.Name ?? 'Tutor'}</h3>
                        <p className="mt-1 text-sm text-gray-600">{tutor?.subjects?.map((item) => item.name).join(', ')}</p>
                      </div>
                      <p className="text-sm font-semibold text-blue-800">
                        {candidate.rankingScore === null ? 'Chưa đủ feature để xếp hạng' : `Điểm xếp hạng ${(candidate.rankingScore * 100).toFixed(1)}/100`}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {candidate.reasons.map((reason, reasonIndex) => (
                        <span key={`${reason.code}-${reasonIndex}`} className="rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-800">
                          {reason.code === 'SHARED_SUBJECT' ? `Cùng môn (${reason.value})`
                            : reason.code === 'SHARED_LANGUAGE' ? `Cùng ngôn ngữ (${reason.value})`
                                  : reason.code === 'SHARED_EXTRACTED_TOPICS' ? `Chủ đề được nhắc đến: ${(reason.value as string[]).join(', ')}${reason.evidence?.student.length ? ` · student: “${reason.evidence.student.join(', ')}”` : ''}${reason.evidence?.tutor.length ? ` · tutor: “${reason.evidence.tutor.join(', ')}”` : ''}`
                                    : reason.code === 'SHARED_EXTRACTED_TEACHING_STYLE' ? `Cùng kiểu dạy được nêu: ${(reason.value as string[]).join(', ')}${reason.evidence?.student.length ? ` · student: “${reason.evidence.student.join(', ')}”` : ''}${reason.evidence?.tutor.length ? ` · tutor: “${reason.evidence.tutor.join(', ')}”` : ''}`
                                    : reason.code === 'OVERLAPPING_AVAILABILITY' ? `Trùng lịch đã khai báo${Array.isArray(reason.value) && reason.value.length ? ` (${reason.value.join(', ')})` : ''}`
                                  : reason.code === 'SHARED_ONLINE_MODE' ? 'Cùng hình thức trực tuyến'
                                    : reason.code === 'SHARED_ONSITE_LOCATION' ? `Cùng địa điểm (${reason.value})` : reason.code}
                        </span>
                      ))}
                    </div>
                    <dl className="mt-3 grid gap-x-5 gap-y-1 text-xs text-gray-600 sm:grid-cols-3">
                      {Object.entries(candidate.features).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2"><dt>{featureLabel(key)}</dt><dd>{value.toFixed(3)}</dd></div>
                      ))}
                    </dl>
                    <label className="mt-3 block text-xs text-gray-600">
                      Lý do bỏ qua (bắt buộc khi từ chối)
                      <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button type="button" disabled={Boolean(busyTutorId) || recommendation.status !== 'PENDING_COORDINATOR_DECISION'} onClick={() => void decide(candidate.tutorRegistrationId, 'ACCEPT')} className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50">{isBusy ? 'Đang lưu…' : 'Chấp nhận & phân công'}</button>
                      <button type="button" disabled={Boolean(busyTutorId) || recommendation.status !== 'PENDING_COORDINATOR_DECISION'} onClick={() => void decide(candidate.tutorRegistrationId, 'REJECT')} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50">Bỏ qua tutor</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {recommendation.excluded.length > 0 && (
            <details className="mt-4 rounded-lg bg-gray-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">Lý do loại {recommendation.excluded.length} tutor</summary>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                {recommendation.excluded.slice(0, 10).map((item) => (
                  <li key={item.tutorRegistrationId}>
                    {tutorById.get(item.tutorRegistrationId)?.Name ?? item.tutorRegistrationId}: {item.reasons.map((reason) => formatReason(reason.reason)).join('; ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
