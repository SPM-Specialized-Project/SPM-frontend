import ChevronRight from '@/components/icons/arrow-right';
import Book from '@/components/icons/book';
import type { Book as BookType } from '@/types/book.type';

export function BookCard({ book, onDetails }: { book: BookType; onDetails: (book: BookType) => void }) {
  const availability = normalizeAvailability(book.availability);
  const availabilityStyles = {
    available: 'bg-green-100 text-green-800',
    borrowed: 'bg-red-100 text-red-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    unknown: 'bg-gray-100 text-gray-800',
  } as const;
  const availabilityLabels = {
    available: 'Có sẵn',
    borrowed: 'Đã mượn',
    reserved: 'Đang giữ',
    unknown: 'Không rõ',
  } as const;

  return (
    <div className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ boxShadow: '4px 4px 0 0 rgba(249,186,8,1)' }}>
      <div className="relative flex h-64 items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        {book.coverImage ? <img src={book.coverImage} alt={book.title} className="h-full w-auto object-contain shadow-lg" /> : <Book className="size-32 text-blue-300" />}
        <div className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${availabilityStyles[availability]}`}>
          {availabilityLabels[availability]}
        </div>
      </div>
      <div className="flex flex-1 flex-col bg-white p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-800 group-hover:text-[#0329E9]">{book.title}</h3>
        <p className="mb-1 text-sm text-gray-600"><span className="font-semibold">Tác giả:</span> {book.author || 'Không rõ'}</p>
        {book.publisher && <p className="mb-1 text-sm text-gray-600"><span className="font-semibold">NXB:</span> {book.publisher}</p>}
        {book.year && <p className="mb-2 text-sm text-gray-600"><span className="font-semibold">Năm:</span> {book.year}</p>}
        <div className="mt-auto flex justify-around border-t border-gray-200 pt-3 text-center">
          {book.location && <BookStat label="Vị trí" value={book.location} />}
          {book.callNumber && <BookStat label="Mã số" value={book.callNumber} />}
        </div>
        <button aria-label="Xem chi tiết sách" onClick={() => onDetails(book)} title="Xem chi tiết sách" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#0329E9] py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
          Chi tiết <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function BookStat({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col items-center"><span className="text-xs text-gray-500">{label}</span><span className="text-sm font-bold text-gray-800">{value}</span></div>;
}

function normalizeAvailability(value?: string) {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'checked-out' || normalized === 'borrowed') return 'borrowed' as const;
  if (normalized === 'on-hold' || normalized === 'reserved') return 'reserved' as const;
  if (normalized === 'available') return 'available' as const;
  return 'unknown' as const;
}
