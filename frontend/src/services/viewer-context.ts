import type { User } from '@/types';
import type { UserRole } from '@/types/backend';
import type { SubmissionViewerRole } from '@/types/submission';

export const getCurrentViewerContext = (): {
  viewerRole: UserRole;
  viewerEmail?: string;
} => {
  if (typeof window === 'undefined') return { viewerRole: 'coordinator' };

  const rawUserStore = window.localStorage.getItem('userStore');
  const rawRole = window.localStorage.getItem('role');
  let user: Partial<User> | undefined;

  try {
    user = rawUserStore
      ? (JSON.parse(rawUserStore) as { state?: { user?: Partial<User> } }).state?.user
      : undefined;
  } catch {
    user = undefined;
  }

  const storedRole: UserRole | undefined =
    rawRole === 'student' ||
    rawRole === 'tutor' ||
    rawRole === 'coordinator' ||
    rawRole === 'chairman'
      ? rawRole
      : undefined;
  const profileRole: UserRole | undefined = user?.isStudent
    ? 'student'
    : user?.isTutor
      ? 'tutor'
      : user?.isChairman
        ? 'chairman'
        : user?.isCoordinator
          ? 'coordinator'
          : undefined;

  // The persisted user profile is updated by login and is more trustworthy
  // than a stale role string left by a previous session.
  const viewerRole: UserRole = profileRole ?? storedRole ?? 'coordinator';

  return { viewerRole, viewerEmail: user?.email };
};

export const getCurrentSubmissionViewerContext = (): {
  viewerRole: SubmissionViewerRole;
  studentEmail?: string;
} => {
  const context = getCurrentViewerContext();
  return {
    viewerRole: context.viewerRole === 'student' ? 'student' : 'tutor',
    studentEmail: context.viewerEmail,
  };
};
