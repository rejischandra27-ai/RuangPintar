"use client";

/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Student Rombel Placements View
 */

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Users,
  ArrowRightLeft,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  Check,
  RotateCcw,
  Download,
  ArrowUpDown,
  LayoutGrid,
  Table2,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  bulkPlacementAction,
  createPlacementAction,
  deletePlacementAction,
  movePlacementAction,
} from "@/app/actions/student-actions";
import { RombelPlacementDTO, StudentEnrollmentDTO } from "../domain/student-types";
import { Toast, ToastType } from "@/shared/components/ui/toast";

interface StudentPlacementsViewProps {
  initialPlacements: RombelPlacementDTO[];
  enrollments: StudentEnrollmentDTO[];
  rombels: Array<{
    id: string;
    nama: string;
    kapasitas: number;
    tingkat_nama?: string;
    program_nama?: string | null;
    tahun_ajaran_id: string;
  }>;
  academicYears: Array<{ id: string; nama: string; status: string }>;
  canManage: boolean;
}

export function StudentPlacementsView({
  initialPlacements,
  enrollments,
  rombels,
  academicYears,
  canManage,
}: StudentPlacementsViewProps) {
  const router = useRouter();
  const placements = initialPlacements;
  const [selectedRombelId, setSelectedRombelId] = useState<string>(rombels[0]?.id || "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("absen_asc");
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Popover toggle states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [movingPlacement, setMovingPlacement] = useState<RombelPlacementDTO | null>(null);
  const [deletingPlacement, setDeletingPlacement] = useState<RombelPlacementDTO | null>(null);

  // Bulk state
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkTargetRombelId, setBulkTargetRombelId] = useState<string>(rombels[0]?.id || "");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Find active rombel details
  const currentRombel = rombels.find((r) => r.id === selectedRombelId);
  const activePlacementsInRombel = placements.filter(
    (p) => (selectedRombelId === "ALL" || p.rombel_id === selectedRombelId) && p.status === "AKTIF"
  );

  const filteredPlacements = placements.filter((p) => {
    const matchesRombel = selectedRombelId === "ALL" || p.rombel_id === selectedRombelId;
    const matchesSearch =
      (p.siswa_nama && p.siswa_nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.siswa_nis && p.siswa_nis.includes(searchQuery));

    return matchesRombel && matchesSearch;
  });

  const sortedPlacements = [...filteredPlacements].sort((a, b) => {
    switch (sortBy) {
      case "absen_asc":
        return (a.nomor_absen || 999) - (b.nomor_absen || 999);
      case "name_asc":
        return (a.siswa_nama || "").localeCompare(b.siswa_nama || "", "id");
      case "name_desc":
        return (b.siswa_nama || "").localeCompare(a.siswa_nama || "", "id");
      case "nis_asc":
        return (a.siswa_nis || "").localeCompare(b.siswa_nis || "", "id");
      default:
        return (a.nomor_absen || 999) - (b.nomor_absen || 999);
    }
  });

  const totalPages = Math.ceil(sortedPlacements.length / rowsPerPage) || 1;
  const paginatedPlacements = sortedPlacements.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Unplaced active enrollments for placement modals
  const unplacedEnrollments = enrollments.filter(
    (e) => e.status === "AKTIF" && !e.active_rombel_id
  );

  const handlePlaceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPlacementAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setIsPlaceOpen(false);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleMoveSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await movePlacementAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setMovingPlacement(null);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleBulkSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (bulkSelectedIds.length === 0 || !bulkTargetRombelId) return;

    startTransition(async () => {
      const res = await bulkPlacementAction(bulkTargetRombelId, bulkSelectedIds);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setIsBulkOpen(false);
        setBulkSelectedIds([]);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!deletingPlacement) return;
    startTransition(async () => {
      const res = await deletePlacementAction(deletingPlacement.id);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setDeletingPlacement(null);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleExportCSV = () => {
    if (sortedPlacements.length === 0) {
      setToast({ message: "Tidak ada data penempatan untuk diekspor.", type: "error" });
      return;
    }

    const headers = [
      "No",
      "No Absen",
      "NIS",
      "Nama Siswa",
      "Rombel",
      "Tahun Ajaran",
      "Status Penempatan",
    ];
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedPlacements.map((p, idx) => [
      idx + 1,
      escapeCsv(p.nomor_absen || "-"),
      escapeCsv(p.siswa_nis),
      escapeCsv(p.siswa_nama),
      escapeCsv(p.rombel_nama),
      escapeCsv(p.tahun_ajaran_nama),
      escapeCsv(p.status),
    ]);

    const delimiter = ";";
    const csvContent =
      "\uFEFF" + [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `penempatan_rombel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Berhasil mengekspor ${sortedPlacements.length} data penempatan ke CSV.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* Table Toolbar (Clean & Frameless: Search + Filter + Sort + Grid/Tabel Toggle + Export + Massal + Tempatkan Siswa) */}
      <div className="relative z-20">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input with Leading & Trailing Icon */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search siswa di rombel ini..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none hidden sm:block" />
            )}
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
            {/* Filter Dropdown Button */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => {
                  setIsFilterOpen(!isFilterOpen);
                  setIsSortOpen(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer shrink-0 ${
                  selectedRombelId !== "ALL"
                    ? "border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400"
                    : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Filter
                  className={`h-4 w-4 ${
                    selectedRombelId !== "ALL"
                      ? "text-[#2563EB] dark:text-blue-400"
                      : "text-slate-500"
                  }`}
                />
                <span>Filter</span>
                {selectedRombelId !== "ALL" && (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                )}
              </button>

              {/* Filter Popover Menu */}
              {isFilterOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-30 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
                      Pilih Rombel
                    </span>
                    {selectedRombelId !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRombelId("ALL");
                          setCurrentPage(1);
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Rombel / Kelas
                    </label>
                    <select
                      value={selectedRombelId}
                      onChange={(e) => {
                        setSelectedRombelId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="ALL">Semua Rombel</option>
                      {rombels.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama} ({r.tingkat_nama ?? ""}{" "}
                          {r.program_nama ? `• ${r.program_nama}` : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown Button */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  setIsFilterOpen(false);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                <span>Sort</span>
              </button>

              {/* Sort Popover Menu */}
              {isSortOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-30 space-y-1 animate-in fade-in zoom-in-95">
                  {[
                    { id: "absen_asc", label: "No Absen (Terkecil)" },
                    { id: "name_asc", label: "Nama Siswa (A - Z)" },
                    { id: "name_desc", label: "Nama Siswa (Z - A)" },
                    { id: "nis_asc", label: "NIS (Terkecil)" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.id);
                        setIsSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        sortBy === opt.id
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && (
                        <Check className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle: Grid Kartu vs Tabel Ringkas */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "GRID"
                    ? "bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid Kartu</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "TABLE"
                    ? "bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Tampilan Tabel Ringkas"
              >
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tabel Ringkas</span>
              </button>
            </div>

            {/* Export Dropdown / Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Ekspor data penempatan ke file CSV"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Penempatan Massal Button */}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsBulkOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Users className="h-4 w-4 text-slate-500" />
                <span>Massal</span>
              </button>
            )}

            {/* + Tempatkan Siswa Primary Button */}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsPlaceOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Tempatkan Siswa</span>
              </button>
            )}
          </div>
        </div>

        {/* Capacity Info Strip when a rombel is selected */}
        {currentRombel && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Rombel: {currentRombel.nama}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                {currentRombel.tingkat_nama ?? ""}{" "}
                {currentRombel.program_nama ? `(${currentRombel.program_nama})` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Terisi: {activePlacementsInRombel.length} / {currentRombel.kapasitas} Siswa
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activePlacementsInRombel.length >= currentRombel.kapasitas
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {activePlacementsInRombel.length >= currentRombel.kapasitas
                  ? "Penuh"
                  : `Sisa ${currentRombel.kapasitas - activePlacementsInRombel.length} Kursi`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. PLACEMENTS CONTENT (GRID KARTU ATAU TABEL RINGKAS) */}
      {viewMode === "GRID" ? (
        <div className="space-y-4">
          {paginatedPlacements.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 mx-auto flex items-center justify-center shadow-2xs">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Tidak Ada Siswa Ditemukan di Rombel Ini
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? `Tidak ada data siswa yang cocok dengan kata kunci '${searchQuery}'.`
                    : "Belum ada siswa yang ditempatkan pada rombel yang dipilih saat ini."}
                </p>
              </div>
              {(selectedRombelId !== "ALL" || searchQuery) && (
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedRombelId("ALL");
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {paginatedPlacements.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3.5">
                    {/* Header: Absen & NIS & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {p.nomor_absen ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-400 font-black text-xs font-mono">
                            Absen #{p.nomor_absen}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs">
                            Absen #-
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono">
                          NIS: {p.siswa_nis}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          p.status === "AKTIF"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {/* Student Name */}
                    <div className="space-y-1">
                      <h3
                        className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                        title={p.siswa_nama}
                      >
                        {p.siswa_nama}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {p.siswa_jenis_kelamin === "L"
                          ? "Laki-laki"
                          : p.siswa_jenis_kelamin === "P"
                            ? "Perempuan"
                            : "-"}
                      </p>
                    </div>

                    {/* Metadata Detail Chips */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100/90 dark:border-slate-700/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Rombel / Kelas:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                          {p.rombel_nama}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Tingkat & Jurusan:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px]">
                          {p.tingkat_nama ?? ""}
                          {p.program_nama ? ` • ${p.program_nama}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Tahun Ajaran:
                        </span>
                        <span className="font-medium text-slate-600 dark:text-slate-400 text-xs font-mono">
                          {p.tahun_ajaran_nama}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setMovingPlacement(p)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs mr-auto"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Pindah Rombel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPlacement(p)}
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Keluarkan dari Rombel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Mode: TABEL RINGKAS */
        <div className="overflow-hidden rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5 w-16">No. Absen</th>
                  <th className="px-5 py-3.5">Nama & NIS Siswa</th>
                  <th className="px-4 py-3.5">L/P</th>
                  <th className="px-4 py-3.5">Rombel / Kelas</th>
                  <th className="px-4 py-3.5">Tingkat & Jurusan</th>
                  <th className="px-4 py-3.5">Status Penempatan</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedPlacements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm"
                    >
                      Tidak ada siswa yang ditempatkan pada rombel ini.
                    </td>
                  </tr>
                ) : (
                  paginatedPlacements.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-600">
                        {p.nomor_absen ? `#${p.nomor_absen}` : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800 block">{p.siswa_nama}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          NIS: {p.siswa_nis}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600">
                        {p.siswa_jenis_kelamin ?? "-"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{p.rombel_nama}</td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {p.tingkat_nama ?? ""}
                        {p.program_nama ? ` • ${p.program_nama}` : ""}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            p.status === "AKTIF"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              <button
                                onClick={() => setMovingPlacement(p)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold text-xs hover:bg-amber-100 transition-colors"
                                title="Pindah Rombel"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Pindah
                              </button>
                              <button
                                onClick={() => setDeletingPlacement(p)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Keluarkan dari Rombel"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. COMMON PAGINATION TOOLBAR (Clean & Frameless Academic Glass) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 text-xs text-slate-500">
        <span>
          Menampilkan{" "}
          <strong className="text-slate-800 dark:text-slate-200">
            {filteredPlacements.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} -{" "}
            {Math.min(currentPage * rowsPerPage, filteredPlacements.length)}
          </strong>{" "}
          dari{" "}
          <strong className="text-slate-800 dark:text-slate-200">
            {filteredPlacements.length}
          </strong>{" "}
          penempatan
        </span>
        <div className="flex items-center gap-2">
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
          >
            <option value={12}>12 Siswa</option>
            <option value={24}>24 Siswa</option>
            <option value={48}>48 Siswa</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 font-bold font-mono text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tempatkan Siswa Tunggal */}
      {isPlaceOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#2563EB]" />
                  Tempatkan Siswa ke Rombel
                </h3>
                <button
                  onClick={() => setIsPlaceOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePlaceSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pilih Siswa Terdaftar (Belum Ditempatkan) *
                  </label>
                  <select
                    name="keikutsertaan_id"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="">-- Pilih Siswa Terdaftar --</option>
                    {enrollments
                      .filter((e) => e.status === "AKTIF")
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.siswa_nama} (NIS: {e.siswa_nis}) - {e.tahun_ajaran_nama}{" "}
                          {e.active_rombel_nama
                            ? `[Saat ini: ${e.active_rombel_nama}]`
                            : "[Belum Ditempatkan]"}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Rombel Tujuan *
                    </label>
                    <select
                      name="rombel_id"
                      defaultValue={selectedRombelId !== "ALL" ? selectedRombelId : ""}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    >
                      <option value="">-- Pilih Rombel --</option>
                      {rombels.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama} (Kapasitas: {r.kapasitas})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor Absen (Opsional)
                    </label>
                    <input
                      type="number"
                      name="nomor_absen"
                      min={1}
                      placeholder="Otomatis jika kosong"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPlaceOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold"
                  >
                    {isPending ? "Menempatkan..." : "Tempatkan Siswa"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Pindah Rombel */}
      {movingPlacement &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Pindah Rombel / Kelas</h3>
                  <p className="text-xs text-slate-500">{movingPlacement.siswa_nama}</p>
                </div>
              </div>

              <form onSubmit={handleMoveSubmit} className="space-y-3 text-xs">
                <input
                  type="hidden"
                  name="keikutsertaan_id"
                  value={movingPlacement.keikutsertaan_id}
                />

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rombel Saat Ini</label>
                  <input
                    disabled
                    value={movingPlacement.rombel_nama || ""}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Rombel Tujuan *
                    </label>
                    <select
                      name="target_rombel_id"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-semibold"
                    >
                      <option value="">-- Pilih Rombel --</option>
                      {rombels
                        .filter((r) => r.id !== movingPlacement.rombel_id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama} (Kapasitas: {r.kapasitas})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor Absen Baru
                    </label>
                    <input
                      type="number"
                      name="nomor_absen"
                      min={1}
                      placeholder="Opsional"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alasan Pindah Rombel
                  </label>
                  <input
                    name="alasan_pindah"
                    placeholder="Contoh: Penyesuaian peminatan / kapasitas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMovingPlacement(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {isPending ? "Memindahkan..." : "Simpan Pemindahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Penempatan Massal (Bulk Placement) */}
      {isBulkOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#2563EB]" />
                  Penempatan Rombel Massal (Bulk Placement)
                </h3>
                <button
                  onClick={() => setIsBulkOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleBulkSubmit}
                className="space-y-4 flex-1 overflow-y-auto text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pilih Rombel Tujuan *
                  </label>
                  <select
                    value={bulkTargetRombelId}
                    onChange={(e) => setBulkTargetRombelId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-semibold"
                  >
                    {rombels.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} (Kapasitas: {r.kapasitas})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      Pilih Siswa yang Belum Memiliki Rombel ({bulkSelectedIds.length} dipilih)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (bulkSelectedIds.length === unplacedEnrollments.length) {
                          setBulkSelectedIds([]);
                        } else {
                          setBulkSelectedIds(unplacedEnrollments.map((e) => e.id));
                        }
                      }}
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      {bulkSelectedIds.length === unplacedEnrollments.length
                        ? "Batalkan Semua"
                        : "Pilih Semua"}
                    </button>
                  </div>

                  {unplacedEnrollments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                      Semua siswa terdaftar sudah memiliki rombel aktif.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {unplacedEnrollments.map((enr) => {
                        const isSelected = bulkSelectedIds.includes(enr.id);
                        return (
                          <div
                            key={enr.id}
                            onClick={() => {
                              setBulkSelectedIds((prev) =>
                                isSelected ? prev.filter((id) => id !== enr.id) : [...prev, enr.id]
                              );
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-[#2563EB]" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {enr.siswa_nama}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  NIS: {enr.siswa_nis}{" "}
                                  {enr.tingkat_nama ? `• ${enr.tingkat_nama}` : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsBulkOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || bulkSelectedIds.length === 0}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                  >
                    {isPending ? "Menempatkan..." : `Tempatkan ${bulkSelectedIds.length} Siswa`}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Hapus Penempatan */}
      {deletingPlacement &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-bold text-slate-800 text-base">Keluarkan dari Rombel</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin mengeluarkan siswa{" "}
                <strong>&quot;{deletingPlacement.siswa_nama}&quot;</strong> dari rombel{" "}
                <strong>{deletingPlacement.rombel_nama}</strong>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingPlacement(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {isPending ? "Mengeluarkan..." : "Keluarkan"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
