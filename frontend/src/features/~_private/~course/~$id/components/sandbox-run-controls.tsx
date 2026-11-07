export function SandboxRunControls({ mode, stdin, disabled, onMode, onStdin }: {
  mode: 'STDIN' | 'PUBLIC_TESTS';
  stdin: string;
  disabled: boolean;
  onMode: (mode: 'STDIN' | 'PUBLIC_TESTS') => void;
  onStdin: (stdin: string) => void;
}) {
  return (
    <div className="space-y-2 border-y border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-slate-700">
          Run mode
          <select aria-label="Run mode" value={mode} disabled={disabled}
            onChange={(event) => onMode(event.target.value as 'STDIN' | 'PUBLIC_TESTS')}
            className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs">
            <option value="PUBLIC_TESTS">Public tests</option>
            <option value="STDIN">Custom input (stdin)</option>
          </select>
        </label>
        <span className="text-xs text-slate-500">Run chỉ kiểm tra code; không tính điểm.</span>
      </div>
      {mode === 'STDIN' && (
        <label className="block text-xs font-semibold text-slate-700">
          Custom input (stdin)
          <textarea aria-label="Custom input (stdin)" value={stdin} disabled={disabled}
            maxLength={64000} onChange={(event) => onStdin(event.target.value)} rows={3}
            placeholder="Nhập dữ liệu được truyền vào stdin..."
            className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs font-normal text-slate-900" />
        </label>
      )}
    </div>
  );
}
