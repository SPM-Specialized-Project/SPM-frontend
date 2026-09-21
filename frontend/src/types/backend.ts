export type UserRole = 'student' | 'tutor' | 'coordinator' | 'chairman';

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
