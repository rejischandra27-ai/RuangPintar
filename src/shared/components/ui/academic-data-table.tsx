"use client";

/**
 * Ruang Pintar — Academic Glass Global DataTable Component
 * Standard Production Table for SaaS Operations (Stage 19)
 *
 * Sesuai Standar Workstream 02:
 * - Toolbar: Search, Filter, Refresh, Export CSV, Column Visibility
 * - Sorting: Sortable columns dengan toggle Asc/Desc
 * - Pagination: Default 10 rows (10, 25, 50, 100)
 * - Footer: "Menampilkan {start}–{end} dari {total} data"
 * - Academic Glass Empty State
 * - Responsive Mobile Card View
 */

import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Filter,
  RefreshCw,
  Download,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Check,
} from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | null | undefined;
  align?: "left" | "center" | "right";
  width?: string;
  defaultVisible?: boolean;
}

export interface DataTableFilterOption<T> {
  id: string;
  label: string;
  filterAccessor: (row: T, selectedValue: string) => boolean;
  options: Array<{ value: string; label: string }>;
}

export interface AcademicDataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchKeys?: Array<keyof T | ((row: T) => string | number | null | undefined)>;
  filters?: DataTableFilterOption<T>[];
  exportFilename?: string;
  onRefresh?: () => void | Promise<void>;
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  primaryAction?: React.ReactNode;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
}

