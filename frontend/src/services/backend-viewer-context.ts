import type { User } from '@/types';
import type { UserRole } from '@/types/backend';

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

  const viewerRole: UserRole =
    rawRole === 'student' ||
    rawRole === 'tutor' ||
    rawRole === 'coordinator' ||
    rawRole === 'chairman'
      ? rawRole
      : user?.isStudent
        ? 'student'
        : user?.isTutor
          ? 'tutor'
          : user?.isChairman
            ? 'chairman'
            : 'coordinator';

  return { viewerRole, viewerEmail: user?.email };
};
