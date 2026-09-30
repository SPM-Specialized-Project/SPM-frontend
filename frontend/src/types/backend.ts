export type UserRole = 'student' | 'coordinator' | 'chairman' | 'lecturer' | 'admin';

/**
 * Converts persisted or legacy role values to the canonical role contract.
 * `tutor` is accepted only at this compatibility boundary and is never
 * returned as a UserRole.
 */
export const normalizeUserRole = (value: unknown): UserRole | undefined => {
  const rawRole = String(value ?? '').trim().toLowerCase();
  const canonicalRole = rawRole === 'tutor' ? 'lecturer' : rawRole;
  return ['student', 'coordinator', 'chairman', 'lecturer', 'admin'].includes(canonicalRole)
    ? canonicalRole as UserRole
    : undefined;
};

export type ResourcePermissions = {
  canView: boolean;
  canEdit: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
};

export type ResourceMeta = {
  source: 'node-backend';
  updatedAt: string;
  viewerRole: UserRole;
  ownerRole?: string;
  ownerEmail?: string;
  ownershipLocked?: boolean;
};

export type BackendResource<T> = T & {
  permissions: ResourcePermissions;
  meta: ResourceMeta;
};

export type BackendListResponse<T> = {
  items: Array<BackendResource<T>>;
  viewerRole: UserRole;
  permissions: ResourcePermissions;
  meta: {
    source: 'node-backend';
    updatedAt: string;
    total: number;
  };
};
