import { Link } from "@tanstack/react-router";

export function FormActions({ onSave, onDelete }: { onSave?: () => void; onDelete?: () => void }) {
  return (
    <div className="mt-4 flex justify-between gap-4">
      {onDelete && (
        <button
          onClick={onDelete}
          type="button"
          className="rounded-md bg-red-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Xóa buổi học
        </button>
      )}
      <div className="ml-auto flex gap-4">
        <Link
          to="/schedule"
          className="rounded-md border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        >
          Hủy bỏ
        </Link>
        <button
          onClick={onSave}
          type="button"
          className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Lưu
        </button>
      </div>
    </div>
  )
}

// --- COMPONENT SÓNG SVG (TỪ BẠN) ---
