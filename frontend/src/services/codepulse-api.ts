import { apiClient, request } from './api-client';

export type CodePulseClassroom = {
  id: string;
  courseId: string;
  termId: string;
  term: CodePulseTerm;
  name: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  lecturerEmail: string;
};

export type CodePulseTerm = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  resetDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
};

export type CodePulseWorkspace = {
  id: string;
  classroomId: string;
  assignmentId?: string;
  ownerEmail: string;
  sourceCode: string;
  updatedAt?: string;
};

export type CodePulseRuntime = 'PYTHON' | 'CPP';
export type CodePulseAssignmentStatus = 'DRAFT' | 'PUBLISHED';
export type CodePulseVerificationStatus = 'UNVERIFIED' | 'VERIFIED';
export type CodePulseTestCase = {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
  verified: boolean;
};

export type CodePulseAssignment = {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  cpuTimeLimitMs: number | null;
  memoryLimitMb: number | null;
  runtime: CodePulseRuntime | '';
  referenceSolution: string;
  verificationStatus: CodePulseVerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  status: CodePulseAssignmentStatus;
  testCases: CodePulseTestCase[];
  rawRunnerTrace?: string;
};

export type CodePulseAssignmentInput = Omit<
  CodePulseAssignment,
  'id' | 'classroomId' | 'status' | 'verificationStatus' | 'verifiedAt' | 'verifiedBy'
> & { id?: string };

export type CodePulseProblem = {
  id: string;
  classroomId: string;
  title: string;
  testCases: Array<{ id: string; input: string; expectedOutput: string; hidden: boolean }>;
  rawRunnerTrace?: string;
};

export type CodePulseAssignmentVersion = {
  id: string;
  assignmentId: string;
  classroomId: string;
  version: number;
  title: string;
  status: 'PUBLISHED';
  publishedAt: string;
};

export type CodePulseLabStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export type CodePulseLabAssignment = {
  id: string;
  assignmentId: string;
  assignmentVersionId: string;
  version: number;
  title: string;
  order: number;
  mandatory: boolean;
  practiceStartAt: string;
  practiceEndAt: string;
  workspaceId?: string;
};

export type CodePulseLab = {
  id: string;
  classroomId: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  status: CodePulseLabStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignments: CodePulseLabAssignment[];
};

export type CreateCodePulseLabInput = {
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  assignments: Array<{
    assignmentVersionId: string;
    mandatory: boolean;
    practiceStartAt: string;
    practiceEndAt: string;
  }>;
};

export type CodePulseRunResult = {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stderr: string;
  status: 'PASSED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'OUTPUT_LIMIT' | 'COMPILE_ERROR';
  passed: boolean;
  durationMs: number | null;
};

export type CodePulseRunSummary = {
  assignmentId: string;
  runtime: CodePulseRuntime;
  results: CodePulseRunResult[];
  passedCount: number;
  totalCount: number;
};

