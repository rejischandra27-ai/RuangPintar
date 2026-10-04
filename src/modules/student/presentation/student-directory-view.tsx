"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Student Directory View
 */

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  UserCheck,
  GraduationCap,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  AlertTriangle,
  X,
  Download,
  ArrowUpDown,
  LayoutGrid,
  Table2,
  Camera,
  Upload,
  ChevronDown,
  Check,
  RotateCcw,
  KeyRound,
  Copy,
  CheckCheck,
  Archive,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  bulkDeleteStudentsAction,
  bulkStudentLifecycleAction,
  createStudentAction,
  deleteStudentAction,
  graduateStudentAction,
  resetStudentPasswordAction,
  transferOutStudentAction,
  updateStudentAction,
} from "@/app/actions/student-actions";
import { StudentIdentityDTO } from "../domain/student-types";
import { StudentDetailModal } from "./student-detail-modal";
import { Toast, ToastType } from "@/shared/components/ui/toast";

interface StudentDirectoryViewProps {
  initialStudents: StudentIdentityDTO[];
  academicYears: Array<{ id: string; nama: string }>;
  gradeLevels: Array<{ id: string; nama: string; kode: string }>;
  rombels: Array<{ id: string; nama: string; tahun_ajaran_id: string; kapasitas: number }>;
  canManage: boolean;
}

