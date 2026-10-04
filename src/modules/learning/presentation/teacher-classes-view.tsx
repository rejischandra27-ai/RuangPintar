"use client";

/**
 * Ruang Pintar — M11 Teacher Classes Workspace (/kelas-saya)
 * Enterprise-Grade Professional Redesign (Flat, Clean, Minimalist, Motion-Driven)
 */

import React, { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  Table2,
  Plus,
  Camera,
  Filter,
  Clock,
  Users,
  BookOpen,
  ArrowRight,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Check,
  AlertCircle,
  MoreVertical,
  PlayCircle,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "@/shared/components/motion/motion-elements";
import { TeacherClassCardDTO } from "../domain/learning-types";
import { ManualCreateClassModal } from "./manual-create-class-modal";
import { QuickSetScheduleModal } from "./quick-set-schedule-modal";
import { ManageCurriculumModal } from "./manage-curriculum-modal";
import { Toast, ToastType } from "@/shared/components/ui/toast";
import { deleteRombelAction, updateRombelAction } from "@/app/actions/academic-actions";

export interface TeacherSimpleDTO {
  id: string;
  nama_lengkap: string;
  gelar_depan: string | null;
  gelar_belakang: string | null;
  total_kelas: number;
}

interface TeacherClassesViewProps {
  classes: TeacherClassCardDTO[];
  teacherName?: string;
  isAdmin?: boolean;
  teachersList?: TeacherSimpleDTO[];
  initialSelectedGuruId?: string | null;
  isSubscribed?: boolean;
  isTenantOwner?: boolean;
}

export function TeacherClassesView({
  classes,
  teacherName,
  isAdmin = false,
  teachersList = [],
  initialSelectedGuruId = null,
  isSubscribed = false,
  isTenantOwner = false,
}: TeacherClassesViewProps) {
  const router = useRouter();

  // 1. Filter, Search & View Mode States
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "TODAY" | "UNSCHEDULED">("ALL");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("ALL");
  const [selectedGuruId, setSelectedGuruId] = useState<string>(initialSelectedGuruId || "ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [openActionMenuRombelId, setOpenActionMenuRombelId] = useState<string | null>(null);

  useEffect(() => {
    if (!openActionMenuRombelId) return;
    const handleClickOutside = () => setOpenActionMenuRombelId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [openActionMenuRombelId]);

  // 2. Modals State
  const [scheduleModalTarget, setScheduleModalTarget] = useState<TeacherClassCardDTO | null>(null);
  const [classActionTarget, setClassActionTarget] = useState<{ id: string; nama: string } | null>(
    null
  );
  const [classActionMode, setClassActionMode] = useState<"rename" | "delete" | null>(null);
  const [isManageCurriculumOpen, setIsManageCurriculumOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [classActionLoading, setClassActionLoading] = useState(false);
  const [classActionError, setClassActionError] = useState<string | null>(null);

  // 3. Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const handleOpenAiPhoto = () => {
    setIsActionsDropdownOpen(false);
    window.dispatchEvent(new CustomEvent("open-ai-photo-modal"));
  };

  const handleOpenManualClass = () => {
    setIsActionsDropdownOpen(false);
    window.dispatchEvent(new CustomEvent("open-manual-class-modal"));
  };

  // Hitung jumlah kelas hari ini & belum terjadwal dari dataset awal
  const todayClassesTotal = useMemo(() => {
    return classes.filter((c) => Boolean(c.jadwal_hari_ini)).length;
  }, [classes]);

  const unscheduledClassesTotal = useMemo(() => {
    return classes.filter((c) => !c.jadwal_ringkas || c.jumlah_jam_minggu === 0).length;
  }, [classes]);

  // Daftar tingkat unik untuk filter dropdown
  const uniqueTingkats = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.tingkat_nama) set.add(c.tingkat_nama);
    });
    return Array.from(set).sort();
  }, [classes]);

  // Metrik Siswa Binaan Unik (Domain Invariant: 1 siswa terdaftar di 1 rombel dihitung 1 kali)
  const distinctSiswaCount = useMemo(() => {
    const rombelStudentsMap = new Map<string, number>();
    classes.forEach((c) => {
      const current = rombelStudentsMap.get(c.rombel_id) || 0;
      if (c.total_siswa > current) {
        rombelStudentsMap.set(c.rombel_id, c.total_siswa);
      }
    });
    return Array.from(rombelStudentsMap.values()).reduce((sum, count) => sum + count, 0);
  }, [classes]);

  // Metrik Tambahan untuk 4 Kartu Informasi Atas
  const uniqueRombelsCount = useMemo(() => {
    return new Set(classes.map((c) => c.rombel_id)).size;
  }, [classes]);

  const uniqueMapelsCount = useMemo(() => {
    return new Set(classes.map((c) => c.mata_pelajaran_id)).size;
  }, [classes]);

  const totalPenugasanCount = classes.length;

  const totalJP = useMemo(() => {
    return classes.reduce((sum, c) => sum + c.jumlah_jam_minggu, 0);
  }, [classes]);

  const totalBAB = useMemo(() => {
    return classes.reduce((sum, c) => sum + c.total_bab, 0);
  }, [classes]);

  // Filtering data reaktif
  const filtered = useMemo(() => {
    return classes.filter((c) => {
      // Filter status tab operasional
      if (statusTab === "TODAY" && !c.jadwal_hari_ini) {
        return false;
      }
      if (statusTab === "UNSCHEDULED" && c.jadwal_ringkas && c.jumlah_jam_minggu > 0) {
        return false;
      }
      // Filter guru (admin)
      if (isAdmin && selectedGuruId !== "ALL" && c.guru_id !== selectedGuruId) {
        return false;
      }
      // Filter tingkat
      if (selectedTingkat !== "ALL" && c.tingkat_nama !== selectedTingkat) {
        return false;
      }
      // Filter pencarian teks
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchRombel = c.rombel_nama.toLowerCase().includes(query);
        const matchMapel = c.mata_pelajaran_nama.toLowerCase().includes(query);
        const matchKode = c.mata_pelajaran_kode.toLowerCase().includes(query);
        const matchGuru = c.guru_nama && c.guru_nama.toLowerCase().includes(query);
        if (!matchRombel && !matchMapel && !matchKode && !matchGuru) {
          return false;
        }
      }
      return true;
    });
  }, [classes, statusTab, isAdmin, selectedGuruId, selectedTingkat, search]);

  // Paginasi
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const pagedClasses = filtered.slice(startIndex, startIndex + pageSize);

  const handleResetFilters = () => {
    setSearch("");
    setStatusTab("ALL");
    setSelectedTingkat("ALL");
    setSelectedGuruId("ALL");
    setCurrentPage(1);
  };

  async function handleRenameRombel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classActionTarget || !isTenantOwner) return;

    setClassActionLoading(true);
    setClassActionError(null);
    const formData = new FormData();
    formData.set("nama", String(new FormData(event.currentTarget).get("nama") ?? ""));
    const response = await updateRombelAction(classActionTarget.id, formData);
    if (response.success) {
      setClassActionTarget(null);
      setClassActionMode(null);
      router.refresh();
    } else {
      setClassActionError(response.error);
    }
    setClassActionLoading(false);
  }

  async function handleDeleteRombel() {
    if (!classActionTarget || !isTenantOwner) return;

    setClassActionLoading(true);
    setClassActionError(null);
    const response = await deleteRombelAction(classActionTarget.id);
    if (response.success) {
      setClassActionTarget(null);
      setClassActionMode(null);
      router.refresh();
    } else {
      setClassActionError(response.error);
    }
    setClassActionLoading(false);
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* Modal Dialogs */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      <ManageCurriculumModal
        isOpen={isManageCurriculumOpen}
        onClose={() => setIsManageCurriculumOpen(false)}
        classes={classes}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <ManualCreateClassModal />

      {scheduleModalTarget && (
        <QuickSetScheduleModal
          isOpen={!!scheduleModalTarget}
          onClose={() => setScheduleModalTarget(null)}
          rombelId={scheduleModalTarget.rombel_id}
          penugasanId={scheduleModalTarget.id}
          rombelNama={scheduleModalTarget.rombel_nama}
          mataPelajaranNama={scheduleModalTarget.mata_pelajaran_nama}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. MINIMALIST PAGE HEADER (Linear / Stripe Standard)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAdmin ? "Supervisi Kelas Sekolah" : "Kelas Saya"}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 font-mono text-[11px] font-bold">
              Semester Aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? `Supervisi seluruh rombel dan kurikulum (${classes.length} kelas aktif).`
              : `${classes.length} kelas diampu • Pantau pembelajaran, absensi, dan materi ajar.`}
          </p>
        </div>

        {/* Action Buttons di Sudut Kanan Header */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {isSubscribed ? (
            <>
              <button
                type="button"
                onClick={() => setIsManageCurriculumOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 font-mono text-xs font-bold shadow-2xs transition-all cursor-pointer hover:border-blue-300 active:scale-95"
                title="Pusat Kurikulum: Kelola BAB dan Terbitkan Materi ke Seluruh Kelas Paralel"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Kelola BAB & Materi</span>
              </button>
              <Link
                href="/penugasan"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                <span>+ Buat Penugasan</span>
              </Link>
              <Link
                href="/sesi-pembelajaran"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-mono text-xs font-bold shadow-xs shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>+ Buka Sesi KBM</span>
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenManualClass}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white font-mono text-xs font-bold shadow-xs shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah Kelas Manual</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAiPhoto}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5 text-blue-600" />
                <span>+ Foto Absen AI</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 METRIC CARDS (Rombel Diajar, Beban KBM, Siswa Binaan, Lingkup Materi)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Rombel Diajar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
              Rombel Diajar
            </span>
            <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
              <Layers className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white group-hover:text-[#2563EB] transition-colors">
              {uniqueRombelsCount}
            </span>
            <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
              Rombel
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
            {totalPenugasanCount} Penugasan KBM Aktif
          </span>
        </div>

        {/* Metric 2: Beban KBM */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
              Beban KBM
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
              <Clock className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 transition-colors">
              {totalJP}
            </span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
              JP / Minggu
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
            Beban Tatap Muka Terjadwal
          </span>
        </div>

        {/* Metric 3: Siswa Binaan */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
              Siswa Binaan
            </span>
            <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
              <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 group-hover:text-purple-700 transition-colors">
              {distinctSiswaCount}
            </span>
            <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
              Siswa
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
            Peserta Didik Aktif Terdaftar
          </span>
        </div>

        {/* Metric 4: Lingkup Materi */}
        <div
          onClick={() => setIsManageCurriculumOpen(true)}
          title="Klik untuk Kelola BAB & Materi ke Seluruh Kelas"
          className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
              Lingkup Materi
            </span>
            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
              <GraduationCap className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 group-hover:text-amber-700 transition-colors">
              {totalBAB}
            </span>
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
              BAB Materi
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
            Modul & Tujuan Pembelajaran
          </span>
        </div>
      </div>

      {/* Alert Banner Jam Mengajar jika ada yang belum diatur */}
      {unscheduledClassesTotal > 0 && (
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold">
              {unscheduledClassesTotal} Rombel Belum Memiliki Jam Mengajar
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const target = classes.find((c) => !c.jadwal_ringkas || c.jumlah_jam_minggu === 0);
              if (target) setScheduleModalTarget(target);
            }}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            + Atur Jam
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. UNIFIED WORKSPACE TOOLBAR (Satu Baris Tunggal ala Linear/Stripe)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Sisi Kiri: Search Input + Tab Status Kontekstual */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* A. Search Box Terpadu */}
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                isAdmin ? "Cari rombel, mapel, kode, guru..." : "Cari rombel atau mata pelajaran..."
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* B. Tab Filter Kontekstual dengan Sliding Pill Indicator */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-xs font-semibold overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setStatusTab("ALL");
                setCurrentPage(1);
              }}
              className={`relative px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusTab === "ALL"
                  ? "text-[#2563EB] dark:text-blue-400 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {statusTab === "ALL" && (
                <motion.div
                  layoutId="activeFilterPill"
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <span className="relative z-10">Semua ({classes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("TODAY");
                setCurrentPage(1);
              }}
              className={`relative px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                statusTab === "TODAY"
                  ? "text-[#2563EB] dark:text-blue-400 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {statusTab === "TODAY" && (
                <motion.div
                  layoutId="activeFilterPill"
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-2xs"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Hari Ini ({todayClassesTotal})</span>
              </span>
            </button>

            {unscheduledClassesTotal > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusTab("UNSCHEDULED");
                  setCurrentPage(1);
                }}
                className={`relative px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  statusTab === "UNSCHEDULED"
                    ? "text-amber-700 dark:text-amber-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {statusTab === "UNSCHEDULED" && (
                  <motion.div
                    layoutId="activeFilterPill"
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-2xs"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  <span>Belum Diatur ({unscheduledClassesTotal})</span>
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sisi Kanan: Dropdown Filter Tingkat + Filter Guru (Admin) + Toggle Grid/Tabel */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
          {/* Filter Tingkat */}
          {uniqueTingkats.length > 1 && (
            <div className="relative">
              <select
                value={selectedTingkat}
                onChange={(e) => {
                  setSelectedTingkat(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
              >
                <option value="ALL">Semua Tingkat</option>
                {uniqueTingkats.map((tk) => (
                  <option key={tk} value={tk}>
                    {tk}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Guru (Khusus Supervisi Admin) */}
          {isAdmin && (
            <div className="relative">
              <select
                value={selectedGuruId}
                onChange={(e) => {
                  setSelectedGuruId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">Semua Guru ({teachersList.length})</option>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.gelar_depan ? `${t.gelar_depan} ` : ""}
                    {t.nama_lengkap}
                    {t.gelar_belakang ? `, ${t.gelar_belakang}` : ""} ({t.total_kelas})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters jika ada filter aktif */}
          {(search ||
            statusTab !== "ALL" ||
            selectedTingkat !== "ALL" ||
            selectedGuruId !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Reset semua filter"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          {/* View Mode Toggle: Grid ⊞ vs Table ☰ */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "GRID"
                  ? "bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Tampilan Kartu Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "TABLE"
                  ? "bg-white dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Tampilan Tabel Ringkas"
            >
              <Table2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CLASS DIRECTORY WORKSPACE CONTENT (Grid / Table)
      ───────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Tidak ada kelas yang ditemukan
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `Tidak ada kelas yang cocok dengan kata kunci "${search}".`
                : statusTab === "TODAY"
                  ? "Tidak ada jadwal mengajar pada hari ini."
                  : "Belum ada penugasan kelas yang cocok dengan filter yang dipilih."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Tampilkan Semua Kelas</span>
          </button>
        </div>
      ) : viewMode === "GRID" ? (
        /* A. FLAT ENTERPRISE CARD GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {pagedClasses.map((c) => {
            const isUnscheduled = !c.jadwal_ringkas || c.jumlah_jam_minggu === 0;
            const hasScheduleToday = !isUnscheduled && Boolean(c.jadwal_hari_ini);

            return (
              <motion.div
                key={c.id}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 sm:p-5 flex flex-col justify-between gap-3.5 group relative"
              >
                <div className="space-y-3">
                  {/* Row 1: Nama Rombel Ukuran Besar, Tingkat, Kode Mapel & Titik 3 Control (Owner Only) */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Nama Rombel Ukuran Besar */}
                        <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                          {c.rombel_nama}
                        </h3>
                        {c.tingkat_nama && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                            {c.tingkat_nama}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 truncate"
                        title={c.mata_pelajaran_nama}
                      >
                        {c.mata_pelajaran_nama}
                      </p>
                    </div>

                    {/* Sisi Kanan Atas: Kode Mapel Badge & Titik 3 Control */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
                        {c.mata_pelajaran_kode}
                      </span>

                      {/* Kontrol Titik 3 (Hanya untuk Guru Mandiri / Workspace Owner) */}
                      {isTenantOwner && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuRombelId(
                                openActionMenuRombelId === c.rombel_id ? null : c.rombel_id
                              );
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Menu Kelas"
                            aria-label="Menu Kelas"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {/* Dropdown Menu Popover Titik 3 */}
                          <div
                            className={`absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 transition-all ${
                              openActionMenuRombelId === c.rombel_id
                                ? "opacity-100 scale-100 pointer-events-auto"
                                : "opacity-0 scale-95 pointer-events-none"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuRombelId(null);
                                setClassActionTarget({ id: c.rombel_id, nama: c.rombel_nama });
                                setClassActionMode("rename");
                                setClassActionError(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              <span>Ubah Nama Kelas</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuRombelId(null);
                                setClassActionTarget({ id: c.rombel_id, nama: c.rombel_nama });
                                setClassActionMode("delete");
                                setClassActionError(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              <span>Hapus Kelas</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Jadwal & Status Operasional KBM */}
                  <div className="pt-0.5">
                    {isUnscheduled ? (
                      <div className="flex items-center justify-between text-xs bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-900/50 font-mono">
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Jam Belum Diatur</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setScheduleModalTarget(c)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          + Atur Jam
                        </button>
                      </div>
                    ) : hasScheduleToday ? (
                      <div className="flex items-center gap-2 text-xs text-[#2563EB] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/50 font-mono">
                        <span className="size-2 rounded-full bg-[#2563EB] animate-pulse" />
                        <span className="font-bold">Hari Ini: {c.jadwal_hari_ini}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.jadwal_ringkas}</span>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Avatar Stack Siswa (Kiri) & Beban JP (Kanan) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {/* Avatar Stack Siswa (3-5 Lingkaran Bertumpuk) */}
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {c.total_siswa > 0 ? (
                          Array.from({ length: Math.min(3, c.total_siswa) }).map((_, idx) => {
                            const colors = [
                              "bg-blue-500 text-white",
                              "bg-emerald-500 text-white",
                              "bg-purple-500 text-white",
                              "bg-amber-500 text-white",
                            ];
                            return (
                              <div
                                key={idx}
                                className={`inline-flex items-center justify-center size-5.5 sm:size-6 rounded-full ring-2 ring-white dark:ring-slate-900 text-[9px] font-bold ${colors[idx % colors.length]}`}
                                title={`Siswa ${idx + 1}`}
                              >
                                {String.fromCharCode(65 + (idx % 26))}
                              </div>
                            );
                          })
                        ) : (
                          <div className="inline-flex items-center justify-center size-5.5 sm:size-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-400 text-[9px]">
                            -
                          </div>
                        )}
                        {c.total_siswa > 3 && (
                          <div className="inline-flex items-center justify-center size-5.5 sm:size-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] font-bold font-mono">
                            +{c.total_siswa - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {c.total_siswa} Siswa
                      </span>
                    </div>

                    {/* Beban JP Mengajar */}
                    <span className="font-bold font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                      {c.jumlah_jam_minggu} JP
                    </span>
                  </div>

                  {/* Wali Kelas jika ada */}
                  {c.wali_kelas_nama && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Wali:{" "}
                      <strong className="font-semibold text-slate-700 dark:text-slate-300">
                        {c.wali_kelas_nama}
                      </strong>
                    </div>
                  )}

                  {/* Guru Pengampu (jika mode supervisi admin) */}
                  {isAdmin && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Guru:{" "}
                      <strong className="font-semibold text-slate-700 dark:text-slate-300">
                        {c.guru_nama}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Row 4: Action Footer (Hanya Presensi & Kelola Kelas) */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/kelas-saya/${c.id}?tab=PRESENSI`}
                    className="px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    title="Buka form presensi kelas"
                  >
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>Presensi</span>
                  </Link>

                  <Link
                    href={`/kelas-saya/${c.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-2xs shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Kelola Kelas</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* B. COMPACT DATA TABLE VIEW */
        <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] font-mono">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">No</th>
                  <th className="py-2.5 px-4">Rombel</th>
                  <th className="py-2.5 px-4">Mata Pelajaran</th>
                  <th className="py-2.5 px-4">Jadwal Mengajar</th>
                  <th className="py-2.5 px-4 text-center">Beban</th>
                  <th className="py-2.5 px-4 text-center">Siswa</th>
                  {isAdmin && <th className="py-2.5 px-4">Guru</th>}
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {pagedClasses.map((c, index) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {startIndex + index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {c.rombel_nama}
                      {c.tingkat_nama && (
                        <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                          ({c.tingkat_nama})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.mata_pelajaran_nama}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {c.mata_pelajaran_kode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {c.jadwal_hari_ini ? (
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold">
                          Hari Ini: {c.jadwal_hari_ini}
                        </span>
                      ) : c.jadwal_ringkas ? (
                        <span>{c.jadwal_ringkas}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setScheduleModalTarget(c)}
                          className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 text-[10px] font-bold cursor-pointer"
                        >
                          + Atur Jam
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {c.jumlah_jam_minggu} JP
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {c.total_siswa} Siswa
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {c.guru_nama}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/kelas-saya/${c.id}?tab=PRESENSI`}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                        >
                          Presensi
                        </Link>
                        <Link
                          href={`/kelas-saya/${c.id}`}
                          className="px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-bold"
                        >
                          Kelola Kelas
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. PAGINATION BAR (Minimalist Bottom Controls)
      ───────────────────────────────────────────────────────────── */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800">
          <span>
            Menampilkan{" "}
            <strong className="text-slate-800 dark:text-white font-mono">{startIndex + 1}</strong> -{" "}
            <strong className="text-slate-800 dark:text-white font-mono">
              {Math.min(startIndex + pageSize, filtered.length)}
            </strong>{" "}
            dari{" "}
            <strong className="text-slate-800 dark:text-white font-mono">{filtered.length}</strong>{" "}
            kelas
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-2xs"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono font-bold px-2 text-slate-800 dark:text-slate-200">
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-2xs"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL RENAME & DELETE ROMBEL (Khusus Tenant Owner)
      ───────────────────────────────────────────────────────────── */}
      {classActionTarget && classActionMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-action-title"
            className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="class-action-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {classActionMode === "rename" ? "Ubah Nama Kelas" : "Hapus Kelas?"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{classActionTarget.nama}</p>
              </div>
              <button
                type="button"
                aria-label="Tutup dialog"
                onClick={() => {
                  setClassActionTarget(null);
                  setClassActionMode(null);
                }}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {classActionMode === "rename" ? (
              <form onSubmit={handleRenameRombel} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="rombel-name"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Nama Kelas
                  </label>
                  <input
                    id="rombel-name"
                    name="nama"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={classActionTarget.nama}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
                {classActionError && (
                  <p role="alert" className="text-xs text-rose-700">
                    {classActionError}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={classActionLoading}
                    onClick={() => {
                      setClassActionTarget(null);
                      setClassActionMode(null);
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={classActionLoading}
                    className="rounded-lg bg-[#2563EB] hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    {classActionLoading ? "Menyimpan..." : "Simpan Nama Kelas"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Kelas akan dihapus dari workspace aktif. Riwayat presensi, penilaian, dan
                  pembelajaran tetap tersimpan aman di database.
                </p>
                {classActionError && (
                  <p role="alert" className="text-xs text-rose-700">
                    {classActionError}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={classActionLoading}
                    onClick={() => {
                      setClassActionTarget(null);
                      setClassActionMode(null);
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={classActionLoading}
                    onClick={handleDeleteRombel}
                    className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    {classActionLoading ? "Menghapus..." : "Konfirmasi Hapus"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
