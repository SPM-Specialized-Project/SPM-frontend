import { Link } from "@tanstack/react-router";

export function FormActions() {
  return (
    <div className="mt-4 flex justify-end gap-4">
      <Link
        to="/schedule"
        className="rounded-md border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
      >
        Hủy bỏ
      </Link>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Tạo buổi học
      </button>
    </div>
  );
}

// --- COMPONENT HELPER ---

/**
 * Component Input có nhãn
 */
