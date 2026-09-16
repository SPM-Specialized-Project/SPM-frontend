import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

export function DataFilters({
  searchName,
  searchSubject,
  onSearchNameChange,
  onSearchSubjectChange,
  onOpenFilter,
}: {
  searchName: string;
  searchSubject: string;
  onSearchNameChange: (value: string) => void;
  onSearchSubjectChange: (value: string) => void;
  onOpenFilter: () => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <SearchField value={searchName} onChange={onSearchNameChange} placeholder="Nhập tên để tìm kiếm..." />
      <SearchField value={searchSubject} onChange={onSearchSubjectChange} placeholder="Nhập mã môn học..." />
      <button onClick={onOpenFilter} className="shrink-0 rounded-lg border border-gray-300 bg-white p-2.5 shadow-sm hover:bg-gray-50">
        <FunnelIcon className="size-5 text-gray-600" />
      </button>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="size-5 text-gray-400" /></div>
      <input type="text" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border-gray-300 py-2 pl-10 shadow-sm" />
    </div>
  );
}
