"use client";

/**
 * Ruang Pintar — M10 Personal Teacher / Student Schedule View
 *
 * Menggabungkan slot berurutan menjadi 1 Card Sesi Pembelajaran Terpadu.
 * Desain bersih, konsisten, profesional, dan nyaman di mata (selaras dengan dashboard):
 * - Pergerakan kursor ke arah card stabil tanpa perubahan warna yang mengganggu
 * - Tipografi dan warna font tenang & terstruktur
 * - Badges/pills proporsional dan elegan
 */

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  PlayCircle,
  Download,
  CalendarClock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  openClassSessionAction,
  ensureAndGetTodaySessionAction,
} from "@/app/actions/class-session-actions";
import { HariBelajar, ScheduleEntryDTO } from "../domain/schedule-types";
import { Toast, ToastType } from "@/shared/components/ui/toast";
import { SessionAttendanceModal } from "@/modules/attendance/presentation/session-attendance-modal";
import { MergedScheduleBlock, mergeConsecutiveScheduleEntries } from "../domain/schedule-merger";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";

export type { MergedScheduleBlock };
export { mergeConsecutiveScheduleEntries };

interface MyScheduleViewProps {
  entries: ScheduleEntryDTO[];
  teacherName?: string;
  isTeacher: boolean;
  initialScheduleRombelId?: string;
}

