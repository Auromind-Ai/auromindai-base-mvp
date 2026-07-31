import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DataTablePagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-xs text-zinc-400 border-t border-white/5">
      <div>
        Showing <span className="font-semibold text-white">{startItem}</span> to{" "}
        <span className="font-semibold text-white">{endItem}</span> of{" "}
        <span className="font-semibold text-white">{totalItems}</span> entries
      </div>

      <div className="flex items-center gap-1.5 select-none">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1 px-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((page, idx, arr) => {
              const prevPage = arr[idx - 1];
              const showEllipsis = prevPage && page - prevPage > 1;

              return (
                <React.Fragment key={page}>
                  {showEllipsis && <span className="px-1 text-zinc-600">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#814ac8] text-white shadow-md shadow-purple-900/30"
                        : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
