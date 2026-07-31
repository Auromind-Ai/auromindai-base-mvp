import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Filter, ArrowUpDown, Download, FileText, AlertCircle } from "lucide-react";
import DataTablePagination from "./DataTablePagination";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { MODAL_PAGE_SIZE } from "@/lib/constants/billingConstants";

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

  const loadData = useCallback(async () => {
    if (!isOpen || !fetchDataFn) return;
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
      console.error("[HISTORY MODAL] Fetch error:", err);
      setError(err.message || "Failed to load history records");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, fetchDataFn, currentPage, debouncedSearch, selectedType, sortOrder]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Reset page to 1 when search or type filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedType, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b0b10] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search, Filters, Sort */}
        <div className="p-4 px-6 border-b border-white/5 bg-white/[0.01] flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ID, description, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#14141c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Filter Dropdown */}
          {filterOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-zinc-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-[#14141c] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ArrowUpDown size={14} />
            <span>Sort: {sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
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
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#060609]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                    {columns.map((col) => (
                      <th key={col.key} className="p-3.5 px-4">
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
                        <td key={col.key} className="p-3.5 px-4 text-zinc-300">
                          {col.render ? col.render(row) : row[col.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="px-6 py-2 border-t border-white/10 bg-white/[0.02]">
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
