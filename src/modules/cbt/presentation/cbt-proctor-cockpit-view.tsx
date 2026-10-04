"use client";

/**
 * Ruang Pintar — M14 Live CBT Proctor Cockpit View (Academic Glass UI v1.2)
 *
 * Dedicated Full-Page Live Proctoring Cockpit (/cbt-ujian/proctor/[ujianId])
 * - Live authoritative student grid (Belum Mulai, Sedang Mengerjakan, Terkunci, Selesai)
 * - Anti-Cheating Strike monitoring & violation logs modal
 * - Proctor controls: Buka Kunci (Unlock), Reset Sesi (Reset Attempt), Paksa Kumpul (Force Submit)
 * - Exam token live refresh & ANBK sync
 * - Assessment ledger bridge (Transfer ke Buku Nilai Kurikulum Merdeka)
 */

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Users,
  Award,
  RefreshCw,
  Lock,
  Unlock,
  RotateCcw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Search,
  Key,
  Copy,
  ChevronLeft,
  LayoutGrid,
  List,
  Eye,
  BookOpen,
  ArrowRight,
  TrendingUp,
  X,
  FileCheck,
  Camera,
} from "lucide-react";
import { PaperLjmScannerModal } from "./paper-ljm-scanner-modal";
import {
  getExamAttemptsAction,
  unlockAttemptAction,
  resetAttemptAction,
  forceSubmitAttemptAction,
  refreshExamTokenAction,
  transferToGradebookAction,
} from "@/app/actions/cbt-actions";

export interface ProctorStudentAttempt {
  id: string;
  sekolah_id: string;
  ujian_cbt_id: string;
  snapshot_id: string;
  siswa_id: string;
  attempt_ke: number;
  waktu_mulai: string | Date | null;
  batas_waktu_server: string | Date | null;
  waktu_selesai: string | Date | null;
  status:
    | "BELUM_MULAI"
    | "SEDANG_MENGERJAKAN"
    | "TERKUNCI_PELANGGARAN"
    | "DIKUMPULKAN"
    | "SELESAI"
    | "TERLAMBAT"
    | "WAKTU_HABIS";
  siswa: {
    id: string;
    nama_lengkap: string;
    nisn: string | null;
  };
  hasil: {
    skor_mentah: number;
    skor_maksimal: number;
    nilai_akhir: number;
    apakah_tuntas: boolean;
    total_benar: number;
    total_salah: number;
    status_kelulusan: string;
  } | null;
  integrityEvents: Array<{
    id: string;
    jenis_event: string;
    deskripsi: string;
    waktu_kejadian: string | Date;
  }>;
  integrityEventCount: number;
  savedAnswersCount: number;
}

export interface ProctorExamData {
  id: string;
  judul: string;
  deskripsi: string | null;
  durasi_menit: number;
  kktp: number;
  status: string;
  gunakan_token: boolean;
  token_masuk: string | null;
  rombel_nama?: string;
  mata_pelajaran_nama?: string;
  penugasan_mengajar_id: string;
}

interface CbtProctorCockpitViewProps {
  initialExam: ProctorExamData;
  initialAttempts: ProctorStudentAttempt[];
  penugasanId: string;
}

