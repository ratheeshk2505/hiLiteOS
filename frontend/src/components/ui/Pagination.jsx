export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, total, pageSize } = meta;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 border-t border-line px-5 py-3 text-sm text-slate sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-1">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
