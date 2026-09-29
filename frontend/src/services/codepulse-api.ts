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
  ownerEmail: string;
  sourceCode: string;
  updatedAt?: string;
};

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

export const codePulseApi = {
  listTerms: (courseId = '13') => request(() => apiClient.get<{ items: CodePulseTerm[] }>('/codepulse/terms', { params: { courseId } })),
  createTerm: (item: Omit<CodePulseTerm, 'id' | 'status'>) => request(() =>
    apiClient.post<{ item: CodePulseTerm }>('/codepulse/terms', item)),
  updateTerm: (id: string, patch: Partial<CodePulseTerm>) => request(() =>
    apiClient.patch<{ item: CodePulseTerm }>(`/codepulse/terms/${encodeURIComponent(id)}`, { patch })),
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
  getWorkspace: (id: string) => request(() =>
    apiClient.get<{ item: CodePulseWorkspace }>(`/codepulse/workspaces/${encodeURIComponent(id)}`)),
  updateWorkspace: (id: string, sourceCode: string) => request(() =>
    apiClient.patch<{ item: CodePulseWorkspace }>(
      `/codepulse/workspaces/${encodeURIComponent(id)}`, { sourceCode })),
  revokeMembership: (id: string) => request(() =>
    apiClient.patch<{ item: { id: string; status: 'revoked' } }>(
      `/codepulse/memberships/${encodeURIComponent(id)}`, { status: 'revoked' })),
};
