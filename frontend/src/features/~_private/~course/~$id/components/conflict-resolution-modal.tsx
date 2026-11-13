import { useState } from 'react';

type ConflictResolutionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  localDraft: string;
  serverSourceCode: string;
  serverRevision: number;
  serverUpdatedAt?: string;
  onKeepServer: () => void;
  onOverwriteLocal: () => void;
};

export function ConflictResolutionModal({
  isOpen,
  onClose,
  localDraft,
  serverSourceCode,
  serverRevision,
  serverUpdatedAt,
  onKeepServer,
  onOverwriteLocal,
}: ConflictResolutionModalProps) {
  const [activeTab, setActiveTab] = useState<'LOCAL' | 'SERVER'>('LOCAL');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between rounded-t-2xl border-b border-amber-200 bg-amber-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-white shadow-sm">
              ⚠️
            </span>
            <div>
              <h3
                id="conflict-dialog-title"
                className="text-lg font-bold text-amber-950"
              >
                Phát hiện xung đột phiên bản (Multi-tab Revision Conflict)
              </h3>
              <p className="mt-0.5 text-xs text-amber-800">
                Mã nguồn trên máy chủ đã được lưu ở một tab hoặc phiên làm việc khác (Bản lưu #{serverRevision}
                {serverUpdatedAt ? ` lúc ${new Date(serverUpdatedAt).toLocaleTimeString()}` : ''}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-amber-800 hover:bg-amber-200/50"
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-slate-50 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('LOCAL')}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'LOCAL'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            📝 Bản nháp cục bộ của bạn (Local Draft)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SERVER')}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'SERVER'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            ☁️ Bản lưu trên máy chủ (Server Rev #{serverRevision})
          </button>
        </div>

        {/* Code View Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {activeTab === 'LOCAL'
                ? 'Nội dung code bạn đang gõ trên trình duyệt hiện tại'
                : 'Nội dung code đang có trên máy chủ'}
            </span>
            {activeTab === 'LOCAL' && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                {copied ? '✅ Đã sao chép!' : '📋 Sao chép code của tôi'}
              </button>
            )}
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-100">
            <code>{activeTab === 'LOCAL' ? localDraft : serverSourceCode}</code>
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-xs text-gray-500">
            Gợi ý: Nếu chưa chắc chắn, hãy bấm <strong>Sao chép code</strong> rồi chọn <strong>Giữ bản máy chủ</strong>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
            >
              Xem lại sau
            </button>
            <button
              type="button"
              onClick={onKeepServer}
              className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              ☁️ Giữ bản trên máy chủ
            </button>
            <button
              type="button"
              onClick={onOverwriteLocal}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              ⚠️ Ghi đè bằng bản của tôi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