export const codePulseApi = {
  listTerms: (courseId = '13') => request(() => apiClient.get<{ items: CodePulseTerm[] }>('/codepulse/terms', { params: { courseId } })),
  createTerm: (item: Omit<CodePulseTerm, 'id' | 'status'>) => request(() =>
    apiClient.post<{ item: CodePulseTerm }>('/codepulse/terms', item)),
  updateTerm: (id: string, patch: Partial<CodePulseTerm>) => request(() =>
    apiClient.patch<{ item: CodePulseTerm }>(`/codepulse/terms/${encodeURIComponent(id)}`, { patch })),
  deleteTerm: (id: string) => request(() =>
    apiClient.delete<{ deleted: boolean }>(`/codepulse/terms/${encodeURIComponent(id)}`)),
  listClassrooms: (courseId = '13') => request(() =>
    apiClient.get<{ items: CodePulseClassroom[] }>('/codepulse/classrooms', { params: { courseId } })),
  createClassroom: (item: { name: string; description: string; termId: string; courseId: string; lecturerEmail?: string }) => request(() =>
    apiClient.post<{ item: CodePulseClassroom }>('/codepulse/classrooms', item)),
  updateClassroom: (id: string, patch: Partial<Pick<CodePulseClassroom, 'name' | 'description' | 'termId' | 'status' | 'lecturerEmail'>>) => request(() =>
    apiClient.patch<{ item: CodePulseClassroom }>(`/codepulse/classrooms/${encodeURIComponent(id)}`, { patch })),
  deleteClassroom: (id: string) => request(() =>
    apiClient.delete<{ deleted: boolean }>(`/codepulse/classrooms/${encodeURIComponent(id)}`)),
  getClassroom: (id: string) => request(() =>
    apiClient.get<{ item: CodePulseClassroom }>(`/codepulse/classrooms/${encodeURIComponent(id)}`)),
  getDashboard: (id: string) => request(() =>
    apiClient.get<{ classroom: CodePulseClassroom; activeMembers: number }>(
      `/codepulse/classrooms/${encodeURIComponent(id)}/dashboard`)),
  getProblem: (classroomId: string, problemId: string) => request(() =>
    apiClient.get<{ item: CodePulseProblem }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/problems/${encodeURIComponent(problemId)}`)),
  listPublishedAssignmentVersions: (classroomId: string) => request(() =>
    apiClient.get<{ items: CodePulseAssignmentVersion[] }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignment-versions`)),
  listLabs: (classroomId: string) => request(() =>
    apiClient.get<{ items: CodePulseLab[] }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/labs`)),
  createLab: (classroomId: string, item: CreateCodePulseLabInput) => request(() =>
    apiClient.post<{ item: CodePulseLab }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/labs`, item)),
  updateLabStatus: (classroomId: string, labId: string, status: CodePulseLabStatus) => request(() =>
    apiClient.patch<{ item: CodePulseLab }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/labs/${encodeURIComponent(labId)}`,
      { status })),
  listAssignments: (classroomId: string, view?: 'student') => request(() =>
    apiClient.get<{ items: CodePulseAssignment[] }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments`,
      { params: view ? { view } : undefined })),
  runAssignment: (classroomId: string, assignmentId: string, sourceCode: string, testCaseIds?: string[]) => request(() =>
    apiClient.post<{ item: CodePulseRunSummary }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(assignmentId)}/run`,
      { sourceCode, ...(testCaseIds ? { testCaseIds } : {}) })),
  createAssignment: (classroomId: string, item: Partial<CodePulseAssignmentInput>) => request(() =>
    apiClient.post<{ item: CodePulseAssignment }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments`, item)),
  updateAssignment: (classroomId: string, assignmentId: string, patch: Partial<CodePulseAssignmentInput>) => request(() =>
    apiClient.patch<{ item: CodePulseAssignment }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(assignmentId)}`,
      { patch })),
  verifyAssignment: (classroomId: string, assignmentId: string, referenceSolution?: string) => request(() =>
    apiClient.post<{ item: CodePulseAssignment; verification: { status: CodePulseVerificationStatus; testCaseCount: number } }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(assignmentId)}/verify`,
      referenceSolution === undefined ? {} : { referenceSolution })),
  publishAssignment: (classroomId: string, assignmentId: string) => request(() =>
    apiClient.post<{ item: CodePulseAssignment }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(assignmentId)}/publish`)),
  deleteAssignment: (classroomId: string, assignmentId: string) => request(() =>
    apiClient.delete<{ deleted: boolean }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(assignmentId)}`)),
  getWorkspace: (id: string) => request(() =>
    apiClient.get<{ item: CodePulseWorkspace }>(`/codepulse/workspaces/${encodeURIComponent(id)}`)),
  getStudentWorkspace: (classroomId: string, assignmentId: string) => request(() =>
    apiClient.get<{ item: CodePulseWorkspace }>(
      `/codepulse/classrooms/${encodeURIComponent(classroomId)}/workspace`,
      { params: { assignmentId } })),
  updateWorkspace: (id: string, sourceCode: string) => request(() =>
    apiClient.patch<{ item: CodePulseWorkspace }>(
      `/codepulse/workspaces/${encodeURIComponent(id)}`, { sourceCode })),
  revokeMembership: (id: string) => request(() =>
    apiClient.patch<{ item: { id: string; status: 'revoked' } }>(
      `/codepulse/memberships/${encodeURIComponent(id)}`, { status: 'revoked' })),
};
