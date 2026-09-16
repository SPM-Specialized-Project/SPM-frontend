import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import boxSvg from '@/assets/box.svg';
import ChevronLeft from '@/components/icons/arrow-left';
import Search from '@/components/icons/search';
import StudyLayout from '@/components/study-layout';
import type { Book as BookType } from '@/types/book.type';
import { searchVNULibrary } from '@/utils/vnu-library';

import { BookCard } from './book-card';
import { LibraryPagination } from './library-pagination';
import { BookDetailsModal } from './lib-popup';

export const Route = createFileRoute('/_private/library/$query/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { query } = Route.useParams();
  const [popupDetails, setPopupDetails] = useState<BookType | null>(null);
  const [books, setBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const fetchBooks = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const response = await searchVNULibrary(query);
      setBooks(response.books);
      setCurrentPage(1);
    } catch (fetchError) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      console.error('Error fetching books:', fetchError);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchBooks();
  }, [fetchBooks]);

  const totalPages = Math.max(1, Math.ceil(books.length / itemsPerPage));
  const displayedBooks = books.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNewSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchInput.trim()) return;
    navigate({ to: '/library/$query', params: { query: searchInput.trim() } });
  };

  return (
    <StudyLayout>
      {popupDetails && <BookDetailsModal book={popupDetails} onClose={() => setPopupDetails(null)} />}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate({ to: '/library' })} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50" aria-label="Quay lại trang tìm kiếm">
          <ChevronLeft className="size-4" /> Quay lại
        </button>
        <h1 className="text-4xl font-bold text-gray-800" style={{ fontFamily: 'Archivo' }}>Kết quả tìm kiếm</h1>
      </div>

      <div className="rounded-lg border border-gray-500 bg-white p-6 shadow-sm" style={{ fontFamily: 'Archivo' }}>
        <h2 className="mb-4 text-xl font-semibold text-gray-700">Tìm kiếm: "{query}"</h2>
        <form onSubmit={handleNewSearch} className="mb-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search className="size-5" /></span>
            <input type="text" placeholder="Nhập tên sách để tìm kiếm..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </form>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">Hiển thị {displayedBooks.length} / {books.length} kết quả</p>
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">Số sách mỗi trang:</label>
            <select id="itemsPerPage" value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1); }} className="rounded-lg border border-gray-300 bg-white py-1 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={8}>8</option><option value={12}>12</option><option value={16}>16</option>
            </select>
          </div>
        </div>

        {loading && <LoadingState />}
        {error && !loading && <ErrorState message={error} onRetry={() => void fetchBooks()} />}
        {!loading && !error && books.length === 0 && <EmptyState query={query} />}
        {!loading && !error && books.length > 0 && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {displayedBooks.map((book) => <BookCard key={book.id} book={book} onDetails={setPopupDetails} />)}
            </div>
            <LibraryPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>
    </StudyLayout>
  );
}

function LoadingState() {
  return <div className="flex flex-col items-center justify-center py-16"><div className="size-16 animate-spin rounded-full border-4 border-gray-200 border-t-[#0329E9]" /><p className="mt-4 text-gray-600">Đang tìm kiếm...</p></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex flex-col items-center justify-center py-16"><div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-100"><span className="text-3xl text-red-600">×</span></div><p className="text-gray-600">{message}</p><button onClick={onRetry} className="mt-4 rounded-lg bg-[#0329E9] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Thử lại</button></div>;
}

function EmptyState({ query }: { query: string }) {
  return <div className="flex flex-col items-center justify-center py-16"><img src={boxSvg} alt="Không tìm thấy sách" className="mb-6 size-28 opacity-90" /><p className="text-gray-500">Không tìm thấy sách nào với từ khóa "{query}"</p></div>;
}