export function StudentDirectoryView({
  initialStudents,
  academicYears,
  gradeLevels,
  rombels,
  canManage,
}: StudentDirectoryViewProps) {
  const router = useRouter();
  const students = initialStudents;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [rombelFilter, setRombelFilter] = useState("ALL");
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

  // Photo states for forms
  const [createPhoto, setCreatePhoto] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentIdentityDTO | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentIdentityDTO | null>(null);
  const [graduatingStudent, setGraduatingStudent] = useState<StudentIdentityDTO | null>(null);
  const [transferringStudent, setTransferringStudent] = useState<StudentIdentityDTO | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentIdentityDTO | null>(null);

  // Checkbox multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Password Reset modal states
  const [resettingStudent, setResettingStudent] = useState<StudentIdentityDTO | null>(null);
  const [resetCustomPassword, setResetCustomPassword] = useState("");
  const [resetResultData, setResetResultData] = useState<{
    studentName: string;
    username: string;
    tempPass: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nis && s.nis.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.nisn && s.nisn.includes(searchQuery));

    const matchesStatus = statusFilter === "ALL" || s.status_akademik === statusFilter;
    const matchesRombel = rombelFilter === "ALL" || s.active_rombel_id === rombelFilter;

    return matchesSearch && matchesStatus && matchesRombel;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return a.nama_lengkap.localeCompare(b.nama_lengkap, "id");
      case "name_desc":
        return b.nama_lengkap.localeCompare(a.nama_lengkap, "id");
      case "nis_asc":
        return (a.nis || "").localeCompare(b.nis || "", undefined, { numeric: true });
      case "nis_desc":
        return (b.nis || "").localeCompare(a.nis || "", undefined, { numeric: true });
      case "date_asc":
        return new Date(a.tanggal_masuk).getTime() - new Date(b.tanggal_masuk).getTime();
      case "date_desc":
      default:
        return new Date(b.tanggal_masuk).getTime() - new Date(a.tanggal_masuk).getTime();
    }
  });

  const totalPages = Math.ceil(sortedStudents.length / rowsPerPage) || 1;
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Synchronize select-all checkbox (indeterminate state)
  const isAllSelected =
    paginatedStudents.length > 0 && paginatedStudents.every((s) => selectedIds.has(s.id));
  const isSomeSelected = paginatedStudents.some((s) => selectedIds.has(s.id)) && !isAllSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedStudents.forEach((s) => next.delete(s.id));
    } else {
      paginatedStudents.forEach((s) => next.add(s.id));
    }
    setSelectedIds(next);
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDeactivate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkStudentLifecycleAction(ids, "NONAKTIF");
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        handleClearSelection();
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleBulkDeleteSubmit = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkDeleteStudentsAction(ids);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        handleClearSelection();
        setIsBulkDeleteOpen(false);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleResetPasswordSubmit = () => {
    if (!resettingStudent) return;
    startTransition(async () => {
      const res = await resetStudentPasswordAction(
        resettingStudent.id,
        resetCustomPassword.trim() || undefined
      );
      if (res.success && res.data) {
        const data = res.data as { username: string; temporaryPassword: string };
        setResetResultData({
          studentName: resettingStudent.nama_lengkap,
          username: data.username,
          tempPass: data.temporaryPassword,
        });
        setResettingStudent(null);
        setResetCustomPassword("");
        setToast({ message: res.message, type: "success" });
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!resetResultData) return;
    const text = `Kredensial Akun Siswa Ruang Pintar\nNama: ${resetResultData.studentName}\nUsername: ${resetResultData.username}\nKata Sandi Sementara: ${resetResultData.tempPass}\n\nSilakan login di halaman web dan buat kata sandi baru Anda.`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPhoto: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: "Ukuran foto maksimal 2MB.", type: "error" });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      setToast({ message: "Format foto harus JPG, PNG, atau WebP.", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExportCSV = () => {
    if (sortedStudents.length === 0) {
      setToast({ message: "Tidak ada data siswa untuk diekspor.", type: "error" });
      return;
    }

    const headers = [
      "No",
      "NIS",
      "NISN",
      "Nama Lengkap",
      "Jenis Kelamin",
      "Status Akademik",
      "Rombel",
      "Tingkat",
      "Nomor Absen",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Agama",
      "NIK",
      "Alamat",
      "Nama Wali",
      "Telepon Wali",
      "Email Wali",
      "Tanggal Masuk",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedStudents.map((s, idx) => [
      idx + 1,
      escapeCsv(s.nis || ""),
      escapeCsv(s.nisn || ""),
      escapeCsv(s.nama_lengkap),
      escapeCsv(s.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"),
      escapeCsv(s.status_akademik),
      escapeCsv(s.active_rombel_nama || "-"),
      escapeCsv(s.active_tingkat_nama || "-"),
      escapeCsv(s.active_nomor_absen || "-"),
      escapeCsv(s.tempat_lahir || "-"),
      escapeCsv(s.tanggal_lahir ? new Date(s.tanggal_lahir).toLocaleDateString("id-ID") : "-"),
      escapeCsv(s.agama || "-"),
      escapeCsv(s.nik || "-"),
      escapeCsv(s.alamat || "-"),
      escapeCsv(s.nama_wali || "-"),
      escapeCsv(s.telepon_wali || "-"),
      escapeCsv(s.email_wali || "-"),
      escapeCsv(new Date(s.tanggal_masuk).toLocaleDateString("id-ID")),
    ]);

    // Gunakan pemisah titik koma (;) agar Microsoft Excel (khususnya regional Indonesia/Windows) langsung otomatis memecah ke kolom A, B, C, dst.
    const delimiter = ";";
    const csvContent =
      "\uFEFF" + [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `direktori_siswa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Berhasil mengekspor ${sortedStudents.length} data siswa ke file CSV.`,
      type: "success",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AKTIF":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LULUS":
        return "bg-blue-50 text-[#2563EB] border-blue-200";
      case "PINDAH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "NONAKTIF":
      case "KELUAR":
      case "DROPOUT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Form submissions
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createStudentAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setIsCreateOpen(false);
        setCreatePhoto(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateStudentAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setEditingStudent(null);
        setEditPhoto(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleGraduateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await graduateStudentAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setGraduatingStudent(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleTransferSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await transferOutStudentAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setTransferringStudent(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!deletingStudent) return;
    startTransition(async () => {
      const res = await deleteStudentAction(deletingStudent.id);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setDeletingStudent(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* Table Toolbar (Clean & Frameless: Search + Filter + Sort + Grid/Tabel Toggle + Export + Tambah Siswa) */}
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
              placeholder="Search siswa, NIS, kelas..."
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
                  statusFilter !== "ALL" || rombelFilter !== "ALL"
                    ? "border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400"
                    : "border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Filter
                  className={`h-4 w-4 ${
                    statusFilter !== "ALL" || rombelFilter !== "ALL"
                      ? "text-[#2563EB] dark:text-blue-400"
                      : "text-slate-500"
                  }`}
                />
                <span>Filter</span>
                {(statusFilter !== "ALL" || rombelFilter !== "ALL") && (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                )}
              </button>

              {/* Filter Popover Menu */}
              {isFilterOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl z-30 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
                      Filter Data Siswa
                    </span>
                    {(statusFilter !== "ALL" || rombelFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("ALL");
                          setRombelFilter("ALL");
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
                      Status Akademik
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="AKTIF">Aktif</option>
                      <option value="LULUS">Lulus</option>
                      <option value="PINDAH">Pindah</option>
                      <option value="NONAKTIF">Nonaktif / Keluar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Rombongan Belajar (Rombel)
                    </label>
                    <select
                      value={rombelFilter}
                      onChange={(e) => {
                        setRombelFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="ALL">Semua Rombel</option>
                      {rombels.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama}
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
                    { id: "name_asc", label: "Nama (A - Z)" },
                    { id: "name_desc", label: "Nama (Z - A)" },
                    { id: "nis_asc", label: "NIS (Terkecil)" },
                    { id: "nis_desc", label: "NIS (Terbesar)" },
                    { id: "created_desc", label: "Terbaru Ditambahkan" },
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
              title="Ekspor daftar siswa ke file CSV"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* + Tambah Siswa Primary Button */}
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setCreatePhoto(null);
                  setIsCreateOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Siswa</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div
          data-testid="bulk-toolbar"
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 rounded-2xl bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/80 shadow-xl animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold">{selectedIds.size} siswa dipilih</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleBulkDeactivate}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Nonaktifkan siswa terpilih"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Nonaktifkan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Hapus permanen siswa terpilih"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Permanen</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* 5. STUDENT DIRECTORY CONTENT (GRID KARTU ATAU TABEL RINGKAS) */}
      {viewMode === "GRID" ? (
        <div className="space-y-4">
          {paginatedStudents.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 mx-auto flex items-center justify-center shadow-2xs">
                <Search className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Tidak Ada Siswa yang Ditemukan
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? `Tidak ada data siswa yang cocok dengan kata kunci '${searchQuery}'.`
                    : "Belum ada data siswa yang cocok dengan filter yang dipilih saat ini."}
                </p>
              </div>
              {(statusFilter !== "ALL" || rombelFilter !== "ALL" || searchQuery) && (
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                      setRombelFilter("ALL");
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
              {paginatedStudents.map((student) => {
                const isSelected = selectedIds.has(student.id);
                return (
                  <div
                    key={student.id}
                    className={`group relative rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-[#2563EB] ring-2 ring-blue-500/20 bg-blue-50/20"
                        : "border-slate-200/80 dark:border-blue-500/20"
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Header: Checkbox + NIS + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            aria-label={`Pilih siswa ${student.nama_lengkap}`}
                            checked={isSelected}
                            onChange={() => handleToggleRow(student.id)}
                            className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-[#2563EB] font-black text-xs font-mono">
                            NIS: {student.nis || "-"}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                            student.status_akademik
                          )}`}
                        >
                          {student.status_akademik}
                        </span>
                      </div>

                      {/* Student Identity: Avatar + Name + Subtitle */}
                      <div className="flex items-start gap-3">
                        {student.foto_url ? (
                          <img
                            src={student.foto_url}
                            alt={student.nama_lengkap}
                            className="w-12 h-12 rounded-full object-cover shrink-0 aspect-square border-2 border-white shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shrink-0 aspect-square shadow-2xs">
                            {student.nama_lengkap.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3
                            onClick={() => setDetailStudent(student)}
                            className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors truncate cursor-pointer"
                            title={student.nama_lengkap}
                          >
                            {student.nama_lengkap}
                          </h3>
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono mt-0.5 truncate">
                            {student.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                            {student.nisn ? ` • NISN ${student.nisn}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Detail Chips */}
                      <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100/90 dark:border-slate-700/60 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                            Rombel & Kelas:
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                            {student.active_rombel_nama || "Belum Ditempatkan"}
                            {student.active_nomor_absen ? ` (#${student.active_nomor_absen})` : ""}
                          </span>
                        </div>
                        {student.active_tingkat_nama && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                              Tingkat:
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                              {student.active_tingkat_nama}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                            Wali:
                          </span>
                          <span
                            className="font-medium text-slate-700 dark:text-slate-300 text-xs truncate max-w-[150px]"
                            title={student.nama_wali || "-"}
                          >
                            {student.nama_wali || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailStudent(student)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-[#2563EB] text-[#2563EB] hover:text-white font-bold text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </button>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditPhoto(student.foto_url || null);
                              setEditingStudent(student);
                            }}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Profil"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetCustomPassword("");
                              setResettingStudent(student);
                            }}
                            className="p-1.5 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Reset Kata Sandi Akun"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {student.status_akademik === "AKTIF" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setTransferringStudent(student)}
                                className="p-1.5 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Mutasi Keluar"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setGraduatingStudent(student)}
                                className="p-1.5 rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Kelulusan"
                              >
                                <GraduationCap className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeletingStudent(student)}
                            className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Mode: TABEL RINGKAS (Desktop & Tablet) */
        <div className="overflow-hidden rounded-[24px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                <tr>
                  {/* Checkbox Select All */}
                  <th className="w-12 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      aria-label="Pilih semua siswa"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5">Identitas Siswa</th>
                  <th className="px-4 py-3.5">L/P</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Rombel & Tingkat</th>
                  <th className="px-4 py-3.5">Wali / Kontak</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm"
                    >
                      Tidak ada data siswa yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => {
                    const isSelected = selectedIds.has(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {/* [CHECKBOX] */}
                        <td className="w-12 px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Pilih siswa ${s.nama_lengkap}`}
                            checked={isSelected}
                            onChange={() => handleToggleRow(s.id)}
                            className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* [FOTO] [IDENTITAS] */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3.5">
                            {s.foto_url ? (
                              <img
                                src={s.foto_url}
                                alt={s.nama_lengkap}
                                className="w-11 h-11 rounded-full object-cover shrink-0 aspect-square border border-slate-200/80 shadow-2xs"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 aspect-square shadow-2xs">
                                {s.nama_lengkap.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span
                                className="font-bold text-slate-800 block hover:text-[#2563EB] cursor-pointer"
                                onClick={() => setDetailStudent(s)}
                              >
                                {s.nama_lengkap}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                NIS: {s.nis || "-"} {s.nisn ? `• NISN: ${s.nisn}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-600">
                          {s.jenis_kelamin}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                              s.status_akademik
                            )}`}
                          >
                            {s.status_akademik}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {s.active_rombel_nama ? (
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {s.active_rombel_nama}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {s.active_tingkat_nama ?? ""}
                                {s.active_nomor_absen ? ` • Absen #${s.active_nomor_absen}` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Belum Ditempatkan</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <span className="font-medium text-slate-700 block">
                              {s.nama_wali || "-"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {s.telepon_wali || s.email_wali || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailStudent(s)}
                              className="p-1.5 rounded-lg text-[#2563EB] hover:bg-blue-50 transition-colors"
                              title="Lihat Detail & Riwayat"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditPhoto(s.foto_url || null);
                                    setEditingStudent(s);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                  title="Edit Profil"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setResetCustomPassword("");
                                    setResettingStudent(s);
                                  }}
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                  title="Reset Kata Sandi Akun"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                                {s.status_akademik === "AKTIF" && (
                                  <>
                                    <button
                                      onClick={() => setTransferringStudent(s)}
                                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                      title="Mutasi Keluar"
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setGraduatingStudent(s)}
                                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      title="Kelulusan"
                                    >
                                      <GraduationCap className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setDeletingStudent(s)}
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
                    );
                  })
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
            {filteredStudents.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} -{" "}
            {Math.min(currentPage * rowsPerPage, filteredStudents.length)}
          </strong>{" "}
          dari{" "}
          <strong className="text-slate-800 dark:text-slate-200">{filteredStudents.length}</strong>{" "}
          siswa
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

      {/* Modal: Tambah Siswa Baru */}
      {isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#2563EB]" />
                  Tambah Data Siswa Baru
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleCreateSubmit}
                className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm"
              >
                {/* Foto Profil Siswa */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                    {createPhoto ? (
                      <img src={createPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-xs font-semibold text-slate-700">
                      Pas Foto Siswa (Opsional)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Format JPG, PNG, atau WebP (Maksimal 2MB)
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer shadow-2xs transition-colors">
                        <Upload className="h-3.5 w-3.5 text-[#2563EB]" />
                        Pilih Foto
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={(e) => handlePhotoUpload(e, setCreatePhoto)}
                          className="hidden"
                        />
                      </label>
                      {createPhoto && (
                        <button
                          type="button"
                          onClick={() => setCreatePhoto(null)}
                          className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                  <input type="hidden" name="foto_url" value={createPhoto || ""} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nomor Induk Siswa (NIS) *
                    </label>
                    <input
                      name="nis"
                      required
                      placeholder="Contoh: 20261001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      NISN (10 Digit Angka)
                    </label>
                    <input
                      name="nisn"
                      maxLength={10}
                      placeholder="Contoh: 0081234567"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    name="nama_lengkap"
                    required
                    placeholder="Nama lengkap sesuai akta / ijazah"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jenis Kelamin *
                    </label>
                    <select
                      name="jenis_kelamin"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      name="tempat_lahir"
                      placeholder="Kota/Kabupaten"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      name="tanggal_lahir"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Orang Tua / Wali
                    </label>
                    <input
                      name="nama_wali"
                      placeholder="Nama orang tua atau wali murid"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Telepon / WhatsApp Wali
                    </label>
                    <input
                      name="telepon_wali"
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Auto Enrollment options */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                  <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Keikutsertaan Awal (Opsional)
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tahun Ajaran
                      </label>
                      <select
                        name="initial_tahun_ajaran_id"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
                      >
                        <option value="">-- Tanpa Pendaftaran Langsung --</option>
                        {academicYears.map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tingkat Kelas
                      </label>
                      <select
                        name="initial_tingkat_id"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
                      >
                        <option value="">-- Pilih Tingkat --</option>
                        {gradeLevels.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Rombel / Kelas
                      </label>
                      <select
                        name="initial_rombel_id"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
                      >
                        <option value="">-- Pilih Rombel --</option>
                        {rombels.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama} (Kapasitas: {r.kapasitas})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isPending ? "Menyimpan..." : "Simpan Siswa"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Edit Profil Siswa */}
      {editingStudent &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-[#2563EB]" />
                  Edit Profil Siswa
                </h3>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleEditSubmit}
                className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm"
              >
                <input type="hidden" name="id" value={editingStudent.id} />

                {/* Foto Profil Siswa */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                    {editPhoto ? (
                      <img src={editPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-xs font-semibold text-slate-700">
                      Pas Foto Siswa (Opsional)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Format JPG, PNG, atau WebP (Maksimal 2MB)
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer shadow-2xs transition-colors">
                        <Upload className="h-3.5 w-3.5 text-[#2563EB]" />
                        Ganti Foto
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={(e) => handlePhotoUpload(e, setEditPhoto)}
                          className="hidden"
                        />
                      </label>
                      {editPhoto && (
                        <button
                          type="button"
                          onClick={() => setEditPhoto(null)}
                          className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                  <input type="hidden" name="foto_url" value={editPhoto || ""} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nomor Induk Siswa (NIS)
                    </label>
                    <input
                      name="nis"
                      defaultValue={editingStudent.nis || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      NISN (10 Digit)
                    </label>
                    <input
                      name="nisn"
                      defaultValue={editingStudent.nisn || ""}
                      maxLength={10}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    name="nama_lengkap"
                    defaultValue={editingStudent.nama_lengkap}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Status Akademik
                    </label>
                    <select
                      name="status_akademik"
                      defaultValue={editingStudent.status_akademik}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                      <option value="LULUS">LULUS</option>
                      <option value="PINDAH">PINDAH</option>
                      <option value="KELUAR">KELUAR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Telepon Wali
                    </label>
                    <input
                      name="telepon_wali"
                      defaultValue={editingStudent.telepon_wali || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isPending ? "Memperbarui..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Kelulusan Siswa */}
      {graduatingStudent &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Kelulusan Siswa</h3>
                  <p className="text-xs text-slate-500">{graduatingStudent.nama_lengkap}</p>
                </div>
              </div>

              <form onSubmit={handleGraduateSubmit} className="space-y-4 text-xs">
                <input type="hidden" name="siswa_id" value={graduatingStudent.id} />
                <input
                  type="hidden"
                  name="source_enrollment_id"
                  value={graduatingStudent.active_enrollment_id || ""}
                />

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Kelulusan Resmi
                  </label>
                  <input
                    type="date"
                    name="tanggal_lulus"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catatan Kelulusan (Opsional)
                  </label>
                  <input
                    name="catatan"
                    placeholder="Contoh: Lulus Angkatan 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGraduatingStudent(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {isPending ? "Memproses..." : "Konfirmasi Lulus"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Mutasi Keluar Siswa */}
      {transferringStudent &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <ArrowRightLeft className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Mutasi Keluar Siswa</h3>
                  <p className="text-xs text-slate-500">{transferringStudent.nama_lengkap}</p>
                </div>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
                <input type="hidden" name="siswa_id" value={transferringStudent.id} />
                <input
                  type="hidden"
                  name="source_enrollment_id"
                  value={transferringStudent.active_enrollment_id || ""}
                />

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alasan Mutasi / Pindah *
                  </label>
                  <input
                    name="alasan_keluar"
                    required
                    placeholder="Contoh: Mengikuti domisili orang tua"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sekolah Tujuan (Opsional)
                  </label>
                  <input
                    name="sekolah_tujuan"
                    placeholder="Nama institusi atau sekolah baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTransferringStudent(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {isPending ? "Memproses..." : "Konfirmasi Mutasi"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Hapus Siswa (Destructive Confirmation) */}
      {deletingStudent &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-bold text-slate-800 text-base">Hapus Data Siswa</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data siswa{" "}
                <strong>&quot;{deletingStudent.nama_lengkap}&quot;</strong>
                {deletingStudent.nis ? ` (NIS: ${deletingStudent.nis})` : ""}? Tindakan ini tidak
                dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingStudent(null)}
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
                  {isPending ? "Menghapus..." : "Hapus Siswa"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Hapus Massal Siswa */}
      {isBulkDeleteOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="font-bold text-slate-800 text-base">Hapus Massal Siswa</h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Anda akan menghapus atau menonaktifkan <strong>{selectedIds.size} siswa</strong>{" "}
                yang dipilih sekaligus.
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Perlindungan Histori Akademik Aktif:</p>
                <p className="leading-relaxed">
                  Siswa yang belum memiliki riwayat akademik/nilai akan dihapus permanen. Siswa yang
                  telah memiliki histori akademik akan otomatis dialihkan ke status{" "}
                  <strong>Nonaktif</strong> demi menjaga integritas rapor dan arsip sekolah.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleBulkDeleteSubmit}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {isPending ? "Memproses..." : "Lanjutkan Hapus & Nonaktifkan"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Reset Password Siswa */}
      {resettingStudent &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Reset Kata Sandi Siswa</h3>
                  <p className="text-xs text-slate-500">
                    {resettingStudent.nama_lengkap}
                    {resettingStudent.nis ? ` (NIS: ${resettingStudent.nis})` : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Akun siswa akan di-reset (atau otomatis dibuatkan jika belum memiliki akun) dan
                  diwajibkan membuat kata sandi baru pada saat login berikutnya. Status akun yang
                  terkunci akan otomatis dipulihkan.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Baru (Opsional)
                  </label>
                  <input
                    type="text"
                    value={resetCustomPassword}
                    onChange={(e) => setResetCustomPassword(e.target.value)}
                    placeholder="Biarkan kosong untuk default: Password123#"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Minimal 8 karakter kombinasi huruf dan angka.
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResettingStudent(null);
                    setResetCustomPassword("");
                  }}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetPasswordSubmit}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isPending ? "Memproses..." : "Reset Kata Sandi"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Hasil Reset Password (Dialog Salin Kredensial Siswa) */}
      {resetResultData &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Kata Sandi Berhasil Di-reset!
                  </h3>
                  <p className="text-xs text-slate-500">{resetResultData.studentName}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Username / Login ID:</span>
                  <span className="font-bold font-mono text-slate-800">
                    {resetResultData.username}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Kata Sandi Sementara:</span>
                  <span className="font-bold font-mono text-blue-600 text-sm">
                    {resetResultData.tempPass}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Salin kredensial di atas dan sampaikan secara privat kepada siswa atau orang
                tua/wali siswa yang bersangkutan. Siswa akan diminta membuat kata sandi baru saat
                pertama kali login.
              </p>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Kredensial Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-500" />
                      <span>Salin Kredensial</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setResetResultData(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#2B3B52] text-white font-semibold text-xs shadow-md"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Detail Modal Component */}
      <StudentDetailModal
        isOpen={Boolean(detailStudent)}
        onClose={() => setDetailStudent(null)}
        student={detailStudent}
      />
    </div>
  );
}
