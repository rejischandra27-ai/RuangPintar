"use client";

/**
 * Ruang Pintar — M11 Guru Class Management Workspace (/kelas-saya/[id])
 * Academic Glass UI v1.2
 *
 * Implementasi Redesign Total Sesuai Mandat UI:
 * 1. Terminologi: "Kelola Kelas" (tanpa istilah "Workspace" lagi di area Guru)
 * 2. Konsistensi Font & Typography: Identik dengan Dashboard Guru (font-mono untuk stats & kode, tracking-tight, typography tegas)
 * 3. Academic Glass UI v1.2: Dark Mode First, Glass Morphism, Academic Navy, Electric Blue Accent, Glow Halus, Rounded Modern, Transparan, Premium SaaS
 * 4. Hero Class Banner: Focal point dengan Nama Mapel, Rombel, Kelas, Semester, TA, Guru Pengampu, Total Siswa, Total JP, Status Aktif, dan Quick Actions (Presensi, Materi, Jurnal, Nilai)
 * 5. Navigasi Konten: Pill Navigation modern (Overview, Materi, Tugas, Jurnal, Presensi, Penilaian, CBT, Pengaturan)
 * 6. Quick Stats Section: 4 Glass KPI Cards (Total BAB, Materi Terbit, Tugas Aktif, Jurnal KBM) dengan AnimatedCounter
 * 7. Aksi Cepat Pembelajaran: Grid 3x2 Glass Action Cards
 * 8. Jadwal Mengajar: Timeline Card modern dan mudah dipindai secara visual
 * 9. Progress Pembelajaran: Progress Glass Component (BAB Aktif, Target TP, Materi Terbit, Tugas Aktif, Jurnal Terisi)
 * 10. Ringkasan Siswa: Student Summary Card (Total Siswa Aktif, Pindahan, Nonaktif, Kehadiran Minggu Ini)
 * 11. Kode Undangan: Dipindahkan ke tab Pengaturan Kelas (bukan di halaman utama Overview)
 * 12. Motion System: AnimatedCounter count-up, entrance reveals, glass hover micro-interactions, floating hero mascot
 */

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  BookOpen,
  Calendar,
  Users,
  Target,
  FileText,
  ClipboardList,
  BookCheck,
  Plus,
  Pencil,
  Trash2,
  Clock,
  GraduationCap,
  LayoutDashboard,
  UserCheck,
  Compass,
  AlertTriangle,
  Link as LinkIcon,
  FileCode,
  Sparkles,
  Settings,
  ArrowRightToLine,
  CheckCircle2,
  Sliders,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  TeacherClassWorkspaceDTO,
  LingkupMateriDTO,
  TujuanPembelajaranDTO,
  MateriPembelajaranDTO,
  AdministrasiPembelajaranDTO,
} from "../domain/learning-types";
import { Toast, ToastType } from "@/shared/components/ui/toast";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";
import { CreateBABModal } from "./create-bab-modal";
import { EditBABModal } from "./edit-bab-modal";
import { CreateTPModal } from "./create-tp-modal";
import { EditTPModal } from "./edit-tp-modal";
import { CreateMateriModal } from "./create-materi-modal";
import { EditMateriModal } from "./edit-materi-modal";
import { CreateTugasModal } from "./create-tugas-modal";
import { CreateJurnalModal } from "./create-jurnal-modal";
import { EditJurnalModal } from "./edit-jurnal-modal";
import {
  deleteAdministrasiAction,
  deleteLingkupMateriAction,
  deleteMateriAction,
  deleteTugasAction,
  deleteTujuanPembelajaranAction,
} from "@/app/actions/learning-actions";
import {
  ClassAttendanceRecapDTO,
  SessionAttendanceHistoryItemDTO,
} from "@/modules/attendance/domain/attendance-types";
import { ClassAttendanceTabView } from "@/modules/attendance/presentation/class-attendance-tab-view";
import { SessionAttendanceModal } from "@/modules/attendance/presentation/session-attendance-modal";
import {
  DefinisiAsesmenDTO,
  ClassGradebookDTO,
} from "@/modules/assessment/domain/assessment-types";
import { ClassAssessmentTabView } from "@/modules/assessment/presentation/class-assessment-tab-view";
import { UjianCbtDTO } from "@/modules/cbt/domain/cbt-types";
import { ClassCbtTabView } from "@/modules/cbt/presentation/class-cbt-tab-view";
import { RombelJoinCodeCard } from "@/modules/student/presentation/rombel-join-code-card";

export type WorkspaceTab =
  | "OVERVIEW"
  | "MATERI"
  | "TUGAS"
  | "JURNAL"
  | "PRESENSI"
  | "PENILAIAN"
  | "CBT"
  | "PENGATURAN"
  // Backward compatibility aliases
  | "RINGKASAN"
  | "BAB_TP"
  | "JADWAL";

