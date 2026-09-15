export type SubmissionStatus = 'not-submitted' | 'submitted' | 'graded';

export type SubmissionViewerRole = 'student' | 'tutor';

export type SubmissionStudent = {
  id: string;
  memberId: number;
  name: string;
  email: string;
};

/** Canonical record stored by the submission driver. */
export type SubmissionRecord = {
  id: string;
  courseId: string;
  assignmentId: string;
  student: SubmissionStudent;
  status: SubmissionStatus;
  score: number | null;
  feedback: string;
  submittedAt: string | null;
  fileUrl: string | null;
};

export type SubmissionPermissions = {
  canSubmit: boolean;
  canEdit: boolean;
  canReview: boolean;
};

export type SubmissionAssignment = {
  id: string;
  title: string;
  dueDate: string;
};

/** Record returned to a screen after role-based permissions are applied. */
export type SubmissionView = SubmissionRecord & {
  assignment: SubmissionAssignment;
  permissions: SubmissionPermissions;
};

