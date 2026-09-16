import { AdminRequestEditor } from './admin-request-editor';
import type { AdminRequestCardProps } from './admin-request-types';
import { AdminRequestView } from './admin-request-view';

export function AdminRequestCard({ request, editing, onEdit, ...editorProps }: AdminRequestCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-custom-yellow">
      {editing ? <AdminRequestEditor {...editorProps} /> : <AdminRequestView request={request} onEdit={onEdit} />}
    </div>
  );
}