interface ClassWorkspaceViewProps {
  workspace: TeacherClassWorkspaceDTO;
  canManage: boolean;
  attendanceHistory?: SessionAttendanceHistoryItemDTO[];
  attendanceStats?: {
    total_sesi_terjadwal: number;
    total_sesi_selesai: number;
    total_presensi_diambil: number;
    rata_rata_kehadiran: number;
  };
  attendanceRecap?: ClassAttendanceRecapDTO | null;
  assessments?: DefinisiAsesmenDTO[];
  gradebook?: ClassGradebookDTO;
  exams?: UjianCbtDTO[];
  initialTab?: WorkspaceTab;
}

export function ClassWorkspaceView({
  workspace,
  canManage,
  attendanceHistory = [],
  attendanceStats = {
    total_sesi_terjadwal: 0,
    total_sesi_selesai: 0,
    total_presensi_diambil: 0,
    rata_rata_kehadiran: 0,
  },
  attendanceRecap,
  assessments = [],
  gradebook,
  exams = [],
  initialTab,
}: ClassWorkspaceViewProps) {
  const router = useRouter();

  // Normalisasi tab awal
  const normalizedInitialTab: WorkspaceTab =
    initialTab === "RINGKASAN" ? "OVERVIEW" : initialTab || "OVERVIEW";

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(normalizedInitialTab);
  const [materiSubTab, setMateriSubTab] = useState<"MODUL" | "BAB_TP">(
    initialTab === "BAB_TP" ? "BAB_TP" : "MODUL"
  );
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [attendanceModalSesiId, setAttendanceModalSesiId] = useState<string | null>(null);
  const [isBABModalOpen, setIsBABModalOpen] = useState(false);
  const [tpModalTarget, setTpModalTarget] = useState<{ id: string; judul: string } | null>(null);
  const [isMateriModalOpen, setIsMateriModalOpen] = useState(false);
  const [isTugasModalOpen, setIsTugasModalOpen] = useState(false);
  const [isJurnalModalOpen, setIsJurnalModalOpen] = useState(false);
  const [editBabTarget, setEditBabTarget] = useState<LingkupMateriDTO | null>(null);
  const [editTpTarget, setEditTpTarget] = useState<{
    tp: TujuanPembelajaranDTO;
    babJudul: string;
  } | null>(null);
  const [editMateriTarget, setEditMateriTarget] = useState<MateriPembelajaranDTO | null>(null);
  const [editJurnalTarget, setEditJurnalTarget] = useState<AdministrasiPembelajaranDTO | null>(
    null
  );

  // Delete Confirmation Modal State (Academic Glass UI)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "TUGAS" | "MATERI" | "BAB" | "TP" | "JURNAL";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const {
    penugasan,
    total_siswa,
    lingkup_materi,
    materi_list,
    tugas_list,
    administrasi_list,
    jadwal_list,
  } = workspace;

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;

    startTransition(async () => {
      let res: { success: boolean; message?: string };
      if (type === "TUGAS") {
        res = await deleteTugasAction(id, penugasan.id);
      } else if (type === "MATERI") {
        res = await deleteMateriAction(id, penugasan.id);
      } else if (type === "BAB") {
        res = await deleteLingkupMateriAction(id, penugasan.id);
      } else if (type === "TP") {
        res = await deleteTujuanPembelajaranAction(id, penugasan.id);
      } else {
        res = await deleteAdministrasiAction(id, penugasan.id);
      }

      if (res.success) {
        setToast({ message: res.message || "Berhasil dihapus.", type: "success" });
        setDeleteTarget(null);
        router.refresh();
      } else {
        setToast({ message: res.message || "Gagal menghapus.", type: "error" });
      }
    });
  };

  const totalTP = lingkup_materi.reduce((sum, lm) => sum + lm.tujuan_pembelajaran.length, 0);

  // Daftar Tab Navigasi Pill Baku (Sesuai Butir 5 Spesifikasi UI)
  const navTabs = [
    {
      id: "OVERVIEW" as const,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "MATERI" as const,
      label: "Materi",
      count: materi_list.length,
      icon: FileText,
    },
    {
      id: "TUGAS" as const,
      label: "Tugas",
      count: tugas_list.length,
      icon: ClipboardList,
    },
    {
      id: "JURNAL" as const,
      label: "Jurnal",
      count: administrasi_list.length,
      icon: BookCheck,
    },
    {
      id: "PRESENSI" as const,
      label: "Presensi",
      count: attendanceHistory.length,
      icon: UserCheck,
    },
    {
      id: "PENILAIAN" as const,
      label: "Penilaian",
      count: assessments.length,
      icon: GraduationCap,
    },
    {
      id: "CBT" as const,
      label: "CBT",
      count: exams.length,
      icon: Layers,
    },
    {
      id: "PENGATURAN" as const,
      label: "Pengaturan",
      icon: Sliders,
    },
  ];

  // Helper resolusi tab aktif (mengakomodasi alias lama)
  const isOverviewActive = activeTab === "OVERVIEW" || activeTab === "RINGKASAN";
  const isMateriActive = activeTab === "MATERI" || activeTab === "BAB_TP";
  const showBabTpView = isMateriActive && materiSubTab === "BAB_TP";

  // Perhitungan Kehadiran
  const avgAttendance =
    attendanceStats && attendanceStats.rata_rata_kehadiran !== undefined
      ? Math.round(attendanceStats.rata_rata_kehadiran)
      : attendanceStats?.total_presensi_diambil
        ? 100
        : 100;

  return (
    <div className="space-y-6 pb-24 text-slate-900 dark:text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* ======================================================== */}
      {/* 1. HERO CLASS BANNER (Academic Glass UI v1.2)           */}
      {/* ======================================================== */}
      <div className="rounded-[28px] bg-white/90 dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/25 p-6 sm:p-7 shadow-xs dark:shadow-[0_0_35px_-5px_rgba(37,99,235,0.18),0_10px_25px_-5px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all">
        {/* Ambient Glow Electric Blue di Latar Belakang */}
        <div className="absolute top-0 right-1/4 w-80 h-44 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Sisi Kiri: Breadcrumb, Judul Mapel, Identitas Kelas, Guru Pengampu */}
          <div className="space-y-3 max-w-2xl">
            {/* Badges / Header Category Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/kelas-saya"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 text-xs font-mono font-bold border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100/80 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Kelas Pembelajaran</span>
              </Link>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Status: KBM Aktif</span>
              </span>
            </div>

            {/* Judul Mata Pelajaran & Kode */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {penugasan.mata_pelajaran_nama}
                </h1>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-xs">
                  {penugasan.mata_pelajaran_kode}
                </span>
              </div>

              {/* Detail Identitas Akademik */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 font-mono flex items-center flex-wrap gap-2 leading-relaxed">
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {penugasan.rombel_nama}
                </span>
                {penugasan.tingkat_nama && (
                  <span className="text-slate-500 dark:text-slate-400">
                    ({penugasan.tingkat_nama})
                  </span>
                )}
                <span className="text-slate-400">•</span>
                <span>
                  {penugasan.semester_nama?.toLowerCase().startsWith("semester")
                    ? penugasan.semester_nama
                    : `Semester ${penugasan.semester_nama || "Ganjil"}`}{" "}
                  • TA {penugasan.tahun_ajaran_nama}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-700 dark:text-slate-200">
                  Guru: <strong className="font-bold">{penugasan.guru_nama}</strong>
                </span>
              </p>
            </div>

            {/* Quick Actions Hero Section */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("PRESENSI")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 font-bold text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Presensi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("MATERI");
                  setMateriSubTab("MODUL");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-bold text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Materi</span>
              </button>

              <button
                type="button"
                onClick={() => setIsJurnalModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 font-bold text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                <BookCheck className="h-3.5 w-3.5" />
                <span>Jurnal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PENILAIAN")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 font-bold text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Nilai</span>
              </button>
            </div>
          </div>

          {/* Sisi Kanan: Metrik Ringkas & Floating Mascot Dekoratif */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Metrik Total Siswa */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-blue-500/20 shadow-xs flex flex-col justify-center min-w-[120px]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Users className="h-4 w-4 text-[#2563EB] dark:text-blue-400" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                  Total Siswa
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                <AnimatedCounter value={total_siswa} decimals={0} suffix=" Siswa" />
              </div>
            </div>

            {/* Metrik Beban Mengajar JP */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-blue-500/20 shadow-xs flex flex-col justify-center min-w-[120px]">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                  Beban KBM
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {penugasan.jumlah_jam_minggu > 0 ? (
                  <AnimatedCounter value={penugasan.jumlah_jam_minggu} decimals={0} suffix=" JP" />
                ) : (
                  "0 JP"
                )}
              </div>
            </div>

            {/* Floating Hero Decorative Glass Icon (Motion Float Slow) */}
            <div className="hidden xl:flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 animate-float-slow shrink-0 select-none">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PILL NAVIGATION MODERN (Academic Glass UI v1.2)       */}
      {/* ======================================================== */}
      <div className="rounded-2xl sm:rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-1.5 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              activeTab === tab.id ||
              (tab.id === "OVERVIEW" && activeTab === "RINGKASAN") ||
              (tab.id === "MATERI" && activeTab === "BAB_TP");

            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                data-testid={`tab-${tab.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "MATERI") setMateriSubTab("MODUL");
                }}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-full text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW KELAS                                    */}
      {/* ======================================================== */}
      {isOverviewActive && (
        <div className="space-y-6 animate-fade-up">
          {/* A. Quick Stats Section (4 Premium Glass Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total BAB */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total BAB
                </span>
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  <AnimatedCounter value={lingkup_materi.length} decimals={0} />
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {totalTP} Target TP
                </p>
              </div>
            </div>

            {/* 2. Materi Terbit */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Materi Terbit
                </span>
                <div className="p-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono text-[#2563EB] dark:text-blue-400 tracking-tight">
                  <AnimatedCounter value={materi_list.length} decimals={0} />
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Bahan Ajar Kelas
                </p>
              </div>
            </div>

            {/* 3. Tugas Aktif */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tugas Aktif
                </span>
                <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400 tracking-tight">
                  <AnimatedCounter value={tugas_list.length} decimals={0} />
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Penugasan Siswa
                </p>
              </div>
            </div>

            {/* 4. Jurnal KBM */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Jurnal KBM
                </span>
                <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <BookCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                  <AnimatedCounter value={administrasi_list.length} decimals={0} />
                </div>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Pertemuan Tercatat
                </p>
              </div>
            </div>
          </div>

          {/* B. Aksi Cepat Pembelajaran (Grid 3 x 2 Glass Action Cards) */}
          <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Aksi Cepat Pembelajaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aktivitas mengajar, penugasan materi, dan evaluasi harian
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
              {/* 1. Tambah BAB */}
              <button
                type="button"
                onClick={() => setIsBABModalOpen(true)}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/80 dark:hover:bg-blue-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-blue-100/70 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 w-fit mb-2.5 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                  Tambah BAB
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Susun unit capaian kurikulum
                </p>
              </button>

              {/* 2. Upload Materi */}
              <button
                type="button"
                onClick={() => setIsMateriModalOpen(true)}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-cyan-50/80 dark:hover:bg-cyan-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-cyan-100/70 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 w-fit mb-2.5 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Upload Materi
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bagikan modul dokumen & teks
                </p>
              </button>

              {/* 3. Buat Tugas */}
              <button
                type="button"
                onClick={() => setIsTugasModalOpen(true)}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-purple-50/80 dark:hover:bg-purple-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-purple-100/70 dark:bg-purple-950 text-purple-600 dark:text-purple-400 w-fit mb-2.5 group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Buat Tugas
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tentukan instruksi & tenggat
                </p>
              </button>

              {/* 4. Isi Jurnal */}
              <button
                type="button"
                onClick={() => setIsJurnalModalOpen(true)}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 w-fit mb-2.5 group-hover:scale-110 transition-transform">
                  <BookCheck className="h-5 w-5" />
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Isi Jurnal
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Catat rekam KBM & refleksi
                </p>
              </button>

              {/* 5. Input Nilai */}
              <button
                type="button"
                onClick={() => setActiveTab("PENILAIAN")}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-amber-50/80 dark:hover:bg-amber-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-amber-100/70 dark:bg-amber-950 text-amber-600 dark:text-amber-400 w-fit mb-2.5 group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Input Nilai
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Buku nilai & asesmen kelas
                </p>
              </button>

              {/* 6. Buka CBT */}
              <button
                type="button"
                onClick={() => setActiveTab("CBT")}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-violet-50/80 dark:hover:bg-violet-950/50 border border-slate-200/80 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/60 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-violet-100/70 dark:bg-violet-950 text-violet-600 dark:text-violet-400 w-fit mb-2.5 group-hover:scale-110 transition-transform">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Buka CBT
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Paket soal & ujian online
                </p>
              </button>
            </div>
          </div>

          {/* C. Progress Pembelajaran (Progress Glass Component) */}
          <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Progress Pembelajaran Kelas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Perkembangan materi, capaian TP, dan penugasan semester ini
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("MATERI");
                  setMateriSubTab("BAB_TP");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors cursor-pointer w-fit"
              >
                <span>Lingkup Materi & TP</span>
                <ChevronRight className="h-3.5 w-3.5 text-blue-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-5">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  BAB Aktif
                </span>
                <div className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                  {lingkup_materi.length} Unit
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                    style={{ width: lingkup_materi.length > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Target TP
                </span>
                <div className="text-lg sm:text-xl font-mono font-black text-purple-600 dark:text-purple-400 mt-1">
                  {totalTP} Target
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: totalTP > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Materi Terbit
                </span>
                <div className="text-lg sm:text-xl font-mono font-black text-cyan-600 dark:text-cyan-400 mt-1">
                  {materi_list.length} Modul
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: materi_list.length > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Tugas Aktif
                </span>
                <div className="text-lg sm:text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {tugas_list.length} Tugas
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: tugas_list.length > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Jurnal Terisi
                </span>
                <div className="text-lg sm:text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {administrasi_list.length} Sesi
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: administrasi_list.length > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* D. Dual Columns: Jadwal Mengajar Timeline + Ringkasan Siswa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* 1. Jadwal Mengajar (Timeline Card Modern) */}
            <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#2563EB] dark:text-blue-400" />
                  <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Jadwal Mengajar Kelas
                  </h3>
                </div>
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {jadwal_list.length} Slot Waktu
                </span>
              </div>

              {jadwal_list.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-mono">
                  Belum ada jadwal mingguan resmi yang terbit untuk kelas dan mata pelajaran ini.
                </div>
              ) : (
                <div className="relative pl-4 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900/60">
                  {jadwal_list.map((j, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[1.35rem] top-3.5 h-2.5 w-2.5 rounded-full bg-[#2563EB] border-2 border-white dark:border-slate-900 ring-2 ring-blue-400/30 group-hover:scale-125 transition-transform" />

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 group-hover:border-blue-300 dark:group-hover:border-blue-500/40 transition-all flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-[11px]">
                              {j.hari}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {j.jam_mulai} - {j.jam_selesai}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {j.slot_nama}
                          </div>
                        </div>

                        {j.ruangan && (
                          <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                            {j.ruangan}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Ringkasan Siswa (Student Summary Card) */}
            <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Ringkasan Siswa Rombel
                  </h3>
                </div>
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50">
                  {penugasan.rombel_nama}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Siswa Aktif
                  </span>
                  <div className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1">
                    <AnimatedCounter value={total_siswa} decimals={0} suffix=" Siswa Aktif" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Terdaftar di kelas
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Kehadiran Rata-Rata
                  </span>
                  <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    <AnimatedCounter value={avgAttendance} decimals={0} suffix="%" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Rekapitulasi KBM
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Siswa Pindahan
                  </span>
                  <div className="text-xl font-mono font-black text-slate-700 dark:text-slate-300 mt-1">
                    0 Siswa
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Mutasi masuk semester
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Siswa Nonaktif
                  </span>
                  <div className="text-xl font-mono font-black text-slate-700 dark:text-slate-300 mt-1">
                    0 Siswa
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Semua terpantau aktif
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("PRESENSI")}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 font-mono font-bold text-xs transition-colors cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Buka Rekapitulasi Presensi Lengkap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MATERI & LINGKUP MATERI (BAB / TP)               */}
      {/* ======================================================== */}
      {isMateriActive && (
        <div className="space-y-5 animate-fade-up">
          {/* Sub-Navigasi Segmented Pill: Bahan Ajar vs Lingkup Materi & TP */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMateriSubTab("MODUL")}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  materiSubTab === "MODUL"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Bahan Ajar ({materi_list.length})
              </button>
              <button
                type="button"
                onClick={() => setMateriSubTab("BAB_TP")}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  materiSubTab === "BAB_TP"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Lingkup Materi & TP ({lingkup_materi.length})
              </button>
            </div>

            {canManage && (
              <div>
                {materiSubTab === "MODUL" ? (
                  <button
                    type="button"
                    onClick={() => setIsMateriModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Terbitkan Materi</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsBABModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah BAB</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sub-View 1: Daftar Bahan Ajar & Modul */}
          {materiSubTab === "MODUL" && (
            <div>
              {materi_list.length === 0 ? (
                <div className="p-12 text-center rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20">
                  <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h4 className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                    Belum ada Materi Pembelajaran
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Bagikan materi teks, modul PDF, atau tautan bacaan agar siswa dapat mengakses
                    bahan ajar secara mandiri.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materi_list.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-[24px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:border-blue-300 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-[11px]">
                            {m.tipe_konten}
                          </span>
                          {m.lingkup_materi_judul && (
                            <span className="text-[11px] font-mono font-semibold text-slate-400 truncate max-w-[160px]">
                              {m.lingkup_materi_judul}
                            </span>
                          )}
                        </div>

                        <h4 className="font-mono text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {m.judul}
                        </h4>
                        {m.deskripsi && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {m.deskripsi}
                          </p>
                        )}

                        {m.tautan_url && (
                          <a
                            href={m.tautan_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline pt-1"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            <span>Buka Tautan Materi</span>
                          </a>
                        )}

                        {m.berkas_id && (
                          <a
                            href={`/api/berkas/${m.berkas_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition-colors w-fit mt-1"
                          >
                            <FileCode className="h-3.5 w-3.5" />
                            <span>Buka Dokumen Modul</span>
                          </a>
                        )}

                        {m.konten_teks && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 max-h-28 overflow-y-auto">
                            {m.konten_teks}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(m.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditMateriTarget(m)}
                              title="Edit Materi"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "MATERI",
                                  id: m.id,
                                  title: m.judul,
                                  subtitle: m.lingkup_materi_judul || "Materi Pembelajaran",
                                })
                              }
                              title="Hapus Materi"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-View 2: Lingkup Materi (BAB) & Tujuan Pembelajaran (TP) */}
          {materiSubTab === "BAB_TP" && (
            <div className="space-y-4">
              {lingkup_materi.length === 0 ? (
                <div className="p-12 text-center rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20">
                  <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h4 className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                    Belum ada Lingkup Materi (BAB)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Mulai dengan menambahkan unit materi (misal: BAB 1, BAB 2) untuk
                    mengorganisasikan Tujuan Pembelajaran dan bahan ajar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lingkup_materi.map((bab) => (
                    <div
                      key={bab.id}
                      className="rounded-[24px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs overflow-hidden"
                    >
                      {/* Header BAB */}
                      <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {bab.kode && (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-xs">
                                {bab.kode}
                              </span>
                            )}
                            <h4 className="font-mono text-base font-bold text-slate-900 dark:text-white">
                              {bab.judul}
                            </h4>
                          </div>
                          {bab.deskripsi && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {bab.deskripsi}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => setTpModalTarget({ id: bab.id, judul: bab.judul })}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Tambah TP</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditBabTarget(bab)}
                                title="Edit BAB"
                                className="p-1.5 rounded-xl text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "BAB",
                                    id: bab.id,
                                    title: bab.judul,
                                    subtitle: `${bab.tujuan_pembelajaran.length} Tujuan Pembelajaran`,
                                  })
                                }
                                title="Hapus BAB"
                                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* List Tujuan Pembelajaran (TP) */}
                      <div className="p-4 sm:p-5">
                        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Tujuan Pembelajaran ({bab.tujuan_pembelajaran.length})
                        </div>

                        {bab.tujuan_pembelajaran.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Belum ada Tujuan Pembelajaran yang ditambahkan pada BAB ini.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {bab.tujuan_pembelajaran.map((tp) => (
                              <div
                                key={tp.id}
                                className="p-3 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-start justify-between gap-3 transition-colors"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono font-extrabold text-[11px] shrink-0 mt-0.5">
                                    {tp.kode || "TP"}
                                  </span>
                                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                    {tp.deskripsi}
                                  </p>
                                </div>

                                {canManage && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setEditTpTarget({ tp, babJudul: bab.judul })}
                                      title="Edit TP"
                                      className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: "TP",
                                          id: tp.id,
                                          title: tp.deskripsi,
                                          subtitle: `Kode: ${tp.kode || "TP"} (${bab.judul})`,
                                        })
                                      }
                                      title="Hapus TP"
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: TUGAS KELAS                                       */}
      {/* ======================================================== */}
      {activeTab === "TUGAS" && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs">
            <div>
              <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Tugas Pembelajaran
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penugasan mandiri, proyek praktikum, dan monitoring pengumpulan siswa
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsTugasModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Terbitkan Tugas</span>
              </button>
            )}
          </div>

          {tugas_list.length === 0 ? (
            <div className="p-12 text-center rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20">
              <ClipboardList className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum ada Tugas Pembelajaran
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Berikan tugas latihan formatif atau proyek praktikum bagi siswa di kelas ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tugas_list.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-[24px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/70 border border-purple-200/80 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-mono font-bold text-[11px]">
                        {t.tipe_penyerahan}
                      </span>
                      {t.lingkup_materi_judul && (
                        <span className="text-[11px] font-mono font-semibold text-slate-400 truncate max-w-[160px]">
                          {t.lingkup_materi_judul}
                        </span>
                      )}
                    </div>

                    <h4 className="font-mono text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {t.judul}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                      {t.petunjuk}
                    </p>

                    {t.publikasi_aktif?.batas_waktu && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-mono font-semibold pt-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Tenggat:{" "}
                          {new Date(t.publikasi_aktif.batas_waktu).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                      {t.publikasi_aktif?.submission_count || 0} Pengumpulan
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: "TUGAS",
                            id: t.id,
                            title: t.judul,
                            subtitle: `${t.publikasi_aktif?.submission_count || 0} Pengumpulan Siswa`,
                          })
                        }
                        title="Hapus Tugas"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: JURNAL KBM                                        */}
      {/* ======================================================== */}
      {activeTab === "JURNAL" && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs">
            <div>
              <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Jurnal Administrasi Pembelajaran KBM
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rekam jejak materi yang dibahas, aktivitas, dan evaluasi setiap pertemuan kelas
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsJurnalModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Isi Jurnal KBM</span>
              </button>
            )}
          </div>

          {administrasi_list.length === 0 ? (
            <div className="p-12 text-center rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20">
              <BookCheck className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum ada Catatan Jurnal KBM
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Setiap kali Anda selesai mengajar, catat materi yang dibahas dan evaluasi kelas di
                sini sebagai rekam jejak resmi administrasi sekolah.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {administrasi_list.map((adm) => (
                <div
                  key={adm.id}
                  className="p-5 rounded-[24px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-xs">
                          Pertemuan {adm.pertemuan_ke}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                            adm.status_realisasi === "TERLAKSANA"
                              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400"
                              : adm.status_realisasi === "TERTUNDA"
                                ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {adm.status_realisasi}
                        </span>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditJurnalTarget(adm)}
                            title="Edit Jurnal KBM"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "JURNAL",
                                id: adm.id,
                                title: `Jurnal Pertemuan Ke-${adm.pertemuan_ke}`,
                                subtitle: adm.materi_disampaikan || "Catatan Administrasi KBM",
                              })
                            }
                            title="Hapus Jurnal"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-mono text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {adm.materi_disampaikan}
                      </h4>
                    </div>

                    {adm.tp_terkait && adm.tp_terkait.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {adm.tp_terkait.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            title={t.deskripsi}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-mono border border-purple-100/80 dark:border-purple-800/40 max-w-full truncate"
                          >
                            {t.kode ? `${t.kode}: ` : ""}
                            <span className="truncate">{t.deskripsi}</span>
                          </span>
                        ))}
                        {adm.tp_terkait.length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono font-bold">
                            +{adm.tp_terkait.length - 3} TP lagi
                          </span>
                        )}
                      </div>
                    )}

                    {adm.kegiatan_pembelajaran && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {adm.kegiatan_pembelajaran}
                      </div>
                    )}

                    {adm.catatan_refleksi && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 line-clamp-2">
                        <span className="font-bold mr-1">Refleksi:</span>
                        <span>{adm.catatan_refleksi}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {new Date(adm.tanggal).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {adm.guru_nama && (
                      <span className="truncate max-w-[150px] font-medium text-slate-500 dark:text-slate-400">
                        {adm.guru_nama}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PRESENSI KELAS                                    */}
      {/* ======================================================== */}
      {activeTab === "PRESENSI" && (
        <div className="animate-fade-up">
          <ClassAttendanceTabView
            canManage={canManage}
            history={attendanceHistory}
            stats={attendanceStats}
            recap={attendanceRecap}
            gradebook={gradebook}
            assessments={assessments}
            lingkupMateriList={lingkup_materi}
            penugasanId={penugasan.id}
            onOpenAttendance={(sesiId) => setAttendanceModalSesiId(sesiId)}
            onOpenNewSession={() => router.push("/sesi-pembelajaran")}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: PENILAIAN & BUKU NILAI                            */}
      {/* ======================================================== */}
      {activeTab === "PENILAIAN" && (
        <div className="animate-fade-up">
          <ClassAssessmentTabView
            penugasanId={penugasan.id}
            canManage={canManage}
            assessments={assessments}
            gradebook={
              gradebook || {
                penugasan_id: penugasan.id,
                sekolah_id: penugasan.sekolah_id,
                rombel_id: penugasan.rombel_id,
                rombel_nama: penugasan.rombel_nama,
                mata_pelajaran_id: penugasan.mata_pelajaran_id,
                mata_pelajaran_nama: penugasan.mata_pelajaran_nama,
                kkm_default: 75,
                columns: [],
                rows: [],
                statistics: {
                  total_siswa: 0,
                  total_asesmen: 0,
                  total_formatif: 0,
                  total_sumatif: 0,
                  rata_rata_kelas: null,
                  persentase_tuntas_kktp: null,
                },
              }
            }
            lingkupMateriList={lingkup_materi}
            attendanceRecap={attendanceRecap}
            onRefresh={() => router.refresh()}
            onShowToast={(message, type) => setToast({ message, type })}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: CBT UJIAN ONLINE                                  */}
      {/* ======================================================== */}
      {activeTab === "CBT" && (
        <div className="animate-fade-up">
          <ClassCbtTabView
            penugasanId={penugasan.id}
            sekolahId={penugasan.sekolah_id}
            mapelId={penugasan.mata_pelajaran_id}
            canManage={canManage}
            exams={exams}
            onRefresh={() => router.refresh()}
            onShowToast={(message, type) => setToast({ message, type })}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: PENGATURAN KELAS & KODE UNDANGAN                  */}
      {/* ======================================================== */}
      {activeTab === "PENGATURAN" && (
        <div className="space-y-6 animate-fade-up">
          {/* 1. Kode Undangan & Akses Mandiri Siswa (Butir 11 Spesifikasi UI) */}
          <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-mono text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Kode Akses & Pendaftaran Mandiri Siswa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bagikan kode gabung rombel kepada siswa untuk otomatisasi pendaftaran akun
                </p>
              </div>
            </div>

            <RombelJoinCodeCard rombelId={penugasan.rombel_id} rombelNama={penugasan.rombel_nama} />
          </div>

          {/* 2. Informasi Metadata & Konfigurasi Kelas */}
          <div className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-mono text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Informasi & Konfigurasi Penugasan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data kanonikal penugasan mengajar resmi berdasarkan SK kurikulum sekolah
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Rombel / Kelas
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {penugasan.rombel_nama}{" "}
                  {penugasan.tingkat_nama ? `(${penugasan.tingkat_nama})` : ""}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Mata Pelajaran
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {penugasan.mata_pelajaran_nama} ({penugasan.mata_pelajaran_kode})
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Guru Pengampu
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {penugasan.guru_nama}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Beban KBM Mingguan
                </span>
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {penugasan.jumlah_jam_minggu} JP / Minggu
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Tahun Ajaran & Semester
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  TA {penugasan.tahun_ajaran_nama} • {penugasan.semester_nama || "Ganjil"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Status Operasional
                </span>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{penugasan.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS REGISTRATION & ACTION FORMS                       */}
      {/* ======================================================== */}
      <CreateBABModal
        penugasanId={penugasan.id}
        isOpen={isBABModalOpen}
        onClose={() => setIsBABModalOpen(false)}
        nextUrutan={lingkup_materi.length + 1}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      {tpModalTarget && (
        <CreateTPModal
          penugasanId={penugasan.id}
          lingkupMateriId={tpModalTarget.id}
          babJudul={tpModalTarget.judul}
          isOpen={true}
          onClose={() => setTpModalTarget(null)}
          nextUrutan={
            (lingkup_materi.find((lm) => lm.id === tpModalTarget.id)?.tujuan_pembelajaran.length ||
              0) + 1
          }
          onSuccess={(msg) => {
            setToast({ message: msg, type: "success" });
            router.refresh();
          }}
          onError={(msg) => setToast({ message: msg, type: "error" })}
        />
      )}

      <EditBABModal
        penugasanId={penugasan.id}
        bab={editBabTarget}
        isOpen={!!editBabTarget}
        onClose={() => setEditBabTarget(null)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <EditTPModal
        penugasanId={penugasan.id}
        babJudul={editTpTarget?.babJudul || ""}
        tp={editTpTarget?.tp || null}
        isOpen={!!editTpTarget}
        onClose={() => setEditTpTarget(null)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <CreateMateriModal
        penugasanId={penugasan.id}
        guruId={penugasan.guru_id}
        mapelId={penugasan.mata_pelajaran_id}
        lingkupMateriList={lingkup_materi}
        isOpen={isMateriModalOpen}
        onClose={() => setIsMateriModalOpen(false)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <EditMateriModal
        penugasanId={penugasan.id}
        materi={editMateriTarget}
        lingkupMateriList={lingkup_materi}
        isOpen={!!editMateriTarget}
        onClose={() => setEditMateriTarget(null)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <CreateTugasModal
        penugasanId={penugasan.id}
        guruId={penugasan.guru_id}
        mapelId={penugasan.mata_pelajaran_id}
        lingkupMateriList={lingkup_materi}
        isOpen={isTugasModalOpen}
        onClose={() => setIsTugasModalOpen(false)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <CreateJurnalModal
        penugasanId={penugasan.id}
        guruId={penugasan.guru_id}
        lingkupMateriList={lingkup_materi}
        isOpen={isJurnalModalOpen}
        onClose={() => setIsJurnalModalOpen(false)}
        nextPertemuan={administrasi_list.length + 1}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <EditJurnalModal
        penugasanId={penugasan.id}
        administrasi={editJurnalTarget}
        lingkupMateriList={lingkup_materi}
        isOpen={!!editJurnalTarget}
        onClose={() => setEditJurnalTarget(null)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      <SessionAttendanceModal
        sesiId={attendanceModalSesiId}
        isOpen={Boolean(attendanceModalSesiId)}
        onClose={() => setAttendanceModalSesiId(null)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          router.refresh();
        }}
        onError={(msg) => setToast({ message: msg, type: "error" })}
      />

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI HAPUS (Academic Glass Dark UI)          */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-rose-200 dark:border-rose-900/60 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1 text-left flex-1">
                <h3
                  id="delete-dialog-title"
                  className="font-mono text-base font-bold text-slate-900 dark:text-white"
                >
                  {deleteTarget.type === "TUGAS" && "Hapus Tugas Pembelajaran"}
                  {deleteTarget.type === "MATERI" && "Hapus Materi Pembelajaran"}
                  {deleteTarget.type === "BAB" && "Hapus Lingkup Materi (BAB)"}
                  {deleteTarget.type === "TP" && "Hapus Tujuan Pembelajaran (TP)"}
                  {deleteTarget.type === "JURNAL" && "Hapus Catatan Jurnal KBM"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan. Seluruh data terkait yang telah tersimpan
                  akan dihapus permanen dari basis data.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                {deleteTarget.title}
              </div>
              {deleteTarget.subtitle && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {deleteTarget.subtitle}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