export function AcademicDataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  subtitle,
  searchPlaceholder = "Cari data...",
  searchKeys = [],
  filters = [],
  exportFilename = "data-export",
  onRefresh,
  isLoading = false,
  emptyStateTitle = "Belum Ada Data",
  emptyStateDescription = "Tidak ada rekaman data yang sesuai dengan kriteria saat ini.",
  primaryAction,
  renderMobileCard,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
}: AcademicDataTableProps<T>) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of filters) {
      initial[f.id] = "ALL";
    }
    return initial;
  });

  // Sorting state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const col of columns) {
      map[col.key] = col.defaultVisible !== false;
    }
    return map;
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(filterValues).filter((val) => val && val !== "ALL").length;
  }, [filterValues]);

  // Is refreshing indicator
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle Sorting
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey(null);
        setSortOrder("asc");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filter & Search Pipeline
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // 1. Filter dropdowns
      for (const f of filters) {
        const selected = filterValues[f.id];
        if (selected && selected !== "ALL") {
          if (!f.filterAccessor(row, selected)) {
            return false;
          }
        }
      }

      // 2. Search query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        if (searchKeys.length > 0) {
          const match = searchKeys.some((k) => {
            let val: any;
            if (typeof k === "function") {
              val = k(row);
            } else {
              val = row[k];
            }
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(query);
          });
          if (!match) return false;
        } else {
          // Fallback: search all primitive string/number values in row
          const matchAny = Object.values(row).some((val) => {
            if (typeof val === "string" || typeof val === "number") {
              return String(val).toLowerCase().includes(query);
            }
            return false;
          });
          if (!matchAny) return false;
        }
      }

      return true;
    });
  }, [data, filterValues, searchQuery, searchKeys, filters]);

  // Sort Pipeline
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const activeColumn = columns.find((c) => c.key === sortKey);
    if (!activeColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (activeColumn.sortAccessor) {
        valA = activeColumn.sortAccessor(a);
        valB = activeColumn.sortAccessor(b);
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
      }

      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB), "id")
        : String(valB).localeCompare(String(valA), "id");
    });
  }, [filteredData, sortKey, sortOrder, columns]);

  // Pagination Pipeline
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);

  const startRecord = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRows);

  // Export CSV
  const handleExportCsv = () => {
    if (sortedData.length === 0) return;

    // Ambil kolom yang visible
    const colsToExport = columns.filter((c) => visibleColumns[c.key]);

    const headerRow = colsToExport.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
    const rows = sortedData.map((item) => {
      return colsToExport
        .map((c) => {
          let val = item[c.key];
          if (c.sortAccessor) {
            val = c.sortAccessor(item);
          }
          if (val === null || val === undefined) val = "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvString = [headerRow, ...rows].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Visible columns array
  const activeColumns = useMemo(() => {
    return columns.filter((c) => visibleColumns[c.key]);
  }, [columns, visibleColumns]);

  return (
    <div className="space-y-4">
      {/* Top Header / Title (if provided without primary action) */}
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* Global Toolbar (Search, Single Filter Icon Popover, Column Visibility, Export, Refresh, Primary Action) */}
      <div className="bg-transparent border-0 shadow-none p-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Filters & Tools & Primary Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Integrated Single Filter Dropdown */}
          {filters.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsFilterDropdownOpen(!isFilterDropdownOpen);
                  setIsColumnDropdownOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  activeFiltersCount > 0
                    ? "bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs"
                }`}
                title="Filter Data"
              >
                <Filter
                  className={`w-3.5 h-3.5 ${
                    activeFiltersCount > 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {isFilterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-4 space-y-3.5 animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Opsi Filter
                      </span>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const reset: Record<string, string> = {};
                            for (const f of filters) reset[f.id] = "ALL";
                            setFilterValues(reset);
                            setCurrentPage(1);
                          }}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {filters.map((filter) => (
                        <div key={filter.id} className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {filter.label}
                          </label>
                          <select
                            value={filterValues[filter.id] || "ALL"}
                            onChange={(e) => {
                              setFilterValues({
                                ...filterValues,
                                [filter.id]: e.target.value,
                              });
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="ALL">Semua {filter.label}</option>
                            {filter.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Column Visibility Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsColumnDropdownOpen(!isColumnDropdownOpen);
                setIsFilterDropdownOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Atur Kolom Tampil"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Kolom</span>
            </button>

            {isColumnDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsColumnDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-2.5 space-y-1 animate-in fade-in-0 zoom-in-95 duration-150">
                  <span className="text-[11px] font-bold text-slate-400 px-2 py-1 block uppercase tracking-wider">
                    Kolom Tampil
                  </span>
                  {columns.map((col) => {
                    const isVisible = visibleColumns[col.key];
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => {
                          setVisibleColumns({
                            ...visibleColumns,
                            [col.key]: !isVisible,
                          });
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-left cursor-pointer transition-colors"
                      >
                        <span className="truncate">{col.header}</span>
                        {isVisible && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
            title="Ekspor CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="p-2.5 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing || isLoading ? "animate-spin text-blue-600 dark:text-blue-400" : ""
                }`}
              />
            </button>
          )}

          {/* Primary Action Button (e.g., + Tambah Sekolah / + Tambah Guru) */}
          {primaryAction && <div className="ml-1 shrink-0">{primaryAction}</div>}
        </div>
      </div>

      {/* Main Table Container (Academic Glass UI) */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs overflow-hidden backdrop-blur-xl">
        {/* Loading Bar Overlay */}
        {(isLoading || isRefreshing) && (
          <div className="w-full h-1 bg-blue-100 dark:bg-blue-950 overflow-hidden">
            <div className="w-full h-full bg-blue-600 animate-pulse" />
          </div>
        )}

        {/* Empty State */}
        {totalRows === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-100/80 dark:border-blue-900/80">
              <Database className="w-7 h-7" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              {emptyStateTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-4">
              {emptyStateDescription}
            </p>
            {(searchQuery || Object.values(filterValues).some((v) => v !== "ALL")) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  const resetFilters: Record<string, string> = {};
                  for (const f of filters) resetFilters[f.id] = "ALL";
                  setFilterValues(resetFilters);
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Reset Filter & Pencarian
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4 w-12 text-center text-slate-400 dark:text-slate-500">
                      #
                    </th>
                    {activeColumns.map((col) => {
                      const isSorted = sortKey === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key, col.sortable)}
                          style={{ width: col.width }}
                          className={`py-3 px-4 ${
                            col.align === "center"
                              ? "text-center"
                              : col.align === "right"
                                ? "text-right"
                                : "text-left"
                          } ${col.sortable ? "cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors" : ""}`}
                        >
                          <div
                            className={`inline-flex items-center gap-1.5 ${
                              col.align === "center"
                                ? "justify-center"
                                : col.align === "right"
                                  ? "justify-end"
                                  : "justify-start"
                            }`}
                          >
                            <span>{col.header}</span>
                            {col.sortable && (
                              <span className="text-slate-400 dark:text-slate-500">
                                {isSorted ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-200">
                  {paginatedData.map((row, idx) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={(row as any).id || idx}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400 dark:text-slate-500">
                          {rowNumber}
                        </td>
                        {activeColumns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-3 px-4 ${
                              col.align === "center"
                                ? "text-center"
                                : col.align === "right"
                                  ? "text-right"
                                  : "text-left"
                            }`}
                          >
                            {col.cell ? col.cell(row, idx) : (row[col.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Optional or Fallback) */}
            {renderMobileCard && (
              <div className="md:hidden p-3 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((row, idx) => (
                  <div key={(row as any).id || idx} className="pt-2.5 first:pt-0">
                    {renderMobileCard(row, idx)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Standard Pagination Footer */}
        {totalRows > 0 && (
          <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
            {/* Left: Info Label */}
            <div data-testid="data-table-pagination-info">
              <span>Menampilkan </span>
              <strong className="text-slate-900 dark:text-white font-bold">{startRecord}</strong>
              <span>–</span>
              <strong className="text-slate-900 dark:text-white font-bold">{endRecord}</strong>
              <span> dari </span>
              <strong className="text-slate-900 dark:text-white font-bold">{totalRows}</strong>
              <span> data</span>
            </div>

            {/* Right: Page Size & Pagination Buttons */}
            <div className="flex items-center gap-3">
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Pertama"
                  aria-label="Halaman Pertama"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Sebelumnya"
                  aria-label="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {safeCurrentPage} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Berikutnya"
                  aria-label="Halaman Berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Halaman Terakhir"
                  aria-label="Halaman Terakhir"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
