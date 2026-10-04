"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Ruang Pintar — M08 Teachers Directory View (Academic Glass UI v1.2)
 *
 * Mendukung:
 * - Checkbox multi-select (checked, unchecked, indeterminate, select all, reset selection)
 * - Bulk action: Arsipkan, Nonaktifkan, Hapus Permanen, Batal Pilih
 * - Avatar foto guru 44px rounded-full object-cover tanpa distorsi dengan fallback inisial
 * - Filter status: Aktif (default), Nonaktif, Arsip, Semua
 * - Domain-safe deletion: jika guru memiliki histori akademik, tombol diarahkan ke Arsip dan hard-delete ditolak
 */

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Users,
  AlertTriangle,
  X,
  Download,
  ArrowUpDown,
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  Check,
  RotateCcw,
  Archive,
  ShieldAlert,
  KeyRound,
  Copy,
  CheckCheck,
  Smartphone,
  Tablet,
  Laptop,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  archiveTeacherAction,
  bulkDeleteTeachersAction,
  bulkTeacherLifecycleAction,
  createTeacherAction,
  deactivateTeacherAction,
  deleteTeacherAction,
  resetTeacherPasswordAction,
  restoreTeacherAction,
  updateTeacherAction,
} from "@/app/actions/teacher-actions";
import {
  HomeroomAssignmentDTO,
  StatusKepegawaianGuru,
  StatusLifecycle,
  TeacherProfileDTO,
  TeachingAssignmentDTO,
} from "../domain/teacher-types";
import { TeacherDetailModal } from "./teacher-detail-modal";
import { Toast, ToastType } from "@/shared/components/ui/toast";

interface TeachersViewProps {
  initialTeachers: TeacherProfileDTO[];
  teachingAssignments: TeachingAssignmentDTO[];
  homeroomAssignments: HomeroomAssignmentDTO[];
  canManage: boolean;
}

