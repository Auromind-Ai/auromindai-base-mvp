import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Filter, ArrowUpDown, Download, FileText, AlertCircle, Sparkles, Clock, MessageSquare, Gift, ChevronDown } from "lucide-react";
import DataTablePagination from "./DataTablePagination";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { MODAL_PAGE_SIZE } from "@/lib/constants/billingConstants";

function DefaultMobileCard({ row, columns }) {
  return (
    <div className="bg-[#12111c] border border-white/[0.08] rounded-xl p-3.5 space-y-2.5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {columns[0] && (
            <div className="text-xs font-semibold text-white">
              {columns[0].render ? columns[0].render(row) : row[columns[0].key] ?? "—"}
            </div>
          )}
        </div>
        {columns.length > 1 && (
          <div className="shrink-0 text-right">
            {columns[columns.length - 1].render ? columns[columns.length - 1].render(row) : row[columns[columns.length - 1].key] ?? "—"}
          </div>
        )}
      </div>
      {columns.slice(1, -1).length > 0 && (
        <div className="pt-2 border-t border-white/5 space-y-1 text-xs text-zinc-400">
          {columns.slice(1, -1).map((col) => (
            <div key={col.key} className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 text-[11px]">{col.label}:</span>
              <span className="text-zinc-300 text-right truncate">
                {col.render ? col.render(row) : row[col.key] ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryModal({
  isOpen,
  onClose,
  title = "History Log",
  subtitle = "Complete paginated transaction history",
  columns = [],
  fetchDataFn,
  filterOptions = [],
  emptyStateText = "No records found",
  emptyStateSubtext = "There are no transactions matching your filter criteria.",
  emptyStateAction = null,
  onDownload = null,
  onRowClick = null,
  renderMobileCard = null,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    let isCancelled = false;
    if (!isOpen || !fetchDataFn) return;

    async function executeLoad() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchDataFn({
          page: currentPage,
          limit: MODAL_PAGE_SIZE,
          search: debouncedSearch,
          type: selectedType === "all" ? "" : selectedType,
          sort: sortOrder,
        });
        if (isCancelled) return;
        const dataList = response?.data || response?.items || response?.payments || response?.sessions || response?.recharges || [];
        const pagination = response?.pagination || {
          page: currentPage,
          limit: MODAL_PAGE_SIZE,
          total: response?.total || response?.total_count || dataList.length,
          pages: Math.ceil((response?.total || response?.total_count || dataList.length) / MODAL_PAGE_SIZE) || 1,
        };
        setItems(dataList);
        setTotalCount(pagination.total);
        setTotalPages(pagination.pages || 1);
      } catch (err) {
        if (isCancelled) return;
        console.error("[HISTORY MODAL] Fetch error:", err);
        setError(err.message || "Failed to load history records");
        setItems([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    executeLoad();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, fetchDataFn, currentPage, debouncedSearch, selectedType, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b0b10] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search, Filters, Sort */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-b border-white/5 bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full min-w-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ID, description, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#14141c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {/* Filter Dropdown */}
            {filterOptions.length > 0 && (
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <Filter size={14} className="text-zinc-400 shrink-0" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full sm:w-auto bg-[#14141c] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                >
                  <option value="all">All Types</option>
                  {filterOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Order */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
              className="flex items-center justify-center gap-1.5 bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
            >
              <ArrowUpDown size={14} />
              <span>Sort: {sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 min-h-[300px] custom-scrollbar">
          {error && (
            <div className="mb-4 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-full rounded-xl bg-white/[0.04] animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center">
              <FileText size={36} className="text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-zinc-300 mb-1">{emptyStateText}</p>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">{emptyStateSubtext}</p>
              {emptyStateAction && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    emptyStateAction.onClick();
                  }}
                  className="px-4 py-2 bg-[#814ac8] hover:bg-[#905ad6] text-white font-medium text-xs rounded-xl shadow-lg shadow-purple-900/30 transition-all active:scale-95 cursor-pointer"
                >
                  {emptyStateAction.label}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 1. Mobile View (< 640px): Card List matching image 1 */}
              <div className="block sm:hidden space-y-2.5">
                {items.map((row, idx) => (
                  <div
                    key={row.id || row.payment_id || row.gateway_order_id || idx}
                    onClick={(e) => {
                      if (e.target.closest("button") || e.target.closest("a")) return;
                      if (onRowClick) onRowClick(row);
                    }}
                    className={onRowClick ? "cursor-pointer" : ""}
                  >
                    {renderMobileCard ? (
                      renderMobileCard(row)
                    ) : (
                      <DefaultMobileCard row={row} columns={columns} />
                    )}
                  </div>
                ))}

                {/* Mobile Load More Button */}
                {currentPage < totalPages && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className="w-full py-2.5 bg-[#14121e] hover:bg-[#1a1828] border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Load More</span>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}

                {/* Mobile Showing Entries text */}
                <div className="text-xs text-zinc-500 font-medium pt-2 px-0.5">
                  Showing <span className="text-zinc-300 font-semibold">{totalCount === 0 ? 0 : (currentPage - 1) * MODAL_PAGE_SIZE + 1}</span> to{" "}
                  <span className="text-zinc-300 font-semibold">{Math.min(currentPage * MODAL_PAGE_SIZE, totalCount)}</span> of{" "}
                  <span className="text-zinc-300 font-semibold">{totalCount}</span> entries
                </div>
              </div>

              {/* 2. Tablet & Laptop View (>= 640px): Table matching image 1 */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-white/10 bg-[#060609] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                      {columns.map((col) => (
                        <th key={col.key} className="p-3 sm:p-3.5 px-3.5 sm:px-4 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((row, idx) => (
                      <tr
                        key={row.id || row.payment_id || row.gateway_order_id || idx}
                        onClick={(e) => {
                          if (e.target.closest("button") || e.target.closest("a")) return;
                          if (onRowClick) onRowClick(row);
                        }}
                        className={`hover:bg-white/[0.02] transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="p-3 sm:p-3.5 px-3.5 sm:px-4 text-zinc-300">
                            {col.render ? col.render(row) : row[col.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer with Pagination (Hidden on mobile < 640px, visible on tablet & laptop >= 640px) */}
        <div className="hidden sm:block px-4 sm:px-6 py-2 border-t border-white/10 bg-white/[0.02]">
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={MODAL_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
