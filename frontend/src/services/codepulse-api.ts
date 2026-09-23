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
  getWorkspace: (id: string) => request(() =>
    apiClient.get<{ item: CodePulseWorkspace }>(`/codepulse/workspaces/${encodeURIComponent(id)}`)),
  updateWorkspace: (id: string, sourceCode: string) => request(() =>
    apiClient.patch<{ item: CodePulseWorkspace }>(
      `/codepulse/workspaces/${encodeURIComponent(id)}`, { sourceCode })),
  revokeMembership: (id: string) => request(() =>
    apiClient.patch<{ item: { id: string; status: 'revoked' } }>(
      `/codepulse/memberships/${encodeURIComponent(id)}`, { status: 'revoked' })),
};