export function MyScheduleView({
  entries,
  teacherName: _teacherName,
  isTeacher,
  initialScheduleRombelId,
}: MyScheduleViewProps) {
  const router = useRouter();
  const [selectedHari, setSelectedHari] = useState<string>("ALL");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [, startTransition] = useTransition();
  const [attendanceModalSesiId, setAttendanceModalSesiId] = useState<string | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [pendingBlockKey, setPendingBlockKey] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  // Map hari ini
  const hariMap: Record<number, HariBelajar> = {
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
    0: "MINGGU",
  };
  const todayDayName = hariMap[new Date().getDay()] || "SENIN";

  const isBlockLive = (block: MergedScheduleBlock) => {
    if (block.hari !== todayDayName || !currentTimeStr) return false;
    return currentTimeStr >= block.jam_mulai && currentTimeStr <= block.jam_selesai;
  };

  // Data gabungan per blok
  const allMergedBlocks = mergeConsecutiveScheduleEntries(entries);

  // Filter berdasarkan hari
  const filteredBlocks = allMergedBlocks.filter(
    (b) => selectedHari === "ALL" || b.hari === selectedHari
  );

  // Metrik Hari Ini
  const todayEntries = entries.filter((e) => e.hari === todayDayName);
  const todayBlocks = allMergedBlocks.filter((b) => b.hari === todayDayName);
  const uniqueRombels = new Set(entries.map((e) => e.rombel_id));

  const handleQuickAttendance = async (block: MergedScheduleBlock) => {
    setPendingBlockKey(block.key);
    try {
      const res = await ensureAndGetTodaySessionAction({
        penugasan_mengajar_id: block.penugasan_mengajar_id,
        jadwal_pelajaran_id: block.primary_entry?.id || null,
        rombel_id: block.rombel_id,
        mata_pelajaran_id: block.mata_pelajaran_id,
        ruangan_aktual: block.ruangan || null,
      });

      if (res.success && res.data?.sessionId) {
        setAttendanceModalSesiId(res.data.sessionId);
        setIsAttendanceModalOpen(true);
      } else {
        setToast({ message: res.message, type: "error" });
      }
    } catch (err: any) {
      setToast({ message: err.message || "Gagal membuka sesi kelas.", type: "error" });
    } finally {
      setPendingBlockKey(null);
    }
  };

  const _handleQuickOpenSession = (entry: ScheduleEntryDTO) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("jadwal_pelajaran_id", entry.id);
      formData.set("penugasan_mengajar_id", entry.penugasan_mengajar_id);
      formData.set("rombel_id", entry.rombel_id);
      formData.set("mata_pelajaran_id", entry.mata_pelajaran_id);
      formData.set("guru_id", entry.guru_id);
      formData.set("tahun_ajaran_id", entry.tahun_ajaran_id);
      if (entry.semester_id) formData.set("semester_id", entry.semester_id);
      if (entry.ruangan) formData.set("ruangan_aktual", entry.ruangan);

      const res = await openClassSessionAction(null, formData);
      if (res.success) {
        setToast({ message: res.message, type: "success" });
        router.push("/sesi-pembelajaran");
      } else {
        setToast({ message: res.message, type: "error" });
      }
    });
  };

  const handleExportCSV = () => {
    if (entries.length === 0) {
      setToast({ message: "Tidak ada jadwal untuk diekspor.", type: "error" });
      return;
    }

    const headers = [
      "No",
      "Hari",
      "Jam Mulai",
      "Jam Selesai",
      "Durasi JP",
      "Rombel",
      "Mata Pelajaran",
      "Ruangan",
      "Catatan",
    ];
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = allMergedBlocks.map((b, idx) => [
      idx + 1,
      escapeCsv(b.hari),
      escapeCsv(b.jam_mulai),
      escapeCsv(b.jam_selesai),
      escapeCsv(`${b.total_jp} JP`),
      escapeCsv(b.rombel_nama),
      escapeCsv(b.mata_pelajaran_nama),
      escapeCsv(b.ruangan || "-"),
      escapeCsv(b.slot_range_label),
    ]);

    const delimiter = ";";
    const csvContent =
      "\uFEFF" + [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jadwal_mengajar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast({
      message: `Berhasil mengekspor ${allMergedBlocks.length} blok jadwal mengajar ke CSV.`,
      type: "success",
    });
  };

  const daysList: HariBelajar[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-12">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* KPI Metric Summary — Tampilan Ringkas, Bersih, dan Konsisten dengan Dashboard */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {/* Metric 1: Total JP */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
              Total Mengajar
            </span>
            <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
              {entries.length > 0 ? (
                <AnimatedCounter value={entries.length} duration={0.8} suffix=" JP / Minggu" />
              ) : (
                "Belum Ada Jadwal"
              )}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
              Beban mengajar resmi
            </span>
          </div>
        </div>

        {/* Metric 2: Kelas Hari Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
              Hari Ini ({todayDayName})
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {todayBlocks.length > 0 ? (
                  <AnimatedCounter value={todayBlocks.length} duration={0.8} />
                ) : (
                  "-"
                )}
              </span>
              {todayBlocks.length > 0 && (
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Kelas
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
              {todayEntries.length > 0 ? (
                <>
                  <AnimatedCounter value={todayEntries.length} duration={0.8} /> JP terjadwal
                </>
              ) : (
                "Tidak ada jadwal"
              )}
            </span>
          </div>
        </div>

        {/* Metric 3: Rombel Terampu */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
              Rombel
            </span>
            <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {uniqueRombels.size > 0 ? (
                  <AnimatedCounter value={uniqueRombels.size} duration={0.8} />
                ) : (
                  "-"
                )}
              </span>
              {uniqueRombels.size > 0 && (
                <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400">
                  Kelas
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
              {uniqueRombels.size > 0 ? "Rombongan belajar" : "Belum ada rombel"}
            </span>
          </div>
        </div>
      </div>

      {/* Day Filter Switcher & Export — Single Row Terpadu */}
      <LayoutGroup id="my-schedule-day-tabs">
        <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Horizontal Chips Filter */}
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none min-w-0 pr-1">
            <button
              type="button"
              onClick={() => setSelectedHari("ALL")}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all ${
                selectedHari === "ALL"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>Semua Hari</span>
              {entries.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    selectedHari === "ALL"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {entries.length} JP
                </span>
              )}
            </button>

            {daysList.map((d) => {
              const dayEntries = entries.filter((e) => e.hari === d);
              const isToday = d === todayDayName;
              const isSelected = selectedHari === d;
              if (dayEntries.length === 0) return null;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedHari(d)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : isToday
                        ? "bg-blue-50/90 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-900"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{d}</span>

                  {isToday && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                  )}

                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : isToday
                          ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                          : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {dayEntries.length} JP
                  </span>
                </button>
              );
            })}
          </div>

          {/* Separator Garis Vertikal */}
          <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-800 shrink-0" />

          {/* Tombol Ekspor CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Ekspor Jadwal ke CSV"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Ekspor CSV</span>
            <span className="sm:hidden text-[11px]">CSV</span>
          </button>
        </div>
      </LayoutGroup>

      {/* Schedule List / Cards */}
      <AnimatePresence mode="popLayout">
        {filteredBlocks.length === 0 ? (
          <motion.div
            key="empty-schedule-state"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak ada jadwal pembelajaran
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {selectedHari === "ALL"
                ? "Anda belum memiliki alokasi jadwal pada versi jadwal resmi aktif."
                : `Tidak ada jadwal mengajar pada hari ${selectedHari}.`}
            </p>
            {isTeacher && initialScheduleRombelId && selectedHari === "ALL" && (
              <Link
                href="/dashboard#persiapan-mengajar"
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 shadow-xs"
              >
                <CalendarClock className="size-4" />
                Atur jadwal di Persiapan Mengajar
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`schedule-grid-${selectedHari}`}
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredBlocks.map((block, idx) => {
              const isToday = block.hari === todayDayName;
              const isLive = isBlockLive(block);

              return (
                <motion.div
                  key={block.key}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(idx * 0.03, 0.2),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border ${
                    isToday
                      ? "border-blue-300/90 dark:border-blue-700/80 shadow-xs"
                      : "border-slate-200/80 dark:border-slate-800"
                  } p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
                >
                  <div>
                    {/* Top Row: Hari Badge + JP Slot + Jam */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50"
                          }`}
                        >
                          {block.hari}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-300 font-mono text-[11px] font-medium border border-blue-100/60 dark:border-blue-900/40">
                          {block.total_jp} JP ({block.slot_range_label})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {block.jam_mulai} - {block.jam_selesai}
                        </span>
                      </div>
                    </div>

                    {/* Middle Content: Subject Name & Rombel Badge */}
                    <div className="mt-3 mb-4 space-y-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
                        {block.mata_pelajaran_nama}
                      </h4>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold border border-slate-200/60 dark:border-slate-700">
                        <span>{block.rombel_nama}</span>
                        {block.ruangan && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {block.ruangan}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Row: Status Info & Action Button */}
                  {isTeacher ? (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-auto">
                      {isLive ? (
                        <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Sedang Berlangsung
                        </span>
                      ) : isToday ? (
                        <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                          Sesi Hari Ini
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Terjadwal hari {block.hari}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/kelas-saya/${block.penugasan_mengajar_id}?tab=PRESENSI`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Buka Ruang Kelas & Tab Presensi"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          <span>Buka Kelas</span>
                        </Link>

                        {isToday && (
                          <button
                            type="button"
                            onClick={() => handleQuickAttendance(block)}
                            disabled={pendingBlockKey === block.key}
                            className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                            title="Buka form presensi siswa langsung tanpa berpindah halaman"
                          >
                            {pendingBlockKey === block.key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                            <span>Presensi</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-auto">
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {isToday ? "Sesi Pelajaran Hari Ini" : `Terjadwal hari ${block.hari}`}
                      </span>
                      {block.penugasan_mengajar_id && (
                        <Link
                          href={`/kelas-saya/${block.penugasan_mengajar_id}`}
                          className="px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          <span>Buka Kelas</span>
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Attendance Modal (Fast-Track 1-Click Marking) */}
      {isAttendanceModalOpen && attendanceModalSesiId && (
        <SessionAttendanceModal
          sesiId={attendanceModalSesiId}
          isOpen={isAttendanceModalOpen}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setAttendanceModalSesiId(null);
          }}
          onSuccess={(msg) => {
            setToast({ message: msg, type: "success" });
            startTransition(() => {
              router.refresh();
            });
          }}
          onError={(msg) => {
            setToast({ message: msg, type: "error" });
          }}
        />
      )}
    </div>
  );
}
