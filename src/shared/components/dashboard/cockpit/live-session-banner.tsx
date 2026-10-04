"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Clock,
  BookOpen,
  Users,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  ClipboardList,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { MergedScheduleBlock } from "@/modules/schedule/domain/schedule-merger";
import { ClassSessionDTO } from "@/modules/schedule/domain/schedule-types";
import { SessionAttendanceModal } from "@/modules/attendance/presentation/session-attendance-modal";
import { Toast, ToastType } from "@/shared/components/ui/toast";
import { ensureAndGetTodaySessionAction } from "@/app/actions/class-session-actions";
import { getRombelJoinCodeAction } from "@/app/actions/rombel-join-actions";

export interface LiveSessionBannerProps {
  mergedBlocks: MergedScheduleBlock[];
  actualSessions: ClassSessionDTO[];
  presensiRecords?: { status: string; sesi_kelas_id: string }[];
  completedJournalsCount?: number;
  activeTopic?: string;
  className?: string;
}

export function LiveSessionBanner({
  mergedBlocks = [],
  actualSessions = [],
  presensiRecords = [],
  completedJournalsCount = 0,
  activeTopic,
  className = "",
}: LiveSessionBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceModalSesiId, setAttendanceModalSesiId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Hitung waktu saat ini dalam menit untuk penentuan status
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const blocksWithStatus = mergedBlocks.map((block) => {
    const startM = parseTimeToMinutes(block.jam_mulai);
    const endM = parseTimeToMinutes(block.jam_selesai);
    const isCurrent = currentMinutes >= startM && currentMinutes <= endM;
    const isPast = currentMinutes > endM;
    const isFuture = currentMinutes < startM;

    const actual = actualSessions.find(
      (s) => s.rombel_id === block.rombel_id && s.mata_pelajaran_id === block.mata_pelajaran_id
    );

    return {
      ...block,
      isCurrent,
      isPast,
      isFuture,
      actualSessionId: actual?.id,
      actualStatus: actual?.status || (isPast ? "SELESAI" : "TERJADWAL"),
    };
  });

  // Identifikasi sesi aktif: sesi saat ini -> sesi berikutnya -> null jika tidak ada
  const currentBlock = blocksWithStatus.find((b) => b.isCurrent);
  const nextBlock = blocksWithStatus.find((b) => b.isFuture);
  const isAllPast = blocksWithStatus.length > 0 && blocksWithStatus.every((b) => b.isPast);

  const activeTargetBlock = currentBlock || nextBlock || (isAllPast ? null : blocksWithStatus[0]);

  // Evaluasi 4 pilar status untuk sesi aktif
  const hasPresensi = activeTargetBlock?.actualSessionId
    ? presensiRecords.some((p) => p.sesi_kelas_id === activeTargetBlock.actualSessionId)
    : false;
  const hasJournal = completedJournalsCount > 0;

  // Handler: Presensi Cepat In-Place Modal
  const handleQuickAttendance = async () => {
    if (!activeTargetBlock) return;

    if (activeTargetBlock.actualSessionId) {
      setAttendanceModalSesiId(activeTargetBlock.actualSessionId);
      setIsAttendanceModalOpen(true);
      return;
    }

    startTransition(async () => {
      try {
        const res = await ensureAndGetTodaySessionAction({
          penugasan_mengajar_id: activeTargetBlock.penugasan_mengajar_id,
          rombel_id: activeTargetBlock.rombel_id,
          mata_pelajaran_id: activeTargetBlock.mata_pelajaran_id,
          ruangan_aktual: activeTargetBlock.ruangan || undefined,
        });

        if (res.success && res.data?.sessionId) {
          setAttendanceModalSesiId(res.data.sessionId);
          setIsAttendanceModalOpen(true);
          setToast({
            message: res.message || "Sesi berhasil dibuka. Memuat daftar siswa...",
            type: "success",
          });
        } else {
          setToast({
            message: res.message || "Gagal membuka sesi KBM.",
            type: "error",
          });
        }
      } catch (err: any) {
        setToast({
          message: err?.message || "Terjadi kendala jaringan saat membuka sesi.",
          type: "error",
        });
      }
    });
  };

  // Handler: Salin Kode Gabung Siswa
  const handleCopyJoinCode = async () => {
    if (!activeTargetBlock) return;
    setIsLoadingCode(true);
    try {
      const res = await getRombelJoinCodeAction(activeTargetBlock.rombel_id);
      if (res.success && res.data?.code) {
        await navigator.clipboard.writeText(res.data.code);
        setCopiedCode(true);
        setToast({
          message: `Kode gabung kelas ${activeTargetBlock.rombel_nama} (${res.data.code}) berhasil disalin!`,
          type: "success",
        });
        setTimeout(() => setCopiedCode(false), 3000);
      } else {
        // Fallback jika kode belum digenerate: salin nama rombel
        await navigator.clipboard.writeText(activeTargetBlock.rombel_nama);
        setToast({
          message: `Nama kelas ${activeTargetBlock.rombel_nama} disalin.`,
          type: "info",
        });
      }
    } catch {
      setToast({ message: "Gagal menyalin kode kelas.", type: "error" });
    } finally {
      setIsLoadingCode(false);
    }
  };

  if (!activeTargetBlock && !isAllPast) {
    return null;
  }

  // Tampilan ketika seluruh sesi KBM hari ini telah selesai
  if (isAllPast && !currentBlock) {
    return (
      <div
        className={`rounded-[28px] bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-blue-950/80 border border-emerald-500/30 p-6 shadow-md dark:shadow-[0_0_35px_-5px_rgba(16,185,129,0.2)] text-white ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                KBM HARI INI TUNTAS
              </span>
              <h3 className="font-mono text-base sm:text-lg font-extrabold mt-1 text-white">
                Seluruh Sesi Mengajar Hari Ini Telah Selesai ({mergedBlocks.length} Sesi)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Semua presensi dan aktivitas kelas telah tercatat. Anda dapat meninjau buku nilai
                atau menyiapkan modul ajar mendatang.
              </p>
            </div>
          </div>
          <Link
            href="/penilaian"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono font-bold text-white transition-all shrink-0"
          >
            <span>Buku Nilai & Rapor</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const isLiveNow = Boolean(currentBlock);

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {isAttendanceModalOpen && attendanceModalSesiId && (
        <SessionAttendanceModal
          sesiId={attendanceModalSesiId}
          isOpen={isAttendanceModalOpen}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setAttendanceModalSesiId(null);
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      <div
        className={`rounded-[28px] overflow-hidden relative border transition-all ${
          isLiveNow
            ? "bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border-blue-500/40 shadow-lg shadow-blue-500/10 dark:shadow-[0_0_40px_-5px_rgba(37,99,235,0.3)]"
            : "bg-gradient-to-br from-slate-900 via-slate-900/95 to-blue-950/80 border-slate-700/60 shadow-md"
        } p-6 sm:p-7 text-white ${className}`}
      >
        {/* Glow ambient accent */}
        <div
          className={`absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            isLiveNow ? "bg-blue-500/25" : "bg-indigo-500/15"
          }`}
        />

        <div className="relative z-10 space-y-5">
          {/* Header Row: Live Beacon Status & Time Horizon */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-black border ${
                  isLiveNow
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLiveNow ? "bg-rose-500 animate-ping" : "bg-blue-400"
                  }`}
                />
                <span>
                  {isLiveNow
                    ? "SESI SEDANG BERLANGSUNG DETIK INI"
                    : "SESI MENGAJAR BERIKUTNYA HARI INI"}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white/90 border border-white/10">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>
                  {activeTargetBlock?.jam_mulai} – {activeTargetBlock?.jam_selesai} WIB (
                  {activeTargetBlock?.slot_range_label || `${activeTargetBlock?.total_jp} JP`})
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                Ruang:{" "}
                <strong className="text-white font-bold">
                  {activeTargetBlock?.ruangan || "Kelas Reguler"}
                </strong>
              </span>
            </div>
          </div>

          {/* Main Info Box */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="font-mono text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {activeTargetBlock?.rombel_nama}
              </h2>
              <span className="text-slate-400 text-lg hidden sm:inline">•</span>
              <span className="font-sans text-base sm:text-xl font-bold text-blue-300">
                {activeTargetBlock?.mata_pelajaran_nama}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
                {activeTargetBlock?.mata_pelajaran_kode || "MAPEL"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                {activeTopic ||
                  "Topik Pertemuan KBM Terjadwal (Silabus Kurikulum & Capaian Pembelajaran)"}
              </span>
            </p>
          </div>

          {/* 4 Pillars Status Indicators */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Presensi */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-[11px] font-medium text-slate-300">Presensi</span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  hasPresensi
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}
              >
                {hasPresensi ? "SELESAI" : "BELUM"}
              </span>
            </div>

            {/* 2. Materi */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-[11px] font-medium text-slate-300">Materi</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                SIAP
              </span>
            </div>

            {/* 3. Tugas */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-violet-400" />
                <span className="text-[11px] font-medium text-slate-300">Tugas</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
                AKTIF
              </span>
            </div>

            {/* 4. Jurnal */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <span className="text-[11px] font-medium text-slate-300">Jurnal</span>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  hasJournal
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {hasJournal ? "SELESAI" : "BELUM"}
              </span>
            </div>
          </div>

          {/* Action Row: Massive Primary CTA + Fast Shortcuts */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Primary Action Button (Massive CTA) */}
            <Link
              href={
                activeTargetBlock
                  ? `/kelas-saya/${activeTargetBlock.penugasan_mengajar_id}?tab=PRESENSI`
                  : "/kelas-saya"
              }
              className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>MULAI MENGAJAR SEKARANG</span>
            </Link>

            {/* Secondary Utility Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Presensi Cepat In-Place Modal */}
              <button
                type="button"
                onClick={handleQuickAttendance}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 text-xs font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
                <span>Presensi Kilat</span>
              </button>

              {/* Buka Modul Ajar */}
              <Link
                href={
                  activeTargetBlock
                    ? `/kelas-saya/${activeTargetBlock.penugasan_mengajar_id}?tab=MATERI`
                    : "/kelas-saya"
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Buka Modul Ajar</span>
              </Link>

              {/* Salin Kode Siswa */}
              <button
                type="button"
                onClick={handleCopyJoinCode}
                disabled={isLoadingCode}
                title="Salin Kode Gabung Kelas untuk Siswa"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
              >
                {copiedCode ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : isLoadingCode ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="hidden md:inline">
                  {copiedCode ? "Tersalin!" : "Salin Kode Siswa"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
