import type { User } from '@/types';
import { normalizeUserRole, type UserRole } from '@/types/backend';
import type { SubmissionViewerRole } from '@/types/submission';

export const getCurrentViewerContext = (): {
  viewerRole: UserRole;
  viewerEmail?: string;
} => {
  if (typeof window === 'undefined') return { viewerRole: 'coordinator' };

  const rawUserStore = window.localStorage.getItem('userStore');
  const rawRole = window.localStorage.getItem('role');
  let user: (Partial<User> & { isTutor?: boolean }) | undefined;

  try {
    user = rawUserStore
      ? (JSON.parse(rawUserStore) as {
          state?: { user?: Partial<User> & { isTutor?: boolean; role?: unknown } };
        }).state?.user
      : undefined;
  } catch {
    user = undefined;
  }

  const storedRole: UserRole | undefined = normalizeUserRole(rawRole);
  const profileRole: UserRole | undefined = normalizeUserRole(user?.role) ?? (user?.isStudent
    ? 'student'
    : user?.isLecturer || user?.isTutor
      ? 'lecturer'
      : user?.isChairman
        ? 'chairman'
        : user?.isCoordinator
          ? 'coordinator'
          : undefined);

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
    viewerRole: context.viewerRole === 'student' ? 'student' : 'lecturer',
    studentEmail: context.viewerRole === 'student' ? context.viewerEmail : undefined,
  };
};
