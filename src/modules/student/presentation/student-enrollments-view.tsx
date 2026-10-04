"use client";

/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Student Enrollments View
 */

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Search,
  Plus,
  ArrowUpRight,
  Edit2,
  Trash2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  AlertTriangle,
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
  createEnrollmentAction,
  deleteEnrollmentAction,
  promoteStudentAction,
  updateEnrollmentStatusAction,
} from "@/app/actions/student-actions";
import { StudentEnrollmentDTO, StudentIdentityDTO } from "../domain/student-types";
import { Toast, ToastType } from "@/shared/components/ui/toast";

interface StudentEnrollmentsViewProps {
  initialEnrollments: StudentEnrollmentDTO[];
  students: StudentIdentityDTO[];
  academicYears: Array<{ id: string; nama: string; status: string }>;
  activeYear: { id: string; nama: string } | null;
  gradeLevels: Array<{ id: string; nama: string; kode: string }>;
  rombels: Array<{ id: string; nama: string; tahun_ajaran_id: string; kapasitas: number }>;
  canManage: boolean;
}

export function StudentEnrollmentsView({
  initialEnrollments,
  students,
  academicYears,
  activeYear,
  gradeLevels,
  rombels,
  canManage,
}: StudentEnrollmentsViewProps) {
  const router = useRouter();
  const enrollments = initialEnrollments;
  const [selectedYearId, setSelectedYearId] = useState(
    activeYear?.id || (academicYears[0]?.id ?? "ALL")
  );
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
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
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [promotingEnrollment, setPromotingEnrollment] = useState<StudentEnrollmentDTO | null>(null);
  const [editingEnrollment, setEditingEnrollment] = useState<StudentEnrollmentDTO | null>(null);
  const [deletingEnrollment, setDeletingEnrollment] = useState<StudentEnrollmentDTO | null>(null);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredEnrollments = enrollments.filter((e) => {
    const matchesYear = selectedYearId === "ALL" || e.tahun_ajaran_id === selectedYearId;
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    const matchesSearch =
      (e.siswa_nama && e.siswa_nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.siswa_nis && e.siswa_nis.includes(searchQuery));

    return matchesYear && matchesStatus && matchesSearch;
  });

  const sortedEnrollments = [...filteredEnrollments].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return (a.siswa_nama || "").localeCompare(b.siswa_nama || "", "id");
      case "name_desc":
        return (b.siswa_nama || "").localeCompare(a.siswa_nama || "", "id");
      case "nis_asc":
        return (a.siswa_nis || "").localeCompare(b.siswa_nis || "", "id");
      case "date_desc":
        return (
          (b.tanggal_mulai ? new Date(b.tanggal_mulai).getTime() : 0) -
          (a.tanggal_mulai ? new Date(a.tanggal_mulai).getTime() : 0)
        );
      default:
        return (a.siswa_nama || "").localeCompare(b.siswa_nama || "", "id");
    }
  });

  const totalPages = Math.ceil(sortedEnrollments.length / rowsPerPage) || 1;
  const paginatedEnrollments = sortedEnrollments.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AKTIF":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "NAIK_KELAS":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "LULUS":
        return "bg-blue-50 text-[#2563EB] border-blue-200";
      case "TINGGAL_KELAS":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "PINDAH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const handleEnrollSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createEnrollmentAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setIsEnrollOpen(false);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handlePromoteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await promoteStudentAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setPromotingEnrollment(null);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleEditStatusSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateEnrollmentStatusAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setEditingEnrollment(null);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!deletingEnrollment) return;
    startTransition(async () => {
      const res = await deleteEnrollmentAction(deletingEnrollment.id);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setDeletingEnrollment(null);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleExportCSV = () => {
    if (sortedEnrollments.length === 0) {
      setToast({ message: "Tidak ada data keikutsertaan untuk diekspor.", type: "error" });
      return;
    }

    const headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "Tahun Ajaran",
      "Tingkat",
      "Status Keikutsertaan",
      "Tanggal Pendaftaran",
    ];
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedEnrollments.map((e, idx) => [
      idx + 1,
      escapeCsv(e.siswa_nis),
      escapeCsv(e.siswa_nama),
      escapeCsv(e.tahun_ajaran_nama),
      escapeCsv(e.tingkat_nama || "-"),
      escapeCsv(e.status),
      escapeCsv(e.tanggal_mulai ? new Date(e.tanggal_mulai).toLocaleDateString("id-ID") : "-"),
    ]);

    const delimiter = ";";
    const csvContent =
      "\uFEFF" + [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `keikutsertaan_siswa_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Berhasil mengekspor ${sortedEnrollments.length} data keikutsertaan ke CSV.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* Table Toolbar (Clean & Frameless: Search + Filter + Sort + Grid/Tabel Toggle + Export + Daftarkan ke Periode) */}
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
              placeholder="Search nama atau NIS siswa..."
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
                  selectedYearId !== "ALL" || statusFilter !== "ALL"
                    ? "border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400"
                    : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Filter
                  className={`h-4 w-4 ${
                    selectedYearId !== "ALL" || statusFilter !== "ALL"
                      ? "text-[#2563EB] dark:text-blue-400"
                      : "text-slate-500"
                  }`}
                />
                <span>Filter</span>
                {(selectedYearId !== "ALL" || statusFilter !== "ALL") && (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                )}
              </button>

              {/* Filter Popover Menu */}
              {isFilterOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-30 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
                      Filter Keikutsertaan
                    </span>
                    {(selectedYearId !== "ALL" || statusFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedYearId("ALL");
                          setStatusFilter("ALL");
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
                      Tahun Ajaran
                    </label>
                    <select
                      value={selectedYearId}
                      onChange={(e) => {
                        setSelectedYearId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="ALL">Semua Tahun Ajaran</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.nama} {y.status === "AKTIF" ? "(Aktif)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Status Keikutsertaan
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="ALL">Semua Status Keikutsertaan</option>
                      <option value="AKTIF">Aktif</option>
                      <option value="NAIK_KELAS">Naik Kelas</option>
                      <option value="TINGGAL_KELAS">Tinggal Kelas</option>
                      <option value="LULUS">Lulus</option>
                      <option value="PINDAH">Pindah</option>
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
                    { id: "name_asc", label: "Nama Siswa (A - Z)" },
                    { id: "name_desc", label: "Nama Siswa (Z - A)" },
                    { id: "nis_asc", label: "NIS (Terkecil)" },
                    { id: "date_desc", label: "Terbaru Didaftarkan" },
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
              title="Ekspor daftar keikutsertaan ke file CSV"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* + Daftarkan ke Periode Primary Button */}
            {canManage && (
              <button
                type="button"
                onClick={() => setIsEnrollOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Daftarkan ke Periode</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. STUDENT ENROLLMENTS CONTENT (GRID KARTU ATAU TABEL RINGKAS) */}
      {viewMode === "GRID" ? (
        <div className="space-y-4">
          {paginatedEnrollments.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 mx-auto flex items-center justify-center shadow-2xs">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Tidak Ada Keikutsertaan Ditemukan
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? `Tidak ada data keikutsertaan yang cocok dengan kata kunci '${searchQuery}'.`
                    : "Belum ada siswa yang didaftarkan pada tahun ajaran / status yang dipilih."}
                </p>
              </div>
              {(selectedYearId !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedYearId("ALL");
                      setStatusFilter("ALL");
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
              {paginatedEnrollments.map((enr) => (
                <div
                  key={enr.id}
                  className="group relative rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3.5">
                    {/* Header: NIS & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-400 font-black text-xs font-mono">
                        NIS: {enr.siswa_nis || "-"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                          enr.status
                        )}`}
                      >
                        {enr.status}
                      </span>
                    </div>

                    {/* Student Name */}
                    <div className="space-y-1">
                      <h3
                        className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                        title={enr.siswa_nama}
                      >
                        {enr.siswa_nama}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        ID: {enr.id.slice(0, 12)}...
                      </p>
                    </div>

                    {/* Metadata Detail Chips */}
                    <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100/90 dark:border-slate-700/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Tahun Ajaran:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                          {enr.tahun_ajaran_nama}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Tingkat Kelas:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {enr.tingkat_nama || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Rombel Aktif:
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {enr.active_rombel_nama || "Belum Ditempatkan"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1">
                      {enr.status === "AKTIF" && (
                        <button
                          type="button"
                          onClick={() => setPromotingEnrollment(enr)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs mr-auto"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span>Kenaikan Kelas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingEnrollment(enr)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ubah Status"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEnrollment(enr)}
                        className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Hapus"
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
                  <th className="px-5 py-3.5">Nama & NIS Siswa</th>
                  <th className="px-4 py-3.5">Tahun Ajaran</th>
                  <th className="px-4 py-3.5">Tingkat Kelas</th>
                  <th className="px-4 py-3.5">Rombel Penempatan</th>
                  <th className="px-4 py-3.5">Status Keikutsertaan</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedEnrollments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm"
                    >
                      Tidak ada data keikutsertaan yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedEnrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800 block">{enr.siswa_nama}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          NIS: {enr.siswa_nis}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {enr.tahun_ajaran_nama}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {enr.tingkat_nama || "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        {enr.active_rombel_nama ? (
                          <span className="font-semibold text-slate-800 bg-blue-50/80 text-[#2563EB] px-2.5 py-1 rounded-lg border border-blue-100">
                            {enr.active_rombel_nama}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Belum Ditempatkan</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                            enr.status
                          )}`}
                        >
                          {enr.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              {enr.status === "AKTIF" && (
                                <button
                                  onClick={() => setPromotingEnrollment(enr)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition-colors"
                                  title="Promosi / Kenaikan Kelas"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                  Kenaikan
                                </button>
                              )}
                              <button
                                onClick={() => setEditingEnrollment(enr)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                title="Ubah Status"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingEnrollment(enr)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Hapus"
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
            {filteredEnrollments.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} -{" "}
            {Math.min(currentPage * rowsPerPage, filteredEnrollments.length)}
          </strong>{" "}
          dari{" "}
          <strong className="text-slate-800 dark:text-slate-200">
            {filteredEnrollments.length}
          </strong>{" "}
          keikutsertaan
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

      {/* Modal: Daftarkan Siswa ke Periode */}
      {isEnrollOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#2563EB]" />
                  Daftarkan Siswa ke Periode
                </h3>
                <button
                  onClick={() => setIsEnrollOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Siswa *</label>
                  <select
                    name="siswa_id"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="">-- Pilih Siswa dari Buku Induk --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_lengkap} (NIS: {s.nis})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tahun Ajaran *
                    </label>
                    <select
                      name="tahun_ajaran_id"
                      defaultValue={activeYear?.id || ""}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.nama} {y.status === "AKTIF" ? "(Aktif)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                    <select
                      name="tingkat_id"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    >
                      <option value="">-- Pilih Tingkat --</option>
                      {gradeLevels.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Penempatan Rombel Awal (Opsional)
                  </label>
                  <select
                    name="initial_rombel_id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="">-- Tempatkan Nanti --</option>
                    {rombels.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} (Kapasitas: {r.kapasitas})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEnrollOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold"
                  >
                    {isPending ? "Mendaftarkan..." : "Daftarkan Siswa"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Kenaikan Kelas / Promosi */}
      {promotingEnrollment &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Promosi Kenaikan Kelas</h3>
                  <p className="text-xs text-slate-500">{promotingEnrollment.siswa_nama}</p>
                </div>
              </div>

              <form onSubmit={handlePromoteSubmit} className="space-y-3 text-xs">
                <input type="hidden" name="siswa_id" value={promotingEnrollment.siswa_id} />
                <input type="hidden" name="source_enrollment_id" value={promotingEnrollment.id} />

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Periode Lalu *
                  </label>
                  <select
                    name="status_enrollment_lama"
                    defaultValue="NAIK_KELAS"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="NAIK_KELAS">Naik Kelas (Promosi)</option>
                    <option value="TINGGAL_KELAS">Tinggal Kelas (Mengulang)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tahun Ajaran Baru *
                    </label>
                    <select
                      name="target_tahun_ajaran_id"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tingkat Kelas Baru *
                    </label>
                    <select
                      name="target_tingkat_id"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                    >
                      {gradeLevels.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rombel Baru (Opsional)
                  </label>
                  <select
                    name="target_rombel_id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="">-- Tempatkan Nanti --</option>
                    {rombels.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama} (Kapasitas: {r.kapasitas})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPromotingEnrollment(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isPending ? "Memproses..." : "Simpan Kenaikan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Edit Status Keikutsertaan */}
      {editingEnrollment &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Ubah Status Keikutsertaan</h3>
              <form onSubmit={handleEditStatusSubmit} className="space-y-3 text-xs">
                <input type="hidden" name="id" value={editingEnrollment.id} />
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingEnrollment.status}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NAIK_KELAS">NAIK_KELAS</option>
                    <option value="TINGGAL_KELAS">TINGGAL_KELAS</option>
                    <option value="LULUS">LULUS</option>
                    <option value="PINDAH">PINDAH</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                  <input
                    name="catatan"
                    defaultValue={editingEnrollment.catatan || ""}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingEnrollment(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Hapus Keikutsertaan */}
      {deletingEnrollment &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-bold text-slate-800 text-base">Hapus Keikutsertaan</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus keikutsertaan siswa{" "}
                <strong>&quot;{deletingEnrollment.siswa_nama}&quot;</strong> pada periode{" "}
                <strong>{deletingEnrollment.tahun_ajaran_nama}</strong>?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingEnrollment(null)}
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
                  {isPending ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