export function CbtProctorCockpitView({
  initialExam,
  initialAttempts,
  penugasanId,
}: CbtProctorCockpitViewProps) {
  const [exam, setExam] = useState<ProctorExamData>(initialExam);
  const [attempts, setAttempts] = useState<ProctorStudentAttempt[]>(initialAttempts);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(10); // 10s default
  const [currentTime, setCurrentTime] = useState<string>("");

  // Modals
  const [selectedLogsAttempt, setSelectedLogsAttempt] = useState<ProctorStudentAttempt | null>(
    null
  );
  const [confirmResetAttempt, setConfirmResetAttempt] = useState<ProctorStudentAttempt | null>(
    null
  );
  const [confirmForceSubmitAttempt, setConfirmForceSubmitAttempt] =
    useState<ProctorStudentAttempt | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPaperScannerModal, setShowPaperScannerModal] = useState(false);

  // Gradebook Transfer State
  const [namaAsesmen, setNamaAsesmen] = useState(initialExam.judul);
  const [kategori, setKategori] = useState<"SUMATIF" | "FORMATIF">("SUMATIF");
  const [jenisAsesmen, setJenisAsesmen] = useState("SUMATIF_TENGAH_SEMESTER");
  const [bobotAsesmen, setBobotAsesmen] = useState(1);

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live Server Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Latest Data
  const refreshData = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const res = await getExamAttemptsAction(exam.id);
        if (res.success && res.data) {
          setAttempts(res.data.attempts || []);
          if (res.data.ujian) {
            setExam((prev) => ({
              ...prev,
              ...res.data.ujian,
            }));
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [exam.id]
  );

  // Auto-refresh Timer
  useEffect(() => {
    if (autoRefreshSecs <= 0) return;
    const interval = setInterval(() => {
      refreshData(true);
    }, autoRefreshSecs * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSecs, refreshData]);

  // Actions: Unlock
  const handleUnlock = (attemptId: string, studentName: string) => {
    startTransition(async () => {
      const res = await unlockAttemptAction(attemptId, penugasanId);
      if (res.success) {
        showToast(`Kunci sesi ${studentName} berhasil dibuka. Siswa dapat melanjutkan.`, "success");
        refreshData(false);
      } else {
        showToast(res.message, "error");
      }
    });
  };

  // Actions: Reset Sesi
  const handleResetConfirm = () => {
    if (!confirmResetAttempt) return;
    const attempt = confirmResetAttempt;
    startTransition(async () => {
      const res = await resetAttemptAction(attempt.id, penugasanId);
      if (res.success) {
        showToast(
          `Sesi ${attempt.siswa.nama_lengkap} berhasil di-reset. Siswa dapat login kembali.`,
          "success"
        );
        setConfirmResetAttempt(null);
        refreshData(false);
      } else {
        showToast(res.message, "error");
      }
    });
  };

  // Actions: Force Submit
  const handleForceSubmitConfirm = () => {
    if (!confirmForceSubmitAttempt) return;
    const attempt = confirmForceSubmitAttempt;
    startTransition(async () => {
      const res = await forceSubmitAttemptAction(attempt.id, penugasanId);
      if (res.success) {
        showToast(
          `Ujian ${attempt.siswa.nama_lengkap} berhasil dipaksa kumpul dan dinilai.`,
          "success"
        );
        setConfirmForceSubmitAttempt(null);
        refreshData(false);
      } else {
        showToast(res.message, "error");
      }
    });
  };

  // Actions: Refresh Token
  const handleRefreshToken = () => {
    startTransition(async () => {
      const res = await refreshExamTokenAction(exam.id, penugasanId);
      if (res.success && res.data?.newToken) {
        const newToken = res.data.newToken;
        setExam((prev) => ({
          ...prev,
          token_masuk: newToken,
          gunakan_token: true,
        }));
        showToast(`Token ujian baru: ${newToken}`, "success");
      } else {
        showToast(res.message, "error");
      }
    });
  };

  // Actions: Gradebook Transfer
  const handleTransferToGradebook = () => {
    if (!namaAsesmen.trim()) {
      showToast("Nama asesmen untuk Buku Nilai wajib diisi.", "error");
      return;
    }
    startTransition(async () => {
      const res = await transferToGradebookAction(
        {
          ujian_cbt_id: exam.id,
          nama_asesmen: namaAsesmen.trim(),
          kategori,
          jenis_asesmen: jenisAsesmen,
          bobot: Number(bobotAsesmen) || 1,
        },
        penugasanId
      );
      if (res.success) {
        showToast(res.message, "success");
        setShowTransferModal(false);
      } else {
        showToast(res.message, "error");
      }
    });
  };

  // Computations
  const totalEnrolled = attempts.length;
  const activeCount = attempts.filter((a) => a.status === "SEDANG_MENGERJAKAN").length;
  const lockedCount = attempts.filter((a) => a.status === "TERKUNCI_PELANGGARAN").length;
  const completedCount = attempts.filter(
    (a) =>
      a.status === "SELESAI" ||
      a.status === "DIKUMPULKAN" ||
      a.status === "WAKTU_HABIS" ||
      a.status === "TERLAMBAT"
  ).length;
  const unstartedCount = attempts.filter((a) => a.status === "BELUM_MULAI").length;

  const finishedGrades = attempts
    .filter((a) => a.hasil && typeof a.hasil.nilai_akhir === "number")
    .map((a) => a.hasil!.nilai_akhir);

  const averageGrade =
    finishedGrades.length > 0
      ? (finishedGrades.reduce((sum, g) => sum + g, 0) / finishedGrades.length).toFixed(1)
      : "—";

  const passedCount = attempts.filter((a) => a.hasil && a.hasil.apakah_tuntas).length;
  const passRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0;

  // Filtered List
  const filteredAttempts = attempts.filter((att) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      att.siswa.nama_lengkap.toLowerCase().includes(q) ||
      (att.siswa.nisn && att.siswa.nisn.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return att.status === "SEDANG_MENGERJAKAN";
    if (statusFilter === "LOCKED") return att.status === "TERKUNCI_PELANGGARAN";
    if (statusFilter === "COMPLETED")
      return (
        att.status === "SELESAI" ||
        att.status === "DIKUMPULKAN" ||
        att.status === "WAKTU_HABIS" ||
        att.status === "TERLAMBAT"
      );
    if (statusFilter === "UNSTARTED") return att.status === "BELUM_MULAI";
    return true;
  });

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-8 right-8 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : toastMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Cockpit */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Link
                href="/cbt-ujian"
                className="hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Kembali ke CBT Hub
              </Link>
              <span>/</span>
              <span className="text-slate-600 font-semibold">
                {exam.mata_pelajaran_nama || "Mata Pelajaran"}
              </span>
              <span>/</span>
              <span className="text-blue-600 font-bold">Live Proctor Cockpit</span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{exam.judul}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    LIVE
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Rombel:{" "}
                  <strong className="text-slate-700">{exam.rombel_nama || "Semua Siswa"}</strong> •
                  KKTP: <strong className="text-slate-700">{exam.kktp}</strong> • Durasi:{" "}
                  <strong className="text-slate-700">{exam.durasi_menit} Menit</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Widget: Clock & Token & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Server Clock Widget */}
            <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 shadow-2xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block leading-none">
                  Server Clock
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {currentTime || "Loading..."}
                </span>
              </div>
            </div>

            {/* Exam Token Widget */}
            {exam.gunakan_token && (
              <div className="px-4 py-2 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center gap-3 shadow-2xs">
                <Key className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 block leading-none">
                    Token ANBK
                  </span>
                  <span className="text-sm font-mono font-black tracking-widest text-amber-900">
                    {exam.token_masuk || "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshToken}
                  disabled={isPending}
                  title="Acak token baru"
                  className="p-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-700 border border-amber-300 transition"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Koreksi LJM Kertas / Susulan Button */}
            <button
              type="button"
              onClick={() => setShowPaperScannerModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition"
            >
              <Camera className="h-4 w-4 text-purple-600" />
              <span>Scan LJM Kertas / Susulan</span>
            </button>

            {/* Transfer to Gradebook Button */}
            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              disabled={completedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              <BookOpen className="h-4 w-4 text-blue-400" />
              <span>Transfer ke Buku Nilai</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row — Academic Glass UI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Rombel */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Siswa</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900">{totalEnrolled}</span>
            <span className="text-xs text-slate-400">terdaftar</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {unstartedCount > 0 ? (
              <span className="text-amber-600 font-bold">{unstartedCount} belum mulai</span>
            ) : (
              <span className="text-emerald-600 font-bold">100% sudah hadir</span>
            )}
          </div>
        </div>

        {/* Sedang Mengerjakan */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-blue-600">
            <span>Aktif Mengerjakan</span>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-blue-700">{activeCount}</span>
            <span className="text-xs text-blue-500">siswa</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Autosave real-time aktif</div>
        </div>

        {/* Terkunci Pelanggaran */}
        <div
          className={`p-4 rounded-3xl border shadow-xs flex flex-col justify-between ${
            lockedCount > 0 ? "bg-rose-50/60 border-rose-200" : "bg-white border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-600">
            <span>Terkunci (Strikes)</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-rose-700">{lockedCount}</span>
            <span className="text-xs text-rose-500">perlu izin guru</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {lockedCount > 0 ? "Klik Buka Kunci untuk izinkan" : "Tidak ada pelanggaran"}
          </div>
        </div>

        {/* Selesai / Dikumpulkan */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
            <span>Sudah Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-emerald-700">{completedCount}</span>
            <span className="text-xs text-emerald-500">terkumpul</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Ketuntasan: <strong className="text-emerald-700">{passRate}%</strong>
          </div>
        </div>

        {/* Rata-Rata Nilai */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-purple-600">
            <span>Rata-Rata Nilai</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-purple-700">{averageGrade}</span>
            <span className="text-xs text-purple-400">/ 100</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Tuntas: {passedCount} siswa</div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua ({totalEnrolled})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "ACTIVE"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Mengerjakan ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("LOCKED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "LOCKED"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <ShieldAlert className="h-3 w-3" />
            Terkunci ({lockedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Selesai ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("UNSTARTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "UNSTARTED"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Belum Mulai ({unstartedCount})
          </button>
        </div>

        {/* Right Tools: Search, Auto-Refresh, View Mode */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / NISN..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-44 md:w-56 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Auto Refresh Setting */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-xl text-xs">
            <Clock className="h-3 w-3 text-slate-400" />
            <select
              value={autoRefreshSecs}
              onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-700 focus:outline-hidden text-xs cursor-pointer"
            >
              <option value={5}>Auto 5s</option>
              <option value={10}>Auto 10s</option>
              <option value={30}>Auto 30s</option>
              <option value={0}>Manual</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => refreshData(false)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            title="Refresh Data Sekarang"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
            />
          </button>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Tampilan Grid Card"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              title="Tampilan Tabel Rinci"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT CARDS COCKPIT GRID VIEW */}
      {viewMode === "grid" ? (
        filteredAttempts.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center text-xs text-slate-400">
            Tidak ada siswa yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAttempts.map((att) => {
              const isLocked = att.status === "TERKUNCI_PELANGGARAN";
              const isActive = att.status === "SEDANG_MENGERJAKAN";
              const isUnstarted = att.status === "BELUM_MULAI";
              const isDone =
                att.status === "SELESAI" ||
                att.status === "DIKUMPULKAN" ||
                att.status === "WAKTU_HABIS" ||
                att.status === "TERLAMBAT";
              const isPassed = att.hasil && att.hasil.nilai_akhir >= exam.kktp;

              return (
                <div
                  key={att.siswa.id}
                  className={`rounded-3xl p-5 border transition-all flex flex-col justify-between gap-4 shadow-xs relative overflow-hidden ${
                    isLocked
                      ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20"
                      : isActive
                        ? "bg-white border-blue-200 hover:shadow-md hover:border-blue-400"
                        : isDone
                          ? "bg-emerald-50/30 border-emerald-200/80"
                          : "bg-slate-50/60 border-slate-200/80 opacity-75"
                  }`}
                >
                  {/* Top: Student Info & Status Badge */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {att.siswa.nama_lengkap}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-400">
                          {att.siswa.nisn || "Tanpa NISN"}
                        </div>
                      </div>

                      {/* Status Badges */}
                      {isLocked ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 animate-bounce">
                          <Lock className="h-3 w-3" />
                          TERKUNCI
                        </span>
                      ) : isActive ? (
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                          AKTIF
                        </span>
                      ) : isDone ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          SELESAI
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          BELUM MULAI
                        </span>
                      )}
                    </div>

                    {/* Mid Stats: Answers saved, Score, Violations */}
                    <div className="p-3 rounded-2xl bg-white/80 border border-slate-100 space-y-1.5 text-xs">
                      {isDone ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px]">Nilai Akhir:</span>
                          <span className="font-mono font-bold text-base text-slate-900">
                            {att.hasil?.nilai_akhir ?? "—"}
                            <span
                              className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                                isPassed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {isPassed ? "Tuntas" : "Remedial"}
                            </span>
                          </span>
                        </div>
                      ) : isActive ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[11px]">Jawaban Tersimpan:</span>
                          <span className="font-mono font-bold text-blue-700 text-xs">
                            {att.savedAnswersCount} butir
                          </span>
                        </div>
                      ) : isLocked ? (
                        <div className="text-rose-700 text-[11px] font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Maksimal strike pelanggaran tercapai</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[11px] italic">
                          Menunggu siswa login & memasukkan token
                        </div>
                      )}

                      {/* Violations count badge */}
                      {att.integrityEventCount > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3 text-amber-500" />
                            {att.integrityEventCount} Pelanggaran
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedLogsAttempt(att)}
                            className="text-blue-600 hover:underline font-bold text-[10px]"
                          >
                            Lihat Log
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    {isLocked && (
                      <button
                        type="button"
                        onClick={() => handleUnlock(att.id, att.siswa.nama_lengkap)}
                        disabled={isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Buka Kunci
                      </button>
                    )}

                    {isActive && (
                      <button
                        type="button"
                        onClick={() => setConfirmForceSubmitAttempt(att)}
                        disabled={isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Paksa Kumpul
                      </button>
                    )}

                    {!isUnstarted && (
                      <button
                        type="button"
                        onClick={() => setConfirmResetAttempt(att)}
                        disabled={isPending}
                        title="Reset attempt jika terjadi kendala teknis perangkat siswa"
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TABLE VIEW */
        <div className="rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Siswa / NISN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Jawaban Simpan</th>
                  <th className="py-3 px-4 text-center">Integritas</th>
                  <th className="py-3 px-4 text-right">Nilai Akhir</th>
                  <th className="py-3 px-4 text-center">Status KKTP</th>
                  <th className="py-3 px-4 text-center">Aksi Pengawas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.map((att, idx) => {
                  const isLocked = att.status === "TERKUNCI_PELANGGARAN";
                  const isActive = att.status === "SEDANG_MENGERJAKAN";
                  const isUnstarted = att.status === "BELUM_MULAI";
                  const isDone =
                    att.status === "SELESAI" ||
                    att.status === "DIKUMPULKAN" ||
                    att.status === "WAKTU_HABIS" ||
                    att.status === "TERLAMBAT";
                  const isPassed = att.hasil && att.hasil.nilai_akhir >= exam.kktp;

                  return (
                    <tr key={att.siswa.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{att.siswa.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {att.siswa.nisn || "Tanpa NISN"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                            <Lock className="h-3 w-3" />
                            TERKUNCI
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            SEDANG MENGERJAKAN
                          </span>
                        ) : isDone ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            SELESAI
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                            BELUM MULAI
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {isUnstarted ? "—" : `${att.savedAnswersCount} butir`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {att.integrityEventCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLogsAttempt(att)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {att.integrityEventCount} Pelanggaran
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Bersih</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {att.hasil?.nilai_akhir !== undefined ? att.hasil.nilai_akhir : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {att.hasil ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPassed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isPassed ? "Tuntas" : "Belum Tuntas"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isLocked && (
                            <button
                              type="button"
                              onClick={() => handleUnlock(att.id, att.siswa.nama_lengkap)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition"
                            >
                              <Unlock className="h-3 w-3" />
                              Buka
                            </button>
                          )}
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => setConfirmForceSubmitAttempt(att)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] font-bold transition"
                            >
                              <Send className="h-3 w-3" />
                              Kumpul
                            </button>
                          )}
                          {!isUnstarted && (
                            <button
                              type="button"
                              onClick={() => setConfirmResetAttempt(att)}
                              disabled={isPending}
                              title="Reset attempt"
                              className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT LOGS INTEGRITAS */}
      {selectedLogsAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Log Integritas: {selectedLogsAttempt.siswa.nama_lengkap}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total {selectedLogsAttempt.integrityEvents.length} kejadian terekam
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogsAttempt(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedLogsAttempt.integrityEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada catatan pelanggaran.
                </div>
              ) : (
                selectedLogsAttempt.integrityEvents.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px]">
                        {ev.jenis_event.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(ev.waktu_kejadian).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{ev.deskripsi}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogsAttempt(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM RESET ATTEMPT */}
      {confirmResetAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reset Sesi Ujian Siswa?</h3>
                <p className="text-xs text-slate-500">
                  {confirmResetAttempt.siswa.nama_lengkap} ({confirmResetAttempt.siswa.nisn || "-"})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Peringatan:</strong> Seluruh riwayat jawaban dan log sesi yang sedang berjalan
              akan dibersihkan. Siswa dapat login kembali dari awal dengan durasi penuh.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetAttempt(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs"
              >
                {isPending ? "Mereset..." : "Ya, Reset Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM FORCE SUBMIT */}
      {confirmForceSubmitAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Paksa Kumpul Ujian Siswa?</h3>
                <p className="text-xs text-slate-500">
                  {confirmForceSubmitAttempt.siswa.nama_lengkap}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              Sesi pengerjaan siswa akan langsung ditutup dan jawaban yang tersimpan di cloud (
              {confirmForceSubmitAttempt.savedAnswersCount} butir) akan dinilai authoritative oleh
              server sekarang.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmForceSubmitAttempt(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleForceSubmitConfirm}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs"
              >
                {isPending ? "Mengumpulkan..." : "Ya, Paksa Kumpul Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRADEBOOK TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Transfer Nilai ke Buku Nilai M13
                </h3>
                <p className="text-xs text-slate-500">Integrasi asesmen Kurikulum Merdeka</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Asesmen di Buku Nilai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaAsesmen}
                  onChange={(e) => setNamaAsesmen(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="SUMATIF">Sumatif</option>
                    <option value="FORMATIF">Formatif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bobot</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={bobotAsesmen}
                    onChange={(e) => setBobotAsesmen(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-900">
                Nilai dari <strong>{completedCount} siswa</strong> yang telah selesai akan otomatis
                disinkronkan ke Ledger Penilaian. Siswa yang belum selesai tetap dapat ditransfer
                belakangan.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTransferToGradebook}
                disabled={isPending || completedCount === 0}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs disabled:opacity-50"
              >
                {isPending ? "Mentransfer..." : `Transfer ${completedCount} Nilai`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pindai LJM Kertas & Siswa Susulan */}
      <PaperLjmScannerModal
        isOpen={showPaperScannerModal}
        onClose={() => setShowPaperScannerModal(false)}
        ujianId={exam.id}
        ujianJudul={exam.judul}
        penugasanId={penugasanId}
        totalSoal={25}
        kktp={exam.kktp}
        studentList={attempts.map((a) => ({
          id: a.siswa.id,
          nama_lengkap: a.siswa.nama_lengkap,
          nisn: a.siswa.nisn,
          status: a.status,
        }))}
        onSuccess={(msg) => {
          showToast(msg, "success");
          refreshData(false);
        }}
        onError={(msg) => showToast(msg, "error")}
      />
    </div>
  );
}
