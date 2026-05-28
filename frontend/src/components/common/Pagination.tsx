'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1" dir="rtl">
      {/* Next button (appears first in RTL) */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        التالي
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((p, idx) =>
        typeof p === 'string' ? (
          <span key={`dots-${idx}`} className="px-2 py-2 text-sm text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              p === page
                ? 'bg-navy text-white'
                : 'text-navy hover:bg-navy/10'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Previous button (appears last in RTL) */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        السابق
      </button>
    </div>
  );
}
