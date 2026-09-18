import { apiClient, request } from './api-client';

export type CodePulseClassroom = {
  id: string;
  term: string;
  name: string;
  lecturerEmail: string;
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
