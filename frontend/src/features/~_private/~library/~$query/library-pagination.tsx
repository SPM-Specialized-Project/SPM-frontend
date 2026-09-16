import ChevronLeft from '@/components/icons/arrow-left';
import ChevronRight from '@/components/icons/arrow-right';
import ChevronsLeft from '@/components/icons/double-chevron';
import ChevronsRight from '@/components/icons/double-chevron';

export function LibraryPagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <nav className="flex items-center justify-center gap-1 text-sm">
      <PageButton label="Trang đầu tiên" disabled={currentPage === 1} onClick={() => onPageChange(1)}><ChevronsLeft className="size-4" /></PageButton>
      <PageButton label="Trang trước" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}><ChevronLeft className="size-4" /></PageButton>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((page) => (
        <button key={page} onClick={() => onPageChange(page)} className={currentPage === page ? 'page-number-active' : 'page-number'}>{page}</button>
      ))}
      <PageButton label="Trang tiếp theo" disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}><ChevronRight className="size-4" /></PageButton>
      <PageButton label="Trang cuối" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}><ChevronsRight className="size-4" /></PageButton>
    </nav>
  );
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  const className = disabled ? 'pagination-btn-disabled' : 'pagination-btn';
  return <button aria-label={label} title={label} className={className} disabled={disabled} onClick={onClick}>{children}</button>;
}