export function TeachersView({
  initialTeachers,
  teachingAssignments,
  homeroomAssignments,
  canManage,
}: TeachersViewProps) {
  const router = useRouter();
  const teachers = initialTeachers;

  const [searchQuery, setSearchQuery] = useState("");
  // Filter status: AKTIF (default), NONAKTIF, ARSIP, ALL
  const [statusFilter, setStatusFilter] = useState<string>("AKTIF");
  const [kepegawaianFilter, setKepegawaianFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name_asc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Checkbox multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

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
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfileDTO | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<TeacherProfileDTO | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherProfileDTO | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Password Reset modal states
  const [resettingTeacher, setResettingTeacher] = useState<TeacherProfileDTO | null>(null);
  const [resetCustomPassword, setResetCustomPassword] = useState("");
  const [resetResultData, setResetResultData] = useState<{
    teacherName: string;
    username: string;
    tempPass: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter teachers by search query and lifecycle status
  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.nama_lengkap.toLowerCase().includes(q) ||
      (t.nip && t.nip.toLowerCase().includes(q)) ||
      (t.nuptk && t.nuptk.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q));

    const currentLifecycle = t.status_lifecycle || (t.status_aktif ? "AKTIF" : "NONAKTIF");

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "AKTIF" && currentLifecycle === "AKTIF") ||
      (statusFilter === "NONAKTIF" && currentLifecycle === "NONAKTIF") ||
      (statusFilter === "ARSIP" && currentLifecycle === "ARSIP");

    const matchesKepegawaian =
      kepegawaianFilter === "ALL" || t.status_kepegawaian === kepegawaianFilter;

    return matchesSearch && matchesStatus && matchesKepegawaian;
  });

  // Sort teachers
  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return a.nama_lengkap.localeCompare(b.nama_lengkap, "id");
      case "name_desc":
        return b.nama_lengkap.localeCompare(a.nama_lengkap, "id");
      case "nip_asc":
        return (a.nip || "").localeCompare(b.nip || "", undefined, { numeric: true });
      case "nip_desc":
        return (b.nip || "").localeCompare(a.nip || "", undefined, { numeric: true });
      case "created_desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalPages = Math.ceil(sortedTeachers.length / rowsPerPage) || 1;
  const paginatedTeachers = sortedTeachers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Indeterminate logic for Select All checkbox
  const isAllSelected =
    paginatedTeachers.length > 0 && paginatedTeachers.every((t) => selectedIds.has(t.id));
  const isIndeterminate = paginatedTeachers.some((t) => selectedIds.has(t.id)) && !isAllSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedTeachers.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedTeachers.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
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
    if (sortedTeachers.length === 0) {
      setToast({ message: "Tidak ada data guru untuk diekspor.", type: "error" });
      return;
    }

    const headers = [
      "No",
      "NIP",
      "NUPTK",
      "Nama Lengkap",
      "Gelar Depan",
      "Gelar Belakang",
      "Nama dengan Gelar",
      "Jenis Kelamin",
      "Status Kepegawaian",
      "Status Lifecycle",
      "Status Aktif",
      "Beban Jam/Minggu",
      "Rombel Diampu",
      "Wali Kelas",
      "Email",
      "Telepon",
      "Alamat",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedTeachers.map((t, idx) => [
      idx + 1,
      escapeCsv(t.nip || "-"),
      escapeCsv(t.nuptk || "-"),
      escapeCsv(t.nama_lengkap),
      escapeCsv(t.gelar_depan || "-"),
      escapeCsv(t.gelar_belakang || "-"),
      escapeCsv(t.nama_dengan_gelar),
      escapeCsv(t.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"),
      escapeCsv(t.status_kepegawaian),
      escapeCsv(t.status_lifecycle || (t.status_aktif ? "AKTIF" : "NONAKTIF")),
      escapeCsv(t.status_aktif ? "Aktif" : "Nonaktif"),
      escapeCsv(t.total_jam_minggu || 0),
      escapeCsv(t.total_rombel_aktif || 0),
      escapeCsv(t.is_wali_kelas_aktif ? t.rombel_wali_nama : "-"),
      escapeCsv(t.email || "-"),
      escapeCsv(t.telepon || "-"),
      escapeCsv(t.alamat || "-"),
    ]);

    const delimiter = ";";
    const csvContent =
      "\uFEFF" + [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `data_guru_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Berhasil mengekspor ${sortedTeachers.length} data guru ke file CSV.`,
      type: "success",
    });
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createTeacherAction(null, formData);
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
      const res = await updateTeacherAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setEditingTeacher(null);
        setEditPhoto(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!deletingTeacher) return;
    startTransition(async () => {
      const res = await deleteTeacherAction(deletingTeacher.id);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setDeletingTeacher(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleDeactivateSubmit = () => {
    if (!deletingTeacher) return;
    startTransition(async () => {
      const res = await deactivateTeacherAction(deletingTeacher.id);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setDeletingTeacher(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleArchiveSubmit = (id?: string) => {
    const targetId = id || deletingTeacher?.id;
    if (!targetId) return;
    startTransition(async () => {
      const res = await archiveTeacherAction(targetId);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        setDeletingTeacher(null);
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleRestoreSubmit = (id: string) => {
    startTransition(async () => {
      const res = await restoreTeacherAction(id);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  // Bulk Actions Handlers
  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkTeacherLifecycleAction(ids, "ARSIP");
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        handleClearSelection();
        router.refresh();
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleBulkDeactivate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkTeacherLifecycleAction(ids, "NONAKTIF");
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
      const res = await bulkDeleteTeachersAction(ids);
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
    if (!resettingTeacher) return;
    startTransition(async () => {
      const res = await resetTeacherPasswordAction(
        resettingTeacher.id,
        resetCustomPassword.trim() || undefined
      );
      if (res.success && res.data) {
        setResetResultData({
          teacherName: resettingTeacher.nama_dengan_gelar,
          username: res.data.username,
          tempPass: res.data.temporaryPassword,
        });
        setResettingTeacher(null);
        setResetCustomPassword("");
        setToast({ message: res.message, type: "success" });
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!resetResultData) return;
    const text = `Kredensial Akun Ruang Pintar\nNama: ${resetResultData.teacherName}\nUsername: ${resetResultData.username}\nKata Sandi Sementara: ${resetResultData.tempPass}\n\nSilakan login di halaman web dan buat kata sandi baru Anda.`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
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

      {/* Table Toolbar */}
      <div className="relative z-20 p-3 sm:p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search guru, NIP, email..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all shadow-2xs"
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
                  statusFilter !== "AKTIF" || kepegawaianFilter !== "ALL"
                    ? "border-blue-300 bg-blue-50/70 text-[#2563EB]"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <Filter
                  className={`h-4 w-4 ${
                    statusFilter !== "AKTIF" || kepegawaianFilter !== "ALL"
                      ? "text-[#2563EB]"
                      : "text-slate-600"
                  }`}
                />
                <span>Filter</span>
                {(statusFilter !== "AKTIF" || kepegawaianFilter !== "ALL") && (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                )}
              </button>

              {/* Filter Popover Menu */}
              {isFilterOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl z-30 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-[#2563EB]" />
                      Filter Data Guru
                    </span>
                    {(statusFilter !== "AKTIF" || kepegawaianFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("AKTIF");
                          setKepegawaianFilter("ALL");
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
                    <label
                      htmlFor="filter-status-keaktifan"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Status Keaktifan
                    </label>
                    <select
                      id="filter-status-keaktifan"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="AKTIF">Aktif Mengajar (Default)</option>
                      <option value="NONAKTIF">Nonaktif</option>
                      <option value="ARSIP">Arsip</option>
                      <option value="ALL">Semua Status</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="filter-status-kepegawaian"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Status Kepegawaian
                    </label>
                    <select
                      id="filter-status-kepegawaian"
                      value={kepegawaianFilter}
                      onChange={(e) => {
                        setKepegawaianFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="ALL">Semua Kepegawaian</option>
                      <option value="TETAP">Guru Tetap</option>
                      <option value="HONORER">Honorer</option>
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                      <option value="KONTRAK">Kontrak</option>
                      <option value="LAINNYA">Lainnya</option>
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
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <ArrowUpDown className="h-4 w-4 text-slate-600" />
                <span>Sort</span>
              </button>

              {/* Sort Popover Menu */}
              {isSortOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 p-2 rounded-2xl bg-white border border-slate-200 shadow-xl z-30 space-y-1 animate-in fade-in zoom-in-95">
                  {[
                    { id: "name_asc", label: "Nama (A - Z)" },
                    { id: "name_desc", label: "Nama (Z - A)" },
                    { id: "nip_asc", label: "NIP (Terkecil)" },
                    { id: "nip_desc", label: "NIP (Terbesar)" },
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
                          ? "bg-blue-50 text-[#2563EB] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <Check className="h-3.5 w-3.5 text-[#2563EB]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Ekspor daftar guru ke file CSV"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* + Tambah Guru Baru Primary Button */}
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
                <span>Tambah Guru</span>
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
            <span className="text-xs sm:text-sm font-bold">{selectedIds.size} data dipilih</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleBulkArchive}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Arsipkan guru terpilih"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Arsipkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeactivate}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Nonaktifkan guru terpilih"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Nonaktifkan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Hapus permanen guru terpilih"
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

      {/* Content: Mobile Cards (< 640px) */}
      <div className="block sm:hidden space-y-3">
        {paginatedTeachers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Tidak ada data guru yang cocok dengan filter pencarian.
          </div>
        ) : (
          paginatedTeachers.map((t) => {
            const lifecycle = t.status_lifecycle || (t.status_aktif ? "AKTIF" : "NONAKTIF");
            return (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      aria-label={`Pilih guru ${t.nama_dengan_gelar}`}
                      checked={selectedIds.has(t.id)}
                      onChange={() => handleToggleRow(t.id)}
                      className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0 mt-0.5"
                    />

                    {/* Foto Guru: 44px rounded-full object-cover shrink-0 aspect-square */}
                    {t.foto_url ? (
                      <img
                        src={t.foto_url}
                        alt={t.nama_lengkap}
                        className="w-11 h-11 rounded-full object-cover shrink-0 aspect-square border border-slate-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 aspect-square shadow-2xs">
                        {t.nama_lengkap.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Identitas */}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                          {t.nama_dengan_gelar}
                        </h4>
                        {t.presence_info && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full border ${t.presence_info.badgeClass}`}
                          >
                            <span className={`size-1.5 rounded-full ${t.presence_info.dotClass}`} />
                            <span>{t.presence_info.label}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 flex-wrap">
                        <span>NIP: {t.nip || "-"}</span>
                        {t.device_info && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-slate-500 font-sans">
                              {t.device_info.type === "mobile" ? (
                                <Smartphone className="size-3 text-slate-400" />
                              ) : t.device_info.type === "tablet" ? (
                                <Tablet className="size-3 text-slate-400" />
                              ) : (
                                <Laptop className="size-3 text-slate-400" />
                              )}
                              <span>{t.device_info.brand}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badge Lifecycle */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      lifecycle === "AKTIF"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : lifecycle === "ARSIP"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {lifecycle === "AKTIF" ? "Aktif" : lifecycle === "ARSIP" ? "Arsip" : "Nonaktif"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Beban Mengajar</span>
                    <span className="font-bold text-[#2563EB]">{t.total_jam_minggu || 0} JP</span> (
                    {t.total_rombel_aktif || 0} Rombel)
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Wali Kelas</span>
                    <span className="font-semibold text-slate-700 truncate block">
                      {t.is_wali_kelas_aktif ? t.rombel_wali_nama : "Bukan Wali"}
                    </span>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1 text-xs">
                  <button
                    onClick={() => setDetailTeacher(t)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#2563EB] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Detail & Beban
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      {lifecycle !== "AKTIF" && (
                        <button
                          onClick={() => handleRestoreSubmit(t.id)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Pulihkan Guru ke Aktif"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditPhoto(t.foto_url || null);
                          setEditingTeacher(t);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Edit Guru"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                          <button
                            onClick={() => {
                              setResetCustomPassword("");
                              setResettingTeacher(t);
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Reset Kata Sandi Akun"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {t.bisa_hapus_permanen ? (
                            <button
                              onClick={() => setDeletingTeacher(t)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Hapus Data Guru"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeletingTeacher(t)}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                              title="Arsipkan Guru (Memiliki Histori Akademik)"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Content: Desktop Data Table (>= 640px) */}
      <div className="hidden sm:block overflow-hidden rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
              <tr>
                {/* Checkbox Select All */}
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    aria-label="Pilih semua guru"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                {/* [CHECKBOX] [FOTO] [IDENTITAS] */}
                <th className="px-4 py-3.5">Pendidik</th>
                <th className="px-4 py-3.5">L/P</th>
                <th className="px-4 py-3.5">Kepegawaian</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Beban Mengajar</th>
                <th className="px-4 py-3.5">Wali Kelas</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm"
                  >
                    Tidak ada data guru yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((t) => {
                  const lifecycle = t.status_lifecycle || (t.status_aktif ? "AKTIF" : "NONAKTIF");
                  const isSelected = selectedIds.has(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* [CHECKBOX] */}
                      <td className="w-12 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Pilih guru ${t.nama_dengan_gelar}`}
                          checked={isSelected}
                          onChange={() => handleToggleRow(t.id)}
                          className="w-4 h-4 rounded text-[#2563EB] border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* [FOTO] [IDENTITAS] */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3.5">
                          {/* Avatar 44px rounded-full object-cover shrink-0 aspect-square */}
                          {t.foto_url ? (
                            <img
                              src={t.foto_url}
                              alt={t.nama_lengkap}
                              className="w-11 h-11 rounded-full object-cover shrink-0 aspect-square border border-slate-200/80 shadow-2xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2563EB] to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 aspect-square shadow-2xs">
                              {t.nama_lengkap.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-slate-800 hover:text-[#2563EB] cursor-pointer"
                                onClick={() => setDetailTeacher(t)}
                              >
                                {t.nama_dengan_gelar}
                              </span>
                              {t.presence_info && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${t.presence_info.badgeClass}`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${t.presence_info.dotClass}`}
                                  />
                                  <span>{t.presence_info.label}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>
                                NIP: {t.nip || "-"} {t.nuptk ? `• NUPTK: ${t.nuptk}` : ""}
                              </span>
                              {t.device_info && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 font-sans text-slate-500 font-medium">
                                    {t.device_info.type === "mobile" ? (
                                      <Smartphone className="size-3 text-slate-400" />
                                    ) : t.device_info.type === "tablet" ? (
                                      <Tablet className="size-3 text-slate-400" />
                                    ) : (
                                      <Laptop className="size-3 text-slate-400" />
                                    )}
                                    <span>
                                      {t.device_info.brand} ({t.device_info.browser})
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-600">
                        {t.jenis_kelamin}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {t.status_kepegawaian}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            lifecycle === "AKTIF"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : lifecycle === "ARSIP"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {lifecycle === "AKTIF"
                            ? "Aktif"
                            : lifecycle === "ARSIP"
                              ? "Arsip"
                              : "Nonaktif"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-extrabold text-[#2563EB] block text-xs sm:text-sm">
                            {t.total_jam_minggu || 0} JP / minggu
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {t.total_rombel_aktif || 0} Rombongan Belajar
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {t.is_wali_kelas_aktif ? (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs">
                            <Users className="h-3 w-3 text-[#2563EB]" />
                            {t.rombel_wali_nama}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailTeacher(t)}
                            className="p-1.5 rounded-lg text-[#2563EB] hover:bg-blue-50 transition-colors"
                            title="Lihat Detail & Beban Kerja"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {canManage && (
                            <>
                              {lifecycle !== "AKTIF" && (
                                <button
                                  onClick={() => handleRestoreSubmit(t.id)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Pulihkan Guru ke Aktif"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditPhoto(t.foto_url || null);
                                  setEditingTeacher(t);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                                title="Edit Data Guru"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                                  <button
                                    onClick={() => {
                                      setResetCustomPassword("");
                                      setResettingTeacher(t);
                                    }}
                                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                    title="Reset Kata Sandi Akun"
                                  >
                                    <KeyRound className="h-4 w-4" />
                                  </button>

                                  {t.bisa_hapus_permanen ? (
                                    <button
                                      onClick={() => setDeletingTeacher(t)}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                      title="Hapus Data Guru"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setDeletingTeacher(t)}
                                      className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                                      title="Arsipkan Guru (Memiliki Histori Akademik)"
                                    >
                                      <Archive className="h-4 w-4" />
                                    </button>
                                  )}
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">
              {sortedTeachers.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}
            </span>{" "}
            sampai{" "}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * rowsPerPage, sortedTeachers.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-700">{sortedTeachers.length}</span> guru
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Baris:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Guru Baru */}
      {isCreateOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#2563EB]" />
                  Tambah Data Pendidik / Guru Baru
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
                {/* Pas Foto Guru */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="relative w-16 h-16 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                    {createPhoto ? (
                      <img src={createPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-xs font-semibold text-slate-700">
                      Pas Foto Guru (Opsional)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Format JPG, PNG, atau WebP (Maksimal 2MB, proporsi 1:1 lingkaran)
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
                      NIP (Nomor Induk Pegawai)
                    </label>
                    <input
                      name="nip"
                      placeholder="Contoh: 198501152010011002"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      NUPTK (Opsional)
                    </label>
                    <input
                      name="nuptk"
                      placeholder="Contoh: 1234567890123456"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Gelar Depan
                    </label>
                    <input
                      name="gelar_depan"
                      placeholder="Drs., Dr., Ir."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Lengkap Guru *
                    </label>
                    <input
                      name="nama_lengkap"
                      required
                      placeholder="Nama lengkap tanpa gelar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Gelar Belakang
                    </label>
                    <input
                      name="gelar_belakang"
                      placeholder="S.Pd., M.Kom."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Jenis Kelamin *
                    </label>
                    <select
                      name="jenis_kelamin"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      name="tanggal_lahir"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Status Kepegawaian *
                    </label>
                    <select
                      name="status_kepegawaian"
                      required
                      defaultValue="TETAP"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    >
                      <option value="TETAP">Guru Tetap Yayasan/Sekolah</option>
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                      <option value="HONORER">Guru Honorer / Tidak Tetap</option>
                      <option value="KONTRAK">Guru Kontrak</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="guru@sekolah.sch.id"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Telepon / WhatsApp
                    </label>
                    <input
                      name="telepon"
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Alamat Domisili
                  </label>
                  <input
                    name="alamat"
                    placeholder="Alamat tempat tinggal guru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                  />
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
                    {isPending ? "Menyimpan..." : "Simpan Guru"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Edit Guru */}
      {editingTeacher &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-[#2563EB]" />
                  Edit Data Guru
                </h3>
                <button
                  onClick={() => setEditingTeacher(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleEditSubmit}
                className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm"
              >
                <input type="hidden" name="id" value={editingTeacher.id} />
                <input type="hidden" name="sekolah_id" value={editingTeacher.sekolah_id} />

                {/* Pas Foto Guru */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="relative w-16 h-16 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                    {editPhoto ? (
                      <img src={editPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-xs font-semibold text-slate-700">
                      Pas Foto Guru (Opsional)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Format JPG, PNG, atau WebP (Maksimal 2MB, proporsi 1:1 lingkaran)
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1">NIP</label>
                    <input
                      name="nip"
                      defaultValue={editingTeacher.nip || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">NUPTK</label>
                    <input
                      name="nuptk"
                      defaultValue={editingTeacher.nuptk || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Gelar Depan
                    </label>
                    <input
                      name="gelar_depan"
                      defaultValue={editingTeacher.gelar_depan || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Lengkap Guru *
                    </label>
                    <input
                      name="nama_lengkap"
                      required
                      defaultValue={editingTeacher.nama_lengkap}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Gelar Belakang
                    </label>
                    <input
                      name="gelar_belakang"
                      defaultValue={editingTeacher.gelar_belakang || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Status Kepegawaian
                    </label>
                    <select
                      name="status_kepegawaian"
                      defaultValue={editingTeacher.status_kepegawaian}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    >
                      <option value="TETAP">Guru Tetap</option>
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                      <option value="HONORER">Guru Honorer</option>
                      <option value="KONTRAK">Guru Kontrak</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Status Lifecycle
                    </label>
                    <select
                      name="status_lifecycle"
                      defaultValue={
                        editingTeacher.status_lifecycle ||
                        (editingTeacher.status_aktif ? "AKTIF" : "NONAKTIF")
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    >
                      <option value="AKTIF">Aktif Mengajar</option>
                      <option value="NONAKTIF">Nonaktif</option>
                      <option value="ARSIP">Arsip</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Telepon
                    </label>
                    <input
                      name="telepon"
                      defaultValue={editingTeacher.telepon || ""}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTeacher(null)}
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

      {/* Modal: Konfirmasi Hapus / Arsip Guru (Domain Protected) */}
      {deletingTeacher &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              {deletingTeacher.bisa_hapus_permanen ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Hapus Data Guru</h3>
                      <p className="text-xs text-slate-500">{deletingTeacher.nama_dengan_gelar}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Guru ini belum pernah memiliki penugasan atau data akademik. Profil guru{" "}
                    <strong>{deletingTeacher.nama_dengan_gelar}</strong> akan dihapus secara
                    permanen dari sistem.
                  </p>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeletingTeacher(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleDeleteSubmit}
                      disabled={isPending}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
                    >
                      {isPending ? "Menghapus..." : "Hapus Permanen"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                      <Archive className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">
                        Histori Akademik Terdeteksi
                      </h3>
                      <p className="text-xs text-slate-500">{deletingTeacher.nama_dengan_gelar}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-800">
                      <ShieldAlert className="h-4 w-4 text-purple-600" />
                      <span>Hard Delete Dilarang</span>
                    </div>
                    <p className="leading-relaxed">
                      Guru tidak dapat dihapus permanen karena memiliki histori akademik (
                      {deletingTeacher.jumlah_histori_akademik || 0} data terkait: penugasan,
                      jadwal, atau sesi KBM). Gunakan Arsip untuk menyembunyikan dari operasional.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeletingTeacher(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    {deletingTeacher.status_aktif && (
                      <button
                        onClick={handleDeactivateSubmit}
                        disabled={isPending}
                        className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs disabled:opacity-50"
                      >
                        {isPending ? "Memproses..." : "Nonaktifkan"}
                      </button>
                    )}
                    <button
                      onClick={() => handleArchiveSubmit(deletingTeacher.id)}
                      disabled={isPending}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50"
                    >
                      {isPending ? "Mengarsipkan..." : "Arsipkan Guru"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Konfirmasi Bulk Delete */}
      {isBulkDeleteOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Konfirmasi Hapus Massal</h3>
                  <p className="text-xs text-slate-500">{selectedIds.size} data guru dipilih</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Perlindungan Histori Akademik Aktif:</p>
                <p className="leading-relaxed">
                  Guru yang belum memiliki histori akademik akan dihapus permanen. Guru yang telah
                  memiliki histori akademik (penugasan, jadwal, sesi KBM) akan otomatis dialihkan ke
                  status <strong>Arsip</strong> agar integritas data sekolah tetap terjaga.
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
                  {isPending ? "Memproses..." : "Lanjutkan Hapus & Arsip"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal: Reset Password Guru */}
      {resettingTeacher &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Reset Kata Sandi Guru</h3>
                  <p className="text-xs text-slate-500">{resettingTeacher.nama_dengan_gelar}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Akun guru akan di-reset dan diwajibkan membuat kata sandi baru pada saat login
                  berikutnya. Status akun yang terkunci akan otomatis dipulihkan.
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
                    setResettingTeacher(null);
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

      {/* Modal: Hasil Reset Password (Dialog Salin Kredensial) */}
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
                  <p className="text-xs text-slate-500">{resetResultData.teacherName}</p>
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
                Salin kredensial di atas dan sampaikan secara privat kepada guru yang bersangkutan.
                Guru akan diminta membuat kata sandi baru saat pertama kali login.
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

      {/* Modal Detail Guru */}
      {detailTeacher && (
        <TeacherDetailModal
          teacher={detailTeacher}
          assignments={teachingAssignments}
          homerooms={homeroomAssignments}
          onClose={() => setDetailTeacher(null)}
        />
      )}
    </div>
  );
}
